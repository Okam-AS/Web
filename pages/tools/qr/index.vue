<template>
  <div class="container">
    <div v-if="!userIsLoggedIn">
      <span>Du må logge inn for å forsette</span>
      <continue-button @click="showLogin = true">
        Logg inn
      </continue-button>
    </div>
    <div v-else>
      <h1>Lag QR kode for din butikk</h1>
      <div>
        <span>Velg butikk</span>
        <select v-model="selectedStoreId">
          <option disabled value="0">
            Velg butikk
          </option>
          <option
            v-for="option in $store.state.currentUser.adminIn"
            :key="option.id"
            :value="option.id"
          >
            {{ option.name }}
          </option>
        </select>
      </div>
      <div>
        <label>
          <input v-model="includeTableNumbers" type="checkbox">
          <span>Ta med bordnummer i QR kode</span>
        </label>
        <div v-if="includeTableNumbers">
          <label>
            <span>Fra</span>
            <input v-model="fromTableNumber" type="number" min="0" max="100">
          </label>
          <label>
            <span>Til</span>
            <input v-model="toTableNumber" type="number" min="0" max="100">
          </label>
        </div>
      </div>
      <div>
        <div>
          <span>Velg design</span>
        </div>
        <div
          :class="{
            'thumbnail-design': true,
            selected: selectedDesign === 'simple',
          }"
          @click="selectedDesign = 'simple'"
        >
          <div><span>*Liten thumbnail av design*</span></div>
          <span>Størrelse: A3</span>
        </div>
        <div
          :class="{
            'thumbnail-design': true,
            selected: selectedDesign === 'bigger',
          }"
          @click="selectedDesign = 'bigger'"
        >
          <div><span>*Liten thumbnail av design*</span></div>
          <span>Størrelse: A4</span>
        </div>
      </div>
      <div style="clear: both">
        <continue-button
          :class="{ disabled: isLoading }"
          @click="goToQRCodePage"
        >
          Forhåndsvis
        </continue-button>
        <continue-button
          :class="{ disabled: isLoading }"
          @click="generateQRCodes"
        >
          Last ned QR koder
        </continue-button>
      </div>

      <div v-if="generatedUrl">
        <VueQrcode :value="generatedUrl" tag="svg" :options="{ width: 148 }" />
      </div>
      <Loading :loading="isLoading" />
    </div>
    <LoginModal v-if="showLogin" @close="closeLoginModal" />
  </div>
</template>

<script>
import Loading from '@/components/atoms/Loading.vue'
import ContinueButton from '@/components/atoms/ContinueButton.vue'
import VueQrcode from '@chenfengyuan/vue-qrcode'
// import Modal from '~/components/atoms/Modal.vue'
import LoginModal from '~/components/molecules/LoginModal.vue'

export default {
  components: { ContinueButton, LoginModal, VueQrcode, Loading },
  data: () => ({
    isLoading: false,
    showModal: false,
    showLogin: false,
    includeTableNumbers: false,
    fromTableNumber: 0,
    toTableNumber: 0,
    selectedStoreId: 0,
    selectedDesign: 'simple',
    stores: []
  }),
  computed: {
    userIsLoggedIn () {
      return this.$store.getters.userIsLoggedIn
    },
    selectedStore () {
      return this.selectedStoreId > 0
        ? this.stores.find(x => x.id === this.selectedStoreId)
        : {}
    },
    generatedUrl () {
      return this.selectedStore.id
        ? 'https://www.okam.no/webshop/?store=' + this.selectedStoreId
        : ''
    },
    resultUrl () {
      let tableInfo = ''
      if (this.includeTableNumbers) {
        tableInfo = '&f=' + this.fromTableNumber + '&t=' + this.toTableNumber
      }
      return this.selectedStore.id
        ? '/tools/qr/result/?store=' +
            this.selectedStoreId +
            '&design=' +
            this.selectedDesign +
            tableInfo
        : ''
    }
  },
  mounted () {
    if (!this.userIsLoggedIn) {
      this.showLogin = true
      return
    }
    this._storeService.GetAll().then((res) => {
      this.stores = res
    })
  },
  methods: {
    closeLoginModal () {
      this.showLogin = false
    },
    closeModal () {
      this.showModal = false
    },
    generateQRCodes () {
      if (this.isLoading) {
        return
      }
      this.isLoading = true
      const convertUrl =
        'https://v2.convertapi.com/convert/web/to/pdf?Secret=ZEs18uk4oGyNR3O3&StoreFile=true&Url=' +
        'https://www.okam.no' +
        this.resultUrl
      fetch(convertUrl)
        .then((res) => {
          res
            .json()
            .then((response) => {
              if (
                response &&
                Array.isArray(response.Files) &&
                response.Files[0]
              ) {
                window.location.href = response.Files[0].Url
              }
            })
            .finally(() => {
              this.isLoading = false
            })
        })
        .finally(() => {
          this.isLoading = false
        })
    },
    goToQRCodePage () {
      if (this.isLoading) {
        return
      }
      window.location.href = this.resultUrl
    }
  }
}
</script>
<style>
.thumbnail-design {
  border: 1px solid black;
  padding: 10px;
  float: left;
}
.thumbnail-design.selected {
  border: 2px solid green;
}
.disabled {
  opacity: 0.5;
}
</style>