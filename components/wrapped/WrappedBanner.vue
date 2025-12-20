<template>
  <div v-if="showBanner" class="wrapped-banner">
    <div class="wrapped-banner__content">
      <div class="wrapped-banner__icon">
        <span class="sparkle">✨</span>
      </div>
      <div class="wrapped-banner__text">
        <strong>Din Okam Wrapped 2025 er klar!</strong>
        <span>Se dine høydepunkter fra året som gikk</span>
      </div>
      <div class="wrapped-banner__actions">
        <nuxt-link to="/admin/wrapped" class="wrapped-banner__cta">
          Se nå
        </nuxt-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'WrappedBanner',
  computed: {
    showBanner() {
      // Always visible during Wrapped season (Dec 15, 2025 - Jan 31, 2026)
      // For development, show it always
      return true
    }
  }
}
</script>

<style lang="scss" scoped>
.wrapped-banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #1bb776 100%);
  padding: 12px 16px;
  margin: 16px 16px 0 16px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  animation: glow 2s ease-in-out infinite alternate;

  &__content {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    max-width: 1400px;
    margin: 0 auto;
  }

  &__icon {
    font-size: 24px;
    animation: sparkle 1.5s ease-in-out infinite;
  }

  &__text {
    flex: 1;
    min-width: 200px;
    color: white;

    strong {
      display: block;
      font-size: 1rem;
      font-weight: 600;
    }

    span {
      font-size: 0.85rem;
      opacity: 0.9;
    }
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__cta {
    background: white;
    color: #764ba2;
    padding: 10px 24px;
    border-radius: 24px;
    font-weight: 600;
    text-decoration: none;
    transition: transform 0.2s, box-shadow 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  }
}

@keyframes glow {
  from {
    box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  }
  to {
    box-shadow: 0 4px 24px rgba(27, 183, 118, 0.4);
  }
}

@keyframes sparkle {
  0%, 100% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.2) rotate(10deg); }
}

@media (max-width: 768px) {
  .wrapped-banner {
    margin: 12px 12px 0 12px;
    padding: 12px;

    &__content {
      justify-content: center;
      text-align: center;
    }

    &__text {
      order: 2;
      width: 100%;
    }

    &__icon {
      order: 1;
    }

    &__actions {
      order: 3;
      width: 100%;
      justify-content: center;
      margin-top: 8px;
    }
  }
}
</style>
