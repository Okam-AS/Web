<template>
  <div v-if="onboardingInProgress" class="onboarding-notification">
    <div class="onboarding-notification__content">
      <div class="onboarding-notification__icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="onboarding-notification__message">
        Du har en pågående oppsett-prosess for <strong>{{ storeName }}</strong>.
        Du er på steg {{ currentStep + 1 }} av {{ totalSteps }}.
      </div>
      <div class="onboarding-notification__actions">
        <button class="btn btn-primary" @click="continueOnboarding">
          Fortsett oppsett
        </button>
        <button class="btn btn-text" @click="dismissNotification">
          Lukk
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      onboardingInProgress: false,
      storeId: null,
      storeName: '',
      currentStep: 0,
      totalSteps: 4,
      dismissed: false
    }
  },
  mounted() {
    this.checkOnboardingStatus()
    // Check again when the component is activated (e.g., after navigation)
    window.addEventListener('focus', this.checkOnboardingStatus)
  },
  beforeDestroy() {
    window.removeEventListener('focus', this.checkOnboardingStatus)
  },
  methods: {
    checkOnboardingStatus() {
      // Don't show if user has dismissed the notification
      if (this.dismissed) {
        return
      }

      // Check if there's an onboarding in progress
      const onboardingData = localStorage.getItem('onboardingInProgress')
      if (onboardingData) {
        try {
          const data = JSON.parse(onboardingData)
          this.onboardingInProgress = true
          this.storeId = data.storeId
          this.storeName = data.storeName || 'din butikk'
          this.currentStep = data.currentStep || 0
        } catch (error) {
          alert('Error parsing onboarding data')
          localStorage.removeItem('onboardingInProgress')
        }
      }
    },
    continueOnboarding() {
      this.$router.push('/admin/onboarding')
    },
    dismissNotification() {
      this.onboardingInProgress = false
      this.dismissed = true
    }
  }
}
</script>

<style lang="scss" scoped>
.onboarding-notification {
  position: relative;
  margin: 1rem;
  padding: 0.5rem;
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 0.5rem;

  &__content {
    display: flex;
    align-items: center;
    padding: 0.5rem;
  }

  &__icon {
    flex-shrink: 0;
    margin-right: 1rem;

    svg {
      width: 1.5rem;
      height: 1.5rem;
      color: #0284c7;
    }
  }

  &__message {
    flex-grow: 1;
    font-size: 0.95rem;
  }

  &__actions {
    display: flex;
    align-items: center;
    margin-left: 1rem;

    .btn {
      margin-left: 0.5rem;
    }

    .btn-text {
      background: none;
      border: none;
      color: #64748b;
      cursor: pointer;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  button {
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;

    &.btn-primary {
      background-color: #292c34;
      color: #d5f6e5;

      &:hover {
        background-color: #1e2026;
      }

      &:disabled {
        background-color: #a0aec0;
        cursor: not-allowed;
      }
    }

    &.btn-secondary {
      background-color: #f8f9fa;
      color: #292c34;
      border-color: #e2e8f0;

      &:hover {
        background-color: #f0f2f5;
      }
    }

    &.btn-success {
      background-color: #292c34;
      color: #d5f6e5;

      &:hover {
        background-color: #1e2026;
      }
    }
  }
}
</style>
