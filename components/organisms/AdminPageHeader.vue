<template>
  <header class="admin__header" v-if="$store.getters.userIsLoggedIn">
    <div class="admin__header-nav">
      <div class="admin__wrapper">
        <div class="admin__header-left">
          <a href="/admin" class="home-icon-link">
            <div class="home-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
            </div>
          </a>
          <div class="store-selector-container">
            <div v-if="adminStores.length === 1" class="store-display">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                class="store-icon"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
              <span class="store-name">{{ adminStores[0].name }}</span>
            </div>
            <div v-else-if="adminStores.length !== 1" class="store-dropdown" @click="toggleDropdown">
              <div class="store-dropdown-trigger">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  class="store-icon"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                <span class="store-name">{{ currentStoreName }}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  class="chevron-icon"
                  :class="{ 'chevron-icon--open': dropdownOpen }"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              <transition name="dropdown">
                <div v-if="dropdownOpen" class="store-dropdown-menu">
                  <div
                    v-for="store in adminStores"
                    :key="store.id"
                    class="store-dropdown-item"
                    :class="{ 'store-dropdown-item--active': store.id === selectedStore }"
                    @click.stop="selectStore(store.id)"
                  >
                    <span class="store-dropdown-item-name">{{ store.name }}</span>
                    <svg
                      v-if="store.id === selectedStore"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      class="check-icon"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
        <div class="admin__header-menu">
          <button
            class="admin__header-menu-trigger"
            type="button"
            aria-label="Meny"
            :aria-expanded="menuIsActive"
            @click="menuIsActive = !menuIsActive"
          >
            <span />
          </button>
          <div :class="{ 'admin__header-panel': true, 'is-active': menuIsActive }">
            <div class="admin__wrapper">
              <!-- Regular Admin Functions Section -->
              <div class="admin__header-section">
                <ul class="admin__header-menu-list">
                  <li>
                    <a href="/admin">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                          />
                        </svg>
                      </span>
                      Dashbord
                    </a>
                  </li>
                  <li>
                    <a href="/admin/ongoing">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </span>
                      Pågående bestillinger
                    </a>
                  </li>
                  <li>
                    <a href="/admin/statistics">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                          />
                        </svg>
                      </span>
                      Statistikk
                    </a>
                  </li>
                  <li>
                    <a href="/admin/orders">
                      <span class="menu-icon menu-icon--filled">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          enable-background="new 0 0 24 24"
                          viewBox="0 0 24 24"
                        >
                          <g>
                            <path d="M0,0h24v24H0V0z" fill="none" />
                          </g>
                          <g>
                            <path d="M7,9H2V7h5V9z M7,12H2v2h5V12z M20.59,19l-3.83-3.83C15.96,15.69,15.02,16,14,16c-2.76,0-5-2.24-5-5s2.24-5,5-5s5,2.24,5,5 c0,1.02-0.31,1.96-0.83,2.75L22,17.59L20.59,19z M17,11c0-1.65-1.35-3-3-3s-3,1.35-3,3s1.35,3,3,3S17,12.65,17,11z M2,19h10v-2H2 V19z" />
                          </g>
                        </svg>
                      </span>
                      Historikk
                    </a>
                  </li>
                  <li>
                    <a href="/admin/settlements">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </span>
                      Utbetalinger
                    </a>
                  </li>
                  <li>
                    <a href="/admin/products">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </span>
                      Produkter
                    </a>
                  </li>
                  <li>
                    <a href="/admin/categories">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                      </span>
                      Kategorier
                      <span class="new-badge">NYHET</span>
                    </a>
                  </li>
                  <li>
                    <a href="/admin/import">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                          />
                        </svg>
                      </span>
                      Import
                    </a>
                  </li>
                  <li>
                    <a href="/admin/wolt">
                      <span class="menu-icon menu-icon--filled">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          enable-background="new 0 0 24 24"
                          viewBox="0 0 24 24"
                        >
                          <g>
                            <rect fill="none" height="24" width="24" />
                          </g>
                          <g>
                            <g>
                              <path d="M19,7c0-1.1-0.9-2-2-2h-3v2h3v2.65L13.52,14H10V9H6c-2.21,0-4,1.79-4,4v3h2c0,1.66,1.34,3,3,3s3-1.34,3-3h4.48L19,10.35V7 z M4,14v-1c0-1.1,0.9-2,2-2h2v3H4z M7,17c-0.55,0-1-0.45-1-1h2C8,16.55,7.55,17,7,17z" />
                              <rect height="2" width="5" x="5" y="6" />
                              <path d="M19,13c-1.66,0-3,1.34-3,3s1.34,3,3,3s3-1.34,3-3S20.66,13,19,13z M19,17c-0.55,0-1-0.45-1-1s0.45-1,1-1s1,0.45,1,1 S19.55,17,19,17z" />
                            </g>
                          </g>
                        </svg>
                      </span>
                      Wolt
                    </a>
                  </li>
                  <li v-if="onboardingInProgress">
                    <a href="/admin/onboarding">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </span>
                      Onboarding
                    </a>
                  </li>
                </ul>
              </div>

              <!-- Key Account Manager Section -->
              <div
                v-if="isKeyAccountManager"
                class="admin__header-section admin__header-section--kam"
              >
                <h3 class="admin__header-section-title">KAM funksjoner</h3>
                <ul class="admin__header-menu-list">
                  <li>
                    <a href="/admin/offers">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </span>
                      Avtaler
                    </a>
                  </li>
                  <li>
                    <a href="/admin/overview">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6m2 0h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6a2 2 0 002 2z"
                          />
                        </svg>
                      </span>
                      Oversikt
                    </a>
                  </li>
                  <li>
                    <a href="/admin/onboarding">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                          />
                        </svg>
                      </span>
                      Onboarding
                    </a>
                  </li>
                </ul>
              </div>

              <!-- Power User Section -->
              <div
                v-if="isPowerUser"
                class="admin__header-section admin__header-section--power-user"
              >
                <h3 class="admin__header-section-title">Power User funksjoner</h3>
                <ul class="admin__header-menu-list">
                  <li>
                    <a href="/admin/dintero">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                      </span>
                      Dintero
                    </a>
                  </li>
                  <li>
                    <a href="/admin/goods">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      </span>
                      Varer og tjenester
                    </a>
                  </li>
                  <li>
                    <a href="/admin/kam">
                      <span class="menu-icon">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                          />
                        </svg>
                      </span>
                      KAM Administrasjon
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script>
import { ActionName } from '~/core/enums'

export default {
  data() {
    return {
      menuIsActive: false,
      onboardingInProgress: false,
      dropdownOpen: false,
    };
  },

  computed: {
    isKeyAccountManager() {
      return this.$store.state.currentUser?.isKeyAccountManager;
    },
    isPowerUser() {
      return this.$store.state.currentUser?.isPowerUser;
    },
    adminStores() {
      return this.$store.state.currentUser?.adminIn || [];
    },
    selectedStore: {
      get() {
        // Always ensure a store is selected, default to first if none selected
        const currentSelected = this.$store.state.selectedAdminStore;
        if (!currentSelected && this.adminStores.length > 0) {
          return this.adminStores[0].id;
        }
        return currentSelected;
      },
      set(value) {
        this.$store.dispatch("SetSelectedAdminStore", value);
      }
    },
    currentStoreName() {
      const store = this.adminStores.find(s => s.id === this.selectedStore);

      if (store && store.name) {
        return store.name;
      }

      return this.adminStores.length > 0 ? this.adminStores[0].name : '';
    },
  },

  watch: {
    adminStores: {
      immediate: true,
      handler(stores) {
        // Ensure a store is always selected when stores are loaded
        if (stores.length > 0 && !this.$store.state.selectedAdminStore) {
          this.$nextTick(() => {
            this.$store.dispatch("SetSelectedAdminStore", stores[0].id);
          });
        }
      }
    }
  },

  mounted() {
    this.onboardingInProgress = localStorage.getItem("onboardingInProgress");

    // Ensure a store is selected on mount
    if (this.adminStores.length > 0 && !this.$store.state.selectedAdminStore) {
      this.$store.dispatch("SetSelectedAdminStore", this.adminStores[0].id);
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', this.handleClickOutside);
  },

  beforeDestroy() {
    document.removeEventListener('click', this.handleClickOutside);
  },

  methods: {
    toggleDropdown() {
      this.dropdownOpen = !this.dropdownOpen;
    },
    selectStore(storeId) {
      this.$store.dispatch("SetSelectedAdminStore", storeId);
      this.dropdownOpen = false;
    },
    handleClickOutside(event) {
      // Check if $el exists and is an element before querying
      if (!this.$el || typeof this.$el.querySelector !== 'function') {
        return;
      }

      const dropdown = this.$el.querySelector('.store-dropdown');
      if (dropdown && !dropdown.contains(event.target)) {
        this.dropdownOpen = false;
      }
    }
  }
};
</script>

<style scoped>
.admin__header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  height: 100%;
}

.home-icon-link {
  text-decoration: none;
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.home-icon {
  width: 40px;
  height: 40px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.home-icon:hover {
  background-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.home-icon svg {
  width: 22px;
  height: 22px;
  stroke: white;
  stroke-width: 2;
}

.store-selector-container {
  position: relative;
  display: flex;
  align-items: center;
}

/* Single store display */
.store-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1.25rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.store-display .store-icon {
  width: 20px;
  height: 20px;
  stroke: #1bb776;
  stroke-width: 2;
  flex-shrink: 0;
}

.store-display .store-name {
  color: #1f2937;
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
}

/* Custom dropdown */
.store-dropdown {
  position: relative;
  cursor: pointer;
  user-select: none;
}

.store-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1.25rem;
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  min-width: 220px;
}

.store-dropdown-trigger:hover {
  border-color: rgba(255, 255, 255, 0.6);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.store-dropdown-trigger .store-icon {
  width: 20px;
  height: 20px;
  stroke: #1bb776;
  stroke-width: 2;
  flex-shrink: 0;
}

.store-dropdown-trigger .store-name {
  flex: 1;
  color: #1f2937;
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.store-dropdown-trigger .chevron-icon {
  width: 18px;
  height: 18px;
  stroke: #6b7280;
  stroke-width: 2;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.chevron-icon--open {
  transform: rotate(180deg);
}

/* Dropdown menu */
.store-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 1000;
  max-height: 300px;
  overflow-y: auto;
}

.store-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.store-dropdown-item:last-child {
  border-bottom: none;
}

.store-dropdown-item:hover {
  background-color: rgba(27, 183, 118, 0.08);
}

.store-dropdown-item--active {
  background-color: rgba(27, 183, 118, 0.12);
}

.store-dropdown-item--active:hover {
  background-color: rgba(27, 183, 118, 0.16);
}

.store-dropdown-item-name {
  color: #1f2937;
  font-size: 0.9rem;
  font-weight: 500;
  flex: 1;
}

.store-dropdown-item--active .store-dropdown-item-name {
  font-weight: 600;
  color: #1bb776;
}

.check-icon {
  width: 18px;
  height: 18px;
  stroke: #1bb776;
  stroke-width: 2.5;
  flex-shrink: 0;
}

/* Dropdown transition */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top;
}

.dropdown-enter {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.dropdown-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.dropdown-leave {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.95);
}

.menu-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 0.5rem;
}

.menu-icon svg {
  width: 1.25rem;
  height: 1.25rem;
  stroke: currentColor;
  fill: none;
}

.menu-icon svg path {
  stroke-width: 2;
}

.menu-icon--filled svg {
  fill: currentColor;
  stroke: none;
}

.menu-icon--filled svg path {
  stroke-width: 0;
}

.admin__header-menu-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.admin__header-menu-list li a {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  color: black;
  text-decoration: none;
  transition: background-color 0.2s;
}

.admin__header-menu-list li a:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

.disabled-link {
  opacity: 0.7;
  cursor: not-allowed;
}

.coming-soon-label {
  margin-left: 0.5rem;
  font-size: 0.75rem;
  background-color: #e2e8f0;
  padding: 2px 6px;
  border-radius: 4px;
  color: #4a5568;
}

.new-badge {
  margin-left: 0.5rem;
  font-size: 0.65rem;
  font-weight: bold;
  background-color: #10b981;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
}

.admin__header-section {
  margin-bottom: 1rem;
}

.admin__header-section-title {
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.admin__header-section--kam {
  background-color: white;
  padding: 1rem;
  border-radius: 4px;
}

.admin__header-section--power-user {
  background-color: white;
  padding: 1rem;
  border-radius: 4px;
}
</style>
