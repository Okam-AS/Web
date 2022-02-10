<template>
  <div class="container">
    <div v-for="(cards, index) in cardGroups" :key="index" class="pdfpage">
      <SimpleA3
        v-for="(tableNumber, xindex) in cards"
        :key="xindex"
        class="half-size"
        :store="store"
        :card-text="cardText"
        :table-name="tableNumber + ''"
        :qr-value="generatedUrl + '&table=' + tableNumber"
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
    cardText: '',
    tableNumbers: [],
    cardGroups: []
  }),
  computed: {
    generatedUrl () {
      return this.storeId
        ? 'https://www.okam.no/webshop/?store=' + this.storeId
        : ''
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
      this.cardText = search.has('text') ? decodeURI(search.get('text')) : ''
    }
    if (
      this.tableNumberFrom &&
      this.tableNumberTo &&
      typeof this.tableNumberFrom === 'number' &&
      typeof this.tableNumberTo === 'number' &&
      this.tableNumberFrom <= this.tableNumberTo
    ) {
      for (let y = this.tableNumberFrom; y <= this.tableNumberTo; y++) {
        this.tableNumbers.push(y)
      }
    }

    for (let i = 0, j = this.tableNumbers.length; i < j; i += 4) {
      this.cardGroups.push(this.tableNumbers.slice(i, i + 4))
    }

    if (this.cardGroups.length === 0) {
      this.cardGroups.push(['']) // Add empty tablename
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  margin: 0 auto 0.5cm;
  box-shadow: 0 0 0.5cm rgba(0, 0, 0, 0.5);
}

@media print {
  .container,
  .pdfpage {
    margin: 0;
    box-shadow: none;
    background: white;
  }
}
</style>