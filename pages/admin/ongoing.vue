<template>
  <AdminPage>
    <div class="ongoing-orders">
      <Loading
        v-if="isLoading"
        :loading="true"
      />

      <div class="orders-grid">
        <!-- New Orders Column -->
        <div
          class="orders-column"
          :class="{ 'is-collapsed': isMobile && collapsedColumns.new }"
        >
          <div
            class="column-header"
            :class="{ 'is-clickable': isMobile && newOrders.length }"
            @click="isMobile && newOrders.length && (collapsedColumns.new = !collapsedColumns.new)"
          >
            <h2>Nye</h2>
            <span
              v-if="newOrders.length"
              class="count-badge"
              >{{ newOrders.length }}</span
            >
          </div>
          <div
            v-if="(!isMobile || !collapsedColumns.new) && newOrders.length"
            class="orders-list"
          >
            <div
              v-for="order in newOrders"
              :key="order.id"
              class="order-card"
              :class="{
                'is-warning': isOrderDelayed(order),
              }"
            >
              <div
                class="order-header"
                @click="showOrderId === order.id ? (showOrderId = '') : (showOrderId = order.id)"
              >
                <div class="header-left">
                  <span class="store-name">{{ order.storeLegalName }}</span>
                </div>
                <span class="order-status">
                  <span class="material-icons">{{ iconForOrder(order) }}</span>
                  {{ order.friendlyOrderId }}
                </span>
              </div>

              <div
                v-if="showOrderId === order.id"
                class="order-details"
              >
                <div class="info-grid">
                  <div class="info-item">
                    <label>Platform:</label>
                    <span>{{ order.platform }}</span>
                  </div>
                  <div
                    v-if="order.deliveryType === 'DineHomeDelivery'"
                    class="info-item"
                  >
                    <label>Sjåførstatus:</label>
                    <div class="status-wrapper">
                      <span>{{ dineHomeDeliveryStatusLabel(order.dineHomeStatus) }}</span>
                      <span
                        v-if="getDriverDelay(order) > 0"
                        class="delay-badge"
                      >
                        {{ getDriverDelay(order) }} min forsinket
                      </span>
                    </div>
                  </div>
                  <div class="info-item">
                    <label>Bestilit:</label>
                    <span>{{ formatDate(order.created || order.pickup) }}</span>
                  </div>
                  <div class="info-item">
                    <label>Klar til:</label>
                    <span v-if="order.countdownEndTime">{{ formatDate(order.countdownEndTime) }}</span>
                  </div>
                  <div class="info-item">
                    <label>Totalpris:</label>
                    <span>{{ priceLabel(order.finalAmount) }}</span>
                  </div>
                  <div class="info-item">
                    <label>Levering:</label>
                    <span>{{ deliveryTypeLabel(order.deliveryType) }}</span>
                  </div>
                  <div class="info-item">
                    <label>Betaling:</label>
                    <span>{{ paymentTypeLabel(order.paymentType) }}</span>
                  </div>
                  <div class="info-item">
                    <label>Kommentar:</label>
                    <span>{{ order.comment }}</span>
                  </div>
                </div>

                <div class="order-items">
                  <button
                    class="toggle-items-btn"
                    @click="showOrderItemsOfOrderId === order.id ? (showOrderItemsOfOrderId = '') : (showOrderItemsOfOrderId = order.id)"
                  >
                    <span class="btn-text">{{ showOrderItemsOfOrderId !== order.id ? "Vis varer" : "Skjul varer" }}</span>
                    <span
                      class="btn-icon"
                      :class="{ 'is-up': showOrderItemsOfOrderId === order.id }"
                      >▼</span
                    >
                  </button>

                  <div
                    v-if="showOrderItemsOfOrderId === order.id"
                    class="items-table"
                  >
                    <table>
                      <thead>
                        <tr>
                          <th class="u-left">Vare</th>
                          <th class="u-right">Pris</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr
                          v-for="item in order.items"
                          :key="item.id"
                        >
                          <td>{{ item.quantity }} {{ item.name }} (Mva: {{ item.tax }}%)</td>
                          <td class="u-right">
                            {{ priceLabel(item.amount) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            v-else-if="!isMobile || !collapsedColumns.new"
            class="empty-state"
          >
            Ingen nye ordrer
          </div>
        </div>

        <!-- Processing Orders Column -->
        <div
          class="orders-column"
          :class="{ 'is-collapsed': isMobile && collapsedColumns.processing }"
        >
          <div
            class="column-header"
            @click="isMobile && (collapsedColumns.processing = !collapsedColumns.processing)"
          >
            <h2>Pågående</h2>
            <span
              v-if="processingOrders.length"
              class="count-badge"
              >{{ processingOrders.length }}</span
            >
          </div>
          <div
            v-if="!isMobile || !collapsedColumns.processing"
            class="orders-list"
          >
            <div v-if="processingOrders.length">
              <div
                v-for="order in processingOrders"
                :key="order.id"
                class="order-card"
                :class="{
                  'is-warning': isOrderDelayed(order),
                }"
              >
                <div
                  class="order-header"
                  @click="showOrderId === order.id ? (showOrderId = '') : (showOrderId = order.id)"
                >
                  <div class="header-left">
                    <span class="store-name">{{ order.storeLegalName }}</span>
                  </div>
                  <span class="order-status">
                    <span class="material-icons">{{ iconForOrder(order) }}</span>
                    {{ order.friendlyOrderId }}
                  </span>
                </div>

                <div
                  v-if="showOrderId === order.id"
                  class="order-details"
                >
                  <div class="info-grid">
                    <div class="info-item">
                      <label>Platform:</label>
                      <span>{{ order.platform }}</span>
                    </div>
                    <div
                      v-if="order.deliveryType === 'DineHomeDelivery'"
                      class="info-item"
                    >
                      <label>Sjåførstatus:</label>
                      <div class="status-wrapper">
                        <span>{{ dineHomeDeliveryStatusLabel(order.dineHomeStatus) }}</span>
                        <span
                          v-if="getDriverDelay(order) > 0"
                          class="delay-badge"
                        >
                          {{ getDriverDelay(order) }} min forsinket
                        </span>
                      </div>
                    </div>
                    <div class="info-item">
                      <label>Bestilit:</label>
                      <span>{{ formatDate(order.created || order.pickup) }}</span>
                    </div>
                    <div class="info-item">
                      <label>Klar til:</label>
                      <span v-if="order.countdownEndTime">{{ formatDate(order.countdownEndTime) }}</span>
                    </div>

                    <div class="info-item">
                      <label>Totalpris:</label>
                      <span>{{ priceLabel(order.finalAmount) }}</span>
                    </div>
                    <div class="info-item">
                      <label>Levering:</label>
                      <span>{{ deliveryTypeLabel(order.deliveryType) }}</span>
                    </div>

                    <div class="info-item">
                      <label>Betaling:</label>
                      <span>{{ paymentTypeLabel(order.paymentType) }}</span>
                    </div>
                    <div class="info-item">
                      <label>Kommentar:</label>
                      <span>{{ order.comment }}</span>
                    </div>
                  </div>

                  <div class="order-items">
                    <button
                      class="toggle-items-btn"
                      @click="showOrderItemsOfOrderId === order.id ? (showOrderItemsOfOrderId = '') : (showOrderItemsOfOrderId = order.id)"
                    >
                      <span class="btn-text">{{ showOrderItemsOfOrderId !== order.id ? "Vis varer" : "Skjul varer" }}</span>
                      <span
                        class="btn-icon"
                        :class="{
                          'is-up': showOrderItemsOfOrderId === order.id,
                        }"
                        >▼</span
                      >
                    </button>

                    <div
                      v-if="showOrderItemsOfOrderId === order.id"
                      class="items-table"
                    >
                      <table>
                        <thead>
                          <tr>
                            <th class="u-left">Vare</th>
                            <th class="u-right">Pris</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="item in order.items"
                            :key="item.id"
                          >
                            <td>{{ item.quantity }} {{ item.name }} (Mva: {{ item.tax }}%)</td>
                            <td class="u-right">
                              {{ priceLabel(item.amount) }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              v-else
              class="empty-state"
            >
              Ingen pågående ordrer
            </div>
          </div>
        </div>

        <!-- Ready Orders Column -->
        <div
          class="orders-column"
          :class="{ 'is-collapsed': isMobile && collapsedColumns.ready }"
        >
          <div
            class="column-header"
            @click="isMobile && (collapsedColumns.ready = !collapsedColumns.ready)"
          >
            <h2>Klar</h2>
            <span
              v-if="readyOrders.length"
              class="count-badge"
              >{{ readyOrders.length }}</span
            >
          </div>
          <div
            v-if="!isMobile || !collapsedColumns.ready"
            class="orders-list"
          >
            <div v-if="readyOrders.length">
              <div
                v-for="order in readyOrders"
                :key="order.id"
                class="order-card"
                :class="{
                  'is-warning': isOrderDelayed(order),
                }"
              >
                <div
                  class="order-header"
                  @click="showOrderId === order.id ? (showOrderId = '') : (showOrderId = order.id)"
                >
                  <div class="header-left">
                    <span class="store-name">{{ order.storeLegalName }}</span>
                  </div>
                  <span class="order-status">
                    <span class="material-icons">{{ iconForOrder(order) }}</span>
                    {{ order.friendlyOrderId }}
                  </span>
                </div>

                <div
                  v-if="showOrderId === order.id"
                  class="order-details"
                >
                  <div class="info-grid">
                    <div class="info-item">
                      <label>Platform:</label>
                      <span>{{ order.platform }}</span>
                    </div>
                    <div
                      v-if="order.deliveryType === 'DineHomeDelivery'"
                      class="info-item"
                    >
                      <label>Sjåførstatus:</label>
                      <div class="status-wrapper">
                        <span>{{ dineHomeDeliveryStatusLabel(order.dineHomeStatus) }}</span>
                        <span
                          v-if="getDriverDelay(order) > 0"
                          class="delay-badge"
                        >
                          {{ getDriverDelay(order) }} min forsinket
                        </span>
                      </div>
                    </div>
                    <div class="info-item">
                      <label>Bestilit:</label>
                      <span>{{ formatDate(order.created || order.pickup) }}</span>
                    </div>
                    <div class="info-item">
                      <label>Klar til:</label>
                      <span v-if="order.countdownEndTime">{{ formatDate(order.countdownEndTime) }}</span>
                    </div>

                    <div class="info-item">
                      <label>Totalpris:</label>
                      <span>{{ priceLabel(order.finalAmount) }}</span>
                    </div>
                    <div class="info-item">
                      <label>Levering:</label>
                      <span>{{ deliveryTypeLabel(order.deliveryType) }}</span>
                    </div>

                    <div class="info-item">
                      <label>Betaling:</label>
                      <span>{{ paymentTypeLabel(order.paymentType) }}</span>
                    </div>
                    <div class="info-item">
                      <label>Kommentar:</label>
                      <span>{{ order.comment }}</span>
                    </div>
                  </div>

                  <div class="order-items">
                    <button
                      class="toggle-items-btn"
                      @click="showOrderItemsOfOrderId === order.id ? (showOrderItemsOfOrderId = '') : (showOrderItemsOfOrderId = order.id)"
                    >
                      <span class="btn-text">{{ showOrderItemsOfOrderId !== order.id ? "Vis varer" : "Skjul varer" }}</span>
                      <span
                        class="btn-icon"
                        :class="{
                          'is-up': showOrderItemsOfOrderId === order.id,
                        }"
                        >▼</span
                      >
                    </button>

                    <div
                      v-if="showOrderItemsOfOrderId === order.id"
                      class="items-table"
                    >
                      <table>
                        <thead>
                          <tr>
                            <th class="u-left">Vare</th>
                            <th class="u-right">Pris</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="item in order.items"
                            :key="item.id"
                          >
                            <td>{{ item.quantity }} {{ item.name }} (Mva: {{ item.tax }}%)</td>
                            <td class="u-right">
                              {{ priceLabel(item.amount) }}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div
              v-else
              class="empty-state"
            >
              Ingen klare ordrer
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="statistics"
        class="statistics-section"
      >
        <div class="stats-header">
          <h2 class="stats-title">
            Fullførte bestillinger
            <div class="date-line">
              <span
                class="clickable-date"
                @click="showDatePicker = !showDatePicker"
                >{{ formatDayAndDate() }}
                <span class="material-icons date-icon">calendar_today</span>
              </span>
              <span
                v-if="dateRange.from !== new Date().toISOString().split('T')[0] || dateRange.to !== new Date().toISOString().split('T')[0]"
                class="material-icons date-icon"
                style="cursor: pointer"
                @click="resetDateRange"
                >restart_alt</span
              >
            </div>
          </h2>

          <div
            v-if="showDatePicker"
            class="date-picker-container"
          >
            <div class="date-picker-wrapper">
              <div class="date-input">
                <label>Fra dato:</label>
                <input
                  v-model="dateRange.from"
                  type="date"
                  :max="dateRange.to"
                  @change="applyDateRange"
                />
              </div>
              <div class="date-input">
                <label>Til dato:</label>
                <input
                  v-model="dateRange.to"
                  type="date"
                  :min="dateRange.from"
                  @change="applyDateRange"
                />
              </div>

              <button
                class="close-date-picker-btn"
                @click="showDatePicker = false"
              >
                <span class="material-icons">close</span>
              </button>
            </div>
          </div>
        </div>

        <div class="store-filters">
          <div class="store-filters-wrapper">
            <div
              v-for="store in adminStores"
              :key="store.id"
              class="store-filter-wrapper"
            >
              <button
                class="store-filter-btn"
                :class="{ active: selectedStoreIds.includes(store.id) }"
                @click="toggleStore(store.id)"
              >
                {{ store.name }}
              </button>
            </div>
            <button
              v-if="selectedStoreIds.length"
              class="store-filter-btn unmark-all"
              title="Fjern alle filtre"
              @click="unmarkAllStores"
            >
              <span class="material-icons">close</span>
            </button>
          </div>
        </div>

        <Loading
          v-if="isLoadingStats"
          :loading="true"
        />
        <template v-else>
          <div class="delivery-stats-grid">
            <div
              v-if="getDeliveryTypeCount('SelfPickup')"
              class="delivery-stat-card"
            >
              <span class="material-icons">shopping_bag</span>
              <div class="delivery-stat-value">
                {{ getDeliveryTypeCount("SelfPickup") }}
              </div>
              <div class="delivery-stat-label">Henting</div>
              <div class="delivery-stat-amount">
                {{ getDeliveryTypeAmount("SelfPickup") }}
              </div>
            </div>
            <div
              v-if="getDeliveryTypeCount('InstantHomeDelivery') || getDeliveryTypeCount('WoltDelivery')"
              class="delivery-stat-card"
            >
              <span class="material-icons">delivery_dining</span>
              <div class="delivery-stat-value">
                {{ getDeliveryTypeCount("WoltDelivery") }}
              </div>
              <div class="delivery-stat-label">Levering</div>
              <div class="delivery-stat-amount">
                {{ getDeliveryTypeAmount("InstantHomeDelivery") }}
              </div>
            </div>
            <div
              v-if="getDeliveryTypeCount('TableDelivery')"
              class="delivery-stat-card"
            >
              <span class="material-icons">deck</span>
              <div class="delivery-stat-value">
                {{ getDeliveryTypeCount("TableDelivery") }}
              </div>
              <div class="delivery-stat-label">Bord</div>
              <div class="delivery-stat-amount">
                {{ getDeliveryTypeAmount("TableDelivery") }}
              </div>
            </div>
          </div>

          <div class="stats-grid">
            <div
              v-for="chart in statistics.charts"
              :key="chart.headingKey"
              class="stat-card"
            >
              <h3>{{ chart.headingKey }}</h3>
              <div class="stat-value">
                {{ formatStatValue(chart) }}
              </div>
            </div>
          </div>
        </template>
      </div>

      <LoginModal
        v-if="showLogin"
        @close="closeLoginModal"
      />
    </div>
  </AdminPage>
</template>
<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import Loading from "~/components/atoms/Loading.vue";
import { debounce } from "~/core/helpers/ts-debounce";
import LoginModal from "~/components/molecules/LoginModal.vue";

export default {
  components: { AdminPage, LoginModal, Loading },
  data: () => ({
    showLogin: false,
    isLoading: false,
    orders: [],
    statistics: null,
    deliveryStats: {
      pickup: null,
      delivery: null,
      table: null,
    },
    showOrderId: "",
    showOrderItemsOfOrderId: "",
    collapsedColumns: {
      new: false,
      processing: false,
      ready: false,
    },
    isMobile: false,
    refreshInterval: null,
    selectedStoreIds: [],
    adminStores: [],
    currentDate: new Date(),
    debouncedLoadStatistics: null,
    showDatePicker: false,
    dateRange: {
      from: new Date().toISOString().split("T")[0],
      to: new Date().toISOString().split("T")[0],
    },
    isLoadingStats: false,
  }),
  computed: {
    newOrders() {
      return this.orders.filter((x) => x.status === "Accepted").sort((a, b) => new Date(a.created) - new Date(b.created));
    },
    processingOrders() {
      return this.orders.filter((x) => x.status === "Processing").sort((a, b) => new Date(a.created) - new Date(b.created));
    },
    readyOrders() {
      return this.orders.filter((x) => ["Ready", "ReadyForPickup", "ReadyForDriver"].includes(x.status)).sort((a, b) => new Date(a.created) - new Date(b.created));
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      return;
    }
    this.adminStores = this.$store.state.currentUser.adminIn;
    this.selectedStoreIds = this.adminStores.map((store) => store.id);
    this.loadOrders();
    this.loadStatistics();
    this.checkMobile();
    window.addEventListener("resize", this.checkMobile);
    this.startAutoRefresh();
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.checkMobile);
    this.stopAutoRefresh();
  },
  created() {
    this.debouncedLoadStatistics = debounce(this.loadStatistics, 1000);
  },
  methods: {
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        this.loadOrders();
      }
    },
    loadOrders() {
      this.isLoading = true;
      this._orderService
        .GetAllOngoing()
        .then((orders) => {
          this.orders = orders;
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    loadStatistics() {
      this.isLoadingStats = true;

      const baseModel = {
        storeIds: this.selectedStoreIds,
        from: this.dateRange.from,
        to: this.dateRange.to,
        statuses: ["Completed"],
        paymentTypes: ["PayInStore", "Stripe", "Vipps", "Giftcard", "Dintero", "DinteroVipps", "DinteroBillie", "DinteroKlarna"],
      };

      // Create an array of promises for all statistics requests
      const promises = [
        // General statistics
        this._statisticsService.Get({
          ...baseModel,
          deliveryTypes: ["SelfPickup", "InstantHomeDelivery", "WoltDelivery", "TableDelivery"],
        }),
        // Pickup statistics
        this._statisticsService.Get({
          ...baseModel,
          deliveryTypes: ["SelfPickup"],
        }),
        // Delivery statistics
        this._statisticsService.Get({
          ...baseModel,
          deliveryTypes: ["InstantHomeDelivery", "WoltDelivery"],
        }),
        // Table statistics
        this._statisticsService.Get({
          ...baseModel,
          deliveryTypes: ["TableDelivery"],
        }),
      ];

      // Wait for all requests to complete
      Promise.all(promises)
        .then(([generalStats, pickupStats, deliveryStats, tableStats]) => {
          this.statistics = generalStats;
          this.deliveryStats = {
            pickup: pickupStats,
            delivery: deliveryStats,
            table: tableStats,
          };
        })
        .catch((error) => {
          console.error("Failed to load statistics:", error);
        })
        .finally(() => {
          this.isLoadingStats = false;
        });
    },
    checkMobile() {
      this.isMobile = window.innerWidth <= 768;
      if (!this.isMobile) {
        // Reset collapsed state on desktop
        this.collapsedColumns = {
          new: false,
          processing: false,
          ready: false,
        };
      } else {
        // Close empty columns on mobile
        this.collapsedColumns = {
          new: !this.newOrders.length,
          processing: !this.processingOrders.length,
          ready: !this.readyOrders.length,
        };
      }
    },
    startAutoRefresh() {
      this.refreshInterval = setInterval(() => {
        this._orderService.GetAllOngoing().then((orders) => {
          this.orders = orders;
        });

        // Create promises array without setting loading state
        const baseModel = {
          storeIds: this.selectedStoreIds,
          from: this.dateRange.from,
          to: this.dateRange.to,
          statuses: ["Completed"],
          paymentTypes: ["PayInStore", "Stripe", "Vipps", "Giftcard", "Dintero", "DinteroVipps", "DinteroBillie", "DinteroKlarna"],
        };

        const promises = [
          this._statisticsService.Get({
            ...baseModel,
            deliveryTypes: ["SelfPickup", "InstantHomeDelivery", "WoltDelivery", "TableDelivery"],
          }),
          this._statisticsService.Get({
            ...baseModel,
            deliveryTypes: ["SelfPickup"],
          }),
          this._statisticsService.Get({
            ...baseModel,
            deliveryTypes: ["InstantHomeDelivery", "WoltDelivery"],
          }),
          this._statisticsService.Get({
            ...baseModel,
            deliveryTypes: ["TableDelivery"],
          }),
        ];

        Promise.all(promises)
          .then(([generalStats, pickupStats, deliveryStats, tableStats]) => {
            this.statistics = generalStats;
            this.deliveryStats = {
              pickup: pickupStats,
              delivery: deliveryStats,
              table: tableStats,
            };
          })
          .catch((error) => {
            console.error("Failed to load statistics:", error);
          });
      }, 7000);
    },
    stopAutoRefresh() {
      if (this.refreshInterval) {
        clearInterval(this.refreshInterval);
      }
    },
    iconForOrder(order) {
      // Delivery icon
      if (order.deliveryType === "InstantHomeDelivery" || order.deliveryType === "DineHomeDelivery" || order.deliveryType === "WoltDelivery") {
        return "delivery_dining";
      }
      if (order.deliveryType === "SelfPickup") {
        return "shopping_bag";
      }
      if (order.deliveryType === "TableDelivery") {
        return "deck";
      }

      return "receipt_long"; // fallback icon
    },
    isOrderDelayed(order) {
      const now = new Date();
      const created = new Date(order.created);
      const processingEnd = order.processingEndTime ? new Date(order.processingEndTime) : null;
      const estimatedEnd = order.estimatedProcessingEndTime ? new Date(order.estimatedProcessingEndTime) : null;

      // Unaccepted orders over 8 minutes old
      if (order.status === "Accepted") {
        const diffSeconds = (now - created) / 1000;
        return diffSeconds >= 480;
      }

      // Driver waiting orders over 10 minutes old
      if (order.status === "ReadyForDriver" && processingEnd && estimatedEnd) {
        const latestEnd = processingEnd > estimatedEnd ? processingEnd : estimatedEnd;
        const diffSeconds = (now - latestEnd) / 1000;
        return diffSeconds >= 600 && (!order.dineHomeStatus || order.dineHomeStatus === "NotSet" || order.dineHomeStatus === "Accepted");
      }

      return false;
    },
    getDriverDelay(order) {
      const now = new Date();
      const processingEnd = order.processingEndTime ? new Date(order.processingEndTime) : null;
      const estimatedEnd = order.estimatedProcessingEndTime ? new Date(order.estimatedProcessingEndTime) : null;

      if (order.status === "ReadyForDriver" && processingEnd && estimatedEnd && (!order.dineHomeStatus || order.dineHomeStatus === "NotSet" || order.dineHomeStatus === "Accepted")) {
        const latestEnd = processingEnd > estimatedEnd ? processingEnd : estimatedEnd;
        const diffMinutes = Math.floor((now - latestEnd) / (1000 * 60));
        return diffMinutes >= 10 ? diffMinutes : 0;
      }
      return 0;
    },
    dineHomeDeliveryStatusLabel(dineHomeDeliveryTypeEnum) {
      switch (dineHomeDeliveryTypeEnum) {
        case "Accepted":
          return "Sjåfør har akseptert";
        case "PickedUp":
          return "Sjåfør leverer bestilling";
        case "ReachedDestination":
          return "Sjåfør fremme hos kunde";
        case "Completed":
          return "Fullført";
        case "Canceled":
          return "Sjåfør har kansellert";
        default:
          return "Venter aksept fra sjåfør";
      }
    },
    formatStatValue(stat) {
      if (stat.headingValueIsPrice) {
        return this.priceLabel(stat.headingValue);
      }
      return stat.headingValue;
    },
    getDeliveryTypeCount(deliveryType) {
      if (!this.deliveryStats) {
        return 0;
      }

      switch (deliveryType) {
        case "SelfPickup":
          return this.deliveryStats.pickup?.charts?.find((c) => c.headingKey === "Antall bestillinger totalt")?.headingValue || 0;
        case "InstantHomeDelivery":
        case "WoltDelivery":
          return this.deliveryStats.delivery?.charts?.find((c) => c.headingKey === "Antall bestillinger totalt")?.headingValue || 0;
        case "TableDelivery":
          return this.deliveryStats.table?.charts?.find((c) => c.headingKey === "Antall bestillinger totalt")?.headingValue || 0;
        default:
          return 0;
      }
    },
    getDeliveryTypeAmount(deliveryType) {
      if (!this.deliveryStats) {
        return this.priceLabel(0);
      }

      switch (deliveryType) {
        case "SelfPickup":
          return this.priceLabel(this.deliveryStats.pickup?.charts?.find((c) => c.headingKey === "Sum")?.headingValue || 0);
        case "InstantHomeDelivery":
        case "WoltDelivery":
          return this.priceLabel(this.deliveryStats.delivery?.charts?.find((c) => c.headingKey === "Sum")?.headingValue || 0);
        case "TableDelivery":
          return this.priceLabel(this.deliveryStats.table?.charts?.find((c) => c.headingKey === "Sum")?.headingValue || 0);
        default:
          return this.priceLabel(0);
      }
    },
    toggleStore(storeId) {
      if (this.selectedStoreIds.includes(storeId)) {
        this.selectedStoreIds = this.selectedStoreIds.filter((id) => id !== storeId);
      } else {
        this.selectedStoreIds.push(storeId);
      }
      this.debouncedLoadStatistics();
    },
    formatDayAndDate() {
      const formatDate = (dateStr, options = {}) => {
        const date = new Date(dateStr);
        const days = ["Søndag", "Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag"];

        const dayName = days[date.getDay()];
        const formattedDate = date.toLocaleDateString("nb-NO", {
          day: "numeric",
          month: options.showMonth ? "long" : undefined,
          year: options.showYear ? "numeric" : undefined,
        });

        return options.showDayName ? `${dayName} ${formattedDate}` : formattedDate;
      };

      const fromDate = new Date(this.dateRange.from);
      const toDate = new Date(this.dateRange.to);

      // If same date
      if (this.dateRange.from === this.dateRange.to) {
        return formatDate(fromDate, { showDayName: true, showMonth: true });
      }

      // If same month and year
      if (fromDate.getMonth() === toDate.getMonth() && fromDate.getFullYear() === toDate.getFullYear()) {
        return `${formatDate(fromDate, { showDayName: true })} - ${formatDate(toDate, { showDayName: true, showMonth: true })}`;
      }

      // If same year
      if (fromDate.getFullYear() === toDate.getFullYear()) {
        return `${formatDate(fromDate, {
          showDayName: true,
          showMonth: true,
        })} - ${formatDate(toDate, { showDayName: true, showMonth: true })}`;
      }

      // Different years
      return `${formatDate(fromDate, {
        showDayName: true,
        showMonth: true,
        showYear: true,
      })} - ${formatDate(toDate, {
        showDayName: true,
        showMonth: true,
        showYear: true,
      })}`;
    },
    unmarkAllStores() {
      this.selectedStoreIds = [];
      this.debouncedLoadStatistics();
    },
    applyDateRange() {
      this.loadStatistics();
    },
    resetDateRange() {
      const today = new Date().toISOString().split("T")[0];
      this.dateRange.from = today;
      this.dateRange.to = today;
      this.applyDateRange();
      this.showDatePicker = false;
    },
  },
};
</script>
<style lang="scss">
@import "../../assets/sass/common.scss";

.ongoing-orders {
  max-width: 100%;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.orders-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  flex: 1;
  min-height: 0;
  padding: 24px;
  height: 100%;
  margin-bottom: 40px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 16px;
    gap: 16px;
    margin-bottom: 24px;
  }
}

.orders-column {
  background: #f8f9fa;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.08);
  }

  .column-header {
    padding: 20px;
    background: #292c34;
    border-radius: 12px 12px 0 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    user-select: none;
    transition: background-color 0.2s ease;

    h2 {
      color: #d5f6e5;
      margin: 0;
      font-size: 1.25em;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
  }

  .orders-list {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    height: calc(100% - 64px);
    transition: all 0.3s ease;

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #f8f9fa;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: #ddd;
      border-radius: 4px;

      &:hover {
        background: #ccc;
      }
    }
  }
}

.count-badge {
  background: #d5f6e5;
  color: #292c34;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.9em;
  font-weight: 600;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.order-card {
  margin-bottom: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .order-header {
    background: #f8f9fa;
    padding: 16px 20px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 12px 12px 0 0;
    transition: background-color 0.2s ease;

    &:hover {
      background: #f0f2f5;
    }

    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
      min-width: 0;

      .store-name {
        font-weight: 600;
        font-size: 0.95em;
        line-height: 1.4;
        word-break: break-word;
        color: #292c34;
      }
    }

    .order-status {
      flex-shrink: 0;
      padding: 6px 14px;
      border-radius: 20px;
      background: #e8eaed;
      font-size: 0.9em;
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      transition: background-color 0.2s ease;

      .material-icons {
        font-size: 18px;
      }

      &:hover {
        background: #e0e2e6;
      }
    }
  }

  &.is-warning {
    border-left: 4px solid #ff4444;

    .order-header {
      background: #fff5f5;
      padding-left: 16px;

      &:hover {
        background: #ffe8e8;
      }

      .header-left::before {
        content: "warning";
        font-family: "Material Icons";
        color: #ff4444;
        font-size: 18px;
        margin-top: 2px;
      }
    }
  }
}

.order-details {
  padding: 24px;
  background: white;
  border-radius: 0 0 12px 12px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 28px;

  .info-item {
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
    transition: background-color 0.2s ease;

    &:hover {
      background: #f0f2f5;
    }

    label {
      font-weight: 600;
      color: #4a5568;
      margin-right: 8px;
      font-size: 0.9em;
    }

    span {
      color: #1a202c;
      font-size: 0.95em;
    }
  }
}

.toggle-items-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f0f7ff;
  border: 2px solid #1bb776;
  border-radius: 8px;
  color: #1bb776;
  cursor: pointer;
  padding: 10px 20px;
  font-size: 0.95em;
  font-weight: 600;
  width: 100%;
  transition: all 0.2s ease;

  &:hover {
    background: #e8f7f1;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(27, 183, 118, 0.1);
  }

  &:active {
    transform: translateY(0);
  }

  .btn-icon {
    font-size: 0.8em;
    transition: transform 0.3s ease;

    &.is-up {
      transform: rotate(-180deg);
    }
  }
}

.items-table {
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 14px;
      border-bottom: 1px solid #edf2f7;
    }

    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #4a5568;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      color: #1a202c;
      font-size: 0.95em;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: #f8f9fa;
    }
  }
}

.empty-state {
  text-align: center;
  padding: 24px;
  color: #718096;
  font-style: italic;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 12px 0;
}

.delay-badge {
  background: #ff4444;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: 500;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(255, 68, 68, 0.2);
}

.statistics-section {
  padding: 24px;
  background: #fff;
  margin: 0 24px 24px;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);

  .stats-header {
    margin-bottom: 28px;
  }

  .stats-title {
    font-size: 1.6em;
    font-weight: 600;
    color: #292c34;
    margin-bottom: 8px;
    letter-spacing: 0.5px;
    text-align: center;

    .date-line {
      font-size: 0.8em;
      margin-top: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .date-icon {
      font-size: 1em;
    }
  }
}

.delivery-stat-card {
  background: #f8f9fa;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .material-icons {
    font-size: 2.2em;
    color: #292c34;
    margin-bottom: 8px;
  }

  .delivery-stat-value {
    font-size: 1.8em;
    font-weight: 700;
    color: #1bb776;
    margin: 8px 0;
  }

  .delivery-stat-label {
    color: #4a5568;
    font-size: 1em;
    font-weight: 500;
    margin-bottom: 8px;
  }

  .delivery-stat-amount {
    color: #1bb776;
    font-weight: 600;
    font-size: 1em;
  }
}

.date-picker-wrapper {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

  .date-input {
    label {
      font-weight: 500;
      color: #4a5568;
      margin-bottom: 4px;
    }

    input {
      padding: 10px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.95em;
      transition: all 0.2s ease;

      &:focus {
        border-color: #1bb776;
        box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
      }
    }
  }
}

.column-header {
  @media (min-width: 769px) {
    cursor: default;

    &:hover {
      opacity: 1;
    }
  }

  &.is-clickable {
    cursor: pointer;

    &:hover {
      opacity: 0.9;
    }
  }
}

.u-left {
  text-align: left;
}

.u-right {
  text-align: right;
}

.delay-badge {
  background: #ff4444;
  color: white;
  padding: 2px 8px;
  border-radius: 8px;
  font-size: 0.5em;
  margin-left: 8px;
}

.status-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.statistics-section {
  padding: 20px 20px 0;
  background: #fff;
  margin: 0 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .stats-header {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }

  .store-filters {
    margin-top: 3em;
    margin-bottom: 3em;

    .store-filters-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: center;
      align-items: center;

      max-width: 100%;
      padding: 0 16px;
    }
  }

  .store-filter-wrapper {
    display: inline-flex;
    align-items: center;
  }

  .store-filter-btn {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 16px;
    background: #f5f5f5;
    color: #999;
    cursor: pointer;
    font-size: 0.9em;
    transition: all 0.2s ease;

    &:hover {
      background: #e8f7f1;
      border-color: #1bb776;
      color: #1bb776;
    }

    &.active {
      background: #1bb776;
      color: white;
      border-color: #1bb776;
    }

    &.unmark-all {
      background: #f5f5f5;
      border-color: #ddd;
      color: #999;
      padding: 1px;
      min-width: 20px;
      height: 20px;
      margin-left: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;

      .material-icons {
        font-size: 14px;
      }

      &:hover {
        background: #f0f0f0;
        border-color: #999;
        color: #666;
      }
    }

    @media (max-width: 768px) {
      font-size: 0.8em;
      padding: 4px 10px;
    }
  }

  .stats-title {
    margin: 0;
    color: #292c34;
    font-size: 1.5em;
    text-align: center;
  }

  h3 {
    margin: 0 0 16px;
    color: #292c34;
  }

  .delivery-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 20px;
    margin-bottom: 24px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.stat-card {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  text-align: center;

  h3 {
    font-size: 1em;
    margin: 0 0 8px;
  }

  .stat-value {
    font-size: 1.5em;
    font-weight: bold;
    color: #1bb776;
  }
}

.orders-summary {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: white;
  border-radius: 4px;

  .summary-label {
    color: #666;
    font-weight: 500;
  }

  .summary-value {
    font-weight: bold;
    color: #292c34;
  }
}

@media (max-width: 768px) {
  .statistics-section {
    margin: 10px;
  }

  .stats-grid,
  .summary-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

.delivery-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 20px;
  margin-top: 24px;
}

.delivery-stat-card {
  background: #f5f5f5;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  .material-icons {
    font-size: 2em;
    color: #292c34;
  }

  .delivery-stat-value {
    font-size: 1.5em;
    font-weight: bold;
    color: #1bb776;
  }

  .delivery-stat-label {
    color: #666;
    font-size: 0.9em;
  }

  .delivery-stat-amount {
    color: #1bb776;
    font-weight: 500;
    font-size: 0.9em;
  }
}

.date-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  cursor: pointer;
  color: #666;
  padding: 8px;
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: #f5f5f5;
    color: #1bb776;
  }

  .material-icons {
    font-size: 18px;
  }
}

.date-picker-container {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.date-picker-wrapper {
  background: white;
  padding: 16px 60px 16px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 16px;
  align-items: flex-end;
  z-index: 100;
  position: relative;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    width: 100%;
    margin: 0 16px;
    padding: 16px 60px 16px 16px;
  }
}

.date-input {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 0.9em;
    color: #666;
  }

  input {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 0.9em;

    &:focus {
      outline: none;
      border-color: #1bb776;
    }
  }
}

.close-date-picker-btn {
  background: none;
  border: none;
  color: #666;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: absolute;
  top: 8px;
  right: 8px;

  &:hover {
    background: #f5f5f5;
    color: #ff4444;
  }

  .material-icons {
    font-size: 20px;
  }
}

.clickable-date {
  text-decoration: underline;
  cursor: pointer;

  &:hover {
    color: #1bb776;
  }
}

.loading-spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #ffffff;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.stats-loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;

  .loading-spinner {
    width: 40px;
    height: 40px;
    border-width: 3px;
    border-color: #1bb776;
    border-top-color: transparent;
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.reset-date-btn {
  background: none;
  border: none;
  color: #666;
  padding: 8px;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  position: absolute;
  top: 8px;
  right: 40px;

  &:hover {
    background: #f5f5f5;
    color: #1bb776;
  }

  .material-icons {
    font-size: 20px;
  }
}
</style>
