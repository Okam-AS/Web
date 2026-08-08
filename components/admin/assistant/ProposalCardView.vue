<template>
  <div class="proposal-card" :class="{ 'proposal-card--terminal': isTerminal }">
    <div class="proposal-card__head">
      <div class="proposal-card__head-text">
        <h3 class="proposal-card__title">
          {{ title || $i('assistant_card_untitled') }}
        </h3>
        <div class="proposal-card__stamps">
          <span v-if="kind" class="proposal-card__stamp">{{ kind }}</span>
          <!-- The origin is a SOURCE LABEL and nothing more. A SocialChef-staged row and a
               chat-staged row are the same spine, the same approval and the same card; giving one
               of them its own chrome would teach a merchant that the two are different kinds of
               promise, which they are not. -->
          <span v-if="origin" class="proposal-card__stamp proposal-card__stamp--origin">
            {{ originLabel }}
          </span>
          <span v-if="statusLabel" class="proposal-card__stamp proposal-card__stamp--status">
            {{ statusLabel }}
          </span>
        </div>
      </div>
      <div v-if="expiry" class="proposal-card__expiry" :class="expiryClass">
        <span class="proposal-card__expiry-label">{{ $i('assistant_card_expiresIn') }}</span>
        <span class="proposal-card__expiry-value">{{ expiry }}</span>
      </div>
    </div>

    <p v-if="plainWords" class="proposal-card__plain">
      {{ plainWords }}
    </p>

    <ul v-if="diffLines.length" class="proposal-card__diff">
      <li v-for="(line, index) in diffLines" :key="index">
        {{ line }}
      </li>
    </ul>

    <!-- ── THE BLAST-RADIUS NOTICE ───────────────────────────────────────────────────────────────
         This is the single most important line on the card and it is NOT decoration.

         `StagedActionService.ToModel` and `BuildProposalCard` both do:

             ChangeSet     = changeSet.Take(CardChangeSetSample).ToList()   // CardChangeSetSample = 50
             AffectedCount = changeSet.Count

         so the table below is a SAMPLE and `AffectedCount` is the whole blast radius. A merchant who
         reads fifty rows and presses approve writes N. No endpoint returns the untruncated set, so
         the count is the only honest account of the difference and it has to be on screen next to
         the table it qualifies. -->
    <p v-if="isTruncated" class="proposal-card__truncation" data-test="truncation">
      {{ truncationNotice }}
    </p>

    <div v-if="changeSet.length" class="proposal-card__table-wrap">
      <table class="proposal-card__table">
        <thead>
          <tr>
            <th>{{ $i('assistant_card_col_target') }}</th>
            <th>{{ $i('assistant_card_col_field') }}</th>
            <th class="is-numeric">
              {{ $i('assistant_card_col_before') }}
            </th>
            <th class="is-numeric">
              {{ $i('assistant_card_col_after') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(entry, index) in changeRows" :key="index">
            <td>
              <span class="proposal-card__target-kind">{{ entry.targetKind }}</span>
              <span class="proposal-card__target-id">{{ entry.targetId }}</span>
            </td>
            <td>{{ entry.field }}</td>
            <!-- Absent is rendered as a dash, never as kr 0,00. A change entry with no `before` is
                 a value nobody recorded; a zero is a price somebody set. -->
            <td class="is-numeric">
              {{ entry.before || '—' }}
            </td>
            <td class="is-numeric is-after">
              {{ entry.after || '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <dl class="proposal-card__facts">
      <div v-if="storeScopeLabel" class="proposal-card__fact">
        <dt>{{ $i('assistant_card_storeScope') }}</dt>
        <dd>{{ storeScopeLabel }}</dd>
      </div>
      <div v-if="effectiveWindowLabel" class="proposal-card__fact">
        <dt>{{ $i('assistant_card_effectiveWindow') }}</dt>
        <dd>{{ effectiveWindowLabel }}</dd>
      </div>
      <div v-if="sourceReceiptLabel" class="proposal-card__fact">
        <dt>{{ $i('assistant_card_sourceReceipt') }}</dt>
        <dd>{{ sourceReceiptLabel }}</dd>
      </div>
    </dl>

    <!-- A refusal keeps the card on screen when the refusal is recoverable, and only then. The
         kill-switch 409 is the one case where the merchant does nothing and a later retry succeeds,
         so removing the card would be removing the thing they will approve in ten minutes. -->
    <div v-if="conflict" class="proposal-card__conflict" :class="{ 'is-recoverable': conflict.keepCard }">
      <p class="proposal-card__conflict-line">
        {{ $i(conflict.key) }}
      </p>
      <!-- The server's own words, verbatim and marked as the server's. They are English prose built
           by `StagedActionService.Describe` and they are the ONLY place the row's real status is
           named — the 409 body carries no status member. Shown rather than parsed. -->
      <p v-if="conflict.serverMessage" class="proposal-card__conflict-server">
        {{ conflict.serverMessage }}
      </p>
      <p class="proposal-card__conflict-hint">
        {{ $i('assistant_conflict_relist') }}
      </p>
    </div>

    <div v-if="failureReason" class="proposal-card__failure">
      <p>{{ failureReason }}</p>
    </div>

    <div v-if="canDecide" class="proposal-card__actions">
      <template v-if="!confirming">
        <button
          type="button"
          class="proposal-card__btn proposal-card__btn--approve"
          :disabled="busy"
          data-test="approve-open"
          @click="confirming = true"
        >
          {{ $i('assistant_card_approve') }}
        </button>
        <button
          type="button"
          class="proposal-card__btn proposal-card__btn--reject"
          :disabled="busy"
          data-test="reject"
          @click="onReject"
        >
          {{ $i('assistant_card_reject') }}
        </button>
      </template>

      <!-- ── STEP TWO. The confirm NAMES THE COUNT, and the count it names is `AffectedCount` —
           the full blast radius, not the length of the sample above it. That is the whole point of
           the two steps: the first click is "I read the card", the second is "write N prices". -->
      <template v-else>
        <p class="proposal-card__confirm-question" data-test="confirm-question">
          {{ confirmQuestion }}
        </p>
        <div class="proposal-card__confirm-row">
          <button
            type="button"
            class="proposal-card__btn proposal-card__btn--approve"
            :disabled="busy"
            data-test="approve-confirm"
            @click="onApprove"
          >
            {{ confirmLabel }}
          </button>
          <button
            type="button"
            class="proposal-card__btn proposal-card__btn--cancel"
            :disabled="busy"
            data-test="approve-cancel"
            @click="confirming = false"
          >
            {{ $i('common_cancel') }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import { pick, pickList, oreOf, STAGED } from '~/utils/assistant/api-client';

// Recomputed on a timer so the countdown is a countdown rather than a value that was true when the
// page loaded. One second is the smallest unit the label shows.
const TICK_MS = 1000;

// Every value each field can carry, lower-cased. TWO sources feed `Origin` and they do not agree on
// vocabulary — the CARD's is the contract's system word (`okam` / `socialchef`, whose producer here
// is always `okam`) and the INBOX ROW's is the staging surface (`mcp` / `chat`, from
// `StagedActionOrigin` lower-cased on the way out). Both render through this component, so both
// vocabularies live here.
const KNOWN_ORIGINS = ['okam', 'socialchef', 'mcp', 'chat'];
const KNOWN_STATUSES = ['staged', 'executed', 'rejected', 'expired', 'executing', 'failed'];

export default {
  name: 'ProposalCardView',
  props: {
    // The card as it arrives from `/chat/ask` (`Cards[i]`) OR a `StagedActionModel` row from
    // `GET /staged-actions`. Both are read through `pick`, which is case-tolerant, because the two
    // routes disagree about casing and the components must not have to know which one they got.
    card: {
      type: Object,
      required: true
    },
    /**
     * THE LIVE STATUS OF THE ROW, which is NOT a property of the card.
     *
     * ⚠️ THE CARD CANNOT ANSWER "what may this merchant do now", AND IT WILL LOOK LIKE IT CAN.
     * `GET /staged-actions/{id}` answers `{ action, card }`, and the card is rebuilt VERBATIM from
     * the bytes frozen at stage time — so it carries `NeedsApproval: true` and live `ApproveRef` /
     * `RejectRef` even for a row that has already Executed, been Rejected or Expired. That is the
     * same-bytes law working correctly: the card must describe the proposal as the merchant saw it
     * when the numbers were computed, and it cannot know what happened afterwards.
     *
     * Read `action.status` for anything about what the merchant may DO; read the card only for what
     * the merchant should SEE. Rendering the approve button off `NeedsApproval` puts a live Approve
     * on every already-executed row in the inbox — which is why this component never reads that
     * field at all, and why the live status arrives here as its own prop rather than being fished
     * out of whichever object the caller happened to pass.
     */
    status: {
      type: String,
      default: null
    },
    // A `describeConflict` result, or null.
    conflict: {
      type: Object,
      default: null
    },
    busy: {
      type: Boolean,
      default: false
    },
    // Withheld on a row that is already resolved: an Executed or Rejected proposal has nothing left
    // to decide, and offering the buttons would be offering an action that can only 409.
    decidable: {
      type: Boolean,
      default: true
    }
  },
  data: () => ({
    confirming: false,
    now: Date.now(),
    timer: null
  }),
  computed: {
    title () { return pick(this.card, 'title'); },
    plainWords () { return pick(this.card, 'plainWords'); },
    kind () { return pick(this.card, 'kind'); },
    origin () { return pick(this.card, 'origin'); },
    // The `status` PROP wins whenever it is supplied, because it is the live row and the card is a
    // frozen photograph. The card fallback exists only for the inbox LIST route, whose rows are
    // `StagedActionModel` and do carry a real `Status` of their own.
    liveStatus () { return this.status || pick(this.card, 'status'); },
    failureReason () { return pick(this.card, 'failureReason'); },
    diffLines () {
      const lines = pickList(this.card, 'diffLines');
      // A staged row carries no `DiffLines`; it carries `DryRunDiff`, the same sentence the card
      // builds its lines from. Falling back keeps the inbox and the chat card reading identically.
      if (lines.length) { return lines; }
      const dryRun = pick(this.card, 'dryRunDiff');
      return dryRun ? [dryRun] : [];
    },
    changeSet () { return pickList(this.card, 'changeSet'); },
    affectedCount () {
      const value = pick(this.card, 'affectedCount');
      return typeof value === 'number' ? value : null;
    },
    isTruncated () {
      return this.affectedCount !== null && this.affectedCount > this.changeSet.length;
    },
    truncationNotice () {
      return this.$i('assistant_card_showingOf', {
        shown: this.changeSet.length,
        total: this.affectedCount
      });
    },
    changeRows () {
      return this.changeSet.map(entry => ({
        targetKind: pick(entry, 'targetKind') || '',
        targetId: pick(entry, 'targetId') || '',
        field: pick(entry, 'field') || '',
        before: this.moneyLabel(pick(entry, 'before')),
        after: this.moneyLabel(pick(entry, 'after'))
      }));
    },
    storeScopeLabel () {
      const scope = pick(this.card, 'storeScope');
      if (scope) {
        const names = pickList(scope, 'storeNames');
        if (names.length) { return names.join(', '); }
        const ids = pickList(scope, 'storeIds');
        if (ids.length) { return ids.join(', '); }
      }
      // The inbox row has no StoreScope object — it has a bare StoreId.
      const storeId = pick(this.card, 'storeId');
      return typeof storeId === 'number' ? String(storeId) : null;
    },
    effectiveWindowLabel () {
      const window = pick(this.card, 'effectiveWindow');
      if (!window) { return null; }
      const from = this.formatDate(pick(window, 'from'));
      const to = this.formatDate(pick(window, 'to'));
      if (!from) { return null; }
      // A null `To` is open-ended by contract — the change stands until something changes it again.
      // Rendering it as a blank end date would read as an unknown, which is a different claim.
      return to ? from + ' – ' + to : from + ' – ' + this.$i('assistant_card_openEnded');
    },
    sourceReceiptLabel () {
      const receipt = pick(this.card, 'sourceReceipt');
      if (!receipt) { return null; }
      const parts = [pick(receipt, 'detail'), pick(receipt, 'reference')].filter(Boolean);
      return parts.length ? parts.join(' · ') : null;
    },
    // Translated from an ENUMERATED set, not from "does `$i` echo the key back".
    //
    // The echo test was the first shape of this and it was wrong twice over: it made the rendering
    // depend on a lookup MISS, which is a property of the dictionary rather than of the value, and
    // it silently inverted under the house test mock (`$i: key => key`), where every key looks
    // missing and every label fell through to the raw wire word. Enumerating means an origin or
    // status this client has no word for is shown RAW — visibly untranslated, which is the honest
    // rendering of "the server sent something newer than this screen".
    originLabel () {
      const origin = String(this.origin || '').toLowerCase();
      return !KNOWN_ORIGINS.includes(origin) ? this.origin : this.$i('assistant_origin_' + origin);
    },
    statusLabel () {
      if (!this.liveStatus) { return null; }
      const status = String(this.liveStatus).toLowerCase();
      return !KNOWN_STATUSES.includes(status) ? this.liveStatus : this.$i('assistant_status_' + status);
    },
    // Everything except `Staged` is terminal for the merchant's purposes: `Executing` is a CLAIMED
    // row that this person can no longer approve or turn down either, and it is the one non-final
    // state, so listing the four finals would leave it decidable. Stated as "not Staged" so a status
    // added to the enum later is refused by default rather than silently offered buttons.
    isTerminal () {
      return String(this.liveStatus || STAGED).toLowerCase() !== STAGED.toLowerCase();
    },
    canDecide () {
      return this.decidable && !this.isTerminal;
    },
    // The count the confirm speaks with. `AffectedCount` when the server sent one; otherwise the
    // sample length, which for a card with no truncation IS the whole set. Never invented.
    decisionCount () {
      if (this.affectedCount !== null) { return this.affectedCount; }
      return this.changeSet.length;
    },
    confirmQuestion () {
      return this.decisionCount > 0
        ? this.$i('assistant_card_confirmQuestionCounted', { count: this.decisionCount })
        : this.$i('assistant_card_confirmQuestion');
    },
    confirmLabel () {
      return this.decisionCount > 0
        ? this.$i('assistant_card_confirmApproveCounted', { count: this.decisionCount })
        : this.$i('assistant_card_confirmApprove');
    },
    expiresAt () {
      const raw = pick(this.card, 'expiresAt');
      if (!raw) { return null; }
      const parsed = new Date(raw);
      return isNaN(parsed.getTime()) ? null : parsed;
    },
    expiry () {
      if (!this.expiresAt) { return null; }
      const remaining = this.expiresAt.getTime() - this.now;
      if (remaining <= 0) { return this.$i('assistant_card_expiredAlready'); }
      const totalMinutes = Math.floor(remaining / 60000);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours >= 1) { return hours + ' t ' + minutes + ' min'; }
      const seconds = Math.floor((remaining % 60000) / 1000);
      return minutes + ' min ' + seconds + ' s';
    },
    expiryClass () {
      if (!this.expiresAt) { return null; }
      const remaining = this.expiresAt.getTime() - this.now;
      if (remaining <= 0) { return 'is-gone'; }
      return remaining < 3600000 ? 'is-soon' : null;
    }
  },
  mounted () {
    this.timer = setInterval(() => { this.now = Date.now(); }, TICK_MS);
  },
  beforeDestroy () {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },
  methods: {
    /**
     * An `McpMoney` as this application writes money.
     *
     * `priceLabel` is the global mixin's, so the card inherits the admin edition's `kr ` prefix and
     * the Swiss market's `formatChf` for free rather than carrying a second opinion about money.
     * Returns null for ABSENT so the template can render a dash: a change entry with no `before` is
     * a value nobody recorded, and `kr 0,00` is a price somebody set.
     */
    moneyLabel (money) {
      const ore = oreOf(money);
      return ore === null ? null : this.priceLabel(ore);
    },
    formatDate (value) {
      if (!value) { return null; }
      const parsed = new Date(value);
      if (isNaN(parsed.getTime())) { return null; }
      const pad = n => String(n).padStart(2, '0');
      return pad(parsed.getDate()) + '.' + pad(parsed.getMonth() + 1) + '.' + parsed.getFullYear() +
        ' ' + pad(parsed.getHours()) + ':' + pad(parsed.getMinutes());
    },
    onApprove () {
      this.confirming = false;
      this.$emit('approve', pick(this.card, 'proposalId') || pick(this.card, 'id'));
    },
    onReject () {
      this.$emit('reject', pick(this.card, 'proposalId') || pick(this.card, 'id'));
    }
  }
};
</script>

<style lang="scss" scoped>
.proposal-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
}

.proposal-card--terminal {
  opacity: 0.75;
}

.proposal-card__head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.proposal-card__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px 0;
}

.proposal-card__stamps {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.proposal-card__stamp {
  font-size: 0.75em;
  padding: 4px 8px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;
  font-weight: 600;
}

.proposal-card__stamp--origin {
  background: #eef2ff;
  color: #4338ca;
}

.proposal-card__stamp--status {
  background: #ecfdf5;
  color: #159f63;
}

.proposal-card__expiry {
  text-align: right;
  font-size: 0.8em;
  color: #64748b;
  white-space: nowrap;
}

.proposal-card__expiry-label {
  display: block;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  font-weight: 600;
}

.proposal-card__expiry-value {
  font-size: 1.15em;
  color: #292c34;
}

.proposal-card__expiry.is-soon .proposal-card__expiry-value { color: #92400e; }
.proposal-card__expiry.is-gone .proposal-card__expiry-value { color: #ef4444; }

.proposal-card__plain {
  font-size: 0.95em;
  color: #292c34;
  margin: 0 0 12px 0;
  white-space: pre-wrap;
}

.proposal-card__diff {
  margin: 0 0 16px 0;
  padding-left: 20px;
  color: #64748b;
  font-size: 0.9em;

  li { margin-bottom: 4px; }
}

.proposal-card__truncation {
  background: #FFF3E0;
  border-left: 4px solid #FF9800;
  border-radius: 8px;
  padding: 12px 16px;
  margin: 0 0 12px 0;
  font-size: 0.9em;
  font-weight: 600;
  color: #92400e;
}

.proposal-card__table-wrap {
  overflow-x: auto;
  margin-bottom: 16px;
}

.proposal-card__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88em;

  th, td {
    text-align: left;
    padding: 8px 12px;
    border-bottom: 1px solid #e2e8f0;
  }

  th {
    font-size: 0.85em;
    font-weight: 600;
    color: #292c34;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }

  td { color: #292c34; }

  .is-numeric { text-align: right; font-variant-numeric: tabular-nums; }
  .is-after { font-weight: 600; color: #1bb776; }
}

.proposal-card__target-kind {
  display: block;
  font-size: 0.85em;
  color: #64748b;
}

.proposal-card__target-id {
  display: block;
  font-family: monospace;
  font-size: 0.85em;
  color: #94a3b8;
  word-break: break-all;
}

.proposal-card__facts {
  margin: 0 0 16px 0;
  display: grid;
  gap: 8px;
}

.proposal-card__fact {
  display: flex;
  gap: 8px;
  font-size: 0.85em;

  dt {
    font-weight: 600;
    color: #64748b;
    min-width: 130px;
  }

  dd {
    margin: 0;
    color: #292c34;
  }
}

.proposal-card__conflict {
  background: #FEF2F2;
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;

  &.is-recoverable {
    background: #FFF3E0;
    border-left-color: #FF9800;
  }

  p { margin: 0 0 4px 0; font-size: 0.9em; }
}

.proposal-card__conflict-line { font-weight: 600; color: #292c34; }
.proposal-card__conflict-server { color: #64748b; font-style: italic; }
.proposal-card__conflict-hint { color: #64748b; }

.proposal-card__failure {
  background: #FEF2F2;
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  font-size: 0.9em;
  color: #292c34;

  p { margin: 0; }
}

.proposal-card__actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.proposal-card__confirm-question {
  margin: 0;
  font-size: 0.95em;
  font-weight: 600;
  color: #292c34;
}

.proposal-card__confirm-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.proposal-card__btn {
  padding: 14px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95em;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
}

.proposal-card__btn--approve {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
  }
}

.proposal-card__btn--reject {
  background: white;
  color: #ef4444;
  border-color: #ef4444;

  &:hover:not(:disabled) {
    background: #ef4444;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
}

.proposal-card__btn--cancel {
  background: white;
  color: #292c34;
  border-color: #e2e8f0;

  &:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #cbd5e0;
  }
}

.proposal-card__actions > .proposal-card__btn { align-self: flex-start; }

@media (max-width: 768px) {
  .proposal-card { padding: 16px; }

  .proposal-card__head { flex-direction: column; }

  .proposal-card__expiry { text-align: left; }

  .proposal-card__btn { width: 100%; }
}
</style>
