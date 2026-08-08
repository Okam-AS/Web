<template>
  <div class="pending-actions">
    <div class="pending-actions__bar">
      <div class="pending-actions__filters">
        <button
          v-for="option in statusFilters"
          :key="option.value || 'all'"
          type="button"
          class="pending-actions__filter"
          :class="{ 'is-active': status === option.value }"
          :data-test="'filter-' + (option.value || 'all')"
          @click="setStatus(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
      <button
        type="button"
        class="pending-actions__refresh"
        :disabled="loading"
        data-test="refresh"
        @click="load"
      >
        {{ loading ? $i('assistant_inbox_loading') : $i('assistant_inbox_refresh') }}
      </button>
    </div>

    <p v-if="!storeIds.length" class="pending-actions__note" data-test="no-scope">
      {{ $i('assistant_inbox_noScope') }}
    </p>

    <!-- Unknown is not empty. A read that failed must never render as "nothing is waiting for you",
         because the two look identical on screen and only one of them means the merchant can stop
         checking. `rows === null` is the unknown state and it says so. -->
    <p v-else-if="failure" class="pending-actions__failure" data-test="failure">
      {{ failure }}
    </p>

    <p v-else-if="rows === null" class="pending-actions__note" data-test="unknown">
      {{ $i('assistant_inbox_unknown') }}
    </p>

    <div v-else-if="!rows.length" class="empty-state" data-test="empty">
      <span class="material-icons">inbox</span>
      <h3>{{ $i('assistant_inbox_emptyTitle') }}</h3>
      <p>{{ $i('assistant_inbox_emptyBody') }}</p>
    </div>

    <div v-else class="pending-actions__list">
      <div v-for="row in rows" :key="rowKey(row)" class="pending-actions__row">
        <!-- ONE SPINE, ONE INBOX. Every kind and every origin renders through this same card. A
             SocialChef-staged row gets no special chrome — its origin is a source label inside the
             card and nothing else, because the approval it is asking for is the same approval. -->
        <!-- `card` is what the merchant SEES — the frozen bytes, enriched by the detail read when
             one has arrived. `status` is what the merchant may DO, and it is always the LIVE row.
             The two are separate props precisely because the card claims `NeedsApproval: true`
             forever, so a component handed only the card would offer Approve on executed rows. -->
        <ProposalCardView
          :card="cardFor(row)"
          :status="statusOf(row)"
          :busy="busyId === idOf(row)"
          :conflict="conflictId === idOf(row) ? conflict : null"
          :decidable="true"
          @approve="onApprove"
          @reject="onReject"
        />

        <!-- ── A FAILED ROW IS REPAIRED FORWARD, NEVER RESET ────────────────────────────────────
             There is no un-fail transition in the spine: `StagedActionStatus` has no edge out of
             `Failed`, and `ApproveAsync` answers 409 "This proposal failed while it was being
             applied and cannot be approved again." So the only honest affordance is composing a
             NEW ask, and that is what this offers.

             ⚠️ AND THE REASON IS NOT AVAILABLE. `StagedAction.FailureReason` exists on the ENTITY
             and is written by `StagedActionService` on the way to `Failed`, but it is not a member
             of `StagedActionModel` and therefore reaches no response body. Saying "we don't know
             why" is the truth; inventing a cause, or leaving a blank that reads as "no reason",
             would not be. -->
        <div v-if="isFailed(row)" class="pending-actions__failed" data-test="failed-repair">
          <p class="pending-actions__failed-line">
            {{ $i('assistant_inbox_failedTitle') }}
          </p>
          <p class="pending-actions__failed-reason">
            {{ $i('assistant_inbox_failedReasonUnavailable') }}
          </p>
          <button
            type="button"
            class="pending-actions__failed-btn"
            data-test="failed-compose"
            @click="$emit('compose-again', row)"
          >
            {{ $i('assistant_inbox_failedCompose') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ProposalCardView from '~/components/admin/assistant/ProposalCardView.vue';
import {
  AssistantService,
  isAssistantApiError,
  describeConflict,
  pick,
  STAGED,
  FAILED
} from '~/utils/assistant/api-client';

// The house poll cadence for an admin board (`pages/admin/ongoing.vue` uses 7s, `kitchen.vue` 5s).
// NOT a websocket and not SSE: there is no WebSocket, EventSource, socket.io or SignalR anywhere in
// this repository's application code, and introducing the first one for an inbox that changes a few
// times an hour would be a new transport to operate for no gain.
const POLL_MS = 6000;

export default {
  name: 'PendingActions',
  components: { ProposalCardView },
  props: {
    // The scope the page's picker resolved. The route takes ONE store id, so a multi-store scope is
    // one call per store, merged. That is a real cost and it is why the page defaults the inbox to
    // the picker's selection rather than to every store the admin has.
    storeIds: {
      type: Array,
      default: () => []
    }
  },
  data: () => ({
    // `null` is UNKNOWN — nothing has been read yet, or the last read failed. `[]` is the merchant
    // having no proposals. The template renders them differently on purpose.
    rows: null,
    status: STAGED,
    loading: false,
    failure: '',
    busyId: null,
    conflict: null,
    conflictId: null,
    timer: null,
    // id → the `card` half of `GET /staged-actions/{id}`. The list row alone carries only
    // `DryRunDiff`, `ChangeSet` and `AffectedCount`; the detail read adds the title, the plain
    // words, the store scope, the effective window, the receipt and the expiry, which is what makes
    // an inbox card read like the one the merchant saw in the chat.
    //
    // ONLY the card is kept here, never the action: the action goes stale the instant it is stored
    // and the row from the list is always the fresher of the two. Keeping both would create exactly
    // the ambiguity the `{ action, card }` split exists to remove.
    //
    // Replaced wholesale rather than mutated: Vue 2 does not make a key added to an existing object
    // reactive, so `detailCards[id] = card` would fill the cache and never redraw the card.
    detailCards: {}
  }),
  computed: {
    statusFilters () {
      return [
        { value: STAGED, label: this.$i('assistant_status_staged') },
        { value: null, label: this.$i('assistant_inbox_filterAll') }
      ];
    },
    service () {
      return new AssistantService(this._coreInitializer);
    }
  },
  watch: {
    storeIds () {
      this.load();
    }
  },
  mounted () {
    this.load();
    this.startPolling();
  },
  beforeDestroy () {
    this.stopPolling();
  },
  methods: {
    idOf (row) {
      return pick(row, 'id') || pick(row, 'proposalId');
    },
    rowKey (row) {
      return String(this.idOf(row));
    },
    /**
     * THE LIVE STATUS. Always the LIST row, never the detail read's frozen card and never a cached
     * action — the list is re-read on every poll and after every decision, so it is the freshest
     * account of the row that exists on this screen.
     */
    statusOf (row) {
      return pick(row, 'status') || null;
    },
    /**
     * WHAT THE MERCHANT SEES: the frozen card when the detail read has produced one, otherwise the
     * list row, which carries a thinner but equally frozen version of the same facts.
     *
     * The row's own `Id`, `Origin` and `StoreId` are laid back over the top because the card does
     * not carry them under those names — and NOT its `Status`, which is deliberately withheld so
     * that nothing downstream can read a status out of the object it is supposed to read facts out
     * of. The live status travels as its own prop.
     */
    cardFor (row) {
      const card = this.detailCards[this.idOf(row)];
      if (!card) { return row; }
      return Object.assign({}, card, {
        Id: this.idOf(row),
        Origin: pick(row, 'origin'),
        StoreId: pick(row, 'storeId')
      });
    },
    isFailed (row) {
      return String(this.statusOf(row) || '').toLowerCase() === FAILED.toLowerCase();
    },
    /**
     * Fetch the full card for rows this component has not seen before.
     *
     * Once per id, never on a poll: the card is FROZEN at stage time and cannot change, so
     * re-reading it every six seconds would be N extra requests per tick for bytes that are by
     * construction identical. A failure is swallowed on purpose — the list row already renders a
     * usable card, so a detail read that does not answer costs the merchant some prose and nothing
     * else, and turning it into a visible error would report a degraded card as a broken inbox.
     */
    async loadDetails (rows) {
      const wanted = rows.map(row => this.idOf(row)).filter(id => id && !this.detailCards[id]);
      if (!wanted.length) { return; }
      const fetched = await Promise.all(wanted.map(id => (
        this.service.GetStagedAction(id).then(detail => [id, pick(detail, 'card')]).catch(() => null)
      )));
      const next = Object.assign({}, this.detailCards);
      fetched.forEach((entry) => {
        if (entry && entry[1]) { next[entry[0]] = entry[1]; }
      });
      this.detailCards = next;
    },
    setStatus (value) {
      this.status = value;
      this.load();
    },
    // Clears before it sets. `beforeDestroy` holds ONE handle, so a second interval started over the
    // top of the first is one this component can never stop — it would keep polling after the tab is
    // gone. Switching stores is enough to start one.
    startPolling () {
      this.stopPolling();
      this.timer = setInterval(() => { this.load(true); }, POLL_MS);
    },
    stopPolling () {
      if (this.timer) { clearInterval(this.timer); }
      this.timer = null;
    },
    /**
     * Read the inbox.
     *
     * `quiet` is the POLL path: it must not flip `loading`, because a spinner every six seconds is a
     * board that looks broken, and it must not blank `rows` on a transient failure — a poll that
     * fails leaves the last known list on screen rather than replacing a real answer with an empty
     * one. Only an explicit read clears to unknown.
     */
    async load (quiet) {
      if (!this.storeIds.length) {
        this.rows = [];
        return;
      }
      if (!quiet) {
        this.loading = true;
        this.failure = '';
        this.rows = null;
      }
      const wanted = this.storeIds.slice();
      try {
        const perStore = await Promise.all(
          wanted.map(storeId => this.service.ListStagedActions(storeId, this.status))
        );
        // A selection that changed while the reads were in flight must not be overwritten by the
        // answer to the previous question.
        if (String(wanted) !== String(this.storeIds)) { return; }
        const merged = [];
        perStore.forEach((list) => {
          (Array.isArray(list) ? list : []).forEach(row => merged.push(row));
        });
        merged.sort((a, b) => {
          const left = new Date(pick(a, 'createdAt') || 0).getTime();
          const right = new Date(pick(b, 'createdAt') || 0).getTime();
          return right - left;
        });
        this.rows = merged;
        this.failure = '';
        // Not awaited: the list is what the merchant needs on screen, and the cards it already
        // renders are complete enough to act on. The detail read enriches them when it lands.
        this.loadDetails(merged);
      } catch (error) {
        if (quiet) { return; }
        this.rows = null;
        this.failure = this.messageFor(error);
      } finally {
        if (!quiet) { this.loading = false; }
      }
    },
    messageFor (error) {
      if (isAssistantApiError(error)) {
        // The server's own sentence when it sent one. `StagedActionController` answers
        // `{ message }`, which is the only account of the refusal that exists.
        return error.message || this.$i('assistant_inbox_readFailed');
      }
      return this.$i('assistant_inbox_readFailed');
    },
    /**
     * Approve.
     *
     * The re-entrancy guard is here and not only in the button's `disabled`, because a disabled
     * attribute is a rendering and this call writes prices. After ANY outcome the list is re-read
     * rather than patched in place: a 409 does not say what the row's status now is (the body
     * carries no status member), so the only way to learn it is to ask.
     */
    async onApprove (id) {
      if (this.busyId) { return; }
      this.busyId = id;
      this.conflict = null;
      this.conflictId = null;
      try {
        const result = await this.service.Approve(id);
        this.$emit('approved', result);
        await this.load();
      } catch (error) {
        this.handleDecisionFailure(error, id);
      } finally {
        this.busyId = null;
      }
    },
    async onReject (id) {
      if (this.busyId) { return; }
      this.busyId = id;
      this.conflict = null;
      this.conflictId = null;
      try {
        await this.service.Reject(id);
        this.$emit('rejected', id);
        await this.load();
      } catch (error) {
        this.handleDecisionFailure(error, id);
      } finally {
        this.busyId = null;
      }
    },
    async handleDecisionFailure (error, id) {
      const conflict = describeConflict(error);
      if (conflict) {
        this.conflict = conflict;
        this.conflictId = id;
        // Re-read either way. A kill-switch refusal leaves the row Staged and it must stay on the
        // board; every other 409 has already moved it and the board must stop offering it.
        await this.load();
        return;
      }
      this.failure = this.messageFor(error);
      await this.load();
    }
  }
};
</script>

<style lang="scss" scoped>
.pending-actions__bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.pending-actions__filters {
  display: flex;
  gap: 8px;
}

.pending-actions__filter {
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  background: white;
  color: #64748b;
  font-size: 0.9em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { border-color: #cbd5e0; }

  &.is-active {
    border-color: #1bb776;
    color: #1bb776;
    background: #e8f7f1;
  }
}

.pending-actions__refresh {
  padding: 8px 16px;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  background: white;
  color: #292c34;
  font-size: 0.9em;
  cursor: pointer;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.pending-actions__note {
  color: #64748b;
  font-size: 0.95em;
  padding: 24px;
  background: #f8f9fa;
  border-radius: 12px;
  margin: 0;
}

.pending-actions__failure {
  color: #292c34;
  font-size: 0.95em;
  padding: 16px;
  background: #FEF2F2;
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  margin: 0;
}

.pending-actions__row { margin-bottom: 8px; }

.pending-actions__failed {
  background: #FEF2F2;
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  padding: 16px;
  margin: -8px 0 16px 0;

  p { margin: 0 0 8px 0; font-size: 0.9em; }
}

.pending-actions__failed-line { font-weight: 600; color: #292c34; }
.pending-actions__failed-reason { color: #64748b; font-style: italic; }

.pending-actions__failed-btn {
  padding: 10px 18px;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  background: white;
  color: #292c34;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;

  &:hover { background: #f8f9fa; border-color: #cbd5e0; }
}

.empty-state {
  text-align: center;
  padding: 64px 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin: 32px 0;

  .material-icons {
    font-size: 4em;
    color: #cbd5e0;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 1.5em;
    color: #292c34;
    margin-bottom: 8px;
    font-weight: 600;
  }

  p { color: #64748b; margin-bottom: 0; }
}
</style>
