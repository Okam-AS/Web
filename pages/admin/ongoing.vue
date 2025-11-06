<template>
  <AdminPage>
    <div class="ongoing-orders">
      <div class="page-header">
        <h1>Pågående bestillinger</h1>
      </div>

      <p
        v-show="adminStores.length > 1"
        class="page-description"

      >
        Her viser alle pågående bestillinger på dine {{ adminStores.length }} avdelinger
      </p>

      <div
        v-if="isLoading"
        class="loading-container"
      >
        <Loading :loading="true" />
      </div>

      <div
        v-else
        class="orders-grid"
      >
        <!-- New Orders Column -->
        <div
          class="orders-column"
          :class="{ 'is-collapsed': isMobile && collapsedColumns.new }"
        >
          <div
            class="column-header"
            :class="{ 'is-clickable': isMobile && newOrders.length }"
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd('new')"
            @click.stop="handleColumnClick('new', newOrders.length)"
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
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd('processing')"
            @click.stop="handleColumnClick('processing')"
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
            @touchstart="handleTouchStart"
            @touchmove="handleTouchMove"
            @touchend="handleTouchEnd('ready')"
            @click.stop="handleColumnClick('ready')"
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

      <!-- Info Banner -->
      <div
        v-if="!hideBanner"
        class="info-banner"
      >
        <div class="banner-content">
          <span class="banner-text">
            Ser du etter statistikk? Det finner du nå på en egen side.
          </span>
          <NuxtLink
            to="/admin/statistics"
            class="banner-link"
          >
            Gå til statistikk →
          </NuxtLink>
        </div>
        <button
          class="banner-close"
          @click="hideBanner = true"
        >
          <span class="material-icons">close</span>
        </button>
      </div>
    </div>
  </AdminPage>
</template>
<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import Loading from "~/components/atoms/Loading.vue";
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
    showOrderId: "",
    collapsedColumns: {
      new: false,
      processing: false,
      ready: false,
    },
    isMobile: false,
    refreshInterval: null,
    adminStores: [],
    showProcessingModal: false,
    currentOrder: null,
    showReceiptModal: false,
    showTransferModal: false,
    showChangeDeliveryModal: false,
    showSmsDriverModal: false,
    hideBanner: true,
    touchStartY: 0,
    touchMoved: false,
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
    this.loadOrders();
    this.checkMobile();
    window.addEventListener("resize", this.checkMobile);
    this.startAutoRefresh();
  },
  beforeDestroy() {
    window.removeEventListener("resize", this.checkMobile);
    this.stopAutoRefresh();
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
    handleTouchStart(e) {
      this.touchStartY = e.touches[0].clientY;
      this.touchMoved = false;
    },
    handleTouchMove(e) {
      const touchDeltaY = Math.abs(e.touches[0].clientY - this.touchStartY);
      if (touchDeltaY > 10) {
        this.touchMoved = true;
      }
    },
    handleTouchEnd(column) {
      if (!this.touchMoved && this.isMobile) {
        this.collapsedColumns[column] = !this.collapsedColumns[column];
      }
      this.touchMoved = false;
    },
    handleColumnClick(column, hasOrders = true) {
      if (!this.isMobile) return;
      if (column === 'new' && !hasOrders) return;
      this.collapsedColumns[column] = !this.collapsedColumns[column];
    },
  },
};
</script>
<style lang="scss">
@import "../../assets/sass/common.scss";

.ongoing-orders {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  height: 100%;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.page-header {
  margin-bottom: 16px;
  margin-top: 16px;

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

.page-description {
  color: #666;
  font-size: 0.9em;
  line-height: 1.5;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
  padding: 60px 24px;
}

.orders-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  flex: 1;
  min-height: 0;
  height: 100%;
  margin-bottom: 32px;
  margin-top: 32px;
  align-items: start;

  @media (max-width: 1200px) {
    gap: 16px;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 12px;
    margin-bottom: 24px;
  }
}

.orders-column {
  background: #fff;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  border: 1px solid #e8e8e8;
  transition: all 0.2s ease;

  @media (min-width: 769px) {
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
  }

  &.is-collapsed {
    @media (max-width: 768px) {
      .orders-list {
        display: none;
      }
    }
  }

  .column-header {
    padding: 20px;
    background: linear-gradient(135deg, #292c34 0%, #1a1d23 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    user-select: none;
    transition: all 0.2s ease;
    min-height: 64px;

    @media (min-width: 769px) {
      cursor: default;
    }

    @media (max-width: 768px) {
      cursor: pointer;
      padding: 16px 20px;
      min-height: 56px;

      &:active {
        background: linear-gradient(135deg, #1a1d23 0%, #292c34 100%);
      }
    }

    h2 {
      color: #d5f6e5;
      margin: 0;
      font-size: 1.1em;
      font-weight: 600;
      letter-spacing: 0.5px;

      @media (max-width: 768px) {
        font-size: 1em;
      }
    }
  }

  .orders-list {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: #f8f9fa;
    height: calc(100% - 64px);

    @media (max-width: 768px) {
      padding: 16px;
    }

    &::-webkit-scrollbar {
      width: 8px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: #cbd5e0;
      border-radius: 4px;
      transition: background 0.2s ease;

      &:hover {
        background: #a0aec0;
      }
    }
  }
}

.count-badge {
  background: rgba(213, 246, 229, 0.95);
  color: #292c34;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85em;
  font-weight: 700;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  min-width: 32px;
  text-align: center;
  display: inline-block;
}

.empty-state {
  text-align: center;
  padding: 48px 24px;
  color: #a0aec0;
  font-size: 0.95em;
  font-weight: 500;
  background: transparent;
  border-radius: 8px;
  margin: 0;
}

.info-banner {
  background: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  @media (max-width: 768px) {
    padding: 14px 16px;
    margin-bottom: 24px;
  }

  .banner-content {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    flex-wrap: wrap;

    .banner-text {
      color: #4a5568;
      font-size: 0.9em;
      font-weight: 500;
    }

    .banner-link {
      color: #1bb776;
      font-weight: 600;
      text-decoration: none;
      font-size: 0.9em;
      white-space: nowrap;
      transition: all 0.2s ease;

      &:hover {
        text-decoration: underline;
        color: #158c5a;
      }
    }
  }

  .banner-close {
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: all 0.2s ease;

    .material-icons {
      color: #a0aec0;
      font-size: 20px;
    }

    &:hover {
      background: #f8f9fa;

      .material-icons {
        color: #4a5568;
      }
    }
  }
}

</style>
