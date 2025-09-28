<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <h1 class="heading-1 u-center">Registrer din butikk</h1>

          <!-- Login Status Bar -->
          <div
            v-if="userIsLoggedIn"
            class="login-status"
          >
            <span class="status-icon">✓</span>
            <span>Admin: {{ user.phoneNumber }}</span>
            <button
              class="logout-btn"
              @click="logout"
            >
              Bytt nummer
            </button>
          </div>

          <!-- Login Required Message -->
          <div
            v-if="!userIsLoggedIn"
            class="login-section"
          >
            <div class="login-form">
              <div v-if="showPhoneInput">
                <div class="field-group">
                  <label class="field-label">Telefonnummer</label>
                  <div class="phone-input">
                    <input
                      type="text"
                      :value="landcode"
                      class="landcode"
                      readonly
                    />
                    <input
                      v-model="phoneNumber"
                      type="tel"
                      maxlength="8"
                      placeholder="Skriv inn telefonnummer"
                      @input="errorMessage = ''"
                    />
                  </div>
                </div>
                <button
                  class="cta-link"
                  :class="{ 'disabled-btn': !phoneNumberIsValid() || isLoading }"
                  @click="sendTokenTap"
                >
                  Send meg engangskode på SMS
                </button>
              </div>

              <div v-else>
                <div class="field-group">
                  <label class="field-label">Engangskode</label>
                  <OtpInput
                    :loading="isLoading"
                    @complete="verifyTokenTap"
                  />
                  <p class="sent-confirmation">Engangskode sendt til {{ landcode }}{{ phoneNumber }}</p>
                </div>
                <button
                  class="cta-link secondary"
                  @click="tryAgainTap"
                >
                  Endre telefonnummer
                </button>
              </div>

              <p
                v-if="errorMessage"
                class="error-text"
              >
                {{ errorMessage }}
              </p>
            </div>
          </div>

          <!-- Registration Form -->
          <div
            v-else-if="!messageSent"
            class="registration-form"
          >
            <!-- Error Message -->
            <div
              v-if="errorMessage"
              class="error-message"
            >
              <p>{{ errorMessage }}</p>
            </div>

            <!-- Loading Overlay -->
            <div
              v-if="isRegistering"
              class="loading-overlay"
            >
              <div class="loading-spinner" />
              <div class="loading-message">Registrerer butikk...</div>
            </div>

            <!-- VAT Number Section -->
            <div
              v-if="!validVat && !isLoading"
              class="form-section"
            >
              <div class="field-group">
                <div class="field-header">
                  <label class="field-label">Organisasjonsummer</label>
                  <span
                    class="help-icon"
                    @click="showHelp('Skriv inn organisasjonsummeret til butikken du ønsker å registrere')"
                    >?</span
                  >
                </div>
                <input
                  v-model="vatNumber"
                  :class="{ error: fieldsWithErrors.includes('vatNumber') }"
                  type="text"
                  maxlength="9"
                  placeholder="987654321"
                  @input="clearFieldError('vatNumber')"
                />
              </div>
              <span
                v-if="fieldsWithErrors.includes('vatNumber')"
                class="error-text"
              >
                Skriv inn et gyldig organisasjonsummer
              </span>
              <button
                class="cta-link"
                :class="{ 'disabled-btn': isLoading }"
                @click="validateVat"
              >
                Fortsett
              </button>
            </div>

            <!-- Store Details Section -->
            <div
              v-if="validVat && !isLoading"
              class="form-section"
            >
              <div class="field-group">
                <label class="field-label">Visningsnavn (vises til kundene)</label>
                <input
                  v-model="displayName"
                  :class="{ 'input-field': true, error: fieldsWithErrors.includes('displayName') }"
                  type="text"
                  maxlength="30"
                  @input="clearFieldError('displayName')"
                />
              </div>

              <div class="field-group">
                <label class="field-label">Selskapsnavn (juridisk navn)</label>
                <input
                  v-model="legalName"
                  :class="{ 'input-field': true, error: fieldsWithErrors.includes('legalName') }"
                  type="text"
                  maxlength="50"
                  @input="clearFieldError('legalName')"
                />
              </div>

              <div class="field-group">
                <label class="field-label">Hentested for bestillinger</label>
                <input
                  v-model="address"
                  placeholder="Gateadresse"
                  type="text"
                  :class="{ error: fieldsWithErrors.includes('address') }"
                  @input="clearFieldError('address')"
                />
              </div>

              <div class="field-group address-fields">
                <input
                  v-model="zipCode"
                  placeholder="Postnummer"
                  type="text"
                  maxlength="4"
                  :class="{ error: fieldsWithErrors.includes('zipCode') }"
                  @input="clearFieldError('zipCode')"
                />
                <input
                  v-model="city"
                  placeholder="Sted"
                  type="text"
                  :class="{ error: fieldsWithErrors.includes('city') }"
                  @input="clearFieldError('city')"
                />
              </div>

              <div class="terms-section">
                <label class="terms-label">
                  <input
                    v-model="acceptedTerms"
                    type="checkbox"
                    class="checkbox-input"
                    @change="clearFieldError('acceptedTerms')"
                  />
                  <span class="terms-text">
                    Jeg har lest og aksepterer
                    <a
                      href="#"
                      class="terms-link"
                      @click.prevent="showTerms"
                      >vilkårene</a
                    >
                  </span>
                </label>
                <span
                  v-if="fieldsWithErrors.includes('acceptedTerms')"
                  class="error-text"
                >
                  Vilkårene må aksepteres
                </span>
              </div>

              <button
                class="cta-link"
                :class="{ 'disabled-btn': isLoading || isRegistering }"
                @click="registerStore"
              >
                Registrer
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Flyttet utenfor article og wrapper -->
      <div class="admin-login-prompt">
        <p>Er du allerede registrert?</p>
        <a
          href="/admin"
          target="_blank"
          class="admin-link"
        >
          Logg inn til Admin Panel her
        </a>
      </div>
    </main>
    <page-footer />
  </div>
</template>

<script>
import PageHeader from "@/components/organisms/PageHeader.vue";
import PageFooter from "@/components/organisms/PageFooter.vue";
import OtpInput from "@/components/atoms/OtpInput.vue";

export default {
  components: { PageHeader, PageFooter, OtpInput },
  data: () => ({
    isRegistering: false,
    isLoading: false,
    validVat: "",
    errorMessage: "",
    fieldsWithErrors: [],
    vatNumber: "",
    displayName: "",
    legalName: "",
    address: "",
    zipCode: "",
    city: "",
    acceptedTerms: false,
    messageSent: false,
    showPhoneInput: true,
    landcode: "+47",
    phoneNumber: "",
    token: "",
  }),
  computed: {
    userIsLoggedIn() {
      return this.$store.getters.userIsLoggedIn;
    },
    user() {
      return this.$store.state.currentUser;
    },
  },
  methods: {
    clearFieldError(field) {
      this.fieldsWithErrors = this.fieldsWithErrors.filter((f) => f !== field);
      this.errorMessage = "";
    },

    showHelp(message) {
      alert(message);
    },

    async validateVat() {
      const trimmedVatNumber = this.vatNumber.trim().replace(/\D/g, "");
      if (trimmedVatNumber.length !== 9) {
        this.fieldsWithErrors.push("vatNumber");
        return;
      }
      this.vatNumber = trimmedVatNumber;
      this.isLoading = true;
      try {
        const brregData = await this._storeService.GetBrregData(this.vatNumber);
        this.validVat = this.vatNumber;
        // Pre-fill company details from Brreg
        this.legalName = brregData.name;
        this.address = brregData.fullAddress;
        this.zipCode = brregData.zipCode;
        this.city = brregData.city;
      } catch (error) {
        this.errorMessage = "Kunne ikke validere organisasjonsnummer";
        this.fieldsWithErrors.push("vatNumber");
      } finally {
        this.isLoading = false;
      }
    },

    showTerms() {
      window.open("/vilkar", "_blank");
    },

    async registerStore() {
      // Validate fields
      if (!this.displayName) {
        this.fieldsWithErrors.push("displayName");
      }
      if (!this.legalName) {
        this.fieldsWithErrors.push("legalName");
      }
      if (!this.address) {
        this.fieldsWithErrors.push("address");
      }
      if (!this.zipCode || this.zipCode.length !== 4) {
        this.fieldsWithErrors.push("zipCode");
      }
      if (!this.city) {
        this.fieldsWithErrors.push("city");
      }
      if (!this.acceptedTerms) {
        this.fieldsWithErrors.push("acceptedTerms");
      }

      if (this.fieldsWithErrors.length > 0) {
        return;
      }

      this.isRegistering = true;
      try {
        await this._storeService.Register(this.displayName, this.legalName, parseInt(this.vatNumber), this.address, this.zipCode, this.city, this.acceptedTerms);
        await this._userService.Reload();

        // Reset onboarding state and set to the last store in the list
        localStorage.removeItem("onboardingInProgress");

        // Navigate to onboarding page
        this.$router.push("/admin/onboarding");
      } catch (error) {
        this.errorMessage = "Noe gikk galt ved registrering. Vennligst ring oss på 98865120 så kan vi hjelpe med registrering.";
        this.isRegistering = false;
      }
    },

    logout() {
      if (confirm("Er du sikker på at du ønsker å registrere butikken på et annet telefonnummer? Alle felter må fylles på nytt.")) {
        this._userService.Logout();
        this.resetForm();
      }
    },

    resetForm() {
      this.vatNumber = "";
      this.validVat = "";
      this.displayName = "";
      this.legalName = "";
      this.address = "";
      this.zipCode = "";
      this.city = "";
      this.acceptedTerms = false;
      this.fieldsWithErrors = [];
      this.errorMessage = "";
    },

    phoneNumberIsValid() {
      return this.phoneNumber && this.phoneNumber.length === 8 && parseInt(this.phoneNumber) > 40000000;
    },

    async sendTokenTap() {
      if (!this.phoneNumberIsValid()) {
        this.errorMessage = "Ugyldig telefonnummer";
        return;
      }

      this.isLoading = true;
      try {
        const success = await this._userService.SendVerificationToken(this.landcode + this.phoneNumber.replace(/\s/g, ''));

        if (!success) {
          this.errorMessage = "Kunne ikke sende SMS. Prøv igjen senere.";
          return;
        }

        this.showPhoneInput = false;
      } finally {
        this.isLoading = false;
      }
    },

    async verifyTokenTap(code) {
      if (!code) {
        this.errorMessage = "Ugyldig kode";
        return;
      }

      this.isLoading = true;
      try {
        const success = await this._userService.LoginAdmin(this.landcode + this.phoneNumber.replace(/\s/g, ''), code);

        if (!success) {
          this.errorMessage = "Ugyldig kode";
          return;
        }
      } catch (error) {
        this.errorMessage = "Ugyldig kode";
        return;
      } finally {
        this.isLoading = false;
      }
    },

    tryAgainTap() {
      this.showPhoneInput = true;
      this.token = "";
      this.errorMessage = "";
    },
  },
};
</script>

<style lang="scss" scoped>
.registration-form {
  max-width: 600px;
  margin: 0 auto;
  padding: 0 20px;
  position: relative; /* Add this to make the absolute positioning of the overlay work */
}

.form-section {
  margin-top: 20px;
}

.field-group {
  margin-bottom: 24px;

  // For address fields that are in a row
  &.address-fields {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    gap: 12px;

    @media (max-width: 600px) {
      grid-template-columns: 1fr;
    }
  }
}

.field-header {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.field-label {
  margin-bottom: 0;
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

// Base input styles
%input-base {
  width: 100%;
  padding: 14px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  line-height: 1.5;
  transition: all 0.2s ease;
  background: #fff;
  color: #333;
  -webkit-appearance: none;

  &::placeholder {
    color: #9e9e9e;
  }

  &:hover {
    border-color: #bdbdbd;
  }

  &:focus {
    outline: none;
    border-color: #1bb776;
    box-shadow: 0 2px 4px rgba(27, 183, 118, 0.1);
  }

  &.error {
    border-color: #ed5e68;
    background-color: #fff;

    &:focus {
      box-shadow: 0 2px 4px rgba(237, 94, 104, 0.1);
    }
  }
}

// Apply base styles to all inputs
input[type="text"],
input[type="email"],
input[type="number"],
.input-field {
  @extend %input-base;
}

.error-text {
  color: #ed5e68;
  font-size: 14px;
  margin-top: 8px;
  display: block;
}

.error-message {
  background: #ffebee;
  padding: 16px;
  margin-bottom: 24px;
  border-radius: 8px;
  border: 1px solid rgba(237, 94, 104, 0.3);
  color: #d32f2f;
}

.terms-section {
  margin: 32px 0;
}

.terms-label {
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  padding: 4px 0;
}

.checkbox-input {
  margin: 3px 12px 0 0;
  width: 20px;
  height: 20px;
  cursor: pointer;
  border: 2px solid #e0e0e0;
  border-radius: 4px;

  &:checked {
    border-color: #1bb776;
    background-color: #1bb776;
  }
}

.terms-text {
  font-size: 16px;
  line-height: 1.5;
  color: #424242;
}

.terms-link {
  color: #1bb776;
  text-decoration: none;
  font-weight: 600;

  &:hover {
    text-decoration: underline;
  }
}

.cta-link {
  width: 100%;
  background: #1bb776;
  color: white;
  padding: 16px 24px;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 16px;

  &:hover {
    background: #169c64;
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  &:active {
    transform: translateY(0);
    box-shadow: none;
  }

  &.disabled-btn {
    opacity: 0.7;
    pointer-events: none;
    background: #9e9e9e;
  }
}

.help-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f5f5f5;
  color: #757575;
  font-size: 14px;
  margin-left: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid #e0e0e0;

  &:hover {
    background: #eeeeee;
    color: #424242;
  }
}

// Loading state
.isLoading {
  opacity: 0.7;
  pointer-events: none;
}

.login-status {
  background: #d5f6e5;
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 560px;
  margin: 0 auto 24px;

  .status-icon {
    color: #1bb776;
    font-weight: bold;
  }

  .logout-btn {
    margin-left: auto;
    background: none;
    border: none;
    color: #1bb776;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 14px;

    &:hover {
      text-decoration: underline;
    }
  }
}

.login-section {
  max-width: 400px;
  margin: 0 auto;
  padding: 40px 20px;

  .heading-2 {
    text-align: center;
    margin-bottom: 32px;
    font-size: 24px;
    color: #333;
  }
}

.login-form {
  max-width: 560px;
  margin: 0 auto;
  padding: 0 20px;

  .phone-input {
    display: flex;
    gap: 12px;
    width: 100%;

    .landcode {
      width: 60px;
      @extend %input-base;
      background: #f5f5f5;
      color: #666;
      text-align: center;
      cursor: not-allowed;
      padding: 14px 8px;
    }

    input:not(.landcode) {
      flex: 1;
      @extend %input-base;
    }
  }

  input[type="text"] {
    @extend %input-base;
  }

  .secondary {
    background: #f5f5f5;
    color: #333;
    margin-top: 12px;

    &:hover {
      background: #e0e0e0;
    }
  }

  .field-group {
    margin-bottom: 24px;
  }

  .error-text {
    color: #ed5e68;
    font-size: 14px;
    margin-top: 8px;
    display: block;
  }
}

.success-message {
  text-align: center;
  padding: 40px 20px;
  max-width: 560px;
  margin: 0 auto;

  .success-content {
    background: #d5f6e5;
    padding: 32px;
    border-radius: 8px;
  }

  p {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }

  .sub-text {
    margin-top: 16px;
    font-size: 16px;
    font-weight: normal;
    color: #666;
  }

  .action-buttons {
    margin-top: 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;

    .cta-link {
      margin: 0;
      text-decoration: none;

      &.secondary {
        background: #f5f5f5;
        color: #333;

        &:hover {
          background: #e0e0e0;
        }
      }
    }
  }
}

.sent-confirmation {
  color: #666;
  font-size: 14px;
  margin-top: 8px;
}

// Add these styles at the bottom
.admin-login-prompt {
  text-align: center;
  padding: 40px 20px 40px;
  background: #f8f9fa;
  margin-top: 20px;
  position: relative;
  z-index: 0;
  margin-bottom: -20px;

  &::before {
    content: "";
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100vw;
    height: 100%;
    background: inherit;
    z-index: -1;
  }

  p {
    margin: 0 0 12px;
    color: #495057;
    font-size: 18px;
  }

  .admin-link {
    display: inline-block;
    color: #1bb776;
    font-weight: 600;
    font-size: 18px;
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 6px;
    transition: all 0.2s ease;

    &:hover {
      background: rgba(27, 183, 118, 0.1);
      transform: translateY(-1px);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  z-index: 1;

  .loading-spinner {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 4px solid #1bb776;
    border-top-color: transparent;
    animation: spin 1s linear infinite;
  }

  .loading-message {
    font-size: 18px;
    font-weight: 600;
    color: #333;
    margin-top: 16px;
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
