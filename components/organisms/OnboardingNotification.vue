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
/* SCREEN CHROME, NEVER PAPER.
 *
 * This banner is an unfinished-setup prompt with two buttons on it, and the admin shell renders it
 * ABOVE the page's slot (`AdminPage` -> `.admin__main`). So for a store that has not finished setup
 * it was landing on the top of every document this admin prints — measured on the produced PDF of
 * the Events run sheet, whose first printed line was "Du har en pågående oppsett-prosess for … /
 * Fortsett oppsett / Lukk" and only then "Kjøreplan". A kitchen sheet is not a place to ask somebody
 * to finish onboarding, and no printed document this app produces is.
 *
 * WHY IT LIVES HERE rather than in the page that noticed it. Scoped CSS cannot reach an ancestor, so
 * the run sheet's own print rules — deliberately scoped, which is what makes them incapable of
 * restyling another admin screen — could never have hidden this. The component hiding ITSELF needs
 * no reach at all: `scoped` puts this component's own attribute on its own root, so the rule cannot
 * apply to anything else and cannot be forgotten by a page that prints later.
 *
 * WHAT THIS DELIBERATELY IS NOT. It is not a class on `document.body`. That mechanism is on this
 * branch and it is MEASURED INERT: `pages/admin/workforce-personnel-list.vue` sets `wfpl-print-host`
 * imperatively and vue-meta rebuilds `body.class` from its own map, wiping it — the § 8-5-6 sheet's
 * print path (including its own copy of this very rule, line ~358) has been dead ever since, with
 * every test green. Going through vue-meta's `bodyAttrs` instead would have needed every contributor
 * to declare an ARRAY, since it merges arrays by concatenation but strings by replacement, and
 * `layouts/default.vue` still declares that class as a STRING — so an array-valued contributor would
 * have stripped `okam-ch` on the Swiss market. None of that is needed to hide one's own root element.
 *
 * `.admin-nav` already does exactly this (AdminPageHeader.vue, its own scoped `@media print`), which
 * is why the sidebar has never printed down the side of a kitchen sheet.
 *
 * Evidence: test/e2e/journeys/events-runsheet-onboarding.spec.js reads the produced PDF back with
 * `pdftotext` and asserts the sheet's own heading is the first line on the page. */
@media print {
  .onboarding-notification {
    display: none !important;
  }
}

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
