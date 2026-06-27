// Env accessor for the unified core (core/helpers/configuration.ts imports
// `getEnv from '../../env'`). The keys are provided via nuxt.config.js `env`,
// which Nuxt 2's webpack DefinePlugin inlines ONLY for static `process.env.KEY`
// references — so they must be listed statically here (a dynamic
// `process.env[name]` would NOT be inlined and would be undefined in the browser).
const values: { [key: string]: any } = {
  API_BASE_URL: process.env.API_BASE_URL,
  VERSION: process.env.VERSION,
  IS_NATIVESCRIPT: process.env.IS_NATIVESCRIPT,
  IS_PRODUCTION: process.env.IS_PRODUCTION,
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
  PLATFORM_FILE_SUFFIX: process.env.PLATFORM_FILE_SUFFIX,
  SELECTED_THEME: process.env.SELECTED_THEME,
  NOTIFICATION_HUB: process.env.NOTIFICATION_HUB,
  VIPPS_IOS_PATH: process.env.VIPPS_IOS_PATH,
  VIPPS_ANDROID_PATH: process.env.VIPPS_ANDROID_PATH
}

export default (name: string): string => {
  const value = values[name]
  return value === undefined || value === null ? '' : String(value)
}
