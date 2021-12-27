<template>
  <div v-show="loading" class="loader">
    <slot>
      <svg viewBox="25 25 50 50" class="loader__svg">
        <circle cx="50" cy="50" r="20" class="loader__circle" />
      </svg>
    </slot>
  </div>
</template>

<script>
export default {
  props: {
    loading: {
      type: Boolean,
      default: false
    }
  }
}
</script>

<style lang="scss" scoped>
.loader {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: rem(30) 0;

  &__svg {
    width: rem(50);
    transform-origin: center;
    animation: rotate 2s linear infinite;
  }
  &__circle {
    stroke: #CCCCCC;
    fill: none;
    stroke-width: 3;
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
    stroke-linecap: round;
    animation: dash 1.5s ease-in-out infinite;
  }
}

@keyframes rotate {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes dash {
  0% {
    stroke-dasharray: 1, 200;
    stroke-dashoffset: 0;
  }
  50% {
    stroke-dasharray: 90, 200;
    stroke-dashoffset: rem(-35);
  }
  100% {
    stroke-dashoffset: rem(-125);
  }
}
</style>
