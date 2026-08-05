import { mount } from '@vue/test-utils'
// Both plugins are imported for their SIDE EFFECT. Each calls `Vue.mixin`, so what these mounts
// render is the shipped `deliveryTypeLabel` / `orderStatusLabel` and the shipped `$i` — not a
// stand-in written here. A unit test over the label function alone would pass on a component that
// never calls it, which is the shape of gap this repository has shipped before.
import { DELIVERY_TYPE_LABEL_KEYS, ORDER_STATUS_LABEL_KEYS } from '~/plugins/global-mixin'
import '~/plugins/i18n'
import { translate } from '~/utils/i18n'
import translations from '~/translations'
import OrderCard from '~/components/molecules/OrderCard.vue'
import OrderCardModal from '~/components/molecules/OrderModal.vue'
import OrderDetailModal from '~/components/organisms/OrderModal.vue'

// ---- THE POPULATION -----------------------------------------------------------------------------
//
// Read from the BACKEND, never from the map or the component under test. Enumerating a switch from
// its own cases passes by construction — that is exactly how `paymentTypeLabel`'s ten-case ladder
// looked complete while seven backend members fell through it.
//
//   OkamAPI Enums/DeliveryType.cs   ·   OkamAPI Enums/OrderStatus.cs
//
// The numbers are carried so a reordering or a re-lettering shows up here as a conflict rather than
// as a silent rename.
const BACKEND_DELIVERY_TYPES = [
  ['NotSet', 0],
  ['SelfPickup', 100],
  ['InstantHomeDelivery', 200],
  ['DineHomeDelivery', 350],
  ['WoltDelivery', 375],
  ['WoltMarketplaceDelivery', 380],
  ['TableDelivery', 400]
]

const BACKEND_ORDER_STATUSES = [
  ['Accepted', 20],
  ['Processing', 30],
  ['ReadyForPickup', 40],
  ['ReadyForDriver', 50],
  ['DriverPickedUp', 60],
  ['Served', 70],
  ['Completed', 100],
  ['Canceled', 110]
]

const DELIVERY_MEMBERS = BACKEND_DELIVERY_TYPES.map(([name]) => name)
const STATUS_MEMBERS = BACKEND_ORDER_STATUSES.map(([name]) => name)

// The one key in `DELIVERY_TYPE_LABEL_KEYS` that names no member of anything. It occurs in no
// backend enum, in no `core/enums/*` enum and at no other call site in this repository — the switch
// this replaced was its only occurrence in the estate. It is named here rather than tolerated as
// "anything extra", so a SECOND invented member cannot slip in beside it.
const KNOWN_NON_MEMBERS = ['GroupedHomeDelivery']

// ---- WHAT AN OPERATOR SHOULD READ ---------------------------------------------------------------
//
// Written out rather than resolved through the dictionary. A test that looks the expected word up
// through the same map the component looks it up through cannot tell a MISSING arm from a WRONG one:
// both sides move together on every input and the test agrees with itself. These are the words.
const EXPECTED_DELIVERY_NO = {
  NotSet: 'Ikke satt',
  SelfPickup: 'Hent selv',
  InstantHomeDelivery: 'Hjemlevering',
  DineHomeDelivery: 'DineHome Hjemlevering',
  WoltDelivery: 'Wolt Drive',
  WoltMarketplaceDelivery: 'Wolt Marketplace',
  TableDelivery: 'Spis inne'
}

const EXPECTED_DELIVERY_DE = {
  NotSet: 'Nicht festgelegt',
  SelfPickup: 'Selbstabholung',
  InstantHomeDelivery: 'Lieferung nach Hause',
  DineHomeDelivery: 'DineHome Lieferung nach Hause',
  WoltDelivery: 'Wolt Drive',
  WoltMarketplaceDelivery: 'Wolt Marketplace',
  TableDelivery: 'Vor Ort essen'
}

const EXPECTED_STATUS_NO = {
  Accepted: 'Forespurt',
  Processing: 'Tilberedes',
  ReadyForPickup: 'Klar for henting',
  ReadyForDriver: 'På vei',
  DriverPickedUp: 'Sjåføren er på vei',
  Served: 'Servert',
  Completed: 'Fullført',
  Canceled: 'Kansellert'
}

const EXPECTED_STATUS_DE = {
  Accepted: 'Angefragt',
  Processing: 'In Zubereitung',
  ReadyForPickup: 'Abholbereit',
  ReadyForDriver: 'Unterwegs',
  DriverPickedUp: 'Fahrer ist unterwegs',
  Served: 'Serviert',
  Completed: 'Abgeschlossen',
  Canceled: 'Storniert'
}

// EVERY NORWEGIAN WORD THE PRE-LANE `switch` RETURNED, copied from `e34977a:plugins/global-mixin.js`
// (`deliveryTypeLabel` :97-108, `orderStatusLabel` :134-146). This change routes those literals
// through the dictionary; it is not a rewording, and this table is what says so. If a key's
// Norwegian value is ever edited, the German build is not the only thing that moves and this arm
// reds on the Norwegian one too.
const PRE_LANE_NORWEGIAN = {
  delivery: {
    SelfPickup: 'Hent selv',
    InstantHomeDelivery: 'Hjemlevering',
    GroupedHomeDelivery: 'Hjemlevering',
    DineHomeDelivery: 'DineHome Hjemlevering',
    TableDelivery: 'Spis inne',
    WoltDelivery: 'Wolt Drive',
    WoltMarketplaceDelivery: 'Wolt Marketplace',
    // the switch's `default`, which is what an absent value and `NotSet` both landed on
    NotSet: 'Ikke satt'
  },
  status: {
    Accepted: 'Forespurt',
    Processing: 'Tilberedes',
    ReadyForPickup: 'Klar for henting',
    ReadyForDriver: 'På vei',
    DriverPickedUp: 'Sjåføren er på vei',
    Served: 'Servert',
    Completed: 'Fullført',
    Canceled: 'Kansellert'
  }
}

const NOT_SET = {
  delivery: { no: 'Ikke satt', en: 'Not set', de: 'Nicht festgelegt' },
  status: { no: 'Ikke satt', en: 'Not set', de: 'Nicht festgelegt' }
}

// Values that are genuinely not members. `constructor` and `toString` are here because a bare
// `map[value]` lookup answers them with a function off Object.prototype; the rest are the shapes an
// absent or stale field actually arrives in. `OpenCheck` is in the list on purpose: it is declared
// by `core/enums/order-status.ts` and by no backend enum, so an order could only carry it if the
// mirror stopped being a mirror — and until then it must read the fallback rather than a guess.
const NOT_MEMBERS = [
  ['an unrecognised member the backend might add tomorrow', 'DroneDelivery'],
  ['a member spelled in the wrong case', 'selfpickup'],
  ['an inherited Object property', 'constructor'],
  ['another inherited Object property', 'toString'],
  ['an empty string', ''],
  ['null', null],
  ['undefined', undefined],
  ['a number', 100]
]

const NOT_MEMBERS_STATUS = NOT_MEMBERS.concat([
  ['a status only the client mirror declares', 'OpenCheck']
])

function storeFor (locale) {
  // `$i` reads `adminLocale` off the Vuex store, and the global mixin's `mounted` dispatches `Load`
  // and subscribes. Both are stubbed to nothing; the locale is the only state under test.
  return { state: { adminLocale: locale }, dispatch () {}, subscribe () {} }
}

function orderWith (fields) {
  return Object.assign({
    id: 'order-1',
    orderCode: 'ABC123',
    friendlyOrderId: '1001',
    platform: 'Pos',
    status: 'Completed',
    deliveryType: 'SelfPickup',
    paymentType: 'PayInStore',
    created: '2026-08-05T10:00:00',
    finalAmount: 24900,
    comment: '',
    items: []
  }, fields)
}

// Finds the ONE row whose own label is the row under test and returns the word next to it. Throws
// rather than returning undefined when the row is not there: a moved or gated row must fail loudly,
// not quietly pass an `undefined !== 'Ikke satt'` assertion. The payment lane walked into exactly
// that trap — its first draft mounted the card collapsed and read an empty page.
function readRow (wrapper, rowSelector, labelSelector, valueSelector, labelText) {
  try {
    const rows = wrapper.findAll(rowSelector).wrappers
      .filter(row => row.find(labelSelector).exists() && row.find(labelSelector).text().trim() === labelText)
    if (rows.length !== 1) {
      throw new Error(
        `expected exactly one "${labelText}" row under ${rowSelector}, found ${rows.length} — the ` +
        'row moved or is gated, so this surface is no longer being read'
      )
    }
    return rows[0].find(valueSelector).text().trim()
  } finally {
    wrapper.destroy()
  }
}

// `components/atoms/Modal.vue` nests `FocusTrap`, which declares its teardown in `unmounted()` — a
// Vue 3 hook this Vue 2 application never calls — and defers `activateTrap` onto a `setImmediate`.
// The trap outlives the test and dereferences `document` after jest tears the jsdom environment
// down, taking the worker with it. Stubbed with the default slot preserved, so the component's own
// template still renders in full. The stale hook is a real defect in `FocusTrap.vue`, recorded here
// and not fixed by this lane.
const MODAL_STUB = { name: 'Modal', template: '<div class="modal-stub"><slot /></div>' }

// `components/molecules/ReceiptModal.vue` — the surface this lane's journey walks, and the one a
// bokføring inspector reads — CANNOT be mounted by this repository's toolchain: its template uses
// optional chaining (`order.user?.phoneNumber`), vue-jest compiles the render function through
// buble, and buble cannot parse `?.`. Importing it fails the suite before an assertion runs. That
// is a pre-existing testability gap, recorded rather than papered over, and it is why the DOM-level
// evidence for the receipt itself is a Playwright walk (`lanes/L-MIXIN-LABELS-TRANSLATE/`) instead
// of a mount here.
const DELIVERY_SURFACES = [
  {
    name: 'OrderCard — the admin order list on /admin/ongoing',
    async render (deliveryType, locale) {
      // The delivery row is behind `v-if="isExpanded"`, which is `expandedOrderId === order.id`, so
      // the card has to be opened exactly as the operator opens it or the row is not in the DOM.
      const wrapper = mount(OrderCard, {
        propsData: { order: orderWith({ deliveryType }), expandedOrderId: 'order-1' },
        mocks: { $store: storeFor(locale) }
      })
      await wrapper.vm.$nextTick()
      return readRow(wrapper, '.info-item', 'label', 'span', translate(locale, 'orderCard_deliveryLabel'))
    }
  },
  {
    name: 'OrderModal (organisms) — the order detail on /admin/orders',
    async render (deliveryType, locale) {
      // `orderCode: ''` short-circuits this component's own `fetchOrder`, so no service is
      // constructed and no network shape is invented here.
      const wrapper = mount(OrderDetailModal, {
        propsData: { orderCode: '' },
        mocks: { $store: storeFor(locale) }
      })
      await wrapper.setData({ order: orderWith({ deliveryType }), isLoading: false })
      await wrapper.vm.$nextTick()
      return readRow(wrapper, '.info-item', 'label', 'span', translate(locale, 'orderModal_delivery'))
    }
  },
  {
    name: 'OrderModal (molecules) — the printable order view',
    async render (deliveryType, locale) {
      const wrapper = mount(OrderCardModal, {
        propsData: { order: orderWith({ deliveryType }) },
        mocks: { $store: storeFor(locale) },
        stubs: { Modal: MODAL_STUB }
      })
      await wrapper.vm.$nextTick()
      // 'Leveringsmetode' is a HARDCODED Norwegian literal in this component's template, not an `$i`
      // key, which is why the locator does not vary with the locale. Recorded, not fixed: it is the
      // row LABEL, a separate omission from the VALUE this lane is about, and the sibling payment
      // lane recorded the same thing one row above it.
      return readRow(wrapper, '.definition-list__item', 'dt', 'dd', 'Leveringsmetode')
    }
  }
]

const STATUS_SURFACES = [
  {
    name: 'OrderModal (organisms) — the order detail on /admin/orders',
    async render (status, locale) {
      const wrapper = mount(OrderDetailModal, {
        propsData: { orderCode: '' },
        mocks: { $store: storeFor(locale) }
      })
      await wrapper.setData({ order: orderWith({ status }), isLoading: false })
      await wrapper.vm.$nextTick()
      return readRow(wrapper, '.info-item', 'label', 'span', translate(locale, 'orderModal_statusLabel'))
    }
  },
  {
    name: 'OrderModal (molecules) — the printable order view',
    async render (status, locale) {
      const wrapper = mount(OrderCardModal, {
        propsData: { order: orderWith({ status }) },
        mocks: { $store: storeFor(locale) },
        stubs: { Modal: MODAL_STUB }
      })
      await wrapper.vm.$nextTick()
      return readRow(wrapper, '.definition-list__item', 'dt', 'dd', 'Status')
    }
  }
]

describe('the two maps are the backend enums, and nothing else', () => {
  it('declares every member of `Enums/DeliveryType.cs`, and the only extra is the known non-member', () => {
    expect(Object.keys(DELIVERY_TYPE_LABEL_KEYS).sort())
      .toEqual([...DELIVERY_MEMBERS, ...KNOWN_NON_MEMBERS].sort())
  })

  it('declares exactly the eight members `Enums/OrderStatus.cs` declares', () => {
    expect(Object.keys(ORDER_STATUS_LABEL_KEYS).sort()).toEqual([...STATUS_MEMBERS].sort())
  })

  it('resolves every member to a key all three dictionaries carry in their own right', () => {
    // `translate` falls back no -> en -> de, so a key present only in Norwegian renders Norwegian on
    // the German build and looks translated. Each dictionary is read directly for that reason.
    const keys = Object.values(DELIVERY_TYPE_LABEL_KEYS)
      .concat(Object.values(ORDER_STATUS_LABEL_KEYS))
      .concat(['orders_deliveryNotSet', 'orders_statusNotSet'])
    for (const key of keys) {
      for (const lang of ['no', 'en', 'de']) {
        expect([key, lang, typeof translations[lang][key]]).toEqual([key, lang, 'string'])
        expect([key, lang, translations[lang][key]]).not.toEqual([key, lang, ''])
      }
    }
  })

  it('routes rather than rewords: every Norwegian word the pre-lane switch returned is unchanged', () => {
    for (const [member, word] of Object.entries(PRE_LANE_NORWEGIAN.delivery)) {
      expect([member, translate('no', DELIVERY_TYPE_LABEL_KEYS[member])]).toEqual([member, word])
    }
    for (const [member, word] of Object.entries(PRE_LANE_NORWEGIAN.status)) {
      expect([member, translate('no', ORDER_STATUS_LABEL_KEYS[member])]).toEqual([member, word])
    }
  })
})

describe.each(DELIVERY_SURFACES)('deliveryTypeLabel on $name', ({ render }) => {
  it.each(BACKEND_DELIVERY_TYPES)('reads %s (%i) in Norwegian', async (member) => {
    expect([member, await render(member, 'no')]).toEqual([member, EXPECTED_DELIVERY_NO[member]])
  })

  it.each(BACKEND_DELIVERY_TYPES)('reads %s (%i) in German — the only language the CH build serves', async (member) => {
    expect([member, await render(member, 'de')]).toEqual([member, EXPECTED_DELIVERY_DE[member]])
  })

  it.each(NOT_MEMBERS)('answers the not-set fallback for %s, in every language', async (_why, value) => {
    for (const lang of ['no', 'en', 'de']) {
      expect([lang, await render(value, lang)]).toEqual([lang, NOT_SET.delivery[lang]])
    }
  })
})

describe.each(STATUS_SURFACES)('orderStatusLabel on $name', ({ render }) => {
  it.each(BACKEND_ORDER_STATUSES)('reads %s (%i) in Norwegian', async (member) => {
    expect([member, await render(member, 'no')]).toEqual([member, EXPECTED_STATUS_NO[member]])
  })

  it.each(BACKEND_ORDER_STATUSES)('reads %s (%i) in German — the only language the CH build serves', async (member) => {
    expect([member, await render(member, 'de')]).toEqual([member, EXPECTED_STATUS_DE[member]])
  })

  it.each(NOT_MEMBERS_STATUS)('answers the not-set fallback for %s, in every language', async (_why, value) => {
    for (const lang of ['no', 'en', 'de']) {
      expect([lang, await render(value, lang)]).toEqual([lang, NOT_SET.status[lang]])
    }
  })
})
