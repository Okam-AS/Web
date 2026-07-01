// Okam Edition configuration (plain JS, no Nuxt imports).
// Build flag OKAM_EDITION selects which market the app is built for:
//   'no' (default) -> Norwegian site (NOK, no-locale)
//   'ch'           -> Swiss site (CHF, de-CH locale)
// Keep the Norwegian behaviour 100% intact; only add 'ch' behind isCh checks.

const EDITION = process.env.OKAM_EDITION || process.env.EDITION || 'no'
const isCh = EDITION === 'ch'

const markets = {
  no: {
    code: 'no',
    locale: 'no',
    currency: 'NOK',
    country: 'NO',
    hostname: 'https://okam.no',
    shopUrl: 'https://shop.okam.no',
    phonePrefix: '+47',
    // National subscriber-number length (digits after the landcode). NO mobile = 8.
    phoneNationalLength: 8,
    // Merchant terms & conditions link used on the registration page.
    termsUrl: '/vilkar',
    gaId: 'UA-167439729-2'
  },
  ch: {
    code: 'ch',
    locale: 'de',
    currency: 'CHF',
    country: 'CH',
    hostname: 'https://okam-swiss.ch',
    // NOTE: the Swiss consumer shop domain is assumed to mirror the site domain.
    // Update if the Swiss shop lives elsewhere.
    shopUrl: 'https://shop.okam-swiss.ch',
    phonePrefix: '+41',
    // National subscriber-number length (digits after the landcode). CH mobile = 9 (7x xxx xx xx).
    phoneNationalLength: 9,
    // TODO(WS-E): point at the German Swiss merchant terms page once it exists.
    // Kept on /vilkar for now so the link is never dead; de-Norwegianising the
    // terms *content* (vilkar-store.vue) is owned by the localisation workstream.
    termsUrl: '/vilkar',
    gaId: null
  }
}

const market = isCh ? markets.ch : markets.no

export { EDITION, isCh, market, markets }
