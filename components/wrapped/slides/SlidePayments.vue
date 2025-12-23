<template>
  <div class="slide slide-payments">
    <div class="slide-content">
      <div class="section-label">Hvordan betalte kundene?</div>

      <div class="payments-grid" :class="{ 'animate-in': showPayments }">
        <div
          v-for="(payment, index) in sortedPayments"
          :key="payment.name"
          class="payment-card"
          :style="{ animationDelay: (index * 100) + 'ms' }"
        >
          <div class="payment-icon">{{ getPaymentIcon(payment.name) }}</div>
          <div class="payment-info">
            <div class="payment-name">{{ payment.name }}</div>
            <div class="payment-count">{{ payment.count }} bestillinger</div>
          </div>
          <div class="payment-percent">{{ getPercent(payment.count) }}%</div>
        </div>
      </div>

      <div class="payment-insight" :class="{ 'animate-in': showInsight }">
        <span class="material-icons">insights</span>
        <span>{{ topPayment }} er den mest brukte betalingsmetoden</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SlidePayments',
  props: {
    data: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  data: () => ({
    showPayments: false,
    showInsight: false
  }),
  computed: {
    sortedPayments() {
      const payments = this.data.paymentMethodCounts || {}
      return Object.entries(payments)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    },
    total() {
      return this.sortedPayments.reduce((sum, p) => sum + p.count, 0)
    },
    topPayment() {
      return this.sortedPayments[0]?.name || 'Ukjent'
    }
  },
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => { this.showPayments = true }, 300)
      setTimeout(() => { this.showInsight = true }, 1000)
    },
    getPercent(count) {
      return this.total > 0 ? Math.round((count / this.total) * 100) : 0
    },
    getPaymentIcon(name) {
      const icons = {
        'Vipps': '📱',
        'Kort': '💳',
        'Kort (Dintero)': '💳',
        'Betal i butikk': '🏪',
        'Gavekort': '🎁',
        'Klarna': '🛒',
        'Billie': '📋',
        'Wolt': '🛵'
      }
      return icons[name] || '💰'
    }
  }
}
</script>

<style lang="scss" scoped>
.slide-payments {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(180deg, #79699d 0%, #bc91b0 30%, #191414 70%);
  padding: 24px;
  padding-top: 40px;
  padding-bottom: 40px;

  .slide-content {
    text-align: center;
    max-width: 500px;
    width: 100%;
  }

  .section-label {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    margin-bottom: 48px;
  }

  .payments-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 32px;
    opacity: 0;

    &.animate-in {
      opacity: 1;

      .payment-card {
        animation: slideIn 0.5s ease-out forwards;
      }
    }

    .payment-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      background: rgba(0, 0, 0, 0.25);
      border-radius: 12px;
      opacity: 0;
      transform: translateX(-20px);

      .payment-icon {
        font-size: 1.75rem;
        width: 40px;
        text-align: center;
      }

      .payment-info {
        flex: 1;
        text-align: left;

        .payment-name {
          font-weight: 600;
          font-size: 1rem;
          color: #ffffff;
        }

        .payment-count {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
        }
      }

      .payment-percent {
        font-size: 1.1rem;
        font-weight: 700;
        color: #ffffff;
        background: rgba(0, 0, 0, 0.3);
        padding: 6px 12px;
        border-radius: 20px;
        min-width: 50px;
        text-align: center;
      }
    }
  }

  .payment-insight {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 1rem;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;

    &.animate-in {
      opacity: 0.8;
      transform: translateY(0);
    }

    .material-icons {
      color: #1bb776;
    }
  }
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
