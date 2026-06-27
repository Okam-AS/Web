<template>
  <AdminPage @login-success="onLoginSuccess">
    <div class="customers-page">
      <div class="page-header">
        <h1>Kunder</h1>
        <p class="page-description">Søk etter kunder eller se statistikk og oversikt</p>
      </div>

      <!-- Search Bar -->
      <div class="search-bar">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="search-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Søk på navn eller telefon (min. 3 tegn)..."
          class="search-input"
          @input="onSearchInput"
        />
        <button v-if="searchQuery" class="search-clear" @click="clearSearch">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Search Results -->
      <template v-if="searchQuery.length > 0">
        <div v-if="isSearching" class="loading-section">
          <Loading :loading="true" />
        </div>
        <div v-else-if="searchQuery.length < 3" class="search-hint">
          Skriv minst 3 tegn for å søke
        </div>
        <div v-else-if="customers.length === 0" class="empty-state">
          <div class="empty-state__icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3>Ingen kunder funnet</h3>
          <p>Ingen kunder matcher "{{ searchQuery }}"</p>
        </div>
        <div v-else class="customers-list">
          <div
            v-for="customer in customers"
            :key="customer.userId || customer.phoneNumber"
            class="customer-item"
            @click="openCustomerModal(customer)"
          >
            <div class="customer-item__info">
              <div class="customer-item__name" v-html="highlight(customer.fullName, searchQuery)" />
              <div class="customer-item__phone" v-html="highlight(customer.phoneNumber, searchQuery)" />
            </div>
            <div class="customer-item__arrow">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </template>

      <!-- Stats Dashboard (when no search) -->
      <template v-else>
        <div v-if="isLoadingStats" class="loading-section">
          <Loading :loading="true" />
        </div>

        <template v-else-if="selectedStore">
          <!-- Period Selector -->
          <div class="period-selector">
            <button
              v-for="period in periodOptions"
              :key="period.value"
              class="period-btn"
              :class="{ 'period-btn--active': selectedPeriod === period.value }"
              @click="changePeriod(period.value)"
            >
              {{ period.label }}
            </button>
          </div>

          <!-- Stats Cards -->
          <div v-if="dashboardData.data && dashboardData.data.length" class="stats-grid">
            <div v-for="stat in dashboardData.data" :key="stat.key" class="stat-card">
              <div class="stat-card__value">{{ stat.value }}</div>
              <div class="stat-card__label">{{ stat.key }}</div>
            </div>
          </div>

          <!-- Platform Distribution -->
          <div v-if="hasPlatformData" class="form-section">
            <h2 class="section-title">Plattformfordeling</h2>
            <div class="platform-chart">
              <canvas ref="platformChart" width="200" height="200" class="pie-canvas" />
              <div class="platform-legend">
                <div class="legend-item">
                  <span class="legend-dot" style="background: #1bb776;" />
                  <span class="legend-label">iOS</span>
                  <span class="legend-count">{{ dashboardData.iosCustomersCount || 0 }}</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot" style="background: #6366f1;" />
                  <span class="legend-label">Android</span>
                  <span class="legend-count">{{ dashboardData.androidCustomersCount || 0 }}</span>
                </div>
                <div class="legend-item">
                  <span class="legend-dot" style="background: #f59e0b;" />
                  <span class="legend-label">Web</span>
                  <span class="legend-count">{{ dashboardData.webCustomersCount || 0 }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Favorite Products -->
          <div v-if="dashboardData.favoriteProducts && dashboardData.favoriteProducts.length" class="form-section">
            <h2 class="section-title">Mest populære produkter</h2>
            <div class="favorites-list">
              <div
                v-for="(product, index) in dashboardData.favoriteProducts"
                :key="product.productId || index"
                class="favorite-item"
              >
                <span class="favorite-rank">{{ index + 1 }}</span>
                <span class="favorite-name">{{ product.productName }}</span>
                <span class="favorite-count">{{ product.favoriteCount }} favoritter</span>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="empty-state">
          <h3>Velg en butikk</h3>
          <p>Velg en butikk for å se kundestatistikk.</p>
        </div>
      </template>

      <!-- Customer Detail Modal -->
      <div v-if="showCustomerModal" class="modal-overlay" @click.self="closeCustomerModal">
        <div class="modal-container">
          <div class="modal-header">
            <h2>Kundeinformasjon</h2>
            <button class="modal-close" @click="closeCustomerModal">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div v-if="isLoadingCustomer" class="modal-loading">
            <Loading :loading="true" />
          </div>

          <template v-else-if="customerDetail">
            <div class="customer-info-list">
              <div
                v-for="(item, index) in customerDetail.data"
                :key="index"
                class="customer-info-row"
              >
                <span class="customer-info-row__key">{{ item.key }}</span>
                <span class="customer-info-row__value">{{ item.value }}</span>
              </div>
            </div>

            <div class="reward-section">
              <h3 class="reward-section__title">Send bonuspoeng</h3>
              <div class="reward-input-row">
                <input
                  v-model="rewardAmount"
                  type="number"
                  min="1"
                  placeholder="Antall poeng"
                  class="text-input"
                />
                <button
                  class="btn btn-primary"
                  :disabled="isSendingReward || !rewardAmount || Number(rewardAmount) <= 0"
                  @click="sendReward"
                >
                  <span v-if="isSendingReward">Sender...</span>
                  <span v-else>Send poeng</span>
                </button>
              </div>
              <div v-if="rewardMessage" class="reward-message" :class="`reward-message--${rewardMessageType}`">
                {{ rewardMessage }}
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import Loading from '~/components/atoms/Loading.vue'
import { debounce } from '~/core/helpers/ts-debounce'

export default {
  name: 'Customers',
  components: { AdminPage, Loading },
  data() {
    return {
      searchQuery: '',
      isSearching: false,
      isLoadingStats: false,
      customers: [],
      selectedPeriod: 30,
      dashboardData: {
        data: [],
        iosCustomersCount: 0,
        androidCustomersCount: 0,
        webCustomersCount: 0,
        favoriteProducts: [],
      },
      showCustomerModal: false,
      selectedCustomer: null,
      customerDetail: null,
      isLoadingCustomer: false,
      rewardAmount: '',
      isSendingReward: false,
      rewardMessage: '',
      rewardMessageType: 'success',
      pieChartInstance: null,
      debouncedSearch: null,
    }
  },
  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore
    },
    periodOptions() {
      return [
        { label: '1 dag', value: 1 },
        { label: '7 dager', value: 7 },
        { label: '30 dager', value: 30 },
        { label: '45 dager', value: 45 },
        { label: '90 dager', value: 90 },
        { label: 'Dette året', value: 365 },
        { label: 'Siden start', value: 9999 },
      ]
    },
    hasPlatformData() {
      return (
        (this.dashboardData.iosCustomersCount || 0) +
        (this.dashboardData.androidCustomersCount || 0) +
        (this.dashboardData.webCustomersCount || 0) > 0
      )
    },
  },
  watch: {
    selectedStore: {
      immediate: true,
      handler(storeId) {
        if (storeId && !this.searchQuery) this.loadStats(storeId)
      },
    },
    hasPlatformData(val) {
      if (val) this.$nextTick(() => this.renderPieChart())
    },
  },
  created() {
    this.debouncedSearch = debounce(this.searchCustomers, 500)
  },
  beforeDestroy() {
    if (this.pieChartInstance) {
      this.pieChartInstance.destroy()
      this.pieChartInstance = null
    }
  },
  methods: {
    onLoginSuccess() {
      if (this.selectedStore && !this.searchQuery) this.loadStats(this.selectedStore)
    },
    async loadStats(storeId) {
      this.isLoadingStats = true
      try {
        const result = await this._storeService.GetCustomerStatistics(storeId || this.selectedStore, this.selectedPeriod)
        this.dashboardData = result || {}
        if (this.hasPlatformData) {
          this.$nextTick(() => this.renderPieChart())
        }
      } catch (e) {
        this.dashboardData = { data: [], iosCustomersCount: 0, androidCustomersCount: 0, webCustomersCount: 0, favoriteProducts: [] }
      } finally {
        this.isLoadingStats = false
      }
    },
    changePeriod(period) {
      this.selectedPeriod = period
      if (this.selectedStore) this.loadStats(this.selectedStore)
    },
    onSearchInput() {
      if (this.searchQuery.length === 0) {
        this.customers = []
        if (this.selectedStore) this.loadStats(this.selectedStore)
        return
      }
      if (this.searchQuery.length >= 3) {
        this.debouncedSearch()
      }
    },
    clearSearch() {
      this.searchQuery = ''
      this.customers = []
      if (this.selectedStore) this.loadStats(this.selectedStore)
    },
    async searchCustomers() {
      if (!this.selectedStore || this.searchQuery.length < 3) return
      this.isSearching = true
      try {
        this.customers = await this._storeService.SearchCustomers(this.selectedStore, this.searchQuery) || []
      } catch (e) {
        this.customers = []
      } finally {
        this.isSearching = false
      }
    },
    async openCustomerModal(customer) {
      this.selectedCustomer = customer
      this.showCustomerModal = true
      this.customerDetail = null
      this.rewardAmount = ''
      this.rewardMessage = ''
      this.isLoadingCustomer = true
      try {
        this.customerDetail = await this._userService.GetForStore(this.selectedStore, customer.userId)
      } catch (e) {
        this.customerDetail = null
      } finally {
        this.isLoadingCustomer = false
      }
    },
    closeCustomerModal() {
      this.showCustomerModal = false
      this.selectedCustomer = null
      this.customerDetail = null
    },
    async sendReward() {
      if (!this.rewardAmount || Number(this.rewardAmount) <= 0) return
      this.isSendingReward = true
      this.rewardMessage = ''
      try {
        await this._rewardService.SendReward(this.selectedStore, this.selectedCustomer.userId, Number(this.rewardAmount) * 100)
        this.rewardMessage = `${this.rewardAmount} bonuspoeng sendt!`
        this.rewardMessageType = 'success'
        this.rewardAmount = ''
      } catch (e) {
        this.rewardMessage = 'Kunne ikke sende bonuspoeng. Prøv igjen.'
        this.rewardMessageType = 'error'
      } finally {
        this.isSendingReward = false
      }
    },
    highlight(text, query) {
      if (!text || !query) return text || ''
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return text.replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>')
    },
    renderPieChart() {
      const canvas = this.$refs.platformChart
      if (!canvas) return

      if (this.pieChartInstance) {
        this.pieChartInstance.destroy()
        this.pieChartInstance = null
      }

      const ios = this.dashboardData.iosCustomersCount || 0
      const android = this.dashboardData.androidCustomersCount || 0
      const web = this.dashboardData.webCustomersCount || 0

      if (ios + android + web === 0) return

      import('chart.js').then(({ Chart, ArcElement, PieController, Tooltip, Legend }) => {
        Chart.register(ArcElement, PieController, Tooltip, Legend)
        this.pieChartInstance = new Chart(canvas, {
          type: 'pie',
          data: {
            labels: ['iOS', 'Android', 'Web'],
            datasets: [{
              data: [ios, android, web],
              backgroundColor: ['#1bb776', '#6366f1', '#f59e0b'],
              borderWidth: 0,
            }],
          },
          options: {
            responsive: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: true },
            },
          },
        })
      })
    },
  },
}
</script>

<style scoped>
.customers-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  margin-bottom: 24px;
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

.search-bar {
  position: relative;
  margin-bottom: 24px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 12px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  font-size: 14px;
  color: #292c34;
  background: white;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #1bb776;
  box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.12);
}

.search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  background: #f3f4f6;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: #6b7280;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-clear:hover { background: #e5e7eb; }
.search-clear svg { width: 14px; height: 14px; }

.search-hint {
  text-align: center;
  color: #9ca3af;
  font-size: 14px;
  padding: 32px;
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

.empty-state__icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  color: #d1d5db;
}

.empty-state__icon svg { width: 100%; height: 100%; }

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px;
}

.empty-state p { font-size: 14px; margin: 0; }

.customers-list {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.customer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f3f4f6;
  cursor: pointer;
  transition: background 0.15s;
}

.customer-item:last-child { border-bottom: none; }
.customer-item:hover { background: #f9fafb; }

.customer-item__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.customer-item__name {
  font-size: 15px;
  font-weight: 600;
  color: #292c34;
}

.customer-item__phone {
  font-size: 13px;
  color: #6b7280;
}

.customer-item__arrow {
  width: 20px;
  height: 20px;
  color: #d1d5db;
}

.customer-item__arrow svg { width: 100%; height: 100%; }

.period-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
}

.period-btn {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: white;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
}

.period-btn:hover { border-color: #1bb776; color: #1bb776; }
.period-btn--active { background: #1bb776; color: white; border-color: #1bb776; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 20px;
  text-align: center;
}

.stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: #1bb776;
}

.stat-card__label {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
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
  margin: 0 0 20px;
}

.platform-chart {
  display: flex;
  align-items: center;
  gap: 32px;
  flex-wrap: wrap;
}

.pie-canvas { max-width: 160px; }

.platform-legend {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.legend-label {
  font-size: 14px;
  color: #374151;
  flex: 1;
}

.legend-count {
  font-size: 14px;
  font-weight: 700;
  color: #292c34;
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.favorite-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.favorite-item:last-child { border-bottom: none; }

.favorite-rank {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0fdf4;
  color: #1bb776;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.favorite-name {
  flex: 1;
  font-size: 14px;
  color: #374151;
  font-weight: 500;
}

.favorite-count {
  font-size: 13px;
  color: #9ca3af;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}

.modal-container {
  background: white;
  border-radius: 16px;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #f3f4f6;
  position: sticky;
  top: 0;
  background: white;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 700;
  color: #292c34;
  margin: 0;
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: #f3f4f6;
  border-radius: 50%;
  cursor: pointer;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover { background: #e5e7eb; }
.modal-close svg { width: 16px; height: 16px; }

.modal-loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.customer-info-list {
  padding: 0 24px;
}

.customer-info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid #f3f4f6;
  gap: 16px;
}

.customer-info-row:last-child { border-bottom: none; }

.customer-info-row__key {
  font-size: 13px;
  color: #9ca3af;
  flex-shrink: 0;
}

.customer-info-row__value {
  font-size: 14px;
  font-weight: 500;
  color: #292c34;
  text-align: right;
}

.reward-section {
  padding: 20px 24px;
  border-top: 1px solid #f3f4f6;
  background: #f9fafb;
}

.reward-section__title {
  font-size: 15px;
  font-weight: 700;
  color: #292c34;
  margin: 0 0 12px;
}

.reward-input-row {
  display: flex;
  gap: 12px;
}

.text-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #292c34;
  background: white;
  box-sizing: border-box;
}

.text-input:focus {
  outline: none;
  border-color: #1bb776;
}

.reward-message {
  margin-top: 10px;
  font-size: 13px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 6px;
}

.reward-message--success { background: #d1fae5; color: #065f46; }
.reward-message--error { background: #fee2e2; color: #dc2626; }

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
  white-space: nowrap;
}

.btn:hover { opacity: 0.85; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary { background: linear-gradient(135deg, #1bb776, #159f63); color: white; }
</style>

<style>
.customer-item__name mark,
.customer-item__phone mark {
  background: #fef08a;
  color: inherit;
  border-radius: 2px;
  padding: 0 1px;
}
</style>
