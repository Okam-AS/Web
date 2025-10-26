<template>
  <AdminPage>
    <div class="wolt-menu">
      <h1 class="wolt-menu__title">Wolt Meny</h1>
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

        <!-- Compact Restaurant Status Header -->
        <div
          v-if="selectedStore > 0 && venueStatus"
          class="status-header"
        >
          <div class="status-header__main">
            <div class="status-header__online">
              <label class="status-toggle">
                <input
                  :checked="venueStatus.online"
                  type="checkbox"
                  class="status-toggle__input"
                  @change="toggleVenueOnline($event.target.checked)"
                >
                <span class="status-toggle__slider" />
              </label>
              <div class="status-header__info">
                <span
                  :class="['status-badge', venueStatus.online ? 'status-badge--online' : 'status-badge--offline']"
                >
                  {{ venueStatus.online ? 'ONLINE' : 'OFFLINE' }}
                </span>
                <span class="status-header__text">
                  {{ venueStatus.online ? 'Åpen på Wolt' : 'Stengt på Wolt' }}
                </span>
              </div>
            </div>

            <div class="status-header__divider" />

            <div class="status-header__meta">
              <button
                class="status-header__details-btn"
                @click="showOpeningHoursModal = true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Åpningstider
              </button>

              <span
                v-if="deliveryProvider"
                class="status-header__provider"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <rect x="1" y="3" width="15" height="13" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
                {{ deliveryProvider.current_provider || 'Ingen partner' }}
              </span>
            </div>
          </div>
        </div>


        <div
          v-if="selectedStore > 0"
          class="wolt-menu__items"
        >
          <div
            v-if="menuData"
            class="wolt-menu__data"
          >
            <div
              v-if="menuData.status && menuData.status !== 'READY'"
              class="wolt-menu__status-warning"
            >
              <div class="status-warning__content">
                <div>
                  <p><strong>Meny status:</strong> {{ menuData.status }}</p>
                  <p v-if="menuData.status === 'PENDING'">
                    Menyen behandles av Wolt. Dette kan ta flere minutter.
                  </p>
                  <p v-if="menuData.status === 'PENDING'" class="status-warning__note">
                    💡 Tips: Vent minst 2-3 minutter mellom hver oppdatering på grunn av Wolts rate limits.
                  </p>
                </div>
              </div>
              <button
                v-if="menuData.status === 'PENDING'"
                class="status-warning__button"
                :disabled="isLoading"
                @click="importMenuFromWolt"
              >
                <svg
                  v-if="!isLoading"
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                <span v-if="isLoading">Oppdaterer...</span>
                <span v-else>Oppdater status</span>
              </button>
            </div>

            <div
              v-if="menuData.categories && menuData.categories.length > 0 && menuData.status !== 'ERROR'"
              class="wolt-menu__formatted"
            >
              <!-- Edit Mode Toggle and Save -->
              <div class="menu-actions">
                <div
                  v-if="isEditMode && hasUnsavedChanges"
                  class="unsaved-changes-banner"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                    />
                    <line
                      x1="12"
                      y1="8"
                      x2="12"
                      y2="12"
                    />
                    <line
                      x1="12"
                      y1="16"
                      x2="12.01"
                      y2="16"
                    />
                  </svg>
                  Du har ulagrede endringer
                </div>
                <div class="menu-actions__buttons">
                  <button
                    v-if="!isEditMode"
                    class="menu-action-button menu-action-button--sync"
                    :disabled="isSyncing"
                    @click="syncWithWolt"
                  >
                    <svg
                      v-if="!isSyncing"
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <polyline points="23 4 23 10 17 10" />
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                    </svg>
                    <span v-if="isSyncing">Synkroniserer...</span>
                    <span v-else>Synkroniser med Wolt</span>
                  </button>
                  <button
                    v-if="!isEditMode"
                    class="menu-action-button menu-action-button--edit"
                    @click="enterEditMode"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Rediger meny
                  </button>
                  <template v-else>
                    <button
                      class="menu-action-button menu-action-button--cancel"
                      @click="cancelEdit"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <line
                          x1="18"
                          y1="6"
                          x2="6"
                          y2="18"
                        />
                        <line
                          x1="6"
                          y1="6"
                          x2="18"
                          y2="18"
                        />
                      </svg>
                      Avbryt
                    </button>
                    <button
                      class="menu-action-button menu-action-button--save"
                      :disabled="!hasUnsavedChanges || isSaving"
                      @click="saveChanges"
                    >
                      <svg
                        v-if="!isSaving"
                        xmlns="http://www.w3.org/2000/svg"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span v-if="isSaving">Lagrer...</span>
                      <span v-else>Lagre endringer</span>
                    </button>
                  </template>
                </div>
              </div>

              <!-- Compact Menu Info (Collapsible) -->
              <details class="menu-info-collapsible">
                <summary class="menu-info-collapsible__summary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  <span>{{ getTotalItemCount() }} produkter i {{ menuData.categories.length }} kategorier</span>
                </summary>
                <div class="menu-info-collapsible__content">
                  <div class="menu-info-collapsible__item">
                    <span class="menu-info-collapsible__label">Valuta:</span>
                    <span class="menu-info-collapsible__value">{{ menuData.currency || 'N/A' }}</span>
                  </div>
                  <div class="menu-info-collapsible__item">
                    <span class="menu-info-collapsible__label">Primærspråk:</span>
                    <span class="menu-info-collapsible__value">{{ menuData.primaryLanguage || 'N/A' }}</span>
                  </div>
                </div>
              </details>

              <!-- Categories (Collapsible) -->
              <details
                v-for="category in menuData.categories"
                :key="category.id"
                class="menu-category"
                open
              >
                <summary class="menu-category__header">
                  <svg
                    class="menu-category__chevron"
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                  <div class="menu-category__header-content">
                    <h2 class="menu-category__title">
                      {{ parseAndGetLocalizedValue(category.nameJson) }}
                    </h2>
                    <span class="menu-category__count">
                      {{ category.items ? category.items.length : 0 }} produkter
                    </span>
                  </div>
                </summary>
                <p
                  v-if="category.descriptionJson"
                  class="menu-category__description"
                >
                  {{ parseAndGetLocalizedValue(category.descriptionJson) }}
                </p>

                <!-- Items in Category -->
                <div class="menu-items">
                  <div
                    v-for="item in category.items"
                    :key="item.id"
                    class="menu-item"
                  >
                    <div class="menu-item__content">
                      <div class="menu-item__header">
                        <h3 class="menu-item__name">
                          {{ parseAndGetLocalizedValue(item.nameJson) }}
                        </h3>
                        <div
                          v-if="isEditMode"
                          class="menu-item__price-edit"
                        >
                          <input
                            :value="formatPriceForInput(item.price)"
                            type="number"
                            step="0.01"
                            min="0"
                            class="menu-item__price-input"
                            @blur="updateItemPrice(item, $event.target.value)"
                          >
                          <span class="menu-item__price-currency">kr</span>
                        </div>
                        <div
                          v-else
                          class="menu-item__price"
                        >
                          {{ formatPrice(item.price) }}
                        </div>
                      </div>
                      <p
                        v-if="item.descriptionJson"
                        class="menu-item__description"
                      >
                        {{ parseAndGetLocalizedValue(item.descriptionJson) }}
                      </p>
                      <div class="menu-item__meta">
                        <div
                          v-if="isEditMode"
                          class="menu-item__toggle-wrapper"
                        >
                          <label class="menu-item__toggle-label">
                            <input
                              :checked="item.enabled"
                              type="checkbox"
                              class="menu-item__toggle-input"
                              @change="toggleItemEnabled(item, $event.target.checked)"
                            >
                            <span class="menu-item__toggle-slider" />
                          </label>
                          <span class="menu-item__toggle-text">
                            {{ item.enabled ? 'Aktiv' : 'Deaktivert' }}
                          </span>
                        </div>
                        <span
                          v-else
                          class="menu-item__badge"
                          :class="item.enabled ? 'menu-item__badge--enabled' : 'menu-item__badge--disabled'"
                        >
                          {{ item.enabled ? 'Aktiv' : 'Deaktivert' }}
                        </span>
                        <div
                          v-if="isEditMode"
                          class="menu-item__toggle-wrapper"
                        >
                          <label class="menu-item__toggle-label">
                            <input
                              :checked="item.inStock"
                              type="checkbox"
                              class="menu-item__toggle-input"
                              @change="toggleItemInStock(item, $event.target.checked)"
                            >
                            <span class="menu-item__toggle-slider" />
                          </label>
                          <span class="menu-item__toggle-text">
                            {{ item.inStock ? 'På lager' : 'Utsolgt' }}
                          </span>
                        </div>
                        <span
                          v-else
                          class="menu-item__badge"
                          :class="item.inStock ? 'menu-item__badge--enabled' : 'menu-item__badge--disabled'"
                        >
                          {{ item.inStock ? 'På lager' : 'Utsolgt' }}
                        </span>
                        <span class="menu-item__meta-item">
                          MVA: {{ item.salesTaxPercentage }}%
                        </span>
                        <span
                          v-if="item.externalData"
                          class="menu-item__meta-item menu-item__meta-item--muted"
                        >
                          ID: {{ item.externalData }}
                        </span>
                      </div>

                      <!-- Options for this item -->
                      <div
                        v-if="item.options && item.options.length > 0"
                        class="menu-item__options"
                      >
                        <h4 class="menu-item__options-title">Tilvalg:</h4>
                        <div
                          v-for="option in item.options"
                          :key="option.id"
                          class="menu-option"
                        >
                          <div class="menu-option__content">
                            <div class="menu-option__header">
                              <span class="menu-option__name">
                                {{ parseAndGetLocalizedValue(option.nameJson) }}
                              </span>
                              <span class="menu-option__type">
                                ({{ option.type === 'MultiChoice' ? 'Flervalg' : 'Enkeltvalg' }})
                              </span>
                            </div>
                            <div
                              v-if="option.selectionRangeMin !== null && option.selectionRangeMax !== null"
                              class="menu-option__range"
                            >
                              Velg {{ option.selectionRangeMin }}-{{ option.selectionRangeMax }}
                            </div>
                            <!-- Option values -->
                            <div class="menu-option__values">
                              <div
                                v-for="value in option.values"
                                :key="value.id"
                                class="menu-option__value"
                              >
                                <div class="menu-option__value-info">
                                  <span class="menu-option__value-name">
                                    {{ parseAndGetLocalizedValue(value.nameJson) }}
                                  </span>
                                  <span class="menu-option__value-price">
                                    +{{ formatPrice(value.price) }}
                                  </span>
                                </div>
                                <div
                                  v-if="isEditMode"
                                  class="menu-option__value-toggle"
                                >
                                  <label class="menu-option__toggle-label">
                                    <input
                                      :checked="value.enabled"
                                      type="checkbox"
                                      class="menu-option__toggle-input"
                                      @change="toggleOptionEnabled(value, $event.target.checked)"
                                    >
                                    <span class="menu-option__toggle-slider" />
                                  </label>
                                </div>
                                <span
                                  v-else
                                  class="menu-option__value-badge"
                                  :class="value.enabled ? 'menu-option__value-badge--enabled' : 'menu-option__value-badge--disabled'"
                                >
                                  {{ value.enabled ? 'Aktiv' : 'Deaktivert' }}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-if="!category.items || category.items.length === 0"
                  class="menu-category__empty"
                >
                  Ingen produkter i denne kategorien
                </div>
              </details>
            </div>

          </div>
          <div
            v-if="!menuData || menuData.status === 'ERROR' || !menuData.categories || menuData.categories.length === 0"
            class="wolt-menu__no-data"
          >
            <p v-if="menuData && menuData.status === 'ERROR'">
              Menyen er i feilstatus. Slett menyen fra databasen eller opprett en ny meny.
            </p>
            <p v-else>
              Ingen meny funnet for denne butikken.
            </p>
            <button
              v-if="menuData && menuData.status === 'ERROR'"
              class="create-menu-button create-menu-button--delete"
              @click="deleteMenu"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Slett feilmeny
            </button>
            <button
              class="create-menu-button"
              @click="showCreateMenuForm = true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <line
                  x1="12"
                  y1="5"
                  x2="12"
                  y2="19"
                />
                <line
                  x1="5"
                  y1="12"
                  x2="19"
                  y2="12"
                />
              </svg>
              Opprett ny meny
            </button>
          </div>
        </div>

        <div
          v-else
          class="wolt-menu__no-store"
        >
          <p>Velg en butikk for å se Wolt-menyen.</p>
        </div>
      </div>
    </div>
    <LoginModal
      v-if="showLogin"
      @close="closeLoginModal"
    />

    <!-- Create Menu Modal -->
    <div
      v-if="showCreateMenuForm"
      class="modal-overlay"
      @click.self="closeCreateMenuForm"
    >
      <div class="modal-content">
        <div class="modal-header">
          <h2>Opprett ny Wolt Meny</h2>
          <button
            class="modal-close"
            @click="closeCreateMenuForm"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line
                x1="18"
                y1="6"
                x2="6"
                y2="18"
              />
              <line
                x1="6"
                y1="6"
                x2="18"
                y2="18"
              />
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <p class="modal-description">
            Opprett en ny meny basert på dine eksisterende produkter. Menyen vil bli sendt til Wolt for godkjenning.
          </p>

          <div class="form-group">
            <label for="currency">Valuta</label>
            <input
              id="currency"
              v-model="newMenuData.currency"
              type="text"
              class="form-input"
              placeholder="NOK"
            >
          </div>

          <div class="form-group">
            <label for="primaryLanguage">Primærspråk</label>
            <select
              id="primaryLanguage"
              v-model="newMenuData.primaryLanguage"
              class="form-input"
            >
              <option value="nb">Norsk (Bokmål)</option>
              <option value="en">English</option>
              <option value="sv">Svenska</option>
              <option value="da">Dansk</option>
            </select>
          </div>

          <div class="modal-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
              />
              <line
                x1="12"
                y1="16"
                x2="12"
                y2="12"
              />
              <line
                x1="12"
                y1="8"
                x2="12.01"
                y2="8"
              />
            </svg>
            <p>Menyen vil bli opprettet basert på dine eksisterende produkter og kategorier fra systemet.</p>
          </div>
        </div>
        <div class="modal-footer">
          <button
            class="modal-button modal-button--secondary"
            @click="closeCreateMenuForm"
          >
            Avbryt
          </button>
          <button
            class="modal-button modal-button--primary"
            :disabled="isCreatingMenu"
            @click="createMenu"
          >
            <span v-if="isCreatingMenu">Oppretter...</span>
            <span v-else>Opprett meny</span>
          </button>
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
          <h2>Åpningstider</h2>
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
import LoginModal from "~/components/molecules/LoginModal.vue";

export default {
  name: "WoltMenu",
  components: {
    AdminPage,
    Loading,
    LoginModal,
  },
  data() {
    return {
      menuData: null,
      menuStatus: null,
      venueStatus: null,
      deliveryProvider: null,
      isLoading: false,
      selectedStore: null,
      showLogin: false,
      isEditMode: false,
      isSaving: false,
      isSyncing: false,
      originalMenuSnapshot: null, // JSON snapshot of menu when entering edit mode
      editedItems: {}, // Track all edited items by ID
      editedOptions: {}, // Track all edited options by ID
      showCreateMenuForm: false,
      isCreatingMenu: false,
      newMenuData: {
        currency: 'NOK',
        primaryLanguage: 'nb'
      },
      isEditingOpeningHours: false,
      editedOpeningTimes: [],
      isSavingOpeningHours: false,
      showOpeningHours: false,
      showOpeningHoursModal: false
    };
  },
  computed: {
    hasUnsavedChanges() {
      if (!this.isEditMode || !this.originalMenuSnapshot) {
        return false;
      }

      // Check if any items or options were explicitly tracked as edited
      const hasEditedItems = Object.keys(this.editedItems).length > 0;
      const hasEditedOptions = Object.keys(this.editedOptions).length > 0;

      // Also compare snapshots for additional safety
      const currentSnapshot = this.createMenuSnapshot();
      const snapshotChanged = currentSnapshot !== this.originalMenuSnapshot;

      const hasChanges = hasEditedItems || hasEditedOptions || snapshotChanged;


      return hasChanges;
    },
  },
  watch: {
    selectedStore(newVal, oldVal) {
      if (newVal > 0) {
        this.fetchMenuData(newVal);
        this.fetchVenueStatus(newVal);
        this.fetchDeliveryProvider(newVal);
      } else {
        this.menuData = null;
        this.venueStatus = null;
        this.deliveryProvider = null;
      }
      if (window && window.localStorage) {
        localStorage.setItem("woltMenuSelectedStore", newVal);
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
        const storedStore = localStorage.getItem("woltMenuSelectedStore");
        if (storedStore) {
          this.selectedStore = parseInt(storedStore);
        } else if (this.$store.state.currentUser.adminIn?.length) {
          // Fallback to first store in adminIn array if no stored selection
          this.selectedStore = this.$store.state.currentUser.adminIn[0].id;
          // Save this selection for future use
          localStorage.setItem("woltMenuSelectedStore", this.selectedStore.toString());
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
    fetchMenuData(storeId, isPolling = false) {
      if (storeId) {
        // Only show loading spinner if not polling
        if (!isPolling) {
          this.isLoading = true;
        }

        this._woltMenuService
          .getMenu(storeId)
          .then((data) => {
            this.menuData = data;
            // Extract status if present
            if (data && data.status) {
              this.menuStatus = data.status;
            } else {
              this.menuStatus = null;
            }
            this.isLoading = false;
          })
          .catch((error) => {
            console.error("Error fetching Wolt menu data:", error);
            this.menuData = null;
            this.menuStatus = null;
            this.isLoading = false;
            alert("Kunne ikke hente Wolt-meny. Vennligst prøv igjen senere.");
          });
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
    parseAndGetLocalizedValue(jsonString, preferredLang = 'nb') {
      if (!jsonString) {
        return '';
      }
      try {
        const values = JSON.parse(jsonString);
        return this.getLocalizedValue(values, preferredLang);
      } catch (e) {
        console.error('Error parsing localized JSON:', e, jsonString);
        return jsonString; // Return as-is if parsing fails
      }
    },
    getTotalItemCount() {
      if (!this.menuData || !this.menuData.categories) {
        return 0;
      }
      return this.menuData.categories.reduce((total, category) => {
        return total + (category.items ? category.items.length : 0);
      }, 0);
    },
    getItemById(itemId) {
      if (!this.menuData || !this.menuData.menu || !this.menuData.menu.items) {
        return null;
      }
      return this.menuData.menu.items.find(item => item.id === itemId);
    },
    getOptionById(optionId) {
      if (!this.menuData || !this.menuData.menu || !this.menuData.menu.options) {
        return null;
      }
      return this.menuData.menu.options.find(option => option.id === optionId);
    },
    formatPrice(price) {
      if (!price && price !== 0) {
        return '0 kr';
      }
      // Prices are in smallest currency unit (øre for NOK), so divide by 100
      const amount = price / 100;
      return `${amount.toFixed(2)} kr`;
    },
    formatPriceForInput(price) {
      if (!price && price !== 0) {
        return '0.00';
      }
      // Convert from øre to kroner for display in input
      const amount = price / 100;
      return amount.toFixed(2);
    },
    toggleItemEnabled(item, enabled) {
      if (!item || !item.woltItemId) {
        alert('Produktet mangler Wolt ID og kan ikke oppdateres');
        return;
      }

      // Update the specific item by database ID
      for (const category of this.menuData.categories) {
        const foundItem = category.items.find(i => i.id === item.id);
        if (foundItem) {
          this.$set(foundItem, 'enabled', enabled);
          break;
        }
      }

      // Track that this item was edited
      this.$set(this.editedItems, item.woltItemId, true);
    },
    toggleItemInStock(item, inStock) {
      if (!item || !item.woltItemId) {
        alert('Produktet mangler Wolt ID og kan ikke oppdateres');
        return;
      }

      // Update the specific item by database ID
      for (const category of this.menuData.categories) {
        const foundItem = category.items.find(i => i.id === item.id);
        if (foundItem) {
          this.$set(foundItem, 'inStock', inStock);
          break;
        }
      }

      // Track that this item was edited
      this.$set(this.editedItems, item.woltItemId, true);
    },
    updateItemPrice(item, newPrice) {
      if (!item || !item.woltItemId) {
        alert('Produktet mangler Wolt ID og kan ikke oppdateres');
        return;
      }

      const priceValue = parseFloat(newPrice);
      if (isNaN(priceValue) || priceValue < 0) {
        alert('Ugyldig pris');
        return;
      }

      // Convert from kroner to øre (cents)
      const priceInOre = Math.round(priceValue * 100);

      // Find the specific item by Wolt ID (unique identifier)
      for (const category of this.menuData.categories) {
        const foundItem = category.items.find(i => i.id === item.id);
        if (foundItem) {
          console.log(`[Price Update] WoltID:${item.woltItemId} ${foundItem.price} → ${priceInOre}`);
          this.$set(foundItem, 'price', priceInOre);
          break;
        }
      }

      // Track that this item was edited (use woltItemId as unique key)
      this.$set(this.editedItems, item.woltItemId, true);
    },
    toggleOptionEnabled(optionValue, enabled) {
      if (!optionValue) {
        console.error('[toggleOptionEnabled] Option value mangler:', optionValue);
        return;
      }

      // Use externalData or woltOptionValueId as the identifier
      const optionId = optionValue.externalData || optionValue.woltOptionValueId;
      if (!optionId) {
        console.error('[toggleOptionEnabled] Missing both externalData and woltOptionValueId:', optionValue);
        return;
      }

      // Update local display
      this.$set(optionValue, 'enabled', enabled);

      // Track that this option was edited
      this.$set(this.editedOptions, optionId, true);
    },
    createMenuSnapshot() {
      if (!this.menuData || !this.menuData.categories) {
        return null;
      }

      // Create a simplified snapshot of items and options with only editable fields
      const snapshot = {
        items: {},
        options: {}
      };

      // Snapshot all items across all categories
      this.menuData.categories.forEach(category => {
        if (category.items) {
          category.items.forEach(item => {
            if (item.woltItemId) {
              snapshot.items[item.woltItemId] = {
                price: item.price || 0,
                enabled: !!item.enabled,
                inStock: !!item.inStock
              };
            }

            // Snapshot all option values for this item (only enabled status, not price)
            if (item.options) {
              item.options.forEach(option => {
                if (option.values) {
                  option.values.forEach(value => {
                    const optionId = value.externalData || value.woltOptionValueId;
                    if (optionId) {
                      snapshot.options[optionId] = {
                        enabled: !!value.enabled
                      };
                    } else {
                      console.warn('[createMenuSnapshot] Option value missing both externalData and woltOptionValueId:', value);
                    }
                  });
                }
              });
            }
          });
        }
      });

      return JSON.stringify(snapshot);
    },
    enterEditMode() {
      this.isEditMode = true;
      this.editedItems = {};
      this.editedOptions = {};
      this.originalMenuSnapshot = this.createMenuSnapshot();
    },
    cancelEdit() {
      if (this.hasUnsavedChanges) {
        if (!confirm('Du har ulagrede endringer. Er du sikker på at du vil avbryte?')) {
          return;
        }
      }
      this.isEditMode = false;
      this.editedItems = {};
      this.editedOptions = {};
      this.originalMenuSnapshot = null;
      // Refresh menu to restore original values
      this.fetchMenuData(this.selectedStore);
    },
    async saveChanges() {
      if (!this.hasUnsavedChanges) {
        return;
      }

      // Blur any focused input to trigger @blur events
      if (document.activeElement && document.activeElement.tagName === 'INPUT') {
        document.activeElement.blur();
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      this.isSaving = true;

      try {
        const original = JSON.parse(this.originalMenuSnapshot);
        const current = JSON.parse(this.createMenuSnapshot());

        console.log('[Save] Comparing snapshots...');
        const itemUpdates = [];
        const optionUpdates = [];

        // Find changed items
        Object.keys(this.editedItems).forEach(woltItemId => {
          const originalItem = original.items[woltItemId];
          const currentItem = current.items[woltItemId];

          if (!originalItem || !currentItem) {
            console.warn(`[Save] Missing data for WoltID:${woltItemId}`);
            return;
          }

          const update = { wolt_item_id: woltItemId };
          let hasChanges = false;

          if (originalItem.price !== currentItem.price) {
            console.log(`[Save] WoltID:${woltItemId} price: ${originalItem.price} → ${currentItem.price}`);
            update.price = currentItem.price;
            hasChanges = true;
          }

          if (originalItem.enabled !== currentItem.enabled) {
            update.enabled = currentItem.enabled;
            hasChanges = true;
          }

          if (originalItem.inStock !== currentItem.inStock) {
            update.in_stock = currentItem.inStock;
            hasChanges = true;
          }

          if (hasChanges) {
            itemUpdates.push(update);
          }
        });

        // Find changed options (only enabled status, not price)
        Object.keys(this.editedOptions).forEach(optionId => {
          const originalOption = original.options[optionId];
          const currentOption = current.options[optionId];

          if (!originalOption || !currentOption) {
            return;
          }

          const update = { external_id: optionId };
          let hasChanges = false;

          if (originalOption.enabled !== currentOption.enabled) {
            update.enabled = currentOption.enabled;
            hasChanges = true;
          }

          if (hasChanges) {
            optionUpdates.push(update);
          }
        });

        // Save changes
        if (itemUpdates.length > 0) {
          console.log(`[Save] Saving ${itemUpdates.length} item(s)`);
          await this._woltMenuService.updateMenuItems(this.selectedStore, { data: itemUpdates });
        }

        if (optionUpdates.length > 0) {
          console.log(`[Save] Saving ${optionUpdates.length} option(s)`);
          await this._woltMenuService.updateMenuOptions(this.selectedStore, { data: optionUpdates });
        }

        // Clear state
        this.editedItems = {};
        this.editedOptions = {};
        this.originalMenuSnapshot = null;
        this.isEditMode = false;

        // Refresh menu data to show saved changes
        await this.fetchMenuData(this.selectedStore);

      } catch (error) {
        console.error('Error saving changes:', error);
        alert('Feil ved lagring av endringer: ' + (error.message || 'Ukjent feil'));
      } finally {
        this.isSaving = false;
      }
    },
    fetchVenueStatus(storeId) {
      if (storeId) {
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
          alert(`Restaurant er nå ${online ? 'åpen' : 'stengt'} på Wolt`);
        } else {
          alert('Kunne ikke oppdatere online status');
        }
      } catch (error) {
        console.error('Error toggling venue online status:', error);
        alert('Feil ved oppdatering av online status');
      }
    },
    closeCreateMenuForm() {
      this.showCreateMenuForm = false;
      this.newMenuData = {
        currency: 'NOK',
        primaryLanguage: 'nb'
      };
    },
    async createMenu() {
      if (!this.selectedStore) {
        alert('Ingen butikk valgt');
        return;
      }

      if (!this.newMenuData.currency || !this.newMenuData.primaryLanguage) {
        alert('Vennligst fyll ut alle feltene');
        return;
      }

      this.isCreatingMenu = true;

      try {
        // Build the menu request structure
        const menuRequest = {
          currency: this.newMenuData.currency,
          primary_language: this.newMenuData.primaryLanguage,
          categories: []
          // The categories will be populated from your existing products by the backend
        };

        const success = await this._woltMenuService.createMenu(this.selectedStore, menuRequest);

        if (success) {
          alert('Menyen ble opprettet! Den vil bli sendt til Wolt for godkjenning.');
          this.closeCreateMenuForm();
          // Refresh menu data to show the newly created menu
          this.fetchMenuData(this.selectedStore);
        } else {
          alert('Kunne ikke opprette menyen. Vennligst prøv igjen.');
        }
      } catch (error) {
        console.error('Error creating menu:', error);
        alert('Feil ved opprettelse av meny: ' + (error.message || 'Ukjent feil'));
      } finally {
        this.isCreatingMenu = false;
      }
    },
    async syncWithWolt() {
      if (!this.selectedStore) {
        alert('Ingen butikk valgt');
        return;
      }

      this.isSyncing = true;

      try {
        const success = await this._woltMenuService.syncMenu(this.selectedStore);

        if (success) {
          this.fetchMenuData(this.selectedStore);
        } else {
          alert('Kunne ikke synkronisere menyen med Wolt. Vennligst prøv igjen.');
        }
      } catch (error) {
        console.error('Error syncing menu:', error);
        alert('Feil ved synkronisering av meny: ' + (error.message || 'Ukjent feil'));
      } finally {
        this.isSyncing = false;
      }
    },
    async importMenuFromWolt() {
      if (!this.selectedStore) {
        alert('Ingen butikk valgt');
        return;
      }

      this.isLoading = true;

      try {
        const success = await this._woltMenuService.importMenu(this.selectedStore);

        if (success) {
          // Refresh menu data to show updated status
          this.fetchMenuData(this.selectedStore);
        } else {
          alert('Kunne ikke importere meny fra Wolt. Vennligst prøv igjen.');
          this.isLoading = false;
        }
      } catch (error) {
        console.error('Error importing menu:', error);

        // Better error messages based on error type
        if (error.message && error.message.includes('429')) {
          alert('Wolt API rate limit nådd. Vennligst vent 1-2 minutter før du prøver igjen.\n\nWolt har strenge grenser på hvor ofte vi kan sjekke status.');
        } else if (error.message && error.message.includes('PENDING')) {
          alert('Menyen behandles fortsatt av Wolt. Vennligst vent noen minutter og prøv igjen.');
        } else {
          alert('Feil ved import av meny: ' + (error.message || 'Ukjent feil'));
        }

        this.isLoading = false;
      }
    },
    async deleteMenu() {
      if (!this.selectedStore) {
        alert('Ingen butikk valgt');
        return;
      }

      if (!confirm('Er du sikker på at du vil slette menyen fra databasen? Dette kan ikke angres.')) {
        return;
      }

      try {
        const success = await this._woltMenuService.deleteMenu(this.selectedStore);

        if (success) {
          alert('Menyen ble slettet fra databasen');
          // Refresh to clear the menu data
          this.fetchMenuData(this.selectedStore);
        } else {
          alert('Kunne ikke slette menyen. Vennligst prøv igjen.');
        }
      } catch (error) {
        console.error('Error deleting menu:', error);
        alert('Feil ved sletting av meny: ' + (error.message || 'Ukjent feil'));
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
          alert('Åpningstider ble oppdatert');
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

.wolt-menu__items {
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
}

.wolt-menu__data {
  padding: 0;
}

.wolt-menu__json {
  margin: 0;
  font-size: 0.875rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.wolt-menu__no-data {
  padding: 2rem 0;
  color: #a0aec0;
  text-align: center;
}

.wolt-menu__no-store {
  padding: 2rem 0;
  color: #a0aec0;
  text-align: center;
}

.wolt-menu__status-warning {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background-color: #fffbea;
  border: 1px solid #f6e05e;
  border-radius: 0.25rem;
  padding: 1rem;
  margin-bottom: 1rem;
  color: #744210;
}

.wolt-menu__status-warning strong {
  color: #744210;
}

.wolt-menu__status-warning p {
  margin: 0.5rem 0;
}

.wolt-menu__status-warning p:first-child {
  margin-top: 0;
}

.wolt-menu__status-warning p:last-child {
  margin-bottom: 0;
}

.status-warning__content {
  flex: 1;
}

.status-warning__note {
  font-size: 0.875rem;
  font-style: italic;
  opacity: 0.9;
}

.status-warning__button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #744210;
  color: #fffbea;
  border: none;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.status-warning__button:hover:not(:disabled) {
  background-color: #5a3308;
}

.status-warning__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.status-warning__button svg {
  flex-shrink: 0;
}

/* Edit Mode Actions */
.menu-actions {
  margin-bottom: 2rem;
}

.menu-actions__buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.menu-action-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.menu-action-button svg {
  flex-shrink: 0;
}

.menu-action-button:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.menu-action-button:active {
  transform: translateY(0);
}

.menu-action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.menu-action-button--sync {
  background-color: #3182ce;
  color: white;
}

.menu-action-button--sync:hover:not(:disabled) {
  background-color: #2c5282;
}

.menu-action-button--edit {
  background-color: #1bb776;
  color: white;
}

.menu-action-button--edit:hover:not(:disabled) {
  background-color: #159960;
}

.menu-action-button--cancel {
  background-color: #718096;
  color: white;
}

.menu-action-button--cancel:hover {
  background-color: #4a5568;
}

.menu-action-button--save {
  background-color: #1bb776;
  color: white;
}

.menu-action-button--save:hover:not(:disabled) {
  background-color: #159960;
}

.unsaved-changes-banner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  margin-bottom: 1rem;
  background-color: #fffbea;
  border: 2px solid #f6e05e;
  border-radius: 0.375rem;
  color: #744210;
  font-weight: 600;
  font-size: 1rem;
}

.unsaved-changes-banner svg {
  flex-shrink: 0;
  color: #d69e2e;
}

/* Menu Info */
.menu-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  padding: 1rem 0;
  margin-bottom: 2rem;
}

.menu-info__item {
  display: flex;
  flex-direction: column;
}

.menu-info__label {
  font-size: 0.875rem;
  color: #718096;
  margin-bottom: 0.25rem;
}

.menu-info__value {
  font-size: 1.125rem;
  font-weight: 600;
  color: #2d3748;
}

/* Category */
.menu-category {
  margin-bottom: 3rem;
}

.menu-category__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 0;
  border-bottom: 2px solid #2d3748;
  margin-bottom: 1.5rem;
}

.menu-category__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2d3748;
}

.menu-category__count {
  font-size: 0.875rem;
  color: #718096;
  font-weight: 500;
}

.menu-category__description {
  padding: 0 0 1rem 0;
  color: #4a5568;
  margin: 0;
  margin-bottom: 1rem;
}

.menu-category__empty {
  padding: 2rem;
  text-align: center;
  color: #a0aec0;
  font-style: italic;
}

/* Menu Items */
.menu-items {
  padding: 0;
}

.menu-item {
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid #e2e8f0;
}

.menu-item:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

.menu-item__content {
  padding: 0;
}

.menu-item__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.menu-item__name {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  flex: 1;
}

.menu-item__price {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1bb776;
  margin-left: 1rem;
  white-space: nowrap;
}

.menu-item__price-edit {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: 1rem;
}

.menu-item__price-input {
  width: 100px;
  padding: 0.5rem;
  border: 2px solid #e2e8f0;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
  text-align: right;
  transition: border-color 0.2s;
}

.menu-item__price-input:focus {
  outline: none;
  border-color: #1bb776;
}

.menu-item__price-currency {
  font-size: 1rem;
  font-weight: 600;
  color: #4a5568;
}

.menu-item__description {
  color: #4a5568;
  margin: 0 0 1rem 0;
  line-height: 1.5;
}

.menu-item__meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.menu-item__badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.menu-item__badge--enabled {
  background-color: #c6f6d5;
  color: #22543d;
}

.menu-item__badge--disabled {
  background-color: #fed7d7;
  color: #742a2a;
}

.menu-item__meta-item {
  font-size: 0.875rem;
  color: #718096;
}

.menu-item__meta-item--muted {
  color: #a0aec0;
}

.menu-item__toggle-wrapper {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.menu-item__toggle-label {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
  cursor: pointer;
}

.menu-item__toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.menu-item__toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e0;
  transition: 0.3s;
  border-radius: 24px;
}

.menu-item__toggle-slider:before {
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

.menu-item__toggle-input:checked + .menu-item__toggle-slider {
  background-color: #1bb776;
}

.menu-item__toggle-input:checked + .menu-item__toggle-slider:before {
  transform: translateX(26px);
}

.menu-item__toggle-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4a5568;
}

/* Options */
.menu-item__options {
  margin-top: 1.25rem;
  padding-top: 1.25rem;
  border-top: 1px solid #e2e8f0;
}

.menu-item__options-title {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #4a5568;
}

.menu-option {
  margin-bottom: 1rem;
  padding: 0.75rem 0;
  border-left: 3px solid #e2e8f0;
  padding-left: 1rem;
}

.menu-option:last-child {
  margin-bottom: 0;
}

.menu-option__content {
}

.menu-option__header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.menu-option__name {
  font-weight: 600;
  color: #2d3748;
}

.menu-option__type {
  font-size: 0.875rem;
  color: #718096;
  font-style: italic;
}

.menu-option__range {
  font-size: 0.875rem;
  color: #4a5568;
  margin-bottom: 0.75rem;
}

.menu-option__values {
  display: grid;
  gap: 0.5rem;
}

.menu-option__value {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
}

.menu-option__value-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.menu-option__value-name {
  color: #2d3748;
  font-weight: 500;
}

.menu-option__value-price {
  font-weight: 600;
  color: #1bb776;
  white-space: nowrap;
}

.menu-option__value-price-edit {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.menu-option__value-price-prefix {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4a5568;
}

.menu-option__value-price-input {
  width: 70px;
  padding: 0.375rem 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #2d3748;
  text-align: right;
  transition: border-color 0.2s;
}

.menu-option__value-price-input:focus {
  outline: none;
  border-color: #1bb776;
}

.menu-option__value-price-currency {
  font-size: 0.875rem;
  font-weight: 600;
  color: #4a5568;
}

.menu-option__value-toggle {
  margin-left: 1rem;
}

.menu-option__toggle-label {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 22px;
  cursor: pointer;
}

.menu-option__toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.menu-option__toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #cbd5e0;
  transition: 0.3s;
  border-radius: 22px;
}

.menu-option__toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.menu-option__toggle-input:checked + .menu-option__toggle-slider {
  background-color: #1bb776;
}

.menu-option__toggle-input:checked + .menu-option__toggle-slider:before {
  transform: translateX(22px);
}

.menu-option__value-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.menu-option__value-badge--enabled {
  background-color: #c6f6d5;
  color: #22543d;
}

.menu-option__value-badge--disabled {
  background-color: #fed7d7;
  color: #742a2a;
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

/* Create Menu Button */
.create-menu-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.75rem 1.5rem;
  background-color: #1bb776;
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.create-menu-button:hover {
  background-color: #159960;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.create-menu-button:active {
  transform: translateY(0);
}

.create-menu-button svg {
  flex-shrink: 0;
}

.create-menu-button--delete {
  background-color: #e53e3e;
  margin-right: 0.75rem;
}

.create-menu-button--delete:hover {
  background-color: #c53030;
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

/* ======================================
   NEW IMPROVED STYLES
   ====================================== */

/* Compact Status Header */
.status-header {
  margin-bottom: 2rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 1rem 1.5rem;
}

.status-header__main {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.status-header__online {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status-header__info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge--online {
  background-color: #c6f6d5;
  color: #22543d;
}

.status-badge--offline {
  background-color: #fed7d7;
  color: #742a2a;
}

.status-header__text {
  font-size: 0.875rem;
  color: #4a5568;
}

.status-header__divider {
  width: 1px;
  height: 32px;
  background-color: #e2e8f0;
}

.status-header__meta {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  flex: 1;
}

.status-header__details-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: #4a5568;
  cursor: pointer;
  transition: all 0.2s;
}

.status-header__details-btn:hover {
  background: #edf2f7;
  border-color: #cbd5e0;
}

.status-header__provider {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #718096;
}

.status-header__provider svg {
  color: #a0aec0;
}

/* Status Toggle Switch */
.status-toggle {
  position: relative;
  display: inline-block;
  width: 54px;
  height: 28px;
  cursor: pointer;
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

/* Menu Info Collapsible */
.menu-info-collapsible {
  margin-bottom: 1.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  background: #f7fafc;
}

.menu-info-collapsible__summary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  user-select: none;
  font-size: 0.875rem;
  color: #4a5568;
  list-style: none;
}

.menu-info-collapsible__summary::-webkit-details-marker {
  display: none;
}

.menu-info-collapsible__summary svg {
  color: #718096;
}

.menu-info-collapsible__content {
  padding: 0 1rem 1rem 1rem;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.menu-info-collapsible__item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.menu-info-collapsible__label {
  font-size: 0.75rem;
  color: #718096;
}

.menu-info-collapsible__value {
  font-size: 0.875rem;
  font-weight: 600;
  color: #2d3748;
}

/* Improved Category Headers (with collapse chevron) */
.menu-category {
  margin-bottom: 2rem;
}

.menu-category__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
  border-bottom: 2px solid #2d3748;
  margin-bottom: 1.5rem;
  cursor: pointer;
  user-select: none;
  list-style: none;
}

.menu-category__header::-webkit-details-marker {
  display: none;
}

.menu-category__chevron {
  flex-shrink: 0;
  color: #4a5568;
  transition: transform 0.2s;
}

details[open] .menu-category__chevron {
  transform: rotate(180deg);
}

.menu-category__header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex: 1;
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

</style>
