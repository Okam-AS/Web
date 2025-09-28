<template>
  <client-only>
    <RedirectToNewStore />
  </client-only>
</template>

<script lang="ts">
import RedirectToNewStore from '~/components/organisms/RedirectToNewStore.vue'

export default {
  components: { RedirectToNewStore }
}
</script>
