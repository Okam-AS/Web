<template>
  <div class="offer-container">
    <div
      v-if="offerProposal"
      class="offer-proposal"
    >
      <OfferDocument :offer-proposal="offerProposal">
        <div
          v-if="!offerProposal.accepted"
          class="document-section acceptance"
        >
          <div
            v-if="!verificationSent"
            class="acceptance-container"
          >
            <div class="acceptance-checkbox">
              <label
                class="checkbox-container"
                for="accept-terms-confirm"
              >
                <input
                  id="accept-terms-confirm"
                  v-model="termsAccepted"
                  type="checkbox"
                  @change="showTermsWarning = false"
                />
                <span class="checkmark" />
                <span class="acceptance-text">
                  Jeg bekrefter at jeg har lest gjennom ordren og forstått
                  <a
                    href="#"
                    class="terms-link"
                    @click.prevent="showTermsModal = true"
                    >Okam AS sine avtalevilkår</a
                  >.
                </span>
              </label>
            </div>

            <button
              class="btn-approve"
              :disabled="isSubmitting"
              @click="termsAccepted ? sendVerification() : (showTermsWarning = true)"
            >
              Bekreft
            </button>

            <div
              v-if="showTermsWarning"
              class="terms-warning"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                />
                <line
                  x1="12"
                  y1="8"
                  x2="12"
                  y2="12"
                />
                <line
                  x1="12"
                  y1="16"
                  x2="12.01"
                  y2="16"
                />
              </svg>
              <span>Du må godta vilkårene og betingelsene før du kan fortsette</span>
            </div>
            <div
              v-if="showError"
              class="error-message"
            >
              {{ errorMessage }}
            </div>
          </div>
          <div
            v-else
            class="verification-step"
          >
            <div class="verification-header">
              <div class="verification-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="32"
                  height="32"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div class="verification-title">
                <h3>Siste steg: Bekreft med SMS-kode</h3>
                <p>
                  Vi har sendt en verifiseringskode til <strong>{{ offerProposal.clientPhoneNumber }}</strong>
                </p>
              </div>
            </div>

            <div class="verification-body">
              <div class="code-input-container">
                <label for="verification-code">Skriv inn koden fra SMS:</label>
                <input
                  id="verification-code"
                  v-model="verificationCode"
                  type="text"
                  placeholder="Skriv inn 6-sifret kode"
                  maxlength="6"
                  class="verification-code-input"
                />
              </div>

              <div class="verification-actions">
                <button
                  class="btn-verify"
                  :disabled="!verificationCode || isSubmitting"
                  @click="acceptOffer"
                >
                  <span class="btn-text">Fullfør</span>
                  <span class="btn-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <line
                        x1="5"
                        y1="12"
                        x2="19"
                        y2="12"
                      />
                      <polyline points="12 5 19 12 12 19" />
                    </svg>
                  </span>
                </button>

                <div class="resend-container">
                  <span>Ikke mottatt kode?</span>
                  <button
                    class="btn-resend"
                    :disabled="isSubmitting"
                    @click="sendVerification"
                  >
                    Send kode på nytt
                  </button>
                </div>
                <div
                  v-if="showError"
                  class="error-message"
                >
                  {{ errorMessage }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="document-section acceptance-confirmed"
        >
          <div class="success-message">
            <h2>Ordren er bekreftet!</h2>
            <p>Vi vil kontakte deg snart for å starte prosessen.</p>
          </div>
        </div>
      </OfferDocument>
    </div>

    <div
      v-else-if="loading"
      class="loading-container"
    >
      <Loading />
    </div>

    <div
      v-else-if="error"
      class="error-container"
    >
      <h2>Tilbudet er utløpt</h2>
      <p>Vennligst kontakt oss for å få et nytt tilbud.</p>
    </div>

    <!-- Terms Modal -->
    <TermsModal
      :is-visible="showTermsModal"
      @close="showTermsModal = false"
    />
  </div>
</template>

<script>
import Loading from "~/components/atoms/Loading.vue";
import TermsModal from "~/components/modals/TermsModal.vue";
import OfferDocument from "~/components/shared/OfferDocument.vue";

export default {
  components: {
    Loading,
    TermsModal,
    OfferDocument,
  },
  data() {
    return {
      offerProposal: null,
      loading: true,
      error: false,
      termsAccepted: false,
      showTermsWarning: false,
      showTermsModal: false,
      verificationSent: false,
      verificationCode: "",
      isSubmitting: false,
      errorMessage: "",
      showError: false,
    };
  },
  computed: {
    totalMonthlyFee() {
      if (!this.offerProposal || !this.offerProposal.lineItems) {
        return 0;
      }
      return this.offerProposal.lineItems.reduce((total, item) => {
        return total + item.monthlyFee * item.quantity;
      }, 0);
    },
    totalOnetimeFee() {
      if (!this.offerProposal || !this.offerProposal.lineItems) {
        return 0;
      }
      return this.offerProposal.lineItems.reduce((total, item) => {
        return total + item.onetimeFee * item.quantity;
      }, 0);
    },
    hasMonthlyFees() {
      return this.totalMonthlyFee > 0;
    },
    hasOnetimeFees() {
      return this.totalOnetimeFee > 0;
    },
    isExpiryClose() {
      if (!this.offerProposal || !this.offerProposal.expiration) {
        return false;
      }
      const expiryDate = new Date(this.offerProposal.expiration);
      const now = new Date();
      const daysUntilExpiry = Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 3 && daysUntilExpiry >= 0;
    },
  },
  // Fallback to mounted hook for client-side fetching if needed
  async mounted() {
    // If we already have data from asyncData, don't fetch again
    if (this.offerProposal || this.error) {
      return;
    }

    try {
      // Get the code from the route params
      const code = this.$route.params.code;

      if (!code) {
        this.error = "Ingen ordrenummer oppgitt";
        this.loading = false;
        return;
      }

      // Fetch the offer proposal using the service from the global mixin
      const response = await this._offerProposalService.GetByCode(code);
      this.offerProposal = response;

      // Mark the offer as read
      if (response && response.offerProposalId) {
        await this._offerProposalService.MarkAsRead(response.offerProposalId);
      }
    } catch (error) {
      console.error("Error fetching offer proposal:", error);
      this.error = error.message || "Kunne ikke laste ordren";
    } finally {
      this.loading = false;
    }
  },
  methods: {
    formatDate(date) {
      if (!date) {
        return "";
      }
      const d = new Date(date);
      return `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getFullYear()}`;
    },
    getExpiryDate() {
      // Return a date 3 months from now
      const date = new Date();
      date.setMonth(date.getMonth() + 3);
      return date;
    },
    async sendVerification() {
      if (!this.termsAccepted || this.isSubmitting) {
        return;
      }

      this.isSubmitting = true;
      this.showError = false;
      try {
        const model = {
          phoneNumber: this.offerProposal.clientPhoneNumber.replace(/\s/g, ''),
        };

        const success = await this._offerProposalService.SendVerificationToken(this.offerProposal.offerProposalId, model);

        if (success) {
          this.verificationSent = true;
        } else {
          this.errorMessage = "Kunne ikke sende verifiseringskode. Vennligst prøv igjen senere.";
          this.showError = true;
        }
      } catch (error) {
        this.errorMessage = error.message || "Kunne ikke sende verifiseringskode.";
        this.showError = true;
      } finally {
        this.scrollToBottom();
        this.isSubmitting = false;
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "smooth",
        });
      });
    },
    async acceptOffer() {
      if (!this.verificationCode || this.isSubmitting) {
        return;
      }

      this.isSubmitting = true;
      this.showError = false;
      try {
        const model = {
          phoneNumber: this.offerProposal.clientPhoneNumber.replace(/\s/g, ''),
          verificationCode: this.verificationCode,
        };

        const response = await this._offerProposalService.AcceptOfferWithVerification(this.offerProposal.offerProposalId, model);

        this.offerProposal = response;
      } catch (error) {
        this.scrollToBottom();
        console.error("Error accepting offer:", error);
        this.errorMessage = "Feil verifiseringskode. Vennligst prøv igjen.";
        this.showError = true;
      } finally {
        this.isSubmitting = false;
      }
    },
  },
};
</script>

<style scoped>
.offer-container {
  max-width: 1000px;
  margin: 40px auto;
  padding: 0 15px;
  font-family: "Helvetica Neue", Arial, sans-serif;
  background-color: #fff;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  overflow: hidden;
}

.offer-proposal {
  position: relative;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
}

.document-header {
  display: flex;
  flex-direction: column;
  padding: 30px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  position: relative;
}

.document-header:after {
  content: "";
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #28a745, #28a745);
}

.logo-area {
  margin-bottom: 20px;
}

.title-area {
  margin-bottom: 20px;
}

.title-area h1 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 32px;
  font-weight: 700;
}

.offer-subtitle {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.meta-area {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #666;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.document-content {
  padding: 30px;
}

.document-section {
  margin-bottom: 30px;
  padding: 25px;
  background-color: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.03);
}

.document-section h2 {
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 18px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
  position: relative;
}

.info-block {
  line-height: 1.6;
}

.line-items-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 15px;
}

.line-items-table th,
.line-items-table td {
  padding: 12px 15px;
  border-bottom: 1px solid #e0e0e0;
  text-align: left;
}

.line-items-table th:nth-child(3),
.line-items-table td:nth-child(3),
.line-items-table th:nth-child(4),
.line-items-table td:nth-child(4),
.line-items-table th:nth-child(5),
.line-items-table td:nth-child(5),
.line-items-table tfoot td:not(.total-label) {
  text-align: right;
}

.line-items-table thead th {
  background-color: #f8f9fa;
  font-weight: 600;
  color: #333;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.product-name {
  font-weight: 600;
  margin-bottom: 4px;
}

.product-description {
  font-size: 13px;
  color: #666;
}

.line-items-table tbody tr:hover {
  background-color: #f9f9f9;
}

.line-items-table tfoot {
  font-weight: normal;
}

.line-items-table tfoot tr {
  background-color: #f8f8f8;
}

.line-items-table tfoot .grand-total {
  font-size: 16px;
  background-color: #f0f0f0;
}

.total-label {
  text-align: right;
  font-weight: 500;
}

.payment-terms {
  margin-top: 15px;
  font-size: 14px;
  color: #555;
  text-align: right;
  font-style: italic;
}

.expiry-warning {
  color: #e74c3c;
  font-weight: bold;
}

.acceptance-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px 0 10px;
}

.acceptance-checkbox {
  margin-bottom: 30px;
  width: 100%;
  text-align: center;
}

.checkbox-container {
  display: flex;
  align-items: flex-start;
  position: relative;
  cursor: pointer;
  font-size: 16px;
  user-select: none;
}

.checkbox-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: relative;
  height: 24px;
  width: 24px;
  background-color: #fff;
  border: 2px solid #ddd;
  border-radius: 4px;
  margin-right: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox-container:hover input ~ .checkmark {
  border-color: #28a745;
  transform: scale(1.05);
}

.checkbox-container input:checked ~ .checkmark {
  background-color: #28a745;
  border-color: #28a745;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

.checkbox-container input:checked ~ .checkmark:after {
  display: block;
  width: 6px;
  height: 12px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  top: 50%;
  left: 50%;
  margin-top: -8px;
  margin-left: -3px;
}

.acceptance-text {
  color: #4a5568;
  font-weight: 500;
  line-height: 1.5;
}

.terms-link {
  color: #28a745;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.terms-link:hover {
  color: #218838;
  text-decoration: underline;
}

.btn-approve {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 18px 40px;
  font-size: 20px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  max-width: 280px;
  text-align: center;
  box-shadow: 0 6px 12px rgba(40, 167, 69, 0.3);
  position: relative;
  overflow: hidden;
  letter-spacing: 1px;
  text-transform: uppercase;
}

.btn-approve:before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0) 100%);
  transition: all 0.6s ease;
}

.btn-approve:hover {
  background-color: #218838;
  transform: translateY(-3px);
  box-shadow: 0 8px 15px rgba(40, 167, 69, 0.4);
}

.btn-approve:hover:before {
  left: 100%;
}

.btn-approve:active {
  transform: translateY(0);
  box-shadow: 0 4px 8px rgba(40, 167, 69, 0.3);
}

.btn-approve:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 8px rgba(108, 117, 125, 0.3);
}

.terms-warning {
  display: flex;
  align-items: center;
  margin-top: 15px;
  padding: 12px 18px;
  background-color: #fff8e1;
  border-left: 3px solid #ffc107;
  border-radius: 4px;
  color: #856404;
  font-size: 14px;
  animation: fadeIn 0.3s ease-in-out;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.terms-warning svg {
  margin-right: 8px;
  stroke: #ffc107;
}

.error-message {
  display: flex;
  align-items: center;
  margin-top: 15px;
  padding: 12px 18px;
  background-color: #fde7e9;
  border-left: 3px solid #e74c3c;
  border-radius: 4px;
  color: #e74c3c;
  font-size: 14px;
  animation: fadeIn 0.3s ease-in-out;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.loading-container,
.error-container {
  padding: 40px;
  text-align: center;
}

.error-container {
  color: #e74c3c;
}

.success-message {
  text-align: center;
  padding: 30px;
  background-color: #d4edda;
  border-radius: 5px;
  color: #155724;
}

.success-message h2 {
  color: #155724;
  border-bottom: none;
}

.success-message h2:after {
  display: none;
}

.verification-step {
  background-color: #f8fafc;
  border-radius: 8px;
  padding: 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  overflow: hidden;
  animation: fadeIn 0.4s ease-out;
  width: 100%;
  margin: 0;
  max-width: none;
}

.verification-header {
  display: flex;
  align-items: center;
  padding: 20px 25px;
  background: linear-gradient(135deg, #f1c40f, #f39c12);
  color: #333;
  text-align: center;
  justify-content: center;
  flex-direction: column;
  width: 100%;
  box-sizing: border-box;
}

.verification-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  margin-right: 0;
  margin-bottom: 15px;
  flex-shrink: 0;
}

.verification-icon svg {
  stroke: #333;
}

.verification-title {
  flex: 1;
  text-align: center;
  width: 100%;
}

.verification-title h3 {
  margin: 0 0 5px 0;
  font-size: 20px;
  font-weight: 600;
  color: #333;
  border-bottom: none;
}

.verification-title h3:after {
  display: none;
}

.verification-title p {
  margin: 0;
  font-size: 15px;
  opacity: 0.9;
}

.verification-body {
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  width: 100%;
  box-sizing: border-box;
}

.code-input-container {
  width: 100%;
  margin-bottom: 25px;
  text-align: center;
}

.code-input-container label {
  display: block;
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 500;
  color: #4a5568;
}

.verification-code-input {
  width: 100%;
  max-width: 300px;
  height: 50px;
  padding: 10px 15px;
  font-size: 20px;
  text-align: center;
  letter-spacing: 2px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background-color: white;
  transition: all 0.3s;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
}

.verification-code-input:focus {
  border-color: #28a745;
  box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.2);
  outline: none;
}

.verification-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.btn-verify {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 280px;
  background-color: #28a745;
  color: white;
  border: none;
  padding: 16px 30px;
  font-size: 18px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 10px rgba(40, 167, 69, 0.3);
  margin-bottom: 20px;
}

.btn-verify:hover {
  background-color: #218838;
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(40, 167, 69, 0.4);
}

.btn-verify:active {
  transform: translateY(0);
  box-shadow: 0 3px 6px rgba(40, 167, 69, 0.3);
}

.btn-verify:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  transform: none;
  box-shadow: 0 4px 8px rgba(108, 117, 125, 0.3);
}

.btn-text {
  margin-right: 10px;
}

.btn-icon {
  display: flex;
  align-items: center;
}

.resend-container {
  display: flex;
  align-items: center;
  margin-top: 10px;
  font-size: 14px;
  color: #4a5568;
}

.btn-resend {
  background: none;
  border: none;
  color: #28a745;
  font-weight: 600;
  padding: 0;
  margin-left: 8px;
  cursor: pointer;
  transition: color 0.2s;
  font-size: 14px;
}

.btn-resend:hover {
  color: #218838;
  text-decoration: underline;
}

.btn-resend:disabled {
  color: #95a5a6;
  cursor: not-allowed;
  text-decoration: none;
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

/* Add responsive styles for mobile */
@media (max-width: 768px) {
  .offer-container {
    margin: 0;
    padding: 0;
    box-shadow: none;
    border-radius: 0;
    max-width: 100%;
    width: 100%;
  }

  .document-header {
    padding: 20px 10px;
  }

  .document-content {
    padding: 10px;
  }

  .document-section {
    padding: 10px 0;
    margin-bottom: 15px;
    border-radius: 0;
    box-shadow: none;
    border-left: none;
    border-right: none;
  }

  .verification-header {
    padding: 15px 10px;
  }

  .verification-body {
    padding: 20px 10px;
  }

  .verification-title h3 {
    font-size: 18px;
  }

  .verification-title p {
    font-size: 14px;
  }

  .code-input-container label {
    font-size: 15px;
  }

  .verification-code-input {
    font-size: 18px;
  }

  .btn-verify,
  .btn-approve {
    font-size: 16px;
    padding: 14px 20px;
  }

  .checkbox-container {
    font-size: 14px;
  }

  .acceptance-container {
    padding: 20px 15px;
    width: 100%;
  }

  .acceptance-checkbox {
    width: 100%;
    text-align: left;
    padding: 0 5px;
  }

  .checkbox-container {
    font-size: 14px;
    display: flex;
    align-items: flex-start;
  }

  .acceptance-text {
    line-height: 1.4;
  }

  .checkmark {
    flex-shrink: 0;
  }

  .terms-warning,
  .error-message {
    font-size: 13px;
    padding: 10px 15px;
  }
}
</style>
