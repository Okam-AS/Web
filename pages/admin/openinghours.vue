<template>
  <AdminPage>
    <div class="opening-hours">
      <h1 class="opening-hours__title">Åpningstider</h1>
      <div
        v-if="isLoading"
        class="opening-hours__loading"
      >
        <Loading :loading="true" />
      </div>
      <div
        v-else
        class="opening-hours__content"
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
          class="opening-hours__items"
        >
          <div
            v-for="(item, index) in localOpeningHours"
            :key="index"
            class="opening-hours__item"
          >
            <div class="opening-hours__day">
              <span class="opening-hours__day-label">{{ dayLabels[item.dayOfWeek] }}</span>
            </div>
            <div
              v-if="item.open"
              class="opening-hours__time"
            >
              <div class="opening-hours__time-inputs">
                <input
                  v-model="item.openingTime"
                  type="time"
                  class="opening-hours__time-input"
                  @change="updateOpeningHours"
                />
                <span class="opening-hours__time-separator">-</span>
                <input
                  v-model="item.closingTime"
                  type="time"
                  class="opening-hours__time-input"
                  @change="updateOpeningHours"
                />
              </div>
            </div>
            <div
              v-else
              class="opening-hours__closed"
            >
              <span>Stengt</span>
            </div>
            <div class="opening-hours__toggle">
              <label class="switch">
                <input
                  v-model="item.open"
                  type="checkbox"
                  @change="updateOpeningHours"
                />
                <span class="slider round" />
              </label>
            </div>
          </div>
        </div>

        <div
          v-else
          class="opening-hours__no-store"
        >
          <p>Velg en butikk for å administrere åpningstider.</p>
        </div>

        <div class="opening-hours__info">
          <p>Åpningstidene brukes til å vise når butikken din er åpen for bestillinger.</p>
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
import AdminPage from "@/components/organisms/AdminPage.vue";
import Loading from "@/components/atoms/Loading.vue";
import LoginModal from "~/components/molecules/LoginModal.vue";

export default {
  name: "OpeningHours",
  components: {
    AdminPage,
    Loading,
    LoginModal,
  },
  data() {
    return {
      localOpeningHours: [],
      isLoading: false,
      selectedStore: null,
      dayLabels: ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"],
      showLogin: false,
    };
  },
  watch: {
    selectedStore(newVal) {
      if (newVal > 0) {
        this.fetchStoreData(newVal);
      } else {
        this.localOpeningHours = [];
      }
      if (window && window.localStorage) {
        localStorage.setItem("openingHoursSelectedStore", newVal);
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
        console.error("Error fetching user data:", error);
        this.showLogin = true;
      });
  },
  methods: {
    init() {
      if (window && window.localStorage) {
        const storedStore = localStorage.getItem("openingHoursSelectedStore");
        if (storedStore) {
          this.selectedStore = parseInt(storedStore);
        } else if (this.$store.state.currentUser.adminIn?.length) {
          // Fallback to first store in adminIn array if no stored selection
          this.selectedStore = this.$store.state.currentUser.adminIn[0].id;
          // Save this selection for future use
          localStorage.setItem("openingHoursSelectedStore", this.selectedStore.toString());
        }
      }
    },
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        this.init();
        if (!this.selectedStore && this.$store.state.currentUser.adminIn?.length) {
          this.selectedStore = this.$store.state.currentUser.adminIn[0].id;
        }
      }
    },
    fetchStoreData(storeId) {
      if (storeId) {
        this.isLoading = true;
        this._storeService
          .Get(storeId)
          .then((store) => {
            this.updateLocalOpeningHours(store);
            this.isLoading = false;
          })
          .catch((error) => {
            console.error("Error fetching store data:", error);
            this.isLoading = false;
            alert("Kunne ikke hente butikkdata. Vennligst prøv igjen senere.");
          });
      }
    },
    updateLocalOpeningHours(store) {
      const unsortedOpeningHours = store.openingHours || [];
      this.localOpeningHours = [];

      // Create array for all days of the week (0-6, Monday-Sunday)
      [0, 1, 2, 3, 4, 5, 6].forEach((dayOfWeek) => {
        const openingHours = unsortedOpeningHours.find((x) => x.dayOfWeek === dayOfWeek) || {
          dayOfWeek,
          openingTime: "09:00",
          closingTime: "20:00",
          open: false,
        };

        this.localOpeningHours.push(openingHours);
      });
    },
    updateOpeningHours() {
      if (this.selectedStore) {
        this._storeService
          .UpdateOpeningHours(this.selectedStore, JSON.parse(JSON.stringify(this.localOpeningHours)))
          .then((success) => {
            if (!success) {
              alert("Kunne ikke oppdatere åpningstider. Vennligst prøv igjen senere.");
            }
          })
          .catch((error) => {
            console.error("Error updating opening hours:", error);
            alert("Kunne ikke oppdatere åpningstider. Vennligst prøv igjen senere.");
          });
      }
    },
  },
};
</script>

<style scoped>
.opening-hours {
  padding: 2rem;
}

.opening-hours__title {
  font-size: 2rem;
  margin-bottom: 2rem;
  color: #2d3748;
}

.opening-hours__loading {
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

.opening-hours__items {
  border-top: 1px solid #e2e8f0;
}

.opening-hours__item {
  display: flex;
  align-items: center;
  padding: 1.5rem 0;
  border-bottom: 1px solid #e2e8f0;
}

.opening-hours__day {
  flex: 1;
}

.opening-hours__day-label {
  font-weight: 500;
  font-size: 1rem;
}

.opening-hours__time {
  flex: 2;
}

.opening-hours__time-inputs {
  display: flex;
  align-items: center;
}

.opening-hours__time-input {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  font-size: 1rem;
}

.opening-hours__time-separator {
  margin: 0 0.5rem;
}

.opening-hours__closed {
  flex: 2;
  color: #a0aec0;
}

.opening-hours__toggle {
  flex: 0 0 60px;
  text-align: right;
}

.opening-hours__no-store {
  padding: 2rem 0;
  color: #a0aec0;
  text-align: center;
}

.opening-hours__info {
  margin-top: 2rem;
  padding: 1rem;
  background-color: #f7fafc;
  border-radius: 0.25rem;
  color: #4a5568;
}

/* Switch styles */
.switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e0;
  transition: 0.4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  transition: 0.4s;
}

input:checked + .slider {
  background-color: #1bb776;
}

input:focus + .slider {
  box-shadow: 0 0 1px #1bb776;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.slider.round {
  border-radius: 24px;
}

.slider.round:before {
  border-radius: 50%;
}
</style>
