// Pins the SITE-IDENTITY contract: every surface a visitor can see that names a
// market -- the shop link, the admin link, the mailboxes, the structured data,
// robots.txt, and WHICH merchant agreement is reachable.
//
// The gate is the one config/edition.js already sets for money, applied to
// identity: a THIRD market, declared as data with no code edited, must get its
// own values everywhere. Relocating a literal from a page into the descriptor
// proves nothing on its own; the synthetic-market block below is what proves it.
//
// `.github/workflows/nuxtjs.yml` runs no tests and `main` auto-deploys, so these
// assertions are the only gate these files get.

const fs = require('fs')
const path = require('path')

const { markets } = require('~/config/edition')
const { merchantTermsFor, MERCHANT_TERMS } = require('~/utils/merchant-terms')

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

// The options object nuxt.config hands @nuxtjs/robots, which is what the module
// renders into dist/robots.txt at generate:done.
const robotsOptionsOf = (cfg) => {
  const entry = cfg.modules.find(m => Array.isArray(m) && m[0] === '@nuxtjs/robots')
  expect(entry).toBeDefined()
  // A module entry is [src, options]. Anything after options is silently
  // ignored by nuxt -- which is how the old third element ({ Disallow: '/import' })
  // was dropped without a word. Asserting the length keeps that from returning.
  expect(entry).toHaveLength(2)
  return entry[1]
}

const robotsFor = edition => withEdition(edition, () => robotsOptionsOf(require('~/nuxt.config').default))

afterEach(() => { jest.resetModules() })

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
    expect(markets.no.privacyEmail).toBeNull()
  })

  test('the shop links a Norwegian admin is given are unchanged', () => {
    const shop = markets.no.shopUrl
    expect(`${shop}/shop?id=${42}`).toBe('https://shop.okam.no/shop?id=42')
    expect(`${shop}/store?id=${42}`).toBe('https://shop.okam.no/store?id=42')
    expect(`${shop}/store/${'pizzabakeren'}`).toBe('https://shop.okam.no/store/pizzabakeren')
    expect(`${shop}${'/shop'}`).toBe('https://shop.okam.no/shop')
  })

  test('the post-registration copy is unchanged, host and prose alike', () => {
    const adminHost = markets.no.adminUrl.replace(/^https?:\/\//, '')
    expect(adminHost).toBe('admin.okam.no')
    expect(`Du kan nå legge inn menyen din på ${adminHost} eller i Okam Admin-appen`)
      .toBe('Du kan nå legge inn menyen din på admin.okam.no eller i Okam Admin-appen')
    expect(`Gå til ${adminHost}`).toBe('Gå til admin.okam.no')
    expect(`${markets.no.hostname}/last-ned`).toBe('https://okam.no/last-ned')
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

  test('robots.txt points at the Norwegian sitemap -- and now at a whole URL', () => {
    const robots = robotsFor('no')
    expect(robots.Sitemap).toBe('https://okam.no/sitemap.xml')
    // Regression pin. @nuxtjs/robots@2.5.0 parsed static/robots.txt with
    // `item.split(':')` and kept ar[1], so the shipped line read "Sitemap: https".
    expect(robots.Sitemap).not.toBe('https')
    expect(robots.Sitemap.startsWith('https://')).toBe(true)
  })

  test('robots.txt still disallows every path the two old sources disallowed', () => {
    const robots = robotsFor('no')
    // '/admin/' is absent only because '/admin' already prefix-matches it.
    expect(robots.Disallow).toEqual(['/admin', '/import/', '/offer/', '/offers/', '/helle.jpg', '/lang'])
    expect(robots.Allow).toBe('/')
    expect(robots.UserAgent).toBe('*')
  })

  test('static/robots.txt is gone, so nothing can re-inject the mangled rules', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'static', 'robots.txt'))).toBe(false)
  })

  test('the Norwegian merchant agreement is still the one that is published', () => {
    const terms = merchantTermsFor(markets.no)
    expect(terms.published).toBe(true)
    expect(terms.documentId).toBe('no-avtalevilkar-2025-04-12')
    expect(terms.title).toBe('Avtalevilkår for Okam AS')
  })
})

// ---------------------------------------------------------------------------
// SWITZERLAND
// ---------------------------------------------------------------------------

describe('the Swiss build is Swiss on every surface', () => {
  test('links resolve to okam-swiss.ch, the domain Sven ruled canonical', () => {
    expect(markets.ch.hostname).toBe('https://okam-swiss.ch')
    expect(markets.ch.shopUrl).toBe('https://shop.okam-swiss.ch')
    expect(markets.ch.adminUrl).toBe('https://admin.okam-swiss.ch')
    expect(`${markets.ch.shopUrl}/store/${'baeckerei'}`).toBe('https://shop.okam-swiss.ch/store/baeckerei')
  })

  test('no Swiss-facing value points a merchant at the Norwegian shop', () => {
    const swissFacing = [
      markets.ch.hostname, markets.ch.shopUrl, markets.ch.adminUrl,
      markets.ch.contactEmail, markets.ch.legalEmail, markets.ch.privacyEmail
    ]
    swissFacing.forEach((value) => {
      expect(value).not.toContain('okam.no')
    })
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

  test('robots.txt points at the Swiss sitemap, not the Norwegian one', () => {
    expect(robotsFor('ch').Sitemap).toBe('https://okam-swiss.ch/sitemap.xml')
  })

  test('robots.txt and the sitemap module can no longer disagree', () => {
    const cfg = withEdition('ch', () => require('~/nuxt.config').default)
    expect(robotsOptionsOf(cfg).Sitemap).toBe(cfg.sitemap.hostname + '/sitemap.xml')
  })

  test('Switzerland is shown NO merchant agreement rather than Norway\'s', () => {
    const terms = merchantTermsFor(markets.ch)
    expect(terms.published).toBe(false)
    expect(terms.documentId).toBeNull()
    // ...and the honest state is in the market's own language.
    expect(terms.title).toBe('Vertragsbedingungen')
    expect(terms.body).toContain('noch keine Vertragsbedingungen veröffentlicht')
  })
})

// ---------------------------------------------------------------------------
// NORWEGIAN LAW IS UNREACHABLE OFF NORWAY
// ---------------------------------------------------------------------------

describe('Norwegian jurisdiction cannot reach a non-Norwegian market', () => {
  const NORWEGIAN_DOCUMENT_MARKUP = fs.readFileSync(
    path.join(REPO_ROOT, 'components', 'shared', 'TermsContent.vue'), 'utf8'
  )

  test('the document that names Oslo tingrett is gated on its own documentId', () => {
    // The sentence is still in the file -- Norway must keep it.
    expect(NORWEGIAN_DOCUMENT_MARKUP).toContain('Avtalen reguleres av norsk rett')
    expect(NORWEGIAN_DOCUMENT_MARKUP).toContain('Oslo tingrett')
    // ...behind a v-if on the documentId, never on `!isCh`. An inverted fork
    // would hand market #3 Norwegian law without anyone editing a line.
    expect(NORWEGIAN_DOCUMENT_MARKUP).toContain("v-if=\"terms.documentId === 'no-avtalevilkar-2025-04-12'\"")
    expect(NORWEGIAN_DOCUMENT_MARKUP).not.toContain('isCh')
  })

  test('exactly one market publishes a merchant agreement', () => {
    expect(Object.keys(MERCHANT_TERMS)).toEqual(['no'])
  })

  test('every market other than Norway resolves to the honest state', () => {
    Object.keys(markets)
      .filter(code => code !== 'no')
      .forEach((code) => {
        const terms = merchantTermsFor(markets[code])
        expect(terms.published).toBe(false)
        expect(terms.documentId).toBeNull()
        expect(terms.title).not.toBe('Avtalevilkår for Okam AS')
      })
  })

  test('the lookup has no fallback row that a new market could land on', () => {
    const unlisted = { code: 'zz', locale: 'fr' }
    expect(merchantTermsFor(unlisted).published).toBe(false)
    // An unknown language falls back to English, not to Norwegian.
    expect(merchantTermsFor(unlisted).title).toBe('Terms of agreement')
  })
})

describe('what TermsContent actually renders', () => {
  // The assertions above are about the lookup. These are about the bytes on the
  // page, which is what a merchant signs against.
  const { mount } = require('@vue/test-utils')
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
    const rendered = renderFor({
      code: 'xa', locale: 'fr', contactEmail: 'contact@okam.example'
    })
    expect(rendered).not.toContain('norsk rett')
    expect(rendered).not.toContain('Oslo tingrett')
    expect(rendered).toContain('Terms of agreement')
    expect(rendered).toContain('contact@okam.example')
  })
})

// ---------------------------------------------------------------------------
// MARKET #3: NO CODE EDITED
// ---------------------------------------------------------------------------

describe('a third market gets its own identity with no code edited', () => {
  // Registered exactly the way a real market would be: one row in `markets`.
  // Nothing below patches a page, a plugin or nuxt.config.
  const XA = {
    code: 'xa',
    locale: 'fr',
    locales: ['fr'],
    currency: 'EUR',
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
    currencyFormat: markets.ch.currencyFormat
  }

  const asThirdMarket = (loader) => {
    jest.resetModules()
    jest.doMock('~/config/edition', () => {
      const actual = jest.requireActual('~/config/edition')
      return {
        ...actual,
        EDITION: 'xa',
        isCh: false,
        market: XA,
        markets: { ...actual.markets, xa: XA }
      }
    })
    try {
      return loader()
    } finally {
      jest.dontMock('~/config/edition')
      jest.resetModules()
    }
  }

  test('its structured data carries its own currency and its own host', () => {
    const jsonld = asThirdMarket(loadJsonld)
    expect(jsonld.application.offers.priceCurrency).toBe('EUR')
    expect(jsonld.organization.url).toBe('https://okam.example')
    expect(jsonld.organization.logo).toBe('https://okam.example/icon.png')
    expect(jsonld.organization.url).not.toContain('okam.no')
  })

  test('no Norwegian or Swiss money or host leaks into its structured data', () => {
    const serialised = JSON.stringify(asThirdMarket(loadJsonld).organization)
    expect(serialised).not.toContain('okam.no')
    expect(serialised).not.toContain('okam-swiss.ch')
    expect(JSON.stringify(asThirdMarket(loadJsonld).application.offers)).not.toContain('NOK')
  })

  test('its robots.txt names its own sitemap', () => {
    const robots = asThirdMarket(() => robotsOptionsOf(require('~/nuxt.config').default))
    expect(robots.Sitemap).toBe('https://okam.example/sitemap.xml')
    expect(robots.Sitemap).not.toContain('okam.no')
    // ...and it still inherits the shared crawl rules.
    expect(robots.Disallow).toContain('/admin')
  })

  test('its whole build config is free of Norwegian identifiers', () => {
    const serialised = JSON.stringify(asThirdMarket(() => require('~/nuxt.config').default))
    expect(serialised).not.toContain('okam.no')
    expect(serialised).toContain('okam.example')
  })

  test('its shop and admin links come from its own row', () => {
    expect(`${XA.shopUrl}/store/${'chez-nous'}`).toBe('https://shop.okam.example/store/chez-nous')
    expect(XA.adminUrl.replace(/^https?:\/\//, '')).toBe('admin.okam.example')
    expect(`${XA.hostname}/last-ned`).toBe('https://okam.example/last-ned')
  })

  test('its mailboxes come from its own row, and a missing one stays missing', () => {
    expect(XA.contactEmail).toBe('contact@okam.example')
    expect(XA.legalEmail).toBe('legal@okam.example')
    // The page must render an honest marker for this, not borrow Switzerland's.
    expect(XA.privacyEmail).toBeNull()
  })

  test('it is shown no merchant agreement, in a language it can read', () => {
    const terms = merchantTermsFor(XA)
    expect(terms.published).toBe(false)
    expect(terms.title).toBe('Terms of agreement')
    expect(terms.body).not.toContain('norsk')
  })
})

// ---------------------------------------------------------------------------
// THE LITERALS ARE GONE FOR GOOD
// ---------------------------------------------------------------------------

describe('no shipped file outside the descriptor names a market host or mailbox', () => {
  // The unit tests above prove the descriptor is CONSUMED. This proves the
  // literals are not still sitting somewhere else as well -- which is how
  // "market selection is a lookup" quietly decays back into a fork.
  const SCANNED_DIRS = ['components', 'pages', 'plugins', 'layouts', 'middleware', 'store', 'utils']
  const SCANNED_EXTENSIONS = ['.vue', '.js', '.ts']

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    return entries.reduce((files, entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { return files.concat(walk(full)) }
      return SCANNED_EXTENSIONS.includes(path.extname(entry.name)) ? files.concat(full) : files
    }, [])
  }

  const shippedFiles = SCANNED_DIRS
    .map(dir => path.join(REPO_ROOT, dir))
    .filter(fs.existsSync)
    .reduce((files, dir) => files.concat(walk(dir)), [])
    .concat(path.join(REPO_ROOT, 'nuxt.config.js'))

  const offenders = (needle, isComment) => shippedFiles
    .map(file => ({ file: path.relative(REPO_ROOT, file), lines: fs.readFileSync(file, 'utf8').split('\n') }))
    .reduce((hits, { file, lines }) => hits.concat(
      lines
        .map((text, index) => ({ text, line: index + 1 }))
        .filter(({ text }) => text.includes(needle) && !isComment(text))
        .map(({ line, text }) => `${file}:${line}: ${text.trim()}`)
    ), [])

  // nuxt.config.js's robots block quotes the old broken output in a comment, on
  // purpose -- a reader has to be able to see what was wrong.
  const isComment = text => /^\s*(\/\/|\*|<!--)/.test(text.trim()) || text.trim().startsWith('//')

  test('the consumer shop host appears nowhere but config/edition.js', () => {
    expect(offenders('shop.okam.', isComment)).toEqual([])
  })

  test('the admin host appears nowhere but config/edition.js', () => {
    expect(offenders('admin.okam.', isComment)).toEqual([])
  })

  test('the Swiss site domain appears nowhere but config/edition.js', () => {
    // translations/de.ts is deliberately outside this scan: see the residue
    // note in the report -- salesLetter_website is keyed by LANGUAGE, not by
    // market, and untangling that is a separate change.
    expect(offenders('okam-swiss.ch', isComment)).toEqual([])
  })

  test('a Swiss mailbox appears nowhere but config/edition.js', () => {
    expect(offenders('@okam.ch', isComment)).toEqual([])
  })

  test('the scan actually looked at the files it claims to', () => {
    // A scan that silently walks nothing passes every assertion above.
    expect(shippedFiles.length).toBeGreaterThan(100)
    expect(shippedFiles.map(f => path.relative(REPO_ROOT, f))).toEqual(
      expect.arrayContaining([
        'components/organisms/RedirectToNewStore.vue',
        'components/shared/TermsContent.vue',
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
        'nuxt.config.js'
      ])
    )
    // And it must be able to FIND something: the descriptor is excluded from
    // the scan by not being in SCANNED_DIRS, so prove the needle is real.
    expect(fs.readFileSync(path.join(REPO_ROOT, 'config', 'edition.js'), 'utf8')).toContain('shop.okam.')
  })
})
