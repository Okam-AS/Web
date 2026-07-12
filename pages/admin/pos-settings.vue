<template>
  <AdminPage @login-success="init">
    <div class="pos-settings">
      <div class="pos-settings__header">
        <h1 class="pos-settings__title">
          {{ $i('nav_pos_settings') }}
        </h1>
        <p class="pos-settings__intro">
          {{ $i('posset_intro') }}
        </p>
      </div>

      <transition name="pos-settings-toast">
        <div v-if="toast.show" class="pos-settings__toast" :class="'pos-settings__toast--' + toast.type">
          {{ toast.message }}
        </div>
      </transition>

      <div class="pos-settings__tabs">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="pos-settings__tab"
          :class="{ 'is-active': activeTab === t.key }"
          @click="activeTab = t.key"
        >
          {{ t.label }}
        </button>
      </div>

      <div v-if="!storeId" class="pos-settings__nostore">
        {{ $i('posset_select_store') }}
      </div>
      <component
        :is="activeComponent"
        v-else
        :key="activeTab + '-' + storeId"
        :store-id="storeId"
        @notify="notify"
      />
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue';
import CashPointsTab from '~/components/admin/pos-settings/CashPointsTab.vue';
import OperatorsTab from '~/components/admin/pos-settings/OperatorsTab.vue';
import PosDiscountsTab from '~/components/admin/pos-settings/PosDiscountsTab.vue';
import GoodsGroupsTab from '~/components/admin/pos-settings/GoodsGroupsTab.vue';
import AllergensTab from '~/components/admin/pos-settings/AllergensTab.vue';

// Power-user backoffice for the POS: cash points (incl. terminal provider), operators + PIN,
// discounts (managed in the shared discount catalogue), goods groups and allergens. Operates on
// the store selected in the nav.
export default {
  name: 'AdminPosSettings',
  components: { AdminPage, CashPointsTab, OperatorsTab, PosDiscountsTab, GoodsGroupsTab, AllergensTab },
  data () {
    return {
      activeTab: 'cashpoints',
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
    },
    tabs () {
      return [
        { key: 'cashpoints', label: this.$i('posset_tab_cashpoints') },
        { key: 'operators', label: this.$i('posset_tab_operators') },
        { key: 'discounts', label: this.$i('posset_tab_discounts') },
        { key: 'goods', label: this.$i('posset_tab_goods') },
        { key: 'allergens', label: this.$i('posset_tab_allergens') }
      ];
    },
    activeComponent () {
      return {
        cashpoints: 'CashPointsTab',
        operators: 'OperatorsTab',
        discounts: 'PosDiscountsTab',
        goods: 'GoodsGroupsTab',
        allergens: 'AllergensTab'
      }[this.activeTab];
    }
  },
  mounted () {
    this.init();
  },
  beforeDestroy () {
    if (this.toastTimer) { clearTimeout(this.toastTimer); }
  },
  methods: {
    init () {
      if (!this.$store.getters.userIsLoggedIn) { return; }
      if (!(this.$store.state.currentUser && this.$store.state.currentUser.isPowerUser)) {
        this.$router.push('/admin');
      }
    },
    notify (message, type = 'success') {
      this.toast = { show: true, message, type };
      if (this.toastTimer) { clearTimeout(this.toastTimer); }
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 4000);
    }
  }
};
</script>

<style scoped>
.pos-settings { max-width: 1100px; margin: 0 auto; padding: 24px; }
.pos-settings__header { margin-bottom: 18px; }
.pos-settings__title { font-size: 1.9rem; font-weight: 600; color: #292c34; margin: 0 0 6px; }
.pos-settings__intro { color: #64748b; margin: 0; }

.pos-settings__toast {
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
.pos-settings__toast--success { background: #159f63; }
.pos-settings__toast--error { background: #ef4444; }
.pos-settings-toast-enter-active, .pos-settings-toast-leave-active { transition: opacity 0.25s ease; }
.pos-settings-toast-enter, .pos-settings-toast-leave-to { opacity: 0; }

.pos-settings__tabs { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; margin-bottom: 20px; flex-wrap: wrap; }
.pos-settings__tab {
  border: none;
  background: none;
  padding: 10px 16px;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.pos-settings__tab.is-active { color: #159f63; border-bottom-color: #1bb776; }

.pos-settings__nostore { color: #94a3b8; text-align: center; padding: 40px 0; }
</style>
