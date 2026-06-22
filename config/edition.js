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
    gaId: 'UA-167439729-2'
  },
  ch: {
    code: 'ch',
    locale: 'de',
    currency: 'CHF',
    country: 'CH',
    hostname: 'https://okam.ch',
    shopUrl: 'https://shop.okam.ch',
    phonePrefix: '+41',
    gaId: null
  }
}

const market = isCh ? markets.ch : markets.no

export { EDITION, isCh, market, markets }
