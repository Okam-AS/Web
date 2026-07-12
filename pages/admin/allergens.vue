<template>
  <AdminPage>
    <div class="allergens-page">
      <div class="allergens-page__header">
        <h1>{{ $i('nav_allergens') }}</h1>
      </div>

      <transition name="allergens-toast">
        <div v-if="toast.show" class="allergens-page__toast" :class="'allergens-page__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <div v-if="!storeId" class="allergens-page__nostore">
        {{ $i('posset_select_store') }}
      </div>
      <AllergensManager
        v-else
        :key="storeId"
        :store-id="storeId"
        @notify="notify"
      />
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import AllergensManager from '~/components/admin/AllergensManager.vue';

// Allergen catalogue management. Allergens are a menu/product concern, so this lives in the Menu
// nav group next to Products; the register itself is store-scoped (StoreAdmin access).
export default {
  name: 'AdminAllergens',
  components: { AdminPage, AllergensManager },
  data () {
    return {
      toast: { show: false, message: '', type: 'success' },
      toastTimer: null
    };
  },
  computed: {
    storeId () {
      const selected = this.$store.state.selectedAdminStore;
      if (selected) { return selected; }
      const stores = (this.$store.state.currentUser && this.$store.state.currentUser.adminIn) || [];
      return stores.length ? stores[0].id : '';
    }
  },
  beforeDestroy () {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
  },
  methods: {
    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 4000);
    }
  }
};
</script>

<style scoped>
.allergens-page { max-width: 1100px; margin: 0 auto; padding: 24px; }
.allergens-page__header { margin-bottom: 18px; }
.allergens-page__header h1 { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.page-description { color: #64748b; margin: 0; }
.allergens-page__toast {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 12px 20px;
  border-radius: 10px;
  color: #fff;
  font-weight: 600;
  z-index: 1000;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}
.allergens-page__toast--success { background: #159f63; }
.allergens-page__toast--error { background: #ef4444; }
.allergens-toast-enter-active, .allergens-toast-leave-active { transition: opacity 0.25s ease; }
.allergens-toast-enter, .allergens-toast-leave-to { opacity: 0; }
.allergens-page__nostore { color: #94a3b8; text-align: center; padding: 40px 0; }
</style>
