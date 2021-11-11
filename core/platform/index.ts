import $config from '../helpers/configuration'

const NSSuffix = '.ns'
const NUXTSuffix = '.nuxt'
const fileSuffix = $config.isNativeScript ? NSSuffix : NUXTSuffix

export const { GeolocationModule } = require(`./geolocation-module${fileSuffix}`)
export const { NotificationModule } = require(`./notification-module${fileSuffix}`)
export const { StripeModule } = require(`./stripe-module${fileSuffix}`)
export const { VuexModule } = require(`./vuex-module${fileSuffix}`)
export const { HttpModule } = require(`./http-module${fileSuffix}`)