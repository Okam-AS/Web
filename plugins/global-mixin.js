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
  mounted () {
    this.$store.dispatch('Load')
    this.$store.subscribe((mutation, state) => {
      if (mutation && window && window.localStorage) {
        localStorage.setItem('state', JSON.stringify(state))
      }
    })
  },
  methods: {
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