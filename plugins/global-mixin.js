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
  StripeService
} from '@/core/services'

const mixin = {
  methods: {
    formatDate (dateTime) {
      return (!dateTime) ? '' : dayjs(dateTime).format('DD.MM.YY HH:mm')
    },
    priceLabel (totalPrice, hideFractionIfZero) {
      const prefix = 'kr '
      const wholeAmount = this.wholeAmount(totalPrice)
      let fraction = ''
      if (!hideFractionIfZero || parseInt(this.fractionAmount(totalPrice)) > 0) {
        fraction = ',' + this.fractionAmount(totalPrice)
      }
      return prefix + wholeAmount + fraction
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
    _deliveryMethodService () { return new DeliveryMethodService(this.$store) }
  }
}

Vue.mixin(mixin)