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

      <!-- CAUSE AND EFFECT. A cost preview is computed on read, so a price entered on the supplier
           page changes this page's answer — but only at the next read, and a venue that fixed the
           prices in another tab would otherwise still be looking at "no line has a price". This
           re-runs the reads, including the selected recipe's own, so the change is visible where
           the complaint was. -->
      <div v-if="!blocker" class="mrg-page__toolbar">
        <button class="mrg-btn mrg-btn--ghost" :disabled="busy" @click="refresh">
          {{ loading ? $i('mrg_refresh_running') : $i('mrg_refresh') }}
        </button>
        <span class="mrg-page__toolbar-note">{{ $i('mrg_refresh_hint') }}</span>
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
                <button v-if="activatable.revision" class="mrg-btn" data-test="activate" :disabled="busy" @click="activate">
                  {{ activating ? $i('mrg_activate_running') : $i('mrg_activate') }}
                </button>
                <p v-else class="mrg-card__note" data-test="no-revision">
                  {{ $i('mrg_activate_no_revision') }}
                </p>
              </div>

              <!-- STEP 6 — the only two things that can happen to a recipe AFTER it went live.
                   An Active version is immutable (R4), so "fix the recipe" is not an edit of what is
                   live: it is a new Draft cloned from it, edited, and activated in its place — which
                   is why this card offers the clone and the editor and leaves activation to the card
                   above, acting on the same draft. Retire is the other exit, and the server offers it
                   only FROM an Active version; there is no route that retires a draft. -->
              <div v-if="selectedRecipeId && detail" class="mrg-card mrg-revise" data-test="revise">
                <h2 class="mrg-card__title">
                  {{ $i('mrg_revise_title') }}
                </h2>

                <template v-if="activeVersion">
                  <!-- `=== null` and not falsiness: a version genuinely numbered 0 is a number and
                       must print as one, while an absent number must not print as "v0". -->
                  <p class="mrg-card__note" data-test="revise-active">
                    {{ activeVersionNumber === null
                      ? $i('mrg_revise_active_unknown')
                      : $i('mrg_revise_active', { number: activeVersionNumber }) }}
                  </p>

                  <!-- Hidden while a draft is open: this surface acts on ONE draft (the highest), so
                       offering a second clone would mint a version nothing on this page can reach. -->
                  <button
                    v-if="!draftForm"
                    class="mrg-btn mrg-btn--ghost"
                    data-test="new-draft"
                    :disabled="busy"
                    @click="newDraft"
                  >
                    {{ drafting ? $i('mrg_revise_new_running') : $i('mrg_revise_new') }}
                  </button>
                </template>
                <p v-else class="mrg-card__note" data-test="revise-no-active">
                  {{ $i('mrg_revise_no_active') }}
                </p>

                <div v-if="draftForm" class="mrg-revise__editor" data-test="draft-editor">
                  <h3 class="mrg-card__subtitle">
                    {{ $i('mrg_revise_edit_title') }}
                  </h3>

                  <div class="mrg-field-row">
                    <label class="mrg-field">
                      <span class="mrg-field__label">{{ $i('mrg_form_yield') }}</span>
                      <input
                        v-model="draftForm.yieldQuantity"
                        class="mrg-field__input"
                        type="number"
                        min="0"
                        step="any"
                        data-test="draft-yield"
                        :disabled="busy"
                      >
                    </label>
                    <label class="mrg-field">
                      <span class="mrg-field__label">{{ $i('mrg_form_yield_unit') }}</span>
                      <select v-model="draftForm.yieldUnit" class="mrg-field__input" data-test="draft-yield-unit" :disabled="busy">
                        <option v-for="unit in baseUnits" :key="unit" :value="unit">
                          {{ $i('mrg_unit_' + unit.toLowerCase()) }}
                        </option>
                      </select>
                    </label>
                    <label class="mrg-field">
                      <span class="mrg-field__label">{{ $i('mrg_form_portions') }}</span>
                      <input
                        v-model="draftForm.portionCount"
                        class="mrg-field__input"
                        type="number"
                        min="1"
                        step="1"
                        data-test="draft-portions"
                        :disabled="busy"
                      >
                    </label>
                  </div>

                  <div v-for="(line, index) in draftForm.components" :key="index" class="mrg-component" data-test="draft-component">
                    <!-- A SUB-RECIPE line is shown and never re-pointed. The editor may remove it, but
                         it cannot turn it into an ingredient: the two cost different things, and a
                         select seeded with an ingredient id would do exactly that on the next save. -->
                    <span v-if="line.subRecipeId" class="mrg-component__sub" data-test="draft-sub-recipe">
                      {{ $i('mrg_revise_sub_recipe') }}
                    </span>
                    <select
                      v-else
                      v-model="line.ingredientId"
                      class="mrg-field__input"
                      data-test="draft-ingredient"
                      :disabled="busy"
                      @change="onIngredientChange(line)"
                    >
                      <option value="">
                        {{ $i('mrg_component_pick') }}
                      </option>
                      <option v-for="ingredient in ingredientOptions" :key="ingredient.ingredientId" :value="ingredient.ingredientId">
                        {{ ingredient.name }}
                      </option>
                    </select>
                    <input
                      v-model="line.quantity"
                      class="mrg-field__input mrg-component__qty"
                      type="number"
                      min="0"
                      step="any"
                      data-test="draft-quantity"
                      :disabled="busy"
                    >
                    <select v-model="line.unitCode" class="mrg-field__input mrg-component__unit" :disabled="busy || !!line.subRecipeId">
                      <option v-for="code in draftUnitOptionsFor(line)" :key="code" :value="code">
                        {{ code }}
                      </option>
                    </select>
                    <button class="mrg-component__remove" data-test="draft-remove" :disabled="busy" @click="removeDraftComponent(index)">
                      ×
                    </button>
                  </div>

                  <button
                    v-if="hasIngredients"
                    class="mrg-btn mrg-btn--ghost"
                    data-test="draft-add"
                    :disabled="busy"
                    @click="addDraftComponent"
                  >
                    {{ $i('mrg_component_add') }}
                  </button>

                  <p v-if="draftError" class="mrg-card__error" data-test="draft-error">
                    {{ draftError }}
                  </p>

                  <button class="mrg-btn" data-test="save-draft" :disabled="busy" @click="saveDraft">
                    {{ savingDraft ? $i('mrg_revise_saving') : $i('mrg_revise_save') }}
                  </button>
                </div>

                <template v-if="activeVersion">
                  <p class="mrg-card__note">
                    {{ $i('mrg_revise_retire_lede') }}
                  </p>
                  <button
                    v-if="activeVersion.revision"
                    class="mrg-btn mrg-btn--danger"
                    data-test="retire"
                    :disabled="busy"
                    @click="retire"
                  >
                    {{ retiring ? $i('mrg_revise_retiring') : $i('mrg_revise_retire') }}
                  </button>
                  <p v-else class="mrg-card__note" data-test="retire-no-revision">
                    {{ $i('mrg_revise_retire_no_revision') }}
                  </p>
                </template>
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
  MARGIN_REVISION_REQUIRED,
  MARGIN_REVISION_INVALID,
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
import { readCostPreview, readRecipeRow, ingredientNames, activatableDraft, numberOrNull } from '~/utils/margin/cost-preview';
import { readMenuMargin, readProductLinks } from '~/utils/margin/menu-margin';
import { BASE_UNITS, unitCodesFor, defaultUnitCodeFor } from '~/utils/margin/units';

const STATUS_UNKNOWN = 'unknown';
const STATUS_MODULE_OFF = 'module-off';
const STATUS_ON = 'on';

/**
 * A wire value as a form string.
 *
 * `String(null)` is `"null"` and `Number(null)` is `0`, and both would put a figure on screen the
 * server never sent — so an absent value seeds an EMPTY field while a genuine `0` seeds `"0"`. The
 * test for falsiness is the bug: `!0` is `true`, so `value || ''` swallows the real zero and the two
 * become indistinguishable in the one place a venue reads them as different facts.
 */
function formValue (value) {
  return value === null || value === undefined ? '' : String(value);
}

/**
 * A wire yield factor, preserved exactly.
 *
 * Null is the legal "no trim loss" and `Number(null)` is `0`, which the server REFUSES — a yield
 * factor must be in (0,1]. Passing a draft through the editor unchanged must therefore not turn its
 * nulls into zeroes, or a save that changed nothing comes back `margin.component-invalid`.
 */
function yieldFactorOrNull (value) {
  return value === null || value === undefined || value === '' ? null : Number(value);
}

// Every `margin.*` code this surface can meet, mapped to copy. Keyed on `code` and never on the
// server's `detail`, which is English prose written for a developer — and never on the STATUS, which
// is why the concurrency split below cost this page nothing: two of its three arms changed status.
//
// A code that is not in this map falls through to `mrg_err_generic` — "Something went wrong. Nothing
// was saved." That sentence is correct for a surprise and wrong for anything a venue could fix, so a
// new server code is not a cosmetic omission here: it turns an instruction into an alarm.
const ERROR_KEYS = {
  [MARGIN_NOT_FOUND]: 'mrg_err_not_found',
  [MARGIN_FORBIDDEN]: 'mrg_err_forbidden',
  // The three concurrency arms, three sentences. `stale` is now unambiguously a lost race — before
  // the backend split it also carried the two cases below, which is why its copy could only say
  // "try again" and never why.
  [MARGIN_STALE_REVISION]: 'mrg_err_stale',
  [MARGIN_REVISION_REQUIRED]: 'mrg_err_revision_required',
  [MARGIN_REVISION_INVALID]: 'mrg_err_revision_invalid',
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
      drafting: false,
      savingDraft: false,
      retiring: false,
      // The open draft editor, or null when the recipe has no draft to edit. Seeded from the
      // SERVER's document by a watcher, never assembled from a mutation response.
      draftForm: null,
      draftError: '',
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
      return this.saving || this.activating || this.linking || this.loading ||
        this.drafting || this.savingDraft || this.retiring;
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
     * The recipe's ACTIVE version, or null.
     *
     * Held as the whole object rather than reached for field by field at the call site for the same
     * reason `activatableDraft` returns one: retire's `If-Match` guards THIS row, and the detail
     * document carries a `revision` one level up under the same name. `this.detail.revision` would
     * compile, read plausibly, and guard the wrong row.
     */
    activeVersion () {
      return (this.detail && this.detail.activeVersion) || null;
    },
    /**
     * The active version's number, or null when the wire did not send one. Null is a real answer and
     * is kept apart from a genuine 0 — `numberOrNull` is the reader that does not collapse them.
     */
    activeVersionNumber () {
      return this.activeVersion ? numberOrNull(this.activeVersion.versionNumber) : null;
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
    storeId () { this.init(); },
    /**
     * The editor follows the SERVER's draft, not the page's memory of it.
     *
     * Every detail read replaces `detail`, so this fires after a clone, a save, an activation and a
     * retire, and the fields are re-seeded from the document the server just returned. A form kept
     * across a mutation is how a stale revision gets resubmitted; re-seeding is how the editor closes
     * by itself when activation turns the draft into the Active version.
     */
    activatable (draft) { this.seedDraftForm(draft); }
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

    /**
     * Re-run every read this page makes, including the selected recipe's own detail.
     *
     * The detail is the point: the cost preview is computed at READ TIME from whatever supplier
     * prices exist at that instant, so the fix for "none of the 3 lines has a price" happens on a
     * different screen and lands here only when this document is fetched again. `load()` alone would
     * refresh the lists and leave the costed recipe showing its old answer.
     */
    async refresh () {
      const selected = this.selectedRecipeId;
      await this.load();
      if (selected) { await this.selectRecipe(selected); }
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

    /**
     * A new Draft cloned from the Active version — the first step of every post-activation fix,
     * because the Active version itself is immutable.
     *
     * The detail is RE-READ rather than patched from the response, which carries the new version
     * only: the recipe's draft list, the row's draft count and the editor's seed all come from the
     * server's document, so the screen after the clone is the server's answer and not this page's
     * reconstruction of it. The menu margin is deliberately NOT re-read — a draft is not active, so
     * nothing a dish earns can have moved.
     */
    async newDraft () {
      if (!this.activeVersion) { return; }
      this.drafting = true;
      this.failure = '';
      try {
        await this._marginService.CreateVersion(this.storeId, this.selectedRecipeId, {});
        this.detail = await this._marginService.GetRecipe(this.storeId, this.selectedRecipeId);
        this.recipes = await this._marginService.ListRecipes(this.storeId).catch(() => null);
      } catch (e) {
        this.fail(e);
      }
      this.drafting = false;
    },

    /**
     * Saves the open draft. The DRAFT's own revision goes in `If-Match` — the same row the activate
     * control guards, and never the recipe header's.
     *
     * The request is the version WHOLE, including the notes this page does not show and the
     * sub-recipe lines it will not re-point, because the server assigns every one of those fields
     * unconditionally: an omission here is a deletion there.
     */
    async saveDraft () {
      const draft = this.activatable;
      if (!draft || !this.draftForm) { return; }

      this.draftError = this.validateDraft();
      if (this.draftError) { return; }

      this.savingDraft = true;
      this.failure = '';
      try {
        await this._marginService.UpdateVersion(
          this.storeId,
          this.selectedRecipeId,
          draft.recipeVersionId,
          this.draftRequest(),
          draft.revision
        );
        this.detail = await this._marginService.GetRecipe(this.storeId, this.selectedRecipeId);
      } catch (e) {
        this.fail(e);
      }
      this.savingDraft = false;
    },

    /**
     * Ends the recipe: the ACTIVE version becomes Retired and the recipe has none.
     *
     * The revision is the ACTIVE VERSION's. Retire is reachable only from an Active version — the
     * server has no route that retires a draft — which is why the control lives behind
     * `activeVersion` and not behind `activatable`.
     *
     * The menu margin IS re-read here, unlike after a draft edit: the read costs the version active
     * at its instant, and after this there is none, so every dish this recipe is sold as loses its
     * cost side. The stale answer would keep showing a margin that no longer has a cost behind it.
     */
    async retire () {
      const active = this.activeVersion;
      if (!active) { return; }
      this.retiring = true;
      this.failure = '';
      try {
        await this._marginService.Retire(this.storeId, this.selectedRecipeId, active.revision);
        this.detail = await this._marginService.GetRecipe(this.storeId, this.selectedRecipeId);
        this.recipes = await this._marginService.ListRecipes(this.storeId).catch(() => null);
        await this.reloadMenuMargin();
      } catch (e) {
        this.fail(e);
      }
      this.retiring = false;
    },

    seedDraftForm (draft) {
      this.draftError = '';
      if (!draft) { this.draftForm = null; return; }

      this.draftForm = {
        yieldQuantity: formValue(draft.yieldQuantity),
        yieldUnit: draft.yieldUnit || '',
        portionCount: formValue(draft.portionCount),
        // CARRIED, NOT SHOWN. `EditDraftAsync` assigns `Notes` on every save, so a body without it
        // blanks a note this surface never offered to edit.
        notes: draft.notes === undefined ? null : draft.notes,
        components: (draft.components || []).map(component => ({
          ingredientId: component.ingredientId || null,
          subRecipeId: component.subRecipeId || null,
          quantity: formValue(component.quantity),
          unitCode: component.unitCode || '',
          yieldFactor: yieldFactorOrNull(component.yieldFactor)
        }))
      };
    },

    /** The version WHOLE, in the shape `MarginEditVersionRequest` binds. */
    draftRequest () {
      return {
        yieldQuantity: Number(this.draftForm.yieldQuantity),
        yieldUnit: this.draftForm.yieldUnit,
        portionCount: Number(this.draftForm.portionCount),
        notes: this.draftForm.notes,
        components: this.draftForm.components.map(line => ({
          ingredientId: line.ingredientId || null,
          subRecipeId: line.subRecipeId || null,
          quantity: Number(line.quantity),
          unitCode: line.unitCode,
          yieldFactor: yieldFactorOrNull(line.yieldFactor)
        }))
      };
    },

    /** The same rules `ValidateVersionInput` applies, checked here only to spare a round trip. */
    validateDraft () {
      const form = this.draftForm;
      if (!(Number(form.yieldQuantity) > 0)) { return this.$i('mrg_err_version_input'); }
      if (!(Number(form.portionCount) > 0)) { return this.$i('mrg_err_version_input'); }
      if (!form.yieldUnit) { return this.$i('mrg_err_version_input'); }
      for (const line of form.components) {
        // EXACTLY one of the two, which is the server's rule and a DB CHECK besides. Both set and
        // neither set are the same refusal.
        if (!!line.ingredientId === !!line.subRecipeId) { return this.$i('mrg_err_component'); }
        if (!(Number(line.quantity) > 0)) { return this.$i('mrg_err_component'); }
        if (!line.unitCode) { return this.$i('mrg_err_component'); }
      }
      return '';
    },

    addDraftComponent () {
      const first = this.ingredientOptions[0];
      this.draftForm.components.push({
        ingredientId: first ? first.ingredientId : '',
        subRecipeId: null,
        quantity: '',
        unitCode: first ? defaultUnitCodeFor(first.baseUnit) : '',
        yieldFactor: null
      });
    },

    removeDraftComponent (index) {
      this.draftForm.components.splice(index, 1);
    },

    /**
     * The unit codes offered for one draft line, always including the line's OWN.
     *
     * A sub-recipe line resolves no ingredient family, and so does a line whose ingredient has since
     * been archived. A select with no matching option renders BLANK, and a blank unit beside a
     * quantity is a wrong statement about the recipe rather than a missing one.
     */
    draftUnitOptionsFor (line) {
      const codes = line.subRecipeId ? [] : this.unitOptionsFor(line);
      if (line.unitCode && !codes.includes(line.unitCode)) { return [line.unitCode].concat(codes); }
      return codes;
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

.mrg-page__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.mrg-page__toolbar-note {
  font-size: 0.8em;
  color: #64748b;
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

  &--danger {
    background: #fff;
    color: #ef4444;
    border: 2px solid #ef4444;
    padding: 10px 16px;
    font-weight: 500;

    &:hover:not(:disabled) {
      background: #ef4444;
      color: #fff;
    }

    &:disabled { background: #fff; color: #cbd5e0; border-color: #e2e8f0; }
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

.mrg-revise { display: grid; gap: 12px; justify-items: start; }

.mrg-revise__editor {
  width: 100%;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

.mrg-component__sub {
  font-size: 0.85em;
  color: #64748b;
  align-self: center;
}
</style>
