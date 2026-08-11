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
            <!-- ── WHERE THE MEMORY RESTARTS ───────────────────────────────────────────────────────
                 The transcript on screen outlives the thread behind it. A conversation is retired
                 for three reasons — the merchant changed the stores, a refusal ended it, or they
                 asked for a fresh one — and in all three the turns ABOVE this line are no longer in
                 the assistant's context while still being right there to read. Without the rule, a
                 merchant whose follow-up was suddenly misunderstood has no way to know why. -->
            <p v-if="turn.startsNewConversation" class="assistant-thread__break" data-test="conversation-break">
              {{ $i('assistant_newConversationStarted') }}
            </p>

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

                <!-- ── THE ANSWER IS REAL; REMEMBERING IT FAILED ───────────────────────────────────
                     `AssistantConversationTurnModel.NotRemembered` is set when the turn ran and its
                     two rows could not be appended — a concurrent append that took the same sequence
                     number, or a genuine write failure. The server deliberately keeps the answer
                     rather than failing the request, so the merchant has it; what they do not have
                     is this turn in the context of the next one, and being left to infer that from a
                     later misunderstanding is the whole failure mode this surface was built against. -->
                <p v-if="turn.notRemembered" class="assistant-turn__unremembered" data-test="not-remembered">
                  {{ $i('assistant_notRemembered') }}
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
                     are the merchant answering, and answering re-asks with exactly one store.

                     ⚠️ AND IT IS GATED ON THE THREAD THAT RAISED IT, WHICH IS THE ONLY PART OF THIS
                     TRANSCRIPT THAT MAY NOT SIMPLY BE READ. Every other row up here is text; this
                     one is a live control, and it holds store ids from the scope that was frozen
                     when the turn ran. `ask` always posts to the CURRENT thread, so a click on a
                     picker whose thread is gone sends an out-of-scope store into a conversation the
                     merchant is in the middle of — the server refuses it with a 403, and 403 is
                     (correctly, for a turn) how this client learns a thread is finished. It would
                     retire and close a live, context-bearing conversation, off a button that looked
                     no different from a current one.

                     `liveConversationId` is null whenever the next question would have to OPEN a
                     thread, so this also covers the window where the picker has moved and the old
                     thread has not been retired yet. `needsStore` is only ever set on a turn that
                     already has a `conversationId`, so the two nulls cannot meet. -->
                <div
                  v-if="turn.needsStore && turn.conversationId === liveConversationId"
                  class="assistant-venues"
                  data-test="venue-picker"
                >
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

                <!-- ── STAGED PROPOSALS, AND WHAT BECAME OF THEM ───────────────────────────────
                     ⚠️ THE CONTAINER IS GATED ON THE OUTCOME AS WELL AS THE CARDS, AND THAT IS THE
                     WHOLE POINT OF THIS BLOCK. Deciding REMOVES the decided card — approve, reject
                     and every non-kill-switch 409 all do — so on the ordinary one-card turn a
                     container gated on `cards.length` alone unrenders itself at the exact moment it
                     has something to say, taking the confirmation down with the card it confirms. A
                     merchant approved two hundred price changes and watched the card vanish in
                     silence.

                     Only the DECIDED card goes (`dropCard`). A turn can carry several proposals,
                     and the ones nobody ruled on stay exactly where they are.

                     The decided line and the conflict are rendered OUTSIDE the `v-for` because they
                     belong to the TURN, not to any one card: a turn-level sentence repeated once per
                     card would be N copies of it, and after a decision there are no cards left to
                     repeat it into at all. -->
                <div
                  v-if="turn.cards.length || turn.decided || turn.conflict"
                  class="assistant-cards"
                  data-test="cards"
                >
                  <ProposalCardView
                    v-for="card in turn.cards"
                    :key="card.ProposalId || card.proposalId"
                    :card="card"
                    :busy="busy"
                    @approve="onApprove(turn, $event)"
                    @reject="onReject(turn, $event)"
                  />

                  <!-- A refusal, in one of nine lines rather than the one generic sentence this
                       used to have for seven of the eight conflict kinds. `serverMessage` is ALWAYS
                       present — `AssistantApiError` falls back to "HTTP 409" when a body carries no
                       message — so the translated line may safely promise that the server's own
                       words are below it. They are shown verbatim and never parsed: matching on
                       server prose is how a client silently stops recognising a case the day
                       somebody rewords it.

                       NO `assistant_conflict_relist` HERE, and none passed down to the card: there
                       is no list on this tab and nothing was re-read, so the reassurance the inbox
                       prints would be a lie here. That is why the card takes `relisted` as an
                       explicit promise from its caller. -->
                  <div
                    v-if="turn.conflict"
                    class="assistant-cards__conflict"
                    :class="{ 'is-recoverable': turn.conflict.keepCard }"
                    data-test="conflict"
                  >
                    <p class="assistant-cards__conflict-line">
                      {{ $i(turn.conflict.key) }}
                    </p>
                    <p v-if="turn.conflict.serverMessage" class="assistant-cards__conflict-server">
                      {{ turn.conflict.serverMessage }}
                    </p>
                    <!-- ── THE ONE REFUSAL THAT HAS A NEXT STEP ──────────────────────────────────
                         `stale` means the basis moved: the prices on that card were computed against
                         a menu that has since changed, so there is nothing to retry — only something
                         to ask again. `expired` is the same shape (the ask was fine, this instance
                         of it ran out). Both are recoverable BY RE-ASKING, which is a different
                         thing from `keepCard`, and neither is served by a dead end.

                         It refills the composer rather than re-submitting: the question is put back
                         in the merchant's hands so they can adjust it, which is the point — the
                         world changed under the last one. -->
                    <button
                      v-if="turn.conflict.canRepropose"
                      type="button"
                      class="assistant-cards__conflict-btn"
                      data-test="repropose"
                      @click="repropose(turn)"
                    >
                      {{ $i('assistant_conflict_repropose') }}
                    </button>
                  </div>

                  <!-- ⚠️ THE TONE IS LOAD-BEARING HERE, NOT DECORATION. This one line carries BOTH
                       outcomes: "the change has been made", and "the decision failed and nobody
                       knows whether it wrote". Rendered in a single style they are the same green
                       box, so a 500 on approve — the one outcome whose write-fate is genuinely
                       unknown — arrives wearing the chrome that otherwise means it worked. The
                       words were always honest; the colour said the opposite, and a merchant reads
                       colour first. `tone` is therefore set beside every text that sets it, and the
                       inbox banner (`PendingActions.vue`) has always done exactly this. -->
                  <p
                    v-if="turn.decided"
                    class="assistant-cards__decided"
                    :class="'is-' + turn.decided.tone"
                    data-test="decided"
                  >
                    {{ turn.decided.text }}
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

        <!-- ── SAID BEFORE THEY TYPE, NOT AFTER THEY ARE MISUNDERSTOOD ──────────────────────────
             Three facts about the thread reach the merchant here, all of which are invisible in the
             transcript itself: the picker has moved away from the stores this conversation was
             frozen to, a refusal has ended it, or the server verified a NARROWER scope than the one
             that was asked for. The last is the quiet one — a store whose assistant is switched off
             is dropped at create, and without this line the merchant reads a two-store answer that
             covers one. -->
        <p v-if="threadNotice" class="assistant-composer__notice" data-test="thread-notice">
          {{ $i(threadNotice.key, threadNotice.params) }}
        </p>

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

        <div class="assistant-composer__foot">
          <!-- The note that used to stand here said the assistant remembers nothing, and it was
               true: the page posted to the stateless `/chat/ask`. It now holds a thread, so the line
               states what the memory actually covers — THIS conversation — rather than promising a
               recall of everything ever asked, which is not what the server keeps either. -->
          <p class="assistant-composer__memory" data-test="memory-note">
            {{ $i('assistant_memoryNote') }}
          </p>

          <!-- The escape hatch the frozen scope makes necessary. A thread cannot be rescoped and
               cannot be steered away from a context that has gone somewhere unhelpful, so the only
               honest answer to both is a new one — and the merchant should not have to reload the
               page to get it. -->
          <button
            v-if="conversation"
            type="button"
            class="assistant-composer__fresh"
            :disabled="busy"
            data-test="new-conversation"
            @click="startNewConversation"
          >
            {{ $i('assistant_newConversation') }}
          </button>
        </div>
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
  threadIsOver,
  pick,
  pickList,
  STATUS_CONVERSATION_FULL
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
    suggestion: null,
    /**
     * The open thread, or null when the next question must start one.
     *
     * `{ id, storeIds, storeNames, requestedStoreIds }`. The first three are the SERVER's answer —
     * the verified, frozen scope — and `requestedStoreIds` is what the picker held when it was
     * created. They are kept apart on purpose: the server may verify a narrower scope than was asked
     * for (a store with the assistant switched off is dropped), and comparing the picker against the
     * VERIFIED list would then read as a scope change on every keystroke and open a new thread that
     * narrows to exactly the same place, forever.
     */
    conversation: null,
    /** `{ key, params }` or null — what the merchant needs to know before they type again. */
    threadNotice: null
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
    },
    /**
     * The id of the thread the NEXT question will actually be asked on, or null when the next
     * question will have to open one.
     *
     * ⚠️ THIS IS NOT `conversation.id`, AND THE DIFFERENCE IS THE WHOLE POINT. Retirement on this
     * page is DEFERRED: moving the picker posts a notice and leaves the thread open, and the
     * replacement is not created until the next question runs `ensureConversation`. So there is a
     * window in which a thread is open, current, and already superseded — and a per-turn control
     * that trusted `conversation.id` alone would still be live through all of it, only to have its
     * store id land in the thread that gets created a moment later. The condition below is the same
     * one `ensureConversation` reuses on, so "live" here means exactly "the id this turn's answer
     * would be posted to", which is the only reading a control can safely be gated on.
     */
    liveConversationId () {
      if (!this.conversation) { return null; }
      return this.sameScope(this.selectedStoreIds, this.conversation.requestedStoreIds)
        ? this.conversation.id
        : null;
    }
  },
  watch: {
    /**
     * The picker moved. A conversation CANNOT follow it: its scope was frozen at creation and every
     * later turn replays history gathered under that scope, so widening or narrowing it would answer
     * a later question with earlier data the new scope was never verified for. The server has no
     * rescope route for exactly this reason.
     *
     * So this says so, and says it BEFORE the next question rather than after — the alternative is a
     * merchant who selects a second venue, asks about it, and is answered about the first without
     * anything on screen explaining why. The new thread is not opened here: opening one per
     * dropdown click would spend a create on every intermediate selection, and the merchant may
     * still change their mind back.
     */
    selectedStoreIds (next) {
      if (!this.conversation) { return; }
      if (this.sameScope(next, this.conversation.requestedStoreIds)) {
        // Back where it started — including the case where the picker was only passing through.
        if (this.threadNotice && this.threadNotice.key === 'assistant_scopeChanged') {
          this.threadNotice = this.narrowedNotice(this.conversation);
        }
        return;
      }
      this.threadNotice = { key: 'assistant_scopeChanged', params: null };
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
      // stores this admin actually administers, because a store id in a URL is not a grant.
      //
      // WHAT THIS DOES WITH A SCOPE IT CANNOT HONOUR, precisely: it NARROWS to the intersection when
      // one exists (`?stores=1,99` for an admin of 1 and 2 selects store 1), and IGNORES the query
      // entirely when the intersection is empty (`?stores=99` leaves the default full selection
      // standing). Ignoring rather than selecting nothing is deliberate — an empty selection is sent
      // as `null`, which asks for every store, so "narrow to nothing" would silently WIDEN the
      // question. The server applies its own StoreAdmins intersection to whatever arrives; this is
      // the client refusing to put a store the operator does not hold into its own state, not an
      // authorisation check.
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
      // No scope argument: an ordinary question is asked over the thread's frozen scope. The picker's
      // current selection reaches the server only when a thread is OPENED, which is why moving it
      // starts a new conversation rather than steering this one.
      this.ask(question, null);
    },
    /**
     * The merchant answered "which venue?".
     *
     * `targetStoreId` NARROWS this one turn to a store of the frozen scope; it does not rescope the
     * thread and it cannot, which is the right shape here — the next question is about the same
     * conversation, not about one venue forever.
     *
     * ⚠️ THIS BLOCK USED TO CLAIM THE OUT-OF-SCOPE 403 WAS "unreachable from this surface", ON THE
     * GROUND THAT THE BUTTONS ARE BUILT FROM THE THREAD'S OWN SCOPE. They are — from the scope of
     * the thread that was open WHEN THE TURN RAN, which is not necessarily the one this posts to.
     * The transcript keeps every turn on screen for as long as the merchant stays on the page, so a
     * picker from a thread that has since been replaced was still a live control, still holding the
     * old scope's store ids, and its click still went to whatever thread is current. That reached
     * the refusal in one click, and — because a 403 is how a turn learns its thread is finished —
     * retired and closed a live conversation as the price of it.
     *
     * It is unreachable now because the picker is GATED on `liveConversationId` (see the template),
     * so the only pickers that can be clicked belong to the thread this posts to. The reachability
     * lives at the render, not here, which is why this function is unchanged and unguarded: a
     * second, silent refusal inside it would be a dead branch pretending to be a safety net.
     */
    askForVenue (question, storeId) {
      this.ask(question, storeId);
    },
    /**
     * The stores ONE turn was answered over: the store it was narrowed to, or the thread's whole
     * frozen scope. A `targetStoreId` outside the frozen scope cannot get here — the server refuses
     * it with a 403 rather than answering — so the lookup either finds the name or the id is not the
     * thread's, in which case nothing is claimed about it.
     */
    scopeOfTurn (scope, targetStoreId) {
      if (typeof targetStoreId !== 'number') { return scope; }
      const index = scope.storeIds.indexOf(targetStoreId);
      return {
        storeIds: [targetStoreId],
        storeNames: index >= 0 && scope.storeNames[index] ? [scope.storeNames[index]] : []
      };
    },
    /** Set-equality on store ids. Order is the picker's business and means nothing to the server. */
    sameScope (left, right) {
      const a = Array.isArray(left) ? left : [];
      const b = Array.isArray(right) ? right : [];
      return a.length === b.length && a.every(id => b.includes(id));
    },
    /**
     * The line for a thread the server verified NARROWER than it was asked for, or null when it got
     * everything it asked for.
     *
     * This is the `Assistant.Module` flag arriving as a partial refusal. A total one is a 403 with
     * the server's own sentence; a partial one is silent — the store is simply not in the frozen
     * scope — and the merchant would read a two-venue answer that covers one. `CreateAsync` drops a
     * switched-off store before freezing, so the create response is where the truth is.
     */
    narrowedNotice (conversation) {
      if (this.sameScope(conversation.storeIds, conversation.requestedStoreIds)) { return null; }
      return {
        key: 'assistant_scopeNarrowed',
        params: { stores: conversation.storeNames.join(', ') }
      };
    },
    /**
     * The thread this turn belongs to, opening one if there is none or if the picker has moved off
     * the one that is open.
     *
     * Answers `{ conversation, created }`; `created` is what the transcript's restart rule is drawn
     * from. A failure to open is thrown to the caller and reported — there is deliberately no
     * fallback to the stateless `/chat/ask`, because a fallback would make "the thread could not be
     * opened" and "the thread was silently forgotten" look identical to the merchant.
     */
    async ensureConversation () {
      if (this.conversation && this.sameScope(this.selectedStoreIds, this.conversation.requestedStoreIds)) {
        return { conversation: this.conversation, created: false };
      }

      // The outgoing thread is closed rather than abandoned, and the result is not waited on: an
      // Active thread nobody closes sits until the retention sweep expires it, but a close that
      // fails must not stop the merchant from asking their next question. Its own memory is already
      // gone from this page's point of view the moment a new one is opened.
      this.retireConversation(null);

      const requested = this.selectedStoreIds.slice();
      const header = await this.service.StartConversation(requested);
      const conversation = {
        id: pick(header, 'id'),
        storeIds: pickList(header, 'storeIds'),
        storeNames: pickList(header, 'storeNames'),
        requestedStoreIds: requested
      };

      this.conversation = conversation;
      this.threadNotice = this.narrowedNotice(conversation);
      return { conversation, created: true };
    },
    /**
     * Let go of the open thread, optionally leaving a line saying why.
     *
     * The close is fire-and-forget on purpose — it is housekeeping for the retention sweep, and its
     * failure changes nothing the merchant can act on. The rejection is swallowed rather than
     * unhandled: an unhandled rejection here would surface as a console error about a request whose
     * outcome this page has no opinion about.
     */
    retireConversation (notice) {
      const open = this.conversation;
      this.conversation = null;
      this.threadNotice = notice || null;
      if (open && open.id) {
        const closing = this.service.CloseConversation(open.id);
        if (closing && typeof closing.catch === 'function') { closing.catch(() => {}); }
      }
    },
    /** The merchant asking for a clean slate. The transcript stays; the next turn marks the break. */
    startNewConversation () {
      if (this.busy) { return; }
      this.retireConversation(null);
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
     * Ask the same question again after a refusal that only re-asking can clear.
     *
     * The turn's OWN question, verbatim — not a sentence built out of the dead proposal's diff, the
     * way `composeAgain` has to build one for an inbox row that carries no question. Here the
     * original wording is right there, and it is what the merchant meant; rephrasing it for them
     * would be this screen guessing at an intent it already has.
     *
     * Deliberately NOT auto-submitted. Both codes that reach this button mean the world moved
     * (`stale`) or time passed (`expired`), so re-asking blind is how you get a second proposal
     * against a basis the merchant still has not looked at. The composer is left loaded and the
     * decision to send stays theirs.
     */
    repropose (turn) {
      this.draft = turn.question;
      turn.conflict = null;
    },
    /**
     * One turn, on the thread.
     *
     * The turn is pushed BEFORE the request so the thread shows the question immediately and the
     * pending state belongs to a row rather than to the page. `targetStoreId` narrows THIS turn and
     * is null for an ordinary question; the scope everything else is answered under was frozen when
     * the thread was opened, and no suggestion is ever folded in here.
     *
     * Every field the template reads is declared on the literal, including the two that are only
     * ever set later — Vue 2 does not make a property reactive by assigning it after the object is
     * in `thread`, and `notRemembered` in particular would then be true in the data and absent from
     * the screen, which is the precise failure this line is meant to prevent.
     */
    async ask (question, targetStoreId) {
      const firstTurn = this.thread.length === 0;
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
        // The thread this turn was asked on, stamped once `ensureConversation` has answered. It is
        // what makes the venue picker's liveness decidable at render time: a turn knows which
        // conversation's frozen scope its buttons were built from, and the picker is offered only
        // while that is still the conversation the next question goes to.
        conversationId: null,
        conflict: null,
        // `{ tone, text }` or null. The tone is not optional: see the decided line in the template.
        decided: null,
        startsNewConversation: false,
        notRemembered: false
      };
      this.thread.push(turn);
      this.busy = true;

      // Declared out here so the `catch` can tell WHICH of the two requests failed. Both funnel down
      // the same handler and both can be a 403; only this says whether a thread ever opened. See the
      // notice below.
      let opened = null;

      try {
        opened = await this.ensureConversation();
        turn.conversationId = opened.conversation.id;
        // A break is only worth drawing where something came before it to be cut off from.
        turn.startsNewConversation = opened.created && !firstTurn;

        const result = await this.service.AskInConversation(
          opened.conversation.id, question, targetStoreId, this.locale);
        this.fillTurn(turn, pick(result, 'answer'), opened.conversation, targetStoreId);

        // ── A THREAD THAT ANSWERED AND THEN ENDED ────────────────────────────────────────────────
        // `conversation_full` is a 200 with a merchant-facing sentence, not a status code: the turn
        // had already run when the tail proved too large to replay even halved, so refusing it would
        // have thrown away an answer somebody paid for. The thread is finished all the same, and the
        // sentence it carries says to start a new one — so this makes that true, exactly as the
        // catch below does for the refusals that never ran.
        //
        // `notRemembered` rides along on that same response and is deliberately NOT shown for it: it
        // is true, but "this answer was not remembered" beside "this conversation is too long to
        // remember any more" is one fact printed twice, and the second wording is the useful one.
        if (pick(pick(result, 'answer'), 'status') === STATUS_CONVERSATION_FULL) {
          this.retireConversation({ key: 'assistant_threadEnded', params: null });
        } else {
          // Reported, never inferred from a later misunderstanding. See the template's own note.
          turn.notRemembered = pick(result, 'notRemembered') === true;
        }
      } catch (error) {
        // ⚠️ THIS IS WHERE A REFUSAL LANDS, AND IT USED TO RENDER AS "HTTP 403".
        //
        // The two controllers on this path put their reason in different places and neither uses
        // `detail` or `title`: `AssistantConversationsController` answers `{ message }`, and
        // `ChatController` answered 400/401/403/500 with a whole `ChatAskResponseModel` carrying the
        // sentence in **`Answer`**. `AssistantApiError` fell back to `'HTTP ' + status` for the
        // second shape, so a merchant asking about a store they do not administer was shown a status
        // line where the server had written them a sentence. The fix is in the error's fallback
        // chain (`api-client.js`), which reads both — which is why nothing here reads the body.
        //
        // It is rendered in the FAILURE slot rather than as an answer. A refusal is not an answer,
        // and the styling is the only thing on screen that says so once the sentence itself is
        // merchant-facing prose.
        turn.failure = isAssistantApiError(error) && error.message
          ? error.message
          : this.$i('assistant_askFailed');

        // ⚠️ AND A REFUSAL THAT ENDS THE THREAD MUST ALSO END IT HERE. The server's sentence for all
        // three of them finishes with "start a new conversation", and a client that keeps posting to
        // a dead id makes that sentence a lie: every later question fails the same way, and the
        // merchant has been told to do something the page will not let them do. Retiring it makes
        // the next question open a fresh thread, which is exactly what they were just asked for.
        //
        // A 400 or a 500 is deliberately NOT this. A model outage says nothing about the thread, and
        // discarding a working conversation's context over a blip is the expensive direction of this
        // decision, because nothing restores it.
        //
        // ⚠️ AND "IT ENDED" IS NOT WHAT TO SAY WHEN IT NEVER BEGAN. A refused CREATE lands in this
        // same handler with the same 403 — `Assistant.Module` is off for every selected store, or
        // none of them is administered — and `assistant_threadEnded` makes three claims that are all
        // false in that case: that a conversation ended, that one is being left behind, and that
        // there was something said before which the next question will go without. A merchant is
        // then told they have lost a context they never had, on the one surface built to stop that
        // happening by accident. `opened` is the only thing that tells the two apart, since the
        // status does not.
        //
        // Neither line explains WHY; the server's own sentence is already in the failure slot above,
        // which is what both notices point at rather than paraphrase.
        if (threadIsOver(error)) {
          this.retireConversation({
            key: opened ? 'assistant_threadEnded' : 'assistant_threadNotStarted',
            params: null
          });
        }
      } finally {
        turn.pending = false;
        this.busy = false;
      }
    },
    /**
     * @param scope the thread's frozen scope, used ONLY where the response carries none of its own.
     * @param targetStoreId the one store this turn was narrowed to, or null.
     */
    fillTurn (turn, response, scope, targetStoreId) {
      // ⚠️ THIS ONLY EVER SEES A 2xx, AND A COMMENT HERE USED TO CLAIM OTHERWISE. It said a refusal
      // body "also arrives as a ChatAskResponseModel … shown as the answer it is, not as a crash" —
      // describing an intent the code cannot reach, because `_request` throws on `!response.ok` and
      // a 400/401/403/500 never gets here at all. The refusal is handled in `ask`'s catch, where the
      // server's sentence now travels on `error.message`; see the note there.
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

      // ⚠️ A CONVERSATION TURN CARRIES NO SCOPE OF ITS OWN, and reading one straight off the response
      // would have quietly emptied both the basis drawer's "stores in the answer" row and the venue
      // picker's buttons. `ChatController` fills `StoreIds`/`StoreNames` onto the response after the
      // orchestrator returns; `AssistantConversationService` returns it untouched, so both arrive
      // null (measured against the live host — see `api-client.js`).
      //
      // The fallback is not a guess. The thread's scope is the server-VERIFIED list handed back by
      // create, frozen there and re-verified on every turn, and a turn narrowed to one store is
      // narrowed to a store of that same list. So the label is the same fact the server holds; what
      // is missing is only its restatement per turn.
      const effective = this.scopeOfTurn(scope, targetStoreId);
      const storeIds = pickList(response, 'storeIds').length
        ? pickList(response, 'storeIds')
        : effective.storeIds;
      const storeNames = pickList(response, 'storeNames').length
        ? pickList(response, 'storeNames')
        : effective.storeNames;
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

      // The thread's WHOLE scope, not this turn's: the buttons exist so a merchant can pick among the
      // venues the conversation covers, and offering only the one a narrowed turn already ran against
      // would be a picker with a single choice that changes nothing.
      turn.needsStore = needsStoreChoice(response, scope.storeIds);
      if (turn.needsStore) {
        turn.venues = scope.storeIds.map((id, index) => ({
          id,
          name: scope.storeNames[index] || String(id)
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
    /**
     * Drop the card that was just decided, and ONLY that one.
     *
     * A turn can carry several staged proposals — `ChatOrchestrator` accumulates `Cards` across a
     * turn's tool rounds — and clearing the whole list made deciding one of them silently retract
     * the others, under a singular "Approved" line that spoke for a decision the merchant had not
     * made. Nothing was lost (the survivors stay in the inbox), but the thread described a turn
     * that never happened, which is the more expensive kind of wrong on a surface about money.
     *
     * `pick` because the wire's casing is not this function's business.
     */
    dropCard (turn, id) {
      turn.cards = turn.cards.filter(card => pick(card, 'proposalId') !== id);
    },
    async onApprove (turn, id) {
      if (this.busy) { return; }
      this.busy = true;
      turn.conflict = null;
      try {
        const result = await this.service.Approve(id);
        turn.decided = {
          tone: 'ok',
          text: pick(result, 'wasReplay')
            ? this.$i('assistant_card_approvedReplay')
            : this.$i('assistant_card_approved')
        };
        this.dropCard(turn, id);
      } catch (error) {
        this.applyDecisionFailure(turn, id, error);
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
        turn.decided = { tone: 'ok', text: this.$i('assistant_card_rejected') };
        this.dropCard(turn, id);
      } catch (error) {
        this.applyDecisionFailure(turn, id, error);
      } finally {
        this.busy = false;
      }
    },
    applyDecisionFailure (turn, id, error) {
      const conflict = describeConflict(error);
      if (conflict) {
        turn.conflict = conflict;
        // The kill switch leaves the row STAGED and approvable later, so its card stays. It is a
        // refusal of the KIND, not of this proposal, so it removes nothing at all. Every other 409
        // has already moved this one row, and its card would be an offer that cannot be taken —
        // but only ITS card: the siblings on this turn were never decided.
        if (!conflict.keepCard) { this.dropCard(turn, id); }
        return;
      }
      // The decision FAILED — a 500, a dropped connection, a refusal that is not a 409. Whether it
      // wrote is unknown, and 'refused' is what stops that from being painted as a confirmation.
      turn.decided = {
        tone: 'refused',
        text: isAssistantApiError(error) && error.message
          ? error.message
          : this.$i('assistant_card_decisionFailed')
      };
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

.assistant-cards__conflict {
  padding: 12px 16px;
  margin-bottom: 12px;
  background: #FEF2F2;
  border-left: 4px solid #ef4444;
  border-radius: 8px;

  /* The kill switch is the one refusal a later retry can clear with the merchant doing nothing, so
     it is coloured as a wait rather than as a wall. */
  &.is-recoverable {
    background: #FFF3E0;
    border-left-color: #FF9800;
  }

  p { margin: 0 0 6px 0; font-size: 0.9em; }
  p:last-child { margin-bottom: 0; }
}

.assistant-cards__conflict-line { font-weight: 600; color: #292c34; }
.assistant-cards__conflict-server { color: #64748b; font-style: italic; }

/* The house secondary button (CLAUDE.md), at the compact size the inbox's own repair button uses.
   Deliberately not the green primary: re-asking is an offer, and the merchant has just had a
   proposal refused — a CTA here would be pushing them back into the flow that just failed. */
.assistant-cards__conflict-btn {
  margin-top: 8px;
  padding: 10px 18px;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  background: white;
  color: #292c34;
  font-weight: 600;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover { background: #f8f9fa; border-color: #cbd5e0; }
}

/* Two tones because this line carries two opposite outcomes. `is-ok` is the house success green
   (`CLAUDE.md`: #1bb776 / #159f63); `is-refused` mirrors the inbox banner's refused row
   (`PendingActions.vue`) and the conflict block above it, so a refusal reads the same on both
   surfaces. The red is #b91c1c rather than #ef4444 because #ef4444 on #FEF2F2 misses WCAG AA for
   body text, and this sentence is the one the merchant most needs to be able to read. */
.assistant-cards__decided {
  margin: 0;
  padding: 12px 16px;
  border-radius: 8px;
  border-left: 4px solid;
  font-weight: 600;
  font-size: 0.9em;

  &.is-ok { background: #e8f7f1; border-left-color: #1bb776; color: #159f63; }
  &.is-refused { background: #FEF2F2; border-left-color: #ef4444; color: #b91c1c; }
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

.assistant-composer__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.assistant-composer__memory {
  margin: 8px 0 0 0;
  font-size: 0.8em;
  color: #64748b;
  font-style: italic;
}

/* The house secondary button at the compact size, deliberately not the green primary: starting over
   is an escape hatch, and a CTA would read as the recommended move away from a thread that is
   working. */
.assistant-composer__fresh {
  margin-top: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
  background: white;
  color: #292c34;
  font-weight: 600;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) { background: #f8f9fa; border-color: #cbd5e0; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

/* An amber advisory, the same one the store suggestion wears: something about the next question has
   changed and the merchant may want to act on it. Deliberately not the red refusal chrome — nothing
   has failed, and nothing they typed was rejected. */
.assistant-composer__notice {
  margin: 0 0 12px 0;
  padding: 12px 16px;
  background: #FFF3E0;
  border-left: 4px solid #FF9800;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.9em;
}

/* Where the memory restarts. A labelled rule rather than a banner: it marks a boundary in the
   transcript and must not compete with the turns on either side of it. */
.assistant-thread__break {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 24px 0;
  font-size: 0.78em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #94a3b8;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e2e8f0;
  }
}

/* The answer stands; remembering it did not. Amber for the same reason as the notice above — the
   merchant has their answer, and what is affected is only the question after it. */
.assistant-turn__unremembered {
  margin: -8px 0 16px 0;
  font-size: 0.85em;
  color: #92400e;
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
