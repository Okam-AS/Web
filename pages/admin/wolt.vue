<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="wolt-menu">
      <h1 class="wolt-menu__title">Wolt</h1>
      <div
        v-if="isLoading"
        class="wolt-menu__loading"
      >
        <Loading :loading="true" />
      </div>
      <div
        v-else
        class="wolt-menu__content"
      >
        <!-- Connection Status Banner -->
        <div
          v-if="selectedStore > 0"
          :class="[
            'connection-status',
            isWoltActive ? 'connection-status--connected' : 'connection-status--disconnected'
          ]"
        >
          <div class="connection-status__content">
            <div class="connection-status__header">
              <h2 class="connection-status__title">
                <template v-if="!hasWoltIntegration">
                  Wolt-integrasjon ikke koblet til
                </template>
                <template v-else-if="woltEnabled">
                  Wolt-integrasjon aktivert
                </template>
                <template v-else>
                  Wolt-integrasjon deaktivert
                </template>
              </h2>
              <span
                :class="[
                  'connection-status__badge',
                  isWoltActive ? 'connection-status__badge--connected' : 'connection-status__badge--disconnected'
                ]"
              >
                <template v-if="!hasWoltIntegration">
                  Ikke tilkoblet
                </template>
                <template v-else-if="woltEnabled">
                  Aktiv
                </template>
                <template v-else>
                  Inaktiv
                </template>
              </span>
            </div>
            <p
              v-if="!hasWoltIntegration"
              class="connection-status__description"
            >
              Send en mail til <a href="mailto:hei@okam.no">hei@okam.no</a> så kan vi koble Wolt til Okam,
              slik at du ikke lenger trenger dedikert Wolt-tablet og printer.
              Alle bestillinger kommer rett inn i Okam Admin.
            </p>
            <p
              v-else-if="!woltEnabled"
              class="connection-status__description connection-status__description--warning"
            >
              Integrasjonen er koblet til, men deaktivert. Aktiver "Motta Wolt bestillinger" for å begynne å motta bestillinger.
            </p>
          </div>
        </div>

        <!-- Wolt Settings (only show if integrated) -->
        <div
          v-if="selectedStore > 0 && hasWoltIntegration"
          class="wolt-settings"
        >
          <!-- Enable/Disable Wolt Integration Toggle -->
          <div class="wolt-setting-item">
            <div class="wolt-setting-item__content">
              <label class="wolt-setting-item__label">Motta Wolt bestillinger</label>
              <p class="wolt-setting-item__description">
                Aktiver eller deaktiver mottak av bestillinger fra Wolt
              </p>
            </div>
            <label class="status-toggle">
              <input
                :checked="woltEnabled"
                type="checkbox"
                class="status-toggle__input"
                @change="toggleWoltEnabled($event.target.checked)"
              >
              <span class="status-toggle__slider" />
            </label>
          </div>

          <!-- Merchant Portal Button -->
          <div
            v-if="merchantPortalUrl"
            class="wolt-setting-item"
          >
            <div class="wolt-setting-item__content">
              <label class="wolt-setting-item__label">Wolt Meny</label>
              <p class="wolt-setting-item__description">
                Rediger menyen din i Wolt Merchant Portal
              </p>
            </div>
            <button
              class="button-link"
              @click="openMerchantPortal"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Rediger meny
            </button>
          </div>
        </div>

        <!-- Venue Online Status (only show if integrated and enabled) -->
        <div
          v-if="selectedStore > 0 && hasWoltIntegration && woltEnabled && venueStatus"
          class="wolt-settings"
        >
          <!-- Wolt Store Open/Close Toggle -->
          <div class="wolt-setting-item wolt-setting-item--prominent">
            <div class="wolt-setting-item__content">
              <div class="wolt-setting-item__header">
                <label class="wolt-setting-item__label">Wolt-butikk status</label>
                <span
                  :class="['inline-status-badge', venueStatus.online ? 'inline-status-badge--online' : 'inline-status-badge--offline']"
                >
                  <span class="inline-status-badge__dot" />
                  {{ venueStatus.online ? 'Åpen' : 'Stengt' }}
                </span>
              </div>
              <p class="wolt-setting-item__description">
                {{ venueStatus.online ? 'Butikken din er nå åpen og mottar bestillinger på Wolt' : 'Butikken din er stengt på Wolt og mottar ikke bestillinger' }}
              </p>
            </div>
            <label class="status-toggle">
              <input
                :checked="venueStatus.online"
                type="checkbox"
                class="status-toggle__input"
                @change="toggleVenueOnline($event.target.checked)"
              >
              <span class="status-toggle__slider" />
            </label>
          </div>

          <!-- Opening Hours Button -->
          <div class="wolt-setting-item">
            <div class="wolt-setting-item__content">
              <label class="wolt-setting-item__label">Åpningstider</label>
              <p class="wolt-setting-item__description">
                Se og rediger åpningstidene dine i Wolt
              </p>
            </div>
            <button
              class="button-secondary-action"
              @click="showOpeningHoursModal = true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Se åpningstider
            </button>
          </div>

          <!-- Delivery Provider Info (if available) -->
          <div
            v-if="deliveryProvider"
            class="wolt-setting-item wolt-setting-item--info"
          >
            <div class="wolt-setting-item__content">
              <label class="wolt-setting-item__label">Leverandør</label>
              <p class="wolt-setting-item__description">
                {{ deliveryProvider.current_provider || 'Ingen partner valgt' }}
              </p>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="info-icon"
            >
              <rect x="1" y="3" width="15" height="13" />
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
              <circle cx="5.5" cy="18.5" r="2.5" />
              <circle cx="18.5" cy="18.5" r="2.5" />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- Opening Hours Modal -->
    <div
      v-if="showOpeningHoursModal"
      class="modal-overlay"
      @click.self="showOpeningHoursModal = false"
    >
      <div class="modal-content modal-content--large">
        <div class="modal-header">
          <h2>Åpningstider i Wolt</h2>
          <button
            class="modal-close"
            @click="showOpeningHoursModal = false"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <!-- View Mode -->
          <div v-if="!isEditingOpeningHours">
            <div
              v-if="venueStatus && venueStatus.opening_times && venueStatus.opening_times.length > 0"
              class="opening-hours-list"
            >
              <div
                v-for="(slot, index) in venueStatus.opening_times"
                :key="index"
                class="opening-hours-item"
              >
                <span class="opening-hours-item__day">{{ formatDayName(slot.opening_day) }}</span>
                <span class="opening-hours-item__time">{{ slot.opening_time }} - {{ slot.closing_time }}</span>
                <span
                  v-if="slot.closing_day !== slot.opening_day"
                  class="opening-hours-item__badge"
                >
                  til {{ formatDayName(slot.closing_day) }}
                </span>
              </div>
            </div>
            <div
              v-else
              class="empty-state"
            >
              <p>Ingen åpningstider satt</p>
            </div>
          </div>

          <!-- Edit Mode -->
          <div v-else>
            <div class="info-banner">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <p>Legg til åpningstider for hvert tidsrom. Bruk formatet HH:mm (f.eks. 10:00)</p>
            </div>

            <div
              v-for="(slot, index) in editedOpeningTimes"
              :key="index"
              class="opening-hours-edit-slot"
            >
              <div class="opening-hours-edit-row">
                <div class="form-field">
                  <label>Åpningsdag</label>
                  <div class="select-wrapper">
                    <select v-model="slot.opening_day">
                      <option value="MONDAY">Mandag</option>
                      <option value="TUESDAY">Tirsdag</option>
                      <option value="WEDNESDAY">Onsdag</option>
                      <option value="THURSDAY">Torsdag</option>
                      <option value="FRIDAY">Fredag</option>
                      <option value="SATURDAY">Lørdag</option>
                      <option value="SUNDAY">Søndag</option>
                    </select>
                  </div>
                </div>
                <div class="form-field">
                  <label>Åpningstid</label>
                  <input
                    v-model="slot.opening_time"
                    type="time"
                    placeholder="10:00"
                  >
                </div>
                <div class="form-field">
                  <label>Lukkingsdag</label>
                  <div class="select-wrapper">
                    <select v-model="slot.closing_day">
                      <option value="MONDAY">Mandag</option>
                      <option value="TUESDAY">Tirsdag</option>
                      <option value="WEDNESDAY">Onsdag</option>
                      <option value="THURSDAY">Torsdag</option>
                      <option value="FRIDAY">Fredag</option>
                      <option value="SATURDAY">Lørdag</option>
                      <option value="SUNDAY">Søndag</option>
                    </select>
                  </div>
                </div>
                <div class="form-field">
                  <label>Lukkingstid</label>
                  <input
                    v-model="slot.closing_time"
                    type="time"
                    placeholder="22:00"
                  >
                </div>
                <button
                  class="icon-button icon-button--danger"
                  @click="removeOpeningTimeSlot(index)"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>

            <button
              class="button-secondary"
              @click="addOpeningTimeSlot"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Legg til tidsrom
            </button>
          </div>
        </div>
        <div class="modal-footer">
          <button
            v-if="!isEditingOpeningHours"
            class="modal-button modal-button--secondary"
            @click="showOpeningHoursModal = false"
          >
            Lukk
          </button>
          <button
            v-if="!isEditingOpeningHours"
            class="modal-button modal-button--primary"
            @click="startEditingOpeningHours"
          >
            Rediger åpningstider
          </button>
          <template v-else>
            <button
              class="modal-button modal-button--secondary"
              @click="cancelEditingOpeningHours"
            >
              Avbryt
            </button>
            <button
              class="modal-button modal-button--primary"
              :disabled="isSavingOpeningHours"
              @click="saveOpeningHours"
            >
              <span v-if="isSavingOpeningHours">Lagrer...</span>
              <span v-else>Lagre åpningstider</span>
            </button>
          </template>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import Loading from "~/components/atoms/Loading.vue";

export default {
  name: "WoltMenu",
  components: {
    AdminPage,
    Loading,
  },
  data() {
    return {
      venueStatus: null,
      deliveryProvider: null,
      fullStore: null, // Full store object with woltMarketplaceConfiguration
      isLoading: false,
      isEditingOpeningHours: false,
      editedOpeningTimes: [],
      isSavingOpeningHours: false,
      showOpeningHours: false,
      showOpeningHoursModal: false,
      woltEnabled: false,
      errorMessage: "",
    };
  },
  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore;
    },
    hasMultipleStores() {
      return this.$store.state.currentUser.adminIn?.length > 1;
    },
    currentStoreWoltConfig() {
      if (!this.fullStore) {
        return null;
      }
      return this.fullStore.woltMarketplaceConfiguration || null;
    },
    hasWoltIntegration() {
      const config = this.currentStoreWoltConfig;
      return config && config.venueId && config.venueId.trim() !== '';
    },
    isWoltActive() {
      return this.hasWoltIntegration && this.woltEnabled;
    },
    merchantPortalUrl() {
      return this.currentStoreWoltConfig?.merchantPortalUrl || null;
    },
  },
  watch: {
    async selectedStore(newVal, oldVal) {
      if (newVal > 0) {
        await this.fetchStoreData(newVal);
        this.fetchVenueStatus(newVal);
        this.fetchDeliveryProvider(newVal);
      } else {
        this.fullStore = null;
        this.venueStatus = null;
        this.deliveryProvider = null;
      }
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      return;
    }

    // Update current user information
    this._userService
      .Reload()
      .then((success) => {
        if (!success) {
          return;
        }

        if (this.selectedStore > 0) {
          this.fetchStoreData(this.selectedStore);
          this.fetchVenueStatus(this.selectedStore);
          this.fetchDeliveryProvider(this.selectedStore);
        }
      })
      .catch((error) => {
        console.error("Error fetching user data:", error);
      });
  },
  methods: {
    fetchStoreData(storeId) {
      if (!storeId || storeId <= 0) {
        this.fullStore = null;
        this.woltEnabled = false;
        return Promise.resolve();
      }

      this.isLoading = true;

      return this._storeService
        .Get(storeId)
        .then((store) => {
          this.fullStore = store;
          // Set woltEnabled from the store configuration
          this.woltEnabled = store?.woltMarketplaceConfiguration?.enabled || false;
          this.isLoading = false;
        })
        .catch((error) => {
          console.error("Error fetching store data:", error);
          this.fullStore = null;
          this.woltEnabled = false;
          this.isLoading = false;
        });
    },
    handleLoginSuccess() {
      if (this.selectedStore > 0) {
        this.fetchStoreData(this.selectedStore);
        this.fetchVenueStatus(this.selectedStore);
        this.fetchDeliveryProvider(this.selectedStore);
      }
    },
    getLocalizedValue(values, preferredLang = 'nb') {
      if (!values || !Array.isArray(values) || values.length === 0) {
        return '';
      }
      // Try preferred language first (Norwegian)
      const preferred = values.find(v => v.lang === preferredLang);
      if (preferred) {
        return preferred.value;
      }
      // Fall back to English
      const english = values.find(v => v.lang === 'en');
      if (english) {
        return english.value;
      }
      // Return first available
      return values[0].value;
    },
    fetchVenueStatus(storeId) {
      if (storeId) {
        // Check if store has Wolt integration before attempting to fetch
        if (!this.hasWoltIntegration) {
          this.venueStatus = null;
          return;
        }

        this._woltVenueService
          .getVenueStatus(storeId)
          .then((data) => {
            console.log('Venue status:', data);
            // Map the API response structure to what the UI expects
            this.venueStatus = {
              online: data.status?.is_online || false,
              is_open: data.status?.is_open || false,
              is_ipad_free: data.status?.is_ipad_free || false,
              address: data.contact_details?.address || '',
              phone: data.contact_details?.phone || '',
              opening_times: data.opening_times || [],
              special_times: data.special_times || [],
              external_venue_id: data.external_venue_id,
            };
          })
          .catch((error) => {
            console.error('Error fetching venue status:', error);
            this.venueStatus = null;
          });
      }
    },
    fetchDeliveryProvider(storeId) {
      if (storeId) {
        // Check if store has Wolt integration before attempting to fetch
        if (!this.hasWoltIntegration) {
          this.deliveryProvider = null;
          return;
        }

        this._woltVenueService
          .getCurrentDeliveryProvider(storeId)
          .then((data) => {
            console.log('Delivery provider:', data);
            // Map the API response structure to what the UI expects
            this.deliveryProvider = {
              current_provider: data.delivery_provider || 'Ikke satt'
            };
          })
          .catch((error) => {
            console.error('Error fetching delivery provider:', error);
            this.deliveryProvider = null;
          });
      }
    },
    async toggleWoltEnabled(enabled) {
      if (!this.selectedStore || this.selectedStore <= 0) {
        alert('Ingen butikk valgt');
        return;
      }

      this.errorMessage = "";
      const previousValue = this.woltEnabled;

      try {
        // Optimistically update local state
        this.woltEnabled = enabled;

        const result = await this._storeService.UpdateWoltMarketplaceConfiguration(this.selectedStore, {
          Enabled: enabled,
        });

        if (!result || !result.success) {
          this.errorMessage = 'Kunne ikke lagre innstillinger';
          // Revert on error
          this.woltEnabled = previousValue;
          alert('Kunne ikke oppdatere Wolt-integrasjon');
        } else {
          // Refresh store data to get updated configuration
          await this.fetchStoreData(this.selectedStore);
        }
      } catch (error) {
        console.error('Error toggling Wolt enabled:', error);
        this.errorMessage = 'Kunne ikke lagre innstillinger';
        // Revert on error
        this.woltEnabled = previousValue;
        alert('Feil ved oppdatering av Wolt-integrasjon');
      }
    },
    openMerchantPortal() {
      if (this.merchantPortalUrl) {
        window.open(this.merchantPortalUrl, '_blank');
      }
    },
    async toggleVenueOnline(online) {
      try {
        const request = {
          status: online ? 'ONLINE' : 'OFFLINE',
        };

        const success = await this._woltVenueService.updateVenueOnlineStatus(this.selectedStore, request);
        if (success) {
          // Update local state
          this.venueStatus.online = online;
          this.$forceUpdate();
        } else {
          alert('Kunne ikke oppdatere online status');
        }
      } catch (error) {
        console.error('Error toggling venue online status:', error);
        alert('Feil ved oppdatering av online status');
      }
    },
    formatDayName(day) {
      const dayNames = {
        MONDAY: 'Mandag',
        TUESDAY: 'Tirsdag',
        WEDNESDAY: 'Onsdag',
        THURSDAY: 'Torsdag',
        FRIDAY: 'Fredag',
        SATURDAY: 'Lørdag',
        SUNDAY: 'Søndag'
      };
      return dayNames[day] || day;
    },
    startEditingOpeningHours() {
      this.isEditingOpeningHours = true;
      this.showOpeningHours = true;
      // Deep clone the opening times for editing
      this.editedOpeningTimes = JSON.parse(JSON.stringify(this.venueStatus.opening_times || []));

      // Log to debug what values we're getting
      console.log('Starting edit with opening times:', this.editedOpeningTimes);

      // If no opening times exist, add a default slot
      if (this.editedOpeningTimes.length === 0) {
        this.addOpeningTimeSlot();
      }
    },
    cancelEditingOpeningHours() {
      this.isEditingOpeningHours = false;
      this.editedOpeningTimes = [];
      this.showOpeningHoursModal = false;
    },
    addOpeningTimeSlot() {
      this.editedOpeningTimes.push({
        opening_day: 'MONDAY',
        opening_time: '10:00',
        closing_day: 'MONDAY',
        closing_time: '22:00'
      });
    },
    removeOpeningTimeSlot(index) {
      this.editedOpeningTimes.splice(index, 1);
    },
    async saveOpeningHours() {
      if (!this.selectedStore) {
        alert('Ingen butikk valgt');
        return;
      }

      // Validate that all slots have required fields
      for (const slot of this.editedOpeningTimes) {
        if (!slot.opening_day || !slot.opening_time || !slot.closing_day || !slot.closing_time) {
          alert('Alle felt må fylles ut for hver åpningstid');
          return;
        }
      }

      this.isSavingOpeningHours = true;

      try {
        const request = {
          availability: this.editedOpeningTimes
        };

        const success = await this._woltVenueService.updateVenueOpeningTimes(this.selectedStore, request);

        if (success) {
          this.isEditingOpeningHours = false;
          this.editedOpeningTimes = [];
          this.showOpeningHoursModal = false;
          // Refresh venue status to show updated opening times
          await this.fetchVenueStatus(this.selectedStore);
        } else {
          alert('Kunne ikke oppdatere åpningstider. Vennligst prøv igjen.');
        }
      } catch (error) {
        console.error('Error saving opening hours:', error);
        alert('Feil ved lagring av åpningstider: ' + (error.message || 'Ukjent feil'));
      } finally {
        this.isSavingOpeningHours = false;
      }
    },
  },
};
</script>

<style scoped>
.wolt-menu {
  padding: 2rem;
}

.wolt-menu__title {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #2d3748;
}

.wolt-menu__loading {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.wolt-warning-message {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  background-color: #fef3c7;
  border: 1px solid #fbbf24;
  border-radius: 0.5rem;
  padding: 1.25rem;
  margin-bottom: 2rem;
}

.wolt-warning-message__icon {
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.wolt-warning-message__content {
  flex: 1;
}

.wolt-warning-message__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #92400e;
  margin: 0 0 0.5rem 0;
}

.wolt-warning-message__text {
  font-size: 0.95rem;
  color: #78350f;
  line-height: 1.6;
  margin: 0;
}

.wolt-warning-message__text a {
  color: #0066cc;
  text-decoration: underline;
  font-weight: 500;
}

.wolt-warning-message__text a:hover {
  color: #004999;
}

/* Venue Status Section */
.venue-status-section {
  margin-bottom: 1.5rem;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  overflow: hidden;
}

.venue-status__title {
  margin: 0;
  padding: 1rem 1.25rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  background-color: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
}

.venue-status__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 0;
  border-bottom: 1px solid #e2e8f0;
}

.venue-status__card {
  border-right: 1px solid #e2e8f0;
  background-color: white;
}

.venue-status__card:last-child {
  border-right: none;
}

.venue-status__card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  background-color: #fafafa;
  border-bottom: 1px solid #e2e8f0;
}

.venue-status__card-title {
  font-weight: 600;
  color: #2d3748;
  font-size: 0.875rem;
}

.venue-status__badge {
  display: inline-block;
  padding: 0.2rem 0.625rem;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.venue-status__badge--online {
  background-color: #c6f6d5;
  color: #22543d;
}

.venue-status__badge--offline {
  background-color: #fed7d7;
  color: #742a2a;
}

.venue-status__card-content {
  padding: 1rem 1.25rem;
}

.venue-status__toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.venue-status__toggle-label {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 30px;
  cursor: pointer;
}

.venue-status__toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.venue-status__toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e0;
  transition: 0.3s;
  border-radius: 30px;
}

.venue-status__toggle-slider:before {
  position: absolute;
  content: "";
  height: 22px;
  width: 22px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.venue-status__toggle-input:checked + .venue-status__toggle-slider {
  background-color: #1bb776;
}

.venue-status__toggle-input:checked + .venue-status__toggle-slider:before {
  transform: translateX(30px);
}

.venue-status__toggle-text {
  font-size: 0.95rem;
  color: #4a5568;
  font-weight: 500;
}

.venue-status__provider-info {
  margin: 0;
  color: #4a5568;
  font-size: 0.95rem;
}

.venue-status__provider-info strong {
  color: #2d3748;
  font-weight: 600;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: #718096;
  transition: color 0.2s;
}

.modal-close:hover {
  color: #2d3748;
}

.modal-body {
  padding: 1.5rem;
}

.modal-description {
  margin: 0 0 1.5rem 0;
  color: #4a5568;
  line-height: 1.5;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #2d3748;
  font-size: 0.875rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 1rem;
  color: #2d3748;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #1bb776;
  box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
}

.modal-info {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #ebf8ff;
  border: 1px solid #bee3f8;
  border-radius: 0.375rem;
  margin-top: 1.5rem;
}

.modal-info svg {
  flex-shrink: 0;
  color: #3182ce;
}

.modal-info p {
  margin: 0;
  color: #2c5282;
  font-size: 0.875rem;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e2e8f0;
}

.modal-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-button--secondary {
  background-color: #e2e8f0;
  color: #4a5568;
}

.modal-button--secondary:hover:not(:disabled) {
  background-color: #cbd5e0;
}

.modal-button--primary {
  background-color: #1bb776;
  color: white;
}

.modal-button--primary:hover:not(:disabled) {
  background-color: #159960;
}

/* Opening Hours Section */
.opening-hours-section {
  margin-top: 1.5rem;
  background-color: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  overflow: hidden;
}

.opening-hours__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background-color: #f7fafc;
  border-bottom: 1px solid #e2e8f0;
}

.opening-hours__header--collapsible {
  cursor: pointer;
  transition: background-color 0.2s;
}

.opening-hours__header--collapsible:hover {
  background-color: #edf2f7;
}

.opening-hours__header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.opening-hours__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
}

.opening-hours__summary {
  font-size: 0.875rem;
  color: #718096;
  font-weight: 500;
}

.opening-hours__header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.opening-hours__edit-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  background-color: transparent;
  color: #1bb776;
  border: 1px solid #1bb776;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.opening-hours__edit-button:hover {
  background-color: #1bb776;
  color: white;
}

.opening-hours__chevron {
  color: #718096;
  transition: transform 0.2s;
}

.opening-hours__chevron--open {
  transform: rotate(180deg);
}

.opening-hours__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 1rem 1.25rem;
}

.opening-hours__item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.625rem 0;
  border-bottom: 1px solid #f7fafc;
}

.opening-hours__item:last-child {
  border-bottom: none;
}

.opening-hours__day {
  font-weight: 600;
  color: #2d3748;
  min-width: 90px;
  font-size: 0.875rem;
}

.opening-hours__time {
  color: #4a5568;
  font-weight: 500;
  font-size: 0.875rem;
}

.opening-hours__next-day {
  font-size: 0.8125rem;
  color: #718096;
  font-style: italic;
}

.opening-hours__empty {
  padding: 1.5rem 0;
  text-align: center;
  color: #a0aec0;
  font-style: italic;
  font-size: 0.875rem;
}

.opening-hours__edit {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem 1.25rem;
}

.opening-hours__edit-info {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #ebf8ff;
  border: 1px solid #bee3f8;
  border-radius: 0.375rem;
  align-items: flex-start;
}

.opening-hours__edit-info svg {
  flex-shrink: 0;
  color: #3182ce;
  margin-top: 0.125rem;
}

.opening-hours__edit-info p {
  margin: 0;
  color: #2c5282;
  font-size: 0.875rem;
  line-height: 1.5;
}

.opening-hours__edit-slot {
  padding: 1rem;
  background-color: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
}

.opening-hours__edit-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 1rem;
  align-items: end;
}

.opening-hours__edit-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.opening-hours__edit-field label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4a5568;
}

.opening-hours__edit-field select,
.opening-hours__edit-field input {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  color: #2d3748;
  background-color: white;
  transition: border-color 0.2s;
}

.opening-hours__edit-field select:focus,
.opening-hours__edit-field input:focus {
  outline: none;
  border-color: #1bb776;
  box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
}

.opening-hours__remove-button {
  padding: 0.5rem;
  background-color: #e53e3e;
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 38px;
}

.opening-hours__remove-button:hover {
  background-color: #c53030;
}

.opening-hours__add-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: #3182ce;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  align-self: flex-start;
}

.opening-hours__add-button:hover {
  background-color: #2c5282;
}

.opening-hours__edit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.opening-hours__cancel-button {
  padding: 0.75rem 1.5rem;
  background-color: #e2e8f0;
  color: #4a5568;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.opening-hours__cancel-button:hover {
  background-color: #cbd5e0;
}

.opening-hours__save-button {
  padding: 0.75rem 1.5rem;
  background-color: #1bb776;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.opening-hours__save-button:hover:not(:disabled) {
  background-color: #159960;
}

.opening-hours__save-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Status Toggle Switch */
.status-toggle {
  position: relative;
  display: inline-block;
  width: 54px;
  height: 28px;
  cursor: pointer;
  flex-shrink: 0;
}

.status-toggle__input {
  opacity: 0;
  width: 0;
  height: 0;
}

.status-toggle__slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e0;
  border-radius: 28px;
  transition: all 0.3s;
}

.status-toggle__slider:before {
  content: "";
  position: absolute;
  height: 20px;
  width: 20px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.3s;
}

.status-toggle__input:checked + .status-toggle__slider {
  background-color: #48bb78;
}

.status-toggle__input:checked + .status-toggle__slider:before {
  transform: translateX(26px);
}

/* Opening Hours Modal Styles */
.opening-hours-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.opening-hours-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #f7fafc;
  border-radius: 0.375rem;
}

.opening-hours-item__day {
  font-weight: 600;
  color: #2d3748;
  min-width: 100px;
}

.opening-hours-item__time {
  color: #4a5568;
  flex: 1;
}

.opening-hours-item__badge {
  padding: 0.25rem 0.5rem;
  background: #edf2f7;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  color: #718096;
}

.opening-hours-edit-slot {
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background: #f7fafc;
}

.opening-hours-edit-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 0.75rem;
  align-items: end;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.form-field label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #4a5568;
}

.form-field input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  background-color: white;
}

.form-field input:focus {
  outline: none;
  border-color: #1bb776;
  box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
}

/* Use select-wrapper for styled dropdowns in forms */
.form-field .select-wrapper {
  width: 100%;
}

.form-field .select-wrapper select {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  background-color: white;
  font-size: 0.875rem;
  appearance: none;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-field .select-wrapper select:focus {
  outline: none;
  border-color: #1bb776;
  box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
}

.icon-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-button--danger {
  color: #e53e3e;
}

.icon-button--danger:hover {
  background: #fed7d7;
  border-color: #fc8181;
}

.button-secondary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #2d3748;
  cursor: pointer;
  transition: all 0.2s;
}

.button-secondary:hover {
  background: #f7fafc;
  border-color: #cbd5e0;
}

.empty-state {
  padding: 3rem 1rem;
  text-align: center;
  color: #a0aec0;
  font-style: italic;
}

.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 1.5rem;
  background: #ebf8ff;
  border: 1px solid #90cdf4;
  border-radius: 0.375rem;
  color: #2c5282;
}

.info-banner svg {
  flex-shrink: 0;
  color: #3182ce;
}

.info-banner p {
  margin: 0;
  font-size: 0.875rem;
}

/* Modal Enhancements */
.modal-content--large {
  max-width: 900px;
}

/* Connection Status Banner */
.connection-status {
  margin-bottom: 2rem;
  border-radius: 0.5rem;
  padding: 1.5rem;
  border: 2px solid;
}

.connection-status--connected {
  background-color: #f0fdf4;
  border-color: #86efac;
}

.connection-status--disconnected {
  background-color: #fef3c7;
  border-color: #fbbf24;
}

.connection-status__content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.connection-status__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.connection-status__title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #2d3748;
}

.connection-status__badge {
  display: inline-block;
  padding: 0.375rem 1rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.connection-status__badge--connected {
  background-color: #22c55e;
  color: white;
}

.connection-status__badge--disconnected {
  background-color: #f59e0b;
  color: white;
}

.connection-status__description {
  margin: 0;
  color: #78350f;
  line-height: 1.6;
  font-size: 0.95rem;
}

.connection-status__description--warning {
  color: #92400e;
  font-weight: 500;
}

.connection-status__description a {
  color: #0066cc;
  text-decoration: underline;
  font-weight: 500;
}

.connection-status__description a:hover {
  color: #004999;
}

/* Wolt Settings Section */
.wolt-settings {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  margin-bottom: 2rem;
  overflow: hidden;
}

.wolt-setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  transition: background-color 0.2s;
}

.wolt-setting-item:last-child {
  border-bottom: none;
}

/* Prominent setting item (e.g., for critical toggles) */
.wolt-setting-item--prominent {
  background-color: #f7fafc;
}

/* Info-only setting item */
.wolt-setting-item--info {
  opacity: 0.9;
}

.wolt-setting-item__content {
  flex: 1;
}

.wolt-setting-item__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
}

.wolt-setting-item__label {
  display: block;
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
}

.wolt-setting-item__description {
  margin: 0;
  font-size: 0.875rem;
  color: #718096;
  line-height: 1.5;
}

/* Inline status badge */
.inline-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.inline-status-badge--online {
  background-color: #d1fae5;
  color: #065f46;
}

.inline-status-badge--offline {
  background-color: #fee2e2;
  color: #991b1b;
}

.inline-status-badge__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Info icon */
.info-icon {
  color: #a0aec0;
  flex-shrink: 0;
}

/* Button Styles */
.button-link {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: #1bb776;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  text-decoration: none;
  white-space: nowrap;
}

.button-link:hover {
  background: #159960;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.button-link svg {
  flex-shrink: 0;
}

.button-secondary-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: white;
  color: #4a5568;
  border: 1px solid #cbd5e0;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.button-secondary-action:hover {
  background: #f7fafc;
  border-color: #a0aec0;
  color: #2d3748;
}

.button-secondary-action svg {
  flex-shrink: 0;
}

</style>