<template>
  <AdminPage>
    <div class="orders-page">
      <h2>Alle bestillinger</h2>

      <!-- Search and filters -->
      <div class="search-filters-section">
        <div class="search-row">
          <div class="search-input-wrapper">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Søk etter kode, telefon eller ID..."
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
      </div>

      <!-- Orders table -->
      <div
        v-if="ordersData && ordersData.orders && ordersData.orders.length > 0"
        class="orders-section"
      >
        <div class="orders-header">
          <div class="header-controls">
            <div class="pagination-controls-header">
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

            <button
              :disabled="isLoadingOrders"
              class="refresh-btn"
              @click="fetchOrders()"
            >
              <span
                v-if="isLoadingOrders"
                class="spinner"
              />
              <span
                v-else
                class="material-icons"
                >refresh</span
              >
              Oppdater
            </button>
          </div>
        </div>

        <div class="orders-table">
          <div class="order-row header">
            <div class="col order-id">Kode</div>
            <div class="col store-name">Butikk</div>
            <div class="col status">Status</div>
            <div class="col user-phone">Kunde</div>
            <div class="col created">Opprettet</div>
            <div class="col amount">Beløp</div>
            <div class="col delivery-type">Levering</div>
            <div class="col order-code">ID</div>
            <div class="col total-time">Total tid</div>
          </div>
          <div
            v-for="order in ordersData.orders"
            :key="order.orderId"
            class="order-row clickable"
            @click="openOrderModal(order.orderCode)"
          >
            <div class="col order-id">
              {{ order.friendlyOrderId }}
            </div>
            <div class="col store-name">
              {{ order.storeName }}
            </div>
            <div class="col status">
              <span
                class="status-badge"
                :class="getStatusClass(order.status)"
              >
                {{ orderStatusLabel(order.status) }}
              </span>
            </div>
            <div class="col user-phone">
              {{ order.userFullName || order.userPhoneNumber || "-" }}
            </div>
            <div class="col created">
              {{ formatDate(order.created) }}
            </div>
            <div class="col amount">
              {{ priceLabel(order.finalAmount, true) }}
            </div>
            <div class="col delivery-type">
              {{ deliveryTypeLabel(order.deliveryType) }}
            </div>
            <div class="col order-code">
              {{ order.orderCode }}
            </div>
            <div class="col total-time">
              {{ order.totalTimeInMinutes ? order.totalTimeInMinutes + " min" : "-" }}
            </div>
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

export default {
  components: { AdminPage, LoginModal, OrderModal },
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
  }),
  computed: {
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
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      return;
    }
    this.fetchOrders();
  },
  methods: {
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        this.fetchOrders();
      }
    },
    async fetchOrders(page) {
      // If page is an event object or not a number, use current page
      const pageNumber = typeof page === "number" && !isNaN(page) ? page : this.currentPage;

      this.isLoadingOrders = true;
      try {
        const response = await this._orderService.GetAllOrdersWithPagination(pageNumber, this.pageSize, this.searchQuery || undefined, this.dateFrom || undefined, this.dateTo || undefined);
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
      this.fetchOrders(1);
    },
    getStatusClass(status) {
      switch (status) {
        case "Processing":
          return "status-processing";
        case "ReadyForPickup":
          return "status-ready";
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
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 8px;
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
}

// Orders Section
.orders-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px;

  .orders-header {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;

    .header-controls {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .pagination-controls-header {
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

    @media (max-width: 768px) {
      flex-direction: column;
      gap: 16px;
      align-items: flex-start;

      .header-controls {
        width: 100%;
        justify-content: space-between;
      }
    }
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: #1bb776;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

    &:hover:not(:disabled) {
      background: #159c63;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }

    .material-icons {
      font-size: 18px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  .orders-table {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
  }

  .order-row {
    display: grid;
    grid-template-columns:
      minmax(100px, 1fr) minmax(150px, 1.5fr) minmax(100px, 1fr)
      minmax(120px, 1.2fr) minmax(130px, 1.3fr) minmax(100px, 1fr)
      minmax(80px, 0.8fr) minmax(100px, 1fr) minmax(80px, 0.8fr);
    gap: 16px;
    padding: 12px 16px;
    align-items: center;
    border-bottom: 1px solid #e2e8f0;

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
    }

    &.header {
      background: #f8f9fa;
      font-weight: 600;
      color: #4a5568;
      border-bottom: 2px solid #e2e8f0;
      position: static;

      .col {
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }
    }

    @media (max-width: 768px) {
      grid-template-columns:
        minmax(80px, 0.8fr) minmax(120px, 1.2fr) minmax(80px, 0.8fr)
        minmax(100px, 1fr) minmax(100px, 1fr) minmax(80px, 0.8fr)
        minmax(60px, 0.6fr) minmax(80px, 0.8fr) minmax(60px, 0.6fr);
      padding: 10px 12px;
      gap: 8px;

      .col {
        font-size: 0.8rem;
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

    &.status-processing {
      background: #fef3c7;
      color: #d97706;
    }

    &.status-ready {
      background: #dcfce7;
      color: #16a34a;
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
  }

  @media (max-width: 768px) {
    margin: 0 -8px;
    border-radius: 0;
    padding: 16px 8px;

    .orders-table {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .order-row {
      min-width: 900px;
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
</style>
