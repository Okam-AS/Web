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
    showLabel: false
  }),
  mounted() {
    this.animateIn()
  },
  methods: {
    animateIn() {
      setTimeout(() => { this.showIcon = true }, 200)
      setTimeout(() => { this.showAmount = true }, 500)
      setTimeout(() => { this.showLabel = true }, 800)
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
  background: linear-gradient(180deg, #bb5473 0%, #bfa830 30%, #191414 70%);
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

}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
}
</style>
