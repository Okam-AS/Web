<template>
  <div class="receipt-wrap">
    <div ref="receipt" class="receipt">
      <div v-if="receipt.markingText" class="receipt__marking">
        {{ receipt.markingText }}
      </div>

      <header class="receipt__head">
        <div class="receipt__seller">
          {{ receipt.sellerLegalName }}
        </div>
        <div v-if="receipt.sellerOrgNumber" class="receipt__muted">
          {{ $i('pos_receipt_orgno') }} {{ receipt.sellerOrgNumber }} MVA
        </div>
        <div v-if="receipt.sellerAddress" class="receipt__muted">
          {{ receipt.sellerAddress }}
        </div>
      </header>

      <div class="receipt__title">
        {{ receipt.title }}
      </div>

      <div class="receipt__meta">
        <div class="receipt__meta-row">
          <span>{{ $i('pos_receipt_register') }}</span><span>{{ receipt.registerId }}</span>
        </div>
        <div class="receipt__meta-row">
          <span>{{ $i('pos_receipt_operator') }}</span><span>{{ receipt.operatorName }}</span>
        </div>
        <div class="receipt__meta-row">
          <span>{{ receipt.localDate }}</span><span>{{ receipt.localTime }}</span>
        </div>
        <div v-if="receipt.receiptNumber" class="receipt__meta-row">
          <span>{{ $i('pos_receipt_number') }}</span><span>#{{ receipt.receiptNumber }}</span>
        </div>
      </div>

      <div class="receipt__rule" />

      <div class="receipt__lines">
        <div v-for="line in receipt.lines" :key="line.lineNumber" class="receipt__line">
          <div class="receipt__line-main">
            <span class="receipt__line-name">{{ line.quantity }}× {{ line.productName }}</span>
            <span class="receipt__line-amount">{{ priceLabel(line.lineAmount) }}</span>
          </div>
          <div v-if="line.quantity > 1" class="receipt__line-sub">
            {{ $i('pos_receipt_unit') }} {{ priceLabel(line.unitAmount) }}
          </div>
          <div v-if="line.options" class="receipt__line-sub">
            {{ line.options }}
          </div>
          <div v-if="line.depositAmount > 0" class="receipt__line-sub">
            {{ $i('pos_deposit') }} {{ priceLabel(line.depositAmount) }}
          </div>
          <div v-if="line.discountAmount > 0" class="receipt__line-sub receipt__line-discount">
            {{ line.discountReason || $i('pos_discount') }} {{ negatedPriceLabel(line.discountAmount) }}
          </div>
        </div>
      </div>

      <div class="receipt__rule" />

      <div class="receipt__totals">
        <div class="receipt__total-grand">
          <span>{{ $i('pos_total') }}</span>
          <span>{{ priceLabel(receipt.grossAmount) }}</span>
        </div>
        <div v-if="receipt.tipAmount > 0" class="receipt__total-row">
          <span>{{ $i('pos_receipt_tip') }}</span><span>{{ priceLabel(receipt.tipAmount) }}</span>
        </div>
        <div v-if="receipt.roundingAmount" class="receipt__total-row">
          <span>{{ $i('pos_receipt_rounding') }}</span><span>{{ priceLabel(receipt.roundingAmount) }}</span>
        </div>
      </div>

      <div class="receipt__payments">
        <div v-for="(p, i) in receipt.payments" :key="i" class="receipt__total-row">
          <span>{{ paymentLabel(p.paymentType) }}</span>
          <span>{{ priceLabel(p.amount) }}</span>
        </div>
        <div v-if="receipt.tenderedAmount > 0" class="receipt__total-row">
          <span>{{ $i('pos_receipt_tendered') }}</span><span>{{ priceLabel(receipt.tenderedAmount) }}</span>
        </div>
        <div v-if="receipt.changeAmount > 0" class="receipt__total-row receipt__change">
          <span>{{ $i('pos_receipt_change') }}</span><span>{{ priceLabel(receipt.changeAmount) }}</span>
        </div>
      </div>

      <div class="receipt__rule" />

      <div v-if="taxLines.length" class="receipt__tax">
        <div class="receipt__tax-head">
          {{ $i('pos_receipt_vat_spec') }}
        </div>
        <div v-for="(t, i) in taxLines" :key="i" class="receipt__tax-row">
          <span>{{ t.vatPercent }}%</span>
          <span>{{ $i('pos_receipt_basis') }} {{ priceLabel(t.basis) }}</span>
          <span>{{ $i('pos_receipt_vat') }} {{ priceLabel(t.amount) }}</span>
        </div>
      </div>

      <footer class="receipt__foot">
        <div v-if="receipt.signature" class="receipt__sig">
          {{ $i('pos_receipt_signature') }}: {{ shortSig }}
        </div>
        <div v-if="receipt.keyVersion" class="receipt__muted">
          {{ $i('pos_receipt_key') }} {{ receipt.keyVersion }}
        </div>
      </footer>
    </div>
  </div>
</template>

<script>
// Renders a complete PosReceiptModel (SALREC / COPY / PROREC / TRAINREC / RETREC). The on-screen
// look mirrors a paper receipt; print() clones it into an 80 mm iframe so it prints on a bong roll
// without the surrounding POS chrome.
//
// The per-line discount prints its sign through `negatedAmountLabel`, never as a template literal in
// front of the interpolation. `−{{ priceLabel(x) }}` puts the minus where no formatter can see it, so
// an amount the absence rule withholds composes to `−—`: the negative of a figure nobody stated, on
// the one artifact in this component tree that an inspector holds in their hand. The `> 0` guard
// above hides the ordinary absences (`null`, `undefined`, `''`, `NaN`, a genuine zero) before the row
// renders at all, but it is a RELATIONAL test, not the absence rule, and the two do not agree
// everywhere: `Infinity > 0` is true while `isAmountStated(Infinity)` is false, so an amount the rule
// refuses still reaches the label. A guard nobody wrote as an absence gate is not one, and the sign
// belongs to the label either way — the only place that knows whether there is a figure to attach it
// to. See `lanes/L-XZ-RESIDUAL-SITES/mutation-log.md`.
import { negatedAmountLabel } from '~/utils/price';

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Courier New', monospace; color: #000; }
  .receipt { width: 72mm; padding: 4mm 3mm; font-size: 11px; line-height: 1.35; }
  .receipt__marking { text-align: center; font-weight: bold; border: 1px solid #000; padding: 2px; margin-bottom: 6px; }
  .receipt__head { text-align: center; margin-bottom: 6px; }
  .receipt__seller { font-weight: bold; }
  .receipt__muted { color: #000; font-size: 10px; }
  .receipt__title { text-align: center; font-weight: bold; margin: 6px 0; }
  .receipt__meta-row, .receipt__line-main, .receipt__total-row, .receipt__total-grand, .receipt__tax-row { display: flex; justify-content: space-between; gap: 6px; }
  .receipt__tax-row { display: flex; }
  .receipt__rule { border-top: 1px dashed #000; margin: 6px 0; }
  .receipt__line { margin-bottom: 3px; }
  .receipt__line-sub { font-size: 10px; padding-left: 8px; }
  .receipt__total-grand { font-weight: bold; font-size: 13px; }
  .receipt__change { font-weight: bold; }
  .receipt__tax-head, .receipt__tax-row { font-size: 10px; }
  .receipt__foot { margin-top: 8px; text-align: center; font-size: 9px; word-break: break-all; }
`;

export default {
  name: 'PosReceiptView',
  props: {
    receipt: { type: Object, required: true }
  },
  computed: {
    taxLines () { return this.receipt.taxLines || []; },
    shortSig () {
      const s = this.receipt.signature || '';
      return s.length > 24 ? s.slice(0, 24) + '…' : s;
    }
  },
  methods: {
    // The sign is resolved from the negated value and the magnitude alone goes to the formatter —
    // core's `priceLabel` renders -4 as "kr 0,-4" and -50 as "kr -,50". See `negatedAmountLabel`.
    negatedPriceLabel (amountMinor) {
      return negatedAmountLabel(amountMinor, this.priceLabel);
    },
    paymentLabel (type) {
      if (type === 'Cash') { return this.$i('pos_pay_cash'); }
      if (type === 'SurfboardTerminal' || type === 'DinteroTerminal') { return this.$i('pos_pay_card'); }
      if (type === 'Giftcard') { return this.$i('pos_pay_giftcard'); }
      return type;
    },
    print () {
      const node = this.$refs.receipt;
      if (!node) { return; }
      const iframe = document.createElement('iframe');
      iframe.setAttribute('aria-hidden', 'true');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write('<html><head><meta charset="utf-8"><title>Kvittering</title><style>' + PRINT_CSS + '</style></head><body>' + node.outerHTML + '</body></html>');
      doc.close();
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      setTimeout(() => {
        if (iframe.parentNode) { iframe.parentNode.removeChild(iframe); }
      }, 1500);
    }
  }
};
</script>

<style scoped>
.receipt-wrap { display: flex; justify-content: center; }
.receipt {
  width: 320px;
  background: #ffffff;
  color: #1f2937;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.4;
  padding: 18px 20px;
  border-radius: 10px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.12);
}

.receipt__marking { text-align: center; font-weight: 700; border: 1px solid #1f2937; padding: 4px; margin-bottom: 10px; letter-spacing: 0.04em; }
.receipt__head { text-align: center; margin-bottom: 8px; }
.receipt__seller { font-weight: 700; }
.receipt__muted { color: #64748b; font-size: 11px; }
.receipt__title { text-align: center; font-weight: 700; margin: 8px 0; }

.receipt__meta-row { display: flex; justify-content: space-between; gap: 8px; }
.receipt__rule { border-top: 1px dashed #cbd5e0; margin: 8px 0; }

.receipt__line { margin-bottom: 5px; }
.receipt__line-main { display: flex; justify-content: space-between; gap: 8px; }
.receipt__line-name { flex: 1; }
.receipt__line-amount { white-space: nowrap; }
.receipt__line-sub { font-size: 11px; color: #64748b; padding-left: 10px; }
.receipt__line-discount { color: #ef4444; }

.receipt__total-row { display: flex; justify-content: space-between; gap: 8px; }
.receipt__total-grand { display: flex; justify-content: space-between; gap: 8px; font-weight: 700; font-size: 15px; margin-bottom: 4px; }
.receipt__change { font-weight: 700; }

.receipt__tax { margin-top: 4px; }
.receipt__tax-head { font-size: 11px; font-weight: 700; margin-bottom: 2px; }
.receipt__tax-row { display: flex; justify-content: space-between; gap: 6px; font-size: 11px; color: #64748b; }

.receipt__foot { margin-top: 10px; text-align: center; font-size: 10px; color: #94a3b8; word-break: break-all; }
</style>
