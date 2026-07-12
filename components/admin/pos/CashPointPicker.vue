<template>
  <div class="cp-picker">
    <div class="cp-picker__panel">
      <h1 class="cp-picker__title">
        {{ $i('pos_pick_cashpoint_title') }}
      </h1>
      <p class="cp-picker__subtitle">
        {{ $i('pos_pick_cashpoint_subtitle') }}
      </p>

      <p v-if="!cashPoints.length" class="cp-picker__empty">
        {{ $i('pos_no_cashpoints') }}
        <a class="cp-picker__link" :href="'/admin/pos-settings?storeId=' + pos.storeId">{{ $i('pos_go_to_settings') }}</a>
      </p>

      <div v-else class="cp-picker__grid">
        <button
          v-for="cp in cashPoints"
          :key="cp.cashPointId"
          type="button"
          class="cp-picker__card"
          @click="pos.selectCashPoint(cp)"
        >
          <span class="cp-picker__card-name">{{ cp.name }}</span>
          <span class="cp-picker__card-register">{{ cp.registerId }}</span>
          <span class="cp-picker__card-provider">{{ providerLabel(cp) }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
// Startup overlay for choosing which cash point this device operates. Shown when more than one
// active cash point exists and none is remembered. The choice is persisted per store by the shell.
export default {
  name: 'CashPointPicker',
  inject: ['pos'],
  computed: {
    cashPoints () { return this.pos.cashPoints || []; }
  },
  methods: {
    providerLabel (cp) {
      return cp.surfboardTerminalId
        ? this.$i('pos_provider_surfboard')
        : (cp.dinteroTerminalId ? this.$i('pos_provider_dintero') : this.$i('pos_provider_none'));
    }
  }
};
</script>

<style scoped>
.cp-picker {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, #1f2530, #12141a 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 950;
}

.cp-picker__panel {
  background: #ffffff;
  border-radius: 20px;
  padding: 32px;
  width: 100%;
  max-width: 640px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
}

.cp-picker__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--pos-ink, #292c34);
  margin: 0 0 6px;
}
.cp-picker__subtitle { color: #64748b; margin: 0 0 24px; }
.cp-picker__empty { color: #64748b; text-align: center; padding: 24px 0; }
.cp-picker__link { color: var(--pos-primary-dark, #159f63); font-weight: 600; margin-left: 6px; }

.cp-picker__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}

.cp-picker__card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 20px 18px;
  border: 2px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  min-height: 110px;
  transition: border-color 0.12s ease, transform 0.06s ease;
}
.cp-picker__card:hover { border-color: var(--pos-primary, #1bb776); }
.cp-picker__card:active { transform: translateY(1px); }

.cp-picker__card-name { font-size: 1.1rem; font-weight: 700; color: var(--pos-ink, #292c34); }
.cp-picker__card-register { font-size: 0.8rem; color: #94a3b8; }
.cp-picker__card-provider { margin-top: auto; font-size: 0.78rem; color: #64748b; font-weight: 600; }
</style>
