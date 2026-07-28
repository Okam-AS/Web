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

        <!-- ---------------- Open shifts ---------------- -->
        <section v-if="tab === 'open'" class="wfme__panel">
          <div v-if="selfMemberships && selfMemberships.length > 1" class="wfme__stores">
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
               read, so it covers open-shift asks only. Time-off and swaps have no worker-side read at
               all, and a tab that quietly omitted them would read as "you have asked for nothing". -->
          <p class="wfme__note wfme__note--muted">
            {{ $i('wfme_asks_scope') }}
          </p>
        </section>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import WorkforceOpenShiftCard from '~/components/admin/workforce-me/WorkforceOpenShiftCard.vue';
import WorkforcePublicationNotice from '~/components/admin/workforce-me/WorkforcePublicationNotice.vue';
import WorkforceShiftCard from '~/components/admin/workforce-me/WorkforceShiftCard.vue';
import { WorkforceMeService } from '~/utils/workforce-me/me-client';
import {
  classifyClaimFailure, isNormalOutcome, outcomeMessageKey, requiresRefresh
} from '~/utils/workforce-me/claim-outcome';
import { publicationCount, unreadPublications } from '~/utils/workforce-me/inbox-filter';
import { roleSummary, selfServiceMemberships } from '~/utils/workforce-me/memberships';
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
  components: { AdminPage, WorkforceOpenShiftCard, WorkforcePublicationNotice, WorkforceShiftCard },
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
      activeStaffMemberId: null,
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
    tabs () {
      return [
        { key: 'shifts', label: this.$i('wfme_tab_shifts') },
        { key: 'open', label: this.$i('wfme_tab_open') },
        { key: 'asks', label: this.$i('wfme_tab_asks') }
      ];
    },

    // --- engagements -------------------------------------------------------------------------
    selfMemberships () {
      return selfServiceMemberships(this.memberships);
    },
    activeMembership () {
      if (!this.selfMemberships) { return null; }
      return this.selfMemberships.find(m => m.staffMemberId === this.activeStaffMemberId) || null;
    },
    // #39 items carry no zone of their own. The schedule read does, per store, so it is borrowed from
    // there when this store has a published shift — and left null otherwise rather than guessed.
    activeTimeZoneId () {
      return this.activeMembership ? this.zoneForStore(this.activeMembership.storeId) : null;
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
      await this.loadOpenAssignments();
      this.loading = false;
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

    // The store's zone, taken from a published shift in that store (#33 carries it per item). Null
    // when this worker has no published shift there — the cards then say the times are UTC rather
    // than quietly showing the phone's zone.
    zoneForStore (storeId) {
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
