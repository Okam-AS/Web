<template>
  <AdminPage>
    <div class="reward-members-page">
      <div class="page-header">
        <a href="/admin/rewards" class="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {{ $i('rewardMembers_backToRewards') }}
        </a>
        <h1>{{ $i('rewardMembers_title') }}</h1>
        <p class="page-description">{{ $i('rewardMembers_listUpdatedNightly') }}</p>
      </div>

      <div v-if="isLoading" class="loading-section">
        <Loading :loading="true" />
      </div>

      <template v-else>
        <div class="search-bar">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="search-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" />
          </svg>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="$i('rewardMembers_searchPlaceholder')"
            class="search-input"
          />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div v-if="filteredMembers.length === 0" class="empty-state">
          <div class="empty-state__icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3>{{ searchQuery ? $i('rewardMembers_noMatches') : $i('rewardMembers_noMembers') }}</h3>
          <p>{{ searchQuery ? $i('rewardMembers_noMembersMatch', { query: searchQuery }) : $i('rewardMembers_noMembersYet') }}</p>
        </div>

        <div v-else class="members-list">
          <div class="members-list__header">
            <span>{{ $i('rewardMembers_columnPhone') }}</span>
            <span>{{ $i('rewardMembers_columnBalance') }}</span>
          </div>
          <div
            v-for="member in filteredMembers"
            :key="member.userId || member.userPhoneNumber"
            class="member-item"
          >
            <span class="member-phone">{{ member.userPhoneNumber }}</span>
            <span class="member-balance">{{ formatBalance(member.balance) }}</span>
          </div>
        </div>

        <div v-if="allMembers.length > 0" class="members-count-footer">
          {{ $i('rewardMembers_showingCount', { shown: filteredMembers.length, total: allMembers.length }) }}
        </div>
      </template>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from '~/components/organisms/AdminPage.vue'
import Loading from '~/components/atoms/Loading.vue'

export default {
  name: 'RewardMembers',
  components: { AdminPage, Loading },
  data() {
    return {
      isLoading: false,
      allMembers: [],
      searchQuery: '',
    }
  },
  computed: {
    selectedStore() {
      return this.$store.state.selectedAdminStore
    },
    userIsLoggedIn() {
      return this.$store.getters.userIsLoggedIn
    },
    filteredMembers() {
      if (!this.searchQuery) return this.allMembers
      const q = this.searchQuery.toLowerCase()
      return this.allMembers.filter(m => (m.userPhoneNumber || '').toLowerCase().includes(q))
    },
  },
  watch: {
    selectedStore: {
      immediate: true,
      handler(storeId) {
        if (this.userIsLoggedIn && storeId) this.loadMembers(storeId)
      },
    },
    userIsLoggedIn: {
      immediate: true,
      handler(isLoggedIn) {
        if (isLoggedIn && this.selectedStore) this.loadMembers(this.selectedStore)
      },
    },
  },
  methods: {
    async loadMembers(storeId) {
      this.isLoading = true
      try {
        this.allMembers = await this._rewardService.GetMembers(storeId || this.selectedStore) || []
      } catch (e) {
        this.allMembers = []
      } finally {
        this.isLoading = false
      }
    },
    formatBalance(balance) {
      if (balance == null) return '0 kr'
      return `${(balance / 100).toFixed(2).replace('.', ',')} kr`
    },
  },
}
</script>

<style scoped>
.reward-members-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #6b7280;
  font-size: 14px;
  text-decoration: none;
  margin-bottom: 8px;
}

.back-link:hover { color: #292c34; }
.back-link svg { width: 16px; height: 16px; }

.page-header h1 {
  font-size: 28px;
  font-weight: 700;
  color: #292c34;
  margin: 0 0 4px;
}

.page-description {
  color: #9ca3af;
  margin: 0 0 24px;
  font-size: 13px;
}

.loading-section {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.search-bar {
  position: relative;
  margin-bottom: 20px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 10px 40px 10px 40px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  color: #292c34;
  background: white;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.search-input:focus {
  outline: none;
  border-color: #1bb776;
}

.search-clear {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  cursor: pointer;
  color: #9ca3af;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.search-clear svg { width: 16px; height: 16px; }

.empty-state {
  text-align: center;
  padding: 60px 24px;
}

.empty-state__icon {
  width: 56px;
  height: 56px;
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
  font-size: 14px;
  color: #9ca3af;
  margin: 0;
}

.members-list {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.members-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #f3f4f6;
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.member-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}

.member-item:last-child { border-bottom: none; }
.member-item:hover { background: #f9fafb; }

.member-phone {
  font-size: 14px;
  color: #292c34;
  font-weight: 500;
}

.member-balance {
  font-size: 14px;
  font-weight: 700;
  color: #1bb776;
}

.members-count-footer {
  text-align: center;
  font-size: 13px;
  color: #9ca3af;
  padding: 16px;
}

@media (max-width: 640px) {
  .reward-members-page { padding: 16px; }
}
</style>
