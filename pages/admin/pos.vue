<template>
  <AdminPage :chromeless="true" @login-success="handleLoginSuccess">
    <PosShell v-if="storeId" :key="storeId" :store-id="storeId" />
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import PosShell from '~/components/admin/pos/PosShell.vue';

// Full-screen POS register. Power-user gated for now (like the other kassa pages); when stores run
// the POS themselves the nav entry moves out of the power-user group. Writing still requires an
// operator session regardless of the page guard.
export default {
  name: 'AdminPos',
  components: { AdminPage, PosShell },
  computed: {
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      return stores.length ? stores[0].id : '';
    }
  },
  mounted () {
    this.guard();
  },
  methods: {
    guard () {
      if (!this.$store.getters.userIsLoggedIn) { return; }
      if (!(this.$store.state.currentUser && this.$store.state.currentUser.isPowerUser)) {
        this.$router.push('/admin');
      }
    },
    handleLoginSuccess () {
      this.guard();
    }
  }
};
</script>
