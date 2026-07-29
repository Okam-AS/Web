<template>
  <section class="mmg">
    <header class="mmg__head">
      <h2 class="mmg__title">
        {{ $i('mrg_margin_title') }}
      </h2>
      <span v-if="menuMargin && menuMargin.pricedAt" class="mmg__meta">{{ $i('mrg_cost_priced_at', { time: pricedAtLabel }) }}</span>
    </header>

    <!-- The read did not answer. NOT "this dish earns nothing" and NOT "it is not on the menu" — the
         two states below are claims about the dish, and this one is a claim about the read. -->
    <p v-if="isUnknown" class="mmg__notice mmg__notice--plain" data-test="mm-unknown">
      {{ $i('mrg_margin_read_unknown') }}
    </p>

    <!-- A sub-recipe is a component of other recipes by design. It has a cost and no menu price of
         its own, and the backend leaves it out of the unsold list for exactly that reason. -->
    <p v-else-if="isSubRecipe" class="mmg__notice mmg__notice--plain" data-test="mm-sub-recipe">
      {{ $i('mrg_margin_sub_recipe') }}
    </p>

    <!-- Named by the read itself: a sellable recipe with no active product link. It has a cost and no
         price, so it carries no margin — which is a fact about the venue's setup, not an unknown. -->
    <p v-else-if="isUnsold" class="mmg__notice mmg__notice--warn" data-test="mm-unsold">
      {{ $i('mrg_margin_unsold') }}
    </p>

    <div v-else>
      <!-- The read answered, this recipe is neither unsold nor a component, and yet no dish carries
           it. That combination is not something to invent a story about. -->
      <p v-if="!dishes.length" class="mmg__notice mmg__notice--plain" data-test="mm-absent">
        {{ $i('mrg_margin_no_rows') }}
      </p>

      <div v-for="dish in dishes" :key="dish.productId" class="mmg__dish" data-test="mm-dish">
        <div class="mmg__dish-head">
          <span class="mmg__dish-name">{{ dish.productName || $i('mrg_margin_product_unnamed') }}</span>
          <span v-if="dish.goodsGroupName" class="mmg__dish-group">{{ dish.goodsGroupName }}</span>
          <span v-if="dish.productHidden" class="mmg__flag" data-test="mm-hidden">{{ $i('mrg_margin_product_hidden') }}</span>
          <span v-if="dish.linkBroken" class="mmg__flag" data-test="mm-broken">{{ $i('mrg_margin_link_broken') }}</span>
        </div>
        <p v-if="dish.quantityPerSoldUnit !== null" class="mmg__dish-qty">
          {{ $i('mrg_margin_qty_per_unit', { quantity: number(dish.quantityPerSoldUnit) }) }}
        </p>

        <table class="mmg__table">
          <thead>
            <tr>
              <th>{{ $i('mrg_margin_col_basis') }}</th>
              <th class="mmg__num">
                {{ $i('mrg_margin_col_net') }}
              </th>
              <th class="mmg__num">
                {{ $i('mrg_margin_col_plate') }}
              </th>
              <th class="mmg__num">
                {{ $i('mrg_margin_col_contribution') }}
              </th>
              <th class="mmg__num">
                {{ $i('mrg_margin_col_food_cost') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- The basis travels WITH the figures, never above them as a heading somebody scrolls
                 past: servering and take-away carry different VAT, so a food-cost percent without its
                 basis is not a number. -->
            <tr v-for="row in dish.bases" :key="row.priceBasis" data-test="mm-row" :data-basis="row.priceBasis">
              <td>
                <span class="mmg__basis">{{ basisLabel(row) }}</span>
                <span v-if="row.vatPercent !== null" class="mmg__basis-vat">{{ $i('mrg_margin_vat', { percent: row.vatPercent }) }}</span>
              </td>
              <td class="mmg__num" data-test="mm-net">
                {{ netLabel(row) }}
                <span v-if="row.depositMinor" class="mmg__sub" data-test="mm-deposit">{{ $i('mrg_margin_deposit', { amount: amount(row.depositMinor, wireCurrency) }) }}</span>
              </td>
              <td class="mmg__num" data-test="mm-plate" :data-plate-state="row.plateState">
                {{ plateLabel(row) }}
              </td>
              <td class="mmg__num" data-test="mm-contribution">
                {{ contributionLabel(row) }}
              </td>
              <td class="mmg__num" data-test="mm-food-cost">
                {{ foodCostLabel(row) }}
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Said under the row that withheld something, and naming EVERY reason rather than the
             first: a dish that is neither priced nor fully costed has two things wrong with it and a
             venue has to fix both. -->
        <p v-for="row in withheldRows(dish)" :key="'why-' + row.priceBasis" class="mmg__why" data-test="mm-withheld">
          {{ $i('mrg_margin_withheld', { basis: basisLabel(row), reasons: blockerText(row) }) }}
        </p>
      </div>
    </div>
  </section>
</template>

<script>
import { marginMoney } from '~/utils/margin/money';
import {
  MENU_MARGIN_UNKNOWN,
  PLATE_ABSENT,
  PLATE_FLOOR,
  BLOCKED_NO_PRICE,
  BLOCKED_NO_COST,
  BLOCKED_COST_INCOMPLETE,
  BASIS_BASE,
  BASIS_TABLE,
  BASIS_DELIVERY,
  dishesForRecipe,
  isRecipeUnsold
} from '~/utils/margin/menu-margin';

const BASIS_KEYS = {
  [BASIS_BASE]: 'mrg_margin_basis_base',
  [BASIS_TABLE]: 'mrg_margin_basis_table',
  [BASIS_DELIVERY]: 'mrg_margin_basis_delivery'
};

const BLOCKER_KEYS = {
  [BLOCKED_NO_PRICE]: 'mrg_margin_why_no_price',
  [BLOCKED_NO_COST]: 'mrg_margin_why_no_cost',
  [BLOCKED_COST_INCOMPLETE]: 'mrg_margin_why_incomplete'
};

/**
 * What one recipe earns against the price the till would actually charge.
 *
 * EVERY FIGURE ON THIS COMPONENT IS ONE FIELD OFF THE WIRE. In particular the contribution is READ,
 * never computed as `net − plate`, even though the subtraction looks trivial: the backend rounds the
 * plate cost half-up once after multiplying by the link's quantity per sold unit, and a client-side
 * subtraction of two rounded figures can disagree with the server's own. A margin that disagrees with
 * the till is the one number nobody may print.
 *
 * The deposit is the reason the net is not simply "gross minus VAT on gross": pant sits inside the
 * price and outside the VAT base, and taking the net off the gross reads 29.76 % where the truth is
 * 32.05 %. That correction is the backend's; this component would not be able to make it, which is
 * exactly why it makes none.
 */
export default {
  name: 'MarginMenuMarginPanel',
  mixins: [marginMoney],
  props: {
    /** The model from `readMenuMargin`, or null while the read has not answered. */
    menuMargin: {
      type: Object,
      default: null
    },
    /** The recipe on screen. Null until one is selected. */
    recipeId: {
      type: String,
      default: null
    },
    /**
     * The selected recipe's `kind`. A `Component` recipe is a sub-recipe: it is deliberately excluded
     * from the read's unsold list, so without this the surface could not tell "nobody sells this
     * dish" from "this is not a dish".
     */
    recipeKind: {
      type: String,
      default: null
    }
  },
  computed: {
    isUnknown () {
      return !this.menuMargin || this.menuMargin.state === MENU_MARGIN_UNKNOWN;
    },
    isSubRecipe () {
      return this.recipeKind === 'Component' && !this.dishes.length;
    },
    isUnsold () {
      return isRecipeUnsold(this.menuMargin, this.recipeId);
    },
    dishes () {
      return dishesForRecipe(this.menuMargin, this.recipeId);
    },
    /** The currency the API priced in, which is not always the one this admin formats. */
    wireCurrency () {
      return (this.menuMargin && this.menuMargin.currency) || null;
    },
    pricedAtLabel () {
      // Already a Date parsed through `parseApiInstant` — never `new Date(iso)` on a wire string.
      return new Intl.DateTimeFormat(this.locale, {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(this.menuMargin.pricedAt);
    }
  },
  methods: {
    basisLabel (row) {
      const key = BASIS_KEYS[row.priceBasis];
      return key ? this.$i(key) : (row.priceBasis || this.unknownMark);
    },

    /** The dish's ex-VAT price, or the unknown mark. A catalog price of 0 arrives as null: the read
     *  cannot tell an unpriced dish from a deliberately free one and refuses to quote either. */
    netLabel (row) {
      return row.netPriceMinor === null ? this.unknownMark : this.amount(row.netPriceMinor, this.wireCurrency);
    },

    /**
     * The three plate-cost states, rendered as three different things.
     *
     * ABSENT is a dash — no link, or no version active at the read instant. FLOOR is "at least X",
     * the same words the plate cost carries on the cost panel, and it stays "at least" even when X is
     * 0, because a bound of zero means nothing could be priced. EXACT is the amount, including a
     * genuine `kr 0,00` for a version with no components, which is a fact.
     */
    plateLabel (row) {
      if (row.plateState === PLATE_ABSENT) { return this.unknownMark; }
      const figure = this.amount(row.plateCostMinor, this.wireCurrency);
      return row.plateState === PLATE_FLOOR ? this.$i('mrg_cost_at_least', { amount: figure }) : figure;
    },

    /** Absent means UNKNOWN. It is never 0, and it is never `net − plate` computed here. */
    contributionLabel (row) {
      return row.contributionMinor === null
        ? this.unknownMark
        : this.signedAmount(row.contributionMinor, this.wireCurrency);
    },

    /** Absent means UNKNOWN. It is never 0 %, and it never goes through the money formatter. */
    foodCostLabel (row) {
      return row.foodCostPercent === null
        ? this.unknownMark
        : this.$i('mrg_margin_percent', { value: this.ratio(row.foodCostPercent) });
    },

    withheldRows (dish) {
      return dish.bases.filter(row => row.blockers.length > 0);
    },

    blockerText (row) {
      return row.blockers.map(code => this.$i(BLOCKER_KEYS[code])).join(' ');
    }
  }
};
</script>

<style lang="scss" scoped>
.mmg {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.mmg__head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.mmg__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0;
}

.mmg__meta {
  font-size: 0.8em;
  color: #64748b;
}

.mmg__notice {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9em;
  margin: 0;

  &--warn { background: #fff7ed; color: #92400e; }
  &--plain { background: #f8f9fa; color: #64748b; }
}

.mmg__dish + .mmg__dish {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;
}

.mmg__dish-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.mmg__dish-name {
  font-weight: 600;
  color: #292c34;
}

.mmg__dish-group {
  font-size: 0.8em;
  color: #64748b;
}

.mmg__flag {
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 2px 8px;
  border-radius: 6px;
  background: #fff7ed;
  color: #92400e;
}

.mmg__dish-qty {
  font-size: 0.8em;
  color: #64748b;
  margin: 4px 0 12px 0;
}

.mmg__table {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    text-align: left;
    padding: 10px 8px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.9em;
    vertical-align: top;
  }

  th {
    font-size: 0.7em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #64748b;
  }
}

.mmg__num { text-align: right; }

.mmg__basis {
  display: block;
  color: #292c34;
}

.mmg__basis-vat,
.mmg__sub {
  display: block;
  font-size: 0.8em;
  color: #64748b;
}

.mmg__why {
  margin: 12px 0 0 0;
  font-size: 0.8em;
  color: #92400e;
}
</style>
