<template>
  <div class="flex items-center justify-center min-h-screen bg-white">
    <div class="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-600"></div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

export default Vue.extend({
  mounted() {
    const ngrokUrl = 'https://successive-emogene-unsyncopated.ngrok-free.dev/wolt-callback'
    const queryString = new URLSearchParams(this.$route.query as Record<string, string>).toString()
    const redirectUrl = queryString ? `${ngrokUrl}?${queryString}` : ngrokUrl
    window.location.href = redirectUrl
  }
})
</script>
