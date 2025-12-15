<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <h3>Velg butikker</h3>
        <button class="close-btn" @click="close">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="modal-body">
        <!-- Select All / Deselect All -->
        <div class="bulk-actions">
          <button
            class="bulk-action-btn"
            :class="{ active: allSelected }"
            @click="selectAll"
          >
            <span class="material-icons">check_box</span>
            Velg alle
          </button>
          <button
            class="bulk-action-btn"
            :class="{ active: noneSelected }"
            @click="deselectAll"
          >
            <span class="material-icons">check_box_outline_blank</span>
            Fjern alle
          </button>
        </div>

        <!-- Store List -->
        <div class="store-list">
          <div
            v-for="store in stores"
            :key="store.id"
            class="store-item"
            :class="{ selected: isSelected(store.id) }"
            @click="toggleStore(store.id)"
          >
            <div class="store-checkbox">
              <div class="checkbox-circle" :class="{ checked: isSelected(store.id) }">
                <span v-if="isSelected(store.id)" class="material-icons">check</span>
              </div>
            </div>
            <div class="store-info">
              <div class="store-name">{{ store.name }}</div>
              <div v-if="store.address" class="store-address">{{ store.address }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="close">
          Lukk
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StoreSelector',
  props: {
    selectedStoreIds: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {
      isOpen: false,
      localSelectedStoreIds: []
    }
  },
  computed: {
    stores() {
      return this.$store.state.currentUser?.adminIn || []
    },
    allSelected() {
      return this.stores.length > 0 && this.localSelectedStoreIds.length === this.stores.length
    },
    noneSelected() {
      return this.localSelectedStoreIds.length === 0
    }
  },
  methods: {
    open() {
      this.localSelectedStoreIds = [...this.selectedStoreIds]
      this.isOpen = true
    },
    close() {
      this.$emit('update:selectedStoreIds', this.localSelectedStoreIds)
      this.isOpen = false
    },
    isSelected(storeId) {
      return this.localSelectedStoreIds.includes(storeId)
    },
    toggleStore(storeId) {
      const index = this.localSelectedStoreIds.indexOf(storeId)
      if (index === -1) {
        this.localSelectedStoreIds.push(storeId)
      } else {
        this.localSelectedStoreIds.splice(index, 1)
      }
      this.$emit('update:selectedStoreIds', this.localSelectedStoreIds)
    },
    selectAll() {
      this.localSelectedStoreIds = this.stores.map(s => s.id)
      this.$emit('update:selectedStoreIds', this.localSelectedStoreIds)
    },
    deselectAll() {
      this.localSelectedStoreIds = []
      this.$emit('update:selectedStoreIds', this.localSelectedStoreIds)
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
  z-index: 10000;
  padding: 20px;
}

.modal-container {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h3 {
    margin: 0;
    font-size: 1.3em;
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
    transition: all 0.2s;
    border-radius: 4px;

    &:hover {
      background: #f3f4f6;
      color: #292c34;
    }

    .material-icons {
      font-size: 24px;
    }
  }
}

.modal-body {
  padding: 20px 24px;
  flex: 1;
  overflow-y: auto;
}

.bulk-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.bulk-action-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: #f9fafb;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.95em;
  font-weight: 600;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f1f5f9;
    border-color: #cbd5e0;
  }

  &.active {
    background: #1bb776;
    border-color: #1bb776;
    color: white;
  }

  .material-icons {
    font-size: 20px;
  }
}

.store-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.store-item {
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
    border-color: #1bb776;
    background: #f0fdf4;
  }
}

.store-checkbox {
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
      background: #1bb776;
      border-color: #1bb776;

      .material-icons {
        color: #fff;
        font-size: 18px;
      }
    }
  }
}

.store-info {
  flex: 1;
  min-width: 0;

  .store-name {
    font-size: 1.05em;
    font-weight: 600;
    color: #292c34;
    margin-bottom: 2px;
  }

  .store-address {
    font-size: 0.9em;
    color: #6b7280;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
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
}

.btn-secondary {
  background: #f3f4f6;
  color: #4b5563;

  &:hover {
    background: #e5e7eb;
  }
}
</style>
