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
          <span class="admin-nav__badge">{{ $i('nav_admin_badge') }}</span>
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

      <!-- Store selector. Same three-state rule as the nav groups: it is a control for picking which
           store you administer, so it is withheld only from someone we KNOW administers none —
           where it would otherwise render an empty name over an empty dropdown. While the answer is
           unknown it renders exactly as it always has. -->
      <div v-if="showsStoreAdminNav" class="admin-nav__store store-selector-container">
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
          <h3 class="admin-nav__group-title">
            {{ group.title }}
          </h3>
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
                <span v-if="item.isNew" class="new-badge">{{ $i('nav_new_badge') }}</span>
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
        <LanguageSwitcher class="admin-nav__lang" />
        <button class="admin-nav__logout" type="button" @click="showLogoutConfirm = true">
          <span class="admin-nav__icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </span>
          <span>{{ $i('nav_logout') }}</span>
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
        <h3>{{ $i('nav_logout_confirm_title') }}</h3>
        <p class="modal-description">
          {{ $i('nav_logout_confirm_message') }}
        </p>
        <div class="modal-actions">
          <button class="modal-btn-secondary" @click="showLogoutConfirm = false">
            {{ $i('common_cancel') }}
          </button>
          <button class="modal-btn-danger" @click="logout">
            {{ $i('nav_logout') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import LanguageSwitcher from '~/components/admin/LanguageSwitcher.vue';
import { storeAdminAccess, showsStoreAdminNav } from '~/utils/admin/nav-access';

const icons = {
  dashboard: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>',
  ongoing: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>',
  orders: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24"><g><path d="M0,0h24v24H0V0z" fill="none"/></g><g><path d="M7,9H2V7h5V9z M7,12H2v2h5V12z M20.59,19l-3.83-3.83C15.96,15.69,15.02,16,14,16c-2.76,0-5-2.24-5-5s2.24-5,5-5s5,2.24,5,5 c0,1.02-0.31,1.96-0.83,2.75L22,17.59L20.59,19z M17,11c0-1.65-1.35-3-3-3s-3,1.35-3,3s1.35,3,3,3S17,12.65,17,11z M2,19h10v-2H2 V19z"/></g></svg>',
  statistics: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>',
  products: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
  categories: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>',
  import: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>',
  allergens: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
  delivery: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h2m8 0h2m-2 0h-2m4 0h4v-5h-2.586a1 1 0 01-.707-.293L13 8" /></svg>',
  wolt: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" viewBox="0 0 24 24"><g><rect fill="none" height="24" width="24"/></g><g><g><path d="M19,7c0-1.1-0.9-2-2-2h-3v2h3v2.65L13.52,14H10V9H6c-2.21,0-4,1.79-4,4v3h2c0,1.66,1.34,3,3,3s3-1.34,3-3h4.48L19,10.35V7 z M4,14v-1c0-1.1,0.9-2,2-2h2v3H4z M7,17c-0.55,0-1-0.45-1-1h2C8,16.55,7.55,17,7,17z"/><rect height="2" width="5" x="5" y="6"/><path d="M19,13c-1.66,0-3,1.34-3,3s1.34,3,3,3s3-1.34,3-3S20.66,13,19,13z M19,17c-0.55,0-1-0.45-1-1s0.45-1,1-1s1,0.45,1,1 S19.55,17,19,17z"/></g></g></svg>',
  invoice: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14h6m-6-4h6m-7 10h8a2 2 0 002-2V7.414a2 2 0 00-.586-1.414l-3.414-3.414A2 2 0 0012.586 2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>',
  rewards: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>',
  discounts: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>',
  payment: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>',
  settlements: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
  terminals: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="5" y="2" width="14" height="20" rx="2" stroke-width="2" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 6h6M9 10h6" /><rect x="9" y="14" width="6" height="4" rx="1" fill="currentColor" stroke="none" /></svg>',
  customers: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>',
  employees: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>',
  onboarding: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>',
  overview: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6m2 0h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>',
  offers: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>',
  growth: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19h18M5 16l4-4 4 3 6-8m0 0h-5m5 0v5" /></svg>',
  dintero: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>',
  surfboard: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 20c6-2 12-8 16-16M4 20c2-6 8-12 16-16M4 20l4-1m8-15l1-1" /></svg>',
  goods: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>',
  kam: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>',
  pos: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m-6 4h6m-7 4h.01M15 15h.01M7 21h10a2 2 0 002-2V7a2 2 0 00-2-2h-1V3H8v2H7a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
  kitchen: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" /></svg>',
  tables: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h5v6H4V5zm10-1h5a1 1 0 011 1v5h-6V4zM4 13h6v6H5a1 1 0 01-1-1v-5zm10 0h6v5a1 1 0 01-1 1h-5v-6z" /></svg>',
  reservations: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
  posSettings: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>',
  posReports: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>',
  workforceSchedule: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3M4 11h16M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 15h3m2 0h3" /></svg>',
  workforceMe: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 16l2 2 4-4" /></svg>',
  // An envelope with a tick, NOT the plain envelope `growthNewsletter` uses in the modules group:
  // that page mails guests, this one is the signed-in person's own address and the confirmation of
  // it. The tick is the whole difference and it is the subject of the page.
  accountEmail: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h9M5 19a2 2 0 01-2-2V7a2 2 0 012-2h14a2 2 0 012 2v5" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l2 2 4-4" /></svg>',
  workforceRoster: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>',
  // A TAG, and deliberately not a person or a calendar: this entry sits between `workforceRoster`
  // (people) and `workforceRates` (a clock) in the same group, and a role is neither of those — it
  // is the label a shift gets filed under. An icon that read as "people" would make the catalogue
  // look like a second roster, which is the exact confusion the page's own note exists to prevent.
  workforceRoles: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>',
  marginRecipes: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>',
  // A balance, not a second clipboard: this page weighs two totals against each other (what the
  // recipes say the week should have cost against what the venue actually bought), and it has to read
  // differently from `marginRecipes` — the clipboard — directly above it in the same group.
  marginStatements: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /></svg>',
  // A delivery truck, not another document: this page is about who you buy from, and it sits
  // directly under `marginRecipes` (a document) in the same group.
  marginSuppliers: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1" /></svg>',
  // An upload arrow: the whole page is a file going in.
  marginPriceImports: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>',
  mealsAgreements: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>',
  // An office block with people beside it, distinct from `mealsAgreements` (a plain building) in the
  // same group: that page monitors this venue's agreements, this one sets a company account up.
  mealsCompanies: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21h8V3H3v18zm0 0h18M14 21h7V9h-7v12zM6 7h2M6 11h2M6 15h2M17 13h1m-1 4h1" /></svg>',
  // A receipt: a document with a torn foot. Deliberately neither of the two buildings beside it and
  // deliberately not `marginStatements` (a chart) either — this page produces a BILL, and it is the
  // only Meals link that writes one.
  mealsStatements: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 3h12a1 1 0 011 1v17l-3-2-3 2-3-2-3 2V4a1 1 0 011-1zM9 8h6M9 12h6M9 16h3" /></svg>',
  growthNewsletter: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>',
  // A shield, not the envelope beside it: this page is the venue's obligation to the guest, and it
  // must not read as a second mailing screen. Deliberately NOT a padlock — nothing here is locked;
  // it is a duty with a one-month clock on it.
  growthPrivacy: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3l7 3v5.5c0 4.28-2.99 8.28-7 9.5-4.01-1.22-7-5.22-7-9.5V6l7-3z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8.5v3.2l2 1.3" /></svg>',
  eventsPipeline: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>',
  // An inbox tray, not a calendar and not people: this page is a QUEUE of decisions waiting on the
  // manager, and it sits between the schedule and the roster in the same group.
  workforceRequests: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-4l-1 2H9l-1-2H4" /></svg>',
  // A clock, not a coin: this page is hours first — the rate is what the hours are multiplied by. It
  // has to read differently from `workforceSchedule` (a calendar) beside it in the same group.
  workforceRates: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
  // A clipboard, not people and not a calendar: the personalliste is the DOCUMENT an inspector asks
  // for, and the two workforce icons already in this group are a calendar and a group of people.
  workforcePersonnelList: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h6m-6 4h4" /></svg>',
  // An envelope with a warning mark: the notification that did not arrive.
  workforceDelivery: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>',
  // A speech bubble with a tick, and deliberately none of the four glyphs already in this group. The
  // envelope beside it is what WE sent; this page is what came BACK from a person, so it is drawn as
  // a reply rather than as another piece of outbound post. Not the shield-with-tick either — that is
  // already `onboarding`, and at sidebar size two ticked outlines would be one icon.
  workforcePublications: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 11l2 2 4-4M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>',
  training: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg>',
  // A stamped document, deliberately NOT the graduation cap beside it: the cap is the teaching, this
  // is the record the teaching left behind. The seal reads as "signed off", which is what the hash
  // linkage and the audit chain on that page are for.
  trainingEvidence: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h4M9 8h6M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" /><circle cx="15" cy="16" r="2.5" stroke-width="2" /></svg>',
  // A document with a clock on it — deliberately BOTH marks, because the two neighbours it must not
  // be mistaken for each carry one of them alone: `workforceRates` is a bare clock (what an hour is
  // worth) and `trainingEvidence` is a bare document. A timesheet is the sheet AND the hours.
  workforceTimesheets: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 4H7a2 2 0 00-2 2v13a2 2 0 002 2h10a2 2 0 002-2v-5M9 8h5M9 12h3" /><circle cx="17" cy="7" r="4" stroke-width="2" /><path stroke-linecap="round" stroke-width="2" d="M17 5.5V7l1 1" /></svg>',
  // Two toggle switches, not the settings cog: `posSettings` is already a cog in the PowerUser group,
  // and this page is not configuration — it is the row of kill switches somebody reaches for during
  // an incident. It sat last in the single modules group while there was one; now that the modules
  // are six groups it sits last in Operations, immediately ABOVE all six, because it governs them.
  featureFlags: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="2" y="4" width="20" height="7" rx="3.5" stroke-width="2" /><circle cx="17" cy="7.5" r="2" fill="currentColor" stroke="none" /><rect x="2" y="13" width="20" height="7" rx="3.5" stroke-width="2" /><circle cx="7" cy="16.5" r="2" fill="currentColor" stroke="none" /></svg>',
  // A speech bubble carrying a spark. The bubble alone is `ongoing`'s neighbour in tone and would
  // read as messages or support chat; the spark is what says this one answers and proposes. Not a
  // robot head and not a wand: the page's whole claim is that nothing it proposes happens until a
  // person approves it, and a magic glyph promises the opposite.
  assistant: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a8 8 0 01-8 8H7l-4 3V12a8 8 0 018-8h2a8 8 0 018 8z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8.5l1 2.5 2.5 1-2.5 1-1 2.5-1-2.5L8.5 12l2.5-1z" /></svg>'
};

export default {
  components: {
    LanguageSwitcher
  },
  props: {
    collapsed: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      drawerOpen: false,
      onboardingInProgress: false,
      dropdownOpen: false,
      showLogoutConfirm: false
    };
  },

  computed: {
    isKeyAccountManager () {
      return this.$store.state.currentUser?.isKeyAccountManager;
    },
    isPowerUser () {
      return this.$store.state.currentUser?.isPowerUser;
    },
    user () {
      return this.$store.state.currentUser || {};
    },
    adminStores () {
      return this.$store.state.currentUser?.adminIn || [];
    },
    // Three-state, never a boolean: `unknown` must not read as `no access`. See nav-access.js.
    storeAdminAccess () {
      return storeAdminAccess(this.$store.state.currentUser);
    },
    // True for a store admin AND while the answer is still unknown, so the async `Reload()` in
    // `AdminPage.initAuth` can never blank and refill an admin's sidebar.
    showsStoreAdminNav () {
      return showsStoreAdminNav(this.storeAdminAccess);
    },
    navGroups () {
      const groups = [];

      // Every group in this block reads or writes a STORE's data, and `AdminPage` bounces a caller
      // with no store-admin membership off every one of those pages. Offering them to someone we
      // know has no membership is offering a menu of dead ends, so they are withheld — but only on
      // a positive `worker`, never on `unknown`.
      if (this.showsStoreAdminNav) {
        groups.push(
          {
            title: this.$i('nav_group_operations'),
            items: [
              { label: this.$i('nav_dashboard'), path: '/admin', icon: icons.dashboard },
              { label: this.$i('nav_ongoing'), path: '/admin/ongoing', icon: icons.ongoing },
              { label: this.$i('nav_history'), path: '/admin/orders', icon: icons.orders },
              { label: this.$i('nav_statistics'), path: '/admin/statistics', icon: icons.statistics },
              // Ask Okam. Filed in Operations rather than given a module group of its own, because
              // it is not a module: it reads ACROSS all six and the POS, and its inbox approves
              // changes that land in whichever module the proposal names. A group whose one link
              // belongs to every other group is a heading that earns nothing. It sits directly
              // after Statistics because that is the screen it answers questions about, and because
              // the AI box on that page now hands its question to this one.
              { label: this.$i('nav_assistant'), path: '/admin/assistant', icon: icons.assistant, isNew: true },
              // The switchboard, and the one link in this file that is NOT a module. It was last in
              // the single modules group while there was one; it is here now for the reason it was
              // last there — it governs every module link, so it cannot be filed inside any one of
              // them without reading as that module's own setting. It is not a seventh module group
              // either: a group whose heading and whose only row say the same word is a heading that
              // earns nothing. Operations is where it belongs on its own merits — each module gates
              // its writes on deny-closed per-store flags, and this is the row of switches somebody
              // reaches for during an incident, next to the four screens they are already watching.
              // Placed LAST in this group so it sits immediately above the six groups it governs,
              // and it keeps its NYHET badge like every module link below it. Store-admin gated like
              // its siblings — the API answers 403 to anyone else and the page says so.
              { label: this.$i('nav_feature_flags'), path: '/admin/feature-flags', icon: icons.featureFlags, isNew: true }
            ]
          },
          // ── THE SIX RESTAURANT MODULES, ONE GROUP EACH ────────────────────────────────────────
          //
          // HISTORY, in two rulings, because the second only makes sense against the first, and the
          // first is why these links are not back under Menu and Sales today:
          //
          //   1. They were once spread across Menu (recipes), Sales (newsletter, events) and
          //      Administration (the workforce links plus company agreements). That filing was
          //      correct by subject matter and useless for finding anything, so by the owner's
          //      instruction they were pulled into ONE group titled `nav_group_modules` ("Moduler"):
          //      they are the newest surfaces and the ones under active acceptance, and being
          //      locatable beat being filed.
          //   2. The owner reversed the single group once it had grown to 22 links, in his words
          //      "there is a massive amount of new things — can you actually separate them and group
          //      them based on the different functionality and module they are part of". One list of
          //      22 is the same unscannable wall as five scattered ones, arrived at from the other
          //      side. Ruling 1 is not undone by this — the links stay out of Menu and Sales, and
          //      stay together as the newest surfaces; only the single heading is replaced by six.
          //
          // ORDERED BY HOW FINISHED EACH MODULE IS, best first — Margin, Workforce, Training, Events,
          // Growth, Meals — because that is the order an owner verifying the product should meet them
          // in, and Meals is the one that cannot yet be walked end to end.
          //
          // SIX TOP-LEVEL GROUPS RATHER THAN A NESTED LEVEL. The template renders a group as a title
          // and a flat list of links and has no concept of a sub-heading; introducing one would mean
          // a new template branch and new CSS for a shape nothing else in this sidebar needs. Six
          // groups is the SAME rendering with more data, so the whole of this change is data.
          //
          // NOTHING HERE CHANGES WHO IS ADMITTED. All 22 links are inside the same
          // `showsStoreAdminNav` branch they were already inside, and not one entered or left it.
          // Splitting one array into six moves rows on a screen and nothing else; every page still
          // renders its own capability refusal when the backend withholds a grant.
          //
          // `isNew` IS KEPT ON EVERY LINK, per the owner: the NYHET badge is how he knows what is
          // new. It stays on the link rather than moving to the heading — a badge on a heading goes
          // stale the moment one link in that group stops being new, and it would stop telling him
          // anything about the other links beside it.
          {
            title: this.$i('nav_group_module_margin'),
            items: [
              { label: this.$i('nav_margin_recipes'), path: '/admin/margin-recipes', icon: icons.marginRecipes, isNew: true },
              // The two surfaces that make the recipe page's plate cost possible at all: a plate
              // cost is only ever built from supplier price data, and these are the only screens
              // that can create any. Adjacent to the recipes link, in that order, because that is
              // the order the backend requires — ingredient, supplier, article, price, cost.
              { label: this.$i('nav_margin_suppliers'), path: '/admin/margin-suppliers', icon: icons.marginSuppliers, isNew: true },
              { label: this.$i('nav_margin_price_imports'), path: '/admin/margin-price-imports', icon: icons.marginPriceImports, isNew: true },
              { label: this.$i('nav_margin_statements'), path: '/admin/margin-statements', icon: icons.marginStatements, isNew: true }
            ]
          },
          {
            title: this.$i('nav_group_module_workforce'),
            items: [
              { label: this.$i('nav_workforce_schedule'), path: '/admin/workforce-schedule', icon: icons.workforceSchedule, isNew: true },
              // Next to the schedule, not inside it. The inbox decides on a different aggregate under
              // a different precondition, and its requests are not week-scoped — an October request is
              // decided in July. It is store-admin gated like every sibling; the page still refuses
              // itself when the backend withholds WorkforceManager.
              { label: this.$i('nav_workforce_requests'), path: '/admin/workforce-requests', icon: icons.workforceRequests, isNew: true },
              { label: this.$i('nav_workforce_roster'), path: '/admin/workforce-roster', icon: icons.workforceRoster, isNew: true },
              // Between the roster and the rates, because that is the order the three are actually
              // used in: who works here, what stations the place runs, what an hour on one costs.
              // It is its own entry rather than a section of the roster for the reason the roster's
              // own client records — a roster that created a role because somebody typed a name
              // would make the catalogue unownable — and until this link existed the write behind it
              // (`PUT /roles`, live on the wire since W1) had no caller in any browser at all, so a
              // store nobody had curled had an empty role axis on all three pages around it.
              { label: this.$i('nav_workforce_roles'), path: '/admin/workforce-roles', icon: icons.workforceRoles, isNew: true },
              { label: this.$i('nav_workforce_rates'), path: '/admin/workforce-rates', icon: icons.workforceRates, isNew: true },
              { label: this.$i('nav_workforce_personnel_list'), path: '/admin/workforce-personnel-list', icon: icons.workforcePersonnelList, isNew: true },
              // The delivery report. Its own entry rather than a tab inside the schedule, because
              // the outbox is STORE-scoped and outlives the week that filled it: a dead letter from
              // last Tuesday's publication is still undelivered while the manager is planning next
              // month, and a week-scoped surface would show it only to somebody who happened to
              // navigate back to that week. Store-admin gated like every sibling; the page renders
              // its own refusal when the backend withholds WorkforceManager.
              { label: this.$i('nav_workforce_delivery'), path: '/admin/workforce-delivery', icon: icons.workforceDelivery, isNew: true },
              // The publication receipts. Its own entry rather than a section inside the delivery
              // report, because the two answer opposite questions: delivery lists what the OUTBOX
              // could not get out, this lists what came BACK from the people it did reach. A store
              // with an empty delivery report and nobody having confirmed anything is the case that
              // makes them different, and folding one into the other would hide exactly that store.
              // Store-admin gated like every sibling; the page renders its own refusal for the
              // schedule grant, and a second one for the recipient roster, which the backend gates
              // on WorkforceManager separately.
              { label: this.$i('nav_workforce_publications'), path: '/admin/workforce-publications', icon: icons.workforcePublications, isNew: true },
              // The payroll batch. Its own entry rather than a section on the rates page, even
              // though both are `WorkforcePayrollApprover`: rates state what an hour is WORTH going
              // forward and are an append-only timeline, while this freezes what was WORKED in a
              // closed period and sends it. The two are read at different moments by the same person
              // — a rate is set when somebody is hired, a period is approved every fortnight — and
              // folding one into the other would bury the recurring act inside the rare one. Last of
              // the Workforce links because it is the end of that module's sequence: everything above
              // it produces the hours this one accounts for. Store-admin gated like every sibling;
              // the page renders its own refusal when the backend withholds the payroll grant, which
              // it does for the WHOLE surface — a timesheet line is the wage record and there is
              // nothing left to partially withhold.
              { label: this.$i('nav_workforce_timesheets'), path: '/admin/workforce-timesheets', icon: icons.workforceTimesheets, isNew: true }
            ]
          },
          {
            title: this.$i('nav_group_module_training'),
            items: [
              { label: this.$i('nav_training_courses'), path: '/admin/training-courses', icon: icons.training, isNew: true },
              // The OTHER half of Training, and the only reason the half above it is worth filing:
              // the courses page is where a venue works, this is where one named person's record is
              // read out — by somebody from outside the venue. Same store-admin gate as its sibling
              // (`RequireStoreAdminAsync` on the evidence read), so the audience the sidebar offers it
              // to is the audience the API admits. Immediately after the courses link because it is
              // the end of that page's sequence, not a separate subject.
              { label: this.$i('nav_training_evidence'), path: '/admin/training-evidence', icon: icons.trainingEvidence, isNew: true }
            ]
          },
          // One link, and still a heading of its own rather than a lodger in the group above or
          // below it. A module with one surface is a fact about the module, not a reason to hide
          // which module the surface belongs to — and the heading is what stops `/admin/events-
          // pipeline` reading as a Training page or a Growth one, which is the whole point of this
          // split.
          {
            title: this.$i('nav_group_module_events'),
            items: [
              { label: this.$i('nav_events'), path: '/admin/events-pipeline', icon: icons.eventsPipeline, isNew: true }
            ]
          },
          {
            title: this.$i('nav_group_module_growth'),
            items: [
              { label: this.$i('nav_growth_newsletter'), path: '/admin/growth-newsletter', icon: icons.growthNewsletter, isNew: true },
              // Immediately after the newsletter link, because it is the same module's other half and
              // the one with a statutory clock on it. The guest is already told on screen that this
              // venue answers a privacy request within a month (`gr_guest_request_deadline`); until
              // this entry existed the two routes that let anybody answer had no caller at all, so the
              // promise was made on a surface and kept on none. Same store-admin gate as its siblings
              // — the API answers an opaque 404 to anyone else and the page says so, rather than the
              // link being hidden, which would leave the page reachable only by typing a URL.
              { label: this.$i('nav_growth_privacy'), path: '/admin/growth-privacy', icon: icons.growthPrivacy, isNew: true }
            ]
          },
          {
            title: this.$i('nav_group_module_meals'),
            items: [
              { label: this.$i('nav_meals'), path: '/admin/meals-agreements', icon: icons.mealsAgreements, isNew: true },
              // Beside the venue's Meals page rather than in a group of its own: same module, and
              // the two are read together (what this venue has, and setting the next one up). Same
              // store-admin gate as every other link here — the concierge and company-admin
              // authorities the page's own controls need are resolved by the backend and refused on
              // screen, never by hiding the link, which would leave the pages that DO admit somebody
              // reachable only by typing a URL.
              { label: this.$i('nav_meals_companies'), path: '/admin/meals-companies', icon: icons.mealsCompanies, isNew: true },
              // Third of the Meals links and the one that WRITES a bookkeeping document. Same
              // store-admin gate as the two above it, and this time the gate matches the route: draft
              // and finalize are `RequireStoreAdminAsync`, so the person offered this link is exactly
              // the person the API admits. It is last of the three because it is the end of the
              // month's sequence — agreement, people, then the bill.
              { label: this.$i('nav_meals_statements'), path: '/admin/meals-statements', icon: icons.mealsStatements, isNew: true }
            ]
          },
          {
            title: this.$i('nav_group_menu'),
            items: [
              { label: this.$i('nav_products'), path: '/admin/products', icon: icons.products },
              { label: this.$i('nav_categories'), path: '/admin/categories', icon: icons.categories },
              { label: this.$i('nav_allergens'), path: '/admin/allergens', icon: icons.allergens },
              { label: this.$i('nav_import'), path: '/admin/import', icon: icons.import }
            ]
          },
          {
            title: this.$i('nav_group_delivery'),
            items: [
              { label: this.$i('nav_delivery'), path: '/admin/delivery', icon: icons.delivery },
              { label: this.$i('nav_wolt'), path: '/admin/wolt', icon: icons.wolt }
            ]
          },
          {
            title: this.$i('nav_group_sales'),
            items: [
              { label: this.$i('nav_send_invoice'), path: '/admin/kravia-invoice', icon: icons.invoice, isNew: true },
              { label: this.$i('nav_rewards'), path: '/admin/rewards', icon: icons.rewards },
              { label: this.$i('nav_discounts'), path: '/admin/discounts', icon: icons.discounts }
            ]
          },
          {
            title: this.$i('nav_group_economy'),
            items: [
              { label: this.$i('nav_payment'), path: '/admin/payment', icon: icons.payment },
              { label: this.$i('nav_settlements'), path: '/admin/settlements', icon: icons.settlements },
              { label: this.$i('nav_terminals'), path: '/admin/terminals', icon: icons.terminals }
            ]
          },
          {
            title: this.$i('nav_group_administration'),
            items: [
              { label: this.$i('nav_customers'), path: '/admin/customers', icon: icons.customers },
              { label: this.$i('nav_employees'), path: '/admin/employees', icon: icons.employees }
            ]
          }
        );

        // Still appended to the Administration group — the last of the six above, which is why this
        // block stays INSIDE the same branch. Outside it, `groups[groups.length - 1]` would be the
        // worker group (or nothing at all) and onboarding would land in the wrong place.
        if (this.onboardingInProgress) {
          groups[groups.length - 1].items.push({
            label: this.$i('nav_onboarding'),
            path: '/admin/onboarding',
            icon: icons.onboarding
          });
        }
      }

      // The worker's own page. Every group above is store-admin work; this one is about the signed-in
      // person, so it is not gated on PowerUser (where the lane that built the page had parked it) —
      // a shop assistant is never a PowerUser, and gating it there left the page's actual reader with
      // no way in. It is also the ONE group not gated on store-admin membership, which is what makes
      // a pure worker's sidebar a menu of one working link instead of forty dead ones.
      groups.push({
        title: this.$i('nav_group_me'),
        items: [
          { label: this.$i('nav_workforce_me'), path: '/admin/workforce-me', icon: icons.workforceMe, isNew: true },
          // The account's own address, and the confirmation of it. IN THIS GROUP because it is about
          // the signed-in person and takes no store id — the page sets `allow-non-admin` for the same
          // reason its neighbour does, so a link here is never a dead end for a worker.
          //
          // WHY IT HAD TO EXIST. The newsletter test-send now requires the acting administrator's own
          // account address AND requires it CONFIRMED (markedsføringsloven § 15,
          // `RequireOwnAccountAddressAsync`). Confirming is a live product path — but until this entry
          // the only UI call site for either confirmation route in the entire estate was the consumer
          // app, so an administrator who signed up by phone could be refused a test-send by an admin
          // screen and had nowhere in admin to go about it. A capability exists only when it is
          // reachable (C3), and a page nothing links to is the defect this link closes.
          { label: this.$i('nav_account_email'), path: '/admin/account-email', icon: icons.accountEmail, isNew: true }
        ]
      });

      if (this.isKeyAccountManager || this.isPowerUser) {
        groups.push({
          title: this.$i('nav_group_kam'),
          role: true,
          items: [
            { label: this.$i('nav_offers'), path: '/admin/offers', icon: icons.offers },
            { label: this.$i('nav_overview'), path: '/admin/overview', icon: icons.overview },
            { label: this.$i('nav_onboarding'), path: '/admin/onboarding', icon: icons.onboarding }
          ]
        });
      }

      if (this.isPowerUser) {
        groups.push({
          title: this.$i('nav_group_poweruser'),
          role: true,
          items: [
            { label: this.$i('nav_pos'), path: '/admin/pos', icon: icons.pos },
            { label: this.$i('nav_kitchen'), path: '/admin/kitchen', icon: icons.kitchen },
            { label: this.$i('nav_tables'), path: '/admin/tables', icon: icons.tables },
            { label: this.$i('nav_reservations'), path: '/admin/reservations', icon: icons.reservations },
            { label: this.$i('nav_pos_settings'), path: '/admin/pos-settings', icon: icons.posSettings },
            { label: this.$i('nav_pos_reports'), path: '/admin/pos-reports', icon: icons.posReports },
            { label: this.$i('nav_okam_growth'), path: '/admin/poweruser-growth', icon: icons.growth },
            { label: this.$i('nav_dintero'), path: '/admin/dintero', icon: icons.dintero },
            { label: this.$i('nav_surfboard'), path: '/admin/surfboard', icon: icons.surfboard },
            { label: this.$i('nav_tripletex'), path: '/admin/tripletex', icon: icons.invoice },
            { label: this.$i('nav_wolt_drive_invoice'), path: '/admin/wolt-drive-invoice', icon: icons.invoice },
            { label: this.$i('nav_goods'), path: '/admin/goods', icon: icons.goods },
            { label: this.$i('nav_kam_administration'), path: '/admin/kam', icon: icons.kam }
          ]
        });
      }

      return groups;
    },
    selectedStore: {
      get () {
        // Always ensure a store is selected, default to first if none selected
        const currentSelected = this.$store.state.selectedAdminStore;
        if (!currentSelected && this.adminStores.length > 0) {
          return this.adminStores[0].id;
        }
        return currentSelected;
      },
      set (value) {
        this.$store.dispatch('SetSelectedAdminStore', value);
      }
    },
    currentStoreName () {
      const store = this.adminStores.find(s => s.id === this.selectedStore);

      if (store && store.name) {
        return store.name;
      }

      return this.adminStores.length > 0 ? this.adminStores[0].name : '';
    }
  },

  watch: {
    '$route.query': {
      handler (newQuery) {
        this.applyQueryStore(newQuery);
      },
      immediate: true
    },
    '$route.path' () {
      this.drawerOpen = false;
    },
    adminStores: {
      immediate: true,
      handler (stores) {
        const queryStoreId = this.getQueryStoreId();
        const hasStores = stores.length > 0;
        // A PowerUser may legitimately work with a store outside their own adminIn list, so the
        // query's store is trusted as-is instead of being force-switched to adminStores[0]
        // (which would yank the selection — and any page keyed to it — after every auth reload).
        const queryStoreExists = queryStoreId && (this.isPowerUser || stores.some(store => store.id === queryStoreId));

        if (queryStoreExists) {
          if (this.$store.state.selectedAdminStore !== queryStoreId) {
            this.$nextTick(() => {
              this.$store.dispatch('SetSelectedAdminStore', queryStoreId);
            });
          }
          this.updateQueryStore(queryStoreId);
          return;
        }

        if (queryStoreId && hasStores) {
          const fallbackStoreId = stores[0].id;
          this.$nextTick(() => {
            this.$store.dispatch('SetSelectedAdminStore', fallbackStoreId);
            this.updateQueryStore(fallbackStoreId);
          });
          return;
        }

        // Ensure a store is always selected when stores are loaded
        if (hasStores && !this.$store.state.selectedAdminStore) {
          this.$nextTick(() => {
            this.$store.dispatch('SetSelectedAdminStore', stores[0].id);
            this.updateQueryStore(stores[0].id);
          });
        }
      }
    }
  },

  mounted () {
    this.onboardingInProgress = localStorage.getItem('onboardingInProgress');

    this.applyQueryStore(this.$route.query);
    this.syncQueryStoreIfMissing();

    // Ensure a store is selected on mount
    if (this.adminStores.length > 0 && !this.$store.state.selectedAdminStore) {
      this.$store.dispatch('SetSelectedAdminStore', this.adminStores[0].id);
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', this.handleClickOutside);
  },

  beforeDestroy () {
    document.removeEventListener('click', this.handleClickOutside);
  },

  methods: {
    navHref (path) {
      const storeId = this.selectedStore;
      return storeId ? `${path}?storeId=${storeId}` : path;
    },

    isActive (path) {
      const current = (this.$route.path || '').replace(/\/+$/, '') || '/';
      const target = path.replace(/\/+$/, '');
      if (target === '/admin') {
        return current === '/admin' || current.endsWith('/admin');
      }
      return current === target || current.endsWith(target);
    },

    closeDrawer () {
      this.drawerOpen = false;
    },

    // Clearing the session is the whole of this action. WHERE a signed-out operator lands is
    // `AdminPage`'s to decide — it watches `userIsLoggedIn` and puts the sign-in in front of them.
    //
    // This was `window.location.href = '/'`: a full reload out of the SPA onto the CONSUMER
    // storefront, a customer landing page that offers no route back to `/admin`. `Logout()` itself
    // dispatches `ClearState`, and the store subscriber in `plugins/global-mixin` writes that to
    // localStorage on the same tick, so the reload was carrying no part of the teardown.
    logout () {
      this.showLogoutConfirm = false;
      this._userService.Logout();
    },

    getQueryStoreId (query = this.$route.query) {
      if (!query || typeof query !== 'object') {
        return null;
      }

      const directKeys = ['storeId', 'storeid', 'store', 'storeID'];
      for (const key of directKeys) {
        const rawValue = query[key];
        const parsed = this.parseStoreId(rawValue);
        if (parsed) {
          return parsed;
        }
      }

      for (const [key, value] of Object.entries(query)) {
        const normalized = key.toLowerCase();
        if (normalized === 'storeid' || normalized === 'store') {
          const parsed = this.parseStoreId(value);
          if (parsed) {
            return parsed;
          }
        }
      }

      return null;
    },

    parseStoreId (value) {
      if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        if (!Number.isNaN(parsed) && parsed > 0) {
          return parsed;
        }
      }
      if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
        return value;
      }
      return null;
    },

    applyQueryStore (query) {
      const queryStoreId = this.getQueryStoreId(query);
      if (!queryStoreId) {
        return;
      }

      if (this.$store.state.selectedAdminStore !== queryStoreId) {
        this.$store.dispatch('SetSelectedAdminStore', queryStoreId);
      }
    },

    updateQueryStore (storeId) {
      if (!storeId) {
        return;
      }

      const nextQuery = {
        ...this.$route.query,
        storeId
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

    syncQueryStoreIfMissing () {
      const existingStoreId = this.getQueryStoreId(this.$route.query);
      if (existingStoreId) {
        return;
      }

      const selectedStoreId = this.$store.state.selectedAdminStore;
      if (selectedStoreId) {
        this.updateQueryStore(selectedStoreId);
      }
    },

    toggleDropdown () {
      this.dropdownOpen = !this.dropdownOpen;
    },
    selectStore (storeId) {
      const parsedStoreId = this.parseStoreId(storeId);
      if (!parsedStoreId) {
        return;
      }

      if (String(this.$store.state.selectedAdminStore) === String(parsedStoreId)) {
        this.dropdownOpen = false;
        return;
      }

      this.$store.dispatch('SetSelectedAdminStore', parsedStoreId);
      this.dropdownOpen = false;

      if (typeof window !== 'undefined') {
        window.location.assign(this.buildStoreUrl(parsedStoreId));
      } else {
        this.updateQueryStore(parsedStoreId);
      }
    },
    buildStoreUrl (storeId) {
      // Use includes() so the check also matches the locale-prefixed (/en/...)
      // and trailing-slash ("/admin/category-editor/") variants of the path.
      const isExistingCategoryEditor =
        this.$route.path.includes('/admin/category-editor') &&
        this.$route.query?.id &&
        this.$route.query.id !== 'new';

      const nextQuery = isExistingCategoryEditor
        ? { storeId }
        : {
          ...this.$route.query,
          storeId
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
      const hash = this.$route.hash || '';
      const path = isExistingCategoryEditor ? '/admin/categories' : this.$route.path;

      return `${path}${queryString ? `?${queryString}` : ''}${hash}`;
    },
    handleClickOutside (event) {
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

.admin-nav__lang {
  margin-bottom: 8px;
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
