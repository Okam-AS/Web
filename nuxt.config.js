export default {
  debug: true,
  // Global page headers (https://go.nuxtjs.dev/config-head)
  head: {
    title: 'okam-consumer',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: '' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },

  server: {
    port: 4000 // default: 3000
  },

  // Global CSS (https://go.nuxtjs.dev/config-css)
  css: [
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
    'nuxt-i18n'
  ],

  // Axios module configuration (https://go.nuxtjs.dev/config-axios)
  axios: {},

  // Content module configuration (https://go.nuxtjs.dev/config-content)
  content: {},

  // Build Configuration (https://go.nuxtjs.dev/config-build)
  build: {
  }
}
