<template>
  <AdminPage full-width @login-success="init">
    <div class="mrgs-page">
      <div class="mrgs-page__header">
        <h1 class="mrgs-page__title">
          {{ $i('mrgs_page_title') }}
        </h1>
        <p class="mrgs-page__intro">
          {{ $i('mrgs_page_intro') }}
        </p>
      </div>

      <div v-if="blocker" class="mrgs-page__blocker" data-test="blocker">
        {{ blocker }}
      </div>

      <template v-else>
        <p v-if="failure" class="mrgs-page__failure" data-test="failure">
          {{ failure }}
        </p>

        <div class="mrgs-page__columns">
          <div class="mrgs-page__left">
            <!-- STEP 1 — pick the week. A statement is per ISO week, Monday to Sunday in the store's
                 own timezone, and every revision of every week is listed: a correction does not
                 replace its predecessor, it succeeds it, and both stay readable. -->
            <section class="mrgs-card">
              <h2 class="mrgs-card__title">
                {{ $i('mrgs_periods_title') }}
              </h2>

              <p v-if="rows === null" class="mrgs-card__note" data-test="periods-unknown">
                {{ $i('mrgs_periods_unknown') }}
              </p>
              <p v-else-if="!rows.length" class="mrgs-card__note" data-test="periods-empty">
                {{ $i('mrgs_periods_empty') }}
              </p>
              <ul v-else class="mrgs-list">
                <li v-for="row in rows" :key="row.statementId">
                  <button
                    class="mrgs-list__item"
                    :class="{ 'is-selected': row.statementId === selectedStatementId }"
                    :disabled="busy"
                    data-test="period-row"
                    @click="selectStatement(row.statementId)"
                  >
                    <span class="mrgs-list__name">{{ rowPeriod(row) }}</span>
                    <span class="mrgs-list__meta">{{ rowMeta(row) }}</span>
                  </button>
                </li>
              </ul>
            </section>

            <!-- STEP 2 — open a week that has none. The same call opens the NEXT revision of a week
                 whose latest statement is already finalized, which is why the button changes its own
                 wording rather than being two controls that call one endpoint. -->
            <section class="mrgs-card">
              <h2 class="mrgs-card__title">
                {{ $i('mrgs_open_title') }}
              </h2>

              <label class="mrgs-field">
                <span class="mrgs-field__label">{{ $i('mrgs_open_week_start') }}</span>
                <input v-model="weekStart" class="mrgs-field__input" type="date" :disabled="busy" data-test="week-start">
              </label>

              <!-- A picked date that is not a Monday is NOT snapped silently: that would produce a
                   statement for a week nobody chose. Its Monday is offered as a one-click suggestion
                   and the venue confirms it. -->
              <p v-if="weekStartNotMonday" class="mrgs-card__note" data-test="not-monday">
                {{ $i('mrgs_open_not_monday') }}
                <button v-if="suggestedMonday" class="mrgs-chip" :disabled="busy" data-test="use-monday" @click="useSuggestedMonday">
                  {{ $i('mrgs_open_use_monday', { date: suggestedMonday }) }}
                </button>
              </p>

              <!-- Pre-empted rather than met as a server refusal: a week has at most one Open
                   statement, and the fix is to open the one that exists, not to try again. -->
              <p v-else-if="openConflict" class="mrgs-card__note" data-test="open-conflict">
                {{ $i('mrgs_open_conflict') }}
                <button class="mrgs-chip" :disabled="busy" data-test="open-existing" @click="selectStatement(openConflict.statementId)">
                  {{ $i('mrgs_open_conflict_go') }}
                </button>
              </p>

              <button
                v-else
                class="mrgs-btn"
                :disabled="busy || !weekStart"
                data-test="create-statement"
                @click="createStatement(weekStart)"
              >
                {{ creating ? $i('mrgs_open_creating') : createLabel }}
              </button>
            </section>

            <!-- The repair for the facts a statement is computed FROM. PowerUser only, because a
                 rebuild re-scans the store's whole journal — a store admin would meet a 403, so the
                 control is not offered to one. -->
            <section v-if="isPowerUser" class="mrgs-card">
              <h2 class="mrgs-card__title">
                {{ $i('mrgs_projection_title') }}
              </h2>
              <p class="mrgs-card__note" data-test="projection-lag">
                {{ projectionLabel }}
              </p>
              <button class="mrgs-btn mrgs-btn--ghost" :disabled="busy" data-test="rebuild-projection" @click="rebuildProjection">
                {{ rebuilding ? $i('mrgs_projection_running') : $i('mrgs_projection_rebuild') }}
              </button>
              <p class="mrgs-card__note">
                {{ $i('mrgs_projection_hint') }}
              </p>
            </section>
          </div>

          <div class="mrgs-page__right">
            <p v-if="!statement" class="mrgs-card mrgs-card__note" data-test="nothing-selected">
              {{ $i('mrgs_nothing_selected') }}
            </p>

            <template v-else>
              <MarginStatementFiguresPanel :statement="statement" :currency="currency" :locale="locale" />

              <section class="mrgs-card mrgs-actions">
                <h2 class="mrgs-card__title">
                  {{ $i('mrgs_actions_title') }}
                </h2>

                <!-- Recalculate and finalize exist ONLY on an Open statement carrying a revision. On a
                     finalized one the server refuses both, so neither is rendered — the correction
                     button below is the action that actually exists there. -->
                <template v-if="statement.canMutate">
                  <button class="mrgs-btn" :disabled="busy" data-test="recalculate" @click="recalculate">
                    {{ recalculating ? $i('mrgs_action_recalculating') : $i('mrgs_action_recalculate') }}
                  </button>
                  <p class="mrgs-card__note">
                    {{ $i('mrgs_action_recalculate_hint') }}
                  </p>

                  <button class="mrgs-btn mrgs-btn--ghost" :disabled="busy" data-test="finalize" @click="finalize">
                    {{ finalizing ? $i('mrgs_action_finalizing') : $i('mrgs_action_finalize') }}
                  </button>
                  <p class="mrgs-card__note">
                    {{ $i('mrgs_action_finalize_hint') }}
                  </p>
                </template>

                <p v-else-if="statementFinalized" class="mrgs-card__note" data-test="immutable">
                  {{ $i('mrgs_action_immutable') }}
                </p>
                <p v-else class="mrgs-card__note" data-test="no-revision">
                  {{ $i('mrgs_action_no_revision') }}
                </p>

                <!-- The forward-only correction. Offered only on the LATEST revision of its week and
                     only once that one is finalized, because those are exactly the conditions under
                     which the server opens the next one rather than refusing. -->
                <button
                  v-if="canCorrect"
                  class="mrgs-btn mrgs-btn--ghost"
                  :disabled="busy"
                  data-test="create-correction"
                  @click="createStatement(statement.periodStart)"
                >
                  {{ creating ? $i('mrgs_open_creating') : $i('mrgs_action_correct') }}
                </button>
                <p v-if="canCorrect" class="mrgs-card__note">
                  {{ $i('mrgs_action_correct_hint') }}
                </p>

                <button class="mrgs-btn mrgs-btn--ghost" :disabled="busy" data-test="export" @click="exportCsv">
                  {{ exporting ? $i('mrgs_action_exporting') : $i('mrgs_action_export') }}
                </button>
                <p v-if="exportResult" class="mrgs-card__note" data-test="export-ready">
                  {{ $i('mrgs_action_export_ready', { file: exportResult.fileName }) }}
                  <button class="mrgs-chip" data-test="download" @click="downloadExport">
                    {{ $i('mrgs_action_download') }}
                  </button>
                </p>
              </section>

              <MarginSpendPanel
                :statement="statement"
                :supplier-names="supplierNames"
                :busy="busy"
                :saving="savingInputs"
                :currency="currency"
                :locale="locale"
                @save="saveInputs"
              />

              <MarginWastePanel
                ref="wastePanel"
                :entries="wasteEntries"
                :absent="wasteAbsent"
                :ingredients="ingredients"
                :frozen="statementFinalized"
                :default-date="statement.periodStart"
                :busy="busy"
                :recording="recordingWaste"
                :currency="currency"
                :locale="locale"
                @record="recordWaste"
                @remove="removeWaste"
              />

              <!-- `waste-absent` comes from the SIBLING read, not from this panel's own. A coverage
                   response that says nothing about waste looks identical whether the server has never
                   heard of the capability or is simply an older build, and only the entry-list 404
                   tells those apart — so the fact is established once, in `loadWaste`, and handed to
                   both panels rather than guessed at twice. -->
              <MarginCoveragePanel
                :coverage="coverage"
                :waste-absent="wasteAbsent"
                :currency="currency"
                :locale="locale"
              />
            </template>
          </div>
        </div>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import MarginStatementFiguresPanel from '~/components/admin/margin/MarginStatementFiguresPanel.vue';
import MarginSpendPanel from '~/components/admin/margin/MarginSpendPanel.vue';
import MarginCoveragePanel from '~/components/admin/margin/MarginCoveragePanel.vue';
import MarginWastePanel from '~/components/admin/margin/MarginWastePanel.vue';
import { MarginRecipeService } from '~/utils/margin/recipe-client';
import { MarginWasteService } from '~/utils/margin/waste-client';
import { MarginIngredientService } from '~/utils/margin/ingredient-client';
import { MarginStatementService, isMondayDate, mondayOfWeek, isUncodedRefusal } from '~/utils/margin/statement-client';
import {
  isMarginApiError,
  MARGIN_NOT_FOUND,
  MARGIN_FORBIDDEN,
  MARGIN_STALE_REVISION,
  MARGIN_REVISION_REQUIRED,
  MARGIN_REVISION_INVALID
} from '~/utils/margin/api-client';
import {
  readStatement,
  readStatementRows,
  readCoverage,
  readSupplierNames,
  readWasteEntries,
  STATEMENT_FINALIZED
} from '~/utils/margin/statement-view';

const STATUS_UNKNOWN = 'unknown';
const STATUS_MODULE_OFF = 'module-off';
const STATUS_STAGE_OFF = 'stage-off';
const STATUS_ON = 'on';

// Every `margin.*` code this surface can meet, mapped to copy. Keyed on `code` and never on the
// server's `detail`, which is English prose written for a developer.
//
// THE STATEMENT SURFACE'S BUSINESS FAILURES ARE NOT IN THIS MAP AND CANNOT BE. Unlike the recipe
// surface, `MarginStatementsController` renders an `AppException` through
// `ModuleControllerBase.ModuleProblem`, which emits a ProblemDetails with a `detail` and a `traceId`
// and NO `code`. So "this statement is finalized and immutable", "the week must start on a Monday",
// "an open statement already exists for this week", "a purchase-spend amount must not be negative",
// "the entries state more than one currency" and "the store states no currency" are one
// indistinguishable shape on the wire. This page therefore pre-empts every one of them it can see —
// no edit control on a finalized statement, no create button for a week that already has an Open one,
// a Monday guard, a non-negative guard, and one currency per statement — and for whatever is left it
// QUOTES the server's own sentence inside a translated frame (`mrgs_err_refused`) rather than
// paraphrasing it or flattening it into "something went wrong". A guess dressed as a translation
// would be worse than an untranslated fact.
const ERROR_KEYS = {
  [MARGIN_NOT_FOUND]: 'mrgs_err_not_found',
  [MARGIN_FORBIDDEN]: 'mrgs_err_forbidden',
  [MARGIN_STALE_REVISION]: 'mrgs_err_stale',
  [MARGIN_REVISION_REQUIRED]: 'mrgs_err_revision_required',
  [MARGIN_REVISION_INVALID]: 'mrgs_err_revision_invalid',
  'margin.client-missing-revision': 'mrgs_err_missing_revision'
};

/**
 * The week's food cost, reconciled: what the till took, what the recipes say it should have cost, and
 * what the venue actually bought.
 *
 * The journey is the one the backend proves end to end: open the week's statement, enter the purchase
 * spend, recalculate, read the figures with their provenance, finalize (which freezes them), and
 * correct a finalized week by opening the next forward-only revision. Every step of THAT journey is a
 * real endpoint.
 *
 * THE ONE EXCEPTION IS NAMED RATHER THAN LEFT TO BE DISCOVERED. `/margin/waste` — all four routes — is
 * served by no backend this estate deploys, so the waste panel's read answers 404 on every week. The
 * panel and the coverage panel's waste bucket both say so plainly (`wasteAbsent`, set in `loadWaste`);
 * neither offers a control whose only outcome would be a write into a route that does not exist. The
 * day the controller ships, the 404 stops arriving, the flag goes false on its own and both panels
 * return to their data states with nothing to take back out.
 *
 * NOTHING ON THIS PAGE ADDS MONEY UP OR TAKES IT AWAY. Net food sales, theoretical ingredient cost,
 * actual purchase spend, the covered/uncovered split and all four percentages are computed by the
 * backend, which pins `covered + uncovered == net` and `gap == actual% − theoretical%` in its own
 * tests. The only arithmetic in this whole surface is turning a typed amount into integer minor units,
 * and that is done by rearranging digits as text rather than by multiplying (see
 * `~/utils/margin/spend-amount`).
 */
export default {
  name: 'MarginStatementsPage',
  components: { AdminPage, MarginStatementFiguresPanel, MarginSpendPanel, MarginCoveragePanel, MarginWastePanel },
  data () {
    return {
      statusState: STATUS_UNKNOWN,
      projection: null,
      // null means UNKNOWN — the read has not answered. Never initialised to `[]`, which would render
      // a failed read as "this store has no statements".
      rows: null,
      supplierNames: null,
      selectedStatementId: null,
      statement: null,
      coverage: null,
      // null means UNKNOWN for both, never `[]`: a failed read must not render as "this venue threw
      // nothing away" or as "this store masters no ingredients".
      wasteEntries: null,
      ingredients: null,
      // A THIRD state, and the one `wasteEntries: null` cannot express. Null says "the read did not
      // answer", which is a claim about a request that broke. `wasteAbsent` says "this server does not
      // serve waste at all", which is a claim about the FEATURE — and while no deployed backend
      // publishes `/margin/waste` it is the true one, so the two must not share a rendering. Both
      // panels on this page are told, because both were reporting the same absence as something else.
      // See `loadWaste`.
      wasteAbsent: false,
      weekStart: '',
      loading: false,
      creating: false,
      savingInputs: false,
      recalculating: false,
      finalizing: false,
      exporting: false,
      rebuilding: false,
      recordingWaste: false,
      exportResult: null,
      failure: ''
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
    isPowerUser () {
      return !!(this.$store.state.currentUser && this.$store.state.currentUser.isPowerUser);
    },
    // The market is the single source for currency, and it is what `priceLabel` formats in. Passed
    // down so a panel can tell money it CAN print in that currency from money the backend produced in
    // another — it withholds the symbol rather than relabel the amount.
    currency () {
      return (this.marketConfig && this.marketConfig.currency) || null;
    },
    _statusService () {
      return new MarginRecipeService(this._coreInitializer);
    },
    _statementService () {
      return new MarginStatementService(this._coreInitializer);
    },
    _wasteService () {
      return new MarginWasteService(this._coreInitializer);
    },
    _ingredientService () {
      return new MarginIngredientService(this._coreInitializer);
    },
    busy () {
      return this.loading || this.creating || this.savingInputs || this.recalculating ||
        this.finalizing || this.exporting || this.rebuilding || this.recordingWaste;
    },
    blocker () {
      if (this.statusState === STATUS_MODULE_OFF) { return this.$i('mrgs_module_off'); }
      if (this.statusState === STATUS_STAGE_OFF) { return this.$i('mrgs_stage_off'); }
      if (this.statusState === STATUS_UNKNOWN) { return this.$i('mrgs_status_unknown'); }
      return '';
    },
    statementFinalized () {
      return !!this.statement && this.statement.state === STATEMENT_FINALIZED;
    },
    weekStartNotMonday () {
      return !!this.weekStart && !isMondayDate(this.weekStart);
    },
    suggestedMonday () {
      return this.weekStart ? mondayOfWeek(this.weekStart) : null;
    },
    /** The week's revisions, newest first — the server's own order within a period. */
    _pickedWeekRows () {
      if (!this.rows || !this.weekStart) { return []; }
      return this.rows.filter(row => row.periodStart === this.weekStart);
    },
    /**
     * The Open statement already on the picked week, if any. A week holds at most one, and the server
     * refuses a second, so the offer becomes "go to it" rather than "create".
     */
    openConflict () {
      return this._pickedWeekRows.find(row => !row.finalized) || null;
    },
    /** Creating on a week whose latest statement is finalized opens the NEXT revision, not the first. */
    createLabel () {
      return this._pickedWeekRows.length ? this.$i('mrgs_open_next_revision') : this.$i('mrgs_open_create');
    },
    /**
     * A correction is offered only where the server would actually open one: on the LATEST revision of
     * its week, and only once that revision is finalized. Offering it on an older revision would be a
     * button whose single outcome is a refusal.
     */
    canCorrect () {
      if (!this.statementFinalized || !this.statement.periodStart || !this.rows) { return false; }
      const week = this.rows.filter(row => row.periodStart === this.statement.periodStart);
      if (!week.length) { return false; }
      const latest = week.reduce((a, b) => ((b.revisionNumber || 0) > (a.revisionNumber || 0) ? b : a));
      return latest.statementId === this.statement.statementId;
    },
    projectionLabel () {
      if (!this.projection) { return this.$i('mrgs_projection_unknown'); }
      return this.$i('mrgs_projection_lag', {
        lag: this.projection.lagEntries,
        watermark: this.projection.watermarkJournalEntryId
      });
    }
  },
  watch: {
    storeId () { this.init(); }
  },
  mounted () {
    this.init();
  },
  methods: {
    async init () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      this.statusState = STATUS_UNKNOWN;
      this.failure = '';
      this.statement = null;
      this.coverage = null;
      this.wasteEntries = null;
      this.wasteAbsent = false;
      this.selectedStatementId = null;
      this.exportResult = null;
      this.projection = null;

      try {
        const status = await this._statusService.GetStatus(this.storeId);
        const flags = (status && status.flags) || null;
        if (!flags) { return; }
        this.projection = (status && status.projection) || null;
        // TWO flags, two different screens. The module master being off makes the whole module
        // invisible; the `Margin.Statements` STAGE flag being off makes only this surface invisible
        // while recipes and coverage keep working. Every statement route answers the SAME opaque 404
        // in both cases, so this read is the only thing that can tell a venue which it is looking at.
        if (flags.module !== true) { this.statusState = STATUS_MODULE_OFF; return; }
        this.statusState = flags.statements === true ? STATUS_ON : STATUS_STAGE_OFF;
      } catch (e) {
        // A 404 here is the module being invisible; anything else leaves the status unknown, and the
        // page says it does not know rather than claiming the module is off.
        this.statusState = isMarginApiError(e) && e.code === MARGIN_NOT_FOUND ? STATUS_MODULE_OFF : STATUS_UNKNOWN;
        return;
      }

      if (this.statusState !== STATUS_ON) { return; }
      await this.load();
    },

    async load () {
      this.loading = true;
      // Cleared to unknown, not to empty: an in-flight or failed read must not render as a store with
      // no statements, which is a different claim.
      this.rows = null;
      this.supplierNames = null;

      const [list, suppliers] = await Promise.all([
        this._statementService.ListStatements(this.storeId).catch((e) => { this.fail(e); return null; }),
        // The supplier list only NAMES an attribution a spend line already carries. A failure leaves it
        // null and the spend panel says the names are unknown, rather than claiming the supplier is
        // gone — and the ids are round-tripped either way.
        this._statementService.ListSuppliers(this.storeId).catch(() => null)
      ]);

      this.rows = readStatementRows(list);
      this.supplierNames = readSupplierNames(suppliers);
      await this.loadIngredients();
      this.loading = false;
    },

    async selectStatement (statementId) {
      this.selectedStatementId = statementId;
      this.statement = null;
      this.coverage = null;
      this.wasteEntries = null;
      this.wasteAbsent = false;
      this.exportResult = null;
      this.failure = '';

      let detail = null;
      try {
        detail = await this._statementService.GetStatement(this.storeId, statementId);
      } catch (e) {
        this.fail(e);
        return;
      }

      this.statement = readStatement(detail);
      await Promise.all([this.loadCoverage(), this.loadWaste()]);
    },

    /**
     * The selected week's waste entries. A separate read from the coverage one on purpose: coverage
     * carries the per-reason TOTALS and this carries the ENTRIES the venue edits, and the panel that
     * records them has to keep working when the coverage read (behind a different gate) fails.
     *
     * THREE OUTCOMES, NOT TWO, AND THE THIRD IS THE ONE A VENUE MEETS TODAY.
     *
     *   • the read answered         → the entries, `[]` included, which is a real "nothing this week";
     *   • the read answered 404     → the surface IS NOT SERVED HERE, and both panels say ABSENT;
     *   • anything else went wrong  → null, and the panel says the read did not answer.
     *
     * The middle arm exists because it is the arm that is taken. No backend this estate deploys
     * publishes `/margin/waste` — at the integration tip `8e2b57de` there is no `MarginWasteController`,
     * no entity and no service, and a live API answers this route with the same status as a route that
     * was never named — while `GET /margin/status` still answers `statements: true`, which is what puts
     * this panel on screen in the first place. Collapsing that into the failure arm showed a venue A
     * READ THAT BROKE where the truth is A FEATURE THAT IS NOT THERE, and the two invite opposite
     * behaviour: an absence invites a question, a broken read invites a retry, then a support call,
     * then doubt about the reconciled figures sitting directly above it on the same screen.
     *
     * A 404 IS READ OFF THE STATUS, NOT OFF THE CODE. The route-does-not-exist 404 comes from ASP.NET's
     * router, carries no problem+json and therefore no `margin.*` code at all; only the flag-gated 404
     * carries `margin.not-found`. Keying on the code would see just the second and would go on
     * mis-rendering the case this exists for. Every 404 this route can produce — no controller, a
     * module or stage flag off, a store outside the caller's scope — is one sentence to a venue: this
     * is not served to you here. None of them is a request that failed.
     *
     * ONLY THIS READ INFERS ABSENCE, deliberately. `DELETE /margin/waste/{id}` answers 404 for an entry
     * that is already gone, so inferring absence there would trade one wrong reading for another; this
     * route carries no resource in its path and has no such second meaning. The write paths keep
     * `fail`, and in the absent world they are unreachable anyway — the panel draws no form and no
     * remove control.
     */
    async loadWaste () {
      const period = this.statement;
      if (!period || !period.periodStart || !period.periodEnd) {
        this.wasteEntries = null;
        this.wasteAbsent = false;
        return;
      }

      let response = null;
      let absent = false;
      try {
        response = await this._wasteService.ListWaste(this.storeId, period.periodStart, period.periodEnd);
      } catch (e) {
        absent = isMarginApiError(e) && e.status === 404;
      }

      this.wasteAbsent = absent;
      this.wasteEntries = readWasteEntries(response);
    },

    /**
     * The ingredient master, for the waste form's optional picker — the path that lets the module
     * price a loss from the same supplier prices the theoretical cost is built on.
     *
     * Archived ingredients are excluded, like every other pick-list in the module: a venue should not
     * newly attribute a loss to an ingredient it has retired. A failure leaves the list null and the
     * form falls back to free text, which is a working entry rather than a blocked one.
     */
    async loadIngredients () {
      const response = await this._ingredientService.ListIngredients(this.storeId).catch(() => null);
      const list = response && Array.isArray(response.ingredients) ? response.ingredients : null;
      this.ingredients = list === null
        ? null
        : list
          .filter(ingredient => ingredient.status !== 'Archived')
          .map(ingredient => ({
            id: ingredient.ingredientId,
            name: ingredient.name,
            baseUnit: ingredient.baseUnit || null
          }));
    },

    /**
     * Records one entry, then re-reads BOTH the list and the coverage totals: the breakdown on the
     * coverage panel is the server's own and would otherwise disagree with the row that just landed.
     */
    async recordWaste (entry) {
      this.recordingWaste = true;
      this.failure = '';
      try {
        await this._wasteService.RecordWaste(this.storeId, entry);
        // Cleared only once the server has accepted it, so a refused write keeps what was typed. The
        // panel is conditionally rendered (there is none until a week is selected), so the ref is
        // checked rather than assumed.
        const panel = this.$refs.wastePanel;
        if (panel && typeof panel.reset === 'function') { panel.reset(); }
        await Promise.all([this.loadWaste(), this.loadCoverage()]);
      } catch (e) {
        this.fail(e);
      }
      this.recordingWaste = false;
    },

    /** Removes a mis-keyed entry while its week is open. Its own revision guards the delete. */
    async removeWaste (entry) {
      if (!entry || !entry.revision) { return; }
      this.recordingWaste = true;
      this.failure = '';
      try {
        await this._wasteService.DeleteWaste(this.storeId, entry.wasteEntryId, entry.revision);
        await Promise.all([this.loadWaste(), this.loadCoverage()]);
      } catch (e) {
        this.fail(e);
      }
      this.recordingWaste = false;
    },

    /**
     * The coverage read for the SELECTED statement's own week. A separate endpoint behind a separate
     * gate (the module master, not the statements stage), so it can fail on its own — which is why a
     * failure leaves the model null and the panel says the read did not answer.
     */
    async loadCoverage () {
      const period = this.statement;
      if (!period || !period.periodStart || !period.periodEnd) { this.coverage = null; return; }
      const response = await this._statementService
        .GetCoverage(this.storeId, period.periodStart, period.periodEnd)
        .catch(() => null);
      this.coverage = readCoverage(response);
    },

    /**
     * Opens the week — or the next forward-only revision of it. The response IS the full detail, so
     * the new statement is selected from it without a second read; only the list is re-fetched,
     * because it now has a row it did not have.
     */
    async createStatement (weekStartDate) {
      if (!weekStartDate || !isMondayDate(weekStartDate)) { return; }
      this.creating = true;
      this.failure = '';
      try {
        const detail = await this._statementService.CreateStatement(this.storeId, weekStartDate);
        this.statement = readStatement(detail);
        this.selectedStatementId = this.statement.statementId;
        this.exportResult = null;
        await this.refreshList();
        // BOTH READS, because opening a week renders BOTH panels. This used to load coverage alone,
        // which left the waste panel reporting on a request that was never sent — and, worse, left
        // `wasteAbsent` false, so the coverage panel said "we could not tell" about waste on the one
        // path where nobody had asked. A venue who opens a week and one who picks an existing week
        // must be shown the same thing, because they are looking at the same week.
        await Promise.all([this.loadCoverage(), this.loadWaste()]);
      } catch (e) {
        this.fail(e);
      }
      this.creating = false;
    },

    /**
     * The replace-set save. Its response IS the recalculated statement, so nothing is re-read for the
     * panel — but the list is, because the spend that just changed moves the row's actual-food-cost
     * percentage and its gap.
     */
    async saveInputs (payload) {
      if (!this.statement || !this.statement.canMutate) { return; }
      this.savingInputs = true;
      this.failure = '';
      try {
        const detail = await this._statementService.SetInputs(
          this.storeId, this.statement.statementId, payload, this.statement.revision);
        this.statement = readStatement(detail);
        this.exportResult = null;
        await this.refreshList();
      } catch (e) {
        this.fail(e);
      }
      this.savingInputs = false;
    },

    async recalculate () {
      if (!this.statement || !this.statement.canMutate) { return; }
      this.recalculating = true;
      this.failure = '';
      try {
        const detail = await this._statementService.Recalculate(
          this.storeId, this.statement.statementId, this.statement.revision);
        this.statement = readStatement(detail);
        this.exportResult = null;
        await this.refreshList();
        // The recalculation re-read the facts, so the coverage that explains its percentage may have
        // moved too — a stale panel underneath fresh figures is the state that sends a venue looking
        // for a discrepancy that is not there.
        await this.loadCoverage();
      } catch (e) {
        this.fail(e);
      }
      this.recalculating = false;
    },

    async finalize () {
      if (!this.statement || !this.statement.canMutate) { return; }
      this.finalizing = true;
      this.failure = '';
      try {
        const detail = await this._statementService.Finalize(
          this.storeId, this.statement.statementId, this.statement.revision);
        this.statement = readStatement(detail);
        this.exportResult = null;
        // The week's waste is frozen by the same act, so the rows are re-read: their `frozen` flag is
        // the server's answer and is what removes the per-row delete control.
        await Promise.all([this.refreshList(), this.loadWaste()]);
      } catch (e) {
        this.fail(e);
      }
      this.finalizing = false;
    },

    /**
     * Fetches the CSV and holds it. It is NOT downloaded in the same gesture and NOT re-fetched on
     * download: a second request could answer differently on an Open statement (a recalculation in
     * between), and the venue would then be saving a file whose figures are not the ones it was shown.
     */
    async exportCsv () {
      if (!this.statement) { return; }
      this.exporting = true;
      this.failure = '';
      this.exportResult = null;
      try {
        const file = await this._statementService.ExportCsv(this.storeId, this.statement.statementId);
        this.exportResult = {
          text: file.text,
          // The server's own name when it exposed one; otherwise a local fallback that is clearly a
          // fallback rather than a second copy of the server's naming scheme.
          fileName: file.fileName ||
            ('margin-statement-' + (this.statement.periodStart || 'unknown') +
             '-rev' + (this.statement.revisionNumber === null ? 'x' : this.statement.revisionNumber) + '.csv')
        };
      } catch (e) {
        this.fail(e);
      }
      this.exporting = false;
    },

    downloadExport () {
      const result = this.exportResult;
      if (!result) { return; }

      if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function' || typeof document === 'undefined') {
        this.failure = this.$i('mrgs_err_download_unavailable');
        return;
      }

      const url = URL.createObjectURL(new Blob([result.text], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      link.click();
      if (typeof URL.revokeObjectURL === 'function') { URL.revokeObjectURL(url); }
    },

    /**
     * Refills the holes in the sales facts a statement is computed from. Append-only and idempotent on
     * the journal line, so over an intact fact set it appends nothing.
     *
     * The status is re-read afterwards because the lag it reports is the whole reason to press this,
     * and a selected statement is NOT recalculated automatically: recalculating is a mutation with its
     * own control, and doing it as a side effect of a repair would change figures nobody asked to move.
     */
    async rebuildProjection () {
      this.rebuilding = true;
      this.failure = '';
      try {
        await this._statementService.RebuildProjection(this.storeId);
        const status = await this._statusService.GetStatus(this.storeId).catch(() => null);
        this.projection = (status && status.projection) || null;
      } catch (e) {
        this.fail(e);
      }
      this.rebuilding = false;
    },

    async refreshList () {
      const list = await this._statementService.ListStatements(this.storeId).catch(() => null);
      // Only overwritten on an answer: a failed refresh must not blank a list that is on screen and
      // correct, and must not turn it into "this store has no statements".
      if (list) { this.rows = readStatementRows(list); }
    },

    useSuggestedMonday () {
      if (this.suggestedMonday) { this.weekStart = this.suggestedMonday; }
    },

    rowPeriod (row) {
      if (!row.periodStart || !row.periodEnd) { return this.$i('mrgs_period_unknown'); }
      return this.$i('mrgs_period_range', { from: row.periodStart, to: row.periodEnd });
    },

    rowMeta (row) {
      const parts = [];
      parts.push(row.revisionNumber === null
        ? this.$i('mrgs_period_unknown')
        : this.$i('mrgs_revision', { number: row.revisionNumber }));
      parts.push(row.finalized ? this.$i('mrgs_state_finalized') : this.$i('mrgs_state_open'));
      // The row's own food-cost percentage, or the dash. Never 0,00 %, which on this figure is the
      // most flattering possible misreading of "we could not work it out".
      parts.push(this.$i('mrgs_row_actual_percent', {
        percent: row.actualFoodCostPercent === null ? '—' : this.formatRatio(row.actualFoodCostPercent) + ' %'
      }));
      // Whether the row's theoretical side is a complete answer travels WITH it: a partial one
      // understates food cost, and a list is exactly where a percentage gets compared to a target.
      if (!row.theoreticalCostComplete) { parts.push(this.$i('mrgs_row_partial')); }
      return parts.join(' · ');
    },

    /** Percentage points at presentation only — rounded the way the backend rounds its own CSV. */
    formatRatio (value) {
      return new Intl.NumberFormat(this.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    },

    /**
     * A typed code becomes this page's own sentence; an uncoded 400 is the statement surface's
     * business refusal and is QUOTED verbatim, because the server's prose is the only thing that says
     * which rule was broken. Anything else is a surprise and says so.
     */
    fail (error) {
      if (isMarginApiError(error)) {
        const key = ERROR_KEYS[error.code];
        if (key) { this.failure = this.$i(key); return; }
        if (isUncodedRefusal(error)) {
          this.failure = this.$i('mrgs_err_refused', { detail: error.message });
          return;
        }
      }
      this.failure = this.$i('mrgs_err_generic');
    }
  }
};
</script>

<style lang="scss" scoped>
.mrgs-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) { padding: 16px; }
}

.mrgs-page__header { margin-bottom: 32px; }

.mrgs-page__title {
  font-size: 2em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px 0;

  @media (max-width: 768px) { font-size: 1.5em; }
}

.mrgs-page__intro {
  color: #64748b;
  margin: 0;
}

.mrgs-page__blocker,
.mrgs-page__failure {
  padding: 16px 20px;
  border-radius: 12px;
  background: #fff7ed;
  color: #92400e;
  margin-bottom: 24px;
}

.mrgs-page__columns {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(420px, 1.4fr);
  gap: 24px;
  align-items: start;

  @media (max-width: 1024px) { grid-template-columns: 1fr; }
}

.mrgs-page__left,
.mrgs-page__right {
  display: grid;
  gap: 24px;
}

.mrgs-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.mrgs-card__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 16px 0;
}

.mrgs-card__note {
  font-size: 0.85em;
  color: #64748b;
  margin: 0 0 12px 0;
}

.mrgs-actions { display: grid; gap: 4px; justify-items: start; }

.mrgs-field { display: block; margin-bottom: 16px; }

.mrgs-field__label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85em;
  font-weight: 600;
  color: #292c34;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.mrgs-field__input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  font-size: 0.95em;
  color: #292c34;

  &:focus {
    outline: none;
    border-color: #1bb776;
    box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
  }
}

.mrgs-btn {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95em;
  cursor: pointer;

  &:disabled { background: #cbd5e0; cursor: not-allowed; opacity: 0.6; }

  &--ghost {
    background: #fff;
    color: #292c34;
    border: 2px solid #e2e8f0;
    padding: 12px 20px;
    font-weight: 500;
  }
}

.mrgs-chip {
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 10px;
  margin-left: 6px;
  font-size: 0.85em;
  color: #292c34;
  cursor: pointer;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.mrgs-list { list-style: none; margin: 0; padding: 0; }

.mrgs-list__item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  padding: 12px 4px;
  cursor: pointer;

  &.is-selected { background: rgba(27, 183, 118, 0.08); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.mrgs-list__name {
  display: block;
  font-weight: 600;
  color: #292c34;
}

.mrgs-list__meta {
  display: block;
  font-size: 0.8em;
  color: #64748b;
}
</style>
