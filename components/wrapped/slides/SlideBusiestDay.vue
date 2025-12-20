<template>
  <div class="slide slide-busiest">
    <div class="slide-content">
      <div class="section-label">Din travleste dag</div>

      <div class="calendar-icon" :class="{ 'animate-in': showIcon }">
        <span class="material-icons">event</span>
      </div>

      <div class="day-info" :class="{ 'animate-in': showDay }">
        <div class="day-name">{{ data.busiestDayOfWeek }}</div>
        <div class="day-date">{{ formatDate(data.busiestDay) }}</div>
      </div>

      <div class="stats-row" :class="{ 'animate-in': showStats }">
        <div class="stat-box">
          <span class="stat-value">{{ data.busiestDayOrders }}</span>
          <span class="stat-label">bestillinger</span>
        </div>
      </div>

      <div class="popular-info" :class="{ 'animate-in': showPopular }">
        <div class="popular-item">
          <span class="material-icons">schedule</span>
          <span>Travleste time: <strong>{{ data.mostPopularHourRange }}</strong></span>
        </div>
        <div class="popular-item">
          <span class="material-icons">today</span>
          <span>Populær dag: <strong>{{ data.mostPopularDay }}</strong></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SlideBusiestDay',
  props: {
    data: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  data: () => ({
    showIcon: false,
    showDay: false,
    showStats: false,
    showPopular: false
  }),
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => { this.showIcon = true }, 200)
      setTimeout(() => { this.showDay = true }, 500)
      setTimeout(() => { this.showStats = true }, 900)
      setTimeout(() => { this.showPopular = true }, 1300)
    },
    formatDate(dateString) {
      if (!dateString) return ''
      const date = new Date(dateString)
      return date.toLocaleDateString('nb-NO', {
        day: 'numeric',
        month: 'long'
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.slide-busiest {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(180deg, #f093fb 0%, #f5576c 30%, #191414 70%);
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
    margin-bottom: 32px;
  }

  .calendar-icon {
    width: 100px;
    height: 100px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 32px;
    opacity: 0;
    transform: scale(0.5) rotate(-10deg);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);

    &.animate-in {
      opacity: 1;
      transform: scale(1) rotate(0deg);
    }

    .material-icons {
      font-size: 48px;
      color: white;
    }
  }

  .day-info {
    margin-bottom: 32px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .day-name {
      font-size: 3rem;
      font-weight: 800;

      @media (max-width: 768px) {
        font-size: 2rem;
      }
    }

    .day-date {
      font-size: 1.25rem;
      opacity: 0.7;
      margin-top: 4px;
    }
  }

  .stats-row {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-bottom: 48px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .stat-box {
      background: rgba(255, 255, 255, 0.1);
      padding: 20px 40px;
      border-radius: 16px;

      .stat-value {
        display: block;
        font-size: 2.5rem;
        font-weight: 800;
        color: #1bb776;
      }

      .stat-label {
        display: block;
        font-size: 0.9rem;
        opacity: 0.7;
        margin-top: 4px;
      }
    }
  }

  .popular-info {
    display: flex;
    flex-direction: column;
    gap: 16px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .popular-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 1rem;
      opacity: 0.8;

      .material-icons {
        font-size: 20px;
        color: #1bb776;
      }

      strong {
        color: #1bb776;
      }
    }
  }
}
</style>
