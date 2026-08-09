// Pins the BUILD contract: what nuxt.config.js actually emits per market.
//
// config/edition.js holds the data; this file proves the config consumes it and
// that a third market inherits none of Norway's identifiers -- pixel, analytics
// id or hostname. `.github/workflows/nuxtjs.yml` runs no tests and `main`
// auto-deploys, so these assertions are the only gate this file gets.

const NO_FB_PIXEL = '2834635726843367'
const NO_GA_ID = 'UA-167439729-2'

const loadConfig = (edition) => {
  const previousOkam = process.env.OKAM_EDITION
  const previousEdition = process.env.EDITION
  if (edition === undefined) { delete process.env.OKAM_EDITION } else { process.env.OKAM_EDITION = edition }
  delete process.env.EDITION
  jest.resetModules()
  try {
    return require('~/nuxt.config').default
  } finally {
    if (previousOkam === undefined) { delete process.env.OKAM_EDITION } else { process.env.OKAM_EDITION = previousOkam }
    if (previousEdition === undefined) { delete process.env.EDITION } else { process.env.EDITION = previousEdition }
  }
}

afterEach(() => { jest.resetModules() })

describe("the 'no' build is unchanged", () => {
  test('emits the Norwegian Facebook pixel exactly as before', () => {
    const cfg = loadConfig('no')

    expect(cfg.head.script).toHaveLength(1)
    expect(cfg.head.script[0].hid).toBe('fb-pixel')
    expect(cfg.head.script[0].type).toBe('text/javascript')
    expect(cfg.head.script[0].charset).toBe('utf-8')
    expect(cfg.head.script[0].innerHTML).toContain("fbq('init', '" + NO_FB_PIXEL + "');")
    expect(cfg.head.script[0].innerHTML).toContain("fbq('track', 'PageView');")

    expect(cfg.head.noscript).toHaveLength(1)
    expect(cfg.head.noscript[0].hid).toBe('fb-pixel-noscript')
    expect(cfg.head.noscript[0].innerHTML).toBe(
      '<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=' +
      NO_FB_PIXEL + '&ev=PageView&noscript=1" />'
    )

    expect(cfg.head.__dangerouslyDisableSanitizersByTagID).toEqual({
      'fb-pixel': ['innerHTML'],
      'fb-pixel-noscript': ['innerHTML']
    })
  })

  test('emits the Norwegian build settings exactly as before', () => {
    const cfg = loadConfig('no')
    expect(cfg.env.EDITION).toBe('no')
    expect(cfg.i18n.locales).toEqual(['en', 'no'])
    expect(cfg.i18n.defaultLocale).toBe('no')
    expect(cfg.i18n.vueI18n.fallbackLocale).toBe('no')
    expect(cfg.googleAnalytics.id).toBe(NO_GA_ID)
    expect(cfg.sitemap.hostname).toBe('https://okam.no')
    expect(cfg.sitemap.exclude).toEqual([
      '/admin/**', '/import',
      '/impressum', '/en/impressum',
      '/datenschutz', '/en/datenschutz',
      '/agb', '/en/agb'
    ])
    expect(cfg.pwa.manifest.lang).toBe('no')
  })

  test('an unset OKAM_EDITION still builds Norway', () => {
    expect(loadConfig(undefined).env.EDITION).toBe('no')
  })
})

describe("the 'ch' build is unchanged", () => {
  test('emits no Facebook pixel at all', () => {
    const cfg = loadConfig('ch')
    expect(cfg.head.script).toEqual([])
    expect(cfg.head.noscript).toEqual([])
    expect(cfg.head.__dangerouslyDisableSanitizersByTagID).toEqual({})
  })

  test('emits the Swiss build settings exactly as before', () => {
    const cfg = loadConfig('ch')
    expect(cfg.env.EDITION).toBe('ch')
    expect(cfg.i18n.locales).toEqual(['de'])
    expect(cfg.i18n.defaultLocale).toBe('de')
    expect(cfg.i18n.vueI18n.fallbackLocale).toBe('de')
    expect(cfg.googleAnalytics.id).toBeUndefined()
    expect(cfg.sitemap.hostname).toBe('https://okam-swiss.ch')
    expect(cfg.sitemap.exclude).toEqual(['/admin/**', '/import'])
    expect(cfg.pwa.manifest.lang).toBe('de')
  })
})

describe('a third market inherits none of Norway', () => {
  // The pixel used to read `isCh ? [] : [NO pixel]`, so market #3 would have
  // fired the NORWEGIAN pixel and billed its conversions to the Norwegian ad
  // account -- invisible from the app, unlike a wrong-looking price.
  const buildForSyntheticMarket = (fbPixelId) => {
    jest.resetModules()
    jest.doMock('~/config/edition', () => {
      const actual = jest.requireActual('~/config/edition')
      const xa = {
        code: 'xa',
        locale: 'de',
        locales: ['de'],
        currency: 'EUR',
        currencyFormat: actual.markets.ch.currencyFormat,
        country: 'AT',
        hostname: 'https://okam.example',
        shopUrl: 'https://shop.okam.example',
        phonePrefix: '+43',
        gaId: null,
        fbPixelId,
        sitemapExclude: ['/admin/**']
      }
      return {
        ...actual,
        EDITION: 'xa',
        isCh: false,
        market: xa,
        markets: { ...actual.markets, xa }
      }
    })
    return require('~/nuxt.config').default
  }

  test('a market with no pixel emits no pixel, and never the Norwegian one', () => {
    const cfg = buildForSyntheticMarket(null)
    expect(cfg.head.script).toEqual([])
    expect(cfg.head.noscript).toEqual([])
    expect(cfg.head.__dangerouslyDisableSanitizersByTagID).toEqual({})
    expect(JSON.stringify(cfg)).not.toContain(NO_FB_PIXEL)
  })

  test('a market with its OWN pixel emits that one, not the Norwegian one', () => {
    const cfg = buildForSyntheticMarket('1111111111111111')
    expect(cfg.head.script[0].innerHTML).toContain("fbq('init', '1111111111111111');")
    expect(cfg.head.noscript[0].innerHTML).toContain('id=1111111111111111&')
    expect(JSON.stringify(cfg)).not.toContain(NO_FB_PIXEL)
  })

  test('no Norwegian analytics id or hostname leaks into a third market build', () => {
    const serialised = JSON.stringify(buildForSyntheticMarket(null))
    expect(serialised).not.toContain(NO_GA_ID)
    expect(serialised).not.toContain('okam.no')
    expect(serialised).toContain('okam.example')
  })
})
