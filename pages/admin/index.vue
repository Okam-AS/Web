<template>
  <AdminPage @login-success="handleLoginSuccess">
    <Loading
      v-if="isLoading"
      :loading="true"
    />
    <div
      v-else-if="$store.getters.userIsLoggedIn"
      class="dashboard"
    >
      <!-- Regular Admin Section -->
      <div class="dashboard__section">
        <!-- Status Message Banner -->
        <div
          v-if="hasStatusMessage"
          class="status-banner"
          @click="scrollToStatusCard"
        >
          <div class="status-banner__icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="status-banner__content">
            <div class="status-banner__label">Aktiv statusmelding - synlig for kunder</div>
            <div class="status-banner__message">{{ statusMessage }}</div>
          </div>
          <div class="status-banner__arrow">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div class="welcome-container">
          <h1 class="welcome-text">
            <template v-if="userName">Velkommen {{ userName }}!</template>
            <template v-else>Velkommen!</template>
          </h1>
          <p class="welcome-subtitle">Her er dine administrative verktøy og funksjoner</p>
        </div>

        <div class="dashboard__grid">
          <a
            v-for="(item, index) in regularMenuItems"
            :key="`regular-${index}`"
            :href="item.currentPage ? '#' : item.path"
            class="dashboard__card"
            :class="{ 'dashboard__card--current': item.currentPage }"
          >
            <div class="dashboard__content">
              <div class="dashboard__header">
                <span
                  class="dashboard__icon"
                  v-html="item.icon"
                />
                <h2 class="dashboard__card-title">
                  {{ item.title }}
                  <span v-if="item.isNew" class="new-badge">NYHET</span>
                </h2>
              </div>
              <p class="dashboard__description">{{ item.description }}</p>
            </div>
          </a>
        </div>

        <!-- Store Information Section -->
        <div class="store-info-section">
          <h2 class="store-info-section__title">Butikkinformasjon</h2>

          <div class="store-info-grid">
            <!-- Address Card -->
            <div class="store-card">
              <div class="store-card__header">
                <div class="store-card__icon-wrapper">
                  <svg class="store-card__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 class="store-card__title">Adresse</h3>
              </div>

              <div v-if="!editingAddress" class="store-card__content">
                <div class="store-card__info">
                  <p class="store-card__name">{{ storeName }}</p>
                  <p class="store-card__detail">{{ storeAddress.fullAddress }}</p>
                  <p class="store-card__detail">{{ storeAddress.zipCode }} {{ storeAddress.city }}</p>
                </div>
                <button class="store-card__action-btn" @click="editingAddress = true">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Rediger
                </button>
              </div>

              <div v-else class="store-card__edit">
                <div class="form-group">
                  <label>Adresse</label>
                  <input v-model="storeAddress.fullAddress" type="text" class="form-control" />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label>Postnummer</label>
                    <input v-model="storeAddress.zipCode" type="text" class="form-control" />
                  </div>
                  <div class="form-group">
                    <label>Poststed</label>
                    <input v-model="storeAddress.city" type="text" class="form-control" />
                  </div>
                </div>
                <div class="form-actions">
                  <button class="btn btn-primary" @click="updateAddress">Lagre</button>
                  <button class="btn btn-secondary" @click="cancelAddressEdit">Avbryt</button>
                </div>
              </div>

              <div v-if="notification.show && notification.section === 'address'" class="notification" :class="`notification--${notification.type}`">
                {{ notification.message }}
              </div>
            </div>

            <!-- Opening Hours Card -->
            <div class="store-card">
              <div class="store-card__header">
                <div class="store-card__icon-wrapper">
                  <svg class="store-card__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 class="store-card__title">Åpningstider</h3>
              </div>

              <div v-if="!editingHours" class="store-card__content">
                <div class="opening-hours-list">
                  <div v-for="day in localOpeningHours" :key="day.dayOfWeek" class="hours-row">
                    <span class="hours-day">{{ dayLabels[day.dayOfWeek] }}</span>
                    <span class="hours-time" :class="{ 'hours-time--closed': !day.open }">
                      <template v-if="day.open">{{ day.openingTime }} - {{ day.closingTime }}</template>
                      <template v-else>Stengt</template>
                    </span>
                  </div>
                </div>
                <button class="store-card__action-btn" @click="editingHours = true">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Rediger
                </button>
              </div>

              <div v-else class="store-card__edit">
                <div class="opening-hours-edit-list">
                  <div v-for="day in localOpeningHours" :key="day.dayOfWeek" class="hours-edit-row">
                    <div class="hours-edit-header">
                      <span class="hours-day">{{ dayLabels[day.dayOfWeek] }}</span>
                      <label class="toggle-switch">
                        <input type="checkbox" v-model="day.open" @change="updateOpeningHours" />
                        <span class="toggle-slider"></span>
                      </label>
                    </div>
                    <div v-if="day.open" class="time-inputs">
                      <input type="time" v-model="day.openingTime" @change="updateOpeningHours" class="time-input" />
                      <span class="time-separator">-</span>
                      <input type="time" v-model="day.closingTime" @change="updateOpeningHours" class="time-input" />
                    </div>
                  </div>
                </div>
                <div class="form-actions">
                  <button class="btn btn-secondary" @click="editingHours = false">Lukk</button>
                </div>
              </div>

              <div v-if="notification.show && notification.section === 'hours'" class="notification" :class="`notification--${notification.type}`">
                {{ notification.message }}
              </div>
            </div>

            <!-- QR Code Card -->
            <div class="store-card">
              <div class="store-card__header">
                <div class="store-card__icon-wrapper">
                  <svg class="store-card__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <h3 class="store-card__title">QR Bestilling</h3>
              </div>

              <div class="store-card__content">
                <div class="qr-display">
                  <vue-qrcode
                    v-if="generatedUrl"
                    :value="generatedUrl"
                    :options="{ width: 180 }"
                    class="qr-code"
                  />
                  <div class="qr-info">
                    <p class="qr-description">Scan denne QR-koden for bestilling</p>
                    <p class="qr-url">{{ generatedUrl }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Status Message Card -->
            <div ref="statusCard" class="store-card">
              <div class="store-card__header">
                <div class="store-card__icon-wrapper">
                  <svg class="store-card__icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 class="store-card__title">Statusmelding</h3>
              </div>

              <div v-if="!editingStatus && !hasStatusMessage" class="store-card__content">
                <p class="store-card__empty-state">Ingen aktiv statusmelding</p>
                <button class="store-card__action-btn" @click="editingStatus = true">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                  </svg>
                  Legg til statusmelding
                </button>
              </div>

              <div v-if="!editingStatus && hasStatusMessage" class="store-card__content">
                <p class="status-info-text">Denne meldingen er synlig for kunder på butikksiden</p>
                <div class="status-display">
                  <p class="status-message">{{ statusMessage }}</p>
                </div>
                <div class="store-card__actions">
                  <button class="store-card__action-btn" @click="editingStatus = true">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Rediger
                  </button>
                  <button class="store-card__action-btn store-card__action-btn--danger" @click="removeStatusMessage">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Fjern
                  </button>
                </div>
              </div>

              <div v-if="editingStatus" class="store-card__edit">
                <div class="form-group">
                  <label>Statusmelding til kunder</label>
                  <textarea
                    v-model="statusMessage"
                    class="form-control"
                    rows="4"
                    placeholder="Skriv en statusmelding som vil vises på butikksiden..."
                  ></textarea>
                  <p class="form-helper-text">Statusmeldingen vises på butikksiden for å informere kunder</p>
                </div>
                <div class="form-actions">
                  <button class="btn btn-primary" :disabled="!statusMessage.trim()" @click="updateStatusMessage">Lagre</button>
                  <button v-if="hasStatusMessage" class="btn btn-secondary" @click="cancelStatusEdit">Avbryt</button>
                  <button v-else class="btn btn-secondary" @click="editingStatus = false">Avbryt</button>
                </div>
              </div>

              <div v-if="notification.show && notification.section === 'status'" class="notification" :class="`notification--${notification.type}`">
                {{ notification.message }}
              </div>
            </div>
          </div>
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

      <!-- Okam Wrapped Section -->
      <div class="dashboard__section">
        <div class="dashboard__grid">
          <a
            href="/admin/wrapped"
            class="dashboard__card"
          >
            <div class="dashboard__content">
              <div class="dashboard__header">
                <span class="dashboard__icon">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </span>
                <h2 class="dashboard__card-title">Sammendrag av 2025</h2>
              </div>
              <p class="dashboard__description">Se dine høydepunkter fra 2025</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import Loading from "~/components/atoms/Loading.vue";
import VueQrcode from "@chenfengyuan/vue-qrcode";

export default {
  components: { AdminPage, Loading, VueQrcode },
  data: () => ({
    isLoading: false,
    storeName: "",
    storeAddress: {
      fullAddress: "",
      zipCode: "",
      city: "",
    },
    originalAddress: null,
    editingAddress: false,
    editingHours: false,
    editingStatus: false,
    localOpeningHours: [],
    dayLabels: ["Mandag", "Tirsdag", "Onsdag", "Torsdag", "Fredag", "Lørdag", "Søndag"],
    statusMessage: "",
    hasStatusMessage: false,
    infoExpanded: {
      address: false,
      hours: false,
      qr: false,
      status: false,
    },
    notification: {
      show: false,
      message: "",
      type: "success",
      section: "",
      timeout: null,
    },
    menuItems: [
      {
        title: "Dashboard",
        path: "/admin",
        description: "Oversikt og hurtiginnstillinger",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>',
        currentPage: true,
      },
      {
        title: "Pågående bestillinger",
        path: "/admin/ongoing",
        description: "Se pågående bestillinger",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>',
      },
      {
        title: "Statistikk",
        path: "/admin/statistics",
        description: "Se statistikk over bestillinger",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>',
      },
      {
        title: "Historikk",
        path: "/admin/orders",
        description: "Se alle bestillinger med søk og filter",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24"><g><path d="M0,0h24v24H0V0z" fill="none"/></g><g><path d="M7,9H2V7h5V9z M7,12H2v2h5V12z M20.59,19l-3.83-3.83C15.96,15.69,15.02,16,14,16c-2.76,0-5-2.24-5-5s2.24-5,5-5s5,2.24,5,5 c0,1.02-0.31,1.96-0.83,2.75L22,17.59L20.59,19z M17,11c0-1.65-1.35-3-3-3s-3,1.35-3,3s1.35,3,3,3S17,12.65,17,11z M2,19h10v-2H2 V19z"/></g></svg>',
      },
      {
        title: "Utbetalinger",
        path: "/admin/settlements",
        description: "Oversikt over Dintero-utbetalinger",
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
        title: "Wolt",
        path: "/admin/wolt",
        description: "Wolt Marketplace",
        icon: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24"><g><rect fill="none" height="24" width="24"/></g><g><g><path d="M19,7c0-1.1-0.9-2-2-2h-3v2h3v2.65L13.52,14H10V9H6c-2.21,0-4,1.79-4,4v3h2c0,1.66,1.34,3,3,3s3-1.34,3-3h4.48L19,10.35V7 z M4,14v-1c0-1.1,0.9-2,2-2h2v3H4z M7,17c-0.55,0-1-0.45-1-1h2C8,16.55,7.55,17,7,17z"/><rect height="2" width="5" x="5" y="6"/><path d="M19,13c-1.66,0-3,1.34-3,3s1.34,3,3,3s3-1.34,3-3S20.66,13,19,13z M19,17c-0.55,0-1-0.45-1-1s0.45-1,1-1s1,0.45,1,1 S19.55,17,19,17z"/></g></g></svg>',
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
    userName() {
      return this.$store.state.currentUser?.fullName || null;
    },
    selectedStore() {
      return this.$store.state.selectedAdminStore;
    },
    generatedUrl() {
      return this.selectedStore ? `https://shop.okam.no/shop?id=${this.selectedStore}` : "";
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
    getOpeningHoursSummary() {
      const today = new Date().getDay();
      const dayIndex = today === 0 ? 6 : today - 1;
      const todayHours = this.localOpeningHours[dayIndex];
      if (!todayHours || !todayHours.open) {
        return "Stengt i dag";
      }
      return `I dag: ${todayHours.openingTime} - ${todayHours.closingTime}`;
    },
  },
  watch: {
    selectedStore: {
      immediate: true,
      async handler(storeId) {
        if (storeId) {
          await this.fetchStoreData(storeId);
        }
      },
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      return;
    }
    this.isLoading = false;
  },
  methods: {
    async fetchStoreData(storeId) {
      try {
        await this._userService.Reload();
        const store = await this._storeService.Get(storeId);

        if (store) {
          this.storeName = store.name || "";
          this.storeAddress = {
            fullAddress: store.address?.fullAddress || "",
            zipCode: store.address?.zipCode || "",
            city: store.address?.city || "",
          };
          this.originalAddress = { ...this.storeAddress };

          this.statusMessage = store.statusMessage || "";
          this.hasStatusMessage = !!store.statusMessage;

          this.updateLocalOpeningHours(store);
        }
      } catch (error) {
        console.error("Error fetching store data:", error);
      }
    },

    updateLocalOpeningHours(store) {
      this.localOpeningHours = [];
      const unsortedOpeningHours = store.openingHours || [];

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

    showNotification(message, type = "success", section = "") {
      if (this.notification.timeout) {
        clearTimeout(this.notification.timeout);
      }

      this.notification = {
        show: true,
        message,
        type,
        section,
        timeout: null,
      };

      this.notification.timeout = setTimeout(() => {
        this.notification.show = false;
      }, 3000);
    },

    async updateAddress() {
      try {
        await this._storeService.UpdateAddress(this.selectedStore, this.storeAddress);
        this.originalAddress = { ...this.storeAddress };
        this.editingAddress = false;
        this.showNotification("Adresse oppdatert", "success", "address");
      } catch (error) {
        console.error("Error updating address:", error);
        this.showNotification("Kunne ikke oppdatere adresse", "error", "address");
      }
    },

    cancelAddressEdit() {
      this.storeAddress = { ...this.originalAddress };
      this.editingAddress = false;
    },

    async updateOpeningHours() {
      try {
        await this._storeService.UpdateOpeningHours(
          this.selectedStore,
          JSON.parse(JSON.stringify(this.localOpeningHours))
        );
        this.showNotification("Åpningstider oppdatert", "success", "hours");
      } catch (error) {
        console.error("Error updating opening hours:", error);
        this.showNotification("Kunne ikke oppdatere åpningstider", "error", "hours");
      }
    },

    async updateStatusMessage() {
      try {
        await this._storeService.UpdateStatusMessage(this.selectedStore, this.statusMessage);
        this.hasStatusMessage = !!this.statusMessage;
        this.editingStatus = false;
        this.showNotification("Statusmelding oppdatert", "success", "status");
      } catch (error) {
        console.error("Error updating status message:", error);
        this.showNotification("Kunne ikke oppdatere statusmelding", "error", "status");
      }
    },

    async removeStatusMessage() {
      try {
        await this._storeService.UpdateStatusMessage(this.selectedStore, "");
        this.statusMessage = "";
        this.hasStatusMessage = false;
        this.editingStatus = false;
        this.showNotification("Statusmelding fjernet", "success", "status");
      } catch (error) {
        console.error("Error removing status message:", error);
        this.showNotification("Kunne ikke fjerne statusmelding", "error", "status");
      }
    },

    cancelStatusEdit() {
      if (this.hasStatusMessage) {
        // Fetch original status message from store
        const store = this.$store.state.stores?.find(s => s.id === this.selectedStore);
        if (store) {
          this.statusMessage = store.statusMessage || "";
        }
        this.editingStatus = false;
      }
    },

    toggleInfoExpanded(section) {
      this.infoExpanded[section] = !this.infoExpanded[section];
    },

    scrollToStatusCard() {
      if (this.$refs.statusCard) {
        this.$refs.statusCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },

    handleLoginSuccess() {
      this.isLoading = false;
      // Check if there's a redirect parameter in the URL
      const redirectPath = this.$route.query.redirect;
      if (redirectPath && redirectPath !== this.$route.fullPath) {
        this.$router.push(redirectPath);
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

/* Store Information Section */
.store-info-section {
  margin-top: 3rem;
  animation: fadeIn 0.6s ease-out;
}

.store-info-section__title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #292c34;
  margin-bottom: 1.5rem;
  padding-left: 1rem;
  position: relative;
}

.store-info-section__title::before {
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

.store-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* Store Card */
.store-card {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.store-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.store-card__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.store-card__icon-wrapper {
  background-color: rgba(41, 44, 52, 0.1);
  border-radius: 0.5rem;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.store-card__icon {
  width: 1.5rem;
  height: 1.5rem;
  color: #292c34;
}

.store-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #292c34;
  margin: 0;
}

.store-card__content {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.store-card__info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.store-card__name {
  font-size: 1rem;
  font-weight: 600;
  color: #292c34;
  margin: 0;
}

.store-card__detail {
  font-size: 0.9rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;
}

.store-card__action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  background: #f1f5f9;
  color: #292c34;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;
}

.store-card__action-btn svg {
  width: 1rem;
  height: 1rem;
}

.store-card__action-btn:hover {
  background: #e2e8f0;
  border-color: #cbd5e1;
}

.store-card__action-btn--danger {
  color: #dc2626;
  border-color: #fecaca;
}

.store-card__action-btn--danger:hover {
  background: #fef2f2;
  border-color: #fca5a5;
}

.store-card__actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.store-card__edit {
  padding: 1.5rem;
  background: #fafbfc;
}

/* Opening Hours List */
.opening-hours-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.hours-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  transition: background 0.2s ease;
}

.hours-row:hover {
  background: #f1f3f5;
}

.hours-day {
  font-weight: 600;
  color: #292c34;
  font-size: 0.875rem;
}

.hours-time {
  color: #10b981;
  font-size: 0.875rem;
  font-weight: 500;
}

.hours-time--closed {
  color: #ef4444;
  font-style: italic;
}

/* Opening Hours Edit */
.opening-hours-edit-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.hours-edit-row {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.hours-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-left: 0.5rem;
}

.time-input {
  flex: 1;
  padding: 0.625rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  background: white;
  transition: border-color 0.2s ease;
}

.time-input:focus {
  outline: none;
  border-color: #292c34;
}

.time-separator {
  color: #64748b;
  font-weight: 500;
}

/* QR Display */
.qr-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.qr-code {
  padding: 1rem;
  background: white;
  border-radius: 0.5rem;
  border: 2px solid #f1f5f9;
}

.qr-info {
  text-align: center;
  width: 100%;
}

.qr-description {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 0.5rem 0;
}

.qr-url {
  font-size: 0.75rem;
  color: #94a3b8;
  word-break: break-all;
  margin: 0;
  font-family: monospace;
  background: #f8f9fa;
  padding: 0.5rem;
  border-radius: 0.375rem;
}

/* Status Banner at Top */
.status-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 0.75rem;
  margin-bottom: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  animation: slideDown 0.4s ease-out;
}

.status-banner:hover {
  background: #fde68a;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
}

.status-banner__icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  background: #f59e0b;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-banner__icon svg {
  width: 1.5rem;
  height: 1.5rem;
  color: white;
}

.status-banner__content {
  flex: 1;
}

.status-banner__label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #92400e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.status-banner__message {
  font-size: 1rem;
  color: #292c34;
  font-weight: 500;
  line-height: 1.5;
}

.status-banner__arrow {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  color: #f59e0b;
}

.status-banner__arrow svg {
  width: 100%;
  height: 100%;
}

/* Status Display in Card */
.status-info-text {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 1rem 0;
  font-style: italic;
}

.status-display {
  padding: 1rem;
  background: #fef3c7;
  border: 2px solid #f59e0b;
  border-radius: 0.5rem;
}

.status-message {
  font-size: 0.9rem;
  color: #292c34;
  margin: 0;
  line-height: 1.6;
}

.store-card__empty-state {
  color: #94a3b8;
  font-size: 0.875rem;
  margin: 0 0 1rem 0;
  font-style: italic;
}

.form-helper-text {
  font-size: 0.75rem;
  color: #64748b;
  margin-top: 0.5rem;
  margin-bottom: 0;
  font-style: italic;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e1;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #10b981;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

/* Form Elements */
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #292c34;
  font-size: 0.875rem;
}

.form-control {
  width: 100%;
  padding: 0.625rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: border-color 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #292c34;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.btn {
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
}

.btn-primary {
  background-color: #292c34;
  color: white;
}

.btn-primary:hover {
  background-color: #1f2228;
}

.btn-primary:disabled {
  background-color: #cbd5e1;
  cursor: not-allowed;
}

.btn-secondary {
  background-color: #e2e8f0;
  color: #292c34;
}

.btn-secondary:hover {
  background-color: #cbd5e1;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
}

/* Notification */
.notification {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  animation: slideDown 0.3s ease-out;
}

.notification--success {
  background-color: #d1fae5;
  color: #065f46;
  border: 1px solid #10b981;
}

.notification--error {
  background-color: #fee2e2;
  color: #991b1b;
  border: 1px solid #ef4444;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

.dashboard__card--current {
  cursor: default;
  pointer-events: none;
  background: none;
  border: none;
  box-shadow: none;
}

.dashboard__card--current:hover {
  transform: none;
  box-shadow: none;
}

.dashboard__card--current .dashboard__card-title,
.dashboard__card--current .dashboard__description,
.dashboard__card--current .dashboard__icon {
  opacity: 1;
  color: inherit;
}

.dashboard__card[href="#"] {
  opacity: 0.7;
  cursor: not-allowed;
  pointer-events: none;
}

.dashboard__icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  color: #292c34;
  background-color: rgba(41, 44, 52, 0.1);
  padding: 0.5rem;
  border-radius: 0.5rem;
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

.new-badge {
  margin-left: 0.5rem;
  font-size: 0.65rem;
  font-weight: bold;
  background-color: #10b981;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  text-transform: uppercase;
  vertical-align: middle;
}

</style>

<style>
/* Unscoped styles for v-html SVG icons */
.dashboard__icon svg {
  width: 1.5rem;
  height: 1.5rem;
  display: block;
}
</style>
