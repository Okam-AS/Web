<template>
  <div class="xreport">
    <header class="xreport__head">
      <h2 class="xreport__title">
        {{ isZ ? $i('pos_zreport') : $i('pos_xreport') }}
      </h2>
      <span v-if="isZ" class="xreport__znum">Z #{{ report.zNumber }}</span>
    </header>

    <div class="xreport__meta">
      <!-- Enterprise identity (kassasystemforskrifta § 2-8-2 bokstav b). -->
      <div v-if="report.sellerLegalName" class="xreport__meta-row xreport__meta-row--seller">
        <span>{{ report.sellerLegalName }}</span><span>{{ report.sellerOrgNumber }}</span>
      </div>
      <div class="xreport__meta-row">
        <span>{{ $i('pos_receipt_register') }}</span><span>{{ report.registerId }}</span>
      </div>
      <div class="xreport__meta-row">
        <span>{{ report.localDate }}</span><span>{{ report.localTime }}</span>
      </div>
      <div class="xreport__meta-row">
        <span>{{ $i('pos_report_seq') }}</span><span>{{ report.fromSequenceNumber }}–{{ report.toSequenceNumber }}</span>
      </div>
      <div class="xreport__meta-row">
        <span>{{ $i('pos_report_receipt_count') }}</span><span>{{ report.receiptCount }}</span>
      </div>
    </div>

    <!-- OMSETNING: per goods group, then the correction lines -->
    <section class="xreport__section">
      <h3>{{ $i('pos_report_turnover') }}</h3>
      <div class="xreport__grid xreport__grid--head">
        <span>{{ $i('pos_report_group') }}</span>
        <span class="xreport__num">{{ $i('pos_report_count') }}</span>
        <span class="xreport__num">{{ $i('pos_report_turnover_col') }}</span>
        <span class="xreport__num">{{ $i('pos_report_discount_col') }}</span>
      </div>
      <div v-for="(g, i) in report.goodsGroups" :key="i" class="xreport__grid">
        <span>{{ g.name || $i('pos_report_uncategorized') }}</span>
        <span class="xreport__num">{{ g.quantity }}</span>
        <span class="xreport__num">{{ priceLabel(g.amount) }}</span>
        <span class="xreport__num">{{ g.discountAmount ? priceLabel(g.discountAmount) : '—' }}</span>
      </div>
      <div class="xreport__grid xreport__grid--total">
        <span>{{ $i('pos_report_total') }}</span>
        <span class="xreport__num">{{ report.salesCount }}</span>
        <span class="xreport__num">{{ priceLabel(report.salesAmount) }}</span>
        <span class="xreport__num">{{ report.discountAmount ? priceLabel(report.discountAmount) : '—' }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_negative_sales') }} ({{ report.negativeSalesCount }})</span><span>{{ negatedPriceLabel(report.negativeSalesAmount) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_return') }} ({{ report.referencedReturnsCount }})</span><span>{{ negatedPriceLabel(report.referencedReturnsAmount) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_drawer_opens') }}</span><span>{{ report.drawerOpenCount }}</span>
      </div>
      <div v-if="report.manualDrawerOpenCount" class="xreport__row xreport__row--muted">
        <span>· {{ $i('pos_report_manual_opens') }}</span><span>{{ report.manualDrawerOpenCount }}</span>
      </div>
    </section>

    <!-- MVA samenstilling -->
    <section v-if="report.vatRates && report.vatRates.length" class="xreport__section">
      <h3>{{ $i('pos_report_vat_summary') }}</h3>
      <div class="xreport__grid xreport__grid--head">
        <span>{{ $i('pos_report_excl_vat') }}</span>
        <span class="xreport__num">{{ $i('pos_report_vat_pct') }}</span>
        <span class="xreport__num">{{ $i('pos_report_vat_total') }}</span>
        <span class="xreport__num">{{ $i('pos_report_incl_vat') }}</span>
      </div>
      <div v-for="(v, i) in report.vatRates" :key="i" class="xreport__grid">
        <span>{{ priceLabel(v.basis) }}</span>
        <span class="xreport__num">{{ v.vatPercent }}%</span>
        <span class="xreport__num">{{ priceLabel(v.amount) }}</span>
        <span class="xreport__num">{{ priceLabel(statedSum(v.basis, v.amount)) }}</span>
      </div>
    </section>

    <!-- GRAND TOTAL (from day 1): sal, retur og netto (§ 2-8-2 bokstav x/y/z). -->
    <section class="xreport__section">
      <h3>{{ $i('pos_report_grand_total') }}</h3>
      <div class="xreport__row">
        <span>{{ $i('pos_report_sales') }}</span><span>{{ priceLabel(report.grandTotalSales) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_return') }}</span><span>{{ negatedPriceLabel(report.grandTotalReturns) }}</span>
      </div>
      <div class="xreport__row xreport__row--sub">
        <span>{{ $i('pos_report_net') }}</span><span>{{ priceLabel(report.grandTotalNet) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_negative_sales') }}</span><span>{{ negatedPriceLabel(report.grandTotalNegativeSales) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_errors') }}</span><span>{{ negatedPriceLabel(report.grandTotalErrors) }}</span>
      </div>
      <div v-if="report.grandTotalTips" class="xreport__row">
        <span>{{ $i('pos_report_tips') }}</span><span>{{ priceLabel(report.grandTotalTips) }}</span>
      </div>
    </section>

    <!-- MOTTATT BETALING -->
    <section v-if="report.paymentMeans && report.paymentMeans.length" class="xreport__section">
      <h3>{{ $i('pos_report_received_payment') }}</h3>
      <div v-for="(p, i) in report.paymentMeans" :key="i" class="xreport__row">
        <span>{{ paymentLabel(p.paymentType) }} ({{ p.count }})</span><span>{{ priceLabel(p.amount) }}</span>
      </div>
      <!-- Tips (§ 2-8-2 bokstav i): received via the means above but outside the sales figures. -->
      <div v-if="report.tipsAmount" class="xreport__row xreport__row--muted">
        <span>· {{ $i('pos_report_tips') }} ({{ report.tipsCount }})</span><span>{{ priceLabel(report.tipsAmount) }}</span>
      </div>
      <div class="xreport__row xreport__row--sub">
        <span>{{ $i('pos_report_total_received') }}</span><span>{{ priceLabel(receivedTotal) }}</span>
      </div>
    </section>

    <!-- RETURER / korreksjoner -->
    <section class="xreport__section">
      <h3>{{ $i('pos_report_returns_section') }}</h3>
      <div class="xreport__row">
        <span>{{ $i('pos_report_total_negative_sales') }} ({{ report.negativeSalesCount }})</span><span>{{ priceLabel(report.negativeSalesAmount) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_total_return') }} ({{ report.referencedReturnsCount }})</span><span>{{ priceLabel(report.referencedReturnsAmount) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_voids') }} ({{ report.abortedSalesCount }})</span><span>{{ priceLabel(report.abortedSalesAmount) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_line_corrections') }} ({{ report.lineCorrectionCount }})</span><span>{{ priceLabel(report.lineCorrectionAmount) }}</span>
      </div>
      <div class="xreport__row xreport__row--sub">
        <span>{{ $i('pos_report_total_corrections') }}</span><span>{{ priceLabel(correctionsTotal) }}</span>
      </div>
      <!-- Special documents with count AND amount (§ 2-8-2 bokstav n / o / w). -->
      <div class="xreport__row">
        <span>{{ $i('pos_report_receipt_copies') }} ({{ report.copyReceiptCount }})</span><span>{{ priceLabel(report.copyReceiptAmount) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_proforma') }} ({{ report.provisionalReceiptCount }})</span><span>{{ priceLabel(report.provisionalReceiptAmount) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_training') }} ({{ report.trainingCount }})</span><span>{{ priceLabel(report.trainingAmount) }}</span>
      </div>
    </section>

    <!-- Cash reconciliation: the opening float shows on both X (the running day, § 2-8-2
         bokstav k) and Z; the count/difference rows belong to the settled day (Z). -->
    <section v-if="isZ || report.startFloat != null" class="xreport__section">
      <h3>{{ $i('pos_report_cash_recon') }}</h3>
      <div class="xreport__row">
        <span>{{ $i('pos_day_start_float') }}</span><span>{{ priceLabel(report.startFloat) }}</span>
      </div>
      <div v-if="isZ" class="xreport__row">
        <span>{{ $i('pos_report_cash_expected') }}</span><span>{{ priceLabel(report.cashExpected) }}</span>
      </div>
      <div v-if="isZ" class="xreport__row">
        <span>{{ $i('pos_report_cash_counted') }}</span><span>{{ priceLabel(report.cashCounted) }}</span>
      </div>
      <div v-if="isZ" class="xreport__row xreport__row--diff" :class="{ 'is-off': report.cashDifference }">
        <span>{{ $i('pos_report_cash_diff') }}</span><span>{{ priceLabel(report.cashDifference) }}</span>
      </div>
      <div v-if="isZ && report.bankDepositAmount" class="xreport__row">
        <span>{{ $i('pos_report_bank_deposit') }}</span><span>{{ priceLabel(report.bankDepositAmount) }}</span>
      </div>
    </section>

    <!-- RAPPORTER PER SERVITØR -->
    <section v-if="report.operators && report.operators.length" class="xreport__section">
      <h3>{{ $i('pos_report_operators') }}</h3>
      <div v-for="(o, i) in report.operators" :key="i" class="xreport__op">
        <div class="xreport__row">
          <span>{{ o.operatorName }}</span><span>{{ priceLabel(o.salesAmount) }}</span>
        </div>
        <div v-if="o.returnsCount" class="xreport__row xreport__row--muted">
          <span>· {{ $i('pos_report_return') }} ({{ o.returnsCount }})</span><span>{{ negatedPriceLabel(o.returnsAmount) }}</span>
        </div>
      </div>
    </section>

    <div class="xreport__grand">
      <span>{{ $i('pos_report_grand_net') }}</span>
      <span>{{ priceLabel(report.grandTotalNet) }}</span>
    </div>
  </div>
</template>

<script>
// Renders an X report (pure projection) or a Z report (X + cash reconciliation + signature). Z is a
// superclass of X on the wire, so the same component covers both; `isZ` is inferred from zNumber.
// Layout mirrors a Norwegian X/Z receipt: turnover per goods group, the correction buckets (negativ
// salg / retur / korreksjoner), the VAT summary, the from-day-1 grand totals, payment means and the
// per-operator specification.
//
// EVERY total on this receipt is summed with `statedSum`, never with `+` or `(x || 0)`. The gate that
// keeps an absent amount from printing as "kr 0" lives inside `priceLabel`, and a gate can only refuse
// what still looks absent when it runs — `null + null` is `0`, so a VAT row whose basis and amount both
// failed to arrive used to reach the formatter already disguised as a stated zero and print as a real
// figure on a fiscal document. `statedSum` returns null the moment any addend is unstated, so the hole
// survives the arithmetic and `priceLabel` can still withhold it.
//
// EVERY deduction row (negativ salg, retur, feilslag) prints its sign through `negatedAmountLabel`,
// never as a template literal in front of the interpolation. `−{{ priceLabel(x) }}` put the minus
// where no formatter could see it, so an absent amount composed to `−—` — the negative of a figure
// nobody stated, on a document an inspector reads. Six rows did it. The sign now belongs to the
// label, which is the only place that knows whether there is a figure to attach it to.
import { statedSum, negatedAmountLabel } from '~/utils/price';

export default {
  name: 'XReportView',
  props: {
    report: { type: Object, required: true }
  },
  computed: {
    isZ () { return this.report.zNumber != null; },
    // TOTALT MOTTATT. A payment mean whose amount did not arrive makes the total received unknowable,
    // and `(p.amount || 0)` used to answer it anyway — dropping that mean silently and reporting the
    // rest as if it were the whole. An absent `paymentMeans` is likewise not an empty one: the list
    // never arrived, so there is no total to state.
    receivedTotal () {
      if (!Array.isArray(this.report.paymentMeans)) { return null; }
      return statedSum(...this.report.paymentMeans.map(p => p.amount));
    },
    // TOTAL KORREKSJONER for the period: negative sales + referenced returns + correction receipts
    // + aborted/voided sales. All four are `long` minor-unit fields on the wire; any one of them
    // missing means this line cannot be stated, so it is withheld rather than summed as zero.
    correctionsTotal () {
      return statedSum(
        this.report.negativeSalesAmount,
        this.report.referencedReturnsAmount,
        this.report.correctionAmount,
        this.report.abortedSalesAmount
      );
    }
  },
  methods: {
    statedSum,
    // The sign is resolved from the negated value and the magnitude alone goes to the formatter —
    // core's `priceLabel` renders -4 as "kr 0,-4". See `negatedAmountLabel` for the four worlds.
    negatedPriceLabel (amountMinor) {
      return negatedAmountLabel(amountMinor, this.priceLabel);
    },
    paymentLabel (type) {
      if (type === 'Cash') { return this.$i('pos_pay_cash'); }
      if (type === 'SurfboardTerminal' || type === 'DinteroTerminal') { return this.$i('pos_pay_card'); }
      if (type === 'Giftcard') { return this.$i('pos_pay_giftcard'); }
      return type;
    }
  }
};
</script>

<style scoped>
.xreport {
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px 22px;
  max-width: 440px;
  margin: 0 auto;
}
.xreport__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
.xreport__title { font-size: 1.3rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.xreport__znum { font-weight: 700; color: var(--pos-primary-dark, #159f63); }

.xreport__meta { padding-bottom: 12px; border-bottom: 1px dashed #cbd5e0; margin-bottom: 12px; }
.xreport__meta-row { display: flex; justify-content: space-between; color: #64748b; font-size: 0.88rem; padding: 2px 0; }
.xreport__meta-row--seller { color: var(--pos-ink, #292c34); font-weight: 700; }

.xreport__section { margin-bottom: 16px; }
.xreport__section h3 { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; margin: 0 0 8px; }
.xreport__row { display: flex; justify-content: space-between; padding: 3px 0; color: var(--pos-ink, #292c34); }
.xreport__row--sub { border-top: 1px dashed #e2e8f0; margin-top: 4px; padding-top: 6px; font-weight: 700; }
.xreport__row--muted { color: #94a3b8; font-size: 0.85rem; }
.xreport__row--diff.is-off span:last-child { color: #ef4444; font-weight: 700; }

.xreport__grid { display: grid; grid-template-columns: 1.6fr 0.7fr 1.1fr 1fr; gap: 4px; padding: 3px 0; color: var(--pos-ink, #292c34); font-size: 0.92rem; }
.xreport__grid--head { color: #94a3b8; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em; border-bottom: 1px solid #eef1f5; padding-bottom: 5px; }
.xreport__grid--total { border-top: 1px dashed #e2e8f0; margin-top: 4px; padding-top: 6px; font-weight: 700; }
.xreport__num { text-align: right; }

.xreport__op { padding: 2px 0; }

.xreport__grand {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 2px solid #e2e8f0;
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--pos-ink, #292c34);
}
</style>
