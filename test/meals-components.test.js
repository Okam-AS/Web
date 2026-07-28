import { mount } from '@vue/test-utils'
import MealsAgreementList from '~/components/admin/meals/MealsAgreementList.vue'
import MealsFundedOrders from '~/components/admin/meals/MealsFundedOrders.vue'
import { buildStoreView } from '~/utils/meals/store-view'
import { REFUSAL_DARK, REFUSAL_ABSENT, REFUSAL_FORBIDDEN } from '~/utils/meals/meals-client'
import translations from '~/translations'

const ACME = '11111111-1111-1111-1111-111111111111'
const BOLT = '22222222-2222-2222-2222-222222222222'

// The real Norwegian dictionary, resolved the way plugins/i18n.js resolves it, so these tests assert
// the copy a venue actually sees — and fail if a key was never added.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

// The admin's money formatter lives on the global mixin (plugins/global-mixin.js), which resolves
// `priceLabel` out of `~/core/helpers/tools` — a git submodule this repo carries no checkout of, so
// it cannot be imported here. These stand-ins reproduce its shape exactly (minor units in, "kr "
// prefix, space-grouped whole part, comma, two-digit fraction), the same faithful stand-ins the
// Workforce component tests use. What is under test is WHICH figure is rendered, never the grouping.
const wholeAmount = minor => String(Math.trunc(Math.abs(minor) / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const fractionAmount = minor => String(Math.abs(minor) % 100).padStart(2, '0')
const priceLabel = minor => 'kr ' + wholeAmount(minor) + ',' + fractionAmount(minor)

const mocks = { $i, priceLabel, wholeAmount, fractionAmount }

function agreement (over) {
  return Object.assign({
    companyId: ACME,
    legalName: 'Acme Industri AS',
    displayName: 'Acme',
    organizationNumber: '912345678',
    companyStatus: 'Active',
    agreementId: 'a-1',
    currency: 'NOK',
    agreementStatus: 'Active',
    activeMemberCount: 12
  }, over)
}

function order (over) {
  return Object.assign({
    orderId: 5001,
    storeId: 42,
    companyId: ACME,
    reservationId: 'r-1',
    reservationState: 'Captured',
    reservedCapMinor: 25000,
    boundCartTotalMinor: 18900,
    capturedMinor: 18900,
    currency: 'NOK',
    boundAtUtc: '2026-07-28T22:30:00',
    capturedAtUtc: '2026-07-28T22:41:12'
  }, over)
}

function renderAgreements (input) {
  const view = buildStoreView(input || { directory: [agreement()] })
  return mount(MealsAgreementList, { propsData: { agreements: view.agreements }, mocks })
}

function renderOrders (input, currency) {
  const view = buildStoreView(Object.assign({ directory: [agreement()], selectedCompanyId: ACME }, input))
  return mount(MealsFundedOrders, {
    propsData: {
      orders: view.orders,
      selected: view.selected,
      locale: 'no',
      currency: currency === undefined ? 'NOK' : currency
    },
    mocks
  })
}

describe('the agreement list — what the directory read is allowed to say', () => {
  test('an agreement is rendered with the fields the read carries, and no others', () => {
    const text = renderAgreements().text()
    expect(text).toContain('Acme')
    expect(text).toContain('Acme Industri AS')
    expect(text).toContain('912345678')
    expect(text).toContain('NOK')
    expect(text).toContain('12')
    expect(text).toContain(translations.no.meals_agreement_active)
  })

  // The directory read carries an agreement's CURRENCY and nothing else about money — no limit, no
  // balance, no spend. So the list may show a currency code and must show no amount.
  test('the list prints a currency code and never an amount', () => {
    const wrapper = renderAgreements()
    expect(wrapper.text()).toContain('NOK')
    expect(wrapper.text()).not.toContain('kr ')
  })

  test('an unknown directory says so, and does NOT say the venue has no agreements', () => {
    const wrapper = renderAgreements({ directory: null, directoryRefusal: REFUSAL_FORBIDDEN })
    expect(wrapper.text()).toContain(translations.no.meals_refusal_forbidden)
    expect(wrapper.text()).not.toContain(translations.no.meals_agreements_none)
    expect(wrapper.find('.meals-agreements__notice--unknown').exists()).toBe(true)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  test('an EMPTY directory makes the positive claim, in a different element', () => {
    const wrapper = renderAgreements({ directory: [] })
    expect(wrapper.text()).toContain(translations.no.meals_agreements_none)
    // The two states are not the same node wearing different text.
    expect(wrapper.find('.meals-agreements__notice--unknown').exists()).toBe(false)
  })

  // THE DARKNESS CLAIM. Meals hides which company and which agreement exist; it does not hide that
  // the module is deployed, because its 404 carries a problem document while an unrouted 404 carries
  // an empty body. The two sentences must therefore differ, and neither may overstate.
  test('dark and absent are two different sentences, and neither claims the module is invisible', () => {
    const dark = renderAgreements({ directory: null, directoryRefusal: REFUSAL_DARK }).text()
    const absent = renderAgreements({ directory: null, directoryRefusal: REFUSAL_ABSENT }).text()
    expect(dark).not.toBe(absent)

    // The dark sentence says the module answered and is switched off HERE — a claim the wire
    // supports — and it does not deny the module's existence.
    expect(dark).toContain('Modulen svarte')
    // The absent sentence is the one that admits ignorance about deployment.
    expect(absent).toContain('Vi vet ikke om modulen finnes her')
  })

  test('an archived company under a live agreement is said, not folded into the badge', () => {
    const wrapper = renderAgreements({ directory: [agreement({ companyStatus: 'Archived' })] })
    expect(wrapper.text()).toContain(translations.no.meals_company_archived)
    expect(wrapper.text()).toContain(translations.no.meals_agreement_active)
  })

  test('an unrecognised agreement status is shown verbatim with an unknown tone', () => {
    const wrapper = renderAgreements({ directory: [agreement({ agreementStatus: 'Suspended' })] })
    expect(wrapper.text()).toContain('Suspended')
    expect(wrapper.find('.meals-agreements__badge--unknown').exists()).toBe(true)
  })

  test('a null member count renders a dash, a zero renders a zero', () => {
    expect(renderAgreements({ directory: [agreement({ activeMemberCount: undefined })] }).text()).toContain('—')
    const zero = renderAgreements({ directory: [agreement({ activeMemberCount: 0 })] })
    expect(zero.findAll('td').at(4).text()).toBe('0')
  })

  test('clicking a row emits the company it belongs to', () => {
    const wrapper = renderAgreements()
    wrapper.find('.meals-agreements__row').trigger('click')
    expect(wrapper.emitted().select[0]).toEqual([ACME])
  })
})

describe('the funded orders table — money is read, never computed', () => {
  // THE LOAD-BEARING ONE. Three orders whose captured figures sum to something a reader could check
  // for. The sum is deliberately a value that appears nowhere else, so the assertion cannot pass by
  // coincidence, and the per-row figures are asserted PRESENT so it cannot pass by rendering nothing.
  test('every per-order figure is on screen and NO total of them is', () => {
    const rows = [
      order({ orderId: 5001, reservationId: 'r-1', capturedMinor: 18900 }),
      order({ orderId: 5002, reservationId: 'r-2', capturedMinor: 4500 }),
      order({ orderId: 5003, reservationId: 'r-3', capturedMinor: 7250 })
    ]
    const wrapper = renderOrders({ orders: { orders: rows } })
    const text = wrapper.text()

    // Positive control: the figures the total would have been built from are all rendered.
    expect(text).toContain(priceLabel(18900))
    expect(text).toContain(priceLabel(4500))
    expect(text).toContain(priceLabel(7250))

    const capturedSum = 18900 + 4500 + 7250 // 30650 — appears nowhere in the fixture
    const boundSum = 18900 * 3
    const capSum = 25000 * 3
    expect(text).not.toContain(priceLabel(capturedSum))
    expect(text).not.toContain(priceLabel(boundSum))
    expect(text).not.toContain(priceLabel(capSum))

    // And structurally: the table has no footer to put one in.
    expect(wrapper.find('tfoot').exists()).toBe(false)
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
  })

  test('a figure priced in another currency keeps its code and loses the symbol', () => {
    // The admin's own market is NOK; this agreement is settled in CHF. Printing "kr" over it would
    // relabel money.
    const wrapper = mount(MealsFundedOrders, {
      propsData: {
        orders: buildStoreView({
          directory: [agreement({ companyId: BOLT, currency: 'CHF' })],
          orders: { orders: [order({ companyId: BOLT, currency: 'CHF', capturedMinor: 4500 })] },
          selectedCompanyId: BOLT
        }).orders,
        selected: { label: 'Bolt' },
        locale: 'no',
        currency: 'NOK'
      },
      mocks
    })
    expect(wrapper.text()).toContain('45,00 CHF')
    expect(wrapper.text()).not.toContain('kr 45,00')

    // Positive control on the same component: a NOK row DOES get the symbol, so the assertion above
    // is about the currency and not about the formatter being broken.
    expect(renderOrders({ orders: { orders: [order({ capturedMinor: 4500 })] } }).text()).toContain(priceLabel(4500))
  })

  test('a refused amount renders a dash, never a zero', () => {
    const wrapper = renderOrders({ orders: { orders: [order({ reservedCapMinor: 250.5 })] } })
    const cells = wrapper.findAll('tbody td')
    expect(cells.at(2).text()).toBe('—')
    // Positive control: the neighbouring integer amount on the same row still prints.
    expect(cells.at(3).text()).toBe(priceLabel(18900))
  })
})

describe('the captured cell — the two zeros are visibly different', () => {
  const capturedCell = wrapper => wrapper.findAll('tbody td').at(4)

  test('nothing captured yet is a dash; captured-then-reversed-to-nothing is 0', () => {
    const notYet = capturedCell(renderOrders({
      orders: { orders: [order({ reservationState: 'Bound', capturedMinor: 0, capturedAtUtc: null })] }
    }))
    expect(notYet.text()).toBe('—')
    expect(notYet.classes()).toContain('is-capture-none')
    expect(notYet.attributes('title')).toBe(translations.no.meals_capture_none)

    const realZero = capturedCell(renderOrders({
      orders: { orders: [order({ capturedMinor: 0 })] }
    }))
    expect(realZero.text()).toBe(priceLabel(0))
    expect(realZero.classes()).toContain('is-capture-known')
  })

  test('a missing figure is a THIRD rendering, not the same dash as "not yet"', () => {
    const unknown = capturedCell(renderOrders({
      orders: { orders: [order({ capturedMinor: undefined, capturedAtUtc: null })] }
    }))
    const notYet = capturedCell(renderOrders({
      orders: { orders: [order({ reservationState: 'Bound', capturedMinor: 0, capturedAtUtc: null })] }
    }))

    expect(unknown.text()).toBe('—')
    expect(notYet.text()).toBe('—')
    // Same glyph, different claim — so the DOM must distinguish them.
    expect(unknown.classes()).not.toEqual(notYet.classes())
    expect(unknown.attributes('title')).not.toBe(notYet.attributes('title'))
    expect(unknown.attributes('title')).toBe(translations.no.meals_capture_unknown)
  })
})

describe('the orders panel — the three not-a-table states', () => {
  test('nothing selected asks for a selection, and claims nothing about any company', () => {
    const view = buildStoreView({ directory: [agreement()], orders: { orders: [order()] }, selectedCompanyId: null })
    const wrapper = mount(MealsFundedOrders, {
      propsData: { orders: view.orders, selected: null, locale: 'no', currency: 'NOK' },
      mocks
    })
    expect(wrapper.text()).toContain(translations.no.meals_orders_pick)
    expect(wrapper.text()).not.toContain(translations.no.meals_orders_none)
    expect(wrapper.find('table').exists()).toBe(false)
  })

  test('a failed orders read says so under the company\'s own name', () => {
    const wrapper = renderOrders({ orders: null, ordersRefusal: REFUSAL_FORBIDDEN })
    expect(wrapper.text()).toContain('Acme')
    expect(wrapper.text()).toContain(translations.no.meals_refusal_forbidden)
    expect(wrapper.text()).not.toContain(translations.no.meals_orders_none)
  })

  test('an empty orders read makes the positive claim', () => {
    const wrapper = renderOrders({ orders: { orders: [] } })
    expect(wrapper.text()).toContain(translations.no.meals_orders_none)
  })
})

describe('the reservation state is copied, not interpreted', () => {
  test('the four known states get their own labels and tones', () => {
    for (const [state, key] of [
      ['Reserved', 'meals_state_reserved'],
      ['Bound', 'meals_state_bound'],
      ['Captured', 'meals_state_captured'],
      ['Released', 'meals_state_released']
    ]) {
      const wrapper = renderOrders({ orders: { orders: [order({ reservationState: state })] } })
      expect(wrapper.find('.meals-orders__badge').text()).toBe(translations.no[key])
      expect(wrapper.find('.meals-orders__badge--unknown').exists()).toBe(false)
    }
  })

  test('a state this client has not heard of is shown verbatim, not renamed', () => {
    const wrapper = renderOrders({ orders: { orders: [order({ reservationState: 'Escheated' })] } })
    expect(wrapper.find('.meals-orders__badge').text()).toBe('Escheated')
    expect(wrapper.find('.meals-orders__badge--unknown').exists()).toBe(true)
  })
})

describe('key parity — every meals_ key exists in all three dictionaries', () => {
  test('no locale is missing a key the surface renders', () => {
    const keys = Object.keys(translations.no).filter(k => k.indexOf('meals_') === 0)
    expect(keys.length).toBeGreaterThan(30)
    for (const key of keys) {
      expect(typeof translations.en[key]).toBe('string')
      expect(typeof translations.de[key]).toBe('string')
    }
    // ...and no locale carries a meals_ key the Norwegian dictionary does not, which is how a
    // rename leaves an orphan behind.
    for (const locale of ['en', 'de']) {
      const extra = Object.keys(translations[locale]).filter(k => k.indexOf('meals_') === 0 && !keys.includes(k))
      expect(extra).toEqual([])
    }
  })

  test('the nav label the surface needs exists in all three', () => {
    for (const locale of ['no', 'en', 'de']) {
      expect(typeof translations[locale].nav_meals).toBe('string')
    }
  })
})
