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
        <h3>Kundeinformasjon</h3>
        <button
          class="close-btn"
          @click="closeModal"
        >
          <span class="material-icons">close</span>
        </button>
      </div>

      <div
        v-if="isLoadingCustomer"
        class="loading-container"
      >
        <div class="loading-spinner" />
        <p>Laster kundeinformasjon...</p>
      </div>

      <div
        v-else-if="customer"
        class="modal-body"
      >
        <div
          v-if="customer && customer.additionalData && customer.additionalData.length > 0"
          class="statistics-section"
        >
          <div class="statistics-grid">
            <div
              v-for="stat in customer.additionalData"
              :key="stat.key"
              class="stat-item"
            >
              <label>{{ stat.key }}:</label>
              <span>{{ stat.value || "-" }}</span>
            </div>
          </div>
        </div>

        <!-- Rewards Section -->
        <div class="customer-rewards-section">
          <h4>Bonuspoeng</h4>

          <!-- Reward Member Details -->
          <div
            v-if="primaryRewardCard"
            class="reward-member-details"
          >
            <div class="reward-info-grid">
              <div class="reward-info-item">
                <label>Opptjent bonus:</label>
                <span>{{ priceLabel(primaryRewardCard.balance) }}</span>
              </div>
              <div class="reward-info-item">
                <label>Medlem siden:</label>
                <span>{{ formatDate(memberJoinedDate) }}</span>
              </div>
            </div>
          </div>

          <div class="send-bonus-form">
            <label class="send-bonus-label">Send bonuspoeng til denne kunden:</label>

            <div class="reward-form">
              <div class="amount-input">
                <input
                  id="rewardAmount"
                  v-model="rewardAmount"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Skriv inn beløp"
                  class="reward-input"
                  :disabled="isSendingReward"
                />
              </div>

              <button
                class="send-reward-btn"
                :disabled="!canSendReward"
                @click="sendReward"
              >
                <span
                  v-if="isSendingReward"
                  class="spinner"
                />
                <span
                  v-else
                  class="material-icons"
                  >card_giftcard</span
                >
                {{ isSendingReward ? "Sender..." : "Send bonus" }}
              </button>
            </div>

            <div
              v-if="rewardMessage"
              class="reward-message"
              :class="rewardMessageType"
            >
              {{ rewardMessage }}
            </div>
          </div>
        </div>
      </div>

      <div
        v-else
        class="error-container"
      >
        <p>Kunne ikke laste kundeinformasjon</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    userId: {
      type: String,
      required: true,
    },
    storeId: {
      type: Number,
      required: true,
    },
    customerName: {
      type: String,
      default: "",
    },
    customerPhone: {
      type: String,
      default: "",
    },
  },
  data() {
    return {
      customer: null,
      isLoadingCustomer: false,
      customerRewards: null,
      rewardAmount: null,
      isSendingReward: false,
      rewardMessage: "",
      rewardMessageType: "",
    };
  },
  computed: {
    canSendReward() {
      return this.rewardAmount && this.rewardAmount > 0 && !this.isSendingReward;
    },

    primaryRewardCard() {
      return this.customerRewards && this.customerRewards.length > 0 ? this.customerRewards[0] : null;
    },

    memberPhoneNumber() {
      return this.primaryRewardCard?.rewardMembership?.user?.phoneNumber;
    },

    memberJoinedDate() {
      return this.primaryRewardCard?.rewardMembership?.acceptedRewardsTerms;
    },

    recentTransactions() {
      const transactions = this.primaryRewardCard?.rewardMembership?.rewardTransactions || [];
      // Show only the 5 most recent transactions
      return transactions.slice(0, 5);
    },
  },
  mounted() {
    this.fetchCustomerInfo();
    // Disable scroll on body when modal is open
    document.body.style.overflow = "hidden";
  },

  beforeDestroy() {
    // Re-enable scroll on body when modal is destroyed
    document.body.style.overflow = "";
  },
  methods: {
    async fetchCustomerInfo() {
      this.isLoadingCustomer = true;
      try {
        // Fetch basic user info
        const userForStore = await this._userService.GetForStore(this.storeId, this.userId);

        // Fetch customer rewards
        try {
          this.customerRewards = await this._rewardService.GetRewardCards(this.storeId, this.userId);
          // eslint-disable-next-line no-console
          console.log("Customer rewards:", this.customerRewards);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn("GetRewardCards failed:", error);
          this.customerRewards = null;
        }
        // eslint-disable-next-line no-console
        console.log("UserForStore:", userForStore);
        // eslint-disable-next-line no-console
        console.log("UserForStore.data:", userForStore?.data);

        if (userForStore) {
          this.customer = {
            fullName: `${userForStore.firstName || ""} ${userForStore.lastName || ""}`.trim() || this.customerName || "Ukjent kunde",
            phoneNumber: userForStore.phoneNumber || this.customerPhone || "-",
            email: userForStore.email || "-",
            registered: userForStore.data ? userForStore.data.find((d) => d.key === "Kunde siden")?.value : null,
            lastLogin: userForStore.data ? userForStore.data.find((d) => d.key === "Sist bestilt")?.value : null,
            orderCount: userForStore.data ? parseInt(userForStore.data.find((d) => d.key === "Antall bestillinger")?.value || "0") : 0,
            additionalData: userForStore.data || [],
          };
        } else {
          // Fallback to props data if API call fails
          this.customer = {
            fullName: this.customerName || "Ukjent kunde",
            phoneNumber: this.customerPhone || "-",
            email: "-",
            registered: null,
            lastLogin: null,
            orderCount: 0,
            additionalData: [],
          };
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Error fetching customer info:", error);
        // Fallback to props data if API call fails
        this.customer = {
          fullName: this.customerName || "Ukjent kunde",
          phoneNumber: this.customerPhone || "-",
          email: "-",
          registered: null,
          lastLogin: null,
          orderCount: 0,
          additionalData: [],
        };
      } finally {
        this.isLoadingCustomer = false;
      }
    },

    async sendReward() {
      if (!this.canSendReward) {
        return;
      }

      this.isSendingReward = true;
      this.rewardMessage = "";

      try {
        // Convert kroner to øre (1 kr = 100 øre)
        const amountInOre = this.rewardAmount * 100;

        const result = await this._rewardService.SendReward(this.storeId, this.userId, amountInOre);

        if (result) {
          this.rewardMessage = `Bonus på ${this.rewardAmount} kr er sendt til kunden!`;
          this.rewardMessageType = "success";
          this.rewardAmount = null;

          // Refresh customer info to update rewards
          this.fetchCustomerInfo();

          // Auto-hide success message after 3 seconds
          setTimeout(() => {
            this.rewardMessage = "";
          }, 3000);
        } else {
          this.rewardMessage = "Kunne ikke sende bonus. Prøv igjen.";
          this.rewardMessageType = "error";
        }
      } catch (error) {
        this.rewardMessage = "Det oppstod en feil ved sending av bonus.";
        this.rewardMessageType = "error";
      } finally {
        this.isSendingReward = false;
      }
    },

    closeModal() {
      // Re-enable scroll on body when modal is closed
      document.body.style.overflow = "";
      this.$emit("close");
    },

    formatDate(date) {
      if (!date || date === "0001-01-01T00:00:00") {
        return "-";
      }
      return new Date(date).toLocaleString("no-NO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    },

    calculateTotalRewards() {
      if (!this.customerRewards || this.customerRewards.length === 0) {
        return 0;
      }
      return (
        this.customerRewards.reduce((total, reward) => {
          return total + (reward.balance || 0);
        }, 0) / 100
      ); // Convert from øre to kroner
    },

    getTransactionLabel(type) {
      switch (type) {
        case "Earned":
          return "Opptjent";
        case "Spent":
          return "Brukt";
        case "Gifted":
          return "Gave";
        default:
          return type || "Ukjent";
      }
    },

    priceLabel(amount) {
      if (!amount && amount !== 0) {
        return "-";
      }
      const amountInKroner = amount / 100;
      return new Intl.NumberFormat("no-NO", {
        style: "currency",
        currency: "NOK",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amountInKroner);
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
  max-width: 600px;
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

.customer-info {
  margin-bottom: 24px;
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

.statistics-section,
.customer-rewards-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;

  h4 {
    margin: 0 0 16px 0;
    color: #292c34;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.customer-rewards-section h4::before {
  content: "🎁";
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.stat-item,
.reward-total,
.rewards-count {
  display: flex;
  flex-direction: column;
  gap: 4px;

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

.rewards-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.reward-member-details {
  .reward-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  .reward-info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

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
}

.reward-transactions {
  h5 {
    margin: 0 0 16px 0;
    color: #292c34;
    font-size: 1rem;
    font-weight: 600;
  }

  .transactions-list {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    overflow: hidden;
  }

  .transaction-item {
    padding: 12px 16px;
    border-bottom: 1px solid #e2e8f0;

    &:last-child {
      border-bottom: none;
    }

    .transaction-info {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .transaction-type {
        display: flex;
        flex-direction: column;
        gap: 4px;

        .transaction-label {
          font-weight: 500;
          color: #2d3748;
          font-size: 0.9rem;
        }

        .transaction-date {
          color: #6b7280;
          font-size: 0.8rem;
        }
      }

      .transaction-amount {
        .transaction-points {
          font-weight: 600;
          font-size: 0.9rem;
          color: #16a34a;

          &.negative {
            color: #dc2626;
          }
        }
      }
    }
  }
}

.send-bonus-form {
  margin-top: 16px;

  .send-bonus-label {
    font-weight: 600;
    color: #4a5568;
    font-size: 0.875rem;
    display: block;
    margin-bottom: 16px;
  }
}

.reward-form {
  display: flex;
  flex-direction: column;
  gap: 16px;

  .amount-input {
    display: flex;
    flex-direction: column;
    gap: 8px;

    label {
      font-weight: 600;
      color: #4a5568;
      font-size: 0.9rem;
    }

    .reward-input {
      padding: 12px 16px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.2s;

      &:focus {
        border-color: #1bb776;
        outline: none;
        box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
      }

      &:disabled {
        background: #f8f9fa;
        cursor: not-allowed;
      }
    }
  }

  .send-reward-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 20px;
    background: #1bb776;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    font-weight: 500;
    transition: all 0.2s ease;
    min-height: 48px;

    &:hover:not(:disabled) {
      background: #159c63;
      transform: translateY(-1px);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }

    .material-icons {
      font-size: 20px;
    }

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }
}

.reward-message {
  margin-top: 16px;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;

  &.success {
    background: #dcfce7;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  }

  &.error {
    background: #fee2e2;
    color: #dc2626;
    border: 1px solid #fecaca;
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
