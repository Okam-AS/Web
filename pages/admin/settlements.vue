<template>
  <AdminPage>
    <div class="pending-settlements">
      <div class="page-header">
        <h1>Utestående utbetalinger</h1>
        <p class="page-description">Oversikt over bestillinger som ikke er inkludert i utbetalinger ennå</p>
      </div>

      <!-- Store and Date Selection -->
      <div class="filters-section">
        <div class="filter-group">
          <label for="store-select">Velg butikk:</label>
          <div class="select-wrapper">
            <select
              id="store-select"
              v-model="selectedStoreId"
              @change="loadData"
            >
              <option value="">Velg butikk</option>
              <option
                v-for="store in availableStores"
                :key="store.id"
                :value="store.id"
              >
                {{ store.name }} ({{ store.id }})
              </option>
            </select>
          </div>
        </div>

        <div class="date-filters">
          <div class="date-input">
            <label for="from-date">Fra dato:</label>
            <input
              id="from-date"
              v-model="dateRange.from"
              type="date"
              @change="loadData"
            />
          </div>
          <div class="date-input">
            <label for="to-date">Til dato:</label>
            <input
              id="to-date"
              v-model="dateRange.to"
              type="date"
              @change="loadData"
            />
          </div>
        </div>
      </div>

      <!-- Loading Spinner -->
      <div
        v-if="isLoading && selectedStoreId"
        class="loading-section"
      >
        <Loading :loading="true" />
      </div>

      <!-- Summary Statistics -->
      <div
        v-if="settlementData && selectedStoreId && !isLoading"
        class="summary-section"
      >
        <div class="summary-cards">
          <div class="summary-card">
            <h3>Totalt bestillinger</h3>
            <div class="stat-value">
              {{ settlementData.totalDinteroOrders }}
            </div>
            <div class="stat-amount">
              {{ formatAmount(settlementData.totalDinteroAmount) }}
            </div>
          </div>
          <div class="summary-card settled">
            <h3>Utbetalt</h3>
            <div class="stat-value">
              {{ settlementData.totalSettledOrders }}
            </div>
            <div class="stat-amount">
              {{ formatAmount(settlementData.totalSettledAmount) }}
            </div>
          </div>
          <div class="summary-card pending">
            <h3>Utestående</h3>
            <div class="stat-value">
              {{ settlementData.totalPendingOrders }}
            </div>
            <div class="stat-amount">
              {{ formatAmount(settlementData.totalPendingAmount) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Pending Orders Table -->
      <div
        v-if="settlementData && settlementData.pendingOrders && settlementData.pendingOrders.length > 0 && !isLoading"
        class="pending-orders-section"
      >
        <h2>Utestående ordrer ({{ settlementData.totalPendingOrders }})</h2>
        <div class="table-container">
          <table class="orders-table">
            <thead>
              <tr>
                <th>Ordre ID</th>
                <th>Dato</th>
                <th>Beløp</th>
                <th>Betaling</th>
                <th>Levering</th>
                <th>Kunde</th>
                <th>Telefon</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in settlementData.pendingOrders"
                :key="order.orderId"
                class="order-row"
              >
                <td class="order-id">
                  {{ order.friendlyOrderId }}
                </td>
                <td>{{ formatDate(order.completed) }}</td>
                <td class="amount">
                  {{ order.finalAmountFormatted }}
                </td>
                <td>{{ order.paymentTypeLabel }}</td>
                <td>{{ order.deliveryTypeLabel }}</td>
                <td>{{ order.customerName || "-" }}</td>
                <td>{{ order.customerPhone }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Settlements Section -->
      <div
        v-if="settlementData && settlementData.settlements && settlementData.settlements.length > 0 && !isLoading"
        class="settlements-section"
      >
        <h2>Utbetalinger i perioden ({{ settlementData.settlements.length }})</h2>
        <div class="settlements-grid">
          <div
            v-for="settlement in settlementData.settlements"
            :key="settlement.settlementId"
            class="settlement-card"
          >
            <div class="settlement-header">
              <h3>Utbetaling</h3>
              <div class="settlement-date">
                {{ formatDate(settlement.settledAt) }}
              </div>
            </div>
            <div class="settlement-details">
              <div class="settlement-amount">
                {{ settlement.totalAmountFormatted }}
              </div>
              <div class="settlement-count">{{ settlement.transactionCount }} transaksjoner</div>
              <div class="settlement-period">{{ formatDate(settlement.startAt) }} - {{ formatDate(settlement.endAt) }}</div>
             
              <button
                v-if="settlement.invoiceId"
                class="btn-download"
                :disabled="downloadingInvoiceId === settlement.invoiceId"
                @click="downloadInvoice(settlement)"
              >
                <span v-if="downloadingInvoiceId === settlement.invoiceId">Laster ned...</span>
                <span v-else>Last ned rapport</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div
        v-if="!isLoading && selectedStoreId && (!settlementData || settlementData.totalDinteroOrders === 0)"
        class="empty-state"
      >
        <div class="empty-icon">📊</div>
        <h3>Ingen bestillinger funnet</h3>
        <p>Det er ingen bestillinger i den valgte perioden for denne butikken.</p>
      </div>

      <div
        v-if="!isLoading && !selectedStoreId"
        class="empty-state"
      >
        <h3>Velg en butikk</h3>
        <p>Velg en butikk og datoperiode for å se utestående utbetalinger.</p>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import Loading from "~/components/atoms/Loading.vue";

export default {
  name: "PendingSettlements",
  components: { AdminPage, Loading },
  data() {
    return {
      isLoading: false,
      selectedStoreId: "",
      settlementData: null,
      dateRange: {
        from: this.getDefaultFromDate(),
        to: this.getDefaultToDate(),
      },
      downloadingInvoiceId: null,
    };
  },
  computed: {
    availableStores() {
      return this.$store.state.currentUser?.adminIn || [];
    },
  },
  watch: {
    availableStores: {
      handler(newStores) {
        if (newStores && newStores.length > 0 && !this.selectedStoreId) {
          this.selectedStoreId = newStores[0].id;
          this.loadData();
        }
      },
      immediate: true
    }
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      // Handle not logged in case if needed
      return;
    }
    this.initializePage();
  },
  methods: {
    initializePage() {
      // Set default store if user has only one store
      if (this.availableStores.length === 1) {
        this.selectedStoreId = this.availableStores[0].id;
        this.loadData();
      }
    },

    getDefaultFromDate() {
      const date = new Date();
      // Get the start of the week from two weeks ago (Monday)
      const dayOfWeek = date.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 20 : dayOfWeek + 13; // If Sunday, go back 20 days, otherwise go back to Monday of two weeks ago
      date.setDate(date.getDate() - daysToSubtract);
      return date.toISOString().split("T")[0];
    },

    getDefaultToDate() {
      const date = new Date();
      // Get the end of the week from two weeks ago (Sunday)
      const dayOfWeek = date.getDay();
      const daysToSubtract = dayOfWeek === 0 ? 14 : dayOfWeek + 7; // If Sunday, go back 14 days, otherwise go back to Sunday of two weeks ago
      date.setDate(date.getDate() - daysToSubtract);
      return date.toISOString().split("T")[0];
    },

    async loadData() {
      if (!this.selectedStoreId) {
        this.settlementData = null;
        return;
      }

      this.isLoading = true;
      try {
        const model = {
          StoreId: parseInt(this.selectedStoreId),
          from: this.dateRange.from,
          to: this.dateRange.to,
        };

        this.settlementData = await this._statisticsService.GetPendingSettlements(model);
      } catch (error) {
        console.error("Failed to load pending settlements:", error);
        this.showNotification("Kunne ikke laste utestående utbetalinger", "error");
      } finally {
        this.isLoading = false;
      }
    },

    formatDate(dateString) {
      if (!dateString) {
        return "-";
      }
      const date = new Date(dateString);
      return date.toLocaleDateString("nb-NO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    formatAmount(amountInOre) {
      if (!amountInOre) {
        return "0,00 kr";
      }
      const amount = amountInOre / 100;
      return new Intl.NumberFormat("nb-NO", {
        style: "currency",
        currency: "NOK",
      }).format(amount);
    },

    showNotification(message, type) {
      // Implement notification logic or use existing notification system
      alert(message);
    },

    async downloadInvoice(settlement) {
      if (this.downloadingInvoiceId) return;

      this.downloadingInvoiceId = settlement.invoiceId;
      try {
        const token = this.$store.state.currentUser?.token;
        const apiBaseUrl = process.env.API_BASE_URL || '';
        const url = `${apiBaseUrl}/Invoices/pdf/${settlement.invoiceId}`;

        const axios = require('axios');
        const response = await axios({
          url: url,
          method: 'GET',
          responseType: 'blob',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `Faktura-${settlement.invoiceId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Error downloading invoice:', error);
        this.showNotification('Kunne ikke laste ned faktura', 'error');
      } finally {
        this.downloadingInvoiceId = null;
      }
    },
  },
};
</script>

<style scoped>
.pending-settlements {
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

.loading-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
  margin-bottom: 30px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 200px;
}

.filter-group label {
  font-weight: 500;
  color: #292c34;
}

.select-wrapper {
  position: relative;
  display: inline-block;
  min-width: 200px;
}

.select-wrapper select {
  width: 100%;
  padding: 10px 2.5rem 10px 10px;
  border-radius: 4px;
  border: 1px solid #ddd;
  background-color: white;
  appearance: none;
  font-size: 1em;
  color: #334155;
  cursor: pointer;
  transition: all 0.2s;
}

.select-wrapper select:focus {
  outline: none;
  border-color: #1bb776;
}

.select-wrapper::after {
  content: "🏠";
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.date-filters {
  display: flex;
  gap: 20px;
}

.date-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.date-input label {
  font-weight: 500;
  color: #292c34;
  font-size: 0.9em;
}

.date-input input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.date-input input:focus {
  outline: none;
  border-color: #1bb776;
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
  border-left: 4px solid #ddd;
}

.summary-card.settled {
  border-left-color: #1bb776;
}

.summary-card.pending {
  border-left-color: #ff9800;
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

.stat-amount {
  color: #1bb776;
  font-weight: 500;
  font-size: 1.1em;
}

.pending-orders-section,
.settlements-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 30px;
}

.pending-orders-section h2,
.settlements-section h2 {
  margin: 0 0 20px;
  color: #292c34;
}

.table-container {
  overflow-x: auto;
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9em;
}

.orders-table th,
.orders-table td {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #eee;
}

.orders-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #292c34;
  position: sticky;
  top: 0;
}

.order-row:hover {
  background: #f8f9fa;
}

.order-id {
  font-weight: 600;
  color: #1bb776;
}

.amount {
  font-weight: 600;
  text-align: right;
}

.settlements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.settlement-card {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #1bb776;
}

.settlement-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.settlement-header h3 {
  margin: 0;
  color: #292c34;
  font-size: 1.1em;
}

.settlement-date {
  color: #666;
  font-size: 0.9em;
}

.settlement-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settlement-amount {
  font-size: 1.5em;
  font-weight: bold;
  color: #1bb776;
}

.settlement-count {
  color: #666;
  font-size: 0.9em;
}

.settlement-period {
  color: #666;
  font-size: 0.8em;
  font-style: italic;
}

.btn-download {
  margin-top: 12px;
  padding: 8px 16px;
  background-color: #1bb776;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  font-weight: 500;
  transition: background-color 0.2s;
  width: 100%;
}

.btn-download:hover:not(:disabled) {
  background-color: #159159;
}

.btn-download:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.empty-icon {
  font-size: 4em;
  margin-bottom: 20px;
}

.empty-state h3 {
  margin: 0 0 10px;
  color: #292c34;
}

.empty-state p {
  margin: 0;
  font-size: 1.1em;
}

@media (max-width: 768px) {
  .pending-settlements {
    padding: 10px;
  }

  .filters-section {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
  }

  .date-filters {
    flex-direction: column;
    gap: 15px;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }

  .settlements-grid {
    grid-template-columns: 1fr;
  }

  .orders-table {
    font-size: 0.8em;
  }

  .orders-table th,
  .orders-table td {
    padding: 8px;
  }
}
</style>
