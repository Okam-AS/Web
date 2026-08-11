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
          <button v-if="canManage" class="wfr-page__btn" :disabled="busy" @click="toggleAdding">
            {{ adding ? $i('wfr_cancel') : $i('wfr_add_open') }}
          </button>
          <button v-if="canManage" class="wfr-page__btn wfr-page__btn--ghost" data-wfr-open-employer :disabled="busy" @click="toggleRegisteringEmployer">
            {{ registeringEmployer ? $i('wfr_cancel') : $i('wfr_emp_open') }}
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
            <WorkforceLegalEmployerForm
              v-if="registeringEmployer && canManage"
              :key="employerFormKey"
              :employers="employers"
              :busy="busy"
              @submit="createLegalEmployer"
              @cancel="registeringEmployer = false"
            />

            <WorkforceAddPersonForm
              v-if="adding && canManage"
              :key="addFormKey"
              :roster="roster"
              :employers="employers"
              :busy="busy"
              @submit="createStaff"
              @register-employer="openEmployerForm"
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

          <!-- `can-invite` is NOT `canManage && canPatch`, and the difference is deliberate. Every
               other write this panel offers is the one PATCH, which is a plain 400 without the opaque
               revision the detail read carries — hence `can-manage`. Issuing an invitation is a
               different route with a different precondition: it takes no If-Match at all (the
               invitation is a child resource with its own single-pending guard, not an
               optimistic-concurrency aggregate), so a deployment whose backend returns no rowversion
               — SQLite, where `revision` is null — can still onboard a worker. Reusing `canPatch`
               here would hide the module's only way IN from exactly the deployments that need it. -->
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
            :invitation="invitation"
            :invitations="invitations"
            :can-manage="canManage && canPatch"
            :can-invite="canManage"
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
            @issue-invitation="issueInvitation"
            @revoke-invitation="revokeInvitation"
            @dismiss-invitation="invitation = null"
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
import WorkforceLegalEmployerForm from '~/components/admin/workforce/WorkforceLegalEmployerForm.vue';
import { isWorkforceApiError } from '~/utils/workforce/api-client';
import { contextRefusalKey } from '~/utils/workforce/context-refusal';
import { WorkforceRosterService } from '~/utils/workforce/roster-client';
import {
  CAPABILITY_MANAGER,
  CAPABILITY_PAYROLL,
  ROSTER_UNKNOWN,
  activeEngagementConflict,
  buildCreateRequest,
  buildEmployerRequest,
  buildEmployers,
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
  components: { AdminPage, WorkforceRosterTable, WorkforceAddPersonForm, WorkforceEngagementPanel, WorkforceLegalEmployerForm },
  data () {
    return {
      loading: false,
      busy: false,
      adding: false,
      addFormKey: 0,
      registeringEmployer: false,
      employerFormKey: 0,
      contextError: '',
      timeZoneId: null,
      capabilities: [],
      // null everywhere means UNKNOWN. An empty array is a positive answer and a different claim;
      // the two are never initialised to the same value.
      staff: null,
      roleCatalogue: null,
      // `GET /legal-employers`, or null while unknown. This is the roster's PREREQUISITE, not a
      // detail of it: POST /staff refuses without a legalEmployerId, so a store with none cannot hire
      // at all — which is why the add form turns the empty answer into an offer to register one, and
      // why a failed read must stay distinguishable from it.
      legalEmployers: null,
      selectedId: null,
      detail: null,
      staffRoles: null,
      terms: null,
      attendance: null,
      // The last `POST /staff/{id}/invitations` response, held ONLY in memory and ONLY for the
      // selected engagement. It carries the raw claim token, which the server keeps a hash of and
      // will never answer with again — so it is deliberately not persisted, not put in the store and
      // not restored on reload. Cleared on every selection change (see `clearSelection`), so one
      // person's code can never be on screen under another person's name.
      invitation: null,
      // The store's OUTSTANDING invitations (`GET /workforce/stores/{storeId}/invitations`), or null
      // while unknown. Store-scoped rather than per-engagement because that is the route's shape and
      // because "which codes are still out there" is a store-wide question; the panel narrows it.
      //
      // It carries NO token and no token hash — unlike `invitation` above, this is safe to re-read,
      // and it is re-read after every issue and every revoke so the list on screen is never a
      // description of a world one press old.
      invitations: null,
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
    employers () {
      return buildEmployers(this.legalEmployers, this.staff ? this.roster.rows : null);
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
      case 'workforce.invitation-issue-conflict': return this.$i('wfr_conflict_invitation_title');
      case 'workforce.invitation-not-revocable': return this.$i('wfr_conflict_revoke_claimed_title');
      case 'workforce.invitation-revoke-conflict': return this.$i('wfr_conflict_revoke_stale_title');
      case 'workforce.legal-employer-exists': return this.$i('wfr_conflict_employer_exists_title');
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
      // Retryable, and the retry is simply pressing the button again: `_mutate` mints a fresh
      // `Idempotency-Key` per call, which is exactly what this refusal demands.
      case 'workforce.invitation-issue-conflict': return this.$i('wfr_conflict_invitation');
      // THE ONE REFUSAL A QUIET SUCCESS WOULD MAKE DANGEROUS. A manager withdraws because the code
      // went to the wrong person; if that person has already signed in, a 200 would tell them they
      // are safe at the exact moment they are not. Surfaced in full, and it names the thing that
      // DOES remove access — ending the engagement — because withdrawal cannot undo a link.
      case 'workforce.invitation-not-revocable': return this.$i('wfr_conflict_revoke_claimed');
      // Retryable on the wire, but a blind retry is the wrong instruction: the manager decided
      // against a state that no longer holds, so they are sent back to the list rather than to the
      // button. The list behind them has already been re-read by the handler.
      case 'workforce.invitation-revoke-conflict': return this.$i('wfr_conflict_revoke_stale');
      // NOT retryable, and not really a failure either: this store already registered that
      // organization number and the refusal names the row. The list behind this band has been
      // re-read, so the employer the manager was about to create is now on screen to be used.
      case 'workforce.legal-employer-exists': return this.$i('wfr_conflict_employer_exists');
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
        this.contextError = this.$i(contextRefusalKey(e, {
          noCapability: 'wfr_no_capability',
          failed: 'wfr_context_failed'
        }));
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
      this.legalEmployers = null;
      this.invitations = null;

      const [staff, roles, employers] = await Promise.all([
        this._workforceRosterService.ListStaff(this.storeId).catch((e) => { this.notifyError(e); return null; }),
        // The job-role catalogue is a separate read with the same capability. A failure leaves the
        // role list unknown; the panel then says so rather than showing a shorter one.
        this._workforceRosterService.ListRoles(this.storeId).catch(() => null),
        // The legal employers. Silent on failure like the roles read: the add form already prints
        // "we could not read this", and a toast for a list the manager is not looking at yet would
        // fire on every page load a scheduler makes.
        this._workforceRosterService.ListLegalEmployers(this.storeId).catch(() => null),
        // Outstanding invitations, read ONCE for the whole store rather than per engagement: the
        // route is store-scoped, and one read then serves every row the manager clicks through.
        this.loadInvitations()
      ]);

      this.staff = Array.isArray(staff) ? staff : null;
      this.roleCatalogue = Array.isArray(roles) ? roles : null;
      this.legalEmployers = Array.isArray(employers) ? employers : null;
      this.loading = false;

      if (this.selectedId) { await this.loadEngagement(this.selectedId); }
    },

    select (row) {
      this.selectedId = row.staffMemberId;
      // A held token belongs to the engagement it was minted for and to no other. Dropping it as the
      // selection moves is not tidiness: it is what stops a manager copying Kari's code off a panel
      // headed with Ola's name.
      this.invitation = null;
      this.loadEngagement(row.staffMemberId);
    },

    clearSelection () {
      this.selectedId = null;
      this.detail = null;
      this.staffRoles = null;
      this.terms = null;
      this.attendance = null;
      this.invitation = null;
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

    /** The two forms are alternatives, not a stack: opening one closes the other. */
    toggleAdding () {
      this.adding = !this.adding;
      if (this.adding) { this.registeringEmployer = false; }
    },

    toggleRegisteringEmployer () {
      this.registeringEmployer = !this.registeringEmployer;
      if (this.registeringEmployer) { this.adding = false; }
    },

    /** From the add form's empty-employer branch: swap the hiring form for the registration one. */
    openEmployerForm () {
      this.adding = false;
      this.registeringEmployer = true;
    },

    /**
     * Register the legal entity this store's staff are employed by — the roster's first step, and
     * before this existed a step no customer could take: `POST /staff` requires a `legalEmployerId`
     * and the only writer of `WorkforceLegalEmployer` was a raw SQL insert in the demo seed.
     *
     * The roster is re-read on EVERY outcome, refusals included, because both of them change what
     * this page should be showing. On success the new employer must be in the picker the manager is
     * about to use. On `workforce.legal-employer-exists` the row the refusal names already existed —
     * and if it was missing from the list on screen, that list was stale, which is the one reading
     * under which the manager would have pressed this button at all.
     */
    async createLegalEmployer (form) {
      if (this.busy) { return; }
      this.busy = true;
      this.conflict = null;
      let registered = false;
      try {
        await this._workforceRosterService.CreateLegalEmployer(this.storeId, buildEmployerRequest(form));
        registered = true;
        this.notify(this.$i('wfr_emp_registered_ok'));
        this.registeringEmployer = false;
        this.employerFormKey += 1;
      } catch (e) {
        this.handleMutationError(e);
      } finally {
        await this.loadRoster();
        // Opened only AFTER the re-read, and re-keyed with it. The add form picks its default
        // employer in `created`, so opening it first would build it against the list from before the
        // registration — the one that did not contain the employer this call just made.
        if (registered) {
          this.addFormKey += 1;
          // Straight on to hiring: registering an employer is never the goal, it is the thing in the
          // way of the goal.
          this.adding = true;
        }
        this.busy = false;
      }
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

    /**
     * Issue (or reissue) this engagement's claim invitation — the module's ONLY way for a worker to
     * acquire a login, and therefore the only route by which anything on `/workforce/me` becomes
     * reachable by a human at all.
     *
     * The response is put on `this.invitation` and NOWHERE else. It carries the raw token exactly
     * once; the server stores a hash, so if this object is lost the code is gone and the only remedy
     * is issuing a new one (which kills the old). That is why the panel renders the handover INSTEAD
     * of the issue button, and why a re-read of the roster afterwards is deliberately NOT done here:
     * `loadRoster` re-runs `loadEngagement`, and the token would survive that only by accident.
     *
     * A 409 goes through the same conflict band as every other mutation. The invitation-specific one
     * (`workforce.invitation-issue-conflict`) is retryable but demands a FRESH Idempotency-Key —
     * which is automatic here, because `_mutate` mints one per call, so simply pressing again is the
     * correct retry rather than a resubmission of a reserved key.
     */
    async issueInvitation (request) {
      if (this.busy || !this.selectedId) { return; }
      this.busy = true;
      this.conflict = null;
      try {
        this.invitation = await this._workforceRosterService.IssueInvitation(
          this.storeId,
          this.selectedId,
          // An out-of-range or blank lifetime sends no field at all rather than a guess: the server's
          // own default (14 days) is a better answer than a number this page invented.
          request && request.expiresInHours ? { expiresInHours: request.expiresInHours } : {}
        );
        this.notify(this.$i('wfr_invitation_issued'));
        // Re-read the outstanding list so the code just minted is in it, and so the one it
        // superseded is not. This is safe where a roster re-read is not: the list carries no token,
        // so refreshing it cannot destroy the one thing on this page that is unrecoverable.
        await this.loadInvitations();
      } catch (e) {
        this.handleMutationError(e);
      } finally {
        this.busy = false;
      }
    },

    /**
     * Re-read the store's outstanding invitations.
     *
     * A FAILURE LEAVES THE LIST UNKNOWN (null), NEVER EMPTY. "No code is outstanding" is the one
     * answer a manager acts on — it is what tells them the leaked code they are worried about is
     * already dead — so a read that did not answer must not be able to produce it. The panel prints
     * "we could not read this" instead, which is a different sentence and a different decision.
     *
     * Silent rather than a toast: this read rides along with every roster load and every invitation
     * write, so a persistent failure would otherwise fire a notification the manager cannot act on.
     * The unknown state is already on screen in the place it matters.
     */
    async loadInvitations () {
      if (!this.storeId) { return; }
      try {
        const items = await this._workforceRosterService.ListInvitations(this.storeId);
        this.invitations = Array.isArray(items) ? items : null;
      } catch (e) {
        this.invitations = null;
      }
    },

    /**
     * Withdraw an outstanding invitation.
     *
     * The remedy for a code that went to the wrong person, and the one that does NOT mint a
     * replacement — a reissue also kills the previous token, but it hands out a new one, which is
     * not what a manager wants when the answer is "nobody should have a code for this engagement".
     *
     * A REFUSAL IS NOT SWALLOWED. `workforce.invitation-not-revocable` means the code was already
     * used, and it is the one 409 on this page where a quiet success would be actively dangerous:
     * the manager is withdrawing precisely because they think the wrong person has it, and a 200
     * would confirm safety at the moment there is none. It goes through the same conflict band as
     * every other mutation, where the copy names ending the engagement as what actually removes
     * access.
     *
     * The list is re-read on EVERY outcome, refusals included. A refusal means the row was not what
     * the manager believed it to be, and leaving the stale entry on screen beside the explanation
     * would have the page contradicting itself.
     *
     * AND ON `not-revocable` THE WHOLE ROSTER IS RE-READ, not just the list. That refusal MEANS the
     * engagement's person state moved to `Claimed` while the list was on screen — so without this
     * the panel sits there saying "no login is attached to this engagement yet" directly above a
     * refusal explaining that somebody signed in with the code. Two sentences, one screen, flatly
     * contradicting each other, in the one moment a manager is relying on the page to tell them
     * whether the wrong person got in. Found by looking at the screenshot rather than at the
     * selectors, which is why the journey now asserts the access line catches up.
     */
    async revokeInvitation (invite) {
      if (this.busy || !invite || !invite.invitationId) { return; }
      this.busy = true;
      this.conflict = null;
      let alreadyClaimed = false;
      try {
        await this._workforceRosterService.RevokeInvitation(this.storeId, invite.invitationId);
        this.notify(this.$i('wfr_access_revoked_ok'));
      } catch (e) {
        alreadyClaimed = isWorkforceApiError(e) && e.code === 'workforce.invitation-not-revocable';
        this.handleMutationError(e);
      } finally {
        // `loadRoster` re-reads the invitations as part of its own fan-out, so this is one or the
        // other rather than both.
        await (alreadyClaimed ? this.loadRoster() : this.loadInvitations());
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
