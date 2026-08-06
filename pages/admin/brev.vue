<template>
  <AdminPage class="print" @login-success="loadLetters">
    <div class="container">
      <div v-for="letter in letters" :key="letter.name" class="a4page">
        <SalesLetter :name="letter.name" :image-url="letter.imageUrl" />
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import SalesLetter from '~/components/organisms/SalesLetter.vue'

export default {
  components: { AdminPage, SalesLetter },
  data: () => ({
    letters: []
  }),
  mounted () {
    // `AdminPage` raises the sign-in modal for a signed-out visitor and emits `login-success` when
    // one arrives. All this needs to do is not call anything before that happens.
    if (!this.$store.getters.userIsLoggedIn) {
      return
    }
    this.loadLetters()
  },
  methods: {
    loadLetters () {
      // For static generation, we'll use a predefined list or empty array
      // since require.context doesn't work well with static builds
      this.letters = []
    },
    extractNameFromFilename (filename) {
      return filename
        .replace('./', '')
        .replace('.png', '')
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }
  }
}
</script>
<style lang="scss">
.print {
  .admin__content,
  .admin__wrapper {
    margin: 0;
    padding: 0;
    max-width: 100%;
  }
  .container {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    height: 100%;
    background: #d3d3d3;
  }
  .a4page {
    width: 210mm;
    height: 297mm;
    background: white;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.2);
    overflow: hidden;
    position: relative;
    page-break-after: always;
    margin: 10px;
  }
}

@media print {
  .admin__header {
    display: none !important;
  }
  .admin__footer {
    display: none !important;
  }
  .a4page {
    margin: 0 !important;
  }
}
</style>
