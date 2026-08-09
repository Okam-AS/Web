// Pins the SITE-IDENTITY contract: every surface a visitor can see that names a
// market -- the shop link, the admin link, the mailboxes, the structured data,
// robots.txt, which routes are built at all, and WHICH merchant agreement is
// reachable.
//
// The gate is the one config/edition.js already sets for money, applied to
// identity: a THIRD market, declared as data, must get its own values
// everywhere. Relocating a literal from a page into the descriptor proves
// nothing on its own -- so the link assertions below MOUNT the real pages and
// read the rendered href, rather than concatenating a literal declared in this
// file. Revert any of those pages to its hardcoded host and its test fails.
//
// `.github/workflows/nuxtjs.yml` runs no tests and `main` auto-deploys, so these
// assertions are the only gate these files get.

// PRE-EXISTING, NOT A CONVENIENCE STUB. vue-jest's template compiler
// (vue-template-es2015-compiler/buble) cannot parse this component: at
// 8059e200, before this lane, `npx jest` already printed "Failed to collect
// coverage from components/onboarding/OnboardingProductImages.vue -- Unexpected
// token (2:133)". pages/admin/onboarding.vue imports it, so requiring the page
// at all needs it replaced. shallowMount would stub it regardless, and nothing
// asserted below comes from it.
jest.mock('~/components/onboarding/OnboardingProductImages.vue', () => ({
  name: 'OnboardingProductImages',
  render: h => h('div')
}))

const fs = require('fs')
const os = require('os')
const path = require('path')
const { shallowMount, mount } = require('@vue/test-utils')

const {
  markets, marketCodes, resolveMarket, runtimeMarketConfig
} = require('~/config/edition')
const {
  MERCHANT_TERMS, merchantTermsFor
} = require('~/utils/merchant-terms')

const REPO_ROOT = path.resolve(__dirname, '..')

// --- loading a module for a given edition -----------------------------------

const withEdition = (edition, fn) => {
  const previousOkam = process.env.OKAM_EDITION
  const previousEdition = process.env.EDITION
  if (edition === undefined) { delete process.env.OKAM_EDITION } else { process.env.OKAM_EDITION = edition }
  delete process.env.EDITION
  jest.resetModules()
  try {
    return fn()
  } finally {
    if (previousOkam === undefined) { delete process.env.OKAM_EDITION } else { process.env.OKAM_EDITION = previousOkam }
    if (previousEdition === undefined) { delete process.env.EDITION } else { process.env.EDITION = previousEdition }
    jest.resetModules()
  }
}

// plugins/jsonld.js is a nuxt inject plugin: run it and capture what it injects.
const loadJsonld = () => {
  let injected
  require('~/plugins/jsonld').default(null, (name, value) => {
    expect(name).toBe('jsonld')
    injected = value
  })
  return injected
}

const jsonldFor = edition => withEdition(edition, loadJsonld)
const configFor = edition => withEdition(edition, () => require('~/nuxt.config').default)

// The options object nuxt.config hands @nuxtjs/robots.
const robotsOptionsOf = (cfg) => {
  const entry = cfg.modules.find(m => Array.isArray(m) && m[0] === '@nuxtjs/robots')
  expect(entry).toBeDefined()
  // A module entry is [src, options]. Anything after options is silently
  // ignored by nuxt -- which is how the old third element
  // ({ Disallow: '/import' }) was dropped without a word.
  expect(entry).toHaveLength(2)
  return entry[1]
}

const robotsFor = edition => robotsOptionsOf(configFor(edition))

/**
 * Render robots.txt through the REAL @nuxtjs/robots at its installed version.
 *
 * The options object above is only an input; what ships is whatever the module
 * makes of it. package.json pins `^2.5.0`, so a patch release that changes
 * `render()` or the `correspondences` key order would change the emitted file
 * with every options-level assertion still green. This runs the module's own
 * build:before + generate:done hooks and reads the file off disk.
 *
 * srcDir is the real repo, so this also proves static/robots.txt is absent:
 * if it came back, build:before would parse and re-inject its mangled rules.
 */
const renderRobotsFile = async (options) => {
  const robotsModule = require('@nuxtjs/robots')
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'okam-robots-'))
  fs.mkdirSync(path.join(tmp, 'dist'))
  const hooks = {}
  const container = {
    options: {
      srcDir: REPO_ROOT,
      dir: { static: 'static' },
      rootDir: tmp,
      generate: { dir: 'dist' }
    },
    nuxt: {
      hook: (name, fn) => { hooks[name] = fn },
      server: { useMiddleware: () => {} }
    }
  }
  await robotsModule.call(container, options)
  await hooks['build:before']()
  await hooks['generate:done']()
  return fs.readFileSync(path.join(tmp, 'dist', 'robots.txt'), 'utf8')
}

// --- mounting real pages ----------------------------------------------------

// A logged-in admin, because every admin page renders its content behind
// `$store.getters.userIsLoggedIn`.
const fakeStore = (state = {}) => ({
  state: { currentUser: { id: 1 }, selectedAdminStore: null, adminLocale: 'no', ...state },
  getters: { userIsLoggedIn: 1, clientPlatformName: 'Web' },
  dispatch: () => {},
  commit: () => {},
  subscribe: () => {}
})

/**
 * Mount a page's REAL template and REAL computeds.
 *
 * mounted/created/watch are dropped because they call network services that
 * have nothing to do with which host a link points at; the markup and the
 * computed under test are untouched. `marketConfig` and `isCh` normally come
 * from the global mixin in plugins/market-mixin.js, which is not installed in a
 * unit test, so they arrive as mocks -- exactly the values the store getter
 * would produce.
 */
const LIFECYCLE_TO_DROP = [
  'mounted', 'created', 'beforeMount', 'beforeCreate', 'watch', 'fetch', 'asyncData'
]

const renderPage = (sfc, { data = {}, mocks = {}, propsData = {} } = {}) => {
  const template = { ...sfc }
  LIFECYCLE_TO_DROP.forEach((hook) => { delete template[hook] })
  const seed = typeof sfc.data === 'function' ? sfc.data.call({}) : {}
  return shallowMount(
    { ...template, data: () => ({ ...seed, ...data }) },
    {
      propsData,
      // priceLabel comes from the ssr:false global mixin, which pulls in the
      // `core` submodule; it is money, pinned in test/money-format.test.js, and
      // nothing here asserts it.
      mocks: { $i: key => key, priceLabel: amount => String(amount), $store: fakeStore(), ...mocks }
    }
  )
}

const asMarket = (marketConfig, extra = {}) => ({
  marketConfig,
  isCh: marketConfig.code === 'ch',
  ...extra
})

afterEach(() => { jest.resetModules() })

// ---------------------------------------------------------------------------
// THE LINKS, AS RENDERED BY THE REAL PAGES
// ---------------------------------------------------------------------------

// FALSIFIED 2026-08-09: reverting all five files to their hardcoded
// https://shop.okam.no / https://admin.okam.no fails 8 tests here.
//
// Read the `ch:` shop-link cases with that in mind: markets.ch.shopUrl is
// currently the NORWEGIAN shop on purpose (shop.okam-swiss.ch is NXDOMAIN --
// see the descriptor), so those three cases cannot distinguish "reads the row"
// from "hardcodes Norway" while the interim stands. The `a third market` cases
// beside them do, and they are the ones that fail on a revert. When Sven
// supplies the real Swiss host the `ch:` cases regain their power on their own,
// because they assert markets.ch.shopUrl rather than a literal.
describe('every shop and admin link is rendered from the market row', () => {
  const AdminIndex = require('~/pages/admin/index.vue').default
  const AdminOverview = require('~/pages/admin/overview.vue').default
  const AdminOnboarding = require('~/pages/admin/onboarding.vue').default
  const RegistrertFerdig = require('~/pages/registrert-ferdig.vue').default
  const RedirectToNewStore = require('~/components/organisms/RedirectToNewStore.vue').default

  // --- the QR code a merchant PRINTS ---------------------------------------

  const qrUrlFor = (marketConfig) => {
    const wrapper = renderPage(AdminIndex, {
      mocks: asMarket(marketConfig, { $store: fakeStore({ selectedAdminStore: 4242 }) })
    })
    const printed = wrapper.find('.qr-url')
    expect(printed.exists()).toBe(true)
    return printed.text()
  }

  test('no: the QR url is unchanged', () => {
    expect(qrUrlFor(markets.no)).toBe('https://shop.okam.no/shop?id=4242')
  })

  test('ch: the QR url comes from the Swiss row', () => {
    expect(qrUrlFor(markets.ch)).toBe(markets.ch.shopUrl + '/shop?id=4242')
  })

  test('a third market gets its own QR url with no code edited', () => {
    expect(qrUrlFor(THIRD_MARKET)).toBe('https://shop.okam.example/shop?id=4242')
  })

  // --- the store list in the KAM overview ----------------------------------

  const storeLinkFor = (marketConfig) => {
    const wrapper = renderPage(AdminOverview, {
      data: { storeOverview: [{ storeId: 7, name: 'Pizzabakeren', approved: true, totalAmount: 0, orderCount: 0 }] },
      mocks: asMarket(marketConfig)
    })
    const link = wrapper.find('tbody a')
    expect(link.exists()).toBe(true)
    return link.attributes('href')
  }

  test('no: the overview store link is unchanged', () => {
    expect(storeLinkFor(markets.no)).toBe('https://shop.okam.no/store?id=7')
  })

  test('ch: the overview store link comes from the Swiss row', () => {
    expect(storeLinkFor(markets.ch)).toBe(markets.ch.shopUrl + '/store?id=7')
  })

  test('a third market gets its own overview store link', () => {
    expect(storeLinkFor(THIRD_MARKET)).toBe('https://shop.okam.example/store?id=7')
  })

  // --- the "your store is published" link ----------------------------------

  const publishedLinkFor = (marketConfig) => {
    const wrapper = renderPage(AdminOnboarding, {
      data: { isLoading: false, storeApproved: true, storeSlug: 'baeckerei' },
      mocks: asMarket(marketConfig)
    })
    const link = wrapper.find('a.shop-url')
    expect(link.exists()).toBe(true)
    return { href: link.attributes('href'), text: link.text() }
  }

  test('no: the published-store link is unchanged, href and visible text alike', () => {
    expect(publishedLinkFor(markets.no)).toEqual({
      href: 'https://shop.okam.no/store/baeckerei',
      text: 'https://shop.okam.no/store/baeckerei'
    })
  })

  test('ch: the published-store link comes from the Swiss row', () => {
    const expected = markets.ch.shopUrl + '/store/baeckerei'
    expect(publishedLinkFor(markets.ch)).toEqual({ href: expected, text: expected })
  })

  test('a third market gets its own published-store link', () => {
    expect(publishedLinkFor(THIRD_MARKET).href).toBe('https://shop.okam.example/store/baeckerei')
  })

  // --- the post-registration admin + download links ------------------------
  //
  // NOTE the limit of this one: registrert-ferdig.vue still forks on isCh for
  // its PROSE. Only the hosts come from the row, which is what these assert. A
  // third market reads Norwegian sentences with its own hosts in them.

  const postRegistrationFor = (marketConfig) => {
    const wrapper = renderPage(RegistrertFerdig, { mocks: asMarket(marketConfig) })
    const links = wrapper.findAll('a.cta-link')
    expect(links.length).toBe(2)
    return {
      adminHref: links.at(0).attributes('href'),
      adminText: links.at(0).text(),
      downloadHref: links.at(1).attributes('href'),
      subText: wrapper.find('.sub-text').text()
    }
  }

  test('no: every post-registration string is unchanged', () => {
    expect(postRegistrationFor(markets.no)).toEqual({
      adminHref: 'https://admin.okam.no',
      adminText: 'Gå til admin.okam.no',
      downloadHref: 'https://okam.no/last-ned',
      subText: 'Du kan nå legge inn menyen din på admin.okam.no eller i Okam Admin-appen'
    })
  })

  test('ch: the hosts come from the Swiss row, in German', () => {
    const rendered = postRegistrationFor(markets.ch)
    expect(rendered.adminHref).toBe(markets.ch.adminUrl)
    expect(rendered.downloadHref).toBe('https://okam-swiss.ch/last-ned')
    expect(rendered.subText).toContain('Sie können Ihre Speisekarte')
    expect(rendered.subText).not.toContain('okam.no')
  })

  test('a third market is not sent to Norway\'s admin panel', () => {
    const rendered = postRegistrationFor(THIRD_MARKET)
    expect(rendered.adminHref).toBe('https://admin.okam.example')
    expect(rendered.adminText).toBe('Gå til admin.okam.example')
    expect(rendered.downloadHref).toBe('https://okam.example/last-ned')
  })

  // --- the webshop redirect -------------------------------------------------
  //
  // The highest-consequence line in the lane: a hard window.location.href on
  // mount, with no back-out. Every pages/webshop/* route mounts it.

  const redirectTargetFor = (marketConfig, pathProp) => {
    const original = Object.getOwnPropertyDescriptor(window, 'location')
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: { href: 'https://example.test/webshop?store=99&utm=abc' }
    })
    try {
      // Mounted for real here: the redirect IS the behaviour under test.
      mount(RedirectToNewStore, {
        propsData: { path: pathProp },
        mocks: asMarket(marketConfig)
      })
      return window.location.href
    } finally {
      if (original) { Object.defineProperty(window, 'location', original) }
    }
  }

  test('no: the customer still lands on the Norwegian shop, query intact', () => {
    expect(redirectTargetFor(markets.no, '/shop')).toBe('https://shop.okam.no/shop?id=99&utm=abc')
  })

  test('ch: the customer lands on the Swiss row\'s shop', () => {
    expect(redirectTargetFor(markets.ch, '/shop')).toBe(markets.ch.shopUrl + '/shop?id=99&utm=abc')
  })

  test('a third market redirects to its own shop, not to Norway', () => {
    const target = redirectTargetFor(THIRD_MARKET, '/shop')
    expect(target).toBe('https://shop.okam.example/shop?id=99&utm=abc')
    expect(target).not.toContain('okam.no')
  })
})

// ---------------------------------------------------------------------------
// THE HOSTS MUST EXIST
// ---------------------------------------------------------------------------

describe('no market row points at a host that does not resolve', () => {
  // Measured with dig on 2026-08-09. shop.okam-swiss.ch and
  // admin.okam-swiss.ch are NXDOMAIN, and both were wired into a hard
  // window.location.href and into a QR code a merchant PRINTS -- neither of
  // which can fail soft. A wrong shop is a bug; a shop that does not resolve is
  // a dead end with no back-out.
  //
  // Add a host here only after checking it resolves.
  const HOSTS_VERIFIED_TO_RESOLVE = [
    // 185.199.108-111.153 (GitHub Pages)
    'okam.no',
    // Heroku, serves the live shop
    'shop.okam.no',
    // 46.30.213.63
    'admin.okam.no',
    // 216.198.79.1 (Vercel)
    'okam-swiss.ch'
  ]

  const NXDOMAIN_2026_08_09 = ['shop.okam-swiss.ch', 'admin.okam-swiss.ch']

  const hostsOf = entry => ['hostname', 'shopUrl', 'adminUrl']
    .map(field => new URL(entry[field]).hostname)

  test.each(marketCodes)('%s', (code) => {
    hostsOf(markets[code]).forEach((host) => {
      expect(HOSTS_VERIFIED_TO_RESOLVE).toContain(host)
    })
  })

  test('the two names that do not resolve appear in no row', () => {
    marketCodes.forEach((code) => {
      hostsOf(markets[code]).forEach((host) => {
        expect(NXDOMAIN_2026_08_09).not.toContain(host)
      })
    })
  })

  test('the Swiss shop is flagged in the descriptor as an interim, not as settled', () => {
    // It currently points at the Norwegian shop ON PURPOSE, because no Swiss
    // shop application is deployed. If someone silently drops the marker while
    // leaving the Norwegian host, this fails.
    const source = fs.readFileSync(path.join(REPO_ROOT, 'config', 'edition.js'), 'utf8')
    if (markets.ch.shopUrl === markets.no.shopUrl) {
      expect(source).toContain('INTERIM VALUE -- BLOCKED ON DNS')
    }
  })
})

// ---------------------------------------------------------------------------
// NORWAY DOES NOT MOVE
// ---------------------------------------------------------------------------

describe('the Norwegian surfaces are byte-identical to what is deployed', () => {
  test('the descriptor still carries the exact literals the pages used to hold', () => {
    expect(markets.no.shopUrl).toBe('https://shop.okam.no')
    expect(markets.no.adminUrl).toBe('https://admin.okam.no')
    expect(markets.no.hostname).toBe('https://okam.no')
    expect(markets.no.contactEmail).toBe('kontakt@okam.no')
    expect(markets.no.legalEmail).toBe('hei@okam.no')
    // Norway publishes no data-protection mailbox anywhere in this repo.
    // Whether it publishes one ELSEWHERE is an open question for Sven.
    expect(markets.no.privacyEmail).toBeNull()
  })

  test('the footer prints Norway\'s address, from the row', () => {
    const PageFooter = require('~/components/organisms/PageFooter.vue').default
    const wrapper = shallowMount(PageFooter, { mocks: asMarket(markets.no) })
    const mailto = wrapper.find('a[href^="mailto:"]')
    expect(mailto.attributes('href')).toBe('mailto:kontakt@okam.no')
    expect(mailto.text()).toBe('kontakt@okam.no')
    expect(wrapper.text()).toContain('Org nr.: 925 024 414')
  })

  test('the structured data still says NOK and okam.no', () => {
    const jsonld = jsonldFor('no')
    expect(jsonld.application.offers.priceCurrency).toBe('NOK')
    expect(jsonld.organization.url).toBe('https://okam.no')
    expect(jsonld.organization.logo).toBe('https://okam.no/icon.png')
  })

  test('an unset OKAM_EDITION still produces the Norwegian structured data', () => {
    expect(jsonldFor(undefined).organization.url).toBe('https://okam.no')
  })

  test('the Norwegian merchant agreement is still the one that is published', () => {
    const terms = merchantTermsFor(markets.no)
    expect(terms.published).toBe(true)
    expect(terms.documentId).toBe(MERCHANT_TERMS.no.documentId)
    expect(terms.title).toBe('Avtalevilkår for Okam AS')
  })
})

// ---------------------------------------------------------------------------
// ROBOTS.TXT
// ---------------------------------------------------------------------------

describe('robots.txt', () => {
  test('no: it points at the Norwegian sitemap -- and at a whole URL', () => {
    const robots = robotsFor('no')
    expect(robots.Sitemap).toBe('https://okam.no/sitemap.xml')
    // Regression pin. @nuxtjs/robots@2.5.0 parsed static/robots.txt with
    // `item.split(':')` and kept ar[1], so the shipped line read "Sitemap: https".
    expect(robots.Sitemap).not.toBe('https')
    expect(robots.Sitemap.startsWith('https://')).toBe(true)
  })

  test('ch: it points at the Swiss sitemap', () => {
    expect(robotsFor('ch').Sitemap).toBe('https://okam-swiss.ch/sitemap.xml')
  })

  test('it can no longer disagree with the sitemap module', () => {
    const cfg = configFor('ch')
    expect(robotsOptionsOf(cfg).Sitemap).toBe(cfg.sitemap.hostname + '/sitemap.xml')
  })

  test('every path the two old sources disallowed is still disallowed', () => {
    const robots = robotsFor('no')
    expect(robots.Disallow).toEqual(
      ['/admin', '/en/admin', '/import', '/import/', '/offer/', '/offers/', '/helle.jpg', '/lang']
    )
    expect(robots.Allow).toBe('/')
    expect(robots.UserAgent).toBe('*')
  })

  test('both /import forms are listed, because /import/ does not match /import', () => {
    const robots = robotsFor('no')
    expect(robots.Disallow).toContain('/import')
    expect(robots.Disallow).toContain('/import/')
  })

  test('the locale-prefixed admin is disallowed too, in robots and in the sitemap', () => {
    // `Disallow: /admin` does not reach across a nuxt-i18n locale prefix, so
    // okam.no/en/admin/orders was crawlable AND sitemap-listed.
    expect(robotsFor('no').Disallow).toContain('/en/admin')
    expect(markets.no.sitemapExclude).toContain('/en/admin/**')
  })

  test('static/robots.txt is gone, so nothing can re-inject the mangled rules', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'static', 'robots.txt'))).toBe(false)
  })

  // The options object is only an input. These run the real module.
  test('no: the FILE the module actually writes is correct', async () => {
    const rendered = await renderRobotsFile(robotsFor('no'))
    const lines = rendered.split('\n')

    expect(lines.filter(line => line.startsWith('User-agent:'))).toEqual(['User-agent: *'])
    expect(lines).toContain('Sitemap: https://okam.no/sitemap.xml')
    expect(lines).not.toContain('Sitemap: https')
    expect(lines).toContain('Disallow: /admin')
    expect(lines).toContain('Disallow: /en/admin')
    expect(lines).toContain('Allow: /')
  })

  test('ch: the FILE names the Swiss sitemap and nothing Norwegian', async () => {
    const rendered = await renderRobotsFile(robotsFor('ch'))
    expect(rendered.split('\n')).toContain('Sitemap: https://okam-swiss.ch/sitemap.xml')
    expect(rendered).not.toContain('okam.no')
  })
})

// ---------------------------------------------------------------------------
// ROUTES A MARKET DOES NOT BUILD
// ---------------------------------------------------------------------------

describe('a market does not ship another market\'s national legal documents', () => {
  // The mirror of utils/merchant-terms.js. Those three pages are Switzerland's
  // -- Swiss law, Swiss company form, a Zürich address -- and were emitted on
  // the Norwegian build, canonicalised to https://okam.no by
  // layouts/default.vue and served under `Allow: /`.

  test('Norway does not build the Swiss legal pages', () => {
    expect(markets.no.routeExclude).toEqual(['/impressum', '/datenschutz', '/agb'])
  })

  test('the router strips them, including their /en twins', () => {
    const cfg = configFor('no')
    const kept = cfg.router.extendRoutes([
      { path: '/impressum' }, { path: '/en/impressum' },
      { path: '/datenschutz' }, { path: '/en/datenschutz' },
      { path: '/agb' }, { path: '/en/agb' },
      { path: '/kontakt' }, { path: '/en/kontakt' },
      { path: '/terms' }
    ]).map(route => route.path)

    expect(kept).toEqual(['/kontakt', '/en/kontakt', '/terms'])
  })

  test('generate emits no HTML for them either', () => {
    // Both halves are required: generate.fallback is true, so a route left in
    // the client router would still render on a deep link with no HTML behind it.
    const cfg = configFor('no')
    expect(cfg.generate.exclude.length).toBe(3)
    expect(cfg.generate.exclude.some(re => re.test('/impressum'))).toBe(true)
    expect(cfg.generate.exclude.some(re => re.test('/en/datenschutz'))).toBe(true)
    expect(cfg.generate.exclude.some(re => re.test('/agb'))).toBe(true)
    expect(cfg.generate.exclude.some(re => re.test('/kontakt'))).toBe(false)
  })

  test('the matcher is anchored, so it cannot swallow a neighbouring route', () => {
    const cfg = configFor('no')
    const excluded = p => cfg.generate.exclude.some(re => re.test(p))
    expect(excluded('/agb')).toBe(true)
    expect(excluded('/agb-noe-annet')).toBe(false)
    expect(excluded('/impressum-old')).toBe(false)
    expect(excluded('/admin/agb')).toBe(false)
  })

  test('Switzerland excludes nothing today, and the reason is written down', () => {
    // Norway's four legal pages DO still ship on the Swiss build. /vilkar binds
    // a Swiss reader to "norsk kjøpslovgivning" and names Forbrukerrådet. They
    // stay only because pages/priser.vue and pages/registrer.vue link straight
    // at /vilkar on the Swiss build, and 404-ing a merchant mid-signup is worse
    // than the wrong text. This test exists so that stays a decision.
    expect(markets.ch.routeExclude).toEqual([])
    const source = fs.readFileSync(path.join(REPO_ROOT, 'config', 'edition.js'), 'utf8')
    expect(source).toContain('/personvern-og-vilkar')
    expect(source).toContain('showTerms()')
  })

  test('a third market builds neither country\'s legal pages', () => {
    const cfg = asThirdMarket(() => require('~/nuxt.config').default)
    const kept = cfg.router.extendRoutes([
      { path: '/impressum' }, { path: '/vilkar' }, { path: '/kontakt' }
    ]).map(route => route.path)
    // THIRD_MARKET.routeExclude names both countries' documents.
    expect(kept).toEqual(['/kontakt'])
  })
})

// ---------------------------------------------------------------------------
// SWITZERLAND
// ---------------------------------------------------------------------------

describe('the Swiss build is Swiss on every surface', () => {
  test('the site domain is the one Sven ruled canonical', () => {
    expect(markets.ch.hostname).toBe('https://okam-swiss.ch')
    expect(markets.ch.adminUrl).toBe('https://okam-swiss.ch/admin')
  })

  test('the mailboxes are carried over byte-identical from the page markup', () => {
    // Every one is tagged [Platzhalter] in the pages they came from: awaiting
    // legal review. Sven's okam-swiss.ch ruling is about the SITE domain and
    // says nothing about which mailbox exists, so these deliberately stayed on
    // @okam.ch. If someone "tidies" them to okam-swiss.ch without Sven, this
    // fails, which is the point.
    expect(markets.ch.contactEmail).toBe('kontakt@okam.ch')
    expect(markets.ch.legalEmail).toBe('hallo@okam.ch')
    expect(markets.ch.privacyEmail).toBe('datenschutz@okam.ch')
  })

  test('the structured data says CHF and okam-swiss.ch', () => {
    const jsonld = jsonldFor('ch')
    expect(jsonld.application.offers.priceCurrency).toBe('CHF')
    expect(jsonld.organization.url).toBe('https://okam-swiss.ch')
    expect(jsonld.organization.logo).toBe('https://okam-swiss.ch/icon.png')
    expect(JSON.stringify(jsonld.organization)).not.toContain('okam.no')
  })

  test('Switzerland is shown NO merchant agreement rather than Norway\'s', () => {
    const terms = merchantTermsFor(markets.ch)
    expect(terms.published).toBe(false)
    expect(terms.documentId).toBeNull()
    expect(terms.title).toBe('Vertragsbedingungen')
    expect(terms.body).toContain('noch keine Vertragsbedingungen veröffentlicht')
  })
})

// ---------------------------------------------------------------------------
// WHAT TermsContent RENDERS
// ---------------------------------------------------------------------------

describe('TermsContent renders a document only for the market that owns it', () => {
  const TermsContent = require('~/components/shared/TermsContent.vue').default
  const renderFor = marketConfig => mount(TermsContent, { mocks: { marketConfig } }).text()

  test('Norway still reads exactly as it did, jurisdiction clause included', () => {
    const rendered = renderFor(markets.no)
    expect(rendered).toContain('Avtalevilkår for Okam AS')
    expect(rendered).toContain('Sist oppdatert: 12. april 2025')
    expect(rendered).toContain('Avtalen reguleres av norsk rett. Tvister løses i minnelighet eller ved Oslo tingrett.')
    expect(rendered).toContain('Okam AS org. nr. 925 024 414')
    expect(rendered).toContain('hei@okam.no')
  })

  test('Switzerland is never shown norsk rett or Oslo tingrett', () => {
    const rendered = renderFor(markets.ch)
    expect(rendered).not.toContain('norsk rett')
    expect(rendered).not.toContain('Oslo tingrett')
    expect(rendered).not.toContain('Avtalevilkår')
    expect(rendered).not.toContain('925 024 414')
  })

  test('Switzerland is told the truth, and told who to ask', () => {
    const rendered = renderFor(markets.ch)
    expect(rendered).toContain('Vertragsbedingungen')
    expect(rendered).toContain('noch keine Vertragsbedingungen veröffentlicht')
    expect(rendered).toContain(markets.ch.contactEmail)
  })

  test('the contact address is a real mailto link, not just text', () => {
    const wrapper = mount(TermsContent, { mocks: { marketConfig: markets.ch } })
    expect(wrapper.find('a').attributes('href')).toBe('mailto:kontakt@okam.ch')
  })

  test('a third market gets the honest state too, with no code edited', () => {
    const rendered = renderFor(THIRD_MARKET)
    expect(rendered).not.toContain('norsk rett')
    expect(rendered).not.toContain('Oslo tingrett')
    expect(rendered).toContain('Terms of agreement')
    expect(rendered).toContain(THIRD_MARKET.contactEmail)
  })

  test('the template reads the document id from the registry, not from a copy', () => {
    // A second literal in the template could drift from the registry, and the
    // failure mode is silent: `published: true` with no branch to render it,
    // i.e. a page headed "Avtalevilkår for Okam AS" with no contract under it,
    // shown directly above the acceptance tick-box in pages/offer/_code.vue.
    expect(merchantTermsFor(markets.no).documentId).toBe(MERCHANT_TERMS.no.documentId)
  })

  test('a registered document with no matching block REFUSES, it does not go blank', () => {
    MERCHANT_TERMS.xd = { documentId: 'xd-agreement-2026', title: 'Vertrag' }
    try {
      const rendered = renderFor({ code: 'xd', locale: 'en', contactEmail: 'legal@okam.example' })
      expect(rendered).toContain('could not be shown')
      expect(rendered).toContain('Do not accept terms you have not read')
      expect(rendered).toContain('legal@okam.example')
      // Not the unpublished state, and definitely not Norway's.
      expect(rendered).not.toContain('has not published terms of agreement')
      expect(rendered).not.toContain('Oslo tingrett')
    } finally {
      delete MERCHANT_TERMS.xd
    }
  })

  test('the refusal speaks the market\'s language', () => {
    MERCHANT_TERMS.xd = { documentId: 'xd-agreement-2026', title: 'Vertrag' }
    try {
      const rendered = renderFor({ code: 'xd', locale: 'de', contactEmail: 'legal@okam.example' })
      expect(rendered).toContain('konnten nicht angezeigt werden')
      expect(rendered).toContain('Akzeptieren Sie keine Bedingungen, die Sie nicht gelesen haben')
    } finally {
      delete MERCHANT_TERMS.xd
    }
  })

  test('the modal header follows the same lookup as the body', () => {
    const TermsModal = require('~/components/modals/TermsModal.vue').default
    const headingFor = marketConfig => shallowMount(TermsModal, {
      propsData: { isVisible: true },
      mocks: { marketConfig }
    }).find('h2').text()

    expect(headingFor(markets.no)).toBe('Avtalevilkår for Okam AS')
    expect(headingFor(markets.ch)).toBe('Vertragsbedingungen')
    expect(headingFor(THIRD_MARKET)).toBe('Terms of agreement')
  })
})

describe('the merchant-agreement lookup has no fallback row', () => {
  test('exactly one market publishes a merchant agreement', () => {
    expect(Object.keys(MERCHANT_TERMS)).toEqual(['no'])
  })

  test('every market other than Norway resolves to the honest state', () => {
    const others = marketCodes.filter(code => code !== 'no')
    // A loop over an empty set reports green. If 'ch' is ever renamed, this
    // fails rather than quietly asserting nothing.
    expect(others.length).toBeGreaterThanOrEqual(1)
    others.forEach((code) => {
      const terms = merchantTermsFor(markets[code])
      expect(terms.published).toBe(false)
      expect(terms.documentId).toBeNull()
      expect(terms.title).not.toBe('Avtalevilkår for Okam AS')
    })
  })

  test('an unlisted market lands on no row at all', () => {
    const unlisted = { code: 'zz', locale: 'fr' }
    expect(merchantTermsFor(unlisted).published).toBe(false)
    // An unknown language falls back to English, not to Norwegian.
    expect(merchantTermsFor(unlisted).title).toBe('Terms of agreement')
  })
})

// ---------------------------------------------------------------------------
// MARKET #3
// ---------------------------------------------------------------------------

// One row, of the shape config/edition.js requires. Declared at module scope
// because the mounted-page assertions above use it too.
const THIRD_MARKET = {
  code: 'xa',
  locale: 'fr',
  locales: ['fr'],
  currency: 'EUR',
  currencyFormat: markets.ch.currencyFormat,
  country: 'AT',
  hostname: 'https://okam.example',
  shopUrl: 'https://shop.okam.example',
  adminUrl: 'https://admin.okam.example',
  phonePrefix: '+43',
  contactEmail: 'contact@okam.example',
  legalEmail: 'legal@okam.example',
  privacyEmail: null,
  gaId: null,
  fbPixelId: null,
  sitemapExclude: ['/admin/**'],
  routeExclude: ['/impressum', '/datenschutz', '/agb', '/vilkar']
}

/**
 * Force the BUILD market to the third market.
 *
 * HONEST ABOUT WHAT IS FAKED: registering a market for real is one env var plus
 * one row in `markets`, after which config/edition.js DERIVES `market` via
 * resolveMarket(EDITION) and `isCh` from market.code. A jest module factory
 * cannot add a row before the module it is replacing evaluates, so the two
 * derived exports are recomputed here -- by the same expressions the real file
 * uses. What is bypassed is resolveMarket's THROW on an unknown code, nothing
 * else. The describe below exercises resolveMarket itself, unmocked.
 *
 * Everything the assertions read -- nuxt.config.js, plugins/jsonld.js -- is
 * production code running against this registry.
 */
const asThirdMarket = (loader) => {
  jest.resetModules()
  jest.doMock('~/config/edition', () => {
    const actual = jest.requireActual('~/config/edition')
    const registry = { ...actual.markets, xa: THIRD_MARKET }
    const EDITION = 'xa'
    // resolveMarket, minus the throw
    const market = registry[EDITION]
    return {
      ...actual,
      EDITION,
      market,
      // verbatim from config/edition.js
      isCh: market.code === 'ch',
      markets: registry,
      marketCodes: Object.keys(registry)
    }
  })
  try {
    return loader()
  } finally {
    jest.dontMock('~/config/edition')
    jest.resetModules()
  }
}

describe('registering a third market goes through the real resolveMarket', () => {
  // The unmocked path: a row in the real registry, resolved by the real code.
  beforeAll(() => { markets.xr = { ...THIRD_MARKET, code: 'xr' } })
  afterAll(() => { delete markets.xr })

  test('resolveMarket returns the new row', () => {
    expect(resolveMarket('xr')).toBe(markets.xr)
    expect(resolveMarket('xr').shopUrl).toBe('https://shop.okam.example')
  })

  test('runtimeMarketConfig resolves it too, without falling back to Norway', () => {
    expect(runtimeMarketConfig('xr')).toBe(markets.xr)
    expect(runtimeMarketConfig('xr')).not.toBe(markets.no)
  })

  test('an INCOMPLETE row is refused by name, at the config, not at a consumer', () => {
    // Before this guard, a row missing adminUrl generated cleanly and then blew
    // up inside registrert-ferdig.vue's .replace(); a row missing contactEmail
    // silently rendered <a href="mailto:undefined">undefined</a>.
    markets.xbad = { code: 'xbad', locale: 'en' }
    try {
      expect(() => resolveMarket('xbad')).toThrow(/Market "xbad" is missing required field/)
      expect(() => resolveMarket('xbad')).toThrow(/adminUrl/)
      expect(() => resolveMarket('xbad')).toThrow(/contactEmail/)
    } finally {
      delete markets.xbad
    }
  })

  test('a row with an incomplete currencyFormat is refused too', () => {
    markets.xfmt = { ...THIRD_MARKET, code: 'xfmt', currencyFormat: { symbol: 'X' } }
    try {
      expect(() => resolveMarket('xfmt')).toThrow(/incomplete currencyFormat/)
    } finally {
      delete markets.xfmt
    }
  })
})

describe('a third market gets its own identity with no code edited', () => {
  test('its structured data carries its own currency and its own host', () => {
    const jsonld = asThirdMarket(loadJsonld)
    expect(jsonld.application.offers.priceCurrency).toBe('EUR')
    expect(jsonld.organization.url).toBe('https://okam.example')
    expect(jsonld.organization.logo).toBe('https://okam.example/icon.png')
  })

  test('no Norwegian or Swiss money or host leaks into its structured data', () => {
    const organization = JSON.stringify(asThirdMarket(loadJsonld).organization)
    expect(organization).not.toContain('okam.no')
    expect(organization).not.toContain('okam-swiss.ch')
    expect(JSON.stringify(asThirdMarket(loadJsonld).application.offers)).not.toContain('NOK')
  })

  test('its robots.txt names its own sitemap', () => {
    const robots = asThirdMarket(() => robotsOptionsOf(require('~/nuxt.config').default))
    expect(robots.Sitemap).toBe('https://okam.example/sitemap.xml')
    expect(robots.Disallow).toContain('/admin')
  })

  test('the FILE written for it names its own sitemap', async () => {
    const options = asThirdMarket(() => robotsOptionsOf(require('~/nuxt.config').default))
    const rendered = await renderRobotsFile(options)
    expect(rendered.split('\n')).toContain('Sitemap: https://okam.example/sitemap.xml')
    expect(rendered).not.toContain('okam.no')
  })

  test('its build config carries the sitemap line the old config never had', () => {
    // A `not.toContain('okam.no')` here would be vacuous: at 8059e200 the
    // config object never held a Sitemap value at all -- the broken
    // "Sitemap: https" came from static/robots.txt, read at build:before.
    // This asserts the value that is NEW, so it could not have passed at base.
    const serialised = JSON.stringify(asThirdMarket(() => require('~/nuxt.config').default))
    expect(serialised).toContain('https://okam.example/sitemap.xml')
    expect(serialised).toContain('okam.example')
  })
})

// ---------------------------------------------------------------------------
// THE TRANSLATION COUPLING
// ---------------------------------------------------------------------------

describe('the delivery summary takes one {price} token in every language', () => {
  // The actual live bug this lane exists to fix, and the one place where a
  // missed FILE (rather than a missed line) reproduces it exactly: had de.ts
  // kept "kr {wholeAmount},{fractionAmount}" while the call site started
  // passing `price`, German would render the token literally and every other
  // assertion in this suite would still pass.
  const TRANSLATION_FILES = ['no.ts', 'de.ts', 'en.ts']

  const summaryLineOf = (file) => {
    const source = fs.readFileSync(path.join(REPO_ROOT, 'translations', file), 'utf8')
    const line = source.split('\n').find(l => l.includes('delivery_methodSummary:'))
    expect(line).toBeDefined()
    return line
  }

  test.each(TRANSLATION_FILES)('%s takes {price} and builds no money of its own', (file) => {
    const line = summaryLineOf(file)
    expect(line).toContain('{price}')
    expect(line).not.toContain('{wholeAmount}')
    expect(line).not.toContain('{fractionAmount}')
    expect(line).not.toContain('kr ')
  })

  test('all three files are actually present, so test.each is not iterating a typo', () => {
    TRANSLATION_FILES.forEach((file) => {
      expect(fs.existsSync(path.join(REPO_ROOT, 'translations', file))).toBe(true)
    })
  })

  test('the call site passes exactly that token', () => {
    const source = fs.readFileSync(path.join(REPO_ROOT, 'pages', 'admin', 'delivery.vue'), 'utf8')
    expect(source).toContain('price: this.priceFromParts(wholeAmount, fractionAmount)')
    expect(source).not.toContain('wholeAmount,\n        fractionAmount,')
  })
})

// ---------------------------------------------------------------------------
// THE LITERALS ARE GONE FOR GOOD
// ---------------------------------------------------------------------------

describe('no scanned .vue/.js/.ts file names a market host or mailbox', () => {
  // The unit tests above prove the descriptor is CONSUMED. This proves the
  // literals are not still sitting somewhere else as well -- which is how
  // "market selection is a lookup" quietly decays back into a fork.
  //
  // Its scope is exactly its name: the directories below. config/edition.js is
  // not among them, because it is where the values are supposed to live.
  const SCANNED_DIRS = [
    'components', 'pages', 'plugins', 'layouts', 'middleware', 'store', 'utils', 'translations'
  ]
  const SCANNED_EXTENSIONS = ['.vue', '.js', '.ts']

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    return entries.reduce((files, entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { return files.concat(walk(full)) }
      return SCANNED_EXTENSIONS.includes(path.extname(entry.name)) ? files.concat(full) : files
    }, [])
  }

  // No `.filter(fs.existsSync)`: a renamed directory must fail the scan, not
  // silently shrink it.
  const shippedFiles = SCANNED_DIRS
    .map(dir => path.join(REPO_ROOT, dir))
    .reduce((files, dir) => files.concat(walk(dir)), [])
    .concat(path.join(REPO_ROOT, 'nuxt.config.js'))

  const isComment = text => /^\s*(\/\/|\*|\/\*|<!--)/.test(text.trim())

  const offenders = needle => shippedFiles
    .map(file => ({ file: path.relative(REPO_ROOT, file), lines: fs.readFileSync(file, 'utf8').split('\n') }))
    .reduce((hits, { file, lines }) => hits.concat(
      lines
        .map((text, index) => ({ text, line: index + 1 }))
        .filter(({ text }) => text.includes(needle) && !isComment(text))
        .map(({ line, text }) => `${file}:${line}: ${text.trim()}`)
    ), [])

  // Residue that is knowingly still there. An allowlist fails when the residue
  // GROWS; a comment does not.
  const ALLOWED = {
    // salesLetter_website is keyed by LANGUAGE, not by market, so a
    // French-speaking Swiss admin falls through to no.ts and gets okam.no.
    // Untangling that is a separate change; this pins its current size.
    'okam-swiss.ch': [{ file: 'translations/de.ts', count: 1 }]
  }

  const unallowed = (needle) => {
    const allowed = ALLOWED[needle] || []
    return offenders(needle).filter(hit => !allowed.some(
      entry => hit.startsWith(entry.file + ':')
    ))
  }

  test('the scan can find something -- positive control through offenders()', () => {
    // Every ban below has zero matches, so without a live needle a broken
    // offenders() (wrong root, inverted filter, wrong extname) would pass all
    // of them. `@okam.no` is real, unfixed residue inside the scanned tree, so
    // it exercises the identical code path and must come back non-empty.
    const found = offenders('@okam.no')
    expect(found.length).toBeGreaterThanOrEqual(6)
    const files = found.map(hit => hit.split(':')[0])
    expect(files).toContain('components/shared/TermsContent.vue')
    expect(files).toContain('pages/admin/wolt.vue')
    expect(files).toContain('translations/de.ts')
  })

  test('the consumer shop host appears in no scanned file', () => {
    expect(unallowed('shop.okam.')).toEqual([])
  })

  test('the admin host appears in no scanned file', () => {
    expect(unallowed('admin.okam.')).toEqual([])
  })

  test('the Swiss site domain appears in no scanned file but the allowlisted one', () => {
    expect(unallowed('okam-swiss.ch')).toEqual([])
  })

  test('a Swiss mailbox appears in no scanned file', () => {
    expect(unallowed('@okam.ch')).toEqual([])
  })

  test('every allowlisted residue is still real, and still exactly that size', () => {
    // A stale allowlist is as bad as a missing one: it hides a fix as easily as
    // a regression.
    Object.keys(ALLOWED).forEach((needle) => {
      ALLOWED[needle].forEach((entry) => {
        const hits = offenders(needle).filter(hit => hit.startsWith(entry.file + ':'))
        expect(hits).toHaveLength(entry.count)
      })
    })
  })

  test('the scan actually walked every root it claims to', () => {
    // A scan that silently walks nothing passes every assertion above.
    expect(shippedFiles.length).toBeGreaterThan(100)
    const relative = shippedFiles.map(file => path.relative(REPO_ROOT, file))

    // At least one real file from EVERY scanned root, so a root cannot vanish
    // with the count floor still satisfied by the other seven.
    expect(relative).toEqual(expect.arrayContaining([
      'components/shared/TermsContent.vue',
      'components/organisms/PageFooter.vue',
      'components/organisms/RedirectToNewStore.vue',
      'pages/registrer.vue',
      'pages/registrert-ferdig.vue',
      'pages/kontakt.vue',
      'pages/impressum.vue',
      'pages/agb.vue',
      'pages/datenschutz.vue',
      'pages/admin/index.vue',
      'pages/admin/overview.vue',
      'pages/admin/onboarding.vue',
      'plugins/jsonld.js',
      'plugins/market-mixin.js',
      'layouts/default.vue',
      'middleware/om-okam.js',
      'store/index.js',
      'utils/price.js',
      'utils/merchant-terms.js',
      'translations/de.ts',
      'nuxt.config.js'
    ]))

    SCANNED_DIRS.forEach((dir) => {
      expect(relative.some(file => file.startsWith(dir + path.sep))).toBe(true)
    })
  })
})
