<template>
  <AdminPage>
    <div class="container">
      <Loading v-if="isLoading" :loading="true" />

      <span v-if="payouts.length === 0 && !isLoading" class="empty-state">
        Ingen utbetalinger
      </span>

      <div
        v-for="payout in payouts"
        :key="payout.id"
        class="payout-item"
        :class="{ 'payout-item--sent': payout.invoiceSent }"
      >
        <div class="payout-header" @click="togglePayout(payout)">
          <span>{{ payout.store.legalName }}</span>
          <span class="payout-amount">
            <span v-if="payout.requested" class="requested-tag">Forespurt utbetaling</span>
            {{ priceLabel(payout.payoutAmount) }}
          </span>
        </div>

        <div v-if="showPayoutId === payout.okamPayoutId" class="payout-details">
          <div v-if="payout.requested" class="payout-info">
            Forespurt: {{ formatDate(payout.requested) }}
          </div>
          <div v-if="payout.payed" class="payout-info">
            Utbetalt: {{ formatDate(payout.payed) }}
          </div>

          <div v-if="payout.requested && !payout.payed" class="payout-amount-details">
            <div>Konto: {{ payout.storeBankAccountNumber }}</div>
            <div>Beløp: {{ priceLabel(payout.payoutAmount) }}</div>
          </div>

          <div class="payout-actions">
            <button
              v-if="!payout.requested && !payout.payed"
              :disabled="lockActions"
              class="btn"
              @click="requestPayout(payout)"
            >
              Forespør utbetaling
            </button>
            <button
              v-if="payout.requested && !payout.payed"
              :disabled="lockActions"
              class="btn"
              @click="completePayout(payout)"
            >
              Fullfør utbetaling
            </button>
            <button
              v-if="payout.payed && !payout.invoiceSent"
              :disabled="lockActions"
              class="btn"
              @click="sendInvoiceMail(payout)"
            >
              Send faktura
            </button>
          </div>
        </div>
      </div>

      <LoginModal v-if="showLogin" @close="closeLoginModal" />
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import Loading from '~/components/atoms/Loading.vue'
import LoginModal from '~/components/molecules/LoginModal.vue'

export default {
  components: { AdminPage, LoginModal, Loading },
  data: () => ({
    showLogin: false,
    isLoading: false,
    lockActions: false,
    payouts: [],
    showPayoutId: ''
  }),
  mounted () {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true
      return
    }
    this.loadPayouts()
  },
  methods: {
    closeLoginModal (isLoggedIn) {
      this.showLogin = !isLoggedIn
      if (isLoggedIn) {
        this.loadPayouts()
      }
    },
    sendInvoiceMail (payout) {
      if (this.lockActions) { return }
      this.lockActions = true
      this._payoutService
        .SendInvoiceMail(payout.okamPayoutId)
        .then(() => {
          this.loadPayouts()
        })
        .finally(() => {
          this.lockActions = false
        })
    },
    requestPayout (payout) {
      if (this.lockActions) { return }
      this.lockActions = true
      this._payoutService
        .RequestPayout(payout.storeId)
        .then(() => {
          this.loadPayouts()
        })
        .finally(() => {
          this.lockActions = false
        })
    },
    completePayout (payout) {
      if (this.lockActions) { return }
      this.lockActions = true
      this._payoutService
        .CompletePayout(payout.storeId)
        .then(() => {
          this.loadPayouts()
        })
        .finally(() => {
          this.lockActions = false
        })
    },
    loadPayouts () {
      this.isLoading = true
      this._payoutService
        .GetLatest()
        .then((payouts) => {
          this.payouts = Array.isArray(payouts) ? payouts : []
        })
        .finally(() => {
          this.isLoading = false
        })
    },
    togglePayout (payout) {
      this.showPayoutId = this.showPayoutId === payout.okamPayoutId ? '' : payout.okamPayoutId
    }
  }
}
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.empty-state {
  display: block;
  text-align: center;
  padding: 2rem;
  color: #666;
}

.payout-item {
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.payout-item--sent {
  opacity: 0.5;
}

.payout-header {
  background: #f7fafc;
  padding: 1rem 1.5rem;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: background-color 0.2s;
}

.payout-header:hover {
  background: #edf2f7;
}

.payout-amount {
  font-weight: 500;
}

.payout-details {
  padding: 1.5rem;
}

.payout-info {
  margin-bottom: 1rem;
  color: #4a5568;
}

.payout-amount-details {
  margin: 1.5rem 0;
  font-size: 1.5rem;
  font-weight: 500;
}

.payout-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  background-color: #4299e1;
  color: white;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: #3182ce;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.requested-tag {
  background: #fef3c7;
  color: #92400e;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  margin-right: 0.5rem;
}
</style>
