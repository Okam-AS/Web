<template>
  <AdminPage :full-width="true">
    <div class="overview">
      <div class="overview__content">
        <div class="overview__table-container">
          <div class="overview__header">
            <h3>KAM-Direktør Relasjoner</h3>
            <button
              class="overview__button"
              @click="showAssignManagerModal"
            >
              Tildel Direktør til KAM
            </button>
          </div>
          <table class="overview__table">
            <thead>
              <tr>
                <th class="sortable-header">Key Account Manager</th>
                <th class="sortable-header">Telefonnummer</th>
                <th class="sortable-header">Direktør</th>
                <th class="sortable-header">Direktør Telefon</th>
                <th>Handlinger</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(relationship, index) in relationships"
                :key="index"
              >
                <td>{{ relationship.keyAccountManager.name }}</td>
                <td>{{ relationship.keyAccountManager.phoneNumber }}</td>
                <td>{{ relationship.director.name }}</td>
                <td>{{ relationship.director.phoneNumber }}</td>
                <td>
                  <div class="action-buttons">
                    <button
                      class="action-button action-button--edit"
                      @click="editRelationship(relationship)"
                    >
                      Endre
                    </button>
                    <button
                      class="action-button action-button--reject"
                      @click="confirmUnassignManager(relationship)"
                    >
                      Fjern
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="relationships.length === 0">
                <td
                  colspan="5"
                  class="overview__empty"
                >
                  Ingen KAM-Direktør relasjoner funnet
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Assign Manager Modal -->
        <Modal
          v-if="showAssignModal"
          :wide="true"
          @close="closeAssignModal"
        >
          <div style="width: 600px; max-width: 90vw; margin: 0 auto; text-align: center">
            <h1 style="margin-bottom: 1em">
              {{ isEditMode ? "Endre KAM-Direktør Relasjon" : "Tildel Direktør til KAM" }}
            </h1>
            <form @submit.prevent="saveAssignment">
              <div class="form-group">
                <label for="kamSelect">Key Account Manager</label>
                <br />
                <select
                  id="kamSelect"
                  v-model="currentAssignment.kamId"
                  class="form-select"
                  required
                >
                  <option
                    value=""
                    disabled
                  >
                    Velg en Key Account Manager
                  </option>
                  <option
                    v-for="kam in kamUsers"
                    :key="kam.id"
                    :value="kam.id"
                  >
                    {{ kam.name }} ({{ kam.phoneNumber }})
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label for="directorSelect">Direktør</label>
                <br />
                <select
                  id="directorSelect"
                  v-model="currentAssignment.directorId"
                  class="form-select"
                  required
                >
                  <option
                    value=""
                    disabled
                  >
                    Velg en Direktør
                  </option>
                  <option
                    v-for="director in kamUsers"
                    :key="director.id"
                    :value="director.id"
                  >
                    {{ director.name }} ({{ director.phoneNumber }})
                  </option>
                </select>
              </div>

              <div class="modal-buttons">
                <input
                  class="emoji-btn"
                  type="button"
                  value="Avbryt"
                  @click="closeAssignModal"
                />
                <input
                  class="emoji-btn save-btn"
                  type="submit"
                  value="Lagre"
                  :disabled="isLoading"
                />
              </div>
            </form>
          </div>
        </Modal>

        <!-- Unassign Confirmation Modal -->
        <Modal
          v-if="showUnassignModal"
          :wide="true"
          @close="closeUnassignModal"
        >
          <div style="width: 500px; max-width: 90vw; margin: 0 auto; text-align: center">
            <h1 style="margin-bottom: 1em">Bekreft Fjerning</h1>
            <p>
              Er du sikker på at du vil fjerne direktøren fra denne Key Account Manager?
            </p>
            <div class="modal-buttons">
              <input
                class="emoji-btn"
                type="button"
                value="Avbryt"
                @click="closeUnassignModal"
              />
              <input
                class="emoji-btn action-button--reject"
                type="button"
                value="Fjern"
                @click="unassignManager"
              />
            </div>
          </div>
        </Modal>

        <!-- Loading Overlay -->
        <div
          v-if="isLoading"
          class="visible-loader"
        >
          <div class="loader-content">
            <div class="spinner" />
            <p>Laster...</p>
          </div>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "@/components/organisms/AdminPage.vue";
import Modal from "@/components/atoms/Modal.vue";

export default {
  components: { AdminPage, Modal },

  data() {
    return {
      relationships: [],
      kamUsers: [],
      isLoading: false,
      showAssignModal: false,
      showUnassignModal: false,
      isEditMode: false,
      currentAssignment: {
        kamId: "",
        directorId: "",
      },
      selectedKamId: "",
      refreshInterval: null,
    };
  },

  computed: {
    isPowerUser() {
      return this.$store.state?.currentUser?.isPowerUser;
    },
  },

  mounted() {
    if (!this.isPowerUser) {
      this.$router.push("/admin");
      return;
    }

    this.fetchData();

    // Set up auto-refresh every 30 seconds
    this.refreshInterval = setInterval(() => {
      this.fetchDataInBackground();
    }, 30000);
  },

  beforeDestroy() {
    // Clear the interval when component is destroyed
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },

  methods: {
    async fetchData() {
      this.isLoading = true;
      try {
        await Promise.all([this.fetchRelationships(), this.fetchKamUsers()]);
      } catch (error) {
        console.error("Error fetching data:", error);
        alert("Kunne ikke laste data. Vennligst prøv igjen.");
      } finally {
        this.isLoading = false;
      }
    },

    async fetchDataInBackground() {
      try {
        await Promise.all([this.fetchRelationships(), this.fetchKamUsers()]);
      } catch (error) {
        console.error("Error refreshing data:", error);
      }
    },

    async fetchRelationships() {
      try {
        this.relationships = await this._kamService.GetKamDirectorRelationships();
      } catch (error) {
        console.error("Error fetching relationships:", error);
        throw error;
      }
    },

    async fetchKamUsers() {
      try {
        this.kamUsers = await this._kamService.GetAllKeyAccountManagers();
      } catch (error) {
        console.error("Error fetching KAM users:", error);
        throw error;
      }
    },

    showAssignManagerModal() {
      this.isEditMode = false;
      this.currentAssignment = {
        kamId: "",
        directorId: "",
      };
      this.showAssignModal = true;
    },

    editRelationship(relationship) {
      this.isEditMode = true;
      this.currentAssignment = {
        kamId: relationship.keyAccountManager.id,
        directorId: relationship.director.id,
      };
      this.showAssignModal = true;
    },

    confirmUnassignManager(relationship) {
      this.selectedKamId = relationship.keyAccountManager.id;
      this.showUnassignModal = true;
    },

    closeAssignModal() {
      this.showAssignModal = false;
    },

    closeUnassignModal() {
      this.showUnassignModal = false;
      this.selectedKamId = "";
    },

    async saveAssignment() {
      if (!this.currentAssignment.kamId || !this.currentAssignment.directorId) {
        alert("Vennligst velg både en Key Account Manager og en Direktør");
        return;
      }

      this.isLoading = true;
      try {
        const result = await this._kamService.AssignManager(this.currentAssignment.kamId, this.currentAssignment.directorId);

        if (result) {
          this.closeAssignModal();
          await this.fetchRelationships();
        } else {
          alert("Kunne ikke lagre tildelingen. Vennligst prøv igjen.");
        }
      } catch (error) {
        console.error("Error saving assignment:", error);
        alert("En feil oppstod under lagring. Vennligst prøv igjen.");
      } finally {
        this.isLoading = false;
      }
    },

    async unassignManager() {
      if (!this.selectedKamId) {
        alert("Ingen Key Account Manager valgt");
        return;
      }

      this.isLoading = true;
      try {
        const result = await this._kamService.UnassignManager(this.selectedKamId);

        if (result) {
          this.closeUnassignModal();
          await this.fetchRelationships();
        } else {
          alert("Kunne ikke fjerne direktøren. Vennligst prøv igjen.");
        }
      } catch (error) {
        console.error("Error unassigning manager:", error);
        alert("En feil oppstod under fjerning av direktøren. Vennligst prøv igjen.");
      } finally {
        this.isLoading = false;
      }
    },
  },
};
</script>

<style scoped>
.overview__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.overview__button {
  background-color: #333;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.25rem;
  cursor: pointer;
}

.overview__button:hover {
  background-color: #555;
}

.overview__table-container {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.overview__table {
  width: 100%;
  border-collapse: collapse;
}

.overview__table th,
.overview__table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.overview__table th {
  font-weight: 600;
  color: #4a5568;
}

.overview__table tbody tr:hover {
  background-color: #f7fafc;
}

.overview__empty {
  text-align: center;
  color: #a0aec0;
  padding: 2rem 0;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
}

.action-button {
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
  border: none;
}

.action-button--edit {
  background-color: #ebf8ff;
  color: #333;
}

.action-button--edit:hover {
  background-color: #bee3f8;
}

.action-button--reject {
  background-color: #fed7d7;
  color: #c53030;
}

.action-button--reject:hover {
  background-color: #feb2b2;
}

.form-group {
  margin-bottom: 1.5rem;
  text-align: left;
}

.form-group label {
  display: inline-block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #4a5568;
}

.form-select {
  width: 100%;
  padding: 0.625rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #e2e8f0;
  background-color: white;
  transition: all 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 0.5rem center;
  background-repeat: no-repeat;
  background-size: 1.5em 1.5em;
}

.form-select:focus {
  outline: none;
  border-color: #333;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-buttons {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
}

.emoji-btn {
  cursor: pointer;
  padding: 0.625rem 1.25rem;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s;
  min-width: 120px;
}

.emoji-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.emoji-btn.save-btn {
  background-color: #4a5568;
  color: white;
  border-color: #4a5568;
}

.emoji-btn.save-btn:hover {
  background-color: #2d3748;
}

.emoji-btn.save-btn:disabled {
  background-color: #a0aec0;
  border-color: #a0aec0;
  cursor: not-allowed;
}

.visible-loader {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.loader-content {
  background-color: white;
  padding: 2rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.spinner {
  display: inline-block;
  width: 2rem;
  height: 2rem;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #333;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 0.5rem;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
