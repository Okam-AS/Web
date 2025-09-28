<template>
  <div
    v-show="loading"
    :class="{ loader: true, 'loader-fixed': fixed }"
    :style="'width:' + size + 'px;height:' + size + 'px;'"
  >
    <slot>
      <svg
        viewBox="25 25 50 50"
        class="loader__svg"
      >
        <circle
          cx="50"
          cy="50"
          r="20"
          class="loader__circle"
        />
      </svg>
    </slot>
  </div>
</template>

<script>
export default {
  props: {
    loading: {
      type: Boolean,
      default: true,
    },
    size: {
      type: Number,
      default: 30,
    },
    fixed: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.loader {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: auto;

  &-fixed {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.7);
    z-index: 9999;
    padding: rem(30);
  }

  &__svg {
    width: rem(50);
    transform-origin: center;
    animation: rotate 2s linear infinite;
  }
  &__circle {
    stroke: #cccccc;
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
