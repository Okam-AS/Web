<template>
  <AdminPage full-width @login-success="load">
    <div class="meals-statements-page">
      <div class="meals-statements-page__header">
        <h1 class="meals-statements-page__title">
          {{ $i('mlst_page_title') }}
        </h1>
        <p class="meals-statements-page__intro">
          {{ $i('mlst_page_intro') }}
        </p>
      </div>

      <!-- Said before anything else, because an operator looking for the button that closes the month
           must not hunt for it here. This screen READS a statement; the month close is a separate act
           on a separate screen, beside the exception queue that unblocks it. -->
      <p class="mls-note mls-note--warn" data-test="meals-statements-owner">
        {{ $i('mlst_owner_note') }}
      </p>

      <section class="mls-form" data-test="meals-statements-open-form">
        <h2 class="mls-form__title">
          {{ $i('mlst_open_title') }}
        </h2>

        <div class="mls-grid">
          <label class="mls-label mls-label--wide">
            {{ $i('mlst_field_run') }}
            <input
              v-model="runIdInput"
              class="mls-input"
              :placeholder="$i('mlst_run_placeholder')"
              data-test="meals-statements-run-input"
            >
          </label>
        </div>
        <button
          class="mls-btn mls-btn--primary"
          :disabled="!runIdInput.trim() || loading"
          data-test="meals-statements-open"
          @click="open(runIdInput.trim())"
        >
          {{ loading ? $i('mlst_opening') : $i('mlst_open_action') }}
        </button>
      </section>

      <!-- #21. Attempted for every company this venue has a corridor with, and refused for a store
           admin by design. The refusal is SHOWN rather than swallowed: a venue that cannot list is
           entitled to know that the list exists and belongs to the buyer, instead of reading an empty
           panel as "no statements have ever been produced here". -->
      <section class="meals-statements-page__history" data-test="meals-statements-history">
        <h2 class="mls-form__title">
          {{ $i('mlst_history_title') }}
        </h2>

        <p v-if="directoryRefusal" class="mls-note mls-note--warn" data-test="meals-statements-directory-refusal">
          {{ $i('mlst_directory_unknown') }}
        </p>
        <p v-else-if="companies !== null && !companies.length" class="mls-note" data-test="meals-statements-no-companies">
          {{ $i('mlst_no_companies') }}
        </p>

        <div v-for="entry in history" :key="entry.companyId" class="meals-statements-page__company" data-test="meals-statements-company">
          <h3 class="meals-statements-page__company-name">
            {{ entry.name }}
          </h3>
          <p v-if="entry.forbidden" class="mls-note" data-test="meals-statements-history-forbidden">
            {{ $i('mlst_history_forbidden') }}
          </p>
          <p v-else-if="entry.refusal" class="mls-note mls-note--warn" data-test="meals-statements-history-refusal">
            {{ $i(entry.refusal.key, entry.refusal.params) }}
          </p>
          <p v-else-if="entry.rows && !entry.rows.length" class="mls-note" data-test="meals-statements-history-none">
            {{ $i('mlst_history_none') }}
          </p>
          <ul v-else-if="entry.rows" class="meals-statements-page__runs">
            <li v-for="row in entry.rows" :key="row.statementRunId">
              <button class="mls-btn mls-btn--small" data-test="meals-statements-history-row" @click="open(row.statementRunId)">
                {{ row.period }} · {{ row.status }} · {{ row.statementRunId }}
              </button>
            </li>
          </ul>
        </div>
      </section>

      <p v-if="refusal" class="mls-note mls-note--danger" data-test="meals-statements-refusal">
        {{ $i(refusal.key, refusal.params) }}
      </p>

      <template v-if="statement">
        <MealsStatementLines :statement="statement" :currency="statement.currency" />

        <p v-if="statement.isFinalized" class="mls-note" data-test="meals-statements-frozen">
          {{ $i('mlst_frozen_note') }}
        </p>
        <p v-else class="mls-note mls-note--warn" data-test="meals-statements-still-draft">
          {{ $i('mlst_draft_note') }}
        </p>

        <div class="meals-statements-page__actions">
          <button class="mls-btn" :disabled="loading" data-test="meals-statements-reread" @click="open(statement.statementRunId)">
            {{ $i('mlst_reread_action') }}
          </button>
          <button class="mls-btn mls-btn--primary" :disabled="exporting" data-test="meals-statements-export" @click="exportCsv">
            {{ exporting ? $i('mlst_exporting') : $i('mlst_export_action') }}
          </button>
        </div>

        <div v-if="exportResult" class="mls-note" data-test="meals-statements-export-result">
          <p class="mls-note__title">
            {{ $i('mlst_export_ready', { name: exportResult.fileName }) }}
          </p>
          <!-- The hash the SERVER put on the file, read off `X-Meals-Content-Hash` — never computed
               here. A hash this client derived from the body would prove nothing about the document
               the server signed. -->
          <p v-if="exportResult.contentHash" data-test="meals-statements-export-hash">
            {{ $i('mlst_export_hash', { hash: exportResult.contentHash }) }}
          </p>
          <p v-if="!exportResult.serverNamed" class="mls-detail" data-test="meals-statements-export-named-here">
            {{ $i('mlst_export_named_here') }}
          </p>
          <pre class="meals-statements-page__csv" data-test="meals-statements-export-text">{{ exportResult.text }}</pre>
          <button class="mls-btn" data-test="meals-statements-download" @click="downloadExport">
            {{ $i('mlst_download_action') }}
          </button>
        </div>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import MealsStatementLines from '~/components/admin/meals/MealsStatementLines.vue';
import { MealsStoreService, refusalOf } from '~/utils/meals/meals-client';
import { MealsStatementService } from '~/utils/meals/statement-client';
import { readStatement, readSummary, statementRefusal, UNKNOWN_MARK } from '~/utils/meals/statement-view';

/**
 * THE MONTH STATEMENT AS A DOCUMENT — endpoints #21, #22 and #23, and the way in to the only screen
 * in the estate that shows a statement's LINES.
 *
 * WHAT THIS PAGE DOES NOT DO, and why. It does not draft and it does not finalize.
 * `components/admin/meals/MealsMonthClose.vue` on `/admin/meals-agreements` owns both, because open
 * reconciliation exceptions block draft and finalize alike, the refusal carries a COUNT and no
 * identity, and naming the row that is blocking a close needs the exception queue joined against that
 * refusal — which is what that surface has and this one does not. A FINALIZE IS IRREVERSIBLE: there
 * is no un-finalize route and the freeze is enforced by database trigger below the service layer. Two
 * controls for one irreversible act, on two screens, means an operator can find the one that cannot
 * tell them what is stopping it. So there is one, and it is not here.
 *
 * WHAT IT DOES DO is the half that surface deliberately left out — `utils/meals/meals-client.js` says
 * so in its own header — and it is the half a person actually needs when a buyer disputes a bill:
 *
 *   the LINES, each with the member reference the line was written with;
 *   the totals and the content signature the venue signed;
 *   the CSV the buyer receives, fetched, shown, and saved.
 *
 * HOW A STATEMENT IS REACHED. Two ways, and the page is honest that neither is a browse.
 * #21 — the company's statement history — is `RequireCompanyAdminAsync`, so a STORE admin asking for
 * it is refused `meals.forbidden`. The page asks anyway and prints the refusal as a sentence, because
 * an empty panel would read as "this venue has produced no statements". A COMPANY admin opening the
 * same page gets the list and can open a run from it. A store admin opens a run by its id, which is
 * what the month-close screen has in hand the moment it drafts.
 *
 * THE LINK FROM THE CLOSE TO HERE IS NOT IN THIS DIFF, and that is stated rather than assumed:
 * `MealsMonthClose.vue` lives on an unmerged lane branch and this lane does not edit another lane's
 * file. Whoever merges the two owes that one link, and the run-id field above is what makes this page
 * usable in the meantime rather than a dead end.
 *
 * NOTHING HERE IS DERIVED. Every figure is the server's, every member reference is the stored
 * `memberDisplayRef`, and the export's signature is the one the response header carried. This screen
 * shows a document a bokføring inspector may later read; a figure this page computed would be a
 * figure nobody could reconcile against the file.
 */
export default {
  name: 'AdminMealsStatements',
  components: { AdminPage, MealsStatementLines },
  data () {
    return {
      unknownMark: UNKNOWN_MARK,
      // Null is UNKNOWN and stays null on failure — never `[]`, which is an answer.
      companies: null,
      directoryRefusal: null,
      history: [],
      runIdInput: '',
      loading: false,
      exporting: false,
      statement: null,
      refusal: null,
      exportResult: null
    };
  },
  computed: {
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      return stores.length ? stores[0].id : '';
    }
  },
  watch: {
    storeId () { this.load(); }
  },
  mounted () {
    this.load();
  },
  methods: {
    _statementService () {
      return new MealsStatementService(this._coreInitializer);
    },

    async load () {
      if (!this.$store.getters.userIsLoggedIn || !this.storeId) { return; }
      await this.loadHistory();
      // A run named on the URL is opened after the history, so a deep link works whether or not the
      // caller is allowed the list. This is the handoff the month-close screen will use.
      const fromRoute = this.$route && this.$route.query ? this.$route.query.run : null;
      if (fromRoute) {
        this.runIdInput = String(fromRoute);
        await this.open(this.runIdInput);
      }
    },

    async loadHistory () {
      this.companies = null;
      this.directoryRefusal = null;
      this.history = [];

      let directory = null;
      try {
        directory = await new MealsStoreService(this._coreInitializer).ListCompanies(this.storeId);
      } catch (e) {
        this.directoryRefusal = refusalOf(e) || 'unknown';
        return;
      }
      // Only a company with an ACTIVE corridor here can have a statement from this venue at all.
      this.companies = (Array.isArray(directory) ? directory : [])
        .filter(c => c && c.agreementStatus === 'Active');

      const service = this._statementService();
      this.history = await Promise.all(this.companies.map(async (c) => {
        const entry = {
          companyId: c.companyId,
          name: c.displayName || c.legalName || c.companyId,
          rows: null,
          refusal: null,
          // Split out from the other refusals because it is not a failure: it is the authority
          // boundary working, and it gets its own sentence.
          forbidden: false
        };
        try {
          const payload = await service.ListForCompany(c.companyId);
          const rows = (payload && Array.isArray(payload.statements)) ? payload.statements : [];
          entry.rows = rows.map(readSummary);
        } catch (e) {
          if (e && e.code === 'meals.forbidden') { entry.forbidden = true; } else { entry.refusal = statementRefusal(e); }
        }
        return entry;
      }));
    },

    /** #22. The only read that carries a statement's LINES. */
    async open (statementRunId) {
      if (!statementRunId) { return; }
      this.loading = true;
      this.refusal = null;
      this.exportResult = null;
      try {
        this.statement = readStatement(await this._statementService().Get(statementRunId));
        this.runIdInput = statementRunId;
      } catch (e) {
        this.statement = null;
        this.refusal = statementRefusal(e);
      }
      this.loading = false;
    },

    /**
     * #23. Fetches the CSV and HOLDS it. It is not downloaded in the same gesture and not re-fetched
     * on download: a second request could answer differently — a statement still in Draft can be
     * re-drafted underneath — and the venue would then be saving a file whose figures are not the
     * ones it was shown.
     */
    async exportCsv () {
      if (!this.statement || !this.statement.statementRunId) { return; }
      this.exporting = true;
      this.refusal = null;
      this.exportResult = null;
      try {
        const file = await this._statementService().ExportCsv(this.statement.statementRunId);
        this.exportResult = {
          text: file.text,
          contentHash: file.contentHash,
          // Whether the SERVER named the file. `Content-Disposition` is not CORS-safelisted, so a
          // cross-origin admin often cannot read it; the fallback is clearly marked on screen rather
          // than being a second copy of the server's naming scheme passed off as the server's name.
          serverNamed: !!file.fileName,
          fileName: file.fileName || ('meals-statement-' + (this.statement.period || 'unknown') + '.csv')
        };
      } catch (e) {
        this.refusal = statementRefusal(e);
      }
      this.exporting = false;
    },

    downloadExport () {
      const result = this.exportResult;
      if (!result) { return; }
      if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function' || typeof document === 'undefined') {
        this.refusal = { key: 'mlst_err_download_unavailable', params: {} };
        return;
      }
      const url = URL.createObjectURL(new Blob([result.text], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = result.fileName;
      link.click();
      if (typeof URL.revokeObjectURL === 'function') { URL.revokeObjectURL(url); }
    }
  }
};
</script>

<style lang="scss" scoped>
@import '~/components/admin/meals/meals-admin';

.meals-statements-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.meals-statements-page__header {
  margin-bottom: 24px;
}

.meals-statements-page__title {
  font-size: 2em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px;

  @media (max-width: 768px) {
    font-size: 1.5em;
  }
}

.meals-statements-page__intro {
  color: #64748b;
  margin: 0;
}

.meals-statements-page__history {
  margin-bottom: 24px;
}

.meals-statements-page__company-name {
  font-size: 0.95em;
  font-weight: 600;
  color: #292c34;
  margin: 12px 0 6px;
}

.meals-statements-page__runs {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.meals-statements-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

/* The exported document, shown before it is saved. A venue handing a bill to a buyer should be able
   to read the file it is about to send rather than opening it afterwards. */
.meals-statements-page__csv {
  max-height: 260px;
  overflow: auto;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.8em;
  white-space: pre;
}
</style>
