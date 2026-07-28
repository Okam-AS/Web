<template>
  <AdminPage full-width @login-success="init">
    <div class="wfr-page">
      <div class="wfr-page__header">
        <h1 class="wfr-page__title">
          {{ $i('wfr_page_title') }}
        </h1>
        <p class="wfr-page__intro">
          {{ $i('wfr_page_intro') }}
        </p>
      </div>

      <transition name="wfr-toast">
        <div v-if="toast.show" class="wfr-page__toast" :class="'wfr-page__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="contextError" class="wfr-page__blocker">
        {{ contextError }}
      </div>

      <template v-else>
        <div class="wfr-page__controls">
          <button v-if="canManage" class="wfr-page__btn" :disabled="busy" @click="adding = !adding">
            {{ adding ? $i('wfr_cancel') : $i('wfr_add_open') }}
          </button>
          <button class="wfr-page__btn wfr-page__btn--ghost" :disabled="loading" @click="loadRoster">
            {{ $i('wfr_reload') }}
          </button>
          <span v-if="!canManage" class="wfr-page__readonly">{{ $i('wfr_read_only') }}</span>
        </div>

        <!-- The server's typed refusals, kept apart because they mean genuinely different things.
             The same-store conflict names the engagement (the manager can see it on the table);
             the cross-store one names nothing at all, and this says so rather than inventing a
             store the response deliberately withheld. -->
        <div v-if="conflict" class="wfr-page__conflict">
          <strong>{{ conflictHeadline }}</strong>
          <span>{{ conflictDetail }}</span>
        </div>

        <div class="wfr-page__body">
          <div class="wfr-page__main">
            <WorkforceAddPersonForm
              v-if="adding && canManage"
              :key="addFormKey"
              :roster="roster"
              :busy="busy"
              @submit="createStaff"
              @cancel="adding = false"
            />

            <WorkforceRosterTable
              :roster="roster"
              :time-zone-id="timeZoneId"
              :locale="locale"
              :selected-id="selectedId"
              @select="select"
            />
          </div>

          <WorkforceEngagementPanel
            v-if="selectedRow"
            :key="selectedRow.staffMemberId"
            class="wfr-page__panel"
            :row="selectedRow"
            :detail="detail"
            :roster="roster"
            :roles="roles"
            :staff-roles="staffRoles"
            :terms="terms"
            :effects="effects"
            :can-manage="canManage && canPatch"
            :has-payroll-approver="hasPayrollApprover"
            :store-id="storeId"
            :time-zone-id="timeZoneId"
            :locale="locale"
            :busy="busy"
            :as-of="asOf"
            @close="clearSelection"
            @save-capabilities="saveCapabilities"
            @save-numbers="saveNumbers"
            @save-roles="saveRoles"
            @save-term="saveTerm"
            @end="endEngagement"
            @reactivate="reactivate"
          />
        </div>

        <!-- The engagement is editable only with the opaque revision the detail read carries. The
             backend returns none under SQLite (no rowversion), and PATCH refuses without an
             If-Match, so the panel says the edit is unavailable rather than firing a 400. -->
        <p v-if="selectedRow && detail && !canPatch" class="wfr-page__notice">
          {{ $i('wfr_no_revision') }}
        </p>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import WorkforceRosterTable from '~/components/admin/workforce/WorkforceRosterTable.vue';
import WorkforceAddPersonForm from '~/components/admin/workforce/WorkforceAddPersonForm.vue';
import WorkforceEngagementPanel from '~/components/admin/workforce/WorkforceEngagementPanel.vue';
import { isWorkforceApiError } from '~/utils/workforce/api-client';
import { WorkforceRosterService } from '~/utils/workforce/roster-client';
import {
  CAPABILITY_MANAGER,
  CAPABILITY_PAYROLL,
  ROSTER_UNKNOWN,
  activeEngagementConflict,
  buildCreateRequest,
  buildEndRequest,
  buildReactivateRequest,
  buildRoles,
  buildRoster,
  buildTermRequest,
  buildTerms,
  buildUpdateRequest,
  callerHas,
  endEngagementEffects
} from '~/utils/workforce/roster';

// How far back the open-session probe looks. A clock session left open days ago is exactly the
// case the probe exists for, so a window of "today" would miss the only interesting answer; thirty
// days is one read and covers any realistic stranding.
const OPEN_SESSION_LOOKBACK_DAYS = 30;
const DAY_MS = 86400000;

// The store's roster: who is engaged here, what each engagement may do, and how one ends.
//
// The page is the ONLY thing on this surface that binds `POST /staff`. Before it existed a venue's
// roster could only come into being through a seed or an import, so a new store could not start
// using the module at all.
//
// Nothing here reads or renders anything about another store. A person is chain-wide and may be
// engaged in several venues at once, but the engagements are what this screen manages and every
// read it makes is store-scoped by route. The one place other stores exist at all is the server's
// opaque `workforce.hidden-engagement-conflict`, which names nothing — and neither does this page.
export default {
  name: 'AdminWorkforceRoster',
  components: { AdminPage, WorkforceRosterTable, WorkforceAddPersonForm, WorkforceEngagementPanel },
  data () {
    return {
      loading: false,
      busy: false,
      adding: false,
      addFormKey: 0,
      contextError: '',
      timeZoneId: null,
      capabilities: [],
      // null everywhere means UNKNOWN. An empty array is a positive answer and a different claim;
      // the two are never initialised to the same value.
      staff: null,
      roleCatalogue: null,
      selectedId: null,
      detail: null,
      staffRoles: null,
      terms: null,
      attendance: null,
      conflict: null,
      asOf: new Date(),
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
    _workforceRosterService () {
      return new WorkforceRosterService(this._coreInitializer);
    },
    canManage () {
      return callerHas(this.capabilities, CAPABILITY_MANAGER);
    },
    hasPayrollApprover () {
      return callerHas(this.capabilities, CAPABILITY_PAYROLL);
    },
    roster () {
      return buildRoster(this.staff);
    },
    roles () {
      return buildRoles(this.roleCatalogue, this.asOf);
    },
    selectedRow () {
      if (!this.selectedId || this.roster.state === ROSTER_UNKNOWN) { return null; }
      return this.roster.rows.find(row => row.staffMemberId === this.selectedId) || null;
    },
    /** Without the opaque revision there is no If-Match, and PATCH is a 400 before it starts. */
    canPatch () {
      return !!(this.detail && this.detail.revision);
    },
    effects () {
      return endEngagementEffects(this.roster, this.selectedRow, this.attendance);
    },
    conflictHeadline () {
      if (!this.conflict) { return ''; }
      switch (this.conflict.code) {
      case 'workforce.hidden-engagement-conflict': return this.$i('wfr_conflict_hidden_title');
      case 'workforce.engagement-conflict': return this.$i('wfr_conflict_same_store_title');
      case 'workforce.stale-revision': return this.$i('wfr_conflict_stale_title');
      default: return this.$i('wfr_conflict_generic_title');
      }
    },
    conflictDetail () {
      if (!this.conflict) { return ''; }
      switch (this.conflict.code) {
      // Names nothing on purpose: the refusal itself carries no store, no engagement and no time,
      // and a screen that said more than the refusal would be the leak the refusal prevents.
      case 'workforce.hidden-engagement-conflict': return this.$i('wfr_conflict_hidden');
      case 'workforce.engagement-conflict': return this.$i('wfr_conflict_same_store');
      case 'workforce.stale-revision': return this.$i('wfr_conflict_stale');
      default: return this.conflict.message;
      }
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
      this.clearSelection();
      try {
        const context = await this._workforceRosterService.GetContext(this.storeId);
        this.timeZoneId = context && context.timeZone ? context.timeZone.id : null;
        this.capabilities = (context && context.capabilities) || [];
        if (!this.timeZoneId) {
          // Every date on this page is rendered in the store's zone. Without it the page would be
          // rendering the viewer's zone and calling it the store's, so it renders nothing.
          this.contextError = this.$i('wfr_context_failed');
          return;
        }
      } catch (e) {
        this.contextError = isWorkforceApiError(e) && e.status === 403
          ? this.$i('wfr_no_capability')
          : this.$i('wfr_context_failed');
        return;
      }
      await this.loadRoster();
    },

    async loadRoster () {
      if (!this.storeId) { return; }
      this.loading = true;
      // Cleared to unknown, never to empty: an in-flight or failed read must not spend a frame
      // claiming this store has no staff.
      this.staff = null;
      this.roleCatalogue = null;

      const [staff, roles] = await Promise.all([
        this._workforceRosterService.ListStaff(this.storeId).catch((e) => { this.notifyError(e); return null; }),
        // The job-role catalogue is a separate read with the same capability. A failure leaves the
        // role list unknown; the panel then says so rather than showing a shorter one.
        this._workforceRosterService.ListRoles(this.storeId).catch(() => null)
      ]);

      this.staff = Array.isArray(staff) ? staff : null;
      this.roleCatalogue = Array.isArray(roles) ? roles : null;
      this.loading = false;

      if (this.selectedId) { await this.loadEngagement(this.selectedId); }
    },

    select (row) {
      this.selectedId = row.staffMemberId;
      this.loadEngagement(row.staffMemberId);
    },

    clearSelection () {
      this.selectedId = null;
      this.detail = null;
      this.staffRoles = null;
      this.terms = null;
      this.attendance = null;
    },

    async loadEngagement (staffMemberId) {
      this.detail = null;
      this.staffRoles = null;
      this.terms = null;
      this.attendance = null;

      const to = new Date(this.asOf.getTime() + DAY_MS);
      const from = new Date(this.asOf.getTime() - OPEN_SESSION_LOOKBACK_DAYS * DAY_MS);

      const [detail, staffRoles, terms, attendance] = await Promise.all([
        this._workforceRosterService.GetStaff(this.storeId, staffMemberId).catch(() => null),
        this._workforceRosterService.ListStaffRoles(this.storeId, staffMemberId).catch(() => null),
        // Terms need WorkforceManager; a scheduler-only caller gets a 403 and the panel then says
        // the terms are unknown rather than that this engagement has none.
        this._workforceRosterService.GetEmploymentTerms(this.storeId, staffMemberId).catch(() => null),
        // Advisory, and never allowed to read as a clear when it fails — see `openSessionCount`.
        this._workforceRosterService.GetAttendance(this.storeId, from, to).catch(() => null)
      ]);

      // A selection that moved while these were in flight must not adopt the previous person's
      // answers.
      if (this.selectedId !== staffMemberId) { return; }

      this.detail = detail;
      this.staffRoles = Array.isArray(staffRoles) ? staffRoles : null;
      this.terms = buildTerms(terms, this.hasPayrollApprover);
      this.attendance = attendance;
    },

    async createStaff (form) {
      if (this.busy) { return; }
      this.busy = true;
      this.conflict = null;
      try {
        const created = await this._workforceRosterService.CreateStaff(
          this.storeId,
          buildCreateRequest(form, this.timeZoneId)
        );
        this.notify(this.$i('wfr_added_ok'));
        this.adding = false;
        // A fresh form next time rather than the previous person's details half-filled in.
        this.addFormKey += 1;
        await this.loadRoster();
        if (created && created.staffMemberId) { this.select({ staffMemberId: created.staffMemberId }); }
      } catch (e) {
        this.handleMutationError(e);
      } finally {
        this.busy = false;
      }
    },

    saveCapabilities (capabilities) {
      return this.patch(buildUpdateRequest({ capabilitiesTouched: true, capabilities }), 'wfr_saved_ok');
    },

    saveNumbers (form) {
      // `capabilitiesTouched: false` so the grant set is left alone: a non-null capability list
      // REPLACES it, and sending one here would let a number edit silently rewrite what someone may
      // do.
      return this.patch(buildUpdateRequest({
        capabilitiesTouched: false,
        employmentNumber: form.employmentNumber,
        payrollNumber: form.payrollNumber
      }), 'wfr_saved_ok');
    },

    async saveRoles (roleIds) {
      if (this.busy || !this.selectedId) { return; }
      this.busy = true;
      this.conflict = null;
      try {
        // PUT sets the roles to EXACTLY this set; the panel always sends the full intended list.
        await this._workforceRosterService.AssignStaffRoles(
          this.storeId,
          this.selectedId,
          roleIds.map(roleId => ({ roleId, skills: null, skillExpiryUtc: null, effectiveFromUtc: null, effectiveToUtc: null }))
        );
        this.notify(this.$i('wfr_saved_ok'));
        await this.loadEngagement(this.selectedId);
      } catch (e) {
        this.handleMutationError(e);
      } finally {
        this.busy = false;
      }
    },

    async saveTerm (form) {
      if (this.busy || !this.selectedId) { return; }
      this.busy = true;
      this.conflict = null;
      try {
        // An append, never an edit: the server closes the previous open term at the new one's
        // effective instant, so the history stays a chain of non-overlapping facts.
        await this._workforceRosterService.CreateEmploymentTerm(
          this.storeId,
          this.selectedId,
          buildTermRequest(form, this.timeZoneId, this.hasPayrollApprover)
        );
        this.notify(this.$i('wfr_saved_ok'));
        await this.loadEngagement(this.selectedId);
      } catch (e) {
        this.handleMutationError(e);
      } finally {
        this.busy = false;
      }
    },

    endEngagement (form) {
      return this.patch(buildEndRequest(form, this.timeZoneId), 'wfr_ended_ok');
    },

    reactivate () {
      if (!this.selectedRow) { return Promise.resolve(); }
      // The same index that governs a create governs a reactivation: an active engagement for this
      // (person, employer) elsewhere in this store makes it impossible, and the row can be seen, so
      // it is refused here rather than through a 409.
      const clash = activeEngagementConflict(
        this.roster.rows,
        this.selectedRow.workforcePersonId,
        this.selectedRow.legalEmployerId,
        this.selectedRow.staffMemberId
      );
      if (clash) {
        this.conflict = { code: 'workforce.engagement-conflict', message: '' };
        return Promise.resolve();
      }
      return this.patch(buildReactivateRequest(), 'wfr_reactivated_ok');
    },

    /** Every engagement mutation is the same PATCH with the same precondition. */
    async patch (request, successKey) {
      if (this.busy || !this.selectedId || !this.canPatch) { return; }
      this.busy = true;
      this.conflict = null;
      try {
        await this._workforceRosterService.UpdateStaff(this.storeId, this.selectedId, this.detail.revision, request);
        this.notify(this.$i(successKey));
        await this.loadRoster();
      } catch (e) {
        this.handleMutationError(e);
        // A stale revision means somebody else already changed this engagement. Re-reading is the
        // only way the screen stops showing a version that no longer exists.
        if (isWorkforceApiError(e) && e.code === 'workforce.stale-revision') { await this.loadRoster(); }
      } finally {
        this.busy = false;
      }
    },

    handleMutationError (e) {
      if (isWorkforceApiError(e) && e.status === 409) {
        this.conflict = e;
        return;
      }
      this.notifyError(e);
    },

    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 5000);
    },
    notifyError (e) {
      this.notify((e && e.message) || this.$i('wfr_generic_error'), 'error');
    }
  }
};
</script>

<style scoped>
.wfr-page { max-width: 1560px; margin: 0 auto; padding: 24px; }
.wfr-page__header { margin-bottom: 18px; }
.wfr-page__title { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.wfr-page__intro { color: #64748b; margin: 0; }

.wfr-page__toast { position: fixed; top: 20px; right: 20px; padding: 12px 20px; border-radius: 10px; color: #fff; font-weight: 600; z-index: 1000; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2); }
.wfr-page__toast--success { background: #159f63; }
.wfr-page__toast--error { background: #ef4444; }
.wfr-toast-enter-active, .wfr-toast-leave-active { transition: opacity 0.25s ease; }
.wfr-toast-enter, .wfr-toast-leave-to { opacity: 0; }

.wfr-page__blocker { padding: 18px 20px; border-radius: 12px; background: #fff; border: 1px solid #e2e8f0; color: #64748b; }
.wfr-page__controls { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.wfr-page__readonly { color: #94a3b8; font-size: 0.8rem; }
.wfr-page__btn { border: none; background: #1bb776; color: #fff; font-weight: 600; padding: 9px 18px; border-radius: 8px; cursor: pointer; font-size: 0.88rem; }
.wfr-page__btn--ghost { background: #fff; color: #292c34; border: 1px solid #cbd5e0; }
.wfr-page__btn:disabled { background: #cbd5e0; color: #fff; cursor: not-allowed; border-color: #cbd5e0; }

.wfr-page__conflict { display: flex; flex-direction: column; gap: 3px; padding: 12px 16px; border-radius: 10px; background: rgba(239, 68, 68, 0.1); color: #b91c1c; margin-bottom: 12px; font-size: 0.86rem; }
.wfr-page__notice { padding: 10px 16px; border-radius: 10px; background: #f8f9fa; border: 1px dashed #e2e8f0; color: #64748b; margin-top: 12px; font-size: 0.84rem; }

.wfr-page__body { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 20px; align-items: start; }
.wfr-page__main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }

@media (max-width: 1100px) {
  .wfr-page__body { grid-template-columns: minmax(0, 1fr); }
}
</style>
