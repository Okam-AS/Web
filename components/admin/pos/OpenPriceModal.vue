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
        <!-- WP-A2: one-tap presets. Picking one fills the name + goods group so the operator never
             types; "Egendefinert" reveals the manual fields for an ad hoc item. -->
        <template v-if="presets.length">
          <label class="open-price__label">{{ $i('pos_open_price_preset') }}</label>
          <div class="open-price__groups">
            <button
              v-for="p in presets"
              :key="p.openPricePresetId"
              type="button"
              class="open-price__group"
              :class="{ 'is-active': selectedPresetId === p.openPricePresetId }"
              @click="pickPreset(p)"
            >
              <span class="open-price__group-name">{{ p.name }}</span>
            </button>
            <button
              type="button"
              class="open-price__group"
              :class="{ 'is-active': selectedPresetId == null && manualMode }"
              @click="enterManual"
            >
              <span class="open-price__group-name">{{ $i('pos_open_price_custom') }}</span>
            </button>
          </div>
        </template>

        <template v-if="showManualFields">
          <label class="open-price__label">{{ $i('pos_open_price_name') }}</label>
          <input v-model="name" type="text" class="open-price__input" :placeholder="$i('pos_open_price_name_ph')">

        <label class="open-price__label">{{ $i('pos_open_price_goods_group') }}</label>
        <!-- The group is the rate selector: each button shows the rate that group gives for the
             bill's eat-in/take-away context, so picking a group is the only VAT input needed. -->
        <p v-if="!selectableGroups.length" class="open-price__no-groups">
          {{ $i('pos_no_goods_groups') }}
        </p>
        <div class="open-price__groups">
          <button
            v-for="g in selectableGroups"
            :key="g.goodsGroupId"
            type="button"
            class="open-price__group"
            :class="{ 'is-active': goodsGroupId === g.goodsGroupId }"
            @click="goodsGroupId = g.goodsGroupId"
          >
            <span class="open-price__group-name">{{ g.name }}</span>
            <span class="open-price__group-rate">
              <template v-if="hasProfile(g)">{{ rateFor(g) }} % · {{ contextLabel }}</template>
              <template v-else>{{ $i('pos_goods_group_no_profile') }}</template>
            </span>
          </button>
        </div>

        <!-- Legacy group without a VAT profile: the operator still picks the rate manually. -->
        <template v-if="selectedGroup && !groupHasProfile">
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
        </template>

        </template>

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
import bodyScrollLock from '~/utils/body-scroll-lock';
import AmountPad from '~/components/admin/pos/AmountPad.vue';

// Open-price line entry. The backend requires a name, a positive amount and a goods group (SAF-T),
// so all three are enforced before the line can be added. Tax is a whole-percent VAT rate.
export default {
  name: 'OpenPriceModal',
  mixins: [bodyScrollLock],
  components: { AmountPad },
  props: {
    goodsGroups: { type: Array, default: () => [] },
    // Configured open-price presets (WP-A2); one tap fills name + goods group.
    presets: { type: Array, default: () => [] },
    // The check's eat-in / take-away context ('TableDelivery' | 'SelfPickup'); drives the rate for a
    // profiled group.
    vatContext: { type: String, default: 'SelfPickup' }
  },
  data () {
    return {
      name: '',
      amount: 0,
      tax: 25,
      goodsGroupId: null,
      vatRates: [25, 15, 12, 0],
      // The chosen preset (WP-A2); null means manual entry. manualMode is set once the operator
      // explicitly picks "Egendefinert" so the manual fields show even before a group is chosen.
      selectedPresetId: null,
      manualMode: false,
      error: ''
    };
  },
  computed: {
    // Manual fields show when there are no presets at all, or the operator chose "Egendefinert".
    showManualFields () {
      return !this.presets.length || (this.selectedPresetId == null && this.manualMode);
    },
    selectableGroups () {
      return this.goodsGroups
        .filter(g => g.isActive !== false)
        .slice()
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name).localeCompare(String(b.name)));
    },
    selectedGroup () {
      return this.goodsGroups.find(g => g.goodsGroupId === this.goodsGroupId) || null;
    },
    groupHasProfile () {
      return this.hasProfile(this.selectedGroup);
    },
    // The rate the backend will apply for a profiled group: group x the bill's context. Shown on
    // the group button and sent as tax so the confirm price and the journal agree.
    derivedTax () {
      if (!this.groupHasProfile) { return null; }
      return this.rateFor(this.selectedGroup);
    },
    contextLabel () {
      return this.vatContext === 'TableDelivery' ? this.$i('pos_eat_in') : this.$i('pos_takeaway');
    },
    canConfirm () {
      if (this.amount <= 0) { return false; }
      // A preset carries its own name + goods group, so only a positive amount is needed.
      if (this.selectedPresetId != null) { return true; }
      return this.name.trim().length > 0 && this.goodsGroupId != null;
    }
  },
  methods: {
    pickPreset (p) {
      this.selectedPresetId = p.openPricePresetId;
      this.manualMode = false;
      // Prefill for display / receipt consistency; the backend derives name + group from the preset.
      this.name = p.name;
      this.goodsGroupId = p.goodsGroupId;
      this.error = '';
    },
    enterManual () {
      this.selectedPresetId = null;
      this.manualMode = true;
      this.name = '';
      this.goodsGroupId = null;
    },
    hasProfile (g) {
      return !!g && g.takeAwayVatPercent != null && g.eatInVatPercent != null && g.deliveryVatPercent != null;
    },
    rateFor (g) {
      return this.vatContext === 'TableDelivery' ? g.eatInVatPercent : g.takeAwayVatPercent;
    },
    confirm () {
      if (!this.canConfirm) {
        this.error = this.$i('pos_open_price_incomplete');
        return;
      }
      // Preset path: the backend resolves name + goods group from the preset id (one tap, no typing).
      if (this.selectedPresetId != null) {
        this.$emit('confirm', { openPricePresetId: this.selectedPresetId, amount: this.amount });
        return;
      }
      this.$emit('confirm', {
        name: this.name.trim(),
        amount: this.amount,
        // A profiled group's rate follows from group x context; the backend overrides it anyway, so
        // send the derived value for a consistent receipt. A legacy group keeps the picked rate.
        tax: this.groupHasProfile ? this.derivedTax : this.tax,
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

.open-price__no-groups { color: #b45309; font-size: 0.85rem; font-weight: 600; margin: 0 0 8px; }

.open-price__groups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.open-price__group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  min-height: 56px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
}
.open-price__group.is-active {
  border-color: var(--pos-primary, #1bb776);
  background: rgba(27, 183, 118, 0.08);
}
.open-price__group-name { font-weight: 600; color: var(--pos-ink, #292c34); font-size: 0.95rem; }
.open-price__group-rate { font-size: 0.78rem; font-weight: 600; color: #64748b; }
.open-price__group.is-active .open-price__group-rate { color: var(--pos-primary-dark, #159f63); }

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
