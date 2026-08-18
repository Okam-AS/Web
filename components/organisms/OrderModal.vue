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
        <h3>{{ $i('orderModal_title') }}</h3>
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
        <p>{{ $i('orderModal_loadingOrder') }}</p>
      </div>

      <div
        v-else-if="order"
        class="modal-body"
      >
        <div class="order-info">
          <div class="info-grid">
            <div class="info-item">
              <label>{{ $i('orderModal_code') }}</label>
              <span>{{ order.friendlyOrderId }}</span>
            </div>
            <div class="info-item">
              <label>{{ $i('orderModal_id') }}</label>
              <span>{{ order.id }}</span>
            </div>
            <div class="info-item">
              <label>{{ $i('orderModal_store') }}</label>
              <span>{{ order.storeLegalName }}</span>
            </div>
            <div class="info-item">
              <label>{{ $i('orderModal_statusLabel') }}</label>
              <span
                class="status-badge"
                :class="getStatusClass(order.status)"
              >
                {{ orderStatusLabel(order.status) }}
              </span>
            </div>
            <div
              v-if="order.status === 'Canceled'"
              class="info-item"
            >
              <label>{{ $i('orderModal_canceledBy') }}</label>
              <span>{{ order.canceledByStore ? $i('orderModal_byStore') : $i('orderModal_byCustomer') }}</span>
            </div>
            <div class="info-item">
              <label>{{ $i('orderModal_platform') }}</label>
              <span>{{ order.platform }}</span>
            </div>
            <div class="info-item">
              <label>{{ $i('orderModal_ordered') }}</label>
              <span>{{ formatDate(order.created) }}</span>
            </div>
            <div
              v-if="order.completed"
              class="info-item"
            >
              <label>{{ $i('orderModal_completed') }}</label>
              <span>{{ formatDate(order.completed) }}</span>
            </div>
            <div class="info-item">
              <label>{{ $i('orderModal_totalPrice') }}</label>
              <span>{{ priceLabel(order.finalAmount) }}</span>
            </div>
            <div class="info-item">
              <label>{{ $i('orderModal_delivery') }}</label>
              <span>{{ deliveryTypeLabel(order.deliveryType) }}</span>
            </div>
            <div class="info-item">
              <label>{{ $i('orderModal_payment') }}</label>
              <span>{{ paymentTypeLabel(order.paymentType) }}</span>
            </div>
            <div
              v-if="order.comment"
              class="info-item"
            >
              <label>{{ $i('orderModal_comment') }}</label>
              <span>{{ order.comment }}</span>
            </div>
            <div
              v-if="order.userFullName || (order.user && order.user.phoneNumber)"
              class="info-item"
            >
              <label>{{ $i('orderModal_customer') }}</label>
              <div
                class="customer-info-clickable"
                @click="openCustomerModal"
              >
                <span class="customer-name">{{ order.userFullName || $i('orderModal_unknownCustomer') }}</span>
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
              <label>{{ $i('orderModal_address') }}</label>
              <span>{{ order.fullAddress }}, {{ order.zipCode }} {{ order.city }}</span>
            </div>
          </div>
        </div>

        <div
          v-if="order.items && order.items.length"
          class="order-items"
        >
          <h4>{{ $i('orderModal_orderedItems') }}</h4>
          <div class="items-table">
            <table>
              <thead>
                <tr>
                  <th class="u-left">{{ $i('orderModal_item') }}</th>
                  <th class="u-right">{{ $i('orderModal_price') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in order.items"
                  :key="item.id"
                >
                  <td>{{ item.quantity }} {{ item.name }} {{ $i('orderModal_itemTax', { tax: item.tax }) }}</td>
                  <td class="u-right">
                    {{ priceLabel(item.amount) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Wolt Tracking -->
        <div
          v-if="order.woltDeliveryInfo && order.woltDeliveryInfo.trackingUrl"
          class="wolt-tracking-section"
        >
          <h4>{{ $i('orderModal_woltTracking') }}</h4>
          <div class="tracking-info">
            <div class="tracking-header">
              <a
                :href="order.woltDeliveryInfo.trackingUrl"
                target="_blank"
                class="tracking-link-external"
              >
                <span class="material-icons">open_in_new</span>
                {{ $i('orderModal_openInNewWindow') }}
              </a>
            </div>
            <div class="tracking-iframe-container">
              <iframe
                :src="order.woltDeliveryInfo.trackingUrl"
                class="tracking-iframe"
                frameborder="0"
                :title="$i('orderModal_woltTracking')"
                sandbox="allow-scripts allow-same-origin allow-popups"
              ></iframe>
            </div>
          </div>
        </div>

        <section
          v-if="isPowerUser && (isAccountingRefundEligibleOrder || refundResult)"
          class="accounting-refund-section"
        >
          <div class="accounting-refund-heading">
            <span class="material-icons">currency_exchange</span>
            <div>
              <h4>{{ $i('orderModal_accountingRefundTitle') }}</h4>
              <p>{{ $i('orderModal_accountingRefundDescription') }}</p>
            </div>
          </div>

          <div
            v-if="refundResult"
            :class="['accounting-refund-message', refundRequiresReconciliation ? 'warning' : 'success']"
            role="status"
          >
            <span class="material-icons">{{ refundRequiresReconciliation ? 'warning' : 'check_circle' }}</span>
            <p>{{ refundResult }}</p>
          </div>

          <template v-else>
            <p class="accounting-refund-warning">
              {{ $i('orderModal_accountingRefundWarning') }}
            </p>

            <label
              class="accounting-refund-label"
              for="accounting-refund-reason"
            >
              {{ $i('orderModal_accountingRefundReasonLabel') }}
            </label>
            <textarea
              id="accounting-refund-reason"
              v-model.trim="refundReason"
              class="accounting-refund-reason"
              :disabled="isRefunding || isRefundUnavailable"
              :placeholder="$i('orderModal_accountingRefundReasonPlaceholder')"
              rows="3"
            />

            <label class="accounting-refund-confirmation">
              <input
                v-model="refundConfirmed"
                type="checkbox"
                :disabled="isRefunding || isRefundUnavailable"
              />
              <span>{{ $i('orderModal_accountingRefundConfirm') }}</span>
            </label>

            <div
              v-if="refundError"
              class="accounting-refund-message error"
              role="alert"
            >
              <span class="material-icons">error</span>
              <p>{{ refundError }}</p>
            </div>

            <button
              class="accounting-refund-btn"
              :disabled="!canSubmitAccountingRefund"
              @click="requestAccountingRefund"
            >
              <span
                v-if="isRefunding"
                class="loading-spinner-small"
              />
              <span
                v-else
                class="material-icons"
              >currency_exchange</span>
              {{ isRefunding ? $i('orderModal_accountingRefundSubmitting') : $i('orderModal_accountingRefundButton') }}
            </button>
          </template>
        </section>

        <div class="modal-footer">
          <button
            class="download-receipt-btn"
            :disabled="isDownloadingReceipt"
            @click="downloadReceipt"
          >
            <span class="material-icons">download</span>
            <span v-if="isDownloadingReceipt">{{ $i('orderModal_downloading') }}</span>
            <span v-else>{{ $i('orderModal_downloadReceipt') }}</span>
          </button>
        </div>
      </div>

      <div
        v-else
        class="error-container"
      >
        <p>{{ $i('orderModal_loadError') }}</p>
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
import axios from "axios";
import CustomerInfoModal from "~/components/molecules/CustomerInfoModal.vue";
import bodyScrollLock from "~/utils/body-scroll-lock";

export default {
  components: {
    CustomerInfoModal,
  },
  // This component NESTS `CustomerInfoModal`, and the nesting is where the old inline-style lock
  // broke: the customer card's own close released `document.body.style.overflow` while this modal
  // was still on screen. Both declare the lock now, so it is held while either is mounted.
  mixins: [bodyScrollLock],
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
      isDownloadingReceipt: false,
      refundReason: "",
      refundConfirmed: false,
      isRefunding: false,
      refundError: "",
      refundResult: "",
      refundRequiresReconciliation: false,
      isRefundUnavailable: false,
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
    isPowerUser() {
      return Boolean(this.$store.state.currentUser?.isPowerUser);
    },
    isDinteroOnlinePayment() {
      return this.order?.paymentType && this.order.paymentType.startsWith("Dintero")
        && this.order.paymentType !== "DinteroKravia";
    },
    isAccountingRefundEligibleOrder() {
      return this.order?.status === "Completed" && this.isDinteroOnlinePayment;
    },
    canSubmitAccountingRefund() {
      return this.isAccountingRefundEligibleOrder
        && !this.isRefunding
        && !this.isRefundUnavailable
        && this.refundReason.length > 0
        && this.refundConfirmed;
    },
  },
  async mounted() {
    await this.fetchOrder();
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
    async downloadReceipt() {
      if (this.isDownloadingReceipt || !this.order) return;

      this.isDownloadingReceipt = true;
      try {
        const token = this.$store.state.currentUser?.token;
        const apiBaseUrl = process.env.API_BASE_URL || '';
        const url = `${apiBaseUrl}/orders/receipt/${this.orderCode}`;

        const response = await axios({
          url: url,
          method: 'GET',
          responseType: 'blob',
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const blob = new Blob([response.data], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = this.$i('orderModal_receiptFileName', { id: this.order.friendlyOrderId || this.orderCode });
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Error downloading receipt:', error);
      } finally {
        this.isDownloadingReceipt = false;
      }
    },
    async requestAccountingRefund() {
      if (!this.canSubmitAccountingRefund) return;

      this.isRefunding = true;
      this.refundError = "";

      try {
        const token = this.$store.state.currentUser?.token;
        const apiBaseUrl = process.env.API_BASE_URL || "";
        const orderCode = this.order.orderCode || this.orderCode;
        const response = await axios.post(
          `${apiBaseUrl}/orders/${encodeURIComponent(orderCode)}/accounting-refund`,
          { reason: this.refundReason },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        this.refundRequiresReconciliation = response.data?.requiresReconciliation === true
          || response.data?.accountingCorrectionSent === false;
        this.isRefundUnavailable = this.refundRequiresReconciliation;
        this.refundResult = this.refundRequiresReconciliation
          ? this.$i('orderModal_accountingRefundRequiresReconciliation')
          : (response.data?.message || this.$i('orderModal_accountingRefundSuccess'));
        this.refundReason = "";
        this.refundConfirmed = false;

        // The endpoint cancels the order after a successful full refund. Refreshing makes the
        // history view authoritative rather than assuming the response contains the whole order.
        await this.fetchOrder();
      } catch (error) {
        const status = error.response?.status;
        this.refundError = error.response?.data?.message
          || (typeof error.response?.data === "string" ? error.response.data : "")
          || this.$i('orderModal_accountingRefundError');

        // These responses mean the backend has conclusively determined that the order cannot be
        // refunded through this flow (for example, it was already refunded or is not eligible).
        if ([400, 404, 409, 422].includes(status)) {
          this.isRefundUnavailable = true;
        }
      } finally {
        this.isRefunding = false;
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
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
  border-radius: 12px 12px 0 0;

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
  overflow-y: auto;
  flex: 1;
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

.modal-footer {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e2e8f0;

  .download-receipt-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background-color: #1bb776;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      background-color: #159c63;
      transform: translateY(-1px);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .material-icons {
      font-size: 20px;
    }
  }
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

.wolt-tracking-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 2px solid #e2e8f0;

  h4 {
    margin: 0 0 16px 0;
    color: #292c34;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .tracking-info {
    background: #f8fafc;
    border-radius: 12px;
    padding: 16px;
    border: 1px solid #e2e8f0;
  }

  .tracking-header {
    margin-bottom: 16px;
    display: flex;
    justify-content: flex-end;
  }

  .tracking-link-external {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #1bb776;
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

    &:hover {
      background: #159c63;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(27, 183, 118, 0.3);
    }

    .material-icons {
      font-size: 18px;
    }
  }

  .tracking-iframe-container {
    position: relative;
    width: 100%;
    height: 800px;
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .tracking-iframe {
    width: 100%;
    height: 100%;
    border: none;
    border-radius: 8px;
  }

  @media (max-width: 768px) {
    .tracking-iframe-container {
      height: 600px;
    }
  }
}

.accounting-refund-section {
  margin-top: 24px;
  padding: 20px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fff7f7;
}

.accounting-refund-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;

  > .material-icons {
    color: #b91c1c;
    font-size: 22px;
  }

  h4 {
    margin: 0 0 4px;
    color: #7f1d1d;
    font-size: 1.05rem;
  }

  p {
    margin: 0;
    color: #7f1d1d;
    font-size: 0.9rem;
    line-height: 1.4;
  }
}

.accounting-refund-warning {
  margin: 16px 0;
  color: #991b1b;
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.45;
}

.accounting-refund-label {
  display: block;
  margin-bottom: 6px;
  color: #4a5568;
  font-size: 0.875rem;
  font-weight: 600;
}

.accounting-refund-reason {
  box-sizing: border-box;
  display: block;
  width: 100%;
  resize: vertical;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  color: #1f2937;
  font: inherit;

  &:focus {
    outline: 2px solid #fca5a5;
    outline-offset: 1px;
    border-color: #dc2626;
  }

  &:disabled {
    background: #f1f5f9;
    cursor: not-allowed;
  }
}

.accounting-refund-confirmation {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 14px 0;
  color: #4a5568;
  font-size: 0.9rem;
  line-height: 1.4;

  input {
    margin-top: 3px;
  }
}

.accounting-refund-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 14px 0;
  padding: 10px 12px;
  border-radius: 6px;
  font-size: 0.9rem;

  p {
    margin: 0;
    line-height: 1.4;
  }

  &.success {
    background: #dcfce7;
    color: #166534;
  }

  &.error {
    background: #fee2e2;
    color: #b91c1c;
  }

  &.warning {
    background: #fef3c7;
    color: #92400e;
  }
}

.accounting-refund-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 7px;
  background: #b91c1c;
  color: white;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: background 0.2s ease;

  &:hover:not(:disabled) {
    background: #991b1b;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .material-icons {
    font-size: 18px;
  }
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
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
