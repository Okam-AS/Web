<template>
  <div class="stepper">
    <button
      class="stepper-button"
      @click.stop="subtract"
    >
      −
    </button>
    <span class="stepper-quantity">{{ quantity }}</span>
    <button
      class="stepper-button"
      @click.stop="add"
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
    min-width: rem(40);
    text-align: center;
  }

  &-button {
    display: flex;
    justify-content: center;
    align-items: center;
		width: rem(32);
		height: rem(32);
		border-radius: 50%;
		border: none;
		background: $color-dark;
    color: #fff;
    font-size: rem(20);
    line-height: 1;
	}

  &--small {
    .stepper-button {
      width: rem(24);
      height: rem(24);
    }

    .stepper-quantity {
      min-width: rem(32);
      font-size: rem(14);
    }
  }
}
</style>