<template>
  <div>
    <div class="document-header">
      <div class="title-area">
        <h1>Ordrebekreftelse</h1>
        <p class="offer-subtitle">Vennligst kontrollér ordren</p>
      </div>
      <div class="meta-area">
        <div class="offer-code">Ordrenummer: {{ offerProposal.code }}</div>
        <div
          class="offer-expiry"
          :class="{ 'expiry-warning': isExpiryClose }"
        >
          Gyldig til: {{ formatDate(offerProposal.expiration) }}
        </div>
      </div>
    </div>

    <div class="document-content">
      <div class="document-section client-info-row">
        <div class="client-info">
          <h2>Fakturaadresse</h2>
          <div class="info-block">
            <div>{{ offerProposal.companyLegalName }}</div>
            <div>Org.nr: {{ offerProposal.companyVAT }}</div>
            <br />
            <div>{{ offerProposal.companyFullAddress }}</div>
            <div>{{ offerProposal.companyZipCode }} {{ offerProposal.companyCity }}</div>
          </div>
        </div>

        <div class="contact-info">
          <h2>Kontaktperson</h2>
          <div class="info-block">
            <div>{{ offerProposal.clientName }}</div>
            <div v-if="offerProposal.clientEmail">
              {{ offerProposal.clientEmail }}
            </div>
            <div v-if="offerProposal.clientPhoneNumber">
              {{ offerProposal.clientPhoneNumber }}
            </div>
          </div>
        </div>

        <div class="company-info">
          <h2>Okam AS</h2>
          <div class="info-block">
            <div>Org.nr: 925 024 414</div>
            <div>Din selger: {{ offerProposal.sellerName }}</div>
          </div>
        </div>
      </div>

      <div class="document-section line-items">
        <h2>Produkter og tjenester</h2>
        <table class="line-items-table">
          <thead>
            <tr>
              <th colspan="2">PRODUKT</th>
              <th>ANTALL</th>
              <th v-if="hasMonthlyFees">MÅNEDLIG</th>
              <th v-if="hasOnetimeFees">OPPSTART</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in offerProposal.lineItems"
              :key="index"
            >
              <td colspan="2">
                <div class="product-name">
                  {{ item.name }}
                </div>
                <div class="product-description">
                  {{ item.description || "-" }}
                </div>
              </td>
              <td>{{ item.quantity }}</td>
              <td v-if="hasMonthlyFees">
                {{ priceLabel(item.monthlyFee) }}
              </td>
              <td v-if="hasOnetimeFees">
                {{ priceLabel(item.onetimeFee) }}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="subtotal">
              <td
                :colspan="3"
                class="total-label"
              >
                Pris eks. mva.
              </td>
              <td v-if="hasMonthlyFees">
                {{ priceLabel(totalMonthlyFee) }}
              </td>
              <td v-if="hasOnetimeFees">
                {{ priceLabel(totalOnetimeFee) }}
              </td>
            </tr>
            <tr class="vat">
              <td
                :colspan="3"
                class="total-label"
              >
                25% mva
              </td>
              <td v-if="hasMonthlyFees">
                {{ priceLabel(totalMonthlyFee * 0.25) }}
              </td>
              <td v-if="hasOnetimeFees">
                {{ priceLabel(totalOnetimeFee * 0.25) }}
              </td>
            </tr>
            <tr class="total">
              <td
                :colspan="3"
                class="total-label"
              >
                <strong>Totalt inkl. mva</strong>
              </td>
              <td v-if="hasMonthlyFees">
                <strong>{{ priceLabel(totalMonthlyFee * 1.25) }}</strong>
              </td>
              <td v-if="hasOnetimeFees">
                <strong>{{ priceLabel(totalOnetimeFee * 1.25) }}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
        <div class="payment-terms">Månedskostnader faktureres den 1. hver måned. Engangskostnader faktureres 100% ved levering. Betalingsfrist 14 dager.</div>
      </div>

      <div
        v-if="offerProposal.notes"
        class="document-section notes"
      >
        <h2>Notater</h2>
        <p>{{ offerProposal.notes }}</p>
      </div>

      <!-- Slot for acceptance section or other custom content -->
      <slot />
    </div>
  </div>
</template>

<script>
import { priceLabel } from "@/core/helpers/tools";

export default {
  name: "OfferDocument",
  props: {
    offerProposal: {
      type: Object,
      required: true,
    },
  },
  computed: {
    hasMonthlyFees() {
      return this.offerProposal.lineItems.some((item) => item.monthlyFee > 0);
    },
    hasOnetimeFees() {
      return this.offerProposal.lineItems.some((item) => item.onetimeFee > 0);
    },
    totalMonthlyFee() {
      return this.offerProposal.lineItems.reduce((sum, item) => {
        return sum + (item.monthlyFee * item.quantity || 0);
      }, 0);
    },
    totalOnetimeFee() {
      return this.offerProposal.lineItems.reduce((sum, item) => {
        return sum + (item.onetimeFee * item.quantity || 0);
      }, 0);
    },
    isExpiryClose() {
      if (!this.offerProposal.expiration) {
        return false;
      }
      const expiry = new Date(this.offerProposal.expiration);
      const now = new Date();
      const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
      return diffDays <= 3 && diffDays >= 0;
    },
  },
  methods: {
    formatDate(dateString) {
      if (!dateString) {
        return "-";
      }
      const date = new Date(dateString);
      return date.toLocaleDateString("nb-NO", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    },
  },
};
</script>

<style scoped>
.document-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  background-color: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  text-align: center;
}

.title-area h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
  color: #2d3748;
}

.offer-subtitle {
  font-size: 16px;
  color: #4a5568;
  margin: 5px 0 0;
}

.meta-area {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.offer-code {
  font-size: 14px;
  color: #4a5568;
}

.offer-expiry {
  font-size: 14px;
  color: #4a5568;
}

.expiry-warning {
  color: #e53e3e;
  font-weight: 600;
}

.document-content {
  padding: 30px;
}

.document-section {
  margin-bottom: 40px;
}

.document-section h2 {
  font-size: 20px;
  font-weight: 600;
  color: #2d3748;
  margin: 0 0 15px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e2e8f0;
  position: relative;
}

.client-info-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.client-info {
  flex: 1;
}

.contact-info {
  flex: 1;
}

.company-info {
  flex: 1;
  text-align: right;
}

.company-info .info-block {
  text-align: right;
}

.info-block {
  font-size: 14px;
  line-height: 1.5;
  color: #4a5568;
}

.line-items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}

.line-items-table th {
  background-color: #f8fafc;
  padding: 12px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: #4a5568;
  border-bottom: 1px solid #e2e8f0;
}

.line-items-table td {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
  color: #4a5568;
  word-break: break-word;
}

.product-name {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 5px;
}

.product-description {
  font-size: 13px;
  color: #718096;
}

.line-items-table th:nth-child(3),
.line-items-table td:nth-child(3),
.line-items-table th:nth-child(4),
.line-items-table td:nth-child(4),
.line-items-table th:nth-child(5),
.line-items-table td:nth-child(5),
.line-items-table tfoot td:not(.total-label) {
  text-align: right;
  white-space: nowrap;
}

.line-items-table tfoot td {
  padding: 12px;
  font-size: 14px;
  color: #4a5568;
}

.total-label {
  text-align: right;
}

.subtotal td,
.vat td {
  border-bottom: none;
  padding: 8px 12px;
}

.total td {
  border-top: 1px solid #e2e8f0;
  padding: 12px;
}

.payment-terms {
  font-size: 13px;
  color: #718096;
  margin-top: 15px;
  font-style: italic;
}

.notes p {
  font-size: 14px;
  line-height: 1.6;
  color: #4a5568;
  white-space: pre-line;
}

@media (max-width: 768px) {
  .client-info-row {
    flex-direction: column;
  }

  .client-info,
  .contact-info,
  .company-info {
    margin-bottom: 20px;
    text-align: left;
  }

  .company-info .info-block {
    text-align: left;
  }
  
  /* Improve table display on mobile */
  .line-items-table {
    width: 100%;
    margin-left: -15px;
    margin-right: -15px;
    width: calc(100% + 30px);
  }
  
  .line-items-table th,
  .line-items-table td {
    padding: 8px 5px;
    font-size: 13px;
  }
  
  .line-items-table th:first-child,
  .line-items-table td:first-child {
    padding-left: 15px;
  }
  
  .line-items-table th:last-child,
  .line-items-table td:last-child {
    padding-right: 15px;
  }
  
  .line-items-table th:nth-child(3),
  .line-items-table td:nth-child(3),
  .line-items-table th:nth-child(4),
  .line-items-table td:nth-child(4),
  .line-items-table th:nth-child(5),
  .line-items-table td:nth-child(5) {
    white-space: nowrap;
  }
  
  .product-name {
    font-size: 13px;
  }
  
  .product-description {
    font-size: 12px;
  }
  
  .document-section {
    padding: 10px 0;
    margin-bottom: 20px;
  }
  
  .document-content {
    padding: 10px;
  }
  
  .document-header {
    padding: 20px 10px;
  }
  
  .title-area h1 {
    font-size: 24px;
  }
  
  .offer-subtitle {
    font-size: 14px;
  }
  
  /* Adjust line items section */
  .line-items {
    padding: 10px 0 !important;
  }
  
  .line-items h2 {
    padding-left: 10px;
    padding-right: 10px;
  }
  
  .payment-terms {
    padding-left: 10px;
    padding-right: 10px;
  }
}
</style>
