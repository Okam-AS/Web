<template>
  <AdminPage>
    <div class="dinehome-page">
      <h2>Wolt leveringer</h2>
      <!-- Loading state -->
      <div
        v-if="isLoadingOrders && !ordersData"
        class="wolt-loading-banner"
      >
        <div class="loading-content">
          <div class="loading-spinner" />
          <p>Laster Wolt leveringer...</p>
        </div>
      </div>

      <!-- No orders state -->
      <div
        v-if="!isLoadingOrders && ordersData && ordersData.orders && ordersData.orders.length === 0"
        class="wolt-info-banner"
      >
        <p>Du har ingen Wolt leveringer</p>
      </div>

      <div
        v-if="ordersData && ordersData.orders && ordersData.orders.length > 0"
        class="wolt-contact-info"
      >
        <p>
          Dersom du ønsker endringer i forhold til levering kan du kontakte Wolt på tlf nr
          <strong>23 96 01 93</strong>. Du må da oppgi at det gjelder Wolt Drive og hentekode.
        </p>
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
            <div class="col created">Opprettet</div>
            <div class="col amount">Beløp</div>
            <div class="col pickup-eta">Hentetid</div>
            <div class="col driving-time">Kjøretid</div>
            <div class="col tracking">Sporing</div>
          </div>
          <div
            v-for="order in ordersData.orders"
            :key="order.orderId"
            class="order-row"
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
            <div class="col created">
              {{ formatDate(order.created) }}
            </div>
            <div class="col amount">
              {{ priceLabel(order.finalAmount, true) }}
            </div>
            <div class="col pickup-eta">
              {{ order.woltDeliveryInfo && order.woltDeliveryInfo.pickupEta ? formatDate(order.woltDeliveryInfo.pickupEta) : "-" }}
            </div>
            <div class="col driving-time">
              {{ order.drivingTimeInMinutes ? order.drivingTimeInMinutes + " min" : "-" }}
            </div>
            <div class="col tracking">
              <a
                v-if="order.woltDeliveryInfo && order.woltDeliveryInfo.trackingUrl"
                :href="order.woltDeliveryInfo.trackingUrl"
                target="_blank"
                class="tracking-link"
              >
                <span class="material-icons">open_in_new</span>
                Spor
              </a>
              <span v-else>-</span>
            </div>
          </div>
        </div>
      </div>

      <div
        v-if="isKeyAccountManager || isPowerUser"
        class="wolt-calc-container"
      >
        <div class="wolt-calc-form-container">
          <form class="wolt-calc-form">
            <h3>Wolt Kalkulator</h3>
            <div class="wolt-calc-row">
              <label>Gjennomsnittlig ordreverdi (inkl. 15% mva)</label>
              <input
                v-model.number="woltCalc.avgOrderValue"
                type="number"
                min="0"
                step="1"
              />
            </div>
            <div class="wolt-calc-row">
              <label>Fraktpris til sluttkunde (inkl. 25% mva)</label>
              <input
                v-model.number="woltCalc.shippingPrice"
                type="number"
                min="0"
                step="1"
              />
            </div>
            <div class="wolt-calc-row">
              <label>Service fee til sluttkunde (inkl. 25% mva)</label>
              <input
                v-model.number="woltCalc.serviceFee"
                type="number"
                min="0"
                step="1"
              />
            </div>
            <div class="wolt-calc-row">
              <label>Wolt basispris (inkl. 25% mva)</label>
              <input
                v-model.number="woltCalc.basePrice"
                type="number"
                min="0"
                step="1"
              />
            </div>
            <div class="wolt-calc-row">
              <label>Wolt avstandspris (per 500m)</label>
              <input
                v-model.number="woltCalc.distancePrice"
                type="number"
                min="0"
                step="1"
              />
            </div>
            <div class="wolt-calc-result-summary">
              <div class="wolt-result-box">
                <h4>Wolt kostnad:</h4>
                <div class="result-percentage">{{ woltCalcResult.result.toFixed(0) }}<span class="percentage-symbol">%</span></div>
                <p class="result-explanation">av gjennomsnittlig ordreverdi eks. mva</p>
              </div>
            </div>
          </form>
        </div>

        <div class="wolt-calc-table-container">
          <h3>Beregningstabell (for 100 ordre)</h3>
          <div class="wolt-calc-table-wrapper">
            <table class="wolt-calc-table">
              <thead>
                <tr>
                  <th>Avstand (m)</th>
                  <th>Andel</th>
                  <th>Antall ordre</th>
                  <th>Frakt & Serviceinntekt</th>
                  <th>Fraktkost</th>
                  <th>Netto Subsidier per enhet</th>
                  <th>Netto subsidier kategori</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in woltCalcResult.tableRows"
                  :key="row.distance"
                >
                  <td>{{ row.distance }}</td>
                  <td>{{ row.percent }}%</td>
                  <td>{{ row.count.toFixed(1) }}</td>
                  <td>{{ row.fraktOgService }}</td>
                  <td>{{ row.fraktkost }}</td>
                  <td>{{ row.netSubsidyPerUnit }}</td>
                  <td>{{ row.netSubsidy.toFixed(1) }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2">
                    <strong>Total</strong>
                  </td>
                  <td>
                    <strong>{{ woltCalcResult.tableTotals.count.toFixed(0) }}</strong>
                  </td>
                  <td><strong /></td>
                  <td>
                    <strong>{{ (woltCalcResult.tableTotals.fraktkost / woltCalcResult.tableTotals.count).toFixed(2) }}</strong>
                  </td>
                  <td>
                    <strong>{{ (woltCalcResult.tableTotals.netSubsidy / woltCalcResult.tableTotals.count).toFixed(0) }}</strong>
                  </td>
                  <td>
                    <strong>{{ woltCalcResult.tableTotals.netSubsidy.toFixed(1) }}</strong>
                  </td>
                </tr>
                <tr>
                  <td
                    colspan="6"
                    style="text-align: right"
                  >
                    <strong>Netto subsidier i %:</strong>
                  </td>
                  <td>
                    <strong>{{ woltCalcResult.result.toFixed(0) }}%</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div
            class="wolt-calc-explanation"
            style="margin-top: 24px"
          >
            <h4>Forklaring:</h4>
            <div class="explanation-content">
              <div class="explanation-item">
                <span class="explanation-label">Fraktkost</span>
                <span class="explanation-formula">= Basispris ({{ woltCalc.basePrice }}) + (Avstandspris ({{ woltCalc.distancePrice }}) × avstandsfaktor)</span>
              </div>
              <div class="explanation-item">
                <span class="explanation-label">Frakt & Serviceinntekt</span>
                <span class="explanation-value">= {{ woltCalc.shippingPrice }} + {{ woltCalc.serviceFee }} = {{ woltCalc.shippingPrice + woltCalc.serviceFee }}</span>
              </div>
              <div class="explanation-item">
                <span class="explanation-label">Netto Subsidier</span>
                <span class="explanation-formula">= Fraktkost - Frakt & Serviceinntekt</span>
              </div>
              <div class="explanation-total">
                Subsidiebeløp: <strong>{{ woltCalcResult.tableTotals.netSubsidy ? Math.round(woltCalcResult.tableTotals.netSubsidy / 100) : "0" }}</strong> kr per ordre
              </div>
            </div>
          </div>
        </div>
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
import LoginModal from "~/components/molecules/LoginModal.vue";

export default {
  components: { AdminPage, LoginModal, Loading },
  data: () => ({
    showLogin: false,
    isLoading: false,
    ordersData: null,
    currentPage: 1,
    pageSize: 20,
    isLoadingOrders: false,
    deliveryTimes: [],
    selectedDate: new Date().toISOString().split("T")[0],
    sortField: "drivingTimeInMinutes",
    sortDirection: "desc",
    showActualTime: false,
    columnWidths: [160, 70, 130, 130, 130, 100],
    resizing: null,
    isResizing: false,
    woltCalc: {
      avgOrderValue: 400,
      shippingPrice: 75,
      serviceFee: 10,
      basePrice: 109,
      distancePrice: 10,
    },
  }),
  computed: {
    isKeyAccountManager() {
      return this.$store.state.currentUser?.isKeyAccountManager;
    },
    isPowerUser() {
      return this.$store.state.currentUser?.isPowerUser;
    },

    woltCalcResult() {
      // Distance distribution table (in meters and percentage)
      const distTable = [
        { distance: 500, percent: 9.2 },
        { distance: 1000, percent: 18.7 },
        { distance: 1500, percent: 16.8 },
        { distance: 2000, percent: 14.6 },
        { distance: 2500, percent: 11.2 },
        { distance: 3000, percent: 8.9 },
        { distance: 3500, percent: 5.9 },
        { distance: 4000, percent: 4.7 },
        { distance: 4500, percent: 3.6 },
        { distance: 5000, percent: 2.8 },
        { distance: 5500, percent: 1.9 },
        { distance: 6000, percent: 1.7 },
      ];
      const orders = 100;

      // Calculate values excluding VAT
      const orderValueExVat = this.woltCalc.avgOrderValue / 1.15; // 15% VAT on food

      let totalNetSubsidy = 0;
      let totalFraktOgService = 0;
      let totalFraktkost = 0;
      let totalCount = 0;
      const tableRows = [];

      distTable.forEach((row, index) => {
        const count = orders * (row.percent / 100);
        const fraktOgService = this.woltCalc.shippingPrice + this.woltCalc.serviceFee; // Display the price with VAT in the table

        // Base price (95) + distance price (10 per 500m) - with VAT for display
        const fraktkost = this.woltCalc.basePrice + this.woltCalc.distancePrice * index;

        // Calculate netto subsidy per unit
        const netSubsidyPerUnit = fraktkost - fraktOgService;

        // Calculate total subsidy for this category
        const netSubsidy = netSubsidyPerUnit * count;

        totalNetSubsidy += netSubsidy;
        totalFraktOgService += fraktOgService * count;
        totalFraktkost += fraktkost * count;
        totalCount += count;

        tableRows.push({
          distance: row.distance,
          percent: row.percent,
          count,
          fraktOgService,
          fraktkost,
          netSubsidyPerUnit,
          netSubsidy,
        });
      });

      // Calculate subsidy as percentage of order value excluding VAT
      // Total subsidy per order divided by average order value ex VAT
      const subsidyPerOrder = totalNetSubsidy / orders;
      const result = (subsidyPerOrder / orderValueExVat) * 100;

      return {
        result,
        tableRows,
        tableTotals: {
          count: totalCount,
          fraktOgService: totalFraktOgService,
          fraktkost: totalFraktkost,
          netSubsidy: totalNetSubsidy,
          orderValueExVat,
        },
      };
    },
    sortedDeliveryTimes() {
      return [...this.deliveryTimes].sort((a, b) => {
        let aVal = a[this.sortField];
        let bVal = b[this.sortField];

        // Handle drivingTimeInMinutes calculation
        if (this.sortField === "drivingTimeInMinutes") {
          aVal = this.calculateActualDrivingTime(a);
          bVal = this.calculateActualDrivingTime(b);
        }
        // Handle processingEndTime diff sorting
        else if (this.sortField === "processingEndTime") {
          const getDiff = (time) => {
            if (!time || !time.estimatedProcessingEndTime || !time.processingEndTime || time.processingEndTime === "0001-01-01T00:00:00") {
              return null;
            }
            return Math.round((new Date(time.processingEndTime) - new Date(time.estimatedProcessingEndTime)) / (1000 * 60));
          };
          aVal = getDiff(a);
          bVal = getDiff(b);
          // Handle null values
          if (aVal === null) {
            return 1;
          }
          if (bVal === null) {
            return -1;
          }
        }
        // Handle other date fields
        else if (["estimatedProcessingEndTime", "completedTime"].includes(this.sortField)) {
          aVal = aVal && aVal !== "0001-01-01T00:00:00" ? new Date(aVal).getTime() : 0;
          bVal = bVal && bVal !== "0001-01-01T00:00:00" ? new Date(bVal).getTime() : 0;
        }
        // Handle numeric field
        else if (this.sortField === "drivingTimeInMinutes") {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        // Handle string fields
        else {
          aVal = aVal || "";
          bVal = bVal || "";
        }

        if (this.sortDirection === "asc") {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        }
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      });
    },
    isFutureOrToday() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(this.selectedDate);
      return selected >= today;
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
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      return;
    }
    this.fetchDeliveryTimes();
    this.fetchOrders();
  },
  beforeDestroy() {
    // Cleanup event listeners
    window.removeEventListener("mousemove", this.handleResize);
    window.removeEventListener("mouseup", this.stopResize);
  },
  methods: {
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        this.fetchDeliveryTimes();
        this.fetchOrders();
      }
    },
    async fetchOrders(page) {
      // If page is an event object or not a number, use current page
      const pageNumber = typeof page === "number" && !isNaN(page) ? page : this.currentPage;

      this.isLoadingOrders = true;
      try {
        const response = await this._woltService.getOrders(pageNumber, this.pageSize);
        this.ordersData = response;
        this.currentPage = this.ordersData.page;
      } catch (error) {
        console.warn("Failed to fetch Wolt orders:", error);
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
    async fetchDeliveryTimes() {
      this.isLoading = true;
      try {
        const storeIds = this.$store.state.currentUser.adminIn.map((store) => store.id);
        const request = {
          dateFrom: new Date(this.selectedDate),
          dateTo: new Date(this.selectedDate),
          storeIds,
        };

        this.deliveryTimes = []; // await this._dineHomeService.getDeliveryTimes(request);
      } catch (error) {
        console.error("Failed to fetch delivery times:", error);
      } finally {
        this.isLoading = false;
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
    getTimeDiff(estimated, actual) {
      if (!estimated || !actual || actual === "0001-01-01T00:00:00") {
        return "-";
      }
      const diff = Math.round((new Date(actual) - new Date(estimated)) / (1000 * 60));
      if (diff === 0) {
        return "Presist";
      }
      return diff > 0 ? `${diff} min senere` : `${Math.abs(diff)} min tidligere`;
    },
    handleColumnClick(event, field) {
      if (!this.isResizing) {
        this.sort(field);
      }
    },
    startResize(event, columnIndex) {
      event.stopPropagation();
      this.isResizing = true;
      this.resizing = {
        columnIndex,
        startX: event.pageX,
        startWidth: this.columnWidths[columnIndex],
      };

      window.addEventListener("mousemove", this.handleResize);
      window.addEventListener("mouseup", this.stopResize);
    },

    handleResize(event) {
      if (!this.resizing) {
        return;
      }

      const diff = event.pageX - this.resizing.startX;
      const newWidth = Math.max(50, this.resizing.startWidth + diff);
      this.columnWidths[this.resizing.columnIndex] = newWidth;

      // Update grid template columns
      const columns = this.columnWidths.map((width) => `minmax(${width}px, ${width}fr)`).join(" ");
      document.querySelectorAll(".delivery-time-row").forEach((row) => {
        row.style.gridTemplateColumns = columns;
      });
    },

    stopResize() {
      this.resizing = null;
      // Add small delay to prevent sort trigger on mouseup
      setTimeout(() => {
        this.isResizing = false;
      }, 150);

      window.removeEventListener("mousemove", this.handleResize);
      window.removeEventListener("mouseup", this.stopResize);
    },
    sort(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      } else {
        this.sortField = field;
        this.sortDirection = "asc";
      }
    },
    toggleTimeDisplay() {
      this.showActualTime = !this.showActualTime;
    },
    calculateActualDrivingTime(time) {
      if (!time.completedTime || !time.estimatedProcessingEndTime || !time.processingEndTime) {
        return time.drivingTimeInMinutes || 0;
      }

      const completed = new Date(time.completedTime);
      const estimated = new Date(time.estimatedProcessingEndTime);
      const actual = new Date(time.processingEndTime);

      // Use the later time between estimated and actual processing end time
      const startTime = actual > estimated ? actual : estimated;

      return Math.round((completed - startTime) / (1000 * 60));
    },
    handleDateChange() {
      this.fetchDeliveryTimes();
    },
    changeDate(days) {
      const date = new Date(this.selectedDate);
      date.setDate(date.getDate() + days);
      this.selectedDate = date.toISOString().split("T")[0];
      this.fetchDeliveryTimes();
    },
  },
};
</script>

<style lang="scss" scoped>
.dinehome-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 8px;
  }
}

.date-picker-section {
  margin-bottom: 32px;
  text-align: center;

  h2 {
    margin-bottom: 24px;
    color: #292c34;
  }
}

.date-picker-container {
  display: flex;
  justify-content: center;
}

.date-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    max-width: none;
    border-radius: 0;
    margin: 0 -8px;
    box-shadow: none;
  }
}

.date-input {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-weight: 500;
    color: #4a5568;
  }

  input {
    padding: 8px 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.95em;
    transition: all 0.2s ease;

    &:focus {
      border-color: #1bb776;
      outline: none;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }
  }
}

.delivery-times-table {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-x: auto;

  @media (max-width: 768px) {
    position: relative;
    display: block;
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
    border-radius: 0;
    margin: 0 -8px;
  }
}

.delivery-time-row {
  display: grid;
  grid-template-columns:
    minmax(160px, 1.5fr) minmax(70px, 0.8fr) minmax(130px, 1.2fr)
    minmax(130px, 1.2fr) minmax(130px, 1.2fr) minmax(100px, 1fr);
  gap: 16px;
  padding: 12px 20px;
  align-items: center;
  background: white;

  @media (max-width: 768px) {
    grid-template-columns:
      minmax(180px, 2fr) minmax(50px, 0.5fr) minmax(130px, 1.2fr)
      minmax(130px, 1.2fr) minmax(130px, 1.2fr) minmax(100px, 1fr);
    padding: 12px 16px;
    gap: 12px;
  }

  &:not(.header):hover {
    background: #f8fafc;
  }

  // Prevent text overflow
  .col {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col {
    position: relative;

    &.sortable {
      cursor: pointer;
    }
  }

  &.header {
    background: #f8f9fa;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 500;
  }
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: #718096;
  font-style: italic;
  background: #f8f9fa;
  border-radius: 12px;
  margin-top: 24px;
}

.sort-icon {
  font-size: 14px;
  color: #1bb776;
}

.clickable {
  cursor: pointer;

  &:hover {
    color: #1bb776;
  }
}

.resize-handle {
  position: absolute;
  right: -8px;
  top: 0;
  bottom: 0;
  width: 16px;
  cursor: col-resize;

  &:hover::after,
  &:active::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    right: 8px;
    width: 2px;
    background: #1bb776;
  }

  &:active::after {
    background: #159c63;
  }
}

// Prevent text selection while resizing
.resizing {
  user-select: none;
  -webkit-user-select: none;

  * {
    cursor: col-resize !important;
  }
}

.delivery-count {
  text-align: center;
  margin-bottom: 16px;
  color: #4a5568;
  font-weight: 500;
}

.date-nav-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #4a5568;
  font-size: 1.5em;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 8px;

  &:hover {
    background: #f7fafc;
    color: #1bb776;
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
  }
}

.wolt-calc-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  max-width: 1200px;
  margin: 32px auto 0 auto;

  @media (min-width: 992px) {
    flex-direction: row;
    gap: 24px;
    align-items: flex-start;
  }
}

.wolt-calc-form-container {
  width: 100%;
  max-width: 420px;
  background: #f8f9fa;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 16px;

  @media (min-width: 992px) {
    margin-bottom: 0;
    flex: 0 0 auto;
  }
}

.wolt-calc-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.wolt-calc-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wolt-calc-row label {
  font-weight: 500;
  color: #4a5568;
}

.wolt-calc-row input {
  padding: 8px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 1em;
  transition: border-color 0.2s;
}

.wolt-calc-row input:focus {
  border-color: #1bb776;
  outline: none;
}

.wolt-calc-form button {
  margin-top: 12px;
  padding: 10px 0;
  background: #1bb776;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1.1em;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
}

.wolt-calc-form button:hover {
  background: #159c63;
}

.wolt-calc-result-summary {
  margin-top: 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.wolt-result-box {
  padding: 15px;
  background-color: #f0fff4;
  border-radius: 10px;
  border: 2px solid #c6f6d5;
}

.wolt-result-box h4 {
  color: #2f855a;
  margin-bottom: 5px;
  font-size: 1.1em;
}

.result-percentage {
  font-size: 4.5em;
  font-weight: 700;
  color: #1bb776;
  line-height: 1;
  margin: 10px 0;
}

.percentage-symbol {
  font-size: 0.6em;
  vertical-align: super;
  font-weight: 600;
}

.result-explanation {
  color: #4a5568;
  font-size: 0.9em;
  margin-top: 5px;
}

.wolt-calc-explanation {
  background-color: #f7fafc;
  border-radius: 10px;
  padding: 15px;
  border: 1px solid #e2e8f0;
}

.wolt-calc-explanation h4 {
  color: #4a5568;
  margin-bottom: 12px;
  font-size: 1.1em;
  text-align: left;
}

.explanation-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  text-align: left;
}

.explanation-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.explanation-label {
  font-weight: 600;
  color: #2d3748;
}

.explanation-formula,
.explanation-value {
  color: #4a5568;
  font-size: 0.95em;
}

.explanation-total {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e2e8f0;
  font-size: 1.05em;
  color: #2d3748;
}

.per-order-subsidy {
  display: block;
  font-size: 0.9em;
  color: #4a5568;
  margin-top: 4px;
}

.wolt-calc-table-container {
  width: 100%;
  background: #f8f9fa;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-top: 16px;

  @media (min-width: 992px) {
    margin-top: 0;
    flex: 1;
  }
}

.wolt-calc-table-wrapper {
  overflow-x: auto;
}

.wolt-calc-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 8px;
  font-size: 0.97em;
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.wolt-calc-table th,
.wolt-calc-table td {
  border: 1px solid #e2e8f0;
  padding: 6px 10px;
  text-align: right;
}

.wolt-calc-table th {
  background: #f7fafc;
  color: #4a5568;
  font-weight: 600;
}

.wolt-calc-table td:first-child,
.wolt-calc-table th:first-child {
  text-align: left;
}

.wolt-calc-table tfoot td {
  background: #f8f9fa;
  font-weight: 600;
}

.wolt-info-banner {
  background-color: #f7fafc;
  border-radius: 10px;
  padding: 15px;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;
  margin-top: 16px;
}

.wolt-info-banner p {
  color: #4a5568;
  font-size: 1em;
  text-align: left;
}

.wolt-loading-banner {
  background-color: #f7fafc;
  border-radius: 10px;
  padding: 24px;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;
  margin-top: 16px;

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

.wolt-info-banner a {
  color: #1bb776;
  text-decoration: none;
}

.wolt-info-banner a:hover {
  color: #159c63;
}

// Contact Info
.wolt-contact-info {
  background-color: #e8f4fd;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
  border-left: 4px solid #1bb776;

  p {
    color: #2d3748;
    font-size: 0.95em;
    margin: 0;
    line-height: 1.5;
  }

  strong {
    color: #1bb776;
    font-weight: 600;
  }
}

// Orders Section
.orders-section {
  margin-top: 32px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 24px;

  .orders-header {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      margin: 0;
      color: #292c34;
      font-size: 1.25rem;
    }

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
      minmax(80px, 0.8fr) minmax(180px, 2fr) minmax(120px, 1.2fr)
      minmax(130px, 1.3fr) minmax(100px, 1fr) minmax(130px, 1.3fr)
      minmax(90px, 0.9fr) minmax(100px, 1fr);
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
        minmax(60px, 0.6fr) minmax(120px, 1.5fr) minmax(80px, 0.8fr)
        minmax(100px, 1fr) minmax(80px, 0.8fr) minmax(100px, 1fr)
        minmax(60px, 0.6fr) minmax(70px, 0.7fr);
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

  .tracking-link {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #1bb776;
    text-decoration: none;
    font-size: 0.8rem;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
      color: #159c63;
    }

    .material-icons {
      font-size: 0.9em;
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
      min-width: 600px;
    }
  }

  .pagination-controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20px;
    padding: 16px 0;
    border-top: 1px solid #e2e8f0;

    @media (max-width: 768px) {
      flex-direction: column;
      gap: 16px;
    }

    .pagination-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #1bb776;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s ease;

      &:hover:not(:disabled) {
        background: #159c63;
        transform: translateY(-1px);
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        transform: none;
      }

      .material-icons {
        font-size: 1.1em;
      }
    }

    .pagination-info {
      text-align: center;
      color: #4a5568;
      font-size: 0.9rem;

      @media (max-width: 768px) {
        order: -1;
      }
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
