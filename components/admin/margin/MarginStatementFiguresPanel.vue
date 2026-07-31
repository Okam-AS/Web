<template>
  <section class="mst">
    <header class="mst__head">
      <div>
        <h2 class="mst__title">
          {{ $i('mrgs_figures_title') }}
        </h2>
        <p class="mst__period" data-test="period">
          {{ periodLabel }}
        </p>
      </div>
      <span class="mst__badge" :class="'mst__badge--' + stateBadge.tone" data-test="state-badge">{{ stateBadge.label }}</span>
      <span class="mst__revision" data-test="revision">{{ revisionLabel }}</span>
    </header>

    <!-- The statement has money columns whether or not anything was ever computed into them. Said
         first, because every figure below is withheld while it holds. -->
    <p v-if="isUncalculated" class="mst__notice mst__notice--plain" data-test="uncalculated">
      {{ $i('mrgs_figures_uncalculated') }}
    </p>

    <!-- The three headline figures the week reconciles: what the till took, what the recipes say it
         should have cost, and what the venue actually bought. Each is one field off the wire. -->
    <div class="mst__figures">
      <div class="mst__figure" :class="{ 'is-unknown': statement.netFoodSalesMinor === null }">
        <span class="mst__label">{{ $i('mrgs_figure_net') }}</span>
        <strong class="mst__value" data-test="net">{{ money(statement.netFoodSalesMinor) }}</strong>
        <span class="mst__sub">{{ $i('mrgs_figure_net_sub') }}</span>
      </div>

      <div class="mst__figure" :class="{ 'is-unknown': statement.theoreticalIngredientCostMinor === null }">
        <span class="mst__label">{{ $i('mrgs_figure_theoretical') }}</span>
        <strong class="mst__value" data-test="theoretical">{{ theoreticalLabel }}</strong>
        <span class="mst__sub">{{ $i('mrgs_figure_theoretical_sub') }}</span>
      </div>

      <div class="mst__figure" :class="{ 'is-unknown': statement.actualPurchaseSpendMinor === null }">
        <span class="mst__label">{{ $i('mrgs_figure_actual') }}</span>
        <strong class="mst__value" data-test="actual">{{ money(statement.actualPurchaseSpendMinor) }}</strong>
        <span class="mst__sub">{{ $i('mrgs_figure_actual_sub') }}</span>
      </div>
    </div>

    <!-- The coverage split. Shown beside the headline figures rather than under coverage further down,
         because it is the reason a theoretical cost can be honest and still not describe the week: it
         only ever explains the covered part. -->
    <div class="mst__split">
      <div class="mst__splitcell" :class="{ 'is-unknown': statement.coveredNetSalesMinor === null }">
        <span class="mst__label">{{ $i('mrgs_figure_covered') }}</span>
        <strong class="mst__splitvalue" data-test="covered">{{ money(statement.coveredNetSalesMinor) }}</strong>
      </div>
      <div class="mst__splitcell" :class="{ 'is-unknown': statement.uncoveredNetSalesMinor === null }">
        <span class="mst__label">{{ $i('mrgs_figure_uncovered') }}</span>
        <strong class="mst__splitvalue" data-test="uncovered">{{ money(statement.uncoveredNetSalesMinor) }}</strong>
      </div>
    </div>

    <p class="mst__caveat">
      {{ $i('mrgs_figures_no_sum_caveat') }}
    </p>

    <!-- The four ratios. Every one of them is null whenever net food sales is zero, and that is a
         different thing from 0,00 % — the division is undefined, not favourable. -->
    <div class="mst__ratios">
      <div class="mst__ratio" :class="{ 'is-unknown': statement.theoreticalFoodCostPercent === null }">
        <span class="mst__label">{{ $i('mrgs_ratio_theoretical') }}</span>
        <strong class="mst__ratiovalue" data-test="theoretical-percent">{{ percent(statement.theoreticalFoodCostPercent) }}</strong>
      </div>
      <div class="mst__ratio" :class="{ 'is-unknown': statement.actualFoodCostPercent === null }">
        <span class="mst__label">{{ $i('mrgs_ratio_actual') }}</span>
        <strong class="mst__ratiovalue" data-test="actual-percent">{{ percent(statement.actualFoodCostPercent) }}</strong>
      </div>
      <div class="mst__ratio" :class="{ 'is-unknown': statement.gapPercentagePoints === null }">
        <span class="mst__label">{{ $i('mrgs_ratio_gap') }}</span>
        <strong class="mst__ratiovalue" data-test="gap">{{ gapLabel }}</strong>
      </div>
      <div class="mst__ratio" :class="{ 'is-unknown': statement.coveragePercent === null }">
        <span class="mst__label">{{ $i('mrgs_ratio_coverage') }}</span>
        <strong class="mst__ratiovalue" data-test="coverage-percent">{{ percent(statement.coveragePercent) }}</strong>
      </div>
    </div>

    <p v-if="ratiosUndefined" class="mst__notice mst__notice--plain" data-test="ratios-undefined">
      {{ $i('mrgs_figures_ratios_undefined') }}
    </p>

    <p v-if="statement.theoreticalCostComplete === false" class="mst__notice mst__notice--warn" data-test="theoretical-floor">
      {{ $i('mrgs_figures_theoretical_floor') }}
    </p>

    <p v-if="excludedCurrenciesLabel" class="mst__notice mst__notice--warn" data-test="excluded-currencies">
      {{ $i('mrgs_figures_excluded_currencies', { currencies: excludedCurrenciesLabel }) }}
    </p>

    <p v-if="receiptMissing" class="mst__notice mst__notice--warn" data-test="receipt-missing">
      {{ $i('mrgs_figures_receipt_missing') }}
    </p>

    <p v-if="isKnown && !statement.currency" class="mst__notice mst__notice--warn" data-test="currency-unknown">
      {{ $i('mrgs_figures_currency_unknown') }}
    </p>

    <!-- The provenance the honesty rules require every statement to carry: how far the journal had been
         read, which recipe versions the explosion used, how old the prices were, and when the figures
         above were produced. Without it a food-cost percentage is a number with no date on it. -->
    <h3 class="mst__subtitle">
      {{ $i('mrgs_provenance_title') }}
    </h3>
    <dl class="mst__provenance">
      <div class="mst__provrow">
        <dt>{{ $i('mrgs_prov_calculated') }}</dt>
        <dd data-test="calculated-at">
          {{ instant(statement.calculatedAt) }}
        </dd>
      </div>
      <div class="mst__provrow">
        <dt>{{ $i('mrgs_prov_watermark') }}</dt>
        <dd data-test="watermark">
          {{ statement.projectionWatermark === null ? unknownMark : String(statement.projectionWatermark) }}
        </dd>
      </div>
      <div class="mst__provrow">
        <dt>{{ $i('mrgs_prov_recipe_versions') }}</dt>
        <dd data-test="recipe-versions">
          {{ recipeVersionsLabel }}
        </dd>
      </div>
      <div class="mst__provrow">
        <dt>{{ $i('mrgs_prov_price_freshness') }}</dt>
        <dd data-test="price-freshness">
          {{ instant(statement.priceFreshnessAsOf) }}
        </dd>
      </div>
      <div v-if="statement.finalizedAt" class="mst__provrow">
        <dt>{{ $i('mrgs_prov_finalized') }}</dt>
        <dd data-test="finalized-at">
          {{ instant(statement.finalizedAt) }}
        </dd>
      </div>
      <div v-if="statement.previousStatementId" class="mst__provrow">
        <dt>{{ $i('mrgs_prov_corrects') }}</dt>
        <dd data-test="corrects">
          {{ $i('mrgs_prov_corrects_value', { revision: previousRevisionLabel }) }}
        </dd>
      </div>
    </dl>
  </section>
</template>

<script>
import { marginMoney } from '~/utils/margin/money';
import {
  STATEMENT_UNKNOWN,
  STATEMENT_UNCALCULATED,
  STATEMENT_FINALIZED,
  RECEIPT_READ
} from '~/utils/margin/statement-view';

/**
 * One week's theoretical-vs-actual statement, rendered.
 *
 * EVERY FIGURE ON THIS COMPONENT IS ONE FIELD OFF THE WIRE. The three headline amounts, the two
 * coverage amounts and all four ratios are computed by the backend, which pins `covered + uncovered ==
 * net` and `gap == actual% − theoretical%` in its own tests. Re-deriving either relation here would
 * put a number on screen the statement does not contain, and the module exists precisely so the two
 * agree.
 *
 * WHAT THIS COMPONENT DOES DECIDE is what an absence looks like, and it never looks like zero:
 *
 *  • before any calculation has run, the money columns hold schema defaults and every amount is `—`;
 *  • a ratio is `—` whenever net food sales was zero, with the reason said out loud, because a
 *    food-cost percentage of 0,00 % is the most flattering possible misreading of "we sold nothing";
 *  • an incomplete theoretical cost is shown as "at least X" and the percentage built on it is
 *    flagged as understating, the same treatment the recipe cost preview gives a partial plate cost;
 *  • when the input receipt is missing or unreadable the covered/uncovered split and the recipe
 *    version list are `—`, because the server's fallbacks for those are `0`, `0` and `[]`.
 */
export default {
  name: 'MarginStatementFiguresPanel',
  mixins: [marginMoney],
  props: {
    /** The model from `readStatement`. */
    statement: {
      type: Object,
      required: true
    }
  },
  computed: {
    /** The read answered at all. Everything below is silent on a statement nobody has fetched. */
    isKnown () {
      return this.statement.state !== STATEMENT_UNKNOWN;
    },
    isUncalculated () {
      return this.statement.state === STATEMENT_UNCALCULATED;
    },
    periodLabel () {
      if (!this.statement.periodStart || !this.statement.periodEnd) { return this.unknownMark; }
      return this.$i('mrgs_period_range', { from: this.statement.periodStart, to: this.statement.periodEnd });
    },
    revisionLabel () {
      return this.statement.revisionNumber === null
        ? this.unknownMark
        : this.$i('mrgs_revision', { number: this.statement.revisionNumber });
    },
    stateBadge () {
      switch (this.statement.state) {
      case STATEMENT_FINALIZED: return { label: this.$i('mrgs_state_finalized'), tone: 'finalized' };
      case STATEMENT_UNCALCULATED: return { label: this.$i('mrgs_state_uncalculated'), tone: 'unknown' };
      case STATEMENT_UNKNOWN: return { label: this.$i('mrgs_state_unknown'), tone: 'unknown' };
      default: return { label: this.$i('mrgs_state_open'), tone: 'open' };
      }
    },
    /**
     * The theoretical cost as a LOWER BOUND when the backend says the explosion was incomplete. The
     * flag is tri-state: `null` means the receipt could not be read, so the bound is not claimed
     * either — that case falls through to the plain amount and the receipt notice explains it.
     */
    theoreticalLabel () {
      const amount = this.money(this.statement.theoreticalIngredientCostMinor);
      if (this.statement.theoreticalIngredientCostMinor === null) { return amount; }
      return this.statement.theoreticalCostComplete === false
        ? this.$i('mrgs_at_least', { amount })
        : amount;
    },
    /**
     * The gap in percentage POINTS, signed. It is a difference of two percentages and not money, so it
     * does not go through the money formatter; the sign is placed in front of the magnitude for the
     * same reason `signedAmount` does it — a negative gap is the good week and must read as one.
     */
    gapLabel () {
      const value = this.statement.gapPercentagePoints;
      if (value === null) { return this.unknownMark; }
      return (value < 0 ? '−' + this.ratio(-value) : this.ratio(value)) + ' ' + this.$i('mrgs_percentage_points');
    },
    /**
     * True when the statement HAS been calculated and the ratios are still null — which the backend
     * does for exactly one reason: net food sales was zero and the division is undefined.
     */
    ratiosUndefined () {
      return this.isKnown && !this.isUncalculated &&
        this.statement.theoreticalFoodCostPercent === null &&
        this.statement.actualFoodCostPercent === null;
    },
    excludedCurrenciesLabel () {
      const list = this.statement.theoreticalCostExcludedCurrencies || [];
      return list.length ? list.join(', ') : '';
    },
    receiptMissing () {
      return this.isKnown && this.statement.receiptState !== RECEIPT_READ;
    },
    recipeVersionsLabel () {
      const ids = this.statement.recipeVersionIds;
      if (ids === null) { return this.unknownMark; }
      return ids.length
        ? this.$i('mrgs_prov_recipe_versions_count', { count: ids.length })
        : this.$i('mrgs_prov_recipe_versions_none');
    },
    /**
     * A correction names the revision it supersedes as the one below its own. The predecessor's number
     * is not on this document — only its id is — so it is stated as a relation ("corrects revision
     * N−1") rather than looked up, and it is withheld entirely when this statement's own number is
     * unknown.
     */
    previousRevisionLabel () {
      return this.statement.revisionNumber === null ? this.unknownMark : String(this.statement.revisionNumber - 1);
    }
  },
  methods: {
    /**
     * An amount, or the unknown mark. Null NEVER becomes 0 — on this surface a zero is a real week
     * with no sales and the dash is a week nobody has computed, and the two must not look alike.
     *
     * `signedAmount` rather than `amount`: uncovered net sales is legitimately negative when a week's
     * returns exceed its open-price sales (the proven journey's is −10 000), and the shared formatter
     * mangles a negative amount below one krone.
     */
    money (minor) {
      return minor === null || minor === undefined
        ? this.unknownMark
        : this.signedAmount(minor, this.statement.currency);
    },
    percent (value) {
      return value === null || value === undefined ? this.unknownMark : this.ratio(value) + ' %';
    },
    instant (date) {
      if (!date) { return this.unknownMark; }
      return new Intl.DateTimeFormat(this.locale, { dateStyle: 'short', timeStyle: 'short' }).format(date);
    }
  }
};
</script>

<style lang="scss" scoped>
.mst {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.mst__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.mst__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0;
}

.mst__period {
  font-size: 0.85em;
  color: #64748b;
  margin: 4px 0 0 0;
}

.mst__badge {
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  padding: 4px 10px;
  border-radius: 6px;

  &--open { background: rgba(27, 183, 118, 0.12); color: #159f63; }
  &--finalized { background: #f1f5f9; color: #292c34; }
  &--unknown { background: #f8f9fa; color: #94a3b8; }
}

.mst__revision {
  font-size: 0.8em;
  color: #64748b;
}

.mst__figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.mst__figure {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;

  &.is-unknown {
    background: #fff;
    border: 1px dashed #e2e8f0;
  }
}

.mst__label {
  display: block;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #64748b;
  margin-bottom: 6px;
}

.mst__value {
  display: block;
  font-size: 1.5em;
  font-weight: 600;
  color: #292c34;
}

.mst__sub {
  display: block;
  margin-top: 6px;
  font-size: 0.8em;
  color: #64748b;
}

.mst__split {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 8px;
}

.mst__splitcell {
  padding: 12px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;

  &.is-unknown { border-style: dashed; }
}

.mst__splitvalue {
  display: block;
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
}

.mst__ratios {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin: 20px 0 8px 0;
}

.mst__ratio {
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px;

  &.is-unknown {
    background: #fff;
    border: 1px dashed #e2e8f0;
  }
}

.mst__ratiovalue {
  display: block;
  font-size: 1.2em;
  font-weight: 600;
  color: #292c34;
}

.mst__notice {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9em;
  margin: 0 0 12px 0;

  &--warn { background: #fff7ed; color: #92400e; }
  &--plain { background: #f8f9fa; color: #64748b; }
}

.mst__caveat {
  margin: 0 0 8px 0;
  font-size: 0.8em;
  font-style: italic;
  color: #64748b;
}

.mst__subtitle {
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #292c34;
  margin: 24px 0 12px 0;
}

.mst__provenance { margin: 0; }

.mst__provrow {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.85em;

  dt { color: #64748b; }
  dd { margin: 0; color: #292c34; text-align: right; }
}
</style>
