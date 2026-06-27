<template>
  <AdminPage @login-success="loadData">
    <div class="discount-page">
      <div class="page-header">
        <a href="/admin/discounts" class="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Rabatter
        </a>
        <h1>{{ isNew ? 'Ny rabatt' : 'Rediger rabatt' }}</h1>
      </div>

      <div v-if="isLoading" class="loading-section">
        <Loading :loading="true" />
      </div>

      <template v-else-if="localDiscount">
        <div v-if="errors.length" class="error-banner">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <ul>
            <li v-for="(err, i) in errors" :key="i">{{ err }}</li>
          </ul>
        </div>

        <!-- Label -->
        <div class="form-section">
          <h2 class="section-title">Navn</h2>
          <div class="form-field" :class="{ 'form-field--error': fieldErrors.label }">
            <label>Navn på rabatt</label>
            <input
              v-model="localDiscount.label"
              type="text"
              maxlength="25"
              placeholder="F.eks. Sommerrabatt"
              class="text-input"
            />
            <span class="field-hint">{{ (localDiscount.label || '').length }}/25 tegn</span>
          </div>
        </div>

        <!-- Amount & Type -->
        <div class="form-section">
          <h2 class="section-title">Rabattverdi</h2>
          <div class="amount-row">
            <div class="form-field" :class="{ 'form-field--error': fieldErrors.discount }">
              <label>Beløp</label>
              <input
                v-model="localDiscount.discount"
                type="number"
                min="0"
                placeholder="0"
                class="text-input"
              />
            </div>
            <div class="type-toggle">
              <button
                class="type-btn"
                :class="{ 'type-btn--active': localDiscount.type === 'Amount' }"
                @click="localDiscount.type = 'Amount'"
              >
                kr
              </button>
              <button
                class="type-btn"
                :class="{ 'type-btn--active': localDiscount.type === 'Percent' }"
                @click="localDiscount.type = 'Percent'"
              >
                %
              </button>
            </div>
          </div>
        </div>

        <!-- Applicability -->
        <div class="form-section">
          <h2 class="section-title">Gjelder for</h2>
          <div class="form-field">
            <label>Bruksområde</label>
            <select v-model="localDiscount.applicability" class="select-input">
              <option value="Order">Hele ordren</option>
              <option value="HomeDelivery">Kun hjemlevering</option>
              <option value="SelfPickup">Kun henting</option>
              <option value="DineIn">Kun spis inne</option>
              <option value="ProductsInclusive">Bestemte produkter (inklusiv)</option>
              <option value="ProductsExclusive">Bestemte produkter (eksklusiv)</option>
            </select>
          </div>
          <div
            v-if="localDiscount.applicability === 'ProductsInclusive' || localDiscount.applicability === 'ProductsExclusive'"
            class="product-selector-row"
          >
            <button class="btn btn-secondary" @click="openProductPicker">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="btn-icon">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Velg produkter
            </button>
            <span class="product-count-label">
              {{ selectedProductIds.length }} produkt{{ selectedProductIds.length !== 1 ? 'er' : '' }} valgt
            </span>
          </div>
        </div>

        <!-- Code -->
        <div class="form-section">
          <h2 class="section-title">Kampanjekode (valgfritt)</h2>
          <div class="form-field">
            <label>Kode</label>
            <input
              v-model="localDiscount.code"
              type="text"
              maxlength="20"
              placeholder="F.eks. SOMMER20"
              class="text-input text-input--mono"
            />
            <span class="field-hint">Legg til en kode kunder må oppgi for å bruke rabatten</span>
          </div>
        </div>

        <!-- Conditions -->
        <div class="form-section">
          <h2 class="section-title">Betingelser</h2>

          <div class="condition-row">
            <div class="condition-toggle-row">
              <label class="toggle-label">Minimum ordreverdi</label>
              <label class="toggle-switch">
                <input v-model="localDiscount.minimumOrderAmountEnabled" type="checkbox" />
                <span class="toggle-slider" />
              </label>
            </div>
            <div v-if="localDiscount.minimumOrderAmountEnabled" class="condition-input">
              <input
                v-model="localDiscount.minimumOrderAmount"
                type="number"
                min="0"
                placeholder="0"
                class="text-input"
              />
              <span class="input-suffix">kr</span>
            </div>
          </div>

          <div class="condition-row">
            <div class="condition-toggle-row">
              <label class="toggle-label">Maks antall ganger brukt totalt</label>
              <label class="toggle-switch">
                <input v-model="localDiscount.maximumTotalUsageCountEnabled" type="checkbox" />
                <span class="toggle-slider" />
              </label>
            </div>
            <div v-if="localDiscount.maximumTotalUsageCountEnabled" class="condition-input">
              <input
                v-model="localDiscount.maximumTotalUsageCount"
                type="number"
                min="1"
                placeholder="10"
                class="text-input"
              />
              <span class="input-suffix">ganger</span>
            </div>
          </div>

          <div class="condition-row">
            <div class="condition-toggle-row">
              <label class="toggle-label">Maks bruk per kunde</label>
              <label class="toggle-switch">
                <input v-model="localDiscount.maximumUsagePerCustomerCountEnabled" type="checkbox" />
                <span class="toggle-slider" />
              </label>
            </div>
            <div v-if="localDiscount.maximumUsagePerCustomerCountEnabled" class="condition-input">
              <input
                v-model="localDiscount.maximumUsagePerCustomerCount"
                type="number"
                min="1"
                placeholder="1"
                class="text-input"
              />
              <span class="input-suffix">ganger</span>
            </div>
          </div>

          <div class="condition-row">
            <div class="condition-toggle-row">
              <label class="toggle-label">Tidsbegrenset</label>
              <label class="toggle-switch">
                <input v-model="localDiscount.timedEnabled" type="checkbox" />
                <span class="toggle-slider" />
              </label>
            </div>
            <div v-if="localDiscount.timedEnabled" class="datetime-inputs">
              <div class="form-field">
                <label>Gyldig fra</label>
                <input v-model="localDiscount.validFrom" type="datetime-local" class="text-input" />
              </div>
              <div class="form-field">
                <label>Gyldig til</label>
                <input v-model="localDiscount.validTo" type="datetime-local" class="text-input" />
              </div>
            </div>
          </div>
        </div>

        <!-- Special Options -->
        <div class="form-section">
          <h2 class="section-title">Spesielle innstillinger</h2>

          <div class="condition-toggle-row">
            <label class="toggle-label">
              <span>Gi bonuspoeng i stedet for rabatt</span>
              <span class="toggle-hint">Kunden mottar poeng fremfor prisreduksjon</span>
            </label>
            <label class="toggle-switch">
              <input v-model="localDiscount.giveRewardInsteadOfDiscountEnabled" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>

          <div v-if="!isNew" class="condition-toggle-row" style="margin-top: 16px;">
            <label class="toggle-label">
              <span>Marker som utløpt</span>
              <span class="toggle-hint">Rabatten vil ikke lenger kunne brukes</span>
            </label>
            <label class="toggle-switch">
              <input v-model="localDiscount.expired" type="checkbox" />
              <span class="toggle-slider" />
            </label>
          </div>
        </div>

        <!-- Usage Stats -->
        <div v-if="!isNew && localDiscount.discountUsages" class="form-section">
          <h2 class="section-title">Statistikk</h2>
          <div class="stats-row">
            <span class="stats-label">Ganger brukt:</span>
            <span class="stats-value">{{ localDiscount.discountUsages.length }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="action-bar">
          <div class="action-bar__left">
            <button v-if="!isNew" class="btn btn-danger" :disabled="isSaving" @click="confirmDelete">
              Slett rabatt
            </button>
          </div>
          <div class="action-bar__right">
            <a href="/admin/discounts" class="btn btn-ghost">Avbryt</a>
            <button class="btn btn-primary" :disabled="isSaving" @click="saveDiscount">
              <span v-if="isSaving">Lagrer...</span>
              <span v-else>{{ isNew ? 'Opprett rabatt' : 'Lagre endringer' }}</span>
            </button>
          </div>
        </div>
      </template>

      <!-- Product Selector Modal -->
      <ProductSelectorModal ref="productSelector" />

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
import ProductSelectorModal from '~/components/admin/ProductSelectorModal.vue'

export default {
  name: 'Discount',
  components: { AdminPage, Loading, ProductSelectorModal },
  data() {
    return {
      isLoading: false,
      isSaving: false,
      localDiscount: null,
      selectedProductIds: [],
      errors: [],
      fieldErrors: {},
      toast: { show: false, message: '', type: 'success' },
    }
  },
  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore
    },
    discountId() {
      return this.$route.query.id
    },
    isNew() {
      return this.discountId === 'new'
    },
  },
  watch: {
    selectedStore(storeId) {
      if (storeId && !this.isNew) {
        this.$router.push('/admin/discounts')
      }
    },
  },
  async mounted() {
    await this.loadData()
  },
  methods: {
    async loadData() {
      const storeId = this.selectedStore
      if (!storeId) return

      if (this.isNew) {
        this.localDiscount = {
          storeId,
          label: '',
          discount: '',
          type: 'Amount',
          applicability: 'Order',
          code: '',
          minimumOrderAmount: 0,
          minimumOrderAmountEnabled: false,
          maximumTotalUsageCount: 0,
          maximumTotalUsageCountEnabled: false,
          maximumUsagePerCustomerCount: 0,
          maximumUsagePerCustomerCountEnabled: false,
          timedEnabled: false,
          validFrom: null,
          validTo: null,
          giveRewardInsteadOfDiscountEnabled: false,
          expired: false,
          discountProducts: [],
          discountUsages: [],
        }
        return
      }

      this.isLoading = true
      try {
        const discounts = await this._discountService.Get(storeId)
        const found = discounts.find(d => d.id === this.discountId)
        if (!found) {
          this.$router.push('/admin/discounts')
          return
        }
        this.localDiscount = { ...found }
        this.selectedProductIds = (found.discountProducts || []).map(p => p.productId)
      } catch (e) {
        this.$router.push('/admin/discounts')
      } finally {
        this.isLoading = false
      }
    },
    async openProductPicker() {
      const picked = await this.$refs.productSelector.open(this.selectedProductIds)
      if (picked !== undefined) {
        this.selectedProductIds = picked
        this.localDiscount.discountProducts = picked.map(id => ({ productId: id }))
      }
    },
    validate() {
      this.errors = []
      this.fieldErrors = {}

      if (!this.localDiscount.label || this.localDiscount.label.trim().length < 3) {
        this.errors.push('Navn på rabatt må være minst 3 tegn')
        this.fieldErrors.label = true
      }
      if (!this.localDiscount.discount || Number(this.localDiscount.discount) <= 0) {
        this.errors.push('Rabattbeløp må være større enn 0')
        this.fieldErrors.discount = true
      }
      if (this.localDiscount.type === 'Percent' && Number(this.localDiscount.discount) > 100) {
        this.errors.push('Prosent kan ikke være mer enn 100')
        this.fieldErrors.discount = true
      }

      return this.errors.length === 0
    },
    async saveDiscount() {
      if (!this.validate()) return

      this.isSaving = true
      try {
        const payload = {
          ...this.localDiscount,
          storeId: this.selectedStore,
          discount: String(this.localDiscount.discount),
        }
        await this._discountService.CreateOrUpdate(payload)
        this.showToast('Rabatt lagret', 'success')
        setTimeout(() => this.$router.push('/admin/discounts'), 1000)
      } catch (e) {
        this.showToast('Noe gikk galt. Prøv igjen.', 'error')
      } finally {
        this.isSaving = false
      }
    },
    async confirmDelete() {
      if (!confirm(`Er du sikker på at du vil slette rabatten "${this.localDiscount.label}"?`)) return

      this.isSaving = true
      try {
        await this._discountService.Delete(this.localDiscount.id)
        this.$router.push('/admin/discounts')
      } catch (e) {
        this.showToast('Kunne ikke slette rabatt. Prøv igjen.', 'error')
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
.discount-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #6b7280;
  font-size: 14px;
  text-decoration: none;
  margin-bottom: 8px;
}

.back-link:hover { color: #292c34; }
.back-link svg { width: 16px; height: 16px; }

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #292c34;
  margin: 0 0 24px;
}

.loading-section {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.error-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  color: #dc2626;
}

.error-banner svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  margin-top: 2px;
}

.error-banner ul {
  margin: 0;
  padding: 0 0 0 16px;
  font-size: 14px;
}

.form-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #292c34;
  margin: 0 0 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-field:last-child { margin-bottom: 0; }

.form-field label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.form-field--error .text-input {
  border-color: #dc2626;
}

.text-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #292c34;
  background: #fafafa;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.text-input:focus {
  outline: none;
  border-color: #1bb776;
  background: white;
}

.text-input--mono { font-family: monospace; }

.select-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #292c34;
  background: #fafafa;
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: #1bb776;
}

.field-hint {
  font-size: 12px;
  color: #9ca3af;
}

.amount-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.amount-row .form-field { flex: 1; margin-bottom: 0; }

.type-toggle {
  display: flex;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 0;
  flex-shrink: 0;
}

.type-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.type-btn--active {
  background: #1bb776;
  color: white;
}

.product-selector-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}

.product-count-label {
  font-size: 13px;
  color: #6b7280;
}

.condition-row {
  padding: 16px 0;
  border-bottom: 1px solid #f3f4f6;
}

.condition-row:last-child { border-bottom: none; }

.condition-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toggle-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 14px;
  font-weight: 500;
  color: #292c34;
  cursor: pointer;
  flex: 1;
}

.toggle-hint {
  font-size: 12px;
  font-weight: 400;
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

.toggle-switch input:checked + .toggle-slider { background: #1bb776; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }

.condition-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.condition-input .text-input { max-width: 160px; }

.input-suffix {
  font-size: 14px;
  color: #6b7280;
  white-space: nowrap;
}

.datetime-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 12px;
}

.stats-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stats-label {
  font-size: 14px;
  color: #6b7280;
}

.stats-value {
  font-size: 20px;
  font-weight: 700;
  color: #292c34;
}

.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 0;
  flex-wrap: wrap;
}

.action-bar__right {
  display: flex;
  align-items: center;
  gap: 12px;
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
  text-decoration: none;
}

.btn:hover { opacity: 0.85; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary { background: linear-gradient(135deg, #1bb776, #159f63); color: white; }
.btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
.btn-ghost { background: transparent; color: #6b7280; }
.btn-ghost:hover { background: #f3f4f6; }
.btn-danger { background: transparent; color: #dc2626; border: 1px solid #fca5a5; }
.btn-danger:hover { background: #fee2e2; }

.btn-icon { width: 16px; height: 16px; }

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
  .discount-page { padding: 16px; }
  .datetime-inputs { grid-template-columns: 1fr; }
  .action-bar { flex-direction: column; align-items: stretch; }
  .action-bar__right { justify-content: flex-end; }
}
</style>
