import $config from '../helpers/configuration'

const NSSuffix = '.ns'
const NUXTSuffix = '.nuxt'
const fileSuffix = $config.isNativeScript ? NSSuffix : NUXTSuffix

export const GeolocationModule = require('./geolocation-module' + fileSuffix)
export const NotificationModule = require('./notification-module' + fileSuffix)
export const StripeModule = require('./stripe-module' + fileSuffix)

/*
    // outputModule.ts
    export const priv = (process.env.BUILD_MODE === 'test')
    ? { hydrateRecords, fillBlanks, extractHeaders }
    : null

    // importingModule.spec.ts
    import { priv } from './outputModule';

    const { hydrateRecords, fillBlanks, extractHeaders } = priv as any;
    // these will exist if environment var BUILD_MODE==='test'
  */