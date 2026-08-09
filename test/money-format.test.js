import { market, markets, marketCodes, resolveMarket, runtimeMarketConfig } from '~/config/edition'
import { formatAmount, formatMarketAmount, splitAmount, formatMoneyFromParts, coreCurrencyFormat, currencyFormatForStore } from '~/utils/price'

// ---------------------------------------------------------------------------
// GOLDEN BYTES.
//
// Captured from the implementations this lane replaced, BEFORE any edit:
//   'no' -> core/helpers/tools @2a2e7b3 priceLabel / wholeAmount / fractionAmount,
//           with setCurrencyFormat({ prefix: 'kr ', suffix: '' })
//   'ch' -> the old utils/price.js formatChf (de-CH Intl, U+2019 -> U+0027)
//
// These are literal expected strings, not a re-derivation. If a market's bytes
// move, these fail. The ugly rows (kr 0,-5 / kr -,50 / 5 øre rendering as 0,00)
// are core's real behaviour and are pinned deliberately -- see the
// `amountSplit: 'digits'` note in config/edition.js.
// ---------------------------------------------------------------------------

const NO_GOLDEN = [
  [0, 'kr 0,00'],
  [1, 'kr 0,00'],
  [5, 'kr 0,00'],
  [9, 'kr 0,00'],
  [10, 'kr 0,10'],
  [50, 'kr 0,50'],
  [99, 'kr 0,99'],
  [100, 'kr 1,00'],
  [105, 'kr 1,05'],
  [500, 'kr 5,00'],
  [999, 'kr 9,99'],
  [1000, 'kr 10,00'],
  [1050, 'kr 10,50'],
  [9999, 'kr 99,99'],
  [10000, 'kr 100,00'],
  [99999, 'kr 999,99'],
  [100000, 'kr 1 000,00'],
  [123450, 'kr 1 234,50'],
  [999999, 'kr 9 999,99'],
  [1000000, 'kr 10 000,00'],
  [12345678, 'kr 123 456,78'],
  [1234567890, 'kr 12 345 678,90'],
  [-5, 'kr 0,-5'],
  [-50, 'kr -,50'],
  [-100, 'kr -1,00'],
  [-123450, 'kr -1 234,50'],
  [null, 'kr 0,00'],
  [undefined, 'kr 0,00'],
  [NaN, 'kr 0,00'],
  ['', 'kr 0,00']
]

const NO_GOLDEN_HIDE_FRACTION = [
  [0, 'kr 0'],
  [1, 'kr 0'],
  [5, 'kr 0'],
  [9, 'kr 0'],
  [10, 'kr 0,10'],
  [50, 'kr 0,50'],
  [99, 'kr 0,99'],
  [100, 'kr 1'],
  [105, 'kr 1,05'],
  [500, 'kr 5'],
  [999, 'kr 9,99'],
  [1000, 'kr 10'],
  [1050, 'kr 10,50'],
  [9999, 'kr 99,99'],
  [10000, 'kr 100'],
  [99999, 'kr 999,99'],
  [100000, 'kr 1 000'],
  [123450, 'kr 1 234,50'],
  [999999, 'kr 9 999,99'],
  [1000000, 'kr 10 000'],
  [12345678, 'kr 123 456,78'],
  [1234567890, 'kr 12 345 678,90'],
  [-5, 'kr 0'],
  [-50, 'kr -,50'],
  [-100, 'kr -1'],
  [-123450, 'kr -1 234,50'],
  [null, 'kr 0'],
  [undefined, 'kr 0'],
  [NaN, 'kr 0'],
  ['', 'kr 0']
]

const NO_SPLIT_GOLDEN = [
  [0, '0', '00'],
  [10, '0', '10'],
  [105, '1', '05'],
  [100000, '1 000', '00'],
  [123450, '1 234', '50'],
  [1234567890, '12 345 678', '90'],
  [-123450, '-1 234', '50'],
  [null, '0', '00'],
  [undefined, '0', '00'],
  [NaN, '0', '00'],
  ['', '0', '00']
]

const CH_GOLDEN = [
  [0, 'CHF 0.00'],
  [1, 'CHF 0.01'],
  [5, 'CHF 0.05'],
  [9, 'CHF 0.09'],
  [10, 'CHF 0.10'],
  [50, 'CHF 0.50'],
  [99, 'CHF 0.99'],
  [100, 'CHF 1.00'],
  [105, 'CHF 1.05'],
  [500, 'CHF 5.00'],
  [999, 'CHF 9.99'],
  [1000, 'CHF 10.00'],
  [1050, 'CHF 10.50'],
  [9999, 'CHF 99.99'],
  [10000, 'CHF 100.00'],
  [99999, 'CHF 999.99'],
  [100000, "CHF 1'000.00"],
  [123450, "CHF 1'234.50"],
  [999999, "CHF 9'999.99"],
  [1000000, "CHF 10'000.00"],
  [12345678, "CHF 123'456.78"],
  [1234567890, "CHF 12'345'678.90"],
  [-5, 'CHF -0.05'],
  [-50, 'CHF -0.50'],
  [-100, 'CHF -1.00'],
  [-123450, "CHF -1'234.50"],
  [null, 'CHF 0.00'],
  [undefined, 'CHF 0.00'],
  [NaN, 'CHF 0.00'],
  ['', 'CHF 0.00']
]

describe("'no' parity: every byte identical to core priceLabel + setCurrencyFormat({ prefix: 'kr ', suffix: '' })", () => {
  test.each(NO_GOLDEN)('priceLabel(%p) is %p', (amount, expected) => {
    expect(formatMarketAmount('no', amount, false)).toBe(expected)
  })

  test.each(NO_GOLDEN_HIDE_FRACTION)('priceLabel(%p, true) is %p', (amount, expected) => {
    expect(formatMarketAmount('no', amount, true)).toBe(expected)
  })

  test.each(NO_SPLIT_GOLDEN)('wholeAmount/fractionAmount(%p) are %p and %p', (amount, whole, fraction) => {
    expect(splitAmount(markets.no.currencyFormat, amount)).toEqual({ whole, fraction })
  })

  test('groups thousands with an ASCII space (U+0020), not a non-breaking space', () => {
    const result = formatMarketAmount('no', 100000, false)
    expect(result).toBe('kr 1 000,00')
    expect(result).not.toContain(String.fromCharCode(0xA0))
  })

  test('the core override is still exactly the literal it replaced', () => {
    // The call site used to be: setCurrencyFormat({ prefix: 'kr ', suffix: '' }).
    const override = coreCurrencyFormat(markets.no.currencyFormat)
    expect(override.prefix).toBe('kr ')
    expect(override.suffix).toBe('')

    // ...and merged over core's documented base it yields an identical currencyInfo.
    const coreBase = {
      prefix: '',
      suffix: ',–',
      decimalSeparator: ',',
      thousandSeparator: ' ',
      fractionLength: 2,
      symbol: 'kr'
    }
    expect({ ...coreBase, ...override }).toEqual({ ...coreBase, ...{ prefix: 'kr ', suffix: '' } })
  })
})

describe("'ch' parity: every byte identical to the old formatChf", () => {
  test.each(CH_GOLDEN)('priceLabel(%p) is %p', (amount, expected) => {
    expect(formatMarketAmount('ch', amount, false)).toBe(expected)
  })

  test('uses an ASCII apostrophe (U+0027), not the typographic one (U+2019)', () => {
    const result = formatMarketAmount('ch', 123450, false)
    expect(result).toContain(String.fromCharCode(0x27))
    expect(result).not.toContain(String.fromCharCode(0x2019))
  })

  test('still ignores hideFractionIfZero, exactly as formatChf did', () => {
    // formatChf had no such parameter, so 'ch' has always shown both decimals.
    expect(formatMarketAmount('ch', 12900, true)).toBe('CHF 129.00')
    expect(formatMarketAmount('no', 12900, true)).toBe('kr 129')
  })

  test('derives the core override from the market instead of a hardcoded prefix', () => {
    expect(coreCurrencyFormat(markets.ch.currencyFormat)).toEqual({
      prefix: 'CHF ',
      suffix: '',
      decimalSeparator: '.',
      thousandSeparator: String.fromCharCode(0x27),
      fractionLength: 2,
      symbol: 'CHF'
    })
  })
})

describe('a third market is a data entry, not a code edit', () => {
  // Nothing below touches utils/price.js, plugins/global-mixin.js or any fork.
  // These markets are registered exactly the way a real one would be: an entry
  // in `markets`. If adding a market ever needs a code change again, this fails.
  const SYNTHETIC = {
    xa: {
      code: 'xa',
      locale: 'de',
      locales: ['de'],
      currency: 'EUR',
      country: 'AT',
      hostname: 'https://okam.example',
      shopUrl: 'https://shop.okam.example',
      adminUrl: 'https://admin.okam.example',
      phonePrefix: '+43',
      contactEmail: 'kontakt@okam.example',
      legalEmail: 'recht@okam.example',
      privacyEmail: 'datenschutz@okam.example',
      gaId: null,
      fbPixelId: null,
      sitemapExclude: ['/admin/**'],
      currencyFormat: {
        symbol: '€',
        symbolPosition: 'suffix',
        symbolSpace: ' ',
        decimalSeparator: ',',
        groupSeparator: '.',
        fractionDigits: 2,
        amountSplit: 'exact',
        supportsHideFraction: true
      }
    },
    xz: {
      code: 'xz',
      locale: 'en',
      locales: ['en'],
      currency: 'ZZK',
      country: 'ZZ',
      hostname: 'https://okam.invalid',
      shopUrl: 'https://shop.okam.invalid',
      adminUrl: 'https://admin.okam.invalid',
      phonePrefix: '+999',
      contactEmail: 'contact@okam.invalid',
      legalEmail: 'legal@okam.invalid',
      // A market that publishes no data-protection mailbox at all.
      privacyEmail: null,
      gaId: null,
      fbPixelId: null,
      sitemapExclude: ['/admin/**'],
      currencyFormat: {
        // A zero-decimal currency: minor unit == major unit.
        symbol: 'ZZK',
        symbolPosition: 'prefix',
        symbolSpace: ' ',
        decimalSeparator: '.',
        groupSeparator: ',',
        fractionDigits: 0,
        amountSplit: 'exact',
        supportsHideFraction: true
      }
    }
  }

  beforeAll(() => {
    markets.xa = SYNTHETIC.xa
    markets.xz = SYNTHETIC.xz
  })

  afterAll(() => {
    delete markets.xa
    delete markets.xz
  })

  test('a comma-decimal, dot-grouped, suffix-symbol market formats through the lookup', () => {
    expect(formatMarketAmount('xa', 123450, false)).toBe('1.234,50 €')
    expect(formatMarketAmount('xa', 5, false)).toBe('0,05 €')
    expect(formatMarketAmount('xa', -123450, false)).toBe('-1.234,50 €')
    expect(formatMarketAmount('xa', 12900, true)).toBe('129 €')
  })

  test('a zero-decimal market renders no fraction at all', () => {
    expect(formatMarketAmount('xz', 1234, false)).toBe('ZZK 1,234')
    expect(formatMarketAmount('xz', 0, false)).toBe('ZZK 0')
    expect(formatMarketAmount('xz', -1234567, false)).toBe('ZZK -1,234,567')
  })

  test('the synthetic markets do NOT render as Norwegian', () => {
    expect(formatMarketAmount('xa', 123450, false)).not.toBe(formatMarketAmount('no', 123450, false))
    expect(formatMarketAmount('xz', 123450, false)).not.toBe(formatMarketAmount('no', 123450, false))
  })

  test('resolveMarket returns the new entry and the code list grows', () => {
    expect(resolveMarket('xa')).toBe(SYNTHETIC.xa)
    expect(Object.keys(markets)).toContain('xz')
  })
})

describe('an unknown market fails loudly', () => {
  test('resolveMarket throws instead of falling back to Norway', () => {
    expect(() => resolveMarket('zz')).toThrow(/Unknown market code "zz"/)
    expect(() => resolveMarket('zz')).toThrow(/no fallback market/)
    expect(() => resolveMarket(undefined)).toThrow(/Unknown market code/)
  })

  test('formatMarketAmount throws rather than rendering Norwegian bytes', () => {
    expect(() => formatMarketAmount('zz', 123450, false)).toThrow(/Unknown market code "zz"/)
  })

  test('an unknown OKAM_EDITION throws while the edition config is read', () => {
    const previousOkam = process.env.OKAM_EDITION
    const previousEdition = process.env.EDITION
    process.env.OKAM_EDITION = 'zz'
    delete process.env.EDITION
    jest.resetModules()
    try {
      expect(() => require('~/config/edition')).toThrow(/Unknown market code "zz"/)
    } finally {
      if (previousOkam === undefined) { delete process.env.OKAM_EDITION } else { process.env.OKAM_EDITION = previousOkam }
      if (previousEdition === undefined) { delete process.env.EDITION } else { process.env.EDITION = previousEdition }
      jest.resetModules()
    }
  })

  test('formatAmount refuses a missing descriptor', () => {
    expect(() => formatAmount(undefined, 100, false)).toThrow(/missing currencyFormat descriptor/)
    expect(() => splitAmount(null, 100)).toThrow(/missing currencyFormat descriptor/)
  })
})

describe('every shipped market carries a complete descriptor', () => {
  const REQUIRED_FORMAT_FIELDS = [
    'symbol', 'symbolPosition', 'symbolSpace', 'decimalSeparator',
    'groupSeparator', 'fractionDigits', 'amountSplit', 'supportsHideFraction'
  ]
  const REQUIRED_MARKET_FIELDS = [
    'code', 'locale', 'locales', 'currency', 'country', 'hostname',
    'shopUrl', 'adminUrl', 'phonePrefix', 'gaId', 'fbPixelId', 'sitemapExclude',
    'currencyFormat',
    // Mailboxes. Required (not optional-with-a-default) so market #3 cannot
    // omit one and silently inherit Norway's or Switzerland's address.
    // `privacyEmail` may be null -- a market that publishes none must say so --
    // but the KEY has to be there, which is what hasOwnProperty checks below.
    'contactEmail', 'legalEmail', 'privacyEmail'
  ]

  test.each(marketCodes)('%s', (code) => {
    const entry = markets[code]
    expect(entry.code).toBe(code)
    REQUIRED_MARKET_FIELDS.forEach((field) => {
      expect(Object.prototype.hasOwnProperty.call(entry, field)).toBe(true)
    })
    REQUIRED_FORMAT_FIELDS.forEach((field) => {
      expect(Object.prototype.hasOwnProperty.call(entry.currencyFormat, field)).toBe(true)
    })
    expect(['prefix', 'suffix']).toContain(entry.currencyFormat.symbolPosition)
    expect(['digits', 'exact']).toContain(entry.currencyFormat.amountSplit)
  })
})

describe('the build-time market data still matches the literals nuxt.config.js used to fork on', () => {
  test('no', () => {
    expect(markets.no.hostname).toBe('https://okam.no')
    expect(markets.no.gaId).toBe('UA-167439729-2')
    expect(markets.no.locale).toBe('no')
    expect(markets.no.locales).toEqual(['en', 'no'])
    expect(markets.no.sitemapExclude).toEqual([
      '/admin/**', '/import',
      '/impressum', '/en/impressum',
      '/datenschutz', '/en/datenschutz',
      '/agb', '/en/agb'
    ])
  })

  test('ch', () => {
    expect(markets.ch.hostname).toBe('https://okam-swiss.ch')
    expect(markets.ch.gaId).toBeNull()
    expect(markets.ch.locale).toBe('de')
    expect(markets.ch.locales).toEqual(['de'])
    expect(markets.ch.sitemapExclude).toEqual(['/admin/**', '/import'])
  })
})

describe('runtime market resolution (the market switcher / persisted localStorage)', () => {
  test('resolves a known code by lookup', () => {
    expect(runtimeMarketConfig('no')).toBe(markets.no)
    expect(runtimeMarketConfig('ch')).toBe(markets.ch)
  })

  test('an unknown persisted code complains loudly instead of failing silently', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      runtimeMarketConfig('zz')
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0][0]).toContain('Unknown market code "zz"')
    } finally {
      spy.mockRestore()
    }
  })

  test('the fallback is the BUILD edition, never a hardcoded Norway', () => {
    // The store getter used to be `markets[state.market] || markets.no`, which
    // would render a Swiss build in Norwegian on a stale persisted code.
    const previousOkam = process.env.OKAM_EDITION
    const previousEdition = process.env.EDITION
    process.env.OKAM_EDITION = 'ch'
    delete process.env.EDITION
    jest.resetModules()
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const chEdition = require('~/config/edition')
      expect(chEdition.market).toBe(chEdition.markets.ch)
      expect(chEdition.runtimeMarketConfig('zz')).toBe(chEdition.markets.ch)
      expect(chEdition.runtimeMarketConfig('zz')).not.toBe(chEdition.markets.no)
    } finally {
      spy.mockRestore()
      if (previousOkam === undefined) { delete process.env.OKAM_EDITION } else { process.env.OKAM_EDITION = previousOkam }
      if (previousEdition === undefined) { delete process.env.EDITION } else { process.env.EDITION = previousEdition }
      jest.resetModules()
    }
  })
})

describe('the mixin money methods follow the RUNTIME market', () => {
  // plugins/global-mixin.js calls priceLabel/wholeAmount/fractionAmount with
  // currencyFormatForStore(this.$store). The mixin itself cannot be imported in
  // this worktree (it pulls in the `core` git submodule), so the resolution step
  // it delegates to is exercised directly here.
  const storeFor = marketConfig => ({ getters: { marketConfig } })

  test('a Swiss runtime market formats Swiss, not Norwegian', () => {
    const format = currencyFormatForStore(storeFor(markets.ch))
    expect(formatAmount(format, 123450, false)).toBe("CHF 1'234.50")
    expect(splitAmount(format, 123450)).toEqual({ whole: "1'234", fraction: '50' })
  })

  test('a Norwegian runtime market formats Norwegian', () => {
    const format = currencyFormatForStore(storeFor(markets.no))
    expect(formatAmount(format, 123450, false)).toBe('kr 1 234,50')
    expect(splitAmount(format, 123450)).toEqual({ whole: '1 234', fraction: '50' })
  })

  test('switching the runtime market switches the money, with no code path change', () => {
    const before = formatAmount(currencyFormatForStore(storeFor(markets.no)), 123450, false)
    const after = formatAmount(currencyFormatForStore(storeFor(markets.ch)), 123450, false)
    expect(before).not.toBe(after)
  })

  test('with no store at all it falls back to the build market, not to a hardcoded Norway', () => {
    // Identity with the BUILD market, whatever it is -- not with markets.no.
    // (That the build market really is honoured for a non-Norwegian build is
    // proved by the runtimeMarketConfig 'ch' case above.)
    expect(currencyFormatForStore(undefined)).toBe(market.currencyFormat)
    expect(currencyFormatForStore({})).toBe(market.currencyFormat)
    expect(currencyFormatForStore({ getters: {} })).toBe(market.currencyFormat)
  })
})

describe('the delivery-editor {price} token', () => {
  // pages/admin/delivery.vue's summary sentence used to be assembled INSIDE the
  // translation string: "kr {wholeAmount},{fractionAmount}". That baked a
  // Norwegian symbol and a Norwegian decimal separator into de.ts and en.ts too,
  // so the Swiss build printed Norwegian currency inside German copy. It now
  // passes one pre-formatted {price}.
  //
  // The arguments are the raw digit strings from the editor's two inputs, which
  // is why formatMoneyFromParts does not re-group the whole part: delivery.vue
  // strips the group separator when it seeds the field, so grouping here would
  // move Norway's deployed bytes from "kr 1234,50" to "kr 1 234,50".

  // Every row is the EXACT string "kr {wholeAmount},{fractionAmount}" produced
  // for the same inputs, read off the template this replaced.
  const NO_GOLDEN = [
    ['0', '00', 'kr 0,00'],
    ['0', '50', 'kr 0,50'],
    ['9', '99', 'kr 9,99'],
    ['49', '00', 'kr 49,00'],
    ['129', '90', 'kr 129,90'],
    ['1234', '50', 'kr 1234,50'],
    ['1000000', '00', 'kr 1000000,00']
  ]

  test.each(NO_GOLDEN)('no: (%p, %p) renders %p, byte for byte', (whole, fraction, expected) => {
    expect(formatMoneyFromParts(markets.no.currencyFormat, whole, fraction)).toBe(expected)
    // The template it replaces, evaluated on the same inputs.
    expect(expected).toBe('kr ' + whole + ',' + fraction)
  })

  test('ch renders Swiss francs with a Swiss decimal separator', () => {
    expect(formatMoneyFromParts(markets.ch.currencyFormat, '1234', '50')).toBe('CHF 1234.50')
    expect(formatMoneyFromParts(markets.ch.currencyFormat, '0', '00')).toBe('CHF 0.00')
  })

  test('no Swiss output carries a Norwegian symbol or separator', () => {
    const swiss = formatMoneyFromParts(markets.ch.currencyFormat, '129', '90')
    expect(swiss).not.toContain('kr')
    expect(swiss).not.toContain(',')
  })

  test('the symbol and separator follow the RUNTIME market', () => {
    const storeFor = marketConfig => ({ getters: { marketConfig } })
    expect(formatMoneyFromParts(currencyFormatForStore(storeFor(markets.no)), '129', '90')).toBe('kr 129,90')
    expect(formatMoneyFromParts(currencyFormatForStore(storeFor(markets.ch)), '129', '90')).toBe('CHF 129.90')
  })

  test('a suffix-symbol market puts the symbol last, with no code edit', () => {
    const euro = {
      symbol: '€',
      symbolPosition: 'suffix',
      symbolSpace: ' ',
      decimalSeparator: ',',
      groupSeparator: '.',
      fractionDigits: 2,
      amountSplit: 'exact',
      supportsHideFraction: true
    }
    expect(formatMoneyFromParts(euro, '129', '90')).toBe('129,90 €')
  })

  test('a zero-decimal market shows no fraction at all', () => {
    const zeroDecimal = {
      symbol: 'ZZK',
      symbolPosition: 'prefix',
      symbolSpace: ' ',
      decimalSeparator: '.',
      groupSeparator: ',',
      fractionDigits: 0,
      amountSplit: 'exact',
      supportsHideFraction: true
    }
    expect(formatMoneyFromParts(zeroDecimal, '129', '90')).toBe('ZZK 129')
  })

  test('it refuses a missing descriptor rather than guessing Norwegian', () => {
    expect(() => formatMoneyFromParts(undefined, '1', '00')).toThrow(/missing currencyFormat descriptor/)
  })
})
