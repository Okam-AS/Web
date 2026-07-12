<template>
  <div class="pinpad-overlay" @click.self="onClose">
    <div class="pinpad">
      <button type="button" class="pinpad__close" :aria-label="$i('common_cancel')" @click="onClose">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      <h2 class="pinpad__title">
        {{ title }}
      </h2>
      <p v-if="subtitle" class="pinpad__subtitle">
        {{ subtitle }}
      </p>

      <!-- Operator selection -->
      <div v-if="operators && operators.length" class="pinpad__operators">
        <button
          v-for="op in operators"
          :key="op.operatorId"
          type="button"
          class="pinpad__operator"
          :class="{ 'is-active': selectedOperatorId === op.operatorId, 'is-locked': op.isLockedOut }"
          :disabled="op.isLockedOut || busy"
          @click="selectOperator(op)"
        >
          <span class="pinpad__operator-name">{{ op.displayName }}</span>
          <span class="pinpad__operator-role">{{ roleLabel(op.roleLevel) }}</span>
          <span v-if="op.isLockedOut" class="pinpad__operator-locked">{{ $i('pos_operator_locked') }}</span>
          <span v-else-if="!op.hasPin" class="pinpad__operator-nopin">{{ $i('pos_operator_no_pin') }}</span>
        </button>
      </div>

      <!-- PIN entry -->
      <div class="pinpad__dots">
        <span
          v-for="i in dotCount"
          :key="i"
          class="pinpad__dot"
          :class="{ 'is-filled': i <= pin.length }"
        />
      </div>

      <p v-if="error" class="pinpad__error">
        {{ error }}
      </p>

      <PosNumpad @key="onKey" @backspace="onBackspace" @clear="pin = ''" />

      <button
        type="button"
        class="pinpad__submit"
        :disabled="!canSubmit"
        @click="submit"
      >
        <span v-if="busy">{{ $i('pos_working') }}</span>
        <span v-else>{{ confirmLabel || $i('pos_confirm') }}</span>
      </button>
    </div>
  </div>
</template>

<script>
import PosNumpad from '~/components/admin/pos/PosNumpad.vue';

// Reusable PIN entry. Used to switch operator (list = all active operators) and to authorise
// manager actions such as discounts / void / card refund (list = Leder/Eier operators). The
// caller owns the submit call and sets `error`/`busy` so backend messages surface next to the pad.
export default {
  name: 'PinPadModal',
  components: { PosNumpad },
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    operators: { type: Array, default: () => [] },
    error: { type: String, default: '' },
    busy: { type: Boolean, default: false },
    confirmLabel: { type: String, default: '' },
    maxPinLength: { type: Number, default: 8 }
  },
  data () {
    return {
      selectedOperatorId: null,
      pin: ''
    };
  },
  computed: {
    dotCount () {
      // Grow the dot row with the PIN but keep a minimum of four so it reads as a PIN field.
      return Math.max(4, this.pin.length);
    },
    canSubmit () {
      const hasOperator = !this.operators.length || !!this.selectedOperatorId;
      return hasOperator && this.pin.length >= 4 && !this.busy;
    }
  },
  mounted () {
    // Auto-select when there is exactly one candidate so a single-operator store skips the picker.
    const usable = (this.operators || []).filter(o => !o.isLockedOut);
    if (usable.length === 1) { this.selectedOperatorId = usable[0].operatorId; }
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.onKeydown);
  },
  methods: {
    roleLabel (role) {
      return this.$i('pos_role_' + String(role || '').toLowerCase()) || role;
    },
    selectOperator (op) {
      if (op.isLockedOut) { return; }
      this.selectedOperatorId = op.operatorId;
      this.pin = '';
    },
    onKey (d) {
      if (this.pin.length >= this.maxPinLength) { return; }
      this.pin += d;
    },
    onBackspace () {
      this.pin = this.pin.slice(0, -1);
    },
    onKeydown (e) {
      if (e.key >= '0' && e.key <= '9') {
        this.onKey(e.key);
      } else if (e.key === 'Backspace') {
        this.onBackspace();
      } else if (e.key === 'Enter' && this.canSubmit) {
        this.submit();
      } else if (e.key === 'Escape') {
        this.onClose();
      }
    },
    submit () {
      if (!this.canSubmit) { return; }
      this.$emit('submit', { operatorId: this.selectedOperatorId, pin: this.pin });
    },
    onClose () {
      if (this.busy) { return; }
      this.$emit('close');
    },
    // Clears the PIN so the caller can let the user retry after a wrong-PIN error.
    reset () {
      this.pin = '';
    }
  }
};
</script>

<style scoped>
.pinpad-overlay {
  position: fixed;
  inset: 0;
  background: rgba(18, 20, 26, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 16px;
}

.pinpad {
  position: relative;
  background: #ffffff;
  border-radius: 18px;
  padding: 28px 24px 24px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
}

.pinpad__close {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  padding: 4px;
}
.pinpad__close svg { width: 22px; height: 22px; }

.pinpad__title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--pos-ink, #292c34);
  margin: 0 0 4px;
  text-align: center;
}

.pinpad__subtitle {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0 0 16px;
  text-align: center;
}

.pinpad__operators {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 18px;
  max-height: 190px;
  overflow-y: auto;
}

.pinpad__operator {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
  min-height: 56px;
}

.pinpad__operator.is-active {
  border-color: var(--pos-primary, #1bb776);
  background: rgba(27, 183, 118, 0.08);
}

.pinpad__operator.is-locked { opacity: 0.55; cursor: not-allowed; }

.pinpad__operator-name { font-weight: 600; color: var(--pos-ink, #292c34); font-size: 0.95rem; }
.pinpad__operator-role { font-size: 0.75rem; color: #64748b; }
.pinpad__operator-locked { font-size: 0.7rem; color: #ef4444; font-weight: 600; }
.pinpad__operator-nopin { font-size: 0.7rem; color: #d97706; font-weight: 600; }

.pinpad__dots {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin: 6px 0 16px;
  min-height: 20px;
}

.pinpad__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #cbd5e0;
  transition: background 0.12s ease, border-color 0.12s ease;
}
.pinpad__dot.is-filled {
  background: var(--pos-primary, #1bb776);
  border-color: var(--pos-primary, #1bb776);
}

.pinpad__error {
  color: #ef4444;
  font-size: 0.88rem;
  font-weight: 600;
  text-align: center;
  margin: 0 0 12px;
}

.pinpad__submit {
  margin-top: 16px;
  width: 100%;
  height: 60px;
  border: none;
  border-radius: 12px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
}
.pinpad__submit:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>
