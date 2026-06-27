<template>
  <AdminPage>
    <div class="payment-page">
      <div class="page-header">
        <h1>Betaling</h1>
        <p class="page-description">Konfigurer betalingsmetoder og utbetalingsinnstillinger</p>
      </div>

      <div v-if="isLoading" class="loading-section">
        <Loading :loading="true" />
      </div>

      <template v-else-if="selectedStore">
        <!-- Section: Pay in Store -->
        <div class="form-section">
          <div class="section-header">
            <h2 class="section-title">Betal i butikk</h2>
            <label class="toggle-switch">
              <input v-model="paymentForm.payInStoreEnabled" type="checkbox" @change="markDirty" />
              <span class="toggle-slider" />
            </label>
          </div>
          <p class="section-hint">Kunder kan betale kontant eller med terminal i butikken</p>
        </div>

        <!-- Section: Giftcard -->
        <div class="form-section">
          <div class="section-header">
            <h2 class="section-title">Gavekort</h2>
            <label class="toggle-switch">
              <input v-model="paymentForm.giftcardEnabled" type="checkbox" @change="markDirty" />
              <span class="toggle-slider" />
            </label>
          </div>
          <p class="section-hint">Aktiver gavekortbetaling for kunder</p>

          <template v-if="paymentForm.giftcardEnabled">
            <div class="form-field" style="margin-top: 16px;">
              <label>Kontonummer for utbetaling</label>
              <div class="input-with-action">
                <input
                  v-model="paymentForm.giftcardBankAccountNumber"
                  type="text"
                  placeholder="1234.56.78901"
                  class="text-input"
                  @input="markDirty"
                />
              </div>
            </div>

            <div v-if="awaitingPayout !== null" class="payout-section">
              <div class="payout-balance">
                <span class="payout-balance__label">Tilgjengelig for utbetaling:</span>
                <span class="payout-balance__amount">{{ formatAmount(awaitingPayout.payoutAmount) }}</span>
              </div>
              <div v-if="awaitingPayout.payoutAmount > 0" class="payout-actions">
                <button
                  v-if="!awaitingPayout.requested"
                  class="btn btn-primary btn-sm"
                  :disabled="isRequestingPayout"
                  @click="requestGiftcardPayout"
                >
                  {{ isRequestingPayout ? 'Ber om utbetaling...' : 'Be om utbetaling' }}
                </button>
                <div v-else class="payout-requested">
                  <span class="badge badge--pending">Utbetaling forespurt</span>
                  <button class="btn-link" @click="cancelGiftcardPayout">Avbryt</button>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- Section: Dintero -->
        <div v-if="paymentConfig.dinteroAvailable" class="form-section">
          <div class="section-header">
            <h2 class="section-title">Dintero</h2>
            <label class="toggle-switch">
              <input v-model="paymentForm.dinteroEnabled" type="checkbox" @change="markDirty" />
              <span class="toggle-slider" />
            </label>
          </div>
          <p class="section-hint">Kortbetaling via Dintero</p>
          <div v-if="paymentConfig.dinteroPrice" class="price-badge">{{ paymentConfig.dinteroPrice }}</div>

          <div v-if="paymentForm.dinteroEnabled" class="subsections">
            <div v-if="paymentConfig.dinteroBillieAvailable" class="subsection-row">
              <div class="subsection-info">
                <span class="subsection-label">Billie (Kjøp nå, betal senere)</span>
                <span v-if="paymentConfig.dinteroBilliePrice" class="subsection-price">{{ paymentConfig.dinteroBilliePrice }}</span>
              </div>
              <label class="toggle-switch toggle-switch--sm">
                <input v-model="paymentForm.dinteroBillieEnabled" type="checkbox" @change="markDirty" />
                <span class="toggle-slider" />
              </label>
            </div>

            <div v-if="paymentConfig.dinteroKlarnaAvailable" class="subsection-row">
              <div class="subsection-info">
                <span class="subsection-label">Klarna</span>
                <span v-if="paymentConfig.dinteroKlarnaPrice" class="subsection-price">{{ paymentConfig.dinteroKlarnaPrice }}</span>
              </div>
              <label class="toggle-switch toggle-switch--sm">
                <input v-model="paymentForm.dinteroKlarnaEnabled" type="checkbox" @change="markDirty" />
                <span class="toggle-slider" />
              </label>
            </div>

            <div v-if="paymentConfig.dinteroKraviaAvailable" class="subsection-row">
              <div class="subsection-info">
                <span class="subsection-label">Kravia</span>
                <span v-if="paymentConfig.dinteroKraviaPrice" class="subsection-price">{{ paymentConfig.dinteroKraviaPrice }}</span>
              </div>
              <label class="toggle-switch toggle-switch--sm">
                <input v-model="paymentForm.dinteroKraviaEnabled" type="checkbox" @change="markDirty" />
                <span class="toggle-slider" />
              </label>
            </div>
          </div>
        </div>

        <!-- Section: Stripe -->
        <div class="form-section">
          <div class="section-header">
            <h2 class="section-title">Kortbetaling (Stripe)</h2>
            <label class="toggle-switch">
              <input v-model="paymentForm.stripeEnabled" type="checkbox" @change="onStripeToggle" />
              <span class="toggle-slider" />
            </label>
          </div>
          <p class="section-hint">Godta kortbetalinger online via Stripe</p>

          <template v-if="paymentForm.stripeEnabled">
            <!-- No Stripe account -->
            <div v-if="!paymentForm.stripeBankAccountId" class="stripe-setup">
              <p class="stripe-setup__text">Du har ikke tilknyttet en Stripe-konto ennå.</p>
              <button class="btn btn-primary btn-sm" :disabled="isStripeLoading" @click="registerStripe">
                {{ isStripeLoading ? 'Oppretter...' : 'Registrer Stripe-konto' }}
              </button>
            </div>

            <!-- Has Stripe account -->
            <div v-else-if="stripeAccount" class="stripe-account">
              <!-- Status badge -->
              <div class="stripe-status">
                <div v-if="stripeStatus === 'approved'" class="status-badge status-badge--approved">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Godkjent
                </div>
                <div v-else-if="stripeStatus === 'pending'" class="status-badge status-badge--pending">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Venter på verifisering
                </div>
                <div v-else class="status-badge status-badge--error">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Mangler dokumentasjon
                </div>
              </div>

              <!-- Bank info -->
              <div v-if="stripeBankInfo" class="stripe-bank-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {{ stripeBankInfo.bank_name }} •••• {{ stripeBankInfo.last4 }}
              </div>

              <!-- Actions -->
              <div class="stripe-actions">
                <button class="btn btn-secondary btn-sm" :disabled="isStripeLoading" @click="stripeLogin">
                  Logg inn i Stripe
                </button>
                <button v-if="stripeStatus !== 'approved'" class="btn btn-secondary btn-sm" :disabled="isStripeLoading" @click="stripeOnboard">
                  Last opp dokumenter
                </button>
                <button class="btn btn-danger btn-sm" :disabled="isStripeLoading" @click="confirmDeleteStripe">
                  Slett konto
                </button>
              </div>
            </div>

            <div v-else class="stripe-setup">
              <Loading :loading="true" />
            </div>
          </template>
        </div>

        <!-- Section: Report Emails -->
        <div class="form-section">
          <h2 class="section-title">Rapportering</h2>
          <p class="section-hint">Motta betalingsrapporter på e-post</p>
          <div class="form-field" style="margin-top: 12px;">
            <label>E-postadresse(r) for rapporter</label>
            <input
              v-model="paymentForm.sendInvoiceToEmails"
              type="text"
              placeholder="epost@butikk.no, epost2@butikk.no"
              class="text-input"
              @input="markDirty"
            />
            <span class="field-hint">Separér flere adresser med komma</span>
          </div>
        </div>

        <!-- Save Button -->
        <div class="save-bar">
          <button class="btn btn-primary" :disabled="isSaving || !isDirty" @click="savePayment">
            <span v-if="isSaving">Lagrer...</span>
            <span v-else>Lagre endringer</span>
          </button>
          <span v-if="saveStatus === 'saved'" class="save-confirmation">Lagret ✓</span>
          <span v-else-if="saveStatus === 'error'" class="save-error">Feil ved lagring</span>
        </div>
      </template>

      <div v-else class="empty-state">
        <h3>Velg en butikk</h3>
        <p>Velg en butikk for å konfigurere betalingsinnstillinger.</p>
      </div>

      <!-- Toast -->
      <transition name="toast">
        <div v-if="toast.show" class="toast" :class="`toast--${toast.type}`">
          {{ toast.message }}
        </div>
      </transition>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import Loading from '~/components/atoms/Loading.vue'

export default {
  name: 'Payment',
  components: { AdminPage, Loading },
  data() {
    return {
      isLoading: false,
      isSaving: false,
      isDirty: false,
      saveStatus: null,
      isRequestingPayout: false,
      isStripeLoading: false,
      paymentForm: {
        payInStoreEnabled: false,
        giftcardEnabled: false,
        giftcardBankAccountNumber: '',
        dinteroEnabled: false,
        dinteroBillieEnabled: false,
        dinteroKlarnaEnabled: false,
        dinteroKraviaEnabled: false,
        stripeEnabled: false,
        stripeBankAccountId: null,
        sendInvoiceToEmails: '',
      },
      paymentConfig: {
        dinteroAvailable: false,
        dinteroPrice: null,
        dinteroBillieAvailable: false,
        dinteroBilliePrice: null,
        dinteroKlarnaAvailable: false,
        dinteroKlarnaPrice: null,
        dinteroKraviaAvailable: false,
        dinteroKraviaPrice: null,
      },
      awaitingPayout: null,
      stripeAccount: null,
      toast: { show: false, message: '', type: 'success' },
    }
  },
  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore
    },
    userIsLoggedIn() {
      return this.$store.getters.userIsLoggedIn
    },
    stripeStatus() {
      if (!this.stripeAccount) return null
      const errs = this.stripeAccount.requirements?.errors || []
      const pending = this.stripeAccount.requirements?.pending_verification || []
      if (errs.length > 0) return 'missing_docs'
      if (pending.length > 0) return 'pending'
      return 'approved'
    },
    stripeBankInfo() {
      const data = this.stripeAccount?.external_accounts?.data
      return data && data.length > 0 ? data[0] : null
    },
  },
  watch: {
    selectedStore: {
      immediate: true,
      handler(storeId) {
        if (this.userIsLoggedIn && storeId) this.loadPaymentData(storeId)
      },
    },
    userIsLoggedIn: {
      immediate: true,
      handler(isLoggedIn) {
        if (isLoggedIn && this.selectedStore) this.loadPaymentData(this.selectedStore)
      },
    },
  },
  methods: {
    async loadPaymentData(storeId) {
      this.isLoading = true
      this.isDirty = false
      this.saveStatus = null
      try {
        const id = storeId || this.selectedStore
        const [store, payout] = await Promise.all([
          this._storeService.Get(id),
          this._payoutService.GetAwaiting(id).catch(() => null),
        ])

        this._storeService.GetPaymentConfig(id).then(config => {
          this.paymentConfig = config || {}
        }).catch(() => {})

        if (store) {
          this.paymentForm = {
            payInStoreEnabled: store.payInStoreEnabled || false,
            giftcardEnabled: store.giftcardEnabled || false,
            giftcardBankAccountNumber: store.giftcardBankAccountNumber || '',
            dinteroEnabled: store.dinteroEnabled || false,
            dinteroBillieEnabled: store.dinteroBillieEnabled || false,
            dinteroKlarnaEnabled: store.dinteroKlarnaEnabled || false,
            dinteroKraviaEnabled: store.dinteroKraviaEnabled || false,
            stripeEnabled: store.stripeEnabled || false,
            stripeBankAccountId: store.stripeBankAccountId || null,
            sendInvoiceToEmails: store.sendInvoiceToEmails || '',
          }

          if (store.stripeBankAccountId) {
            this.loadStripeAccount(store.stripeBankAccountId)
          }
        }

        this.awaitingPayout = payout
      } catch (e) {
        this.showToast('Kunne ikke laste betalingsinnstillinger', 'error')
      } finally {
        this.isLoading = false
      }
    },
    async loadStripeAccount(accountId) {
      try {
        this.stripeAccount = await this._bankAccountService.Get(accountId)
      } catch (e) {
        this.stripeAccount = null
      }
    },
    markDirty() {
      this.isDirty = true
      this.saveStatus = null
    },
    async savePayment() {
      this.isSaving = true
      this.saveStatus = null
      try {
        await this._storeService.UpdatePayment(this.selectedStore, {
          payInStoreEnabled: this.paymentForm.payInStoreEnabled,
          giftcardEnabled: this.paymentForm.giftcardEnabled,
          giftcardBankAccountNumber: this.paymentForm.giftcardBankAccountNumber,
          dinteroEnabled: this.paymentForm.dinteroEnabled,
          dinteroBillieEnabled: this.paymentForm.dinteroBillieEnabled,
          dinteroKlarnaEnabled: this.paymentForm.dinteroKlarnaEnabled,
          dinteroKraviaEnabled: this.paymentForm.dinteroKraviaEnabled,
          stripeEnabled: this.paymentForm.stripeEnabled,
          sendInvoiceToEmails: this.paymentForm.sendInvoiceToEmails,
        })
        this.isDirty = false
        this.saveStatus = 'saved'
        setTimeout(() => { this.saveStatus = null }, 3000)
      } catch (e) {
        this.saveStatus = 'error'
        this.showToast('Kunne ikke lagre endringer', 'error')
      } finally {
        this.isSaving = false
      }
    },
    async requestGiftcardPayout() {
      this.isRequestingPayout = true
      try {
        await this._payoutService.RequestPayout(this.selectedStore)
        this.awaitingPayout = { ...this.awaitingPayout, requested: true }
        this.showToast('Utbetalingsforespørsel sendt', 'success')
      } catch (e) {
        this.showToast('Kunne ikke be om utbetaling', 'error')
      } finally {
        this.isRequestingPayout = false
      }
    },
    async cancelGiftcardPayout() {
      try {
        await this._payoutService.CancelRequestPayout(this.selectedStore)
        this.awaitingPayout = { ...this.awaitingPayout, requested: false }
        this.showToast('Utbetalingsforespørsel avbrutt', 'success')
      } catch (e) {
        this.showToast('Kunne ikke avbryte forespørsel', 'error')
      }
    },
    onStripeToggle() {
      this.markDirty()
    },
    async registerStripe() {
      this.isStripeLoading = true
      try {
        const account = await this._bankAccountService.Create(this.selectedStore)
        this.paymentForm.stripeBankAccountId = account.id
        this.stripeAccount = account

        const onboardData = await this._bankAccountService.Onboard(account.id)
        if (onboardData?.url) {
          window.open(onboardData.url, '_blank')
        }
        this.markDirty()
      } catch (e) {
        this.showToast('Kunne ikke opprette Stripe-konto', 'error')
      } finally {
        this.isStripeLoading = false
      }
    },
    async stripeOnboard() {
      this.isStripeLoading = true
      try {
        const data = await this._bankAccountService.Onboard(this.paymentForm.stripeBankAccountId)
        if (data?.url) window.open(data.url, '_blank')
      } catch (e) {
        this.showToast('Kunne ikke åpne Stripe', 'error')
      } finally {
        this.isStripeLoading = false
      }
    },
    async stripeLogin() {
      this.isStripeLoading = true
      try {
        const data = await this._bankAccountService.Login(this.paymentForm.stripeBankAccountId)
        if (data?.url) window.open(data.url, '_blank')
      } catch (e) {
        this.showToast('Kunne ikke logge inn i Stripe', 'error')
      } finally {
        this.isStripeLoading = false
      }
    },
    async confirmDeleteStripe() {
      if (!confirm('Er du sikker på at du vil slette Stripe-kontoen? Dette kan ikke angres.')) return
      this.isStripeLoading = true
      try {
        await this._bankAccountService.Delete(this.paymentForm.stripeBankAccountId)
        this.paymentForm.stripeBankAccountId = null
        this.paymentForm.stripeEnabled = false
        this.stripeAccount = null
        this.markDirty()
        this.showToast('Stripe-konto slettet', 'success')
      } catch (e) {
        this.showToast('Kunne ikke slette Stripe-konto', 'error')
      } finally {
        this.isStripeLoading = false
      }
    },
    formatAmount(amount) {
      if (amount == null) return '0 kr'
      return `${(amount / 100).toLocaleString('nb-NO', { minimumFractionDigits: 2 })} kr`
    },
    showToast(message, type = 'success') {
      this.toast = { show: true, message, type }
      setTimeout(() => { this.toast.show = false }, 3000)
    },
  },
}
</script>

<style scoped>
.payment-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #292c34;
  margin: 0 0 4px;
}

.page-description {
  color: #6b7280;
  margin: 0;
  font-size: 14px;
}

.loading-section {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.empty-state {
  text-align: center;
  padding: 60px 24px;
  color: #6b7280;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px;
}

.form-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #292c34;
  margin: 0;
}

.section-hint {
  font-size: 13px;
  color: #9ca3af;
  margin: 0 0 0;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-field label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.text-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #292c34;
  background: #fafafa;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.text-input:focus {
  outline: none;
  border-color: #1bb776;
  background: white;
}

.field-hint {
  font-size: 12px;
  color: #9ca3af;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle-switch input { opacity: 0; width: 0; height: 0; }

.toggle-switch--sm {
  width: 36px;
  height: 20px;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: #e5e7eb;
  border-radius: 24px;
  transition: background 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.toggle-switch--sm .toggle-slider::before {
  width: 14px;
  height: 14px;
  left: 3px;
  top: 3px;
}

.toggle-switch input:checked + .toggle-slider { background: #1bb776; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }
.toggle-switch--sm input:checked + .toggle-slider::before { transform: translateX(16px); }

.price-badge {
  display: inline-block;
  background: #f0fdf4;
  color: #1bb776;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  margin-top: 10px;
}

.subsections {
  margin-top: 16px;
  border-top: 1px solid #f3f4f6;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.subsection-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.subsection-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.subsection-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.subsection-price {
  font-size: 12px;
  color: #9ca3af;
}

.payout-section {
  margin-top: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.payout-balance {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.payout-balance__label {
  font-size: 14px;
  color: #6b7280;
}

.payout-balance__amount {
  font-size: 18px;
  font-weight: 700;
  color: #292c34;
}

.payout-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.payout-requested {
  display: flex;
  align-items: center;
  gap: 12px;
}

.badge {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
}

.badge--pending { background: #fef3c7; color: #d97706; }

.btn-link {
  background: none;
  border: none;
  color: #dc2626;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.stripe-setup {
  margin-top: 16px;
  padding: 20px;
  background: #f9fafb;
  border-radius: 8px;
  text-align: center;
}

.stripe-setup__text {
  font-size: 14px;
  color: #6b7280;
  margin: 0 0 12px;
}

.stripe-account {
  margin-top: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.stripe-status {
  margin-bottom: 12px;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  padding: 6px 12px;
  border-radius: 8px;
}

.status-badge svg { width: 16px; height: 16px; }

.status-badge--approved { background: #d1fae5; color: #065f46; }
.status-badge--pending { background: #fef3c7; color: #d97706; }
.status-badge--error { background: #fee2e2; color: #dc2626; }

.stripe-bank-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #374151;
  margin-bottom: 16px;
}

.stripe-bank-info svg {
  width: 18px;
  height: 18px;
  color: #9ca3af;
}

.stripe-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.input-with-action {
  display: flex;
  gap: 8px;
}

.save-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 0;
}

.save-confirmation {
  font-size: 14px;
  font-weight: 500;
  color: #1bb776;
}

.save-error {
  font-size: 14px;
  font-weight: 500;
  color: #dc2626;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
}

.btn:hover { opacity: 0.85; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-sm { padding: 6px 14px; font-size: 13px; }

.btn-primary { background: linear-gradient(135deg, #1bb776, #159f63); color: white; }
.btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
.btn-danger { background: transparent; color: #dc2626; border: 1px solid #fca5a5; }
.btn-danger:hover { background: #fee2e2; }

.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.toast--success { background: #1bb776; color: white; }
.toast--error { background: #dc2626; color: white; }

.toast-enter-active, .toast-leave-active { transition: all 0.3s; }
.toast-enter, .toast-leave-to { opacity: 0; transform: translateY(12px); }

@media (max-width: 640px) {
  .payment-page { padding: 16px; }
  .stripe-actions { flex-direction: column; }
}
</style>
