<template>
  <div class="slide slide-tips">
    <div class="slide-content">
      <div class="section-label">Tips fra kundene</div>

      <div class="tips-icon" :class="{ 'animate-in': showIcon }">
        <span class="heart">❤️</span>
      </div>

      <div class="tips-amount" :class="{ 'animate-in': showAmount }">
        {{ data.totalTipsFormatted }}
      </div>

      <div class="tips-label" :class="{ 'animate-in': showLabel }">
        i tips mottatt
      </div>

      <div class="tips-comparison" :class="{ 'animate-in': showComparison }">
        <div class="comparison-icon">{{ comparison.icon }}</div>
        <div class="comparison-text" v-html="comparison.text" />
      </div>

      <p class="thanks-message" :class="{ 'animate-in': showThanks }">
        Takk til alle som viste sin takknemlighet 🙏
      </p>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SlideTips',
  props: {
    data: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  data: () => ({
    showIcon: false,
    showAmount: false,
    showLabel: false,
    showComparison: false,
    showThanks: false
  }),
  computed: {
    tipsInKr() {
      return Math.floor((this.data.totalTips || 0) / 100)
    },
    comparison() {
      const kr = this.tipsInKr
      // Ulike sammenligninger basert på beløp
      if (kr >= 50000) {
        // Over 50 000 kr - luksus
        const weekends = Math.floor(kr / 5000)
        return { icon: '🏖️', text: `Det er nok til ${weekends} weekend-turer!` }
      } else if (kr >= 20000) {
        // 20 000 - 50 000 kr - stor gave
        const iphones = Math.floor(kr / 12000)
        return { icon: '📱', text: `Det er nok til ${iphones} ny${iphones > 1 ? 'e' : ''} telefon${iphones > 1 ? 'er' : ''}!` }
      } else if (kr >= 10000) {
        // 10 000 - 20 000 kr - middels stor
        const dinners = Math.floor(kr / 500)
        return { icon: '🍽️', text: `Det er nok til ${dinners} restaurantbesøk!` }
      } else if (kr >= 5000) {
        // 5 000 - 10 000 kr
        const movies = Math.floor(kr / 150)
        return { icon: '🎬', text: `Det er nok til ${movies} kinoturer med popcorn!` }
      } else if (kr >= 1000) {
        // 1 000 - 5 000 kr
        const pizzas = Math.floor(kr / 200)
        return { icon: '🍕', text: `Det er nok til ${pizzas} pizzaer!` }
      } else if (kr >= 100) {
        // 100 - 1 000 kr
        const coffees = Math.floor(kr / 50)
        return { icon: '☕', text: `Det er nok til ${coffees} kopper kaffe!` }
      } else if (kr > 0) {
        // Under 100 kr
        const candies = Math.floor(kr / 3)
        return { icon: '🍬', text: `Det er nok til ${candies} godterier!` }
      } else {
        return { icon: '💰', text: 'Hver krone teller!' }
      }
    }
  },
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => { this.showIcon = true }, 200)
      setTimeout(() => { this.showAmount = true }, 500)
      setTimeout(() => { this.showLabel = true }, 800)
      setTimeout(() => { this.showComparison = true }, 1200)
      setTimeout(() => { this.showThanks = true }, 1600)
    }
  }
}
</script>

<style lang="scss" scoped>
.slide-tips {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(180deg, #fa709a 0%, #fee140 30%, #191414 70%);
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

  .tips-icon {
    font-size: 4rem;
    margin-bottom: 24px;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);

    &.animate-in {
      opacity: 1;
      transform: scale(1);
    }

    .heart {
      display: inline-block;
      animation: pulse 1.5s ease-in-out infinite;
    }
  }

  .tips-amount {
    font-size: 4rem;
    font-weight: 800;
    color: #1bb776;
    line-height: 1;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    @media (max-width: 768px) {
      font-size: 3rem;
    }
  }

  .tips-label {
    font-size: 1.25rem;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 48px;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .tips-comparison {
    background: rgba(255, 255, 255, 0.1);
    padding: 20px 32px;
    border-radius: 16px;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 32px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.5s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .comparison-icon {
      font-size: 2rem;
    }

    .comparison-text {
      font-size: 1rem;

      strong {
        color: #1bb776;
        font-weight: 700;
      }
    }
  }

  .thanks-message {
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

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
</style>
