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
      <!-- `load()`, not `load`. A bare method reference receives the click EVENT as its first
           argument, which `load` reads as `quiet` — so this button used to run the silent POLL path:
           no spinner, no clearing of a stale refusal, and a label that could never change. -->
      <button
        type="button"
        class="pending-actions__refresh"
        :disabled="loading"
        data-test="refresh"
        @click="load()"
      >
        {{ loading ? $i('assistant_inbox_loading') : $i('assistant_inbox_refresh') }}
      </button>
    </div>

    <!-- ── WHAT YOUR LAST DECISION DID ─────────────────────────────────────────────────────────────
         Above the list, and deliberately NOT inside a row, because by the time there is anything to
         say the row is usually gone: a successful approve moves the proposal out of the default
         `Staged` filter and so does every non-kill-switch 409, and the re-read that follows a
         decision then drops it. A message rendered per-row would be rendered nowhere at all — which
         is exactly what used to happen, on the one screen where silence is least affordable.

         It is also NOT the house toast (`pages/admin/growth-newsletter.vue`,
         `pages/admin/workforce-rates.vue`), which auto-dismisses after five seconds. "The change has
         been made" is a statement about money that is already live; it must not expire on a timer
         while the merchant is reading the list underneath it. The next decision clears it. -->
    <p v-if="decision" class="pending-actions__decision" :class="'is-' + decision.tone" data-test="decision">
      <span class="pending-actions__decision-line">{{ decision.message }}</span>
      <span v-if="decision.detail" class="pending-actions__decision-detail">{{ decision.detail }}</span>
    </p>

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
          :relisted="true"
          @approve="onApprove"
          @reject="onReject"
        />

        <!-- ── A FAILED ROW IS REPAIRED FORWARD, NEVER RESET ────────────────────────────────────
             There is no un-fail transition in the spine: `StagedActionStatus` has no edge out of
             `Failed`, and `ApproveAsync` answers 409 "This proposal failed while it was being
             applied and cannot be approved again." So the only honest affordance is composing a
             NEW ask, and that is what this offers.

             ⚠️ THE REASON IS ON THE WIRE — THIS COMMENT USED TO SAY IT WAS "LANDING NOW". It
             landed: `StagedActionModel.FailureReason` (`Mcp/Models/McpStagingModels.cs:164-173`) is
             emitted on the LIST row, not merely on the single-GET, precisely so the inbox can state
             it without a round trip. `cardFor` lays it over the frozen card and the card renders it.

             The ignorance line below is therefore no longer the ordinary case; it is the fallback
             for a row that failed without a reason the server was willing to publish. The model's
             own comment is explicit that this is NOT the `StagedAction.FailureReason` COLUMN, which
             holds an exception message: `StagedActionFailureReasons` is the allow-list of sentences
             that may reach a merchant, and anything else is withheld rather than leaked. So a blank
             here means "the server declined to say", which is exactly what the line claims. -->
        <div v-if="isFailed(row)" class="pending-actions__failed" data-test="failed-repair">
          <p class="pending-actions__failed-line">
            {{ $i('assistant_inbox_failedTitle') }}
          </p>
          <p v-if="!failureReasonOf(row)" class="pending-actions__failed-reason">
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
    // WHAT THE LAST DECISION DID: `{ message, detail, tone }` or null. Separate from `failure`, which
    // is strictly the READ failure and which the template renders INSTEAD of the list — a decision
    // outcome routed through `failure` would hide the very inbox the merchant just acted on. Held as
    // resolved prose rather than a key because it can carry the server's own sentence as well as a
    // translated one, which is the same shape the house toasts store (`growth-newsletter.vue`).
    decision: null,
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
      // The outcome of a decision made against a different scope is not an outcome of this one.
      this.decision = null;
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
        StoreId: pick(row, 'storeId'),
        // Laid over for the same reason as the three above: it is a property of the LIVE row and the
        // frozen card cannot carry it — a card stamped at stage time has by definition not failed
        // yet. `pick` returns undefined when the row carries no reason, so a row that has not failed
        // (or whose reason the server withheld) stamps nothing over anything.
        FailureReason: pick(row, 'failureReason')
      });
    },
    isFailed (row) {
      return String(this.statusOf(row) || '').toLowerCase() === FAILED.toLowerCase();
    },
    /** The server's account of why a row failed, when it sent one. Never invented, never blank. */
    failureReasonOf (row) {
      return pick(row, 'failureReason') || null;
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
      this.decision = null;
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
     * attribute is a rendering and this call writes prices.
     *
     * After ANY outcome the list is re-read rather than patched in place. The 409 DOES now name the
     * row's status (`status` on the body — this comment used to say the opposite), and
     * `describeConflict` reads it to tell the merchant what their proposal became. But knowing one
     * row's status is not knowing the list's: a decision that removes a row from the `Staged` filter
     * changes what the board should show, and patching the one row this client happens to hold would
     * leave every other row as stale as it was. The status makes the SENTENCE accurate; the re-read
     * is what makes the LIST accurate, and they are different jobs.
     */
    async onApprove (id) {
      if (this.busyId) { return; }
      this.busyId = id;
      this.conflict = null;
      this.conflictId = null;
      this.decision = null;
      try {
        const result = await this.service.Approve(id);
        this.$emit('approved', result);
        await this.load();
        // AFTER the reload, never before. `load()` opens by clearing `failure` and blanking `rows`,
        // so anything said ahead of it lives for one microtask and is then erased by the very read
        // it triggered. Every `this.decision =` in this component is on this side of an `await
        // this.load()` for that reason.
        this.say('ok', this.$i(pick(result, 'wasReplay')
          ? 'assistant_card_approvedReplay'
          : 'assistant_card_approved'));
      } catch (error) {
        await this.handleDecisionFailure(error, id);
      } finally {
        this.busyId = null;
      }
    },
    async onReject (id) {
      if (this.busyId) { return; }
      this.busyId = id;
      this.conflict = null;
      this.conflictId = null;
      this.decision = null;
      try {
        await this.service.Reject(id);
        this.$emit('rejected', id);
        await this.load();
        this.say('ok', this.$i('assistant_card_rejected'));
      } catch (error) {
        await this.handleDecisionFailure(error, id);
      } finally {
        this.busyId = null;
      }
    },
    /** Record the outcome of a decision. See the `decision` field and the banner in the template. */
    say (tone, message, detail) {
      this.decision = { tone, message, detail: detail || null };
    },
    async handleDecisionFailure (error, id) {
      const conflict = describeConflict(error);
      if (conflict) {
        this.conflict = conflict;
        this.conflictId = id;
        // Re-read either way. A kill-switch refusal leaves the row Staged and it must stay on the
        // board; every other 409 has already moved it and the board must stop offering it.
        await this.load();
        // And say so ABOVE the list, not only on the row — because for every 409 except the kill
        // switch the re-read above has just removed that row from the default `Staged` filter, so
        // the per-row binding matches nothing and the refusal would be rendered nowhere.
        //
        // …but when the row DID survive the re-read — which is the kill switch's whole point, since
        // it leaves the proposal Staged and approvable later — the card a few centimetres below is
        // already carrying the server's own sentence under the same translated line, and the banner
        // would be printing the entire refusal twice on one screen. So the banner keeps the
        // headline, which a merchant scrolled past the row still needs, and drops the detail it
        // would only be duplicating.
        //
        // The test is whether the row survived rather than `keepCard`, because that is the exact
        // condition under which the row's own block renders (`:conflict="conflictId === idOf(row)"`).
        // Under the `All` filter a non-kill-switch refusal survives the re-read too, and it would
        // read double for the same reason.
        const rowSurvived = Array.isArray(this.rows) && this.rows.some(row => this.idOf(row) === id);
        this.say('refused', this.$i(conflict.key), rowSurvived ? null : conflict.serverMessage);
        return;
      }
      // NOT `this.failure`: that is the read-failure slot and the template renders it INSTEAD of the
      // list, so a failed decision would blank an inbox that is perfectly readable.
      await this.load();
      this.say('refused', this.messageFor(error));
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

.pending-actions__decision {
  font-size: 0.95em;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 4px solid;
  margin: 0 0 16px 0;

  &.is-ok { background: #e8f7f1; border-left-color: #1bb776; }
  &.is-refused { background: #FEF2F2; border-left-color: #ef4444; }
}

.pending-actions__decision-line {
  display: block;
  font-weight: 600;
  color: #292c34;
}

/* The server's own English sentence, marked as the server's by being set apart from the translated
   line above it. Shown verbatim and never parsed. */
.pending-actions__decision-detail {
  display: block;
  margin-top: 4px;
  font-size: 0.9em;
  color: #64748b;
  font-style: italic;
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
