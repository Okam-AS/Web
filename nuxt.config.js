import redirectSSL from 'redirect-ssl'
// Single source for everything the build flag OKAM_EDITION selects. Importing it
// here also means an unknown OKAM_EDITION throws while nuxt reads this config --
// before it builds anything -- instead of shipping a market that looks Norwegian.
import { market } from './config/edition'

const fbPixelId = market.fbPixelId
// Routes kept out of this edition's sitemap. The Norwegian sitemap also drops the
// Swiss-only legal pages so they're not discoverable on okam.no.
const sitemapExclude = market.sitemapExclude

// Routes this market does not BUILD -- another market's national legal
// documents. Sitemap exclusion only hides a page from discovery; these were
// still emitted as HTML, self-canonicalised by layouts/default.vue, and served
// under `Allow: /`. Matching is anchored and tolerates a nuxt-i18n locale
// prefix, so '/impressum' also removes '/en/impressum' whichever order the
// route table is built in.
const routeExcludeMatchers = market.routeExclude.map(
  route => new RegExp('^/([a-z]{2}/)?' + route.replace(/^\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/?$')
)
const routeIsExcluded = path => routeExcludeMatchers.some(matcher => matcher.test(path))

export default {
  debug: true,
  // Target for static generation
  target: 'static',
  // Router configuration for GitHub Pages
  router: {
    base: '/',
    // Strips the routes outright. `generate.exclude` alone is not enough:
    // `generate.fallback` below emits a 404.html SPA fallback, so a route that
    // exists in the client router would still render client-side on a deep
    // link even with no HTML file behind it.
    extendRoutes (routes) {
      return routes.filter(route => !routeIsExcluded(route.path))
    }
  },
  // TypeScript configuration
  typescript: {
    typeCheck: false
  },
  // Global page headers (https://go.nuxtjs.dev/config-head)
  env: {
    EDITION: market.code,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    API_BASE_URL: process.env.NODE_ENV === 'production' ? 'https://okamapi.azurewebsites.net' : 'https://okamapi.azurewebsites.net', // 'http://localhost:5000',
    IS_NATIVESCRIPT: 'false',
    // Optional prefill for the power-user Wolt Drive setup page. These are shared across all Okam
    // stores, so they are supplied from the local shell (or a gitignored .env) rather than committed.
    // The site is statically generated and publicly hosted, so anything exposed here ends up in the
    // public bundle: never set these in CI, and the production build refuses to pass them through.
    WOLT_DRIVE_MERCHANT_ID: process.env.NODE_ENV === 'production' ? '' : (process.env.WOLT_DRIVE_MERCHANT_ID || ''),
    WOLT_DRIVE_MERCHANT_KEY: process.env.NODE_ENV === 'production' ? '' : (process.env.WOLT_DRIVE_MERCHANT_KEY || ''),
    VERSION: '1.0.0',
    PLATFORM_FILE_SUFFIX: '.nuxt'
  },

  head: {
    title: 'Okam - Bestillingsapp til restauranter',
    meta: [
      { charset: 'utf-8' },
      { name: 'apple-itunes-app', content: 'app-id=1514296965' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'En stor plattform for de små' },
      {
        hid: 'og:title',
        property: 'og:title',
        content: 'Okam'
      },
      {
        hid: 'og:description',
        property: 'og:description',
        content: 'En stor plattform for de små'
      },
      { name: 'format-detection', content: 'telephone=no' },
      { name: 'theme-color', content: '#f2f4fb' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Okam' },
      { property: 'og:image', content: '/og-image.png' },
      { name: 'twitter:card', content: '/og-image.png' },
      { name: 'twitter:site', content: '@sharghi_a' }
    ],
    // Driven by the market's own pixel id, NOT by `not Switzerland`: an
    // isCh-style fork hands market #3 the NORWEGIAN pixel and quietly bills its
    // conversions to the Norwegian ad account. A market without a pixel sets
    // fbPixelId: null and emits nothing.
    script: fbPixelId
      ? [
          {
            hid: 'fb-pixel',
            innerHTML: `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${fbPixelId}');
          fbq('track', 'PageView');
        `,
            type: 'text/javascript',
            charset: 'utf-8'
          }
        ]
      : [],
    noscript: fbPixelId
      ? [
          {
            hid: 'fb-pixel-noscript',
            innerHTML: `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${fbPixelId}&ev=PageView&noscript=1" />`
          }
        ]
      : [],
    __dangerouslyDisableSanitizersByTagID: fbPixelId
      ? {
          'fb-pixel': ['innerHTML'],
          'fb-pixel-noscript': ['innerHTML']
        }
      : {},
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      // Preload fonts
      {
        rel: 'preload',
        as: 'style',
        href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap',
        onload: 'this.onload=null;this.rel=\'stylesheet\''
      },
      {
        rel: 'preload',
        as: 'style',
        href: 'https://fonts.googleapis.com/icon?family=Material+Icons',
        onload: 'this.onload=null;this.rel=\'stylesheet\''
      },
      // Preconnect to Google Fonts
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: true }
    ]
  },

  server: {
    port: process.env.PORT || 3000,
    host: '0.0.0.0'
  },

  serverMiddleware: [
    redirectSSL.create({
      enabled: process.env.NODE_ENV === 'production',
      statusCode: 301
    })
  ],

  // Global CSS (https://go.nuxtjs.dev/config-css)
  css: [
    '~/assets/sass/main.scss'
  ],

  i18n: {
    locales: market.locales,
    defaultLocale: market.locale,
    vueI18n: {
      fallbackLocale: market.locale,
      messages: {
        en: {
          back: 'Back',
          enterPhoneNumberPlaceholder: 'Phone',
          enterPhoneNumberSubmit: '📱 Send',
          enterPhoneCodeLabel: 'Enter SMS code',
          youAreLoggedIn: 'You are logged in as',
          logout: '🔒 Log out',
          login: 'Login',
          close: '✖️ Close'
        },
        no: {
          back: 'Tilbake',
          enterPhoneNumberPlaceholder: 'Telefon',
          enterPhoneNumberSubmit: 'Send kode',
          enterPhoneCodeLabel: 'Skriv inn kode fra SMS for å logge inn:',
          youAreLoggedIn: 'Du er innlogget som',
          logout: '🔒 Logg ut',
          login: 'Logg inn',
          close: '✖️ Lukk'
        },
        de: {
          back: 'Zurück',
          enterPhoneNumberPlaceholder: 'Telefon',
          enterPhoneNumberSubmit: 'Code senden',
          enterPhoneCodeLabel: 'SMS-Code eingeben, um sich anzumelden:',
          youAreLoggedIn: 'Sie sind angemeldet als',
          logout: 'Abmelden',
          login: 'Anmelden',
          close: 'Schliessen'
        }
      }
    }
  },

  // Plugins to run before rendering page (https://go.nuxtjs.dev/config-plugins)
  plugins: [
    { src: '~/plugins/platform-init', ssr: false },
    { src: '~/plugins/global-mixin', ssr: false },
    '~/plugins/market-mixin',
    '~/plugins/i18n',
    { src: '~/plugins/store-init' },
    { src: '~/plugins/vue-currency-input' },
    '~/plugins/jsonld'
  ],

  // Auto import components (https://go.nuxtjs.dev/config-components)
  components: true,

  // Modules for dev and build (recommended) (https://go.nuxtjs.dev/config-modules)
  buildModules: [
    // https://go.nuxtjs.dev/typescript
    '@nuxt/typescript-build',
    // https://go.nuxtjs.dev/stylelint
    '@nuxtjs/stylelint-module',

    '@nuxtjs/google-analytics',
    '@nuxt/image',
    ['@aceforth/nuxt-optimized-images', {
      optimizeImages: true,
      optimizeImagesInDev: false,
      mozjpeg: {
        quality: 80
      },
      webp: {
        preset: 'default',
        quality: 75
      }
    }]
  ],

  // Modules (https://go.nuxtjs.dev/config-modules)
  modules: [
    // https://go.nuxtjs.dev/axios
    '@nuxtjs/axios',
    // https://go.nuxtjs.dev/pwa
    '@nuxtjs/pwa',
    // https://go.nuxtjs.dev/content
    '@nuxt/content',
    // i18n plugin
    'nuxt-i18n',
    // Reading richt text
    '@nuxtjs/markdownit',

    // robots.txt is EMITTED per build, not shipped as a static file, because a
    // static file cannot carry a per-market Sitemap host.
    //
    // MEASURED at 8059e200, in dist/ after `OKAM_EDITION=no npm run generate`:
    // `static/robots.txt` was never served verbatim. @nuxtjs/robots@2.5.0 reads
    // it at build:before and parses it with `item.split(':')`, keeping only
    // ar[1] (parseFile, node_modules/@nuxtjs/robots/dist/module.js). So
    //     Sitemap: https://okam.no/sitemap.xml
    // reached dist/robots.txt as
    //     Sitemap: https
    // -- a broken directive, live on okam.no today, and identically broken on
    // the Swiss domain. The module then appended a SECOND `User-agent: *` block
    // from its own options, and the third element of the old module tuple
    // ({ UserAgent: '*', Disallow: '/import' }) was silently dropped, because
    // nuxt reads a module entry as [src, options] and ignores the rest.
    //
    // Declaring the whole file here fixes all three at once and puts the
    // Sitemap on the same `market.hostname` the sitemap module below already
    // uses, so the two can no longer disagree on a Swiss build.
    // static/robots.txt is deleted: leaving it would re-inject the mangled rules.
    ['@nuxtjs/robots', {
      UserAgent: '*',
      // The union of what the two old sources disallowed between them, with
      // '/admin/' folded into '/admin' because the latter already prefix-matches
      // it. Both '/import/' and '/import' are listed because the two old sources
      // each had one form and 'Disallow: /import/' does NOT match '/import'.
      //
      // '/en/admin' is NEW. `Disallow: /admin` does not reach across a
      // nuxt-i18n locale prefix, so okam.no/en/admin/orders was crawlable --
      // pre-existing, but this block claims to close the admin hole, so it
      // closes it.
      Disallow: ['/admin', '/en/admin', '/import', '/import/', '/offer/', '/offers/', '/helle.jpg', '/lang'],
      Allow: '/',
      Sitemap: market.hostname + '/sitemap.xml'
    }],
    ['@nuxtjs/sitemap', {
      hostname: market.hostname,
      gzip: true,
      exclude: sitemapExclude
    }]
  ],

  markdownit: {
    runtime: true, // Support `$md()`
    html: true // Support html-tags
  },

  googleAnalytics: {
    id: market.gaId || undefined
  },

  // Axios module configuration (https://go.nuxtjs.dev/config-axios)
  axios: {},

  // Content module configuration (https://go.nuxtjs.dev/config-content)
  content: {},

  // Build Configuration (https://go.nuxtjs.dev/config-build)
  build: {
    transpile: ['chart.js'],
    extend(config, { _isDev, _isClient }) {
      config.module.rules.push({
        enforce: 'pre',
        test: /\.(ns.ts)$/,
        loader: 'ignore-loader',
        exclude: /(node_modules)/
      })

      // Add TypeScript file resolution
      config.resolve.extensions.push('.ts', '.tsx')
    },
    optimization: {
      splitChunks: {
        chunks: 'all',
        automaticNameDelimiter: '.',
        name: true,
        maxSize: 244000,
        cacheGroups: {
          vendor: {
            name: 'vendor',
            test: /[\\/]node_modules[\\/]/,
            chunks: 'initial',
            priority: 10,
            enforce: true
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'async',
            priority: 5,
            reuseExistingChunk: true
          }
        }
      }
    },
    babel: {
      presets({ isServer }) {
        return [
          ['@nuxt/babel-preset-app', {
            useBuiltIns: 'usage',
            corejs: { version: 3 }
          }]
        ]
      }
    }
  },

  // Generate configuration for GitHub Pages
  generate: {
    fallback: true, // This generates a 404.html for SPA fallback mode
    // The other half of the router filter above: no HTML is emitted either.
    exclude: routeExcludeMatchers
  },

  // Legg til sitemap konfigurasjon
  sitemap: {
    hostname: market.hostname, // Endre til din faktiske URL
    gzip: true,
    exclude: sitemapExclude
  },

  // Oppdater PWA konfigurasjon
  pwa: {
    workbox: false,
    meta: {
      name: 'Okam',
      author: 'Okam',
      theme_color: '#f2f4fb'
    },
    manifest: {
      name: 'Okam App',
      short_name: 'Okam',
      lang: market.locale,
      display: 'standalone'
    }
  },

  render: {
    bundleRenderer: {
      shouldPreload: (file, type) => {
        // Preload kun kritiske ressurser
        if (type === 'script') {
          // Kun preload app.js og runtime.js
          return /^(app|runtime)\.[^.]+\.js$/.test(file)
        }
        // Preload kun main CSS
        if (type === 'style') {
          return /^app\.[^.]+\.css$/.test(file)
        }
        // Preload kritiske fonts
        if (type === 'font') {
          return /\.(woff2|woff)$/.test(file)
        }
        return false
      },
      shouldPrefetch: () => false // Deaktiver prefetching helt
    },
    http2: {
      push: true
    },
    static: {
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  }
}
