<template>
  <AdminPage class="print">
    <div class="container">
      <div v-for="letter in letters" :key="letter.name" class="a4page">
        <SalesLetter :name="letter.name" :image-url="letter.imageUrl" />
      </div>
    </div>
    <LoginModal v-if="showLogin" @close="closeLoginModal" />
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import SalesLetter from '~/components/organisms/SalesLetter.vue'
import LoginModal from '~/components/molecules/LoginModal.vue'

export default {
  components: { AdminPage, LoginModal, SalesLetter },
  data: () => ({
    letters: [],
    showLogin: false
  }),
  mounted () {
    if (!this.$store.getters.userIsLoggedIn) {
      this.showLogin = true
      return
    }
    this.loadLetters()
  },
  methods: {
    closeLoginModal (isLoggedIn) {
      this.showLogin = !isLoggedIn
      if (isLoggedIn) {
        this.loadOrders()
      }
    },
    loadLetters () {
      const context = require.context('~/assets/UI/logos/', false, /\.png$/)
      this.letters = context.keys().map(key => ({
        name: this.extractNameFromFilename(key),
        imageUrl: context(key)
      }))
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
