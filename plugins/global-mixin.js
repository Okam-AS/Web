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
  StatisticsService,
  PayoutService,
  PaymentService,
  VippsService,
  CultureService,
  DineHomeService,
  AIService,
  OfferService,
  OfferProposalService,
  KamService,
  DinteroService,
  WoltService,
  RewardService
} from '@/core/services'
import { wholeAmount, fractionAmount, priceLabel, formatString } from '~/core/helpers/tools'

const mixin = {
  data() {
    return {
      noLayout: false,
      paymentStatus: undefined,
      qsTableName: ''
    }
  },
  mounted() {
    this.$store.dispatch('Load')
    this.$store.subscribe((mutation, state) => {
      if (mutation && window && window.localStorage) {
        localStorage.setItem('state', JSON.stringify(state))
      }
    })

    if (window && window.location) {
      const search = new URLSearchParams(window.location.search) || {}

      this.noLayout = !!(search.has('nolayout') || false)
      this.paymentStatus = search.has('paymentStatus') ? search.get('paymentStatus') : undefined
      this.qsTableName = search.has('table') ? decodeURI(search.get('table')) : ''
    }
  },
  methods: {
    paymentTypeLabel(paymentTypeEnum) {
      switch (paymentTypeEnum) {
        case 'PayInStore': return 'Betal i butikk'
        case 'Stripe': return 'Betalt med kort'
        case 'Vipps': return 'Betalt med Vipps'
        case 'Giftcard': return 'Betalt med giftkort'
        case 'Dintero': return 'Betalt med Dintero'
        case 'DinteroVipps': return 'Betalt med Vipps'
        case 'DinteroBillie': return 'Betalt med Billie'
        case 'DinteroKlarna': return 'Betalt med Klarna'
        default: return 'Ukjent'
      }
    },
    deliveryTypeLabel(deliveryTypeEnum) {
      switch (deliveryTypeEnum) {
        case 'SelfPickup': return 'Hent selv'
        case 'InstantHomeDelivery': return 'Hjemlevering'
        case 'GroupedHomeDelivery': return 'Hjemlevering'
        case 'DineHomeDelivery': return 'DineHome Hjemlevering'
        case 'TableDelivery': return 'Spis inne'
        case 'WoltDelivery': return 'Wolt'
        default: return 'Ikke satt'
      }
    },
    orderStatusLabel(orderStatusEnum) {
      switch (orderStatusEnum) {
        case 'Accepted': return 'Forespurt'
        case 'Processing': return 'Tilberedes'
        case 'ReadyForPickup': return 'Klar for henting'
        case 'ReadyForDriver': return 'På vei'
        case 'DriverPickedUp': return 'Sjåføren er på vei'
        case 'Served': return 'Servert'
        case 'Completed': return 'Fullført'
        case 'Canceled': return 'Kansellert'
        default: return 'Ikke satt'
      }
    },
    formatString(str, format) {
      return formatString(str, format)
    },
    formatDate(dateTime) {
      return (!dateTime) ? '' : dayjs(dateTime).format('DD.MM.YY HH:mm')
    },
    priceLabel(totalPrice, hideFractionIfZero) {
      return priceLabel(totalPrice, hideFractionIfZero)
    },
    wholeAmount(amount) {
      return wholeAmount(amount)
    },
    fractionAmount(amount) {
      return fractionAmount(amount)
    }
  },
  computed: {
    urlQueryStrings() {
      let qs = ''
      if (this.noLayout) { qs += 'nolayout=' + this.noLayout + '&' }
      if (this.paymentStatus) { qs += 'paymentStatus=' + this.paymentStatus + '&' }
      if (this.qsTableName) { qs += 'table=' + encodeURI(this.qsTableName) + '&' }
      return qs ? '?' + qs : ''
    },
    _userService() { return new UserService(this.$store) },
    _cartService() { return new CartService(this.$store) },
    _productService() { return new ProductService(this.$store) },
    _discountService() { return new DiscountService(this.$store) },
    _storeService() { return new StoreService(this.$store) },
    _orderService() { return new OrderService(this.$store) },
    _statisticsService() { return new StatisticsService(this.$store) },
    _payoutService() { return new PayoutService(this.$store) },
    _notificationService() { return new NotificationService(this.$store) },
    _categoryService() { return new CategoryService(this.$store) },
    _deliveryMethodService() { return new DeliveryMethodService(this.$store) },
    _cultureService() { return new CultureService(this.$store) },
    _vippsService() { return new VippsService(this.$store) },
    _paymentService() { return new PaymentService(this.$store) },
    _dineHomeService() { return new DineHomeService(this.$store) },
    _aiService() { return new AIService(this.$store) },
    _offerService() { return new OfferService(this.$store) },
    _offerProposalService() { return new OfferProposalService(this.$store) },
    _kamService() { return new KamService(this.$store) },
    _dinteroService() { return new DinteroService(this.$store) },
    _woltService() { return new WoltService(this.$store) },
    _rewardService() { return new RewardService(this.$store) }

  }
}

Vue.mixin(mixin)