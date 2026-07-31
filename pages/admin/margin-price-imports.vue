<template>
  <AdminPage full-width @login-success="init">
    <div class="mrg-page">
      <div class="mrg-page__header">
        <h1 class="mrg-page__title">
          {{ $i('mrg_imp_page_title') }}
        </h1>
        <p class="mrg-page__intro">
          {{ $i('mrg_imp_page_intro') }}
        </p>
      </div>

      <div v-if="blocker" class="mrg-page__blocker" data-test="blocker">
        {{ blocker }}
      </div>

      <template v-else>
        <p v-if="failure" class="mrg-page__failure" data-test="failure">
          {{ failure }}
        </p>

        <div class="mrg-page__columns">
          <div class="mrg-page__left">
            <!-- STEP 1 — the file. The format is the server's, not this page's: it detects the
                 dialect from the header line, so what a Norwegian export produces is what it
                 expects. Said plainly, because a US-format file parses to different øre. -->
            <section class="mrg-card">
              <h2 class="mrg-card__title">
                {{ $i('mrg_imp_upload_title') }}
              </h2>
              <p class="mrg-card__note">
                {{ $i('mrg_imp_format_lede') }}
              </p>
              <p class="mrg-card__note">
                {{ $i('mrg_imp_format_columns') }}
              </p>
              <p class="mrg-card__note">
                {{ $i('mrg_imp_format_currency') }}
              </p>

              <button class="mrg-btn mrg-btn--ghost" :disabled="busy" @click="downloadTemplate">
                {{ downloadingTemplate ? $i('mrg_imp_template_downloading') : $i('mrg_imp_template') }}
              </button>

              <label class="mrg-field">
                <span class="mrg-field__label">{{ $i('mrg_imp_supplier_scope') }}</span>
                <select v-model="supplierScope" class="mrg-field__input" :disabled="busy">
                  <option value="">
                    {{ $i('mrg_imp_supplier_any') }}
                  </option>
                  <option v-for="supplier in supplierRows" :key="supplier.supplierId" :value="supplier.supplierId">
                    {{ supplier.name }}
                  </option>
                </select>
                <span class="mrg-field__hint">{{ $i('mrg_imp_supplier_scope_hint') }}</span>
              </label>

              <label class="mrg-field">
                <span class="mrg-field__label">{{ $i('mrg_imp_file') }}</span>
                <input
                  ref="file"
                  class="mrg-field__input"
                  type="file"
                  accept=".csv,text/csv"
                  :disabled="busy"
                  @change="pickFile"
                >
              </label>

              <p v-if="uploadError" class="mrg-card__error" data-test="upload-error">
                {{ uploadError }}
              </p>

              <button class="mrg-btn" :disabled="busy || !file" @click="upload">
                {{ uploading ? $i('mrg_imp_uploading') : $i('mrg_imp_upload') }}
              </button>
            </section>

            <!-- The store's earlier batches. An applied one is history and is shown as such. -->
            <section class="mrg-card">
              <h2 class="mrg-card__title">
                {{ $i('mrg_imp_list_title') }}
              </h2>
              <p v-if="imports === null" class="mrg-card__note" data-test="imports-unknown">
                {{ $i('mrg_imp_list_unknown') }}
              </p>
              <p v-else-if="!importRows.length" class="mrg-card__note" data-test="imports-empty">
                {{ $i('mrg_imp_list_empty') }}
              </p>
              <ul v-else class="mrg-list">
                <li v-for="row in importRows" :key="row.batchId">
                  <button
                    class="mrg-list__item"
                    :class="{ 'is-selected': batch && row.batchId === batch.batchId }"
                    :disabled="busy"
                    @click="selectBatch(row.batchId)"
                  >
                    <span class="mrg-list__name">{{ row.fileName || $i('mrg_imp_unnamed_file') }}</span>
                    <span class="mrg-list__meta">{{ importMeta(row) }}</span>
                  </button>
                </li>
              </ul>
            </section>
          </div>

          <div class="mrg-page__right">
            <p v-if="!batch" class="mrg-card mrg-card__note" data-test="no-batch">
              {{ $i('mrg_imp_nothing_selected') }}
            </p>

            <template v-else>
              <MarginImportRowsPanel
                :batch="batch"
                :supplier-items="mappableItems"
                :busy="busy"
                :saving="savingMappings"
                :approving="approving"
                :currency="currency"
                :locale="locale"
                @save-mappings="saveMappings"
                @approve="approve"
              />

              <!-- The loop closing: an applied batch is exactly the moment a plate cost can stop
                   reading "unknown", so the way back to the screen that says whether it did is
                   here rather than left to be found. -->
              <section v-if="batch.isApplied" class="mrg-card" data-test="applied-next">
                <h2 class="mrg-card__title">
                  {{ $i('mrg_imp_next_title') }}
                </h2>
                <p class="mrg-card__note">
                  {{ $i('mrg_imp_next_lede') }}
                </p>
                <a class="mrg-btn mrg-btn--ghost" href="/admin/margin-recipes">{{ $i('mrg_sup_next_recipes') }}</a>
                <a class="mrg-btn mrg-btn--ghost" href="/admin/margin-suppliers">{{ $i('mrg_imp_next_suppliers') }}</a>
              </section>
            </template>
          </div>
        </div>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import MarginImportRowsPanel from '~/components/admin/margin/MarginImportRowsPanel.vue';
import { MarginPriceImportService } from '~/utils/margin/price-import-client';
import { MarginSupplierService } from '~/utils/margin/supplier-client';
import { isMarginApiError, MARGIN_NOT_FOUND } from '~/utils/margin/api-client';
import { describeMarginFailure } from '~/utils/margin/failure';
import { readImportBatch, readImportSummary } from '~/utils/margin/price-import';
import { readSupplierRow } from '~/utils/margin/supplier-model';

const STATUS_UNKNOWN = 'unknown';
const STATUS_MODULE_OFF = 'module-off';
const STATUS_STAGE_OFF = 'stage-off';
const STATUS_ON = 'on';

/**
 * Upload a supplier's price list, see what is in it, decide what it does, then apply it.
 *
 * THREE THINGS THIS PAGE HAS TO GET RIGHT, because each of them is a way to mislead a venue about
 * money:
 *
 *  1. THE STAGE FLAG. `Margin.PriceImport` is a per-store flag under the module master, defaulting
 *     OFF, and every route here answers the SAME opaque 404 when it is off as when the module is off
 *     as when the batch does not exist. Only `GET /margin/status` tells them apart, so the page reads
 *     that first and shows the right one of three banners instead of a broken screen.
 *  2. THE DUPLICATE. Re-uploading identical bytes is not an error: the server recognises the SHA-256,
 *     creates no second batch, applies no second price effect, and hands back the ORIGINAL. It is
 *     said in those words, in an informational panel, never in the failure banner.
 *  3. THE FORMAT. The parser detects the dialect from the header — a `;` means comma decimals — and a
 *     US-format file therefore parses to different øre rather than failing loudly. The page states
 *     what is expected up front and surfaces the server's own refusal verbatim when a file is
 *     rejected, because that refusal names the column or the cell.
 */
export default {
  name: 'MarginPriceImportsPage',
  components: { AdminPage, MarginImportRowsPanel },
  data () {
    return {
      statusState: STATUS_UNKNOWN,

      // Null means UNKNOWN — never `[]`, which would claim the store has never imported anything.
      imports: null,
      suppliers: null,
      // The supplier items a row may be mapped to. Null while unknown; the panel then offers none
      // and says why rather than showing an empty picker.
      items: null,

      batch: null,
      supplierScope: '',
      file: null,

      loading: false,
      uploading: false,
      savingMappings: false,
      approving: false,
      downloadingTemplate: false,
      uploadError: '',
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
    currency () {
      return (this.marketConfig && this.marketConfig.currency) || null;
    },
    _importService () {
      return new MarginPriceImportService(this._coreInitializer);
    },
    _supplierService () {
      return new MarginSupplierService(this._coreInitializer);
    },
    busy () {
      return this.loading || this.uploading || this.savingMappings || this.approving || this.downloadingTemplate;
    },
    /** Three different absences, three different sentences. Only the first is a broken read. */
    blocker () {
      if (this.statusState === STATUS_UNKNOWN) { return this.$i('mrg_status_unknown'); }
      if (this.statusState === STATUS_MODULE_OFF) { return this.$i('mrg_module_off'); }
      if (this.statusState === STATUS_STAGE_OFF) { return this.$i('mrg_imp_stage_off'); }
      return '';
    },
    importRows () {
      return (this.imports || []).map(readImportSummary);
    },
    supplierRows () {
      return (this.suppliers || []).map(readSupplierRow);
    },
    /**
     * The pickable items, each labelled with its supplier. Already constrained to the batch's
     * supplier when it has one — the server refuses a mapping outside that scope, so offering a
     * wider list would be offering choices that come back as a refusal.
     */
    mappableItems () {
      return this.items || [];
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
      this.batch = null;
      this.items = null;

      try {
        const status = await this._importService.GetStatus(this.storeId);
        const flags = (status && status.flags) || null;
        if (!flags) { return; }
        if (flags.module !== true) { this.statusState = STATUS_MODULE_OFF; return; }
        this.statusState = flags.priceImport === true ? STATUS_ON : STATUS_STAGE_OFF;
      } catch (e) {
        this.statusState = isMarginApiError(e) && e.code === MARGIN_NOT_FOUND ? STATUS_MODULE_OFF : STATUS_UNKNOWN;
        return;
      }

      if (this.statusState !== STATUS_ON) { return; }
      await this.load();
    },

    async load () {
      this.loading = true;
      this.imports = null;
      this.suppliers = null;

      const [imports, suppliers] = await Promise.all([
        this._importService.ListImports(this.storeId).catch((e) => { this.fail(e); return null; }),
        // Needed for the optional batch scope AND for the mapping picker's labels. A failure here
        // leaves both unknown rather than empty.
        this._supplierService.ListSuppliers(this.storeId, false).catch(() => null)
      ]);

      this.imports = imports && Array.isArray(imports.imports) ? imports.imports : null;
      this.suppliers = Array.isArray(suppliers) ? suppliers : null;
      this.loading = false;
    },

    pickFile (event) {
      const files = event.target.files;
      this.file = files && files.length ? files[0] : null;
      this.uploadError = '';
    },

    async upload () {
      if (!this.file) { this.uploadError = this.$i('mrg_imp_err_no_file'); return; }
      this.uploadError = '';
      this.uploading = true;
      this.failure = '';
      try {
        const detail = await this._importService.UploadCsv(this.storeId, this.supplierScope || null, this.file);
        // The duplicate case arrives HERE, as a 200 with the original batch — not as a throw. It is
        // rendered by the rows panel as an informational notice, so nothing is done about it here
        // beyond adopting the batch the server chose to return.
        await this.adoptBatch(detail);
        this.imports = await this._importService.ListImports(this.storeId)
          .then(response => (response && Array.isArray(response.imports) ? response.imports : null))
          .catch(() => null);
      } catch (e) {
        // A structurally invalid file is refused outright and nothing is staged. The refusal names
        // the missing column, so it is shown verbatim rather than replaced with "upload failed".
        this.fail(e);
      }
      this.uploading = false;
    },

    async selectBatch (batchId) {
      this.failure = '';
      this.batch = null;
      this.items = null;
      const detail = await this._importService.GetImport(this.storeId, batchId).catch((e) => { this.fail(e); return null; });
      if (detail) { await this.adoptBatch(detail); }
    },

    /**
     * Takes a batch document and loads the supplier items its rows can be mapped to.
     *
     * The module has no "every supplier item in the store" read, so this is one call per supplier
     * when the batch spans them and exactly one when it does not. A supplier whose items fail to
     * load is left out and the panel says the picker is short, rather than the page pretending that
     * supplier sells nothing.
     */
    async adoptBatch (detail) {
      this.batch = readImportBatch(detail);
      if (!this.batch) { return; }

      const supplierIds = this.batch.supplierId
        ? [this.batch.supplierId]
        : this.supplierRows.map(supplier => supplier.supplierId);

      if (!supplierIds.length) { this.items = []; return; }

      const lists = await Promise.all(supplierIds.map(supplierId =>
        this._supplierService.ListItems(this.storeId, supplierId, false).catch(() => null)));

      const items = [];
      lists.forEach((list, index) => {
        if (!Array.isArray(list)) { return; }
        const supplier = this.supplierRows.find(row => row.supplierId === supplierIds[index]);
        for (const item of list) {
          items.push({
            supplierItemId: item.supplierItemId,
            name: item.name,
            supplierArticleNumber: item.supplierArticleNumber,
            supplierName: supplier ? supplier.name : null
          });
        }
      });
      this.items = items;
    },

    async saveMappings (rows) {
      this.savingMappings = true;
      this.failure = '';
      try {
        // The response is the full batch document, so the row states on screen are the ones that
        // were stored — never a local edit that a partial save left looking applied.
        this.batch = readImportBatch(await this._importService.SetMappings(this.storeId, this.batch.batchId, rows));
      } catch (e) {
        this.fail(e);
      }
      this.savingMappings = false;
    },

    /**
     * Apply. Irreversible in the only sense that matters: the prices are appended and are superseded
     * forward, never withdrawn.
     *
     * The approve response is a SUMMARY with no rows, so the batch is re-read afterwards rather than
     * patched from it — otherwise the table would empty itself at the moment of success.
     */
    async approve () {
      this.approving = true;
      this.failure = '';
      try {
        await this._importService.ApproveImport(this.storeId, this.batch.batchId);
        const detail = await this._importService.GetImport(this.storeId, this.batch.batchId).catch(() => null);
        if (detail) { this.batch = readImportBatch(detail); }
        this.imports = await this._importService.ListImports(this.storeId)
          .then(response => (response && Array.isArray(response.imports) ? response.imports : null))
          .catch(() => null);
      } catch (e) {
        this.fail(e);
      }
      this.approving = false;
    },

    /**
     * The template. Fetched rather than linked because the route needs the bearer token, then handed
     * to the browser as a download. A refusal is thrown as a typed failure and rendered, so a venue
     * never ends up with an error document saved under a `.csv` name.
     */
    async downloadTemplate () {
      this.downloadingTemplate = true;
      this.failure = '';
      try {
        const csv = await this._importService.DownloadTemplate(this.storeId);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'margin-price-import-template.csv';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      } catch (e) {
        this.fail(e);
      }
      this.downloadingTemplate = false;
    },

    importMeta (row) {
      const parts = [this.$i('mrg_imp_state_' + String(row.state || 'unknown').toLowerCase())];
      parts.push(this.$i('mrg_imp_meta_rows', { count: row.rowCount === null ? '—' : row.rowCount }));
      if (row.uploadedAt) {
        parts.push(new Intl.DateTimeFormat(this.locale, { dateStyle: 'short', timeStyle: 'short' }).format(row.uploadedAt));
      }
      return parts.join(' · ');
    },

    fail (error) {
      const described = describeMarginFailure(error);
      this.failure = this.$i(described.key, described.params);
    }
  }
};
</script>

<style lang="scss" scoped>
.mrg-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) { padding: 16px; }
}

.mrg-page__header { margin-bottom: 32px; }

.mrg-page__title {
  font-size: 2em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px 0;

  @media (max-width: 768px) { font-size: 1.5em; }
}

.mrg-page__intro {
  color: #64748b;
  margin: 0;
}

.mrg-page__blocker,
.mrg-page__failure {
  padding: 16px 20px;
  border-radius: 12px;
  background: #fff7ed;
  color: #92400e;
  margin-bottom: 24px;
}

.mrg-page__columns {
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(420px, 1.4fr);
  gap: 24px;
  align-items: start;

  @media (max-width: 1024px) { grid-template-columns: 1fr; }
}

.mrg-page__left,
.mrg-page__right {
  display: grid;
  gap: 24px;
}

.mrg-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.mrg-card__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 16px 0;
}

.mrg-card__note {
  font-size: 0.85em;
  color: #64748b;
  margin: 0 0 12px 0;
}

.mrg-card__error {
  font-size: 0.85em;
  color: #92400e;
  background: #fff7ed;
  border-radius: 8px;
  padding: 10px 12px;
  margin: 0 0 12px 0;
}

.mrg-list { list-style: none; margin: 0; padding: 0; }

.mrg-list__item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  border-bottom: 1px solid #e2e8f0;
  padding: 10px 4px;
  cursor: pointer;

  &.is-selected { background: rgba(27, 183, 118, 0.08); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.mrg-list__name { display: block; font-weight: 600; color: #292c34; }
.mrg-list__meta { display: block; font-size: 0.8em; color: #64748b; }

.mrg-field { display: block; margin: 16px 0; }

.mrg-field__label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85em;
  font-weight: 600;
  color: #292c34;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.mrg-field__hint {
  display: block;
  margin-top: 6px;
  font-size: 0.8em;
  font-style: italic;
  color: #64748b;
}

.mrg-field__input {
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

.mrg-btn {
  display: inline-block;
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff;
  border: none;
  padding: 14px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95em;
  text-decoration: none;
  cursor: pointer;

  &:disabled { background: #cbd5e0; cursor: not-allowed; opacity: 0.6; }

  &--ghost {
    background: #fff;
    color: #292c34;
    border: 2px solid #e2e8f0;
    padding: 12px 18px;
    font-weight: 500;
    margin-right: 12px;
  }
}
</style>
