<template>
  <AdminPage>
    <div class="employees-page">
      <div class="page-header">
        <h1>Ansatte</h1>
        <p class="page-description">Legg til brukere som skal ha tilgang til butikken</p>
      </div>

      <div v-if="!selectedStore" class="empty-state">
        <h3>Velg en butikk</h3>
        <p>Velg en butikk for å administrere ansatte.</p>
      </div>

      <EmployeeManager v-else :store-id="selectedStore" />
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import EmployeeManager from '~/components/molecules/EmployeeManager.vue'

export default {
  name: 'Employees',
  components: { AdminPage, EmployeeManager },
  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore
    },
  },
}
</script>

<style scoped>
.employees-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #292c34;
  margin: 0 0 4px;
}

.page-description {
  color: #6b7280;
  margin: 0;
  font-size: 14px;
}

.empty-state {
  text-align: center;
  padding: 60px 24px;
  color: #6b7280;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px;
}

@media (max-width: 640px) {
  .employees-page { padding: 16px; }
}
</style>
