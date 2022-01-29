<template>
  <button
    class="btn btn--primary"
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


</style>