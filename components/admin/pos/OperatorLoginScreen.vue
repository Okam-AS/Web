<template>
  <div class="op-login">
    <div class="op-login__panel">
      <div class="op-login__head">
        <h1 class="op-login__title">
          {{ $i('pos_login_title') }}
        </h1>
        <p class="op-login__subtitle">
          {{ cashPointName }}
          <button type="button" class="op-login__change" @click="pos.requestCashPointChange()">
            {{ $i('pos_change_cashpoint') }}
          </button>
        </p>
      </div>

      <div class="op-login__body">
        <!-- Operator picker -->
        <div class="op-login__operators">
          <p v-if="!operators.length" class="op-login__empty">
            {{ $i('pos_no_operators') }}
          </p>
          <button
            v-for="op in operators"
            :key="op.operatorId"
            type="button"
            class="op-login__operator"
            :class="{ 'is-active': selectedOperatorId === op.operatorId, 'is-locked': op.isLockedOut }"
            :disabled="op.isLockedOut"
            @click="selectOperator(op)"
          >
            <span class="op-login__avatar">{{ initials(op.displayName) }}</span>
            <span class="op-login__op-text">
              <span class="op-login__op-name">{{ op.displayName }}</span>
            </span>
            <span v-if="op.isLockedOut" class="op-login__op-flag op-login__op-flag--locked">{{ $i('pos_operator_locked') }}</span>
            <span v-else-if="!op.hasPin" class="op-login__op-flag op-login__op-flag--nopin">{{ $i('pos_operator_no_pin') }}</span>
          </button>
        </div>

        <!-- PIN entry: the fourth digit logs in; no dedicated button. The status line below the
             dots always occupies its line, and errors shake the dots — nothing shifts layout. -->
        <div class="op-login__pin">
          <p class="op-login__pin-label">
            <template v-if="selectedOperator">
              {{ $i('pos_enter_pin_for', { name: selectedOperator.displayName }) }}
            </template>
            <template v-else>
              {{ $i('pos_select_operator') }}
            </template>
          </p>
          <div class="op-login__dots" :class="{ 'is-error': shaking, 'is-busy': busy }">
            <span
              v-for="i in 4"
              :key="i"
              class="op-login__dot"
              :class="{ 'is-filled': i <= pin.length }"
            />
          </div>
          <p class="op-login__status" :class="{ 'is-error': showError }">
            {{ statusText }}
          </p>
          <PosNumpad class="op-login__numpad" :class="{ 'is-waiting': busy }" @key="onKey" @backspace="onBackspace" @clear="onClear" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PosNumpad from '~/components/admin/pos/PosNumpad.vue';

// A PIN is always exactly four digits; the fourth digit submits automatically and a wrong
// PIN shakes the pad, so there is no dedicated login button.
const PIN_LENGTH = 4;

// Full-screen operator sign-in shown when a cash point is chosen but no valid operator session
// exists. Reads operators from the shell and calls pos.login(); errors surface inline.
export default {
  name: 'OperatorLoginScreen',
  components: { PosNumpad },
  inject: ['pos'],
  data () {
    return {
      selectedOperatorId: null,
      pin: '',
      error: '',
      // Neutral guidance ("pick an employee first") — shown in the status line without error styling.
      hint: '',
      busy: false,
      shaking: false,
      shakeTimer: null
    };
  },
  computed: {
    operators () { return this.pos.operators || []; },
    cashPointName () { return this.pos.cashPoint ? this.pos.cashPoint.name : ''; },
    selectedOperator () {
      return this.operators.find(o => o.operatorId === this.selectedOperatorId) || null;
    },
    // The status line always renders (fixed height) so appearing text never shifts the pad.
    statusText () {
      if (this.busy) { return this.$i('pos_pin_checking'); }
      return this.error || this.hint;
    },
    showError () {
      // Only a rejected attempt reads as an error; the "pick an employee" nudge stays neutral.
      return !this.busy && !!this.error;
    }
  },
  mounted () {
    const usable = this.operators.filter(o => !o.isLockedOut && o.hasPin);
    if (usable.length === 1) { this.selectedOperatorId = usable[0].operatorId; }
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.onKeydown);
    clearTimeout(this.shakeTimer);
  },
  methods: {
    initials (name) {
      return String(name || '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(p => p[0].toUpperCase())
        .join('');
    },
    selectOperator (op) {
      if (op.isLockedOut) { return; }
      this.selectedOperatorId = op.operatorId;
      this.pin = '';
      this.error = '';
      this.hint = '';
    },
    onKey (d) {
      // A full PIN means a login attempt is in flight (or shaking); ignore input until it resolves.
      if (this.busy || this.pin.length >= PIN_LENGTH) { return; }
      if (!this.selectedOperatorId) {
        this.hint = this.$i('pos_pinpad_pick_operator');
        this.shake();
        return;
      }
      this.error = '';
      this.hint = '';
      this.pin += d;
      if (this.pin.length === PIN_LENGTH) {
        this.submit();
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
    async submit () {
      this.busy = true;
      this.error = '';
      try {
        await this.pos.login({ operatorId: this.selectedOperatorId, pin: this.pin });
      } catch (e) {
        this.error = this.pos.errMsg(e);
        this.shake();
      } finally {
        this.busy = false;
      }
    }
  }
};
</script>

<style scoped>
.op-login {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 30% 20%, #1f2530, #12141a 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 900;
}

.op-login__panel {
  background: #ffffff;
  border-radius: 20px;
  width: 100%;
  max-width: 760px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
  overflow: hidden;
}

.op-login__head {
  padding: 24px 28px 16px;
  border-bottom: 1px solid #eef1f5;
}

.op-login__title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--pos-ink, #292c34);
  margin: 0;
}

.op-login__subtitle {
  margin: 4px 0 0;
  color: #64748b;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 12px;
}

.op-login__change {
  border: none;
  background: none;
  color: var(--pos-primary-dark, #159f63);
  font-weight: 600;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0;
}

.op-login__body {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 0;
}

@media (max-width: 680px) {
  .op-login__body { grid-template-columns: 1fr; }
}

.op-login__operators {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 440px;
  overflow-y: auto;
  border-right: 1px solid #eef1f5;
}

.op-login__empty { color: #94a3b8; text-align: center; margin-top: 40px; }

.op-login__operator {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: 2px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  cursor: pointer;
  text-align: left;
}
.op-login__operator.is-active {
  border-color: var(--pos-primary, #1bb776);
  background: rgba(27, 183, 118, 0.08);
}
.op-login__operator.is-locked { opacity: 0.5; cursor: not-allowed; }

.op-login__avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.op-login__op-text { display: flex; flex-direction: column; flex: 1; }
.op-login__op-name { font-weight: 600; color: var(--pos-ink, #292c34); }
.op-login__op-flag { font-size: 0.72rem; font-weight: 700; }
.op-login__op-flag--locked { color: #ef4444; }
.op-login__op-flag--nopin { color: #d97706; }

.op-login__pin {
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.op-login__pin-label {
  text-align: center;
  color: #64748b;
  font-size: 0.9rem;
  margin: 0 0 12px;
  min-height: 20px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.op-login__dots {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 10px;
  min-height: 18px;
}
.op-login__dot {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid #cbd5e0;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.op-login__dot.is-filled {
  background: var(--pos-primary, #1bb776);
  border-color: var(--pos-primary, #1bb776);
  animation: op-dot-pop 0.18s ease;
}

/* Wrong PIN: the dots turn red and tremble; the row shakes, never the whole pad. */
.op-login__dots.is-error {
  animation: op-dots-shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97);
}
.op-login__dots.is-error .op-login__dot.is-filled {
  background: #e0655c;
  border-color: #e0655c;
  animation: none;
}

/* Verifying: the filled dots breathe while the backend checks the PIN. */
.op-login__dots.is-busy .op-login__dot.is-filled {
  animation: op-dot-pulse 1.1s ease-in-out infinite;
}

/* Always occupies its line so appearing/disappearing text never moves the numpad. */
.op-login__status {
  min-height: 20px;
  margin: 0 0 12px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 500;
  color: #94a3b8;
  transition: color 0.15s ease;
}
.op-login__status.is-error {
  color: #c4554d;
}

.op-login__numpad {
  transition: opacity 0.2s ease;
}
.op-login__numpad.is-waiting {
  opacity: 0.55;
  pointer-events: none;
}

@keyframes op-dot-pop {
  0% { transform: scale(0.5); }
  60% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

@keyframes op-dot-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes op-dots-shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-7px); }
  40%, 60% { transform: translateX(7px); }
}
</style>
