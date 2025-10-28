<template>
  <AdminPage :full-width="true">
    <div class="orders-page">
      <h2>Alle bestillinger</h2>

      <!-- Multi-select filters -->
      <div class="filters-section">
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

      <!-- Search and filters -->
      <div class="search-filters-section">
        <div class="search-row">
          <div class="search-input-wrapper">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Søk etter kode, telefon, navn eller ID..."
              class="search-input"
              @keyup.enter="fetchOrders(1)"
            />
            <button
              class="search-btn"
              @click="fetchOrders(1)"
            >
              <span class="material-icons">search</span>
              Søk
            </button>
          </div>
        </div>

        <div class="date-filters-row">
          <div class="date-input">
            <label>Fra dato:</label>
            <input
              v-model="dateFrom"
              type="date"
              class="date-filter"
            />
          </div>
          <div class="date-input">
            <label>Til dato:</label>
            <input
              v-model="dateTo"
              type="date"
              class="date-filter"
            />
          </div>
          <button
            class="apply-filters-btn"
            @click="fetchOrders(1)"
          >
            Filtrer
          </button>
          <button
            class="clear-filters-btn"
            @click="clearFilters"
          >
            Nullstill
          </button>
        </div>
      </div>

      <!-- Loading state -->
      <div
        v-if="isLoadingOrders && !ordersData"
        class="orders-loading-banner"
      >
        <div class="loading-content">
          <div class="loading-spinner" />
          <p>Laster bestillinger...</p>
        </div>
      </div>

      <!-- No orders state -->
      <div
        v-if="!isLoadingOrders && ordersData && ordersData.orders && ordersData.orders.length === 0"
        class="orders-info-banner"
      >
        <p>Ingen bestillinger funnet</p>
        <div
          v-if="hasActiveFilters"
          class="filter-hint"
        >
          <p>Prøv å fjerne noen filtre for å se flere resultater</p>
          <button
            class="clear-filters-hint-btn"
            @click="clearFilters"
          >
            Nullstill filtre
          </button>
        </div>
      </div>

      <!-- Orders table -->
      <div
        v-if="ordersData && ordersData.orders && ordersData.orders.length > 0"
        class="orders-section"
      >
        <!-- Column visibility control -->
        <div class="column-visibility-control">
          <button
            class="visibility-toggle-btn"
            @click="showColumnVisibilityMenu = !showColumnVisibilityMenu"
          >
            <span class="material-icons">visibility</span>
            Kolonner
          </button>

          <!-- Column visibility dropdown -->
          <div
            v-if="showColumnVisibilityMenu"
            class="column-visibility-dropdown"
          >
            <div class="visibility-header">
              <h4>Vis/skjul kolonner</h4>
              <button
                class="close-btn"
                @click="showColumnVisibilityMenu = false"
              >
                <span class="material-icons">close</span>
              </button>
            </div>
            <div class="visibility-options">
              <label
                v-for="column in allColumns"
                :key="column.id"
                class="visibility-option"
              >
                <input
                  type="checkbox"
                  v-model="visibleColumns[column.id]"
                  @change="saveColumnVisibility"
                />
                <span>{{ column.label }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="orders-table">
          <div class="order-row header">
            <div
              v-for="columnId in orderedVisibleColumns"
              :key="columnId"
              :class="['col', `col-${columnId}`]"
              :style="getColumnStyle(columnId)"
            >
              {{ getColumnLabel(columnId) }}
              <div
                class="resize-handle"
                @mousedown="startResize($event, columnId)"
                @touchstart="startResize($event, columnId)"
              ></div>
            </div>
          </div>
          <div
            v-for="order in ordersData.orders"
            :key="order.orderId"
            class="order-row clickable"
            @click="openOrderModal(order.orderCode)"
          >
            <div
              v-for="columnId in orderedVisibleColumns"
              :key="columnId"
              :class="['col', `col-${columnId}`]"
              :style="getColumnStyle(columnId)"
            >
              <template v-if="columnId === 'friendlyOrderId'">
                {{ order.friendlyOrderId }}
              </template>
              <template v-else-if="columnId === 'storeName'">
                {{ order.storeName }}
              </template>
              <template v-else-if="columnId === 'status'">
                <span
                  class="status-badge"
                  :class="getStatusClass(order.status)"
                >
                  {{ orderStatusLabel(order.status) }}
                </span>
              </template>
              <template v-else-if="columnId === 'customer'">
                {{ order.userFullName || order.userPhoneNumber || "-" }}
              </template>
              <template v-else-if="columnId === 'created'">
                {{ formatDate(order.created) }}
              </template>
              <template v-else-if="columnId === 'finalAmount'">
                {{ priceLabel(order.finalAmount, true) }}
              </template>
              <template v-else-if="columnId === 'deliveryType'">
                {{ deliveryTypeLabel(order.deliveryType) }}
              </template>
              <template v-else-if="columnId === 'pickupEta'">
                <span v-if="order.woltDeliveryInfo && order.woltDeliveryInfo.pickupEta">
                  {{ formatCourierEta(order.woltDeliveryInfo.pickupEta) }}
                </span>
                <span v-else>-</span>
              </template>
              <template v-else-if="columnId === 'drivingTime'">
                {{ order.drivingTimeInMinutes ? order.drivingTimeInMinutes + " min" : "-" }}
              </template>
              <template v-else-if="columnId === 'orderCode'">
                {{ order.orderCode }}
              </template>
              <template v-else-if="columnId === 'totalTime'">
                {{ order.totalTimeInMinutes ? order.totalTimeInMinutes + " min" : "-" }}
              </template>
              <template v-else-if="columnId === 'tracking'">
                <a
                  v-if="order.woltDeliveryInfo && order.woltDeliveryInfo.trackingUrl"
                  :href="order.woltDeliveryInfo.trackingUrl"
                  target="_blank"
                  class="tracking-link"
                  @click.stop
                >
                  <span class="material-icons">open_in_new</span>
                  Spor
                </a>
                <span v-else>-</span>
              </template>
            </div>
          </div>
        </div>

        <!-- Pagination at bottom -->
        <div class="pagination-footer">
          <div class="pagination-controls">
            <button
              :disabled="currentPage <= 1 || isLoadingOrders"
              class="pagination-btn nav-btn"
              title="Forrige side"
              @click="changePage(currentPage - 1)"
            >
              <span class="material-icons">chevron_left</span>
            </button>

            <div class="page-numbers">
              <button
                v-for="page in visiblePages"
                :key="page"
                :class="['page-btn', { active: page === currentPage, ellipsis: page === '...' }]"
                :disabled="isLoadingOrders || page === '...'"
                @click="changePage(page)"
              >
                {{ page }}
              </button>
            </div>

            <button
              :disabled="currentPage >= (ordersData.totalPages || 1) || isLoadingOrders"
              class="pagination-btn nav-btn"
              title="Neste side"
              @click="changePage(currentPage + 1)"
            >
              <span class="material-icons">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      <LoginModal
        v-if="showLogin"
        @close="closeLoginModal"
      />

      <OrderModal
        v-if="showOrderModal"
        :order-code="selectedOrderCode"
        @close="closeOrderModal"
      />
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import LoginModal from "~/components/molecules/LoginModal.vue";
import OrderModal from "~/components/organisms/OrderModal.vue";
import MultiSelectDropdown from "~/components/molecules/MultiSelectDropdown.vue";
import { debounce } from "~/core/helpers/ts-debounce";

export default {
  components: { AdminPage, LoginModal, OrderModal, MultiSelectDropdown },
  data: () => ({
    showLogin: false,
    ordersData: null,
    currentPage: 1,
    pageSize: 20,
    isLoadingOrders: false,
    searchQuery: "",
    dateFrom: "",
    dateTo: "",
    showOrderModal: false,
    selectedOrderCode: null,
    adminStores: [],
    selectedStoreIds: [],
    selectedStatuses: [
      "Accepted",
      "Processing",
      "ReadyForPickup",
      "ReadyForDriver",
      "DriverPickedUp",
      "Served",
      "Completed",
      "Canceled",
    ],
    selectedDeliveryTypes: [
      "SelfPickup",
      "InstantHomeDelivery",
      "DineHomeDelivery",
      "WoltDelivery",
      "WoltMarketplaceDelivery",
      "TableDelivery",
    ],
    selectedPaymentTypes: [
      "PayInStore",
      "Stripe",
      "Vipps",
      "Giftcard",
      "Dintero",
      "DinteroVipps",
      "DinteroBillie",
      "DinteroKlarna",
      "WoltMarketplace",
    ],
    debouncedFetchOrders: null,
    showColumnVisibilityMenu: false,
    columnWidths: {},
    resizingColumn: null,
    resizeStartX: 0,
    resizeStartWidth: 0,
    visibleColumns: {
      friendlyOrderId: true,
      storeName: true,
      status: true,
      customer: true,
      created: true,
      finalAmount: true,
      deliveryType: true,
      pickupEta: true,
      drivingTime: true,
      orderCode: true,
      totalTime: true,
      tracking: true,
    },
    columnOrder: [
      "friendlyOrderId",
      "storeName",
      "status",
      "customer",
      "created",
      "finalAmount",
      "deliveryType",
      "pickupEta",
      "drivingTime",
      "orderCode",
      "totalTime",
      "tracking",
    ],
  }),
  computed: {
    orderedVisibleColumns() {
      return this.columnOrder.filter(colId => this.visibleColumns[colId]);
    },
    allColumns() {
      return [
        { id: "friendlyOrderId", label: "Kode" },
        { id: "storeName", label: "Butikk" },
        { id: "status", label: "Status" },
        { id: "customer", label: "Kunde" },
        { id: "created", label: "Opprettet" },
        { id: "finalAmount", label: "Beløp" },
        { id: "deliveryType", label: "Levering" },
        { id: "pickupEta", label: "Sjåfør ETA" },
        { id: "drivingTime", label: "Kjøretid" },
        { id: "orderCode", label: "ID" },
        { id: "totalTime", label: "Total tid" },
        { id: "tracking", label: "Sporing" },
      ];
    },
    visiblePages() {
      const totalPages = this.ordersData?.totalPages || 1;
      const current = this.currentPage;
      const pages = [];

      if (totalPages <= 7) {
        // Show all pages if 7 or fewer
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Always show first page
        pages.push(1);

        if (current > 4) {
          pages.push("...");
        }

        // Show pages around current page
        const start = Math.max(2, current - 1);
        const end = Math.min(totalPages - 1, current + 1);

        for (let i = start; i <= end; i++) {
          if (!pages.includes(i)) {
            pages.push(i);
          }
        }

        if (current < totalPages - 3) {
          pages.push("...");
        }

        // Always show last page
        if (totalPages > 1) {
          pages.push(totalPages);
        }
      }

      return pages;
    },
    storeOptions() {
      return this.adminStores.map((store) => ({
        id: store.id,
        label: store.name,
      }));
    },
    statusOptions() {
      return [
        { id: "Accepted", label: "Forespurt" },
        { id: "Processing", label: "Tilberedes" },
        { id: "ReadyForPickup", label: "Klar for henting" },
        { id: "ReadyForDriver", label: "På vei" },
        { id: "DriverPickedUp", label: "Sjåføren er på vei" },
        { id: "Served", label: "Servert" },
        { id: "Completed", label: "Fullført" },
        { id: "Canceled", label: "Kansellert" },
      ];
    },
    deliveryTypeOptions() {
      return [
        { id: "SelfPickup", label: "Hent selv" },
        { id: "InstantHomeDelivery", label: "Hjemlevering" },
        { id: "DineHomeDelivery", label: "DineHome Hjemlevering" },
        { id: "WoltDelivery", label: "Wolt Drive" },
        { id: "WoltMarketplaceDelivery", label: "Wolt Marketplace" },
        { id: "TableDelivery", label: "Spis inne" },
      ];
    },
    paymentTypeOptions() {
      return [
        { id: "PayInStore", label: "Betal i butikk" },
        { id: "Stripe", label: "Betalt med kort" },
        { id: "Vipps", label: "Betalt med Vipps" },
        { id: "Giftcard", label: "Betalt med gavekort" },
        { id: "Dintero", label: "Betalt med Dintero" },
        { id: "DinteroVipps", label: "Betalt med Vipps" },
        { id: "DinteroBillie", label: "Betalt med Billie" },
        { id: "DinteroKlarna", label: "Betalt med Klarna" },
        { id: "WoltMarketplace", label: "Betalt via Wolt" },
      ];
    },
    hasActiveFilters() {
      // Check if any filters are active (not all items selected or search/date filters present)
      const hasSearchQuery = this.searchQuery && this.searchQuery.trim() !== "";
      const hasDateFilter = this.dateFrom || this.dateTo;
      const hasStoreFilter = this.selectedStoreIds.length < this.adminStores.length;
      const hasStatusFilter = this.selectedStatuses.length < this.statusOptions.length;
      const hasDeliveryTypeFilter = this.selectedDeliveryTypes.length < this.deliveryTypeOptions.length;
      const hasPaymentTypeFilter = this.selectedPaymentTypes.length < this.paymentTypeOptions.length;

      return hasSearchQuery || hasDateFilter || hasStoreFilter || hasStatusFilter || hasDeliveryTypeFilter || hasPaymentTypeFilter;
    },
  },
  created() {
    this.debouncedFetchOrders = debounce(this.fetchOrders, 1000);
  },
  mounted() {
    // Load settings from localStorage first (only available in browser)
    this.loadSettingsFromLocalStorage();

    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      return;
    }
    this.adminStores = this.$store.state.currentUser.adminIn;

    // Load store selection from localStorage if exists, otherwise select all
    const savedStoreIds = this.getSavedStoreIds();
    if (savedStoreIds && savedStoreIds.length > 0) {
      this.selectedStoreIds = savedStoreIds.filter(id =>
        this.adminStores.some(store => store.id === id)
      );
    } else {
      this.selectedStoreIds = this.adminStores.map((store) => store.id);
    }

    this.fetchOrders();
  },
  methods: {
    getColumnLabel(columnId) {
      const column = this.allColumns.find(col => col.id === columnId);
      return column ? column.label : columnId;
    },
    getColumnStyle(columnId) {
      // Use custom widths from localStorage if available (works on both desktop and mobile)
      if (this.columnWidths[columnId]) {
        return {
          width: this.columnWidths[columnId] + 'px',
          minWidth: this.columnWidths[columnId] + 'px',
          maxWidth: this.columnWidths[columnId] + 'px',
          flexShrink: '0'
        };
      }
      // Return empty object to use default CSS widths
      return {};
    },
    saveColumnVisibility() {
      try {
        localStorage.setItem("ordersPageVisibleColumns", JSON.stringify(this.visibleColumns));
      } catch (error) {
        console.error("Failed to save column visibility:", error);
      }
    },
    startResize(event, columnId) {
      event.preventDefault();
      event.stopPropagation();

      const headerCol = event.target.parentElement;
      this.resizingColumn = columnId;

      // Support both mouse and touch events
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      this.resizeStartX = clientX;
      this.resizeStartWidth = headerCol.offsetWidth;

      // Add both mouse and touch event listeners
      document.addEventListener('mousemove', this.onResize);
      document.addEventListener('mouseup', this.stopResize);
      document.addEventListener('touchmove', this.onResize, { passive: false });
      document.addEventListener('touchend', this.stopResize);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    onResize(event) {
      if (!this.resizingColumn) return;

      // Prevent default scrolling on touch devices
      if (event.touches) {
        event.preventDefault();
      }

      // Support both mouse and touch events
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const diff = clientX - this.resizeStartX;
      const newWidth = Math.max(50, this.resizeStartWidth + diff);

      this.$set(this.columnWidths, this.resizingColumn, newWidth);
    },
    stopResize() {
      if (this.resizingColumn) {
        this.saveColumnWidths();
      }

      this.resizingColumn = null;
      document.removeEventListener('mousemove', this.onResize);
      document.removeEventListener('mouseup', this.stopResize);
      document.removeEventListener('touchmove', this.onResize);
      document.removeEventListener('touchend', this.stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    },
    saveColumnWidths() {
      try {
        localStorage.setItem("ordersPageColumnWidths", JSON.stringify(this.columnWidths));
      } catch (error) {
        console.error("Failed to save column widths:", error);
      }
    },
    loadSettingsFromLocalStorage() {
      try {
        const savedColumns = localStorage.getItem("ordersPageVisibleColumns");
        if (savedColumns) {
          this.visibleColumns = JSON.parse(savedColumns);
        }

        const savedColumnWidths = localStorage.getItem("ordersPageColumnWidths");
        if (savedColumnWidths) {
          this.columnWidths = JSON.parse(savedColumnWidths);
        }

        const savedStatuses = localStorage.getItem("ordersPageStatuses");
        if (savedStatuses) {
          this.selectedStatuses = JSON.parse(savedStatuses);
        }

        const savedDeliveryTypes = localStorage.getItem("ordersPageDeliveryTypes");
        if (savedDeliveryTypes) {
          this.selectedDeliveryTypes = JSON.parse(savedDeliveryTypes);
        }

        const savedPaymentTypes = localStorage.getItem("ordersPagePaymentTypes");
        if (savedPaymentTypes) {
          this.selectedPaymentTypes = JSON.parse(savedPaymentTypes);
        }
      } catch (error) {
        console.warn("Failed to load settings from localStorage:", error);
      }
    },
    getSavedStoreIds() {
      try {
        const saved = localStorage.getItem("ordersPageStoreIds");
        return saved ? JSON.parse(saved) : null;
      } catch (error) {
        console.warn("Failed to load store IDs from localStorage:", error);
        return null;
      }
    },
    saveSettingsToLocalStorage() {
      try {
        localStorage.setItem("ordersPageVisibleColumns", JSON.stringify(this.visibleColumns));
        localStorage.setItem("ordersPageStoreIds", JSON.stringify(this.selectedStoreIds));
        localStorage.setItem("ordersPageStatuses", JSON.stringify(this.selectedStatuses));
        localStorage.setItem("ordersPageDeliveryTypes", JSON.stringify(this.selectedDeliveryTypes));
        localStorage.setItem("ordersPagePaymentTypes", JSON.stringify(this.selectedPaymentTypes));
      } catch (error) {
        console.warn("Failed to save settings to localStorage:", error);
      }
    },
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        this.fetchOrders();
      }
    },
    onFilterChange() {
      this.saveSettingsToLocalStorage();
      this.debouncedFetchOrders(1);
    },
    async fetchOrders(page) {
      // If page is an event object or not a number, use current page
      const pageNumber = typeof page === "number" && !isNaN(page) ? page : this.currentPage;

      this.isLoadingOrders = true;
      try {
        const response = await this._orderService.GetAllOrdersWithPagination(
          pageNumber,
          this.pageSize,
          this.searchQuery || undefined,
          this.dateFrom || undefined,
          this.dateTo || undefined,
          this.selectedStoreIds,
          this.selectedStatuses,
          this.selectedDeliveryTypes,
          this.selectedPaymentTypes
        );
        this.ordersData = response;
        this.currentPage = this.ordersData.page;
      } catch (error) {
        console.warn("Failed to fetch orders:", error);
        this.ordersData = {
          orders: [],
          totalCount: 0,
          page: 1,
          pageSize: this.pageSize,
          totalPages: 0,
        };
      } finally {
        this.isLoadingOrders = false;
      }
    },
    changePage(page) {
      // Ignore clicks on ellipsis
      if (page === "...") {
        return;
      }

      const pageNumber = typeof page === "number" ? page : parseInt(page, 10);
      if (isNaN(pageNumber) || pageNumber < 1) {
        return;
      }

      this.currentPage = pageNumber;
      this.fetchOrders(pageNumber);
    },
    clearFilters() {
      this.searchQuery = "";
      this.dateFrom = "";
      this.dateTo = "";
      this.selectedStoreIds = this.adminStores.map((store) => store.id);
      this.selectedStatuses = [
        "Accepted",
        "Processing",
        "ReadyForPickup",
        "ReadyForDriver",
        "DriverPickedUp",
        "Served",
        "Completed",
        "Canceled",
      ];
      this.selectedDeliveryTypes = [
        "SelfPickup",
        "InstantHomeDelivery",
        "DineHomeDelivery",
        "WoltDelivery",
        "WoltMarketplaceDelivery",
        "TableDelivery",
      ];
      this.selectedPaymentTypes = [
        "PayInStore",
        "Stripe",
        "Vipps",
        "Giftcard",
        "Dintero",
        "DinteroVipps",
        "DinteroBillie",
        "DinteroKlarna",
        "WoltMarketplace",
      ];
      this.fetchOrders(1);
    },
    getStatusClass(status) {
      switch (status) {
        case "Accepted":
          return "status-accepted";
        case "Processing":
          return "status-processing";
        case "ReadyForPickup":
        case "ReadyForDriver":
          return "status-ready";
        case "DriverPickedUp":
          return "status-driver-picked-up";
        case "Served":
          return "status-served";
        case "Completed":
          return "status-completed";
        case "Canceled":
          return "status-canceled";
        default:
          return "status-default";
      }
    },
    formatDate(date) {
      if (!date || date === "0001-01-01T00:00:00") {
        return null;
      }
      return new Date(date).toLocaleString("no-NO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    formatCourierEta(etaDate) {
      if (!etaDate || etaDate === "0001-01-01T00:00:00") {
        return "-";
      }
      const eta = new Date(etaDate);
      const now = new Date();
      const diffMinutes = Math.round((eta - now) / 60000);

      if (diffMinutes < 1) {
        return "";
      } else if (diffMinutes < 60) {
        return `⏱️ ${diffMinutes} min`;
      } else {
        return eta.toLocaleTimeString("no-NO", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    },
    openOrderModal(orderCode) {
      this.selectedOrderCode = orderCode;
      this.showOrderModal = true;
    },
    closeOrderModal() {
      this.showOrderModal = false;
      this.selectedOrderCode = null;
    },
  },
};
</script>

<style lang="scss" scoped>
.orders-page {
  padding: 24px;
  width: 100%;

  @media (max-width: 768px) {
    padding: 8px;
  }
}

.filters-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px;
  margin-bottom: 24px;

  .multi-select-filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }

  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .filter-label {
    font-weight: 600;
    color: #4a5568;
    font-size: 0.9rem;
  }

  @media (max-width: 768px) {
    padding: 16px;

    .multi-select-filters {
      grid-template-columns: 1fr;
    }
  }
}

.search-filters-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px;
  margin-bottom: 24px;

  .search-row {
    margin-bottom: 16px;

    .search-input-wrapper {
      display: flex;
      gap: 12px;
      align-items: center;

      .search-input {
        flex: 1;
        padding: 12px 16px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 1rem;
        transition: border-color 0.2s;

        &:focus {
          border-color: #1bb776;
          outline: none;
          box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
        }
      }

      .search-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        background: #1bb776;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.95rem;
        font-weight: 500;
        transition: all 0.2s ease;

        &:hover {
          background: #159c63;
          transform: translateY(-1px);
        }

        .material-icons {
          font-size: 18px;
        }
      }
    }
  }

  .date-filters-row {
    display: flex;
    gap: 16px;
    align-items: flex-end;
    flex-wrap: wrap;

    .date-input {
      display: flex;
      flex-direction: column;
      gap: 4px;

      label {
        font-weight: 500;
        color: #4a5568;
        font-size: 0.9rem;
      }

      .date-filter {
        padding: 10px 12px;
        border: 2px solid #e2e8f0;
        border-radius: 8px;
        font-size: 0.95rem;
        transition: border-color 0.2s;

        &:focus {
          border-color: #1bb776;
          outline: none;
          box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
        }
      }
    }

    .apply-filters-btn,
    .clear-filters-btn {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s ease;
      height: fit-content;
    }

    .apply-filters-btn {
      background: #1bb776;
      color: white;

      &:hover {
        background: #159c63;
        transform: translateY(-1px);
      }
    }

    .clear-filters-btn {
      background: #f8f9fa;
      color: #4a5568;
      border: 1px solid #e2e8f0;

      &:hover {
        background: #e2e8f0;
        transform: translateY(-1px);
      }
    }
  }

  @media (max-width: 768px) {
    padding: 16px;

    .search-row .search-input-wrapper {
      flex-direction: column;

      .search-input {
        width: 100%;
      }

      .search-btn {
        width: 100%;
        justify-content: center;
      }
    }

    .date-filters-row {
      flex-direction: column;
      align-items: stretch;

      .date-input {
        width: 100%;
      }

      .apply-filters-btn,
      .clear-filters-btn {
        width: 100%;
      }
    }
  }
}

.orders-loading-banner {
  background-color: #f7fafc;
  border-radius: 10px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;

  .loading-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;

    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e2e8f0;
      border-top: 2px solid #1bb776;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    p {
      color: #4a5568;
      font-size: 1em;
      margin: 0;
    }
  }
}

.orders-info-banner {
  background-color: #f7fafc;
  border-radius: 10px;
  padding: 15px;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;

  p {
    color: #4a5568;
    font-size: 1em;
    text-align: center;
    margin: 0;
  }

  .filter-hint {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;

    p {
      color: #6b7280;
      font-size: 0.95em;
      margin: 0;
    }

    .clear-filters-hint-btn {
      padding: 10px 20px;
      background: #1bb776;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s ease;

      &:hover {
        background: #159c63;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(27, 183, 118, 0.3);
      }
    }
  }
}

// Orders Section
.orders-section {
  position: relative;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px;

  // Column visibility control
  .column-visibility-control {
    position: relative;
    margin-bottom: 12px;

    .visibility-toggle-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      color: #4a5568;
      transition: all 0.2s ease;

      &:hover {
        background: #f8fafc;
        border-color: #cbd5e0;
      }

      .material-icons {
        font-size: 18px;
      }
    }

    .column-visibility-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      margin-top: 4px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      padding: 12px;
      min-width: 250px;
      z-index: 1000;

      .visibility-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e2e8f0;

        h4 {
          margin: 0;
          color: #292c34;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .close-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
          color: #6b7280;
          transition: all 150ms ease;
          border-radius: 4px;

          &:hover {
            background: #f3f4f6;
            color: #292c34;
          }

          .material-icons {
            font-size: 18px;
          }
        }
      }

      .visibility-options {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .visibility-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px;
          cursor: pointer;
          border-radius: 4px;
          transition: background 0.15s ease;

          &:hover {
            background: #f8fafc;
          }

          input[type="checkbox"] {
            cursor: pointer;
            width: 16px;
            height: 16px;
          }

          span {
            font-size: 0.9rem;
            color: #4a5568;
            user-select: none;
          }
        }
      }
    }
  }

  .pagination-controls {
      display: flex;
      align-items: center;
      gap: 6px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 4px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);

      .nav-btn {
        padding: 8px;
        min-width: 36px;
        height: 36px;
        background: transparent;
        border: none;
        border-radius: 6px;
        color: #4a5568;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover:not(:disabled) {
          background: #f8fafc;
          color: #1bb776;
        }

        &:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .material-icons {
          font-size: 18px;
        }
      }

      .page-numbers {
        display: flex;
        gap: 1px;
        margin: 0 4px;
      }

      .page-btn {
        padding: 8px 10px;
        min-width: 36px;
        height: 36px;
        background: transparent;
        border: none;
        border-radius: 6px;
        color: #4a5568;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover:not(:disabled):not(.active):not(.ellipsis) {
          background: #f8fafc;
          color: #2d3748;
        }

        &.active {
          background: #1bb776;
          color: white;
          font-weight: 600;
          box-shadow: 0 1px 2px rgba(27, 183, 118, 0.2);
        }

        &:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        &.ellipsis {
          background: none;
          cursor: default;
          color: #a0aec0;
          font-weight: 400;

          &:hover {
            background: none;
            color: #a0aec0;
          }
        }
      }
    }

  .orders-table {
    border-radius: 8px;
    overflow-x: auto;
    overflow-y: visible;
    border: 1px solid #e2e8f0;
    position: relative;

    // Prettier scrollbar
    &::-webkit-scrollbar {
      height: 8px;
    }

    &::-webkit-scrollbar-track {
      background: #f1f5f9;
      border-radius: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: #cbd5e0;
      border-radius: 4px;

      &:hover {
        background: #a0aec0;
      }
    }

    // Mobile scroll indicator shadows
    @media (max-width: 768px) {
      // Smooth touch scrolling
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;

      // Enhanced scrollbar visibility on mobile
      &::-webkit-scrollbar {
        height: 10px;
      }

      &::-webkit-scrollbar-thumb {
        background: #94a3b8;
      }

      // Scroll shadow indicators
      background:
        linear-gradient(to right, white 30%, rgba(255,255,255,0)),
        linear-gradient(to right, rgba(255,255,255,0), white 70%) 100% 0,
        radial-gradient(farthest-side at 0% 50%, rgba(0,0,0,.15), rgba(0,0,0,0)),
        radial-gradient(farthest-side at 100% 50%, rgba(0,0,0,.15), rgba(0,0,0,0)) 100% 0;
      background-repeat: no-repeat;
      background-color: white;
      background-size: 40px 100%, 40px 100%, 14px 100%, 14px 100%;
      background-attachment: local, local, scroll, scroll;
    }
  }

  .pagination-footer {
    margin-top: 20px;
    display: flex;
    justify-content: center;
    padding: 16px 0;
  }

  .order-row {
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;
    min-width: max-content;

    &:last-child {
      border-bottom: none;
    }

    &:not(.header):hover {
      background: #f8fafc;
    }

    &.clickable {
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: #f1f5f9;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
    }

    .col {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.9rem;
      flex-shrink: 0;

      // Default widths for each column type
      &.col-friendlyOrderId { width: 100px; }
      &.col-storeName { width: 150px; }
      &.col-status { width: 140px; }
      &.col-customer { width: 180px; }
      &.col-created { width: 150px; }
      &.col-finalAmount { width: 100px; }
      &.col-deliveryType { width: 140px; }
      &.col-pickupEta { width: 120px; }
      &.col-drivingTime { width: 100px; }
      &.col-orderCode { width: 280px; }
      &.col-totalTime { width: 100px; }
      &.col-tracking { width: 100px; }
    }

    &.header {
      background: #f8f9fa;
      font-weight: 600;
      color: #4a5568;
      border-bottom: 2px solid #e2e8f0;
      position: relative;

      .col {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        user-select: none;
        display: flex;
        align-items: center;
        gap: 4px;
        position: relative;

        .resize-handle {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 8px;
          cursor: col-resize;
          z-index: 10;
          touch-action: none;

          &:hover {
            background: rgba(27, 183, 118, 0.2);
          }

          &::after {
            content: '';
            position: absolute;
            right: 3px;
            top: 50%;
            transform: translateY(-50%);
            width: 1px;
            height: 60%;
            background: #cbd5e0;
            transition: all 0.2s ease;
          }

          &:hover::after {
            opacity: 1;
            width: 2px;
            background: #1bb776;
          }

          // Make resize handle more touch-friendly on mobile
          @media (max-width: 768px) {
            width: 16px;

            &::after {
              width: 2px;
              right: 6px;
              background: #94a3b8;
            }

            &:active {
              background: rgba(27, 183, 118, 0.3);
            }

            &:active::after {
              width: 3px;
              background: #1bb776;
            }
          }
        }
      }
    }

    @media (max-width: 768px) {
      padding: 8px 10px;
      gap: 8px;

      .col {
        font-size: 0.8rem;
      }

      &.header .col {
        font-size: 0.75rem;
      }
    }
  }

  .tracking-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #1bb776;
    color: white;
    text-decoration: none;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    transition: all 0.2s ease;

    &:hover {
      background: #159c63;
      transform: translateY(-1px);
      box-shadow: 0 2px 4px rgba(27, 183, 118, 0.3);
    }

    .material-icons {
      font-size: 14px;
    }

    @media (max-width: 768px) {
      padding: 3px 6px;
      font-size: 0.65rem;
      gap: 2px;

      .material-icons {
        font-size: 12px;
      }
    }
  }

  .status-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;

    &.status-accepted {
      background: #e0e7ff;
      color: #4f46e5;
    }

    &.status-processing {
      background: #fef3c7;
      color: #d97706;
    }

    &.status-ready {
      background: #dcfce7;
      color: #16a34a;
    }

    &.status-driver-picked-up {
      background: #ddd6fe;
      color: #7c3aed;
    }

    &.status-served {
      background: #cffafe;
      color: #0891b2;
    }

    &.status-completed {
      background: #e0f2fe;
      color: #0284c7;
    }

    &.status-canceled {
      background: #fee2e2;
      color: #dc2626;
    }

    &.status-default {
      background: #f3f4f6;
      color: #6b7280;
    }

    @media (max-width: 768px) {
      padding: 3px 6px;
      font-size: 0.65rem;
      border-radius: 8px;
      white-space: nowrap;
    }
  }

  @media (max-width: 768px) {
    margin: 0 -8px;
    border-radius: 0;
    padding: 16px 8px;

    .column-visibility-control {
      .visibility-toggle-btn {
        font-size: 0.85rem;
        padding: 6px 12px;
      }
    }

    .pagination-footer {
      margin-top: 16px;
      padding: 12px 0;
    }
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

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
