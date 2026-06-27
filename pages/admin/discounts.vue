<template>
  <AdminPage @login-success="loadDiscounts">
    <div class="discounts-page">
      <div class="page-header">
        <div class="page-header__left">
          <h1>Rabatter</h1>
          <p class="page-description">Opprett og administrer rabatter og kampanjekoder</p>
        </div>
        <button class="btn btn-primary" @click="createDiscount">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="btn-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Opprett rabatt
        </button>
      </div>

      <div v-if="isLoading" class="loading-section">
        <Loading :loading="true" />
      </div>

      <div v-else-if="!selectedStore" class="empty-state">
        <div class="empty-state__icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h3>Velg en butikk</h3>
        <p>Velg en butikk for å se og administrere rabatter.</p>
      </div>

      <div v-else-if="discounts.length === 0" class="empty-state">
        <div class="empty-state__icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <h3>Ingen rabatter</h3>
        <p>Det finnes ingen rabatter for denne butikken ennå.</p>
        <button class="btn btn-primary" @click="createDiscount">Opprett første rabatt</button>
      </div>

      <div v-else class="discounts-list">
        <div
          v-for="discount in discounts"
          :key="discount.id"
          class="discount-item"
          :class="{ 'discount-item--expired': discount.expired || discount.isUnavailable }"
          @click="editDiscount(discount)"
        >
          <div class="discount-item__main">
            <div class="discount-item__info">
              <span class="discount-item__label" :class="{ 'discount-item__label--expired': discount.expired }">
                {{ discount.label }}
              </span>
              <span v-if="discount.code" class="discount-item__code">{{ discount.code }}</span>
            </div>
            <div class="discount-item__meta">
              <span v-if="discount.expired" class="badge badge--expired">Utløpt</span>
              <span v-else-if="discount.isUnavailable" class="badge badge--unavailable">Utilgjengelig</span>
            </div>
          </div>
          <div class="discount-item__amount">
            <span :class="{ 'text-strikethrough': discount.expired }">
              {{ formatDiscountAmount(discount) }}
            </span>
          </div>
          <div class="discount-item__arrow">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import Loading from '~/components/atoms/Loading.vue'

export default {
  name: 'Discounts',
  components: { AdminPage, Loading },
  data() {
    return {
      isLoading: false,
      discounts: [],
    }
  },
  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore
    },
  },
  watch: {
    selectedStore: {
      immediate: true,
      handler(storeId) {
        if (storeId) this.loadDiscounts(storeId)
      },
    },
  },
  methods: {
    async loadDiscounts(storeId) {
      this.isLoading = true
      try {
        this.discounts = await this._discountService.Get(storeId || this.selectedStore)
      } catch (e) {
        this.discounts = []
      } finally {
        this.isLoading = false
      }
    },
    createDiscount() {
      this.$router.push('/admin/discount?id=new')
    },
    editDiscount(discount) {
      this.$router.push(`/admin/discount?id=${discount.id}`)
    },
    formatDiscountAmount(discount) {
      if (discount.type === 'Percent') {
        return `${discount.discount}%`
      }
      return `${discount.discount} kr`
    },
  },
}
</script>

<style scoped>
.discounts-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 16px;
  flex-wrap: wrap;
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

.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: opacity 0.2s;
  white-space: nowrap;
}

.btn:hover { opacity: 0.9; }

.btn-primary {
  background: linear-gradient(135deg, #1bb776, #159f63);
  color: white;
}

.btn-icon {
  width: 16px;
  height: 16px;
}

.loading-section {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.empty-state {
  text-align: center;
  padding: 60px 24px;
  color: #6b7280;
}

.empty-state__icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 16px;
  color: #d1d5db;
}

.empty-state__icon svg { width: 100%; height: 100%; }

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 8px;
}

.empty-state p {
  margin: 0 0 24px;
  font-size: 14px;
}

.discounts-list {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.discount-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}

.discount-item:last-child { border-bottom: none; }
.discount-item:hover { background: #f9fafb; }
.discount-item--expired { opacity: 0.6; }

.discount-item__main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.discount-item__info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.discount-item__label {
  font-weight: 600;
  color: #292c34;
  font-size: 15px;
}

.discount-item__label--expired {
  text-decoration: line-through;
  color: #9ca3af;
}

.discount-item__code {
  background: #f3f4f6;
  color: #6b7280;
  font-size: 12px;
  font-family: monospace;
  padding: 2px 8px;
  border-radius: 4px;
}

.badge {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge--expired { background: #fee2e2; color: #dc2626; }
.badge--unavailable { background: #fef3c7; color: #d97706; }

.discount-item__amount {
  font-weight: 700;
  color: #1bb776;
  font-size: 15px;
  white-space: nowrap;
}

.text-strikethrough { text-decoration: line-through; color: #9ca3af; }

.discount-item__arrow {
  width: 20px;
  height: 20px;
  color: #d1d5db;
  flex-shrink: 0;
}

.discount-item__arrow svg { width: 100%; height: 100%; }

@media (max-width: 640px) {
  .discounts-page { padding: 16px; }
  .page-header { flex-direction: column; align-items: stretch; }
  .btn-primary { justify-content: center; }
}
</style>
