<template>
  <div class="slide slide-platforms">
    <div class="slide-content">
      <div class="section-label">Hvor bestilte kundene fra?</div>

      <div class="platforms-chart" :class="{ 'animate-in': showChart }">
        <div v-if="iosOrders > 0" class="platform-bar ios" :style="{ width: getWidth(iosOrders) + '%' }">
          <span class="platform-icon">🍎</span>
          <span class="platform-label">iOS</span>
          <span class="platform-count">{{ iosOrders }}</span>
        </div>
        <div v-if="androidOrders > 0" class="platform-bar android" :style="{ width: getWidth(androidOrders) + '%' }">
          <span class="platform-icon">🤖</span>
          <span class="platform-label">Android</span>
          <span class="platform-count">{{ androidOrders }}</span>
        </div>
        <div v-if="webOrders > 0" class="platform-bar web" :style="{ width: getWidth(webOrders) + '%' }">
          <span class="platform-icon">🌐</span>
          <span class="platform-label">Web</span>
          <span class="platform-count">{{ webOrders }}</span>
        </div>
        <div v-if="woltOrders > 0" class="platform-bar wolt" :style="{ width: getWidth(woltOrders) + '%' }">
          <span class="platform-icon">🛵</span>
          <span class="platform-label">Wolt</span>
          <span class="platform-count">{{ woltOrders }}</span>
        </div>
      </div>

      <div class="platform-stats" :class="{ 'animate-in': showStats }">
        <div v-if="iosOrders > 0" class="stat-item">
          <div class="stat-percent">{{ iosPercent }}%</div>
          <div class="stat-label">iOS</div>
        </div>
        <div v-if="androidOrders > 0" class="stat-item">
          <div class="stat-percent">{{ androidPercent }}%</div>
          <div class="stat-label">Android</div>
        </div>
        <div v-if="webOrders > 0" class="stat-item">
          <div class="stat-percent">{{ webPercent }}%</div>
          <div class="stat-label">Web</div>
        </div>
        <div v-if="woltOrders > 0" class="stat-item">
          <div class="stat-percent">{{ woltPercent }}%</div>
          <div class="stat-label">Wolt</div>
        </div>
      </div>

      <p class="insight-text" :class="{ 'animate-in': showInsight }">
        {{ insightText }}
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SlidePlatforms',
  props: {
    data: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  data: () => ({
    showChart: false,
    showStats: false,
    showInsight: false
  }),
  computed: {
    // Handle both camelCase from JSON (iosOrders) and possible variations
    iosOrders() {
      return this.data.iosOrders || this.data.iOSOrders || this.data.IOSOrders || 0
    },
    androidOrders() {
      return this.data.androidOrders || 0
    },
    webOrders() {
      return this.data.webOrders || 0
    },
    woltOrders() {
      return this.data.woltOrders || 0
    },
    total() {
      return this.iosOrders + this.androidOrders + this.webOrders + this.woltOrders
    },
    iosPercent() {
      return this.total > 0 ? Math.round((this.iosOrders / this.total) * 100) : 0
    },
    androidPercent() {
      return this.total > 0 ? Math.round((this.androidOrders / this.total) * 100) : 0
    },
    webPercent() {
      return this.total > 0 ? Math.round((this.webOrders / this.total) * 100) : 0
    },
    woltPercent() {
      return this.total > 0 ? Math.round((this.woltOrders / this.total) * 100) : 0
    },
    insightText() {
      const platforms = [
        { name: 'iOS-appen', count: this.iosOrders },
        { name: 'Android-appen', count: this.androidOrders },
        { name: 'Nettsiden', count: this.webOrders },
        { name: 'Wolt', count: this.woltOrders }
      ].filter(p => p.count > 0)
      if (platforms.length === 0) {
        return 'Plattformdata er ikke tilgjengelig for denne perioden.'
      }
      const top = platforms.sort((a, b) => b.count - a.count)[0]
      return `${top.name} er den mest populære plattformen blant dine kunder!`
    }
  },
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => { this.showChart = true }, 300)
      setTimeout(() => { this.showStats = true }, 800)
      setTimeout(() => { this.showInsight = true }, 1200)
    },
    getWidth(count) {
      if (this.total === 0) return 10
      return Math.max(Math.round((count / this.total) * 100), 15)
    }
  }
}
</script>

<style lang="scss" scoped>
.slide-platforms {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(180deg, #3a81bf 0%, #00b5bf 30%, #191414 70%);
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

  .platforms-chart {
    margin-bottom: 48px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .platform-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      margin-bottom: 12px;
      border-radius: 12px;
      transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
      min-width: 10%;

      &.ios {
        background: linear-gradient(135deg, #667eea, #764ba2);
      }

      &.android {
        background: linear-gradient(135deg, #11998e, #38ef7d);
      }

      &.web {
        background: linear-gradient(135deg, #f093fb, #f5576c);
      }

      &.wolt {
        background: linear-gradient(135deg, #00c2e8, #0095c0);
      }

      .platform-icon {
        font-size: 1.5rem;
      }

      .platform-label {
        font-weight: 600;
        flex: 1;
        text-align: left;
      }

      .platform-count {
        font-weight: 700;
        opacity: 0.9;
      }
    }
  }

  .platform-stats {
    display: flex;
    justify-content: center;
    gap: 32px;
    margin-bottom: 32px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .stat-item {
      text-align: center;

      .stat-percent {
        font-size: 2rem;
        font-weight: 800;
        color: #1bb776;
      }

      .stat-label {
        font-size: 0.9rem;
        opacity: 0.6;
        margin-top: 4px;
      }
    }
  }

  .insight-text {
    font-size: 1.1rem;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;
    color: rgba(255, 255, 255, 0.8);

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
</style>
