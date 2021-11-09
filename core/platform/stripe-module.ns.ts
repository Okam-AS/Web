import { IStripeModule } from '../interfaces'
import $config from '../helpers/configuration'

const stripeStandardConfigPath = '@triniwiz/nativescript-stripe/standard'
const stripeStandardConfig = require(stripeStandardConfigPath)

const privateStripePath = '@triniwiz/nativescript-stripe'
const privateStripe = require(privateStripePath)

export class StripeModuleNS implements IStripeModule {
    CardParams: any;
    stripe: any;

    constructor () {
      stripeStandardConfig.shared.publishableKey = $config.stripePublishableKey
      stripeStandardConfig.shared.companyName = 'Okam AS'

      this.CardParams = privateStripe.CardParams
      this.stripe = new privateStripe.Stripe($config.stripePublishableKey)
    }
}