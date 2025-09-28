<template>
  <Modal
    :hide-close-btn="true"
    @close="close"
  >
    <div class="login-modal">
      <Loading :loading="isLoading" />
      <template v-if="!isLoading">
        <h1 class="login-modal__heading">
          {{ $t("login") }}
        </h1>

        <!-- Logged in state -->
        <div
          v-if="user && user.token"
          class="login-modal__logged-in"
        >
          <p>{{ $t("youAreLoggedIn") + " " + user.phoneNumber }}</p>
          <div class="button-group">
            <button
              class="btn btn--danger"
              @click="wipeUser"
            >
              {{ $t("logout") }}
            </button>
          </div>
        </div>

        <!-- Login form -->
        <div
          v-else
          class="login-modal__form"
        >
          <template v-if="!smsSent">
            <p class="login-modal__label">
              {{ $t("enterPhoneNumberLabel") }}
            </p>
            <div class="input-group">
              <input
                v-model="phone"
                :placeholder="$t('enterPhoneNumberPlaceholder')"
                type="tel"
                class="input"
                @keyup.enter="getCode"
              />
              <button
                class="btn btn--primary"
                @click="getCode"
              >
                {{ $t("enterPhoneNumberSubmit") }}
              </button>
            </div>
          </template>

          <template v-else-if="!codeSent">
            <p class="login-modal__label">
              {{ $t("enterPhoneCodeLabel") }}
            </p>
            <OtpInput
              :loading="isLoading"
              @complete="login"
            />
            <div class="phone-edit">
              <span>{{ phone }}</span>
              <button
                class="btn-link"
                @click="reset"
              >
                Endre telefonnummer
              </button>
            </div>
          </template>

          <div
            v-if="errorMessage"
            class="alert alert--error"
          >
            {{ errorMessage }}
          </div>
        </div>
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
      this.errorMessage = "";
      this.isLoading = true;
      this._userService
        .Login(this.countryCode + this.phone.replace(/\s/g, ''), this.code)
        .then(() => {
          this.codeSent = true;
          this.$emit("close", true);
        })
        .catch(() => {
          this.codeSent = false;
          this.errorMessage = "Feil kode";
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
  padding: 2rem;
  min-width: 320px;
  max-width: 480px;

  &__heading {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1.5rem;
    text-align: center;
  }

  &__label {
    font-size: 1rem;
    margin-bottom: 0.75rem;
    color: #1f2937;
  }

  &__logged-in {
    text-align: center;

    p {
      margin-bottom: 1rem;
    }
  }

  &__form {
    .input-group {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
  }
}

.input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #374151;
    box-shadow: 0 0 0 2px rgba(55, 65, 81, 0.1);
  }
}

.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s;

  &--primary {
    background: #374151;
    color: white;

    &:hover {
      background: #1f2937;
    }
  }

  &--secondary {
    background: #f3f4f6;
    color: #1f2937;

    &:hover {
      background: #e5e7eb;
    }
  }

  &--danger {
    background: #dc2626;
    color: white;

    &:hover {
      background: #b91c1c;
    }
  }
}

.button-group {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn-link {
  background: none;
  border: none;
  color: #374151;

  &:hover {
    color: #1f2937;
  }
}

.phone-edit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 1rem 0;
  font-size: 0.875rem;
}

.alert {
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  margin-top: 1rem;

  &--error {
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #dc2626;
  }
}
</style>
