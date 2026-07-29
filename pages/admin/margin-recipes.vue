<template>
  <AdminPage full-width @login-success="init">
    <div class="mrg-page">
      <div class="mrg-page__header">
        <h1 class="mrg-page__title">
          {{ $i('mrg_page_title') }}
        </h1>
        <p class="mrg-page__intro">
          {{ $i('mrg_page_intro') }}
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
            <!-- STEP 1 — the ingredient master. A component can only reference an ingredient that
                 exists, so an empty store cannot author anything until this list has something in
                 it. The starter library is the backend's own bootstrap for exactly that. -->
            <section class="mrg-card">
              <h2 class="mrg-card__title">
                {{ $i('mrg_ingredients_title') }}
              </h2>

              <p v-if="ingredients === null" class="mrg-card__note" data-test="ingredients-unknown">
                {{ $i('mrg_ingredients_unknown') }}
              </p>
              <template v-else>
                <p class="mrg-card__note">
                  {{ ingredientCountLabel }}
                </p>

                <div v-if="starterCandidates.length" class="mrg-starters">
                  <p class="mrg-card__note">
                    {{ $i('mrg_starters_lede') }}
                  </p>
                  <button
                    v-for="candidate in starterCandidates"
                    :key="candidate.name"
                    class="mrg-chip"
                    :disabled="busy"
                    @click="copyStarter(candidate)"
                  >
                    + {{ candidate.name }}
                  </button>
                </div>
              </template>
            </section>

            <!-- STEP 2 — enter the recipe. -->
            <section class="mrg-card">
              <h2 class="mrg-card__title">
                {{ $i('mrg_form_title') }}
              </h2>

              <label class="mrg-field">
                <span class="mrg-field__label">{{ $i('mrg_form_name') }}</span>
                <input v-model="form.name" class="mrg-field__input" type="text" :disabled="busy">
              </label>

              <div class="mrg-field-row">
                <label class="mrg-field">
                  <span class="mrg-field__label">{{ $i('mrg_form_yield') }}</span>
                  <input
                    v-model="form.yieldQuantity"
                    class="mrg-field__input"
                    type="number"
                    min="0"
                    step="any"
                    :disabled="busy"
                  >
                </label>
                <label class="mrg-field">
                  <span class="mrg-field__label">{{ $i('mrg_form_yield_unit') }}</span>
                  <select v-model="form.yieldUnit" class="mrg-field__input" :disabled="busy">
                    <option v-for="unit in baseUnits" :key="unit" :value="unit">
                      {{ $i('mrg_unit_' + unit.toLowerCase()) }}
                    </option>
                  </select>
                </label>
                <label class="mrg-field">
                  <span class="mrg-field__label">{{ $i('mrg_form_portions') }}</span>
                  <input
                    v-model="form.portionCount"
                    class="mrg-field__input"
                    type="number"
                    min="1"
                    step="1"
                    :disabled="busy"
                  >
                </label>
              </div>

              <h3 class="mrg-card__subtitle">
                {{ $i('mrg_form_components') }}
              </h3>

              <p v-if="!hasIngredients" class="mrg-card__note" data-test="no-ingredients">
                {{ ingredients === null ? $i('mrg_components_blocked_unknown') : $i('mrg_components_blocked_empty') }}
              </p>

              <template v-else>
                <div v-for="(component, index) in form.components" :key="index" class="mrg-component">
                  <select v-model="component.ingredientId" class="mrg-field__input" :disabled="busy" @change="onIngredientChange(component)">
                    <option value="">
                      {{ $i('mrg_component_pick') }}
                    </option>
                    <option v-for="ingredient in ingredientOptions" :key="ingredient.ingredientId" :value="ingredient.ingredientId">
                      {{ ingredient.name }}
                    </option>
                  </select>
                  <input
                    v-model="component.quantity"
                    class="mrg-field__input mrg-component__qty"
                    type="number"
                    min="0"
                    step="any"
                    :disabled="busy"
                  >
                  <select v-model="component.unitCode" class="mrg-field__input mrg-component__unit" :disabled="busy">
                    <option v-for="code in unitOptionsFor(component)" :key="code" :value="code">
                      {{ code }}
                    </option>
                  </select>
                  <button class="mrg-component__remove" :disabled="busy" @click="removeComponent(index)">
                    ×
                  </button>
                </div>

                <button class="mrg-btn mrg-btn--ghost" :disabled="busy" @click="addComponent">
                  {{ $i('mrg_component_add') }}
                </button>
              </template>

              <p v-if="formError" class="mrg-card__error" data-test="form-error">
                {{ formError }}
              </p>

              <button class="mrg-btn" :disabled="busy" @click="createRecipe">
                {{ saving ? $i('mrg_form_saving') : $i('mrg_form_submit') }}
              </button>
            </section>

            <!-- STEP 3 — the recipes already in the store. -->
            <section class="mrg-card">
              <h2 class="mrg-card__title">
                {{ $i('mrg_list_title') }}
              </h2>
              <p v-if="recipes === null" class="mrg-card__note" data-test="recipes-unknown">
                {{ $i('mrg_list_unknown') }}
              </p>
              <p v-else-if="!recipeRows.length" class="mrg-card__note" data-test="recipes-empty">
                {{ $i('mrg_list_empty') }}
              </p>
              <ul v-else class="mrg-list">
                <li v-for="row in recipeRows" :key="row.recipeId">
                  <button
                    class="mrg-list__item"
                    :class="{ 'is-selected': row.recipeId === selectedRecipeId }"
                    :disabled="busy"
                    @click="selectRecipe(row.recipeId)"
                  >
                    <span class="mrg-list__name">{{ row.name }}</span>
                    <span class="mrg-list__meta">{{ rowMeta(row) }}</span>
                  </button>
                </li>
              </ul>
            </section>
          </div>

          <div class="mrg-page__right">
            <p v-if="!detail && !detailUnknown" class="mrg-card mrg-card__note" data-test="nothing-selected">
              {{ $i('mrg_cost_nothing_selected') }}
            </p>
            <template v-else>
              <MarginCostPanel :cost="cost" :currency="currency" :locale="locale" />

              <!-- STEP 4 — what the dish EARNS, against the price the till would charge. A different
                   read from the cost panel above, and a different version resolution: the cost panel
                   previews the Active version or falls back to the latest Draft, while the menu
                   margin costs only the version active at the read instant. -->
              <MarginMenuMarginPanel
                :menu-margin="menuMargin"
                :recipe-id="selectedRecipeId"
                :recipe-kind="selectedRecipeKind"
                :currency="currency"
                :locale="locale"
              />

              <!-- STEP 5 — and the step without which STEP 4 has nothing to answer: a recipe linked
                   to no product has a cost and no price, so it earns no margin at all. -->
              <MarginProductLinkPanel
                v-if="selectedRecipeId"
                :links="productLinks"
                :products="catalogProducts"
                :recipe-id="selectedRecipeId"
                :busy="busy"
                :saving="linking"
                @save="saveLinks"
              />

              <div v-if="activatable" class="mrg-card mrg-activate">
                <p class="mrg-card__note">
                  {{ $i('mrg_activate_lede', { number: activatable.versionNumber }) }}
                </p>
                <button v-if="activatable.revision" class="mrg-btn" :disabled="busy" @click="activate">
                  {{ activating ? $i('mrg_activate_running') : $i('mrg_activate') }}
                </button>
                <p v-else class="mrg-card__note" data-test="no-revision">
                  {{ $i('mrg_activate_no_revision') }}
                </p>
              </div>
            </template>
          </div>
        </div>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import MarginCostPanel from '~/components/admin/margin/MarginCostPanel.vue';
import MarginMenuMarginPanel from '~/components/admin/margin/MarginMenuMarginPanel.vue';
import MarginProductLinkPanel from '~/components/admin/margin/MarginProductLinkPanel.vue';
import { MarginRecipeService } from '~/utils/margin/recipe-client';
import {
  isMarginApiError,
  MARGIN_NOT_FOUND,
  MARGIN_FORBIDDEN,
  MARGIN_STALE_REVISION,
  MARGIN_RECIPE_NAME_CONFLICT,
  MARGIN_VERSION_INPUT_INVALID,
  MARGIN_COMPONENT_INVALID,
  MARGIN_TOO_MANY_COMPONENTS,
  MARGIN_RECIPE_CYCLE,
  MARGIN_RECIPE_DEPTH_EXCEEDED,
  MARGIN_VERSION_NOT_DRAFT,
  MARGIN_NO_ACTIVE_VERSION,
  MARGIN_PRODUCT_LINK_INVALID
} from '~/utils/margin/api-client';
import { readCostPreview, readRecipeRow, ingredientNames, activatableDraft } from '~/utils/margin/cost-preview';
import { readMenuMargin, readProductLinks } from '~/utils/margin/menu-margin';
import { BASE_UNITS, unitCodesFor, defaultUnitCodeFor } from '~/utils/margin/units';

const STATUS_UNKNOWN = 'unknown';
const STATUS_MODULE_OFF = 'module-off';
const STATUS_ON = 'on';

// Every `margin.*` code this surface can meet, mapped to copy. Keyed on `code` and never on the
// server's `detail`, which is English prose written for a developer.
const ERROR_KEYS = {
  [MARGIN_NOT_FOUND]: 'mrg_err_not_found',
  [MARGIN_FORBIDDEN]: 'mrg_err_forbidden',
  [MARGIN_STALE_REVISION]: 'mrg_err_stale',
  [MARGIN_RECIPE_NAME_CONFLICT]: 'mrg_err_name_conflict',
  [MARGIN_VERSION_INPUT_INVALID]: 'mrg_err_version_input',
  [MARGIN_COMPONENT_INVALID]: 'mrg_err_component',
  [MARGIN_TOO_MANY_COMPONENTS]: 'mrg_err_too_many',
  [MARGIN_RECIPE_CYCLE]: 'mrg_err_cycle',
  [MARGIN_RECIPE_DEPTH_EXCEEDED]: 'mrg_err_depth',
  [MARGIN_VERSION_NOT_DRAFT]: 'mrg_err_not_draft',
  [MARGIN_NO_ACTIVE_VERSION]: 'mrg_err_no_active',
  [MARGIN_PRODUCT_LINK_INVALID]: 'mrg_err_product_link',
  'margin.client-missing-revision': 'mrg_err_missing_revision'
};

/**
 * Enter a recipe, cost it, sell it as a dish, and see what that dish earns.
 *
 * The journey is five steps and each one is a precondition of the next: an ingredient master, a
 * recipe, an active version, a product link, and only then a margin. The page keeps them in that
 * order because a missing step is the usual reason a margin is absent, and a screen that showed the
 * absence without the cause would send a venue looking in the wrong place.
 *
 * NOTHING ON THIS PAGE ADDS MONEY UP OR TAKES IT AWAY. Every figure is one field off the wire — see
 * `utils/margin/cost-preview.js` and `utils/margin/menu-margin.js`, where the reasons are written out
 * in full. In particular the contribution is not `net − plate` computed here, even though it looks
 * like it: the backend rounds once, and a margin that disagrees with the till is the one number
 * nobody may print.
 */
export default {
  name: 'MarginRecipesPage',
  components: { AdminPage, MarginCostPanel, MarginMenuMarginPanel, MarginProductLinkPanel },
  data () {
    return {
      statusState: STATUS_UNKNOWN,
      // null means UNKNOWN — the read has not answered. It is never initialised to `[]`, which
      // would render a failed read as "this store has no recipes".
      recipes: null,
      ingredients: null,
      // The store-wide menu-margin answer, read once per load. Null means UNKNOWN for the same reason
      // as the two above: a failed read must not render as "no dish earns anything".
      menuMargin: null,
      // The selected recipe's ACTIVE product links, null while unknown. The link editor refuses to
      // open on an unknown set, because its save is a replace-set.
      productLinks: null,
      selectedRecipeId: null,
      detail: null,
      detailUnknown: false,
      saving: false,
      activating: false,
      linking: false,
      loading: false,
      failure: '',
      formError: '',
      form: {
        name: '',
        yieldQuantity: '1',
        yieldUnit: 'Kilogram',
        portionCount: '10',
        components: []
      },
      baseUnits: BASE_UNITS
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
    // The market is the single source for currency, and it is what `priceLabel` formats in. Passed
    // down so the panel can tell money it CAN print in that currency from money the backend priced
    // in another — it withholds the symbol rather than relabel the amount.
    currency () {
      return (this.marketConfig && this.marketConfig.currency) || null;
    },
    _marginService () {
      return new MarginRecipeService(this._coreInitializer);
    },
    busy () {
      return this.saving || this.activating || this.linking || this.loading;
    },
    blocker () {
      if (this.statusState === STATUS_MODULE_OFF) { return this.$i('mrg_module_off'); }
      if (this.statusState === STATUS_UNKNOWN) { return this.$i('mrg_status_unknown'); }
      return '';
    },
    recipeRows () {
      return (this.recipes || []).map(readRecipeRow);
    },
    ingredientOptions () {
      return (this.ingredients && this.ingredients.ingredients) || [];
    },
    hasIngredients () {
      return this.ingredientOptions.length > 0;
    },
    starterCandidates () {
      return (this.ingredients && this.ingredients.starterCandidates) || [];
    },
    ingredientCountLabel () {
      return this.ingredientOptions.length
        ? this.$i('mrg_ingredients_count', { count: this.ingredientOptions.length })
        : this.$i('mrg_ingredients_empty');
    },
    cost () {
      return readCostPreview(this.detail, ingredientNames(this.ingredients));
    },
    /** The latest Draft, when there is one. Its OWN revision is what activation must carry. */
    activatable () {
      return activatableDraft(this.detail);
    },
    /**
     * The store's product catalog, taken from the menu-margin answer — the module owns no product
     * endpoint of its own, and that answer already carries every product with its name, goods group
     * and current recipe claim.
     */
    catalogProducts () {
      return (this.menuMargin && this.menuMargin.products) || [];
    },
    /**
     * `Sellable` or `Component`. A component recipe is deliberately left out of the read's unsold
     * list, so without this the margin panel could not tell "nobody sells this dish" from "this is
     * not a dish".
     */
    selectedRecipeKind () {
      const row = this.recipeRows.find(r => r.recipeId === this.selectedRecipeId);
      return row ? row.kind : null;
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
      this.detail = null;
      this.detailUnknown = false;
      this.selectedRecipeId = null;
      this.productLinks = null;

      try {
        const status = await this._marginService.GetStatus(this.storeId);
        const flags = (status && status.flags) || null;
        if (!flags) { return; }
        // The module master is the ONLY thing that distinguishes "off for this store" from "the
        // read failed": every other route answers the same opaque 404 in both cases, deliberately.
        this.statusState = flags.module === true ? STATUS_ON : STATUS_MODULE_OFF;
      } catch (e) {
        // A 404 here is the module being invisible; anything else leaves the status unknown, and
        // the page says it does not know rather than claiming the module is off.
        this.statusState = isMarginApiError(e) && e.code === MARGIN_NOT_FOUND ? STATUS_MODULE_OFF : STATUS_UNKNOWN;
        return;
      }

      // Only when the gate actually opened. With the module off every route answers the same opaque
      // 404, so loading anyway would issue two reads that cannot succeed and would decorate a
      // deliberate "this module is off" screen with a failure banner about it.
      if (this.statusState !== STATUS_ON) { return; }
      await this.load();
    },

    async load () {
      this.loading = true;
      // Cleared to unknown, not to empty: an in-flight or failed read must not render as an empty
      // store, which is a different claim.
      this.recipes = null;
      this.ingredients = null;
      this.menuMargin = null;

      const [recipes, ingredients, menuMargin] = await Promise.all([
        this._marginService.ListRecipes(this.storeId).catch((e) => { this.fail(e); return null; }),
        // The ingredient list is what NAMES the cost lines. A failure leaves it null and the panel
        // says the names are unknown, rather than claiming the ingredients are gone.
        this._marginService.ListIngredients(this.storeId).catch(() => null),
        // The margin read. A failure leaves the model in its UNKNOWN state and the panel says the
        // read did not answer — never that a dish earns nothing.
        this._marginService.GetMenuMargin(this.storeId).catch(() => null)
      ]);

      this.recipes = Array.isArray(recipes) ? recipes : null;
      this.ingredients = ingredients && Array.isArray(ingredients.ingredients) ? ingredients : null;
      this.menuMargin = readMenuMargin(menuMargin);
      this.loading = false;
    },

    /** Re-read after anything that can move a margin: an activation, or a link change. */
    async reloadMenuMargin () {
      const response = await this._marginService.GetMenuMargin(this.storeId).catch(() => null);
      this.menuMargin = readMenuMargin(response);
    },

    async selectRecipe (recipeId) {
      this.selectedRecipeId = recipeId;
      this.detail = null;
      this.detailUnknown = true;
      this.productLinks = null;
      this.failure = '';
      try {
        this.detail = await this._marginService.GetRecipe(this.storeId, recipeId);
      } catch (e) {
        this.fail(e);
      }
      await this.loadLinks(recipeId);
    },

    /**
     * The recipe's own link set, read separately from the menu margin ON PURPOSE: the menu margin is
     * built from the catalog, so a link pointing at a product the catalog no longer has produces no
     * row there. Seeding the editor from the menu margin would make the next replace-set save delete
     * that link without anyone seeing it.
     */
    async loadLinks (recipeId) {
      const response = await this._marginService.GetProductLinks(this.storeId, recipeId).catch(() => null);
      // Null on failure, so the editor stays shut rather than opening on an empty set it would then
      // offer to save over the real one.
      this.productLinks = readProductLinks(response);
    },

    /**
     * The replace-set save. Its response IS the fresh link set, so nothing is re-read for the editor
     * — but the menu margin is, because linking a dish is exactly what turns "no margin" into one.
     */
    async saveLinks (links) {
      this.linking = true;
      this.failure = '';
      try {
        const response = await this._marginService.SetProductLinks(this.storeId, this.selectedRecipeId, links);
        this.productLinks = readProductLinks(response);
        this.recipes = await this._marginService.ListRecipes(this.storeId).catch(() => null);
        await this.reloadMenuMargin();
      } catch (e) {
        this.fail(e);
      }
      this.linking = false;
    },

    addComponent () {
      const first = this.ingredientOptions[0];
      this.form.components.push({
        ingredientId: first ? first.ingredientId : '',
        quantity: '',
        unitCode: first ? defaultUnitCodeFor(first.baseUnit) : ''
      });
    },

    removeComponent (index) {
      this.form.components.splice(index, 1);
    },

    onIngredientChange (component) {
      const ingredient = this.ingredientOptions.find(i => i.ingredientId === component.ingredientId);
      component.unitCode = ingredient ? defaultUnitCodeFor(ingredient.baseUnit) : '';
    },

    /**
     * The codes offered for one line: the universal units of the chosen ingredient's base-unit
     * family, which the backend converts without a venue-authored conversion. An ingredient whose
     * base unit is not one it recognises offers NONE rather than a guessed family.
     */
    unitOptionsFor (component) {
      const ingredient = this.ingredientOptions.find(i => i.ingredientId === component.ingredientId);
      return ingredient ? unitCodesFor(ingredient.baseUnit) : [];
    },

    async copyStarter (candidate) {
      this.saving = true;
      this.failure = '';
      try {
        await this._marginService.CreateIngredient(this.storeId, {
          name: candidate.name,
          baseUnit: candidate.baseUnit,
          notes: candidate.notes,
          conversions: candidate.suggestedConversions || []
        });
        this.ingredients = await this._marginService.ListIngredients(this.storeId);
      } catch (e) {
        this.fail(e);
      }
      this.saving = false;
    },

    /**
     * The same rules the service enforces (`MarginRecipeService.ValidateVersionInput`), checked here
     * only so the venue is not made to round-trip for a typo. The server stays authoritative: its
     * refusal is rendered by `code` whatever this says.
     */
    validate () {
      if (!this.form.name.trim()) { return this.$i('mrg_err_version_input'); }
      if (!(Number(this.form.yieldQuantity) > 0)) { return this.$i('mrg_err_version_input'); }
      if (!(Number(this.form.portionCount) > 0)) { return this.$i('mrg_err_version_input'); }
      for (const component of this.form.components) {
        if (!component.ingredientId) { return this.$i('mrg_err_component'); }
        if (!(Number(component.quantity) > 0)) { return this.$i('mrg_err_component'); }
        if (!component.unitCode) { return this.$i('mrg_err_component'); }
      }
      return '';
    },

    async createRecipe () {
      this.formError = this.validate();
      if (this.formError) { return; }

      this.saving = true;
      this.failure = '';
      const request = {
        name: this.form.name.trim(),
        kind: 'Sellable',
        initialVersion: {
          yieldQuantity: Number(this.form.yieldQuantity),
          yieldUnit: this.form.yieldUnit,
          portionCount: Number(this.form.portionCount),
          components: this.form.components.map(component => ({
            ingredientId: component.ingredientId,
            quantity: Number(component.quantity),
            unitCode: component.unitCode
          }))
        }
      };

      try {
        // The create answers with the FULL detail document, cost preview included — one round trip
        // from "entered" to "costed". Nothing is re-read here.
        const detail = await this._marginService.CreateRecipe(this.storeId, request);
        this.detail = detail;
        this.detailUnknown = false;
        this.selectedRecipeId = detail && detail.recipeId;
        this.form.name = '';
        this.form.components = [];
        this.recipes = await this._marginService.ListRecipes(this.storeId).catch(() => null);
        // A brand-new recipe is sold by nobody, and the read is what SAYS so. Without this re-read the
        // margin panel would fall through to "no rows", which is the state that means we cannot
        // explain the absence — here we can.
        await this.loadLinks(this.selectedRecipeId);
        await this.reloadMenuMargin();
      } catch (e) {
        this.fail(e);
      }
      this.saving = false;
    },

    /**
     * Draft → Active. The DRAFT's revision goes in `If-Match`; the recipe header carries a field of
     * the same name one level up and sending that one would guard the wrong row.
     *
     * The detail is re-read afterwards rather than patched from the activate response, which carries
     * the version only: the cost preview switches from previewing the draft to costing the Active
     * version, and that is a different document.
     */
    async activate () {
      const draft = this.activatable;
      if (!draft) { return; }
      this.activating = true;
      this.failure = '';
      try {
        await this._marginService.ActivateVersion(this.storeId, this.selectedRecipeId, draft.recipeVersionId, draft.revision);
        this.detail = await this._marginService.GetRecipe(this.storeId, this.selectedRecipeId);
        this.recipes = await this._marginService.ListRecipes(this.storeId).catch(() => null);
        // The menu margin costs the version ACTIVE at the read instant, so before this activation it
        // had no cost side for this recipe at all. It has one now, and the old answer would still be
        // showing a dash.
        await this.reloadMenuMargin();
      } catch (e) {
        this.fail(e);
      }
      this.activating = false;
    },

    rowMeta (row) {
      const parts = [];
      parts.push(row.activeVersionNumber === null
        ? this.$i('mrg_row_no_active')
        : this.$i('mrg_row_active', { number: row.activeVersionNumber }));
      if (row.draftVersionCount) { parts.push(this.$i('mrg_row_drafts', { count: row.draftVersionCount })); }
      parts.push(row.activeProductLinkCount
        ? this.$i('mrg_row_linked', { count: row.activeProductLinkCount })
        : this.$i('mrg_row_unlinked'));
      return parts.join(' · ');
    },

    fail (error) {
      const key = isMarginApiError(error) ? ERROR_KEYS[error.code] : null;
      this.failure = key ? this.$i(key) : this.$i('mrg_err_generic');
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
  margin: 20px 0 12px 0;
}

.mrg-card__note {
  font-size: 0.85em;
  color: #64748b;
  margin: 0 0 12px 0;
}

.mrg-card__error {
  font-size: 0.85em;
  color: #92400e;
  margin: 12px 0;
}

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
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.mrg-component {
  display: grid;
  grid-template-columns: 1fr 90px 90px 32px;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.mrg-component__remove {
  background: none;
  border: none;
  font-size: 1.2em;
  color: #ef4444;
  cursor: pointer;
}

.mrg-btn {
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
    padding: 10px 16px;
    font-weight: 500;
  }
}

.mrg-chip {
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 6px 10px;
  margin: 0 6px 6px 0;
  font-size: 0.85em;
  color: #292c34;
  cursor: pointer;

  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.mrg-list { list-style: none; margin: 0; padding: 0; }

.mrg-list__item {
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

.mrg-list__name {
  display: block;
  font-weight: 600;
  color: #292c34;
}

.mrg-list__meta {
  display: block;
  font-size: 0.8em;
  color: #64748b;
}

.mrg-activate { display: grid; gap: 12px; justify-items: start; }
</style>
