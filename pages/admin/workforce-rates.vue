<template>
  <AdminPage full-width @login-success="init">
    <div class="wfrt-page">
      <div class="wfrt-page__header">
        <h1 class="wfrt-page__title">
          {{ $i('wfrt_page_title') }}
        </h1>
        <p class="wfrt-page__intro">
          {{ $i('wfrt_page_intro') }}
        </p>
      </div>

      <transition name="wfrt-toast">
        <div v-if="toast.show" class="wfrt-page__toast" :class="'wfrt-page__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="contextError" class="wfrt-page__blocker">
        {{ contextError }}
      </div>

      <template v-else>
        <!-- RATES ------------------------------------------------------------------------------ -->
        <!-- One refusal for the whole section. Pay is gated on WorkforcePayrollApprover ON TOP OF
             WorkforceManager, on the READ as much as the write, and the server answers the same 403
             for either — so this names the requirement without claiming which half the caller is
             missing, which the server deliberately does not disclose. -->
        <section v-if="!canReadRates" class="wfrt-page__section wfrt-page__refusal">
          <h2 class="wfrt-page__refusal-title">
            {{ $i('wfrt_rate_section') }}
          </h2>
          <p>{{ $i('wfrt_rate_no_capability') }}</p>
          <p class="wfrt-page__refusal-note">
            {{ $i('wfrt_rate_no_capability_note') }}
          </p>
        </section>

        <section v-else class="wfrt-page__section">
          <div class="wfrt-page__scopes">
            <div class="wfrt-page__tabs">
              <button
                v-for="tab in scopeTabs"
                :key="tab.kind"
                class="wfrt-page__tab"
                :class="{ 'wfrt-page__tab--on': scopeKind === tab.kind }"
                @click="selectScopeKind(tab.kind)"
              >
                {{ $i(tab.labelKey) }}
              </button>
            </div>

            <!-- A read that FAILED must never render as a short list. The picker says the list is
                 unknown rather than offering the handful it happens to hold. -->
            <p v-if="scopeOptions === null" class="wfrt-page__scope-unknown">
              {{ $i('wfrt_scope_unknown') }}
            </p>
            <p v-else-if="!scopeOptions.length" class="wfrt-page__scope-empty">
              {{ scopeKind === 'staff' ? $i('wfrt_scope_no_staff') : $i('wfrt_scope_no_roles') }}
            </p>
            <select v-else v-model="scopeId" class="wfrt-page__select" @change="selectScope">
              <option :value="null">
                {{ $i('wfrt_scope_choose') }}
              </option>
              <option v-for="option in scopeOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </div>

          <!-- `statementSeq` is part of the key so a landed statement re-mounts the form: the next
               rate is typed rather than the last one re-submitted into a 409. -->
          <WorkforceRateTimeline
            v-if="scopeId"
            :key="scopeKind + '|' + scopeId + '|' + statementSeq"
            :timeline="timeline"
            :scope-label="scopeLabel"
            :currency="currency"
            :can-write="canReadRates"
            :busy="savingRate"
            :conflict-rate-version-id="conflictRateVersionId"
            @submit="setRate"
          />
          <p v-else class="wfrt-page__hint">
            {{ $i('wfrt_scope_prompt') }}
          </p>
        </section>

        <!-- HOURS ------------------------------------------------------------------------------ -->
        <!-- The attendance read is WorkforceManager (not payroll), so it is gated separately. A
             caller without it gets a refusal rather than an empty table: the page did not TRY, and
             "we could not read the hours" would be a claim about the data instead of about access. -->
        <section v-if="!canManage" class="wfrt-page__section wfrt-page__refusal">
          <h2 class="wfrt-page__refusal-title">
            {{ $i('wfrt_att_title') }}
          </h2>
          <p>{{ $i('wfrt_att_no_capability') }}</p>
        </section>

        <section v-else class="wfrt-page__section">
          <WorkforceAttendanceTable
            :attendance="attendance"
            :range-label="weekLabel"
            :busy="loadingAttendance"
            @step="stepWeek"
          />
        </section>

        <section class="wfrt-page__section">
          <WorkforceHoursExportPanel
            :from="exportFrom"
            :to="exportTo"
            :result="exportResult"
            :range-error="exportRangeError"
            :can-export="hasPayrollApprover"
            :busy="exporting"
            @update:from="exportFrom = $event"
            @update:to="exportTo = $event"
            @run="runExport"
            @download="downloadExport"
          />
        </section>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import WorkforceAttendanceTable from '~/components/admin/workforce-rates/WorkforceAttendanceTable.vue';
import WorkforceHoursExportPanel from '~/components/admin/workforce-rates/WorkforceHoursExportPanel.vue';
import WorkforceRateTimeline from '~/components/admin/workforce-rates/WorkforceRateTimeline.vue';
import { isWorkforceApiError } from '~/utils/workforce/api-client';
import { contextRefusalKey } from '~/utils/workforce/context-refusal';
import { WorkforceRosterService } from '~/utils/workforce/roster-client';
import { CAPABILITY_MANAGER, CAPABILITY_PAYROLL, callerHas } from '~/utils/workforce/roster';
import { isoWeekNumber, parseApiInstant, weekRange } from '~/utils/workforce/week-range';
import { WorkforceRatesService } from '~/utils/workforce-rates/rates-client';
import { SCOPE_ROLE, SCOPE_STAFF, buildTimeline } from '~/utils/workforce-rates/rate-timeline';
import { buildAttendance } from '~/utils/workforce-rates/attendance-view';
import { businessDateIn, parseHoursExportMeta, shiftBusinessDate, validateExportRange } from '~/utils/workforce-rates/hours-export';

// The default export window: a fortnight ending on the venue's today. A starting point only — it is
// set once at init and never moved afterwards, because a payroll range that changed under a manager
// while they navigated the week grid above would be the worst kind of helpful.
const DEFAULT_EXPORT_DAYS_BACK = 13;

const SCOPE_TABS = [
  { kind: SCOPE_STAFF, labelKey: 'wfrt_scope_tab_staff' },
  { kind: SCOPE_ROLE, labelKey: 'wfrt_scope_tab_roles' }
];

// Rates and hours: what an hour costs, what was actually worked, and the file that carries the
// hours out to payroll.
//
// WHY THIS PAGE EXISTS. The week grid can already report a shift it cannot price ("Mangler sats"),
// and until this page there was nowhere in any browser to answer it — no rate authoring, no
// attendance read, no hours export. A refusal a user cannot act on is a dead end in the one flow the
// module exists for.
//
// WHAT IT DELIBERATELY DOES NOT OFFER. `POST /attendance/adjustments` corrects a clocked session and
// names it by `clockSessionId`. No manager-reachable read on the API returns one: the attendance
// read (#25) is aggregated to staff-day and carries none, the personnel list carries its own entry
// id, and `GET /me/.../time` — the only read that does expose session ids — is WorkforceSelf and
// serves the caller's OWN engagement only. So the correction cannot be addressed from a manager
// surface at all, and this page says so on the attendance table rather than offering a control that
// could only ever fail. The counts it shows come from the attendance read itself.
export default {
  name: 'AdminWorkforceRates',
  components: { AdminPage, WorkforceAttendanceTable, WorkforceHoursExportPanel, WorkforceRateTimeline },
  data () {
    return {
      contextError: '',
      timeZoneId: null,
      capabilities: [],

      // null everywhere means UNKNOWN. An empty array is a positive answer and a different claim;
      // the two are never initialised to the same value.
      staff: null,
      roleCatalogue: null,

      scopeKind: SCOPE_STAFF,
      scopeId: null,
      rateHistory: null,
      savingRate: false,
      conflictRateVersionId: null,
      statementSeq: 0,

      weekOffset: 0,
      attendanceResponse: null,
      loadingAttendance: false,

      exportFrom: '',
      exportTo: '',
      exportResult: null,
      exporting: false,

      toast: { show: false, message: '', type: 'success' },
      toastTimer: null
    };
  },
  computed: {
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      return stores.length ? stores[0].id : '';
    },
    // The market is the single source for currency, and it is what `priceLabel` already formats in.
    // Passed down so the timeline can tell a rate it CAN print in that currency from one the server
    // stated in another — it withholds the symbol rather than relabel the money.
    currency () {
      return (this.marketConfig && this.marketConfig.currency) || null;
    },
    _rosterService () {
      return new WorkforceRosterService(this._coreInitializer);
    },
    _ratesService () {
      return new WorkforceRatesService(this._coreInitializer);
    },
    canManage () {
      return callerHas(this.capabilities, CAPABILITY_MANAGER);
    },
    hasPayrollApprover () {
      return callerHas(this.capabilities, CAPABILITY_PAYROLL);
    },
    /** Pay is BOTH capabilities, on the read as much as the write. */
    canReadRates () {
      return this.canManage && this.hasPayrollApprover;
    },
    scopeTabs () {
      return SCOPE_TABS;
    },
    /**
     * The pickable scopes, or null when the underlying read failed.
     *
     * Null is not an empty list: "we could not load the roster" and "this store has nobody" are
     * different claims, and offering an empty picker for the first would read as the second.
     */
    scopeOptions () {
      if (this.scopeKind === SCOPE_STAFF) {
        if (this.staff === null) { return null; }
        return this.staff.map(row => ({
          id: row.staffMemberId,
          // An engagement with no display name shows its employment number rather than an invented
          // name; both absent is an explicit "unnamed", never a blank line.
          //
          // `GET /staff` returns ENDED engagements alongside active ones (employment ends with
          // `isActive: false`; there is no delete), and a past engagement's rate timeline is still
          // worth reading. It is marked rather than hidden — an unmarked ended engagement in a
          // picker reads as a current employee.
          label: this.endedLabel(
            row.displayName || row.employmentNumber || this.$i('wfrt_scope_unnamed'),
            row.isActive === false
          )
        }));
      }

      if (this.roleCatalogue === null) { return null; }
      return this.roleCatalogue.map(role => ({
        id: role.roleId,
        // `GET /roles` returns retired roles too — there is no role deletion, only `effectiveToUtc`
        // — and the read's own contract says it is the caller's job to say which.
        label: this.endedLabel(role.name || this.$i('wfrt_scope_unnamed'), this.roleIsRetired(role))
      }));
    },
    scopeLabel () {
      const options = this.scopeOptions;
      if (!options || !this.scopeId) { return null; }
      const found = options.find(option => option.id === this.scopeId);
      return found ? found.label : null;
    },
    timeline () {
      return buildTimeline(this.rateHistory);
    },
    attendance () {
      return buildAttendance(this.attendanceResponse);
    },
    /** The attendance window, resolved in the STORE's zone. Null without it — nothing is guessed. */
    week () {
      if (!this.timeZoneId) { return null; }
      return weekRange(this.timeZoneId, new Date(), this.weekOffset);
    },
    weekLabel () {
      if (!this.week) { return null; }
      const first = this.week.days[0];
      const last = this.week.days[6];
      const iso = isoWeekNumber(first.year, first.month, first.day);
      return this.$i('wfrt_att_week_label', { week: iso.week, year: iso.year, from: first.isoDate, to: last.isoDate });
    },
    exportRangeError () {
      return validateExportRange(this.exportFrom, this.exportTo);
    }
  },
  watch: {
    storeId () { this.init(); }
  },
  mounted () {
    this.init();
  },
  beforeDestroy () {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
  },
  methods: {
    async init () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      this.contextError = '';
      this.timeZoneId = null;
      this.capabilities = [];
      this.resetScope();
      this.attendanceResponse = null;
      this.exportResult = null;

      try {
        const context = await this._rosterService.GetContext(this.storeId);
        this.timeZoneId = context && context.timeZone ? context.timeZone.id : null;
        this.capabilities = (context && context.capabilities) || [];
        if (!this.timeZoneId) {
          // Every date on this page — the week on screen, the venue's today, the day a rate starts
          // — is the STORE's. Without its zone the page would be rendering the viewer's and calling
          // it the venue's, so it renders nothing.
          this.contextError = this.$i('wfrt_context_failed');
          return;
        }
      } catch (e) {
        this.contextError = this.$i(contextRefusalKey(e, {
          noCapability: 'wfrt_no_capability',
          failed: 'wfrt_context_failed'
        }));
        return;
      }

      this.seedExportRange();
      await Promise.all([this.loadScopes(), this.loadAttendance()]);
    },

    /** The export defaults to the venue's own fortnight, never the viewer's. */
    seedExportRange () {
      const today = businessDateIn(this.timeZoneId, new Date());
      if (!today) { return; }
      this.exportTo = today;
      this.exportFrom = shiftBusinessDate(today, -DEFAULT_EXPORT_DAYS_BACK) || today;
    },

    async loadScopes () {
      if (!this.canReadRates) { return; }

      this.staff = null;
      this.roleCatalogue = null;

      const [staff, roles] = await Promise.all([
        this._rosterService.ListStaff(this.storeId).catch(() => null),
        this._rosterService.ListRoles(this.storeId).catch(() => null)
      ]);

      this.staff = Array.isArray(staff) ? staff : null;
      this.roleCatalogue = Array.isArray(roles) ? roles : null;
    },

    selectScopeKind (kind) {
      if (this.scopeKind === kind) { return; }
      this.scopeKind = kind;
      this.resetScope();
    },

    resetScope () {
      this.scopeId = null;
      this.rateHistory = null;
      this.conflictRateVersionId = null;
    },

    /** Marks a scope that has ended. Unmarked would read as current, which is the dangerous default. */
    endedLabel (label, ended) {
      return ended ? this.$i('wfrt_scope_ended', { label }) : label;
    },

    /**
     * A role retired before now.
     *
     * `effectiveToUtc` is parsed with `parseApiInstant` like every other stamp on these surfaces —
     * it arrives BARE off a column load, and `new Date` would read it as browser-local and retire a
     * role up to a day early or late.
     */
    roleIsRetired (role) {
      const until = parseApiInstant(role && role.effectiveToUtc);
      return !!until && until.getTime() <= Date.now();
    },

    /** A different scope is a different timeline, so a conflict raised against the old one is gone. */
    selectScope () {
      this.conflictRateVersionId = null;
      return this.loadTimeline();
    },

    /**
     * Re-reads one scope's timeline.
     *
     * It does NOT clear `conflictRateVersionId`, deliberately. The conflict marker names a row in
     * the timeline currently ON SCREEN, so it is set only after a read has replaced that timeline
     * (see `handleRateError`); a clear in here would wipe the marker the reload exists to place.
     * The two places a conflict genuinely stops being current — changing scope and starting a new
     * statement — clear it themselves.
     */
    async loadTimeline () {
      // Cleared to unknown, never to empty: an in-flight or failed read must not spend a frame
      // claiming this person has no rate — which is exactly the claim that would send a manager to
      // type one that already exists.
      this.rateHistory = null;
      if (!this.scopeId) { return; }

      const scopeKind = this.scopeKind;
      const scopeId = this.scopeId;

      try {
        const history = scopeKind === SCOPE_STAFF
          ? await this._ratesService.GetEngagementRates(this.storeId, scopeId)
          : await this._ratesService.GetRoleRates(this.storeId, scopeId);

        // A selection that moved while the read was in flight must not adopt the previous scope's
        // timeline.
        if (this.scopeKind !== scopeKind || this.scopeId !== scopeId) { return; }
        this.rateHistory = history;
      } catch (e) {
        if (this.scopeKind !== scopeKind || this.scopeId !== scopeId) { return; }
        this.rateHistory = null;
        this.notifyError(e, 'wfrt_rate_read_failed');
      }
    },

    async setRate (statement) {
      if (this.savingRate || !this.scopeId) { return; }
      this.savingRate = true;
      this.conflictRateVersionId = null;

      const scopeKind = this.scopeKind;
      const scopeId = this.scopeId;

      try {
        // PUT, and PUT APPENDS. The server closes the row in force at the new instant and opens a
        // new one; nothing is overwritten, so a week already costed keeps costing the same.
        if (scopeKind === SCOPE_STAFF) {
          await this._ratesService.SetEngagementRate(this.storeId, scopeId, statement);
        } else {
          await this._ratesService.SetRoleRate(this.storeId, scopeId, statement);
        }
        this.notify(this.$i('wfrt_rate_saved'));
        // Re-mounts the form (via the key) so the statement just made cannot be submitted twice.
        this.statementSeq += 1;
        await this.loadTimeline();
      } catch (e) {
        await this.handleRateError(e);
      } finally {
        this.savingRate = false;
      }
    },

    /**
     * The append-only refusal, made legible.
     *
     * `workforce.rate-version-exists` names the id of the statement already in force on that date.
     * That id is marked on the timeline instead of being described, and the message says the only
     * thing a manager can actually do: supersede it from a LATER date. There is no correction at the
     * same date — not in this UI because there is none in the API.
     */
    async handleRateError (e) {
      if (isWorkforceApiError(e) && e.code === 'workforce.rate-version-exists') {
        this.notify(this.$i('wfrt_rate_conflict_toast'), 'error');
        // Re-read FIRST: the colliding statement may have been appended by somebody else since this
        // page loaded, in which case it is not on screen yet — and the marker below has to name a
        // row that IS.
        await this.loadTimeline();
        this.conflictRateVersionId = e.aggregateId || null;
        return;
      }

      if (isWorkforceApiError(e) && e.status === 403) {
        this.notify(this.$i('wfrt_rate_no_capability'), 'error');
        return;
      }

      this.notifyError(e, 'wfrt_rate_save_failed');
    },

    stepWeek (direction) {
      this.weekOffset = direction === 0 ? 0 : this.weekOffset + direction;
      return this.loadAttendance();
    },

    async loadAttendance () {
      if (!this.canManage || !this.week) { return; }
      this.loadingAttendance = true;
      this.attendanceResponse = null;

      const offset = this.weekOffset;
      try {
        // UTC INSTANTS, not calendar dates — this endpoint binds `DateTime` and relabels it Utc.
        // The hours export below takes `yyyy-MM-dd` instead; the two are not interchangeable and
        // the wrong shape is a 400 or, worse, a silently different window.
        const response = await this._rosterService.GetAttendance(this.storeId, this.week.startUtc, this.week.endUtc);
        if (this.weekOffset !== offset) { return; }
        this.attendanceResponse = response;
      } catch (e) {
        if (this.weekOffset !== offset) { return; }
        this.attendanceResponse = null;
        this.notifyError(e, 'wfrt_att_read_failed');
      } finally {
        this.loadingAttendance = false;
      }
    },

    async runExport () {
      if (this.exporting || this.exportRangeError || !this.hasPayrollApprover) { return; }
      this.exporting = true;
      this.exportResult = null;

      try {
        const file = await this._ratesService.GetHoursExport(this.storeId, this.exportFrom, this.exportTo);
        this.exportResult = {
          text: file.text,
          // The server's own name when it exposed one; otherwise a local fallback that is clearly a
          // fallback rather than a second copy of the server's naming scheme.
          fileName: file.fileName || ('okam-hours-' + this.storeId + '-' + this.exportFrom + '-' + this.exportTo + '.csv'),
          meta: parseHoursExportMeta(file.text)
        };
      } catch (e) {
        this.notifyError(e, 'wfrt_exp_failed');
      } finally {
        this.exporting = false;
      }
    },

    /**
     * Hands the fetched bytes to the browser.
     *
     * The file is NOT re-fetched: a second request could answer differently (a punch closed in
     * between), and the manager would then be downloading a file whose completeness verdict on
     * screen belongs to a different one.
     */
    downloadExport () {
      const result = this.exportResult;
      if (!result) { return; }

      if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function' || typeof document === 'undefined') {
        this.notify(this.$i('wfrt_exp_download_unavailable'), 'error');
        return;
      }

      const url = URL.createObjectURL(new Blob([result.text], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      link.click();
      if (typeof URL.revokeObjectURL === 'function') { URL.revokeObjectURL(url); }
    },

    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 5000);
    },

    /**
     * A failure is reported with the server's own wording when it typed one, and with this page's
     * fallback when it did not. A read that failed never becomes a claim about the data.
     */
    notifyError (e, fallbackKey) {
      const detail = isWorkforceApiError(e) && e.message ? e.message : this.$i(fallbackKey);
      this.notify(detail, 'error');
    }
  }
};
</script>

<style scoped>
.wfrt-page { max-width: 1560px; margin: 0 auto; padding: 24px; }
.wfrt-page__header { margin-bottom: 18px; }
.wfrt-page__title { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.wfrt-page__intro { color: #64748b; margin: 0; }

.wfrt-page__toast { position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 10px; color: #fff; font-weight: 600; z-index: 1000; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
.wfrt-page__toast--success { background: #1bb776; }
.wfrt-page__toast--error { background: #ef4444; }

.wfrt-page__blocker { background: #fffbeb; color: #92400e; border-radius: 12px; padding: 20px; }

.wfrt-page__section { margin-bottom: 24px; }
.wfrt-page__refusal { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; color: #92400e; }
.wfrt-page__refusal-title { font-size: 1.1rem; font-weight: 600; color: #292c34; margin: 0 0 8px; }
.wfrt-page__refusal-note { font-size: 0.82rem; color: #64748b; margin: 8px 0 0; }

.wfrt-page__scopes { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
.wfrt-page__tabs { display: flex; gap: 8px; }
.wfrt-page__tab { background: #fff; border: 2px solid #e2e8f0; border-radius: 8px; padding: 8px 16px; font-size: 0.9rem; color: #292c34; cursor: pointer; }
.wfrt-page__tab--on { border-color: #1bb776; color: #159f63; font-weight: 600; }
.wfrt-page__select { padding: 10px; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; color: #292c34; min-width: 240px; }
.wfrt-page__scope-unknown { font-size: 0.85rem; color: #92400e; margin: 0; }
.wfrt-page__scope-empty { font-size: 0.85rem; color: #64748b; margin: 0; }
.wfrt-page__hint { font-size: 0.9rem; color: #64748b; background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 0; }
</style>
