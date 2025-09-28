<template>
  <AdminPage :full-width="true">
    <div class="overview">
      <div class="overview__content">
        <div class="overview__table-container">
          <div class="overview__header">
            <h3>Varer og tjenester</h3>
            <button
              class="overview__button"
              @click="showAddOfferModal"
            >
              Legg til vare/tjeneste
            </button>
          </div>
          <table class="overview__table">
            <thead>
              <tr>
                <th class="sortable-header">Navn</th>
                <th class="sortable-header">Beskrivelse</th>
                <th class="sortable-header">Månedspris</th>
                <th class="sortable-header">Engangspris</th>
                <th>Handling</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in offerItems"
                :key="item.offerItemId"
              >
                <td>{{ item.name }}</td>
                <td>{{ item.description }}</td>
                <td>{{ priceLabel(item.minMonthlyFee) }}</td>
                <td>{{ priceLabel(item.minOnetimeFee) }}</td>
                <td>
                  <div class="action-buttons">
                    <button
                      class="action-button action-button--edit"
                      @click="editOffer(item)"
                    >
                      Endre
                    </button>
                    <button
                      class="action-button action-button--reject"
                      @click="confirmDeleteOffer(item)"
                    >
                      Slett
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="offerItems.length === 0">
                <td
                  colspan="11"
                  class="overview__empty"
                >
                  Ingen varer/tjenester funnet
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Modals -->
        <Modal
          v-if="showOfferModal"
          :wide="true"
          @close="closeOfferModal"
        >
          <div style="width: 1000px; max-width: 90vw; margin: 0 auto; text-align: center">
            <h1 style="margin-bottom: 1em">
              {{ isEditMode ? "Endre vare/tjeneste" : "Legge ny vare/tjeneste" }}
            </h1>
            <form @submit.prevent="saveOffer">
              <div class="form-group">
                <label for="name">Navn</label>
                <br />
                <input
                  id="name"
                  v-model="currentOffer.name"
                  type="text"
                  required
                />
              </div>
              <div class="form-group">
                <label for="description">Beskrivelse</label>
                <br />
                <textarea
                  id="description"
                  v-model="currentOffer.description"
                  class="kam-textarea"
                  rows="3"
                />
              </div>
              <div class="form-group">
                <label for="internalDescription">Intern beskrivelse</label>
                <br />
                <textarea
                  id="internalDescription"
                  v-model="currentOffer.internalDescription"
                  class="kam-textarea"
                  rows="3"
                />
              </div>

              <div class="form-section">
                <h6>Prisalternativer</h6>
                <div class="form-row">
                  <div class="form-group form-group--half">
                    <div class="checkbox-container">
                      <input
                        id="enableMonthlyFee"
                        v-model="currentOffer.enableMonthlyFee"
                        type="checkbox"
                        class="checkbox-input"
                      />
                      <label for="enableMonthlyFee" class="checkbox-label">Aktiver månedspris</label>
                    </div>
                  </div>
                  <div class="form-group form-group--half">
                    <div class="checkbox-container">
                      <input
                        id="enableOnetimeFee"
                        v-model="currentOffer.enableOnetimeFee"
                        type="checkbox"
                        class="checkbox-input"
                      />
                      <label for="enableOnetimeFee" class="checkbox-label">Aktiver engangspris</label>
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-section" v-if="currentOffer.enableMonthlyFee || currentOffer.enableOnetimeFee">
                <h6>Minimumspris</h6>
                <div class="form-row">
                  <div class="form-group form-group--half" v-if="currentOffer.enableMonthlyFee">
                    <label for="minMonthlyFee">Min månedspris</label>
                    <br />
                    <PriceInput
                      id="minMonthlyFee"
                      v-model="currentOffer.minMonthlyFee"
                    />
                  </div>
                  <div class="form-group form-group--half" v-if="currentOffer.enableOnetimeFee">
                    <label for="minOnetimeFee">Min engangspris</label>
                    <br />
                    <PriceInput
                      id="minOnetimeFee"
                      v-model="currentOffer.minOnetimeFee"
                    />
                  </div>
                </div>
              </div>

              <div class="form-section" v-if="currentOffer.enableMonthlyFee || currentOffer.enableOnetimeFee">
                <h6>Maksimumspris</h6>
                <div class="form-row">
                  <div class="form-group form-group--half" v-if="currentOffer.enableMonthlyFee">
                    <label for="maxMonthlyFee">Maks månedspris</label>
                    <br />
                    <PriceInput
                      id="maxMonthlyFee"
                      v-model="currentOffer.maxMonthlyFee"
                    />
                  </div>
                  <div class="form-group form-group--half" v-if="currentOffer.enableOnetimeFee">
                    <label for="maxOnetimeFee">Maks engangspris</label>
                    <br />
                    <PriceInput
                      id="maxOnetimeFee"
                      v-model="currentOffer.maxOnetimeFee"
                    />
                  </div>
                </div>
              </div>

              <div class="form-section" v-if="currentOffer.enableMonthlyFee || currentOffer.enableOnetimeFee">
                <h6>Selgers bonus (prosent regnes som andel av salgspris minus selvkost)</h6>

                <div class="form-row">
                  <div class="form-group form-group--half" v-if="currentOffer.enableMonthlyFee">
                    <label for="monthlyBonusToSeller">Månedsbonus</label>
                    <br />
                    <PriceInput
                      id="monthlyBonusToSeller"
                      v-model="currentOffer.monthlyBonusToSeller"
                    />
                  </div>
                  <div class="form-group form-group--half" v-if="currentOffer.enableOnetimeFee">
                    <label for="onetimeBonusToSeller">Engangsbonus</label>
                    <br />
                    <PriceInput
                      id="onetimeBonusToSeller"
                      v-model="currentOffer.onetimeBonusToSeller"
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group form-group--half" v-if="currentOffer.enableMonthlyFee">
                    <label for="monthlyPercentBonusToSeller">Månedsbonus (%)</label>
                    <br />
                    <input
                      id="monthlyPercentBonusToSeller"
                      v-model="currentOffer.monthlyPercentBonusToSeller"
                      type="number"
                      min="0"
                      max="100"
                      @input="ensureNumericValue($event, 'monthlyPercentBonusToSeller')"
                    />
                  </div>
                  <div class="form-group form-group--half" v-if="currentOffer.enableOnetimeFee">
                    <label for="onetimePercentBonusToSeller">Engangsbonus (%)</label>
                    <br />
                    <input
                      id="onetimePercentBonusToSeller"
                      v-model="currentOffer.onetimePercentBonusToSeller"
                      type="number"
                      min="0"
                      max="100"
                      @input="ensureNumericValue($event, 'onetimePercentBonusToSeller')"
                    />
                  </div>
                </div>
              </div>

              <div class="form-section" v-if="currentOffer.enableMonthlyFee || currentOffer.enableOnetimeFee">
                <h6>Selgers leders bonus (prosent regnes som andel av salgspris minus selvkost)</h6>
                <div class="form-row">
                  <div class="form-group form-group--half" v-if="currentOffer.enableMonthlyFee">
                    <label for="monthlyBonusToSellersManager">Månedsbonus</label>
                    <br />
                    <PriceInput
                      id="monthlyBonusToSellersManager"
                      v-model="currentOffer.monthlyBonusToSellersManager"
                    />
                  </div>
                  <div class="form-group form-group--half" v-if="currentOffer.enableOnetimeFee">
                    <label for="oneTimeBonusToSellersManager">Engangsbonus</label>
                    <br />
                    <PriceInput
                      id="oneTimeBonusToSellersManager"
                      v-model="currentOffer.oneTimeBonusToSellersManager"
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group form-group--half" v-if="currentOffer.enableMonthlyFee">
                    <label for="monthlyPercentBonusToSellersManager">Månedsbonus (%)</label>
                    <br />
                    <input
                      id="monthlyPercentBonusToSellersManager"
                      v-model="currentOffer.monthlyPercentBonusToSellersManager"
                      type="number"
                      min="0"
                      max="100"
                      @input="ensureNumericValue($event, 'monthlyPercentBonusToSellersManager')"
                    />
                  </div>
                  <div class="form-group form-group--half" v-if="currentOffer.enableOnetimeFee">
                    <label for="onetimePercentBonusToSellersManager">Engangsbonus (%)</label>
                    <br />
                    <input
                      id="onetimePercentBonusToSellersManager"
                      v-model="currentOffer.onetimePercentBonusToSellersManager"
                      type="number"
                      min="0"
                      max="100"
                      @input="ensureNumericValue($event, 'onetimePercentBonusToSellersManager')"
                    />
                  </div>
                </div>
              </div>

              <div class="modal-buttons">
                <input
                  class="emoji-btn"
                  type="button"
                  value="Avbryt"
                  @click="closeOfferModal"
                />
                <input
                  class="emoji-btn"
                  type="submit"
                  value="Lagre"
                />
              </div>
            </form>
          </div>
        </Modal>

        <Modal
          v-if="showDeleteModal"
          :wide="true"
          @close="closeDeleteModal"
        >
          <div style="width: 500px; max-width: 90vw; margin: 0 auto; text-align: center">
            <h1 style="margin-bottom: 1em">Bekreft sletting</h1>
            <p>
              Er du sikker på at du vil slette varen/tjenesten
              <strong>{{ itemToDelete && itemToDelete.name }}</strong
              >?
            </p>
            <div class="modal-buttons">
              <input
                class="emoji-btn"
                type="button"
                value="Avbryt"
                @click="closeDeleteModal"
              />
              <input
                class="emoji-btn"
                type="button"
                value="Slett"
                @click="deleteOffer"
              />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "@/components/organisms/AdminPage.vue";
import Modal from "@/components/atoms/Modal.vue";
import PriceInput from "@/components/atoms/PriceInput.vue";
import { OfferItemModel } from "@/core/models";

export default {
  components: { AdminPage, Modal, PriceInput },

  data() {
    return {
      isLoading: false,
      offerItems: [],
      showOfferModal: false,
      showDeleteModal: false,
      isEditMode: false,
      currentOffer: new OfferItemModel(),
      itemToDelete: null,
      refreshInterval: null,
    };
  },

  computed: {
    // Removed individual display computed properties
  },

  mounted() {
    if (!this.$store.getters.userIsLoggedIn || !this.$store.state.currentUser?.isPowerUser) {
      this.$router.push("/admin");
      return;
    }

    this.fetchOfferItems();

    // Set up auto-refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.fetchDataInBackground();
    }, 30000);
  },

  beforeDestroy() {
    // Clear the interval when component is destroyed
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },

  methods: {
    fetchOfferItems() {
      this.isLoading = true;
      this._offerService
        .GetAll()
        .then((response) => {
          this.offerItems = Array.isArray(response) ? response : [];
        })
        .catch((error) => {
          console.error("Error fetching offer items:", error);
          alert("Kunne ikke hente varer/tjenester. Prøv igjen senere.");
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    // New method to fetch data in background without setting isLoading flag
    fetchDataInBackground() {
      this._offerService
        .GetAll()
        .then((response) => {
          this.offerItems = Array.isArray(response) ? response : [];
        })
        .catch((error) => {
          console.error("Error fetching offer items in background:", error);
        });
    },

    showAddOfferModal() {
      this.isEditMode = false;
      this.currentOffer = new OfferItemModel();
      this.showOfferModal = true;
    },

    editOffer(item) {
      this.isEditMode = true;
      this.currentOffer = { ...item };
      this.showOfferModal = true;
    },

    closeOfferModal() {
      this.showOfferModal = false;
    },

    confirmDeleteOffer(item) {
      this.itemToDelete = item;
      this.showDeleteModal = true;
    },

    closeDeleteModal() {
      this.showDeleteModal = false;
    },

    saveOffer() {
      this.isLoading = true;
      this._offerService
        .CreateOrUpdateOffer(this.currentOffer)
        .then(() => {
          this.showOfferModal = false;
          this.fetchOfferItems();
        })
        .catch((error) => {
          console.error("Error saving offer item:", error);
          alert("Kunne ikke lagre vare/tjeneste. Prøv igjen senere.");
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    deleteOffer() {
      if (!this.itemToDelete) {
        return;
      }

      this.isLoading = true;
      this._offerService
        .DeleteOffer(this.itemToDelete.offerItemId)
        .then(() => {
          this.showDeleteModal = false;
          this.fetchOfferItems();
        })
        .catch((error) => {
          console.error("Error deleting offer item:", error);
          alert("Kunne ikke slette vare/tjeneste. Prøv igjen senere.");
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    ensureNumericValue(event, field) {
      // If the input is empty or not a number, set it to 0
      if (event.target.value === "" || isNaN(event.target.value)) {
        this.currentOffer[field] = 0;
      }
    },
  },
};
</script>

<style scoped>
.overview__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.overview__button {
  background-color: #333;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
}

.overview__button:hover {
  background-color: #555;
}

.overview__table-container {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.overview__table {
  width: 100%;
  border-collapse: collapse;
}

.overview__table th,
.overview__table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.overview__table th {
  font-weight: 600;
  color: #4a5568;
}

.overview__table tbody tr:hover {
  background-color: #f7fafc;
}

.overview__empty {
  text-align: center;
  color: #a0aec0;
  padding: 2rem 0;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
  border: none;
}

.action-button--view {
  background-color: #e6fffa;
  color: #319795;
}

.action-button--view:hover {
  background-color: #b2f5ea;
}

.action-button--reject {
  background-color: #fed7d7;
  color: #c53030;
}

.action-button--reject:hover {
  background-color: #feb2b2;
}

.action-button--edit {
  background-color: #ebf8ff;
  color: #333;
}

.action-button--edit:hover {
  background-color: #bee3f8;
}

.form-section {
  margin-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
}

.form-section h6 {
  margin-bottom: 1rem;
  font-weight: 600;
  color: #4a5568;
}

.form-row {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
  text-align: left;
}

.form-group label {
  display: inline-block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: #4a5568;
}

.form-group--half {
  width: calc(50% - 0.5rem);
}

@media (max-width: 767px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }

  .form-group--half {
    width: 100%;
  }
}

.form-group--third {
  width: calc(33.333% - 0.5rem);
}

@media (max-width: 767px) {
  .form-group--third {
    width: 100%;
  }
}

.modal-buttons {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

input {
  padding: 0.625rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
  width: 100%;
}

input:focus {
  outline: none;
  border-color: #333;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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

.emoji-btn.cancel-btn:hover {
  background-color: #f7fafc;
  border-color: #e2e8f0;
}

textarea {
  padding: 0.625rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
  resize: vertical;
  width: 100%;
}

textarea:focus {
  outline: none;
  border-color: #333;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.visible-loader {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1000;
  background-color: rgba(255, 255, 255, 0.9);
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
}

.checkbox-container {
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
}

.checkbox-input {
  margin-right: 0.5rem;
  width: auto;
  cursor: pointer;
}

.checkbox-label {
  cursor: pointer;
  font-weight: 500;
  margin-bottom: 0;
}
</style>
