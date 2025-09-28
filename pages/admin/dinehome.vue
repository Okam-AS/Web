<template>
  <AdminPage>
    <div class="dinehome-page">
      <div class="date-picker-section">
        <h2>DineHome leveringstider</h2>
        <p style="margin-bottom: 1.5em">
          Her kan du se leveringstider fra DineHome for dine butikker.
        </p>
        <div class="date-picker-container">
          <div class="date-picker-wrapper">
            <button
              class="date-nav-btn"
              @click="changeDate(-1)"
            >
              <span>←</span>
            </button>
            <div class="date-input">
              <label>Velg dato:</label>
              <input
                v-model="selectedDate"
                type="date"
                @change="handleDateChange"
              />
            </div>
            <button
              class="date-nav-btn"
              :style="{ visibility: isFutureOrToday ? 'hidden' : 'visible' }"
              @click="changeDate(1)"
            >
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="deliveryTimes.length"
        class="delivery-count"
      >
        Resultat: {{ deliveryTimes.length }} leveringer
      </div>

      <Loading
        v-if="isLoading"
        :loading="true"
      />

      <div
        v-else-if="deliveryTimes.length"
        class="delivery-times-table"
      >
        <div class="delivery-time-row header">
          <div
            class="col store-name sortable"
            @click="handleColumnClick($event, 'storeName')"
          >
            Butikk
            <span
              v-if="sortField === 'storeName'"
              class="sort-icon"
            >
              {{ sortDirection === "asc" ? "↑" : "↓" }}
            </span>
            <div
              class="resize-handle"
              @mousedown="startResize($event, 0)"
            />
          </div>
          <div
            class="col order-id sortable"
            @click="handleColumnClick($event, 'friendlyOrderId')"
          >
            #
            <span
              v-if="sortField === 'friendlyOrderId'"
              class="sort-icon"
            >
              {{ sortDirection === "asc" ? "↑" : "↓" }}
            </span>
            <div
              class="resize-handle"
              @mousedown="startResize($event, 1)"
            />
          </div>
          <div
            class="col sortable"
            @click="handleColumnClick($event, 'estimatedProcessingEndTime')"
          >
            Avtalt klar
            <span
              v-if="sortField === 'estimatedProcessingEndTime'"
              class="sort-icon"
            >
              {{ sortDirection === "asc" ? "↑" : "↓" }}
            </span>
            <div
              class="resize-handle"
              @mousedown="startResize($event, 2)"
            />
          </div>
          <div
            class="col sortable"
            @click="handleColumnClick($event, 'processingEndTime')"
          >
            Faktisk klar
            <span
              v-if="sortField === 'processingEndTime'"
              class="sort-icon"
            >
              {{ sortDirection === "asc" ? "↑" : "↓" }}
            </span>
            <div
              class="resize-handle"
              @mousedown="startResize($event, 3)"
            />
          </div>
          <div
            class="col sortable"
            @click="handleColumnClick($event, 'completedTime')"
          >
            Fullført
            <span
              v-if="sortField === 'completedTime'"
              class="sort-icon"
            >
              {{ sortDirection === "asc" ? "↑" : "↓" }}
            </span>
            <div
              class="resize-handle"
              @mousedown="startResize($event, 4)"
            />
          </div>
          <div
            class="col sortable"
            @click="handleColumnClick($event, 'drivingTimeInMinutes')"
          >
            Leveringstid
            <span
              v-if="sortField === 'drivingTimeInMinutes'"
              class="sort-icon"
            >
              {{ sortDirection === "asc" ? "↑" : "↓" }}
            </span>
            <div
              class="resize-handle"
              @mousedown="startResize($event, 5)"
            />
          </div>
        </div>
        <div
          v-for="time in sortedDeliveryTimes"
          :key="time.dineHomeOrderId"
          class="delivery-time-row"
        >
          <div class="col store-name">
            {{ time.storeName }}
          </div>
          <div class="col order-id">
            {{ time.friendlyOrderId }}
          </div>
          <div class="col">
            {{ formatDate(time.estimatedProcessingEndTime) || "-" }}
          </div>
          <div
            class="col clickable"
            @click="toggleTimeDisplay"
          >
            <span v-if="showActualTime">
              {{ formatDate(time.processingEndTime) || "-" }}
            </span>
            <span v-else>
              {{ getTimeDiff(time.estimatedProcessingEndTime, time.processingEndTime) }}
            </span>
          </div>
          <div class="col">
            {{ formatDate(time.completedTime) || "-" }}
          </div>
          <div class="col">{{ calculateActualDrivingTime(time) }} minutter</div>
        </div>
      </div>
      <div
        v-else-if="!isLoading"
        class="empty-state"
      >
        Ingen leveringstider funnet i valgt periode. Har du ikke en DineHome-avtale? Kontakt hei@okam.no for å komme i gang.
      </div>

      <LoginModal
        v-if="showLogin"
        @close="closeLoginModal"
      />
    </div>
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
    deliveryTimes: [],
    selectedDate: new Date().toISOString().split("T")[0],
    sortField: "drivingTimeInMinutes",
    sortDirection: "desc",
    showActualTime: false,
    columnWidths: [160, 70, 130, 130, 130, 100],
    resizing: null,
    isResizing: false,
  }),
  computed: {
    sortedDeliveryTimes() {
      return [...this.deliveryTimes].sort((a, b) => {
        let aVal = a[this.sortField];
        let bVal = b[this.sortField];

        // Handle drivingTimeInMinutes calculation
        if (this.sortField === "drivingTimeInMinutes") {
          aVal = this.calculateActualDrivingTime(a);
          bVal = this.calculateActualDrivingTime(b);
        }
        // Handle processingEndTime diff sorting
        else if (this.sortField === "processingEndTime") {
          const getDiff = (time) => {
            if (!time || !time.estimatedProcessingEndTime || !time.processingEndTime || time.processingEndTime === "0001-01-01T00:00:00") {
              return null;
            }
            return Math.round((new Date(time.processingEndTime) - new Date(time.estimatedProcessingEndTime)) / (1000 * 60));
          };
          aVal = getDiff(a);
          bVal = getDiff(b);
          // Handle null values
          if (aVal === null) {
            return 1;
          }
          if (bVal === null) {
            return -1;
          }
        }
        // Handle other date fields
        else if (["estimatedProcessingEndTime", "completedTime"].includes(this.sortField)) {
          aVal = aVal && aVal !== "0001-01-01T00:00:00" ? new Date(aVal).getTime() : 0;
          bVal = bVal && bVal !== "0001-01-01T00:00:00" ? new Date(bVal).getTime() : 0;
        }
        // Handle numeric field
        else if (this.sortField === "drivingTimeInMinutes") {
          aVal = Number(aVal);
          bVal = Number(bVal);
        }
        // Handle string fields
        else {
          aVal = aVal || "";
          bVal = bVal || "";
        }

        if (this.sortDirection === "asc") {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        }
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      });
    },
    isFutureOrToday() {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(this.selectedDate);
      return selected >= today;
    },
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true;
      return;
    }
    this.fetchDeliveryTimes();
  },
  beforeDestroy() {
    // Cleanup event listeners
    window.removeEventListener("mousemove", this.handleResize);
    window.removeEventListener("mouseup", this.stopResize);
  },
  methods: {
    closeLoginModal(isLoggedIn) {
      this.showLogin = !isLoggedIn;
      if (isLoggedIn) {
        this.fetchDeliveryTimes();
      }
    },
    async fetchDeliveryTimes() {
      this.isLoading = true;
      try {
        const storeIds = this.$store.state.currentUser.adminIn.map((store) => store.id);
        const request = {
          dateFrom: new Date(this.selectedDate),
          dateTo: new Date(this.selectedDate),
          storeIds,
        };

        this.deliveryTimes = await this._dineHomeService.getDeliveryTimes(request);
      } catch (error) {
        console.error("Failed to fetch delivery times:", error);
      } finally {
        this.isLoading = false;
      }
    },
    formatDate(date) {
      if (!date || date === "0001-01-01T00:00:00") {
        return null;
      }
      return new Date(date).toLocaleString("no-NO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },
    getTimeDiff(estimated, actual) {
      if (!estimated || !actual || actual === "0001-01-01T00:00:00") {
        return "-";
      }
      const diff = Math.round((new Date(actual) - new Date(estimated)) / (1000 * 60));
      if (diff === 0) {
        return "Presist";
      }
      return diff > 0 ? `${diff} min senere` : `${Math.abs(diff)} min tidligere`;
    },
    handleColumnClick(event, field) {
      if (!this.isResizing) {
        this.sort(field);
      }
    },
    startResize(event, columnIndex) {
      event.stopPropagation();
      this.isResizing = true;
      this.resizing = {
        columnIndex,
        startX: event.pageX,
        startWidth: this.columnWidths[columnIndex],
      };

      window.addEventListener("mousemove", this.handleResize);
      window.addEventListener("mouseup", this.stopResize);
    },

    handleResize(event) {
      if (!this.resizing) {
        return;
      }

      const diff = event.pageX - this.resizing.startX;
      const newWidth = Math.max(50, this.resizing.startWidth + diff);
      this.columnWidths[this.resizing.columnIndex] = newWidth;

      // Update grid template columns
      const columns = this.columnWidths.map((width) => `minmax(${width}px, ${width}fr)`).join(" ");
      document.querySelectorAll(".delivery-time-row").forEach((row) => {
        row.style.gridTemplateColumns = columns;
      });
    },

    stopResize() {
      this.resizing = null;
      // Add small delay to prevent sort trigger on mouseup
      setTimeout(() => {
        this.isResizing = false;
      }, 150);

      window.removeEventListener("mousemove", this.handleResize);
      window.removeEventListener("mouseup", this.stopResize);
    },
    sort(field) {
      if (this.sortField === field) {
        this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
      } else {
        this.sortField = field;
        this.sortDirection = "asc";
      }
    },
    toggleTimeDisplay() {
      this.showActualTime = !this.showActualTime;
    },
    calculateActualDrivingTime(time) {
      if (!time.completedTime || !time.estimatedProcessingEndTime || !time.processingEndTime) {
        return time.drivingTimeInMinutes || 0;
      }

      const completed = new Date(time.completedTime);
      const estimated = new Date(time.estimatedProcessingEndTime);
      const actual = new Date(time.processingEndTime);

      // Use the later time between estimated and actual processing end time
      const startTime = actual > estimated ? actual : estimated;

      return Math.round((completed - startTime) / (1000 * 60));
    },
    handleDateChange() {
      this.fetchDeliveryTimes();
    },
    changeDate(days) {
      const date = new Date(this.selectedDate);
      date.setDate(date.getDate() + days);
      this.selectedDate = date.toISOString().split("T")[0];
      this.fetchDeliveryTimes();
    },
  },
};
</script>

<style lang="scss" scoped>
.dinehome-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 8px;
  }
}

.date-picker-section {
  margin-bottom: 32px;
  text-align: center;

  h2 {
    margin-bottom: 24px;
    color: #292c34;
  }
}

.date-picker-container {
  display: flex;
  justify-content: center;
}

.date-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 16px;
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  @media (max-width: 768px) {
    flex-direction: column;
    width: 100%;
    max-width: none;
    border-radius: 0;
    margin: 0 -8px;
    box-shadow: none;
  }
}

.date-input {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-weight: 500;
    color: #4a5568;
  }

  input {
    padding: 8px 12px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.95em;
    transition: all 0.2s ease;

    &:focus {
      border-color: #1bb776;
      outline: none;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }
  }
}

.delivery-times-table {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-x: auto;

  @media (max-width: 768px) {
    position: relative;
    display: block;
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
    border-radius: 0;
    margin: 0 -8px;
  }
}

.delivery-time-row {
  display: grid;
  grid-template-columns:
    minmax(160px, 1.5fr) minmax(70px, 0.8fr) minmax(130px, 1.2fr)
    minmax(130px, 1.2fr) minmax(130px, 1.2fr) minmax(100px, 1fr);
  gap: 16px;
  padding: 12px 20px;
  align-items: center;
  background: white;

  @media (max-width: 768px) {
    grid-template-columns:
      minmax(180px, 2fr) minmax(50px, 0.5fr) minmax(130px, 1.2fr)
      minmax(130px, 1.2fr) minmax(130px, 1.2fr) minmax(100px, 1fr);
    padding: 12px 16px;
    gap: 12px;
  }

  &:not(.header):hover {
    background: #f8fafc;
  }

  // Prevent text overflow
  .col {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col {
    position: relative;

    &.sortable {
      cursor: pointer;
    }
  }

  &.header {
    position: sticky;
    top: 0;
    background: white;
    z-index: 1;
    border-bottom: 1px solid #e2e8f0;
    font-weight: 500;
  }
}

.empty-state {
  text-align: center;
  padding: 48px;
  color: #718096;
  font-style: italic;
  background: #f8f9fa;
  border-radius: 12px;
  margin-top: 24px;
}

.sort-icon {
  font-size: 14px;
  color: #1bb776;
}

.clickable {
  cursor: pointer;

  &:hover {
    color: #1bb776;
  }
}

.resize-handle {
  position: absolute;
  right: -8px;
  top: 0;
  bottom: 0;
  width: 16px;
  cursor: col-resize;
  z-index: 2;

  &:hover::after,
  &:active::after {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    right: 8px;
    width: 2px;
    background: #1bb776;
  }

  &:active::after {
    background: #159c63;
  }
}

// Prevent text selection while resizing
.resizing {
  user-select: none;
  -webkit-user-select: none;

  * {
    cursor: col-resize !important;
  }
}

.delivery-count {
  text-align: center;
  margin-bottom: 16px;
  color: #4a5568;
  font-weight: 500;
}

.date-nav-btn {
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  color: #4a5568;
  font-size: 1.5em;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border-radius: 8px;

  &:hover {
    background: #f7fafc;
    color: #1bb776;
  }

  &:active {
    transform: scale(0.95);
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
  }
}
</style>
