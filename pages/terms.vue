<template>
  <div class="terms-container">
    <terms-content />
  </div>
</template>

<script>
import TermsContent from '~/components/shared/TermsContent.vue'

export default {
  name: 'TermsPage',
  components: {
    TermsContent
  }
}
</script>

<style scoped>
.terms-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}
</style>
