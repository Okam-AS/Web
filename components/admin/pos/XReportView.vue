<template>
  <div class="xreport">
    <header class="xreport__head">
      <h2 class="xreport__title">
        {{ isZ ? $i('pos_zreport') : $i('pos_xreport') }}
      </h2>
      <span v-if="isZ" class="xreport__znum">Z #{{ report.zNumber }}</span>
    </header>

    <div class="xreport__meta">
      <div class="xreport__meta-row">
        <span>{{ $i('pos_receipt_register') }}</span><span>{{ report.registerId }}</span>
      </div>
      <div class="xreport__meta-row">
        <span>{{ report.localDate }}</span><span>{{ report.localTime }}</span>
      </div>
      <div class="xreport__meta-row">
        <span>{{ $i('pos_report_seq') }}</span><span>{{ report.fromSequenceNumber }}–{{ report.toSequenceNumber }}</span>
      </div>
    </div>

    <section class="xreport__section">
      <h3>{{ $i('pos_report_sales') }}</h3>
      <div class="xreport__row">
        <span>{{ $i('pos_report_sales_count') }}</span><span>{{ report.salesCount }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_gross') }}</span><span>{{ priceLabel(report.salesAmount) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_net') }}</span><span>{{ priceLabel(report.salesNetAmount) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_vat') }}</span><span>{{ priceLabel(report.salesVatAmount) }}</span>
      </div>
      <div v-if="report.tipsAmount" class="xreport__row">
        <span>{{ $i('pos_receipt_tip') }}</span><span>{{ priceLabel(report.tipsAmount) }}</span>
      </div>
      <div v-if="report.returnsCount" class="xreport__row">
        <span>{{ $i('pos_report_returns') }}</span><span>{{ priceLabel(report.returnsAmount) }}</span>
      </div>
      <div v-if="report.discountCount" class="xreport__row">
        <span>{{ $i('pos_report_discounts') }}</span><span>−{{ priceLabel(report.discountAmount) }}</span>
      </div>
    </section>

    <section v-if="report.paymentMeans && report.paymentMeans.length" class="xreport__section">
      <h3>{{ $i('pos_report_payment_means') }}</h3>
      <div v-for="(p, i) in report.paymentMeans" :key="i" class="xreport__row">
        <span>{{ paymentLabel(p.paymentType) }} ({{ p.count }})</span><span>{{ priceLabel(p.amount) }}</span>
      </div>
    </section>

    <section v-if="report.vatRates && report.vatRates.length" class="xreport__section">
      <h3>{{ $i('pos_receipt_vat_spec') }}</h3>
      <div v-for="(v, i) in report.vatRates" :key="i" class="xreport__row">
        <span>{{ v.vatPercent }}% ({{ $i('pos_receipt_basis') }} {{ priceLabel(v.basis) }})</span><span>{{ priceLabel(v.amount) }}</span>
      </div>
    </section>

    <section v-if="report.operators && report.operators.length" class="xreport__section">
      <h3>{{ $i('pos_report_operators') }}</h3>
      <div v-for="(o, i) in report.operators" :key="i" class="xreport__row">
        <span>{{ o.operatorName }} ({{ o.salesCount }})</span><span>{{ priceLabel(o.salesAmount) }}</span>
      </div>
    </section>

    <section v-if="isZ" class="xreport__section">
      <h3>{{ $i('pos_report_cash_recon') }}</h3>
      <div class="xreport__row">
        <span>{{ $i('pos_day_start_float') }}</span><span>{{ priceLabel(report.startFloat) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_cash_expected') }}</span><span>{{ priceLabel(report.cashExpected) }}</span>
      </div>
      <div class="xreport__row">
        <span>{{ $i('pos_report_cash_counted') }}</span><span>{{ priceLabel(report.cashCounted) }}</span>
      </div>
      <div class="xreport__row xreport__row--diff" :class="{ 'is-off': report.cashDifference }">
        <span>{{ $i('pos_report_cash_diff') }}</span><span>{{ priceLabel(report.cashDifference) }}</span>
      </div>
      <div v-if="report.bankDepositAmount" class="xreport__row">
        <span>{{ $i('pos_report_bank_deposit') }}</span><span>{{ priceLabel(report.bankDepositAmount) }}</span>
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
export default {
  name: 'XReportView',
  props: {
    report: { type: Object, required: true }
  },
  computed: {
    isZ () { return this.report.zNumber != null; }
  },
  methods: {
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
  max-width: 420px;
  margin: 0 auto;
}
.xreport__head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 12px; }
.xreport__title { font-size: 1.3rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.xreport__znum { font-weight: 700; color: var(--pos-primary-dark, #159f63); }

.xreport__meta { padding-bottom: 12px; border-bottom: 1px dashed #cbd5e0; margin-bottom: 12px; }
.xreport__meta-row { display: flex; justify-content: space-between; color: #64748b; font-size: 0.88rem; padding: 2px 0; }

.xreport__section { margin-bottom: 16px; }
.xreport__section h3 { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #94a3b8; margin: 0 0 8px; }
.xreport__row { display: flex; justify-content: space-between; padding: 3px 0; color: var(--pos-ink, #292c34); }
.xreport__row--diff.is-off span:last-child { color: #ef4444; font-weight: 700; }

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
