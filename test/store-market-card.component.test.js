import { mount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the component is
// imported, and `jest.mock` is hoisted above imports while the component import is not.
import StoreMarketCard from '~/components/admin/StoreMarketCard.vue'
import { StoreMarketApiError } from '~/utils/store-market/market-client'
import translations from '~/translations'

// The market card. What is under test is what a VENUE OWNER reads — the seven refusals in
// particular, and above all that the two 409s read as "this store is operating" rather than as a
// typo, in their own non-red panel.
//
// `classifyRefusal` is deliberately the REAL one: the card's whole error story is that function's
// output, and a stubbed classifier would let the card pass while classifying nothing.

const mockCalls = []
let mockGetAnswer = null
let mockPutAnswer = null

jest.mock('~/utils/store-market/market-client', () => {
  const actual = jest.requireActual('~/utils/store-market/market-client')
  return Object.assign({}, actual, {
    StoreMarketService: class {
      Get (storeId) {
        mockCalls.push(['Get', storeId])
        return mockGetAnswer(storeId)
      }

      Update (storeId, attempted) {
        mockCalls.push(['Update', storeId, attempted])
        return mockPutAnswer(storeId, attempted)
      }
    }
  })
})

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

// The real Norwegian dictionary, resolved the way plugins/i18n.js resolves it, so these tests assert
// the copy a venue actually sees — and fail if a key was never added.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

const market = over => Object.assign({
  storeId: 1,
  country: 'NO',
  currencyCode: 'NOK',
  timeZone: 'Europe/Oslo',
  effectiveTimeZone: 'Europe/Oslo',
  timeZoneIsFallback: false,
  isConfigured: true
}, over)

const refuse = (status, code, message, state) =>
  Promise.reject(new StoreMarketApiError(status, { code, message, market: state }))

function mountCard (storeId) {
  return mount(StoreMarketCard, {
    propsData: { storeId: storeId === undefined ? 1 : storeId },
    mocks: { $i, _coreInitializer: { bearerToken: 'tok' } }
  })
}

/** Mounts, waits for the load, opens the form and edits it. */
async function editing (loaded, draft) {
  mockGetAnswer = () => Promise.resolve(loaded)
  const card = mountCard()
  await settled()
  card.vm.startEdit()
  await card.vm.$nextTick()
  if (draft) { card.setData({ draft: Object.assign({}, card.vm.draft, draft) }) }
  await card.vm.$nextTick()
  return card
}

/** Edits, submits, and returns the card once the refusal (or the save) has landed. */
async function saving (loaded, draft, answer) {
  const card = await editing(loaded, draft)
  mockPutAnswer = answer
  card.find('form').trigger('submit')
  await settled()
  await card.vm.$nextTick()
  return card
}

beforeEach(() => {
  mockCalls.length = 0
  mockGetAnswer = () => Promise.resolve(market())
  mockPutAnswer = () => Promise.resolve(market())
})

describe('the read — what the store\'s market is now', () => {
  test('it reads the market for the selected store on mount', async () => {
    mountCard(7)
    await settled()
    expect(mockCalls).toEqual([['Get', 7]])
  })

  test('it shows country, the derived currency and the zone', async () => {
    const card = mountCard()
    await settled()

    const text = card.text()
    expect(text).toContain('NO')
    expect(text).toContain('NOK')
    expect(text).toContain('Europe/Oslo')
    expect(text).toContain(translations.no.sm_currency_is_derived)
  })

  test('with no store selected it reads nothing and says so', async () => {
    const card = mountCard(null)
    await settled()
    expect(mockCalls).toHaveLength(0)
    expect(card.text()).toContain(translations.no.sm_no_store)
  })

  test('a failed read says we do not know, NOT that the store has no market', async () => {
    mockGetAnswer = () => Promise.reject(new StoreMarketApiError(500, null))
    const card = mountCard()
    await settled()

    expect(card.text()).toContain(translations.no.sm_read_failed)
    expect(card.text()).not.toContain(translations.no.sm_not_set)
  })

  test('a store with no country is told that no week can be published', async () => {
    mockGetAnswer = () => Promise.resolve(market({ country: null, currencyCode: null, timeZone: null, timeZoneIsFallback: true, isConfigured: false }))
    const card = mountCard()
    await settled()

    expect(card.text()).toContain(translations.no.sm_no_country_warning)
  })

  test('a store in a country with no rule pack is told so, in its own words', async () => {
    mockGetAnswer = () => Promise.resolve(market({ country: 'CH', currencyCode: 'CHF' }))
    const card = mountCard()
    await settled()

    expect(card.text()).toContain($i('sm_no_rulepack_warning', { country: 'CH' }))
    // Not the "no country at all" sentence — a different fact needs a different sentence.
    expect(card.text()).not.toContain(translations.no.sm_no_country_warning)
  })

  test('an unset zone is reported as the platform default in force, not as blank', async () => {
    mockGetAnswer = () => Promise.resolve(market({ timeZone: null, timeZoneIsFallback: true, isConfigured: false }))
    const card = mountCard()
    await settled()

    expect(card.text()).toContain('Europe/Oslo')
    expect(card.text()).toContain(translations.no.sm_zone_is_platform_default)
    expect(card.text()).toContain($i('sm_zone_fallback_warning', { zone: 'Europe/Oslo' }))
  })
})

describe('the form — the market is the only input', () => {
  test('there is no currency input, at all', async () => {
    const card = await editing(market())

    const names = card.findAll('input, select, textarea')
    const ids = []
    for (let i = 0; i < names.length; i++) { ids.push(names.at(i).attributes('id')) }

    expect(ids).toEqual(['store-market-country', 'store-market-zone'])
    expect(card.find('#store-market-currency').exists()).toBe(false)
  })

  test('the currency is shown as a consequence of the country', async () => {
    const card = await editing(market())
    expect(card.text()).toContain($i('sm_currency_consequence', { currency: 'NOK' }))
  })

  test('only Norway is offered, and the reason the list is short is on screen', async () => {
    const card = await editing(market())

    const options = card.findAll('#store-market-country option')
    const values = []
    for (let i = 0; i < options.length; i++) { values.push(options.at(i).attributes('value')) }

    expect(values).toEqual(['', 'NO'])
    expect(card.text()).toContain(translations.no.sm_country_help)
  })

  test('a store already outside the offer keeps its own option and is warned at the point of choosing', async () => {
    const card = await editing(market({ country: 'CH', currencyCode: 'CHF' }))

    const options = card.findAll('#store-market-country option')
    const values = []
    for (let i = 0; i < options.length; i++) { values.push(options.at(i).attributes('value')) }

    expect(values).toEqual(['', 'CH', 'NO'])
    // The choice is selected, so the warning is right there rather than two screens away.
    expect(card.text()).toContain($i('sm_choice_no_rulepack_warning', { country: 'CH' }))
  })

  test('choosing Norway clears the rule-pack warning', async () => {
    const card = await editing(market({ country: 'CH', currencyCode: 'CHF' }), { country: 'NO' })
    expect(card.text()).not.toContain($i('sm_choice_no_rulepack_warning', { country: 'CH' }))
  })

  test('the zone field seeds from the CHOSEN zone only, never from the platform default', async () => {
    const chosen = await editing(market())
    expect(chosen.vm.draft.timeZone).toBe('Europe/Oslo')

    // Pre-filling the fallback would let a save turn the platform's default into this venue's
    // decision without anybody making it — exactly what the backend refuses to do for the caller.
    const fallback = await editing(market({ timeZone: null, timeZoneIsFallback: true }))
    expect(fallback.vm.draft.timeZone).toBe('')
  })

  test('the zone field suggests the runtime IANA list without closing the set', async () => {
    const card = await editing(market())

    expect(card.find('#store-market-zone').attributes('list')).toBe('store-market-zones')
    expect(card.findAll('#store-market-zones option').length).toBeGreaterThan(100)
    // Free text: the backend also accepts Windows ids, and validation belongs to the server.
    expect(card.find('#store-market-zone').attributes('type')).toBe('text')
  })

  test('saving sends the country, the zone, and the currency only as an ASSERTION', async () => {
    const card = await editing(market(), { country: 'NO', timeZone: 'Europe/Oslo' })
    card.find('form').trigger('submit')
    await settled()

    expect(mockCalls[mockCalls.length - 1]).toEqual(['Update', 1, {
      country: 'NO', timeZone: 'Europe/Oslo', expectedCurrencyCode: 'NOK'
    }])
  })

  test('an empty zone is SENT rather than blocked, so the platform gives the real answer', async () => {
    const card = await editing(market({ timeZone: null, timeZoneIsFallback: true }))
    expect(card.find('button[type="submit"]').attributes('disabled')).toBeUndefined()

    card.find('form').trigger('submit')
    await settled()
    expect(mockCalls[mockCalls.length - 1][2].timeZone).toBe('')
  })
})

describe('a successful save', () => {
  test('the new state is on screen without a re-read and without a refresh', async () => {
    const card = await saving(
      market({ timeZone: null, timeZoneIsFallback: true, isConfigured: false }),
      { country: 'NO', timeZone: 'Europe/Oslo' },
      () => Promise.resolve(market()))

    expect(card.text()).toContain(translations.no.sm_saved)
    expect(card.text()).toContain('Europe/Oslo')
    expect(card.text()).not.toContain(translations.no.sm_zone_is_platform_default)
    // Exactly one read, at mount — the PUT's own answer is the new state.
    expect(mockCalls.filter(c => c[0] === 'Get')).toHaveLength(1)
    // And the form has closed.
    expect(card.find('form').exists()).toBe(false)
  })
})

describe('the two 409s — "this store is operating", not "you typed something wrong"', () => {
  test('the zone conflict reads as an operating store, in its own non-red panel', async () => {
    const card = await saving(
      market(),
      { country: 'NO', timeZone: 'America/New_York' },
      () => refuse(409, 'store.market.timezone-change-unsafe',
        'This store already has schedule history recorded against Europe/Oslo.', market()))

    const panel = card.find('.market-card__refusal')
    expect(panel.exists()).toBe(true)

    // The heading names the reason. It is not "the market was not saved" and nothing else.
    expect(panel.text()).toContain(translations.no.sm_operating_heading)
    expect(panel.text()).not.toContain(translations.no.sm_not_saved_heading)

    // The sentence names both clocks and says a migration is what this needs.
    expect(panel.text()).toContain('Europe/Oslo')
    expect(panel.text()).toContain('America/New_York')
    expect(panel.text()).toContain('datamigrering')
    expect(panel.text()).toContain('ikke noe du har skrevet feil')

    // The panel is the operating variant, NOT the red validation one.
    expect(panel.classes()).toContain('market-card__refusal--operating')
    expect(panel.classes()).not.toContain('market-card__refusal--blocked')
  })

  test('the currency conflict reads the same way and names the label the money carries', async () => {
    const card = await saving(
      market({ country: 'CH', currencyCode: 'CHF' }),
      { country: 'NO' },
      () => refuse(409, 'store.market.currency-change-unsafe',
        'This store already has money recorded while it was labelled CHF.',
        market({ country: 'CH', currencyCode: 'CHF' })))

    const panel = card.find('.market-card__refusal')
    expect(panel.text()).toContain(translations.no.sm_operating_heading)
    expect(panel.text()).toContain('CHF')
    expect(panel.text()).toContain('datamigrering')
    expect(panel.classes()).toContain('market-card__refusal--operating')
  })

  test('a refusal leaves the facts above the form true — the store\'s market, not what was typed', async () => {
    const card = await saving(
      market(),
      { country: 'NO', timeZone: 'America/New_York' },
      () => refuse(409, 'store.market.timezone-change-unsafe', 'prose', market()))

    expect(card.text()).toContain(translations.no.sm_unchanged_note)
    // The zone shown is still the store's own, never the rejected one.
    expect(card.find('.market-card__facts').text()).toContain('Europe/Oslo')
    expect(card.find('.market-card__facts').text()).not.toContain('America/New_York')
  })
})

describe('the five 400s — the values are the place to look', () => {
  const cases = [
    ['store.market.country-invalid', { country: 'ZZ', timeZone: 'Europe/Oslo' }, 'ZZ'],
    ['store.market.currency-underivable', { country: 'AQ', timeZone: 'Europe/Oslo' }, 'AQ'],
    ['store.market.timezone-unresolvable', { country: 'NO', timeZone: 'Oslo/Norway' }, 'Oslo/Norway'],
    ['store.market.timezone-missing', { country: 'NO', timeZone: '' }, 'Landet bestemmer den ikke']
  ]

  cases.forEach(([code, draft, expected]) => {
    test(code + ' renders as a validation failure the operator can act on', async () => {
      const card = await saving(market(), draft, () => refuse(400, code, 'server prose', market()))

      const panel = card.find('.market-card__refusal')
      expect(panel.text()).toContain(translations.no.sm_not_saved_heading)
      expect(panel.text()).not.toContain(translations.no.sm_operating_heading)
      expect(panel.text()).toContain(expected)
      expect(panel.classes()).toContain('market-card__refusal--blocked')
      // And the form stays open, because sending different values is the fix.
      expect(card.find('form').exists()).toBe(true)
    })
  })

  test('saving with no country chosen reads as "none chosen", never as «»', async () => {
    const card = await saving(
      market({ country: null, currencyCode: null, timeZone: null, timeZoneIsFallback: true }),
      null,
      () => refuse(400, 'store.market.country-invalid', "'(none)' is not an ISO 3166-1 alpha-2 country code.", market({ country: null, currencyCode: null })))

    const panel = card.find('.market-card__refusal')
    expect(panel.text()).toContain(translations.no.sm_refuse_country_missing)
    expect(panel.text()).not.toContain('«»')
  })

  test('currency-not-authoritative blames the configuration and keeps the platform\'s sentence', async () => {
    const card = await saving(
      market(), { country: 'NO', timeZone: 'Europe/Oslo' },
      () => refuse(400, 'store.market.currency-not-authoritative',
        'Country \'NO\' implies NOK, not EUR.', market()))

    const panel = card.find('.market-card__refusal')
    expect(panel.text()).toContain('markedsoppsettet som må rettes, ikke noe du har skrevet')
    // Only the platform's own words carry the currency it actually derived.
    expect(panel.text()).toContain(translations.no.sm_platform_said)
    expect(panel.text()).toContain('Country \'NO\' implies NOK, not EUR.')
  })
})

describe('the refusals that carry no code of their own', () => {
  test('403 says you may not, not that the market is wrong', async () => {
    const card = await saving(market(), null, () => Promise.reject(new StoreMarketApiError(403, null)))
    expect(card.find('.market-card__refusal').text()).toContain(translations.no.sm_refuse_denied)
  })

  test('a code this page does not know shows the platform\'s answer verbatim', async () => {
    const card = await saving(market(), null,
      () => refuse(400, 'store.market.something-new', 'A brand new reason.', market()))

    const panel = card.find('.market-card__refusal')
    expect(panel.text()).toContain(translations.no.sm_refuse_untyped)
    expect(panel.text()).toContain('A brand new reason.')
  })

  test('no answer at all says nothing was decided', async () => {
    const card = await saving(market(), null, () => Promise.reject(new TypeError('Failed to fetch')))
    expect(card.find('.market-card__refusal').text()).toContain(translations.no.sm_refuse_transport)
  })
})

// -------------------------------------------------------------------------------------------------
// SWITZERLAND IS REACHABLE.
//
// This estate's signature defect is a capability with no caller, and the market card was most of one:
// the endpoint accepted CH, the platform advertised CH in `offeredCountries`, the card rendered a
// country dropdown — and the dropdown was built by intersecting this app's registry with the
// Workforce rule-pack list, which is `['NO']`. So a venue owner could read a Swiss market but never
// set one, and every test above this line passed while that was true.
//
// These assert the OPTION AN OWNER CAN CLICK, not the helper that computes it, because the helper was
// never the thing that was wrong.
describe('a venue owner can actually move a store to Switzerland', () => {
  const offering = over => market(Object.assign({ offeredCountries: ['CH', 'NO'] }, over))

  test('the country dropdown contains Switzerland when the platform offers it', async () => {
    const card = await editing(offering())
    const values = card.findAll('#store-market-country option').wrappers.map(o => o.attributes('value'))
    expect(values).toContain('CH')
    expect(values).toContain('NO')
  })

  test('choosing it announces CHF as the consequence, and says so before saving', async () => {
    const card = await editing(offering(), { country: 'CH' })
    expect(card.find('.market-card__consequence').text())
      .toBe($i('sm_currency_consequence', { currency: 'CHF' }))
  })

  test('choosing it warns that Workforce has no rule pack, rather than hiding the market', async () => {
    const card = await editing(offering(), { country: 'CH' })
    expect(card.text()).toContain($i('sm_choice_no_rulepack_warning', { country: 'CH' }))
  })

  test('saving sends the country and the asserted currency to the platform', async () => {
    const card = await editing(offering(), { country: 'CH', timeZone: 'Europe/Zurich' })
    mockPutAnswer = () => Promise.resolve(offering({ country: 'CH', currencyCode: 'CHF', timeZone: 'Europe/Zurich' }))
    card.find('form').trigger('submit')
    await settled()

    const [, , attempted] = mockCalls.find(call => call[0] === 'Update')
    expect(attempted).toEqual({ country: 'CH', timeZone: 'Europe/Zurich', expectedCurrencyCode: 'CHF' })
  })

  test('the saved Swiss market is what the card then shows', async () => {
    const card = await editing(offering(), { country: 'CH', timeZone: 'Europe/Zurich' })
    mockPutAnswer = () => Promise.resolve(offering({ country: 'CH', currencyCode: 'CHF', timeZone: 'Europe/Zurich' }))
    card.find('form').trigger('submit')
    await settled()
    await card.vm.$nextTick()

    const facts = card.find('.market-card__facts').text()
    expect(facts).toContain('CH')
    expect(facts).toContain('CHF')
    expect(facts).toContain('Europe/Zurich')
  })

  test('with no stated offer the dropdown stays as narrow as it was', async () => {
    // An older platform that does not publish its offer must not have one invented for it.
    const card = await editing(market())
    const values = card.findAll('#store-market-country option').wrappers.map(o => o.attributes('value'))
    expect(values).not.toContain('CH')
  })
})

// -------------------------------------------------------------------------------------------------
// WHAT THE PLATFORM REPORTS AND THIS CARD USED TO SWALLOW.
//
// The payload below is not invented — it is `GET /stores/1/market` from a backend built from
// august-release, seeded by Scripts/demo/demo-up.sh and read on 2026-08-11. Three of its fields were
// being ignored by this card, and each one is a thing the platform deliberately reports rather than
// smooths over.
const LIVE_AUGUST_RELEASE_PAYLOAD = {
  storeId: 1,
  marketId: 'NO',
  country: 'NO',
  countryIsFallback: false,
  currencyCode: null,
  effectiveCurrencyCode: 'NOK',
  currencyIsFallback: true,
  locale: null,
  effectiveLocale: 'nb-NO',
  localeIsFallback: true,
  timeZone: 'Europe/Oslo',
  effectiveTimeZone: 'Europe/Oslo',
  timeZoneIsFallback: false,
  timeZoneIsHonoured: false,
  vatLabel: 'MVA',
  vatStandardRate: 25.0,
  marketRowInconsistent: false,
  isConfigured: false,
  offeredCountries: ['CH', 'NO']
}

describe('the card reports what the platform reports', () => {
  test('a stored zone the platform does not read is marked as not read', async () => {
    mockGetAnswer = () => Promise.resolve(LIVE_AUGUST_RELEASE_PAYLOAD)
    const card = mountCard()
    await settled()

    // Both halves: the badge on the value, and the sentence saying what is cut on Oslo time instead.
    expect(card.text()).toContain(translations.no.sm_zone_ignored_badge)
    expect(card.text()).toContain(translations.no.sm_zone_ignored_warning)
  })

  test('a zone the platform DOES read is not marked', async () => {
    mockGetAnswer = () => Promise.resolve(market({ timeZoneIsHonoured: true }))
    const card = mountCard()
    await settled()
    expect(card.text()).not.toContain(translations.no.sm_zone_ignored_badge)
  })

  test('an older answer that says nothing about the zone is not read as a denial', async () => {
    // `timeZoneIsHonoured` absent must not render "not read" — that would be this card inventing a
    // claim the platform never made.
    mockGetAnswer = () => Promise.resolve(market())
    const card = mountCard()
    await settled()
    expect(card.text()).not.toContain(translations.no.sm_zone_ignored_badge)
  })

  test('a currency nobody chose shows what the platform actually charges, and says it is a default', async () => {
    mockGetAnswer = () => Promise.resolve(LIVE_AUGUST_RELEASE_PAYLOAD)
    const card = mountCard()
    await settled()

    const facts = card.find('.market-card__facts').text()
    // The store trades in NOK. Rendering only the null stored choice printed "not set" for a store
    // the platform was charging in kroner.
    expect(facts).toContain('NOK')
    expect(facts).not.toContain(translations.no.sm_not_set)
    expect(facts).toContain(translations.no.sm_zone_is_platform_default)
  })

  test('a self-contradicting market row is reported, and names the repair', async () => {
    mockGetAnswer = () => Promise.resolve(market({
      country: 'CH', currencyCode: 'NOK', effectiveCurrencyCode: 'CHF', marketRowInconsistent: true
    }))
    const card = mountCard()
    await settled()

    // Every consumer money read throws for such a store, so this is a blocked-style panel, and it
    // states the currency a repairing save will store.
    const panel = card.find('.market-card__refusal--blocked')
    expect(panel.exists()).toBe(true)
    expect(panel.text()).toContain('CHF')
  })

  test('a consistent row shows no such panel', async () => {
    mockGetAnswer = () => Promise.resolve(LIVE_AUGUST_RELEASE_PAYLOAD)
    const card = mountCard()
    await settled()
    expect(card.find('.market-card__refusal--blocked').exists()).toBe(false)
  })

  test('the live payload offers CH, so the store can be moved there', async () => {
    // The whole point, asserted against the real answer rather than a fixture I chose.
    const card = await editing(LIVE_AUGUST_RELEASE_PAYLOAD)
    const values = card.findAll('#store-market-country option').wrappers.map(o => o.attributes('value'))
    expect(values).toContain('CH')
  })
})
