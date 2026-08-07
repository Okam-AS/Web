<template>
  <AdminPage @login-success="init">
    <div class="wfq">
      <header class="wfq__header">
        <h1 class="wfq__title">
          {{ $i('wfq_page_title') }}
        </h1>
        <p class="wfq__intro">
          {{ $i('wfq_page_intro') }}
        </p>
      </header>

      <transition name="wfq-toast">
        <div v-if="toast.show" class="wfq__toast" :class="'wfq__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="contextError" class="wfq__blocker">
        {{ contextError }}
      </div>

      <template v-else>
        <!-- THE notice this page exists to be honest about. A decision that collides with a published
             week is committed and the published week is NOT rewritten, so "approved" on its own would
             read as "handled". It stays until dismissed — a toast would be gone before the manager
             finished reading it, and the work it names is still outstanding. -->
        <section v-if="successorNotices.length" class="wfq__successor">
          <div class="wfq__successorhead">
            <strong>{{ $i('wfq_successor_title') }}</strong>
            <button class="wfq__linkbtn" @click="successorNotices = []">
              {{ $i('wfq_successor_dismiss') }}
            </button>
          </div>
          <p class="wfq__successorlede">
            {{ $i('wfq_successor_lede') }}
          </p>
          <ul class="wfq__successorlist">
            <li v-for="notice in successorNotices" :key="notice.id">
              {{ notice.kind === 'award' ? $i('wfq_successor_award', { person: notice.person })
                : $i('wfq_successor_timeoff', { person: notice.person }) }}
              <span v-if="notice.revisionId" class="wfq__revision">{{ $i('wfq_successor_revision', { id: shortId(notice.revisionId) }) }}</span>
            </li>
          </ul>
          <nuxt-link class="wfq__btn wfq__btn--ghost" to="/admin/workforce-schedule">
            {{ $i('wfq_successor_go') }}
          </nuxt-link>
        </section>

        <div class="wfq__controls">
          <div class="wfq__filters">
            <button
              class="wfq__filter"
              :class="{ 'is-active': kind === null }"
              :disabled="loading"
              @click="setKind(null)"
            >
              {{ $i('wfq_kind_all') }}
            </button>
            <button
              v-for="option in kindOptions"
              :key="option"
              class="wfq__filter"
              :class="{ 'is-active': kind === option }"
              :disabled="loading"
              @click="setKind(option)"
            >
              {{ $i(kindLabelKey(option)) }}
            </button>
          </div>

          <div class="wfq__filters">
            <button
              class="wfq__filter"
              :class="{ 'is-active': state === STATE_IN_FLIGHT }"
              :disabled="loading"
              @click="setState(STATE_IN_FLIGHT)"
            >
              {{ $i('wfq_state_filter_open') }}
            </button>
            <button
              class="wfq__filter"
              :class="{ 'is-active': state === STATE_ALL }"
              :disabled="loading"
              @click="setState(STATE_ALL)"
            >
              {{ $i('wfq_state_filter_all') }}
            </button>
            <button class="wfq__btn wfq__btn--ghost" :disabled="loading" @click="load">
              {{ $i('wfq_reload') }}
            </button>
          </div>
        </div>

        <p v-if="!zoneKnown" class="wfq__notice wfq__notice--warn">
          {{ $i('wfq_zone_missing') }}
        </p>
        <p v-else-if="collisionsFailed" class="wfq__notice wfq__notice--warn">
          {{ $i('wfq_collision_probe_failed') }}
        </p>

        <div v-if="loading && !items" class="wfq__empty">
          {{ $i('wfq_loading') }}
        </div>

        <!-- Unknown is not empty. A failed read says so and offers the retry; an empty inbox says
             something entirely different and offers none. -->
        <div v-else-if="!items" class="wfq__empty">
          <p class="wfq__emptytitle">
            {{ $i('wfq_unknown') }}
          </p>
          <p class="wfq__emptyhint">
            {{ $i('wfq_unknown_hint') }}
          </p>
          <button class="wfq__btn wfq__btn--ghost" @click="load">
            {{ $i('wfq_reload') }}
          </button>
        </div>

        <div v-else-if="!groups.length" class="wfq__empty">
          <p class="wfq__emptytitle">
            {{ state === STATE_ALL ? $i('wfq_none_at_all') : $i('wfq_none_open') }}
          </p>
          <p class="wfq__emptyhint">
            {{ $i('wfq_none_hint') }}
          </p>
        </div>

        <ul v-else class="wfq__list">
          <li v-for="group in groups" :key="group.key" class="wfq__group">
            <!-- One shift, several people, exactly one award. The header is what makes the second
                 claimant visible at all: they can be days apart in the inbox's own order. -->
            <p v-if="group.isContest" class="wfq__contesthead">
              {{ $i('wfq_contest_head', { count: group.items.length }) }}
            </p>
            <ul class="wfq__cards">
              <WorkforceRequestCard
                v-for="item in group.items"
                :key="item.requestId"
                :item="item"
                :time-zone-id="timeZoneId"
                :locale="locale"
                :collision="collisionFor(item)"
                :note="notes[item.requestId] || ''"
                :conflict="conflicts[item.requestId] || null"
                :busy="busyId === item.requestId"
                :contest-size="liveCandidateCount(group)"
                @note="setNote"
                @approve="decide(item, 'approve')"
                @reject="decide(item, 'reject')"
                @refetch="load"
              />
            </ul>
          </li>
        </ul>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import WorkforceRequestCard from '~/components/admin/workforce/WorkforceRequestCard.vue';
import { isWorkforceApiError, toUtcRangeParam } from '~/utils/workforce/api-client';
import { contextRefusalKey } from '~/utils/workforce/context-refusal';
import { WorkforceRequestsService } from '~/utils/workforce/requests-client';
import { WorkforceScheduleService } from '~/utils/workforce/schedule-client';
import { timeZoneIsKnown } from '~/utils/workforce-me/shift-view';
import {
  KINDS,
  KIND_TIME_OFF,
  STATE_ALL,
  STATE_IN_FLIGHT,
  buildInboxGroups,
  classifyDecisionFailure,
  collisionProbeWeeks,
  kindLabelKey,
  liveCandidateCount,
  outcomeMessageKey,
  publishedCollision,
  requiresRefresh,
  stateParam,
  successorNeed
} from '~/utils/workforce/requests-inbox';

// The manager decision inbox: the surface where time-off is approved, an open shift is awarded to
// exactly one of the people who asked for it, and both are done under the request's own `If-Match`.
//
// WHY IT IS ITS OWN PAGE rather than a panel on the schedule. The schedule already reads `GET
// /requests`, but only to paint absence markers on a WEEK, and it holds a different `If-Match` — the
// draft checksum of a schedule revision. The inbox is store-wide and not week-scoped (a request for
// October is decided in July), it acts on a different aggregate, and its conflict is a different
// conflict. Two aggregates' preconditions on one screen is how the wrong token gets sent.
export default {
  name: 'AdminWorkforceRequests',
  components: { AdminPage, WorkforceRequestCard },
  data () {
    return {
      STATE_ALL,
      STATE_IN_FLIGHT,
      kindOptions: KINDS,
      loading: false,
      busyId: null,
      contextError: '',
      timeZoneId: null,
      capabilities: [],
      kind: null,
      state: STATE_IN_FLIGHT,
      // Null while unknown, an array once read. Never [] for a failed read.
      items: null,
      // week key -> published `GET /schedules` body, or null where that week's read failed.
      publishedWeeks: null,
      collisionsFailed: false,
      // requestId -> the manager's typed note. Owned here, not by the card, so a refused decision
      // does not throw away what somebody just wrote.
      notes: {},
      // requestId -> the outcome token of the LAST refusal for that row.
      conflicts: {},
      // Decisions that committed while a published week disagrees with them. Survives the reload.
      successorNotices: [],
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
      const tags = { no: 'nb-NO', en: 'en-GB', de: 'de-DE' };
      return tags[this.$store.state.adminLocale] || tags.no;
    },
    _workforceRequestsService () {
      return new WorkforceRequestsService(this._coreInitializer);
    },
    // The collision probe is a PUBLISHED schedule read, which is the schedule controller's route and
    // therefore the schedule client's method. Rebinding it here would be a second copy of a route.
    _workforceScheduleService () {
      return new WorkforceScheduleService(this._coreInitializer);
    },
    zoneKnown () {
      return timeZoneIsKnown(this.timeZoneId);
    },
    groups () {
      return buildInboxGroups(this.items || []);
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
    kindLabelKey,
    liveCandidateCount,

    async init () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      this.contextError = '';
      this.timeZoneId = null;
      this.capabilities = [];

      try {
        const context = await this._workforceScheduleService.GetContext(this.storeId);
        this.timeZoneId = context && context.timeZone ? context.timeZone.id : null;
        this.capabilities = (context && context.capabilities) || [];
      } catch (e) {
        this.contextError = this.$i(contextRefusalKey(e, {
          noCapability: 'wfq_no_capability',
          failed: 'wfq_context_failed'
        }));
        return;
      }

      // Stated up front rather than left to the 403 the list read would answer with: a manager who
      // schedules but does not decide should be told what they are missing, not shown a broken page.
      if (!this.capabilities.includes('WorkforceManager')) {
        this.contextError = this.$i('wfq_no_capability');
        return;
      }

      await this.load();
    },

    async load () {
      if (!this.storeId) { return; }
      this.loading = true;
      // Cleared to unknown, not to empty.
      this.items = null;
      this.publishedWeeks = null;
      this.collisionsFailed = false;

      try {
        const response = await this._workforceRequestsService.ListRequests(
          this.storeId, this.kind, stateParam(this.state));
        this.items = (response && response.items) || [];
        // Conflicts belong to the rows as they were; a fresh read has answered them.
        this.conflicts = {};
      } catch (e) {
        this.items = null;
        this.notifyError(e);
      } finally {
        this.loading = false;
      }

      if (this.items) { await this.loadCollisions(); }
    },

    /**
     * The published-week probe: one `GET /schedules?view=published` per DISTINCT ISO week the open
     * time-off requests touch.
     *
     * One call per week rather than one per request span, because that read resolves a range to a
     * single revision and would silently answer a multi-week range with one week. Weeks are
     * deduplicated across requests, so a whole team asking for the same week is one call.
     *
     * A week that fails stays null and every request touching it reports UNKNOWN — never "clear".
     */
    async loadCollisions () {
      const weeks = collisionProbeWeeks(this.items, this.timeZoneId);
      if (!weeks.length) { this.publishedWeeks = {}; return; }

      const results = await Promise.all(weeks.map(week =>
        this._workforceScheduleService
          .GetRange(
            this.storeId,
            toUtcRangeParam(week.startUtc),
            toUtcRangeParam(week.endUtc),
            'published'
          )
          .then(body => ({ key: week.key, body }))
          .catch(() => ({ key: week.key, body: null }))
      ));

      const next = {};
      results.forEach((result) => { next[result.key] = result.body; });
      this.publishedWeeks = next;
      this.collisionsFailed = results.some(result => !result.body);
    },

    // Null while the probe has not run, so the card renders no claim at all rather than "we could not
    // check" for the second it takes to answer.
    collisionFor (item) {
      if (!this.publishedWeeks || item.kind !== KIND_TIME_OFF) { return null; }
      return publishedCollision(item, this.publishedWeeks, this.timeZoneId);
    },

    setKind (kind) {
      if (this.kind === kind) { return; }
      this.kind = kind;
      this.load();
    },
    setState (state) {
      if (this.state === state) { return; }
      this.state = state;
      this.load();
    },
    setNote (payload) {
      this.notes = Object.assign({}, this.notes, { [payload.requestId]: payload.value });
    },

    /**
     * The one write. Approve/reject a time-off request, award/pass over a candidacy — #24 dispatches
     * on the id's own identity, so this sends the same body either way and reads the response for
     * whichever shape came back.
     *
     * A REFUSED DECISION CHANGES NOTHING ON SCREEN except the conflict block: the note stays in the
     * field, the row stays where it was, and the manager decides again. That is the same treatment
     * the schedule's stale batch gets, and for the same reason — an automatic re-read would clear
     * what somebody just typed and would re-base their decision on a version they never saw.
     */
    async decide (item, decision) {
      if (this.busyId) { return; }
      this.busyId = item.requestId;
      this.conflicts = Object.assign({}, this.conflicts, { [item.requestId]: null });

      try {
        const response = await this._workforceRequestsService.DecideRequest(
          this.storeId, item.requestId, item.revision, decision, this.notes[item.requestId]);

        this.notify(this.$i(decision === 'approve' ? 'wfq_decided_approved' : 'wfq_decided_rejected'));
        this.recordSuccessorNeed(item, response);

        this.notes = Object.assign({}, this.notes, { [item.requestId]: '' });
        await this.load();
      } catch (e) {
        const outcome = classifyDecisionFailure(e);
        this.conflicts = Object.assign({}, this.conflicts, { [item.requestId]: outcome });
        this.notify(this.$i(outcomeMessageKey(outcome)), 'error');
        // Re-read only where the answer on screen is known to be settled. A stale revision is
        // deliberately excluded: that is the manager's own button.
        if (requiresRefresh(outcome)) { await this.load(); }
      } finally {
        this.busyId = null;
      }
    },

    /**
     * Records that a committed decision left a published schedule disagreeing with it.
     *
     * The endpoint does not republish anything — approving leave over a published shift records the
     * affected revision and leaves the publication untouched, and an award over a published target
     * sets `requiresSuccessorRevision` for the same reason (published assignment rows are immutable).
     * The decision is real; the roster has not moved. This notice is the only place the manager is
     * told that, so it must not be a toast that expires.
     */
    recordSuccessorNeed (item, response) {
      const need = successorNeed(response);
      if (!need) { return; }

      this.successorNotices = this.successorNotices.concat([{
        id: item.requestId,
        kind: need.kind,
        revisionId: need.revisionId,
        person: item.staffDisplayName || this.$i('wfq_person_unknown')
      }]);
    },

    shortId (id) {
      return String(id || '').slice(0, 8);
    },

    notifyError (error) {
      if (isWorkforceApiError(error) && error.status === 403) {
        this.notify(this.$i('wfq_no_capability'), 'error');
        return;
      }
      this.notify(this.$i('wfq_load_failed'), 'error');
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
.wfq {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.wfq__header {
  margin-bottom: 24px;
}

.wfq__title {
  margin: 0 0 8px;
  font-size: 2em;
  font-weight: 600;
  color: #292c34;
}

.wfq__intro {
  margin: 0;
  color: #64748b;
}

.wfq__toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  padding: 12px 20px;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.wfq__toast--success { background: #159f63; }
.wfq__toast--error { background: #ef4444; }

.wfq-toast-enter-active,
.wfq-toast-leave-active { transition: opacity 0.25s ease; }
.wfq-toast-enter,
.wfq-toast-leave-to { opacity: 0; }

.wfq__blocker {
  padding: 18px 20px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  color: #64748b;
}

.wfq__successor {
  margin-bottom: 24px;
  padding: 16px 20px;
  border-radius: 12px;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  color: #92400e;
}

.wfq__successorhead {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.wfq__successorlede {
  margin: 6px 0 10px;
  font-size: 0.9em;
}

.wfq__successorlist {
  margin: 0 0 12px;
  padding-left: 20px;
  font-size: 0.9em;
}

.wfq__revision {
  margin-left: 6px;
  font-size: 0.85em;
  opacity: 0.8;
  font-variant-numeric: tabular-nums;
}

.wfq__linkbtn {
  border: none;
  background: none;
  color: #92400e;
  text-decoration: underline;
  font-size: 0.85em;
  cursor: pointer;
  padding: 0;
}

.wfq__controls {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: space-between;
  margin-bottom: 20px;
}

.wfq__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.wfq__filter {
  min-height: 40px;
  padding: 0 14px;
  border: 1px solid #cbd5e0;
  background: #fff;
  border-radius: 8px;
  font-size: 0.85em;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
}

.wfq__filter.is-active {
  border-color: #1bb776;
  color: #159f63;
  background: rgba(27, 183, 118, 0.08);
}

.wfq__notice {
  margin: 0 0 16px;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.85em;
  color: #64748b;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
}

.wfq__notice--warn {
  background: #fef3c7;
  border-color: #fcd34d;
  color: #92400e;
}

.wfq__list,
.wfq__cards {
  list-style: none;
  margin: 0;
  padding: 0;
}

.wfq__group {
  margin-bottom: 8px;
}

.wfq__contesthead {
  margin: 0 0 6px;
  font-size: 0.85em;
  font-weight: 600;
  color: #92400e;
}

.wfq__empty {
  padding: 40px 24px;
  border-radius: 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  text-align: center;
  color: #94a3b8;
}

.wfq__emptytitle {
  margin: 0;
  font-size: 1.05em;
  font-weight: 600;
  color: #292c34;
}

.wfq__emptyhint {
  margin: 8px 0 0;
  font-size: 0.88em;
  color: #64748b;
}

.wfq__btn {
  display: inline-block;
  min-height: 44px;
  line-height: 44px;
  margin-top: 6px;
  padding: 0 20px;
  border: none;
  border-radius: 8px;
  background: #1bb776;
  color: #fff;
  font-weight: 600;
  font-size: 0.9em;
  text-decoration: none;
  cursor: pointer;
}

.wfq__btn--ghost {
  background: #fff;
  color: #292c34;
  border: 1px solid #cbd5e0;
}

@media (max-width: 768px) {
  .wfq {
    padding: 16px;
  }

  .wfq__title {
    font-size: 1.5em;
  }
}
</style>
