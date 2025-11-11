<template>
  <div
    class="order-card"
    :class="{
      'is-warning': isOrderDelayed(order),
    }"
  >
    <div
      class="order-header"
      :class="{ 'is-preorder': order.requestedCompletion }"
      @click="toggleExpanded"
    >
      <div class="header-left">
        <span class="store-name">{{ order.storeLegalName }}</span>
      </div>
      <div class="header-right">
        <span class="order-status">
          <span class="material-icons">{{ iconForOrder(order) }}</span>
          {{ order.friendlyOrderId }}
        </span>
        <span
          v-if="order.requestedCompletion"
          class="preorder-badge"
        >
          <span class="material-icons">update</span>
          <span>{{ formatRequestedCompletionDate(order.requestedCompletion) }}</span>
        </span>
      </div>
    </div>

    <div
      v-if="isExpanded"
      class="order-details"
    >
      <!-- Requested Completion Time for Preorders -->
      <div
        v-if="order.requestedCompletion"
        class="preorder-requested-time"
      >
        <span class="material-icons">update</span>
        <div>
          <span class="label">Ønsket ferdig til:</span>
          <span class="time">{{ formatRequestedCompletionDate(order.requestedCompletion) }}</span>
        </div>
      </div>

      <!-- Customer Info -->
      <div
        v-if="order.userFullName || (order.user && order.user.phoneNumber && order.user.phoneNumber !== '+4799999999')"
        class="customer-info customer-info-clickable"
        @click="openCustomerInfo"
      >
        <span class="material-icons">{{ order.userIsMember ? 'military_tech' : 'person' }}</span>
        <span>{{ order.userFullName || (order.user ? order.user.phoneNumber : '') }}</span>
        <span class="material-icons customer-chevron">chevron_right</span>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <label>Platform:</label>
          <span>{{ order.platform }}</span>
        </div>
        <div
          v-if="order.deliveryType === 'DineHomeDelivery'"
          class="info-item"
        >
          <label>Sjåførstatus:</label>
          <div class="status-wrapper">
            <span>{{ dineHomeDeliveryStatusLabel(order.dineHomeStatus) }}</span>
            <span
              v-if="getDriverDelay(order) > 0"
              class="delay-badge"
            >
              {{ getDriverDelay(order) }} min forsinket
            </span>
          </div>
        </div>
        <div
          v-if="order.deliveryType === 'WoltDelivery' && order.woltDeliveryInfo"
          class="info-item"
        >
          <label>Wolt status:</label>
          <div class="status-wrapper">
            <span>{{ woltDeliveryStatusLabel(order.woltDeliveryInfo.status) }}</span>
          </div>
        </div>
        <div class="info-item">
          <label>Bestilit:</label>
          <span>{{ formatDate(order.created || order.pickup) }}</span>
        </div>
        <div class="info-item">
          <label>Klar til:</label>
          <span v-if="order.countdownEndTime">{{ formatDate(order.countdownEndTime) }}</span>
        </div>
        <div class="info-item">
          <label>Totalpris:</label>
          <span>{{ priceLabel(order.finalAmount) }}</span>
        </div>
        <div class="info-item">
          <label>Levering:</label>
          <span>{{ deliveryTypeLabel(order.deliveryType) }}</span>
        </div>
        <div class="info-item">
          <label>Betaling:</label>
          <span>{{ paymentTypeLabel(order.paymentType) }}</span>
        </div>
        <div class="info-item">
          <label>Kommentar:</label>
          <span>{{ order.comment }}</span>
        </div>
      </div>

      <div class="order-items">
        <button
          class="toggle-items-btn"
          @click="showItems = !showItems"
        >
          <span class="btn-text">{{ showItems ? "Skjul varer" : "Vis varer" }}</span>
          <span
            class="btn-icon"
            :class="{ 'is-up': showItems }"
          >▼</span>
        </button>

        <div
          v-if="showItems"
          class="items-table"
        >
          <table>
            <thead>
              <tr>
                <th class="u-left">Vare</th>
                <th class="u-right">Pris</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in order.items"
                :key="item.id"
              >
                <td>{{ item.quantity }} {{ item.name }} (Mva: {{ item.tax }}%)</td>
                <td class="u-right">
                  {{ priceLabel(item.amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="order-actions">
        <button
          v-if="primaryActionButton"
          class="btn btn-primary btn-next"
          @click="$emit('primary-action', order)"
        >
          {{ primaryActionButton }}
        </button>

        <button
          class="btn btn-secondary btn-expand"
          @click="showActions = !showActions"
        >
          <span class="material-icons">{{ showActions ? 'expand_less' : 'expand_more' }}</span>
        </button>
      </div>

      <!-- Expanded Actions -->
      <div
        v-if="showActions"
        class="expanded-actions"
      >
        <button
          v-if="adminStores.length > 1"
          class="action-btn"
          @click="$emit('transfer', order)"
        >
          <span class="material-icons">swap_horiz</span>
          Flytt
        </button>
        <button
          class="action-btn"
          @click="$emit('change-delivery', order)"
        >
          <span class="material-icons">edit</span>
          Endre leveringstype
        </button>
        <button
          v-if="order.deliveryType === 'InstantHomeDelivery'"
          class="action-btn"
          @click="$emit('sms-driver', order)"
        >
          <span class="material-icons">sms</span>
          Send SMS til sjåfør
        </button>
        <button
          class="action-btn"
          @click="$emit('receipt', order)"
        >
          <span class="material-icons">receipt</span>
          Kvittering
        </button>
        <button
          class="action-btn action-btn-danger"
          @click="$emit('cancel', order)"
        >
          <span class="material-icons">block</span>
          Kanseller
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    order: {
      type: Object,
      required: true,
    },
    expandedOrderId: {
      type: String,
      default: '',
    },
    adminStores: {
      type: Array,
      default: () => [],
    },
    primaryActionButton: {
      type: String,
      default: null,
    },
  },
  data: () => ({
    showItems: false,
    showActions: false,
  }),
  computed: {
    isExpanded() {
      return this.expandedOrderId === this.order.id;
    },
  },
  methods: {
    toggleExpanded() {
      this.$emit('toggle-expand', this.order.id);
    },
    openCustomerInfo() {
      this.$emit('open-customer', this.order);
    },
    iconForOrder(order) {
      if (order.deliveryType === 'InstantHomeDelivery' || order.deliveryType === 'DineHomeDelivery' || order.deliveryType === 'WoltDelivery') {
        return 'delivery_dining';
      }
      if (order.deliveryType === 'SelfPickup') {
        return 'shopping_bag';
      }
      if (order.deliveryType === 'TableDelivery') {
        return 'deck';
      }
      return 'receipt_long';
    },
    isOrderDelayed(order) {
      const now = new Date();
      const created = new Date(order.created);
      const processingEnd = order.processingEndTime ? new Date(order.processingEndTime) : null;
      const estimatedEnd = order.estimatedProcessingEndTime ? new Date(order.estimatedProcessingEndTime) : null;

      if (order.status === 'Accepted') {
        const diffSeconds = (now - created) / 1000;
        return diffSeconds >= 480;
      }

      if (order.status === 'ReadyForDriver' && processingEnd && estimatedEnd) {
        const latestEnd = processingEnd > estimatedEnd ? processingEnd : estimatedEnd;
        const diffSeconds = (now - latestEnd) / 1000;
        return diffSeconds >= 600 && (!order.dineHomeStatus || order.dineHomeStatus === 'NotSet' || order.dineHomeStatus === 'Accepted');
      }

      return false;
    },
    getDriverDelay(order) {
      const now = new Date();
      const processingEnd = order.processingEndTime ? new Date(order.processingEndTime) : null;
      const estimatedEnd = order.estimatedProcessingEndTime ? new Date(order.estimatedProcessingEndTime) : null;

      if (order.status === 'ReadyForDriver' && processingEnd && estimatedEnd && (!order.dineHomeStatus || order.dineHomeStatus === 'NotSet' || order.dineHomeStatus === 'Accepted')) {
        const latestEnd = processingEnd > estimatedEnd ? processingEnd : estimatedEnd;
        const diffMinutes = Math.floor((now - latestEnd) / (1000 * 60));
        return diffMinutes >= 10 ? diffMinutes : 0;
      }
      return 0;
    },
    dineHomeDeliveryStatusLabel(dineHomeDeliveryTypeEnum) {
      switch (dineHomeDeliveryTypeEnum) {
        case 'Accepted':
          return 'Sjåfør har akseptert';
        case 'PickedUp':
          return 'Sjåfør leverer bestilling';
        case 'ReachedDestination':
          return 'Sjåfør fremme hos kunde';
        case 'Completed':
          return 'Fullført';
        case 'Canceled':
          return 'Sjåfør har kansellert';
        default:
          return 'Venter aksept fra sjåfør';
      }
    },
    formatRequestedCompletionDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const isSameDay = (d1, d2) => {
        return (
          d1.getFullYear() === d2.getFullYear() &&
          d1.getMonth() === d2.getMonth() &&
          d1.getDate() === d2.getDate()
        );
      };

      let dateText = '';
      if (isSameDay(date, today)) {
        dateText = 'I dag';
      } else if (isSameDay(date, tomorrow)) {
        dateText = 'I morgen';
      } else {
        dateText = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
          .toString()
          .padStart(2, '0')}.${date.getFullYear()}`;
      }

      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${dateText} kl. ${hours}:${minutes}`;
    },
  },
};
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.order-card {
  margin-bottom: 16px;
  background: white;
  border-radius: 12px;
  border: 1.5px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: #cbd5e0;
  }

  .order-header {
    background: #f8f9fa;
    padding: 16px 20px;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-radius: 12px 12px 0 0;
    transition: background-color 0.2s ease;

    &:hover {
      background: #f0f2f5;
    }

    &.is-preorder {
      background: #e6f2ff;
      border-top: 3px solid #4da6ff;

      &:hover {
        background: #d9ecff;
      }
    }

    .header-left {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      flex: 1;
      min-width: 0;
      flex-direction: column;

      .store-name {
        font-weight: 600;
        font-size: 0.95em;
        line-height: 1.4;
        word-break: break-word;
        color: #292c34;
      }
    }

    .header-right {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      flex-shrink: 0;
      flex-direction: column;
      align-items: flex-end;
    }

    .order-status {
      flex-shrink: 0;
      padding: 5px 12px;
      border-radius: 20px;
      background: #e8eaed;
      font-size: 0.8em;
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      transition: background-color 0.2s ease;

      .material-icons {
        font-size: 14px;
      }

      &:hover {
        background: #e0e2e6;
      }
    }
  }

  &.is-warning {
    border: 2px solid #ff4444;
    border-left: 4px solid #ff4444;

    &:hover {
      border-color: #ff4444;
    }

    .order-header {
      background: #fff5f5;
      padding-left: 16px;

      &:hover {
        background: #ffe8e8;
      }

      .header-left::before {
        content: "warning";
        font-family: "Material Icons";
        color: #ff4444;
        font-size: 18px;
        margin-top: 2px;
      }
    }
  }
}

.order-details {
  padding: 24px;
  background: white;
  border-radius: 0 0 12px 12px;
}

.preorder-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #4da6ff;
  color: white;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.75em;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(77, 166, 255, 0.2);

  .material-icons {
    font-size: 12px;
  }
}

.preorder-requested-time {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #e6f2ff;
  border: 2px solid #4da6ff;
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;

  .material-icons {
    color: #4da6ff;
    font-size: 24px;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: 0.85em;
    color: #666;
    font-weight: 500;
  }

  .time {
    font-size: 1.1em;
    font-weight: 600;
    color: #292c34;
  }
}

.customer-info {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f8f9fa;
  padding: 10px 14px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 0.95em;
  color: #292c34;

  .material-icons {
    color: #1bb776;
    font-size: 20px;
  }

  &.customer-info-clickable {
    cursor: pointer;
    border: 1px solid #e2e8f0;
    transition: all 0.2s ease;

    &:hover {
      background: #e2e8f0;
      border-color: #1bb776;
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .customer-chevron {
      margin-left: auto;
      color: #6b7280;
      font-size: 18px;
      transition: color 0.2s ease;
    }

    &:hover .customer-chevron {
      color: #1bb776;
    }
  }
}

.order-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;

  .btn {
    flex: 1;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 0.95em;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;

    &.btn-primary {
      background: #1bb776;
      color: white;

      &:hover {
        background: #159a61;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
      }

      &:active {
        transform: translateY(0);
      }
    }

    &.btn-secondary {
      background: #e8eaed;
      color: #292c34;

      &:hover {
        background: #d5d8dc;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      &:active {
        transform: translateY(0);
      }
    }

    &.btn-next {
      flex: 3;
    }

    &.btn-expand {
      flex: 1;
      padding: 12px;

      .material-icons {
        font-size: 20px;
      }
    }

    .material-icons {
      font-size: 18px;
    }
  }
}

.expanded-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding-top: 16px;
  border-top: 2px solid #f0f2f5;
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: 2px solid #e8eaed;
  background: white;
  border-radius: 8px;
  font-size: 0.9em;
  font-weight: 600;
  color: #292c34;
  cursor: pointer;
  transition: all 0.2s ease;

  .material-icons {
    font-size: 18px;
  }

  &:hover {
    background: #f8f9fa;
    border-color: #1bb776;
    color: #1bb776;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(27, 183, 118, 0.15);
  }

  &:active {
    transform: translateY(0);
  }

  &.action-btn-danger {
    border-color: #ffe8e8;
    color: #ff4444;

    &:hover {
      background: #fff5f5;
      border-color: #ff4444;
      color: #ff4444;
      box-shadow: 0 2px 8px rgba(255, 68, 68, 0.2);
    }
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 28px;

  .info-item {
    padding: 12px;
    background: #f8f9fa;
    border-radius: 8px;
    transition: background-color 0.2s ease;

    &:hover {
      background: #f0f2f5;
    }

    label {
      font-weight: 600;
      color: #4a5568;
      margin-right: 8px;
      font-size: 0.9em;
    }

    span {
      color: #1a202c;
      font-size: 0.95em;
    }
  }
}

.toggle-items-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #f0f7ff;
  border: 2px solid #1bb776;
  border-radius: 8px;
  color: #1bb776;
  cursor: pointer;
  padding: 10px 20px;
  font-size: 0.95em;
  font-weight: 600;
  width: 100%;
  transition: all 0.2s ease;

  &:hover {
    background: #e8f7f1;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(27, 183, 118, 0.1);
  }

  &:active {
    transform: translateY(0);
  }

  .btn-icon {
    font-size: 0.8em;
    transition: transform 0.3s ease;

    &.is-up {
      transform: rotate(-180deg);
    }
  }
}

.items-table {
  margin-top: 20px;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

  table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 14px;
      border-bottom: 1px solid #edf2f7;
    }

    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #4a5568;
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      color: #1a202c;
      font-size: 0.95em;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: #f8f9fa;
    }
  }
}

.u-left {
  text-align: left;
}

.u-right {
  text-align: right;
}

.delay-badge {
  background: #ff4444;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8em;
  font-weight: 500;
  letter-spacing: 0.5px;
  box-shadow: 0 2px 4px rgba(255, 68, 68, 0.2);
}

.status-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
