<template>
  <div class="drawer-txn" @click.self="$emit('close')">
    <div class="drawer-txn__panel">
      <header class="drawer-txn__head">
        <h2 class="drawer-txn__title">
          {{ isPayIn ? $i('pos_pay_in') : $i('pos_pay_out') }}
        </h2>
        <button type="button" class="drawer-txn__close" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <div class="drawer-txn__body">
        <AmountPad v-model="amount" />
        <p v-if="error" class="drawer-txn__error">
          {{ error }}
        </p>
      </div>

      <footer class="drawer-txn__foot">
        <button
          type="button"
          class="drawer-txn__confirm"
          :disabled="amount <= 0 || busy"
          @click="confirm"
        >
          {{ isPayIn ? $i('pos_pay_in') : $i('pos_pay_out') }} · {{ priceLabel(amount) }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
import AmountPad from '~/components/admin/pos/AmountPad.vue';

// Records a manual cash movement (deposit / withdrawal) against the open trading day.
export default {
  name: 'DrawerTransactionModal',
  components: { AmountPad },
  props: {
    type: { type: String, required: true },
    busy: { type: Boolean, default: false },
    error: { type: String, default: '' }
  },
  data () {
    return { amount: 0 };
  },
  computed: {
    isPayIn () { return this.type === 'PayIn'; }
  },
  methods: {
    confirm () {
      if (this.amount <= 0) { return; }
      this.$emit('confirm', { amount: this.amount });
    }
  }
};
</script>

<style scoped>
.drawer-txn {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 16px;
}
.drawer-txn__panel {
  background: #ffffff;
  border-radius: 18px;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.drawer-txn__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
  border-bottom: 1px solid #eef1f5;
}
.drawer-txn__title { font-size: 1.25rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.drawer-txn__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.drawer-txn__close svg { width: 24px; height: 24px; }
.drawer-txn__body { padding: 16px 20px; }
.drawer-txn__label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.03em; }
.drawer-txn__input { width: 100%; height: 46px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 0 12px; font-size: 1rem; margin-bottom: 14px; color: var(--pos-ink, #292c34); }
.drawer-txn__input:focus { outline: none; border-color: var(--pos-primary, #1bb776); }
.drawer-txn__error { color: #ef4444; font-weight: 600; font-size: 0.85rem; margin: 12px 0 0; }
.drawer-txn__foot { padding: 14px 20px 18px; border-top: 1px solid #eef1f5; }
.drawer-txn__confirm { width: 100%; height: 54px; border: none; border-radius: 12px; background: var(--pos-primary, #1bb776); color: #fff; font-size: 1.05rem; font-weight: 700; cursor: pointer; }
.drawer-txn__confirm:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>
