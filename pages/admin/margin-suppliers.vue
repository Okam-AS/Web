<template>
  <AdminPage full-width @login-success="init">
    <div class="mrg-page">
      <div class="mrg-page__header">
        <h1 class="mrg-page__title">
          {{ $i('mrg_sup_page_title') }}
        </h1>
        <p class="mrg-page__intro">
          {{ $i('mrg_sup_page_intro') }}
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
            <!-- STEP 1 — the ingredient a supplier's article will point at. Nothing downstream can
                 exist without one, which is why it is first and why the manual form lives here
                 rather than only as a starter chip on the recipes page. -->
            <MarginIngredientPanel
              :list="ingredientList"
              :detail="ingredientDetail"
              :selected-id="selectedIngredientId"
              :show-archived="showArchivedIngredients"
              :busy="busy"
              :saving="saving"
              :locale="locale"
              :currency="currency"
              @select="selectIngredient"
              @toggle-archived="toggleArchivedIngredients"
              @copy-starter="copyStarter"
              @create="createIngredient"
              @update="updateIngredient"
              @archive="archiveIngredient"
            />

            <!-- STEP 2 — who you buy from. -->
            <section class="mrg-card">
              <h2 class="mrg-card__title">
                {{ $i('mrg_sup_title') }}
              </h2>

              <p v-if="suppliers === null" class="mrg-card__note" data-test="suppliers-unknown">
                {{ $i('mrg_sup_unknown') }}
              </p>

              <template v-else>
                <label class="mrg-check">
                  <input type="checkbox" :checked="showArchivedSuppliers" :disabled="busy" @change="toggleArchivedSuppliers">
                  <span>{{ $i('mrg_sup_show_archived') }}</span>
                </label>

                <p v-if="!supplierRows.length" class="mrg-card__note" data-test="suppliers-empty">
                  {{ $i('mrg_sup_empty') }}
                </p>
                <ul v-else class="mrg-list">
                  <li v-for="supplier in supplierRows" :key="supplier.supplierId">
                    <button
                      class="mrg-list__item"
                      :class="{ 'is-selected': supplier.supplierId === selectedSupplierId }"
                      :disabled="busy"
                      @click="selectSupplier(supplier.supplierId)"
                    >
                      <span class="mrg-list__name">{{ supplier.name || $i('mrg_sup_unnamed') }}</span>
                      <span class="mrg-list__meta">{{ supplierMeta(supplier) }}</span>
                    </button>
                  </li>
                </ul>

                <h3 class="mrg-card__subtitle">
                  {{ $i('mrg_sup_create_title') }}
                </h3>
                <div class="mrg-field-row">
                  <label class="mrg-field">
                    <span class="mrg-field__label">{{ $i('mrg_sup_name') }}</span>
                    <input v-model="supplierForm.name" class="mrg-field__input" type="text" :disabled="busy">
                  </label>
                  <label class="mrg-field">
                    <span class="mrg-field__label">{{ $i('mrg_sup_org_number') }}</span>
                    <input v-model="supplierForm.organizationNumber" class="mrg-field__input" type="text" :disabled="busy">
                  </label>
                </div>
                <div class="mrg-field-row">
                  <label class="mrg-field">
                    <span class="mrg-field__label">{{ $i('mrg_sup_contact_name') }}</span>
                    <input v-model="supplierForm.contactName" class="mrg-field__input" type="text" :disabled="busy">
                  </label>
                  <label class="mrg-field">
                    <span class="mrg-field__label">{{ $i('mrg_sup_contact_email') }}</span>
                    <input v-model="supplierForm.contactEmail" class="mrg-field__input" type="email" :disabled="busy">
                  </label>
                  <label class="mrg-field">
                    <span class="mrg-field__label">{{ $i('mrg_sup_contact_phone') }}</span>
                    <input v-model="supplierForm.contactPhone" class="mrg-field__input" type="tel" :disabled="busy">
                  </label>
                </div>
                <p class="mrg-card__note">
                  {{ $i('mrg_sup_contact_gdpr') }}
                </p>

                <p v-if="supplierFormError" class="mrg-card__error" data-test="supplier-form-error">
                  {{ supplierFormError }}
                </p>

                <div class="mrg-actions">
                  <button class="mrg-btn" :disabled="busy" @click="saveSupplier">
                    {{ saving ? $i('mrg_sup_saving') : (editingSupplier ? $i('mrg_sup_save') : $i('mrg_sup_create')) }}
                  </button>
                  <button
                    v-if="editingSupplier"
                    class="mrg-btn mrg-btn--danger"
                    :disabled="busy"
                    @click="archiveSupplier"
                  >
                    {{ $i('mrg_sup_archive') }}
                  </button>
                </div>
                <p v-if="editingSupplier" class="mrg-card__note">
                  {{ $i('mrg_sup_archive_caveat') }}
                </p>

                <!-- THE GAP, STATED. A supplier's revision only ever arrives on the response to a
                     write — the list carries none and the module has no per-supplier read — so
                     after a reload there is no token to send and the write would be refused. The
                     controls are withheld and the reason is printed, exactly as the recipes page
                     does for an unactivatable draft. -->
                <p v-if="selectedSupplierId && !editingSupplier" class="mrg-card__note" data-test="supplier-no-revision">
                  {{ $i('mrg_sup_no_revision') }}
                </p>
              </template>
            </section>
          </div>

          <div class="mrg-page__right">
            <!-- STEP 3 — the article the supplier actually sells, and the two fields that decide
                 whether it can ever produce a cost. -->
            <MarginSupplierItemPanel
              :items="itemRows"
              :ingredients="activeIngredients"
              :supplier="selectedSupplier"
              :selected-item-id="selectedItemId"
              :show-archived="showArchivedItems"
              :busy="busy"
              :saving="saving"
              @select="selectItem"
              @toggle-archived="toggleArchivedItems"
              @create="createItem"
              @update="updateItem"
            />

            <p v-if="preferredBlocker" class="mrg-page__failure" data-test="preferred-blocker">
              {{ $i('mrg_item_preferred_blocks', { item: preferredBlocker.name || $i('mrg_item_unnamed') }) }}
            </p>

            <!-- STEP 4 — the price itself, and the history it supersedes. -->
            <MarginPriceTimelinePanel
              :timeline="timeline"
              :item="selectedItem"
              :batch-names="batchNames"
              :busy="busy"
              :saving="pricing"
              :currency="currency"
              :locale="locale"
              @add-price="addPrice"
            />

            <!-- STEP 5 — the loop closing. A plate cost only stops reading "unknown" once a priced,
                 costable article exists for every ingredient a recipe uses, and this is the link
                 back to the screen that says whether it does. -->
            <section class="mrg-card">
              <h2 class="mrg-card__title">
                {{ $i('mrg_sup_next_title') }}
              </h2>
              <p class="mrg-card__note">
                {{ $i('mrg_sup_next_lede') }}
              </p>
              <a class="mrg-btn mrg-btn--ghost" href="/admin/margin-recipes">{{ $i('mrg_sup_next_recipes') }}</a>
              <a v-if="priceImportOn" class="mrg-btn mrg-btn--ghost" href="/admin/margin-price-imports">{{ $i('mrg_sup_next_imports') }}</a>
            </section>
          </div>
        </div>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import MarginIngredientPanel from '~/components/admin/margin/MarginIngredientPanel.vue';
import MarginSupplierItemPanel from '~/components/admin/margin/MarginSupplierItemPanel.vue';
import MarginPriceTimelinePanel from '~/components/admin/margin/MarginPriceTimelinePanel.vue';
import { MarginSupplierService } from '~/utils/margin/supplier-client';
import { MarginIngredientService } from '~/utils/margin/ingredient-client';
import { MarginPriceImportService } from '~/utils/margin/price-import-client';
import { isMarginApiError, MARGIN_NOT_FOUND } from '~/utils/margin/api-client';
import { describeMarginFailure } from '~/utils/margin/failure';
import { readSupplierRow, readSupplierItem, blockingPreferredItem } from '~/utils/margin/supplier-model';
import { readPriceTimeline } from '~/utils/margin/price-timeline';

const STATUS_UNKNOWN = 'unknown';
const STATUS_MODULE_OFF = 'module-off';
const STATUS_ON = 'on';

/**
 * The screen the rest of the Margin module was waiting for.
 *
 * A plate cost is only ever built from supplier price data, and until this page existed nothing in
 * the product could create any. Every recipe therefore read "none of the N lines has a price", and
 * the copy told the venue to add "a supplier item with a valid price" — a thing there was no screen
 * for. This is that screen, and it is deliberately in the order the backend requires:
 *
 *   ingredient → supplier → supplier item (pack size + conversion) → price → cost
 *
 * Each step is a precondition of the next, and each one has a way of being present and useless that
 * the panels call out where it happens: an article without a pack size costs nothing; a PREFERRED
 * article without one costs nothing AND blocks its ingredient's other suppliers; a price is only in
 * force between two instants.
 *
 * NOTHING HERE ADDS MONEY UP. The only money conversion on the page is the venue's own typing turned
 * into øre by `parseMinorUnits`, on digit strings, before it is sent.
 */
export default {
  name: 'MarginSuppliersPage',
  components: { AdminPage, MarginIngredientPanel, MarginSupplierItemPanel, MarginPriceTimelinePanel },
  data () {
    return {
      statusState: STATUS_UNKNOWN,
      priceImportOn: false,

      // Null means UNKNOWN — the read has not answered. Never initialised to `[]`, which would
      // render a failed read as "this store has no suppliers".
      ingredientList: null,
      ingredientDetail: null,
      selectedIngredientId: null,
      showArchivedIngredients: false,

      suppliers: null,
      selectedSupplierId: null,
      showArchivedSuppliers: false,
      /**
       * `{ supplierId: revision }`, and it only ever gains an entry from a WRITE response.
       * `MarginSupplierSummary` carries no revision and the module has no `GET /suppliers/{id}`, so
       * this is the only place a supplier's token can come from — which is exactly why the edit and
       * archive controls are conditional on it rather than always offered.
       */
      supplierRevisions: {},
      supplierForm: emptySupplierForm(),
      supplierFormError: '',

      items: null,
      selectedItemId: null,
      showArchivedItems: false,

      prices: null,
      /** `{ batchId: fileName }` for imported price rows, or null when the import list is unavailable. */
      batchNames: null,

      loading: false,
      saving: false,
      pricing: false,
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
    // The market is the single source for currency. Passed down so a panel can tell money it CAN
    // print in that currency from money priced in another — it withholds the symbol rather than
    // relabel the amount.
    currency () {
      return (this.marketConfig && this.marketConfig.currency) || null;
    },
    _supplierService () {
      return new MarginSupplierService(this._coreInitializer);
    },
    _ingredientService () {
      return new MarginIngredientService(this._coreInitializer);
    },
    _importService () {
      return new MarginPriceImportService(this._coreInitializer);
    },
    busy () {
      return this.saving || this.pricing || this.loading;
    },
    blocker () {
      if (this.statusState === STATUS_MODULE_OFF) { return this.$i('mrg_module_off'); }
      if (this.statusState === STATUS_UNKNOWN) { return this.$i('mrg_status_unknown'); }
      return '';
    },
    supplierRows () {
      return (this.suppliers || []).map(readSupplierRow);
    },
    selectedSupplier () {
      return this.supplierRows.find(row => row.supplierId === this.selectedSupplierId) || null;
    },
    /** True only while a revision for the selected supplier is held — see `supplierRevisions`. */
    editingSupplier () {
      return !!(this.selectedSupplierId && this.supplierRevisions[this.selectedSupplierId]);
    },
    itemRows () {
      return this.items === null ? null : this.items.map(readSupplierItem);
    },
    selectedItem () {
      return (this.itemRows || []).find(row => row.supplierItemId === this.selectedItemId) || null;
    },
    /**
     * The selected item's INGREDIENT has an incomplete preferred article. Reported at page level
     * because the damage is to the ingredient rather than to the article being looked at: the other
     * suppliers for it are priced and complete and will still not be used.
     */
    preferredBlocker () {
      if (!this.selectedItem) { return null; }
      const siblings = (this.itemRows || []).filter(row => row.ingredientId === this.selectedItem.ingredientId);
      return blockingPreferredItem(siblings);
    },
    /** Only Active ingredients can be pointed at by a new article; archived ones are out of pick-lists. */
    activeIngredients () {
      return ((this.ingredientList && this.ingredientList.ingredients) || [])
        .filter(ingredient => ingredient.status !== 'Archived');
    },
    timeline () {
      return readPriceTimeline(this.prices);
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
      this.resetSelection();

      try {
        const status = await this._supplierService.GetStatus(this.storeId);
        const flags = (status && status.flags) || null;
        if (!flags) { return; }
        // The module master is the ONLY thing that distinguishes "off for this store" from "the
        // read failed": every other route answers the same opaque 404 in both cases, deliberately.
        this.statusState = flags.module === true ? STATUS_ON : STATUS_MODULE_OFF;
        this.priceImportOn = flags.priceImport === true;
      } catch (e) {
        this.statusState = isMarginApiError(e) && e.code === MARGIN_NOT_FOUND ? STATUS_MODULE_OFF : STATUS_UNKNOWN;
        return;
      }

      if (this.statusState !== STATUS_ON) { return; }
      await this.load();
    },

    resetSelection () {
      this.selectedIngredientId = null;
      this.ingredientDetail = null;
      this.selectedSupplierId = null;
      this.selectedItemId = null;
      this.items = null;
      this.prices = null;
      this.supplierForm = emptySupplierForm();
      this.supplierFormError = '';
      // Dropped with the store: a revision belongs to one row of one store's data.
      this.supplierRevisions = {};
    },

    async load () {
      this.loading = true;
      this.ingredientList = null;
      this.suppliers = null;

      const [ingredients, suppliers] = await Promise.all([
        this._ingredientService.ListIngredients(this.storeId, this.showArchivedIngredients).catch((e) => { this.fail(e); return null; }),
        this._supplierService.ListSuppliers(this.storeId, this.showArchivedSuppliers).catch((e) => { this.fail(e); return null; })
      ]);

      this.ingredientList = ingredients && Array.isArray(ingredients.ingredients) ? ingredients : null;
      this.suppliers = Array.isArray(suppliers) ? suppliers : null;
      this.loading = false;

      await this.loadBatchNames();
    },

    /**
     * The file names behind imported price rows. Read ONLY when the stage flag says the surface is
     * on: with it off every import route answers the same opaque 404, and issuing the read anyway
     * would decorate a working page with a failure about a feature the store does not have.
     *
     * A failure here is swallowed on purpose — provenance is a nicety, and its absence degrades to
     * "imported" rather than to an error banner about the price list the venue is reading.
     */
    async loadBatchNames () {
      if (!this.priceImportOn) { this.batchNames = null; return; }
      const response = await this._importService.ListImports(this.storeId).catch(() => null);
      const imports = (response && response.imports) || null;
      if (!Array.isArray(imports)) { this.batchNames = null; return; }
      const names = {};
      for (const batch of imports) {
        if (batch && batch.batchId) { names[batch.batchId] = batch.fileName || null; }
      }
      this.batchNames = names;
    },

    // ---- Ingredients ---------------------------------------------------------------------------

    async selectIngredient (ingredientId) {
      this.selectedIngredientId = ingredientId;
      this.ingredientDetail = null;
      this.failure = '';
      if (!ingredientId) { return; }
      try {
        // The detail read is what carries the REVISION; without it neither save nor archive could
        // be offered. That is also why the editor opens on this response and not on the list row.
        this.ingredientDetail = await this._ingredientService.GetIngredient(this.storeId, ingredientId);
      } catch (e) {
        this.fail(e);
      }
    },

    async toggleArchivedIngredients () {
      this.showArchivedIngredients = !this.showArchivedIngredients;
      this.ingredientList = await this._ingredientService
        .ListIngredients(this.storeId, this.showArchivedIngredients)
        .catch((e) => { this.fail(e); return null; });
    },

    async copyStarter (candidate) {
      await this.runIngredientWrite(() => this._ingredientService.CreateIngredient(this.storeId, {
        name: candidate.name,
        baseUnit: candidate.baseUnit,
        notes: candidate.notes,
        conversions: candidate.suggestedConversions || []
      }));
    },

    async createIngredient (request) {
      await this.runIngredientWrite(() => this._ingredientService.CreateIngredient(this.storeId, request));
    },

    async updateIngredient (payload) {
      await this.runIngredientWrite(() => this._ingredientService.UpdateIngredient(
        this.storeId, payload.detail.ingredientId, payload.detail.revision, payload.request));
    },

    async archiveIngredient (detail) {
      await this.runIngredientWrite(() => this._ingredientService.ArchiveIngredient(
        this.storeId, detail.ingredientId, detail.revision));
    },

    /**
     * Every ingredient write in one place: run it, adopt the returned detail (which carries the NEW
     * revision — reusing the old one would fail the very next save), then re-read the list.
     */
    async runIngredientWrite (write) {
      this.saving = true;
      this.failure = '';
      try {
        const detail = await write();
        if (detail && detail.ingredientId) {
          this.ingredientDetail = detail;
          this.selectedIngredientId = detail.ingredientId;
        }
        this.ingredientList = await this._ingredientService
          .ListIngredients(this.storeId, this.showArchivedIngredients)
          .catch(() => null);
      } catch (e) {
        this.fail(e);
      }
      this.saving = false;
    },

    // ---- Suppliers -----------------------------------------------------------------------------

    supplierMeta (supplier) {
      const parts = [];
      if (supplier.organizationNumber) { parts.push(supplier.organizationNumber); }
      if (supplier.isArchived) { parts.push(this.$i('mrg_sup_archived_badge')); }
      return parts.join(' · ');
    },

    async selectSupplier (supplierId) {
      this.selectedSupplierId = supplierId;
      this.selectedItemId = null;
      this.prices = null;
      this.items = null;
      this.failure = '';
      this.supplierFormError = '';

      const row = this.supplierRows.find(candidate => candidate.supplierId === supplierId) || null;
      // Seeded from the LIST row, which has the name and organisation number but no contact person
      // (the summary does not carry one) and no revision. So the form can be read from, and can only
      // be saved when a revision is held — see `editingSupplier`.
      this.supplierForm = row
        ? { name: row.name || '', organizationNumber: row.organizationNumber || '', contactName: '', contactEmail: '', contactPhone: '' }
        : emptySupplierForm();

      this.items = await this._supplierService.ListItems(this.storeId, supplierId, this.showArchivedItems)
        .catch((e) => { this.fail(e); return null; });
    },

    async toggleArchivedSuppliers () {
      this.showArchivedSuppliers = !this.showArchivedSuppliers;
      this.suppliers = await this._supplierService.ListSuppliers(this.storeId, this.showArchivedSuppliers)
        .catch((e) => { this.fail(e); return null; });
    },

    async saveSupplier () {
      if (!this.supplierForm.name.trim()) { this.supplierFormError = this.$i('mrg_sup_err_name'); return; }
      this.supplierFormError = '';

      const request = {
        name: this.supplierForm.name.trim(),
        organizationNumber: this.supplierForm.organizationNumber.trim() || null,
        contactName: this.supplierForm.contactName.trim() || null,
        contactEmail: this.supplierForm.contactEmail.trim() || null,
        contactPhone: this.supplierForm.contactPhone.trim() || null
      };

      await this.runSupplierWrite(() => (this.editingSupplier
        ? this._supplierService.UpdateSupplier(
          this.storeId, this.selectedSupplierId, this.supplierRevisions[this.selectedSupplierId], request)
        : this._supplierService.CreateSupplier(this.storeId, request)));
    },

    async archiveSupplier () {
      await this.runSupplierWrite(() => this._supplierService.ArchiveSupplier(
        this.storeId, this.selectedSupplierId, this.supplierRevisions[this.selectedSupplierId]));
    },

    async runSupplierWrite (write) {
      this.saving = true;
      this.failure = '';
      try {
        const detail = await write();
        if (detail && detail.supplierId) {
          // The ONE moment a supplier's revision is obtainable. Kept, so the row stays editable for
          // the rest of the session; a reload loses it and the controls withdraw themselves.
          this.$set(this.supplierRevisions, detail.supplierId, detail.revision || null);
          this.selectedSupplierId = detail.supplierId;
          this.supplierForm = {
            name: detail.name || '',
            organizationNumber: detail.organizationNumber || '',
            contactName: detail.contactName || '',
            contactEmail: detail.contactEmail || '',
            contactPhone: detail.contactPhone || ''
          };
        }
        this.suppliers = await this._supplierService.ListSuppliers(this.storeId, this.showArchivedSuppliers).catch(() => null);
        this.items = await this._supplierService.ListItems(this.storeId, this.selectedSupplierId, this.showArchivedItems).catch(() => null);
      } catch (e) {
        this.fail(e);
      }
      this.saving = false;
    },

    // ---- Supplier items ------------------------------------------------------------------------

    async selectItem (supplierItemId) {
      this.selectedItemId = supplierItemId;
      this.prices = null;
      this.failure = '';
      if (!supplierItemId) { return; }
      this.prices = await this._supplierService.GetPrices(this.storeId, supplierItemId)
        .catch((e) => { this.fail(e); return null; });
    },

    async toggleArchivedItems () {
      this.showArchivedItems = !this.showArchivedItems;
      if (!this.selectedSupplierId) { return; }
      this.items = await this._supplierService.ListItems(this.storeId, this.selectedSupplierId, this.showArchivedItems)
        .catch((e) => { this.fail(e); return null; });
    },

    async createItem (request) {
      await this.runItemWrite(() => this._supplierService.CreateItem(this.storeId, this.selectedSupplierId, request));
    },

    async updateItem (payload) {
      await this.runItemWrite(() => this._supplierService.UpdateItem(
        this.storeId, this.selectedSupplierId, payload.item.supplierItemId, payload.item.revision, payload.request));
    },

    /**
     * Item writes re-read the WHOLE list, not just the written row. Marking one article preferred
     * clears the marker on another article of the same ingredient — possibly under a supplier that
     * is not on screen — so a patched single row would leave a second "preferred" badge showing.
     */
    async runItemWrite (write) {
      this.saving = true;
      this.failure = '';
      try {
        const item = await write();
        this.items = await this._supplierService
          .ListItems(this.storeId, this.selectedSupplierId, this.showArchivedItems)
          .catch(() => null);
        if (item && item.supplierItemId) { await this.selectItem(item.supplierItemId); }
      } catch (e) {
        this.fail(e);
      }
      this.saving = false;
    },

    // ---- Prices --------------------------------------------------------------------------------

    /**
     * The response IS the refreshed timeline — the predecessor comes back already closed at the new
     * instant — so nothing is re-read for it. What a failure must not do is leave the old timeline
     * on screen looking accepted, which is why the whole model is replaced or the failure is shown.
     */
    async addPrice (request) {
      this.pricing = true;
      this.failure = '';
      try {
        this.prices = await this._supplierService.AddManualPrice(this.storeId, this.selectedItemId, request);
      } catch (e) {
        this.fail(e);
      }
      this.pricing = false;
    },

    /**
     * Coded `margin.*` failures render translated copy; the uncoded 400s — every business rule on
     * this surface, including the overlap and backdating refusals — render the server's own words.
     * See `~/utils/margin/failure` for why that is the honest choice here and not on the recipes page.
     */
    fail (error) {
      const described = describeMarginFailure(error);
      this.failure = this.$i(described.key, described.params);
    }
  }
};

function emptySupplierForm () {
  return { name: '', organizationNumber: '', contactName: '', contactEmail: '', contactPhone: '' };
}
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
  grid-template-columns: minmax(320px, 1fr) minmax(360px, 1.2fr);
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

.mrg-card__subtitle {
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #292c34;
  margin: 24px 0 12px 0;
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

.mrg-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85em;
  color: #64748b;
  margin-bottom: 12px;
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

.mrg-field { display: block; margin-bottom: 16px; }

.mrg-field__label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85em;
  font-weight: 600;
  color: #292c34;
  text-transform: uppercase;
  letter-spacing: 0.3px;
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

.mrg-field-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}

.mrg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
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

  &--danger {
    background: #fff;
    color: #ef4444;
    border: 2px solid #ef4444;
    font-weight: 500;
  }
}
</style>
