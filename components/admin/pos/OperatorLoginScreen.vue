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
              <span class="op-login__op-role">{{ roleLabel(op.roleLevel) }}</span>
            </span>
            <span v-if="op.isLockedOut" class="op-login__op-flag op-login__op-flag--locked">{{ $i('pos_operator_locked') }}</span>
            <span v-else-if="!op.hasPin" class="op-login__op-flag op-login__op-flag--nopin">{{ $i('pos_operator_no_pin') }}</span>
          </button>
        </div>

        <!-- PIN entry -->
        <div class="op-login__pin">
          <p class="op-login__pin-label">
            <template v-if="selectedOperator">
              {{ $i('pos_enter_pin_for', { name: selectedOperator.displayName }) }}
            </template>
            <template v-else>
              {{ $i('pos_select_operator') }}
            </template>
          </p>
          <div class="op-login__dots">
            <span
              v-for="i in Math.max(4, pin.length)"
              :key="i"
              class="op-login__dot"
              :class="{ 'is-filled': i <= pin.length }"
            />
          </div>
          <p v-if="error" class="op-login__error">
            {{ error }}
          </p>
          <PosNumpad @key="onKey" @backspace="pin = pin.slice(0, -1)" @clear="pin = ''" />
          <button
            type="button"
            class="op-login__submit"
            :disabled="!canSubmit"
            @click="submit"
          >
            <span v-if="busy">{{ $i('pos_working') }}</span>
            <span v-else>{{ $i('pos_login_button') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PosNumpad from '~/components/admin/pos/PosNumpad.vue';

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
      busy: false
    };
  },
  computed: {
    operators () { return this.pos.operators || []; },
    cashPointName () { return this.pos.cashPoint ? this.pos.cashPoint.name : ''; },
    selectedOperator () {
      return this.operators.find(o => o.operatorId === this.selectedOperatorId) || null;
    },
    canSubmit () {
      return !!this.selectedOperatorId && this.pin.length >= 4 && !this.busy;
    }
  },
  mounted () {
    const usable = this.operators.filter(o => !o.isLockedOut && o.hasPin);
    if (usable.length === 1) { this.selectedOperatorId = usable[0].operatorId; }
    window.addEventListener('keydown', this.onKeydown);
  },
  beforeDestroy () {
    window.removeEventListener('keydown', this.onKeydown);
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
    roleLabel (role) {
      return this.$i('pos_role_' + String(role || '').toLowerCase()) || role;
    },
    selectOperator (op) {
      if (op.isLockedOut) { return; }
      this.selectedOperatorId = op.operatorId;
      this.pin = '';
      this.error = '';
    },
    onKey (d) {
      if (this.pin.length >= 8) { return; }
      this.pin += d;
    },
    onKeydown (e) {
      if (e.key >= '0' && e.key <= '9') {
        this.onKey(e.key);
      } else if (e.key === 'Backspace') {
        this.pin = this.pin.slice(0, -1);
      } else if (e.key === 'Enter' && this.canSubmit) {
        this.submit();
      }
    },
    async submit () {
      if (!this.canSubmit) { return; }
      this.busy = true;
      this.error = '';
      try {
        await this.pos.login({ operatorId: this.selectedOperatorId, pin: this.pin });
      } catch (e) {
        this.error = this.pos.errMsg(e);
        this.pin = '';
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
.op-login__op-role { font-size: 0.8rem; color: #64748b; }
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
}

.op-login__dots {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 14px;
  min-height: 18px;
}
.op-login__dot {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  border: 2px solid #cbd5e0;
}
.op-login__dot.is-filled {
  background: var(--pos-primary, #1bb776);
  border-color: var(--pos-primary, #1bb776);
}

.op-login__error {
  color: #ef4444;
  font-weight: 600;
  text-align: center;
  font-size: 0.85rem;
  margin: 0 0 10px;
}

.op-login__submit {
  margin-top: 14px;
  height: 58px;
  border: none;
  border-radius: 12px;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
}
.op-login__submit:disabled { background: #cbd5e0; cursor: not-allowed; }
</style>
