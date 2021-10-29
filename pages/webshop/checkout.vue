<template>
  <div ref="container">
    <p>Checkout</p>
    <Login @loggedIn="loggedIn" />
    <client-only>
      <stripe-element-card
        :pk="stripePKey"
        :hide-postal-code="true"
        :elements-options="{ locale: 'nb' }"
      />
    </client-only>
    <div>
      <pre>{{ cards }}</pre>
    </div>
  </div>
</template>

<script>
import { StoreService, CartService, StripeService } from '@/core/services'

// import ProductConfig from '../../components/webshop/ProductConfig.vue'

export default {
  data: () => ({
    stripePKey: 'pk_test_51H4qD7LNNQ2fMCqGKVqDxFBnljHO1QyXuLSQ8BTvltvx9jKXGSw78WuX01i9miBj9hzh5L8AS9aiIXF9qUDq5kKH005deCclVN',
    storeService: null,
    cartService: null,
    storeId: null,
    store: {},
    timer: '',

    isSending: false,
    errorMessage: '',
    deliveryAddressError: false,
    tableNameError: false,

    localDeliveryType: 'NotSet',
    localComment: '',
    localTableName: '',
    localTipPercent: 0,

    // DELIVERY METHOD
    deliveryMethodError: false,

    // CREDITCARD DATA
    stripeService: {},
    cards: [],
    selectedPaymentMethodId: '',
    rememberCard: true,
    isLoadingCards: true,
    creditCardError: false,

    cardNumber: '',
    expMonth: '',
    expYear: '',
    cvc: ''
  }),
  computed: {
    cartIsEmpty () {
      return !this.storeCart || (this.storeCart.items || []).length <= 0
    },
    cartItems () {
      return this.cartIsEmpty ? [] : this.storeCart.items
    },
    storeCart () {
      return this.$store.getters.cartByStoreId(this.store.id)
    },
    totalQuantityLabel () {
      const totalQuantity = this.cartItems
        .map(item => item.quantity)
        .reduce((a, b) => a + b, 0)
      return totalQuantity + (totalQuantity === 1 ? ' vare' : ' varer')
    },
    commentHint () {
      if (this.localDeliveryType === 'SelfPickup') { return 'Ønsker du å hente bestillingen på et senere tidspunkt eller har en annen beskjed til den som behandler din bestilling, kan du skrive den inn her.' }
      if (this.localDeliveryType === 'InstantHomeDelivery') { return 'Ønsker du å få bestillingen levert på et senere tidspunkt, har en beskjed til sjåføren eller den som behandler din bestilling, kan du skrive den inn her.' }

      return 'Har du en beskjed til den som behandler din bestilling, kan du skrive den inn her'
    },
    isLoading () {
      return (
        this.isSending || this.$store.state.cartIsLoading || this.isLoadingCards
      )
    }
  },
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
        this.stripeService = new StripeService()
        this.getStore()
        this.getRegisteredCards()
      }

      if (nolayout && window && window.Tawk_API) {
        window.Tawk_API.onLoad = () => {
          window.Tawk_API.hideWidget()
        }
      }

      // Checkout
      const comp = this
      comp.localDeliveryType = 'NotSet'

      // comp.localTableName = JSON.parse(JSON.stringify(comp.storeCart.tableName))
      // comp.localComment =
      // comp.storeCart.comment === 'Ingen kommentar'
      //   ? ''
      //   : JSON.parse(JSON.stringify(comp.storeCart.comment))
    },
    getStore () {
      this.storeServive.get(this.storeId).then((res) => {
        this.store = res
      })
    },
    loggedIn () {
      this.$store.dispatch('UpdateCartInDbAndSetState', this.storeId)
    },
    getRegisteredCards () {
      const comp = this
      comp.stripeService
        .getPaymentMethods(comp.storeId)
        .then((result) => {
          if (Array.isArray(result)) { comp.cards = result }
          comp.isLoadingCards = false
          // comp.setPaymentMethodId(
          //   comp.cards.length > 0 ? comp.cards[0].id : ''
          // )
        })
        .catch(() => {
          comp.isLoadingCards = false
        })
    }
  }
}
</script>