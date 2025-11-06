<template>
  <div class="category-product-list">
    <div
      v-for="(item, index) in items"
      :key="item.id || `temp-${index}`"
      class="list-item"
      :class="{ 'is-heading': item.isHeading, 'is-dragging': draggedIndex === index }"
      draggable="true"
      @dragstart="handleDragStart($event, index)"
      @dragend="handleDragEnd"
      @dragover="handleDragOver($event, index)"
      @drop="handleDrop($event, index)"
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
      <button class="delete-btn" @click="handleDelete(index)" title="Fjern">
        <span class="material-icons">delete</span>
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="items.length === 0" class="empty-state">
      <span class="material-icons">inventory_2</span>
      <p>Ingen produkter lagt til ennå</p>
      <p class="empty-hint">Klikk "Velg produkter" for å legge til produkter</p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CategoryProductList',
  props: {
    items: {
      type: Array,
      required: true
    }
  },
  data() {
    return {
      draggedIndex: null,
      dragOverIndex: null
    }
  },
  methods: {
    handleDragStart(event, index) {
      this.draggedIndex = index
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/html', event.target.innerHTML)
      event.target.style.opacity = '0.4'
    },

    handleDragEnd(event) {
      event.target.style.opacity = '1'
      this.draggedIndex = null
      this.dragOverIndex = null
    },

    handleDragOver(event, index) {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      this.dragOverIndex = index
    },

    handleDrop(event, index) {
      event.preventDefault()

      if (this.draggedIndex === null || this.draggedIndex === index) {
        return
      }

      const newItems = [...this.items]
      const draggedItem = newItems[this.draggedIndex]

      // Remove from old position
      newItems.splice(this.draggedIndex, 1)

      // Insert at new position
      const insertIndex = this.draggedIndex < index ? index - 1 : index
      newItems.splice(insertIndex, 0, draggedItem)

      this.$emit('reorder', newItems)
    },

    handleDelete(index) {
      const item = this.items[index]
      const itemName = item.isHeading ? item.heading : (item.product ? item.product.name : 'dette elementet')

      if (confirm(`Er du sikker på at du vil fjerne "${itemName}"?`)) {
        this.$emit('delete', index)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.category-product-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #fff;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  transition: all 0.2s;
  cursor: move;

  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  &.is-dragging {
    opacity: 0.4;
  }

  &.is-heading {
    background: #f9fafb;
    border-color: #d1d5db;
  }
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
  color: #ef4444;
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: #fee2e2;
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
