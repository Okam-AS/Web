<template>
  <div ref="container">
    <p>Checkout</p>
  </div>
</template>

<script>
import { StoreService, CartService } from '@/core/services'
// import ProductConfig from '../../components/webshop/ProductConfig.vue'

export default {
  // components: { ProductConfig },
  data: () => ({
    storeService: null,
    cartService: null,
    storeId: null,
    store: {},
    timer: ''
  }),
  mounted () {
    this.init()
    this.timer = setInterval(this.iframeHeightNotify, 300)
  },
  beforeDestroy () {
    clearInterval(this.timer)
  },
  methods: {
    iframeHeightNotify () {
      const search = new URLSearchParams(window.location.search) || {}
      const parentUrl = (search.get('parent') || '')
      if (parentUrl) {
        window.parent.postMessage({
          height: this.$refs.container.scrollHeight
        }, parentUrl)
      }
    },
    wholeAmount (amount) {
      if (!amount) { return '0' }
      const wholeAmount = amount.toString().slice(0, -2)
      return wholeAmount ? wholeAmount.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : '0'
    },
    fractionAmount (amount) {
      if (!amount) { return '00' }
      const fractionAmount = amount.toString().slice(-2)
      return fractionAmount.length < 2 ? '00' : fractionAmount
    },
    priceLabel (totalPrice, hideFractionIfZero) {
      return (
        'kr ' + this.wholeAmount(totalPrice) + ((!hideFractionIfZero || parseInt(this.fractionAmount(totalPrice)) > 0)
          ? ',' + this.fractionAmount(totalPrice)
          : '')
      )
    },
    init () {
      this.$store.dispatch('load')
      this.$store.subscribe((mutation, state) => {
        if (mutation && window && window.localStorage) {
          localStorage.setItem('state', JSON.stringify(state))
        }
      })

      const search = new URLSearchParams(window.location.search) || {}
      const storeId = search.get('store') || false
      const nolayout = search.has('nolayout') || false

      if (storeId) {
        this.storeId = parseInt(storeId)
        this.storeServive = new StoreService()
        this.cartService = new CartService()
        this.getStore()
      }

      if (nolayout && window && window.Tawk_API) {
        window.Tawk_API.onLoad = () => {
          window.Tawk_API.hideWidget()
        }
      }
    },
    getStore () {
      this.storeServive.get(this.storeId).then((res) => {
        this.store = res
      })
    }
  }
}
</script>