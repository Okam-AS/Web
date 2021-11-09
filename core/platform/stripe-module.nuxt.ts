import { IStripeModule } from '../interfaces'

export class StripeModuleNS implements IStripeModule {
    CardParams: any;
    stripe: any;
}