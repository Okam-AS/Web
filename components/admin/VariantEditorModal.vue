<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="handleOverlayClick">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <h2>{{ isEditing ? 'Rediger tilbehør' : 'Nytt tilbehør' }}</h2>
        <button class="close-btn" @click="cancel" type="button">
          <span class="material-icons">close</span>
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <!-- Variant Name -->
        <div class="form-group" :class="{ 'has-error': errors.name }">
          <label>Navn *</label>
          <input
            ref="nameInput"
            v-model="form.name"
            type="text"
            placeholder="F.eks. Dressing, Ekstra ost"
            class="form-input"
            @input="clearError('name')"
          />
          <span v-if="errors.name" class="error-message">{{ errors.name }}</span>
        </div>

        <!-- Checkboxes -->
        <div class="checkbox-row">
          <label class="checkbox-label">
            <input v-model="form.multiselect" type="checkbox" />
            <span class="checkbox-text">
              <strong>Flervalg</strong>
              <small>Kunden kan velge flere alternativer</small>
            </span>
          </label>

          <label class="checkbox-label">
            <input v-model="form.required" type="checkbox" />
            <span class="checkbox-text">
              <strong>Obligatorisk</strong>
              <small>Kunden må velge minst ett alternativ</small>
            </span>
          </label>
        </div>

        <!-- Options Section -->
        <div class="options-section">
          <div class="options-header">
            <label>Alternativer *</label>
            <span v-if="errors.options" class="error-message">{{ errors.options }}</span>
          </div>

          <draggable
            v-model="form.options"
            class="options-list"
            handle=".option-drag-handle"
            animation="200"
            ghost-class="option-ghost"
          >
            <div
              v-for="(option, index) in form.options"
              :key="option._key"
              class="option-row"
            >
              <span class="material-icons option-drag-handle">drag_indicator</span>
              <input
                v-model="option.name"
                type="text"
                placeholder="Navn på alternativ"
                class="option-name-input"
                @input="clearError('options')"
              />
              <div class="price-input-wrapper">
                <span class="currency-label">kr</span>
                <input
                  :ref="`priceInput-${index}`"
                  type="text"
                  inputmode="decimal"
                  placeholder="0"
                  class="option-price-input"
                  @input="handlePriceInput($event, index)"
                  @blur="handlePriceBlur($event, index)"
                  @focus="handlePriceFocus($event, index)"
                />
              </div>
              <button
                class="remove-option-btn"
                type="button"
                @click="removeOption(index)"
                :disabled="form.options.length <= 1"
                title="Fjern alternativ"
              >
                <span class="material-icons">close</span>
              </button>
            </div>
          </draggable>

          <button class="btn btn-add-option" type="button" @click="addOption">
            <span class="material-icons">add</span>
            Legg til alternativ
          </button>
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
          @click="save"
          :disabled="isSaving"
        >
          <Loading v-if="isSaving" :loading="true" :size="20" />
          {{ isEditing ? 'Lagre endringer' : 'Opprett' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import draggable from 'vuedraggable'
import Loading from '~/components/atoms/Loading.vue'

let optionKeyCounter = 0

export default {
  name: 'VariantEditorModal',

  components: {
    draggable,
    Loading
  },

  data() {
    return {
      isOpen: false,
      isEditing: false,
      isSaving: false,
      resolve: null,
      form: {
        id: null,
        name: '',
        multiselect: false,
        required: false,
        options: []
      },
      originalForm: null,
      errors: {
        name: null,
        options: null
      }
    }
  },

  computed: {
    hasChanges() {
      if (!this.originalForm) return false

      // Compare form with original
      return JSON.stringify(this.normalizeForm(this.form)) !==
             JSON.stringify(this.normalizeForm(this.originalForm))
    }
  },

  methods: {
    normalizeForm(form) {
      // Create a normalized version of form for comparison (remove _key fields)
      return {
        id: form.id,
        name: form.name,
        multiselect: form.multiselect,
        required: form.required,
        options: form.options.map(opt => ({
          id: opt.id,
          name: opt.name,
          amount: opt.amount,
          orderIndex: opt.orderIndex
        }))
      }
    },

    /**
     * Open modal for creating or editing a variant
     * @param {Object|null} variant - Pass null for new, or existing variant for edit
     * @returns {Promise<Object|null>} - Returns variant object or null if cancelled
     */
    open(variant = null) {
      this.isOpen = true
      this.isEditing = !!variant
      this.isSaving = false
      this.errors = { name: null, options: null }

      if (variant) {
        // Editing existing variant - deep clone
        this.form = {
          id: variant.id,
          name: variant.name || '',
          multiselect: variant.multiselect || false,
          required: variant.required || false,
          options: (variant.options || []).map(opt => {
            // Ensure amount is set - API returns amount in øre
            // If amount is missing, calculate from wholeAmount/fractionAmount
            let amount = opt.amount
            if (amount === undefined || amount === null) {
              const whole = opt.wholeAmount || 0
              const fraction = parseInt(opt.fractionAmount || '0', 10)
              amount = (whole * 100) + fraction
            }
            return {
              ...opt,
              amount: amount,
              _key: ++optionKeyCounter
            }
          })
        }
        // Ensure at least one option
        if (this.form.options.length === 0) {
          this.addOption()
        }
      } else {
        // Creating new variant
        this.form = {
          id: null,
          name: '',
          multiselect: false,
          required: false,
          options: []
        }
        this.addOption()
      }

      // Store original form for change detection
      this.originalForm = JSON.parse(JSON.stringify(this.form))

      // Focus name input and set initial price values after modal opens
      this.$nextTick(() => {
        this.$refs.nameInput?.focus()
        // Set initial price input values
        this.form.options.forEach((opt, index) => {
          const input = this.$refs[`priceInput-${index}`]?.[0]
          if (input) {
            input.value = this.formatPrice(opt.amount)
          }
        })
      })

      return new Promise((resolve) => {
        this.resolve = resolve
      })
    },

    addOption() {
      const newIndex = this.form.options.length
      this.form.options.push({
        _key: ++optionKeyCounter,
        id: null,
        name: '',
        amount: 0,
        orderIndex: newIndex
      })

      // Set initial value for the new price input
      this.$nextTick(() => {
        const input = this.$refs[`priceInput-${newIndex}`]?.[0]
        if (input) {
          input.value = ''
        }
      })
    },

    removeOption(index) {
      if (this.form.options.length > 1) {
        this.form.options.splice(index, 1)
        this.updateOrderIndexes()
      }
    },

    updateOrderIndexes() {
      this.form.options.forEach((opt, idx) => {
        opt.orderIndex = idx
      })
    },

    formatPrice(amountInOre) {
      if (!amountInOre || amountInOre === 0) return ''
      return (amountInOre / 100).toFixed(2).replace('.', ',')
    },

    handlePriceFocus(event, index) {
      // When focusing, show raw unformatted value for easier editing
      const amount = this.form.options[index].amount
      if (amount === 0) {
        event.target.value = ''
      } else {
        // Show value without formatting (e.g., "41" instead of "41,00")
        const krValue = amount / 100
        event.target.value = krValue.toString().replace('.', ',')
      }
      // Select all text for easy replacement
      event.target.select()
    },

    handlePriceInput(event, index) {
      let value = event.target.value.replace(/[^\d.,]/g, '')

      // Allow only one decimal separator
      const firstSeparator = value.search(/[.,]/)
      if (firstSeparator !== -1) {
        const beforeSeparator = value.substring(0, firstSeparator + 1)
        const afterSeparator = value.substring(firstSeparator + 1).replace(/[.,]/g, '')
        value = beforeSeparator + afterSeparator
      }

      value = value.replace(',', '.')

      if (value === '' || value === '.') {
        this.form.options[index].amount = 0
        return
      }

      const nokValue = parseFloat(value)
      if (!isNaN(nokValue)) {
        this.form.options[index].amount = Math.round(nokValue * 100)
      }
    },

    handlePriceBlur(event, index) {
      // Format the value when losing focus
      const amount = this.form.options[index].amount
      if (amount === 0) {
        event.target.value = ''
      } else {
        event.target.value = this.formatPrice(amount)
      }
    },

    clearError(field) {
      this.errors[field] = null
    },

    validate() {
      let isValid = true
      this.errors = { name: null, options: null }

      // Validate name
      if (!this.form.name || this.form.name.trim() === '') {
        this.errors.name = 'Vennligst angi et navn'
        isValid = false
      }

      // Validate options - at least one with a name
      const validOptions = this.form.options.filter(opt => opt.name && opt.name.trim())
      if (validOptions.length === 0) {
        this.errors.options = 'Legg til minst ett alternativ med navn'
        isValid = false
      }

      return isValid
    },

    save() {
      if (!this.validate()) return

      this.isSaving = true

      // Update order indexes
      this.updateOrderIndexes()

      // Build variant object
      const variant = {
        id: this.form.id,
        name: this.form.name.trim(),
        multiselect: this.form.multiselect,
        required: this.form.required,
        orderIndex: 0,
        options: this.form.options
          .filter(opt => opt.name && opt.name.trim())
          .map((opt, idx) => {
            // Convert amount in øre to wholeAmount and fractionAmount
            // Backend expects: wholeAmount (kr) and fractionAmount (øre as string)
            const amountInOre = opt.amount || 0
            const wholeAmount = Math.floor(amountInOre / 100)
            const fractionAmount = String(amountInOre % 100).padStart(2, '0')

            return {
              id: opt.id,
              name: opt.name.trim(),
              amount: amountInOre,
              wholeAmount: wholeAmount,
              fractionAmount: fractionAmount,
              orderIndex: idx,
              negativeAmount: false,
              otherInformation: opt.otherInformation || ''
            }
          })
      }

      if (this.resolve) {
        this.resolve(variant)
      }

      this.close()
    },

    handleOverlayClick() {
      // Only allow closing by clicking outside if there are no changes
      if (!this.hasChanges) {
        this.cancel()
      }
    },

    cancel() {
      // Check for unsaved changes
      if (this.hasChanges) {
        if (!confirm('Du har ulagrede endringer. Er du sikker på at du vil lukke?')) {
          return
        }
      }

      if (this.resolve) {
        this.resolve(null)
      }
      this.close()
    },

    close() {
      this.isOpen = false
      this.isEditing = false
      this.isSaving = false
      this.resolve = null
      this.originalForm = null
      this.form = {
        id: null,
        name: '',
        multiselect: false,
        required: false,
        options: []
      }
      this.errors = { name: null, options: null }
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

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

// Form styles
.form-group {
  margin-bottom: 20px;

  label {
    display: block;
    margin-bottom: 6px;
    font-weight: 600;
    color: #374151;
    font-size: 0.95em;
  }

  &.has-error {
    .form-input {
      border-color: #ef4444;
    }
  }
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1em;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #94a3b8;
    box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
}

.error-message {
  display: block;
  color: #ef4444;
  font-size: 0.85em;
  margin-top: 4px;
}

// Checkbox styles
.checkbox-row {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
  flex-wrap: wrap;

  @media (max-width: 500px) {
    flex-direction: column;
    gap: 12px;
  }
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    margin-top: 2px;
    cursor: pointer;
    accent-color: #334155;
  }

  .checkbox-text {
    display: flex;
    flex-direction: column;

    strong {
      color: #292c34;
      font-weight: 600;
    }

    small {
      color: #6b7280;
      font-size: 0.85em;
      margin-top: 2px;
    }
  }
}

// Options section
.options-section {
  .options-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    label {
      font-weight: 600;
      color: #374151;
      font-size: 0.95em;
    }
  }
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.option-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.15s;

  &:hover {
    border-color: #d1d5db;
  }

  .option-drag-handle {
    color: #9ca3af;
    cursor: grab;
    font-size: 20px;
    flex-shrink: 0;

    &:active {
      cursor: grabbing;
    }
  }

  .option-name-input {
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 0.95em;

    &:focus {
      outline: none;
      border-color: #94a3b8;
      box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.1);
    }

    &::placeholder {
      color: #9ca3af;
    }
  }

  .price-input-wrapper {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;

    .currency-label {
      color: #6b7280;
      font-size: 0.9em;
      font-weight: 500;
    }

    .option-price-input {
      width: 80px;
      padding: 8px 10px;
      border: 1px solid #d1d5db;
      border-radius: 4px;
      font-size: 0.95em;
      text-align: right;

      &:focus {
        outline: none;
        border-color: #0066cc;
      }

      &::placeholder {
        color: #9ca3af;
      }
    }
  }

  .remove-option-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    color: #9ca3af;
    border-radius: 4px;
    transition: all 0.2s;
    flex-shrink: 0;

    &:hover:not(:disabled) {
      color: #ef4444;
      background: #fee2e2;
    }

    &:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .material-icons {
      font-size: 20px;
    }
  }
}

.option-ghost {
  opacity: 0.5;
  background: #f1f5f9;
  border-color: #334155;
}

// Buttons
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

  .material-icons {
    font-size: 18px;
  }
}

.btn-primary {
  background: #334155;
  color: #fff;

  &:hover:not(:disabled) {
    background: #1e293b;
  }
}

.btn-secondary {
  background: #f3f4f6;
  color: #4b5563;

  &:hover:not(:disabled) {
    background: #e5e7eb;
  }
}

.btn-add-option {
  background: #f3f4f6;
  color: #374151;
  padding: 8px 12px;
  font-size: 0.9em;

  &:hover {
    background: #e5e7eb;
  }

  .material-icons {
    font-size: 18px;
  }
}

// Spinner now handled by Loading component
</style>
