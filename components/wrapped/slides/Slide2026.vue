<template>
  <div class="slide slide-2026">
    <div class="slide-content">
      <div class="thank-you-section" :class="{ 'animate-in': showThankYou }">
        <div class="heart-icon">
          <span class="material-icons">favorite</span>
        </div>
        <h2>Takk for 2025!</h2>
        <p class="thank-you-text">
          Vi setter utrolig stor pris på at du bruker Okam.
          Sammen har vi skapt noe fantastisk!
        </p>
      </div>

      <div class="teaser-section" :class="{ 'animate-in': showTeaser }">
        <div class="teaser-header">
          <span class="year-badge">2026</span>
          <span>Dette kommer</span>
        </div>

        <div class="teaser-items">
          <div
            v-for="(item, index) in teaserItems"
            :key="index"
            class="teaser-item"
            :class="{ 'animate-in': showItems }"
            :style="{ animationDelay: (index * 150) + 'ms' }"
          >
            <div class="teaser-icon">
              <span class="material-icons">{{ item.icon }}</span>
            </div>
            <div class="teaser-content">
              <div class="teaser-title">{{ item.title }}</div>
              <div class="teaser-desc">{{ item.desc }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="cta-section" :class="{ 'animate-in': showCta }">
        <p class="cta-text">Vi gleder oss til å fortsette reisen sammen!</p>
        <button class="finish-btn" @click="$emit('finish')">
          <span class="material-icons">celebration</span>
          Tilbake til admin
        </button>
      </div>
    </div>

    <!-- Confetti animation -->
    <div v-if="showConfetti" class="confetti-container">
      <div v-for="i in 50" :key="i" class="confetti" :style="getConfettiStyle(i)" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'Slide2026',
  props: {
    data: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  data: () => ({
    showThankYou: false,
    showTeaser: false,
    showItems: false,
    showCta: false,
    showConfetti: false,
    teaserItems: [
      {
        icon: 'rocket_launch',
        title: 'Kontinuerlige forbedringer',
        desc: 'Enda bedre apper og web-admin med nye funksjoner'
      },
      {
        icon: 'psychology',
        title: 'Mer AI-automatisering',
        desc: 'La kunstig intelligens hjelpe deg med daglige oppgaver'
      },
      {
        icon: 'share',
        title: 'Sosiale medier-integrasjon',
        desc: 'Ny tjeneste som kobler dine sosiale kanaler for automatisk innholdsgenerering og posting'
      }
    ]
  }),
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => { this.showThankYou = true }, 300)
      setTimeout(() => { this.showTeaser = true }, 800)
      setTimeout(() => { this.showItems = true }, 1000)
      setTimeout(() => { this.showCta = true }, 1600)
      setTimeout(() => { this.showConfetti = true }, 400)
    },
    getConfettiStyle(index) {
      const colors = ['#1bb776', '#43e97b', '#38f9d7', '#667eea', '#f093fb', '#f5576c', '#ffecd2']
      const color = colors[index % colors.length]
      const left = Math.random() * 100
      const animationDelay = Math.random() * 3
      const animationDuration = 3 + Math.random() * 2

      return {
        left: left + '%',
        backgroundColor: color,
        animationDelay: animationDelay + 's',
        animationDuration: animationDuration + 's'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.slide-2026 {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #1bb776 0%, #159f63 30%, #191414 70%);
  padding: 24px;
  padding-bottom: 80px; // Extra space for navigation
  position: relative;
  overflow: hidden;

  .slide-content {
    text-align: center;
    max-width: 600px;
    width: 100%;
    z-index: 10;
  }

  .thank-you-section {
    margin-bottom: 40px;
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .heart-icon {
      margin-bottom: 16px;

      .material-icons {
        font-size: 48px;
        color: #f5576c;
        animation: pulse 1.5s ease-in-out infinite;
      }
    }

    h2 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 12px;

      @media (max-width: 480px) {
        font-size: 1.6rem;
      }
    }

    .thank-you-text {
      font-size: 1rem;
      opacity: 0.8;
      line-height: 1.5;
      max-width: 400px;
      margin: 0 auto;
    }
  }

  .teaser-section {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 32px;
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .teaser-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
      font-size: 1.2rem;
      font-weight: 700;

      .year-badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 6px 14px;
        border-radius: 20px;
        font-size: 0.9rem;
      }
    }

    .teaser-items {
      display: flex;
      flex-direction: column;
      gap: 16px;

      .teaser-item {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        text-align: left;
        opacity: 0;
        transform: translateX(-20px);
        transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);

        &.animate-in {
          opacity: 1;
          transform: translateX(0);
        }

        .teaser-icon {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          .material-icons {
            font-size: 22px;
            color: white;
          }
        }

        .teaser-content {
          .teaser-title {
            font-weight: 700;
            font-size: 0.95rem;
            margin-bottom: 4px;
          }

          .teaser-desc {
            font-size: 0.85rem;
            opacity: 0.75;
            line-height: 1.4;
          }
        }
      }
    }
  }

  .cta-section {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .cta-text {
      font-size: 0.95rem;
      opacity: 0.7;
      margin-bottom: 20px;
    }

    .finish-btn {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      padding: 16px 32px;
      background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%);
      color: #191414;
      border: none;
      border-radius: 50px;
      font-size: 1rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        transform: scale(1.05);
        box-shadow: 0 8px 24px rgba(255, 255, 255, 0.3);
      }

      .material-icons {
        font-size: 22px;
      }
    }
  }

  .confetti-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    overflow: hidden;

    .confetti {
      position: absolute;
      top: -10px;
      width: 10px;
      height: 10px;
      border-radius: 2px;
      animation: fall linear infinite;

      &:nth-child(odd) {
        border-radius: 50%;
      }
    }
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.15);
  }
}

@keyframes fall {
  0% {
    transform: translateY(-10px) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}
</style>
