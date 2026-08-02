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
          <span v-if="op.isLockedOut" class="pinpad__operator-locked">{{ $i('pos_operator_locked') }}</span>
          <span v-else-if="!op.hasPin" class="pinpad__operator-nopin">{{ $i('pos_operator_no_pin') }}</span>
        </button>
      </div>

      <!-- PIN entry: the status line below the dots always occupies its line, and errors shake
           the dots — nothing shifts layout. Hidden in pinless mode (fast operator switch), where a
           tap on the operator is the whole action. -->
      <template v-if="!pinless">
        <div class="pinpad__dots" :class="{ 'is-error': shaking, 'is-busy': busy }">
          <span
            v-for="i in dotCount"
            :key="i"
            class="pinpad__dot"
            :class="{ 'is-filled': i <= pin.length }"
          />
        </div>

        <p class="pinpad__status" :class="{ 'is-error': showError }">
          {{ statusText }}
        </p>

        <PosNumpad class="pinpad__numpad" :class="{ 'is-waiting': busy }" @key="onKey" @backspace="onBackspace" @clear="onClear" />
      </template>
      <p v-else-if="showError" class="pinpad__status is-error">
        {{ statusText }}
      </p>
    </div>
  </div>
</template>

<script>
import bodyScrollLock from '~/utils/body-scroll-lock';
import PosNumpad from '~/components/admin/pos/PosNumpad.vue';

// A PIN is always exactly four digits, so the pad has no submit button: the fourth digit
// submits automatically, and a rejected attempt shakes the pad and clears the dots for a retry.
const PIN_LENGTH = 4;

// Reusable PIN entry. Used to switch operator (list = all active operators). The caller owns the
// submit call and sets `error`/`busy` so backend messages surface next to the pad.
export default {
  name: 'PinPadModal',
  mixins: [bodyScrollLock],
  components: { PosNumpad },
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    operators: { type: Array, default: () => [] },
    error: { type: String, default: '' },
    busy: { type: Boolean, default: false },
    // Fast operator switch: a tap on an operator switches the session with no PIN (WP-B3).
    pinless: { type: Boolean, default: false }
  },
  data () {
    return {
      selectedOperatorId: null,
      pin: '',
      localError: '',
      shaking: false,
      shakeTimer: null
    };
  },
  computed: {
    dotCount () {
      return PIN_LENGTH;
    },
    // The status line always renders (fixed height) so appearing text never shifts the pad.
    statusText () {
      if (this.busy) { return this.$i('pos_pin_checking'); }
      return this.error || this.localError;
    },
    showError () {
      // Only a rejected attempt reads as an error; the "pick an employee" nudge stays neutral.
      return !this.busy && !!this.error;
    }
  },
  watch: {
    // Callers surface a failed attempt through the `error` prop; shake and clear so the
    // operator can immediately type again.
    error (value) {
      if (value) { this.shake(); }
    },
    // Fallback for callers that reuse the exact same error message on consecutive failures
    // (the `error` watcher never fires then): the busy→idle transition marks the attempt done.
    busy (value, old) {
      if (old && !value && this.error && this.pin.length) { this.shake(); }
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
    clearTimeout(this.shakeTimer);
  },
  methods: {
    selectOperator (op) {
      if (op.isLockedOut) { return; }
      this.selectedOperatorId = op.operatorId;
      this.pin = '';
      this.localError = '';
      // Pinless (fast switch): the tap itself is the action — no PIN digits to enter.
      if (this.pinless && !this.busy) {
        this.$emit('submit', { operatorId: op.operatorId, pin: '' });
      }
    },
    onKey (d) {
      // A full PIN means an attempt is in flight (or shaking); ignore input until it resolves.
      if (this.busy || this.pin.length >= PIN_LENGTH) { return; }
      if (this.operators.length && !this.selectedOperatorId) {
        this.localError = this.$i('pos_pinpad_pick_operator');
        this.shake();
        return;
      }
      this.localError = '';
      this.pin += d;
      if (this.pin.length === PIN_LENGTH) {
        this.$emit('submit', { operatorId: this.selectedOperatorId, pin: this.pin });
      }
    },
    onBackspace () {
      if (this.busy || this.shaking) { return; }
      this.pin = this.pin.slice(0, -1);
    },
    onClear () {
      if (this.busy || this.shaking) { return; }
      this.pin = '';
    },
    onKeydown (e) {
      if (e.key >= '0' && e.key <= '9') {
        this.onKey(e.key);
      } else if (e.key === 'Backspace') {
        this.onBackspace();
      } else if (e.key === 'Escape') {
        this.onClose();
      }
    },
    // Shake the dots (iOS style): the filled dots turn red and tremble, then empty once the
    // shake has finished so the rejection reads before the retry starts.
    shake () {
      if (this.shaking) { return; }
      this.shaking = true;
      this.shakeTimer = setTimeout(() => {
        this.shaking = false;
        this.pin = '';
      }, 500);
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
.pinpad__operator-locked { font-size: 0.7rem; color: #ef4444; font-weight: 600; }
.pinpad__operator-nopin { font-size: 0.7rem; color: #d97706; font-weight: 600; }

.pinpad__dots {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin: 6px 0 10px;
  min-height: 20px;
}

.pinpad__dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid #cbd5e0;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.pinpad__dot.is-filled {
  background: var(--pos-primary, #1bb776);
  border-color: var(--pos-primary, #1bb776);
  animation: pinpad-dot-pop 0.18s ease;
}

/* Wrong PIN: the dots turn red and tremble; the row shakes, never the whole pad. */
.pinpad__dots.is-error {
  animation: pinpad-dots-shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
.pinpad__dots.is-error .pinpad__dot.is-filled {
  background: #e0655c;
  border-color: #e0655c;
  animation: none;
}

/* Verifying: the filled dots breathe while the backend checks the PIN. */
.pinpad__dots.is-busy .pinpad__dot.is-filled {
  animation: pinpad-dot-pulse 1.1s ease-in-out infinite;
}

/* Always occupies its line so appearing/disappearing text never moves the numpad. */
.pinpad__status {
  min-height: 20px;
  margin: 0 0 12px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 500;
  color: #94a3b8;
  transition: color 0.15s ease;
}
.pinpad__status.is-error {
  color: #c4554d;
}

.pinpad__numpad {
  transition: opacity 0.2s ease;
}
.pinpad__numpad.is-waiting {
  opacity: 0.55;
  pointer-events: none;
}

@keyframes pinpad-dot-pop {
  0% { transform: scale(0.5); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes pinpad-dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes pinpad-dots-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-7px); }
  40%, 60% { transform: translateX(7px); }
}
</style>
