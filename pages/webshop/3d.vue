<template>
  <client-only>
    <RedirectToNewStore path="/3d" />
  </client-only>
</template>

<script lang="ts">
import RedirectToNewStore from '~/components/organisms/RedirectToNewStore.vue'

export default {
  components: { RedirectToNewStore }
}
</script>
