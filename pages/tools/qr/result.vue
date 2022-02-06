<template>
  <div :class="{ container: true, convertapi: convertApi }">
    <div class="pdfpage">
      <SimpleA3
        class="half-size float-left"
        :store="store"
        :qr-value="generatedUrl"
      />
      <SimpleA3
        class="half-size float-left"
        :store="store"
        :qr-value="generatedUrl"
      />
      <SimpleA3
        class="half-size float-left"
        :store="store"
        :qr-value="generatedUrl"
      />
      <SimpleA3
        class="half-size float-left"
        :store="store"
        :qr-value="generatedUrl"
      />
    </div>
    <div class="pdfpage">
      <SimpleA3
        class="half-size float-left"
        :store="store"
        :qr-value="generatedUrl"
      />
      <SimpleA3
        class="half-size float-left"
        :store="store"
        :qr-value="generatedUrl"
      />
      <SimpleA3
        class="half-size float-left"
        :store="store"
        :qr-value="generatedUrl"
      />
      <SimpleA3
        class="half-size float-left"
        :store="store"
        :qr-value="generatedUrl"
      />
    </div>
  </div>
</template>

<script>
// import Loading from '@/components/atoms/Loading.vue'
import SimpleA3 from '@/pages/tools/qr/cards/simple-A3.vue'

export default {
  components: { SimpleA3 },
  data: () => ({
    isLoading: false,
    storeId: undefined,
    store: {},
    tableNumberFrom: undefined,
    tableNumberTo: undefined,
    convertApi: false,
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
      this.convertApi = search.has('convertapi')
        ? search.get('convertapi')
        : false
    }
  }
}
</script>
<style scoped>
.container {
  background: rgb(204, 204, 204);
}
.pdfpage {
  background: white;
  width: 21cm;
  height: 29.7cm;
  display: block;
  margin: 0 auto 0.5cm;
  box-shadow: 0 0 0.5cm rgba(0, 0, 0, 0.5);
}
.half-size {
  width: 50%;
  height: 50%;
}
.float-left {
  float: left;
}
@media print {
  .container,
  .pdfpage {
    margin: 0;
    box-shadow: none;
  }
}
.convertapi.container,
.convertapi .pdfpage {
  margin: 0;
  box-shadow: none;
  background: white;
}
</style>