<template>
  <div class="slide slide-not-enough">
    <div class="slide-content">
      <div class="year-container" :class="{ 'animate-in': showYear }">
        <div class="year-number">2025</div>
      </div>

      <h1 class="store-name" :class="{ 'animate-in': showStore }">
        {{ data.storeName }}
      </h1>

      <div class="message-container" :class="{ 'animate-in': showMessage }">
        <span class="emoji">📊</span>
        <h2>For lite data</h2>
        <p>
          Vi trenger minst 5 fullførte bestillinger for å lage din Wrapped.
          Du har {{ data.totalOrders || 0 }} bestilling{{ (data.totalOrders || 0) === 1 ? '' : 'er' }} i 2025.
        </p>
      </div>

      <div class="encouragement" :class="{ 'animate-in': showEncouragement }">
        <p>Vi gleder oss til å se hva 2025 bringer!</p>
        <span class="rocket">🚀</span>
      </div>

      <button class="back-btn" :class="{ 'animate-in': showButton }" @click="$emit('finish')">
        <span>Tilbake til admin</span>
        <span class="material-icons">arrow_forward</span>
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'SlideNotEnoughData',
  props: {
    data: { type: Object, required: true },
    active: { type: Boolean, default: false }
  },
  data: () => ({
    showYear: false,
    showStore: false,
    showMessage: false,
    showEncouragement: false,
    showButton: false
  }),
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => { this.showYear = true }, 200)
      setTimeout(() => { this.showStore = true }, 500)
      setTimeout(() => { this.showMessage = true }, 800)
      setTimeout(() => { this.showEncouragement = true }, 1200)
      setTimeout(() => { this.showButton = true }, 1600)
    }
  }
}
</script>

<style lang="scss" scoped>
.slide-not-enough {
  width: 100%;
  min-height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: linear-gradient(180deg, #1db954 0%, #191414 60%);
  padding: 24px;
  padding-top: 40px;
  padding-bottom: 40px;

  .slide-content {
    text-align: center;
    max-width: 500px;
  }

  .year-container {
    margin-bottom: 24px;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);

    &.animate-in {
      opacity: 1;
      transform: scale(1);
    }

    .year-number {
      font-size: 5rem;
      font-weight: 900;
      background: linear-gradient(135deg, #fff 0%, #1bb776 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;

      @media (max-width: 768px) {
        font-size: 3.5rem;
      }
    }
  }

  .store-name {
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: 48px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    @media (max-width: 768px) {
      font-size: 1.5rem;
    }
  }

  .message-container {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 32px;
    margin-bottom: 32px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    .emoji {
      font-size: 3rem;
      display: block;
      margin-bottom: 16px;
    }

    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 12px;
      color: #ffffff;
    }

    p {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.8);
      line-height: 1.6;
    }
  }

  .encouragement {
    margin-bottom: 48px;
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.6s ease-out;

    &.animate-in {
      opacity: 1;
      transform: translateY(0);
    }

    p {
      font-size: 1.1rem;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 12px;
    }

    .rocket {
      font-size: 2rem;
      display: inline-block;
      animation: float 2s ease-in-out infinite;
    }
  }

  .back-btn {
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

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
