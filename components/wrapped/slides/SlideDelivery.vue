<template>
  <div class="slide slide-delivery">
    <div class="slide-content">
      <div class="section-label">Hvordan fikk kundene maten?</div>

      <div class="delivery-cards">
        <div
          v-if="data.selfPickupOrders > 0"
          class="delivery-card pickup"
          :class="{ 'animate-in': showCards }"
        >
          <div class="card-icon">🛍️</div>
          <div class="card-value">{{ data.selfPickupOrders }}</div>
          <div class="card-label">Henting</div>
          <div class="card-percent">{{ pickupPercent }}%</div>
        </div>

        <div
          v-if="data.homeDeliveryOrders > 0"
          class="delivery-card delivery"
          :class="{ 'animate-in': showCards }"
        >
          <div class="card-icon">🚗</div>
          <div class="card-value">{{ data.homeDeliveryOrders }}</div>
          <div class="card-label">Levering</div>
          <div class="card-percent">{{ deliveryPercent }}%</div>
        </div>

        <div
          v-if="data.tableDeliveryOrders > 0"
          class="delivery-card table"
          :class="{ 'animate-in': showCards }"
        >
          <div class="card-icon">🍽️</div>
          <div class="card-value">{{ data.tableDeliveryOrders }}</div>
          <div class="card-label">Spis inne</div>
          <div class="card-percent">{{ tablePercent }}%</div>
        </div>

        <div
          v-if="data.woltDeliveryOrders > 0"
          class="delivery-card wolt"
          :class="{ 'animate-in': showCards }"
        >
          <div class="card-icon">🛵</div>
          <div class="card-value">{{ data.woltDeliveryOrders }}</div>
          <div class="card-label">Wolt</div>
          <div class="card-percent">{{ woltPercent }}%</div>
        </div>
      </div>

      <div class="delivery-insight" :class="{ 'animate-in': showInsight }">
        {{ insightText }}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SlideDelivery',
  props: {
    data: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  data: () => ({
    showCards: false,
    showInsight: false
  }),
  computed: {
    total() {
      return (this.data.selfPickupOrders || 0) +
             (this.data.homeDeliveryOrders || 0) +
             (this.data.tableDeliveryOrders || 0) +
             (this.data.woltDeliveryOrders || 0)
    },
    pickupPercent() {
      return this.total > 0 ? Math.round((this.data.selfPickupOrders / this.total) * 100) : 0
    },
    deliveryPercent() {
      return this.total > 0 ? Math.round((this.data.homeDeliveryOrders / this.total) * 100) : 0
    },
    tablePercent() {
      return this.total > 0 ? Math.round((this.data.tableDeliveryOrders / this.total) * 100) : 0
    },
    woltPercent() {
      return this.total > 0 ? Math.round((this.data.woltDeliveryOrders / this.total) * 100) : 0
    },
    insightText() {
      const types = [
        { name: 'Henting', count: this.data.selfPickupOrders || 0 },
        { name: 'Levering', count: this.data.homeDeliveryOrders || 0 },
        { name: 'Spis inne', count: this.data.tableDeliveryOrders || 0 },
        { name: 'Wolt', count: this.data.woltDeliveryOrders || 0 }
      ]
      const top = types.sort((a, b) => b.count - a.count)[0]
      return `${top.name} var den mest populære leveringsmetoden i 2025`
    }
  },
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => { this.showCards = true }, 300)
      setTimeout(() => { this.showInsight = true }, 1200)
    }
  }
}
</script>

<style lang="scss" scoped>
.slide-delivery {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(180deg, #ff9a9e 0%, #fecfef 30%, #191414 70%);
  padding: 24px;
  padding-top: 40px;
  padding-bottom: 40px;

  .slide-content {
    text-align: center;
    max-width: 600px;
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

  .delivery-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 16px;
    margin-bottom: 48px;

    .delivery-card {
      background: rgba(255, 255, 255, 0.15);
      border-radius: 20px;
      padding: 24px 16px;
      opacity: 0;
      transform: translateY(30px);
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);

      &.animate-in {
        opacity: 1;
        transform: translateY(0);
      }

      .card-icon {
        font-size: 2.5rem;
        margin-bottom: 12px;
      }

      .card-value {
        font-size: 2.5rem;
        font-weight: 800;
        color: white;
        line-height: 1;

        @media (max-width: 768px) {
          font-size: 2rem;
        }
      }

      .card-label {
        font-size: 0.9rem;
        opacity: 0.7;
        margin: 8px 0;
      }

      .card-percent {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1bb776;
      }

      &.pickup { border-bottom: 4px solid #667eea; }
      &.delivery { border-bottom: 4px solid #11998e; }
      &.table { border-bottom: 4px solid #f5576c; }
      &.wolt { border-bottom: 4px solid #00c6fb; }
    }
  }

  .delivery-insight {
    font-size: 1.1rem;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;

    &.animate-in {
      opacity: 0.8;
      transform: translateY(0);
    }
  }
}
</style>
