<template>
  <div class="card-status" :class="'card-status--' + state">
    <div class="card-status__icon">
      <div v-if="isBusy" class="card-status__spinner" />
      <svg v-else-if="state === 'approved'" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    </div>

    <p class="card-status__amount">
      {{ priceLabel(amount) }}
    </p>
    <p class="card-status__message">
      {{ message || defaultMessage }}
    </p>

    <div class="card-status__actions">
      <button
        v-if="isBusy"
        type="button"
        class="card-status__btn card-status__btn--ghost"
        @click="$emit('cancel')"
      >
        {{ $i('pos_card_cancel') }}
      </button>

      <template v-if="isFailed">
        <button type="button" class="card-status__btn" @click="$emit('retry')">
          {{ $i('pos_card_retry') }}
        </button>
        <button type="button" class="card-status__btn card-status__btn--ghost" @click="$emit('abandon')">
          {{ $i('pos_card_abandon') }}
        </button>
      </template>
    </div>
  </div>
</template>

<script>
// Presentational card-terminal state. PaymentScreen owns the polling and drives `state`:
// initiating → waiting → processing → approved | declined | timeout | error.
export default {
  name: 'CardTerminalStatus',
  props: {
    state: { type: String, default: 'initiating' },
    // No default amount. This screen is on while a customer's card is in the reader, and `default: 0`
    // meant a check whose total had not arrived was announced to the operator as kr 0 — a figure
    // nobody computed, shown in the place the charged amount goes. Absent is now rendered as absent
    // by the money formatter; the terminal state beside it already says what is happening.
    amount: { type: Number, default: null },
    message: { type: String, default: '' }
  },
  computed: {
    isBusy () { return ['initiating', 'waiting', 'processing'].includes(this.state); },
    isFailed () { return ['declined', 'timeout', 'error'].includes(this.state); },
    defaultMessage () {
      const map = {
        initiating: this.$i('pos_card_initiating'),
        waiting: this.$i('pos_card_follow_terminal'),
        processing: this.$i('pos_card_processing'),
        approved: this.$i('pos_card_approved'),
        declined: this.$i('pos_card_declined'),
        timeout: this.$i('pos_card_timeout'),
        error: this.$i('pos_card_error')
      };
      return map[this.state] || '';
    }
  }
};
</script>

<style scoped>
.card-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px 16px;
  gap: 12px;
}

.card-status__icon {
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}
.card-status__icon svg { width: 44px; height: 44px; }
.card-status--approved .card-status__icon { background: rgba(27, 183, 118, 0.14); color: var(--pos-primary-dark, #159f63); }
.card-status--declined .card-status__icon,
.card-status--timeout .card-status__icon,
.card-status--error .card-status__icon { background: rgba(239, 68, 68, 0.12); color: #ef4444; }

.card-status__spinner {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 5px solid #e2e8f0;
  border-top-color: var(--pos-primary, #1bb776);
  animation: card-spin 0.8s linear infinite;
}
@keyframes card-spin { to { transform: rotate(360deg); } }

.card-status__amount { font-size: 1.8rem; font-weight: 800; color: var(--pos-ink, #292c34); margin: 4px 0 0; }
.card-status__message { color: #64748b; margin: 0; font-size: 1rem; }

.card-status__actions { display: flex; gap: 10px; margin-top: 10px; }
.card-status__btn {
  border: none;
  background: var(--pos-primary, #1bb776);
  color: #ffffff;
  font-weight: 700;
  padding: 12px 24px;
  border-radius: 10px;
  cursor: pointer;
}
.card-status__btn--ghost { background: #eef1f5; color: var(--pos-ink, #292c34); }
</style>
