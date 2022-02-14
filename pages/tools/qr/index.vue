<template>
  <div class="admin">
    <header class="admin__header">
      <div class="admin__header-nav">
        <div class="admin__wrapper">
          <div class="admin__header-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 836.826 175.846"><path d="M330.7,154.371a14.251,14.251,0,0,1-7.139,18.849,29.732,29.732,0,0,1-33.265-6.11l-65.674-65.843V157a18.613,18.613,0,1,1-37.225,0V23.4a18.613,18.613,0,1,1,37.225,0V79.136L290.14,13.453A29.732,29.732,0,0,1,323.4,7.343a14.253,14.253,0,0,1,4.259,23.036L268.263,90.2l59.56,59.983A14.247,14.247,0,0,1,330.7,154.371ZM169.105,90.04c0,47.261-37.855,85.573-84.552,85.573S0,137.3,0,90.04,37.856,4.467,84.553,4.467,169.105,42.779,169.105,90.04Zm-37.225,0c0-26.453-21.189-47.9-47.327-47.9S37.225,63.587,37.225,90.04s21.19,47.9,47.328,47.9S131.88,116.494,131.88,90.04ZM469.931,19.111A29.388,29.388,0,0,0,442.4,0a12.769,12.769,0,0,1-3.8,0,29.388,29.388,0,0,0-27.532,19.111L361.058,153.09A14.012,14.012,0,0,0,374.184,172a29.147,29.147,0,0,0,27.284-18.894L440.5,49.233l39.032,103.873A29.147,29.147,0,0,0,506.816,172a14.012,14.012,0,0,0,13.126-18.91ZM835.942,153.09,785.931,19.111A29.388,29.388,0,0,0,758.4,0c-.3,0-.6.027-.9.045-.3-.018-.6-.045-.9-.045a29.388,29.388,0,0,0-27.532,19.111L691.5,119.759,653.931,19.111A29.388,29.388,0,0,0,626.4,0c-.472,0-.939.025-1.4.071C624.54.025,624.073,0,623.6,0a29.388,29.388,0,0,0-27.532,19.111L546.058,153.09A14.012,14.012,0,0,0,559.184,172a29.147,29.147,0,0,0,27.284-18.894L625,50.563l38.532,102.543A29.147,29.147,0,0,0,690.816,172c.231,0,.456-.023.684-.035.228.012.453.035.684.035a29.147,29.147,0,0,0,27.284-18.894L757.5,51.894l38.032,101.212A29.147,29.147,0,0,0,822.816,172a14.012,14.012,0,0,0,13.126-18.91Z" /></svg>
          </div>
          <div class="admin__header-menu">
            <button class="admin__header-menu-trigger" type="button" aria-label="Meny" :aria-expanded="menuIsActive" @click="menuIsActive = !menuIsActive">
              <span />
            </button>
            <div :class="{'admin__header-panel' : true, 'is-active': menuIsActive}">
              <div class="admin__wrapper">
                <ul class="admin__header-menu-list">
                  <li><a href="#">Bordkort med QR-koder</a></li>
                  <li><a href="#">Språk</a></li>
                  <li><a href="#">Import</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
    <main class="admin__content admin__wrapper">
      <div v-if="!userIsLoggedIn">
        <span>Du må logge inn for å forsette</span>
        <continue-button @click="showLogin = true">
          Logg inn
        </continue-button>
      </div>
      <div v-else>
        <h1>Lag QR kode for din butikk</h1>
        <div class="form">
          <div class="form-row">
            <label class="label" for="selectStore">Velg butikk</label>
            <select id="selectStore" v-model="selectedStoreId" class="input">
              <option disabled value="0">
                Velg butikk
              </option>
              <option v-for="option in stores" :key="option.id" :value="option.id">
                {{ option.name }}
              </option>
            </select>
          </div>
          <fieldset class="form-row">
            <label class="checkbox">
              <input v-model="includeTableNumbers" type="checkbox">
              <span>Ta med bordnummer i QR kode</span>
            </label>
            <fieldset v-if="includeTableNumbers" class="form-items">
              <div>
                <label class="label" for="fromTable">Fra</label>
                <input 
                  id="fromTable"
                  v-model="fromTableNumber"
                  class="input"
                  type="number"
                  min="0"
                  max="100"
                >
              </div>
              <div>
                <label class="label" for="toTable">Til</label>
                <input 
                  id="toTable"
                  v-model="toTableNumber"
                  class="input"
                  type="number"
                  min="0"
                  max="100"
                >
              </div>
            </fieldset>
          </fieldset>
          <div class="form-row">
            <label class="label" for="cardText">Tekst på kort</label>
            <textarea v-model="cardText" class="input" maxlength="80" rows="3" />
          </div>
        </div>
        <div v-if="resultUrl">
          <div class="btn-row btn-row--margin-bottom">
            <continue-button
              :class="{ disabled: isLoading }"
              @click="generateQRCodes"
            >
              Last ned QR koder
            </continue-button>
            <a :href="resultUrl" :class="{ disabled: isLoading }" target="_blank">Forhåndsvis</a>
          </div>
          <div>Note til utvikler: "Last ned QR kode" knappen generer bare det som ligger i prod</div>
        </div>

        <div v-if="generatedUrl">
          <VueQrcode :value="generatedUrl" tag="svg" :options="{ width: 148 }" />
        </div>
        <Loading :loading="isLoading" />
      </div>
      <LoginModal v-if="showLogin" @close="closeLoginModal" />
    </main>
    <footer class="admin__footer">
      <div class="admin__wrapper">
        Footer
      </div>
    </footer>
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
    menuIsActive: false,
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