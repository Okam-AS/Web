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
            <OrderCard
              v-for="order in newOrders"
              :key="order.id"
              :order="order"
              :expanded-order-id="showOrderId"
              :admin-stores="adminStores"
              :primary-action-button="order.status === 'Accepted' ? 'Neste' : null"
              @toggle-expand="toggleOrderExpand"
              @primary-action="startProcessing"
              @transfer="transferOrder"
              @change-delivery="changeDeliveryType"
              @sms-driver="openSmsDriver"
              @receipt="openReceipt"
              @cancel="cancelOrder"
            />
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
              <OrderCard
                v-for="order in processingOrders"
                :key="order.id"
                :order="order"
                :expanded-order-id="showOrderId"
                :admin-stores="adminStores"
                :primary-action-button="order.status === 'Processing' ? 'Neste' : null"
                @toggle-expand="toggleOrderExpand"
                @primary-action="updateOrderToReady"
                @transfer="transferOrder"
                @change-delivery="changeDeliveryType"
                @sms-driver="openSmsDriver"
                @receipt="openReceipt"
                @cancel="cancelOrder"
              />
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
              <OrderCard
                v-for="order in readyOrders"
                :key="order.id"
                :order="order"
                :expanded-order-id="showOrderId"
                :admin-stores="adminStores"
                :primary-action-button="['ReadyForPickup', 'ReadyForDriver', 'Served'].includes(order.status) ? 'Fullfør' : null"
                @toggle-expand="toggleOrderExpand"
                @primary-action="completeOrder"
                @transfer="transferOrder"
                @change-delivery="changeDeliveryType"
                @sms-driver="openSmsDriver"
                @receipt="openReceipt"
                @cancel="cancelOrder"
              />
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

      <OrderProcessingModal
        v-if="showProcessingModal && currentOrder"
        :order="currentOrder"
        @close="closeProcessingModal"
      />

      <ReceiptModal
        v-if="showReceiptModal && currentOrder"
        :order="currentOrder"
        @close="closeReceiptModal"
      />

      <TransferOrderModal
        v-if="showTransferModal && currentOrder"
        :order="currentOrder"
        :stores="adminStores"
        @close="closeTransferModal"
      />

      <ChangeDeliveryTypeModal
        v-if="showChangeDeliveryModal && currentOrder"
        :order="currentOrder"
        @close="closeChangeDeliveryModal"
      />

      <SmsDriverModal
        v-if="showSmsDriverModal && currentOrder"
        :order="currentOrder"
        @close="closeSmsDriverModal"
        @success="onSmsSuccess"
      />
    </div>
  </AdminPage>
</template>
<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import Loading from "~/components/atoms/Loading.vue";
import { debounce } from "~/core/helpers/ts-debounce";
import LoginModal from "~/components/molecules/LoginModal.vue";
import OrderProcessingModal from "~/components/molecules/OrderProcessingModal.vue";
import ReceiptModal from "~/components/molecules/ReceiptModal.vue";
import TransferOrderModal from "~/components/molecules/TransferOrderModal.vue";
import ChangeDeliveryTypeModal from "~/components/molecules/ChangeDeliveryTypeModal.vue";
import SmsDriverModal from "~/components/molecules/SmsDriverModal.vue";
import OrderCard from "~/components/molecules/OrderCard.vue";

export default {
  components: { AdminPage, LoginModal, Loading, OrderProcessingModal, ReceiptModal, TransferOrderModal, ChangeDeliveryTypeModal, SmsDriverModal, OrderCard },
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
    showProcessingModal: false,
    currentOrder: null,
    showReceiptModal: false,
    showTransferModal: false,
    showChangeDeliveryModal: false,
    showSmsDriverModal: false,
  }),
  computed: {
    newOrders() {
      return this.orders.filter((x) => x.status === "Accepted").sort((a, b) => new Date(a.created) - new Date(b.created));
    },
    processingOrders() {
      return this.orders.filter((x) => x.status === "Processing").sort((a, b) => new Date(a.created) - new Date(b.created));
    },
    readyOrders() {
      return this.orders.filter((x) => ["ReadyForPickup", "ReadyForDriver", "Served"].includes(x.status)).sort((a, b) => new Date(a.created) - new Date(b.created));
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
    toggleOrderExpand(orderId) {
      this.showOrderId = this.showOrderId === orderId ? '' : orderId;
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
    startProcessing(order) {
      this.currentOrder = order;
      this.showProcessingModal = true;
    },
    closeProcessingModal(success) {
      this.showProcessingModal = false;
      if (success) {
        this.loadOrders();
      }
      this.currentOrder = null;
    },
    transferOrder(order) {
      if (!order || this.adminStores.length <= 1) return;
      this.currentOrder = order;
      this.showTransferModal = true;
    },
    closeTransferModal(success) {
      this.showTransferModal = false;
      if (success) {
        this.loadOrders();
      }
      this.currentOrder = null;
    },
    changeDeliveryType(order) {
      if (!order) return;
      this.currentOrder = order;
      this.showChangeDeliveryModal = true;
    },
    closeChangeDeliveryModal(success) {
      this.showChangeDeliveryModal = false;
      if (success) {
        this.loadOrders();
      }
      this.currentOrder = null;
    },
    openReceipt(order) {
      this.currentOrder = order;
      this.showReceiptModal = true;
    },
    closeReceiptModal() {
      this.showReceiptModal = false;
      this.currentOrder = null;
    },
    updateOrderToReady(order) {
      if (!order) return;

      let nextStatus;

      // Determine the correct "ready" status based on delivery type
      if (order.deliveryType === 'SelfPickup') {
        nextStatus = 'ReadyForPickup';
      } else if (order.deliveryType === 'InstantHomeDelivery' || order.deliveryType === 'DineHomeDelivery' || order.deliveryType === 'WoltDelivery') {
        nextStatus = 'ReadyForDriver';
      } else if (order.deliveryType === 'TableDelivery') {
        nextStatus = 'Served';
      } else {
        // Fallback for any other delivery types
        nextStatus = 'ReadyForPickup';
      }

      this._orderService
        .UpdateStatus(order.id, nextStatus)
        .then(() => {
          this.loadOrders();
        })
        .catch((error) => {
          alert('Feil ved oppdatering: ' + (error.message || 'Ukjent feil'));
        });
    },
    completeOrder(order) {
      if (!order) return;

      let confirmMessage = 'Fullfør bestilling #' + order.friendlyOrderId + '?';

      // Special confirmation for delivery orders that haven't been delivered yet
      if (order.deliveryType === 'WoltDelivery' &&
          order.woltDeliveryInfo &&
          order.woltDeliveryInfo.status !== 'Delivered') {
        confirmMessage = 'Bestillingen er ikke levert ennå hos kunde. Marker som fullført likevel?\n\nBestilling #' + order.friendlyOrderId;
      } else if (order.deliveryType === 'DineHomeDelivery' &&
                 order.dineHomeStatus !== 'Completed') {
        confirmMessage = 'Bestillingen er ikke levert ennå hos kunde. Marker som fullført likevel?\n\nBestilling #' + order.friendlyOrderId;
      }

      const confirmed = confirm(confirmMessage);

      if (!confirmed) return;

      this._orderService
        .UpdateStatus(order.id, 'Completed')
        .then(() => {
          this.loadOrders();
        })
        .catch((error) => {
          alert('Feil ved fullføring: ' + (error.message || 'Ukjent feil'));
        });
    },
    cancelOrder(order) {
      if (!order) return;

      const confirmed = confirm(
        'Er du sikker på at du vil kansellere ' + order.storeLegalName + ' sin bestilling #' +
          order.friendlyOrderId + '?'
      );

      if (!confirmed) return;

      this._orderService
        .UpdateStatus(order.id, 'Canceled')
        .then(() => {
          this.loadOrders();
        })
        .catch((error) => {
          alert('Feil ved kansellering: ' + (error.message || 'Ukjent feil'));
        });
    },
    openSmsDriver(order) {
      this.currentOrder = order;
      this.showSmsDriverModal = true;
    },
    closeSmsDriverModal() {
      this.showSmsDriverModal = false;
      this.currentOrder = null;
    },
    onSmsSuccess() {
      // Optionally reload orders or show a notification
      this.loadOrders();
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

.empty-state {
  text-align: center;
  padding: 24px;
  color: #718096;
  font-style: italic;
  background: #f8f9fa;
  border-radius: 8px;
  margin: 12px 0;
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
