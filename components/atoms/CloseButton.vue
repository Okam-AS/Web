<template>
  <button class="close-button" aria-label="Avbryt" @click="$emit('click')">
    <span class="close-button-x" aria-hidden="true">×</span>
  </button>
</template>
<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.close-button {
  background: $color-dark;
  color: white;
  padding: rem(10);
  border-radius: 50%;
  border: none;
  font-size: rem(24);
  width: rem(30);
  height: rem(30);
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &-x {
    line-height: 1;
  }

  &--top-right {
    position: absolute;
    top: rem(16);
    right: rem(16);
  }
}
</style>