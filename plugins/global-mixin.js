import Vue from 'vue'
import dayjs from 'dayjs'
import {
  ProductService,
  DiscountService,
  StoreService,
  CategoryService,
  CategoryProductVariantService,
  ProductVariantService,
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
  KraviaInvoiceService,
  WoltService,
  WoltMenuService,
  WoltVenueService,
  RewardService,
  WrappedService,
  BankAccountService
} from '~/core/services'
import { AdminUserService, AdminCartService } from '~/plugins/admin-core-services'
import { wholeAmount, fractionAmount, priceLabel, formatString, setCurrencyFormat } from '~/core/helpers/tools'
import { formatChf } from '~/utils/price'

// Unified core formats prices via currencyInfo (consumer default "100,–").
// Admin web keeps the legacy "kr 100" prefix format.
setCurrencyFormat({ prefix: 'kr ', suffix: '' })

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
        case 'Giftcard': return 'Betalt med gavekort'
        case 'Dintero': return 'Betalt med Dintero'
        case 'DinteroVipps': return 'Betalt med Vipps'
        case 'DinteroBillie': return 'Betalt med Billie'
        case 'DinteroKlarna': return 'Betalt med Klarna'
        case 'DinteroKravia': return 'Betalt med Kravia'
        case 'WoltMarketplace': return 'Betalt via Wolt'
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
        case 'WoltDelivery': return 'Wolt Drive'
        case 'WoltMarketplaceDelivery': return 'Wolt Marketplace'
        default: return 'Ikke satt'
      }
    },
    dineHomeDeliveryStatusLabel(dineHomeDeliveryTypeEnum) {
      switch (dineHomeDeliveryTypeEnum) {
        case 'Accepted': return 'Sjåfør har akseptert'
        case 'PickedUp': return 'Sjåfør leverer bestilling'
        case 'ReachedDestination': return 'Sjåfør fremme hos kunde'
        case 'Completed': return 'Fullført'
        case 'Canceled': return 'Sjåfør har kansellert'
        default: return 'Venter aksept fra sjåfør'
      }
    },
    woltDeliveryStatusLabel(woltDeliveryStatusEnum) {
      switch (woltDeliveryStatusEnum) {
        case 'OrderReceived': return 'Bestilling mottatt'
        case 'OrderRejected': return 'Bestilling avvist'
        case 'PickupStarted': return 'Henting startet'
        case 'PickedUp': return 'Hentet'
        case 'PickupArrival': return 'Sjåfør ankommer'
        case 'DropoffStarted': return 'Levering startet'
        case 'DropoffArrival': return 'Levering ankommer'
        case 'Delivered': return 'Levert'
        case 'CustomerNoShow': return 'Kunde møtte ikke'
        default: return 'Venter på sjåfør'
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
      if (this.isCh) {
        return formatChf(totalPrice)
      }
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
    // Unified core services are stateless API clients constructed from an
    // ICoreInitializer instead of the Vuex store. Built fresh per access so the
    // bearer token / locale are always read live from the store (reactive).
    _coreInitializer() {
      return {
        bearerToken: (this.$store.state.currentUser && this.$store.state.currentUser.token) || '',
        clientPlatformName: this.$store.getters.clientPlatformName,
        cultureCode: this.$store.state.adminLocale || 'no'
      }
    },
    // UserService / CartService need v3-contract behavior the stateless core dropped
    // (reject->falsy, auto SetCurrentUser, ClearState only on 401, the removed
    // SetLineItem/RemoveLineItem Vuex helpers). That logic lives in dedicated adapter
    // subclasses in ~/plugins/admin-core-services — see that file. Everything else is
    // a plain stateless client built fresh per access so token/locale read live.
    _userService() { return new AdminUserService(this.$store, this._coreInitializer) },
    _cartService() { return new AdminCartService(this.$store, this._coreInitializer) },
    _productService() { return new ProductService(this._coreInitializer) },
    _discountService() { return new DiscountService(this._coreInitializer) },
    _storeService() { return new StoreService(this._coreInitializer) },
    _orderService() { return new OrderService(this._coreInitializer) },
    _statisticsService() { return new StatisticsService(this._coreInitializer) },
    _payoutService() { return new PayoutService(this._coreInitializer) },
    _notificationService() { return new NotificationService(this._coreInitializer) },
    _categoryService() { return new CategoryService(this._coreInitializer) },
    _categoryProductVariantService() { return new CategoryProductVariantService(this._coreInitializer) },
    _productVariantService() { return new ProductVariantService(this._coreInitializer) },
    _deliveryMethodService() { return new DeliveryMethodService(this._coreInitializer) },
    _cultureService() { return new CultureService(this._coreInitializer) },
    _vippsService() { return new VippsService(this._coreInitializer) },
    _paymentService() { return new PaymentService(this._coreInitializer) },
    _dineHomeService() { return new DineHomeService(this._coreInitializer) },
    _aiService() { return new AIService(this._coreInitializer) },
    _offerService() { return new OfferService(this._coreInitializer) },
    _offerProposalService() { return new OfferProposalService(this._coreInitializer) },
    _kamService() { return new KamService(this._coreInitializer) },
    _dinteroService() { return new DinteroService(this._coreInitializer) },
    _kraviaInvoiceService() { return new KraviaInvoiceService(this._coreInitializer) },
    _woltService() { return new WoltService(this._coreInitializer) },
    _woltMenuService() { return new WoltMenuService(this._coreInitializer) },
    _woltVenueService() { return new WoltVenueService(this._coreInitializer) },
    _rewardService() { return new RewardService(this._coreInitializer) },
    _wrappedService() { return new WrappedService(this._coreInitializer) },
    _bankAccountService() { return new BankAccountService(this._coreInitializer) }

  }
}

Vue.mixin(mixin)
