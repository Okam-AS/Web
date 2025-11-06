<template>
  <Modal
    :hide-close-btn="true"
    @close="close"
  >
    <div class="login-modal">
      <Loading :loading="isLoading" />
      <template v-if="!isLoading">
        <!-- Header with icon -->
        <div class="login-modal__header">
          <div class="login-modal__icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
            </svg>
          </div>
          <h1 class="login-modal__heading">
            {{ $t("login") }}
          </h1>
          <p class="login-modal__subtitle">
            Okam Admin Web Portal
          </p>
        </div>

        <!-- Logged in state -->
        <transition name="fade">
          <div
            v-if="user && user.token"
            class="login-modal__logged-in"
          >
            <div class="success-badge">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="logged-in-text">{{ $t("youAreLoggedIn") }}</p>
            <p class="logged-in-phone">{{ user.phoneNumber }}</p>
            <button
              class="btn btn--danger"
              @click="wipeUser"
            >
              {{ $t("logout") }}
            </button>
          </div>
        </transition>

        <!-- Login form -->
        <transition name="fade" mode="out-in">
          <div
            v-if="!user || !user.token"
            class="login-modal__form"
          >
            <!-- Phone input step -->
            <transition name="slide-fade" mode="out-in">
              <div v-if="!smsSent" key="phone" class="form-step">
                <div class="input-wrapper">
                  <span class="country-code">+47</span>
                  <input
                    v-model="phone"
                    :placeholder="$t('enterPhoneNumberPlaceholder')"
                    type="tel"
                    class="input"
                    @keyup.enter="getCode"
                  />
                </div>
                <button
                  class="btn btn--primary btn--large"
                  @click="getCode"
                >
                  {{ $t("enterPhoneNumberSubmit") }}
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>

              <!-- OTP input step -->
              <div v-else-if="!codeSent" key="otp" class="form-step">
                <label class="login-modal__label">
                  <span class="label-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </span>
                  {{ $t("enterPhoneCodeLabel") }}
                </label>
                <OtpInput
                  :loading="isLoading"
                  :error="!!errorMessage"
                  @update="clearError"
                  @complete="login"
                />
                <div class="phone-edit">
                  <div class="phone-display">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                    <span>{{ countryCode }} {{ phone }}</span>
                  </div>
                  <button
                    class="btn-link"
                    @click="reset"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                    Endre
                  </button>
                </div>
              </div>
            </transition>

            <!-- Error message -->
            <transition name="shake">
              <div
                v-if="errorMessage"
                class="alert alert--error"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {{ errorMessage }}
              </div>
            </transition>
          </div>
        </transition>
      </template>
    </div>
  </Modal>
</template>
<script>
import Modal from "~/components/atoms/Modal.vue";
import OtpInput from "~/components/atoms/OtpInput.vue";
import Loading from "~/components/atoms/Loading.vue";

export default {
  components: { Modal, OtpInput, Loading },
  data: () => ({
    isLoading: true,
    countryCode: "+47",
    phone: "",
    code: "",
    smsSent: false,
    codeSent: false,
    errorMessage: "",
  }),
  computed: {
    user() {
      return this.$store.state.currentUser;
    },
  },
  mounted() {
    this.isLoading = false;
  },
  methods: {
    clearError() {
      if (this.errorMessage) {
        this.errorMessage = "";
      }
    },
    reset() {
      this.isLoading = false;
      this.errorMessage = "";
      this.smsSent = false;
      this.codeSent = false;
      this.code = "";
    },
    getCode() {
      this.errorMessage = "";
      this.isLoading = true;
      this._userService
        .SendVerificationToken(this.countryCode + this.phone.replace(/\s/g, ''))
        .then(() => {
          this.smsSent = true;
        })
        .catch(() => {
          this.errorMessage = "Feil telefonnummer";
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    login(code) {
      this.code = code;
      this.isLoading = true;
      this._userService
        .Login(this.countryCode + this.phone.replace(/\s/g, ''), this.code)
        .then((response) => {
          if(Boolean(response)) {
            this.codeSent = true;
            this.errorMessage = JSON.stringify(response);
            this.$emit("close", true);
          } else {
            this.errorMessage = "Feil kode";
            this.code = "";
            // Keep codeSent as false to maintain the OTP input visibility
            this.codeSent = false;
          }
        })
        .catch(() => {
          // Show error message and clear code to allow retry
          this.errorMessage = "Feil kode";
          this.code = "";
          // Keep codeSent as false to maintain the OTP input visibility
          this.codeSent = false;
        })
        .finally(() => {
          this.isLoading = false;
        });
    },
    close() {
      this.$emit("close", this.$store.getters.userIsLoggedIn);
    },
    wipeUser() {
      this._userService.Logout();
      this.smsSent = false;
      this.codeSent = false;
      this.$emit("close", false);
    },
  },
};
</script>
<style lang="scss" scoped>
.login-modal {
  padding: 2.5rem;
  min-width: 380px;
  max-width: 460px;
  position: relative;

  @media (max-width: 480px) {
    padding: 1.5rem;
    min-width: 300px;
  }

  // Header Section
  &__header {
    text-align: center;
    margin-bottom: 2.5rem;
  }

  &__icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 1.25rem;
    background: linear-gradient(135deg, #1bb776 0%, #159b62 100%);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 10px 30px rgba(27, 183, 118, 0.3);

    svg {
      width: 32px;
      height: 32px;
      color: white;
    }
  }

  &__heading {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
    color: #292c34;
    letter-spacing: -0.02em;
  }

  &__subtitle {
    font-size: 0.95rem;
    color: #6b7280;
    font-weight: 400;
    margin: 0;
  }

  // Logged in state
  &__logged-in {
    text-align: center;
    padding: 2rem 0;
    animation: fadeIn 0.4s ease-in-out;

    .success-badge {
      width: 72px;
      height: 72px;
      margin: 0 auto 1.5rem;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
      animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);

      svg {
        width: 40px;
        height: 40px;
        color: white;
      }
    }

    .logged-in-text {
      font-size: 0.95rem;
      color: #6b7280;
      margin-bottom: 0.5rem;
    }

    .logged-in-phone {
      font-size: 1.25rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 2rem;
    }
  }

  // Form Section
  &__form {
    animation: fadeIn 0.4s ease-in-out;
  }

  &__label {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 0.875rem;
    color: #111827;

    .label-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #1bb776 0%, #159b62 100%);
      border-radius: 8px;
      flex-shrink: 0;

      svg {
        width: 18px;
        height: 18px;
        color: white;
      }
    }
  }
}

// Form step wrapper
.form-step {
  min-height: 200px;
  display: flex;
  flex-direction: column;
}

// Input wrapper for phone
.input-wrapper {
  display: flex;
  align-items: center;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 0.5rem;
  margin-bottom: 1.25rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:focus-within {
    background: white;
    border-color: #1bb776;
    box-shadow: 0 0 0 4px rgba(27, 183, 118, 0.1);
    transform: translateY(-2px);
  }

  .country-code {
    padding: 0.75rem 1rem;
    font-weight: 600;
    color: #374151;
    border-right: 2px solid #e5e7eb;
    margin-right: 0.75rem;
  }
}

.input {
  flex: 1;
  padding: 0.75rem 0.5rem;
  border: none;
  background: transparent;
  font-size: 1.05rem;
  color: #111827;
  font-weight: 500;

  &::placeholder {
    color: #9ca3af;
    font-weight: 400;
  }

  &:focus {
    outline: none;
  }
}

// Buttons
.btn {
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
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
    background: rgba(255, 255, 255, 0.3);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  &:hover::before {
    width: 300px;
    height: 300px;
  }

  svg {
    width: 20px;
    height: 20px;
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  &:hover svg {
    transform: translateX(4px);
  }

  &--primary {
    background: linear-gradient(135deg, #1bb776 0%, #159b62 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(27, 183, 118, 0.4);

    &:hover {
      box-shadow: 0 6px 20px rgba(27, 183, 118, 0.5);
      transform: translateY(-2px);
    }

    &:active {
      transform: translateY(0);
    }
  }

  &--large {
    width: 100%;
    padding: 1.125rem 1.5rem;
    font-size: 1.05rem;
  }

  &--danger {
    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);

    &:hover {
      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
      transform: translateY(-2px);
    }

    &:active {
      transform: translateY(0);
    }
  }
}

// Link button
.btn-link {
  background: none;
  border: none;
  color: #1bb776;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  transition: all 0.2s;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    background: rgba(27, 183, 118, 0.1);
    color: #159b62;
  }
}

// Phone edit section
.phone-edit {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;

  .phone-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.95rem;
    color: #374151;
    font-weight: 500;

    svg {
      width: 18px;
      height: 18px;
      color: #6b7280;
    }
  }
}

// Alert
.alert {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  margin-top: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 500;

  svg {
    width: 22px;
    height: 22px;
    flex-shrink: 0;
  }

  &--error {
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    color: #dc2626;
    border: 2px solid #fca5a5;
    animation: shake 0.5s;
  }
}

// Animations
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.5);
  }
  to {
    opacity: 1;
    transform: scale(1);
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

// Vue transitions
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 1, 1);
}

.slide-fade-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

.shake-enter-active {
  animation: shake 0.5s;
}
</style>
