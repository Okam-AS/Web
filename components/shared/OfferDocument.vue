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
                {{ priceLabel(monthlyVat) }}
              </td>
              <td v-if="hasOnetimeFees">
                {{ priceLabel(onetimeVat) }}
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
                <strong>{{ priceLabel(monthlyGross) }}</strong>
              </td>
              <td v-if="hasOnetimeFees">
                <strong>{{ priceLabel(onetimeGross) }}</strong>
              </td>
            </tr>
          </tfoot>
        </table>
        <div
          v-if="hasUnstatedTotal"
          class="unstated-total-note"
        >
          Denne ordren har linjer uten oppgitt pris. Summene kan derfor ikke settes opp, og vises som «—». Kontakt selgeren for komplett pris før du bestiller.
        </div>
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
// `priceLabel` in the template above is the GLOBAL MIXIN's (`plugins/global-mixin.js`), resolved off
// the component instance. Naming it here because the structure said otherwise: this file imported
// core's raw `priceLabel` from `~/core/helpers/tools` and never registered it in `methods`, and a
// Vue 2 template compiles with `with(this)` — a module-scope import is invisible to it. The import
// bound nothing. It read as a deliberate bypass of the absence gate and never was one, and the next
// reader would have re-derived that same wrong conclusion, so the import is gone and this says what
// actually resolves.
//
// What that buys this document: a fee nobody stated prints `—`, not `kr 0`. Core's raw helper
// answers "0" to any falsy amount, so under the import this template APPEARED to promise a customer
// a line item costing nothing. Pinned in `test/price-absence.test.js`.
//
// ---------------------------------------------------------------------------------------------
// THE TOTALS, AND WHY THEY REFUSE.
//
// The lines above were honest one at a time while the totals underneath them were not, and that
// combination is worse than either half alone. The old fold was
// `sum + (item.monthlyFee * item.quantity || 0)`: an unstated fee was added as NOTHING, so a
// document whose line said `—` printed a subtotal of `kr 499,00` — a partial sum wearing the label
// of a whole one. A reader who trusts the line has every reason to trust the total, and nothing on
// the page let them tell the two apart.
//
// THREE DEFENSIBLE ANSWERS, and they are different promises. (1) Total the stated lines and mark
// the sum partial. (2) Print the absence mark. (3) Refuse to total at all and say so. This document
// does (3), for two reasons. The bold "Totalt inkl. mva" is the figure a customer actually quotes
// and acts on, and there is no honest way to print a NUMBER there while a line is unpriced —
// marking a bold figure "partial" in small type beside it is the weakest form of honesty available.
// And (1) does not stay in one place: it cascades to the VAT and gross rows, in two columns, giving
// six spots that each have to carry the caveat and one of which will eventually lose it. Refusing
// collapses to a single rule that is either on or off for the whole column.
//
// Refusal alone would read as a broken renderer, so `hasUnstatedTotal` says out loud why the sums
// are missing. Withholding a figure and appearing to have LOST one are not the same message.
//
// THE ZERO IS NOT THE ABSENCE. `!0` is `true`, so `|| 0` cannot simply be swapped for another
// falsiness test: an included line deliberately priced at nothing is a claim somebody made, and its
// offer still totals. Only `isAmountStated` separates the three worlds.
//
// AND THE ROWS UNDERNEATH. Fixing only the subtotal is a trap: `null * 0.25` is `0` in JavaScript,
// so a subtotal that correctly answers `null` would feed a VAT row answering a confident `kr 0,00`,
// trading a partial sum for an outright false one. `scaledTotal` is why those rows are computeds
// now instead of arithmetic in the template. The one-time column had the identical defect and is
// fixed with it — it was never separately reported, only found by looking.

// The MONEY LABEL is not imported here on purpose. The template's `priceLabel` resolves to the
// market-driven mixin method in `plugins/global-mixin.js`, which reads the runtime market's
// currencyFormat; importing core's `priceLabel` directly would pin this document to whatever the
// global currency format happened to be set to. Only the absence helpers are imported, because they
// are market-independent — whether somebody stated a figure is not a question about currency.
import { isAmountStated, statedSum } from "~/utils/price";

// NORWEGIAN VAT, AND THIS DOCUMENT IS NORWEGIAN-ONLY BECAUSE OF IT.
//
// 25% is Norway's rate. It is hardcoded here, the template says "25% mva" in Norwegian beside it,
// and the surrounding document is Norwegian throughout ("Pris eks. mva.", "Totalt inkl. mva"). This
// is a sales offer produced by Okam for Norwegian merchants, not a merchant-facing screen that a
// Swiss venue reaches — see the merchant-facing VAT surfaces in pages/admin/, which take their rate
// from the store.
//
// It is named here rather than left as a bare 0.25 so that the market assumption is visible to the
// next reader instead of being discovered. If this document is ever put in front of a non-Norwegian
// merchant, this constant and the three literal Norwegian VAT strings in the template above must
// move to the market row together — changing one without the others produces a document that
// computes one rate and prints another, which is worse than the present honest single-market form.
const VAT_RATE = 0.25;

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
      return this.statedColumnTotal("monthlyFee");
    },
    totalOnetimeFee() {
      return this.statedColumnTotal("onetimeFee");
    },
    monthlyVat() {
      return this.scaledTotal(this.totalMonthlyFee, VAT_RATE);
    },
    monthlyGross() {
      return this.scaledTotal(this.totalMonthlyFee, 1 + VAT_RATE);
    },
    onetimeVat() {
      return this.scaledTotal(this.totalOnetimeFee, VAT_RATE);
    },
    onetimeGross() {
      return this.scaledTotal(this.totalOnetimeFee, 1 + VAT_RATE);
    },
    // Only a column the document actually RENDERS can be missing a total the reader can see. A
    // refused one-time total on an offer with no one-time column at all is not a hole in anything.
    hasUnstatedTotal() {
      return (
        (this.hasMonthlyFees && !isAmountStated(this.totalMonthlyFee)) ||
        (this.hasOnetimeFees && !isAmountStated(this.totalOnetimeFee))
      );
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
    // One column's total: fee × quantity per line, folded with the SHARED `statedSum`, which
    // answers `null` the moment any addend is unstated (`~/utils/price`, owned by the same rule
    // that gates the formatter). The multiplication has to be gated out here rather than inside
    // that helper, because `statedSum` adds — `49900 * undefined` is already NaN by the time a sum
    // could notice, which is the same hole from the QUANTITY side and the reason a line can show
    // `kr 499,00` while contributing nothing to the figure below it.
    statedColumnTotal(field) {
      const lineTotals = this.offerProposal.lineItems.map((item) => {
        if (!isAmountStated(item[field]) || !isAmountStated(item.quantity)) {
          return null;
        }
        return Number(item[field]) * Number(item.quantity);
      });
      return statedSum(...lineTotals);
    },
    // `null * 0.25` is 0, so the VAT and gross rows cannot simply multiply a refused subtotal
    // without turning a withheld figure back into a confident zero.
    scaledTotal(total, factor) {
      return isAmountStated(total) ? total * factor : null;
    },
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

.unstated-total-note {
  font-size: 13px;
  line-height: 1.5;
  color: #742a2a;
  background-color: #fff5f5;
  border: 1px solid #feb2b2;
  border-radius: 4px;
  padding: 12px;
  margin-top: 15px;
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
