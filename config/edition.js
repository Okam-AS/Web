// Okam Edition configuration (plain JS, no Nuxt imports).
// Build flag OKAM_EDITION selects which market the app is built for:
//   'no' (default) -> Norwegian site (NOK, no-locale)
//   'ch'           -> Swiss site (CHF, de-CH locale)
// Keep the Norwegian behaviour 100% intact; only add 'ch' behind isCh checks.
//
// THIS WHOLE TABLE SHIPS IN THE CLIENT BUNDLE. The runtime market switcher needs
// every market's row, so store/index.js imports `markets` and webpack inlines all
// of it into the JS of EVERY market's build. Verified: a Swiss build's JS
// contains Norway's hostname, gaId and fbPixelId as inert strings (the Swiss
// build emits no fbq call and no connect.facebook.net reference at all).
// Consequence: a market row may only ever hold PUBLIC values. Never put a secret,
// an API key or a token in one.
//
// MARKET SELECTION IS A LOOKUP, NOT A FORK.
// Everything a market changes -- money formatting, locales, hostnames, sitemap
// exclusions -- is a field on the entry below. Adding market #3 is a new entry
// in `markets` and nothing else; there is deliberately no `|| markets.no`
// fallback anywhere on the build path, because a silent fallback is exactly how
// a third market ships looking Norwegian.

// KNOWN GAPS -- money and locale that this lookup does NOT yet reach.
// Whoever adds market #3 must clear these; each one renders Norwegian output on
// any market. Left alone here only because fixing them moves already-deployed
// Norwegian bytes, which the "keep the Norwegian behaviour 100% intact" rule
// above forbids this change from doing.
//
// Hardcoded nb-NO/NOK Intl formatters, bypassing the mixin's priceLabel:
//   components/molecules/CustomerInfoModal.vue:332   (own priceLabel, NOK)
//   pages/admin/kravia-invoice.vue:582               (own priceLabel, NOK)
//   pages/admin/settlements.vue:385                  (NOK)
//   pages/admin/wolt-drive-invoice.vue:412           (NOK)
//   pages/admin/wolt-drive-invoice.vue:422           (nb-NO number)
//   pages/admin/poweruser-growth.vue:864             (nb-NO compact number)
// Hardcoded 'kr ' string prefixes:
//   components/molecules/StatisticsChart.vue:183,197,236
//   components/wrapped/slides/SlideOverview.vue:52   (seed value 'kr 0')
//   components/atoms/OtherPriceItem.vue:55           -- and this one also DOUBLES
//     the symbol today: '(Ordinær pris kr ' + priceLabel(x) renders
//     "(Ordinær pris kr kr 1 234,50)". Pre-existing, Norwegian-only.
//
// CLEARED 2026-08-09: translations/*.ts:230 used to render
// "kr {wholeAmount},{fractionAmount}" -- a live WRONG-CURRENCY string on the
// Swiss build. All three files now take one pre-formatted {price} token, built
// by utils/price.js formatMoneyFromParts from the runtime market's
// currencyFormat. See pages/admin/delivery.vue updateDeliveryMethodSummary.
//
// Deferred by ruling: the 'digits' amountSplit warts below (5 øre -> "kr 0,00",
// -50 -> "kr -,50") are defects in core/helpers/tools, a submodule shared by
// four checkouts. Out of scope here, and pinned as labelled data so they cannot
// reach market #3.

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

// PUBLIC MAILBOXES PER MARKET.
//
// Three distinct addresses, because the pages that print them are three
// distinct documents:
//   contactEmail -- the "write to us" address on /kontakt and in the footer.
//   legalEmail   -- the address printed IN a legal document (imprint, T&C
//                   contact clause). Norway and Switzerland publish different
//                   ones, so this is not a synonym for contactEmail.
//   privacyEmail -- the data-protection address. `null` for a market that
//                   publishes none; consumers must render an honest empty
//                   state rather than borrow another market's address.
//
// !! OPEN QUESTIONS FOR SVEN -- DO NOT SILENTLY "FIX" THESE !!
//
// 1. WHICH SWISS MAILBOX RECEIVES. Every Swiss address below is carried over
//    BYTE-IDENTICAL from the page markup it replaced, where each one is tagged
//    <em>[Platzhalter]</em>, i.e. awaiting legal review. Sven has ruled that
//    the canonical Swiss SITE domain is okam-swiss.ch (see `hostname` below),
//    but that ruling says nothing about which MAILBOX exists: @okam.ch and
//    @okam-swiss.ch are different mail domains and only Sven knows which one
//    receives. Measured 2026-08-09: okam.ch resolves (195.15.255.7,
//    Infomaniak). The values stayed on @okam.ch on purpose.
//
// 2. WHETHER NORWAY PUBLISHES A DATA-PROTECTION ADDRESS AT ALL. `privacyEmail`
//    is null for 'no' because nothing in THIS REPO names one -- pages/
//    personvern.vue included. Whether Okam publishes one elsewhere (in-app, or
//    in a Datatilsynet filing) decides whether that honest state is accurate or
//    merely locally true. Only Sven can answer it.
//
// 3. WHERE THE SWISS SHOP AND ADMIN ACTUALLY LIVE. See markets.ch.shopUrl.
//
// All three are data edits here, not code changes.
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
    // -> pages/registrert-ferdig.vue. Cannot be derived from `hostname`:
    // Norway's admin is a subdomain of okam.no, and nothing guarantees the next
    // market's is a subdomain of its own site.
    adminUrl: 'https://admin.okam.no',
    phonePrefix: '+47',
    // -> pages/kontakt.vue, components/organisms/PageFooter.vue,
    //    components/shared/TermsContent.vue
    contactEmail: 'kontakt@okam.no',
    // -> pages/impressum.vue, pages/agb.vue. Norway's own legal documents
    // (pages/vilkar.vue, components/shared/TermsContent.vue) keep hei@okam.no
    // inline: an address inside signed legal copy is part of the document, not
    // a configurable, and must not silently follow a data edit here.
    legalEmail: 'hei@okam.no',
    // Norway publishes no separate data-protection mailbox anywhere in this
    // repo (pages/personvern.vue names none). Inventing one would be worse
    // than saying so, so this is null and the pages that print it say so.
    privacyEmail: null,
    gaId: 'UA-167439729-2',
    // Meta/Facebook pixel. MUST be per market: a shared id bills conversions to
    // the wrong ad account, which is worse than a wrong-looking screen because it
    // is invisible from the app. null = no pixel for this market.
    fbPixelId: '2834635726843367',
    // Routes kept out of this edition's sitemap. The Norwegian sitemap also
    // drops the Swiss-only legal pages so they're not discoverable on okam.no.
    // '/en/admin/**' is listed separately from '/admin/**': nuxt-i18n prefixes
    // every non-default locale, and the glob does not reach across the prefix,
    // so /en/admin/orders was sitemap-listed until this line existed.
    sitemapExclude: ['/admin/**', '/en/admin/**', '/import',
      '/impressum', '/en/impressum',
      '/datenschutz', '/en/datenschutz',
      '/agb', '/en/agb'],
    // Routes NOT BUILT for this market at all -- stripped from the router and
    // from generate, not merely hidden from the sitemap.
    //
    // Sitemap exclusion is discovery; this is retrieval. /impressum,
    // /datenschutz and /agb are Switzerland's national legal documents: a Swiss
    // company form, a Zürich address, "ausschliesslich Schweizer Recht". They
    // were emitted on the Norwegian build too, canonicalised to https://okam.no
    // by layouts/default.vue and served under `Allow: /`. That is the exact
    // mirror of the defect utils/merchant-terms.js exists to prevent, so it
    // gets the same answer: a market does not ship another market's law.
    routeExclude: ['/impressum', '/datenschutz', '/agb']
  },
  ch: {
    code: 'ch',
    locale: 'de',
    locales: ['de'],
    currency: 'CHF',
    currencyFormat: currencyFormats.CHF,
    country: 'CH',
    hostname: 'https://okam-swiss.ch',
    // !! INTERIM VALUE -- BLOCKED ON DNS, SVEN TO ANSWER !!
    //
    // shop.okam-swiss.ch does not exist. Measured with dig on 2026-08-09:
    //   shop.okam-swiss.ch   NXDOMAIN
    //   admin.okam-swiss.ch  NXDOMAIN
    //   okam-swiss.ch        NOERROR  216.198.79.1
    //   shop.okam.no         NOERROR  (Heroku, serves the live shop)
    //
    // The consumer shop is a SEPARATE application that is not in this repo and
    // has no Swiss deployment, so every plausible Swiss shop host is fiction
    // today. This value is consumed by a hard `window.location.href` in
    // components/organisms/RedirectToNewStore.vue and by the QR code a merchant
    // PRINTS (pages/admin/index.vue), neither of which can fail soft, so it
    // must resolve. Pointing it at a name that does not resolve would turn
    // "wrong shop" into "DNS error" -- a regression, on the market this lane is
    // named for.
    //
    // So it stays on the Norwegian shop, EXPLICITLY and visibly, until Sven
    // says where the Swiss shop lives. This is one data edit away from correct,
    // which is the whole point of the row.
    shopUrl: 'https://shop.okam.no',
    // The Swiss admin is this very application, served from the domain that
    // does resolve. admin.okam-swiss.ch is NXDOMAIN (above); okam-swiss.ch/admin
    // is generated and live.
    adminUrl: 'https://okam-swiss.ch/admin',
    phonePrefix: '+41',
    // All three are [Platzhalter] values awaiting legal review -- see the
    // block comment above `markets`. Carried over verbatim from
    // pages/kontakt.vue, pages/impressum.vue + pages/agb.vue, and
    // pages/datenschutz.vue respectively.
    contactEmail: 'kontakt@okam.ch',
    legalEmail: 'hallo@okam.ch',
    privacyEmail: 'datenschutz@okam.ch',
    gaId: null,
    fbPixelId: null,
    sitemapExclude: ['/admin/**', '/import'],
    // Empty, and NOT because Switzerland has nothing to exclude. Norway's four
    // national legal pages -- /vilkar, /vilkar-store, /personvern,
    // /personvern-og-vilkar -- do ship on the Swiss build, and /vilkar binds a
    // Swiss reader to "norsk kjøpslovgivning" and names Forbrukerrådet as the
    // forum. They stay reachable only because two Swiss-visible links point
    // straight at /vilkar -- pages/priser.vue's VAT note and
    // pages/registrer.vue showTerms(), which opens it from the signup flow
    // immediately before the acceptance tick-box. Excluding the route without
    // first re-pointing those links would 404 a merchant mid-signup, which is
    // worse than the wrong text. Re-point them, then fill this array.
    routeExclude: []
  }
}

const marketCodes = Object.keys(markets)

// A COMPLETE ROW IS ENFORCED HERE, NOT IN A TEST.
//
// resolveMarket used to check only that the CODE existed, so a row missing a
// field built and generated cleanly and failed later, at the consumer:
// registrert-ferdig.vue calls .replace() on adminUrl (TypeError mid-generate,
// naming neither the field nor the market), and TermsContent.vue renders
// <a href="mailto:undefined">undefined</a> for a missing contactEmail -- silent,
// and on a page a merchant reads before signing.
//
// A field may hold null (gaId, fbPixelId and privacyEmail all legitimately do:
// "this market has none"). What may not happen is the KEY being absent, which
// is indistinguishable from a typo.
const REQUIRED_MARKET_FIELDS = [
  'code', 'locale', 'locales', 'currency', 'currencyFormat', 'country',
  'hostname', 'shopUrl', 'adminUrl', 'phonePrefix',
  'contactEmail', 'legalEmail', 'privacyEmail',
  'gaId', 'fbPixelId', 'sitemapExclude', 'routeExclude'
]

const REQUIRED_CURRENCY_FORMAT_FIELDS = [
  'symbol', 'symbolPosition', 'symbolSpace', 'decimalSeparator',
  'groupSeparator', 'fractionDigits', 'amountSplit', 'supportsHideFraction'
]

function assertCompleteMarket (code, entry) {
  const missing = REQUIRED_MARKET_FIELDS.filter(
    field => !Object.prototype.hasOwnProperty.call(entry, field)
  )
  if (missing.length) {
    throw new Error(
      'Market "' + code + '" is missing required field(s): ' + missing.join(', ') +
      '. Every market must carry all of: ' + REQUIRED_MARKET_FIELDS.join(', ') +
      '. A field may be null, but it may not be absent.'
    )
  }
  const missingFormat = REQUIRED_CURRENCY_FORMAT_FIELDS.filter(
    field => !Object.prototype.hasOwnProperty.call(entry.currencyFormat || {}, field)
  )
  if (missingFormat.length) {
    throw new Error(
      'Market "' + code + '" has an incomplete currencyFormat, missing: ' + missingFormat.join(', ') + '.'
    )
  }
  return entry
}

// Evaluated while the config is being READ, so an incomplete row fails the
// build in the same breath as an unknown OKAM_EDITION -- before nuxt builds
// anything, and naming the market and the field.
marketCodes.forEach(code => assertCompleteMarket(code, markets[code]))

// Strict lookup. Throws rather than falling back, so an unknown OKAM_EDITION
// fails the build instead of shipping a market that silently looks Norwegian.
function resolveMarket (code) {
  const found = markets[code]
  if (!found) {
    throw new Error(
      'Unknown market code "' + code + '". Known markets: ' + Object.keys(markets).join(', ') +
      '. Add an entry to config/edition.js -- there is deliberately no fallback market.'
    )
  }
  // Also caught at module load for the shipped rows; repeated here so a row
  // added to the registry at runtime (a test, a future dynamic market) gets the
  // same guarantee rather than failing later at a consumer.
  return assertCompleteMarket(code, found)
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

export {
  EDITION, isCh, market, markets, marketCodes, resolveMarket, runtimeMarketConfig,
  REQUIRED_MARKET_FIELDS, REQUIRED_CURRENCY_FORMAT_FIELDS, assertCompleteMarket
}
