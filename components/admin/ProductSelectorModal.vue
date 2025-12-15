<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="handleOverlayClick">
    <div class="modal-container">
      <div class="modal-header">
        <h2>Velg produkter</h2>
        <button class="close-btn" @click="closeModal">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Search Input -->
        <div class="search-section">
          <div class="search-input-wrapper">
            <span class="material-icons search-icon">search</span>
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Søk etter produkt..."
              class="search-input"
            />
            <button
              v-if="searchQuery"
              class="clear-search-btn"
              @click="searchQuery = ''"
            >
              <span class="material-icons">clear</span>
            </button>
          </div>

          <!-- Store Filter Button (only show if user has multiple stores) -->
          <button
            v-if="hasMultipleStores"
            class="store-filter-btn"
            @click="openStoreSelector"
          >
            <span class="material-icons">store</span>
            <span>{{ selectedStoreIds.length }} butikk{{ selectedStoreIds.length !== 1 ? 'er' : '' }}</span>
            <span class="material-icons">arrow_drop_down</span>
          </button>
        </div>

        <!-- Selected Count -->
        <div class="selected-count">
          {{ selectedProductIds.length }} produkt{{ selectedProductIds.length !== 1 ? 'er' : '' }} valgt
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="loading-container">
          <Loading :loading="true" :size="48" />
          <p>Laster produkter...</p>
        </div>

        <!-- Product List -->
        <div v-else class="product-list">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="product-item"
            :class="{ selected: isSelected(product.id) }"
            @click="toggleProduct(product.id)"
          >
            <!-- Checkbox -->
            <div class="product-checkbox">
              <div class="checkbox-circle" :class="{ checked: isSelected(product.id) }">
                <span v-if="isSelected(product.id)" class="material-icons">check</span>
              </div>
            </div>

            <!-- Product Image -->
            <div class="product-image">
              <img
                v-if="product.image && product.image.imageUrl"
                :src="product.image.imageUrl"
                :alt="product.name"
              />
              <div v-else class="placeholder-image">
                <span class="material-icons">image</span>
              </div>
            </div>

            <!-- Product Info -->
            <div class="product-info">
              <div class="product-name">
                {{ product.name }}
                <span v-if="product.storeName && isFromDifferentStore(product)" class="store-badge">
                  {{ product.storeName }}
                </span>
              </div>
              <div v-if="product.description" class="product-description">
                {{ product.description }}
              </div>
              <div class="product-price">
                {{ priceLabel(product.amount, true) }}
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-if="filteredProducts.length === 0" class="empty-state">
            <span class="material-icons">search_off</span>
            <p v-if="hasMultipleStores && selectedStoreIds.length === 0">
              Velg butikker for å søke etter produkter
            </p>
            <p v-else>Ingen produkter funnet</p>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">
          Avbryt
        </button>
        <button class="btn btn-primary" @click="confirmSelection">
          Bekreft valg
        </button>
      </div>
    </div>

    <!-- Store Selector Modal -->
    <StoreSelector
      ref="storeSelector"
      :selectedStoreIds="selectedStoreIds"
      @update:selectedStoreIds="handleStoreSelectionChange"
    />
  </div>
</template>

<script>
import Loading from '~/components/atoms/Loading.vue'
import StoreSelector from '~/components/admin/StoreSelector.vue'

export default {
  name: 'ProductSelectorModal',
  components: {
    Loading,
    StoreSelector
  },
  props: {
    defaultSelectedProductIds: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      isOpen: false,
      isLoading: false,
      products: [],
      selectedProductIds: [],
      originalSelectedIds: [],
      searchQuery: '',
      selectedStoreIds: [],
      searchDebounceTimer: null,
      resolve: null
    }
  },
  computed: {
    filteredProducts() {
      // When using cross-store search, filtering is done server-side
      // For single-store mode, filter client-side
      if (this.hasMultipleStores && this.searchQuery) {
        return this.products
      }

      if (!this.searchQuery || this.searchQuery.trim() === '') {
        return this.products
      }
      const query = this.searchQuery.toLowerCase()
      return this.products.filter(product =>
        product.name && product.name.toLowerCase().includes(query)
      )
    },
    hasChanges() {
      // Check if selection has changed
      if (this.selectedProductIds.length !== this.originalSelectedIds.length) {
        return true
      }
      // Sort and compare - use numeric sort for consistency
      const sorted1 = [...this.selectedProductIds].sort((a, b) => a - b)
      const sorted2 = [...this.originalSelectedIds].sort((a, b) => a - b)
      return JSON.stringify(sorted1) !== JSON.stringify(sorted2)
    },
    hasMultipleStores() {
      return this.$store.state.currentUser?.adminIn?.length > 1
    },
    currentStoreId() {
      return this.$store.state.selectedAdminStore
    }
  },
  watch: {
    searchQuery(newQuery) {
      if (this.hasMultipleStores) {
        this.debouncedSearch(newQuery)
      }
    }
  },
  methods: {
    async open(preSelectedIds = []) {
      this.isOpen = true
      this.selectedProductIds = [...preSelectedIds]
      this.originalSelectedIds = [...preSelectedIds]
      this.searchQuery = ''

      // Initialize selected stores - default to current store
      if (this.hasMultipleStores) {
        this.selectedStoreIds = [this.currentStoreId]
      }

      console.log('ProductSelectorModal opened with:', {
        preSelectedIds,
        selectedProductIds: this.selectedProductIds,
        originalSelectedIds: this.originalSelectedIds,
        hasMultipleStores: this.hasMultipleStores,
        selectedStoreIds: this.selectedStoreIds
      })

      await this.loadProducts()

      return new Promise((resolve) => {
        this.resolve = resolve
      })
    },

    async loadProducts() {
      try {
        this.isLoading = true

        if (this.hasMultipleStores) {
          // Use cross-store search if user has multiple stores
          if (this.selectedStoreIds.length === 0) {
            // If no stores selected, show empty list
            this.products = []
            return
          }

          // If only one store selected, use regular GetAll
          if (this.selectedStoreIds.length === 1) {
            this.products = await this._productService.GetAll(this.selectedStoreIds[0])
          } else {
            // Multiple stores - use cross-store search
            // Use empty string to get all products when no search query
            const query = this.searchQuery && this.searchQuery.trim() !== '' ? this.searchQuery : ''
            this.products = await this._productService.SearchAcrossStores(
              query,
              this.selectedStoreIds
            )
          }
        } else {
          // Single store - load all products
          const storeId = this.currentStoreId
          this.products = await this._productService.GetAll(storeId)
        }
      } catch (error) {
        console.error('Failed to load products:', error)
        alert('Kunne ikke laste produkter. Vennligst prøv igjen.')
        this.products = []
      } finally {
        this.isLoading = false
      }
    },

    debouncedSearch() {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer)
      }

      this.searchDebounceTimer = setTimeout(() => {
        this.loadProducts()
      }, 300)
    },

    openStoreSelector() {
      this.$refs.storeSelector.open()
    },

    handleStoreSelectionChange(newStoreIds) {
      this.selectedStoreIds = newStoreIds
      // Reload products with new store selection
      this.loadProducts()
    },

    isFromDifferentStore(product) {
      return product.storeId !== this.currentStoreId
    },

    isSelected(productId) {
      return this.selectedProductIds.includes(productId)
    },

    toggleProduct(productId) {
      const index = this.selectedProductIds.indexOf(productId)
      if (index === -1) {
        this.selectedProductIds.push(productId)
      } else {
        this.selectedProductIds.splice(index, 1)
      }
    },

    handleOverlayClick() {
      // Only allow closing by clicking outside if there are no changes
      if (!this.hasChanges) {
        this.closeModal()
      }
    },

    confirmSelection() {
      console.log('Confirming selection:', {
        selectedProductIds: this.selectedProductIds,
        originalSelectedIds: this.originalSelectedIds,
        hasChanges: this.hasChanges
      })

      if (this.resolve) {
        this.resolve([...this.selectedProductIds])
      }
      // Don't call closeModal, just close directly without checking for changes
      // since we're confirming the selection
      this.isOpen = false
      this.products = []
      this.selectedProductIds = []
      this.originalSelectedIds = []
      this.searchQuery = ''
      this.resolve = null
    },

    closeModal() {
      console.log('Closing modal:', {
        selectedProductIds: this.selectedProductIds,
        originalSelectedIds: this.originalSelectedIds,
        hasChanges: this.hasChanges
      })

      // Check for unsaved changes
      if (this.hasChanges) {
        if (!confirm('Du har ulagrede endringer. Er du sikker på at du vil lukke?')) {
          return
        }
      }

      if (this.resolve) {
        this.resolve(null)
      }
      this.isOpen = false
      this.products = []
      this.selectedProductIds = []
      this.originalSelectedIds = []
      this.searchQuery = ''
      this.resolve = null
    }
  }
}
</script>

<style lang="scss" scoped>
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
  z-index: 9999;
  padding: 20px;
}

.modal-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: 1.5em;
    font-weight: 600;
    color: #292c34;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    transition: color 0.2s;

    &:hover {
      color: #292c34;
    }

    .material-icons {
      font-size: 24px;
    }
  }
}

.modal-body {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}

.search-section {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 200px;

    .search-icon {
      position: absolute;
      left: 12px;
      color: #6b7280;
      font-size: 20px;
    }

    .search-input {
      width: 100%;
      padding: 12px 40px 12px 44px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 1em;
      transition: border-color 0.2s;

      &:focus {
        outline: none;
        border-color: #94a3b8;
        box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
      }
    }

    .clear-search-btn {
      position: absolute;
      right: 8px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      color: #6b7280;

      &:hover {
        color: #292c34;
      }

      .material-icons {
        font-size: 20px;
      }
    }
  }

  .store-filter-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    background: #f1f5f9;
    border: 2px solid #cbd5e0;
    border-radius: 8px;
    font-size: 0.95em;
    font-weight: 600;
    color: #334155;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover {
      background: #e2e8f0;
      border-color: #94a3b8;
    }

    .material-icons {
      font-size: 20px;
    }
  }
}

.selected-count {
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #f1f5f9;
  border-radius: 8px;
  color: #334155;
  font-weight: 600;
  font-size: 0.95em;
  text-align: center;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #6b7280;

  .material-icons {
    font-size: 48px;
    margin-bottom: 12px;
    color: #334155;

    // Spinner now handled by Loading component
  }

  p {
    margin: 0;
    font-size: 1em;
  }
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
}

.product-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #cbd5e0;
    background: #f9fafb;
  }

  &.selected {
    border-color: #334155;
    background: #f1f5f9;
  }
}

.product-checkbox {
  flex-shrink: 0;

  .checkbox-circle {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid #d1d5db;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &.checked {
      background: #334155;
      border-color: #334155;

      .material-icons {
        color: #fff;
        font-size: 18px;
      }
    }
  }
}

.product-image {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 8px;
  overflow: hidden;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder-image {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: #9ca3af;

    .material-icons {
      font-size: 32px;
    }
  }
}

.product-info {
  flex: 1;
  min-width: 0;

  .product-name {
    font-size: 1.05em;
    font-weight: 600;
    color: #292c34;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .store-badge {
      display: inline-flex;
      padding: 2px 8px;
      background: #dbeafe;
      color: #1e40af;
      border-radius: 4px;
      font-size: 0.75em;
      font-weight: 600;
      flex-shrink: 0;
    }
  }

  .product-description {
    font-size: 0.9em;
    color: #6b7280;
    margin-bottom: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .product-price {
    font-size: 0.95em;
    font-weight: 600;
    color: #0f172a;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #9ca3af;

  .material-icons {
    font-size: 64px;
    margin-bottom: 12px;
  }

  p {
    margin: 0;
    font-size: 1.1em;
  }
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  &:active {
    transform: translateY(0);
  }
}

.btn-secondary {
  background: #f3f4f6;
  color: #4b5563;

  &:hover {
    background: #e5e7eb;
  }
}

.btn-primary {
  background: #334155;
  color: #fff;

  &:hover {
    background: #1e293b;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
