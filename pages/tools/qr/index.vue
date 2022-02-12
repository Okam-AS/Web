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
          <option v-for="option in stores" :key="option.id" :value="option.id">
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
          <span>Tekst på kort</span>
        </div>
        <div>
          <textarea v-model="cardText" maxlength="80" rows="3" />
        </div>
      </div>
      <div v-if="resultUrl" style="clear: both">
        <a :href="resultUrl" :class="{ disabled: isLoading }" target="_blank">Forhåndsvis</a>

        </continue-button>
        <continue-button
          :class="{ disabled: isLoading }"
          @click="generateQRCodes"
        >
          Last ned QR koder
        </continue-button>
        <span>Note til utvikler: "Last ned QR kode" knappen generer bare det som
          ligger i prod</span>
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
    stores: [],
    cardText: 'Skann QR-koden med kamera og bestill til bordet'
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
            '&text=' +
            encodeURI(this.cardText) +
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
      const convertApiKey = 'KOuoWvNa8USrmH8S'
      const convertUrl =
        'https://v2.convertapi.com/convert/web/to/pdf?Secret=' +
        convertApiKey +
        '&StoreFile=true&CssMediaType=print&PageSize=a4&MarginTop=0&MarginRight=0&MarginBottom=0&MarginLeft=0&Url=' +
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
    }
  }
}
</script>
<style>
.disabled {
  opacity: 0.5;
}
</style>