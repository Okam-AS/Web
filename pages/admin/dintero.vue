<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="dintero-config">
      <div class="dintero-config__header">
        <h1 class="dintero-config__title">Dintero Konfigurasjon</h1>
        <div
          v-if="isLoading"
          class="dintero-config__title-loading"
        >
          <Loading :loading="true" />
        </div>
      </div>

      <div
        v-if="initialLoading"
        class="dintero-config__loading"
      >
        <Loading :loading="true" />
      </div>

      <div
        v-else
        class="dintero-config__content"
      >

        <div class="dintero-create-seller-section">
          <h3>Legg til ny Dintero-selger</h3>
          <button
            class="btn btn-primary"
            style="margin-bottom: 1rem"
            @click="showCreateSellerModal = true"
          >
            Opprett ny selger
          </button>
          <Modal
            v-if="showCreateSellerModal"
            :wide="true"
            @close="closeCreateSellerModal"
          >
            <div style="width: 600px; max-width: 90vw; margin: 0 auto; text-align: center">
              <h1 style="margin-bottom: 1em">Opprett Dintero-selger</h1>
              <form @submit.prevent="handleCreateSeller">
                <div
                  class="form-group"
                  style="text-align: left"
                >
                  <VatAutocompleteInput
                    id="createSellerVat"
                    v-model="createSellerForm.selectedVat"
                    input-id="createSellerVat"
                    :stores="allStores"
                    placeholder="Skriv inn org.nr eller velg fra listen"
                  />
                </div>
                <div
                  class="form-group"
                  style="text-align: left"
                >
                  <label for="createSellerPayoutDest">Payout Destination ID</label>
                  <input
                    id="createSellerPayoutDest"
                    v-model="createSellerForm.payoutDestinationId"
                    type="text"
                    class="form-control"
                    required
                  />
                </div>
                <div
                  class="form-group"
                  style="text-align: left"
                >
                  <label for="createSellerPayoutInterval">Payout Interval</label>
                  <select
                    id="createSellerPayoutInterval"
                    v-model="createSellerForm.payoutIntervalType"
                    class="form-select"
                    required
                  >
                    <option value="monthly">Månedlig</option>
                    <option value="weekly">Ukentlig</option>
                    <option value="daily">Daglig</option>
                  </select>
                </div>
                <div class="modal-buttons">
                  <input
                    class="emoji-btn save-btn"
                    type="submit"
                    :disabled="createSellerLoading"
                    :value="createSellerLoading ? 'Oppretter...' : 'Opprett selger'"
                  />
                  <input
                    class="emoji-btn action-button--reject"
                    type="button"
                    value="Avbryt"
                    @click="closeCreateSellerModal"
                  />
                </div>
                <div
                  v-if="createSellerError"
                  class="notification notification--error"
                  style="margin-top: 1rem"
                >
                  {{ createSellerError }}
                </div>
                <div
                  v-if="createSellerSuccess"
                  class="notification notification--success"
                  style="margin-top: 1rem"
                >
                  Selger opprettet!
                </div>
              </form>
            </div>
          </Modal>
        </div>

        <div class="dintero-sellers-section">
          <h2 class="dintero-config__section-title">Dintero Selgere</h2>
          <div
            v-if="sellersLoading"
            class="dintero-config__loading"
          >
            <Loading :loading="true" />
          </div>
          <div v-else>
            <table class="dintero-sellers-table">
              <thead>
                <tr>
                  <th>Org.nr</th>
                  <th>DestinationId</th>
                  <th>Interval</th>
                  <th>Status</th>
                  <th>Actions</th>
                  <th>Contract</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="seller in sellers"
                  :key="seller.id"
                >
                  <td>{{ seller.organizationNumber }}</td>
                  <td>{{ seller.payoutDestinationId + " " + (seller.connected ? "✅" : "❌") }}</td>
                  <td>{{ seller.payoutIntervalType }}</td>
                  <td>{{ seller.caseStatus }}</td>
                  <td>
                    <button
                      class="btn btn-danger"
                      @click="deleteSeller(seller.id)"
                    >
                      Slett
                    </button>
                  </td>
                  <td>
                    <a
                      v-if="getContractUrl(seller)"
                      :href="getContractUrl(seller)"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Contract
                    </a>
                    <span v-else>-</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div
              v-if="sellersError"
              class="notification notification--error"
            >
              {{ sellersError }}
            </div>
          </div>
        </div>

        <div
          v-if="selectedStore > 0"
          class="dintero-config__form"
        >
          <div class="dintero-config__section">
            <h2 class="dintero-config__section-title">Dintero API Konfigurasjon</h2>
            <div
              v-if="notification.show"
              :class="['notification', `notification--${notification.type}`]"
            >
              {{ notification.message }}
            </div>
            <p class="dintero-config__section-description">Konfigurer Dintero betalingsløsning for denne butikken.</p>

            <div class="form-group">
              <label for="splitSellerId">Split Seller ID</label>
              <input
                id="splitSellerId"
                v-model="dinteroConfig.splitSellerId"
                type="text"
                class="form-control"
                placeholder="seller_id"
              />
            </div>

            <div class="form-group">
              <label for="commissionPercentage">Commission Percentage</label>
              <input
                id="commissionPercentage"
                v-model="dinteroConfig.commissionPercentage"
                type="number"
                class="form-control"
                placeholder="1.99"
              />
            </div>

            <div class="form-group">
              <label for="woltDeliveryFeePercent">Wolt Delivery Fee Percent</label>
              <input
                id="woltDeliveryFeePercent"
                v-model="dinteroConfig.woltDeliveryFeePercent"
                type="number"
                class="form-control"
                placeholder="5.00"
              />
            </div>

            <div class="form-group">
              <label for="woltCustomerDeliveryFeeAmount">Wolt Customer Delivery Fee Amount</label>
              <input
                id="woltCustomerDeliveryFeeAmount"
                v-model="dinteroConfig.woltCustomerDeliveryFeeAmount"
                type="number"
                class="form-control"
                placeholder="49.00"
              />
            </div>

            <div class="form-group">
              <label for="woltServiceFeeAmount">Wolt Service Fee Amount</label>
              <input
                id="woltServiceFeeAmount"
                v-model="dinteroConfig.woltServiceFeeAmount"
                type="number"
                class="form-control"
                placeholder="29.00"
              />
            </div>

            <div class="form-group">
              <details class="white-label-config">
                <summary class="white-label-summary">White label konfigurasjon</summary>
                <div class="white-label-content">
                  <div class="form-group">
                    <label for="dinteroAccountId">Dintero Account ID</label>
                    <input
                      id="dinteroAccountId"
                      v-model="dinteroConfig.dinteroAccountId"
                      type="text"
                      class="form-control"
                      placeholder="T12345"
                    />
                  </div>

                  <div class="form-group">
                    <label for="clientId">Client ID</label>
                    <input
                      id="clientId"
                      v-model="dinteroConfig.clientId"
                      type="text"
                      class="form-control"
                      placeholder="client_id"
                    />
                  </div>

                  <div class="form-group">
                    <label for="clientSecret">Client Secret</label>
                    <input
                      id="clientSecret"
                      v-model="dinteroConfig.clientSecret"
                      type="password"
                      class="form-control"
                      placeholder="client_secret"
                    />
                  </div>
                </div>
              </details>
            </div>

            <h3 class="dintero-config__subsection-title">Betalingsmetoder</h3>
            <p class="dintero-config__section-description">Velg hvilke betalingsmetoder som skal være tilgjengelige for denne butikken.</p>

            <div class="form-check">
              <input
                id="dinteroEnabled"
                v-model="dinteroEnabled"
                type="checkbox"
                class="form-check-input"
              />
              <label
                for="dinteroEnabled"
                class="form-check-label"
                >Aktiver Dintero</label
              >
            </div>

            <div class="form-check">
              <input
                id="vippsEnabled"
                v-model="dinteroConfig.vippsEnabled"
                type="checkbox"
                class="form-check-input"
              />
              <label
                for="vippsEnabled"
                class="form-check-label"
                >Vipps</label
              >
            </div>

            <div class="form-check">
              <input
                id="applePayEnabled"
                v-model="dinteroConfig.applePayEnabled"
                type="checkbox"
                class="form-check-input"
              />
              <label
                for="applePayEnabled"
                class="form-check-label"
                >Apple Pay</label
              >
            </div>

            <div class="form-check">
              <input
                id="creditCardEnabled"
                v-model="dinteroConfig.creditCardEnabled"
                type="checkbox"
                class="form-check-input"
              />
              <label
                for="creditCardEnabled"
                class="form-check-label"
                >Kredittkort</label
              >
            </div>

            <div class="form-check">
              <input
                id="googlePayEnabled"
                v-model="dinteroConfig.googlePayEnabled"
                type="checkbox"
                class="form-check-input"
              />
              <label
                for="googlePayEnabled"
                class="form-check-label"
                >Google Pay</label
              >
            </div>

            <div class="form-check">
              <input
                id="klarnaEnabled"
                v-model="dinteroConfig.klarnaEnabled"
                type="checkbox"
                class="form-check-input"
              />
              <label
                for="klarnaEnabled"
                class="form-check-label"
                >Klarna</label
              >
            </div>

            <div class="form-check">
              <input
                id="billieEnabled"
                v-model="dinteroConfig.billieEnabled"
                type="checkbox"
                class="form-check-input"
              />
              <label
                for="billieEnabled"
                class="form-check-label"
                >Billie</label
              >
            </div>

            <div class="form-actions">
              <button
                class="btn btn-primary"
                @click="updateDinteroConfig"
              >
                Lagre endringer
              </button>
            </div>
          </div>

          <div class="dintero-config__section">
            <h2 class="dintero-config__section-title">Wolt Marketplace Konfigurasjon</h2>
            <p class="dintero-config__section-description">Konfigurer Wolt Marketplace integrasjon for denne butikken.</p>

            <div class="form-group">
              <label for="woltMarketplaceVenueId">Venue ID</label>
              <input
                id="woltMarketplaceVenueId"
                v-model="woltMarketplaceConfig.venueId"
                type="text"
                class="form-control"
                placeholder="venue_id"
              />
            </div>

            <div class="form-group">
              <label for="woltMarketplaceClientId">Client ID (OAuth)</label>
              <input
                id="woltMarketplaceClientId"
                v-model="woltMarketplaceConfig.clientId"
                type="text"
                class="form-control"
                placeholder="client_id"
              />
            </div>

            <div class="form-group">
              <label for="woltMarketplaceClientSecret">Client Secret (OAuth)</label>
              <input
                id="woltMarketplaceClientSecret"
                v-model="woltMarketplaceConfig.clientSecret"
                type="password"
                class="form-control"
                placeholder="client_secret"
              />
            </div>

            <div class="form-group">
              <label for="woltMarketplaceAccessToken">Access Token</label>
              <input
                id="woltMarketplaceAccessToken"
                v-model="woltMarketplaceConfig.accessToken"
                type="text"
                class="form-control"
                placeholder="access_token"
              />
            </div>

            <div class="form-group">
              <label for="woltMarketplaceRefreshToken">Refresh Token</label>
              <input
                id="woltMarketplaceRefreshToken"
                v-model="woltMarketplaceConfig.refreshToken"
                type="text"
                class="form-control"
                placeholder="refresh_token"
              />
            </div>

            <div class="form-actions">
              <button
                class="btn btn-primary"
                @click="updateWoltMarketplaceConfig"
              >
                Lagre Wolt Marketplace Konfigurasjon
              </button>
            </div>
          </div>
        </div>

        <div
          v-else
          class="dintero-config__no-store"
        >
          <p>Velg en butikk for å administrere Dintero konfigurasjon.</p>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import Loading from "~/components/atoms/Loading.vue";
import Modal from "~/components/atoms/Modal.vue";
import VatAutocompleteInput from "~/components/atoms/VatAutocompleteInput.vue";

export default {
  name: "DinteroConfig",
  components: {
    AdminPage,
    Loading,
    Modal,
    VatAutocompleteInput,
  },
  data() {
    return {
      initialLoading: true,
      isLoading: false,
      notification: {
        show: false,
        message: "",
        type: "success",
      },
      dinteroEnabled: false,
      dinteroConfig: {
        dinteroAccountId: "",
        clientId: "",
        clientSecret: "",
        vippsEnabled: false,
        applePayEnabled: false,
        creditCardEnabled: false,
        googlePayEnabled: false,
        klarnaEnabled: false,
        billieEnabled: false,
        commissionPercentage: 0,
        woltDeliveryFeePercent: 0,
        woltCustomerDeliveryFeeAmount: 0,
        woltServiceFeeAmount: 0,
        splitSellerId: "",
      },
      sellers: [],
      sellersLoading: false,
      sellersError: null,
      createSellerForm: {
        selectedVat: "",
        payoutDestinationId: "",
        payoutIntervalType: "monthly",
      },
      createSellerLoading: false,
      createSellerError: "",
      createSellerSuccess: false,
      allStores: [],
      showCreateSellerModal: false,
      woltMarketplaceConfig: {
        venueId: "",
        clientId: "",
        clientSecret: "",
        accessToken: "",
        refreshToken: "",
      },
    };
  },
  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore;
    },
  },
  watch: {
    selectedStore(newVal) {
      if (newVal > 0) {
        this.fetchStoreData(newVal);
      } else {
        this.resetForm();
      }
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      return;
    }

    // Check if user is Power User, if not redirect to admin
    if (!this.$store.state.currentUser?.isPowerUser) {
      this.$router.push("/admin");
      return;
    }

    this.init();
    // Fetch all stores for seller creation dropdown
    this._storeService.GetAll().then((stores) => {
      console.log("[DINTERO] allStores fetched", stores);
      this.allStores = stores;
    });
  },
  methods: {
    init() {
      this.initialLoading = false;
      this.loadSellers();
    },
    handleLoginSuccess() {
      this.initialLoading = false;
      this.init();
    },
    showNotification(message, type = "success") {
      this.notification = {
        show: true,
        message,
        type,
      };

      setTimeout(() => {
        this.notification.show = false;
      }, 5000);
    },
    resetForm() {
      this.dinteroEnabled = false;
      this.dinteroConfig = {
        dinteroAccountId: "",
        clientId: "",
        clientSecret: "",
        vippsEnabled: false,
        applePayEnabled: false,
        creditCardEnabled: false,
        googlePayEnabled: false,
        klarnaEnabled: false,
        billieEnabled: false,
        commissionPercentage: 0,
        woltDeliveryFeePercent: 0,
        woltCustomerDeliveryFeeAmount: 0,
        woltServiceFeeAmount: 0,
        splitSellerId: "",
      };
      this.woltMarketplaceConfig = {
        venueId: "",
        clientId: "",
        clientSecret: "",
        accessToken: "",
        refreshToken: "",
      };
    },
    fetchStoreData(storeId) {
      this.isLoading = true;

      this._storeService.Get(storeId).then((res) => {
        this.dinteroEnabled = res.dinteroEnabled;
      });

      // Fetch the current Dintero configuration
      this._storeService
        .GetDinteroConfig(storeId)
        .then((config) => {
          console.log(config);
          this.dinteroConfig = {
            dinteroAccountId: config.dinteroAccountId || "",
            clientId: config.clientId || "",
            clientSecret: config.clientSecret || "",
            vippsEnabled: config.vippsEnabled || false,
            applePayEnabled: config.applePayEnabled || false,
            creditCardEnabled: config.creditCardEnabled || false,
            googlePayEnabled: config.googlePayEnabled || false,
            klarnaEnabled: config.klarnaEnabled || false,
            billieEnabled: config.billieEnabled || false,
            commissionPercentage: config.commissionPercentage || 0,
            woltDeliveryFeePercent: config.woltDeliveryFeePercent || 0,
            woltCustomerDeliveryFeeAmount: config.woltCustomerDeliveryFeeAmount || 0,
            woltServiceFeeAmount: config.woltServiceFeeAmount || 0,
            splitSellerId: config.splitSellerId || "",
          };
          this.isLoading = false;
          this.initialLoading = false;
        })
        .catch((error) => {
          console.error("Error fetching Dintero configuration:", error);
          this.resetForm();
          this.isLoading = false;
          this.initialLoading = false;
          this.showNotification("Kunne ikke hente Dintero konfigurasjon. Vennligst prøv igjen senere.", "error");
        });
    },
    loadSellers() {
      this.sellersLoading = true;
      this.sellersError = null;
      this._dinteroService
        .getSellers()
        .then((data) => {
          // The API returns { payoutDestinations: [...] }
          this.sellers = data.payoutDestinations || [];
        })
        .catch((err) => {
          console.error("Error fetching sellers:", err);
          this.sellersError = "Kunne ikke hente selgere";
        })
        .finally(() => {
          this.sellersLoading = false;
        });
    },
    deleteSeller(id) {
      if (confirm("Er du sikker på at du vil slette denne selgeren?")) {
        this.sellersLoading = true;
        const forceDelete = true;
        this._dinteroService
          .deleteSeller(id, forceDelete)
          .then(() => this.loadSellers())
          .catch((err) => {
            console.error("Error deleting seller:", err);
            this.sellersError = "Kunne ikke slette selger";
            this.sellersLoading = false;
          });
      }
    },
    updateDinteroConfig() {
      if (!this.selectedStore) {
        return;
      }

      this.isLoading = true;

      // Create the request payload
      const payload = {
        dinteroEnabled: this.dinteroEnabled,
        dinteroAccountId: this.dinteroConfig.dinteroAccountId,
        clientId: this.dinteroConfig.clientId,
        clientSecret: this.dinteroConfig.clientSecret,
        vippsEnabled: this.dinteroConfig.vippsEnabled,
        applePayEnabled: this.dinteroConfig.applePayEnabled,
        creditCardEnabled: this.dinteroConfig.creditCardEnabled,
        googlePayEnabled: this.dinteroConfig.googlePayEnabled,
        klarnaEnabled: this.dinteroConfig.klarnaEnabled,
        billieEnabled: this.dinteroConfig.billieEnabled,
        commissionPercentage: this.dinteroConfig.commissionPercentage,
        woltDeliveryFeePercent: this.dinteroConfig.woltDeliveryFeePercent,
        woltCustomerDeliveryFeeAmount: this.dinteroConfig.woltCustomerDeliveryFeeAmount,
        woltServiceFeeAmount: this.dinteroConfig.woltServiceFeeAmount,
        splitSellerId: this.dinteroConfig.splitSellerId,
      };

      this._storeService
        .UpdateDinteroConfig(this.selectedStore, payload)
        .then((success) => {
          this.isLoading = false;
          if (success) {
            this.showNotification("Dintero konfigurasjon oppdatert", "success");
          } else {
            this.showNotification("Kunne ikke oppdatere Dintero konfigurasjon. Vennligst prøv igjen senere.", "error");
          }
        })
        .catch((error) => {
          console.error("Error updating Dintero configuration:", error);
          this.isLoading = false;
          this.showNotification("Kunne ikke oppdatere Dintero konfigurasjon. Vennligst prøv igjen senere.", "error");
        });
    },
    getContractUrl(seller) {
      if (!Array.isArray(seller.links) || seller.caseStatus === "ACTIVE") {
        return null;
      }
      const contract = seller.links.find((l) => l.rel === "contract_url");
      return contract ? contract.href : null;
    },
    async handleCreateSeller() {
      this.createSellerLoading = true;
      this.createSellerError = "";
      this.createSellerSuccess = false;
      try {
        const selectedStore = this.allStores.find((s) => s.vat === this.createSellerForm.selectedVat);
        const organizationNumber = this.createSellerForm.selectedVat;
        console.log("[DINTERO] handleCreateSeller selectedVat:", organizationNumber, "selectedStore:", selectedStore);
        if (!organizationNumber) {
          this.createSellerError = "Organisasjonsnummer må fylles ut.";
          this.createSellerLoading = false;
          return;
        }
        const payload = {
          payout_destination_id: this.createSellerForm.payoutDestinationId,
          payout_reference: "Okam",
          bank_accounts: [
            {
              bank_account_currency: "NOK",
              payout_currency: "NOK",
            },
          ],
          country_code: "NO",
          organization_number: organizationNumber,
          payout_interval_type: this.createSellerForm.payoutIntervalType,
          form_submitter: {
            name: this.$store.state.currentUser.name || "",
            title: this.$store.state.currentUser.title || "",
          },
          store_id: selectedStore ? selectedStore.id : undefined,
        };
        console.log("[DINTERO] handleCreateSeller payload:", payload);
        await this._dinteroService.createSeller(payload);
        this.createSellerSuccess = true;
        this.createSellerForm.payoutDestinationId = "";
        this.createSellerForm.selectedVat = "";
        this.createSellerForm.payoutIntervalType = "monthly";
        this.$nextTick(() => {
          this.loadSellers && this.loadSellers();
        });
        this.closeCreateSellerModal();
      } catch (e) {
        this.createSellerError = e && e.message ? e.message : "Kunne ikke opprette selger.";
      } finally {
        this.createSellerLoading = false;
      }
    },
    onCreateSellerStoreChange() {
      // Optionally, clear error/success messages on store change
      this.createSellerError = "";
      this.createSellerSuccess = false;
    },
    closeCreateSellerModal() {
      this.showCreateSellerModal = false;
      this.createSellerError = "";
      this.createSellerSuccess = false;
    },
    updateWoltMarketplaceConfig() {
      if (!this.selectedStore) {
        console.log("[WOLT] No store selected");
        return;
      }

      this.isLoading = true;

      const payload = {
        venueId: this.woltMarketplaceConfig.venueId,
        clientId: this.woltMarketplaceConfig.clientId,
        clientSecret: this.woltMarketplaceConfig.clientSecret,
        accessToken: this.woltMarketplaceConfig.accessToken,
        refreshToken: this.woltMarketplaceConfig.refreshToken,
      };

      console.log("[WOLT] Updating Wolt Marketplace config for store:", this.selectedStore);
      console.log("[WOLT] Payload:", payload);

      this._storeService
        .ConfigureWolt(this.selectedStore, payload)
        .then((response) => {
          console.log("[WOLT] Configuration update response:", response);
          this.isLoading = false;
          this.showNotification("Wolt Marketplace konfigurasjon oppdatert", "success");
        })
        .catch((error) => {
          console.error("[WOLT] Error updating Wolt Marketplace configuration:", error);
          console.error("[WOLT] Error details:", JSON.stringify(error, null, 2));
          this.isLoading = false;
          this.showNotification("Kunne ikke oppdatere Wolt Marketplace konfigurasjon. Vennligst prøv igjen senere.", "error");
        });
    },
  },
};
</script>

<style scoped>
.dintero-config {
  padding: 2rem;
}

.dintero-config__header {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
}

.dintero-config__title {
  font-size: 2rem;
  color: #2d3748;
  margin-bottom: 0;
  margin-right: 1rem;
}

.dintero-config__title-loading {
  width: 30px;
  height: 30px;
}

.dintero-config__loading {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}


.dintero-config__section {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 2rem;
  margin-bottom: 2rem;
}

.dintero-config__section-title {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: #2d3748;
}

.dintero-config__subsection-title {
  font-size: 1.25rem;
  margin: 2rem 0 1rem;
  color: #2d3748;
}

.dintero-config__section-description {
  margin-bottom: 1.5rem;
  color: #4a5568;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-check {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.form-check-input {
  margin-right: 0.5rem;
}

.form-check-label {
  margin-bottom: 0;
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

.dintero-config__no-store {
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

.dintero-sellers-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.5rem;
}

.dintero-sellers-table th,
.dintero-sellers-table td {
  border: 1px solid #e2e8f0;
  padding: 0.75rem;
  text-align: left;
}

.dintero-sellers-table th {
  background-color: #f7f7f7;
}

.dintero-sellers-table td {
  background-color: white;
}

.modal-buttons {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.emoji-btn {
  cursor: pointer;
  padding: 0.625rem 1.25rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 120px;
}

.emoji-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.emoji-btn.save-btn {
  background-color: #4a5568;
  color: white;
  border-color: #4a5568;
}

.emoji-btn.save-btn:hover {
  background-color: #2d3748;
}

.emoji-btn.save-btn:disabled {
  background-color: #a0aec0;
  border-color: #a0aec0;
  cursor: not-allowed;
}

.emoji-btn.action-button--reject {
  background-color: #f1f5f9;
  color: #374151;
  border-color: #e2e8f0;
}

.emoji-btn.action-button--reject:hover {
  background-color: #e5e7eb;
}

.white-label-config {
  margin-bottom: 1.5rem;
}

.white-label-summary {
  cursor: pointer;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.white-label-content {
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  background-color: white;
}
</style>
