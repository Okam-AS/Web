<template>
  <div class="container">
    <img :src="store.logoUrl">
    <div v-if="generatedUrl">
      <VueQrcode
        v-for="(x, index) in 40"
        :key="index"
        :value="generatedUrl"
        tag="svg"
        :options="{ width: 150 }"
      />
      <pre>
        {{ logData }}
      </pre>
    </div>
  </div>
</template>

<script>
// import Loading from '@/components/atoms/Loading.vue'
import VueQrcode from '@chenfengyuan/vue-qrcode'

export default {
  components: { VueQrcode },
  data: () => ({
    isLoading: false,
    storeId: undefined,
    store: {},
    tableNumberFrom: undefined,
    tableNumberTo: undefined,
    design: ''
  }),
  computed: {
    generatedUrl () {
      return this.storeId
        ? 'https://www.okam.no/webshop/?store=' + this.storeId
        : ''
    },
    logData () {
      return {
        design: this.design,
        tableNumberFrom: this.tableNumberFrom,
        tableNumberTo: this.tableNumberTo
      }
    }
  },
  mounted () {
    if (this.storeId) {
      this._storeService.Get(this.storeId).then((res) => {
        this.store = res
      })
    }
    if (window && window.location) {
      const search = new URLSearchParams(window.location.search) || {}
      this.tableNumberFrom =
        search.get('f') || false ? parseInt(search.get('f')) : undefined
      this.tableNumberTo =
        search.get('t') || false ? parseInt(search.get('t')) : undefined
      this.design = search.has('design') ? search.get('design') : undefined
    }
  }
}
</script>