<template>
  <div>
    <page-header />
    <main class="page-content">
      <div class="article">
        <div class="wrapper">
          <div class="page-header-section">
            <h1 class="heading-1 u-center">Registrer din butikk</h1>
            <p class="page-subtitle">Få i gang din digitale bestillingsløsning på få minutter</p>
          </div>

          <!-- Login Status Bar -->
          <div
            v-if="userIsLoggedIn"
            class="login-status"
          >
            <div class="login-status__icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span class="login-status__text">Innlogget som: <strong>{{ user.phoneNumber }}</strong></span>
            <button
              class="logout-btn"
              @click="logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
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

          <!-- Existing User Alert -->
          <div class="alert-banner alert-banner--info">
            <div class="alert-banner__icon">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
            </div>
            <div class="alert-banner__content">
              <h3 class="alert-banner__title">Er du allerede registrert?</h3>
              <p class="alert-banner__text">
                Hvis du allerede har en butikk registrert hos Okam, kan du logge inn her.
              </p>
              <a href="/admin" class="alert-banner__link">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                Gå til Admin Panel
              </a>
            </div>
          </div>
        </div>
      </div>

    </main>
    <page-footer />
  </div>
</template>

<script>
import PageHeader from "~/components/organisms/PageHeader.vue";
import PageFooter from "~/components/organisms/PageFooter.vue";
import OtpInput from "~/components/atoms/OtpInput.vue";

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
// Page Header Section
.page-header-section {
  text-align: center;
  margin-bottom: 2.5rem;
  animation: fadeIn 0.6s ease-out;

  .heading-1 {
    font-size: 2.5rem;
    font-weight: 800;
    color: #292c34;
    margin-bottom: 0.75rem;
    letter-spacing: -0.02em;

    @media (max-width: 768px) {
      font-size: 2rem;
    }
  }

  .page-subtitle {
    font-size: 1.125rem;
    color: #6b7280;
    font-weight: 400;
    margin: 0;
    max-width: 600px;
    margin-left: auto;
    margin-right: auto;

    @media (max-width: 768px) {
      font-size: 1rem;
    }
  }
}

// Alert Banner Styles
.alert-banner {
  display: flex;
  gap: 0.875rem;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  margin: 2.5rem auto 0;
  max-width: 500px;
  animation: slideUp 0.4s ease-out;

  &--info {
    background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
    border: 1px solid #d1d5db;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  }

  &__icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    border-radius: 10px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);

    svg {
      width: 22px;
      height: 22px;
      color: #6b7280;
    }
  }

  &__content {
    flex: 1;
  }

  &__title {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.375rem 0;
  }

  &__text {
    font-size: 0.875rem;
    color: #4b5563;
    margin: 0 0 0.75rem 0;
    line-height: 1.5;

    strong {
      font-weight: 600;
      color: #1f2937;
    }
  }

  &__link {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.5rem 1rem;
    background: #f3f4f6;
    color: #1f2937;
    text-decoration: none;
    border-radius: 6px;
    font-weight: 600;
    font-size: 0.875rem;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    border: 1px solid #e5e7eb;

    svg {
      width: 16px;
      height: 16px;
    }

    &:hover {
      background: #e5e7eb;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
    }

    &:active {
      transform: translateY(0);
    }
  }

  @media (max-width: 600px) {
    flex-direction: column;
    text-align: center;
    padding: 1rem;
    margin-top: 2rem;

    &__icon {
      margin: 0 auto;
    }

    &__link {
      width: 100%;
      justify-content: center;
    }
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.registration-form {
  max-width: 700px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  position: relative;
  animation: fadeIn 0.4s ease-out;

  @media (max-width: 600px) {
    padding: 1.5rem;
  }
}

.form-section {
  margin-top: 1.5rem;
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
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #374151;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
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
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  padding: 1rem 1.25rem;
  margin-bottom: 1.5rem;
  border-radius: 12px;
  border: 2px solid #ef4444;
  color: #991b1b;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
  animation: shake 0.5s;

  &::before {
    content: '⚠';
    font-size: 1.5rem;
    flex-shrink: 0;
  }
}

@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-4px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(4px);
  }
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
  background: linear-gradient(135deg, #1bb776 0%, #159b62 100%);
  color: white;
  padding: 1rem 1.5rem;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: 1rem;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  &:hover {
    background: linear-gradient(135deg, #169c64 0%, #138a56 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);

    &::before {
      width: 300px;
      height: 300px;
    }
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 8px rgba(27, 183, 118, 0.3);
  }

  &.disabled-btn {
    opacity: 0.6;
    pointer-events: none;
    background: linear-gradient(135deg, #9e9e9e 0%, #757575 100%);
    box-shadow: none;
    transform: none;
  }

  &.secondary {
    background: #f5f5f5;
    color: #333;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    &:hover {
      background: #e0e0e0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
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
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  padding: 1rem 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 1rem;
  max-width: 700px;
  margin: 0 auto 2rem;
  border: 2px solid #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
  animation: slideDown 0.4s ease-out;

  &__icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #10b981;
    border-radius: 10px;
    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);

    svg {
      width: 24px;
      height: 24px;
      color: white;
    }
  }

  &__text {
    flex: 1;
    color: #065f46;
    font-size: 0.95rem;
    font-weight: 500;

    strong {
      font-weight: 700;
      color: #047857;
    }
  }

  .logout-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: white;
    border: 2px solid #10b981;
    color: #10b981;
    cursor: pointer;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    svg {
      width: 16px;
      height: 16px;
    }

    &:hover {
      background: #10b981;
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    &:active {
      transform: translateY(0);
    }
  }

  @media (max-width: 600px) {
    flex-wrap: wrap;
    padding: 1rem;

    .logout-btn {
      width: 100%;
      justify-content: center;
    }
  }
}

.login-section {
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  animation: fadeIn 0.4s ease-out;

  .heading-2 {
    text-align: center;
    margin-bottom: 2rem;
    font-size: 1.5rem;
    font-weight: 700;
    color: #292c34;
  }

  @media (max-width: 600px) {
    padding: 1.5rem;
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.98);
  }
  to {
    opacity: 1;
    transform: scale(1);
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

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  z-index: 10;
  border-radius: 16px;
  animation: fadeIn 0.3s ease-out;

  .loading-spinner {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 4px solid #e5e7eb;
    border-top-color: #1bb776;
    animation: spin 0.8s cubic-bezier(0.68, -0.55, 0.27, 1.55) infinite;
    box-shadow: 0 4px 12px rgba(27, 183, 118, 0.2);
  }

  .loading-message {
    font-size: 1.125rem;
    font-weight: 600;
    color: #292c34;
    margin-top: 1.25rem;
    animation: pulse 1.5s ease-in-out infinite;
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

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}
</style>
