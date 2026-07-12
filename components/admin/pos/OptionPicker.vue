<template>
  <div class="option-picker" @click.self="$emit('close')">
    <div class="option-picker__panel">
      <header class="option-picker__head">
        <div>
          <h2 class="option-picker__title">
            {{ product.name }}
          </h2>
          <span class="option-picker__base">{{ priceLabel(product.amount, true) }}</span>
        </div>
        <button type="button" class="option-picker__close" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <div class="option-picker__body">
        <div v-for="variant in variants" :key="variant.id" class="option-picker__variant">
          <div class="option-picker__variant-head">
            <span class="option-picker__variant-name">{{ variant.name }}</span>
            <span v-if="variant.required" class="option-picker__req">{{ $i('pos_required') }}</span>
            <span v-else-if="variant.multiselect" class="option-picker__multi">{{ $i('pos_multi_select') }}</span>
          </div>
          <div class="option-picker__options">
            <button
              v-for="opt in variant.options"
              :key="opt.id"
              type="button"
              class="option-picker__option"
              :class="{ 'is-active': isSelected(variant, opt) }"
              @click="toggle(variant, opt)"
            >
              <span class="option-picker__option-name">{{ opt.name }}</span>
              <span v-if="opt.amount" class="option-picker__option-amount">{{ optionAmountLabel(opt) }}</span>
            </button>
          </div>
        </div>
      </div>

      <footer class="option-picker__foot">
        <div class="option-picker__qty">
          <button type="button" class="option-picker__qty-btn" :disabled="quantity <= 1" @click="quantity = Math.max(1, quantity - 1)">
            −
          </button>
          <span class="option-picker__qty-val">{{ quantity }}</span>
          <button type="button" class="option-picker__qty-btn" @click="quantity++">
            +
          </button>
        </div>
        <button
          type="button"
          class="option-picker__confirm"
          :disabled="!canConfirm"
          @click="confirm"
        >
          {{ $i('pos_add') }} · {{ priceLabel(totalAmount) }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
// POS-tailored variant/option selector (big touch targets, not the consumer ProductConfig). Emits
// `confirm` with { selectedOptionIds, quantity } once every required variant has a choice.
export default {
  name: 'OptionPicker',
  props: {
    product: { type: Object, required: true }
  },
  data () {
    return {
      // variantId -> array of selected option ids
      selections: {},
      quantity: 1
    };
  },
  computed: {
    variants () {
      return (this.product.productVariants || []).slice().sort((a, b) => a.orderIndex - b.orderIndex);
    },
    selectedOptionIds () {
      const ids = [];
      Object.keys(this.selections).forEach((vid) => {
        (this.selections[vid] || []).forEach(id => ids.push(id));
      });
      return ids;
    },
    extraAmount () {
      let extra = 0;
      this.variants.forEach((v) => {
        (this.selections[v.id] || []).forEach((id) => {
          const opt = (v.options || []).find(o => o.id === id);
          if (opt) { extra += opt.negativeAmount ? -opt.amount : opt.amount; }
        });
      });
      return extra;
    },
    totalAmount () {
      return (this.product.amount + this.extraAmount) * this.quantity;
    },
    canConfirm () {
      return this.variants.every(v => !v.required || (this.selections[v.id] && this.selections[v.id].length > 0));
    }
  },
  methods: {
    optionAmountLabel (opt) {
      const sign = opt.negativeAmount ? '−' : '+';
      return sign + ' ' + this.priceLabel(opt.amount, true);
    },
    isSelected (variant, opt) {
      const sel = this.selections[variant.id] || [];
      return sel.includes(opt.id);
    },
    toggle (variant, opt) {
      const current = this.selections[variant.id] || [];
      let next;
      if (variant.multiselect) {
        next = current.includes(opt.id)
          ? current.filter(id => id !== opt.id)
          : current.concat([opt.id]);
      } else {
        next = current.includes(opt.id) ? [] : [opt.id];
      }
      this.$set(this.selections, variant.id, next);
    },
    confirm () {
      if (!this.canConfirm) { return; }
      this.$emit('confirm', { selectedOptionIds: this.selectedOptionIds, quantity: this.quantity });
    }
  }
};
</script>

<style scoped>
.option-picker {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.6);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1100;
}
@media (min-width: 720px) {
  .option-picker { align-items: center; padding: 20px; }
}

.option-picker__panel {
  background: #ffffff;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.3);
}
@media (min-width: 720px) { .option-picker__panel { border-radius: 20px; } }

.option-picker__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 22px 14px;
  border-bottom: 1px solid #eef1f5;
}
.option-picker__title { font-size: 1.3rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.option-picker__base { color: #64748b; font-weight: 600; }
.option-picker__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.option-picker__close svg { width: 24px; height: 24px; }

.option-picker__body { flex: 1; overflow-y: auto; padding: 16px 22px; }
.option-picker__variant { margin-bottom: 20px; }
.option-picker__variant-head { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.option-picker__variant-name { font-weight: 700; color: var(--pos-ink, #292c34); }
.option-picker__req { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: #ef4444; }
.option-picker__multi { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; color: #64748b; }

.option-picker__options { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.option-picker__option {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  min-height: 58px;
  padding: 10px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
}
.option-picker__option.is-active { border-color: var(--pos-primary, #1bb776); background: rgba(27, 183, 118, 0.08); }
.option-picker__option-name { font-weight: 600; color: var(--pos-ink, #292c34); }
.option-picker__option-amount { font-size: 0.82rem; color: #64748b; font-weight: 600; }

.option-picker__foot {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 22px 20px;
  border-top: 1px solid #eef1f5;
}
.option-picker__qty { display: flex; align-items: center; gap: 6px; }
.option-picker__qty-btn {
  width: 46px;
  height: 46px;
  border: 1px solid #cbd5e0;
  background: #ffffff;
  border-radius: 10px;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--pos-ink, #292c34);
  cursor: pointer;
}
.option-picker__qty-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.option-picker__qty-val { min-width: 34px; text-align: center; font-size: 1.2rem; font-weight: 700; }

.option-picker__confirm {
  flex: 1;
  height: 56px;
  border: none;
  border-radius: 12px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
}
.option-picker__confirm:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>
