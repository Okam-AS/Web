<template>
  <div class="stepper">
    <button
      class="stepper-button"
      @click="subtract"
    >
      -
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
@import "../../assets/sass/settings.scss";

.stepper {
  display: flex;

  &-quantity {
    display: inline-block;
    min-width: 3rem;
    text-align: center;
  }

  &-button {
    display: flex;
    justify-content: center;
    align-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		border: 1px solid $color-profile;
		background: white;
	}
}
</style>