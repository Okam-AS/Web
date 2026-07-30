import { StoreMarketApiError } from '~/utils/store-market/market-client'
import {
  classifyRefusal,
  countryOptions,
  hasRulePack,
  marketFacts,
  optionFor,
  zoneSuggestions,
  RULE_PACK_COUNTRIES,
  REFUSAL_SHAPE,
  REFUSAL_OPERATING,
  REFUSAL_DENIED,
  REFUSAL_UNAUTHENTICATED,
  REFUSAL_MISSING,
  REFUSAL_UNTYPED,
  REFUSAL_TRANSPORT
} from '~/utils/store-market/market-view'
import translations from '~/translations'

// The judgement the market card runs on. The load-bearing claim is the SPLIT: a 400 is a validation
// failure the operator can fix, and the two 409s are not — they say the store is operating. A
// classifier that collapsed them would send a venue owner hunting for a typo that does not exist.

const refuse = (status, code, message, market) =>
  new StoreMarketApiError(status, { code, message, market })

const market = over => Object.assign({
  storeId: 1,
  country: 'NO',
  currencyCode: 'NOK',
  timeZone: 'Europe/Oslo',
  effectiveTimeZone: 'Europe/Oslo',
  timeZoneIsFallback: false,
  isConfigured: true
}, over)

// The real Norwegian dictionary, resolved the way plugins/i18n.js resolves it, so a missing key
// fails these tests instead of degrading to the key name in the owner's browser.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

/** The sentence a venue owner actually reads for a refusal, fully interpolated. */
const sentenceFor = refusal => $i(refusal.key, refusal.params)

describe('the refusal split — a wrong value versus an operating store', () => {
  test('all five 400s are shape refusals: the values are the place to look', () => {
    const codes = [
      'store.market.country-invalid',
      'store.market.currency-underivable',
      'store.market.currency-not-authoritative',
      'store.market.timezone-missing',
      'store.market.timezone-unresolvable'
    ]

    codes.forEach((code) => {
      const refusal = classifyRefusal(refuse(400, code, 'server prose', market()), {}, market())
      expect(refusal.kind).toBe(REFUSAL_SHAPE)
      expect(refusal.code).toBe(code)
    })
  })

  test('both 409s are OPERATING refusals, not validation errors', () => {
    const zone = classifyRefusal(
      refuse(409, 'store.market.timezone-change-unsafe', 'prose', market()),
      { country: 'NO', timeZone: 'America/New_York' }, market())
    const money = classifyRefusal(
      refuse(409, 'store.market.currency-change-unsafe', 'prose', market()),
      { country: 'SE', timeZone: 'Europe/Oslo' }, market())

    expect(zone.kind).toBe(REFUSAL_OPERATING)
    expect(money.kind).toBe(REFUSAL_OPERATING)
    expect(zone.kind).not.toBe(REFUSAL_SHAPE)
    expect(money.kind).not.toBe(REFUSAL_SHAPE)
  })

  test('every one of the seven codes has a sentence of its own — no two share one', () => {
    const codes = [
      'store.market.country-invalid',
      'store.market.currency-underivable',
      'store.market.currency-not-authoritative',
      'store.market.timezone-missing',
      'store.market.timezone-unresolvable',
      'store.market.timezone-change-unsafe',
      'store.market.currency-change-unsafe'
    ]

    const keys = codes.map(code => classifyRefusal(refuse(400, code, 'prose', market()), {}, market()).key)
    expect(new Set(keys).size).toBe(7)
    keys.forEach((key) => {
      // A key with no entry in the dictionary would render as the key name itself.
      expect(translations.no[key]).toBeDefined()
    })
  })
})

describe('what the two 409s say to a venue owner', () => {
  test('the zone conflict says the store is operating and names both clocks', () => {
    const refusal = classifyRefusal(
      refuse(409, 'store.market.timezone-change-unsafe', 'prose', market()),
      { country: 'NO', timeZone: 'America/New_York' },
      market())

    const sentence = sentenceFor(refusal)
    expect(sentence).toContain('Europe/Oslo')
    expect(sentence).toContain('America/New_York')
    // It must say what already exists, and that this is not a typo.
    expect(sentence).toContain('historikk')
    expect(sentence).toContain('datamigrering')
    expect(sentence).toContain('ikke noe du har skrevet feil')
    // And the heading it renders under says the store is operating, not that a field is wrong.
    expect(translations.no.sm_operating_heading).toBe('Butikken er i drift')
  })

  test('the currency conflict names the label the money already carries', () => {
    const refusal = classifyRefusal(
      refuse(409, 'store.market.currency-change-unsafe', 'prose', market({ currencyCode: 'CHF' })),
      { country: 'NO', timeZone: 'Europe/Oslo', expectedCurrencyCode: 'NOK' },
      market({ currencyCode: 'CHF' }))

    const sentence = sentenceFor(refusal)
    expect(sentence).toContain('CHF')
    expect(sentence).toContain('datamigrering')
    expect(sentence).toContain('ikke noe du har skrevet feil')
  })

  test('a zone conflict against the platform FALLBACK says so', () => {
    const state = market({ timeZone: null, effectiveTimeZone: 'Europe/Oslo', timeZoneIsFallback: true })
    const refusal = classifyRefusal(
      refuse(409, 'store.market.timezone-change-unsafe', 'prose', state),
      { country: 'NO', timeZone: 'Europe/Zurich' }, state)

    // The clock the history was computed under was never chosen for this venue either — the card
    // appends the same "platform default" note the read view uses.
    expect(refusal.params.currentIsFallback).toBe(true)
  })

  test('a zone conflict on a store that DID choose its zone adds no fallback note', () => {
    const refusal = classifyRefusal(
      refuse(409, 'store.market.timezone-change-unsafe', 'prose', market()),
      { country: 'NO', timeZone: 'Europe/Zurich' }, market())

    expect(refusal.params.currentIsFallback).toBe(false)
  })
})

describe('what the five 400s say to a venue owner', () => {
  test('an unknown country is quoted back with the shape that would work', () => {
    const refusal = classifyRefusal(
      refuse(400, 'store.market.country-invalid', 'prose', market()),
      { country: 'ZZ', timeZone: 'Europe/Oslo' }, market())

    expect(sentenceFor(refusal)).toContain('ZZ')
    expect(sentenceFor(refusal)).toContain('NO')
  })

  test('the SAME refusal for no country at all says so, instead of quoting «» back', () => {
    const refusal = classifyRefusal(
      refuse(400, 'store.market.country-invalid', 'prose', market()),
      { country: '', timeZone: 'Europe/Oslo' }, market())

    // Still the same code and the same kind — only the sentence differs, because the situation does.
    expect(refusal.code).toBe('store.market.country-invalid')
    expect(refusal.kind).toBe(REFUSAL_SHAPE)
    expect(refusal.key).toBe('sm_refuse_country_missing')
    expect(sentenceFor(refusal)).toBe(translations.no.sm_refuse_country_missing)
    expect(sentenceFor(refusal)).not.toContain('«»')
  })

  test('an underivable currency names the country money could not be labelled for', () => {
    const refusal = classifyRefusal(
      refuse(400, 'store.market.currency-underivable', 'prose', market()),
      { country: 'AQ', timeZone: 'Antarctica/Troll' }, market())

    expect(sentenceFor(refusal)).toContain('AQ')
  })

  test('a non-authoritative currency blames the market configuration, not the operator', () => {
    const refusal = classifyRefusal(
      refuse(400, 'store.market.currency-not-authoritative', 'Country \'NO\' implies NOK, not EUR.', market()),
      { country: 'NO', timeZone: 'Europe/Oslo', expectedCurrencyCode: 'EUR' }, market())

    const sentence = sentenceFor(refusal)
    expect(sentence).toContain('NO')
    expect(sentence).toContain('EUR')
    // This refusal means the page's own market list and the platform disagree. It is a configuration
    // fault, so the copy must not send the operator looking through the form for it.
    expect(sentence).toContain('markedsoppsettet som må rettes, ikke noe du har skrevet')
  })

  test('the platform sentence is kept, because it holds the currency this page does not know', () => {
    const refusal = classifyRefusal(
      refuse(400, 'store.market.currency-not-authoritative', 'Country \'NO\' implies NOK, not EUR.', market()),
      { country: 'NO', timeZone: 'Europe/Oslo', expectedCurrencyCode: 'EUR' }, market())

    // The page asserted EUR and was told no; only the server's sentence names NOK.
    expect(refusal.platformDetail).toContain('NOK')
  })

  test('a missing zone explains that no country implies one', () => {
    const refusal = classifyRefusal(
      refuse(400, 'store.market.timezone-missing', 'prose', market()),
      { country: 'NO', timeZone: '' }, market())

    expect(sentenceFor(refusal)).toContain('Landet bestemmer den ikke')
  })

  test('an unloadable zone quotes it back and names the shape that works', () => {
    const refusal = classifyRefusal(
      refuse(400, 'store.market.timezone-unresolvable', 'prose', market()),
      { country: 'NO', timeZone: 'Oslo/Norway' }, market())

    expect(sentenceFor(refusal)).toContain('Oslo/Norway')
    expect(sentenceFor(refusal)).toContain('Europe/Oslo')
  })
})

describe('the refusals that carry no code', () => {
  test('403 is a denial, classified on status because the body is empty', () => {
    const refusal = classifyRefusal(new StoreMarketApiError(403, null), {}, market())
    expect(refusal.kind).toBe(REFUSAL_DENIED)
    expect(refusal.code).toBeNull()
  })

  test('401 says the session went, not that the market is wrong', () => {
    expect(classifyRefusal(new StoreMarketApiError(401, null), {}, market()).kind).toBe(REFUSAL_UNAUTHENTICATED)
  })

  test('404 store-not-found is its own kind', () => {
    const refusal = classifyRefusal(refuse(404, 'store.market.store-not-found', 'prose', null), {}, market())
    expect(refusal.kind).toBe(REFUSAL_MISSING)
  })

  test('a code this page does not know falls back to the platform\'s own words', () => {
    const refusal = classifyRefusal(refuse(400, 'store.market.something-new', 'A brand new reason.', market()), {}, market())
    expect(refusal.kind).toBe(REFUSAL_UNTYPED)
    expect(refusal.platformDetail).toBe('A brand new reason.')
    expect(sentenceFor(refusal)).toContain('ikke har egen tekst for')
  })

  test('a network failure is not a refusal at all: no decision was made', () => {
    const refusal = classifyRefusal(new TypeError('Failed to fetch'), {}, market())
    expect(refusal.kind).toBe(REFUSAL_TRANSPORT)
    expect(sentenceFor(refusal)).toContain('ingen avgjørelse')
  })
})

describe('marketFacts — the two different reasons a schedule cannot be published', () => {
  test('no country blocks publish', () => {
    const facts = marketFacts(market({ country: null, currencyCode: null }))
    expect(facts.hasCountry).toBe(false)
    expect(facts.blocksSchedulePublish).toBe(true)
  })

  test('a country with no rule pack ALSO blocks publish, and is a different fact', () => {
    const facts = marketFacts(market({ country: 'CH', currencyCode: 'CHF' }))
    expect(facts.hasCountry).toBe(true)
    expect(facts.countryHasRulePack).toBe(false)
    expect(facts.blocksSchedulePublish).toBe(true)
  })

  test('Norway with a chosen zone blocks nothing', () => {
    const facts = marketFacts(market())
    expect(facts.blocksSchedulePublish).toBe(false)
    expect(facts.usesPlatformDefaultZone).toBe(false)
    expect(facts.isConfigured).toBe(true)
  })

  test('an unset zone is reported as the platform default, not as absent', () => {
    const facts = marketFacts(market({ timeZone: null, timeZoneIsFallback: true, isConfigured: false }))
    expect(facts.hasChosenZone).toBe(false)
    expect(facts.usesPlatformDefaultZone).toBe(true)
  })

  test('a null market reports nothing rather than pretending to be empty-but-read', () => {
    const facts = marketFacts(null)
    expect(facts.hasCountry).toBe(false)
    expect(facts.isConfigured).toBe(false)
  })
})

describe('the country offer', () => {
  const registry = {
    no: { country: 'NO', currency: 'NOK' },
    ch: { country: 'CH', currency: 'CHF' }
  }

  test('only countries with a working-time rule pack are offered — today, Norway', () => {
    expect(RULE_PACK_COUNTRIES).toEqual(['NO'])
    expect(hasRulePack('NO')).toBe(true)
    expect(hasRulePack('CH')).toBe(false)
    expect(hasRulePack(null)).toBe(false)

    const offered = countryOptions(registry, null)
    expect(offered.map(o => o.country)).toEqual(['NO'])
  })

  test('an offered market carries the currency to ASSERT, so a disagreement surfaces', () => {
    const [norway] = countryOptions(registry, null)
    expect(norway.expectedCurrencyCode).toBe('NOK')
    expect(norway.offered).toBe(true)
  })

  test('a store already outside the offer keeps an option, so the form never silently moves it', () => {
    const options = countryOptions(registry, 'CH')
    expect(options.map(o => o.country)).toEqual(['CH', 'NO'])

    const swiss = optionFor(options, 'CH')
    expect(swiss.offered).toBe(false)
    // No expectation is asserted for it: the page holds none, and inventing one would be a guess.
    expect(swiss.expectedCurrencyCode).toBeNull()
    // And its missing rule pack is reported rather than hidden.
    expect(swiss.hasRulePack).toBe(false)
  })

  test('a store already IN the offer gets no duplicate option', () => {
    expect(countryOptions(registry, 'NO').map(o => o.country)).toEqual(['NO'])
  })

  test('optionFor returns null for a country that is not on the list', () => {
    expect(optionFor(countryOptions(registry, null), 'SE')).toBeNull()
  })
})

describe('zone suggestions', () => {
  test('they come from the runtime IANA database, not a hand-kept list', () => {
    const zones = zoneSuggestions(null)
    expect(zones).toContain('Europe/Oslo')
    expect(zones).toContain('Europe/Zurich')
    expect(zones.length).toBeGreaterThan(100)
  })

  test('a stored id the IANA list does not carry is kept, so the field is never missing the truth', () => {
    // The backend also loads Windows ids, and "Europe/Oslo" under that spelling is one of them.
    const zones = zoneSuggestions('W. Europe Standard Time')
    expect(zones[0]).toBe('W. Europe Standard Time')
  })

  test('a stored id already in the list is not duplicated', () => {
    const zones = zoneSuggestions('Europe/Oslo')
    expect(zones.filter(z => z === 'Europe/Oslo')).toHaveLength(1)
  })
})
