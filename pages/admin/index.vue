<template>
  <AdminPage>
    <Loading
      v-if="isLoading"
      :loading="true"
    />
    <div
      v-else
      class="dashboard"
    >
      <!-- Regular Admin Section -->
      <div class="dashboard__section">
        <div class="welcome-container">
          <h1
            v-if="showWelcome"
            class="welcome-text"
          >
            Velkommen, {{ $store.state.currentUser.fullName }}!
          </h1>
          <p class="welcome-subtitle">Her er dine administrative verktøy og funksjoner</p>
        </div>
        <div class="dashboard__grid">
          <a
            v-for="(item, index) in regularMenuItems"
            :key="`regular-${index}`"
            :href="item.path"
            class="dashboard__card"
          >
            <div class="dashboard__content">
              <div class="dashboard__header">
                <span
                  class="dashboard__icon"
                  v-html="item.icon"
                />
                <h2 class="dashboard__card-title">{{ item.title }}</h2>
              </div>
              <p class="dashboard__description">{{ item.description }}</p>
            </div>
          </a>
        </div>
      </div>

      <!-- Key Account Manager Section -->
      <div
        v-if="showKamSection"
        class="dashboard__section dashboard__section--kam"
      >
        <h1 class="dashboard__section-title">KAM funksjoner</h1>
        <div class="dashboard__grid">
          <a
            v-for="(item, index) in kamMenuItems"
            :key="`kam-${index}`"
            :href="item.path"
            class="dashboard__card"
          >
            <div class="dashboard__content">
              <div class="dashboard__header">
                <span
                  class="dashboard__icon"
                  v-html="item.icon"
                />
                <h2 class="dashboard__card-title">{{ item.title }}</h2>
              </div>
              <p class="dashboard__description">{{ item.description }}</p>
            </div>
          </a>
        </div>
      </div>

      <!-- Power User Section -->
      <div
        v-if="showPowerUserSection"
        class="dashboard__section dashboard__section--power-user"
      >
        <h1 class="dashboard__section-title">Power User funksjoner</h1>
        <div class="dashboard__grid">
          <a
            v-for="(item, index) in powerUserMenuItems"
            :key="`power-user-${index}`"
            :href="item.path"
            class="dashboard__card"
          >
            <div class="dashboard__content">
              <div class="dashboard__header">
                <span
                  class="dashboard__icon"
                  v-html="item.icon"
                />
                <h2 class="dashboard__card-title">{{ item.title }}</h2>
              </div>
              <p class="dashboard__description">{{ item.description }}</p>
            </div>
          </a>
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

export default {
  components: { AdminPage, LoginModal, Loading },
  data: () => ({
    showLogin: false,
    isLoading: false,
    menuItems: [
      {
        title: "Innstillinger",
        path: "/admin/settings",
        description: "Butikk detaljer og status melding",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>',
      },
      {
        title: "QR Bordkort",
        path: "/admin/qr",
        description: "Lag QR-koder",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>',
      },
      {
        title: "Pågående bestillinger",
        path: "/admin/ongoing",
        description: "Se pågående bestillinger",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>',
      },
      {
        title: "Historikk",
        path: "/admin/orders",
        description: "Se alle bestillinger med søk og filter",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>',
      },
      {
        title: "Utbetalinger",
        path: "/admin/settlements",
        description: "Oversikt over utestående Dintero-utbetalinger",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
      },
      {
        title: "Produkter",
        path: "/admin/products",
        description: "Enkel redigering av produkter",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
      },
      {
        title: "Kategorier",
        path: "/admin/categories",
        description: "Administrer produktkategorier",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>',
      },
      {
        title: "Import",
        path: "/admin/import",
        description: "Masseimport av nye produkter med kategorier",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>',
      },
      {
        title: "Åpningstider",
        path: "/admin/openinghours",
        description: "Administrer butikkens åpningstider",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
      },
      {
        title: "Wolt Drive",
        path: "/admin/wolt",
        description: "Levering med Wolt",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>',
      },
      {
        title: "Dintero",
        path: "/admin/dintero",
        description: "Betalingsinnstillinger for Dintero",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>',
        powerUserOnly: true,
      },
      {
        title: "Avtaler",
        path: "/admin/offers",
        description: "Administrer avtaler og tilbud",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>',
        kamOnly: true,
      },
      {
        title: "Varer og tjenester",
        path: "/admin/goods",
        description: "Administrer varer og tjenester for avtaler",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>',
        powerUserOnly: true,
      },
      {
        title: "KAM Administrasjon",
        path: "/admin/kam",
        description: "Manage Key Account Manager relationships",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>',
        powerUserOnly: true,
      },
    ],
  }),
  computed: {
    showWelcome() {
      return this.$store.state.currentUser?.fullName ?? false;
    },
    regularMenuItems() {
      return this.menuItems.filter((item) => !item.kamOnly && !item.powerUserOnly);
    },
    kamMenuItems() {
      const kamOnlyItems = this.menuItems.filter((item) => item.kamOnly);

      // Add KAM-specific items
      return kamOnlyItems.concat([
        {
          title: "Oversikt",
          path: "/admin/overview",
          description: "Se oversikt over alle butikker",
          icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6m2 0h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>',
        },
        {
          title: "Onboarding",
          path: "/admin/onboarding",
          description: "Oppsett av ny butikk",
          icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>',
        },
      ]);
    },
    showKamSection() {
      return this.$store.state?.currentUser?.isKeyAccountManager;
    },
    powerUserMenuItems() {
      return this.menuItems.filter((item) => item.powerUserOnly);
    },
    showPowerUserSection() {
      return this.$store.state?.currentUser?.isPowerUser;
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      return;
    }
    this.isLoading = false;
  },
  methods: {
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        this.isLoading = false;
        // Check if there's a redirect parameter in the URL
        const redirectPath = this.$route.query.redirect;
        if (redirectPath && redirectPath !== this.$route.fullPath) {
          this.$router.push(redirectPath);
        }
      }
    },
  },
};
</script>

<style scoped>
.dashboard {
  padding: 2rem;
  background-color: #f8f9fa;
  min-height: calc(100vh - 60px);
}

.welcome-container {
  margin-bottom: 2rem;
  padding: 1.5rem;
  color: #292c34;
  animation: fadeIn 0.6s ease-out;
}

.welcome-text {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.welcome-subtitle {
  font-size: 1.1rem;
  opacity: 0.9;
  margin-top: 0.5rem;
}

.dashboard__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.25rem;
  animation: slideUp 0.5s ease-out;
}

.dashboard__card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem;
  background: white;
  border-radius: 0.75rem;
  text-decoration: none;
  color: inherit;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border: 1px solid rgba(0, 0, 0, 0.03);
  height: 100%;
}

.dashboard__card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  border-color: #292c34;
}

.dashboard__card[href="#"] {
  opacity: 0.7;
  cursor: not-allowed;
  pointer-events: none;
}

.dashboard__icon {
  flex-shrink: 0;
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  margin-bottom: 0.75rem;
  color: #292c34;
}

.dashboard__icon svg {
  width: 2rem;
  height: 2rem;
  display: block;
}

.dashboard__content {
  width: 100%;
}

.dashboard__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.dashboard__icon {
  margin-bottom: 0;
  background-color: rgba(41, 44, 52, 0.1);
  padding: 0.5rem;
  border-radius: 0.5rem;
}

.dashboard__card-title {
  font-size: 1.1rem;
  margin-bottom: 0;
  font-weight: 600;
  color: #292c34;
}

.dashboard__description {
  font-size: 0.95rem;
  color: #64748b;
  line-height: 1.5;
}

.dashboard__section {
  margin-bottom: 2.5rem;
}

.dashboard__section-title {
  font-size: 1.5rem;
  margin-bottom: 1.25rem;
  font-weight: 600;
  color: #292c34;
  position: relative;
  padding-left: 1rem;
}

.dashboard__section-title::before {
  content: "";
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 1.2em;
  background-color: #292c34;
  border-radius: 2px;
}

.dashboard__section--kam {
  background-color: #f0f2f5;
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(41, 44, 52, 0.15);
  animation: fadeIn 0.8s ease-out;
}

.dashboard__section--power-user {
  background-color: #f0f2f5;
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(41, 44, 52, 0.15);
  animation: fadeIn 0.8s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
