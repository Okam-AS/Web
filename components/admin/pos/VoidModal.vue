<template>
  <div class="void-modal">
    <div v-if="!showPin" class="void-modal__overlay" @click.self="$emit('close')">
      <div class="void-modal__panel">
        <header class="void-modal__head">
          <h2 class="void-modal__title">
            {{ $i('pos_void_check') }}
          </h2>
          <button type="button" class="void-modal__close" @click="$emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </header>
        <div class="void-modal__body">
          <p class="void-modal__warn">
            {{ $i('pos_void_warn') }}
          </p>
          <label class="void-modal__label">{{ $i('pos_void_reason') }}</label>
          <textarea v-model="reason" class="void-modal__textarea" :placeholder="$i('pos_void_reason_ph')" />
        </div>
        <footer class="void-modal__foot">
          <button
            type="button"
            class="void-modal__confirm"
            :disabled="!reason.trim()"
            @click="showPin = true"
          >
            {{ $i('pos_void_continue') }}
          </button>
        </footer>
      </div>
    </div>

    <PinPadModal
      v-if="showPin"
      :title="$i('pos_approve_void')"
      :subtitle="$i('pos_manager_pin_required')"
      :operators="managerOperators"
      :error="error"
      :busy="busy"
      :confirm-label="$i('pos_void_check')"
      @submit="onPinSubmit"
      @close="showPin = false"
    />
  </div>
</template>

<script>
import PinPadModal from '~/components/admin/pos/PinPadModal.vue';

// Voids an entire open check. Always requires a Leder/Eier approval PIN and a reason; the void is
// journalled (VOIDTRANS) and produces no receipt.
export default {
  name: 'VoidModal',
  components: { PinPadModal },
  props: {
    managerOperators: { type: Array, default: () => [] },
    busy: { type: Boolean, default: false },
    error: { type: String, default: '' }
  },
  data () {
    return { reason: '', showPin: false };
  },
  methods: {
    onPinSubmit ({ operatorId, pin }) {
      this.$emit('confirm', { approverOperatorId: operatorId, pin, reason: this.reason.trim() });
    }
  }
};
</script>

<style scoped>
.void-modal__overlay {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1150;
  padding: 16px;
}
.void-modal__panel {
  background: #ffffff;
  border-radius: 18px;
  width: 100%;
  max-width: 420px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}
.void-modal__head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 12px; border-bottom: 1px solid #eef1f5; }
.void-modal__title { font-size: 1.25rem; font-weight: 700; color: #ef4444; margin: 0; }
.void-modal__close { border: none; background: none; cursor: pointer; color: #94a3b8; padding: 4px; }
.void-modal__close svg { width: 24px; height: 24px; }
.void-modal__body { padding: 16px 20px; }
.void-modal__warn { color: #64748b; margin: 0 0 14px; }
.void-modal__label { display: block; font-size: 0.8rem; font-weight: 700; color: #64748b; margin: 0 0 6px; text-transform: uppercase; letter-spacing: 0.03em; }
.void-modal__textarea { width: 100%; min-height: 76px; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; font-size: 0.95rem; font-family: inherit; color: var(--pos-ink, #292c34); resize: vertical; }
.void-modal__textarea:focus { outline: none; border-color: #ef4444; }
.void-modal__foot { padding: 14px 20px 18px; border-top: 1px solid #eef1f5; }
.void-modal__confirm { width: 100%; height: 52px; border: none; border-radius: 12px; background: #ef4444; color: #fff; font-size: 1.05rem; font-weight: 700; cursor: pointer; }
.void-modal__confirm:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>
