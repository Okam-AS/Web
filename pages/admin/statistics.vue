<template>
  <AdminPage>
    <div class="statistics-page">
      <div class="page-header">
        <h1>Statistikk</h1>
      </div>

      <div class="filters-section">
        <!-- Date Filter Buttons -->
        <div class="filter-group">
          <div class="period-label-with-compare">
            <label class="filter-label">{{ comparisonMode ? 'Periode 1' : 'Periode' }}</label>
            <button
              class="comparison-toggle-btn"
              :class="{ active: comparisonMode }"
              @click="toggleComparisonMode"
            >
              <span class="material-icons">compare_arrows</span>
              {{ comparisonMode ? 'Avbryt sammenligning' : 'Sammenlign periode' }}
            </button>
          </div>

          <!-- Date Range -->
          <div class="custom-date-range">
            <div class="date-input-group">
              <label>Fra dato:</label>
              <input
                v-model="dateRange.from"
                type="date"
                :max="dateRange.to"
                @change="loadStatistics"
              />
            </div>
            <div class="date-input-group">
              <label>Til dato:</label>
              <input
                v-model="dateRange.to"
                type="date"
                :min="dateRange.from"
                @change="loadStatistics"
              />
            </div>
            <!-- Quick date shortcuts -->
            <div class="date-shortcuts">
              <button
                v-for="filter in dateFilters"
                :key="filter.value"
                class="date-shortcut-btn"
                @click="selectDateFilter(filter.value)"
                :title="'Sett til: ' + filter.label"
              >
                {{ filter.label }}
              </button>
            </div>
          </div>
        </div>

        <!-- Comparison Period (shown when comparison mode is active) -->
        <div
          v-if="comparisonMode"
          class="comparison-period-section"
        >
          <div class="filter-group">
            <label class="filter-label">Periode 2 (Sammenligning)</label>
            <div class="custom-date-range">
              <div class="date-input-group">
                <label>Fra dato:</label>
                <input
                  v-model="comparisonDateRange.from"
                  type="date"
                  :max="comparisonDateRange.to"
                  @change="loadStatistics"
                />
              </div>
              <div class="date-input-group">
                <label>Til dato:</label>
                <input
                  v-model="comparisonDateRange.to"
                  type="date"
                  :min="comparisonDateRange.from"
                  @change="loadStatistics"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Multi-select Filters -->
        <div class="multi-select-filters">
          <div
            v-if="adminStores.length > 1"
            class="filter-group"
          >
            <label class="filter-label">Butikker</label>
            <MultiSelectDropdown
              :options="storeOptions"
              :selected.sync="selectedStoreIds"
              placeholder="Velg butikker"
              all-text="Alle butikker"
              search-placeholder="Søk etter butikk..."
              @update:selected="onFilterChange"
            />
          </div>

          <div class="filter-group">
            <label class="filter-label">Status</label>
            <MultiSelectDropdown
              :options="statusOptions"
              :selected.sync="selectedStatuses"
              placeholder="Velg status"
              all-text="Alle statuser"
              search-placeholder="Søk..."
              @update:selected="onFilterChange"
            />
          </div>

          <div class="filter-group">
            <label class="filter-label">Leveringstyper</label>
            <MultiSelectDropdown
              :options="deliveryTypeOptions"
              :selected.sync="selectedDeliveryTypes"
              placeholder="Velg leveringstyper"
              all-text="Alle leveringstyper"
              search-placeholder="Søk..."
              @update:selected="onFilterChange"
            />
          </div>

          <div class="filter-group">
            <label class="filter-label">Betalingstyper</label>
            <MultiSelectDropdown
              :options="paymentTypeOptions"
              :selected.sync="selectedPaymentTypes"
              placeholder="Velg betalingstyper"
              all-text="Alle betalingstyper"
              search-placeholder="Søk..."
              @update:selected="onFilterChange"
            />
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <LoadingSkeleton v-if="isLoading" />

      <!-- Statistics Display -->
      <div
        v-else-if="statistics"
        class="statistics-content"
      >
        <!-- Delivery Stats Grid -->
        <div class="delivery-stats-grid">
          <div class="delivery-stat-card">
            <div class="stat-card-header">
              <span class="material-icons">shopping_bag</span>
              <div
                v-if="comparisonMode && comparisonStatistics"
                class="stat-change"
                :class="getChangeClass(getDeliveryTypeCount('SelfPickup'), getComparisonDeliveryTypeCount('SelfPickup'))"
              >
                <span class="material-icons">{{ getChangeIcon(getDeliveryTypeCount('SelfPickup'), getComparisonDeliveryTypeCount('SelfPickup')) }}</span>
                {{ getPercentageChange(getDeliveryTypeCount('SelfPickup'), getComparisonDeliveryTypeCount('SelfPickup')) }}
              </div>
            </div>
            <div class="delivery-stat-value">
              {{ getDeliveryTypeCount('SelfPickup') }}
              <span
                v-if="comparisonMode && comparisonStatistics"
                class="comparison-badge"
              >
                {{ getComparisonDeliveryTypeCount('SelfPickup') }}
              </span>
            </div>
            <div class="delivery-stat-label">Henting</div>
            <div class="delivery-stat-amount">
              {{ getDeliveryTypeAmount('SelfPickup') }}
              <span
                v-if="comparisonMode && comparisonStatistics"
                class="comparison-badge amount"
              >
                {{ getComparisonDeliveryTypeAmount('SelfPickup') }}
              </span>
            </div>
            <canvas
              v-if="comparisonMode"
              :id="'sparkline-pickup'"
              class="sparkline-chart"
            ></canvas>
          </div>
          <div class="delivery-stat-card">
            <div class="stat-card-header">
              <span class="material-icons">delivery_dining</span>
              <div
                v-if="comparisonMode && comparisonStatistics"
                class="stat-change"
                :class="getChangeClass(getDeliveryTypeCount('WoltDelivery'), getComparisonDeliveryTypeCount('WoltDelivery'))"
              >
                <span class="material-icons">{{ getChangeIcon(getDeliveryTypeCount('WoltDelivery'), getComparisonDeliveryTypeCount('WoltDelivery')) }}</span>
                {{ getPercentageChange(getDeliveryTypeCount('WoltDelivery'), getComparisonDeliveryTypeCount('WoltDelivery')) }}
              </div>
            </div>
            <div class="delivery-stat-value">
              {{ getDeliveryTypeCount('WoltDelivery') }}
              <span
                v-if="comparisonMode && comparisonStatistics"
                class="comparison-badge"
              >
                {{ getComparisonDeliveryTypeCount('WoltDelivery') }}
              </span>
            </div>
            <div class="delivery-stat-label">Levering</div>
            <div class="delivery-stat-amount">
              {{ getDeliveryTypeAmount('InstantHomeDelivery') }}
              <span
                v-if="comparisonMode && comparisonStatistics"
                class="comparison-badge amount"
              >
                {{ getComparisonDeliveryTypeAmount('InstantHomeDelivery') }}
              </span>
            </div>
            <canvas
              v-if="comparisonMode"
              :id="'sparkline-delivery'"
              class="sparkline-chart"
            ></canvas>
          </div>
          <div class="delivery-stat-card">
            <div class="stat-card-header">
              <span class="material-icons">deck</span>
              <div
                v-if="comparisonMode && comparisonStatistics"
                class="stat-change"
                :class="getChangeClass(getDeliveryTypeCount('TableDelivery'), getComparisonDeliveryTypeCount('TableDelivery'))"
              >
                <span class="material-icons">{{ getChangeIcon(getDeliveryTypeCount('TableDelivery'), getComparisonDeliveryTypeCount('TableDelivery')) }}</span>
                {{ getPercentageChange(getDeliveryTypeCount('TableDelivery'), getComparisonDeliveryTypeCount('TableDelivery')) }}
              </div>
            </div>
            <div class="delivery-stat-value">
              {{ getDeliveryTypeCount('TableDelivery') }}
              <span
                v-if="comparisonMode && comparisonStatistics"
                class="comparison-badge"
              >
                {{ getComparisonDeliveryTypeCount('TableDelivery') }}
              </span>
            </div>
            <div class="delivery-stat-label">Spis inne</div>
            <div class="delivery-stat-amount">
              {{ getDeliveryTypeAmount('TableDelivery') }}
              <span
                v-if="comparisonMode && comparisonStatistics"
                class="comparison-badge amount"
              >
                {{ getComparisonDeliveryTypeAmount('TableDelivery') }}
              </span>
            </div>
            <canvas
              v-if="comparisonMode"
              :id="'sparkline-table'"
              class="sparkline-chart"
            ></canvas>
          </div>
        </div>

        <!-- Peak Performance Heatmap -->
        <PeakPerformanceHeatmap
          v-if="heatmapData.length > 0"
          :data="heatmapData"
          :date-range="getDateRangeLabel()"
        />

        <!-- Charts Section -->
        <div
          v-if="chartsData.length > 0"
          class="charts-section"
        >
          <div
            v-for="(chartData, index) in chartsData"
            :key="index"
            class="chart-container"
          >
            <h3 class="chart-title">{{ chartData.headingKey }}</h3>
            <div class="chart-value">
              {{ formatStatValue(chartData) }}
              <span
                v-if="comparisonMode && comparisonStatistics"
                class="chart-comparison-badge"
              >
                {{ formatComparisonStatValue(chartData) }}
              </span>
            </div>
            <StatisticsChart
              v-if="chartData.points && chartData.points.length > 1"
              :chart-id="'chart-' + index"
              :data="{
                labels: chartData.points.map(p => p.key || p.x),
                values: chartData.points.map(p => p.value || p.y),
                label: chartData.headingKey
              }"
              :comparison-data="getComparisonChartData(chartData)"
              :value-is-price="chartData.headingValueIsPrice"
              :date-range="getDateRangeLabel()"
              :comparison-date-range="getComparisonDateRangeLabel()"
            />
          </div>
        </div>

        <!-- Stats Grid (for non-chart stats) -->
        <div class="stats-grid">
          <div
            v-for="chart in statistics.charts"
            :key="chart.headingKey"
            class="stat-card"
          >
            <h3>{{ chart.headingKey }}</h3>
            <div class="stat-value">
              {{ formatStatValue(chart) }}
              <span
                v-if="comparisonMode && comparisonStatistics"
                class="stat-comparison-badge"
              >
                {{ formatComparisonStatValue(chart) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Product List Section -->
        <div
          v-if="statistics && selectedDateFilter !== 'ThisYear'"
          class="product-list-section"
        >
          <button
            v-if="ordersSummary.length === 0 && !isLoadingItems"
            class="show-product-list-btn"
            @click="loadProductList"
          >
            <span class="material-icons">list_alt</span>
            Vis produktliste
          </button>

          <div
            v-if="isLoadingItems"
            class="product-list-loading"
          >
            <div
              v-for="i in 5"
              :key="i"
              class="product-list-skeleton-item"
            >
              <div class="skeleton-line skeleton-quantity"></div>
              <div class="skeleton-line skeleton-name"></div>
              <div class="skeleton-line skeleton-amount"></div>
            </div>
          </div>

          <div
            v-else-if="ordersSummary.length > 0"
            class="product-list-card"
          >
            <div class="product-list-header">
              <h3>Produktliste</h3>
              <button
                class="clear-list-btn"
                @click="ordersSummary = []; openOrderSummaryIndices = []"
              >
                <span class="material-icons">close</span>
              </button>
            </div>

            <div class="product-list-items">
              <div
                v-for="(item, index) in ordersSummary"
                :key="index"
                class="product-item"
                :class="{ 'has-options': item.options && item.options.length > 0 }"
              >
                <div
                  class="product-item-main"
                  @click="item.options && item.options.length > 0 ? toggleProductItem(index) : null"
                >
                  <span class="product-quantity">{{ item.quantity }}x</span>
                  <span class="product-name">
                    {{ item.name }}
                    <span
                      v-if="item.options && item.options.length > 0"
                      class="expand-icon material-icons"
                      :class="{ 'expanded': openOrderSummaryIndices.includes(index) }"
                    >
                      expand_more
                    </span>
                  </span>
                  <span class="product-amount">{{ priceLabel(item.amount) }}</span>
                </div>

                <div
                  v-if="item.options && item.options.length > 0 && openOrderSummaryIndices.includes(index)"
                  class="product-options"
                >
                  <div
                    v-for="(option, optionIndex) in item.options"
                    :key="optionIndex"
                    class="product-option-row"
                  >
                    <span class="option-quantity">{{ option.quantity }}x</span>
                    <span class="option-name">{{ option.name }}</span>
                    <span class="option-amount">{{ priceLabel(option.amount) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      <!-- AI Query Box -->
      <AIQueryBox
        v-if="!isLoading && statistics"
        :selected-store-ids="selectedStoreIds"
      />

      </div>

      <LoginModal
        v-if="showLogin"
        @close="closeLoginModal"
      />
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import LoginModal from '~/components/molecules/LoginModal.vue';
import MultiSelectDropdown from '~/components/molecules/MultiSelectDropdown.vue';
import StatisticsChart from '~/components/molecules/StatisticsChart.vue';
import LoadingSkeleton from '~/components/molecules/LoadingSkeleton.vue';
import PeakPerformanceHeatmap from '~/components/molecules/PeakPerformanceHeatmap.vue';
import AIQueryBox from '~/components/admin/statistics/AIQueryBox.vue';
import { debounce } from '~/core/helpers/ts-debounce';

export default {
  components: {
    AdminPage,
    LoginModal,
    MultiSelectDropdown,
    StatisticsChart,
    LoadingSkeleton,
    PeakPerformanceHeatmap,
    AIQueryBox,
  },
  data: () => ({
    showLogin: false,
    isLoading: false,
    statistics: null,
    deliveryStats: {
      pickup: null,
      delivery: null,
      table: null,
    },
    comparisonMode: false,
    comparisonStatistics: null,
    comparisonDeliveryStats: {
      pickup: null,
      delivery: null,
      table: null,
    },
    heatmapRawData: [],
    comparisonDateRange: {
      from: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      to: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    },
    adminStores: [],
    selectedStoreIds: [],
    selectedDateFilter: 'Today',
    dateRange: {
      from: new Date().toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
    },
    selectedStatuses: ['Completed'],
    selectedDeliveryTypes: [
      'SelfPickup',
      'InstantHomeDelivery',
      'DineHomeDelivery',
      'WoltDelivery',
      'WoltMarketplaceDelivery',
      'TableDelivery',
    ],
    selectedPaymentTypes: [
      'PayInStore',
      'Stripe',
      'Vipps',
      'Giftcard',
      'Dintero',
      'DinteroVipps',
      'DinteroBillie',
      'DinteroKlarna',
      'WoltMarketplace',
    ],
    debouncedLoadStatistics: null,
    sparklineCharts: {},
    ordersSummary: [],
    openOrderSummaryIndices: [],
    isLoadingItems: false,
  }),
  computed: {
    dateFilters() {
      return [
        { value: 'Today', label: 'I dag' },
        { value: 'Yesterday', label: 'I går' },
        { value: 'Last7Days', label: 'Siste 7 dager' },
        { value: 'ThisMonth', label: 'Denne måneden' },
        { value: 'LastMonth', label: 'Forrige måned' },
        { value: 'ThisYear', label: 'Dette året' },
      ];
    },
    storeOptions() {
      return this.adminStores.map((store) => ({
        id: store.id,
        label: store.name,
      }));
    },
    statusOptions() {
      return [
        { id: 'Remaining', label: 'Pågående' },
        { id: 'Completed', label: 'Fullført' },
        { id: 'Canceled', label: 'Kansellert' },
      ];
    },
    deliveryTypeOptions() {
      return [
        { id: 'SelfPickup', label: 'Henting' },
        { id: 'InstantHomeDelivery', label: 'Hjemlevering' },
        { id: 'DineHomeDelivery', label: 'Dine Home Delivery' },
        { id: 'WoltDelivery', label: 'Wolt Drive' },
        { id: 'WoltMarketplaceDelivery', label: 'Wolt Marketplace' },
        { id: 'TableDelivery', label: 'Spis inne' },
      ];
    },
    paymentTypeOptions() {
      return [
        { id: 'PayInStore', label: 'Betal i butikk' },
        { id: 'Stripe', label: 'Stripe' },
        { id: 'Vipps', label: 'Vipps' },
        { id: 'Giftcard', label: 'Gavekort' },
        { id: 'Dintero', label: 'Dintero' },
        { id: 'DinteroVipps', label: 'Dintero Vipps' },
        { id: 'DinteroBillie', label: 'Dintero Billie' },
        { id: 'DinteroKlarna', label: 'Dintero Klarna' },
        { id: 'WoltMarketplace', label: 'Wolt Marketplace' },
      ];
    },
    chartsData() {
      if (!this.statistics || !this.statistics.charts) return [];
      return this.statistics.charts.filter(
        (chart) => chart.points && chart.points.length > 1
      );
    },
    heatmapData() {
      if (!this.heatmapRawData || this.heatmapRawData.length === 0) return [];

      // Transform backend data to frontend format
      return this.heatmapRawData.map((cell) => ({
        timestamp: cell.sampleTimestamp,
        orders: cell.orderCount,
        revenue: cell.revenue / 100, // Convert from øre to kr
      }));
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      return;
    }
    this.adminStores = this.$store.state.currentUser.adminIn;
    this.selectedStoreIds = this.adminStores.map((store) => store.id);
    this.loadStatistics();
  },
  created() {
    this.debouncedLoadStatistics = debounce(this.loadStatistics, 1000);
  },
  methods: {
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        this.loadStatistics();
      }
    },
    selectDateFilter(value) {
      this.selectedDateFilter = value;
      this.setDates(value);

      // Update comparison period dates to match if comparison mode is active
      if (this.comparisonMode) {
        this.comparisonDateRange.from = this.dateRange.from;
        this.comparisonDateRange.to = this.dateRange.to;
      }

      this.loadStatistics();
    },
    setDates(value) {
      const today = new Date();
      const formatDate = (date) => date.toISOString().split('T')[0];

      switch (value) {
        case 'Today':
          this.dateRange.from = formatDate(today);
          this.dateRange.to = formatDate(today);
          break;
        case 'Yesterday': {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          this.dateRange.from = formatDate(yesterday);
          this.dateRange.to = formatDate(yesterday);
          break;
        }
        case 'Last7Days': {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          this.dateRange.from = formatDate(sevenDaysAgo);
          this.dateRange.to = formatDate(today);
          break;
        }
        case 'ThisMonth': {
          const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
          this.dateRange.from = formatDate(firstDay);
          this.dateRange.to = formatDate(today);
          break;
        }
        case 'LastMonth': {
          const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
          this.dateRange.from = formatDate(lastMonthStart);
          this.dateRange.to = formatDate(lastMonthEnd);
          break;
        }
        case 'ThisYear': {
          const yearStart = new Date(today.getFullYear(), 0, 1);
          this.dateRange.from = formatDate(yearStart);
          this.dateRange.to = formatDate(today);
          break;
        }
      }
    },
    onFilterChange() {
      this.ordersSummary = [];
      this.openOrderSummaryIndices = [];
      this.debouncedLoadStatistics();
    },
    loadStatistics() {
      this.isLoading = true;
      this.ordersSummary = [];
      this.openOrderSummaryIndices = [];

      const baseModel = {
        storeIds: this.selectedStoreIds,
        from: this.dateRange.from,
        to: this.dateRange.to,
        statuses: this.selectedStatuses,
        paymentTypes: this.selectedPaymentTypes,
      };

      const promises = [
        this._statisticsService.Get({
          ...baseModel,
          deliveryTypes: this.selectedDeliveryTypes,
        }),
        this._statisticsService.Get({
          ...baseModel,
          deliveryTypes: ['SelfPickup'],
        }),
        this._statisticsService.Get({
          ...baseModel,
          deliveryTypes: ['InstantHomeDelivery', 'WoltDelivery'],
        }),
        this._statisticsService.Get({
          ...baseModel,
          deliveryTypes: ['TableDelivery'],
        }),
        // Add heatmap data promise (always at index 4)
        this._statisticsService.GetHeatmapData({
          ...baseModel,
          deliveryTypes: this.selectedDeliveryTypes,
        }),
      ];

      // Add comparison period promises if in comparison mode
      if (this.comparisonMode) {
        const comparisonBaseModel = {
          storeIds: this.selectedStoreIds,
          from: this.comparisonDateRange.from,
          to: this.comparisonDateRange.to,
          statuses: this.selectedStatuses,
          paymentTypes: this.selectedPaymentTypes,
        };

        promises.push(
          this._statisticsService.Get({
            ...comparisonBaseModel,
            deliveryTypes: this.selectedDeliveryTypes,
          }),
          this._statisticsService.Get({
            ...comparisonBaseModel,
            deliveryTypes: ['SelfPickup'],
          }),
          this._statisticsService.Get({
            ...comparisonBaseModel,
            deliveryTypes: ['InstantHomeDelivery', 'WoltDelivery'],
          }),
          this._statisticsService.Get({
            ...comparisonBaseModel,
            deliveryTypes: ['TableDelivery'],
          })
        );
      }

      Promise.all(promises)
        .then((results) => {
          const [generalStats, pickupStats, deliveryStats, tableStats, heatmapResponse] = results;
          this.statistics = generalStats;
          this.deliveryStats = {
            pickup: pickupStats,
            delivery: deliveryStats,
            table: tableStats,
          };

          // Process heatmap data
          if (heatmapResponse && heatmapResponse.data) {
            this.heatmapRawData = heatmapResponse.data;
          }

          if (this.comparisonMode && results.length > 5) {
            const [, , , , , compGeneral, compPickup, compDelivery, compTable] = results;
            this.comparisonStatistics = compGeneral;
            this.comparisonDeliveryStats = {
              pickup: compPickup,
              delivery: compDelivery,
              table: compTable,
            };
            this.$nextTick(() => {
              this.renderSparklines();
            });
          }
        })
        .catch((error) => {
          console.error('Failed to load statistics:', error);
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    formatStatValue(stat) {
      if (stat.headingValueIsPrice) {
        return this.priceLabel(stat.headingValue);
      }
      return stat.headingValue;
    },
    formatComparisonStatValue(stat) {
      if (!this.comparisonStatistics || !this.comparisonStatistics.charts) return '';

      const compChart = this.comparisonStatistics.charts.find(
        (c) => c.headingKey === stat.headingKey
      );

      if (!compChart) return '';

      if (stat.headingValueIsPrice) {
        return this.priceLabel(compChart.headingValue);
      }
      return compChart.headingValue;
    },
    getDeliveryTypeCount(deliveryType) {
      if (!this.deliveryStats) return 0;

      switch (deliveryType) {
        case 'SelfPickup':
          return (
            this.deliveryStats.pickup?.charts?.find(
              (c) => c.headingKey === 'Antall bestillinger totalt'
            )?.headingValue || 0
          );
        case 'InstantHomeDelivery':
        case 'WoltDelivery':
          return (
            this.deliveryStats.delivery?.charts?.find(
              (c) => c.headingKey === 'Antall bestillinger totalt'
            )?.headingValue || 0
          );
        case 'TableDelivery':
          return (
            this.deliveryStats.table?.charts?.find(
              (c) => c.headingKey === 'Antall bestillinger totalt'
            )?.headingValue || 0
          );
        default:
          return 0;
      }
    },
    getDeliveryTypeAmount(deliveryType) {
      if (!this.deliveryStats) return this.priceLabel(0);

      switch (deliveryType) {
        case 'SelfPickup':
          return this.priceLabel(
            this.deliveryStats.pickup?.charts?.find((c) => c.headingKey === 'Sum')
              ?.headingValue || 0
          );
        case 'InstantHomeDelivery':
        case 'WoltDelivery':
          return this.priceLabel(
            this.deliveryStats.delivery?.charts?.find((c) => c.headingKey === 'Sum')
              ?.headingValue || 0
          );
        case 'TableDelivery':
          return this.priceLabel(
            this.deliveryStats.table?.charts?.find((c) => c.headingKey === 'Sum')
              ?.headingValue || 0
          );
        default:
          return this.priceLabel(0);
      }
    },
    toggleComparisonMode() {
      this.comparisonMode = !this.comparisonMode;
      if (this.comparisonMode) {
        // Auto-fill comparison period with same dates as main period
        this.comparisonDateRange.from = this.dateRange.from;
        this.comparisonDateRange.to = this.dateRange.to;
        this.loadStatistics();
      } else {
        this.comparisonStatistics = null;
        this.comparisonDeliveryStats = { pickup: null, delivery: null, table: null };
      }
    },
    getComparisonDeliveryTypeCount(deliveryType) {
      if (!this.comparisonDeliveryStats) return 0;

      switch (deliveryType) {
        case 'SelfPickup':
          return (
            this.comparisonDeliveryStats.pickup?.charts?.find(
              (c) => c.headingKey === 'Antall bestillinger totalt'
            )?.headingValue || 0
          );
        case 'InstantHomeDelivery':
        case 'WoltDelivery':
          return (
            this.comparisonDeliveryStats.delivery?.charts?.find(
              (c) => c.headingKey === 'Antall bestillinger totalt'
            )?.headingValue || 0
          );
        case 'TableDelivery':
          return (
            this.comparisonDeliveryStats.table?.charts?.find(
              (c) => c.headingKey === 'Antall bestillinger totalt'
            )?.headingValue || 0
          );
        default:
          return 0;
      }
    },
    getComparisonDeliveryTypeAmount(deliveryType) {
      if (!this.comparisonDeliveryStats) return this.priceLabel(0);

      switch (deliveryType) {
        case 'SelfPickup':
          return this.priceLabel(
            this.comparisonDeliveryStats.pickup?.charts?.find((c) => c.headingKey === 'Sum')
              ?.headingValue || 0
          );
        case 'InstantHomeDelivery':
        case 'WoltDelivery':
          return this.priceLabel(
            this.comparisonDeliveryStats.delivery?.charts?.find((c) => c.headingKey === 'Sum')
              ?.headingValue || 0
          );
        case 'TableDelivery':
          return this.priceLabel(
            this.comparisonDeliveryStats.table?.charts?.find((c) => c.headingKey === 'Sum')
              ?.headingValue || 0
          );
        default:
          return this.priceLabel(0);
      }
    },
    getPercentageChange(current, previous) {
      if (previous === 0) return current > 0 ? '+100%' : '0%';
      const change = ((current - previous) / previous) * 100;
      const formatted = Math.abs(change).toFixed(1);
      return change > 0 ? `+${formatted}%` : change < 0 ? `-${formatted}%` : '0%';
    },
    getChangeClass(current, previous) {
      if (current > previous) return 'positive';
      if (current < previous) return 'negative';
      return 'neutral';
    },
    getChangeIcon(current, previous) {
      if (current > previous) return 'trending_up';
      if (current < previous) return 'trending_down';
      return 'trending_flat';
    },
    async renderSparklines() {
      if (!this.comparisonMode || !this.statistics?.charts) return;

      const { Chart, registerables } = await import('chart.js');
      Chart.register(...registerables);

      const deliveryTypes = [
        { id: 'pickup', type: 'SelfPickup', stats: this.deliveryStats.pickup, compStats: this.comparisonDeliveryStats.pickup },
        { id: 'delivery', type: 'WoltDelivery', stats: this.deliveryStats.delivery, compStats: this.comparisonDeliveryStats.delivery },
        { id: 'table', type: 'TableDelivery', stats: this.deliveryStats.table, compStats: this.comparisonDeliveryStats.table },
      ];

      deliveryTypes.forEach(({ id, stats, compStats }) => {
        const canvas = document.getElementById(`sparkline-${id}`);
        if (!canvas) return;

        // Set explicit canvas dimensions
        canvas.style.height = '50px';
        canvas.height = 50;

        const currentChart = stats?.charts?.find(c => c.points && c.points.length > 0);
        const comparisonChart = compStats?.charts?.find(c => c.points && c.points.length > 0);

        if (!currentChart) return;

        const ctx = canvas.getContext('2d');

        if (this.sparklineCharts[id]) {
          this.sparklineCharts[id].destroy();
        }

        const currentValues = currentChart.points.map(p => p.value || p.y || 0);
        const comparisonValues = comparisonChart?.points.map(p => p.value || p.y || 0) || [];

        this.sparklineCharts[id] = new Chart(ctx, {
          type: 'line',
          data: {
            labels: currentChart.points.map((p, i) => i),
            datasets: [
              {
                label: 'Periode 1',
                data: currentValues,
                borderColor: '#1bb776',
                backgroundColor: 'rgba(27, 183, 118, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
              },
              ...(comparisonValues.length > 0 ? [{
                label: 'Periode 2',
                data: comparisonValues,
                borderColor: '#1e40af',
                backgroundColor: 'rgba(30, 64, 175, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.4,
                pointRadius: 0,
              }] : []),
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false },
            },
            scales: {
              x: { display: false },
              y: { display: false },
            },
          },
        });
      });
    },
    getComparisonChartData(chartData) {
      if (!this.comparisonMode || !this.comparisonStatistics) return null;

      const compChart = this.comparisonStatistics.charts?.find(
        (c) => c.headingKey === chartData.headingKey
      );

      if (!compChart || !compChart.points || compChart.points.length <= 1) return null;

      return {
        labels: compChart.points.map((p) => p.key || p.x),
        values: compChart.points.map((p) => p.value || p.y),
        label: chartData.headingKey,
      };
    },
    getDateRangeLabel() {
      return `${this.dateRange.from} - ${this.dateRange.to}`;
    },
    getComparisonDateRangeLabel() {
      if (!this.comparisonMode) return '';
      return `${this.comparisonDateRange.from} - ${this.comparisonDateRange.to}`;
    },
    loadProductList() {
      this.isLoadingItems = true;

      const baseModel = {
        storeIds: this.selectedStoreIds,
        from: this.dateRange.from,
        to: this.dateRange.to,
        statuses: this.selectedStatuses,
        paymentTypes: this.selectedPaymentTypes,
        deliveryTypes: this.selectedDeliveryTypes,
        includeItems: true,
      };

      this._statisticsService
        .Get(baseModel)
        .then((response) => {
          this.ordersSummary = response.ordersSummary || [];
        })
        .catch((error) => {
          console.error('Failed to load product list:', error);
        })
        .finally(() => {
          this.isLoadingItems = false;
        });
    },
    toggleProductItem(index) {
      const idx = this.openOrderSummaryIndices.indexOf(index);
      if (idx >= 0) {
        this.openOrderSummaryIndices.splice(idx, 1);
      } else {
        this.openOrderSummaryIndices.push(index);
      }
    },
  },
};
</script>

<style lang="scss" scoped>
@import '../../assets/sass/common.scss';

.statistics-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.page-header {
  margin-bottom: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  h1 {
    font-size: 2em;
    font-weight: 600;
    color: #292c34;
    margin: 0;

    @media (max-width: 768px) {
      font-size: 1.5em;
    }
  }
}

.filters-section {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 32px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.period-label-with-compare {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
  }

  .comparison-toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #f8f9fa;
    color: #292c34;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 0.9em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    white-space: nowrap;

    .material-icons {
      font-size: 20px;
      transition: transform 0.3s ease;
    }

    &.active {
      background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
      color: white;
      border-color: #1e40af;
      box-shadow: 0 4px 12px rgba(30, 64, 175, 0.3);

      .material-icons {
        transform: rotate(180deg);
      }
    }
  }
}

.comparison-period-section {
  margin-top: 20px;
  padding: 20px;
  background: rgba(30, 64, 175, 0.05);
  border-radius: 10px;
  border: 2px dashed rgba(30, 64, 175, 0.3);

  .filter-label {
    color: #1e40af;
  }

  .custom-date-range {
    margin-top: 8px;

    .date-input-group {
      input {
        background: rgba(30, 64, 175, 0.02);
        border-color: rgba(30, 64, 175, 0.3);

        &:focus {
          border-color: #1e40af;
          box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.1);
        }
      }
    }
  }
}

.filter-group {
  margin-bottom: 20px;

  &:last-child {
    margin-bottom: 0;
  }

  .filter-label {
    display: block;
    font-weight: 600;
    color: #292c34;
    margin-bottom: 8px;
    font-size: 0.95em;
  }
}

.date-shortcuts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;

  .date-shortcut-btn {
    padding: 4px 8px;
    background: transparent;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8em;
    transition: all 0.15s ease;
    color: #999;
    font-weight: 400;
    text-decoration: underline;
    text-decoration-color: transparent;
    text-underline-offset: 2px;

    &:hover {
      color: #1bb776;
      text-decoration-color: #1bb776;
      background: rgba(27, 183, 118, 0.05);
    }

    @media (max-width: 768px) {
      padding: 3px 6px;
      font-size: 0.75em;
    }
  }
}

.custom-date-range {
  margin-top: 12px;
  display: flex;
  gap: 16px;
  flex-wrap: wrap;

  .date-input-group {
    flex: 1;
    min-width: 200px;

    label {
      display: block;
      font-size: 0.9em;
      color: #666;
      margin-bottom: 6px;
      font-weight: 500;
    }

    input {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 0.9em;
      transition: all 0.2s ease;

      &:hover {
        border-color: #cbd5e0;
      }

      &:focus {
        outline: none;
        border-color: #1bb776;
        box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
      }
    }
  }
}

.multi-select-filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  margin-top: 20px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.statistics-content {
  .delivery-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px;
    margin-bottom: 32px;

    .delivery-stat-card {
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      padding: 24px;
      border-radius: 12px;
      text-align: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      border: 1px solid #e8e8e8;
      position: relative;
      overflow: hidden;

      .stat-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;

        .material-icons {
          font-size: 2.2em;
          color: #292c34;
        }

        .stat-change {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.85em;
          font-weight: 700;

          .material-icons {
            font-size: 18px;
          }

          &.positive {
            background: #d4edda;
            color: #155724;

            .material-icons {
              color: #155724;
            }
          }

          &.negative {
            background: #f8d7da;
            color: #721c24;

            .material-icons {
              color: #721c24;
            }
          }

          &.neutral {
            background: #e2e8f0;
            color: #4a5568;

            .material-icons {
              color: #4a5568;
            }
          }
        }
      }

      .delivery-stat-value {
        font-size: 2em;
        font-weight: 700;
        color: #1bb776;
        margin: 12px 0;
        line-height: 1.2;
        text-align: center;

        .comparison-badge {
          display: block;
          font-size: 1em;
          font-weight: 700;
          color: #1e40af;
          margin-top: 8px;
        }
      }

      .delivery-stat-label {
        color: #4a5568;
        font-size: 1.05em;
        font-weight: 600;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .delivery-stat-amount {
        color: #1bb776;
        font-weight: 600;
        font-size: 1.1em;
        margin-bottom: 12px;
        text-align: center;
        line-height: 1.4;

        .comparison-badge.amount {
          display: block;
          font-size: 1em;
          font-weight: 600;
          color: #1e40af;
          margin-top: 6px;
        }
      }

      .sparkline-chart {
        height: 50px !important;
        max-height: 50px !important;
        margin-top: 12px;
        opacity: 0.9;
      }
    }
  }

  .charts-section {
    margin-bottom: 32px;

    .chart-container {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
      margin-bottom: 24px;

      .chart-title {
        font-size: 1.1em;
        font-weight: 600;
        color: #292c34;
        margin: 0 0 8px 0;
      }

      .chart-value {
        font-size: 1.5em;
        font-weight: 700;
        color: #1bb776;
        margin-bottom: 16px;
        line-height: 1.4;

        .chart-comparison-badge {
          display: block;
          font-size: 1em;
          font-weight: 700;
          color: #1e40af;
          margin-top: 8px;
        }
      }
    }
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;

    .stat-card {
      background: #f5f5f5;
      padding: 20px;
      border-radius: 12px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

      h3 {
        font-size: 1em;
        margin: 0 0 12px;
        color: #292c34;
      }

      .stat-value {
        font-size: 1.5em;
        font-weight: bold;
        color: #1bb776;
        text-align: center;
        line-height: 1.4;

        .stat-comparison-badge {
          display: block;
          font-size: 1em;
          font-weight: bold;
          color: #1e40af;
          margin-top: 8px;
        }
      }
    }
  }
}

.product-list-section {
  margin-top: 32px;
  margin-bottom: 32px;

  .show-product-list-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 24px;
    background: linear-gradient(135deg, #1bb776 0%, #16a068 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);

    .material-icons {
      font-size: 22px;
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
    }

    &:active {
      transform: translateY(0);
    }
  }

  .product-list-loading {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    overflow: hidden;

    .product-list-skeleton-item {
      display: grid;
      grid-template-columns: 60px 1fr 100px;
      align-items: center;
      gap: 16px;
      padding: 16px 24px;
      border-bottom: 1px solid #f0f0f0;

      @media (max-width: 640px) {
        grid-template-columns: 50px 1fr 90px;
        gap: 12px;
        padding: 12px 16px;
      }

      &:last-child {
        border-bottom: none;
      }

      .skeleton-line {
        height: 20px;
        background: linear-gradient(
          90deg,
          #f0f0f0 25%,
          #e0e0e0 50%,
          #f0f0f0 75%
        );
        background-size: 200% 100%;
        animation: loading 1.5s ease-in-out infinite;
        border-radius: 4px;
      }

      .skeleton-quantity {
        width: 40px;
      }

      .skeleton-name {
        width: 70%;
      }

      .skeleton-amount {
        width: 80px;
        justify-self: end;
      }
    }
  }

  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  .product-list-card {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
    overflow: hidden;

    .product-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 24px;
      border-bottom: 2px solid #f0f0f0;

      h3 {
        font-size: 1.3em;
        font-weight: 600;
        color: #292c34;
        margin: 0;
      }

      .clear-list-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        padding: 0;
        background: #f8f9fa;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;

        .material-icons {
          font-size: 20px;
          color: #666;
        }

        &:hover {
          background: #fee;
          .material-icons {
            color: #dc3545;
          }
        }
      }
    }

    .product-list-items {
      .product-item {
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .product-item-main {
          display: grid;
          grid-template-columns: 60px 1fr 100px;
          align-items: center;
          gap: 16px;
          padding: 16px 24px;
          transition: background 0.2s ease;

          @media (max-width: 640px) {
            grid-template-columns: 50px 1fr 90px;
            gap: 12px;
            padding: 12px 16px;
          }

          .product-quantity {
            font-size: 1em;
            font-weight: 700;
            color: #1bb776;
            text-align: left;
          }

          .product-name {
            font-size: 1em;
            color: #292c34;
            font-weight: 500;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .expand-icon {
            font-size: 24px;
            color: #999;
            transition: transform 0.3s ease, color 0.2s ease;
            flex-shrink: 0;

            &.expanded {
              transform: rotate(180deg);
              color: #1bb776;
            }
          }

          .product-amount {
            font-size: 1.05em;
            font-weight: 700;
            color: #1bb776;
            text-align: right;
            white-space: nowrap;
          }
        }

        &.has-options .product-item-main {
          cursor: pointer;

          &:hover {
            background: #f8f9fa;
          }
        }

        .product-options {
          background: #fafbfc;
          padding: 8px 24px 16px 24px;
          border-top: 1px solid #e8e8e8;

          @media (max-width: 640px) {
            padding: 8px 16px 12px 16px;
          }

          .product-option-row {
            display: grid;
            grid-template-columns: 60px 1fr auto;
            align-items: center;
            gap: 16px;
            padding: 8px 0 8px 20px;

            @media (max-width: 640px) {
              grid-template-columns: 50px 1fr auto;
              gap: 12px;
              padding-left: 12px;
            }

            .option-quantity {
              font-size: 0.9em;
              font-weight: 600;
              color: #666;
              text-align: left;
            }

            .option-name {
              font-size: 0.9em;
              color: #666;
              font-weight: 400;
            }

            .option-amount {
              font-size: 0.95em;
              font-weight: 600;
              color: #666;
              text-align: right;
              white-space: nowrap;
            }
          }
        }
      }
    }
  }
}
</style>
