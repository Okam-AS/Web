<template>
  <div
    class="modal-overlay"
    @click="closeModal"
  >
    <div
      class="modal-content"
      @click.stop
    >
      <div class="modal-header">
        <h3>Ordre detaljer</h3>
        <button
          class="close-btn"
          @click="closeModal"
        >
          <span class="material-icons">close</span>
        </button>
      </div>

      <div
        v-if="isLoading"
        class="loading-container"
      >
        <div class="loading-spinner" />
        <p>Laster ordre...</p>
      </div>

      <div
        v-else-if="order"
        class="modal-body"
      >
        <div class="order-info">
          <div class="info-grid">
            <div class="info-item">
              <label>Kode:</label>
              <span>{{ order.friendlyOrderId }}</span>
            </div>
            <div class="info-item">
              <label>ID:</label>
              <span>{{ order.id }}</span>
            </div>
            <div class="info-item">
              <label>Butikk:</label>
              <span>{{ order.storeLegalName }}</span>
            </div>
            <div class="info-item">
              <label>Status:</label>
              <span
                class="status-badge"
                :class="getStatusClass(order.status)"
              >
                {{ orderStatusLabel(order.status) }}
              </span>
            </div>
            <div class="info-item">
              <label>Platform:</label>
              <span>{{ order.platform }}</span>
            </div>
            <div class="info-item">
              <label>Bestilt:</label>
              <span>{{ formatDate(order.created) }}</span>
            </div>
            <div
              v-if="order.completed"
              class="info-item"
            >
              <label>Fullført:</label>
              <span>{{ formatDate(order.completed) }}</span>
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
            <div
              v-if="order.comment"
              class="info-item"
            >
              <label>Kommentar:</label>
              <span>{{ order.comment }}</span>
            </div>
            <div
              v-if="order.userFullName || (order.user && order.user.phoneNumber)"
              class="info-item"
            >
              <label>Kunde:</label>
              <div
                class="customer-info-clickable"
                @click="openCustomerModal"
              >
                <span class="customer-name">{{ order.userFullName || "Ukjent kunde" }}</span>
                <span
                  v-if="order.user && order.user.phoneNumber"
                  class="customer-phone"
                  >{{ order.user.phoneNumber }}</span
                >
                <span class="material-icons customer-icon">person</span>
              </div>
            </div>
            <div
              v-if="order.fullAddress"
              class="info-item full-width"
            >
              <label>Adresse:</label>
              <span>{{ order.fullAddress }}, {{ order.zipCode }} {{ order.city }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="order.items && order.items.length"
          class="order-items"
        >
          <h4>Bestilte varer</h4>
          <div class="items-table">
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
      </div>

      <div
        v-else
        class="error-container"
      >
        <p>Kunne ikke laste ordre detaljer</p>
      </div>
    </div>

    <!-- Customer Info Modal -->
    <CustomerInfoModal
      v-if="showCustomerModal"
      :user-id="customerUserId"
      :store-id="storeId"
      :customer-name="customerName"
      :customer-phone="customerPhone"
      @close="closeCustomerModal"
    />
  </div>
</template>

<script>
import CustomerInfoModal from "~/components/molecules/CustomerInfoModal.vue";

export default {
  components: {
    CustomerInfoModal,
  },
  props: {
    orderCode: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      order: null,
      isLoading: false,
      showCustomerModal: false,
    };
  },
  computed: {
    customerUserId() {
      return this.order?.user?.id || this.order?.userId;
    },
    storeId() {
      return this.order?.storeId;
    },
    customerName() {
      return this.order?.userFullName;
    },
    customerPhone() {
      return this.order?.user?.phoneNumber;
    },
  },
  async mounted() {
    document.body.style.overflow = "hidden";
    await this.fetchOrder();
  },

  beforeDestroy() {
    document.body.style.overflow = "";
  },
  methods: {
    async fetchOrder() {
      if (!this.orderCode) {
        return;
      }

      this.isLoading = true;
      try {
        this.order = await this._orderService.GetOrder(this.orderCode);
      } catch (error) {
        console.error("Failed to fetch order:", error);
      } finally {
        this.isLoading = false;
      }
    },
    closeModal() {
      document.body.style.overflow = "";
      this.$emit("close");
    },
    openCustomerModal() {
      if (this.customerUserId && this.storeId) {
        this.showCustomerModal = true;
      }
    },
    closeCustomerModal() {
      this.showCustomerModal = false;
    },
    getStatusClass(status) {
      switch (status) {
        case "Processing":
          return "status-processing";
        case "ReadyForPickup":
          return "status-ready";
        case "Completed":
          return "status-completed";
        case "Canceled":
          return "status-canceled";
        default:
          return "status-default";
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 800px;
  max-height: 90%;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;

  h3 {
    margin: 0;
    color: #292c34;
    font-size: 1.25rem;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    color: #6b7280;
    border-radius: 6px;
    padding: 4px;
    transition: all 0.2s ease;

    &:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .material-icons {
      font-size: 24px;
    }
  }
}

.modal-body {
  padding: 24px;
}

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;

  .loading-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e2e8f0;
    border-top: 3px solid #1bb776;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  p {
    color: #6b7280;
    margin: 0;
  }
}

.order-info {
  margin-bottom: 32px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &.full-width {
    grid-column: 1 / -1;
  }

  label {
    font-weight: 600;
    color: #4a5568;
    font-size: 0.875rem;
  }

  span {
    color: #2d3748;
    font-size: 0.95rem;
  }
}

.customer-info-clickable {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #e2e8f0;
    border-color: #1bb776;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .customer-name {
    font-weight: 500;
    color: #2d3748;
    font-size: 0.95rem;
  }

  .customer-phone {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .customer-icon {
    color: #1bb776;
    font-size: 20px;
    margin-left: auto;
  }
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;

  &.status-processing {
    background: #fef3c7;
    color: #d97706;
  }

  &.status-ready {
    background: #dcfce7;
    color: #16a34a;
  }

  &.status-completed {
    background: #e0f2fe;
    color: #0284c7;
  }

  &.status-canceled {
    background: #fee2e2;
    color: #dc2626;
  }

  &.status-default {
    background: #f3f4f6;
    color: #6b7280;
  }
}

.order-items {
  h4 {
    margin: 0 0 16px 0;
    color: #292c34;
    font-size: 1.1rem;
  }
}

.items-table {
  background: #f8f9fa;
  border-radius: 8px;
  overflow: hidden;

  table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;

      &.u-right {
        text-align: right;
      }

      &.u-left {
        text-align: left;
      }
    }

    th {
      background: #e2e8f0;
      font-weight: 600;
      color: #4a5568;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    tbody tr {
      &:last-child td {
        border-bottom: none;
      }

      &:hover {
        background: #f1f5f9;
      }
    }

    td {
      background: white;
      color: #2d3748;
      font-size: 0.9rem;
    }
  }
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
