<template>
  <div class="product-conf">
    <div
      :class="{
        'product-option': true,
        'is-selected': selected,
        'is-disabled': disabled,
      }"
      role="checkbox"
      tabindex="0"
      :aria-selected="selected"
      @click="trigger"
      @keyup.enter="trigger"
    >
      <span class="product-option__radio" />
      <slot />
      <span class="product-option__text">{{ text }}</span>
      <slot name="suffix" />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    disabled: {
      type: Boolean,
      default: false
    },
    selected: {
      type: Boolean,
      default: false
    },
    text: {
      type: String,
      default: ''
    }
  },
  methods: {
    trigger () {
      if (!this.disabled) {
        this.$emit('change', !this.selected)
      }
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
      margin-left: 0.5em;
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

    &.is-disabled {
      .product-option__radio,
      .product-option__text {
        opacity: 0.5;
      }
    }
  }
}
</style>