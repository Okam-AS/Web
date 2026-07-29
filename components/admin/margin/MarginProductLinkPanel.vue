<template>
  <section class="mpl">
    <h2 class="mpl__title">
      {{ $i('mrg_links_title') }}
    </h2>
    <p class="mpl__lede">
      {{ $i('mrg_links_lede') }}
    </p>

    <!-- The link read did not answer. Editing from an unknown starting set is the one thing this
         panel must never allow: the save is a REPLACE-SET, so a blank editor would clear every link
         the venue has. -->
    <p v-if="links === null" class="mpl__note" data-test="links-unknown">
      {{ $i('mrg_links_unknown') }}
    </p>

    <template v-else>
      <p v-if="!draft.length" class="mpl__note" data-test="links-empty">
        {{ $i('mrg_links_empty') }}
      </p>

      <div v-for="(row, index) in draft" :key="index" class="mpl__row">
        <select v-model="row.productId" class="mpl__input" :disabled="busy" data-test="link-product">
          <option value="">
            {{ $i('mrg_links_pick') }}
          </option>
          <!-- A product already actively linked to ANOTHER recipe is offered but named as such: the
               backend allows one active link per product and refuses the set outright, so hiding it
               would leave a venue hunting for a dish it can see in the POS. -->
          <option v-for="product in options" :key="product.productId" :value="product.productId">
            {{ optionLabel(product) }}
          </option>
          <!-- A link whose product the catalog no longer has produces no option above. It is kept as
               its own choice so the replace-set does not silently delete it. -->
          <option v-if="isMissingFromCatalog(row.productId)" :value="row.productId">
            {{ $i('mrg_links_product_gone') }}
          </option>
        </select>
        <input
          v-model="row.quantity"
          class="mpl__input mpl__qty"
          type="number"
          min="0"
          step="any"
          :disabled="busy"
          data-test="link-quantity"
        >
        <button class="mpl__remove" :disabled="busy" data-test="link-remove" @click="remove(index)">
          ×
        </button>
      </div>

      <p v-if="error" class="mpl__error" data-test="link-error">
        {{ error }}
      </p>

      <div class="mpl__actions">
        <button class="mrg-btn mrg-btn--ghost" :disabled="busy" data-test="link-add" @click="add">
          {{ $i('mrg_links_add') }}
        </button>
        <button class="mrg-btn" :disabled="busy" data-test="link-save" @click="save">
          {{ saving ? $i('mrg_links_saving') : $i('mrg_links_save') }}
        </button>
      </div>

      <p class="mpl__caveat">
        {{ $i('mrg_links_replace_caveat') }}
      </p>
    </template>
  </section>
</template>

<script>
/**
 * Which dishes a recipe is sold as — the step without which no margin exists.
 *
 * A recipe with no product link has a cost and no price, so `GET /margin/menu-margin` reports it as
 * unsold and withholds every derived figure. This panel is what turns that into a margin, and it is
 * the only writer of `PUT /margin/recipes/{id}/product-links` on the surface.
 *
 * THE SAVE IS A REPLACE-SET, not a delta. Two consequences are load-bearing and both are handled
 * rather than commented around: the editor may not open before the current set is known, and a link
 * pointing at a product the CATALOG no longer holds — which therefore has no option to select — is
 * kept as an explicit choice so saving does not delete it behind the venue's back.
 */
export default {
  name: 'MarginProductLinkPanel',
  props: {
    /** From `readProductLinks`: the recipe's ACTIVE links, or null while the read has not answered. */
    links: {
      type: Array,
      default: null
    },
    /** The store's catalog, taken from the menu-margin answer (Margin owns no product endpoint). */
    products: {
      type: Array,
      default: () => []
    },
    /** The recipe on screen — used to tell "linked here" from "linked to another recipe". */
    recipeId: {
      type: String,
      default: null
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
      draft: [],
      error: ''
    };
  },
  computed: {
    options () {
      return this.products;
    },
    catalogIds () {
      const ids = {};
      for (const product of this.products) { ids[product.productId] = true; }
      return ids;
    }
  },
  watch: {
    // Re-seeded whenever the server's answer changes — including after a save, whose response is the
    // fresh set. The draft is a COPY: editing it must not mutate the read model the rest of the page
    // renders from.
    links: {
      immediate: true,
      handler (value) {
        this.draft = (value || []).map(link => ({
          productId: link.productId,
          quantity: link.quantityPerSoldUnit === null ? '' : String(link.quantityPerSoldUnit)
        }));
        this.error = '';
      }
    }
  },
  methods: {
    optionLabel (product) {
      const name = product.productName || this.$i('mrg_margin_product_unnamed');
      if (product.recipeId && product.recipeId !== this.recipeId) {
        return this.$i('mrg_links_option_taken', { product: name, recipe: product.recipeName || '' });
      }
      return name;
    },

    isMissingFromCatalog (productId) {
      return !!productId && !this.catalogIds[productId];
    },

    add () {
      this.draft.push({ productId: '', quantity: '1' });
    },

    remove (index) {
      this.draft.splice(index, 1);
    },

    /**
     * The same rules the service enforces (`MarginProductLinkService.SetForRecipeAsync`), checked here
     * only so the venue is not made to round-trip for a typo. The server stays authoritative: its
     * refusal renders by `code` whatever this says.
     */
    validate () {
      const seen = {};
      for (const row of this.draft) {
        if (!row.productId) { return this.$i('mrg_links_err_product'); }
        if (seen[row.productId]) { return this.$i('mrg_links_err_duplicate'); }
        seen[row.productId] = true;
        if (!(Number(row.quantity) > 0)) { return this.$i('mrg_links_err_quantity'); }
      }
      return '';
    },

    save () {
      this.error = this.validate();
      if (this.error) { return; }
      this.$emit('save', this.draft.map(row => ({
        productId: row.productId,
        // A number, not the input's string: the wire takes a decimal.
        quantityPerSoldUnit: Number(row.quantity)
      })));
    }
  }
};
</script>

<style lang="scss" scoped>
.mpl {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.mpl__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px 0;
}

.mpl__lede,
.mpl__note {
  font-size: 0.85em;
  color: #64748b;
  margin: 0 0 12px 0;
}

.mpl__row {
  display: grid;
  grid-template-columns: 1fr 90px 32px;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.mpl__input {
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

.mpl__remove {
  background: none;
  border: none;
  font-size: 1.2em;
  color: #ef4444;
  cursor: pointer;
}

.mpl__error {
  font-size: 0.85em;
  color: #92400e;
  margin: 12px 0;
}

.mpl__actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.mpl__caveat {
  margin: 16px 0 0 0;
  font-size: 0.8em;
  font-style: italic;
  color: #64748b;
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
