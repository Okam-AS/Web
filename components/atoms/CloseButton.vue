<template>
  <button
    class="close-button"
    @click="$emit('click')"
  >
    <img src="~/assets/UI/close.svg" class="close-button-x">
    <slot />
  </button>
</template>
<script>
export default {}
</script>
<style lang="scss" scoped>
@import "../../assets/sass/common.scss";

.close-button {
  background: white;
  padding: rem(10);
  border-radius: rem(20);
  border: 1px solid rgba(0,0,0,0.2);

	&-x {
		float: left;
		width: rem(14);
		height: rem(14);
		margin-right: rem(5);
	}
}
</style>