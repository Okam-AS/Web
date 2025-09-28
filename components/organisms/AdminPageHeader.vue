<template>
  <header class="admin__header">
    <div class="admin__header-nav">
      <div class="admin__wrapper">
        <div class="admin__header-logo">
          <a href="/admin">
            <div class="logo-container">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 836.826 175.846"
              >
                <path
                  d="M330.7,154.371a14.251,14.251,0,0,1-7.139,18.849,29.732,29.732,0,0,1-33.265-6.11l-65.674-65.843V157a18.613,18.613,0,1,1-37.225,0V23.4a18.613,18.613,0,1,1,37.225,0V79.136L290.14,13.453A29.732,29.732,0,0,1,323.4,7.343a14.253,14.253,0,0,1,4.259,23.036L268.263,90.2l59.56,59.983A14.247,14.247,0,0,1,330.7,154.371ZM169.105,90.04c0,47.261-37.855,85.573-84.552,85.573S0,137.3,0,90.04,37.856,4.467,84.553,4.467,169.105,42.779,169.105,90.04Zm-37.225,0c0-26.453-21.189-47.9-47.327-47.9S37.225,63.587,37.225,90.04s21.19,47.9,47.328,47.9S131.88,116.494,131.88,90.04ZM469.931,19.111A29.388,29.388,0,0,0,442.4,0a12.769,12.769,0,0,1-3.8,0,29.388,29.388,0,0,0-27.532,19.111L361.058,153.09A14.012,14.012,0,0,0,374.184,172a29.147,29.147,0,0,0,27.284-18.894L440.5,49.233l39.032,103.873A29.147,29.147,0,0,0,506.816,172a14.012,14.012,0,0,0,13.126-18.91ZM835.942,153.09,785.931,19.111A29.388,29.388,0,0,0,758.4,0c-.3,0-.6.027-.9.045-.3-.018-.6-.045-.9-.045a29.388,29.388,0,0,0-27.532,19.111L691.5,119.759,653.931,19.111A29.388,29.388,0,0,0,626.4,0c-.472,0-.939.025-1.4.071C624.54.025,624.073,0,623.6,0a29.388,29.388,0,0,0-27.532,19.111L546.058,153.09A14.012,14.012,0,0,0,559.184,172a29.147,29.147,0,0,0,27.284-18.894L625,50.563l38.532,102.543A29.147,29.147,0,0,0,690.816,172c.231,0,.456-.023.684-.035.228.012.453.035.684.035a29.147,29.147,0,0,0,27.284-18.894L757.5,51.894l38.032,101.212A29.147,29.147,0,0,0,822.816,172a14.012,14.012,0,0,0,13.126-18.91Z"
                />
              </svg>
              <span class="admin-badge">Admin</span>
            </div>
          </a>
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
                    <a href="/admin/settings">
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
                      Innstillinger
                    </a>
                  </li>
                  <li>
                    <a href="/admin/qr">
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
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                          />
                        </svg>
                      </span>
                      QR Bordkort
                    </a>
                  </li>
                  <li>
                    <a href="/admin/openinghours">
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
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </span>
                      Åpningstider
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
                    <a href="/admin/orders">
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
                            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                          />
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
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                      </span>
                      Wolt Drive
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
export default {
  data: () => ({
    menuIsActive: false,
    onboardingInProgress: false,
  }),

  computed: {
    isKeyAccountManager() {
      return this.$store.state.currentUser?.isKeyAccountManager;
    },
    isPowerUser() {
      return this.$store.state.currentUser?.isPowerUser;
    },
  },

  mounted() {
    this.onboardingInProgress = localStorage.getItem("onboardingInProgress");
  },
};
</script>

<style scoped>
.admin__header-logo {
  display: flex;
  align-items: center;
  height: 100%;
}

.admin__header-logo a {
  text-decoration: none;
  border-bottom: none;
  display: flex;
  align-items: center;
}

.admin__header-logo svg {
  fill: white;
  display: block;
  height: 20px;
  width: auto;
}

.logo-container {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.admin-badge {
  background-color: black;
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.menu-icon {
  display: inline-flex;
  align-items: center;
  margin-right: 0.5rem;
}

.menu-icon svg {
  width: 1.25rem;
  height: 1.25rem;
  stroke: black;
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
