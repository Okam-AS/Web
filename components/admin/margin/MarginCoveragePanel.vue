<template>
  <section class="mcv">
    <h2 class="mcv__title">
      {{ $i('mrgs_coverage_title') }}
    </h2>
    <p class="mcv__lede">
      {{ $i('mrgs_coverage_lede') }}
    </p>

    <p v-if="coverage === null" class="mcv__note" data-test="coverage-unknown">
      {{ $i('mrgs_coverage_unknown') }}
    </p>

    <template v-else>
      <p class="mcv__window" data-test="coverage-window">
        {{ windowLabel }}
      </p>

      <div class="mcv__figures">
        <div class="mcv__figure" :class="{ 'is-unknown': coverage.coveragePercent === null }">
          <span class="mcv__label">{{ $i('mrgs_ratio_coverage') }}</span>
          <strong class="mcv__value" data-test="coverage-percent">{{ percent(coverage.coveragePercent) }}</strong>
        </div>
        <div class="mcv__figure" :class="{ 'is-unknown': coverage.coveredNetSalesMinor === null }">
          <span class="mcv__label">{{ $i('mrgs_figure_covered') }}</span>
          <strong class="mcv__value" data-test="coverage-covered">{{ money(coverage.coveredNetSalesMinor) }}</strong>
        </div>
        <div class="mcv__figure" :class="{ 'is-unknown': coverage.uncoveredNetSalesMinor === null }">
          <span class="mcv__label">{{ $i('mrgs_figure_uncovered') }}</span>
          <strong class="mcv__value" data-test="coverage-uncovered">{{ money(coverage.uncoveredNetSalesMinor) }}</strong>
        </div>
      </div>

      <p v-if="coverage.coveragePercent === null" class="mcv__notice" data-test="coverage-undefined">
        {{ $i('mrgs_coverage_undefined') }}
      </p>

      <!-- WHAT THE UNCOVERED SALES ACTUALLY ARE. Without this a venue is told 80 % and left to guess
           which dishes are the other 20 %. The open-price bucket is a row like any other: it is often
           the single largest reason a week falls short, and hiding it would make the rest look like
           the whole story. -->
      <h3 class="mcv__subtitle">
        {{ $i('mrgs_coverage_uncovered_title') }}
      </h3>
      <p v-if="!coverage.uncoveredTopSellers.length" class="mcv__note" data-test="uncovered-none">
        {{ $i('mrgs_coverage_uncovered_none') }}
      </p>
      <table v-else class="mcv__table">
        <thead>
          <tr>
            <th>{{ $i('mrgs_coverage_product') }}</th>
            <th class="mcv__num">
              {{ $i('mrgs_coverage_lines') }}
            </th>
            <th class="mcv__num">
              {{ $i('mrgs_coverage_net') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(line, index) in coverage.uncoveredTopSellers" :key="index" data-test="uncovered-row">
            <td>{{ uncoveredLabel(line) }}</td>
            <td class="mcv__num">
              {{ line.lineCount === null ? unknownMark : number(line.lineCount) }}
            </td>
            <td class="mcv__num">
              {{ money(line.netSalesMinor) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- A link whose product the catalog no longer holds. Surfaced, never auto-relinked: the sale it
           used to cover is now uncovered, and this is the only place that says why. -->
      <template v-if="coverage.brokenLinks.length">
        <h3 class="mcv__subtitle">
          {{ $i('mrgs_coverage_broken_title') }}
        </h3>
        <ul class="mcv__list">
          <li v-for="link in coverage.brokenLinks" :key="link.linkId" data-test="broken-link">
            {{ link.recipeName || $i('mrgs_coverage_recipe_unnamed') }}
          </li>
        </ul>
      </template>

      <!-- How old the prices behind the theoretical cost are, per supplier. A theoretical cost priced
           off a year-old list is not wrong so much as answering about a different year. -->
      <template v-if="coverage.priceFreshness.length">
        <h3 class="mcv__subtitle">
          {{ $i('mrgs_coverage_freshness_title') }}
        </h3>
        <table class="mcv__table">
          <thead>
            <tr>
              <th>{{ $i('mrgs_coverage_supplier') }}</th>
              <th class="mcv__num">
                {{ $i('mrgs_coverage_price_age') }}
              </th>
              <th class="mcv__num">
                {{ $i('mrgs_coverage_unpriced_items') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in coverage.priceFreshness" :key="line.supplierId" data-test="freshness-row">
              <td>{{ line.supplierName || $i('mrgs_spend_supplier_unnamed') }}</td>
              <td class="mcv__num">
                {{ ageLabel(line) }}
              </td>
              <td class="mcv__num">
                {{ line.itemsWithoutPrice === null ? unknownMark : number(line.itemsWithoutPrice) }}
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <!-- WHAT THE KITCHEN THREW AWAY. An ADDITIVE bucket, not a correction of anything above it:
           everything above is net SALES and which recipes explain them, this is money the venue
           bought and never sold. It sits here because this panel is already the answer to "and what
           is the rest of the week", and waste is the part of the theoretical-vs-actual gap a venue
           can explain without counting stock. -->
      <h3 class="mcv__subtitle">
        {{ $i('mrgs_waste_coverage_title') }}
      </h3>
      <p v-if="!coverage.waste.entryCount" class="mcv__note" data-test="waste-none">
        {{ $i('mrgs_waste_coverage_none') }}
      </p>
      <template v-else>
        <p class="mcv__note" data-test="waste-total">
          {{ $i('mrgs_waste_coverage_total', { total: money(coverage.waste.valuedMinor) }) }}
        </p>
        <!-- The total is a FLOOR while any entry could not be priced. Said in words rather than left
             to a footnote: an understated waste figure understates the very gap it exists to explain,
             and that is the direction nobody investigates. -->
        <p v-if="coverage.waste.unvaluedEntryCount" class="mcv__notice" data-test="waste-unvalued">
          {{ $i('mrgs_waste_coverage_unvalued', { count: coverage.waste.unvaluedEntryCount }) }}
        </p>
        <table class="mcv__table">
          <thead>
            <tr>
              <th>{{ $i('mrgs_waste_reason') }}</th>
              <th class="mcv__num">
                {{ $i('mrgs_coverage_lines') }}
              </th>
              <th class="mcv__num">
                {{ $i('mrgs_waste_value') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="line in coverage.waste.byReason" :key="line.reason" data-test="waste-row">
              <td>{{ reasonLabel(line.reason) }}</td>
              <td class="mcv__num">
                {{ number(line.entryCount) }}
              </td>
              <td class="mcv__num">
                {{ money(line.valuedMinor) }}
              </td>
            </tr>
          </tbody>
        </table>
      </template>

      <p class="mcv__watermark" data-test="coverage-watermark">
        {{ $i('mrgs_prov_watermark') }}:
        {{ coverage.projectionWatermark === null ? unknownMark : String(coverage.projectionWatermark) }}
      </p>
    </template>
  </section>
</template>

<script>
import { marginMoney } from '~/utils/margin/money';
import { WASTE_REASON_KEYS } from '~/utils/margin/waste-reasons';

/**
 * What the statement's coverage percentage is MADE OF, for the same week.
 *
 * The statement already carries `coveragePercent`; this panel is the answer to "and which sales are
 * the rest". It is a separate read (`GET /margin/coverage`) gated on the module master alone, so it
 * can answer for a store whose `Margin.Statements` stage flag is off — and it can also fail on its own
 * while the statement is fine, which is why null here means UNKNOWN and never "everything is covered".
 *
 * Nothing on this panel is derived. The percentage, both amounts, every bucket and every price age are
 * fields off the wire, and the buckets are rendered in the server's own net-descending order.
 */
export default {
  name: 'MarginCoveragePanel',
  mixins: [marginMoney],
  props: {
    /** The model from `readCoverage`, or null while the read has not answered. */
    coverage: {
      type: Object,
      default: null
    }
  },
  computed: {
    windowLabel () {
      if (!this.coverage.fromDate || !this.coverage.toDate) { return this.unknownMark; }
      return this.$i('mrgs_period_range', { from: this.coverage.fromDate, to: this.coverage.toDate });
    }
  },
  methods: {
    /**
     * `signedAmount`, because an uncovered bucket is legitimately negative when a period's returns
     * exceed its sales of the same thing — the shape the proven journey's −10 000 open-price bucket
     * has — and the shared formatter mangles a negative amount below one krone.
     */
    money (minor) {
      return minor === null || minor === undefined
        ? this.unknownMark
        : this.signedAmount(minor, this.coverage.currency);
    },
    percent (value) {
      return value === null || value === undefined ? this.unknownMark : this.ratio(value) + ' %';
    },
    /**
     * The open-price bucket is named for what it is rather than left blank: it holds the sales with no
     * product id at all — an open-price line or a referenced return — and no recipe can ever cover it.
     */
    uncoveredLabel (line) {
      if (line.isOpenPrice) { return this.$i('mrgs_coverage_open_price'); }
      return line.productName || this.$i('mrgs_coverage_product_unnamed');
    },
    /** Null age is "this supplier has no priced item at all", which is not the same as zero days old. */
    ageLabel (line) {
      return line.priceAgeDays === null
        ? this.$i('mrgs_coverage_never_priced')
        : this.$i('mrgs_coverage_days', { count: line.priceAgeDays });
    },
    /**
     * A reason code the server sent that this build has no word for is printed AS THE CODE, never
     * dropped and never relabelled "Other" — the venue picked something, and a bucket renamed to the
     * one bucket that means "none of the above" would be a lie about their own record.
     */
    reasonLabel (reason) {
      const key = WASTE_REASON_KEYS[reason];
      return key ? this.$i(key) : (reason || this.unknownMark);
    }
  }
};
</script>

<style lang="scss" scoped>
.mcv {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
}

.mcv__title {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px 0;
}

.mcv__lede,
.mcv__note,
.mcv__window {
  font-size: 0.85em;
  color: #64748b;
  margin: 0 0 12px 0;
}

.mcv__figures {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.mcv__figure {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;

  &.is-unknown {
    background: #fff;
    border: 1px dashed #e2e8f0;
  }
}

.mcv__label {
  display: block;
  font-size: 0.75em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #64748b;
  margin-bottom: 6px;
}

.mcv__value {
  display: block;
  font-size: 1.2em;
  font-weight: 600;
  color: #292c34;
}

.mcv__notice {
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9em;
  background: #f8f9fa;
  color: #64748b;
  margin: 0 0 16px 0;
}

.mcv__subtitle {
  font-size: 0.85em;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: #292c34;
  margin: 24px 0 12px 0;
}

.mcv__table {
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
}

.mcv__num { text-align: right; }

.mcv__list {
  margin: 0;
  padding-left: 20px;
  font-size: 0.9em;
  color: #92400e;
}

.mcv__watermark {
  margin: 20px 0 0 0;
  font-size: 0.8em;
  color: #64748b;
}
</style>
