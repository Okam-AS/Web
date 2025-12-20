<template>
  <div class="store-selector">
    <div class="store-selector__content">
      <div class="year-badge">2025</div>
      <h1 class="store-selector__title">Okam Wrapped</h1>
      <p class="store-selector__subtitle">Hvilken butikk vil du se?</p>

      <div class="store-selector__grid">
        <button
          v-for="(store, index) in stores"
          :key="store.id"
          class="store-card"
          :class="{ 'animate-in': showCards }"
          :style="{ animationDelay: (index * 100) + 'ms' }"
          @click="selectStore(store.id)"
        >
          <div class="store-card__icon">
            <span class="material-icons">storefront</span>
          </div>
          <div class="store-card__name">{{ store.name }}</div>
          <div class="store-card__arrow">
            <span class="material-icons">arrow_forward</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WrappedStoreSelector',
  props: {
    stores: {
      type: Array,
      required: true
    }
  },
  data: () => ({
    showCards: false
  }),
  mounted() {
    setTimeout(() => {
      this.showCards = true
    }, 300)
  },
  methods: {
    selectStore(storeId) {
      this.$emit('select', storeId)
    }
  }
}
</script>

<style lang="scss" scoped>
.store-selector {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: linear-gradient(180deg, #1db954 0%, #191414 40%);

  &__content {
    text-align: center;
    max-width: 600px;
    width: 100%;
  }

  .year-badge {
    display: inline-block;
    padding: 8px 24px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 16px;
    letter-spacing: 2px;
    animation: fadeIn 0.6s ease-out;
  }

  &__title {
    font-size: 3rem;
    font-weight: 800;
    margin-bottom: 8px;
    background: linear-gradient(135deg, #fff 0%, #1bb776 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: fadeIn 0.6s ease-out 0.1s backwards;

    @media (max-width: 768px) {
      font-size: 2rem;
    }
  }

  &__subtitle {
    font-size: 1.25rem;
    opacity: 0.8;
    margin-bottom: 48px;
    animation: fadeIn 0.6s ease-out 0.2s backwards;
  }

  &__grid {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

.store-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
  transform: translateY(20px);
  color: white;
  text-align: left;

  &.animate-in {
    animation: slideUp 0.5s ease-out forwards;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    border-color: #1bb776;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(27, 183, 118, 0.2);
  }

  &__icon {
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;

    .material-icons {
      font-size: 24px;
    }
  }

  &__name {
    flex: 1;
    font-size: 1.1rem;
    font-weight: 600;
  }

  &__arrow {
    opacity: 0.5;
    transition: all 0.3s;

    .material-icons {
      font-size: 24px;
    }
  }

  &:hover &__arrow {
    opacity: 1;
    transform: translateX(4px);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
