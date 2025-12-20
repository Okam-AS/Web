<template>
  <div class="wrapped-container">
    <!-- Store Selection Slide (if multiple stores) -->
    <WrappedStoreSelector
      v-if="showStoreSelector"
      :stores="adminStores"
      @select="onStoreSelect"
    />

    <!-- Main Wrapped Experience -->
    <WrappedSlideshow
      v-else-if="wrappedData"
      :data="wrappedData"
      @close="goBack"
    />

    <!-- Loading State -->
    <div v-else-if="isLoading" class="wrapped-loading">
      <div class="loading-spinner"></div>
      <p>Laster inn ditt 2025...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="wrapped-error">
      <span class="material-icons">error_outline</span>
      <h2>Oops!</h2>
      <p>{{ error }}</p>
      <button class="btn-primary" @click="goBack">
        Tilbake til admin
      </button>
    </div>
  </div>
</template>

<script>
import WrappedStoreSelector from '~/components/wrapped/WrappedStoreSelector.vue'
import WrappedSlideshow from '~/components/wrapped/WrappedSlideshow.vue'

export default {
  name: 'WrappedPage',
  layout: 'empty',
  components: {
    WrappedStoreSelector,
    WrappedSlideshow
  },
  data: () => ({
    isLoading: false,
    error: null,
    wrappedData: null,
    selectedStoreId: null
  }),
  computed: {
    adminStores() {
      return this.$store.state.currentUser?.adminIn || []
    },
    showStoreSelector() {
      return this.adminStores.length > 1 && !this.selectedStoreId
    }
  },
  mounted() {
    if (!this.$store.getters.userIsLoggedIn) {
      this.$router.push('/admin')
      return
    }

    // Auto-select if single store
    if (this.adminStores.length === 1) {
      this.onStoreSelect(this.adminStores[0].id)
    } else if (this.adminStores.length === 0) {
      this.error = 'Du har ikke tilgang til noen butikker.'
    }
  },
  methods: {
    async onStoreSelect(storeId) {
      this.selectedStoreId = storeId
      this.isLoading = true
      this.error = null

      try {
        // Notify Discord
        await this._wrappedService.NotifyViewed(storeId)

        // Load wrapped data
        this.wrappedData = await this._wrappedService.GetWrappedData(storeId)
      } catch (err) {
        this.error = 'Kunne ikke laste inn Wrapped 2025. Vennligst prøv igjen.'
        console.error('Failed to load wrapped data:', err)
      } finally {
        this.isLoading = false
      }
    },
    goBack() {
      this.$router.push('/admin')
    }
  }
}
</script>

<style lang="scss" scoped>
.wrapped-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wrapped-loading {
  text-align: center;

  .loading-spinner {
    width: 60px;
    height: 60px;
    border: 4px solid rgba(255, 255, 255, 0.2);
    border-top-color: #1bb776;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 24px;
  }

  p {
    font-size: 1.25rem;
    opacity: 0.8;
  }
}

.wrapped-error {
  text-align: center;
  padding: 48px;

  .material-icons {
    font-size: 64px;
    color: #ef4444;
    margin-bottom: 16px;
  }

  h2 {
    font-size: 2rem;
    margin-bottom: 12px;
  }

  p {
    opacity: 0.7;
    margin-bottom: 24px;
  }

  .btn-primary {
    background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
    color: white;
    border: none;
    padding: 14px 32px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.2s;

    &:hover {
      transform: translateY(-2px);
    }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
