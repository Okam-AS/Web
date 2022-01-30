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
      tryCompleteCart: false,
      paymentStatus: undefined
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
      this.tryCompleteCart = !!(search.has('tryCompleteCart') || false)
      this.paymentStatus = search.has('paymentStatus') ? search.get('paymentStatus') : undefined

      if (this.noLayout && window.Tawk_API) {
        window.Tawk_API.onLoad = () => {
          window.Tawk_API.hideWidget()
        }
      }
    }
  },
  methods: {
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