<template>
  <AdminPage @login-success="startAssistant">
    <div class="assistant-page">
      <div class="page-header">
        <h1>{{ $i('assistant_title') }}</h1>
        <p>{{ $i('assistant_subtitle') }}</p>
      </div>

      <div class="assistant-tabs">
        <button
          type="button"
          class="assistant-tabs__tab"
          :class="{ 'is-active': tab === 'ask' }"
          data-test="tab-ask"
          @click="tab = 'ask'"
        >
          {{ $i('assistant_tab_ask') }}
        </button>
        <button
          type="button"
          class="assistant-tabs__tab"
          :class="{ 'is-active': tab === 'inbox' }"
          data-test="tab-inbox"
          @click="tab = 'inbox'"
        >
          {{ $i('assistant_tab_inbox') }}
        </button>
      </div>

      <div class="controls-section">
        <div class="controls-row">
          <div v-if="adminStores.length > 1" class="filter-group">
            <label class="filter-label">{{ $i('assistant_stores') }}</label>
            <MultiSelectDropdown
              :options="storeOptions"
              :selected.sync="selectedStoreIds"
              :placeholder="$i('assistant_selectStores')"
              :all-text="$i('assistant_allStores')"
              :search-placeholder="$i('assistant_searchStore')"
            />
          </div>
          <p v-else-if="adminStores.length === 1" class="filter-single" data-test="single-store">
            {{ adminStores[0].name }}
          </p>
        </div>
      </div>

      <!-- ========================= ASK ========================= -->
      <template v-if="tab === 'ask'">
        <div v-if="thread.length" class="assistant-thread">
          <div v-for="(turn, index) in thread" :key="index" class="assistant-turn">
            <div class="assistant-turn__question">
              <span class="assistant-turn__who">{{ $i('assistant_you') }}</span>
              <p>{{ turn.question }}</p>
            </div>

            <div class="assistant-turn__answer">
              <span class="assistant-turn__who">{{ $i('assistant_okam') }}</span>

              <div v-if="turn.pending" class="assistant-turn__pending" data-test="pending">
                {{ $i('assistant_thinking') }}
              </div>

              <template v-else-if="turn.failure">
                <p class="assistant-turn__failure" data-test="turn-failure">
                  {{ turn.failure }}
                </p>
              </template>

              <template v-else>
                <!-- PLAIN TEXT, pre-wrap. Deliberately NOT `$md()`: this project's markdownit is
                     configured `html: true` (nuxt.config.js:321-324), so any HTML in a model answer
                     would be rendered rather than shown. That is an XSS hole opened by
                     configuration, on a surface whose whole content is model output. Mustache
                     interpolation escapes; the CSS keeps the newlines. Same choice AIQueryBox made. -->
                <p class="assistant-turn__text" data-test="answer">
                  {{ turn.answer }}
                </p>

                <!-- Metrics ------------------------------------------------------------------ -->
                <div v-if="turn.metrics.length" class="assistant-metrics" data-test="metrics">
                  <div v-for="metric in turn.metrics" :key="metric.id || metric.label" class="assistant-metric">
                    <span class="assistant-metric__label">{{ metric.label }}</span>
                    <span class="assistant-metric__value">
                      {{ metric.value }}<span v-if="metric.unit" class="assistant-metric__unit">{{ metric.unit }}</span>
                    </span>
                  </div>
                </div>

                <!-- Table -------------------------------------------------------------------- -->
                <div v-if="turn.table && turn.table.rows.length" class="assistant-table-wrap" data-test="table">
                  <table class="assistant-table">
                    <thead>
                      <tr>
                        <th v-for="column in turn.table.columns" :key="column.key">
                          {{ column.label || column.key }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(row, rowIndex) in turn.table.rows" :key="rowIndex">
                        <td v-for="column in turn.table.columns" :key="column.key">
                          {{ cellOf(row, column) }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- ── THE VENUE PICKER ────────────────────────────────────────────────────────
                     Shown when the turn asked which store. The backend REFUSES to pick one itself
                     — a write that spans several venues has no single target — so the buttons here
                     are the merchant answering, and answering re-asks with exactly one store. -->
                <div v-if="turn.needsStore" class="assistant-venues" data-test="venue-picker">
                  <p class="assistant-venues__prompt">
                    {{ $i('assistant_pickVenue') }}
                  </p>
                  <div class="assistant-venues__row">
                    <button
                      v-for="venue in turn.venues"
                      :key="venue.id"
                      type="button"
                      class="assistant-venues__btn"
                      :disabled="busy"
                      @click="askForVenue(turn.question, venue.id)"
                    >
                      {{ venue.name }}
                    </button>
                  </div>
                </div>

                <!-- Staged proposals, inline ------------------------------------------------- -->
                <div v-if="turn.cards.length" class="assistant-cards" data-test="cards">
                  <ProposalCardView
                    v-for="card in turn.cards"
                    :key="card.ProposalId || card.proposalId"
                    :card="card"
                    :busy="busy"
                    :conflict="turn.conflict"
                    @approve="onApprove(turn, $event)"
                    @reject="onReject(turn, $event)"
                  />
                  <p v-if="turn.decided" class="assistant-cards__decided" data-test="decided">
                    {{ turn.decided }}
                  </p>
                </div>

                <!-- ── THE BASIS DRAWER ────────────────────────────────────────────────────────
                     What the answer rests on. Only fields the response actually carries: this is a
                     trace-lite, not a receipts type, and nothing here is invented to fill a slot. -->
                <button
                  v-if="turn.hasBasis"
                  type="button"
                  class="assistant-basis__toggle"
                  data-test="basis-toggle"
                  @click="turn.basisOpen = !turn.basisOpen"
                >
                  {{ turn.basisOpen ? $i('assistant_basis_hide') : $i('assistant_basis_show') }}
                </button>

                <div v-if="turn.basisOpen" class="assistant-basis" data-test="basis">
                  <div v-if="turn.assumptions.length" class="assistant-basis__block">
                    <h4>{{ $i('assistant_basis_assumptions') }}</h4>
                    <ul>
                      <li v-for="(item, i) in turn.assumptions" :key="i">
                        {{ item }}
                      </li>
                    </ul>
                  </div>

                  <div v-if="turn.warnings.length" class="assistant-basis__block">
                    <h4>{{ $i('assistant_basis_warnings') }}</h4>
                    <ul class="is-warning">
                      <li v-for="(item, i) in turn.warnings" :key="i">
                        {{ item }}
                      </li>
                    </ul>
                  </div>

                  <div class="assistant-basis__block">
                    <h4>{{ $i('assistant_basis_trace') }}</h4>
                    <dl class="assistant-basis__facts">
                      <div v-if="turn.tools" class="assistant-basis__fact">
                        <dt>{{ $i('assistant_basis_tools') }}</dt>
                        <dd>{{ turn.tools }}</dd>
                      </div>
                      <div v-if="turn.period" class="assistant-basis__fact">
                        <dt>{{ $i('assistant_basis_period') }}</dt>
                        <dd>{{ turn.period }}</dd>
                      </div>
                      <div v-if="turn.scopeLabel" class="assistant-basis__fact">
                        <dt>{{ $i('assistant_basis_scope') }}</dt>
                        <dd>{{ turn.scopeLabel }}</dd>
                      </div>
                      <div v-if="turn.toolRounds !== null" class="assistant-basis__fact">
                        <dt>{{ $i('assistant_basis_rounds') }}</dt>
                        <dd>{{ turn.toolRounds }}</dd>
                      </div>
                      <div v-if="turn.stopReason" class="assistant-basis__fact">
                        <dt>{{ $i('assistant_basis_stopReason') }}</dt>
                        <dd>{{ turn.stopReason }}</dd>
                      </div>
                      <div v-if="turn.model" class="assistant-basis__fact">
                        <dt>{{ $i('assistant_basis_model') }}</dt>
                        <dd>{{ turn.model }}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div v-else class="empty-state" data-test="thread-empty">
          <span class="material-icons">forum</span>
          <h3>{{ $i('assistant_emptyTitle') }}</h3>
          <p>{{ $i('assistant_emptyBody') }}</p>
          <div class="assistant-examples">
            <button
              v-for="(example, index) in examples"
              :key="index"
              type="button"
              class="assistant-examples__btn"
              @click="draft = example; submit()"
            >
              {{ example }}
            </button>
          </div>
        </div>

        <!-- ── THE STORE SUGGESTION, OFFERED AND NEVER APPLIED ──────────────────────────────────
             The backend detects stores the QUESTION TEXT names and reports them separately from the
             scope it answered over, precisely so that a sentence cannot choose a merchant's store
             for them. It is a chip they press, or ignore. -->
        <div v-if="suggestion" class="assistant-suggestion" data-test="suggestion">
          <span class="assistant-suggestion__text">
            {{ $i('assistant_suggestion', { stores: suggestion.names.join(', ') }) }}
          </span>
          <button type="button" class="assistant-suggestion__yes" data-test="suggestion-apply" @click="applySuggestion">
            {{ $i('assistant_suggestion_apply') }}
          </button>
          <button type="button" class="assistant-suggestion__no" data-test="suggestion-dismiss" @click="suggestion = null">
            {{ $i('assistant_suggestion_dismiss') }}
          </button>
        </div>

        <div class="assistant-composer">
          <textarea
            v-model="draft"
            class="assistant-composer__input"
            rows="2"
            :placeholder="$i('assistant_placeholder')"
            :disabled="busy"
            data-test="composer"
            @keydown.enter.exact.prevent="submit"
          />
          <button
            type="button"
            class="assistant-composer__send"
            :disabled="busy || !draft.trim()"
            data-test="send"
            @click="submit"
          >
            {{ busy ? $i('assistant_sending') : $i('assistant_send') }}
          </button>
        </div>

        <!-- The honest note. `POST /chat/ask` takes a question and nothing else — no conversation
             id, no history — so every turn really is independent. Saying so is cheaper than a
             merchant discovering it by being misunderstood. -->
        <p class="assistant-composer__memory" data-test="memory-note">
          {{ $i('assistant_noMemory') }}
        </p>
      </template>

      <!-- ========================= INBOX ========================= -->
      <template v-else>
        <PendingActions
          :store-ids="selectedStoreIds"
          @compose-again="composeAgain"
        />
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import MultiSelectDropdown from '~/components/molecules/MultiSelectDropdown.vue';
import ProposalCardView from '~/components/admin/assistant/ProposalCardView.vue';
import PendingActions from '~/components/admin/assistant/PendingActions.vue';
import {
  AssistantService,
  isAssistantApiError,
  describeConflict,
  needsStoreChoice,
  pick,
  pickList
} from '~/utils/assistant/api-client';

export default {
  name: 'AdminAssistantPage',
  components: { AdminPage, MultiSelectDropdown, ProposalCardView, PendingActions },
  data: () => ({
    tab: 'ask',
    adminStores: [],
    selectedStoreIds: [],
    thread: [],
    draft: '',
    busy: false,
    suggestion: null
  }),
  computed: {
    // The house idiom, present verbatim in a dozen admin pages. `AIQueryBox` hard-codes `'no'` and
    // therefore answers a German or English operator in Norwegian; this reads the operator's own
    // choice, which is what the language switcher in the sidebar sets.
    locale () {
      return this.$store.state.adminLocale || 'no';
    },
    storeOptions () {
      return this.adminStores.map(store => ({ id: store.id, label: store.name }));
    },
    service () {
      return new AssistantService(this._coreInitializer);
    },
    examples () {
      return [
        this.$i('assistant_example1'),
        this.$i('assistant_example2'),
        this.$i('assistant_example3')
      ];
    }
  },
  mounted () {
    // `AdminPage` raises the sign-in modal for a signed-out visitor and emits `login-success` when
    // one arrives. All this must do is not call anything before that happens.
    if (!this.$store.getters.userIsLoggedIn) { return; }
    this.startAssistant();
  },
  methods: {
    // THE ONE STARTER for this screen: run by `mounted` for an operator who arrives already signed
    // in, and by the shell's `login-success` for one who signs in on the page. One list rather than
    // two, because the second copy is the one that goes stale.
    startAssistant () {
      this.adminStores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      this.selectedStoreIds = this.adminStores.map(store => store.id);

      // `AIQueryBox` hands its question over in the query string, with the scope the statistics
      // board was already narrowed to. Consumed once and then removed from the URL, so a reload does
      // not silently re-ask a question the merchant already got an answer to.
      const query = (this.$route && this.$route.query) || {};
      const handoff = Array.isArray(query.q) ? query.q[0] : query.q;

      // An explicit selection ALWAYS wins, including this one. It is still intersected with the
      // stores this admin actually administers, because a store id in a URL is not a grant — the
      // server re-checks it too, and a scope naming a store they do not administer is refused
      // wholesale rather than quietly narrowed.
      const scope = Array.isArray(query.stores) ? query.stores[0] : query.stores;
      if (typeof scope === 'string' && scope) {
        const asked = scope.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        const mine = asked.filter(id => this.selectedStoreIds.includes(id));
        if (mine.length) { this.selectedStoreIds = mine; }
      }

      if (typeof handoff === 'string' && handoff.trim()) {
        this.draft = handoff;
        const navigation = this.$router.replace({ path: this.$route.path, query: {} });
        if (navigation && typeof navigation.catch === 'function') { navigation.catch(() => {}); }
        this.submit();
      }
    },
    cellOf (row, column) {
      const value = row ? row[column.key] : undefined;
      return value === undefined || value === null ? '' : value;
    },
    submit () {
      const question = this.draft.trim();
      if (!question || this.busy) { return; }
      this.draft = '';
      this.ask(question, this.selectedStoreIds);
    },
    askForVenue (question, storeId) {
      this.ask(question, [storeId]);
    },
    applySuggestion () {
      if (!this.suggestion) { return; }
      this.selectedStoreIds = this.suggestion.ids.slice();
      this.suggestion = null;
    },
    composeAgain (row) {
      this.tab = 'ask';
      this.draft = this.$i('assistant_composeAgainDraft', { diff: pick(row, 'dryRunDiff') || '' });
    },
    /**
     * One turn.
     *
     * The turn is pushed BEFORE the request so the thread shows the question immediately and the
     * pending state belongs to a row rather than to the page. `scope` is passed explicitly and is
     * always what the picker resolved — the server narrows it by the StoreAdmins intersection and
     * nothing else, and no suggestion is ever folded in here.
     */
    async ask (question, scope) {
      const turn = {
        question,
        pending: true,
        failure: '',
        answer: '',
        metrics: [],
        table: null,
        cards: [],
        assumptions: [],
        warnings: [],
        tools: '',
        period: '',
        scopeLabel: '',
        toolRounds: null,
        stopReason: '',
        model: '',
        hasBasis: false,
        basisOpen: false,
        needsStore: false,
        venues: [],
        conflict: null,
        decided: ''
      };
      this.thread.push(turn);
      this.busy = true;

      try {
        const response = await this.service.Ask(question, scope, this.locale);
        this.fillTurn(turn, response);
      } catch (error) {
        turn.failure = isAssistantApiError(error) && error.message
          ? error.message
          : this.$i('assistant_askFailed');
      } finally {
        turn.pending = false;
        this.busy = false;
      }
    },
    fillTurn (turn, response) {
      // A refusal body also arrives as a ChatAskResponseModel — 400/401/403 carry `Success: false`
      // and put the reason in `Answer`. It is shown as the answer it is, not as a crash.
      turn.answer = pick(response, 'answer') || '';
      turn.metrics = pickList(response, 'metrics').map(metric => ({
        id: pick(metric, 'id'),
        label: pick(metric, 'label'),
        value: pick(metric, 'value'),
        unit: pick(metric, 'unit')
      }));

      const table = pick(response, 'table');
      if (table) {
        const columns = pickList(table, 'columns').map(column => ({
          key: pick(column, 'key'),
          label: pick(column, 'label'),
          type: pick(column, 'type')
        }));
        const rows = pickList(table, 'rows');
        turn.table = columns.length ? { columns, rows } : null;
      }

      turn.cards = pickList(response, 'cards');
      turn.assumptions = pickList(response, 'assumptions');
      turn.warnings = pickList(response, 'warnings');

      const storeIds = pickList(response, 'storeIds');
      const storeNames = pickList(response, 'storeNames');
      turn.scopeLabel = storeNames.length ? storeNames.join(', ') : storeIds.join(', ');

      const trace = pick(response, 'trace');
      if (trace) {
        // `Tool` is a COMMA-JOINED STRING, not a list — `ChatOrchestrator.FillTrace` joins the tool
        // names. Shown as it arrives. `Sql` is deliberately not read: the orchestrator sets it to
        // null unconditionally, so a field for it would be a permanently empty row.
        turn.tools = pick(trace, 'tool') || '';
        const rounds = pick(trace, 'toolRounds');
        turn.toolRounds = typeof rounds === 'number' ? rounds : null;
        turn.stopReason = pick(trace, 'stopReason') || '';
        turn.model = pick(trace, 'model') || '';
        turn.period = this.periodFrom(trace);
      }

      turn.needsStore = needsStoreChoice(response);
      if (turn.needsStore) {
        turn.venues = storeIds.map((id, index) => ({
          id,
          name: storeNames[index] || String(id)
        }));
      }

      turn.hasBasis = !!(turn.assumptions.length || turn.warnings.length ||
        turn.tools || turn.scopeLabel || turn.toolRounds !== null);

      const suggestion = pick(response, 'storeSuggestion');
      if (suggestion) {
        const ids = pickList(suggestion, 'storeIds');
        const names = pickList(suggestion, 'storeNames');
        this.suggestion = ids.length ? { ids, names: names.length ? names : ids.map(String) } : null;
      }
    },
    /**
     * The period the tools ran over, when the trace carries one.
     *
     * It is NOT a field on `ChatTrace`. It lives inside `ToolArguments`, which is an untyped
     * projection of `[{ Name, Arguments }]` where `Arguments` is `AnalyticsToolArguments` and often
     * EMPTY — a model-selected call carries its raw JSON elsewhere and never populates the typed
     * record. So this returns a period when one is genuinely there and an empty string otherwise,
     * and the drawer omits the row rather than showing a blank one.
     */
    periodFrom (trace) {
      const args = pick(trace, 'toolArguments');
      if (!Array.isArray(args)) { return ''; }
      const periods = [];
      args.forEach((entry) => {
        const inner = pick(entry, 'arguments');
        const period = inner ? pick(inner, 'period') : undefined;
        if (period && !periods.includes(period)) { periods.push(period); }
      });
      return periods.join(', ');
    },
    async onApprove (turn, id) {
      if (this.busy) { return; }
      this.busy = true;
      turn.conflict = null;
      try {
        const result = await this.service.Approve(id);
        turn.decided = pick(result, 'wasReplay')
          ? this.$i('assistant_card_approvedReplay')
          : this.$i('assistant_card_approved');
        turn.cards = [];
      } catch (error) {
        this.applyDecisionFailure(turn, error);
      } finally {
        this.busy = false;
      }
    },
    async onReject (turn, id) {
      if (this.busy) { return; }
      this.busy = true;
      turn.conflict = null;
      try {
        await this.service.Reject(id);
        turn.decided = this.$i('assistant_card_rejected');
        turn.cards = [];
      } catch (error) {
        this.applyDecisionFailure(turn, error);
      } finally {
        this.busy = false;
      }
    },
    applyDecisionFailure (turn, error) {
      const conflict = describeConflict(error);
      if (conflict) {
        turn.conflict = conflict;
        // The kill switch leaves the row STAGED and approvable later, so its card stays. Every
        // other 409 has already moved the row and the card would be an offer that cannot be taken.
        if (!conflict.keepCard) { turn.cards = []; }
        return;
      }
      turn.decided = isAssistantApiError(error) && error.message
        ? error.message
        : this.$i('assistant_card_decisionFailed');
    }
  }
};
</script>

<style lang="scss" scoped>
.assistant-page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) { padding: 16px; }
}

.page-header {
  margin-bottom: 24px;

  h1 {
    font-size: 2em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 8px 0;

    @media (max-width: 768px) { font-size: 1.5em; }
  }

  p { color: #64748b; margin: 0; }
}

.assistant-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;
}

.assistant-tabs__tab {
  padding: 12px 20px;
  border: none;
  background: none;
  color: #64748b;
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;

  &:hover { color: #292c34; }

  &.is-active {
    color: #1bb776;
    border-bottom-color: #1bb776;
  }
}

.controls-section {
  background: #fff;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}

.filter-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85em;
  font-weight: 600;
  color: #292c34;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.filter-single { margin: 0; color: #292c34; font-weight: 600; }

.assistant-thread { margin-bottom: 24px; }

.assistant-turn {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e2e8f0;

  &:last-child { border-bottom: none; }
}

.assistant-turn__who {
  display: block;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #94a3b8;
  margin-bottom: 4px;
}

.assistant-turn__question {
  margin-bottom: 16px;

  p {
    margin: 0;
    font-size: 1em;
    font-weight: 600;
    color: #292c34;
    white-space: pre-wrap;
  }
}

.assistant-turn__text {
  margin: 0 0 16px 0;
  font-size: 0.95em;
  line-height: 1.6;
  color: #292c34;
  /* The model's newlines are the model's; nothing here parses markup. */
  white-space: pre-wrap;
}

.assistant-turn__pending { color: #64748b; font-style: italic; }

.assistant-turn__failure {
  margin: 0;
  padding: 12px 16px;
  background: #FFF3E0;
  border-left: 4px solid #FF9800;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.9em;
}

.assistant-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.assistant-metric {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 12px 16px;
}

.assistant-metric__label {
  display: block;
  font-size: 0.8em;
  color: #64748b;
  margin-bottom: 4px;
}

.assistant-metric__value {
  font-size: 1.3em;
  font-weight: 600;
  color: #292c34;
  font-variant-numeric: tabular-nums;
}

.assistant-metric__unit {
  font-size: 0.65em;
  color: #64748b;
  margin-left: 4px;
}

.assistant-table-wrap {
  overflow-x: auto;
  margin-bottom: 16px;
}

.assistant-table {
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
}

.assistant-venues {
  background: #e8f7f1;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.assistant-venues__prompt {
  margin: 0 0 12px 0;
  font-size: 0.9em;
  font-weight: 600;
  color: #292c34;
}

.assistant-venues__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.assistant-venues__btn {
  padding: 10px 18px;
  border-radius: 8px;
  border: 2px solid #1bb776;
  background: white;
  color: #1bb776;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) { background: #1bb776; color: white; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.assistant-cards { margin-bottom: 16px; }

.assistant-cards__decided {
  margin: 0;
  padding: 12px 16px;
  background: #e8f7f1;
  border-radius: 8px;
  color: #159f63;
  font-weight: 600;
  font-size: 0.9em;
}

.assistant-basis__toggle {
  background: none;
  border: none;
  padding: 0;
  color: #64748b;
  font-size: 0.85em;
  text-decoration: underline;
  cursor: pointer;

  &:hover { color: #292c34; }
}

.assistant-basis {
  margin-top: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.assistant-basis__block {
  margin-bottom: 16px;

  &:last-child { margin-bottom: 0; }

  h4 {
    margin: 0 0 8px 0;
    font-size: 0.8em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #64748b;
  }

  ul {
    margin: 0;
    padding-left: 20px;
    font-size: 0.88em;
    color: #292c34;

    li { margin-bottom: 4px; }

    &.is-warning li { color: #92400e; }
  }
}

.assistant-basis__facts { margin: 0; }

.assistant-basis__fact {
  display: flex;
  gap: 8px;
  font-size: 0.88em;
  margin-bottom: 4px;

  dt { font-weight: 600; color: #64748b; min-width: 150px; }
  dd { margin: 0; color: #292c34; word-break: break-word; }
}

.assistant-suggestion {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  background: #FFF3E0;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  font-size: 0.9em;
}

.assistant-suggestion__text { color: #92400e; flex: 1; }

.assistant-suggestion__yes,
.assistant-suggestion__no {
  padding: 8px 14px;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  background: white;
  color: #292c34;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;

  &:hover { background: #f8f9fa; }
}

.assistant-suggestion__yes { border-color: #1bb776; color: #1bb776; }

.assistant-composer {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.assistant-composer__input {
  flex: 1;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  font-size: 0.95em;
  font-family: inherit;
  color: #292c34;
  resize: vertical;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #1bb776;
    box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
  }

  &::placeholder { color: #94a3b8; }
}

.assistant-composer__send {
  padding: 14px 24px;
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95em;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
  }

  &:disabled {
    background: #cbd5e0;
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.6;
  }
}

.assistant-composer__memory {
  margin: 8px 0 0 0;
  font-size: 0.8em;
  color: #64748b;
  font-style: italic;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;

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

  p { color: #64748b; margin-bottom: 24px; }
}

.assistant-examples {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.assistant-examples__btn {
  font-size: 0.85em;
  padding: 8px 14px;
  background: #f5f5f5;
  color: #1bb776;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: #1bb776; color: white; border-color: #1bb776; }
}

@media (max-width: 768px) {
  .assistant-composer { flex-direction: column; }
  .assistant-composer__send { width: 100%; }
}
</style>
