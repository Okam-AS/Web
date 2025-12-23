<template>
  <div class="slide slide-overview">
    <div class="slide-content">
      <div class="section-label">Årets oversikt</div>

      <div class="stats-container">
        <div class="big-stat" :class="{ 'animate-in': showOrders }">
          <span class="stat-value">{{ animatedOrders }}</span>
          <span class="stat-label">bestillinger</span>
        </div>

        <div class="divider" :class="{ 'animate-in': showDivider }"></div>

        <div class="big-stat revenue" :class="{ 'animate-in': showRevenue }">
          <span class="stat-value">{{ animatedRevenue }}</span>
          <span class="stat-label">i omsetning</span>
        </div>
      </div>

      <div class="sub-stats" :class="{ 'animate-in': showSubStats }">
        <div class="sub-stat">
          <span class="sub-stat-value">{{ data.averageOrderValueFormatted }}</span>
          <span class="sub-stat-label">snittordre</span>
        </div>
        <div class="sub-stat">
          <span class="sub-stat-value">{{ data.uniqueCustomers }}</span>
          <span class="sub-stat-label">kunder</span>
        </div>
      </div>

      <p class="celebration-text" :class="{ 'animate-in': showText }">
        For et fantastisk år! 🎉
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SlideOverview',
  props: {
    data: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  data: () => ({
    showOrders: false,
    showDivider: false,
    showRevenue: false,
    showSubStats: false,
    showText: false,
    animatedOrders: '0',
    animatedRevenue: 'kr 0'
  }),
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => {
        this.showOrders = true
        this.animateNumber('orders', this.data.totalOrders)
      }, 200)

      setTimeout(() => { this.showDivider = true }, 500)

      setTimeout(() => {
        this.showRevenue = true
        this.animateRevenue(this.data.totalRevenue)
      }, 700)

      setTimeout(() => { this.showSubStats = true }, 1200)
      setTimeout(() => { this.showText = true }, 1600)
    },
    animateNumber(type, target) {
      const duration = 1500
      const steps = 60
      const increment = target / steps
      let current = 0

      const timer = setInterval(() => {
        current += increment
        if (current >= target) {
          current = target
          clearInterval(timer)
        }
        this.animatedOrders = Math.floor(current).toLocaleString('nb-NO')
      }, duration / steps)
    },
    animateRevenue(target) {
      const duration = 1500
      const steps = 60
      const increment = target / steps
      let current = 0

      const timer = setInterval(() => {
        current += increment
        if (current >= target) {
          current = target
          clearInterval(timer)
        }
        this.animatedRevenue = this.priceLabel(Math.floor(current))
      }, duration / steps)
    }
  }
}
</script>

<style lang="scss" scoped>
.slide-overview {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(180deg, #4c5eb0 0%, #191414 60%);
  padding: 24px;
  padding-top: 40px;
  padding-bottom: 40px;

  .slide-content {
    text-align: center;
    max-width: 500px;
  }

  .section-label {
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: white;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    margin-bottom: 48px;
  }

  .stats-container {
    margin-bottom: 48px;
  }

  .big-stat {
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .stat-value {
      display: block;
      font-size: 4.5rem;
      font-weight: 800;
      color: #1bb776;
      line-height: 1;

      @media (max-width: 768px) {
        font-size: 3rem;
      }
    }

    .stat-label {
      display: block;
      font-size: 1.25rem;
      opacity: 0.7;
      margin-top: 8px;
    }

    &.revenue .stat-value {
      font-size: 3.5rem;

      @media (max-width: 768px) {
        font-size: 2.25rem;
      }
    }
  }

  .divider {
    width: 60px;
    height: 3px;
    background: rgba(255, 255, 255, 0.2);
    margin: 32px auto;
    opacity: 0;
    transform: scaleX(0);
    transition: all 0.4s ease-out;

    &.animate-in {
      opacity: 1;
      transform: scaleX(1);
    }
  }

  .sub-stats {
    display: flex;
    justify-content: center;
    gap: 48px;
    margin-bottom: 48px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .sub-stat {
      text-align: center;

      .sub-stat-value {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.9);
      }

      .sub-stat-label {
        display: block;
        font-size: 0.9rem;
        opacity: 0.5;
        margin-top: 4px;
      }
    }
  }

  .celebration-text {
    font-size: 1.5rem;
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
