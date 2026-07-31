<template>
  <section class="mrg-cost">
    <header class="mrg-cost__head">
      <h2 class="mrg-cost__title">
        {{ $i('mrg_cost_title') }}
      </h2>
      <span class="mrg-cost__version" :class="'mrg-cost__version--' + versionBadge.tone">{{ versionBadge.label }}</span>
      <span v-if="cost.pricedAt" class="mrg-cost__meta">{{ $i('mrg_cost_priced_at', { time: pricedAtLabel }) }}</span>
    </header>

    <!-- What it costs to make. Each figure is READ from its own node on the wire; nothing on this
         screen adds anything up. What it EARNS is the panel below (`MarginMenuMarginPanel`), which is
         a different read against the price the till would charge. -->
    <div class="mrg-cost__figures">
      <div class="mrg-cost__figure" :class="{ 'is-unknown': !hasAmounts }">
        <span class="mrg-cost__label">{{ $i('mrg_cost_batch') }}</span>
        <strong class="mrg-cost__value" data-test="batch-cost">{{ batchLabel }}</strong>
        <span v-if="yieldLabel" class="mrg-cost__sub">{{ yieldLabel }}</span>
      </div>

      <div class="mrg-cost__figure" :class="{ 'is-unknown': !hasAmounts }">
        <span class="mrg-cost__label">{{ $i('mrg_cost_per_portion') }}</span>
        <strong class="mrg-cost__value" data-test="portion-cost">{{ portionLabel }}</strong>
        <span v-if="portionSub" class="mrg-cost__sub">{{ portionSub }}</span>
      </div>
    </div>

    <p v-if="stateNotice" class="mrg-cost__notice" :class="'mrg-cost__notice--' + noticeTone" data-test="cost-notice">
      {{ stateNotice }}
    </p>

    <!-- The notice above tells a venue the lines have no price and that they need a supplier item
         with a valid one. Until the supplier surface existed that was an instruction with nowhere to
         carry it out, which is the whole reason a plate cost could read "unknown" forever. This is
         the way there, offered exactly on the two states it can fix. -->
    <p v-if="pricesFixable" class="mrg-cost__fix" data-test="cost-fix-link">
      <a href="/admin/margin-suppliers">{{ $i('mrg_cost_fix_prices') }}</a>
    </p>

    <table v-if="cost.lines.length" class="mrg-cost__lines">
      <thead>
        <tr>
          <th>{{ $i('mrg_line_component') }}</th>
          <th>{{ $i('mrg_line_quantity') }}</th>
          <th class="mrg-cost__num">
            {{ $i('mrg_line_cost') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="line in cost.lines" :key="line.componentId" :class="{ 'is-unpriced': line.incomplete }">
          <td>
            <span class="mrg-cost__component">{{ componentLabel(line) }}</span>
            <span v-if="line.incomplete" class="mrg-cost__flag">{{ lineFlag(line) }}</span>
          </td>
          <td>{{ quantityLabel(line) }}</td>
          <td class="mrg-cost__num" data-test="line-cost">
            {{ lineCostLabel(line) }}
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Said out loud rather than left to be inferred from a table that happens not to add up. -->
    <p class="mrg-cost__caveat">
      {{ $i('mrg_cost_no_sum_caveat') }}
    </p>
  </section>
</template>

<script>
import { marginMoney } from '~/utils/margin/money';
import {
  COST_UNKNOWN,
  COST_NOT_COSTED,
  COST_NONE_PRICED,
  COST_FLOOR,
  COST_EXACT,
  NAME_RESOLVED,
  NAME_UNRESOLVED
} from '~/utils/margin/cost-preview';

/**
 * The cost of one recipe version, rendered.
 *
 * EVERY MONEY FIGURE ON THIS COMPONENT IS ONE FIELD OFF THE WIRE. The backend rounds each line
 * half-up on its own and rounds the batch total half-up over the UNROUNDED sum, so the line column
 * and the batch figure are allowed to differ by up to half an øre per line — and they do. Adding the
 * column up here would put a number on screen that the backend calls false, in the one module where
 * that number is what a dish gets priced on.
 *
 * This panel answers "what does it cost to make". "What does it earn" is `MarginMenuMarginPanel`,
 * against a different read and a different version resolution — the two are kept apart so a plate
 * cost is never read as a margin.
 */
export default {
  name: 'MarginCostPanel',
  mixins: [marginMoney],
  props: {
    /** The model from `readCostPreview`. */
    cost: {
      type: Object,
      required: true
    }
  },
  computed: {
    hasAmounts () {
      return this.cost.state === COST_EXACT || this.cost.state === COST_FLOOR;
    },
    batchLabel () {
      return this.amountOrMark(this.cost.totalCostMinor);
    },
    portionLabel () {
      return this.amountOrMark(this.cost.perPortionCostMinor);
    },
    yieldLabel () {
      if (this.cost.yieldQuantity === null || !this.cost.yieldUnit) { return ''; }
      return this.$i('mrg_cost_yield', {
        quantity: this.number(this.cost.yieldQuantity),
        unit: this.$i('mrg_unit_' + String(this.cost.yieldUnit).toLowerCase())
      });
    },
    portionSub () {
      if (this.cost.portionCount === null) { return ''; }
      return this.$i('mrg_cost_portions', { count: this.cost.portionCount });
    },
    pricedAtLabel () {
      // `cost.pricedAt` is already a Date parsed through `parseApiInstant` — never `new Date(iso)` on
      // a wire string, which reads a bare stamp as browser-local.
      return new Intl.DateTimeFormat(this.locale, {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(this.cost.pricedAt);
    },
    /**
     * WHICH version the figures are of. The wire does not say directly — the backend previews the
     * Active version when there is one and silently falls back to the latest Draft otherwise — so a
     * screen that did not say this would show a draft's cost as if it were the menu's.
     */
    versionBadge () {
      if (this.cost.state === COST_UNKNOWN) { return { label: this.$i('mrg_version_unknown'), tone: 'unknown' }; }
      if (this.cost.pricedVersionIsActive === true) {
        return { label: this.$i('mrg_version_active', { number: this.numberOrMark(this.cost.pricedVersionNumber) }), tone: 'active' };
      }
      if (this.cost.pricedVersionIsActive === false) {
        return { label: this.$i('mrg_version_draft', { number: this.numberOrMark(this.cost.pricedVersionNumber) }), tone: 'draft' };
      }
      return { label: this.$i('mrg_version_unknown'), tone: 'unknown' };
    },
    stateNotice () {
      switch (this.cost.state) {
      case COST_UNKNOWN: return this.$i('mrg_cost_unknown');
      case COST_NOT_COSTED: return this.$i('mrg_cost_not_costed');
      case COST_NONE_PRICED: return this.$i('mrg_cost_none_priced', { count: this.cost.lineCount });
      case COST_FLOOR: return this.$i('mrg_cost_floor_notice', {
        unpriced: this.cost.unpricedLineCount,
        total: this.cost.lineCount
      });
      default: return '';
      }
    },
    noticeTone () {
      return this.cost.state === COST_FLOOR || this.cost.state === COST_NONE_PRICED ? 'warn' : 'plain';
    },
    /**
     * The two states a venue can act on by adding price data, and ONLY those two. `unknown` is a
     * failed read and `not-costed` is a recipe with no version — neither is fixed on the supplier
     * page, and sending someone there for them would be sending them to the wrong screen.
     */
    pricesFixable () {
      return this.cost.state === COST_NONE_PRICED || this.cost.state === COST_FLOOR;
    }
  },
  methods: {
    /**
     * An amount, or the unknown mark. Null NEVER becomes 0, and an incomplete cost is shown as the
     * lower bound it is rather than as a total — the same "at least X" semantic the menu-margin read
     * fixes for plate cost.
     */
    amountOrMark (minor) {
      if (minor === null || minor === undefined) { return this.unknownMark; }
      const amount = this.amount(minor, this.cost.currency);
      return this.cost.isFloor ? this.$i('mrg_cost_at_least', { amount }) : amount;
    },
    componentLabel (line) {
      if (line.isSubRecipe) { return this.$i('mrg_line_sub_recipe'); }
      if (line.isOrphan) { return this.$i('mrg_line_orphan'); }
      if (line.nameState === NAME_RESOLVED) { return line.name || this.$i('mrg_line_unnamed'); }
      // Two different refusals, kept apart: the list answered and this id is not in it, versus the
      // list never answered at all. Only the first is a claim about the ingredient.
      return line.nameState === NAME_UNRESOLVED
        ? this.$i('mrg_line_ingredient_gone')
        : this.$i('mrg_line_ingredient_unknown');
    },
    quantityLabel (line) {
      if (line.quantity === null) { return this.unknownMark; }
      return this.number(line.quantity) + ' ' + (line.unitCode || '');
    },
    /** An unpriced line is a dash and a reason, never `kr 0,00`. The wire's 0 there means unknown. */
    lineCostLabel (line) {
      return line.lineCostMinor === null ? this.unknownMark : this.amount(line.lineCostMinor, this.cost.currency);
    },
    lineFlag (line) {
      if (line.isOrphan) { return this.$i('mrg_line_flag_orphan'); }
      return line.isSubRecipe ? this.$i('mrg_line_flag_sub_recipe') : this.$i('mrg_line_flag_no_price');
    },
    numberOrMark (value) {
      return value === null || value === undefined ? this.unknownMark : String(value);
    }
  }
};
</script>

<style lang="scss" scoped>
.mrg-cost {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.mrg-cost__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.mrg-cost__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0;
}

.mrg-cost__version {
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 4px 10px;
  border-radius: 6px;

  &--active { background: rgba(27, 183, 118, 0.12); color: #159f63; }
  &--draft { background: #f1f5f9; color: #64748b; }
  &--unknown { background: #f8f9fa; color: #94a3b8; }
}

.mrg-cost__meta {
  font-size: 0.8em;
  color: #64748b;
}

.mrg-cost__figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.mrg-cost__figure {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;

  &.is-unknown {
    background: #fff;
    border: 1px dashed #e2e8f0;
  }
}

.mrg-cost__label {
  display: block;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #64748b;
  margin-bottom: 6px;
}

.mrg-cost__value {
  display: block;
  font-size: 1.5em;
  font-weight: 600;
  color: #292c34;
}

.mrg-cost__sub {
  display: block;
  margin-top: 6px;
  font-size: 0.8em;
  color: #64748b;
}

.mrg-cost__notice {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9em;
  margin: 0 0 20px 0;

  &--warn { background: #fff7ed; color: #92400e; }
  &--plain { background: #f8f9fa; color: #64748b; }
}

.mrg-cost__lines {
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    text-align: left;
    padding: 10px 8px;
    border-bottom: 1px solid #e2e8f0;
    font-size: 0.9em;
  }

  th {
    font-size: 0.75em;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
    color: #64748b;
  }

  tr.is-unpriced td { color: #92400e; }
}

.mrg-cost__num { text-align: right; }

.mrg-cost__component { display: block; }

.mrg-cost__flag {
  display: block;
  font-size: 0.75em;
  color: #92400e;
}

.mrg-cost__fix {
  margin: 0 0 20px 0;
  font-size: 0.9em;

  a {
    color: #159f63;
    font-weight: 600;
  }
}

.mrg-cost__caveat {
  margin: 16px 0 0 0;
  font-size: 0.8em;
  font-style: italic;
  color: #64748b;
}
</style>
