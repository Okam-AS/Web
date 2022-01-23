<template>
  <button
    class="continue-button"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>
<script>
export default {}
</script>
<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.continue-button {
  background: $color-support;
  color: white;
  padding: rem(10);
  border-radius: rem(20);
  border: none;
  float: right;
  margin-top: rem(10);
}
</style>