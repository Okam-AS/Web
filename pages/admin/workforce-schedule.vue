<template>
  <AdminPage full-width @login-success="init">
    <div class="wf-page">
      <div class="wf-page__header">
        <h1 class="wf-page__title">
          {{ $i('wf_page_title') }}
        </h1>
        <p class="wf-page__intro">
          {{ $i('wf_page_intro') }}
        </p>
      </div>

      <transition name="wf-toast">
        <div v-if="toast.show" class="wf-page__toast" :class="'wf-page__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="contextError" class="wf-page__blocker">
        {{ contextError }}
      </div>

      <template v-else>
        <div class="wf-page__controls">
          <div class="wf-page__weeknav">
            <button class="wf-page__step" :disabled="loading" @click="stepWeek(-1)">
              ‹
            </button>
            <span class="wf-page__week">{{ weekLabel }}</span>
            <button class="wf-page__step" :disabled="loading" @click="stepWeek(1)">
              ›
            </button>
            <button class="wf-page__btn wf-page__btn--ghost" :disabled="loading || weekOffset === 0" @click="goToThisWeek">
              {{ $i('wf_this_week') }}
            </button>
          </div>

          <div class="wf-page__views">
            <button
              v-for="option in viewOptions"
              :key="option.key"
              class="wf-page__view"
              :class="{ 'is-active': view === option.key }"
              :disabled="loading"
              @click="setView(option.key)"
            >
              {{ option.label }}
            </button>
          </div>

          <div class="wf-page__actions">
            <label v-if="canCreateDraft" class="wf-page__copy">
              <input v-model="copyPreviousWeek" type="checkbox">
              {{ $i('wf_copy_previous') }}
            </label>
            <button v-if="canCreateDraft" class="wf-page__btn" :disabled="busy" @click="createDraft">
              {{ $i('wf_create_draft') }}
            </button>
            <button v-if="canValidate" class="wf-page__btn wf-page__btn--ghost" :disabled="busy" @click="validate">
              {{ $i('wf_validate') }}
            </button>
            <button v-if="canPublish" class="wf-page__btn" :disabled="busy" @click="publish">
              {{ $i('wf_publish') }}
            </button>
            <button class="wf-page__btn wf-page__btn--ghost" :disabled="loading" @click="load">
              {{ $i('wf_reload') }}
            </button>
          </div>
        </div>

        <div class="wf-page__state">
          <span class="wf-page__badge" :class="'wf-page__badge--' + stateBadge.tone">{{ stateBadge.label }}</span>
          <span v-if="grid.revisionNumber !== null" class="wf-page__meta">{{ $i('wf_revision', { number: grid.revisionNumber }) }}</span>
          <span v-if="grid.publicationNumber !== null" class="wf-page__meta">{{ $i('wf_publication', { number: grid.publicationNumber }) }}</span>
          <span v-if="grid.timeZoneId" class="wf-page__meta">{{ $i('wf_timezone', { zone: grid.timeZoneId }) }}</span>
          <span v-if="grid.asOfUtc" class="wf-page__meta">{{ $i('wf_as_of', { time: formatDate(grid.asOfUtc) }) }}</span>
        </div>

        <!-- The double-booking guard is enforced server-side across every store the person is
             engaged in, so the only place it becomes visible is the typed 409 a mutation returns.
             It is surfaced verbatim: the same-store variant names the shift (and the grid marks it),
             the cross-store variant deliberately names nothing, and this says so rather than
             inventing a store. -->
        <div v-if="conflict" class="wf-page__conflict">
          <strong>{{ conflictHeadline }}</strong>
          <span>{{ conflictDetail }}</span>
        </div>

        <!-- The same guard, asked EARLY. Until this read existed the manager only met a cross-store
             double booking as the opaque 409 above, at publish, after the week was built. This says
             it while there is still something to do about it — and says it with the same opacity the
             refusal has: how many shifts collide and when, never which store the person is at. -->
        <div v-if="externalClashNotice" class="wf-page__notice wf-page__notice--warn">
          {{ externalClashNotice }}
        </div>

        <div v-if="stateNotice" class="wf-page__notice">
          {{ stateNotice }}
        </div>

        <WorkforceWeekGrid :grid="grid" :locale="locale" :currency="currency" />

        <section v-if="validation" class="wf-page__validation">
          <h2 class="wf-page__section-title">
            {{ $i('wf_validation_title') }}
          </h2>
          <p class="wf-page__validation-note">
            {{ validation.isValid ? $i('wf_validation_structural_ok') : $i('wf_validation_structural_bad') }}
            — {{ $i('wf_validation_note') }}
          </p>
          <ul class="wf-page__results">
            <li v-if="!validation.ruleResults.length" class="wf-page__result">
              {{ $i('wf_validation_no_results') }}
            </li>
            <li
              v-for="(result, index) in validation.ruleResults"
              :key="result.ruleId + '-' + index"
              class="wf-page__result"
              :class="'is-' + (result.result || 'unknown')"
            >
              <span class="wf-page__result-flag">{{ resultLabel(result.result) }}</span>
              <span class="wf-page__result-id">{{ result.ruleId }}</span>
              <span v-if="result.remediation" class="wf-page__result-text">{{ result.remediation }}</span>
            </li>
          </ul>
        </section>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import WorkforceWeekGrid from '~/components/admin/workforce/WorkforceWeekGrid.vue';
import { isWorkforceApiError, toUtcRangeParam } from '~/utils/workforce/api-client';
import { WorkforceScheduleService } from '~/utils/workforce/schedule-client';
import { weekRange, isoWeekNumber } from '~/utils/workforce/week-range';
import { buildWeekGrid, markersFromRequests, DATA_UNKNOWN, DATA_NO_PLAN } from '~/utils/workforce/week-grid';

const VIEW_DRAFT = 'draft';
const VIEW_PUBLISHED = 'published';

// The Workforce week grid page. Reads only; the schedule state machine (draft → validate → publish)
// is driven from here because those three routes are what make the draft/published distinction on
// screen real, and because publish is where the cross-store double-booking guard answers.
export default {
  name: 'AdminWorkforceSchedule',
  components: { AdminPage, WorkforceWeekGrid },
  data () {
    return {
      loading: false,
      busy: false,
      weekOffset: 0,
      view: VIEW_DRAFT,
      copyPreviousWeek: false,
      timeZoneId: null,
      capabilities: [],
      contextError: '',
      range: null,
      staff: null,
      markers: null,
      external: null,
      validation: null,
      conflict: null,
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
    locale () {
      return this.$store.state.adminLocale || 'no';
    },
    // The market is the single source for currency (`marketConfig`), and it is what `priceLabel`
    // already formats in. Passed down so the grid can tell a figure it CAN print in that currency
    // from one the rates priced in another — it refuses the symbol rather than relabel the money.
    currency () {
      return (this.marketConfig && this.marketConfig.currency) || null;
    },
    _workforceScheduleService () {
      return new WorkforceScheduleService(this._coreInitializer);
    },
    week () {
      // Without the store's own timezone the week cannot be placed, so nothing is guessed: the page
      // blocks on the context read instead of falling back to the browser's zone.
      if (!this.timeZoneId) { return null; }
      return weekRange(this.timeZoneId, new Date(), this.weekOffset);
    },
    weekLabel () {
      if (!this.week) { return '—'; }
      const first = this.week.days[0];
      const iso = isoWeekNumber(first.year, first.month, first.day);
      return this.$i('wf_week', { week: iso.week, year: iso.year });
    },
    grid () {
      return buildWeekGrid({
        days: this.week ? this.week.days : [],
        range: this.range,
        staff: this.staff,
        markers: this.markers,
        external: this.external,
        conflict: this.conflict
      });
    },
    viewOptions () {
      return [
        { key: VIEW_DRAFT, label: this.$i('wf_view_draft') },
        { key: VIEW_PUBLISHED, label: this.$i('wf_view_published') }
      ];
    },
    isScheduler () {
      return this.capabilities.includes('WorkforceScheduler');
    },
    isManager () {
      return this.capabilities.includes('WorkforceManager');
    },
    canCreateDraft () {
      return this.isScheduler && this.view === VIEW_DRAFT && this.grid.dataState === DATA_NO_PLAN;
    },
    canValidate () {
      return this.isScheduler && this.view === VIEW_DRAFT && !!this.grid.scheduleRevisionId;
    },
    canPublish () {
      return this.isManager && this.view === VIEW_DRAFT && this.grid.state === 'Validated';
    },
    stateBadge () {
      if (this.grid.dataState === DATA_UNKNOWN) { return { label: this.$i('wf_state_unknown'), tone: 'unknown' }; }
      if (this.grid.dataState === DATA_NO_PLAN) { return { label: this.$i('wf_state_none'), tone: 'none' }; }
      switch (this.grid.state) {
      case 'Draft': return { label: this.$i('wf_state_draft'), tone: 'draft' };
      case 'Validated': return { label: this.$i('wf_state_validated'), tone: 'validated' };
      case 'Published': return { label: this.$i('wf_state_published'), tone: 'published' };
      default: return { label: this.$i('wf_state_unknown'), tone: 'unknown' };
      }
    },
    stateNotice () {
      if (this.grid.dataState === DATA_UNKNOWN) { return this.$i('wf_unknown_range'); }
      if (this.grid.dataState !== DATA_NO_PLAN) { return ''; }
      return this.view === VIEW_PUBLISHED ? this.$i('wf_no_publication') : this.$i('wf_no_plan');
    },
    // Silent unless there is something to say. A zero here is a real zero — the overlay answered and
    // nothing collides — so it gets no banner; an overlay that did NOT answer says so in the grid's
    // own caveat instead, which is a different sentence.
    externalClashNotice () {
      const count = this.grid.externalClashCount;
      if (!count) { return ''; }
      return count === 1
        ? this.$i('wf_external_clash_notice_one')
        : this.$i('wf_external_clash_notice', { count });
    },
    // The surface has a whole family of typed conflicts (stale revision, unvalidated publish,
    // reused idempotency key). Only two of them are double-bookings, so the other kinds keep a
    // neutral headline and the server's own detail rather than being mislabelled.
    conflictHeadline () {
      if (!this.conflict) { return ''; }
      switch (this.conflict.conflictKind) {
      case 'hidden-engagement-conflict': return this.$i('wf_conflict_hidden_title');
      case 'assignment-overlap': return this.$i('wf_conflict_overlap_title');
      default: return this.$i('wf_conflict_generic_title');
      }
    },
    conflictDetail () {
      if (!this.conflict) { return ''; }
      switch (this.conflict.conflictKind) {
      case 'hidden-engagement-conflict': return this.$i('wf_conflict_hidden');
      case 'assignment-overlap': return this.$i('wf_conflict_overlap');
      default: return this.conflict.message;
      }
    }
  },
  watch: {
    storeId () { this.init(); },
    weekOffset () { this.load(); },
    view () { this.load(); }
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
      try {
        const context = await this._workforceScheduleService.GetContext(this.storeId);
        this.timeZoneId = context && context.timeZone ? context.timeZone.id : null;
        this.capabilities = (context && context.capabilities) || [];
        if (!this.timeZoneId) {
          this.contextError = this.$i('wf_context_failed');
          return;
        }
      } catch (e) {
        this.contextError = isWorkforceApiError(e) && e.status === 403
          ? this.$i('wf_no_capability')
          : this.$i('wf_context_failed');
        return;
      }
      await this.load();
    },

    async load () {
      if (!this.week || !this.storeId) { return; }
      this.loading = true;
      this.conflict = null;
      this.validation = null;
      // Cleared to unknown, not to empty: a failed or in-flight read must not render as an empty
      // week, which is a different claim.
      this.range = null;
      this.staff = null;
      this.markers = null;
      this.external = null;

      const from = toUtcRangeParam(this.week.startUtc);
      const to = toUtcRangeParam(this.week.endUtc);

      const [range, staff, requests, external] = await Promise.all([
        this._workforceScheduleService.GetRange(this.storeId, from, to, this.view).catch((e) => { this.notifyError(e); return null; }),
        this._workforceScheduleService.ListStaff(this.storeId).catch(() => null),
        // The absence read needs WorkforceManager. A scheduler-only caller gets a 403 here, and the
        // grid then says the absences are unknown rather than drawing everyone as available.
        this._workforceScheduleService.ListRequests(this.storeId, null, 'all').catch(() => null),
        // The cross-store overlay. Failing quietly on purpose: it is advisory, and the guard it
        // previews still runs server-side at publish either way. The grid then says the check did
        // not answer, which is not the same claim as "nobody is committed elsewhere".
        this._workforceScheduleService.GetExternalCommitments(this.storeId, from, to).catch(() => null)
      ]);

      this.range = range;
      this.staff = Array.isArray(staff) ? staff : null;
      this.markers = requests && Array.isArray(requests.items) ? markersFromRequests(requests.items) : null;
      this.external = external && Array.isArray(external.items) ? external : null;
      this.loading = false;
    },

    setView (view) {
      if (this.view !== view) { this.view = view; }
    },
    stepWeek (delta) {
      this.weekOffset += delta;
    },
    goToThisWeek () {
      this.weekOffset = 0;
    },

    async createDraft () {
      if (this.busy || !this.week) { return; }
      this.busy = true;
      try {
        const previous = weekRange(this.timeZoneId, new Date(), this.weekOffset - 1);
        const result = await this._workforceScheduleService.CreateDraft(this.storeId, {
          rangeStartUtc: toUtcRangeParam(this.week.startUtc),
          rangeEndUtc: toUtcRangeParam(this.week.endUtc),
          copyFromRangeStartUtc: this.copyPreviousWeek ? toUtcRangeParam(previous.startUtc) : null
        });
        this.notify(this.copyPreviousWeek
          ? this.$i('wf_copied', { count: (result && result.copiedAssignmentCount) || 0 })
          : this.$i('wf_draft_created'));
        await this.load();
      } catch (e) {
        this.handleMutationError(e);
      } finally {
        this.busy = false;
      }
    },

    async validate () {
      if (this.busy || !this.grid.scheduleRevisionId) { return; }
      this.busy = true;
      try {
        const receipt = await this._workforceScheduleService.Validate(this.storeId, this.grid.scheduleRevisionId);
        await this.load();
        // `load` resets the week, receipt included; the freshly produced one is put back after it.
        this.validation = receipt;
      } catch (e) {
        this.handleMutationError(e);
      } finally {
        this.busy = false;
      }
    },

    async publish () {
      if (this.busy || !this.grid.scheduleRevisionId) { return; }
      this.busy = true;
      const revisionId = this.grid.scheduleRevisionId;
      try {
        const publication = await this._workforceScheduleService.Publish(this.storeId, revisionId);
        this.notify(this.$i('wf_published_ok', { count: (publication && publication.recipientCount) || 0 }));
        // Switching the view is what reloads: the `view` watcher owns that, so calling `load` here
        // as well would fire the whole week's reads twice.
        this.view = VIEW_PUBLISHED;
      } catch (e) {
        this.handleMutationError(e);
      } finally {
        this.busy = false;
      }
    },

    handleMutationError (e) {
      if (isWorkforceApiError(e) && e.conflictKind) {
        this.conflict = e;
        return;
      }
      this.notifyError(e);
    },

    resultLabel (result) {
      switch (result) {
      case 'pass': return this.$i('wf_result_pass');
      case 'warn': return this.$i('wf_result_warn');
      case 'block': return this.$i('wf_result_block');
      default: return this.$i('wf_result_unknown');
      }
    },

    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 5000);
    },
    notifyError (e) {
      this.notify((e && e.message) || this.$i('wf_generic_error'), 'error');
    }
  }
};
</script>

<style scoped>
.wf-page { max-width: 1560px; margin: 0 auto; padding: 24px; }
.wf-page__header { margin-bottom: 18px; }
.wf-page__title { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.wf-page__intro { color: #64748b; margin: 0; }

.wf-page__toast { position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 10px; color: #fff; font-weight: 600; z-index: 1000; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
.wf-page__toast--success { background: #159f63; }
.wf-page__toast--error { background: #ef4444; }
.wf-toast-enter-active, .wf-toast-leave-active { transition: opacity 0.25s ease; }
.wf-toast-enter, .wf-toast-leave-to { opacity: 0; }

.wf-page__blocker { padding: 18px 20px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; color: #64748b; }

.wf-page__controls { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; margin-bottom: 14px; }
.wf-page__weeknav { display: flex; align-items: center; gap: 8px; }
.wf-page__week { font-weight: 600; color: #292c34; min-width: 130px; text-align: center; }
.wf-page__step { width: 34px; height: 34px; border: 1px solid #cbd5e0; background: #fff; border-radius: 8px; cursor: pointer; font-size: 1.1rem; line-height: 1; color: #292c34; }
.wf-page__step:disabled { opacity: 0.4; cursor: not-allowed; }

.wf-page__views { display: flex; gap: 4px; background: #f1f5f9; padding: 3px; border-radius: 9px; }
.wf-page__view { border: none; background: none; padding: 7px 16px; border-radius: 7px; font-weight: 600; color: #64748b; cursor: pointer; font-size: 0.86rem; }
.wf-page__view.is-active { background: #fff; color: #159f63; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08); }
.wf-page__view:disabled { cursor: not-allowed; }

.wf-page__actions { display: flex; align-items: center; gap: 8px; margin-left: auto; flex-wrap: wrap; }
.wf-page__copy { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 0.84rem; }
.wf-page__btn { border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; }
.wf-page__btn--ghost { background: #fff; color: #292c34; border: 1px solid #cbd5e0; }
.wf-page__btn:disabled { background: #cbd5e0; color: #fff; cursor: not-allowed; border-color: #cbd5e0; }

.wf-page__state { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.wf-page__badge { padding: 4px 12px; border-radius: 999px; font-size: 0.76rem; font-weight: 700; letter-spacing: 0.02em; }
.wf-page__badge--draft { background: #f1f5f9; color: #64748b; }
.wf-page__badge--validated { background: #fef3c7; color: #92400e; }
.wf-page__badge--published { background: rgba(27, 183, 118, 0.14); color: #159f63; }
.wf-page__badge--none, .wf-page__badge--unknown { background: #f8f9fa; color: #94a3b8; border: 1px dashed #cbd5e0; }
.wf-page__meta { color: #94a3b8; font-size: 0.78rem; }

.wf-page__conflict { display: flex; flex-direction: column; gap: 3px; padding: 12px 16px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: #b91c1c; margin-bottom: 12px; font-size: 0.86rem; }
.wf-page__notice { padding: 10px 16px; border-radius: 10px; background: #f8f9fa; border: 1px dashed #e2e8f0; color: #64748b; margin-bottom: 12px; font-size: 0.86rem; }
.wf-page__notice--warn { background: #fffbeb; border: 1px solid #fde68a; color: #92400e; }

.wf-page__validation { margin-top: 24px; }
.wf-page__section-title { font-size: 1.05rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.wf-page__validation-note { color: #64748b; font-size: 0.84rem; margin: 0 0 12px; }
.wf-page__results { list-style: none; margin: 0; padding: 0; }
.wf-page__result { display: flex; align-items: baseline; gap: 12px; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; font-size: 0.84rem; color: #292c34; }
.wf-page__result-flag { min-width: 78px; font-weight: 700; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.03em; color: #94a3b8; }
.wf-page__result.is-pass .wf-page__result-flag { color: #159f63; }
.wf-page__result.is-warn .wf-page__result-flag { color: #92400e; }
.wf-page__result.is-block .wf-page__result-flag { color: #ef4444; }
.wf-page__result-id { color: #64748b; font-family: monospace; font-size: 0.78rem; }
.wf-page__result-text { color: #64748b; }
</style>
