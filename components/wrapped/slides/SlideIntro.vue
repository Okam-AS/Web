<template>
  <div class="slide slide-intro">
    <div class="slide-content">
      <div class="store-logo" :class="{ 'animate-in': showLogo }">
        <img v-if="data.storeLogoUrl" :src="data.storeLogoUrl" :alt="data.storeName" />
        <span v-else class="material-icons fallback-icon">storefront</span>
      </div>

      <div class="year-container" :class="{ 'animate-in': showYear }">
        <div class="year-number">2025</div>
        <div class="year-sparkles">
          <span v-for="i in 6" :key="i" class="sparkle" :style="getSparkleStyle(i)">✨</span>
        </div>
      </div>

      <h1 class="store-name" :class="{ 'animate-in': showStore }">
        {{ data.storeName }}
      </h1>

      <p class="intro-text" :class="{ 'animate-in': showText }">
        La oss se tilbake på året som gikk...
      </p>

      <button class="start-btn" :class="{ 'animate-in': showButton }" @click="$emit('next')">
        <span>Start</span>
        <span class="material-icons">arrow_forward</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SlideIntro',
  props: {
    data: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  data: () => ({
    showLogo: false,
    showYear: false,
    showStore: false,
    showText: false,
    showButton: false
  }),
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => { this.showLogo = true }, 100)
      setTimeout(() => { this.showYear = true }, 400)
      setTimeout(() => { this.showStore = true }, 800)
      setTimeout(() => { this.showText = true }, 1200)
      setTimeout(() => { this.showButton = true }, 1600)
    },
    getSparkleStyle(index) {
      const angles = [0, 60, 120, 180, 240, 300]
      const angle = angles[index - 1]
      const radius = 120
      const x = Math.cos((angle * Math.PI) / 180) * radius
      const y = Math.sin((angle * Math.PI) / 180) * radius
      return {
        transform: `translate(${x}px, ${y}px)`,
        animationDelay: `${index * 0.1}s`
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.slide-intro {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(180deg, #1a1a2e 0%, #191414 60%);
  padding: 24px;
  padding-top: 40px;
  padding-bottom: 40px;

  .slide-content {
    text-align: center;
  }

  .store-logo {
    width: 100px;
    height: 100px;
    margin: 0 auto 24px;
    border-radius: 50%;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

    &.animate-in {
      opacity: 1;
      transform: scale(1);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .fallback-icon {
      font-size: 48px;
      color: rgba(255, 255, 255, 0.6);
    }

    @media (max-width: 768px) {
      width: 80px;
      height: 80px;

      .fallback-icon {
        font-size: 36px;
      }
    }
  }

  .year-container {
    position: relative;
    display: inline-block;
    margin-bottom: 32px;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);

    &.animate-in {
      opacity: 1;
      transform: scale(1);
    }

    .year-number {
      font-size: 8rem;
      font-weight: 900;
      background: linear-gradient(135deg, #fff 0%, #1bb776 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;

      @media (max-width: 768px) {
        font-size: 5rem;
      }
    }

    .year-sparkles {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;

      .sparkle {
        position: absolute;
        font-size: 1.5rem;
        animation: twinkle 1.5s ease-in-out infinite;
      }
    }
  }

  .store-name {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 16px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    @media (max-width: 768px) {
      font-size: 1.75rem;
    }
  }

  .intro-text {
    font-size: 1.25rem;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease-out;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 48px;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .start-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 16px 48px;
    background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
    color: white;
    border: none;
    border-radius: 50px;
    font-size: 1.1rem;
    font-weight: 600;
    cursor: pointer;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
    box-shadow: 0 4px 16px rgba(27, 183, 118, 0.4);

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 24px rgba(27, 183, 118, 0.5);
    }

    .material-icons {
      font-size: 20px;
      transition: transform 0.2s;
    }

    &:hover .material-icons {
      transform: translateX(4px);
    }
  }
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
</style>
