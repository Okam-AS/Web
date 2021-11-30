import Vue from 'vue'
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