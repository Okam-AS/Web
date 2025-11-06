import redirectSSL from 'redirect-ssl'

export default {
  debug: true,
  // Target for static generation
  target: 'static',
  // Router configuration for GitHub Pages
  router: {
    base: '/'
  },
  // TypeScript configuration
  typescript: {
    typeCheck: false
  },
  // Global page headers (https://go.nuxtjs.dev/config-head)
  env: {
    IS_PRODUCTION: process.env.NODE_ENV === 'production',
    API_BASE_URL: process.env.NODE_ENV === 'production' ? 'https://okamapi.azurewebsites.net' : 'https://okamapi.azurewebsites.net', // 'http://localhost:5000',
    IS_NATIVESCRIPT: 'false',
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
    locales: ['en', 'no'],
    defaultLocale: 'no',
    vueI18n: {
      fallbackLocale: 'no',
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
        }
      }
    }
  },

  // Plugins to run before rendering page (https://go.nuxtjs.dev/config-plugins)
  plugins: [
    { src: '~/plugins/global-mixin', ssr: false },
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

    ['@nuxtjs/robots', {
      UserAgent: '*',
      Disallow: ['/lang', '/admin']
    }, {
        UserAgent: '*',
        Disallow: '/import'
      }],
    ['@nuxtjs/sitemap', {
      hostname: 'https://okam.no',
      gzip: true,
      exclude: [
        '/admin/**',
        '/import'
      ]
    }]
  ],

  markdownit: {
    runtime: true, // Support `$md()`
    html: true // Support html-tags
  },

  googleAnalytics: {
    id: 'UA-167439729-2'
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
    fallback: true // This generates a 404.html for SPA fallback mode
  },

  // Legg til sitemap konfigurasjon
  sitemap: {
    hostname: 'https://okam.no', // Endre til din faktiske URL
    gzip: true,
    exclude: [
      '/admin/**',
      '/import'
    ]
  },

  // Oppdater PWA konfigurasjon
  pwa: {
    meta: {
      name: 'Okam',
      author: 'Okam',
      theme_color: '#f2f4fb'
    },
    manifest: {
      name: 'Okam App',
      short_name: 'Okam',
      lang: 'no',
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
