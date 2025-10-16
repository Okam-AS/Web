<template>
  <div
    class="modal-overlay"
    @click.self="$emit('close')"
  >
    <div class="modal-content">
      <div class="modal-header">
        <h2>Send SMS til sjåfør</h2>
        <button
          class="close-btn"
          @click="$emit('close')"
        >
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="modal-body">
        <p class="info-text">Skriv inn telefonnummer til sjåføren</p>

        <div class="input-group">
          <label for="phone-input">Telefonnummer</label>
          <input
            id="phone-input"
            v-model="phoneNumber"
            type="tel"
            placeholder="+47..."
            class="phone-input"
            @keyup.enter="sendSms"
          >
        </div>

        <div
          v-if="error"
          class="error-message"
        >
          <span class="material-icons">error</span>
          {{ error }}
        </div>

        <div
          v-if="success"
          class="success-message"
        >
          <span class="material-icons">check_circle</span>
          SMS sendt til sjåfør!
        </div>
      </div>

      <div class="modal-footer">
        <button
          class="btn btn-secondary"
          @click="$emit('close')"
        >
          Avbryt
        </button>
        <button
          class="btn btn-primary"
          :disabled="!phoneNumber || sending"
          @click="sendSms"
        >
          <span v-if="sending">Sender...</span>
          <span v-else>Send SMS</span>
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
  },
  data() {
    return {
      phoneNumber: '',
      sending: false,
      error: '',
      success: false,
    };
  },
  mounted() {
    // Load saved driver phone number from localStorage if available
    const savedNumber = localStorage.getItem('driverPhoneNumber');
    if (savedNumber) {
      this.phoneNumber = savedNumber;
    }
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  },
  beforeDestroy() {
    // Restore body scroll
    document.body.style.overflow = '';
  },
  methods: {
    async sendSms() {
      if (!this.phoneNumber || this.sending) return;

      this.error = '';
      this.success = false;
      this.sending = true;

      try {
        // Save phone number to localStorage for future use
        localStorage.setItem('driverPhoneNumber', this.phoneNumber);

        // Make API call to send SMS using OrderService
        await this._orderService.SendSmsToDriver(this.order.id, this.phoneNumber);

        this.success = true;
        setTimeout(() => {
          this.$emit('success');
          this.$emit('close');
        }, 1500);
      } catch (err) {
        this.error = err.message || 'Kunne ikke sende SMS. Prøv igjen.';
        console.error('Failed to send SMS:', err);
      } finally {
        this.sending = false;
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
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 2px solid #f0f2f5;

  h2 {
    margin: 0;
    font-size: 1.5em;
    color: #292c34;
  }

  .close-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background-color 0.2s ease;

    &:hover {
      background: #f0f2f5;
    }

    .material-icons {
      font-size: 24px;
      color: #666;
    }
  }
}

.modal-body {
  padding: 24px;

  .info-text {
    margin: 0 0 20px 0;
    color: #666;
    font-size: 0.95em;
  }

  .input-group {
    margin-bottom: 20px;

    label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #292c34;
      font-size: 0.9em;
    }

    .phone-input {
      width: 100%;
      padding: 12px 16px;
      border: 2px solid #e8eaed;
      border-radius: 8px;
      font-size: 1em;
      transition: border-color 0.2s ease;

      &:focus {
        outline: none;
        border-color: #1bb776;
      }

      &::placeholder {
        color: #aaa;
      }
    }
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #fff5f5;
    border: 2px solid #ff4444;
    border-radius: 8px;
    color: #ff4444;
    font-size: 0.9em;
    font-weight: 500;

    .material-icons {
      font-size: 20px;
    }
  }

  .success-message {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: #e8f7f1;
    border: 2px solid #1bb776;
    border-radius: 8px;
    color: #1bb776;
    font-size: 0.9em;
    font-weight: 600;

    .material-icons {
      font-size: 20px;
    }
  }
}

.modal-footer {
  display: flex;
  gap: 12px;
  padding: 20px 24px;
  background: #f8f9fa;
  border-top: 2px solid #f0f2f5;

  .btn {
    flex: 1;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    font-size: 1em;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;

    &.btn-secondary {
      background: white;
      color: #292c34;
      border: 2px solid #e8eaed;

      &:hover {
        background: #f0f2f5;
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
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}
</style>
