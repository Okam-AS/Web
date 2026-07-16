<template>
  <div class="discount-modal">
    <div class="discount-modal__overlay" @click.self="$emit('close')">
      <div class="discount-modal__panel">
        <header class="discount-modal__head">
          <h2 class="discount-modal__title">
            {{ $i('pos_discount') }}<template v-if="scope === 'line' && targetName">
              · {{ targetName }}
            </template>
          </h2>
          <button type="button" class="discount-modal__close" @click="$emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>

        <div class="discount-modal__body">
          <p v-if="!reasons.length" class="discount-modal__empty">
            {{ $i('pos_no_discount_reasons') }}
          </p>
          <div class="discount-modal__reasons">
            <button
              v-for="r in reasons"
              :key="r.id"
              type="button"
              class="discount-modal__reason"
              @click="selectReason(r)"
            >
              <span class="discount-modal__reason-name">{{ r.label }}</span>
              <span class="discount-modal__reason-value">{{ valueLabel(r) }}</span>
            </button>
          </div>
          <p v-if="error" class="discount-modal__error">
            {{ error }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// Applies a catalogue discount (the store's RegularDiscount entries flagged ShowInPos) to a line or
// the whole order under the acting operator. A fixed amount is stored in kroner, so it is scaled.
export default {
  name: 'DiscountModal',
  props: {
    reasons: { type: Array, default: () => [] },
    scope: { type: String, default: 'order' },
    targetName: { type: String, default: '' },
    busy: { type: Boolean, default: false },
    error: { type: String, default: '' }
  },
  methods: {
    valueLabel (r) {
      return r.type === 'Percent' ? r.discount + '%' : this.priceLabel(r.discount * 100);
    },
    selectReason (r) {
      this.$emit('confirm', { regularDiscountId: r.id });
    }
  }
};
</script>

<style scoped>
.discount-modal__overlay {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1150;
  padding: 16px;
}
.discount-modal__panel {
  background: #ffffff;
  border-radius: 18px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.discount-modal__head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; border-bottom: 1px solid #eef1f5; }
.discount-modal__title { font-size: 1.25rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.discount-modal__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.discount-modal__close svg { width: 24px; height: 24px; }
.discount-modal__body { padding: 16px 20px; overflow-y: auto; }
.discount-modal__empty { text-align: center; color: #94a3b8; padding: 20px 0; }
.discount-modal__reasons { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.discount-modal__reason {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-height: 68px;
  padding: 12px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
}
.discount-modal__reason:hover { border-color: var(--pos-primary, #1bb776); }
.discount-modal__reason-name { font-weight: 600; color: var(--pos-ink, #292c34); }
.discount-modal__reason-value { font-weight: 700; color: var(--pos-primary-dark, #159f63); }
.discount-modal__error { color: #ef4444; font-weight: 600; text-align: center; margin: 12px 0 0; }
</style>
