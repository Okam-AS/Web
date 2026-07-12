<template>
  <AdminPage>
    <div class="employees-page">
      <div class="page-header">
        <h1>{{ $i('employees_title') }}</h1>
        <p class="page-description">{{ $i('employees_pageDescription') }}</p>
        <p v-if="isPowerUser" class="page-xlink">
          {{ $i('employees_pos_hint') }}
          <a href="/admin/pos-settings">{{ $i('employees_pos_link') }}</a>
        </p>
      </div>

      <div v-if="!selectedStore" class="empty-state">
        <h3>{{ $i('employees_selectStore') }}</h3>
        <p>{{ $i('employees_selectStoreDescription') }}</p>
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
    isPowerUser() {
      return !!(this.$store.state.currentUser && this.$store.state.currentUser.isPowerUser)
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

.page-xlink {
  color: #6b7280;
  margin: 8px 0 0;
  font-size: 14px;
}
.page-xlink a { color: #159f63; font-weight: 600; }

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
