<template>
  <div class="cash-pad">
    <div class="cash-pad__summary">
      <div class="cash-pad__due">
        <span class="cash-pad__label">{{ $i('pos_cash_due') }}</span>
        <span class="cash-pad__due-amount">{{ priceLabel(due) }}</span>
      </div>
      <div class="cash-pad__change" :class="{ 'is-active': change > 0 }">
        <span class="cash-pad__label">{{ $i('pos_cash_change') }}</span>
        <span class="cash-pad__change-amount">{{ priceLabel(change) }}</span>
      </div>
    </div>

    <AmountPad v-model="tendered" :quick-amounts="presets" />

    <button
      type="button"
      class="cash-pad__confirm"
      :disabled="!canConfirm"
      @click="confirm"
    >
      {{ $i('pos_cash_register') }} · {{ priceLabel(tendered) }}
    </button>
  </div>
</template>

<script>
import AmountPad from '~/components/admin/pos/AmountPad.vue';

// Cash tender entry. Presets offer the exact amount plus the next round notes; change is estimated
// client-side (the server applies øre rounding authoritatively and returns the real change).
export default {
  name: 'CashPad',
  components: { AmountPad },
  props: {
    amount: { type: Number, required: true }
  },
  data () {
    // Default the tender to the rounded cash due (see `due`), not the raw amount.
    return { tendered: Math.round(this.amount / 100) * 100 };
  },
  computed: {
    // Cash is settled to the nearest whole krone (Norwegian øre-rounding). The server rounds the
    // due authoritatively and rejects a tender below it, so the pad must show and require the
    // rounded amount — otherwise tendering the raw øre amount (e.g. a 62,50 split part) is refused
    // as "less than the amount due". Amounts are øre; matches CashRoundingHelper.RoundToNearestKrone.
    due () { return Math.round(this.amount / 100) * 100; },
    presets () {
      const rounds = [5000, 10000, 20000, 50000, 100000];
      const set = [this.due];
      rounds.forEach((r) => {
        const up = Math.ceil(this.due / r) * r;
        if (up > this.due) { set.push(up); }
      });
      const unique = [];
      set.forEach((v) => { if (!unique.includes(v)) { unique.push(v); } });
      return unique.slice(0, 4);
    },
    change () { return Math.max(0, this.tendered - this.due); },
    canConfirm () { return this.due > 0 && this.tendered >= this.due; }
  },
  watch: {
    amount () { this.tendered = this.due; }
  },
  methods: {
    confirm () {
      if (!this.canConfirm) { return; }
      this.$emit('confirm', { tendered: this.tendered });
    }
  }
};
</script>

<style scoped>
.cash-pad { display: flex; flex-direction: column; gap: 16px; }

.cash-pad__summary { display: flex; gap: 12px; }
.cash-pad__due, .cash-pad__change {
  flex: 1;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 16px;
}
.cash-pad__change.is-active { background: rgba(27, 183, 118, 0.1); border-color: var(--pos-primary, #1bb776); }
.cash-pad__label { display: block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.03em; }
.cash-pad__due-amount { font-size: 1.5rem; font-weight: 700; color: var(--pos-ink, #292c34); }
.cash-pad__change-amount { font-size: 1.5rem; font-weight: 800; color: var(--pos-primary-dark, #159f63); }

.cash-pad__confirm {
  height: 60px;
  border: none;
  border-radius: 12px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
}
.cash-pad__confirm:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>
