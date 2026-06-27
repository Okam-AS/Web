<template>
  <div class="employee-manager">
    <!-- Add employee -->
    <div class="form-section">
      <h2 class="section-title">Legg til ansatt</h2>
      <div class="add-row">
        <div class="phone-input">
          <span class="phone-prefix">+47</span>
          <input
            v-model="phoneInput"
            type="tel"
            inputmode="numeric"
            placeholder="Telefonnummer"
            class="text-input"
            :disabled="isAdding || !!pendingVerificationPhone"
            @keyup.enter="addEmployee"
          />
        </div>
        <button
          class="btn btn-primary"
          :disabled="!canAdd"
          @click="addEmployee"
        >
          <span v-if="isAdding">Legger til...</span>
          <span v-else>Legg til</span>
        </button>
      </div>

      <!-- SMS verification step -->
      <div v-if="pendingVerificationPhone" class="verify-panel">
        <p class="verify-text">Skriv inn engangskode sendt på SMS til {{ pendingVerificationPhone }}</p>
        <div class="add-row">
          <input
            v-model="verificationCode"
            type="tel"
            inputmode="numeric"
            placeholder="Engangskode"
            class="text-input"
            :disabled="isVerifying"
            @keyup.enter="confirmVerification"
          />
          <button class="btn btn-primary" :disabled="!verificationCode || isVerifying" @click="confirmVerification">
            <span v-if="isVerifying">Bekrefter...</span>
            <span v-else>Bekreft</span>
          </button>
          <button class="btn btn-secondary" :disabled="isVerifying" @click="cancelVerification">Avbryt</button>
        </div>
      </div>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
    </div>

    <!-- Employee list -->
    <div class="form-section">
      <h2 class="section-title">Brukere med tilgang</h2>

      <div v-if="isLoading" class="loading-section">
        <Loading :loading="true" />
      </div>

      <div v-else-if="employees.length === 0" class="list-empty">
        <p>Ingen ansatte enda.</p>
      </div>

      <div v-else class="employees-list">
        <div
          v-for="user in employees"
          :key="user.id"
          class="employee-item"
          :class="{ 'employee-item--self': user.id === currentUserId }"
        >
          <div class="employee-info">
            <span class="employee-name">{{ displayName(user) }}</span>
            <span v-if="user.id === currentUserId" class="badge">Deg</span>
          </div>
          <button
            v-if="user.id !== currentUserId || isPowerUser"
            class="btn-icon-only btn-icon-only--danger"
            title="Fjern"
            :disabled="isLoading"
            @click="removeEmployee(user)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <transition name="toast">
      <div v-if="toast.show" class="toast" :class="`toast--${toast.type}`">
        {{ toast.message }}
      </div>
    </transition>
  </div>
</template>

<script>
import Loading from '~/components/atoms/Loading.vue'

export default {
  name: 'EmployeeManager',
  components: { Loading },
  props: {
    storeId: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      isLoading: false,
      isAdding: false,
      isVerifying: false,
      phoneInput: '',
      verificationCode: '',
      pendingVerificationPhone: null,
      errorMessage: '',
      currentStore: null,
      toast: { show: false, message: '', type: 'success' },
    }
  },
  computed: {
    currentUserId() {
      return this.$store.state.currentUser && this.$store.state.currentUser.id
    },
    isPowerUser() {
      return this.$store.state.currentUser && this.$store.state.currentUser.isPowerUser
    },
    employees() {
      return (this.currentStore && this.currentStore.admins) || []
    },
    fullPhoneNumber() {
      const trimmed = (this.phoneInput || '').trim()
      return trimmed ? '+47' + trimmed : ''
    },
    canAdd() {
      return !!this.fullPhoneNumber && !this.isAdding && !this.pendingVerificationPhone
    },
  },
  watch: {
    storeId: {
      immediate: true,
      handler(id) {
        if (id) this.loadStore(id)
      },
    },
  },
  methods: {
    async loadStore(storeId) {
      const id = storeId || this.storeId
      if (!id) return
      this.isLoading = true
      this.errorMessage = ''
      try {
        this.currentStore = await this._storeService.Get(id)
      } catch (e) {
        this.showToast('Kunne ikke laste ansatte', 'error')
      } finally {
        this.isLoading = false
      }
    },
    async addEmployee() {
      if (!this.canAdd) return
      this.isAdding = true
      this.errorMessage = ''
      try {
        const added = await this._storeService.AddEmployee(this.storeId, this.fullPhoneNumber)
        if (added) {
          this.phoneInput = ''
          await this.loadStore(this.storeId)
          this.showToast('Ansatt lagt til', 'success')
        } else {
          // User needs to confirm via SMS one-time code
          await this._userService.SendVerificationToken(this.fullPhoneNumber)
          this.pendingVerificationPhone = this.fullPhoneNumber
        }
      } catch (e) {
        this.errorMessage = (e && e.message) || 'Noe gikk galt. Prøv igjen senere'
      } finally {
        this.isAdding = false
      }
    },
    async confirmVerification() {
      if (!this.verificationCode || this.isVerifying) return
      this.isVerifying = true
      this.errorMessage = ''
      try {
        const verified = await this._userService.VerifyToken(this.pendingVerificationPhone, this.verificationCode.trim())
        if (!verified) {
          this.errorMessage = 'Feil engangskode. Prøv igjen.'
          return
        }
        const added = await this._storeService.AddEmployee(this.storeId, this.pendingVerificationPhone)
        if (added) {
          this.phoneInput = ''
          this.verificationCode = ''
          this.pendingVerificationPhone = null
          await this.loadStore(this.storeId)
          this.showToast('Ansatt lagt til', 'success')
        } else {
          this.errorMessage = 'Kunne ikke legge til bruker'
        }
      } catch (e) {
        this.errorMessage = (e && e.message) || 'Noe gikk galt. Prøv igjen senere'
      } finally {
        this.isVerifying = false
      }
    },
    cancelVerification() {
      this.pendingVerificationPhone = null
      this.verificationCode = ''
      this.errorMessage = ''
    },
    async removeEmployee(user) {
      if (!user) return
      const isSelf = user.id === this.currentUserId
      if (isSelf && !this.isPowerUser) return
      const message = isSelf
        ? 'Er du sikker på at du vil fjerne deg selv som ansatt? Du mister tilgang til butikken.'
        : 'Er du sikker på at du ønsker å fjerne brukeren?'
      if (!confirm(message)) return
      this.isLoading = true
      this.errorMessage = ''
      try {
        const removed = await this._storeService.RemoveEmployee(this.storeId, user.id)
        if (removed) {
          await this.loadStore(this.storeId)
          this.showToast('Ansatt fjernet', 'success')
        } else {
          this.errorMessage = 'Kunne ikke fjerne bruker'
          this.isLoading = false
        }
      } catch (e) {
        this.errorMessage = (e && e.message) || 'Noe gikk galt. Prøv igjen senere'
        this.isLoading = false
      }
    },
    displayName(user) {
      if (!user) return ''
      const name = `${user.firstName || ''} ${user.lastName || ''}`.trim()
      if (name) return name
      return (user.phoneNumber || '').replace('+47', '') || 'Ukjent bruker'
    },
    showToast(message, type = 'success') {
      this.toast = { show: true, message, type }
      setTimeout(() => { this.toast.show = false }, 3000)
    },
  },
}
</script>

<style scoped>
.loading-section {
  display: flex;
  justify-content: center;
  padding: 32px 0;
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

.add-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.phone-input {
  position: relative;
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
}

.phone-prefix {
  position: absolute;
  left: 12px;
  color: #6b7280;
  font-size: 14px;
  pointer-events: none;
}

.phone-input .text-input {
  padding-left: 44px;
}

.text-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #292c34;
  background: #fafafa;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.text-input:focus {
  outline: none;
  border-color: #1bb776;
  background: white;
}

.text-input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.verify-panel {
  margin-top: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.verify-text {
  font-size: 14px;
  color: #374151;
  margin: 0 0 12px;
}

.error-text {
  margin: 12px 0 0;
  font-size: 14px;
  color: #dc2626;
}

.list-empty {
  color: #6b7280;
  font-size: 14px;
}

.employees-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.employee-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  background: #f9fafb;
  border: 1px solid #f3f4f6;
  border-radius: 8px;
}

.employee-item--self {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.employee-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.employee-name {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  background: #d1fae5;
  color: #065f46;
}

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
}

.btn:hover { opacity: 0.85; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary { background: linear-gradient(135deg, #1bb776, #159f63); color: white; }
.btn-secondary { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }

.btn-icon-only {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f3f4f6;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  color: #6b7280;
  transition: background 0.15s;
}

.btn-icon-only:hover { background: #e5e7eb; }
.btn-icon-only:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-icon-only svg { width: 18px; height: 18px; }
.btn-icon-only--danger:hover { background: #fee2e2; color: #dc2626; }

.toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1100;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}

.toast--success { background: #1bb776; color: white; }
.toast--error { background: #dc2626; color: white; }

.toast-enter-active, .toast-leave-active { transition: all 0.3s; }
.toast-enter, .toast-leave-to { opacity: 0; transform: translateY(12px); }
</style>
