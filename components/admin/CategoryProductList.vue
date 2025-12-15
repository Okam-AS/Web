<template>
  <div class="category-product-list">
    <draggable
      v-if="items.length > 0"
      :value="items"
      @input="handleReorder"
      handle=".drag-handle"
      animation="200"
      ghost-class="ghost"
      drag-class="dragging"
      class="draggable-list"
    >
      <div
        v-for="(item, index) in items"
        :key="item.id || `temp-${index}`"
        class="list-item"
        :class="{ 'is-heading': item.isHeading }"
      >
        <!-- Drag Handle -->
        <div class="drag-handle">
          <span class="material-icons">drag_indicator</span>
        </div>

        <!-- Heading Item -->
        <div v-if="item.isHeading" class="heading-content">
          <span class="material-icons heading-icon">title</span>
          <div class="heading-text">{{ item.heading }}</div>
        </div>

        <!-- Product Item -->
        <div v-else class="product-content">
          <!-- Product Image -->
          <div class="product-image">
            <img
              v-if="item.product && item.product.image && item.product.image.imageUrl"
              :src="item.product.image.imageUrl"
              :alt="item.product.name"
            />
            <div v-else class="placeholder-image">
              <span class="material-icons">image</span>
            </div>
          </div>

          <!-- Product Info -->
          <div class="product-info">
            <div class="product-name">
              {{ item.product ? item.product.name : 'Loading...' }}
              <span
                v-if="item.product && isFromDifferentStore(item.product)"
                class="store-badge"
              >
                {{ getStoreName(item.product) }}
              </span>
            </div>
            <div v-if="item.product && item.product.description" class="product-description">
              {{ item.product.description }}
            </div>
            <div v-if="item.product" class="product-price">
              {{ priceLabel(item.product.amount, true) }}
            </div>
          </div>
        </div>

        <!-- Delete Button -->
        <button class="delete-btn" @click.stop="handleDelete(index)" title="Fjern">
          <span class="material-icons">close</span>
        </button>
      </div>
    </draggable>

    <!-- Empty State -->
    <div v-if="items.length === 0" class="empty-state">
      <span class="material-icons">inventory_2</span>
      <p>Ingen produkter lagt til ennå</p>
      <p class="empty-hint">Klikk "Velg produkter" for å legge til produkter</p>
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable'

export default {
  name: 'CategoryProductList',
  components: {
    draggable
  },
  props: {
    items: {
      type: Array,
      required: true
    },
    currentStoreId: {
      type: Number,
      required: false,
      default: null
    }
  },
  computed: {
    stores() {
      return this.$store.state.currentUser?.adminIn || []
    }
  },
  methods: {
    handleReorder(newItems) {
      this.$emit('reorder', newItems)
    },

    handleDelete(index) {
      this.$emit('delete', index)
    },

    isFromDifferentStore(product) {
      const isDifferent = this.currentStoreId && product.storeId && product.storeId !== this.currentStoreId
      console.log('isFromDifferentStore check:', {
        productName: product.name,
        productStoreId: product.storeId,
        currentStoreId: this.currentStoreId,
        isDifferent
      })
      return isDifferent
    },

    getStoreName(product) {
      // Debug logging
      console.log('Getting store name for product:', {
        productName: product.name,
        storeName: product.storeName,
        storeId: product.storeId,
        currentStoreId: this.currentStoreId,
        availableStores: this.stores.map(s => ({ id: s.id, name: s.name }))
      })

      // First try to use storeName if available (from cross-store search)
      if (product.storeName) {
        return product.storeName
      }

      // Otherwise, look up store name from storeId
      if (product.storeId) {
        const store = this.stores.find(s => s.id === product.storeId)
        return store ? store.name : `Ukjent butikk (ID: ${product.storeId})`
      }

      return 'Ukjent butikk'
    }
  }
}
</script>

<style lang="scss" scoped>
.category-product-list {
  display: flex;
  flex-direction: column;
}

.draggable-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.15s ease;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &.is-heading {
    background: #f9fafb;
    border-color: #d1d5db;
  }
}

// Vuedraggable classes
.ghost {
  opacity: 0.5;
  background: #e0f2fe;
  border-color: #0066cc;
}

.dragging {
  opacity: 0.9;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  transform: scale(1.02);
}

.drag-handle {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  color: #9ca3af;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  .material-icons {
    font-size: 24px;
  }
}

.heading-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;

  .heading-icon {
    color: #6b7280;
    font-size: 24px;
  }

  .heading-text {
    font-size: 1.1em;
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.product-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
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
    color: #1bb776;
  }
}

.delete-btn {
  flex-shrink: 0;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: #fee2e2;
    color: #ef4444;
  }

  .material-icons {
    font-size: 20px;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  color: #9ca3af;
  text-align: center;

  .material-icons {
    font-size: 64px;
    margin-bottom: 12px;
    color: #d1d5db;
  }

  p {
    margin: 4px 0;
    font-size: 1.1em;
    color: #6b7280;

    &.empty-hint {
      font-size: 0.95em;
      color: #9ca3af;
    }
  }
}
</style>
