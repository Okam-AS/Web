<template>
  <AdminPage>
    <div class="store-details">
      <div class="store-details__header">
        <h1 class="store-details__title">Innstillinger</h1>
        <div
          v-if="isLoading"
          class="store-details__title-loading"
        >
          <Loading :loading="true" />
        </div>
      </div>

      <div
        v-if="initialLoading"
        class="store-details__loading"
      >
        <Loading :loading="true" />
      </div>

      <div
        v-else
        class="store-details__content"
      >
        <div class="store-selector-wrapper">
          <div class="select-wrapper">
            <select v-model="selectedStore">
              <option
                v-for="option in $store.state.currentUser.adminIn"
                :key="option.id"
                :value="option.id"
              >
                {{ option.name }} ({{ option.id }})
              </option>
            </select>
          </div>
        </div>

        <div
          v-if="selectedStore > 0"
          class="store-details__form"
        >
          <div class="store-details__section store-details__address">
            <h2 class="store-details__section-title">Adresse informasjon</h2>
            <div v-if="notification.show && notification.section === 'address'" :class="['notification', `notification--${notification.type}`]">
              {{ notification.message }}
            </div>

            <div class="form-group">
              <label for="fullAddress">Adresse</label>
              <input
                id="fullAddress"
                v-model="storeAddress.fullAddress"
                type="text"
                class="form-control"
                placeholder="Gateadresse"
              />
            </div>

            <div class="form-row">
              <div class="form-group half">
                <label for="zipCode">Postnummer</label>
                <input
                  id="zipCode"
                  v-model="storeAddress.zipCode"
                  type="text"
                  class="form-control"
                  placeholder="Postnummer"
                />
              </div>

              <div class="form-group half">
                <label for="city">Sted</label>
                <input
                  id="city"
                  v-model="storeAddress.city"
                  type="text"
                  class="form-control"
                  placeholder="Sted"
                />
              </div>
            </div>

            <div class="form-actions">
              <button
                class="btn btn-primary"
                @click="updateAddress"
              >
                Lagre endringer
              </button>
            </div>
          </div>

          <div class="store-details__section store-details__status-message">
            <h2 class="store-details__section-title">Status melding</h2>
            <div v-if="notification.show && notification.section === 'statusMessage'" :class="['notification', `notification--${notification.type}`]">
              {{ notification.message }}
            </div>
            <p class="store-details__section-description">Status meldingen vises til kundene på forsiden av butikken din. Bruk den for å informere om viktige beskjeder.</p>

            <div class="form-group">
              <label for="statusMessage">Status melding</label>
              <input
                id="statusMessage"
                v-model="statusMessage"
                type="text"
                class="form-control"
                placeholder="F.eks. 'Stengt pga. ferie 1-10 juli' eller 'Begrenset meny denne uken'"
              />
            </div>

            <div class="form-actions">
              <button
                class="btn btn-primary"
                :disabled="!statusMessage.trim()"
                @click="updateStatusMessage"
              >
                Oppdater status melding
              </button>
              <button
                v-if="hasStatusMessage"
                class="btn btn-secondary"
                @click="removeStatusMessage"
              >
                Fjern
              </button>
            </div>
          </div>
        </div>

        <div
          v-else
          class="store-details__no-store"
        >
          <p>Velg en butikk for å administrere butikkdetaljer.</p>
        </div>
      </div>
    </div>
    <LoginModal
      v-if="showLogin"
      @close="closeLoginModal"
    />
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import Loading from "~/components/atoms/Loading.vue";
import LoginModal from "~/components/molecules/LoginModal.vue";
import { Address } from "~/core/models";

export default {
  name: "ButikkDetaljer",
  components: {
    AdminPage,
    Loading,
    LoginModal,
  },
  data() {
    return {
      storeAddress: new Address(),
      statusMessage: "",
      hasStatusMessage: false,
      isLoading: false,
      initialLoading: true,
      selectedStore: null,
      showLogin: false,
      updateSuccess: false,
      updateError: false,
      notification: {
        show: false,
        message: "",
        type: "success", // success, error
        section: "", // address, statusMessage
        timeout: null
      }
    };
  },
  watch: {
    selectedStore(newVal) {
      if (newVal > 0) {
        this.fetchStoreData(newVal);
      } else {
        this.storeAddress = new Address();
      }
      if (window && window.localStorage) {
        localStorage.setItem("storeDetailsSelectedStore", newVal);
      }
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      return;
    }

    // Update current user information
    this._userService
      .Reload()
      .then((success) => {
        if (!success) {
          this.showLogin = true;
          return;
        }

        this.init();

        if (!this.selectedStore && this.$store.state.currentUser.adminIn?.length) {
          this.selectedStore = this.$store.state.currentUser.adminIn[0].id;
        }
      })
      .catch((error) => {
        console.error("Error reloading user:", error);
        this.showLogin = true;
      });
  },
  methods: {
    init() {
      // Try to get the previously selected store from localStorage
      if (window && window.localStorage) {
        const savedStore = localStorage.getItem("storeDetailsSelectedStore");
        if (savedStore && this.$store.state.currentUser.adminIn?.some((s) => s.id === parseInt(savedStore))) {
          this.selectedStore = parseInt(savedStore);
        } else if (this.$store.state.currentUser.adminIn?.length) {
          this.selectedStore = this.$store.state.currentUser.adminIn[0].id;
        }
      }
    },
    closeLoginModal(isLoggedIn) {
      this.showLogin = false;
      if (isLoggedIn) {
        this._userService.Reload().then((success) => {
          if (success) {
            this.init();
          }
        });
      }
    },
    showNotification(message, type = "success", section = "") {
      // Clear any existing timeout
      if (this.notification.timeout) {
        clearTimeout(this.notification.timeout);
      }
      
      // Show the notification
      this.notification = {
        show: true,
        message,
        type,
        section,
        timeout: null
      };
      
      // Auto-hide after 3 seconds
      this.notification.timeout = setTimeout(() => {
        this.notification.show = false;
      }, 3000);
    },
    fetchStoreData(storeId) {
      if (storeId) {
        this.isLoading = true;
        this._storeService
          .Get(storeId)
          .then((store) => {
            if (store && store.address) {
              this.storeAddress = { ...store.address };
            } else {
              this.storeAddress = new Address();
            }
            
            // Check if the store has a status message
            if (store && store.statusMessage) {
              this.statusMessage = store.statusMessage;
              this.hasStatusMessage = true;
            } else {
              this.statusMessage = "";
              this.hasStatusMessage = false;
            }
            
            this.isLoading = false;
            this.initialLoading = false;
          })
          .catch((error) => {
            console.error("Error fetching store data:", error);
            this.isLoading = false;
            this.initialLoading = false;
            this.showNotification("Kunne ikke hente butikkdata. Vennligst prøv igjen senere.", "error", "");
          });
      }
    },
    updateAddress() {
      if (!this.selectedStore) {
        return;
      }

      this.isLoading = true;

      // Make a copy of the address to avoid reactivity issues
      const addressToUpdate = { ...this.storeAddress };

      this._storeService
        .UpdateAddress(this.selectedStore, addressToUpdate)
        .then((success) => {
          this.isLoading = false;
          if (success) {
            this.showNotification("Adresse oppdatert", "success", "address");
          } else {
            this.showNotification("Kunne ikke oppdatere adresse. Vennligst prøv igjen senere.", "error", "address");
          }
        })
        .catch((error) => {
          console.error("Error updating address:", error);
          this.isLoading = false;
          this.showNotification("Kunne ikke oppdatere adresse. Vennligst prøv igjen senere.", "error", "address");
        });
    },
    updateStatusMessage() {
      if (!this.selectedStore || !this.statusMessage.trim()) {
        return;
      }

      this.isLoading = true;

      this._storeService
        .UpdateStatusMessage(this.selectedStore, this.statusMessage.trim())
        .then((success) => {
          this.isLoading = false;
          if (success) {
            this.hasStatusMessage = true;
            this.showNotification("Status melding oppdatert", "success", "statusMessage");
          } else {
            this.showNotification("Kunne ikke oppdatere status melding. Vennligst prøv igjen senere.", "error", "statusMessage");
          }
        })
        .catch((error) => {
          console.error("Error updating status message:", error);
          this.isLoading = false;
          this.showNotification("Kunne ikke oppdatere status melding. Vennligst prøv igjen senere.", "error", "statusMessage");
        });
    },
    removeStatusMessage() {
      if (!this.selectedStore) {
        return;
      }

      this.isLoading = true;
      
      this._storeService
        .UpdateStatusMessage(this.selectedStore, "")
        .then((success) => {
          this.isLoading = false;
          if (success) {
            this.statusMessage = "";
            this.hasStatusMessage = false;
            this.showNotification("Status melding fjernet", "success", "statusMessage");
          } else {
            this.showNotification("Kunne ikke fjerne status melding. Vennligst prøv igjen senere.", "error", "statusMessage");
          }
        })
        .catch((error) => {
          console.error("Error removing status message:", error);
          this.isLoading = false;
          this.showNotification("Kunne ikke fjerne status melding. Vennligst prøv igjen senere.", "error", "statusMessage");
        });
    },
  },
};
</script>

<style scoped>
.store-details {
  padding: 2rem;
}

.store-details__header {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
}

.store-details__title {
  font-size: 2rem;
  color: #2d3748;
  margin-bottom: 0;
  margin-right: 1rem;
}

.store-details__title-loading {
  width: 30px;
  height: 30px;
}

.store-details__loading {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.store-selector-wrapper {
  margin-bottom: 2rem;
}

.select-wrapper {
  display: inline-block;
  position: relative;
}

.select-wrapper select {
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  background-color: white;
  font-size: 1rem;
  appearance: none;
  min-width: 250px;
}

.select-wrapper::after {
  content: "";
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 5px solid #4a5568;
  pointer-events: none;
}

.store-details__section {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  margin-bottom: 2rem;
}

.store-details__section-title {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #2d3748;
}

.store-details__section-description {
  margin-bottom: 1.5rem;
  color: #4a5568;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-row {
  display: flex;
  margin: 0 -0.5rem;
}

.form-group.half {
  width: 50%;
  padding: 0 0.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #4a5568;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  font-size: 1rem;
  transition: border-color 0.15s ease-in-out;
}

.form-control:focus {
  border-color: #1bb776;
  outline: none;
}

.form-actions {
  margin-top: 2rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  text-align: center;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  line-height: 1;
  border-radius: 0.25rem;
  transition: all 0.15s ease-in-out;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background-color: #1bb776;
  color: white;
}

.btn-primary:hover {
  background-color: #159e64;
}

.btn-secondary {
  background-color: #e53e3e;
  color: white;
  margin-left: 0.5rem;
}

.btn-secondary:hover {
  background-color: #c53030;
}

.store-details__no-store {
  padding: 2rem 0;
  color: #a0aec0;
  text-align: center;
}

.notification {
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.notification--success {
  background-color: #c6f6d5;
  color: #276749;
  border: 1px solid #9ae6b4;
}

.notification--error {
  background-color: #fed7d7;
  color: #c53030;
  border: 1px solid #feb2b2;
}
</style>
