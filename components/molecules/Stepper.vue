<template>
  <div class="stepper">
    <button
      class="stepper-button"
      @click="subtract"
    >
      −
    </button>
    <span class="stepper-quantity">{{ quantity }}</span>
    <button
      class="stepper-button"
      @click="add"
    >
      +
    </button>
  </div>
</template>

<script>
export default {
  props: {
    quantity: {
      type: Number,
      default: 0
    }
  },
  methods: {
    add () {
      this.$emit('add')
    },
    subtract () {
      this.$emit('subtract')
    }
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.stepper {
  display: flex;
  align-items: center;

  &-quantity {
    display: inline-block;
    min-width: 2.5rem;
    text-align: center;
  }

  &-button {
    display: flex;
    justify-content: center;
    align-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		border: none;
		background: $color-dark;
    color: #fff;
    font-size: rem(20);
    line-height: 1;
	}
}
</style>