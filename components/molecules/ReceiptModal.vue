<template>
  <div
    class="modal-backdrop"
    @click.self="close"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>Kvittering</h2>
        <button
          class="close-btn"
          @click="close"
        >
          <span class="material-icons">close</span>
        </button>
      </div>

      <div
        v-if="order"
        class="modal-body"
      >
        <!-- Store Info -->
        <div class="store-info">
          <div class="store-details">
            <p
              v-if="order.storeLegalName"
              class="store-name"
            >
              {{ order.storeLegalName }}
            </p>
            <p v-if="order.storeFullAddress">{{ order.storeFullAddress }}</p>
            <p v-if="order.storeZipCode || order.storeCity">
              {{ order.storeZipCode }} {{ order.storeCity }}
            </p>
          </div>
          <div
            v-if="order.storeVAT"
            class="store-vat"
          >
            <p>Org.nr {{ order.storeVAT }} MVA</p>
            <p>Foretaksregisteret</p>
          </div>
        </div>

        <!-- Order Details -->
        <div class="order-details">
          <div class="detail-row">
            <span class="label">Bestillingsnummer:</span>
            <span class="value">{{ order.friendlyOrderId ? order.friendlyOrderId + ' (' + order.id + ')' : order.id }}</span>
          </div>
          <div
            v-if="order.userFullName || order.user?.phoneNumber"
            class="detail-row"
          >
            <span class="label">Kunde:</span>
            <span class="value">{{ order.userFullName || order.user?.phoneNumber || '-' }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Betaling:</span>
            <span class="value">{{ paymentTypeLabel(order.paymentType) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Leveringsmåte:</span>
            <span class="value">{{ deliveryTypeLabel(order.deliveryType) }}</span>
          </div>
          <div
            v-if="order.tableName"
            class="detail-row"
          >
            <span class="label">Bordnummer:</span>
            <span class="value">{{ order.tableName }}</span>
          </div>
          <div
            v-if="(order.deliveryType === 'InstantHomeDelivery' || order.deliveryType === 'DineHomeDelivery' || order.deliveryType === 'WoltDelivery') && order.fullAddress"
            class="detail-row"
          >
            <span class="label">Leveringsadresse:</span>
            <span class="value">{{ order.fullAddress }}, {{ order.zipCode }} {{ order.city }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Bestilt:</span>
            <span class="value">{{ formatDate(order.created || order.pickup) }}</span>
          </div>
          <div
            v-if="order.paymentType === 'Stripe' && order.completed && order.status === 'Completed'"
            class="detail-row"
          >
            <span class="label">Betalt:</span>
            <span class="value">{{ formatDate(order.completed) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">Status:</span>
            <span class="value">{{ orderStatusLabel(order.status) }}</span>
          </div>
          <div
            v-if="order.comment"
            class="detail-row"
          >
            <span class="label">Kommentar:</span>
            <span class="value">{{ order.comment }}</span>
          </div>
        </div>

        <!-- Discount Info -->
        <div
          v-if="order.usedRewardAmount > 0 || totalDiscountAmount > 0"
          class="discount-section"
        >
          <div
            v-if="order.usedRewardAmount > 0"
            class="detail-row"
          >
            <span class="label">Reward rabatt:</span>
            <span class="value discount-value">{{ priceLabel(order.usedRewardAmount) }}</span>
          </div>
          <div
            v-if="totalDiscountAmount > 0"
            class="detail-row"
          >
            <span class="label">Rabatt:</span>
            <span class="value discount-value">{{ priceLabel(totalDiscountAmount) }}</span>
          </div>
        </div>

        <!-- Order Items -->
        <div class="order-items">
          <div class="items-header">
            <span class="item-name">Vare</span>
            <span class="item-qty">Ant.</span>
            <span class="item-tax">Mva</span>
            <span class="item-price">Pris</span>
          </div>
          <div class="items-divider" />
          <div
            v-for="item in items"
            :key="item.id"
            class="item-row"
          >
            <span class="item-name">{{ item.name }}</span>
            <span class="item-qty">{{ item.quantity }}</span>
            <span class="item-tax">{{ item.tax }}%</span>
            <span class="item-price">{{ (item.negativeAmount ? '-' : '') + priceLabel(item.amount) }}</span>
          </div>
        </div>

        <!-- Total -->
        <div class="total-section">
          <div class="total-row">
            <span class="total-label">Totalt</span>
            <span class="total-value">{{ priceLabel(order.finalAmount) }}</span>
          </div>
        </div>

        <!-- Tax Details -->
        <div
          v-if="order.taxDetails && order.taxDetails.length > 0"
          class="tax-details"
        >
          <div class="tax-header">
            <span class="tax-rate">Mva-sats</span>
            <span class="tax-basis">Grunnlag</span>
            <span class="tax-amount">Mva</span>
            <span class="tax-total">Totalt inkl. mva</span>
          </div>
          <div class="items-divider" />
          <div
            v-for="(taxDetail, index) in order.taxDetails"
            :key="index"
            class="tax-row"
          >
            <span class="tax-rate">{{ taxDetail.percent }}%</span>
            <span class="tax-basis">{{ priceLabel(taxDetail.basis) }}</span>
            <span class="tax-amount">{{ priceLabel(taxDetail.amount) }}</span>
            <span class="tax-total">{{ priceLabel(taxDetail.totalAmount) }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ReceiptModal',
  props: {
    order: {
      type: Object,
      required: true
    }
  },
  mounted() {
    document.body.style.overflow = 'hidden';
  },
  beforeDestroy() {
    document.body.style.overflow = '';
  },
  computed: {
    items() {
      return this.order?.items || []
    },
    totalDiscountAmount() {
      let itemDiscounts = 0
      if (this.order.items) {
        itemDiscounts = this.order.items.reduce((total, item) => {
          const preDiscount = item.amountPreDiscount || 0
          if (preDiscount > item.amount) {
            const itemDiscount = preDiscount - item.amount
            return total + itemDiscount
          }
          return total
        }, 0)
      }
      const orderDiscount = this.order.orderDiscountAmount || 0
      return itemDiscounts + orderDiscount
    }
  },
  methods: {
    close() {
      this.$emit('close')
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
  max-width: 700px;
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
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
  border-radius: 12px 12px 0 0;

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

.store-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e0e0e0;

  .store-details,
  .store-vat {
    p {
      margin: 4px 0;
      font-size: 0.9em;
      color: #4a5568;
    }
  }

  .store-name {
    font-weight: 600;
    color: #292c34;
    font-size: 1em !important;
  }

  .store-vat {
    text-align: right;
  }
}

.order-details,
.discount-section {
  margin-bottom: 24px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;

  .label {
    font-weight: 600;
    color: #4a5568;
    flex-shrink: 0;
    margin-right: 16px;
  }

  .value {
    color: #292c34;
    text-align: right;
    word-break: break-word;

    &.discount-value {
      color: #1bb776;
      font-weight: 600;
    }
  }
}

.discount-section {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
}

.order-items {
  margin-bottom: 24px;

  .items-header,
  .item-row {
    display: grid;
    grid-template-columns: 2fr 60px 60px 80px;
    gap: 8px;
    padding: 8px 0;
    font-size: 0.9em;
  }

  .items-header {
    font-weight: 600;
    color: #4a5568;

    span {
      &:not(:first-child) {
        text-align: right;
      }
    }
  }

  .items-divider {
    height: 1px;
    background: #e0e0e0;
    margin: 8px 0;
  }

  .item-row {
    color: #292c34;

    .item-name {
      word-break: break-word;
    }

    .item-qty,
    .item-tax,
    .item-price {
      text-align: right;
    }
  }
}

.total-section {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;

  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .total-label {
      font-size: 1.2em;
      font-weight: 600;
      color: #292c34;
    }

    .total-value {
      font-size: 1.4em;
      font-weight: bold;
      color: #1bb776;
    }
  }
}

.tax-details {
  .tax-header,
  .tax-row {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1.2fr;
    gap: 8px;
    padding: 8px 0;
    font-size: 0.85em;
  }

  .tax-header {
    font-weight: 600;
    color: #4a5568;
  }

  .tax-row {
    color: #292c34;
  }

  .items-divider {
    height: 1px;
    background: #e0e0e0;
    margin: 8px 0;
  }
}

@media (max-width: 600px) {
  .store-info {
    flex-direction: column;
    gap: 16px;

    .store-vat {
      text-align: left;
    }
  }

  .order-items {
    .items-header,
    .item-row {
      grid-template-columns: 2fr 50px 50px 70px;
      font-size: 0.85em;
    }
  }

  .tax-details {
    .tax-header,
    .tax-row {
      grid-template-columns: 60px 1fr 1fr 1fr;
      font-size: 0.8em;
    }
  }
}
</style>
