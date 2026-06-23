<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="cancel">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <h2>Kopier «{{ variantName }}» til…</h2>
        <button class="close-btn" type="button" @click="cancel">
          <span class="material-icons">close</span>
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <p class="copy-description">{{ description }}</p>

        <div class="select-row">
          <span class="selected-count">{{ selectedIds.length }} valgt</span>
          <div class="select-actions">
            <button type="button" class="link-btn" @click="selectAll">Velg alle</button>
            <span class="divider">·</span>
            <button type="button" class="link-btn" @click="selectNone">Fjern alle</button>
          </div>
        </div>

        <ul v-if="targets.length" class="target-list">
          <li v-for="target in targets" :key="target.id">
            <label class="target-item">
              <input
                type="checkbox"
                :checked="selectedIds.includes(target.id)"
                @change="toggle(target.id)"
              />
              <span class="target-name">{{ target.name }}</span>
            </label>
          </li>
        </ul>
        <div v-else class="empty-hint">
          Ingen tilgjengelige mål
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <button class="btn btn-secondary" type="button" @click="cancel">
          Avbryt
        </button>
        <button
          class="btn btn-primary"
          type="button"
          :disabled="selectedIds.length === 0"
          @click="confirm"
        >
          Kopier{{ selectedIds.length ? ` (${selectedIds.length})` : '' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CopyVariantToTargetsModal',

  data() {
    return {
      isOpen: false,
      resolve: null,
      variantName: '',
      targetType: 'category',
      targets: [],
      selectedIds: []
    }
  },

  computed: {
    description() {
      return this.targetType === 'product'
        ? 'Velg hvilke produkter tilbehøret skal kopieres til. Finnes en gruppe med samme navn fra før, blir den oppdatert.'
        : 'Velg hvilke kategorier tilbehøret skal kopieres til. Finnes en gruppe med samme navn fra før, blir den oppdatert.'
    }
  },

  methods: {
    /**
     * Open the picker.
     * @param {Object} options
     * @param {string} options.variantName - Name of the group being copied (for the title)
     * @param {Array<{id: string, name: string}>} options.targets - Selectable targets
     * @param {string} [options.targetType] - 'category' | 'product' (affects copy)
     * @param {string} [options.excludeId] - Target id to exclude (the current one)
     * @returns {Promise<Array<string>|null>} Selected ids, or null if cancelled
     */
    open({ variantName, targets, targetType = 'category', excludeId = null }) {
      this.variantName = variantName || ''
      this.targetType = targetType
      this.targets = (targets || []).filter(t => t.id && t.id !== excludeId)
      this.selectedIds = []
      this.isOpen = true

      return new Promise((resolve) => {
        this.resolve = resolve
      })
    },

    toggle(id) {
      const index = this.selectedIds.indexOf(id)
      if (index === -1) {
        this.selectedIds.push(id)
      } else {
        this.selectedIds.splice(index, 1)
      }
    },

    selectAll() {
      this.selectedIds = this.targets.map(t => t.id)
    },

    selectNone() {
      this.selectedIds = []
    },

    confirm() {
      if (this.selectedIds.length === 0) return
      if (this.resolve) {
        this.resolve([...this.selectedIds])
      }
      this.close()
    },

    cancel() {
      if (this.resolve) {
        this.resolve(null)
      }
      this.close()
    },

    close() {
      this.isOpen = false
      this.resolve = null
      this.variantName = ''
      this.targets = []
      this.selectedIds = []
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
  max-width: 520px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: 1.25em;
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
    color: #6b7280;
    border-radius: 4px;
    transition: all 0.2s;

    &:hover {
      color: #292c34;
      background: #f3f4f6;
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

.copy-description {
  margin: 0 0 16px 0;
  color: #64748b;
  font-size: 0.9em;
}

.select-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  .selected-count {
    font-size: 0.85em;
    font-weight: 600;
    color: #292c34;
  }

  .select-actions {
    display: flex;
    align-items: center;
    gap: 8px;

    .divider {
      color: #cbd5e0;
    }
  }
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-size: 0.85em;
  font-weight: 600;
  color: #1bb776;

  &:hover {
    color: #159f63;
    text-decoration: underline;
  }
}

.target-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  max-height: 320px;
  overflow-y: auto;
}

.target-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s ease;

  &:hover {
    background: #f8f9fa;
  }

  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: #1bb776;
    flex-shrink: 0;
  }

  .target-name {
    color: #292c34;
    font-size: 0.95em;
  }
}

.target-list li:last-child .target-item {
  border-bottom: none;
}

.empty-hint {
  padding: 24px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.9em;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 0.95em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-primary {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);

  &:hover:not(:disabled) {
    box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
  }
}

.btn-secondary {
  background: #f3f4f6;
  color: #4b5563;

  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
}
</style>
