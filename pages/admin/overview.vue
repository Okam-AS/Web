<template>
  <AdminPage :full-width="true">
    <div class="overview">
      <div class="overview__content">
        <div class="overview__filters">
          <div class="overview__filter">
            <div class="date-selection">
              <div class="date-picker-wrapper">
                <div class="date-input">
                  <label>Fra dato:</label>
                  <input
                    v-model="dateRange.from"
                    type="date"
                    :max="dateRange.to"
                    @change="applyDateRange"
                  />
                </div>
                <div class="date-input">
                  <label>Til dato:</label>
                  <input
                    v-model="dateRange.to"
                    type="date"
                    :min="dateRange.from"
                    @change="applyDateRange"
                  />
                </div>
                <div class="date-buttons">
                  <button
                    class="date-button"
                    @click="setToday"
                  >
                    I dag
                  </button>
                  <button
                    class="date-button"
                    @click="setThisMonth"
                  >
                    Denne måneden
                  </button>
                  <div class="loading-container">
                    <Loading
                      v-if="isLoading"
                      :loading="true"
                      class="date-button-loading"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- KAM Leaderboard Section -->
        <div
          v-if="showKAMColumns && sortedKams.length > 0"
          class="kam-leaderboard-container"
        >
          <h2 class="kam-leaderboard-title">Bonus oversikt</h2>
          <div class="kam-leaderboard-scroll">
            <div
              v-for="(kam, index) in sortedKams"
              :key="kam.id"
              class="kam-card"
              :class="{
                'kam-card--first': index === 0 && kam.onetimeBonusEarned > 0,
                'kam-card--second': index === 1 && kam.onetimeBonusEarned > 0,
                'kam-card--third': index === 2 && kam.onetimeBonusEarned > 0,
                'kam-card--other': index > 2 || kam.onetimeBonusEarned === 0,
              }"
            >
              <div
                :class="{
                  'kam-card__rank': true,
                  'kam-card__rank--1': index === 0 && kam.onetimeBonusEarned > 0,
                  'kam-card__rank--2': index === 1 && kam.onetimeBonusEarned > 0,
                  'kam-card__rank--3': index === 2 && kam.onetimeBonusEarned > 0,
                }"
              >
                <span v-if="index === 0 && kam.onetimeBonusEarned > 0">🥇</span>
                <span v-else-if="index === 1 && kam.onetimeBonusEarned > 0">🥈</span>
                <span v-else-if="index === 2 && kam.onetimeBonusEarned > 0">🥉</span>
                <span v-else>{{ index + 1 }}</span>
              </div>
              <div class="kam-card__content">
                <div class="kam-card__name">
                  {{ kam.name }}
                </div>
                <div class="kam-card__earnings kam-card__earnings--highlight">
                  <div class="kam-card__earnings-label">Engangsbonus</div>
                  <div class="kam-card__earnings-value">{{ priceLabel(kam.onetimeBonusEarned) }} kr</div>
                </div>
                <div
                  v-if="kam.monthlyBonusEarned"
                  class="kam-card__earnings"
                >
                  <div class="kam-card__earnings-label">Månedlig bonus</div>
                  <div class="kam-card__earnings-value">{{ priceLabel(kam.monthlyBonusEarned) }} kr</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="overview__table-container">
          <table class="overview__table">
            <thead>
              <tr>
                <th
                  class="sortable-header"
                  @click="sortBy('storeId')"
                >
                  ID
                  <span
                    v-if="sortKey === 'storeId'"
                    class="sort-icon"
                  >
                    {{ sortOrder === "asc" ? "▲" : "▼" }}
                  </span>
                </th>
                <th
                  class="sortable-header"
                  @click="sortBy('name')"
                >
                  Butikknavn
                  <span
                    v-if="sortKey === 'name'"
                    class="sort-icon"
                  >
                    {{ sortOrder === "asc" ? "▲" : "▼" }}
                  </span>
                </th>
                <th
                  class="sortable-header"
                  @click="sortBy('orderCount')"
                >
                  Bestillinger
                  <span
                    v-if="sortKey === 'orderCount'"
                    class="sort-icon"
                  >
                    {{ sortOrder === "asc" ? "▲" : "▼" }}
                  </span>
                </th>
                <th
                  class="sortable-header"
                  @click="sortBy('totalAmount')"
                >
                  Total beløp
                  <span
                    v-if="sortKey === 'totalAmount'"
                    class="sort-icon"
                  >
                    {{ sortOrder === "asc" ? "▲" : "▼" }}
                  </span>
                </th>
                <th
                  v-if="showKAMColumns"
                  class="sortable-header"
                  @click="sortBy('approved')"
                >
                  Status
                  <span
                    v-if="sortKey === 'approved'"
                    class="sort-icon"
                  >
                    {{ sortOrder === "asc" ? "▲" : "▼" }}
                  </span>
                </th>
                <th
                  v-if="showKAMColumns"
                  class="sortable-header"
                  @click="sortBy('kamUserId')"
                >
                  KAM
                  <span
                    v-if="sortKey === 'kamUserId'"
                    class="sort-icon"
                  >
                    {{ sortOrder === "asc" ? "▲" : "▼" }}
                  </span>
                  <span
                    class="filter-icon"
                    :class="{ active: selectedKamFilters.length > 0 && selectedKamFilters.length < kams.length + 1 }"
                    @click.stop="toggleKamFilterDropdown"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="filter-icon-svg"
                    >
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <div
                      v-if="showKamFilterDropdown"
                      class="filter-dropdown"
                      @click.stop
                    >
                      <div class="filter-dropdown-options">
                        <label>
                          <input
                            type="checkbox"
                            value=""
                            :checked="tempSelectedKamFilters.length === 0 || tempSelectedKamFilters.includes('')"
                            @change="toggleKamFilter('')"
                          />
                          <span>Ingen</span>
                        </label>
                        <label
                          v-for="kam in kams"
                          :key="kam.id"
                        >
                          <input
                            type="checkbox"
                            :value="kam.id"
                            :checked="tempSelectedKamFilters.length === 0 || tempSelectedKamFilters.includes(kam.id)"
                            @change="toggleKamFilter(kam.id)"
                          />
                          <span>{{ kam.name }}</span>
                        </label>
                      </div>
                    </div>
                  </span>
                </th>
                <th
                  v-if="showKAMColumns"
                  class="sortable-header"
                  @click="sortBy('kamStatus')"
                >
                  KAM Status
                  <span
                    v-if="sortKey === 'kamStatus'"
                    class="sort-icon"
                  >
                    {{ sortOrder === "asc" ? "▲" : "▼" }}
                  </span>
                  <span
                    class="info-icon"
                    @click.stop
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
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
                    <div class="status-info-tooltip">
                      <h4>KAM Status forklaringer:</h4>
                      <ul>
                        <li><strong>Mangler oppsett:</strong> Meny, bilder eller andre detaljer mangler</li>
                        <li><strong>Klar for demo:</strong> Butikken er klar til å bli demonstrert</li>
                        <li><strong>Venter på kundesvar:</strong> Vi venter på tilbakemelding fra kunden</li>
                        <li><strong>Krever oppfølging:</strong> Kunden venter på oss eller bør følges opp</li>
                        <li><strong>I drift:</strong> Butikken er i gang og bruker Okam</li>
                        <li><strong>Slettet:</strong> Butikken er ikke i bruk</li>
                      </ul>
                    </div>
                  </span>
                  <span
                    class="filter-icon"
                    :class="{ active: selectedKamStatusFilters.length > 0 }"
                    @click.stop="toggleKamStatusFilterDropdown"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      class="filter-icon-svg"
                    >
                      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                    </svg>
                    <div
                      v-if="showKamStatusFilterDropdown"
                      class="filter-dropdown"
                      @click.stop
                    >
                      <div class="filter-dropdown-options">
                        <label
                          v-for="(translation, status) in kamStatusTranslations"
                          :key="status"
                        >
                          <input
                            type="checkbox"
                            :value="status"
                            :checked="tempSelectedKamStatusFilters.includes(status)"
                            @change="toggleKamStatusFilter(status)"
                          />
                          <span>{{ translation }}</span>
                        </label>
                      </div>
                    </div>
                  </span>
                </th>
                <th v-if="showKAMColumns">KAM Notater</th>
                <th class="sortable-header">Admin</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="store in sortedStores"
                :key="store.storeId"
              >
                <td>{{ store.storeId }}</td>
                <td>
                  <a
                    v-if="store.storeId && store.approved"
                    style="text-decoration: underline"
                    :href="`https://shop.okam.no/store?id=${store.storeId}`"
                    target="_blank"
                    >{{ store.name }}
                  </a>
                  <span v-else>{{ store.name }}</span>
                </td>
                <td>{{ store.orderCount }}</td>
                <td>{{ priceLabel(store.totalAmount) }}</td>
                <td v-if="showKAMColumns">
                  <span
                    :class="{
                      'status-badge': true,
                      'status-badge--approved': store.approved,
                      'status-badge--pending': !store.approved,
                    }"
                    @click="publishStore(store)"
                  >
                    <span
                      v-if="publishingStoreIds.includes(store.storeId)"
                      class="status-spinner"
                    />
                    <span v-else>{{ store.approved ? "Publisert" : "Ikke publisert" }}</span>
                  </span>
                </td>
                <td v-if="showKAMColumns">
                  <select
                    v-model="store.kamUserId"
                    class="kam-input"
                    @change="debouncedKeyAccountManagerUpdate(store)"
                  >
                    <option value="">Ingen</option>
                    <option
                      v-for="kam in kams"
                      :key="kam.id"
                      :value="kam.id"
                    >
                      {{ kam.name }} ({{ kam.phoneNumber }})
                    </option>
                  </select>
                </td>
                <td v-if="showKAMColumns">
                  <select
                    v-model="store.kamStatus"
                    class="kam-status-dropdown"
                    @change="debouncedKeyAccountManagerUpdate(store)"
                  >
                    <option
                      v-for="(translation, status) in kamStatusTranslations"
                      :key="status"
                      :value="status"
                    >
                      {{ translation }}
                    </option>
                  </select>
                </td>
                <td v-if="showKAMColumns">
                  <textarea
                    v-model="store.kamNotes"
                    class="kam-textarea"
                    placeholder="Notater"
                    @input="debouncedKeyAccountManagerUpdate(store)"
                  />
                </td>
                <td>{{ store.firstAdmin }}</td>
              </tr>
              <tr v-if="sortedStores.length === 0 && !isLoading">
                <td
                  :colspan="showKAMColumns ? 9 : 5"
                  class="overview__empty"
                >
                  Ingen butikker funnet
                </td>
              </tr>
              <tr v-if="sortedStores.length > 0">
                <td />
                <td style="font-weight: bold">Sum:</td>
                <td style="font-weight: bold">
                  {{ totalOrderCount }}
                </td>
                <td style="font-weight: bold">
                  {{ priceLabel(totalAmountSum) }}
                </td>
                <td
                  v-if="showKAMColumns"
                  colspan="5"
                />
                <td v-else />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "@/components/organisms/AdminPage.vue";
import Loading from "@/components/atoms/Loading.vue";
import { debounce } from "@/core/helpers/ts-debounce";
import dayjs from "dayjs";
import { KeyAccountManagerStatus } from "@/core/enums";

export default {
  components: { AdminPage, Loading },

  data: () => ({
    isLoading: false,
    showKAMColumns: false,
    storeOverview: [],
    kams: [],
    sortKey: "name",
    sortOrder: "asc",
    dateRange: {
      from: null,
      to: null,
    },
    selectedKamFilters: [],
    tempSelectedKamFilters: [],
    showKamFilterDropdown: false,
    publishingStoreIds: [],
    kamStatusTranslations: {
      [KeyAccountManagerStatus.MissingSetup]: "Mangler oppsett",
      [KeyAccountManagerStatus.ReadyForDemo]: "Klar for demo",
      [KeyAccountManagerStatus.WaitingForCustomerResponse]: "Venter på kundesvar",
      [KeyAccountManagerStatus.RequiresFollowUp]: "Krever oppfølging",
      [KeyAccountManagerStatus.InOperation]: "I drift",
      [KeyAccountManagerStatus.Deleted]: "Slettet",
    },
    selectedKamStatusFilters: [],
    tempSelectedKamStatusFilters: [],
    showKamStatusFilterDropdown: false,
    totalOrderCount: 0,
    totalAmountSum: 0,
  }),

  computed: {
    sortedStores() {
      const sortKey = this.sortKey;
      const order = this.sortOrder === "asc" ? 1 : -1;

      // First filter by selected KAM filters if any are selected
      let filteredStores = [...this.storeOverview];

      // Only filter if we have specific filters selected
      if (this.selectedKamFilters.length > 0 && this.selectedKamFilters.length < this.kams.length + 1) {
        filteredStores = filteredStores.filter((store) => this.selectedKamFilters.includes(store.kamUserId || ""));
      }

      // Filter by selected KAM Status filters if any are selected
      if (this.selectedKamStatusFilters.length > 0) {
        // When filters are applied, only show stores with matching status
        filteredStores = filteredStores.filter((store) => this.selectedKamStatusFilters.includes(store.kamStatus));
      }

      return filteredStores.sort((a, b) => {
        let aValue = a[sortKey];
        let bValue = b[sortKey];

        // Special handling for KAM sorting - use KAM name instead of ID
        if (sortKey === "kamUserId") {
          // Find KAM names for the IDs
          const aKam = this.kams.find((k) => k.id === aValue);
          const bKam = this.kams.find((k) => k.id === bValue);

          // Use KAM names for sorting, or empty string if no KAM
          aValue = aKam ? aKam.name : "";
          bValue = bKam ? bKam.name : "";
        }

        // Handle special case for string comparison
        if (typeof aValue === "string" && typeof bValue === "string") {
          return aValue.localeCompare(bValue) * order;
        }

        // Handle boolean values
        if (typeof aValue === "boolean") {
          return aValue === bValue ? 0 : (aValue ? 1 : -1) * order;
        }

        // Handle numeric values
        return (aValue - bValue) * order;
      });
    },
    sortedKams() {
      console.log(this.kams);
      return this.kams.filter((kam) => kam.onetimeBonusEarned > 0).sort((a, b) => b.onetimeBonusEarned - a.onetimeBonusEarned);
    },
  },

  watch: {
    sortedStores: {
      handler(stores) {
        this.totalOrderCount = stores.reduce((sum, s) => sum + (s.orderCount || 0), 0);
        this.totalAmountSum = stores.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      },
      immediate: true,
      deep: true,
    },
    storeOverview: {
      handler() {
        this.totalOrderCount = this.sortedStores.reduce((sum, s) => sum + (s.orderCount || 0), 0);
        this.totalAmountSum = this.sortedStores.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      },
      immediate: true,
      deep: true,
    },
    storeOverview: {
      handler(stores) {
        // Set empty KAM IDs to empty string to ensure "Ingen" is selected
        if (stores && stores.length) {
          stores.forEach((store) => {
            if (!store.kamUserId) {
              store.kamUserId = "";
            }
          });
        }
      },
      immediate: true,
    },
  },

  created() {
    this.debouncedKeyAccountManagerUpdate = debounce(this.keyAccountManagerUpdate, 500);
  },

  mounted() {
    // Load saved filters from localStorage
    this.loadFiltersFromLocalStorage();

    // If no date range is set, default to today
    if (!this.dateRange.from || !this.dateRange.to) {
      this.setToday();
    } else {
      // If we loaded date range from localStorage, apply it
      this.applyDateRange();
    }

    this.setupTableScrollIndicators();
    document.addEventListener("click", this.closeKamFilterDropdown);
    document.addEventListener("click", this.closeKamStatusFilterDropdown);
  },

  beforeDestroy() {
    window.removeEventListener("resize", this.setupTableScrollIndicators);
    document.removeEventListener("click", this.closeKamFilterDropdown);
    document.removeEventListener("click", this.closeKamStatusFilterDropdown);
  },

  methods: {
    setupTableScrollIndicators() {
      this.$nextTick(() => {
        const tableContainer = document.querySelector(".overview__table-container");
        if (tableContainer) {
          // Initial check
          this.updateScrollIndicators(tableContainer);

          // Add scroll event listener
          tableContainer.addEventListener("scroll", () => {
            this.updateScrollIndicators(tableContainer);
          });

          // Add window resize listener to recheck on resize
          window.addEventListener("resize", () => {
            this.updateScrollIndicators(tableContainer);
          });
        }
      });
    },

    updateScrollIndicators(container) {
      if (!container) {
        return;
      }

      // Check if scrollable
      const hasHorizontalScroll = container.scrollWidth > container.clientWidth;

      // If not scrollable, remove both classes
      if (!hasHorizontalScroll) {
        container.classList.remove("scroll-left", "scroll-right");
        return;
      }

      // Check scroll position
      const scrollLeft = container.scrollLeft;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;

      // Add/remove appropriate classes
      if (scrollLeft > 0) {
        container.classList.add("scroll-left");
      } else {
        container.classList.remove("scroll-left");
      }

      if (scrollLeft < maxScrollLeft) {
        container.classList.add("scroll-right");
      } else {
        container.classList.remove("scroll-right");
      }
    },

    keyAccountManagerUpdate(store) {
      // this._storeService is a global mixin
      this._storeService.KeyAccountManagerUpdate(store.storeId, {
        kamUserId: store.kamUserId,
        status: store.kamStatus,
        notes: store.kamNotes,
      });
    },
    publishStore(store) {
      // Only ask for confirmation when unpublishing
      if (store.approved) {
        if (!confirm("Er du sikker på at du vil ta " + store.name + " offline?")) {
          return; // User cancelled the action
        }
      }

      // Set the publishing store ID to show spinner
      this.publishingStoreIds.push(store.storeId);

      this._storeService
        .Publish(store.storeId, {
          publish: !store.approved,
        })
        .then(() => {
          // Update the store's approved status in the UI
          store.approved = !store.approved;
          // Clear the publishing store ID to hide spinner
          this.publishingStoreIds = this.publishingStoreIds.filter((id) => id !== store.storeId);
          // Reload the overview data to refresh the store list
          this.loadOverview();
        })
        .catch((error) => {
          console.error("Error publishing store:", error);
          alert("Det oppstod en feil ved publisering av butikken.");
          // Clear the publishing store ID to hide spinner
          this.publishingStoreIds = this.publishingStoreIds.filter((id) => id !== store.storeId);
        });
    },

    loadOverview() {
      this.isLoading = true;
      this._storeService
        .GetOverview({
          from: this.dateRange.from,
          to: this.dateRange.to,
        })
        .then((data) => {
          this.storeOverview = data.stores;
          this.kams = data.kams; // name, phoneNumber, monthlyBonusEarned, onetimeBonusEarned
          this.showKAMColumns = data.isKeyAccountManager;
        })
        .finally(() => {
          this.isLoading = false;
        });
    },

    sortBy(key) {
      // If already sorting by this key, toggle the order
      if (this.sortKey === key) {
        this.sortOrder = this.sortOrder === "asc" ? "desc" : "asc";
      } else {
        // Otherwise, set the new sort key and default to ascending order
        this.sortKey = key;
        this.sortOrder = "asc";
      }

      // Save sort settings to localStorage
      this.saveFiltersToLocalStorage();
    },

    applyDateRange() {
      // Save date range to localStorage
      this.saveFiltersToLocalStorage();
      this.loadOverview();
    },

    setToday() {
      const today = dayjs().format("YYYY-MM-DD");
      this.dateRange.from = today;
      this.dateRange.to = today;
      this.applyDateRange();
    },

    setThisMonth() {
      // First day of current month
      const firstDay = dayjs().startOf("month").format("YYYY-MM-DD");
      // Current day
      const today = dayjs().format("YYYY-MM-DD");

      this.dateRange.from = firstDay;
      this.dateRange.to = today;
      this.applyDateRange();
    },

    toggleKamFilter(kamId) {
      const index = this.tempSelectedKamFilters.indexOf(kamId);
      if (index !== -1) {
        // Remove from filters
        this.tempSelectedKamFilters.splice(index, 1);
      } else {
        // Add to filters
        this.tempSelectedKamFilters.push(kamId);
      }

      // Apply filter immediately
      this.selectedKamFilters = [...this.tempSelectedKamFilters];

      // Save filters to localStorage
      this.saveFiltersToLocalStorage();
    },

    toggleKamStatusFilter(status) {
      const index = this.tempSelectedKamStatusFilters.indexOf(status);
      if (index !== -1) {
        // Remove from filters
        this.tempSelectedKamStatusFilters.splice(index, 1);
      } else {
        // Add to filters
        this.tempSelectedKamStatusFilters.push(status);
      }

      // Apply filter immediately
      this.selectedKamStatusFilters = [...this.tempSelectedKamStatusFilters];

      // Save filters to localStorage
      this.saveFiltersToLocalStorage();
    },

    toggleKamFilterDropdown(event) {
      event.stopPropagation();
      this.showKamFilterDropdown = !this.showKamFilterDropdown;

      // Initialize temp filters with current selection or all if none selected
      if (this.showKamFilterDropdown) {
        this.tempSelectedKamFilters = this.selectedKamFilters.length === 0 ? ["", ...this.kams.map((kam) => kam.id)] : [...this.selectedKamFilters];
      }
    },

    toggleKamStatusFilterDropdown(event) {
      event.stopPropagation();
      this.showKamStatusFilterDropdown = !this.showKamStatusFilterDropdown;

      // Initialize temp filters when opening dropdown
      if (this.showKamStatusFilterDropdown) {
        this.tempSelectedKamStatusFilters = [...this.selectedKamStatusFilters];
      }
    },

    closeKamFilterDropdown(event) {
      if (this.showKamFilterDropdown && !event.target.closest(".filter-dropdown") && !event.target.closest(".filter-icon")) {
        this.showKamFilterDropdown = false;
      }
    },

    closeKamStatusFilterDropdown(event) {
      if (this.showKamStatusFilterDropdown && !event.target.closest(".filter-dropdown") && !event.target.closest(".filter-icon")) {
        this.showKamStatusFilterDropdown = false;
      }
    },

    // Save all filter selections to localStorage
    saveFiltersToLocalStorage() {
      try {
        // Save date range
        localStorage.setItem("okam_overview_date_from", this.dateRange.from);
        localStorage.setItem("okam_overview_date_to", this.dateRange.to);

        // Save KAM filters
        localStorage.setItem("okam_overview_kam_filters", JSON.stringify(this.selectedKamFilters));

        // Save KAM status filters
        localStorage.setItem("okam_overview_kam_status_filters", JSON.stringify(this.selectedKamStatusFilters));

        // Save sort settings
        localStorage.setItem("okam_overview_sort_key", this.sortKey);
        localStorage.setItem("okam_overview_sort_order", this.sortOrder);
      } catch (error) {
        console.error("Error saving filters to localStorage:", error);
      }
    },

    // Load all filter selections from localStorage
    loadFiltersFromLocalStorage() {
      try {
        // Load date range
        const savedDateFrom = localStorage.getItem("okam_overview_date_from");
        const savedDateTo = localStorage.getItem("okam_overview_date_to");
        if (savedDateFrom && savedDateTo) {
          this.dateRange.from = savedDateFrom;
          this.dateRange.to = savedDateTo;
        }

        // Load KAM filters
        const savedKamFilters = localStorage.getItem("okam_overview_kam_filters");
        if (savedKamFilters) {
          this.selectedKamFilters = JSON.parse(savedKamFilters);
          this.tempSelectedKamFilters = [...this.selectedKamFilters];
        }

        // Load KAM status filters
        const savedKamStatusFilters = localStorage.getItem("okam_overview_kam_status_filters");
        if (savedKamStatusFilters) {
          this.selectedKamStatusFilters = JSON.parse(savedKamStatusFilters);
        }

        // Load sort settings
        const savedSortKey = localStorage.getItem("okam_overview_sort_key");
        const savedSortOrder = localStorage.getItem("okam_overview_sort_order");
        if (savedSortKey) {
          this.sortKey = savedSortKey;
        }
        if (savedSortOrder) {
          this.sortOrder = savedSortOrder;
        }
      } catch (error) {
        console.error("Error loading filters from localStorage:", error);
      }
    },
  },
};
</script>

<style scoped>
.overview {
  padding: 1rem;
}

.overview__content {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
}

.overview__filters {
  display: flex;
  flex-direction: column;
  margin-bottom: 1.5rem;
}

@media (min-width: 768px) {
  .overview__filters {
    flex-direction: row;
  }
}

.overview__filter {
  display: flex;
  align-items: center;
  margin-right: 1rem;
  margin-bottom: 1rem;
}

@media (min-width: 768px) {
  .overview__filter {
    margin-bottom: 0;
  }
}

.overview__filter label {
  margin-right: 0.5rem;
  font-weight: 500;
}

.date-selection {
  display: flex;
  align-items: center;
  width: 100%;
}

.date-picker-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  position: relative;
  width: 100%;
}

@media (min-width: 640px) {
  .date-picker-wrapper {
    flex-direction: row;
    align-items: flex-end;
  }
}

.date-input {
  display: flex;
  flex-direction: column;
  width: 100%;
}

@media (min-width: 640px) {
  .date-input {
    width: auto;
  }
}

.date-input label {
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  color: #4a5568;
  font-weight: 500;
}

.date-input input {
  padding: 0.5rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.25rem;
  background-color: white;
  width: 100%;
}

@media (min-width: 640px) {
  .date-input input {
    width: auto;
  }
}

.date-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.loading-container {
  display: inline-flex;
  margin-left: 8px;
  height: 32px;
  align-items: center;
}

.date-button {
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  background-color: #f8f9fa;
  color: #292c34;
  border-color: #e2e8f0;
  height: 32px;
  /* Set a fixed height for buttons */
  line-height: 1;
}

.date-button:hover {
  background-color: #f0f2f5;
}

.date-button-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
}

.overview__table-container {
  overflow-x: auto;
  position: relative;
  margin: 0 -1rem;
  padding: 0 1rem;
  -webkit-overflow-scrolling: touch;
  min-height: 500px;
  position: relative;
}

/* Add scroll indicators */
.overview__table-container::before,
.overview__table-container::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  width: 10px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}

.overview__table-container::before {
  left: 0;
  background: linear-gradient(to right, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0));
}

.overview__table-container::after {
  right: 0;
  background: linear-gradient(to left, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0));
}

.overview__table-container.scroll-left::before {
  opacity: 1;
}

.overview__table-container.scroll-right::after {
  opacity: 1;
}

.overview__table {
  width: 100%;
  border-collapse: collapse;
  min-width: 650px; /* Ensure minimum width for scrolling */
  min-height: 100px;
}

.overview__table th,
.overview__table td {
  padding: 0.75rem 0.5rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  white-space: nowrap;
}

@media (min-width: 768px) {
  .overview__table th,
  .overview__table td {
    padding: 0.75rem 1rem;
  }
}

.overview__table th {
  background-color: #f7fafc;
  font-weight: 600;
  font-size: 0.875rem;
}

@media (min-width: 768px) {
  .overview__table th {
    font-size: 1rem;
  }
}

.overview__table td {
  font-size: 0.875rem;
}

@media (min-width: 768px) {
  .overview__table td {
    font-size: 1rem;
  }
}

@media (max-width: 767px) {
  /* Adjust KAM columns for mobile */
  .kam-status-dropdown,
  .kam-input,
  .kam-textarea {
    min-width: 80px;
    max-width: 120px;
    padding: 6px 8px;
    font-size: 12px;
    background-position: right 8px top 50%;
    background-size: 10px auto;
  }

  .kam-textarea {
    min-height: 60px;
    max-height: 80px;
  }

  /* Make table more compact on mobile */
  .overview__table th,
  .overview__table td {
    padding: 0.5rem 0.25rem;
  }
}

.sortable-header {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.sortable-header:hover {
  background-color: #edf2f7;
}

.sort-icon {
  display: inline-block;
  margin-left: 0.25rem;
  font-size: 0.75rem;
}

.overview__table thead tr {
  min-height: 48px;
}

.overview__empty {
  text-align: center;
  padding: 2rem !important;
  color: #718096;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
}

.status-badge--approved {
  background-color: #c6f6d5;
  color: #2f855a;
}

.status-badge--pending {
  background-color: #fed7d7;
  color: #c53030;
}

.status-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 1s linear infinite;
}

.status-badge--pending .status-spinner {
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #c53030;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }

  100% {
    transform: rotate(360deg);
  }
}

.kam-leaderboard-container {
  margin: 1rem 0 1.5rem;
  padding: 0.75rem;
  background-color: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.kam-leaderboard-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #2d3748;
}

.kam-leaderboard-scroll {
  display: flex;
  overflow-x: auto;
  padding: 0.25rem 0;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
}

.kam-leaderboard-scroll::-webkit-scrollbar {
  height: 6px;
}

.kam-leaderboard-scroll::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 3px;
}

.kam-leaderboard-scroll::-webkit-scrollbar-thumb {
  background-color: #cbd5e0;
  border-radius: 3px;
}

.kam-card {
  flex: 0 0 auto;
  margin-right: 1rem;
  margin-bottom: 0.5rem;
  padding: 0;
  border-radius: 8px;
  width: 240px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  background-color: white;
}

.kam-card:hover {
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.08);
}

.kam-card--first {
  border-color: #ffd700;
}

.kam-card--second {
  border-color: #c0c0c0;
}

.kam-card--third {
  border-color: #cd7f32;
}

.kam-card__rank {
  text-align: center;
  padding: 0.5rem 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
  background-color: #4a5568;
}

.kam-card__rank--1 {
  background-color: #ffd700;
  color: #000;
}

.kam-card__rank--2 {
  background-color: #c0c0c0;
  color: #000;
}

.kam-card__rank--3 {
  background-color: #cd7f32;
  color: #000;
}

.kam-card__content {
  padding: 1rem;
}

.kam-card__name {
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #2d3748;
  text-align: center;
  border-bottom: 1px solid #edf2f7;
  padding-bottom: 0.5rem;
}

.kam-card__earnings {
  margin-bottom: 0.5rem;
  padding: 0.5rem;
  border-radius: 4px;
  background-color: #f7fafc;
}

.kam-card__earnings--highlight {
  background-color: #f0f9ff;
  border-left: 2px solid #4299e1;
}

.kam-card__earnings-label {
  font-size: 0.875rem;
  color: #718096;
  margin-bottom: 0.25rem;
}

.kam-card__earnings-value {
  font-size: 1rem;
  font-weight: 600;
  color: #2d3748;
}

@media (max-width: 640px) {
  .kam-card {
    width: 220px;
  }
}

.filter-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.5rem;
  position: relative;
  cursor: pointer;
  color: #4a5568;
  background-color: #f0f2f5;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.filter-icon:hover {
  color: #2d3748;
  background-color: #e2e8f0;
  transform: scale(1.05);
}

.filter-icon.active {
  background-color: #ebf5ff;
  color: #3182ce;
}

.filter-icon-svg {
  width: 16px;
  height: 16px;
}

.filter-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background-color: white;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  z-index: 50;
  width: 450px;
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  /* Ensure dropdown is visible regardless of table content */
  min-height: 50px;
  transform-origin: top right;
}

.filter-dropdown-options {
  padding: 0.5rem 0;
  max-height: 250px;
  overflow-y: auto;
}

.filter-dropdown-options label {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.filter-dropdown-options label:hover {
  background-color: #f7fafc;
}

.filter-dropdown-options input[type="checkbox"] {
  margin-right: 0.5rem;
}

.info-icon {
  position: relative;
  display: inline-flex;
  margin-left: 5px;
  cursor: help;
  vertical-align: middle;
}

.info-icon svg {
  color: #666;
}

.info-icon:hover svg {
  color: #333;
}

.status-info-tooltip {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  padding: 10px 15px;
  width: 450px;
  z-index: 100;
  text-align: left;
  margin-top: 5px;
}

.info-icon:hover .status-info-tooltip {
  display: block;
}

.status-info-tooltip h4 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
}

.status-info-tooltip ul {
  margin: 0;
  padding-left: 15px;
}

.status-info-tooltip li {
  margin-bottom: 5px;
  font-size: 12px;
  color: #555;
}

.status-info-tooltip strong {
  color: #333;
}

.kam-status-dropdown,
.kam-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: white;
  font-size: 14px;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23007CB2%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.6%205.4-7.9%205.4-12.9%200-5-1.9-9.2-5.5-12.7z%22%2F%3E%3C%2Fsvg%3E");
  background-repeat: no-repeat;
  background-position: right 12px top 50%;
  background-size: 12px auto;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.kam-status-dropdown:focus,
.kam-input:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
}

.kam-status-dropdown:hover,
.kam-input:hover {
  border-color: #a0aec0;
}

.kam-textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background-color: white;
  font-size: 14px;
  resize: vertical;
  min-height: 80px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.kam-textarea:focus {
  outline: none;
  border-color: #4a90e2;
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.2);
}

.kam-textarea:hover {
  border-color: #a0aec0;
}
</style>
