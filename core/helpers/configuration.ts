
class Configuration {
  okamApiBaseUrl: string;
  store: any;
  isAndroid: boolean;
  isIOS: boolean;
  isNativeScript: boolean;
  httpClient: any;
  version: string;
  stripePublishableKey: string;

  constructor () {
    this.okamApiBaseUrl = process.env.API_BASE_URL
    this.version = process.env.VERSION
    this.isNativeScript = process.env.IS_NATIVESCRIPT === 'true'
    this.stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY
  }
}

export default new Configuration()