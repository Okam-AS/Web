
class Configuration {
  okamApiBaseUrl: string;
  store: any;
  isAndroid: boolean;
  isIOS: boolean;
  isNativeScript: boolean;
  httpClient: any;
  version: string;
  stripePublishableKey: string;

  commonInit () {
    this.okamApiBaseUrl = process.env.API_BASE_URL
    this.version = process.env.VERSION
    this.isNativeScript = process.env.IS_NATIVESCRIPT === 'true'
    this.stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY
  }

  mobileInit () {
    const pathToStoreInNS = '../../vuex/store'
    const store = require(pathToStoreInNS)
    this.store = store

    const pathToHttpClientInNS = '@nativescript/core'
    const client = require(pathToHttpClientInNS)
    this.httpClient = client.Http.request
  }

  webInit () {
    const pathToStoreInNuxt = '../../modules/store-module'
    import(pathToStoreInNuxt).then((GetNuxtStoreModule) => {
      this.store = GetNuxtStoreModule()
    })

    const pathToHttpClientInNuxt = '@nuxtjs/axios'
    import(pathToHttpClientInNuxt).then((client) => {
      this.httpClient = client
    })
  }

  constructor () {
    this.commonInit()

    if (this.isNativeScript) {
      this.mobileInit()
    } else {
      this.webInit()
    }
  }
}

export default new Configuration()