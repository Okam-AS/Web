<template>
  <AdminPage>
    <div v-if="!userIsLoggedIn">
      <span>Du må logge inn for å forsette</span>
      <continue-button @click="showLogin = true">
        Logg inn
      </continue-button>
    </div>
    <div v-else class="qr-generator">
      <h1 class="title">
        Lag QR kode for din butikk
      </h1>
      <div class="form-container">
        <div class="form-group">
          <label class="form-label" for="selectStore">Velg butikk</label>
          <select id="selectStore" v-model="selectedStoreId" class="form-select">
            <option disabled value="0">
              Velg butikk
            </option>
            <option v-for="option in stores" :key="option.id" :value="option.id">
              {{ option.name }}
            </option>
          </select>
        </div>
      </div>

      <Loading :loading="isLoading" />

      <div v-if="generatedUrl" class="qr-result">
        <VueQrcode :value="generatedUrl" tag="img" :options="{ width: 350 }" />
        <p class="qr-url">
          Generert QR-kode url: <a :href="generatedUrl">{{ generatedUrl }}</a>
        </p>
      </div>
    </div>
    <LoginModal v-if="showLogin" @close="closeLoginModal" />
  </AdminPage>
</template>

<script>
import Loading from '~/components/atoms/Loading.vue'
import ContinueButton from '~/components/atoms/ContinueButton.vue'
import AdminPage from '~/components/organisms/AdminPage.vue'
import VueQrcode from '@chenfengyuan/vue-qrcode'
import LoginModal from '~/components/molecules/LoginModal.vue'

export default {
  components: { VueQrcode, AdminPage, ContinueButton, LoginModal, Loading },
  data: () => ({
    menuIsActive: false,
    isLoading: false,
    showModal: false,
    showLogin: false,
    selectedStoreId: 0
  }),
  computed: {
    userIsLoggedIn() {
      return this.$store.getters.userIsLoggedIn
    },
    selectedStore() {
      return this.selectedStoreId > 0
        ? this.stores.find(x => x.id === this.selectedStoreId)
        : {}
    },
    generatedUrl() {
      return this.selectedStore.id ? `https://shop.okam.no/shop?id=${this.selectedStoreId}` : ''
    },
    stores() {
      return this.$store.state.currentUser?.adminIn || []
    }
  },
  watch: {
    stores(newStores) {
      if (newStores.length > 0 && this.selectedStoreId === 0) {
        this.selectedStoreId = newStores[0].id
      }
    }
  },
  mounted() {
    if (!this.userIsLoggedIn) {
      this.showLogin = true
    } else if (this.stores.length > 0) {
      this.selectedStoreId = this.stores[0].id
    }
  },
  methods: {
    closeLoginModal() {
      this.showLogin = false
    },
    closeModal() {
      this.showModal = false
    }
  }
}
</script>
<style scoped>
.qr-generator {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
}

.title {
  font-size: 2rem;
  color: #2c3e50;
  margin-bottom: 2rem;
  text-align: center;
}

.form-container {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #4a5568;
}

.form-select,
.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.form-select:focus,
.form-input:focus {
  border-color: #4299e1;
  outline: none;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
}

.checkbox-container {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  cursor: pointer;
}

.checkbox-label {
  margin-left: 0.5rem;
  color: #4a5568;
}

.table-input {
  margin-top: 1rem;
  padding-left: 1.5rem;
}

.qr-result {
  margin-top: 2rem;
  text-align: center;
}

.qr-url {
  margin-top: 1rem;
  color: #4a5568;
}

.qr-url a {
  color: #4299e1;
  text-decoration: none;
}

.qr-url a:hover {
  text-decoration: underline;
}

.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>