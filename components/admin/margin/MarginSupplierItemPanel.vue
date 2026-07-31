<template>
  <section class="mrg-card">
    <h2 class="mrg-card__title">
      {{ $i('mrg_item_title') }}
    </h2>

    <p v-if="!supplier" class="mrg-card__note" data-test="items-no-supplier">
      {{ $i('mrg_item_no_supplier') }}
    </p>

    <template v-else>
      <p class="mrg-card__note">
        {{ $i('mrg_item_lede', { supplier: supplier.name || $i('mrg_sup_unnamed') }) }}
      </p>

      <p v-if="items === null" class="mrg-card__note" data-test="items-unknown">
        {{ $i('mrg_item_unknown') }}
      </p>

      <template v-else>
        <label class="mrg-check">
          <input type="checkbox" :checked="showArchived" :disabled="busy" @change="$emit('toggle-archived')">
          <span>{{ $i('mrg_item_show_archived') }}</span>
        </label>

        <p v-if="!items.length" class="mrg-card__note" data-test="items-empty">
          {{ $i('mrg_item_empty') }}
        </p>
        <ul v-else class="mrg-list">
          <li v-for="item in items" :key="item.supplierItemId">
            <button
              class="mrg-list__item"
              :class="{ 'is-selected': item.supplierItemId === selectedItemId }"
              :disabled="busy"
              @click="$emit('select', item.supplierItemId)"
            >
              <span class="mrg-list__name">
                {{ item.name || $i('mrg_item_unnamed') }}
                <span v-if="item.isPreferred" class="mrg-badge mrg-badge--preferred">{{ $i('mrg_item_preferred_badge') }}</span>
                <span v-if="item.isArchived" class="mrg-badge">{{ $i('mrg_item_archived_badge') }}</span>
              </span>
              <span class="mrg-list__meta">{{ rowMeta(item) }}</span>
              <!-- The flag that decides whether any price on this article ever reaches a plate
                   cost. Rendered on the row, not hidden in the form, because the row is where a
                   venue looks when a recipe says it has no prices. -->
              <span v-if="cannotCost(item)" class="mrg-list__flag" data-test="item-incomplete-flag">
                {{ missingLabel(item) }}
              </span>
            </button>
          </li>
        </ul>
      </template>

      <h3 class="mrg-card__subtitle">
        {{ editing ? $i('mrg_item_edit_title') : $i('mrg_item_create_title') }}
      </h3>

      <p v-if="!ingredients.length" class="mrg-card__note" data-test="items-no-ingredients">
        {{ $i('mrg_item_needs_ingredient') }}
      </p>

      <template v-else>
        <label class="mrg-field">
          <span class="mrg-field__label">{{ $i('mrg_item_ingredient') }}</span>
          <select v-model="form.ingredientId" class="mrg-field__input" :disabled="busy">
            <option value="">
              {{ $i('mrg_item_pick_ingredient') }}
            </option>
            <option v-for="ingredient in ingredients" :key="ingredient.ingredientId" :value="ingredient.ingredientId">
              {{ ingredient.name }}
            </option>
          </select>
          <span class="mrg-field__hint">{{ $i('mrg_item_ingredient_hint') }}</span>
        </label>

        <div class="mrg-field-row">
          <label class="mrg-field">
            <span class="mrg-field__label">{{ $i('mrg_item_name') }}</span>
            <input v-model="form.name" class="mrg-field__input" type="text" :disabled="busy">
          </label>
          <label class="mrg-field">
            <span class="mrg-field__label">{{ $i('mrg_item_article_number') }}</span>
            <input v-model="form.supplierArticleNumber" class="mrg-field__input" type="text" :disabled="busy">
            <span class="mrg-field__hint">{{ $i('mrg_item_article_hint') }}</span>
          </label>
        </div>

        <div class="mrg-field-row">
          <label class="mrg-field">
            <span class="mrg-field__label">{{ $i('mrg_item_pack_size') }}</span>
            <input v-model="form.packSize" class="mrg-field__input" type="text" inputmode="decimal" :disabled="busy">
            <span class="mrg-field__hint">{{ $i('mrg_item_pack_size_hint') }}</span>
          </label>
          <label class="mrg-field">
            <span class="mrg-field__label">{{ $i('mrg_item_purchase_unit') }}</span>
            <input v-model="form.purchaseUnitCode" class="mrg-field__input" type="text" :disabled="busy">
          </label>
          <label class="mrg-field">
            <span class="mrg-field__label">{{ $i('mrg_item_factor') }}</span>
            <input v-model="form.purchaseUnitToBaseFactor" class="mrg-field__input" type="text" inputmode="decimal" :disabled="busy">
            <span class="mrg-field__hint">{{ factorHint }}</span>
          </label>
        </div>

        <label class="mrg-check">
          <input v-model="form.isPreferred" type="checkbox" :disabled="busy">
          <span>{{ $i('mrg_item_preferred') }}</span>
        </label>
        <p class="mrg-card__note">
          {{ $i('mrg_item_preferred_hint') }}
        </p>

        <p v-if="formError" class="mrg-card__error" data-test="item-form-error">
          {{ formError }}
        </p>

        <div class="mrg-actions">
          <button class="mrg-btn" :disabled="busy || !canSubmit" @click="submit">
            {{ saving ? $i('mrg_item_saving') : (editing ? $i('mrg_item_save') : $i('mrg_item_create')) }}
          </button>
          <button v-if="editing" class="mrg-btn mrg-btn--ghost" :disabled="busy" @click="$emit('select', null)">
            {{ $i('mrg_item_cancel_edit') }}
          </button>
          <p v-if="editing && !selectedItem.revision" class="mrg-card__note" data-test="item-no-revision">
            {{ $i('mrg_item_no_revision') }}
          </p>
        </div>
      </template>
    </template>
  </section>
</template>

<script>
import { ITEM_INCOMPLETE } from '~/utils/margin/supplier-model';

/**
 * One supplier's articles: what the supplier sells, which ingredient each one is, and — the part
 * that decides whether any of it ever reaches a plate cost — the pack size and the conversion.
 *
 * THE TRAP THIS PANEL EXISTS TO CLOSE. `packSize` and `purchaseUnitToBaseFactor` are optional on the
 * wire. An item saved without them is accepted, listed, and can be given prices; it just never costs
 * anything, because `MarginPriceResolver` drops it from the candidate set. And if such an item is
 * the PREFERRED one for its ingredient, the resolver returns no price for that ingredient at all
 * rather than falling through to a complete rival — so one incomplete article can un-price an
 * ingredient that has two perfectly good priced suppliers. Both facts are on the row and in the form.
 *
 * NO ARCHIVE CONTROL: the module has no archive endpoint for supplier items (only for suppliers and
 * ingredients), so there is none to offer. Archived items are still LISTED, because
 * `includeArchived=true` returns them and their history is real.
 */
export default {
  name: 'MarginSupplierItemPanel',
  props: {
    /** The selected supplier's rows (`readSupplierItem`), or null while unknown. */
    items: {
      type: Array,
      default: null
    },
    /** The store's ingredient summaries — an item must point at exactly one of them. */
    ingredients: {
      type: Array,
      default: () => []
    },
    supplier: {
      type: Object,
      default: null
    },
    selectedItemId: {
      type: String,
      default: null
    },
    showArchived: {
      type: Boolean,
      default: false
    },
    busy: {
      type: Boolean,
      default: false
    },
    saving: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      formError: '',
      form: emptyForm()
    };
  },
  computed: {
    selectedItem () {
      return (this.items || []).find(item => item.supplierItemId === this.selectedItemId) || null;
    },
    editing () {
      return !!this.selectedItem;
    },
    /**
     * An edit needs the row's revision. Items carry one on every list row, so this is normally true
     * — but under a provider that generates no rowversion it is null, and then the write would be
     * refused before it left (`MarginMissingRevisionError`). The button is withheld and the reason
     * is printed, rather than offering a control that cannot work.
     */
    canSubmit () {
      return !this.editing || !!this.selectedItem.revision;
    },
    factorHint () {
      const ingredient = this.ingredients.find(candidate => candidate.ingredientId === this.form.ingredientId);
      return ingredient
        ? this.$i('mrg_item_factor_hint', { base: this.$i('mrg_unit_' + String(ingredient.baseUnit).toLowerCase()) })
        : this.$i('mrg_item_factor_hint_generic');
    }
  },
  watch: {
    selectedItem: {
      immediate: true,
      handler (item) {
        this.formError = '';
        this.form = item
          ? {
            ingredientId: item.ingredientId || '',
            name: item.name || '',
            supplierArticleNumber: item.supplierArticleNumber || '',
            packSize: item.packSize === null ? '' : String(item.packSize),
            purchaseUnitCode: item.purchaseUnitCode || '',
            purchaseUnitToBaseFactor: item.purchaseUnitToBaseFactor === null ? '' : String(item.purchaseUnitToBaseFactor),
            isPreferred: item.isPreferred
          }
          : emptyForm();
      }
    },
    // A different supplier is a different article list; the half-typed article of the previous one
    // must not be submitted against it.
    supplier () {
      this.form = emptyForm();
      this.formError = '';
    }
  },
  methods: {
    cannotCost (item) {
      return item.costState === ITEM_INCOMPLETE;
    },

    rowMeta (item) {
      const parts = [];
      if (item.supplierArticleNumber) { parts.push(this.$i('mrg_item_article_meta', { number: item.supplierArticleNumber })); }
      parts.push(this.ingredientName(item.ingredientId));
      if (item.packSize !== null && item.purchaseUnitCode) {
        parts.push(this.$i('mrg_item_pack_meta', { size: item.packSize, unit: item.purchaseUnitCode }));
      }
      return parts.join(' · ');
    },

    ingredientName (ingredientId) {
      const ingredient = this.ingredients.find(candidate => candidate.ingredientId === ingredientId);
      // Two different refusals kept apart: the list answered and does not contain this id (archived,
      // or removed since), versus no ingredient list at all.
      if (ingredient) { return ingredient.name || this.$i('mrg_ing_unnamed'); }
      return this.ingredients.length ? this.$i('mrg_item_ingredient_gone') : this.$i('mrg_item_ingredient_unknown');
    },

    missingLabel (item) {
      if (item.missingPackSize && item.missingFactor) { return this.$i('mrg_item_missing_both'); }
      return item.missingPackSize ? this.$i('mrg_item_missing_pack') : this.$i('mrg_item_missing_factor');
    },

    submit () {
      if (!this.form.ingredientId) { this.formError = this.$i('mrg_item_err_ingredient'); return; }
      if (!this.form.name.trim()) { this.formError = this.$i('mrg_item_err_name'); return; }

      const packSize = optionalNumber(this.form.packSize);
      const factor = optionalNumber(this.form.purchaseUnitToBaseFactor);
      if (packSize === false || factor === false) { this.formError = this.$i('mrg_item_err_quantity'); return; }

      this.formError = '';
      const request = {
        ingredientId: this.form.ingredientId,
        name: this.form.name.trim(),
        supplierArticleNumber: this.form.supplierArticleNumber.trim() || null,
        packSize,
        purchaseUnitCode: this.form.purchaseUnitCode.trim() || null,
        purchaseUnitToBaseFactor: factor,
        isPreferred: this.form.isPreferred
      };

      if (this.editing) {
        this.$emit('update', { item: this.selectedItem, request });
      } else {
        this.$emit('create', request);
      }
    }
  }
};

function emptyForm () {
  return {
    ingredientId: '',
    name: '',
    supplierArticleNumber: '',
    packSize: '',
    purchaseUnitCode: '',
    purchaseUnitToBaseFactor: '',
    isPreferred: false
  };
}

/**
 * `null` for a blank field, a positive number for a good one, and `false` for input that is neither
 * — kept distinct because null is a legitimate value the server accepts (an item without a reviewed
 * pack size) while a typo is not, and collapsing the two would save "abc" as "no pack size".
 */
function optionalNumber (raw) {
  const text = String(raw === null || raw === undefined ? '' : raw).trim();
  if (!text.length) { return null; }
  const value = Number(text.replace(',', '.'));
  return isFinite(value) && value > 0 ? value : false;
}
</script>

<style lang="scss" scoped>
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

.mrg-list__flag {
  display: block;
  font-size: 0.8em;
  color: #92400e;
}

.mrg-badge {
  display: inline-block;
  margin-left: 6px;
  font-size: 0.7em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 2px 6px;
  border-radius: 6px;
  background: #f1f5f9;
  color: #64748b;

  &--preferred { background: rgba(27, 183, 118, 0.12); color: #159f63; }
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

.mrg-field-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
}

.mrg-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
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
</style>
