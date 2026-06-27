<template>
  <AdminPage>
    <div class="payment-page">
      <div class="page-header">
        <h1>{{ $i('payment_title') }}</h1>
        <p class="page-description">{{ $i('payment_description') }}</p>
      </div>

      <div v-if="isLoading" class="loading-section">
        <Loading :loading="true" />
      </div>

      <template v-else-if="selectedStore">
        <!-- Section: Pay in Store -->
        <div class="form-section">
          <div class="section-header">
            <h2 class="section-title">{{ $i('payment_payInStore') }}</h2>
            <label class="toggle-switch">
              <input v-model="paymentForm.payInStoreEnabled" type="checkbox" @change="markDirty" />
              <span class="toggle-slider" />
            </label>
          </div>
          <p class="section-hint">{{ $i('payment_payInStoreHint') }}</p>
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
          <p class="section-hint">{{ $i('payment_dinteroHint') }}</p>
          <div v-if="paymentConfig.dinteroPrice" class="price-badge">{{ paymentConfig.dinteroPrice }}</div>

          <div v-if="paymentForm.dinteroEnabled" class="subsections">
            <div v-if="paymentConfig.dinteroBillieAvailable" class="subsection-row">
              <div class="subsection-info">
                <span class="subsection-label">{{ $i('payment_billieLabel') }}</span>
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

        <!-- Section: Report Emails -->
        <div class="form-section">
          <h2 class="section-title">{{ $i('payment_reporting') }}</h2>
          <p class="section-hint">{{ $i('payment_reportingHint') }}</p>
          <div class="form-field" style="margin-top: 12px;">
            <label>{{ $i('payment_reportEmailsLabel') }}</label>
            <input
              v-model="paymentForm.sendInvoiceToEmails"
              type="text"
              :placeholder="$i('payment_reportEmailsPlaceholder')"
              class="text-input"
              @input="markDirty"
            />
            <span class="field-hint">{{ $i('payment_reportEmailsHint') }}</span>
          </div>
        </div>

        <!-- Save Button -->
        <div class="save-bar">
          <button class="btn btn-primary" :disabled="isSaving || !isDirty" @click="savePayment">
            <span v-if="isSaving">{{ $i('common_saving') }}</span>
            <span v-else>{{ $i('payment_saveChanges') }}</span>
          </button>
          <span v-if="saveStatus === 'saved'" class="save-confirmation">{{ $i('payment_saved') }}</span>
          <span v-else-if="saveStatus === 'error'" class="save-error">{{ $i('payment_saveError') }}</span>
        </div>
      </template>

      <div v-else class="empty-state">
        <h3>{{ $i('payment_selectStore') }}</h3>
        <p>{{ $i('payment_selectStoreHint') }}</p>
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
      paymentForm: {
        payInStoreEnabled: false,
        dinteroEnabled: false,
        dinteroBillieEnabled: false,
        dinteroKlarnaEnabled: false,
        dinteroKraviaEnabled: false,
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
        const store = await this._storeService.Get(id)

        this._storeService.GetPaymentConfig(id).then(config => {
          this.paymentConfig = config || {}
        }).catch(() => {})

        if (store) {
          const payment = store.payment || {}
          this.paymentForm = {
            payInStoreEnabled: payment.payInStoreEnabled || false,
            dinteroEnabled: payment.dinteroEnabled || false,
            dinteroBillieEnabled: payment.dinteroBillieEnabled || false,
            dinteroKlarnaEnabled: payment.dinteroKlarnaEnabled || false,
            dinteroKraviaEnabled: payment.dinteroKraviaEnabled || false,
            sendInvoiceToEmails: payment.sendInvoiceToEmails || '',
          }
        }
      } catch (e) {
        this.showToast(this.$i('payment_loadError'), 'error')
      } finally {
        this.isLoading = false
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
          dinteroEnabled: this.paymentForm.dinteroEnabled,
          dinteroBillieEnabled: this.paymentForm.dinteroBillieEnabled,
          dinteroKlarnaEnabled: this.paymentForm.dinteroKlarnaEnabled,
          dinteroKraviaEnabled: this.paymentForm.dinteroKraviaEnabled,
          sendInvoiceToEmails: this.paymentForm.sendInvoiceToEmails,
        })
        this.isDirty = false
        this.saveStatus = 'saved'
        setTimeout(() => { this.saveStatus = null }, 3000)
      } catch (e) {
        this.saveStatus = 'error'
        this.showToast(this.$i('payment_saveErrorToast'), 'error')
      } finally {
        this.isSaving = false
      }
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
}
</style>
