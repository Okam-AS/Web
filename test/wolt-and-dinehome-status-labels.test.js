import { mount } from '@vue/test-utils'
// Both plugins are imported for their SIDE EFFECT. Each calls `Vue.mixin`, so what these mounts
// render is the shipped `woltDeliveryStatusLabel` / `dineHomeDeliveryStatusLabel` and the shipped
// `$i` — not a stand-in written here. A unit test over the label function alone would pass on a
// component that never calls it, which is the shape of gap this repository has shipped before.
import { WOLT_STATUS_LABEL_KEYS, DINE_HOME_STATUS_LABEL_KEYS } from '~/plugins/global-mixin'
import '~/plugins/i18n'
import { translate } from '~/utils/i18n'
import translations from '~/translations'
import OrderCard from '~/components/molecules/OrderCard.vue'

// ---- THE POPULATION -----------------------------------------------------------------------------
//
// Read from the BACKEND WRITE PATH, never from the map or the component under test. Enumerating a
// switch from its own cases passes by construction — that is how `paymentTypeLabel`'s ten-case ladder
// looked complete while seven backend members fell through it.
//
// For Wolt the enum is NOT the population, and the difference is the point of this file.
// `Enums/WoltStatus.cs` declares fifteen members, but only ELEVEN can ever reach
// `WoltDeliveryInfo.Status`:
//   • `OrderService.cs:419` creates every row with `WoltStatus.NotSet`.
//   • `WoltService.HandleWebhookEvent` assigns the incoming status ONLY if it is in the
//     `statusesToSave` allowlist at `WoltService.cs:502-513` — TEN members, `DropoffCompleted`
//     among them since `6454f3c71`.
// Every other event type is processed for ETA/tracking and leaves `Status` alone. The other three
// writers add nothing: the order-status mirror (`WoltService.cs:1104-1115`) produces only members
// already in the allowlist, so does `MapMarketplaceDeliveryStatus`, and the direct writes at
// `:1158`/`:1206` are `Delivered` and `OrderRejected`. Eleven = the ten-member allowlist + `NotSet`.
const PERSISTED_WOLT_STATUSES = [
  ['NotSet', 0],
  ['OrderReceived', 1],
  ['OrderRejected', 2],
  ['PickupStarted', 4],
  ['PickedUp', 5],
  ['PickupArrival', 6],
  ['DropoffStarted', 7],
  ['DropoffArrival', 8],
  ['DropoffCompleted', 9],
  ['Delivered', 10],
  ['CustomerNoShow', 11]
]

// Declared by the enum, never written to this column, and deliberately given NO word: inventing one
// would print a guess on an operator's screen. They must resolve the waiting fallback, which is what
// the switch's default already answered for them — asserted below rather than assumed.
const UNPERSISTED_WOLT_EVENTS = [
  ['PickupEtaUpdated', 3],
  ['LocationUpdated', 12],
  ['DropoffEtaUpdated', 13],
  ['HandshakeDelivery', 14]
]

// `Enums/DineHomeStatus.cs`, all six.
const BACKEND_DINE_HOME_STATUSES = [
  ['NotSet', 0],
  ['Accepted', 1],
  ['PickedUp', 2],
  ['ReachedDestination', 3],
  ['Completed', 4],
  ['Canceled', 5]
]

// ---- WHAT AN OPERATOR SHOULD READ ---------------------------------------------------------------
//
// Written out rather than resolved through the dictionary. A test that looks the expected word up
// through the same map the component looks it up through cannot tell a MISSING arm from a WRONG one:
// both sides move together on every input and the test agrees with itself. These are the words.
const EXPECTED_WOLT_NO = {
  NotSet: 'Venter på sjåfør',
  OrderReceived: 'Bestilling mottatt',
  OrderRejected: 'Bestilling avvist',
  PickupStarted: 'Henting startet',
  PickedUp: 'Hentet',
  PickupArrival: 'Sjåfør ankommer',
  DropoffStarted: 'Levering startet',
  DropoffArrival: 'Levering ankommer',
  DropoffCompleted: 'Levert hos kunde',
  Delivered: 'Levert',
  CustomerNoShow: 'Kunde møtte ikke'
}

const EXPECTED_WOLT_DE = {
  NotSet: 'Warten auf Fahrer',
  OrderReceived: 'Bestellung erhalten',
  OrderRejected: 'Bestellung abgelehnt',
  PickupStarted: 'Abholung gestartet',
  PickedUp: 'Abgeholt',
  PickupArrival: 'Fahrer trifft zur Abholung ein',
  DropoffStarted: 'Lieferung gestartet',
  DropoffArrival: 'Fahrer trifft zur Lieferung ein',
  DropoffCompleted: 'Beim Kunden zugestellt',
  Delivered: 'Geliefert',
  CustomerNoShow: 'Kunde nicht angetroffen'
}

const EXPECTED_DINE_HOME_NO = {
  NotSet: 'Venter aksept fra sjåfør',
  Accepted: 'Sjåfør har akseptert',
  PickedUp: 'Sjåfør leverer bestilling',
  ReachedDestination: 'Sjåfør fremme hos kunde',
  Completed: 'Fullført',
  Canceled: 'Sjåfør har kansellert'
}

const EXPECTED_DINE_HOME_DE = {
  NotSet: 'Warten auf Annahme durch Fahrer',
  Accepted: 'Fahrer hat angenommen',
  PickedUp: 'Fahrer liefert die Bestellung',
  ReachedDestination: 'Fahrer ist beim Kunden angekommen',
  Completed: 'Abgeschlossen',
  Canceled: 'Fahrer hat storniert'
}

// The exact Norwegian words each switch returned before this lane. Held separately from
// EXPECTED_*_NO so that "the words did not move" is asserted as its own claim: this was a ROUTING
// change, and a reworded Norwegian label would be a second, unreviewed change riding along.
const PRE_LANE_NORWEGIAN = {
  wolt: {
    OrderReceived: 'Bestilling mottatt',
    OrderRejected: 'Bestilling avvist',
    PickupStarted: 'Henting startet',
    PickedUp: 'Hentet',
    PickupArrival: 'Sjåfør ankommer',
    DropoffStarted: 'Levering startet',
    DropoffArrival: 'Levering ankommer',
    DropoffCompleted: 'Levert hos kunde',
    Delivered: 'Levert',
    CustomerNoShow: 'Kunde møtte ikke'
  },
  woltDefault: 'Venter på sjåfør',
  dineHome: {
    Accepted: 'Sjåfør har akseptert',
    PickedUp: 'Sjåfør leverer bestilling',
    ReachedDestination: 'Sjåfør fremme hos kunde',
    Completed: 'Fullført',
    Canceled: 'Sjåfør har kansellert'
  },
  dineHomeDefault: 'Venter aksept fra sjåfør'
}

const NOT_MEMBERS = [
  ['a value no enum declares', 'Teleported'],
  ['the empty string', ''],
  ['null', null],
  ['undefined', undefined],
  // A property every JS object answers to. `hasOwnProperty` is what keeps this from resolving a
  // function and rendering '[object Object]' at an operator.
  ['a prototype property name', 'constructor'],
  ['toString', 'toString']
]

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
    status: 'Processing',
    deliveryType: 'SelfPickup',
    paymentType: 'PayInStore',
    created: '2026-08-05T10:00:00',
    finalAmount: 24900,
    comment: '',
    items: []
  }, fields)
}

// Finds the ONE row whose own label is the row under test and returns the word next to it. Throws
// rather than returning undefined when the row is not there: both rows here are behind a
// `deliveryType` gate AND behind `isExpanded`, so a moved or gated row must fail loudly instead of
// quietly passing an `undefined !== 'Levert'` assertion.
function readRow (wrapper, labelText) {
  try {
    const rows = wrapper.findAll('.info-item').wrappers
      .filter(row => row.find('label').exists() && row.find('label').text().trim() === labelText)
    if (rows.length !== 1) {
      throw new Error(
        `expected exactly one "${labelText}" row, found ${rows.length} — the row moved or is gated, ` +
        'so this surface is no longer being read')
    }
    return rows[0].find('span').text().trim()
  } finally {
    wrapper.destroy()
  }
}

// The card has to be opened exactly as the operator opens it (`expandedOrderId === order.id`) or the
// row is not in the DOM at all.
async function renderWolt (status, locale) {
  const wrapper = mount(OrderCard, {
    propsData: {
      order: orderWith({ deliveryType: 'WoltDelivery', woltDeliveryInfo: { status } }),
      expandedOrderId: 'order-1'
    },
    mocks: { $store: storeFor(locale) }
  })
  await wrapper.vm.$nextTick()
  return readRow(wrapper, translate(locale, 'orderCard_woltStatusLabel'))
}

async function renderDineHome (dineHomeStatus, locale) {
  const wrapper = mount(OrderCard, {
    propsData: {
      order: orderWith({ deliveryType: 'DineHomeDelivery', dineHomeStatus }),
      expandedOrderId: 'order-1'
    },
    mocks: { $store: storeFor(locale) }
  })
  await wrapper.vm.$nextTick()
  return readRow(wrapper, translate(locale, 'orderCard_driverStatusLabel'))
}

describe('the two maps are the backend enums, and nothing else', () => {
  it('declares every status the Wolt write path can persist, and nothing else', () => {
    expect(Object.keys(WOLT_STATUS_LABEL_KEYS).sort())
      .toEqual(PERSISTED_WOLT_STATUSES.map(([n]) => n).sort())
  })

  it('declares exactly the six members `Enums/DineHomeStatus.cs` declares', () => {
    expect(Object.keys(DINE_HOME_STATUS_LABEL_KEYS).sort())
      .toEqual(BACKEND_DINE_HOME_STATUSES.map(([n]) => n).sort())
  })

  // A word for an event the column cannot hold is a guess printed at an operator. This is the arm
  // that keeps the map from growing one.
  it('invents no word for the four event types that never reach the status column', () => {
    for (const [member] of UNPERSISTED_WOLT_EVENTS) {
      expect([member, Object.prototype.hasOwnProperty.call(WOLT_STATUS_LABEL_KEYS, member)])
        .toEqual([member, false])
    }
  })

  it('resolves every member to a key all three dictionaries carry in their own right', () => {
    // `translate` falls back no -> en -> de, so a key present only in Norwegian renders Norwegian on
    // the German build and LOOKS translated. Each dictionary is read directly for that reason.
    const keys = Object.values(WOLT_STATUS_LABEL_KEYS)
      .concat(Object.values(DINE_HOME_STATUS_LABEL_KEYS))
      .concat(['orderCard_woltWaiting', 'orderCard_dineHomeWaiting'])
    for (const key of keys) {
      for (const lang of ['no', 'en', 'de']) {
        expect([key, lang, typeof translations[lang][key]]).toEqual([key, lang, 'string'])
        expect([key, lang, translations[lang][key]]).not.toEqual([key, lang, ''])
      }
    }
  })

  // The German half has to be a real discriminator. If any German value equalled its Norwegian one,
  // the German assertions below would pass on a surface that had never consulted the dictionary.
  it('gives every status a German word that differs from its Norwegian one', () => {
    for (const member of Object.keys(EXPECTED_WOLT_DE)) {
      expect([member, EXPECTED_WOLT_DE[member]]).not.toEqual([member, EXPECTED_WOLT_NO[member]])
    }
    for (const member of Object.keys(EXPECTED_DINE_HOME_DE)) {
      expect([member, EXPECTED_DINE_HOME_DE[member]]).not.toEqual([member, EXPECTED_DINE_HOME_NO[member]])
    }
  })

  it('routes rather than rewords: every Norwegian word the pre-lane switches returned is unchanged', () => {
    for (const [member, word] of Object.entries(PRE_LANE_NORWEGIAN.wolt)) {
      expect([member, translate('no', WOLT_STATUS_LABEL_KEYS[member])]).toEqual([member, word])
    }
    expect(translate('no', 'orderCard_woltWaiting')).toBe(PRE_LANE_NORWEGIAN.woltDefault)
    for (const [member, word] of Object.entries(PRE_LANE_NORWEGIAN.dineHome)) {
      expect([member, translate('no', DINE_HOME_STATUS_LABEL_KEYS[member])]).toEqual([member, word])
    }
    expect(translate('no', 'orderCard_dineHomeWaiting')).toBe(PRE_LANE_NORWEGIAN.dineHomeDefault)
  })
})

describe('woltDeliveryStatusLabel on the OrderCard — /admin/ongoing', () => {
  it.each(PERSISTED_WOLT_STATUSES)('reads %s (%i) in Norwegian', async (member) => {
    expect([member, await renderWolt(member, 'no')]).toEqual([member, EXPECTED_WOLT_NO[member]])
  })

  // THE ARM THIS LANE EXISTS FOR. Every one of these rendered a Norwegian literal on the German
  // build until this change, because the switch never consulted a dictionary in any language.
  it.each(PERSISTED_WOLT_STATUSES)('reads %s (%i) in German — the only language the CH build serves', async (member) => {
    expect([member, await renderWolt(member, 'de')]).toEqual([member, EXPECTED_WOLT_DE[member]])
  })

  it('reads the carried non-persisted DropoffCompleted in both languages', async () => {
    expect(await renderWolt('DropoffCompleted', 'no')).toBe(EXPECTED_WOLT_NO.DropoffCompleted)
    expect(await renderWolt('DropoffCompleted', 'de')).toBe(EXPECTED_WOLT_DE.DropoffCompleted)
  })

  // The four events that never reach the column, and everything the enum does not declare, answer
  // one sentence — the same one `NotSet` answers, which is what the switch's default did.
  it.each(UNPERSISTED_WOLT_EVENTS)('answers the waiting fallback for the %s event (%i)', async (member) => {
    for (const lang of ['no', 'en', 'de']) {
      expect([member, lang, await renderWolt(member, lang)])
        .toEqual([member, lang, translate(lang, 'orderCard_woltWaiting')])
    }
  })

  it.each(NOT_MEMBERS)('answers the waiting fallback for %s, in every language', async (_why, value) => {
    for (const lang of ['no', 'en', 'de']) {
      expect([lang, await renderWolt(value, lang)])
        .toEqual([lang, translate(lang, 'orderCard_woltWaiting')])
    }
  })
})

// This surface was ALREADY translated before the lane — by a local copy on the component that
// shadowed the mixin's untranslated one. These arms exist so that collapsing the two copies is
// proven not to have moved a single word, in any language, for any member.
describe('dineHomeDeliveryStatusLabel on the OrderCard, now served by the mixin alone', () => {
  it.each(BACKEND_DINE_HOME_STATUSES)('reads %s (%i) in Norwegian', async (member) => {
    expect([member, await renderDineHome(member, 'no')]).toEqual([member, EXPECTED_DINE_HOME_NO[member]])
  })

  it.each(BACKEND_DINE_HOME_STATUSES)('reads %s (%i) in German', async (member) => {
    expect([member, await renderDineHome(member, 'de')]).toEqual([member, EXPECTED_DINE_HOME_DE[member]])
  })

  it.each(NOT_MEMBERS)('answers the waiting fallback for %s, in every language', async (_why, value) => {
    for (const lang of ['no', 'en', 'de']) {
      expect([lang, await renderDineHome(value, lang)])
        .toEqual([lang, translate(lang, 'orderCard_dineHomeWaiting')])
    }
  })

  // The defect was TWO copies, so the fix is checkable as "there is now one". A second
  // implementation on the component would shadow the mixin again and this whole file would go on
  // passing while the mixin rotted, which is exactly how the pair survived until now.
  it('is defined once in the estate: the component carries no copy of its own', () => {
    expect(Object.keys(OrderCard.methods || {})).not.toContain('dineHomeDeliveryStatusLabel')
    expect(Object.keys(OrderCard.methods || {})).not.toContain('woltDeliveryStatusLabel')
  })
})
