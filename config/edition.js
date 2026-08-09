// Okam Edition configuration (plain JS, no Nuxt imports).
// Build flag OKAM_EDITION selects which market the app is built for:
//   'no' (default) -> Norwegian site (NOK, no-locale)
//   'ch'           -> Swiss site (CHF, de-CH locale)
// Keep the Norwegian behaviour 100% intact; only add 'ch' behind isCh checks.
//
// MARKET SELECTION IS A LOOKUP, NOT A FORK.
// Everything a market changes -- money formatting, locales, hostnames, sitemap
// exclusions -- is a field on the entry below. Adding market #3 is a new entry
// in `markets` and nothing else; there is deliberately no `|| markets.no`
// fallback anywhere on the build path, because a silent fallback is exactly how
// a third market ships looking Norwegian.

const EDITION = process.env.OKAM_EDITION || process.env.EDITION || 'no'

// Currency-format descriptors.
//
// Every value below is DERIVED FROM THE CODE IT REPLACES -- none is invented:
//   no.symbol/symbolPosition/symbolSpace  <- setCurrencyFormat({ prefix: 'kr ', suffix: '' })
//                                            in plugins/global-mixin.js
//   no.decimalSeparator                   <- core/helpers/tools priceLabelTool, which
//                                            hardcodes "," when joining the fraction
//   no.groupSeparator                     <- core/helpers/tools wholeAmountTool, which
//                                            hardcodes " " in its grouping replace
//   no.fractionDigits                     <- core slices the last 2 chars off the amount
//   ch.symbol/symbolPosition/symbolSpace  <- utils/price.js formatChf: 'CHF ' + formatted
//   ch.decimalSeparator                   <- de-CH Intl output ("1'234.50")
//   ch.groupSeparator                     <- formatChf normalises U+2019 to ASCII U+0027
//   ch.fractionDigits                     <- min/maxFractionDigits: 2
//
// The last two fields are COMPATIBILITY PINS. The two markets shipped different
// (and partly wrong) edge-case behaviour, and this lane may not move either
// market's bytes, so the difference is recorded as data instead of as a code
// fork. New markets should use the corrected values ('exact' + true).
//
//   amountSplit: 'digits' -- core's behaviour: slice the last N characters off
//     the decimal STRING. Renders 1-9 minor units as ",00" and mangles the sign
//     below one major unit (-50 renders "kr -,50"). Pinned for 'no'.
//   amountSplit: 'exact'  -- arithmetic split of an integer minor-unit amount.
//     Correct for every input. Matches what formatChf produced for 'ch'.
//
//   supportsHideFraction: true  -- honour priceLabel's hideFractionIfZero flag
//     (core does). Pinned for 'no'.
//   supportsHideFraction: false -- ignore it. formatChf had no such parameter,
//     so 'ch' has always rendered "CHF 129.00" where 'no' renders "kr 129".
const currencyFormats = {
  NOK: {
    symbol: 'kr',
    symbolPosition: 'prefix',
    symbolSpace: ' ',
    decimalSeparator: ',',
    groupSeparator: ' ',
    fractionDigits: 2,
    amountSplit: 'digits',
    supportsHideFraction: true
  },
  CHF: {
    symbol: 'CHF',
    symbolPosition: 'prefix',
    symbolSpace: ' ',
    decimalSeparator: '.',
    groupSeparator: String.fromCharCode(0x27), // ASCII apostrophe, not U+2019
    fractionDigits: 2,
    amountSplit: 'exact',
    supportsHideFraction: false
  }
}

const markets = {
  no: {
    code: 'no',
    locale: 'no',
    // i18n locales this edition ships (nuxt.config `i18n.locales`).
    locales: ['en', 'no'],
    currency: 'NOK',
    currencyFormat: currencyFormats.NOK,
    country: 'NO',
    hostname: 'https://okam.no',
    shopUrl: 'https://shop.okam.no',
    phonePrefix: '+47',
    gaId: 'UA-167439729-2',
    // Routes kept out of this edition's sitemap. The Norwegian sitemap also
    // drops the Swiss-only legal pages so they're not discoverable on okam.no.
    sitemapExclude: ['/admin/**', '/import',
      '/impressum', '/en/impressum',
      '/datenschutz', '/en/datenschutz',
      '/agb', '/en/agb']
  },
  ch: {
    code: 'ch',
    locale: 'de',
    locales: ['de'],
    currency: 'CHF',
    currencyFormat: currencyFormats.CHF,
    country: 'CH',
    hostname: 'https://okam-swiss.ch',
    // NOTE: the Swiss consumer shop domain is assumed to mirror the site domain.
    // Update if the Swiss shop lives elsewhere.
    shopUrl: 'https://shop.okam-swiss.ch',
    phonePrefix: '+41',
    gaId: null,
    sitemapExclude: ['/admin/**', '/import']
  }
}

const marketCodes = Object.keys(markets)

// Strict lookup. Throws rather than falling back, so an unknown OKAM_EDITION
// fails the build instead of shipping a market that silently looks Norwegian.
function resolveMarket (code) {
  const found = markets[code]
  if (!found) {
    throw new Error(
      'Unknown market code "' + code + '". Known markets: ' + marketCodes.join(', ') +
      '. Add an entry to config/edition.js -- there is deliberately no fallback market.'
    )
  }
  return found
}

// Evaluated at module load: an unknown OKAM_EDITION throws while the config is
// being read, i.e. before nuxt builds anything.
const market = resolveMarket(EDITION)

const isCh = market.code === 'ch'

// Runtime counterpart of resolveMarket, for a market code that arrives from the
// market switcher / rehydrated localStorage rather than from the build flag.
//
// It must NOT throw: a stale persisted code would then brick the app on every
// render. It must also NOT fall back to Norway -- that is precisely how a third
// market ends up looking Norwegian. So it complains loudly and falls back to the
// market this bundle was BUILT for, which is always right for this deployment.
function runtimeMarketConfig (code) {
  if (markets[code]) { return markets[code] }
  if (typeof console !== 'undefined' && console.error) {
    console.error(
      '[edition] Unknown market code "' + code + '" in persisted state; falling back to the build edition "' +
      market.code + '". Known markets: ' + marketCodes.join(', ') + '.'
    )
  }
  return market
}

export { EDITION, isCh, market, markets, marketCodes, resolveMarket, runtimeMarketConfig }
