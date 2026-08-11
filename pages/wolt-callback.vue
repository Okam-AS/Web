<template>
  <div class="flex items-center justify-center min-h-screen bg-white">
    <div class="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-gray-600"></div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'

// Wolt's OAuth redirect lands here carrying the authorization code in the query string.
// That code is a bearer credential for the store's Wolt integration, so it may only ever
// be handed to Okam's own API — a redirect to any other host discloses it to that host.
// The target is therefore derived from API_BASE_URL and never hardcoded. The backend
// endpoint validates `state` and performs the token exchange server-side, so the client
// secret stays out of the browser.
export default Vue.extend({
  mounted() {
    const apiBaseUrl = process.env.API_BASE_URL || ''
    const callbackUrl = `${apiBaseUrl}/wolt/marketplace/auth/ssio/callback`
    const queryString = new URLSearchParams(this.$route.query as Record<string, string>).toString()
    window.location.href = queryString ? `${callbackUrl}?${queryString}` : callbackUrl
  }
})
</script>
