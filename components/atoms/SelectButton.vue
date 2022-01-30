<template>
  <div class="product-conf">
    <div
      :class="{
        'product-option': true,
        'is-selected' : selected
      }"
      role="checkbox"
      tabindex="0"
      :aria-selected="selected"
      @click="$emit('change', !selected)"
      @keyup.enter="$emit('change', !selected)"
    >
      <span class="product-option__radio" />
      <slot />
      <span class="product-option__text">{{ text }}</span>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    selected: {
      type: Boolean,
      default: false
    },
    text: {
      type: String,
      default: ''
    }
  }
}
</script>
<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.product-conf {

  .product-option {
    font-size: rem(14);
    padding: rem(8) 0;
    cursor: pointer;
    display: flex;
    align-items: flex-start;

    &__radio,
    &__checkbox {
      width: rem(24);
      height: rem(24);
      border: 1px solid $color-dark;
      display: block;
      background-color: #fff;
      margin-right: rem(8);
      position: relative;
      flex-shrink: 0;
    }

    &__radio {
      border-radius: 50%;
    }

    &__text {
      padding-top: rem(3);
    }

    &.is-selected {
      .product-option__radio,
      .product-option__checkbox {
        &:before {
          position: absolute;
          content: "";
          width: rem(14);
          height: rem(14);
          background-color: $color-dark;
          top: rem(4);
          left: rem(4);
        }
      }

      .product-option__radio {
        &:before {
          border-radius: 50%;
        }
      }
    }
  }
}
</style>