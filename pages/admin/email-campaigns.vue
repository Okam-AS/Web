<template>
  <AdminPage>
    <div class="email-campaigns-page">
      <!-- Page Header -->
      <div class="page-header">
        <h1>E-postkampanjer</h1>
        <p>Send malrettede e-poster til dine lojalitetsmedlemmer</p>
      </div>

      <!-- Disabled state for stores without reward program -->
      <div v-if="!hasRewardProgram && !isLoading" class="disabled-notice">
        <span class="material-icons">info</span>
        <div>
          <h3>Lojalitetsprogram kreves</h3>
          <p>E-postkampanjer er kun tilgjengelig for butikker med et aktivt lojalitetsprogram. Kontakt Okam for a aktivere dette.</p>
        </div>
      </div>

      <template v-else>
        <!-- Controls -->
        <div class="controls-section">
          <div class="controls-row">
            <div class="search-input">
              <span class="material-icons search-icon">search</span>
              <input
                v-model="searchFilter"
                type="text"
                placeholder="Sok i kampanjer..."
                class="search-field"
              />
            </div>
            <button class="new-campaign-btn" @click="createNewCampaign">
              <i class="fas fa-plus" /> Ny kampanje
            </button>
          </div>
        </div>

        <!-- Loading -->
        <LoadingSkeleton v-if="isLoading" />

        <!-- Campaign List -->
        <EmailCampaignList
          v-else
          :campaigns="filteredCampaigns"
          @select="selectCampaign"
          @create="createNewCampaign"
        />
      </template>

      <!-- Editor Panel -->
      <EmailCampaignEditor
        :campaign="selectedCampaign"
        :store-id="selectedStore || 0"
        @close="closeCampaign"
        @updated="onCampaignUpdated"
      />

      <!-- New Campaign Modal -->
      <div v-if="showNewModal" class="modal-overlay" @click.self="showNewModal = false">
        <div class="new-campaign-modal">
          <h3>Ny e-postkampanje</h3>
          <p class="modal-description">Gi kampanjen et navn for a komme i gang</p>
          <div class="form-group">
            <label>Kampanjenavn</label>
            <input
              ref="newNameInput"
              v-model="newCampaignName"
              type="text"
              placeholder="F.eks. Varkampanje 2026"
              @keyup.enter="confirmNewCampaign"
              @keyup.esc="showNewModal = false"
            />
          </div>
          <div class="form-group">
            <label>Emne</label>
            <input
              v-model="newCampaignSubject"
              type="text"
              placeholder="Emnelinjen mottakerne ser"
              @keyup.enter="confirmNewCampaign"
            />
          </div>
          <div class="modal-actions">
            <button class="modal-btn-secondary" @click="showNewModal = false">
              Avbryt
            </button>
            <button
              class="modal-btn-primary"
              :disabled="!newCampaignName.trim() || isCreating"
              @click="confirmNewCampaign"
            >
              {{ isCreating ? 'Oppretter...' : 'Opprett kampanje' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import LoadingSkeleton from '~/components/molecules/LoadingSkeleton.vue'
import EmailCampaignList from '~/components/admin/EmailCampaignList.vue'
import EmailCampaignEditor from '~/components/admin/EmailCampaignEditor.vue'

export default {
  components: {
    AdminPage,
    LoadingSkeleton,
    EmailCampaignList,
    EmailCampaignEditor
  },
  data() {
    return {
      campaigns: [],
      selectedCampaign: null,
      isLoading: false,
      hasRewardProgram: true,
      searchFilter: '',
      showNewModal: false,
      newCampaignName: '',
      newCampaignSubject: '',
      isCreating: false
    }
  },
  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore
    },
    filteredCampaigns() {
      if (!this.searchFilter) return this.campaigns
      const filter = this.searchFilter.toLowerCase()
      return this.campaigns.filter(c =>
        (c.name && c.name.toLowerCase().includes(filter)) ||
        (c.subject && c.subject.toLowerCase().includes(filter))
      )
    }
  },
  watch: {
    selectedStore(val) {
      if (val > 0) {
        this.loadCampaigns()
      } else {
        this.campaigns = []
      }
    }
  },
  mounted() {
    if (this.selectedStore > 0) {
      this.loadCampaigns()
    }
  },
  methods: {
    async loadCampaigns() {
      this.isLoading = true
      try {
        this.campaigns = await this._emailCampaignService.GetCampaigns(this.selectedStore)
        this.hasRewardProgram = true
      } catch (err) {
        if (err.message && err.message.includes('lojalitetsprogram')) {
          this.hasRewardProgram = false
        }
        console.error('Load campaigns error:', err)
        this.campaigns = []
      } finally {
        this.isLoading = false
      }
    },
    async selectCampaign(campaign) {
      try {
        const detail = await this._emailCampaignService.GetCampaign(this.selectedStore, campaign.emailCampaignId)
        this.selectedCampaign = detail
      } catch (err) {
        console.error('Load campaign error:', err)
      }
    },
    closeCampaign() {
      this.selectedCampaign = null
      this.loadCampaigns()
    },
    createNewCampaign() {
      this.newCampaignName = ''
      this.newCampaignSubject = ''
      this.showNewModal = true
      this.$nextTick(() => {
        if (this.$refs.newNameInput) {
          this.$refs.newNameInput.focus()
        }
      })
    },
    async confirmNewCampaign() {
      if (!this.newCampaignName.trim() || this.isCreating) return

      this.isCreating = true
      try {
        const campaign = await this._emailCampaignService.CreateCampaign(this.selectedStore, {
          Name: this.newCampaignName.trim(),
          Subject: this.newCampaignSubject.trim()
        })
        this.showNewModal = false
        this.campaigns.unshift({
          emailCampaignId: campaign.emailCampaignId,
          name: campaign.name,
          subject: campaign.subject,
          status: campaign.status,
          totalRecipients: 0,
          sentCount: 0,
          openedCount: 0,
          createdAt: campaign.createdAt
        })
        this.selectedCampaign = campaign
      } catch (err) {
        console.error('Create campaign error:', err)
        alert('Feil ved oppretting av kampanje')
      } finally {
        this.isCreating = false
      }
    },
    onCampaignUpdated(updated) {
      this.selectedCampaign = { ...this.selectedCampaign, ...updated }
      const index = this.campaigns.findIndex(c => c.emailCampaignId === updated.emailCampaignId)
      if (index >= 0) {
        this.$set(this.campaigns, index, {
          ...this.campaigns[index],
          name: updated.name || this.campaigns[index].name,
          subject: updated.subject || this.campaigns[index].subject,
          status: updated.status || this.campaigns[index].status
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.email-campaigns-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.page-header {
  margin-bottom: 32px;

  h1 {
    font-size: 2em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 8px 0;

    @media (max-width: 768px) {
      font-size: 1.5em;
    }
  }

  p {
    color: #64748b;
    margin: 0;
  }
}

.disabled-notice {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px;
  background: #fefce8;
  border: 1px solid #fde68a;
  border-radius: 12px;

  .material-icons {
    color: #92400e;
    font-size: 1.5em;
    flex-shrink: 0;
  }

  h3 {
    margin: 0 0 4px 0;
    color: #292c34;
    font-size: 1.1em;
  }

  p {
    margin: 0;
    color: #64748b;
    font-size: 0.95em;
  }
}

.controls-section {
  background: #fff;
  padding: 20px 24px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 32px;

  .controls-row {
    display: flex;
    gap: 16px;
    align-items: center;

    @media (max-width: 480px) {
      flex-direction: column;
    }
  }
}

.search-input {
  flex: 1;
  position: relative;

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 1.2em;
  }

  .search-field {
    width: 100%;
    padding: 12px 12px 12px 40px;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.95em;
    color: #292c34;
    transition: all 0.3s ease;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #1bb776;
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    }

    &::placeholder {
      color: #94a3b8;
    }
  }
}

.new-campaign-btn {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9em;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
  transition: all 0.3s ease;
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
  }

  i {
    margin-right: 6px;
  }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 16px;
}

.new-campaign-modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 100%;
  max-width: 440px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);

  h3 {
    margin: 0 0 4px 0;
    font-size: 1.3em;
    color: #292c34;
  }

  .modal-description {
    color: #64748b;
    margin: 0 0 20px 0;
    font-size: 0.9em;
  }

  .form-group {
    margin-bottom: 16px;

    label {
      display: block;
      margin-bottom: 6px;
      font-size: 0.85em;
      font-weight: 600;
      color: #292c34;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    input {
      width: 100%;
      padding: 12px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 0.95em;
      color: #292c34;
      box-sizing: border-box;

      &:focus {
        outline: none;
        border-color: #1bb776;
        box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
      }

      &::placeholder {
        color: #94a3b8;
      }
    }
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .modal-btn-secondary {
    padding: 12px 20px;
    background: white;
    color: #292c34;
    border: 2px solid #e2e8f0;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #f8f9fa;
      border-color: #cbd5e0;
    }
  }

  .modal-btn-primary {
    padding: 12px 20px;
    background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
    }

    &:disabled {
      background: #cbd5e0;
      box-shadow: none;
      cursor: not-allowed;
      opacity: 0.6;
    }
  }
}
</style>
