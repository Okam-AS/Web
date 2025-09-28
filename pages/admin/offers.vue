<template>
  <AdminPage :full-width="true">
    <div class="overview">
      <div class="overview__content">
        <!-- Offer Proposals Section -->
        <div class="overview__table-container">
          <div class="overview__header">
            <div class="title-container">
              <h3>Avtaler</h3>
              <Loading
                v-if="isLoading"
                class="header-spinner"
              />
            </div>
            <button
              class="overview__button"
              @click="showCreateProposalModal"
            >
              Opprett avtale
            </button>
          </div>
          <table class="overview__table">
            <thead>
              <tr>
                <th class="sortable-header">Kode</th>
                <th class="sortable-header">Kunde</th>
                <th class="sortable-header">Firma</th>
                <th class="sortable-header">Status</th>
                <th class="sortable-header">Opprettet</th>
                <th class="sortable-header">Endret</th>
                <th class="sortable-header">Selger</th>
                <th>Handling</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="proposal in offerProposals"
                :key="proposal.offerProposalId"
              >
                <td>{{ proposal.code }}</td>
                <td>{{ proposal.clientName }}</td>
                <td>{{ proposal.companyLegalName }}</td>
                <td>
                  <span :class="getStatusClass(proposal.status)">
                    {{ getStatusLabel(proposal.status) }}
                  </span>
                </td>
                <td>{{ formatDate(proposal.createdAt) }}</td>
                <td>{{ formatDate(proposal.updatedAt) }}</td>
                <td>{{ proposal.sellerName || "-" }}</td>
                <td>
                  <div class="action-buttons">
                    <button
                      class="action-button action-button--view"
                      @click="viewProposal(proposal)"
                    >
                      Vis
                    </button>
                    <button
                      v-if="proposal.status === 'Created' || proposal.status === 'Sent' || proposal.status === 'Read'"
                      class="action-button action-button--edit"
                      @click="editProposal(proposal)"
                    >
                      Endre
                    </button>
                    <button
                      v-if="proposal.status === 'Created' || proposal.status === 'Sent' || proposal.status === 'Read'"
                      class="action-button action-button--reject"
                      @click="rejectProposal(proposal)"
                    >
                      Slett
                    </button>
                    <button
                      v-if="proposal.status === 'StoreRegistered' || proposal.status === 'Accepted'"
                      class="action-button action-button--cancel"
                      @click="cancelProposalConfirmation(proposal)"
                    >
                      Si opp
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="offerProposals.length === 0">
                <td
                  colspan="8"
                  class="overview__empty"
                >
                  Ingen avtaler funnet
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Modals -->
        <Modal
          v-if="showProposalModal"
          :wide="true"
          @close="closeProposalModal"
        >
          <div style="width: 1000px; max-width: 90vw; margin: 0 auto; text-align: center">
            <h1 style="margin-bottom: 1em">
              {{ isEditingProposal ? "Endre avtale" : "Opprett ny avtale" }}
            </h1>

            <div v-if="proposalStep === 1">
              <div class="form-group">
                <div
                  class="vat-input-container"
                  style="display: flex; justify-content: center; align-items: center; margin: 0 auto"
                >
                  <input
                    id="companyVAT"
                    v-model="currentProposal.companyVAT"
                    type="text"
                    class="kam-input"
                    placeholder="Organisasjonsnummer"
                    required
                    style="width: 400px; font-size: 18px; padding: 10px"
                    @keyup.enter="lookupCompanyInfo"
                  />
                  <button
                    class="emoji-btn lookup-btn"
                    :disabled="isLookingUp"
                    style="height: 44px; font-size: 18px; padding: 10px; margin-left: 10px"
                    @click="lookupCompanyInfo"
                  >
                    {{ isLookingUp ? "Søker..." : "Søk" }}
                  </button>
                </div>
              </div>
            </div>

            <form
              v-if="proposalStep === 2"
              @submit.prevent="saveProposal"
            >
              <div class="form-section">
                <h6 class="section-title">Kundeinformasjon</h6>
                <div class="form-row">
                  <div class="form-group form-group--half">
                    <label for="clientName">Navn på kontaktperson *</label>
                    <br />
                    <input
                      id="clientName"
                      v-model="currentProposal.clientName"
                      type="text"
                      class="kam-input"
                      required
                    />
                  </div>
                  <div class="form-group form-group--half">
                    <label for="clientPhoneNumber">Telefonnummer *</label>
                    <br />
                    <input
                      id="clientPhoneNumber"
                      v-model="currentProposal.clientPhoneNumber"
                      type="tel"
                      class="kam-input"
                      required
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="clientEmail">E-post</label>
                    <br />
                    <input
                      id="clientEmail"
                      v-model="currentProposal.clientEmail"
                      type="email"
                      class="kam-input"
                    />
                  </div>
                </div>
              </div>

              <div class="form-section">
                <h6 class="section-title">Firmainformasjon</h6>
                <div class="form-row">
                  <div class="form-group form-group--half">
                    <label for="companyLegalName">Firmanavn *</label>
                    <br />
                    <input
                      id="companyLegalName"
                      v-model="currentProposal.companyLegalName"
                      type="text"
                      class="kam-input"
                      required
                    />
                  </div>
                  <div class="form-group form-group--half">
                    <label for="companyVAT">Organisasjonsnummer *</label>
                    <br />
                    <input
                      id="companyVAT"
                      v-model="currentProposal.companyVAT"
                      type="text"
                      class="kam-input"
                      required
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="companyFullAddress">Adresse</label>
                    <br />
                    <input
                      id="companyFullAddress"
                      v-model="currentProposal.companyFullAddress"
                      type="text"
                      class="kam-input"
                    />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group form-group--half">
                    <label for="companyZipCode">Postnummer</label>
                    <br />
                    <input
                      id="companyZipCode"
                      v-model="currentProposal.companyZipCode"
                      type="text"
                      class="kam-input"
                    />
                  </div>
                  <div class="form-group form-group--half">
                    <label for="companyCity">Sted</label>
                    <br />
                    <input
                      id="companyCity"
                      v-model="currentProposal.companyCity"
                      type="text"
                      class="kam-input"
                    />
                  </div>
                </div>
              </div>

              <div class="form-section">
                <h6 class="section-title">Varer og tjenester</h6>
                <div class="offer-items-selection">
                  <div
                    v-for="item in offerItems"
                    :key="item.offerItemId"
                    class="offer-item-checkbox"
                  >
                    <div class="custom-checkbox">
                      <input
                        :id="'item-' + item.offerItemId"
                        v-model="selectedOfferItems"
                        type="checkbox"
                        :value="item.offerItemId"
                        class="custom-checkbox-input"
                        @change="updateLineItems"
                      />
                      <label
                        :for="'item-' + item.offerItemId"
                        class="custom-checkbox-label"
                      />
                    </div>
                    <label :for="'item-' + item.offerItemId"> {{ item.name }} </label>
                    <div
                      v-if="isItemSelected(item.offerItemId)"
                      class="quantity-selector"
                    >
                      <div class="price-input-group">
                        <label :for="'quantity-' + item.offerItemId">Antall:</label>
                        <input
                          :id="'quantity-' + item.offerItemId"
                          v-model.number="lineItems[item.offerItemId].quantity"
                          type="number"
                          min="1"
                          class="quantity-input"
                        />
                      </div>
                      <template v-if="item.enableMonthlyFee">
                        <div class="price-input-group">
                          <label :for="'monthlyFee-' + item.offerItemId">Mnd. pris:</label>
                          <PriceInput
                            :id="'monthlyFee-' + item.offerItemId"
                            v-model="lineItems[item.offerItemId].monthlyFee"
                            class="price-input-wrapper"
                          />
                        </div>
                      </template>
                      <template v-if="item.enableOnetimeFee">
                        <div class="price-input-group">
                          <label :for="'onetimeFee-' + item.offerItemId">Engangs:</label>
                          <PriceInput
                            :id="'onetimeFee-' + item.offerItemId"
                            v-model="lineItems[item.offerItemId].onetimeFee"
                            class="price-input-wrapper"
                          />
                        </div>
                      </template>
                    </div>
                  </div>
                  <div
                    v-if="offerItems.length === 0"
                    class="no-items-message"
                  >
                    Ingen varer eller tjenester tilgjengelig
                  </div>
                </div>
              </div>

              <div class="modal-buttons">
                <input
                  class="emoji-btn cancel-btn"
                  type="button"
                  value="Avbryt"
                  @click="closeProposalModal"
                />
                <input
                  class="emoji-btn save-btn"
                  type="submit"
                  value="Lagre"
                  :disabled="!isProposalValid || isSubmitting"
                />
              </div>
            </form>
          </div>
        </Modal>

        <!-- View Proposal Modal -->
        <Modal
          v-if="showViewProposalModal"
          :wide="true"
          @close="closeViewProposalModal"
        >
          <div style="width: 900px; max-width: 90vw; margin: 0 auto">
            <div v-if="viewingProposal">
              <div class="preview-container">
                <div class="scrollable-document-container">
                  <OfferDocument :offer-proposal="viewingProposal" />
                </div>
              </div>

              <div class="modal-buttons">
                <button
                  class="emoji-btn"
                  @click="closeViewProposalModal"
                >
                  Lukk
                </button>
                <button
                  v-if="viewingProposal && (viewingProposal.status === 'Created' || viewingProposal.status === 'Sent')"
                  class="emoji-btn"
                  @click="editViewingProposal"
                >
                  Endre
                </button>
                <button
                  v-if="viewingProposal && viewingProposal.clientPhoneNumber && (viewingProposal.status === 'Created' || viewingProposal.status === 'Sent' || viewingProposal.status === 'Read')"
                  class="emoji-btn save-btn"
                  :disabled="isSendingSms"
                  @click="sendProposalSms"
                >
                  {{ viewingProposal.status === "Created" ? "Send SMS" : "Send ny SMS" }}
                </button>
                <button
                  v-if="viewingProposal && viewingProposal.clientEmail && (viewingProposal.status === 'Created' || viewingProposal.status === 'Sent' || viewingProposal.status === 'Read')"
                  class="emoji-btn save-btn"
                  :disabled="isSendingEmail"
                  @click="sendProposalEmail"
                >
                  {{ viewingProposal.status === "Created" ? "Send E-post" : "Send ny E-post" }}
                </button>
              </div>
            </div>
          </div>
        </Modal>

        <!-- Delete Proposal Confirmation Modal -->
        <Modal
          v-if="showDeleteProposalModal"
          :wide="true"
          @close="closeDeleteProposalModal"
        >
          <div style="width: 500px; max-width: 90vw; margin: 0 auto; text-align: center">
            <h1 style="margin-bottom: 1em">Bekreft sletting</h1>
            <p>
              Er du sikker på at du vil slette avtalen for <strong>{{ proposalToDelete?.clientName }}</strong
              >?
            </p>
            <div class="modal-buttons">
              <input
                class="emoji-btn cancel-btn"
                type="button"
                value="Avbryt"
                @click="closeDeleteProposalModal"
              />
              <input
                class="emoji-btn action-button--reject"
                type="button"
                value="Slett"
                @click="confirmDeleteProposal"
              />
            </div>
          </div>
        </Modal>

        <!-- Cancel Proposal Confirmation Modal -->
        <Modal
          v-if="showCancelProposalModal"
          :wide="true"
          @close="closeCancelProposalModal"
        >
          <div style="width: 500px; max-width: 90vw; margin: 0 auto; text-align: center">
            <h1 style="margin-bottom: 1em">Bekreft oppsigelse</h1>
            <p>
              Er du sikker på at du vil si opp avtalen for <strong>{{ proposalToCancel?.clientName }}</strong
              >?
            </p>
            <div class="modal-buttons">
              <input
                class="emoji-btn cancel-btn"
                type="button"
                value="Avbryt"
                @click="closeCancelProposalModal"
              />
              <input
                class="emoji-btn action-button--cancel"
                type="button"
                value="Si opp"
                @click="confirmCancelProposal"
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
import Loading from "@/components/atoms/Loading.vue";
import Modal from "@/components/atoms/Modal.vue";
import OfferDocument from "@/components/shared/OfferDocument.vue"; // Import OfferDocument component
import PriceInput from "@/components/atoms/PriceInput.vue"; // Import PriceInput component
import { OfferItemModel, OfferProposalModel, OfferProposalLineItemModel } from "@/core/models";

export default {
  components: { AdminPage, Loading, Modal, OfferDocument, PriceInput }, // Register OfferDocument and PriceInput components

  data() {
    return {
      isLoading: true,
      offerProposals: [],
      showProposalModal: false,
      showViewProposalModal: false,
      showDeleteProposalModal: false,
      showCancelProposalModal: false,
      currentProposal: new OfferProposalModel(),
      viewingProposal: null,
      proposalToDelete: null,
      proposalToCancel: null,
      isEditingProposal: false,
      proposalStep: 1,
      selectedOfferItems: [],
      lineItems: {},
      offerItems: [], // Add back offerItems array
      isLookingUp: false,
      isSubmitting: false,
      isSendingSms: false,
      isSendingEmail: false,
      refreshInterval: null,
    };
  },

  computed: {
    isProposalValid() {
      return this.currentProposal.companyVAT && this.currentProposal.clientName && this.currentProposal.clientPhoneNumber && this.currentProposal.companyLegalName && this.selectedOfferItems.length > 0;
    },
  },

  mounted() {
    this.fetchOfferProposals();
    this.fetchOfferItems(); // Add back fetchOfferItems method

    // Set up interval to refresh data every 10 seconds without setting isLoading
    this.refreshInterval = setInterval(() => {
      this.fetchDataInBackground();
    }, 10000);
  },

  beforeDestroy() {
    // Clean up the interval when component is destroyed
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },

  methods: {
    fetchOfferProposals() {
      this.isLoading = true;
      this._offerProposalService
        .GetAll()
        .then((data) => {
          this.offerProposals = data;
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    // New method to fetch data in background without setting isLoading flag
    fetchDataInBackground() {
      // Fetch offer proposals without setting isLoading
      this._offerProposalService.GetAll().then((data) => {
        this.offerProposals = data;
      });

      // Fetch offer items without setting isLoading
      this._offerService.GetAll().then((data) => {
        this.offerItems = data;
      });
    },

    fetchOfferItems() {
      this._offerService
        .GetAll()
        .then((data) => {
          this.offerItems = data;
        })
        .catch((error) => {
          console.error("Error fetching offer items:", error);
        });
    },

    showCreateProposalModal() {
      this.isEditingProposal = false;
      this.currentProposal = {
        clientName: "",
        clientEmail: "",
        clientPhoneNumber: "",
        companyLegalName: "",
        companyVAT: "",
        companyFullAddress: "",
        companyZipCode: "",
        companyCity: "",
      };
      this.selectedOfferItems = [];
      this.lineItems = {};
      this.proposalStep = 1;
      this.showProposalModal = true;
    },

    editProposal(proposal) {
      this.isEditingProposal = true;
      this.currentProposal = { ...proposal };

      // Set up selected items and quantities
      this.selectedOfferItems = [];
      this.lineItems = {};

      if (proposal.lineItems && proposal.lineItems.length > 0) {
        proposal.lineItems.forEach((item) => {
          this.selectedOfferItems.push(item.originalOfferItemId);
          this.lineItems[item.originalOfferItemId] = {
            quantity: item.quantity || 1,
            monthlyFee: item.monthlyFee,
            onetimeFee: item.onetimeFee,
          };
        });
      }

      this.proposalStep = 2; // Skip the VAT lookup step
      this.showProposalModal = true;
    },

    closeProposalModal() {
      this.showProposalModal = false;
    },

    async lookupCompanyInfo() {
      if (!this.currentProposal.companyVAT) {
        alert("Skriv inn organisasjonsnummeret først, er du snill 😃");
        return;
      }

      this.isLookingUp = true;

      try {
        const vatNumber = this.currentProposal.companyVAT.trim().replace(/\D/g, "");
        this.currentProposal.companyVAT = vatNumber;
        const brregData = await this._storeService.GetBrregData(vatNumber);

        // Populate form with data from Brreg
        this.currentProposal.companyLegalName = brregData.name || "";
        this.currentProposal.companyFullAddress = brregData.fullAddress || "";
        this.currentProposal.companyZipCode = brregData.zipCode || "";
        this.currentProposal.companyCity = brregData.city || "";

        // Move to step 2
        this.proposalStep = 2;
      } catch (error) {
        console.error("Failed to get company data:", error);
        // Still move to step 2 even if lookup fails
        this.proposalStep = 2;
      } finally {
        this.isLookingUp = false;
      }
    },

    isItemSelected(itemId) {
      return this.selectedOfferItems.includes(itemId);
    },

    getLineItemQuantity(itemId) {
      return this.lineItems[itemId]?.quantity || 1;
    },

    updateLineItems() {
      // Create a new object to store updated line items
      const updatedLineItems = {};

      // Process each selected offer item
      this.selectedOfferItems.forEach((itemId) => {
        // Find the corresponding offer item for default values
        const offerItem = this.offerItems.find((item) => item.offerItemId === itemId);

        // If this is a newly selected item, initialize it with default values
        if (!this.lineItems[itemId]) {
          updatedLineItems[itemId] = {
            quantity: 1,
            monthlyFee: offerItem ? offerItem.maxMonthlyFee : 0,
            onetimeFee: offerItem ? offerItem.maxOnetimeFee : 0,
          };
          console.log(`updateLineItems - New item ${itemId}, setting defaults:`, updatedLineItems[itemId]);
        } else {
          // For existing items, preserve the exact values without conversion
          updatedLineItems[itemId] = {
            quantity: this.lineItems[itemId].quantity || 1,
            monthlyFee: this.lineItems[itemId].monthlyFee,
            onetimeFee: this.lineItems[itemId].onetimeFee,
          };
          console.log(`updateLineItems - Existing item ${itemId}, preserving values:`, updatedLineItems[itemId]);
        }
      });

      // Update the line items object
      this.lineItems = updatedLineItems;
    },

    async saveProposal() {
      if (!this.isProposalValid) {
        alert("🫨 Du er litt for kjapp! Fyll ut alle feltene og velg minst én vare eller tjeneste først.");
        return;
      }

      // Prevent double submission
      if (this.isSubmitting) {
        return;
      }

      this.isSubmitting = true;
      console.log("saveProposal - Starting save with lineItems:", JSON.stringify(this.lineItems));

      // Create a new proposal model
      const proposal = new OfferProposalModel();

      // If editing, set the ID
      if (this.isEditingProposal && this.currentProposal.offerProposalId) {
        proposal.offerProposalId = this.currentProposal.offerProposalId;
      }

      // Set client information
      proposal.clientName = this.currentProposal.clientName;
      proposal.clientEmail = this.currentProposal.clientEmail;
      proposal.clientPhoneNumber = this.currentProposal.clientPhoneNumber;

      // Set company information
      proposal.companyLegalName = this.currentProposal.companyLegalName;
      proposal.companyVAT = this.currentProposal.companyVAT;
      proposal.companyFullAddress = this.currentProposal.companyFullAddress;
      proposal.companyZipCode = this.currentProposal.companyZipCode;
      proposal.companyCity = this.currentProposal.companyCity;

      // Set line items
      proposal.lineItems = [];

      this.selectedOfferItems.forEach((itemId) => {
        const offerItem = this.offerItems.find((item) => item.offerItemId === itemId);
        if (offerItem) {
          const lineItem = new OfferProposalLineItemModel();
          lineItem.originalOfferItemId = itemId;
          lineItem.offerItemId = itemId; // Set both IDs for now

          // Get the quantity
          lineItem.quantity = Number(this.lineItems[itemId]?.quantity) || 1;

          // Use the exact values from lineItems without additional conversion or validation
          // This preserves the values that were entered by the user
          lineItem.monthlyFee = this.lineItems[itemId]?.monthlyFee;
          lineItem.onetimeFee = this.lineItems[itemId]?.onetimeFee;

          console.log(`saveProposal - Adding line item for ${itemId}:`, {
            quantity: lineItem.quantity,
            monthlyFee: lineItem.monthlyFee,
            onetimeFee: lineItem.onetimeFee,
          });

          proposal.lineItems.push(lineItem);
        }
      });

      // Save the proposal
      const proposalId = this.isEditingProposal ? this.currentProposal.offerProposalId : 0;
      try {
        const savedProposal = await this._offerProposalService.CreateOrUpdateOfferProposal(proposalId, proposal);

        // Get the ID of the saved proposal
        const savedProposalId = savedProposal?.offerProposalId || (this.isEditingProposal ? proposalId : null);

        // Close the proposal creation/edit modal
        this.closeProposalModal();

        // Refresh the proposals list and then view the saved proposal
        if (savedProposalId) {
          // First fetch the updated list
          await this.fetchOfferProposals();
          // Try to find the proposal by ID first
          let createdProposal = this.offerProposals.find((p) => p.offerProposalId === savedProposalId);

          if (!createdProposal) {
            // If not found, try fetching it directly by ID
            try {
              // Get all proposals again to make sure we have the latest data
              const allProposals = await this._offerProposalService.GetAll();
              createdProposal = allProposals.find((p) => p.offerProposalId === savedProposalId);

              // If found in the new fetch, update our local list
              if (createdProposal) {
                this.offerProposals = allProposals;
              }
            } catch (error) {
              console.error("Error fetching all proposals:", error);
            }
          }

          if (createdProposal) {
            // Open the view modal for the newly created/updated proposal
            this.viewProposal(createdProposal);
          } else {
            console.error("Could not find the created proposal in the updated list");
            alert("Avtalen ble opprettet, men kunne ikke vise detaljer. Oppdater siden for å se den nye avtalen.");
          }
        } else {
          console.error("No proposal ID returned from save operation");
          alert("Avtalen ble opprettet, men kunne ikke vise detaljer. Oppdater siden for å se den nye avtalen.");
        }
      } catch (error) {
        console.error("Error saving proposal:", error);
        if (error?.response?.data) {
          alert(error?.response?.data);
        } else {
          alert(error.message || "En ukjent feil oppstod ved lagring av avtalen");
        }
      } finally {
        this.isSubmitting = false;
      }
    },

    getStatusLabel(status) {
      switch (status) {
        case "Created":
          return "Ikke sendt";
        case "Sent":
          return "Sendt";
        case "Read":
          return "Lest";
        case "Accepted":
          return "Akseptert";
        case "StoreRegistered":
          return "Registrert";
        case "Rejected":
          return "Avvist";
        case "Cancelled":
          return "Oppsagt";
        default:
          return status;
      }
    },

    getStatusClass(status) {
      switch (status) {
        case "Created":
          return "status-badge status-badge--created";
        case "Sent":
          return "status-badge status-badge--sent";
        case "Read":
          return "status-badge status-badge--read";
        case "Accepted":
          return "status-badge status-badge--accepted";
        case "StoreRegistered":
          return "status-badge status-badge--registered";
        case "Rejected":
          return "status-badge status-badge--rejected";
        case "Cancelled":
          return "status-badge status-badge--cancelled";
        default:
          return "status-badge";
      }
    },

    calculateTotalMonthly(proposal) {
      if (!proposal || !proposal.lineItems) {
        return this.priceLabel(0);
      }
      const total = proposal.lineItems.reduce((sum, item) => {
        if (item.monthlyFee) {
          // Monthly fee is stored in øre, convert to kroner for display
          return sum + (item.monthlyFee / 100) * item.quantity;
        }
        return sum;
      }, 0);
      return this.priceLabel(total);
    },

    calculateTotalOnetime(proposal) {
      if (!proposal || !proposal.lineItems) {
        return this.priceLabel(0);
      }
      const total = proposal.lineItems.reduce((sum, item) => {
        if (item.onetimeFee) {
          // Onetime fee is stored in øre, convert to kroner for display
          return sum + (item.onetimeFee / 100) * item.quantity;
        }
        return sum;
      }, 0);
      return this.priceLabel(total);
    },

    calculateTotalMonthlyValue(proposal) {
      if (!proposal || !proposal.lineItems) {
        return 0;
      }
      const total = proposal.lineItems.reduce((sum, item) => {
        if (item.monthlyFee) {
          // Monthly fee is stored in øre, convert to kroner for calculations
          return sum + (item.monthlyFee / 100) * item.quantity;
        }
        return sum;
      }, 0);
      return total;
    },

    calculateTotalOnetimeValue(proposal) {
      if (!proposal || !proposal.lineItems) {
        return 0;
      }
      const total = proposal.lineItems.reduce((sum, item) => {
        if (item.onetimeFee) {
          // Onetime fee is stored in øre, convert to kroner for calculations
          return sum + (item.onetimeFee / 100) * item.quantity;
        }
        return sum;
      }, 0);
      return total;
    },

    sendProposalSms() {
      if (!this.viewingProposal || !this.viewingProposal.offerProposalId) {
        alert("Kunne ikke sende SMS: Mangler avtale-ID");
        return;
      }

      // Prevent double submission
      if (this.isSendingSms) {
        return;
      }

      this.isSendingSms = true;
      this.isLoading = true;
      this._offerProposalService
        .SendProposalSms(this.viewingProposal.offerProposalId)
        .then(() => {
          this.closeViewProposalModal();
          this.fetchOfferProposals();
        })
        .catch((error) => {
          console.error("Error sending SMS:", error);
          alert("Kunne ikke sende SMS: " + (error.message || "Ukjent feil"));
        })
        .finally(() => {
          this.isLoading = false;
          this.isSendingSms = false;
        });
    },
    sendProposalEmail() {
      if (!this.viewingProposal || !this.viewingProposal.offerProposalId) {
        alert("Kunne ikke sende E-post: Mangler avtale-ID");
        return;
      }

      // Prevent double submission
      if (this.isSendingEmail) {
        return;
      }

      this.isSendingEmail = true;
      this.isLoading = true;
      this._offerProposalService
        .SendProposalEmail(this.viewingProposal.offerProposalId)
        .then(() => {
          this.closeViewProposalModal();
          this.fetchOfferProposals();
        })
        .catch((error) => {
          console.error("Error sending Email:", error);
          alert("Kunne ikke sende E-post: " + (error.message || "Ukjent feil"));
        })
        .finally(() => {
          this.isLoading = false;
          this.isSendingEmail = false;
        });
    },
    editViewingProposal() {
      this.editProposal(this.viewingProposal);
      this.closeViewProposalModal();
    },
    viewProposal(proposal) {
      console.log("viewProposal called with:", proposal);
      console.log("Proposal code:", proposal.code);
      console.log("Proposal ID:", proposal.offerProposalId);

      if (!proposal.code) {
        console.error("ERROR: Proposal code is missing or undefined!");
        // Try to fetch the proposal by ID if code is missing
        if (proposal.offerProposalId) {
          console.log("Attempting to fetch proposal details by ID instead of code");
          this.isLoading = true;
          this._offerProposalService
            .GetAll()
            .then((allProposals) => {
              const foundProposal = allProposals.find((p) => p.offerProposalId === proposal.offerProposalId);
              if (foundProposal && foundProposal.code) {
                console.log("Found proposal with code by ID:", foundProposal);
                this.viewProposal(foundProposal);
              } else {
                console.error("Could not find proposal with code even after fetching all proposals");
                alert("Kunne ikke hente avtaledetaljer - manglende kode");
              }
            })
            .catch((error) => {
              console.error("Error fetching all proposals:", error);
            })
            .finally(() => {
              this.isLoading = false;
            });
          return;
        }
      }

      // Get the full proposal with line items
      this.isLoading = true;
      this._offerProposalService
        .GetByCode(proposal.code)
        .then((response) => {
          console.log("GetByCode response:", response);
          this.viewingProposal = response;
          this.showViewProposalModal = true;
          console.log("View modal should be visible now, showViewProposalModal =", this.showViewProposalModal);
        })
        .catch((error) => {
          console.error("Error fetching proposal details:", error);
          alert("Kunne ikke hente avtaledetaljer");
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    closeViewProposalModal() {
      this.showViewProposalModal = false;
      this.viewingProposal = null;
    },

    async rejectProposal(proposal) {
      this.proposalToDelete = proposal;
      this.showDeleteProposalModal = true;
    },

    closeDeleteProposalModal() {
      this.showDeleteProposalModal = false;
      this.proposalToDelete = null;
    },

    async confirmDeleteProposal() {
      try {
        this.isLoading = true;
        await this._offerProposalService.RejectProposal(this.proposalToDelete.offerProposalId);
        // Refresh the list of proposals
        this.fetchOfferProposals();
        this.closeDeleteProposalModal();
      } catch (error) {
        console.error("Error rejecting proposal:", error);
        alert("Kunne ikke slette avtalen. Vennligst prøv igjen senere.");
      } finally {
        this.isLoading = false;
      }
    },

    async cancelProposalConfirmation(proposal) {
      this.proposalToCancel = proposal;
      this.showCancelProposalModal = true;
    },

    closeCancelProposalModal() {
      this.showCancelProposalModal = false;
      this.proposalToCancel = null;
    },

    async confirmCancelProposal() {
      try {
        this.isLoading = true;
        await this._offerProposalService.CancelProposal(this.proposalToCancel.offerProposalId);
        // Refresh the list of proposals
        this.fetchOfferProposals();
        this.closeCancelProposalModal();
      } catch (error) {
        console.error("Error canceling proposal:", error);
        alert("Kunne ikke si opp avtalen. Vennligst prøv igjen senere.");
      } finally {
        this.isLoading = false;
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

.title-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.header-spinner {
  margin-left: 0.5rem;
}

.overview__button {
  background-color: #333;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background-color 0.2s;
}

.overview__button:hover {
  background-color: #333;
}

.overview__table-container {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  padding: 1rem;
  overflow-x: auto;
}

.overview__table {
  width: 100%;
  border-collapse: collapse;
}

.overview__table th,
.overview__table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid #edf2f0;
}

.overview__table thead th {
  background-color: #f7fafc;
  font-weight: 600;
  color: #4a5568;
  font-size: 0.875rem;
}

.overview__table tbody tr:hover {
  background-color: #f7fafc;
}

.overview__empty {
  text-align: center;
  padding: 2rem !important;
  color: #718096;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  border: none;
}

.action-button--view {
  background-color: #ebf8ff;
  color: #2b6cb0;
}

.action-button--view:hover {
  background-color: #bee3f8;
}

.action-button--edit {
  background-color: #e6fffa;
  color: #2c5282;
}

.action-button--edit:hover {
  background-color: #b2f5ea;
}

.action-button--reject {
  background-color: #fff5f5;
  color: #c53030;
}

.action-button--reject:hover {
  background-color: #fed7d7;
}

.action-button--cancel {
  background-color: #fffaf0;
  color: #c05621;
}

.action-button--cancel:hover {
  background-color: #feebc8;
}

.form-section {
  margin-bottom: 1.5rem;
  text-align: left;
  width: 100%;
}

.section-title {
  margin-bottom: 0.75rem;
  font-weight: 600;
  color: #4a5568;
  font-size: 1rem;
}

.form-row {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -0.5rem;
  width: 100%;
  box-sizing: border-box;
}

.form-group {
  padding: 0 0.5rem;
  box-sizing: border-box;
  width: 100%;
  margin-bottom: 1rem;
}

.form-group--half {
  width: 50%;
}

@media (max-width: 767px) {
  .form-group--half {
    width: 100%;
  }
}

/* Ensure inputs take full width of their container */
.kam-input {
  width: 100%;
  box-sizing: border-box;
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

.vat-input-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto;
  max-width: 600px;
}

.lookup-btn {
  padding: 0.625rem 1.25rem;
  font-size: 1rem;
  height: 100%;
  white-space: nowrap;
}

.offer-items-selection {
  margin-top: 1rem;
  display: grid;
  gap: 0.75rem;
}

.offer-item-checkbox {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background-color: white;
  border: 1px solid #e2e8f0;
  width: 100%;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.offer-item-checkbox:hover {
  background-color: #f7fafc;
  border-color: #cbd5e1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.offer-item-checkbox label {
  flex: 1;
  text-align: left;
  margin-bottom: 0;
  font-size: 1.05rem;
  cursor: pointer;
}

.quantity-selector {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.quantity-selector label {
  margin-bottom: 0;
  white-space: nowrap;
  font-size: 0.9rem;
  font-weight: 500;
}

.quantity-input {
  width: 10rem;
  text-align: center;
  padding: 0.5rem;
  border-radius: 0.25rem;
  border: 1px solid #e2e8f0;
  font-size: 1rem;
}

.price-input-wrapper {
  width: 10rem;
  border: none;
}

.price-input-wrapper :deep(.price-input-container) {
  width: 100%;
}

.price-input-wrapper :deep(.price-input) {
  width: 100%;
  text-align: center;
  padding: 0.5rem 1.5rem 0.5rem 0.5rem;
  font-size: 1rem;
}

.fee-input:focus,
.price-input-wrapper :deep(.price-input:focus) {
  outline: none;
  border-color: #4a5568;
  box-shadow: 0 0 0 2px rgba(74, 85, 104, 0.2);
}

.preview-container {
  position: relative;
  margin-bottom: 5px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.scrollable-document-container {
  max-height: 70vh;
  overflow-y: auto;
  padding-top: 10px;
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

/* Custom checkbox styling */
.custom-checkbox {
  position: relative;
  margin-right: 1rem;
  min-width: 32px;
  height: 32px;
}

.custom-checkbox-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.custom-checkbox-label {
  position: absolute;
  top: 0;
  left: 0;
  height: 32px;
  width: 32px;
  background-color: #fff;
  border: 2px solid #4a5568;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.custom-checkbox-label:hover {
  background-color: #f7fafc;
  border-color: #2d3748;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.custom-checkbox-input:checked + .custom-checkbox-label {
  background-color: #4a5568;
  border-color: #2d3748;
}

.custom-checkbox-input:checked + .custom-checkbox-label:after {
  content: "";
  position: absolute;
  left: 9px;
  top: 3px;
  width: 8px;
  height: 16px;
  border: solid white;
  border-width: 0 3px 3px 0;
  transform: rotate(45deg);
}

/* Status badges */
.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge--created {
  background-color: #e2e8f0;
  color: #4a5568;
}

.status-badge--sent {
  background-color: #bee3f8;
  color: #2c5282;
}

.status-badge--read {
  background-color: #c6f6d5;
  color: #276749;
}

.status-badge--accepted {
  background-color: #9ae6b4;
  color: #22543d;
}

.status-badge--registered {
  background-color: #faf089;
  color: #744210;
}

.status-badge--rejected {
  background-color: #fed7d7;
  color: #9b2c2c;
}

.status-badge--cancelled {
  background-color: #f7d2c4;
  color: #e67e73;
}

/* Status table styles */
.status-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.5rem;
  table-layout: fixed;
}

.status-row {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
}

.status-row:last-child {
  border-bottom: none;
}

.status-cell {
  padding: 0.5rem;
  flex: 1;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-cell--label {
  font-weight: 700;
  color: #4a5568;
  width: 150px;
  min-width: 150px;
  flex: 0 0 150px;
  background-color: #f7fafc;
  text-align: left;
}

.status-cell--span3 {
  flex: 3;
}

@media (max-width: 767px) {
  .status-row {
    flex-wrap: wrap;
  }

  .status-cell {
    flex: 1 0 50%;
  }

  .status-cell--label {
    flex: 0 0 100px;
    width: 100px;
    min-width: 100px;
  }

  .status-cell--span3 {
    flex: 1 0 calc(100% - 100px);
  }
}

.price-input-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin-top: 0.5rem;
}

.price-input-group label {
  margin-bottom: 0.25rem;
}
</style>
