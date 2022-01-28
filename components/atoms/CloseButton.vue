<template>
  <button
    class="close-button"
    @click="$emit('click')"
    aria-label="Avbryt"
  >
    <span class="close-button-x" aria-hidden="true">×</span>
  </button>
</template>
<script>
export default {}
</script>
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
}
</style>