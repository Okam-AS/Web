import redirectSSL from 'redirect-ssl'

export default {
  debug: true,
  // Global page headers (https://go.nuxtjs.dev/config-head)
  head: {
    title: 'Okam',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: 'Vi forenkler lokal handel' },
      {
        hid: 'og:title',
        property: 'og:title',
        content: 'Okam'
      },
      {
        hid: 'og:description',
        property: 'og:description',
        content: 'Vi forenkler lokal handel'
      }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600&display=swap' }
    ]
  },

  server: {
    // port: process.env.PORT || 4000 // default: 3000
  },

  serverMiddleware: [
    redirectSSL.create({
      enabled: process.env.NODE_ENV === 'production'
    })
  ],

  // Global CSS (https://go.nuxtjs.dev/config-css)
  css: [
    '~/assets/sass/main.scss'
  ],

  i18n: {
    locales: ['en', 'no'],
    defaultLocale: 'en',
    vueI18n: {
      fallbackLocale: 'no',
      messages: {
        en: {
          back: 'Back',
          enterPhoneNumberLabel: 'Enter your phone number to receive a SMS code',
          enterPhoneNumberPlaceholder: 'Phone',
          enterPhoneNumberSubmit: 'Send',
          enterPhoneCodeLabel: 'Enter SMS code',
          enterPhoneCodePlaceholder: 'Code…',
          enterPhoneCodeSubmit: 'Send',
          youAreLoggedIn: 'You are logged in',
          logout: 'Log out'
        },
        no: {
          back: 'Tilbake',
          enterPhoneNumberLabel: 'Skriv ditt telefonnummer for å få tilsendt sms-kode',
          enterPhoneNumberPlaceholder: 'Telefon',
          enterPhoneNumberSubmit: 'Send',
          enterPhoneCodeLabel: 'Skriv inn kode fra SMS for å logge inn',
          enterPhoneCodePlaceholder: 'Kode…',
          enterPhoneCodeSubmit: 'Send',
          youAreLoggedIn: 'Du er innlogget',
          logout: 'Logg ut'
        }
      }
    }
  },

  // Plugins to run before rendering page (https://go.nuxtjs.dev/config-plugins)
  plugins: [
    { src: '~/plugins/tawk', ssr: false }
  ],

  // Auto import components (https://go.nuxtjs.dev/config-components)
  components: true,

  // Modules for dev and build (recommended) (https://go.nuxtjs.dev/config-modules)
  buildModules: [
    // https://go.nuxtjs.dev/typescript
    '@nuxt/typescript-build',
    // https://go.nuxtjs.dev/stylelint
    '@nuxtjs/stylelint-module'
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
    // GTM
    '@nuxtjs/gtm'
  ],

  gtm: {
    id: 'GTM-WWZ4P62'
  },

  // Axios module configuration (https://go.nuxtjs.dev/config-axios)
  axios: {},

  // Content module configuration (https://go.nuxtjs.dev/config-content)
  content: {},

  // Build Configuration (https://go.nuxtjs.dev/config-build)
  build: {
  }
}
