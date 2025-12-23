<template>
  <div class="slide slide-funfacts">
    <div class="slide-content">
      <div class="section-label">Visste du at...</div>

      <div class="facts-container">
        <div
          v-for="(fact, index) in data.funFacts"
          :key="index"
          class="fact-card"
          :class="{ 'animate-in': showFacts }"
          :style="{ animationDelay: (index * 200) + 'ms' }"
        >
          <div class="fact-icon">
            <span class="material-icons">{{ fact.icon }}</span>
          </div>
          <div class="fact-content">
            <div class="fact-title">{{ fact.title }}</div>
            <div class="fact-description">{{ fact.description }}</div>
          </div>
        </div>
      </div>

      <div class="monthly-chart" :class="{ 'animate-in': showChart }">
        <div class="chart-title">Bestillinger per måned</div>
        <div class="chart-bars">
          <div
            v-for="month in data.monthlyOrders"
            :key="month.month"
            class="chart-bar"
            :style="{ height: getBarHeight(month.value) + '%' }"
          >
            <div class="bar-value">{{ month.value }}</div>
            <div class="bar-fill"></div>
            <div class="bar-label">{{ getShortMonth(month.monthName) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SlideFunFacts',
  props: {
    data: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  data: () => ({
    showFacts: false,
    showChart: false
  }),
  computed: {
    maxOrders() {
      const orders = this.data.monthlyOrders || []
      return Math.max(...orders.map(m => m.value), 1)
    }
  },
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => { this.showFacts = true }, 300)
      setTimeout(() => { this.showChart = true }, 1000)
    },
    getBarHeight(value) {
      return Math.max((value / this.maxOrders) * 100, 5)
    },
    getShortMonth(monthName) {
      return monthName ? monthName.substring(0, 3) : ''
    }
  }
}
</script>

<style lang="scss" scoped>
.slide-funfacts {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(180deg, #32af5c 0%, #2abba1 30%, #191414 70%);
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
    margin-bottom: 32px;
  }

  .facts-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 48px;

    .fact-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: rgba(0, 0, 0, 0.35);
      border-radius: 16px;
      text-align: left;
      opacity: 0;
      transform: translateX(-30px);
      transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);

      &.animate-in {
        opacity: 1;
        transform: translateX(0);
      }

      .fact-icon {
        width: 48px;
        height: 48px;
        background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .material-icons {
          font-size: 24px;
          color: white;
        }
      }

      .fact-content {
        .fact-title {
          font-weight: 700;
          font-size: 1rem;
          margin-bottom: 4px;
          color: #ffffff;
        }

        .fact-description {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.85);
        }
      }
    }
  }

  .monthly-chart {
    background: rgba(0, 0, 0, 0.35);
    border-radius: 16px;
    padding: 24px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .chart-title {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 16px;
    }

    .chart-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 120px;
      gap: 4px;

      .chart-bar {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-end;
        min-height: 20px;

        .bar-value {
          font-size: 0.7rem;
          font-weight: 600;
          margin-bottom: 4px;
          color: rgba(255, 255, 255, 0.9);
        }

        .bar-fill {
          width: 100%;
          background: linear-gradient(180deg, #1bb776, #159f63);
          border-radius: 4px 4px 0 0;
          flex: 1;
          min-height: 4px;
        }

        .bar-label {
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.7);
          margin-top: 8px;
          text-transform: uppercase;
        }
      }
    }
  }
}
</style>
