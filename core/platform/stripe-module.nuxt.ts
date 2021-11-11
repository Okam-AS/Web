import { IStripeModule } from '../interfaces'

class StripeModuleNUXT implements IStripeModule {
    CardParams: any;
    stripe: any;
}

export const StripeModule = StripeModuleNUXT