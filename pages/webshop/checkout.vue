<template>
  <div ref="container">
    <p>Checkout</p>
    <Login @loggedIn="loggedIn" />
    <div>
      <span class="material-icons">shopping_cart</span>
      <span class="material-icons">credit_card</span>

      <span style="font-weight:bold;">Leveringsmetoder</span>

      <div v-if="store.selfPickUp" @click="setLocalDeliveryType('SelfPickup')">
        <span v-show="localDeliveryType === 'SelfPickup'">✓</span><span>Hent selv</span>
      </div>

      <div
        v-if="store.homeDeliveryMethods && store.homeDeliveryMethods.length > 0"
        @click="
          storeCart.calculations.itemsAmount >=
            store.minimumOrderPriceForHomeDelivery
            ? setLocalDeliveryType('InstantHomeDelivery')
            : false
        "
      >
        <span v-show="localDeliveryType === 'InstantHomeDelivery'">✓</span><span>Hjemlevering</span>
        <span
          v-if="
            store.minimumOrderPriceForHomeDelivery > 0 &&
              storeCart.calculations.itemsAmount <
              store.minimumOrderPriceForHomeDelivery
          "
        >{{ 'Min. bestilling: ' + priceLabel(store.minimumOrderPriceForHomeDelivery) }}</span>
      </div>

      <div v-if="store.tableDelivery" @click="setLocalDeliveryType('TableDelivery')">
        <span v-if="localDeliveryType === 'TableDelivery'">✓</span><span>Spis inne</span>
      </div>

      <client-only>
        <stripe-element-card
          ref="cardElement"
          :pk="stripePKey"
          :hide-postal-code="true"
          :elements-options="{ locale: 'nb' }"
        />
      </client-only>
      <input type="button" value="OK" @click="submit">

      <div>
        <span style="font-weight:bold;">Betalingsmetoder</span>
        <pre>{{ cards }}</pre>
      </div>
    </div>
  </div>
</template>

<script type="ts">
// import ProductConfig from '../../components/webshop/ProductConfig.vue'

export default {
  data: () => ({
    stripePKey: 'pk_test_51H4qD7LNNQ2fMCqGKVqDxFBnljHO1QyXuLSQ8BTvltvx9jKXGSw78WuX01i9miBj9hzh5L8AS9aiIXF9qUDq5kKH005deCclVN',
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
    cards: [],
    selectedPaymentMethodId: '',
    rememberCard: true,
    isLoadingCards: true,
    creditCardError: false
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
    async submit () {
      const comp = this
      try {
        const paymentMethod = await comp.$refs.cardElement.stripe.createPaymentMethod({
          type: 'card',
          card: comp.$refs.cardElement.element
        })
        // comp.createPaymentIntent(paymentMethod.id, comp.rememberCard)
        window.console.table(paymentMethod)
      } catch (error) {
        comp.isSending = false
        comp.errorMessage =
                   'Betalingen kunne ikke gjennomføres. Kontroller kortinformasjon og prøv igjen.'
      }
    },
    setTip (tipPercent) {
      if (this.isLoading) { return }
      this.localTipPercent = tipPercent
      this.updateCart()
    },
    setPaymentMethodId (id) {
      if (this.isLoading) { return }
      this.selectedPaymentMethodId = id
      this.updateCart()
    },
    setLocalDeliveryType (value) {
      // if (this.isLoading) { return }
      this.clearErrors()
      this.localDeliveryType = value
      this.updateCart()
    },
    updateCart () {
      if (!this.storeId) { return }
      this._cartService.SetCartRootProperties({
        storeId: this.storeId,
        isWaiterOrder: this.selectedPaymentMethodId === 'waiter',
        deliveryType: this.localDeliveryType,
        fullAddress: this.$store.state.currentUser.address
          ? this.$store.state.currentUser.address.fullAddress
          : '',
        zipCode: this.$store.state.currentUser.address
          ? this.$store.state.currentUser.address.zipCode
          : '',
        city: this.$store.state.currentUser.address
          ? this.$store.state.currentUser.address.city
          : '',
        comment: this.localComment ? this.localComment : 'Ingen kommentar',
        tipPercent: this.localTipPercent,
        tableName: this.localTableName
      })
    },
    clearErrors () {
      this.errorMessage = ''
      this.deliveryMethodError = false
      this.deliveryAddressError = false
      this.tableNameError = false
      this.creditCardError = false
    },
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
      this.$store.dispatch('Load')
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
      if (comp.storeCart) {
        comp.localTableName = comp.storeCart.tableName === undefined ? '' : comp.storeCart.tableName + ''
        comp.localComment = comp.storeCart.comment === undefined || comp.storeCart.comment === 'Ingen kommentar' ? '' : comp.storeCart.comment + ''
      }
    },
    getStore () {
      this._storeService.Get(this.storeId).then((res) => {
        this.store = res
      })
    },
    loggedIn () {
      if (this.storeId) { this._cartService.UpdateCartInDbAndSetState(this.storeId) }
    },
    getRegisteredCards () {
      const comp = this
      comp._stripeService
        .GetPaymentMethods(comp.storeId)
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