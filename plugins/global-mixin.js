import Vue from 'vue'
import dayjs from 'dayjs'
import {
  CartService,
  ProductService,
  UserService,
  DiscountService,
  StoreService,
  CategoryService,
  DeliveryMethodService,
  NotificationService,
  OrderService,
  StripeService,
  CultureService
} from '@/core/services'
import { wholeAmount, fractionAmount, priceLabel, formatString } from '~/core/helpers/tools'

const mixin = {
  data () {
    return {
      storeId: undefined,
      noLayout: false,
      paymentStatus: undefined,
      qsTableName: ''
    }
  },
  mounted () {
    this.$store.dispatch('Load')
    this.$store.subscribe((mutation, state) => {
      if (mutation && window && window.localStorage) {
        localStorage.setItem('state', JSON.stringify(state))
      }
    })

    if (window && window.location) {
      const search = new URLSearchParams(window.location.search) || {}

      this.storeId = (search.get('store') || false) ? parseInt(search.get('store')) : undefined
      this.noLayout = !!(search.has('nolayout') || false)
      this.paymentStatus = search.has('paymentStatus') ? search.get('paymentStatus') : undefined
      this.qsTableName = search.has('table') ? decodeURI(search.get('table')) : ''

      if ((this.noLayout ||
        window.location.href.includes('/webshop') ||
        window.location.href.includes('/admin')
      ) && window.Tawk_API) {
        window.Tawk_API.onLoad = () => {
          window.Tawk_API.hideWidget()
        }
      }
    }
  },
  methods: {
    paymentTypeLabel (paymentTypeEnum) {
      switch (paymentTypeEnum) {
      case 'PayInStore': return 'Hent selv'
      case 'Stripe': return 'Betalt med kort'
      case 'Vipps': return 'Betalt med Vipps'
      default: return 'Ukjent'
      }
    },
    deliveryTypeLabel (deliveryTypeEnum) {
      switch (deliveryTypeEnum) {
      case 'SelfPickup': return 'Hent selv'
      case 'InstantHomeDelivery': return 'Hjemlevering'
      case 'GroupedHomeDelivery': return 'Hjemlevering'
      case 'TableDelivery': return 'Spis inne'
      default: return 'Ikke satt'
      }
    },
    orderStatusLabel (orderStatusEnum) {
      switch (orderStatusEnum) {
      case 'Accepted': return 'Ny bestilling'
      case 'Processing': return 'Behandles'
      case 'ReadyForPickup': return 'Klar for henting'
      case 'ReadyForDriver': return 'På vei'
      case 'DriverPickedUp': return 'Sjåføren er på vei'
      case 'Served': return 'Servert'
      case 'Completed': return 'Fullført'
      case 'Canceled': return 'Kansellert'
      default: return 'Ikke satt'
      }
    },
    formatString (str, format) {
      return formatString(str, format)
    },
    formatDate (dateTime) {
      return (!dateTime) ? '' : dayjs(dateTime).format('DD.MM.YY HH:mm')
    },
    priceLabel (totalPrice, hideFractionIfZero) {
      return priceLabel(totalPrice, hideFractionIfZero)
    },
    wholeAmount (amount) {
      return wholeAmount(amount)
    },
    fractionAmount (amount) {
      return fractionAmount(amount)
    }
  },
  computed: {
    urlQueryStrings () {
      let qs = ''
      if (this.storeId) { qs += 'store=' + this.storeId + '&' }
      if (this.noLayout) { qs += 'nolayout=' + this.noLayout + '&' }
      if (this.paymentStatus) { qs += 'paymentStatus=' + this.paymentStatus + '&' }
      if (this.qsTableName) { qs += 'table=' + encodeURI(this.qsTableName) + '&' }
      return qs ? '?' + qs : ''
    },
    _userService () { return new UserService(this.$store) },
    _cartService () { return new CartService(this.$store) },
    _productService () { return new ProductService(this.$store) },
    _discountService () { return new DiscountService(this.$store) },
    _storeService () { return new StoreService(this.$store) },
    _stripeService () { return new StripeService(this.$store) },
    _orderService () { return new OrderService(this.$store) },
    _notificationService () { return new NotificationService(this.$store) },
    _categoryService () { return new CategoryService(this.$store) },
    _deliveryMethodService () { return new DeliveryMethodService(this.$store) },
    _cultureService () { return new CultureService(this.$store) }
  }
}

Vue.mixin(mixin)