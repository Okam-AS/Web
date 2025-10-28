<template>
  <AdminPage>
    <div class="dinehome-page">
      <h2>Wolt Kalkulator</h2>

      <div
        v-if="isKeyAccountManager || isPowerUser"
        class="wolt-calc-container"
      >
        <div class="wolt-calc-form-container">
          <form class="wolt-calc-form">
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
import LoginModal from "~/components/molecules/LoginModal.vue";

export default {
  components: { AdminPage, LoginModal },
  data: () => ({
    showLogin: false,
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
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
    }
  },
  methods: {
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
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

  h2 {
    margin-bottom: 24px;
    color: #292c34;
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

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
