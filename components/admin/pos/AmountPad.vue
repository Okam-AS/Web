<template>
  <div class="amount-pad">
    <div class="amount-pad__display">
      <span class="amount-pad__value">{{ priceLabel(amount) }}</span>
    </div>

    <div v-if="quickAmounts && quickAmounts.length" class="amount-pad__quick">
      <button
        v-for="q in quickAmounts"
        :key="q"
        type="button"
        class="amount-pad__quick-btn"
        @click="setQuick(q)"
      >
        {{ priceLabel(q, true) }}
      </button>
    </div>

    <PosNumpad :double-zero="true" @key="onKey" @backspace="onBackspace" @clear="clear" />
  </div>
</template>

<script>
import PosNumpad from '~/components/admin/pos/PosNumpad.vue';

// Cashier-style amount entry in minor units (øre). Digits shift in from the right — pressing
// 1,2,5,0,0 yields "kr 125,00" — matching how payment terminals accept amounts. v-model compatible
// (value prop + input event). Quick-amount buttons are optional preset totals in øre.
const MAX = 9999999999; // 99 999 999,99

export default {
  name: 'AmountPad',
  components: { PosNumpad },
  props: {
    value: { type: Number, default: 0 },
    quickAmounts: { type: Array, default: () => [] }
  },
  data () {
    return { amount: this.value || 0 };
  },
  watch: {
    value (v) { this.amount = v || 0; }
  },
  methods: {
    emit () { this.$emit('input', this.amount); },
    onKey (d) {
      const next = d === '00' ? this.amount * 100 : this.amount * 10 + Number(d);
      if (next > MAX) { return; }
      this.amount = next;
      this.emit();
    },
    onBackspace () {
      this.amount = Math.floor(this.amount / 10);
      this.emit();
    },
    clear () {
      this.amount = 0;
      this.emit();
    },
    setQuick (q) {
      this.amount = q;
      this.emit();
    }
  }
};
</script>

<style scoped>
.amount-pad { display: flex; flex-direction: column; gap: 14px; }

.amount-pad__display {
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 18px 20px;
  text-align: right;
}
.amount-pad__value {
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--pos-ink, #292c34);
  font-variant-numeric: tabular-nums;
}

.amount-pad__quick {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.amount-pad__quick-btn {
  height: 46px;
  border: 1px solid #cbd5e0;
  background: #ffffff;
  border-radius: 10px;
  font-weight: 600;
  color: var(--pos-ink, #292c34);
  cursor: pointer;
  font-size: 0.95rem;
}
.amount-pad__quick-btn:hover { background: #f1f5f9; }
</style>
