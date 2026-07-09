<template>
  <AdminPage @login-success="handleLoginSuccess">
    <div class="tables-page">
      <div class="page-header">
        <h1>Bordkart</h1>
        <p class="page-description">
          Tegn opp lokalet med bord og plasser. Kartet brukes senere til å legge regninger på bord
          og til bordreservasjon. Beta — utkastet lagres foreløpig kun lokalt i denne nettleseren.
          <NuxtLink class="header-link" to="/admin/reservations">
            Se reservasjoner →
          </NuxtLink>
        </p>
      </div>
      <FloorPlanEditor :store-id="storeId" />
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import FloorPlanEditor from '~/components/admin/floorplan/FloorPlanEditor.vue';

export default {
  name: 'AdminTables',
  components: { AdminPage, FloorPlanEditor },
  computed: {
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = this.$store.state.currentUser?.adminIn || [];
      return stores.length ? stores[0].id : '';
    }
  },
  mounted () {
    if (!this.$store.getters.userIsLoggedIn) { return; }
    if (!this.$store.state.currentUser?.isPowerUser) {
      this.$router.push('/admin');
    }
  },
  methods: {
    handleLoginSuccess () {
      if (!this.$store.state.currentUser?.isPowerUser) {
        this.$router.push('/admin');
      }
    }
  }
};
</script>

<style lang="scss" scoped>
.tables-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.page-header {
  margin-bottom: 20px;

  h1 {
    font-size: 2em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 8px 0;

    @media (max-width: 768px) {
      font-size: 1.5em;
    }
  }

  .page-description {
    color: #64748b;
    margin: 0;
    font-size: 0.95em;
  }

  .header-link {
    margin-left: 8px;
    color: #159f63;
    font-weight: 600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
