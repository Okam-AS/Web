<template>
  <client-only>
    <RedirectToNewStore path="/shop" />
  </client-only>
</template>

<script lang="ts">
import RedirectToNewStore from '~/components/organisms/RedirectToNewStore.vue'

export default {
  components: { RedirectToNewStore }
}
</script>
