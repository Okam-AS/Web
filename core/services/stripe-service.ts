import { StripeModule } from '../platform'
import $config from '../helpers/configuration'
import { RequestService } from './request-service'

export class StripeService {
    private _requestService: RequestService;
    public _publishableKey: string;

    constructor () {
      const that = this
      that._requestService = new RequestService($config.okamApiBaseUrl)
    }

    public async getPaymentMethods (storeId: number): Promise<any> {
      const response = await this._requestService.getRequest('/payment/paymentMethods/' + storeId)
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { throw new Error('Kunne ikke hente kort') }
      return parsedResponse
    }

    public async deletePaymentMethod (paymentMethodId: string): Promise<boolean> {
      const response = await this._requestService.deleteRequest('/payment/paymentMethod/' + paymentMethodId)
      return response && response.statusCode === 200
    }

    public async createPaymentIntent (amount: number, currency: string, paymentMethodId: string, cartId: string, setupFutureUsage: boolean): Promise<any> {
      const response = await this._requestService.postRequest('/payment/createPaymentIntent/', {
        amount,
        currency,
        paymentMethodId,
        cartId,
        setupFutureUsage
      })

      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { throw new Error('Betalingen ikke ikke gjennomføres på dette tidspunktet') }
      return parsedResponse
    }

    public createPaymentMethod (number: string, expMonth: number, expYear: number, cvc: string): Promise<any> {
      return new Promise((resolve, reject) => {
        const card = new StripeModule.CardParams(number, expMonth, expYear, cvc)
        StripeModule.stripe.createPaymentMethod(card, (error, pm) => {
          if (error) { return reject(error) }
          resolve(pm)
        })
      })
    }
}