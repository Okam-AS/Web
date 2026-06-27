<template>
  <div
    v-if="$store.getters.userIsLoggedIn"
    class="admin-nav"
    :class="{ 'is-collapsed': collapsed }"
  >
    <!-- Mobile top bar -->
    <div class="admin-nav__topbar">
      <button
        class="admin-nav__burger"
        type="button"
        aria-label="Åpne meny"
        :aria-expanded="drawerOpen"
        @click="drawerOpen = true"
      >
        <span /><span /><span />
      </button>
      <span class="admin-nav__topbar-title">{{ currentStoreName || 'Okam' }}</span>
    </div>

    <!-- Floating show button (desktop, when collapsed) -->
    <button
      class="admin-nav__show"
      type="button"
      aria-label="Vis meny"
      @click="$emit('toggle-sidebar')"
    >
      <span /><span /><span />
    </button>

    <!-- Backdrop (mobile drawer) -->
    <transition name="backdrop">
      <div
        v-if="drawerOpen"
        class="admin-nav__backdrop"
        @click="drawerOpen = false"
      />
    </transition>

    <!-- Sidebar -->
    <aside
      class="admin-nav__sidebar"
      :class="{ 'is-open': drawerOpen, 'is-collapsed': collapsed }"
    >
      <div class="admin-nav__brand">
        <a :href="navHref('/admin')" class="admin-nav__brand-link" @click="closeDrawer">
          <svg class="admin-nav__logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 836.826 175.846">
            <path d="M330.7,154.371a14.251,14.251,0,0,1-7.139,18.849,29.732,29.732,0,0,1-33.265-6.11l-65.674-65.843V157a18.613,18.613,0,1,1-37.225,0V23.4a18.613,18.613,0,1,1,37.225,0V79.136L290.14,13.453A29.732,29.732,0,0,1,323.4,7.343a14.253,14.253,0,0,1,4.259,23.036L268.263,90.2l59.56,59.983A14.247,14.247,0,0,1,330.7,154.371ZM169.105,90.04c0,47.261-37.855,85.573-84.552,85.573S0,137.3,0,90.04,37.856,4.467,84.553,4.467,169.105,42.779,169.105,90.04Zm-37.225,0c0-26.453-21.189-47.9-47.327-47.9S37.225,63.587,37.225,90.04s21.19,47.9,47.328,47.9S131.88,116.494,131.88,90.04ZM469.931,19.111A29.388,29.388,0,0,0,442.4,0a12.769,12.769,0,0,1-3.8,0,29.388,29.388,0,0,0-27.532,19.111L361.058,153.09A14.012,14.012,0,0,0,374.184,172a29.147,29.147,0,0,0,27.284-18.894L440.5,49.233l39.032,103.873A29.147,29.147,0,0,0,506.816,172a14.012,14.012,0,0,0,13.126-18.91ZM835.942,153.09,785.931,19.111A29.388,29.388,0,0,0,758.4,0c-.3,0-.6.027-.9.045-.3-.018-.6-.045-.9-.045a29.388,29.388,0,0,0-27.532,19.111L691.5,119.759,653.931,19.111A29.388,29.388,0,0,0,626.4,0c-.472,0-.939.025-1.4.071C624.54.025,624.073,0,623.6,0a29.388,29.388,0,0,0-27.532,19.111L546.058,153.09A14.012,14.012,0,0,0,559.184,172a29.147,29.147,0,0,0,27.284-18.894L625,50.563l38.532,102.543A29.147,29.147,0,0,0,690.816,172c.231,0,.456-.023.684-.035.228.012.453.035.684.035a29.147,29.147,0,0,0,27.284-18.894L757.5,51.894l38.032,101.212A29.147,29.147,0,0,0,822.816,172a14.012,14.012,0,0,0,13.126-18.91Z" />
          </svg>
          <span class="admin-nav__badge">Admin</span>
        </a>
        <button
          class="admin-nav__collapse"
          type="button"
          aria-label="Skjul meny"
          @click="$emit('toggle-sidebar')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
        <button
          class="admin-nav__close"
          type="button"
          aria-label="Lukk meny"
          @click="drawerOpen = false"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Store selector -->
      <div class="admin-nav__store store-selector-container">
        <div v-if="adminStores.length === 1" class="store-display">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="store-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span class="store-name">{{ adminStores[0].name }}</span>
        </div>
        <div v-else-if="adminStores.length !== 1" class="store-dropdown" @click="toggleDropdown">
          <div class="store-dropdown-trigger">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="store-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
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
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </transition>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="admin-nav__menu">
        <div
          v-for="group in navGroups"
          :key="group.title"
          class="admin-nav__group"
          :class="{ 'admin-nav__group--role': group.role }"
        >
          <h3 class="admin-nav__group-title">{{ group.title }}</h3>
          <ul class="admin-nav__list">
            <li v-for="item in group.items" :key="item.path">
              <a
                :href="navHref(item.path)"
                class="admin-nav__link"
                :class="{ 'is-active': isActive(item.path) }"
                @click="closeDrawer"
              >
                <span class="admin-nav__icon" v-html="item.icon" />
                <span class="admin-nav__label">{{ item.label }}</span>
                <span v-if="item.isNew" class="new-badge">Nyhet</span>
              </a>
            </li>
          </ul>
        </div>
      </nav>

      <!-- Footer: user + logout -->
      <div class="admin-nav__footer">
        <div v-if="user.fullName || user.phoneNumber" class="admin-nav__user">
          <span class="admin-nav__user-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </span>
          <span class="admin-nav__user-text">
            <span v-if="user.fullName" class="admin-nav__user-name">{{ user.fullName }}</span>
            <span v-if="user.phoneNumber" class="admin-nav__user-phone">{{ user.phoneNumber }}</span>
          </span>
        </div>
        <button class="admin-nav__logout" type="button" @click="showLogoutConfirm = true">
          <span class="admin-nav__icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </span>
          <span>Logg ut</span>
        </button>
      </div>
    </aside>

    <!-- Logout confirmation dialog -->
    <div
      v-if="showLogoutConfirm"
      class="modal-overlay"
      @click.self="showLogoutConfirm = false"
    >
      <div class="confirm-modal">
        <h3>Logg ut</h3>
        <p class="modal-description">Er du sikker på at du vil logge ut?</p>
        <div class="modal-actions">
          <button class="modal-btn-secondary" @click="showLogoutConfirm = false">
            Avbryt
          </button>
          <button class="modal-btn-danger" @click="logout">
            Logg ut
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
const icons = {
  dashboard: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>',
  ongoing: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>',
  orders: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24"><g><path d="M0,0h24v24H0V0z" fill="none"/></g><g><path d="M7,9H2V7h5V9z M7,12H2v2h5V12z M20.59,19l-3.83-3.83C15.96,15.69,15.02,16,14,16c-2.76,0-5-2.24-5-5s2.24-5,5-5s5,2.24,5,5 c0,1.02-0.31,1.96-0.83,2.75L22,17.59L20.59,19z M17,11c0-1.65-1.35-3-3-3s-3,1.35-3,3s1.35,3,3,3S17,12.65,17,11z M2,19h10v-2H2 V19z"/></g></svg>',
  statistics: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>',
  products: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
  categories: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>',
  import: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>',
  delivery: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h2m8 0h2m-2 0h-2m4 0h4v-5h-2.586a1 1 0 01-.707-.293L13 8" /></svg>',
  wolt: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24"><g><rect fill="none" height="24" width="24"/></g><g><g><path d="M19,7c0-1.1-0.9-2-2-2h-3v2h3v2.65L13.52,14H10V9H6c-2.21,0-4,1.79-4,4v3h2c0,1.66,1.34,3,3,3s3-1.34,3-3h4.48L19,10.35V7 z M4,14v-1c0-1.1,0.9-2,2-2h2v3H4z M7,17c-0.55,0-1-0.45-1-1h2C8,16.55,7.55,17,7,17z"/><rect height="2" width="5" x="5" y="6"/><path d="M19,13c-1.66,0-3,1.34-3,3s1.34,3,3,3s3-1.34,3-3S20.66,13,19,13z M19,17c-0.55,0-1-0.45-1-1s0.45-1,1-1s1,0.45,1,1 S19.55,17,19,17z"/></g></g></svg>',
  invoice: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14h6m-6-4h6m-7 10h8a2 2 0 002-2V7.414a2 2 0 00-.586-1.414l-3.414-3.414A2 2 0 0012.586 2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>',
  rewards: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>',
  discounts: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>',
  payment: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>',
  settlements: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
  customers: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>',
  employees: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>',
  onboarding: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>',
  overview: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6m2 0h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>',
  offers: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>',
  growth: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19h18M5 16l4-4 4 3 6-8m0 0h-5m5 0v5" /></svg>',
  dintero: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>',
  goods: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>',
  kam: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>',
};

export default {
  props: {
    collapsed: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      drawerOpen: false,
      onboardingInProgress: false,
      dropdownOpen: false,
      showLogoutConfirm: false,
    };
  },

  computed: {
    isKeyAccountManager() {
      return this.$store.state.currentUser?.isKeyAccountManager;
    },
    isPowerUser() {
      return this.$store.state.currentUser?.isPowerUser;
    },
    user() {
      return this.$store.state.currentUser || {};
    },
    adminStores() {
      return this.$store.state.currentUser?.adminIn || [];
    },
    navGroups() {
      const groups = [
        {
          title: "Drift",
          items: [
            { label: "Dashbord", path: "/admin", icon: icons.dashboard },
            { label: "Pågående bestillinger", path: "/admin/ongoing", icon: icons.ongoing },
            { label: "Historikk", path: "/admin/orders", icon: icons.orders },
            { label: "Statistikk", path: "/admin/statistics", icon: icons.statistics },
          ],
        },
        {
          title: "Meny",
          items: [
            { label: "Produkter", path: "/admin/products", icon: icons.products },
            { label: "Kategorier", path: "/admin/categories", icon: icons.categories },
            { label: "Import", path: "/admin/import", icon: icons.import },
          ],
        },
        {
          title: "Levering",
          items: [
            { label: "Levering", path: "/admin/delivery", icon: icons.delivery },
            { label: "Wolt", path: "/admin/wolt", icon: icons.wolt },
          ],
        },
        {
          title: "Salg & marked",
          items: [
            { label: "Send faktura", path: "/admin/kravia-invoice", icon: icons.invoice, isNew: true },
            { label: "Bonus", path: "/admin/rewards", icon: icons.rewards },
            { label: "Rabatter", path: "/admin/discounts", icon: icons.discounts },
          ],
        },
        {
          title: "Økonomi",
          items: [
            { label: "Betaling", path: "/admin/payment", icon: icons.payment },
            { label: "Utbetalinger", path: "/admin/settlements", icon: icons.settlements },
          ],
        },
        {
          title: "Administrasjon",
          items: [
            { label: "Kunder", path: "/admin/customers", icon: icons.customers },
            { label: "Ansatte", path: "/admin/employees", icon: icons.employees },
          ],
        },
      ];

      if (this.onboardingInProgress) {
        groups[groups.length - 1].items.push({
          label: "Onboarding",
          path: "/admin/onboarding",
          icon: icons.onboarding,
        });
      }

      if (this.isKeyAccountManager || this.isPowerUser) {
        groups.push({
          title: "KAM",
          role: true,
          items: [
            { label: "Avtaler", path: "/admin/offers", icon: icons.offers },
            { label: "Oversikt", path: "/admin/overview", icon: icons.overview },
            { label: "Onboarding", path: "/admin/onboarding", icon: icons.onboarding },
          ],
        });
      }

      if (this.isPowerUser) {
        groups.push({
          title: "Power User",
          role: true,
          items: [
            { label: "Okam vekst", path: "/admin/poweruser-growth", icon: icons.growth },
            { label: "Dintero", path: "/admin/dintero", icon: icons.dintero },
            { label: "Wolt Drive Invoice", path: "/admin/wolt-drive-invoice", icon: icons.invoice },
            { label: "Varer og tjenester", path: "/admin/goods", icon: icons.goods },
            { label: "KAM Administrasjon", path: "/admin/kam", icon: icons.kam },
          ],
        });
      }

      return groups;
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
    "$route.query": {
      handler(newQuery) {
        this.applyQueryStore(newQuery);
      },
      immediate: true,
    },
    "$route.path"() {
      this.drawerOpen = false;
    },
    adminStores: {
      immediate: true,
      handler(stores) {
        const queryStoreId = this.getQueryStoreId();
        const hasStores = stores.length > 0;
        const queryStoreExists = queryStoreId && stores.some(store => store.id === queryStoreId);

        if (queryStoreExists) {
          if (this.$store.state.selectedAdminStore !== queryStoreId) {
            this.$nextTick(() => {
              this.$store.dispatch("SetSelectedAdminStore", queryStoreId);
            });
          }
          this.updateQueryStore(queryStoreId);
          return;
        }

        if (queryStoreId && hasStores) {
          const fallbackStoreId = stores[0].id;
          this.$nextTick(() => {
            this.$store.dispatch("SetSelectedAdminStore", fallbackStoreId);
            this.updateQueryStore(fallbackStoreId);
          });
          return;
        }

        // Ensure a store is always selected when stores are loaded
        if (hasStores && !this.$store.state.selectedAdminStore) {
          this.$nextTick(() => {
            this.$store.dispatch("SetSelectedAdminStore", stores[0].id);
            this.updateQueryStore(stores[0].id);
          });
        }
      }
    }
  },

  mounted() {
    this.onboardingInProgress = localStorage.getItem("onboardingInProgress");

    this.applyQueryStore(this.$route.query);
    this.syncQueryStoreIfMissing();

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
    navHref(path) {
      const storeId = this.selectedStore;
      return storeId ? `${path}?storeId=${storeId}` : path;
    },

    isActive(path) {
      const current = (this.$route.path || "").replace(/\/+$/, "") || "/";
      const target = path.replace(/\/+$/, "");
      if (target === "/admin") {
        return current === "/admin" || current.endsWith("/admin");
      }
      return current === target || current.endsWith(target);
    },

    closeDrawer() {
      this.drawerOpen = false;
    },

    logout() {
      this._userService.Logout();
      if (window && window.location) {
        window.location.href = "/";
      }
    },

    getQueryStoreId(query = this.$route.query) {
      if (!query || typeof query !== "object") {
        return null;
      }

      const directKeys = ["storeId", "storeid", "store", "storeID"];
      for (const key of directKeys) {
        const rawValue = query[key];
        const parsed = this.parseStoreId(rawValue);
        if (parsed) {
          return parsed;
        }
      }

      for (const [key, value] of Object.entries(query)) {
        const normalized = key.toLowerCase();
        if (normalized === "storeid" || normalized === "store") {
          const parsed = this.parseStoreId(value);
          if (parsed) {
            return parsed;
          }
        }
      }

      return null;
    },

    parseStoreId(value) {
      if (typeof value === "string") {
        const parsed = parseInt(value, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
      if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return value;
      }
      return null;
    },

    applyQueryStore(query) {
      const queryStoreId = this.getQueryStoreId(query);
      if (!queryStoreId) {
        return;
      }

      if (this.$store.state.selectedAdminStore !== queryStoreId) {
        this.$store.dispatch("SetSelectedAdminStore", queryStoreId);
      }
    },

    updateQueryStore(storeId) {
      if (!storeId) {
        return;
      }

      const nextQuery = {
        ...this.$route.query,
        storeId,
      };

      delete nextQuery.store;
      delete nextQuery.storeid;
      delete nextQuery.storeID;

      const currentStoreId = this.$route.query?.storeId;
      if (String(currentStoreId) === String(storeId)) {
        return;
      }

      this.$router.replace({ query: nextQuery });
    },

    syncQueryStoreIfMissing() {
      const existingStoreId = this.getQueryStoreId(this.$route.query);
      if (existingStoreId) {
        return;
      }

      const selectedStoreId = this.$store.state.selectedAdminStore;
      if (selectedStoreId) {
        this.updateQueryStore(selectedStoreId);
      }
    },

    toggleDropdown() {
      this.dropdownOpen = !this.dropdownOpen;
    },
    selectStore(storeId) {
      const parsedStoreId = this.parseStoreId(storeId);
      if (!parsedStoreId) {
        return;
      }

      if (String(this.$store.state.selectedAdminStore) === String(parsedStoreId)) {
        this.dropdownOpen = false;
        return;
      }

      this.$store.dispatch("SetSelectedAdminStore", parsedStoreId);
      this.dropdownOpen = false;

      if (typeof window !== "undefined") {
        window.location.assign(this.buildStoreUrl(parsedStoreId));
      } else {
        this.updateQueryStore(parsedStoreId);
      }
    },
    buildStoreUrl(storeId) {
      // Use includes() so the check also matches the locale-prefixed (/en/...)
      // and trailing-slash ("/admin/category-editor/") variants of the path.
      const isExistingCategoryEditor =
        this.$route.path.includes("/admin/category-editor") &&
        this.$route.query?.id &&
        this.$route.query.id !== "new";

      const nextQuery = isExistingCategoryEditor
        ? { storeId }
        : {
          ...this.$route.query,
          storeId,
        };

      delete nextQuery.store;
      delete nextQuery.storeid;
      delete nextQuery.storeID;

      const searchParams = new URLSearchParams();
      Object.entries(nextQuery).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        if (Array.isArray(value)) {
          value.forEach((item) => {
            if (item !== undefined && item !== null) {
              searchParams.append(key, item);
            }
          });
          return;
        }

        searchParams.set(key, value);
      });

      const queryString = searchParams.toString();
      const hash = this.$route.hash || "";
      const path = isExistingCategoryEditor ? "/admin/categories" : this.$route.path;

      return `${path}${queryString ? `?${queryString}` : ""}${hash}`;
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
/* ===== Sidebar shell ===== */
.admin-nav__sidebar {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: var(--admin-sidebar-width, 264px);
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  z-index: 50;
  overflow-y: auto;
  overflow-x: hidden;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Desktop collapse: slide the sidebar off-screen */
@media (min-width: 1025px) {
  .admin-nav__sidebar.is-collapsed {
    transform: translateX(-100%);
  }
}

/* ===== Brand ===== */
.admin-nav__brand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
}

.admin-nav__brand-link {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  text-decoration: none;
  border-bottom: none;
}

.admin-nav__logo {
  height: 18px;
  width: auto;
  fill: #292c34;
  display: block;
}

.admin-nav__badge {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #292c34;
  line-height: 1;
  position: relative;
  bottom: 1px;
}

.admin-nav__close {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  color: #64748b;
}

.admin-nav__close svg {
  width: 22px;
  height: 22px;
}

/* Desktop collapse (hide) button */
.admin-nav__collapse {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  color: #94a3b8;
  border-radius: 6px;
  transition: background 0.15s ease, color 0.15s ease;
}

.admin-nav__collapse:hover {
  background: #f1f5f9;
  color: #292c34;
}

.admin-nav__collapse svg {
  width: 20px;
  height: 20px;
}

/* Floating show button (desktop, only when collapsed) */
.admin-nav__show {
  display: none;
  position: fixed;
  top: 16px;
  left: 16px;
  width: 40px;
  height: 40px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  z-index: 46;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.admin-nav__show:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: translateY(-1px);
}

.admin-nav__show span {
  display: block;
  width: 18px;
  height: 2px;
  background: #292c34;
  border-radius: 2px;
}

@media (min-width: 1025px) {
  .admin-nav.is-collapsed .admin-nav__show {
    display: flex;
  }
}

/* ===== Store selector ===== */
.admin-nav__store {
  padding: 0 16px 16px;
}

.store-selector-container {
  position: relative;
}

.store-display {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.store-display .store-icon {
  width: 18px;
  height: 18px;
  stroke: #1bb776;
  stroke-width: 2;
  flex-shrink: 0;
}

.store-display .store-name {
  color: #292c34;
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.store-dropdown {
  position: relative;
  cursor: pointer;
  user-select: none;
}

.store-dropdown-trigger {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.store-dropdown-trigger:hover {
  border-color: #cbd5e0;
  background: #f1f5f9;
}

.store-dropdown-trigger .store-icon {
  width: 18px;
  height: 18px;
  stroke: #1bb776;
  stroke-width: 2;
  flex-shrink: 0;
}

.store-dropdown-trigger .store-name {
  flex: 1;
  color: #292c34;
  font-size: 0.9rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.store-dropdown-trigger .chevron-icon {
  width: 16px;
  height: 16px;
  stroke: #94a3b8;
  stroke-width: 2;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
}

.chevron-icon--open {
  transform: rotate(180deg);
}

.store-dropdown-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
  border: 1px solid #e2e8f0;
  overflow: hidden;
  z-index: 1000;
  max-height: 320px;
  overflow-y: auto;
}

.store-dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
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

.store-dropdown-item-name {
  color: #292c34;
  font-size: 0.875rem;
  font-weight: 500;
  flex: 1;
}

.store-dropdown-item--active .store-dropdown-item-name {
  font-weight: 600;
  color: #1bb776;
}

.check-icon {
  width: 16px;
  height: 16px;
  stroke: #1bb776;
  stroke-width: 2.5;
  flex-shrink: 0;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  transform-origin: top;
}

.dropdown-enter,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.97);
}

/* ===== Navigation ===== */
.admin-nav__menu {
  flex: 1;
  padding: 4px 12px 24px;
}

.admin-nav__group {
  margin-bottom: 18px;
}

.admin-nav__group--role {
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.admin-nav__group-title {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #94a3b8;
  margin: 0 0 6px;
  padding: 0 12px;
}

.admin-nav__list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.admin-nav__link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  margin-bottom: 2px;
  border-radius: 8px;
  color: #475569;
  text-decoration: none;
  border-bottom: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: background 0.15s ease, color 0.15s ease;
}

.admin-nav__link:hover {
  background: #f1f5f9;
  color: #292c34;
}

.admin-nav__link.is-active {
  background: rgba(27, 183, 118, 0.1);
  color: #159f63;
  font-weight: 600;
}

.admin-nav__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  color: inherit;
}

.admin-nav__label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.new-badge {
  font-size: 0.6rem;
  font-weight: 700;
  background-color: #1bb776;
  color: white;
  padding: 2px 7px;
  border-radius: 10px;
  text-transform: uppercase;
  flex-shrink: 0;
}

/* ===== Footer: user + logout ===== */
.admin-nav__footer {
  margin-top: auto;
  padding: 12px;
  border-top: 1px solid #e2e8f0;
}

.admin-nav__user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px 10px;
  color: #64748b;
  min-width: 0;
}

.admin-nav__user-icon {
  display: inline-flex;
  flex-shrink: 0;
}

.admin-nav__user-icon svg {
  width: 20px;
  height: 20px;
}

.admin-nav__user-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.admin-nav__user-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: #292c34;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-nav__user-phone {
  font-size: 0.78rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-nav__logout {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  background: none;
  border-radius: 8px;
  color: #475569;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.admin-nav__logout:hover {
  background: #fef2f2;
  color: #ef4444;
}

.admin-nav__logout .admin-nav__icon svg {
  width: 20px;
  height: 20px;
}

/* ===== Logout confirmation dialog ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.confirm-modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.confirm-modal h3 {
  font-size: 1.25em;
  font-weight: 600;
  color: #292c34;
  margin: 0 0 8px 0;
}

.confirm-modal .modal-description {
  color: #64748b;
  font-size: 0.9em;
  margin: 0 0 20px 0;
}

.confirm-modal .modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  justify-content: flex-end;
}

.confirm-modal .modal-btn-secondary {
  padding: 10px 20px;
  background: white;
  color: #292c34;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.confirm-modal .modal-btn-secondary:hover {
  background: #f8f9fa;
  border-color: #cbd5e0;
}

.confirm-modal .modal-btn-danger {
  padding: 10px 20px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.confirm-modal .modal-btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(239, 68, 68, 0.4);
}

/* ===== Mobile top bar + drawer ===== */
.admin-nav__topbar {
  display: none;
  align-items: center;
  gap: 12px;
  height: 56px;
  padding: 0 16px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 40;
}

.admin-nav__topbar-title {
  font-size: 1rem;
  font-weight: 600;
  color: #292c34;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.admin-nav__burger {
  width: 30px;
  height: 30px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.admin-nav__burger span {
  display: block;
  height: 2px;
  width: 100%;
  background: #292c34;
  border-radius: 2px;
}

.admin-nav__backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 45;
}

.backdrop-enter-active,
.backdrop-leave-active {
  transition: opacity 0.25s ease;
}

.backdrop-enter,
.backdrop-leave-to {
  opacity: 0;
}

@media (max-width: 1024px) {
  .admin-nav__topbar {
    display: flex;
  }

  .admin-nav__close {
    display: flex;
  }

  .admin-nav__collapse {
    display: none;
  }

  .admin-nav__sidebar {
    width: 280px;
    transform: translateX(-100%);
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.15);
  }

  /* Desktop collapse must not keep the drawer hidden on mobile */
  .admin-nav__sidebar.is-open {
    transform: translateX(0);
  }
}

@media print {
  .admin-nav {
    display: none !important;
  }
}
</style>

<style>
/* Unscoped: size the v-html SVG icons inside nav links */
.admin-nav__icon svg {
  width: 20px;
  height: 20px;
  display: block;
}
</style>
