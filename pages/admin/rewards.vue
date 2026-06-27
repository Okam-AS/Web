<template>
  <AdminPage @login-success="loadRewardProgram">
    <div class="rewards-page">
      <div class="page-header">
        <h1>Bonus</h1>
        <p class="page-description">Administrer bonusprogram og cashback for dine kunder</p>
      </div>

      <div v-if="isLoading" class="loading-section">
        <Loading :loading="true" />
      </div>

      <div v-else-if="!selectedStore" class="empty-state">
        <h3>Velg en butikk</h3>
        <p>Velg en butikk for å se bonusprogrammet.</p>
      </div>

      <!-- No reward program -->
      <template v-else-if="!hasRewardProgram">
        <div class="info-card">
          <div class="info-card__icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div>
            <h3>Ingen bonusprogram</h3>
            <p>Opprett et nytt bonusprogram eller koble butikken til et eksisterende.</p>
          </div>
        </div>

        <div v-if="otherRewardPrograms.length > 0" class="form-section">
          <h2 class="section-title">Eksisterende programmer</h2>
          <div
            v-for="program in otherRewardPrograms"
            :key="program.rewardProgramId"
            class="program-row"
          >
            <div class="program-row__info">
              <span class="program-row__name">{{ program.name || 'Bonusprogram' }}</span>
              <span class="program-row__stores">{{ program.storeCount || 0 }} butikk(er)</span>
            </div>
            <button class="btn btn-secondary btn-sm" :disabled="isInitializing" @click="linkWithExisting(program)">
              Koble til
            </button>
          </div>
        </div>

        <button class="btn btn-primary" :disabled="isInitializing" @click="initRewardProgram">
          <span v-if="isInitializing">Oppretter...</span>
          <span v-else>Opprett nytt bonusprogram</span>
        </button>
      </template>

      <!-- Has reward program -->
      <template v-else>
        <!-- Enable/Disable -->
        <div class="form-section">
          <div class="toggle-row">
            <div class="toggle-row__info">
              <span class="toggle-row__label">Aktiver cashback</span>
              <span class="toggle-row__hint">Kunder tjener cashback på kjøp</span>
            </div>
            <label class="toggle-switch">
              <input v-model="cashbackEnabled" type="checkbox" @change="onSettingChange" />
              <span class="toggle-slider" />
            </label>
          </div>
        </div>

        <!-- Program Name -->
        <div class="form-section">
          <h2 class="section-title">Programnavn</h2>
          <div class="form-field">
            <input
              v-model="rewardProgramName"
              type="text"
              placeholder="F.eks. Lojalitetsprogram"
              class="text-input"
              @input="onSettingChange"
            />
          </div>
        </div>

        <!-- Cashback Tiers -->
        <div class="form-section">
          <h2 class="section-title">Cashback-nivåer</h2>

          <!-- Base percentage -->
          <div class="tier-base">
            <label class="tier-base__label">Grunnprosent (0 kr og oppover)</label>
            <div class="tier-base__input">
              <input
                v-model="baseCashbackPercent"
                type="number"
                min="0"
                max="100"
                placeholder="0"
                class="text-input text-input--small"
                @input="onSettingChange"
              />
              <span class="input-suffix">%</span>
            </div>
          </div>

          <!-- Additional tiers -->
          <div v-if="additionalTiers.length > 0" class="tiers-list">
            <div
              v-for="(tier, index) in additionalTiers"
              :key="index"
              class="tier-item"
            >
              <div v-if="editingTierIndex === index" class="tier-edit-form">
                <div class="tier-edit-inputs">
                  <div class="form-field">
                    <label>Fra (kr)</label>
                    <input v-model="editingTier.fromAmount" type="number" min="1" class="text-input text-input--small" />
                  </div>
                  <div class="form-field">
                    <label>Prosent (%)</label>
                    <input v-model="editingTier.percent" type="number" min="0" max="100" class="text-input text-input--small" />
                  </div>
                </div>
                <div class="tier-edit-actions">
                  <button class="btn btn-primary btn-sm" @click="saveTierEdit">Lagre</button>
                  <button class="btn btn-ghost btn-sm" @click="editingTierIndex = -1">Avbryt</button>
                </div>
              </div>
              <div v-else class="tier-display">
                <span class="tier-display__text">Fra {{ tier.fromAmount }} kr: {{ tier.percent }}%</span>
                <div class="tier-display__actions">
                  <button class="btn-icon-only" title="Rediger" @click="startEditTier(index, tier)">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button class="btn-icon-only btn-icon-only--danger" title="Slett" @click="deleteTier(index)">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Add tier form -->
          <div v-if="showAddTierForm" class="tier-add-form">
            <div class="tier-edit-inputs">
              <div class="form-field">
                <label>Fra (kr)</label>
                <input v-model="newTier.fromAmount" type="number" min="1" placeholder="500" class="text-input text-input--small" />
              </div>
              <div class="form-field">
                <label>Prosent (%)</label>
                <input v-model="newTier.percent" type="number" min="0" max="100" placeholder="5" class="text-input text-input--small" />
              </div>
            </div>
            <div class="tier-edit-actions">
              <button class="btn btn-primary btn-sm" @click="addTier">Legg til</button>
              <button class="btn btn-ghost btn-sm" @click="showAddTierForm = false">Avbryt</button>
            </div>
          </div>

          <button v-if="!showAddTierForm" class="btn btn-secondary btn-sm" style="margin-top: 12px;" @click="openAddTierForm">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="btn-icon">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Legg til nivå
          </button>
        </div>

        <!-- Members -->
        <div class="form-section">
          <h2 class="section-title">Medlemmer</h2>
          <div class="members-row">
            <div class="members-count">
              <span class="members-count__number">{{ rewardMembershipCount }}</span>
              <span class="members-count__label">aktive medlemmer</span>
            </div>
            <a href="/admin/reward-members" class="btn btn-secondary btn-sm">Se alle</a>
          </div>
        </div>

        <!-- Associated Stores -->
        <div class="form-section">
          <h2 class="section-title">Tilknyttede butikker</h2>
          <div class="stores-list">
            <div
              v-for="store in rewardStores"
              :key="store.storeId"
              class="store-item"
              :class="{ 'store-item--current': store.storeId === selectedStore }"
            >
              <span class="store-item__name">{{ store.storeName }}</span>
              <span v-if="store.storeId === selectedStore" class="badge badge--current">Denne butikken</span>
            </div>
          </div>
          <button
            v-if="rewardStores.length > 1"
            class="btn btn-danger btn-sm"
            style="margin-top: 16px;"
            @click="removeStore"
          >
            Fjern denne butikken fra programmet
          </button>
        </div>

        <!-- Save notification -->
        <div v-if="saveStatus" class="save-status" :class="`save-status--${saveStatus}`">
          <span v-if="saveStatus === 'saving'">Lagrer...</span>
          <span v-else-if="saveStatus === 'saved'">Lagret ✓</span>
          <span v-else-if="saveStatus === 'error'">Feil ved lagring</span>
        </div>
      </template>

      <!-- Toast -->
      <transition name="toast">
        <div v-if="toast.show" class="toast" :class="`toast--${toast.type}`">
          {{ toast.message }}
        </div>
      </transition>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import Loading from '~/components/atoms/Loading.vue'
import { debounce } from '~/core/helpers/ts-debounce'

export default {
  name: 'Rewards',
  components: { AdminPage, Loading },
  data() {
    return {
      isLoading: false,
      isInitializing: false,
      hasRewardProgram: false,
      cashbackEnabled: false,
      rewardProgramName: '',
      baseCashbackPercent: 0,
      additionalTiers: [],
      rewardMembershipCount: 0,
      rewardStores: [],
      otherRewardPrograms: [],
      rewardProgramId: null,
      showAddTierForm: false,
      newTier: { fromAmount: 0, percent: 0 },
      editingTierIndex: -1,
      editingTier: { fromAmount: 0, percent: 0 },
      saveStatus: null,
      toast: { show: false, message: '', type: 'success' },
      debouncedSave: null,
    }
  },
  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore
    },
    userIsLoggedIn() {
      return this.$store.getters.userIsLoggedIn
    },
  },
  watch: {
    selectedStore: {
      immediate: true,
      handler(storeId) {
        if (this.userIsLoggedIn && storeId) this.loadRewardProgram(storeId)
      },
    },
    userIsLoggedIn: {
      immediate: true,
      handler(isLoggedIn) {
        if (isLoggedIn && this.selectedStore) this.loadRewardProgram(this.selectedStore)
      },
    },
  },
  created() {
    this.debouncedSave = debounce(this.saveRewardProgram, 2000)
  },
  methods: {
    async loadRewardProgram(storeId) {
      this.isLoading = true
      this.hasRewardProgram = false
      try {
        const result = await this._rewardService.Get(storeId || this.selectedStore)
        if (!result || !result.rewardProgram) {
          this.hasRewardProgram = false
          this.otherRewardPrograms = result?.otherRewardPrograms || []
          return
        }

        this.hasRewardProgram = true
        this.rewardProgramId = result.rewardProgram.id
        this.cashbackEnabled = result.rewardProgram.cashbackEnabled || false
        this.rewardProgramName = result.rewardProgram.name || ''
        this.rewardMembershipCount = result.rewardProgram.membershipCount || 0
        this.rewardStores = result.rewardProgram.stores || []

        const ranges = result.rewardProgram.cashbackRanges || []
        const baseRange = ranges.find(r => r.fromAmount === 0)
        this.baseCashbackPercent = baseRange ? baseRange.percent : 0
        this.additionalTiers = ranges.filter(r => r.fromAmount > 0).sort((a, b) => a.fromAmount - b.fromAmount)
      } catch (e) {
        this.hasRewardProgram = false
      } finally {
        this.isLoading = false
      }
    },
    async initRewardProgram() {
      this.isInitializing = true
      try {
        await this._rewardService.Init(this.selectedStore)
        await this.loadRewardProgram(this.selectedStore)
      } catch (e) {
        this.showToast('Kunne ikke opprette bonusprogram', 'error')
      } finally {
        this.isInitializing = false
      }
    },
    async linkWithExisting(program) {
      this.isInitializing = true
      try {
        await this._rewardService.Link(this.selectedStore, program.rewardProgramId)
        await this.loadRewardProgram(this.selectedStore)
      } catch (e) {
        this.showToast('Kunne ikke koble til program', 'error')
      } finally {
        this.isInitializing = false
      }
    },
    async removeStore() {
      if (!confirm('Er du sikker på at du vil fjerne denne butikken fra bonusprogrammet?')) return
      try {
        await this._rewardService.Remove(this.selectedStore)
        await this.loadRewardProgram(this.selectedStore)
      } catch (e) {
        this.showToast('Kunne ikke fjerne butikk', 'error')
      }
    },
    onSettingChange() {
      this.saveStatus = 'saving'
      this.debouncedSave()
    },
    async saveRewardProgram() {
      try {
        const allRanges = [
          { fromAmount: 0, percent: Number(this.baseCashbackPercent) },
          ...this.additionalTiers.map(t => ({ fromAmount: Number(t.fromAmount), percent: Number(t.percent) })),
        ]
        await this._rewardService.Update(this.selectedStore, {
          name: this.rewardProgramName,
          cashbackEnabled: this.cashbackEnabled,
          cashbackRanges: allRanges,
        })
        this.saveStatus = 'saved'
        setTimeout(() => { this.saveStatus = null }, 3000)
      } catch (e) {
        this.saveStatus = 'error'
      }
    },
    openAddTierForm() {
      this.newTier = { fromAmount: 0, percent: 0 }
      this.showAddTierForm = true
    },
    addTier() {
      if (!this.newTier.fromAmount || Number(this.newTier.fromAmount) <= 0) {
        this.showToast('Fra-beløp må være større enn 0', 'error')
        return
      }
      this.additionalTiers.push({ fromAmount: Number(this.newTier.fromAmount), percent: Number(this.newTier.percent) })
      this.additionalTiers.sort((a, b) => a.fromAmount - b.fromAmount)
      this.showAddTierForm = false
      this.onSettingChange()
    },
    startEditTier(index, tier) {
      this.editingTierIndex = index
      this.editingTier = { ...tier }
    },
    saveTierEdit() {
      this.additionalTiers[this.editingTierIndex] = { fromAmount: Number(this.editingTier.fromAmount), percent: Number(this.editingTier.percent) }
      this.additionalTiers.sort((a, b) => a.fromAmount - b.fromAmount)
      this.editingTierIndex = -1
      this.onSettingChange()
    },
    deleteTier(index) {
      this.additionalTiers.splice(index, 1)
      this.onSettingChange()
    },
    showToast(message, type = 'success') {
      this.toast = { show: true, message, type }
      setTimeout(() => { this.toast.show = false }, 3000)
    },
  },
}
</script>

<style scoped>
.rewards-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #292c34;
  margin: 0 0 4px;
}

.page-description {
  color: #6b7280;
  margin: 0;
  font-size: 14px;
}

.loading-section {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.empty-state {
  text-align: center;
  padding: 60px 24px;
  color: #6b7280;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px;
}

.info-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.info-card__icon {
  width: 40px;
  height: 40px;
  color: #1bb776;
  flex-shrink: 0;
}

.info-card__icon svg { width: 100%; height: 100%; }

.info-card h3 {
  font-size: 16px;
  font-weight: 700;
  color: #292c34;
  margin: 0 0 4px;
}

.info-card p {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.form-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 24px;
  margin-bottom: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 700;
  color: #292c34;
  margin: 0 0 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-field:last-child { margin-bottom: 0; }

.form-field label {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}

.text-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #292c34;
  background: #fafafa;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.text-input:focus {
  outline: none;
  border-color: #1bb776;
  background: white;
}

.text-input--small { width: 100px; }

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toggle-row__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-row__label {
  font-size: 15px;
  font-weight: 600;
  color: #292c34;
}

.toggle-row__hint {
  font-size: 13px;
  color: #6b7280;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  flex-shrink: 0;
  cursor: pointer;
}

.toggle-switch input { opacity: 0; width: 0; height: 0; }

.toggle-slider {
  position: absolute;
  inset: 0;
  background: #e5e7eb;
  border-radius: 24px;
  transition: background 0.2s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  top: 3px;
  background: white;
  border-radius: 50%;
  transition: transform 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.15);
}

.toggle-switch input:checked + .toggle-slider { background: #1bb776; }
.toggle-switch input:checked + .toggle-slider::before { transform: translateX(20px); }

.tier-base {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
  margin-bottom: 12px;
}

.tier-base__label {
  font-size: 14px;
  color: #374151;
}

.tier-base__input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-suffix {
  font-size: 14px;
  color: #6b7280;
}

.tiers-list {
  border: 1px solid #f3f4f6;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
}

.tier-item {
  border-bottom: 1px solid #f3f4f6;
}

.tier-item:last-child { border-bottom: none; }

.tier-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.tier-display__text {
  font-size: 14px;
  color: #374151;
}

.tier-display__actions {
  display: flex;
  gap: 8px;
}

.tier-edit-form,
.tier-add-form {
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
  margin-top: 8px;
}

.tier-edit-inputs {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.tier-edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.members-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.members-count {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.members-count__number {
  font-size: 32px;
  font-weight: 700;
  color: #1bb776;
}

.members-count__label {
  font-size: 14px;
  color: #6b7280;
}

.stores-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.store-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #f3f4f6;
}

.store-item--current {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.store-item__name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
}

.badge--current { background: #d1fae5; color: #065f46; }

.program-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
}

.program-row:last-child { border-bottom: none; }

.program-row__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.program-row__name {
  font-size: 14px;
  font-weight: 600;
  color: #292c34;
}

.program-row__stores {
  font-size: 12px;
  color: #9ca3af;
}

.save-status {
  text-align: right;
  font-size: 13px;
  padding: 8px 0;
}

.save-status--saving { color: #9ca3af; }
.save-status--saved { color: #1bb776; }
.save-status--error { color: #dc2626; }

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
  text-decoration: none;
}

.btn:hover { opacity: 0.85; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-sm { padding: 6px 14px; font-size: 13px; }

.btn-primary { background: linear-gradient(135deg, #1bb776, #159f63); color: white; }
.btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
.btn-ghost { background: transparent; color: #6b7280; }
.btn-danger { background: transparent; color: #dc2626; border: 1px solid #fca5a5; }
.btn-danger:hover { background: #fee2e2; }

.btn-icon { width: 16px; height: 16px; }

.btn-icon-only {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #6b7280;
  transition: background 0.15s;
}

.btn-icon-only:hover { background: #e5e7eb; }
.btn-icon-only svg { width: 16px; height: 16px; }

.btn-icon-only--danger:hover { background: #fee2e2; color: #dc2626; }

.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.toast--success { background: #1bb776; color: white; }
.toast--error { background: #dc2626; color: white; }

.toast-enter-active, .toast-leave-active { transition: all 0.3s; }
.toast-enter, .toast-leave-to { opacity: 0; transform: translateY(12px); }

@media (max-width: 640px) {
  .rewards-page { padding: 16px; }
}
</style>
