<template>
  <AdminPage>
    <div class="wolt-drive-invoice">
      <div class="page-header">
        <h1>Wolt Drive Invoice</h1>
        <p class="page-description">Fakturagrunnlag for Wolt Drive basert på valgt butikk og periode</p>
      </div>

      <div class="filters-section">
        <div class="date-filters">
          <div class="date-input">
            <label for="from-date">Fra dato:</label>
            <input
              id="from-date"
              v-model="dateRange.from"
              type="date"
              @change="onFilterChange"
            />
          </div>
          <div class="date-input">
            <label for="to-date">Til dato:</label>
            <input
              id="to-date"
              v-model="dateRange.to"
              type="date"
              @change="onFilterChange"
            />
          </div>
        </div>

        <div class="meters-input">
          <label for="avg-meters">Snitt meter per levering</label>
          <input
            id="avg-meters"
            v-model.number="avgMetersPerDelivery"
            type="number"
            min="1"
            step="1"
            @change="onFilterChange"
          />
        </div>
      </div>

      <div
        v-if="isLoading && selectedStoreId"
        class="loading-section"
      >
        <Loading :loading="true" />
      </div>

      <div
        v-if="report && !isLoading"
        class="summary-section"
      >
        <div class="summary-cards">
          <div class="summary-card">
            <h3>Fullførte</h3>
            <div class="stat-value">{{ formatNumber(report.completedCount) }}</div>
          </div>
          <div class="summary-card cancelled">
            <h3>Kansellerte</h3>
            <div class="stat-value">{{ formatNumber(report.cancelledCount) }}</div>
          </div>
          <div class="summary-card total">
            <h3>Total km</h3>
            <div class="stat-value">{{ formatNumber(report.totalKm) }}</div>
          </div>
        </div>
      </div>

      <div
        v-if="report && report.summaryLines && report.summaryLines.length > 0 && !isLoading"
        class="summary-table-section"
      >
        <h2>Fakturalinjer</h2>
        <div class="table-container">
          <table class="summary-table">
            <thead>
              <tr>
                <th>Beskrivelse</th>
                <th>Antall</th>
                <th>Pris</th>
                <th>Sum eks. mva</th>
                <th>Sum inkl. mva</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(line, index) in report.summaryLines"
                :key="`line-${index}`"
                :class="{ 'total-row': line.description === 'TOTALT' }"
              >
                <td>{{ line.description }}</td>
                <td>{{ line.count !== null && line.count !== undefined ? formatNumber(line.count) : "-" }}</td>
                <td>{{ line.price !== null && line.price !== undefined ? formatCurrency(line.price) : "-" }}</td>
                <td>{{ formatCurrency(line.sumExVat) }}</td>
                <td>{{ formatCurrency(line.sumIncVat) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div
        v-if="report && report.orderRows && report.orderRows.length > 0 && !isLoading"
        class="details-section"
      >
        <div class="details-header">
          <h2>Detaljer ({{ report.orderRows.length }})</h2>
          <button
            class="btn-export"
            type="button"
            @click="exportCsv"
          >
            Eksporter CSV
          </button>
        </div>
        <div class="table-container">
          <table class="orders-table">
            <thead>
              <tr>
                <th>Completed</th>
                <th>StoreId</th>
                <th>StoreLegalName</th>
                <th>Status</th>
                <th>OrderId</th>
                <th>Antall</th>
                <th>Total km</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="row in report.orderRows"
                :key="row.orderId"
              >
                <td>{{ formatDateTime(row.completed) }}</td>
                <td>{{ row.storeId }}</td>
                <td>{{ row.storeLegalName }}</td>
                <td>{{ row.status }}</td>
                <td>{{ row.orderId }}</td>
                <td>-</td>
                <td>-</td>
              </tr>
            </tbody>
            <tfoot v-if="report.statusTotals && report.statusTotals.length > 0">
              <tr
                v-for="(total, index) in report.statusTotals"
                :key="`total-${index}`"
                class="totals-row"
              >
                <td colspan="4">Sum ({{ total.status }})</td>
                <td>-</td>
                <td>{{ formatNumber(total.itemCount) }}</td>
                <td>{{ total.totalKm !== null && total.totalKm !== undefined ? formatNumber(total.totalKm) : "-" }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div
        v-if="!isLoading && selectedStoreId && (!report || report.totalOrderCount === 0)"
        class="empty-state"
      >
        <h3>Ingen ordrer funnet</h3>
        <p>Det er ingen Wolt Drive-ordrer i den valgte perioden for denne butikken.</p>
      </div>

      <div
        v-if="!isLoading && !selectedStoreId"
        class="empty-state"
      >
        <h3>Velg en butikk</h3>
        <p>Velg en butikk og datoperiode for å se Wolt Drive-fakturagrunnlag.</p>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import Loading from "~/components/atoms/Loading.vue";

export default {
  name: "WoltDriveInvoice",
  components: { AdminPage, Loading },
  data() {
    return {
      isLoading: false,
      report: null,
      dateRange: {
        from: this.getDefaultFromDate(),
        to: this.getDefaultToDate(),
      },
      avgMetersPerDelivery: 1368,
    };
  },
  computed: {
    selectedStoreId() {
      return this.$store.state.selectedAdminStore;
    },
    userIsLoggedIn() {
      return this.$store.getters.userIsLoggedIn;
    },
    isPowerUser() {
      return this.$store.state.currentUser?.isPowerUser;
    },
  },
  watch: {
    selectedStoreId: {
      immediate: true,
      handler() {
        if (this.canLoadData()) {
          this.loadData();
        }
      },
    },
    userIsLoggedIn: {
      immediate: true,
      handler(isLoggedIn) {
        if (isLoggedIn && !this.isPowerUser) {
          this.$router.push("/admin");
          return;
        }
        if (isLoggedIn && this.canLoadData()) {
          this.loadData();
        }
      },
    },
    "$route.query": {
      handler(newQuery) {
        this.applyQueryFilters(newQuery);
      },
      immediate: true,
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      return;
    }

    if (!this.isPowerUser) {
      this.$router.push("/admin");
    }
  },
  methods: {
    getDefaultFromDate() {
      const now = new Date();
      const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return firstDayPrev.toISOString().slice(0, 10);
    },
    getDefaultToDate() {
      const now = new Date();
      const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);
      return lastDayPrev.toISOString().slice(0, 10);
    },
    parseQueryDate(value) {
      let raw = value;
      if (Array.isArray(raw)) {
        raw = raw[0];
      }
      if (typeof raw !== "string") {
        return null;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return null;
      }
      const date = new Date(`${raw}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      if (date.toISOString().slice(0, 10) !== raw) {
        return null;
      }
      return raw;
    },
    parseQueryNumber(value) {
      let raw = value;
      if (Array.isArray(raw)) {
        raw = raw[0];
      }
      if (typeof raw === "string") {
        const parsed = parseInt(raw, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
      if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
        return raw;
      }
      return null;
    },
    getDateRangeFromQuery(query) {
      const from = this.parseQueryDate(query?.from);
      const to = this.parseQueryDate(query?.to);

      if (!from && !to) {
        return null;
      }

      return { from, to };
    },
    applyQueryFilters(query) {
      const range = this.getDateRangeFromQuery(query);
      const avgMeters = this.parseQueryNumber(query?.avgMeters);

      let hasChanges = false;

      if (range) {
        const nextFrom = range.from || this.dateRange.from;
        const nextTo = range.to || this.dateRange.to;

        if (nextFrom !== this.dateRange.from || nextTo !== this.dateRange.to) {
          this.dateRange.from = nextFrom;
          this.dateRange.to = nextTo;
          hasChanges = true;
        }
      }

      if (avgMeters && avgMeters !== this.avgMetersPerDelivery) {
        this.avgMetersPerDelivery = avgMeters;
        hasChanges = true;
      }

      if (hasChanges && this.canLoadData()) {
        this.loadData();
      }
    },
    updateQueryFilters() {
      const nextQuery = {
        ...this.$route.query,
        from: this.dateRange.from,
        to: this.dateRange.to,
        avgMeters: this.avgMetersPerDelivery,
      };

      const currentFrom = this.$route.query?.from;
      const currentTo = this.$route.query?.to;
      const currentAvgMeters = this.$route.query?.avgMeters;

      if (
        currentFrom === nextQuery.from &&
        currentTo === nextQuery.to &&
        String(currentAvgMeters) === String(nextQuery.avgMeters)
      ) {
        return;
      }

      this.$router.replace({ query: nextQuery });
    },
    onFilterChange() {
      this.updateQueryFilters();
      if (this.canLoadData()) {
        this.loadData();
      }
    },
    canLoadData() {
      return (
        this.userIsLoggedIn &&
        this.isPowerUser &&
        !!this.selectedStoreId &&
        this.avgMetersPerDelivery > 0 &&
        !!this.dateRange.from &&
        !!this.dateRange.to
      );
    },
    async loadData() {
      if (!this.selectedStoreId) {
        this.report = null;
        return;
      }

      this.isLoading = true;
      try {
        const model = {
          StoreId: parseInt(this.selectedStoreId),
          From: this.dateRange.from,
          To: this.dateRange.to,
          AvgMetersPerDelivery: this.avgMetersPerDelivery,
        };

        this.report = await this._statisticsService.GetWoltDriveInvoice(model);
      } catch (error) {
        console.error("Failed to load Wolt Drive invoice report:", error);
        this.report = null;
      } finally {
        this.isLoading = false;
      }
    },
    formatDateTime(value) {
      if (!value) {
        return "-";
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "-";
      }
      return date.toLocaleDateString("nb-NO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    formatCurrency(value) {
      if (value === null || value === undefined) {
        return "-";
      }
      return new Intl.NumberFormat("nb-NO", {
        style: "currency",
        currency: "NOK",
        minimumFractionDigits: 2,
      }).format(value);
    },
    formatNumber(value) {
      if (value === null || value === undefined) {
        return "-";
      }
      return new Intl.NumberFormat("nb-NO").format(value);
    },
    buildCsvRows() {
      if (!this.report) {
        return [];
      }

      const rows = [];
      rows.push([
        "Completed",
        "StoreId",
        "StoreLegalName",
        "Status",
        "OrderId",
        "ItemCount",
        "TotalKm",
      ]);

      const storeId = this.report.storeId || this.selectedStoreId || "";
      const storeLegalName = this.report.storeLegalName || "";

      (this.report.orderRows || []).forEach((row) => {
        rows.push([
          this.formatCsvDate(row.completed),
          storeId,
          storeLegalName,
          row.status || "",
          row.orderId || "",
          "",
          "",
        ]);
      });

      (this.report.statusTotals || []).forEach((total) => {
        rows.push([
          "",
          storeId,
          storeLegalName,
          total.status || "",
          "",
          total.itemCount ?? "",
          total.totalKm ?? "",
        ]);
      });

      return rows;
    },
    formatCsvDate(value) {
      if (!value) {
        return "";
      }
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return "";
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    },
    escapeCsvValue(value) {
      if (value === null || value === undefined) {
        return "";
      }
      const stringValue = String(value);
      const needsQuotes = /[;"\n\r]/.test(stringValue);
      const escaped = stringValue.replace(/"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    },
    exportCsv() {
      const rows = this.buildCsvRows();
      if (!rows.length) {
        return;
      }

      const delimiter = ";";
      const csvContent = rows
        .map((row) => row.map((value) => this.escapeCsvValue(value)).join(delimiter))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const storeId = this.report?.storeId || this.selectedStoreId || "store";
      const fromDate = this.dateRange.from || "from";
      const toDate = this.dateRange.to || "to";
      link.href = url;
      link.download = `wolt-drive-invoice-${storeId}-${fromDate}-${toDate}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  },
};
</script>

<style scoped>
.wolt-drive-invoice {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
}

.page-header h1 {
  color: #292c34;
  font-size: 2.5em;
  margin-bottom: 10px;
}

.page-description {
  color: #666;
  font-size: 1.1em;
  margin: 0;
}

.filters-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
  display: flex;
  gap: 30px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.date-filters {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.date-input,
.meters-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.date-input label,
.meters-input label {
  font-weight: 500;
  color: #292c34;
  font-size: 0.9em;
}

.date-input input,
.meters-input input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.date-input input:focus,
.meters-input input:focus {
  outline: none;
  border-color: #1bb776;
}

.loading-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  margin-bottom: 30px;
}

.summary-section {
  margin-bottom: 30px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.summary-card {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  text-align: center;
  border-left: 4px solid #1bb776;
}

.summary-card.cancelled {
  border-left-color: #ff9800;
}

.summary-card.total {
  border-left-color: #4a5568;
}

.summary-card h3 {
  margin: 0 0 10px;
  color: #666;
  font-size: 1em;
}

.stat-value {
  font-size: 2em;
  font-weight: bold;
  color: #292c34;
  margin-bottom: 5px;
}

.summary-table-section,
.details-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.summary-table-section h2,
.details-section h2 {
  margin: 0 0 20px;
  color: #292c34;
}

.details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.details-header h2 {
  margin: 0;
}

.btn-export {
  border: none;
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 0.9em;
  font-weight: 600;
  background-color: #292c34;
  color: #fff;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.btn-export:hover {
  background-color: #1e2026;
}

.table-container {
  overflow-x: auto;
}

.summary-table,
.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}

.summary-table th,
.summary-table td,
.orders-table th,
.orders-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.summary-table th,
.orders-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #292c34;
  position: sticky;
  top: 0;
}

.total-row {
  font-weight: 700;
  background: #f7fafc;
}

.totals-row {
  background: #f7fafc;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-state h3 {
  margin: 0 0 10px;
  color: #292c34;
}

.empty-state p {
  margin: 0;
  color: #666;
}
</style>
