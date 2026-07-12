<template>
  <div class="open-price" @click.self="$emit('close')">
    <div class="open-price__panel">
      <header class="open-price__head">
        <h2 class="open-price__title">
          {{ $i('pos_open_price') }}
        </h2>
        <button type="button" class="open-price__close" @click="$emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <div class="open-price__body">
        <label class="open-price__label">{{ $i('pos_open_price_name') }}</label>
        <input v-model="name" type="text" class="open-price__input" :placeholder="$i('pos_open_price_name_ph')">

        <label class="open-price__label">{{ $i('pos_open_price_goods_group') }}</label>
        <select v-model.number="goodsGroupId" class="open-price__input">
          <option :value="null">
            {{ $i('pos_open_price_pick_group') }}
          </option>
          <option v-for="g in goodsGroups" :key="g.goodsGroupId" :value="g.goodsGroupId">
            {{ g.name }}<template v-if="g.code">
              ({{ g.code }})
            </template>
          </option>
        </select>

        <label class="open-price__label">{{ $i('pos_open_price_vat') }}</label>
        <div class="open-price__vat">
          <button
            v-for="rate in vatRates"
            :key="rate"
            type="button"
            class="open-price__vat-btn"
            :class="{ 'is-active': tax === rate }"
            @click="tax = rate"
          >
            {{ rate }}%
          </button>
        </div>

        <label class="open-price__label">{{ $i('pos_open_price_amount') }}</label>
        <AmountPad v-model="amount" />

        <p v-if="error" class="open-price__error">
          {{ error }}
        </p>
      </div>

      <footer class="open-price__foot">
        <button
          type="button"
          class="open-price__confirm"
          :disabled="!canConfirm"
          @click="confirm"
        >
          {{ $i('pos_add') }} · {{ priceLabel(amount) }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
import AmountPad from '~/components/admin/pos/AmountPad.vue';

// Open-price line entry. The backend requires a name, a positive amount and a goods group (SAF-T),
// so all three are enforced before the line can be added. Tax is a whole-percent VAT rate.
export default {
  name: 'OpenPriceModal',
  components: { AmountPad },
  props: {
    goodsGroups: { type: Array, default: () => [] }
  },
  data () {
    return {
      name: '',
      amount: 0,
      tax: 25,
      goodsGroupId: null,
      vatRates: [25, 15, 12, 0],
      error: ''
    };
  },
  computed: {
    canConfirm () {
      return this.name.trim().length > 0 && this.amount > 0 && this.goodsGroupId != null;
    }
  },
  methods: {
    confirm () {
      if (!this.canConfirm) {
        this.error = this.$i('pos_open_price_incomplete');
        return;
      }
      this.$emit('confirm', {
        name: this.name.trim(),
        amount: this.amount,
        tax: this.tax,
        goodsGroupId: this.goodsGroupId
      });
    }
  }
};
</script>

<style scoped>
.open-price {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 16px;
}

.open-price__panel {
  background: #ffffff;
  border-radius: 18px;
  width: 100%;
  max-width: 440px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}

.open-price__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 12px;
  border-bottom: 1px solid #eef1f5;
}
.open-price__title { font-size: 1.25rem; font-weight: 700; color: var(--pos-ink, #292c34); margin: 0; }
.open-price__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.open-price__close svg { width: 24px; height: 24px; }

.open-price__body { flex: 1; overflow-y: auto; padding: 16px 20px; }
.open-price__label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin: 10px 0 6px; text-transform: uppercase; letter-spacing: 0.03em; }
.open-price__input {
  width: 100%;
  height: 46px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 0 12px;
  font-size: 1rem;
  color: var(--pos-ink, #292c34);
  background: #ffffff;
}
.open-price__input:focus { outline: none; border-color: var(--pos-primary, #1bb776); }

.open-price__vat { display: flex; gap: 8px; }
.open-price__vat-btn {
  flex: 1;
  height: 44px;
  border: 1px solid #cbd5e0;
  background: #ffffff;
  border-radius: 10px;
  font-weight: 600;
  color: var(--pos-ink, #292c34);
  cursor: pointer;
}
.open-price__vat-btn.is-active { border-color: var(--pos-primary, #1bb776); background: rgba(27, 183, 118, 0.08); color: var(--pos-primary-dark, #159f63); }

.open-price__error { color: #ef4444; font-weight: 600; font-size: 0.85rem; margin: 12px 0 0; }

.open-price__foot { padding: 14px 20px 18px; border-top: 1px solid #eef1f5; }
.open-price__confirm {
  width: 100%;
  height: 54px;
  border: none;
  border-radius: 12px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 700;
  cursor: pointer;
}
.open-price__confirm:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>
