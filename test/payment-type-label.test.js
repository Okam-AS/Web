import fs from 'fs'
import path from 'path'
import { mount } from '@vue/test-utils'
// Both plugins are imported for their SIDE EFFECT. Each calls `Vue.mixin`, so what these mounts
// render is the shipped `paymentTypeLabel` and the shipped `$i` — not a stand-in written here. That
// distinction is the whole point of the file: a unit test over the label function passes on a
// component that never calls it, and the defect this replaces was invisible for exactly that reason.
import { PAYMENT_TYPE_LABEL_KEYS } from '~/plugins/global-mixin'
import '~/plugins/i18n'
import { translate } from '~/utils/i18n'
import translations from '~/translations'
import OrderCard from '~/components/molecules/OrderCard.vue'
import OrderCardModal from '~/components/molecules/OrderModal.vue'
import OrderDetailModal from '~/components/organisms/OrderModal.vue'

// ---- THE POPULATION -----------------------------------------------------------------------------
//
// Read from the BACKEND, never from the map or the component under test. Enumerating a switch from
// its own cases passes by construction — that is precisely how the ten-case ladder this replaces
// looked complete while seven members fell through it.
//
//   git -C /Users/svendaneel/okam/OkamAPI show 8e2b57de:Enums/PaymentType.cs
//
// Seventeen members. The numbers are carried so a reordering or a re-lettering of a member shows up
// here as a conflict rather than as a silent rename.
const BACKEND_PAYMENT_TYPES = [
  ['NotSet', 0],
  ['Giftcard', 75],
  ['PayInStore', 100],
  ['Cash', 110],
  ['CompanyAccount', 120],
  ['Stripe', 200],
  ['Vipps', 300],
  ['Dintero', 400],
  ['DinteroVipps', 410],
  ['DinteroBillie', 420],
  ['DinteroKlarna', 430],
  ['DinteroKravia', 440],
  ['DinteroTerminal', 450],
  ['WoltMarketplace', 500],
  ['Surfboard', 600],
  ['SurfboardVipps', 610],
  ['SurfboardTerminal', 650]
]

const MEMBERS = BACKEND_PAYMENT_TYPES.map(([name]) => name)

// ---- WHAT AN OPERATOR SHOULD READ ---------------------------------------------------------------
//
// Written out rather than derived from the dictionary on purpose. A test that resolves the expected
// word through the same map the component resolves it through cannot tell a MISSING arm from a WRONG
// one: both sides move together and every input agrees. These are the words themselves.
const EXPECTED_NO = {
  NotSet: 'Ingen betaling registrert',
  Giftcard: 'Betalt med gavekort',
  PayInStore: 'Betal i butikk',
  Cash: 'Betalt kontant',
  CompanyAccount: 'Betalt med bedriftskonto',
  Stripe: 'Betalt med kort',
  Vipps: 'Betalt med Vipps',
  Dintero: 'Betalt med Dintero',
  DinteroVipps: 'Betalt med Vipps',
  DinteroBillie: 'Betalt med Billie',
  DinteroKlarna: 'Betalt med Klarna',
  DinteroKravia: 'Betalt med Kravia',
  DinteroTerminal: 'Betalt med terminal',
  WoltMarketplace: 'Betalt via Wolt',
  Surfboard: 'Betalt med kort',
  SurfboardVipps: 'Betalt med Vipps',
  SurfboardTerminal: 'Betalt med terminal'
}

const EXPECTED_DE = {
  NotSet: 'Keine Zahlung erfasst',
  Giftcard: 'Mit Geschenkkarte bezahlt',
  PayInStore: 'Im Geschäft bezahlen',
  Cash: 'Bar bezahlt',
  CompanyAccount: 'Mit Firmenkonto bezahlt',
  Stripe: 'Mit Karte bezahlt',
  Vipps: 'Mit Vipps bezahlt',
  Dintero: 'Mit Dintero bezahlt',
  DinteroVipps: 'Mit Vipps bezahlt',
  DinteroBillie: 'Mit Billie bezahlt',
  DinteroKlarna: 'Mit Klarna bezahlt',
  DinteroKravia: 'Mit Kravia bezahlt',
  DinteroTerminal: 'Mit Terminal bezahlt',
  WoltMarketplace: 'Über Wolt bezahlt',
  Surfboard: 'Mit Karte bezahlt',
  SurfboardVipps: 'Mit Vipps bezahlt',
  SurfboardTerminal: 'Mit Terminal bezahlt'
}

const UNKNOWN = { no: 'Ukjent', en: 'Unknown', de: 'Unbekannt' }

// The seven that answered the unknown fallback before this change, named so the arm that proves the
// fix names them rather than counting them.
const WERE_UNKNOWN = ['NotSet', 'Cash', 'CompanyAccount', 'DinteroTerminal', 'Surfboard', 'SurfboardVipps', 'SurfboardTerminal']

// Values that are genuinely NOT payment types. `constructor` and `toString` are here because a bare
// `map[value]` lookup answers them with a function off Object.prototype; the rest are the shapes an
// absent or stale field actually arrives in.
const NOT_PAYMENT_TYPES = [
  ['an unrecognised member the backend might add tomorrow', 'Twint'],
  ['a member spelled in the wrong case', 'cash'],
  ['an inherited Object property', 'constructor'],
  ['another inherited Object property', 'toString'],
  ['an empty string', ''],
  ['null', null],
  ['undefined', undefined],
  ['a number', 110]
]

function storeFor (locale) {
  // `$i` reads `adminLocale` off the Vuex store, and the global mixin's `mounted` dispatches `Load`
  // and subscribes. Both are stubbed to nothing; the locale is the only state under test.
  return { state: { adminLocale: locale }, dispatch () {}, subscribe () {} }
}

function orderWith (paymentType) {
  return {
    id: 'order-1',
    orderCode: 'ABC123',
    friendlyOrderId: '1001',
    platform: 'Pos',
    status: 'Completed',
    deliveryType: 'SelfPickup',
    created: '2026-08-05T10:00:00',
    finalAmount: 24900,
    comment: '',
    items: [],
    paymentType
  }
}

// Finds the ONE row whose own label is the payment label and returns the word next to it. Throws
// rather than returning undefined when the row is not there: a moved or deleted row must fail
// loudly, not quietly pass an `undefined !== 'Ukjent'` assertion.
function readRow (wrapper, rowSelector, labelSelector, valueSelector, labelText) {
  try {
    const rows = wrapper.findAll(rowSelector).wrappers
      .filter(row => row.find(labelSelector).exists() && row.find(labelSelector).text().trim() === labelText)
    if (rows.length !== 1) {
      throw new Error(
        `expected exactly one "${labelText}" row under ${rowSelector}, found ${rows.length} — the ` +
        'payment row moved or is gated, so this surface is no longer being read'
      )
    }
    return rows[0].find(valueSelector).text().trim()
  } finally {
    wrapper.destroy()
  }
}

// `components/atoms/Modal.vue` nests `FocusTrap`, which declares its teardown in `unmounted()` — a
// Vue 3 hook this Vue 2 application never calls — and defers `activateTrap` onto a `setImmediate`.
// The trap therefore outlives the test and dereferences `document` after jest has torn the jsdom
// environment down, taking the whole worker with it. Stubbed, with the default slot preserved so the
// component's OWN template (which is where the payment row lives) still renders in full. The stale
// hook is a real defect in `FocusTrap.vue`; it is recorded, not fixed here.
const MODAL_STUB = { name: 'Modal', template: '<div class="modal-stub"><slot /></div>' }

// Three of the FOUR components that mount `paymentTypeLabel`, reached from
// `pages/admin/ongoing.vue` and `pages/admin/orders.vue`. The fourth — `ReceiptModal` — cannot be
// mounted by this repository's test toolchain at all: its template uses optional chaining
// (`order.user?.phoneNumber`, lines 51 and 55), vue-jest compiles the render function through
// `vue-template-es2015-compiler` (buble), and buble cannot parse `?.`. Importing it fails the whole
// suite before a single assertion runs. That is a PRE-EXISTING testability gap in that component,
// not something this change introduced, and it is recorded rather than papered over — see the
// source-level check at the bottom of this file, which is explicitly NOT a mounted assertion.
const SURFACES = [
  {
    name: 'OrderCard — the admin order list on /admin/ongoing',
    async render (paymentType, locale) {
      // The payment row lives behind `v-if="isExpanded"` (line 32), which is `expandedOrderId ===
      // order.id` — so the card has to be opened, exactly as the operator opens it, or the row is
      // not in the DOM at all and every assertion below would pass on an empty page.
      const wrapper = mount(OrderCard, {
        propsData: { order: orderWith(paymentType), expandedOrderId: 'order-1' },
        mocks: { $store: storeFor(locale) }
      })
      await wrapper.vm.$nextTick()
      return readRow(wrapper, '.info-item', 'label', 'span', translate(locale, 'orderCard_paymentLabel'))
    }
  },
  {
    name: 'OrderModal (organisms) — the order detail on /admin/orders',
    async render (paymentType, locale) {
      // `orderCode: ''` short-circuits this component's own `fetchOrder`, so no service is
      // constructed and no network shape is invented here; the order is then set as the fetch would
      // have set it.
      const wrapper = mount(OrderDetailModal, {
        propsData: { orderCode: '' },
        mocks: { $store: storeFor(locale) }
      })
      await wrapper.setData({ order: orderWith(paymentType), isLoading: false })
      await wrapper.vm.$nextTick()
      return readRow(wrapper, '.info-item', 'label', 'span', translate(locale, 'orderModal_payment'))
    }
  },
  {
    name: 'OrderModal (molecules) — the printable receipt view',
    async render (paymentType, locale) {
      const wrapper = mount(OrderCardModal, {
        propsData: { order: orderWith(paymentType) },
        mocks: { $store: storeFor(locale) },
        stubs: { Modal: MODAL_STUB }
      })
      await wrapper.vm.$nextTick()
      // 'Betaling' is a HARDCODED Norwegian literal in this component's template, not an `$i` key —
      // which is why the locator does not vary with the locale. Recorded, not fixed: it is the row
      // LABEL, a separate omission from the payment VALUE this lane is about.
      return readRow(wrapper, '.definition-list__item', 'dt', 'dd', 'Betaling')
    }
  }
]

describe('the map is the backend enum, and nothing else', () => {
  it('declares exactly the seventeen members `8e2b57de:Enums/PaymentType.cs` declares', () => {
    expect(Object.keys(PAYMENT_TYPE_LABEL_KEYS).sort()).toEqual([...MEMBERS].sort())
  })

  it('resolves every member to a key all three dictionaries carry in their own right', () => {
    // `translate` falls back no -> en -> de, so a key present only in Norwegian renders Norwegian on
    // the German build and looks translated. Each dictionary is read directly for that reason.
    for (const member of MEMBERS) {
      const key = PAYMENT_TYPE_LABEL_KEYS[member]
      for (const lang of ['no', 'en', 'de']) {
        expect([member, lang, translations[lang][key]]).toEqual([member, lang, expect.any(String)])
        expect(translations[lang][key]).not.toBe('')
      }
    }
  })

  it('carries the unknown fallback key in all three dictionaries too', () => {
    for (const lang of ['no', 'en', 'de']) {
      expect(translations[lang].orders_paymentUnknown).toBe(UNKNOWN[lang])
    }
  })
})

describe.each(SURFACES.map(s => [s.name, s]))('%s', (_name, surface) => {
  it.each(BACKEND_PAYMENT_TYPES)('renders a Norwegian operator can read for %s (= %i)', async (member) => {
    const rendered = await surface.render(member, 'no')
    expect(rendered).toBe(EXPECTED_NO[member])
    // Stated separately from the equality above so a future edit that makes the expectation table
    // wrong still cannot make "Ukjent" acceptable.
    expect(rendered).not.toBe(UNKNOWN.no)
  })

  it.each(WERE_UNKNOWN)('%s no longer reads "Ukjent"', async (member) => {
    expect(await surface.render(member, 'no')).not.toBe(UNKNOWN.no)
  })

  it.each(NOT_PAYMENT_TYPES)('still answers the unknown fallback for %s', async (_what, value) => {
    expect(await surface.render(value, 'no')).toBe(UNKNOWN.no)
  })
})

describe('the journey this lane exists for — a POS cash sale, read back by an operator', () => {
  // `components/admin/pos/PaymentScreen.vue` allocates `paymentType: 'Cash'`, the backend's
  // `PosSettlementService.DominantPaymentType` stamps the settled order with its largest tender, and
  // the operator then reads that order back in the admin list. No Meals order, no company account,
  // no unusual tender — and it said "Ukjent".
  it.each(SURFACES.map(s => [s.name, s]))('reads "Betalt kontant" on %s', async (_name, surface) => {
    expect(await surface.render('Cash', 'no')).toBe('Betalt kontant')
  })

  it.each(SURFACES.map(s => [s.name, s]))('reads "Betalt med terminal" for the card leg on %s', async (_name, surface) => {
    expect(await surface.render('SurfboardTerminal', 'no')).toBe('Betalt med terminal')
  })
})

describe('the Swiss build serves only German, and this switch could not', () => {
  // Before this change every one of the seventeen rendered a Norwegian literal on the German build —
  // including the ten that "worked". The ten are in this arm for that reason, not only the seven.
  it.each(BACKEND_PAYMENT_TYPES)('renders German for %s (= %i)', async (member) => {
    const rendered = await SURFACES[0].render(member, 'de')
    expect(rendered).toBe(EXPECTED_DE[member])
    // No German label coincides with its Norwegian one, so this is a real discriminator: it reds
    // the moment a label goes back to being a Norwegian literal in the mixin.
    expect(rendered).not.toBe(EXPECTED_NO[member])
  })

  it.each(NOT_PAYMENT_TYPES)('answers the German unknown fallback for %s', async (_what, value) => {
    expect(await SURFACES[0].render(value, 'de')).toBe(UNKNOWN.de)
  })
})

describe('ReceiptModal — the one mounting surface this toolchain cannot mount', () => {
  // NOT a mounted assertion, and it must never be mistaken for one. It states only that the fourth
  // surface renders the same expression the three mounted ones render, so the words proven above are
  // the words it shows. The reason it is a source read is in the comment on SURFACES.
  it('renders the same `paymentTypeLabel(order.paymentType)` expression the mounted surfaces do', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/molecules/ReceiptModal.vue'), 'utf8')
    expect(src).toContain('{{ paymentTypeLabel(order.paymentType) }}')
  })

  it('and still cannot be mounted, for the stated reason rather than a guessed one', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/molecules/ReceiptModal.vue'), 'utf8')
    const template = src.slice(0, src.indexOf('<script>'))
    // If this ever stops matching, the blocker is gone and this surface belongs in SURFACES above.
    expect(template).toMatch(/order\.user\?\./)
  })
})
