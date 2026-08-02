<template>
  <!-- `allow-non-admin`: the ONE page in /admin whose reader is not an admin of anything. Every
       route it calls is `/workforce/me`, which resolves the caller's own engagements from the token
       and takes no store id, so the shell's store-admin membership check would bounce exactly the
       user this page was built for. Authentication is unchanged — an anonymous visitor still gets
       the login modal and the redirect back. See AdminPage's prop for the full rationale. -->
  <AdminPage allow-non-admin @login-success="init">
    <div class="wfme">
      <header class="wfme__header">
        <h1 class="wfme__title">
          {{ $i('wfme_page_title') }}
        </h1>
        <p class="wfme__intro">
          {{ $i('wfme_page_intro') }}
        </p>
      </header>

      <transition name="wfme-toast">
        <div v-if="toast.show" class="wfme__toast" :class="'wfme__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <!-- A failed read is announced where it happened and nowhere else. Losing the engagement list
           does not hide the schedule — #33 resolves the worker from the token and needs no
           membership — and the tabs that DO need it fall to their own unknown states. -->
      <div v-if="membershipsFailed" class="wfme__note wfme__note--warn">
        {{ $i('wfme_memberships_failed') }}
      </div>
      <div v-if="inboxFailed" class="wfme__note wfme__note--warn">
        {{ $i('wfme_inbox_failed') }}
      </div>

      <!-- Loaded, and this account holds no self-service engagement anywhere. That is a fact about
           the account rather than a failure, so it gets no error tone and no retry button. -->
      <div v-if="selfMemberships && selfMemberships.length === 0" class="wfme__blocker">
        {{ $i('wfme_no_engagement') }}
      </div>

      <template v-else>
        <WorkforcePublicationNotice
          :items="unreadPublicationItems"
          :receipts="ackReceipts"
          :busy-id="busyKey"
          :locale="locale"
          @mark-read="markRead"
          @acknowledge="acknowledge"
        />

        <nav class="wfme__tabs">
          <button
            v-for="option in tabs"
            :key="option.key"
            class="wfme__tab"
            :class="{ 'is-active': tab === option.key }"
            @click="tab = option.key"
          >
            {{ option.label }}
          </button>
        </nav>

        <!-- ---------------- My shifts ---------------- -->
        <section v-if="tab === 'shifts'" class="wfme__panel">
          <p class="wfme__window">
            {{ $i('wfme_window', { days: WINDOW_DAYS }) }}
          </p>

          <div v-if="loading && !scheduleGroups" class="wfme__loading">
            {{ $i('wfme_loading') }}
          </div>

          <template v-else-if="scheduleGroups && scheduleGroups.length">
            <div v-for="group in scheduleGroups" :key="group.key" class="wfme__day">
              <h2 class="wfme__dayhead">
                {{ formatDay(group.key) }}
              </h2>
              <ul class="wfme__list">
                <WorkforceShiftCard
                  v-for="shift in group.items"
                  :key="shift.shiftAssignmentId"
                  :shift="shift"
                  :locale="locale"
                />
              </ul>
            </div>
          </template>

          <!-- The four empty screens are four different claims. See scheduleState(). -->
          <div v-else class="wfme__empty">
            <p class="wfme__emptytitle">
              {{ $i(scheduleMessageKey) }}
            </p>
            <p v-if="scheduleStateToken === SCHEDULE_UNKNOWN" class="wfme__emptyhint">
              {{ $i('wfme_schedule_unknown_hint') }}
            </p>
            <p v-else class="wfme__emptyhint">
              {{ $i('wfme_draft_never_shown') }}
            </p>
            <button v-if="scheduleStateToken === SCHEDULE_UNKNOWN" class="wfme__btn wfme__btn--ghost" @click="init">
              {{ $i('wfme_reload') }}
            </button>
          </div>
        </section>

        <!-- The engagement picker. Shown on every per-engagement tab, because availability and a
             time-off request are filed against ONE engagement in ONE store, exactly as an open-shift
             claim is — and a worker with two jobs must be able to see which one they are editing. -->
        <div
          v-if="isEngagementTab && selfMemberships && selfMemberships.length > 1"
          class="wfme__stores"
        >
          <button
            v-for="membership in selfMemberships"
            :key="membership.staffMemberId"
            class="wfme__store"
            :class="{ 'is-active': activeStaffMemberId === membership.staffMemberId }"
            @click="activeStaffMemberId = membership.staffMemberId"
          >
            {{ storeLabel(membership.storeId) }}
            <span v-if="roleSummary(membership)" class="wfme__storerole">{{ roleSummary(membership) }}</span>
          </button>
        </div>

        <!-- ---------------- Open shifts ---------------- -->
        <section v-if="tab === 'open'" class="wfme__panel">
          <p class="wfme__window">
            {{ $i('wfme_open_window', { days: WINDOW_DAYS }) }}
          </p>

          <div v-if="loading && !activeOpen" class="wfme__loading">
            {{ $i('wfme_loading') }}
          </div>

          <div v-else-if="!activeOpen || activeOpen.failed" class="wfme__empty">
            <p class="wfme__emptytitle">
              {{ $i('wfme_open_unknown') }}
            </p>
            <button class="wfme__btn wfme__btn--ghost" @click="loadOpenAssignments">
              {{ $i('wfme_reload') }}
            </button>
          </div>

          <ul v-else-if="activeOpen.items.length" class="wfme__list">
            <WorkforceOpenShiftCard
              v-for="assignment in activeOpen.items"
              :key="assignment.shiftAssignmentId"
              :assignment="assignment"
              :time-zone-id="activeTimeZoneId"
              :locale="locale"
              :busy="busyKey === assignment.shiftAssignmentId"
              @claim="claim"
              @withdraw="withdrawClaim"
            />
          </ul>

          <div v-else class="wfme__empty">
            <p class="wfme__emptytitle">
              {{ $i('wfme_open_none') }}
            </p>
            <p class="wfme__emptyhint">
              {{ $i('wfme_open_none_hint') }}
            </p>
          </div>
        </section>

        <!-- ---------------- What I have asked for ---------------- -->
        <section v-if="tab === 'asks'" class="wfme__panel">
          <div v-if="loading && !myAsks" class="wfme__loading">
            {{ $i('wfme_loading') }}
          </div>

          <div v-else-if="!myAsks" class="wfme__empty">
            <p class="wfme__emptytitle">
              {{ $i('wfme_asks_unknown') }}
            </p>
            <button class="wfme__btn wfme__btn--ghost" @click="loadOpenAssignments">
              {{ $i('wfme_reload') }}
            </button>
          </div>

          <template v-else-if="myAsks.length">
            <ul class="wfme__list">
              <WorkforceOpenShiftCard
                v-for="entry in myAsks"
                :key="entry.assignment.shiftAssignmentId"
                :assignment="entry.assignment"
                :time-zone-id="entry.timeZoneId"
                :locale="locale"
                :busy="busyKey === entry.assignment.shiftAssignmentId"
                @withdraw="withdrawClaim"
              />
            </ul>
            <p class="wfme__note">
              {{ $i('wfme_asks_pending_note') }}
            </p>
          </template>

          <div v-else class="wfme__empty">
            <p class="wfme__emptytitle">
              {{ $i('wfme_asks_none') }}
            </p>
          </div>

          <!-- Scope disclosure, permanent and deliberate: this list is derived from the open-shift
               read, so it covers open-shift asks only. Shift swaps have no worker-side read at all,
               and a tab that quietly omitted them would read as "you have asked for nothing".
               Time-off now has its own tab, which carries its own, narrower disclosure. -->
          <p class="wfme__note wfme__note--muted">
            {{ $i('wfme_asks_scope') }}
          </p>
        </section>

        <!-- ---------------- Availability ---------------- -->
        <section v-if="tab === 'availability'" class="wfme__panel">
          <WorkforceAvailabilityForm
            :key="activeStaffMemberId"
            ref="availabilityForm"
            :time-zone-id="activeTimeZoneId"
            :busy="busyKey === 'availability'"
            :saved="savedAvailability[activeStaffMemberId] || null"
            @save="saveAvailability"
          />
        </section>

        <!-- ---------------- Who has looked at my training record ----------------
             The one worker-facing Training surface. Every read of a person's training file appends a
             disclosure keyed to that person; this is where the person it concerns can read it back.
             It is behind an explicit button rather than loaded with the tab because ASKING IS ITSELF
             RECORDED — an auto-fetch would write a permanent row into an append-only ledger every
             time the tab was clicked past. -->
        <section v-if="tab === 'training'" class="wfme__panel">
          <div v-if="!activeMembership" class="wfme__empty">
            <p class="wfme__emptytitle">
              {{ $i('wfme_training_no_store') }}
            </p>
          </div>
          <template v-else>
            <button
              class="wfme__btn wfme__btn--ghost"
              :disabled="busyKey === 'training'"
              data-test="wfme-training-load"
              @click="loadMyDisclosures"
            >
              {{ $i('wfme_training_load') }}
            </button>
            <TrainingDisclosurePanel
              :log="myDisclosures"
              :asks-for-a-person="false"
              :locale="locale"
              :zone-id="activeTimeZoneId"
              :busy="busyKey === 'training'"
            />
          </template>
        </section>

        <!-- ---------------- Time off ---------------- -->
        <section v-if="tab === 'timeoff'" class="wfme__panel">
          <WorkforceTimeOffForm
            :key="activeStaffMemberId"
            ref="timeOffForm"
            :time-zone-id="activeTimeZoneId"
            :locale="locale"
            :busy="busyKey === 'timeoff'"
            :submitted="submittedTimeOff"
            @request="requestTimeOff"
            @withdraw="withdrawTimeOff"
          />
        </section>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import WorkforceAvailabilityForm from '~/components/admin/workforce-me/WorkforceAvailabilityForm.vue';
import WorkforceOpenShiftCard from '~/components/admin/workforce-me/WorkforceOpenShiftCard.vue';
import WorkforcePublicationNotice from '~/components/admin/workforce-me/WorkforcePublicationNotice.vue';
import WorkforceShiftCard from '~/components/admin/workforce-me/WorkforceShiftCard.vue';
import WorkforceTimeOffForm from '~/components/admin/workforce-me/WorkforceTimeOffForm.vue';
import TrainingDisclosurePanel from '~/components/admin/training/TrainingDisclosurePanel.vue';
import { TrainingStoreService } from '~/utils/training/training-client';
import { readDisclosures } from '~/utils/training/disclosure';
import { WorkforceMeService } from '~/utils/workforce-me/me-client';
import {
  classifyClaimFailure, isNormalOutcome, outcomeMessageKey, requiresRefresh
} from '~/utils/workforce-me/claim-outcome';
import { publicationCount, unreadPublications } from '~/utils/workforce-me/inbox-filter';
import { roleSummary, selfServiceMemberships } from '~/utils/workforce-me/memberships';
import {
  SELF_ALREADY_DECIDED, classifySelfFailure, selfFailureMessageKey
} from '~/utils/workforce-me/self-requests';
import {
  SCHEDULE_UNKNOWN, formatBusinessDate, groupByBusinessDate, scheduleState, scheduleStateMessageKey
} from '~/utils/workforce-me/shift-view';

// How far ahead the worker surface looks. Both reads are windowed the same way so the two tabs are
// talking about the same stretch of time.
const WINDOW_DAYS = 28;

// The admin locale is a bare language tag; formatting needs a region to place a Norwegian date.
const LOCALES = { no: 'nb-NO', en: 'en-GB', de: 'de-DE' };

// The worker's own page: the shifts they are rostered on, the shifts they can ask for, and the asks
// they have outstanding. Everything here is scoped to the caller by the backend itself — no store id
// is ever sent, because /workforce/me resolves the engagement from the token.
export default {
  name: 'AdminWorkforceMe',
  components: {
    AdminPage,
    WorkforceAvailabilityForm,
    WorkforceOpenShiftCard,
    WorkforcePublicationNotice,
    WorkforceShiftCard,
    WorkforceTimeOffForm,
    TrainingDisclosurePanel
  },
  data () {
    return {
      WINDOW_DAYS,
      SCHEDULE_UNKNOWN,
      tab: 'shifts',
      loading: false,
      busyKey: null,
      // Each read tracks its own outcome. A failure in one must never be rendered as an empty result
      // in another — "we could not load this" and "there is nothing here" are different screens.
      memberships: null,
      membershipsFailed: false,
      schedule: null,
      scheduleFailed: false,
      inbox: null,
      inboxFailed: false,
      // staffMemberId -> { items, failed }. Replaced wholesale rather than mutated, so Vue 2 sees it.
      openByStaff: {},
      // storeId -> the store's IANA zone from #1, or null where that read failed. It is the ONLY
      // source a worker has for a store zone, and both date forms are withheld without it.
      zoneByStore: {},
      // staffMemberId -> the last #36 response. There is no read for availability, so this is the
      // only canonical state a worker can be shown, and only for as long as the page is open.
      savedAvailability: {},
      // staffMemberId -> the time-off requests this session has sent, as the server answered them.
      timeOffByStaff: {},
      activeStaffMemberId: null,
      // storeId -> { payload, error }. Asked for explicitly, never on mount: the disclosure read
      // APPENDS a row to the very log it returns, so a page that fetched it automatically would
      // grow this worker's own access log every time they opened the page for anything else.
      disclosuresByStore: {},
      ackReceipts: {},
      toast: { show: false, message: '', type: 'success' },
      toastTimer: null
    };
  },
  computed: {
    locale () {
      return LOCALES[this.$store.state.adminLocale] || LOCALES.no;
    },
    userIsLoggedIn () {
      return this.$store.getters.userIsLoggedIn;
    },
    _workforceMeService () {
      return new WorkforceMeService(this._coreInitializer);
    },
    /**
     * The Training client, used here for ONE route. `GET .../evidence/disclosures` is the only
     * Training read a non-admin can make: it admits the subject of the record as well as the store's
     * admin, so this page reaches it with the worker's own token and no capability at all. Nothing
     * else on that client will answer here, and nothing else is called.
     */
    _trainingService () {
      return new TrainingStoreService(this._coreInitializer);
    },
    tabs () {
      return [
        { key: 'shifts', label: this.$i('wfme_tab_shifts') },
        { key: 'open', label: this.$i('wfme_tab_open') },
        { key: 'asks', label: this.$i('wfme_tab_asks') },
        { key: 'availability', label: this.$i('wfme_tab_availability') },
        { key: 'timeoff', label: this.$i('wfme_tab_timeoff') },
        { key: 'training', label: this.$i('wfme_tab_training') }
      ];
    },
    /** The tabs that act on ONE engagement, and therefore need the engagement picker above them. */
    isEngagementTab () {
      return this.tab === 'open' || this.tab === 'availability' || this.tab === 'timeoff' ||
        this.tab === 'training';
    },

    // --- engagements -------------------------------------------------------------------------
    selfMemberships () {
      return selfServiceMemberships(this.memberships);
    },
    activeMembership () {
      if (!this.selfMemberships) { return null; }
      return this.selfMemberships.find(m => m.staffMemberId === this.activeStaffMemberId) || null;
    },
    // #39 items carry no zone of their own, and #31 carries none either. The store context (#1) is
    // the authoritative source and is read for every engagement; the published schedule's per-item
    // zone is the fallback for a store whose context read failed. Null when neither answered — the
    // cards then say the times are UTC, and both date forms refuse to render at all.
    activeTimeZoneId () {
      return this.activeMembership ? this.zoneForStore(this.activeMembership.storeId) : null;
    },
    /**
     * Who has looked at this worker's training record in the store on screen. Idle until they ask —
     * a fourth state, because "nobody has opened this yet" is not an unread that failed, and because
     * asking is a write.
     */
    myDisclosures () {
      const membership = this.activeMembership;
      if (!membership) { return { state: 'idle' }; }
      const asked = this.disclosuresByStore[membership.storeId];
      if (!asked) { return { state: 'idle' }; }
      return readDisclosures(asked.payload, asked.error);
    },

    /** The time-off requests sent from this page for the engagement on screen. */
    submittedTimeOff () {
      return this.timeOffByStaff[this.activeStaffMemberId] || [];
    },

    // --- my shifts ---------------------------------------------------------------------------
    scheduleGroups () {
      return this.schedule ? groupByBusinessDate(this.schedule.items || []) : null;
    },
    scheduleStateToken () {
      return scheduleState({
        loaded: !this.scheduleFailed && !!this.schedule,
        items: this.schedule ? (this.schedule.items || []) : null,
        publications: publicationCount(this.inbox ? this.inbox.items : null)
      });
    },
    scheduleMessageKey () {
      return scheduleStateMessageKey(this.scheduleStateToken);
    },

    // --- inbox -------------------------------------------------------------------------------
    unreadPublicationItems () {
      return unreadPublications(this.inbox ? this.inbox.items : null);
    },

    // --- open shifts -------------------------------------------------------------------------
    activeOpen () {
      return this.openByStaff[this.activeStaffMemberId] || null;
    },

    /**
     * The asks the SERVER still reports as live, across every engagement.
     *
     * Derived from #39's `alreadyRequested`, so it is server truth on every reload rather than a
     * local memory of what this device once submitted. A withdrawn or decided ask leaves the list on
     * its own because the row stops being live.
     *
     * Null while any engagement's read is unknown — a partial list here would read as "these are all
     * your asks", which would be false.
     */
    myAsks () {
      if (!this.selfMemberships || !this.selfMemberships.length) { return null; }

      const entries = [];
      for (let i = 0; i < this.selfMemberships.length; i += 1) {
        const membership = this.selfMemberships[i];
        const open = this.openByStaff[membership.staffMemberId];
        if (!open || open.failed) { return null; }

        open.items.filter(a => a.alreadyRequested).forEach((assignment) => {
          entries.push({
            assignment,
            staffMemberId: membership.staffMemberId,
            timeZoneId: this.zoneForStore(membership.storeId)
          });
        });
      }
      return entries.sort((a, b) => String(a.assignment.startsUtc).localeCompare(String(b.assignment.startsUtc)));
    }
  },
  watch: {
    userIsLoggedIn: { immediate: true, handler (isLoggedIn) { if (isLoggedIn) { this.init(); } } }
  },
  beforeDestroy () {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
  },
  methods: {
    async init () {
      if (!this.userIsLoggedIn) { return; }

      this.loading = true;
      // The three top-level reads are independent; one failing must not blank the other two.
      await Promise.all([this.loadMemberships(), this.loadSchedule(), this.loadInbox()]);
      await Promise.all([this.loadOpenAssignments(), this.loadStoreZones()]);
      this.loading = false;
    },

    /**
     * The store zone, per engagement, from `GET /workforce/stores/{id}/context` (#1).
     *
     * Read on the WORKER surface because nothing on `/workforce/me` carries a zone and both date
     * forms need one: the server derives a request's local business dates from the instants sent, so
     * a date placed with the phone's zone is a request filed on the wrong days. #1 admits any
     * capability grant, so a `WorkforceSelf` engagement is enough to read it.
     *
     * Per store, and failing quietly per store: one venue's outage must not withhold the forms for
     * the other. A store that did not answer is left absent, and the forms say why.
     */
    async loadStoreZones () {
      const memberships = selfServiceMemberships(this.memberships);
      if (!memberships) { this.zoneByStore = {}; return; }

      const storeIds = [];
      memberships.forEach((membership) => {
        if (!storeIds.includes(membership.storeId)) { storeIds.push(membership.storeId); }
      });

      const results = await Promise.all(storeIds.map(storeId =>
        this._workforceMeService.GetStoreContext(storeId)
          .then(context => ({ storeId, zone: (context && context.timeZone && context.timeZone.id) || null }))
          .catch(() => ({ storeId, zone: null }))
      ));

      const next = {};
      results.forEach((result) => { next[result.storeId] = result.zone; });
      this.zoneByStore = next;
    },

    async loadMemberships () {
      try {
        const memberships = await this._workforceMeService.GetMemberships();
        this.memberships = memberships || [];
        this.membershipsFailed = false;

        const usable = selfServiceMemberships(this.memberships) || [];
        const stillThere = usable.some(m => m.staffMemberId === this.activeStaffMemberId);
        if (!stillThere) { this.activeStaffMemberId = usable.length ? usable[0].staffMemberId : null; }
      } catch (e) {
        // Left null, not [] — an unknown roster must not render as "you have no engagements".
        this.memberships = null;
        this.membershipsFailed = true;
      }
    },

    async loadSchedule () {
      try {
        this.schedule = await this._workforceMeService.GetSchedule(this.windowStart(), this.windowEnd());
        this.scheduleFailed = false;
      } catch (e) {
        this.schedule = null;
        this.scheduleFailed = true;
      }
    },

    async loadInbox () {
      try {
        this.inbox = await this._workforceMeService.GetInbox();
        this.inboxFailed = false;
      } catch (e) {
        this.inbox = null;
        this.inboxFailed = true;
      }
    },

    /**
     * Who has looked at this worker's training record in the store on screen.
     *
     * NO personRef IS SENT, and that is the whole point: the server resolves the subject from the
     * token, so this cannot become a lookup of a colleague's log by any change on this page. Sending
     * the worker's own id would instead take the store-admin branch, which they do not hold, and be
     * refused.
     *
     * The failure is kept per store and next to the answer it replaces, so a refused read for one
     * employer never renders as an empty log for another.
     */
    async loadMyDisclosures () {
      const membership = this.activeMembership;
      if (!membership) { return; }

      const storeId = membership.storeId;
      this.busyKey = 'training';
      let result;
      try {
        result = { payload: await this._trainingService.GetDisclosures(storeId), error: null };
      } catch (e) {
        result = { payload: null, error: e };
      }
      // Replaced wholesale rather than mutated, so Vue 2 sees it.
      this.disclosuresByStore = Object.assign({}, this.disclosuresByStore, { [storeId]: result });
      this.busyKey = null;
    },

    async loadOpenAssignments () {
      const memberships = selfServiceMemberships(this.memberships);
      if (!memberships) { this.openByStaff = {}; return; }

      const from = this.windowStart();
      const to = this.windowEnd();
      const results = await Promise.all(memberships.map(membership =>
        this._workforceMeService.GetOpenAssignments(membership.staffMemberId, from, to)
          .then(response => ({ id: membership.staffMemberId, items: (response && response.items) || [], failed: false }))
          // Per engagement, so one store's outage does not present another store's shifts as absent.
          .catch(() => ({ id: membership.staffMemberId, items: [], failed: true }))
      ));

      const next = {};
      results.forEach((result) => { next[result.id] = { items: result.items, failed: result.failed }; });
      this.openByStaff = next;
    },

    // --- actions -----------------------------------------------------------------------------

    async claim (assignment) {
      if (!this.activeStaffMemberId) { return; }

      this.busyKey = assignment.shiftAssignmentId;
      try {
        await this._workforceMeService.RequestOpenShift(this.activeStaffMemberId, assignment.shiftAssignmentId);
        this.notify(this.$i('wfme_claim_sent'), 'success');
        await this.loadOpenAssignments();
      } catch (e) {
        await this.handleClaimFailure(e);
      } finally {
        this.busyKey = null;
      }
    },

    async withdrawClaim (assignment) {
      const staffMemberId = this.staffMemberFor(assignment) || this.activeStaffMemberId;
      if (!staffMemberId || !assignment.exchangeId) { return; }

      this.busyKey = assignment.shiftAssignmentId;
      try {
        await this._workforceMeService.DecideExchange(staffMemberId, assignment.exchangeId, 'withdraw');
        this.notify(this.$i('wfme_claim_withdrawn'), 'success');
        await this.loadOpenAssignments();
      } catch (e) {
        await this.handleClaimFailure(e);
      } finally {
        this.busyKey = null;
      }
    },

    /**
     * Losing an open shift to a coworker is a NORMAL outcome, not a fault.
     *
     * Exactly one worker can win, and the loser is told so with a typed 409. The worker did nothing
     * wrong by asking, so this uses the informational tone, offers no retry (the answer cannot
     * change), and re-reads the list so the taken shift leaves the screen instead of sitting there
     * with a button that can only fail again.
     */
    async handleClaimFailure (error) {
      const outcome = classifyClaimFailure(error);
      this.notify(this.$i(outcomeMessageKey(outcome)), isNormalOutcome(outcome) ? 'info' : 'error');
      if (requiresRefresh(outcome)) { await this.loadOpenAssignments(); }
    },

    /**
     * #36: replace this engagement's availability with the whole week the form holds.
     *
     * The response IS the canonical state and is kept, because nothing on the worker surface can read
     * it back: `PUT /me/.../availability` has no GET sibling, and the manager's #14 needs
     * WorkforceScheduler. Keeping it is what lets the form show what was stored instead of going
     * blank the moment it succeeds.
     */
    async saveAvailability (body) {
      if (!this.activeStaffMemberId || this.busyKey) { return; }

      this.busyKey = 'availability';
      try {
        const saved = await this._workforceMeService.SetAvailability(this.activeStaffMemberId, body);
        this.savedAvailability = Object.assign({}, this.savedAvailability, {
          [this.activeStaffMemberId]: saved
        });
        this.notify(this.$i('wfme_avail_saved'), 'success');
      } catch (e) {
        this.notifySelfFailure(e, 'availability');
      } finally {
        this.busyKey = null;
      }
    },

    /** #37: ask to be off. The manager decides; this is a request and the screen never calls it leave. */
    async requestTimeOff (body) {
      if (!this.activeStaffMemberId || this.busyKey) { return; }

      const staffMemberId = this.activeStaffMemberId;
      this.busyKey = 'timeoff';
      try {
        const request = await this._workforceMeService.RequestTimeOff(staffMemberId, body);
        this.recordTimeOff(staffMemberId, request);
        if (this.$refs.timeOffForm) { this.$refs.timeOffForm.reset(); }
        this.notify(this.$i('wfme_timeoff_sent'), 'success');
      } catch (e) {
        this.notifySelfFailure(e, 'timeoff');
      } finally {
        this.busyKey = null;
      }
    },

    /**
     * #38: withdraw a request this session sent.
     *
     * A request a manager has already decided answers `409 workforce.request-not-decidable`. That is
     * a normal outcome — the worker asked a legitimate question and the answer is that it is settled
     * — so it gets the informational tone and no retry, and the row is replaced with whatever the
     * withdrawal could not change.
     */
    async withdrawTimeOff (request) {
      if (!this.activeStaffMemberId || this.busyKey) { return; }

      const staffMemberId = this.activeStaffMemberId;
      this.busyKey = 'timeoff';
      try {
        const updated = await this._workforceMeService.WithdrawRequest(staffMemberId, request.timeOffRequestId);
        this.recordTimeOff(staffMemberId, updated);
        this.notify(this.$i('wfme_timeoff_withdrawn'), 'success');
      } catch (e) {
        this.notifySelfFailure(e, 'timeoff');
      } finally {
        this.busyKey = null;
      }
    },

    // Replaces the request with the same id, or appends it. The server's answer is the row — nothing
    // here patches a status this page guessed at.
    recordTimeOff (staffMemberId, request) {
      if (!request) { return; }
      const existing = this.timeOffByStaff[staffMemberId] || [];
      const without = existing.filter(item => item.timeOffRequestId !== request.timeOffRequestId);
      this.timeOffByStaff = Object.assign({}, this.timeOffByStaff, {
        [staffMemberId]: without.concat([request])
      });
    },

    notifySelfFailure (error, action) {
      const outcome = classifySelfFailure(error);
      // A request that was already decided is a truthful answer, not a malfunction: informational
      // tone, the same call `claim-outcome.js` makes for a lost open shift.
      this.notify(this.$i(selfFailureMessageKey(outcome, action)),
        outcome === SELF_ALREADY_DECIDED ? 'info' : 'error');
    },

    async markRead (item) {
      this.busyKey = item.inboxItemId;
      try {
        await this._workforceMeService.MarkInboxRead(item.inboxItemId);
        await this.loadInbox();
      } catch (e) {
        this.notify(this.$i('wfme_pub_mark_read_failed'), 'error');
      } finally {
        this.busyKey = null;
      }
    },

    async acknowledge (item) {
      this.busyKey = item.inboxItemId;
      try {
        const receipt = await this._workforceMeService.AcknowledgePublication(item.schedulePublicationId);
        if (receipt) {
          this.ackReceipts = Object.assign({}, this.ackReceipts, { [item.schedulePublicationId]: receipt });
        }
        // Acknowledging implies seen, so the inbox read state moves with it.
        await this.loadInbox();
      } catch (e) {
        this.notify(this.$i('wfme_pub_acknowledge_failed'), 'error');
      } finally {
        this.busyKey = null;
      }
    },

    // --- helpers -----------------------------------------------------------------------------

    windowStart () {
      return new Date();
    },
    windowEnd () {
      return new Date(Date.now() + (WINDOW_DAYS * 24 * 60 * 60 * 1000));
    },

    // The store's zone. The context read (#1) is authoritative and covers every engagement; the
    // published schedule's per-item zone (#33) is the fallback for a store whose context did not
    // answer. Null when neither did — the cards then say the times are UTC rather than quietly
    // showing the phone's zone, and the date forms withhold their pickers.
    zoneForStore (storeId) {
      if (this.zoneByStore[storeId]) { return this.zoneByStore[storeId]; }
      const items = (this.schedule && this.schedule.items) || [];
      const match = items.find(item => item.storeId === storeId && item.timeZoneId);
      return match ? match.timeZoneId : null;
    },

    staffMemberFor (assignment) {
      const ids = Object.keys(this.openByStaff);
      for (let i = 0; i < ids.length; i += 1) {
        const bucket = this.openByStaff[ids[i]];
        if (bucket && !bucket.failed && bucket.items.some(a => a.shiftAssignmentId === assignment.shiftAssignmentId)) {
          return ids[i];
        }
      }
      return null;
    },

    // The worker surface carries no store NAME, only an id. A name is used when the signed-in account
    // happens to administer that store; otherwise the id is shown plainly rather than invented.
    storeLabel (storeId) {
      const adminIn = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      const match = adminIn.find(store => store && store.id === storeId);
      return (match && match.name) || this.$i('wfme_store_fallback', { id: storeId });
    },

    roleSummary,

    formatDay (key) {
      return formatBusinessDate(key, this.locale);
    },

    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 5000);
    }
  }
};
</script>

<style scoped>
/* A worker's phone surface: one column, thumb-reachable, never a data grid. */
.wfme {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
}

.wfme__header {
  margin-bottom: 16px;
}

.wfme__title {
  margin: 0 0 6px;
  font-size: 1.9em;
  font-weight: 600;
  color: #292c34;
}

.wfme__intro {
  margin: 0;
  color: #64748b;
  font-size: 0.95em;
}

.wfme__toast {
  position: fixed;
  top: 20px;
  left: 20px;
  right: 20px;
  z-index: 1000;
  padding: 12px 20px;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.wfme__toast--success { background: #159f63; }
.wfme__toast--error { background: #ef4444; }
/* A lost award is informational, not a failure — it must not be red. */
.wfme__toast--info { background: #292c34; }

.wfme-toast-enter-active,
.wfme-toast-leave-active { transition: opacity 0.25s ease; }
.wfme-toast-enter,
.wfme-toast-leave-to { opacity: 0; }

.wfme__blocker {
  padding: 18px 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.wfme__tabs {
  display: flex;
  gap: 4px;
  background: #f1f5f9;
  padding: 3px;
  border-radius: 9px;
  margin-bottom: 16px;
}

.wfme__tab {
  flex: 1;
  min-height: 44px;
  border: none;
  background: none;
  border-radius: 7px;
  font-weight: 600;
  font-size: 0.88em;
  color: #64748b;
  cursor: pointer;
}

.wfme__tab.is-active {
  background: #fff;
  color: #159f63;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.wfme__stores {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}

.wfme__store {
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid #cbd5e0;
  background: #fff;
  border-radius: 8px;
  font-size: 0.85em;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}

.wfme__store.is-active {
  border-color: #1bb776;
  color: #159f63;
  background: rgba(27, 183, 118, 0.08);
}

.wfme__storerole {
  display: block;
  font-size: 0.85em;
  font-weight: 400;
  color: #94a3b8;
}

.wfme__window {
  margin: 0 0 12px;
  font-size: 0.8em;
  color: #94a3b8;
}

.wfme__day {
  margin-bottom: 18px;
}

.wfme__dayhead {
  margin: 0 0 8px;
  font-size: 0.85em;
  font-weight: 600;
  color: #64748b;
  text-transform: capitalize;
}

.wfme__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.wfme__loading,
.wfme__empty {
  padding: 28px 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  text-align: center;
}

.wfme__loading {
  color: #94a3b8;
}

.wfme__emptytitle {
  margin: 0;
  font-size: 1em;
  font-weight: 600;
  color: #292c34;
}

.wfme__emptyhint {
  margin: 8px 0 0;
  font-size: 0.85em;
  color: #64748b;
}

.wfme__note {
  margin: 12px 0 0;
  font-size: 0.82em;
  color: #64748b;
}

.wfme__note--muted {
  color: #94a3b8;
}

.wfme__note--warn {
  padding: 10px 14px;
  border-radius: 8px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #92400e;
  margin: 0 0 12px;
}

.wfme__btn {
  min-height: 44px;
  margin-top: 14px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  background: #1bb776;
  color: #fff;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;
}

.wfme__btn--ghost {
  background: #fff;
  color: #292c34;
  border: 1px solid #cbd5e0;
}

@media (max-width: 768px) {
  .wfme {
    padding: 16px;
  }

  .wfme__title {
    font-size: 1.5em;
  }
}
</style>
