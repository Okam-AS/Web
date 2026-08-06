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
  SurfboardService,
  TripletexService,
  KraviaInvoiceService,
  WoltService,
  WoltMenuService,
  WoltVenueService,
  RewardService,
  WrappedService,
  BankAccountService,
  PosService,
  OpenCheckService,
  KitchenService,
  CashDrawerService,
  CashPointService,
  OperatorService,
  ReportService,
  JournalService,
  SaftService,
  GoodsGroupService,
  OpenPricePresetService,
  AllergenService,
  TableService,
  ReservationService,
  DinteroTerminalService
} from '~/core/services'
import { AdminUserService, AdminCartService } from '~/plugins/admin-core-services'
import { wholeAmount, fractionAmount, priceLabel, formatString, setCurrencyFormat } from '~/core/helpers/tools'
import { formatChf, isAmountStated, UNKNOWN_AMOUNT } from '~/utils/price'

// Unified core formats prices via currencyInfo (consumer default "100,–").
// Admin web keeps the legacy "kr 100" prefix format.
setCurrencyFormat({ prefix: 'kr ', suffix: '' })

// Every member of the backend's `PaymentType` (OkamAPI `Enums/PaymentType.cs`, read by object at
// `8e2b57de`) mapped to the dictionary key an operator reads back off an order.
//
// ENUMERATED FROM THE BACKEND, NOT FROM THIS FILE. The `switch` this replaces carried ten cases and
// a `default: 'Ukjent'`, so SEVEN of the backend's seventeen members answered "Ukjent" — and two of
// those seven are written by this repository's own POS. `PosSettlementService.DominantPaymentType`
// stamps the settled order with its largest tender, so a POS cash sale
// (`components/admin/pos/PaymentScreen.vue` allocates `paymentType: 'Cash'`) came back as "Ukjent"
// in the admin order list, as did a terminal card sale (`'SurfboardTerminal'`). Taking the switch's
// own cases as the population is what let that stand: it passes by construction.
//
// KEYS, NOT LITERALS. Nine of these keys already existed and are already used by the payment-type
// filter on the same page that renders these cards (`pages/admin/orders.vue:572`), in all three
// dictionaries. The switch had re-typed the Norwegian half of them as literals, which is why the
// German build — the only language the CH deployment serves — rendered a Norwegian sentence here
// while the filter three components away rendered German.
//
// Where two members share a key they share an operator-facing fact, not an implementation: both
// terminals are a card presented at the counter (the backend groups them the same way in
// `EodService`, `XZReportService` and the SAF-T export), and the Vipps/card families follow
// `ReceiptService.PaymentTypeLabel`'s own wording rather than a new one invented here.
const PAYMENT_TYPE_LABEL_KEYS = {
  // 0 — no tender recorded. NOT the same fact as an unrecognised value, and it is a real persisted
  // state: `CheckSplitService.BuildPartOrder` creates every split part as an OpenCheck order with
  // `PaymentType.NotSet`. "Ukjent" said the client could not read the value; the truth is that
  // nobody has paid yet.
  NotSet: 'orders_paymentNotSet',
  Giftcard: 'orders_paymentGiftcard',
  PayInStore: 'orders_paymentPayInStore',
  // 110 — this repo's POS writes it.
  Cash: 'orders_paymentCash',
  // 120 — Company Meals credit sale. Never a payment rail; the backend's own receipt line calls it
  // "Betalt med bedriftskonto" (`ReceiptService.cs:171`) and the SAF-T export books it as a
  // customer account (12006), so it is named here rather than invented.
  CompanyAccount: 'orders_paymentCompanyAccount',
  Stripe: 'orders_paymentCard',
  Vipps: 'orders_paymentVipps',
  Dintero: 'orders_paymentDintero',
  DinteroVipps: 'orders_paymentVipps',
  DinteroBillie: 'orders_paymentBillie',
  DinteroKlarna: 'orders_paymentKlarna',
  DinteroKravia: 'orders_paymentKravia',
  // 450 / 650 — a card taken on the counter terminal. Kept distinct from the online card rails
  // above because the two reconcile through different books: terminal sales are excluded from
  // `OnlineSettledPaymentTypes` and reach the ledger through the Z-report instead.
  DinteroTerminal: 'orders_paymentTerminal',
  WoltMarketplace: 'orders_paymentWolt',
  Surfboard: 'orders_paymentCard',
  SurfboardVipps: 'orders_paymentVipps',
  SurfboardTerminal: 'orders_paymentTerminal'
}

// Every member of the backend's `DeliveryType` (OkamAPI `Enums/DeliveryType.cs`) mapped to the
// dictionary key an operator reads back off an order.
//
// SAME DEFECT AS THE PAYMENT MAP ABOVE, SAME FIX, AND THE ORDER OF THE TWO MATTERS. The `switch`
// this replaces returned seven Norwegian string LITERALS and a Norwegian default, with no `$i` and
// no key anywhere in it — so there was no lookup to repair, there was no lookup, and no translation
// could reach these words in any language. On the CH build, which serves German and only German
// (`nuxt.config.js` sets `locales: isCh ? ['de'] : ['en','no']`), the receipt therefore printed
// 'Hent selv' under 'Liefermethode:'. That is a fiscal document a Swiss reader is handed.
//
// THE KEYS ARE NOT NEW. Four of the seven already existed in all three dictionaries and are already
// used by the delivery-type filter on the same page that renders these cards
// (`pages/admin/orders.vue:562-567`), with Norwegian values BYTE-IDENTICAL to the literals the
// switch returned. The switch was a duplicate of a dictionary two components away — exactly what
// PAYMENT_TYPE_LABEL_KEYS found. Three keys are new (`orders_deliveryNotSet`,
// `orders_deliveryWoltDrive`, `orders_deliveryWoltMarketplace`) and carry the switch's own words.
//
// POPULATION READ FROM THE BACKEND, NOT FROM THE SWITCH — because taking the switch's own cases as
// the population is what let the payment map ship seven unlabelled members. `DeliveryType.cs`
// declares exactly seven: NotSet, SelfPickup, InstantHomeDelivery, DineHomeDelivery, WoltDelivery,
// WoltMarketplaceDelivery, TableDelivery. All seven are named below and `core/enums/delivery-type.ts`
// declares the same seven, so unlike payment there is no coverage hole here to inherit.
//
// `GroupedHomeDelivery` IS NOT A MEMBER OF ANYTHING. It appears in no backend enum, in no core enum
// and at no other call site in this repository — the switch's own case was its only occurrence in
// the estate. It is carried below rather than deleted because this change is a routing change and
// deleting a case is a behaviour change; it is recorded so whoever removes it does so deliberately.
const DELIVERY_TYPE_LABEL_KEYS = {
  // 0 — a real persisted member AND the shape an order with no deliveryType at all arrives in, and
  // the switch answered both with the same words ('Ikke satt'). Named explicitly here so the map
  // covers the enum, and pointed at the same key the default below resolves, so the rendered string
  // is unchanged for both. Whether an unrecognised value should instead read "Ukjent" — the way
  // PAYMENT_TYPE_LABEL_KEYS keeps the next backend member visible — is a behaviour decision about
  // what a receipt prints, not a routing one, and is deliberately not taken here.
  NotSet: 'orders_deliveryNotSet',
  SelfPickup: 'orders_deliverySelfPickup',
  InstantHomeDelivery: 'orders_deliveryInstantHome',
  // Not a backend member and not a core member — see above.
  GroupedHomeDelivery: 'orders_deliveryInstantHome',
  DineHomeDelivery: 'orders_deliveryDineHome',
  TableDelivery: 'orders_deliveryTable',
  WoltDelivery: 'orders_deliveryWoltDrive',
  WoltMarketplaceDelivery: 'orders_deliveryWoltMarketplace'
}

// Every member of the backend's `OrderStatus` (OkamAPI `Enums/OrderStatus.cs`) mapped to the
// dictionary key an operator reads back off an order. Same defect, same fix, same provenance.
//
// ALL EIGHT KEYS ALREADY EXISTED in all three dictionaries, with Norwegian values byte-identical to
// the literals the switch returned, and `pages/admin/orders.vue:550-557` already builds the status
// FILTER on this same page out of exactly these eight keys. So the board's filter offered a German
// word and the card beside it answered in Norwegian, from two copies of one vocabulary.
//
// COVERAGE, READ FROM THE BACKEND: `OrderStatus.cs` declares exactly the eight below and the switch
// carried all eight, so no member fell through — the payment map's seventeen-against-ten gap does
// not repeat here. `core/enums/order-status.ts` additionally declares `OpenCheck`, which no backend
// enum declares; that mirror drift is recorded rather than mapped, because inventing a word for a
// state the API cannot send would be a guess printed on a receipt.
const ORDER_STATUS_LABEL_KEYS = {
  Accepted: 'orders_statusAccepted',
  Processing: 'orders_statusProcessing',
  ReadyForPickup: 'orders_statusReadyForPickup',
  ReadyForDriver: 'orders_statusReadyForDriver',
  DriverPickedUp: 'orders_statusDriverPickedUp',
  Served: 'orders_statusServed',
  Completed: 'orders_statusCompleted',
  Canceled: 'orders_statusCanceled'
}

const mixin = {
  data () {
    return {
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

      this.noLayout = !!(search.has('nolayout') || false)
      this.paymentStatus = search.has('paymentStatus') ? search.get('paymentStatus') : undefined
      this.qsTableName = search.has('table') ? decodeURI(search.get('table')) : ''
    }
  },
  methods: {
    // Resolves a dictionary key, never a literal. See PAYMENT_TYPE_LABEL_KEYS above for why both
    // halves of that sentence matter. A value the map does not carry keeps answering "Ukjent" —
    // narrow on purpose, so the next member the backend adds is visible instead of absorbed.
    paymentTypeLabel (paymentTypeEnum) {
      const key = Object.prototype.hasOwnProperty.call(PAYMENT_TYPE_LABEL_KEYS, paymentTypeEnum)
        ? PAYMENT_TYPE_LABEL_KEYS[paymentTypeEnum]
        : 'orders_paymentUnknown'
      return this.$i(key)
    },
    // Resolves a dictionary key, never a literal. See DELIVERY_TYPE_LABEL_KEYS above. A value the
    // map does not carry resolves the same key `NotSet` does, which is what the switch's default
    // did, so no rendered string moves in any language.
    deliveryTypeLabel (deliveryTypeEnum) {
      const key = Object.prototype.hasOwnProperty.call(DELIVERY_TYPE_LABEL_KEYS, deliveryTypeEnum)
        ? DELIVERY_TYPE_LABEL_KEYS[deliveryTypeEnum]
        : 'orders_deliveryNotSet'
      return this.$i(key)
    },
    dineHomeDeliveryStatusLabel (dineHomeDeliveryTypeEnum) {
      switch (dineHomeDeliveryTypeEnum) {
      case 'Accepted': return 'Sjåfør har akseptert'
      case 'PickedUp': return 'Sjåfør leverer bestilling'
      case 'ReachedDestination': return 'Sjåfør fremme hos kunde'
      case 'Completed': return 'Fullført'
      case 'Canceled': return 'Sjåfør har kansellert'
      default: return 'Venter aksept fra sjåfør'
      }
    },
    woltDeliveryStatusLabel (woltDeliveryStatusEnum) {
      switch (woltDeliveryStatusEnum) {
      case 'OrderReceived': return 'Bestilling mottatt'
      case 'OrderRejected': return 'Bestilling avvist'
      case 'PickupStarted': return 'Henting startet'
      case 'PickedUp': return 'Hentet'
      case 'PickupArrival': return 'Sjåfør ankommer'
      case 'DropoffStarted': return 'Levering startet'
      case 'DropoffArrival': return 'Levering ankommer'
      case 'DropoffCompleted': return 'Levert hos kunde'
      case 'Delivered': return 'Levert'
      case 'CustomerNoShow': return 'Kunde møtte ikke'
      default: return 'Venter på sjåfør'
      }
    },
    // Resolves a dictionary key, never a literal. See ORDER_STATUS_LABEL_KEYS above. A value the map
    // does not carry — `OpenCheck` is the one core declares and the backend does not — resolves
    // `orders_statusNotSet`, which is the switch's own default wording unchanged.
    orderStatusLabel (orderStatusEnum) {
      const key = Object.prototype.hasOwnProperty.call(ORDER_STATUS_LABEL_KEYS, orderStatusEnum)
        ? ORDER_STATUS_LABEL_KEYS[orderStatusEnum]
        : 'orders_statusNotSet'
      return this.$i(key)
    },
    formatString (str, format) {
      return formatString(str, format)
    },
    formatDate (dateTime) {
      return (!dateTime) ? '' : dayjs(dateTime).format('DD.MM.YY HH:mm')
    },
    // The one money label every screen in this app renders through, and therefore the one place the
    // difference between "costs nothing" and "nobody said" can be kept.
    //
    // The gate is HERE, in front of both formatters, rather than inside either: `Number(null)` is 0
    // on the Swiss side and core's own helper answers "0" to any falsy amount on the Norwegian side,
    // so BOTH branches turned an absent figure into a real price indistinguishable from a genuine
    // zero — the card-terminal screen saying kr 0 while a customer's card is in the reader, a cash
    // point claiming it tolerates no difference at all. Core is a submodule pinned by four other
    // checkouts (+D-CORE-PIN), so this repo's screens cannot wait on a fix landing there.
    //
    // Zero still prints as zero. Only the unstated is withheld.
    priceLabel (totalPrice, hideFractionIfZero) {
      if (!isAmountStated(totalPrice)) { return UNKNOWN_AMOUNT }
      if (this.isCh) {
        return formatChf(totalPrice)
      }
      return priceLabel(totalPrice, hideFractionIfZero)
    },
    // NOT gated, deliberately. These two are digit helpers, not labels: `pages/admin/delivery.vue`
    // seeds the two halves of a money INPUT from them, so answering "—" here would type a dash into
    // a field the operator then saves.
    //
    // Their only DISPLAY use is the cross-currency composition, and that composition now carries the
    // gate itself: `crossCurrencyLabel` in `~/utils/cross-currency` applies the same `isAmountStated`
    // rule `priceLabel` above applies, so both branches of every module mixin's `amount()` answer an
    // absence the same way. It used to be written out longhand at six call sites — `wholeAmount(null)`
    // is "0" and `fractionAmount(null)` is "00", so wherever an absence reached one of them it
    // composed to "0,00 SEK", indistinguishable from a genuine zero.
    //
    // FOUR of the six let an absence reach the composition: `WorkforceWeekGrid.amount`,
    // `WorkforceRateTimeline.amountLabel` (which refused `null` and only `null`, so `undefined` went
    // straight through), `MealsFundedOrders.amount`, and `marginMoney.amount`/`signedAmount`. The
    // other TWO refused first and were already sound: `EventsJourney.amount` through `readMinor`, and
    // `MealsProgramPanel.allowancePreview` because `parseRateAmount` yields an integer whenever it
    // reports no error. Nothing was visibly wrong even at the four, because each one's callers
    // happened to guard it — which is why the hole survived this long and why it would have been
    // reopened by the first person to drop one of those guards for an unrelated reason.
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
      if (this.noLayout) { qs += 'nolayout=' + this.noLayout + '&' }
      if (this.paymentStatus) { qs += 'paymentStatus=' + this.paymentStatus + '&' }
      if (this.qsTableName) { qs += 'table=' + encodeURI(this.qsTableName) + '&' }
      return qs ? '?' + qs : ''
    },
    // Unified core services are stateless API clients constructed from an
    // ICoreInitializer instead of the Vuex store. Built fresh per access so the
    // bearer token / locale are always read live from the store (reactive).
    _coreInitializer () {
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
    _userService () { return new AdminUserService(this.$store, this._coreInitializer) },
    _cartService () { return new AdminCartService(this.$store, this._coreInitializer) },
    _productService () { return new ProductService(this._coreInitializer) },
    _discountService () { return new DiscountService(this._coreInitializer) },
    _storeService () { return new StoreService(this._coreInitializer) },
    _orderService () { return new OrderService(this._coreInitializer) },
    _statisticsService () { return new StatisticsService(this._coreInitializer) },
    _payoutService () { return new PayoutService(this._coreInitializer) },
    _notificationService () { return new NotificationService(this._coreInitializer) },
    _categoryService () { return new CategoryService(this._coreInitializer) },
    _categoryProductVariantService () { return new CategoryProductVariantService(this._coreInitializer) },
    _productVariantService () { return new ProductVariantService(this._coreInitializer) },
    _deliveryMethodService () { return new DeliveryMethodService(this._coreInitializer) },
    _cultureService () { return new CultureService(this._coreInitializer) },
    _vippsService () { return new VippsService(this._coreInitializer) },
    _paymentService () { return new PaymentService(this._coreInitializer) },
    _dineHomeService () { return new DineHomeService(this._coreInitializer) },
    _aiService () { return new AIService(this._coreInitializer) },
    _offerService () { return new OfferService(this._coreInitializer) },
    _offerProposalService () { return new OfferProposalService(this._coreInitializer) },
    _kamService () { return new KamService(this._coreInitializer) },
    _dinteroService () { return new DinteroService(this._coreInitializer) },
    _surfboardService () { return new SurfboardService(this._coreInitializer) },
    _tripletexService () { return new TripletexService(this._coreInitializer) },
    _kraviaInvoiceService () { return new KraviaInvoiceService(this._coreInitializer) },
    _woltService () { return new WoltService(this._coreInitializer) },
    _woltMenuService () { return new WoltMenuService(this._coreInitializer) },
    _woltVenueService () { return new WoltVenueService(this._coreInitializer) },
    _rewardService () { return new RewardService(this._coreInitializer) },
    _wrappedService () { return new WrappedService(this._coreInitializer) },
    _bankAccountService () { return new BankAccountService(this._coreInitializer) },
    // POS / Kassa services. The session-scoped ones (pos, open check, cash drawer, operator,
    // report, journal, saft) expose an `operatorSessionId` field the PosShell stamps before each
    // call so the X-Operator-Session header is sent. Built fresh per access like every other getter.
    _posService () { return new PosService(this._coreInitializer) },
    _openCheckService () { return new OpenCheckService(this._coreInitializer) },
    _kitchenService () { return new KitchenService(this._coreInitializer) },
    _cashDrawerService () { return new CashDrawerService(this._coreInitializer) },
    _cashPointService () { return new CashPointService(this._coreInitializer) },
    _operatorService () { return new OperatorService(this._coreInitializer) },
    _reportService () { return new ReportService(this._coreInitializer) },
    _journalService () { return new JournalService(this._coreInitializer) },
    _saftService () { return new SaftService(this._coreInitializer) },
    _goodsGroupService () { return new GoodsGroupService(this._coreInitializer) },
    _openPricePresetService () { return new OpenPricePresetService(this._coreInitializer) },
    _allergenService () { return new AllergenService(this._coreInitializer) },
    _tableService () { return new TableService(this._coreInitializer) },
    _reservationService () { return new ReservationService(this._coreInitializer) },
    _dinteroTerminalService () { return new DinteroTerminalService(this._coreInitializer) }

  }
}

Vue.mixin(mixin)

// Named export ONLY, and only so a test can pin the shipped methods rather than a hand-written
// stand-in — every component test in this repo mocks `priceLabel`, so nothing else in the suite ever
// exercises the real one. Nuxt registers a plugin by calling its DEFAULT export when that export is a
// function; there is none here and this adds none, so the plugin still runs exactly as before.
export { mixin as globalMixin }

// Exported for the same reason: `test/payment-type-label.test.js` enumerates the backend's members
// and asserts this map declares exactly them — no member missing, and no key left behind for a
// member the backend no longer has.
export { PAYMENT_TYPE_LABEL_KEYS }

// Same reason again: `test/order-label-dictionaries.test.js` reads the backend's `DeliveryType` and
// `OrderStatus` members and asserts these two maps declare exactly them, and that every key they
// name is present in each dictionary in its own right.
export { DELIVERY_TYPE_LABEL_KEYS, ORDER_STATUS_LABEL_KEYS }
