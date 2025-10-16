<template>
  <div
    class="modal-backdrop"
    @click.self="cancel"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>Endre leveringstype</h2>
        <button
          class="close-btn"
          @click="cancel"
        >
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="modal-body">
        <div class="order-info">
          <div class="info-row">
            <span class="label">Butikk:</span>
            <span class="value">{{ order.storeLegalName }}</span>
          </div>
          <div class="info-row">
            <span class="label">Ordre:</span>
            <span class="value">#{{ order.friendlyOrderId || order.id }}</span>
          </div>
          <div class="info-row">
            <span class="label">Nåværende leveringstype:</span>
            <span class="value">{{ deliveryTypeLabel(order.deliveryType) }}</span>
          </div>
        </div>

        <div class="delivery-selection">
          <label>Velg ny leveringstype:</label>
          <div class="delivery-list">
            <button
              v-for="type in availableDeliveryTypes"
              :key="type.value"
              class="delivery-option"
              :class="{ 'is-selected': selectedDeliveryType === type.value }"
              @click="selectedDeliveryType = type.value"
            >
              <span class="material-icons icon-check">{{ selectedDeliveryType === type.value ? 'radio_button_checked' : 'radio_button_unchecked' }}</span>
              <span class="material-icons icon-type">{{ type.icon }}</span>
              <div class="type-info">
                <span class="type-label">{{ type.label }}</span>
                <span
                  v-if="type.description"
                  class="type-description"
                >{{ type.description }}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="btn btn-secondary"
          @click="cancel"
        >
          Avbryt
        </button>
        <button
          v-if="!isLoading"
          class="btn btn-primary"
          :disabled="!selectedDeliveryType"
          @click="confirm"
        >
          Endre leveringstype
        </button>
        <div
          v-else
          class="loading-spinner"
        />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChangeDeliveryTypeModal',
  props: {
    order: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      isLoading: false,
      selectedDeliveryType: null,
      deliveryTypes: [
        { value: 'SelfPickup', label: 'Hent selv', icon: 'shopping_bag', description: 'Kunde henter selv' },
        { value: 'InstantHomeDelivery', label: 'Hjemlevering', icon: 'delivery_dining', description: 'Leveres hjem til kunde' },
        { value: 'TableDelivery', label: 'Spis inne', icon: 'deck', description: 'Serveres ved bord' },
        { value: 'WoltDelivery', label: 'Wolt', icon: 'delivery_dining', description: 'Leveres via Wolt' }
      ]
    }
  },
  mounted() {
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  },
  beforeDestroy() {
    // Restore body scroll
    document.body.style.overflow = '';
  },
  computed: {
    availableDeliveryTypes() {
      return this.deliveryTypes.filter(t => t.value !== this.order.deliveryType)
    }
  },
  methods: {
    confirm() {
      if (this.isLoading || !this.selectedDeliveryType) return
      this.isLoading = true

      this._orderService
        .ChangeDeliveryType(this.order.id, this.selectedDeliveryType)
        .then(() => {
          this.$emit('close', true)
        })
        .catch((error) => {
          alert('Feil ved endring av leveringstype: ' + (error.message || 'Ukjent feil'))
          this.isLoading = false
        })
    },
    cancel() {
      this.$emit('close', false)
    }
  }
}
</script>

<style scoped lang="scss">
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    margin: 0;
    font-size: 1.5em;
    color: #292c34;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 4px;
    color: #666;
    transition: color 0.2s;

    &:hover {
      color: #1bb776;
    }

    .material-icons {
      font-size: 24px;
    }
  }
}

.modal-body {
  padding: 24px;
}

.order-info {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;

    &:not(:last-child) {
      border-bottom: 1px solid #e0e0e0;
    }

    .label {
      font-weight: 600;
      color: #4a5568;
    }

    .value {
      color: #292c34;
      font-weight: 500;
    }
  }
}

.delivery-selection {
  label {
    display: block;
    font-weight: 600;
    color: #4a5568;
    margin-bottom: 12px;
    font-size: 0.95em;
  }
}

.delivery-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.delivery-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;

  .icon-check {
    color: #999;
    font-size: 20px;
    flex-shrink: 0;
  }

  .icon-type {
    color: #666;
    font-size: 28px;
    flex-shrink: 0;
  }

  .type-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .type-label {
    font-weight: 600;
    color: #292c34;
    font-size: 1em;
  }

  .type-description {
    font-size: 0.85em;
    color: #666;
  }

  &:hover {
    background: #f0f2f5;
    border-color: #1bb776;

    .icon-type {
      color: #1bb776;
    }
  }

  &.is-selected {
    background: #e8f7f1;
    border-color: #1bb776;

    .icon-check {
      color: #1bb776;
    }

    .icon-type {
      color: #1bb776;
    }

    .type-label {
      color: #1bb776;
      font-weight: 700;
    }
  }
}

.modal-footer {
  padding: 24px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &.btn-secondary {
    background: #e8eaed;
    color: #292c34;

    &:hover {
      background: #d5d8dc;
    }
  }

  &.btn-primary {
    background: #1bb776;
    color: white;

    &:hover:not(:disabled) {
      background: #159a61;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
    }

    &:disabled {
      background: #ccc;
      cursor: not-allowed;
      opacity: 0.6;
    }

    &:active:not(:disabled) {
      transform: translateY(0);
    }
  }
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top: 4px solid #1bb776;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
