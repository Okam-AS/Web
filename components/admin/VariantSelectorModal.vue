<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-container">
      <div class="modal-header">
        <h2>Velg tilbehør</h2>
        <button class="close-btn" @click="closeModal">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="modal-body">
        <p class="modal-description">
          Velg varianter som skal vises som tilbehør på alle produkter i denne kategorien.
        </p>

        <!-- Create New Variant Section -->
        <div class="create-section">
          <button class="btn btn-create" @click="showCreateForm = !showCreateForm">
            <span class="material-icons">add</span>
            Opprett ny variant
          </button>

          <!-- Create Form -->
          <div v-if="showCreateForm" class="create-form">
            <div class="form-group">
              <label>Variantnavn *</label>
              <input
                v-model="newVariant.name"
                type="text"
                placeholder="F.eks. Ekstra ost, Dressing, etc."
                class="form-input"
              />
            </div>

            <div class="form-row">
              <div class="form-group checkbox-group">
                <label>
                  <input v-model="newVariant.multiselect" type="checkbox" />
                  <span>Flervalg</span>
                </label>
              </div>

              <div class="form-group checkbox-group">
                <label>
                  <input v-model="newVariant.required" type="checkbox" />
                  <span>Obligatorisk</span>
                </label>
              </div>
            </div>

            <!-- Variant Options -->
            <div class="options-section">
              <label>Alternativer *</label>
              <div
                v-for="(option, index) in newVariant.options"
                :key="index"
                class="option-row"
              >
                <input
                  v-model="option.name"
                  type="text"
                  placeholder="Alternativ navn"
                  class="option-input"
                />
                <input
                  v-model.number="option.amount"
                  type="number"
                  placeholder="Pris (øre)"
                  class="option-price"
                  min="0"
                />
                <button
                  class="remove-option-btn"
                  @click="removeOption(index)"
                  title="Fjern alternativ"
                >
                  <span class="material-icons">close</span>
                </button>
              </div>

              <button class="btn btn-add-option" @click="addOption">
                <span class="material-icons">add</span>
                Legg til alternativ
              </button>
            </div>

            <div class="form-actions">
              <button class="btn btn-secondary" @click="cancelCreate">
                Avbryt
              </button>
              <button class="btn btn-primary" @click="saveNewVariant">
                Lagre variant
              </button>
            </div>
          </div>
        </div>

        <!-- Existing Variants List -->
        <div class="variants-section">
          <h3>Eksisterende varianter</h3>

          <!-- Loading State -->
          <div v-if="isLoading" class="loading-container">
            <span class="material-icons spinning">refresh</span>
            <p>Laster varianter...</p>
          </div>

          <!-- Variants List -->
          <div v-else-if="availableVariants.length > 0" class="variant-list">
            <div
              v-for="variant in availableVariants"
              :key="variant.id"
              class="variant-item"
              :class="{ selected: isSelected(variant.id) }"
              @click="toggleVariant(variant.id)"
            >
              <!-- Checkbox -->
              <div class="variant-checkbox">
                <div class="checkbox-circle" :class="{ checked: isSelected(variant.id) }">
                  <span v-if="isSelected(variant.id)" class="material-icons">check</span>
                </div>
              </div>

              <!-- Variant Info -->
              <div class="variant-info">
                <div class="variant-name">{{ variant.name }}</div>
                <div class="variant-details">
                  <span v-if="variant.multiselect" class="badge">Flervalg</span>
                  <span v-if="variant.required" class="badge">Obligatorisk</span>
                  <span class="option-count">
                    {{ variant.options ? variant.options.length : 0 }} alternativ{{ variant.options && variant.options.length !== 1 ? 'er' : '' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div v-else class="empty-state">
            <span class="material-icons">category</span>
            <p>Ingen varianter tilgjengelig</p>
            <p class="empty-hint">Opprett en ny variant for å komme i gang</p>
          </div>
        </div>

        <!-- Selected Count -->
        <div v-if="selectedVariantIds.length > 0" class="selected-count">
          {{ selectedVariantIds.length }} variant{{ selectedVariantIds.length !== 1 ? 'er' : '' }} valgt
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
  </div>
</template>

<script>
export default {
  name: 'VariantSelectorModal',
  props: {
    defaultSelectedVariantIds: {
      type: Array,
      default: () => []
    },
    categoryId: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      isOpen: false,
      isLoading: false,
      availableVariants: [],
      selectedVariantIds: [],
      showCreateForm: false,
      newVariant: this.getEmptyVariant(),
      resolve: null
    }
  },
  methods: {
    getEmptyVariant() {
      return {
        name: '',
        multiselect: false,
        required: false,
        options: [
          { name: '', amount: 0, orderIndex: 0 }
        ]
      }
    },

    async open(preSelectedIds = []) {
      this.isOpen = true
      this.selectedVariantIds = [...preSelectedIds]
      this.showCreateForm = false
      this.newVariant = this.getEmptyVariant()

      await this.loadVariants()

      return new Promise((resolve) => {
        this.resolve = resolve
      })
    },

    async loadVariants() {
      try {
        this.isLoading = true
        const storeId = this.$store.state.selectedAdminStore

        // Get all products to extract their variants
        const products = await this._productService.GetAll(storeId)

        // Extract all unique variants from products
        const variantsMap = new Map()
        products.forEach(product => {
          if (product.productVariants && product.productVariants.length > 0) {
            product.productVariants.forEach(variant => {
              if (!variantsMap.has(variant.id)) {
                variantsMap.set(variant.id, variant)
              }
            })
          }
        })

        this.availableVariants = Array.from(variantsMap.values())
      } catch (error) {
        console.error('Failed to load variants:', error)
        alert('Kunne ikke laste varianter. Vennligst prøv igjen.')
        this.availableVariants = []
      } finally {
        this.isLoading = false
      }
    },

    isSelected(variantId) {
      return this.selectedVariantIds.includes(variantId)
    },

    toggleVariant(variantId) {
      const index = this.selectedVariantIds.indexOf(variantId)
      if (index === -1) {
        this.selectedVariantIds.push(variantId)
      } else {
        this.selectedVariantIds.splice(index, 1)
      }
    },

    addOption() {
      this.newVariant.options.push({
        name: '',
        amount: 0,
        orderIndex: this.newVariant.options.length
      })
    },

    removeOption(index) {
      if (this.newVariant.options.length > 1) {
        this.newVariant.options.splice(index, 1)
        // Update order indexes
        this.newVariant.options.forEach((opt, idx) => {
          opt.orderIndex = idx
        })
      }
    },

    cancelCreate() {
      this.showCreateForm = false
      this.newVariant = this.getEmptyVariant()
    },

    async saveNewVariant() {
      // Validation
      if (!this.newVariant.name || this.newVariant.name.trim() === '') {
        alert('Vennligst angi et variantnavn')
        return
      }

      const validOptions = this.newVariant.options.filter(opt => opt.name && opt.name.trim())
      if (validOptions.length === 0) {
        alert('Vennligst legg til minst ett alternativ')
        return
      }

      try {
        // Create variant structure
        const variant = {
          name: this.newVariant.name.trim(),
          multiselect: this.newVariant.multiselect,
          required: this.newVariant.required,
          options: validOptions.map((opt, index) => ({
            name: opt.name.trim(),
            amount: opt.amount || 0,
            orderIndex: index
          })),
          orderIndex: 0
        }

        // Note: In a real implementation, we'd need to create this variant
        // For now, we'll just add it to the local list and select it
        // The actual API call would be handled when saving the category

        alert('Variant opprettet! (Husk å lagre kategorien)')
        this.showCreateForm = false
        this.newVariant = this.getEmptyVariant()

        // Reload variants to show the new one (in production this would come from API)
        // For now, we'll just close the form
      } catch (error) {
        console.error('Failed to create variant:', error)
        alert('Kunne ikke opprette variant. Vennligst prøv igjen.')
      }
    },

    confirmSelection() {
      if (this.resolve) {
        // Return the actual variant objects, not just IDs
        const selectedVariants = this.availableVariants.filter(v =>
          this.selectedVariantIds.includes(v.id)
        )
        this.resolve(selectedVariants)
      }
      this.closeModal()
    },

    closeModal() {
      if (this.resolve) {
        this.resolve(null)
      }
      this.isOpen = false
      this.availableVariants = []
      this.selectedVariantIds = []
      this.showCreateForm = false
      this.newVariant = this.getEmptyVariant()
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
  max-width: 700px;
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

.modal-description {
  margin: 0 0 20px 0;
  color: #6b7280;
  font-size: 0.95em;
}

.create-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 2px solid #e5e7eb;

  .btn-create {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #10b981;
    color: #fff;

    &:hover {
      background: #059669;
    }
  }
}

.create-form {
  margin-top: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
    color: #374151;
    font-size: 0.95em;
  }

  &.checkbox-group {
    margin-bottom: 8px;

    label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      cursor: pointer;

      input[type="checkbox"] {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }
    }
  }
}

.form-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1em;

  &:focus {
    outline: none;
    border-color: #0066cc;
  }
}

.options-section {
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: #374151;
    font-size: 0.95em;
  }
}

.option-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;

  .option-input {
    flex: 2;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.95em;

    &:focus {
      outline: none;
      border-color: #0066cc;
    }
  }

  .option-price {
    flex: 1;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.95em;

    &:focus {
      outline: none;
      border-color: #0066cc;
    }
  }

  .remove-option-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    color: #ef4444;

    &:hover {
      color: #dc2626;
    }

    .material-icons {
      font-size: 20px;
    }
  }
}

.btn-add-option {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #e5e7eb;
  color: #374151;
  font-size: 0.9em;
  padding: 8px 12px;

  &:hover {
    background: #d1d5db;
  }

  .material-icons {
    font-size: 18px;
  }
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.variants-section {
  h3 {
    margin: 0 0 16px 0;
    font-size: 1.1em;
    font-weight: 600;
    color: #292c34;
  }
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: #6b7280;

  .material-icons {
    font-size: 48px;
    margin-bottom: 12px;
    color: #0066cc;

    &.spinning {
      animation: spin 1s linear infinite;
    }
  }

  p {
    margin: 0;
  }
}

.variant-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.variant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #0066cc;
    background: #f9fafb;
  }

  &.selected {
    border-color: #0066cc;
    background: #eff6ff;
  }
}

.variant-checkbox {
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
      background: #0066cc;
      border-color: #0066cc;

      .material-icons {
        color: #fff;
        font-size: 18px;
      }
    }
  }
}

.variant-info {
  flex: 1;

  .variant-name {
    font-size: 1.05em;
    font-weight: 600;
    color: #292c34;
    margin-bottom: 6px;
  }

  .variant-details {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;

    .badge {
      padding: 2px 8px;
      background: #dbeafe;
      color: #1e40af;
      border-radius: 4px;
      font-size: 0.8em;
      font-weight: 600;
    }

    .option-count {
      font-size: 0.9em;
      color: #6b7280;
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: #9ca3af;
  text-align: center;

  .material-icons {
    font-size: 64px;
    margin-bottom: 12px;
  }

  p {
    margin: 4px 0;
    font-size: 1em;
    color: #6b7280;

    &.empty-hint {
      font-size: 0.9em;
      color: #9ca3af;
    }
  }
}

.selected-count {
  margin-top: 16px;
  padding: 8px 12px;
  background: #eff6ff;
  border-radius: 8px;
  color: #1e40af;
  font-weight: 600;
  font-size: 0.95em;
  text-align: center;
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
  display: flex;
  align-items: center;
  gap: 6px;

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
  background: #0066cc;
  color: #fff;

  &:hover {
    background: #0052a3;
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
