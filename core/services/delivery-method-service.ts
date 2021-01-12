import { IDeliveryMethodService, IRequestService } from '../interfaces'
import Configuration from '../helpers/configuration'
import { DeliveryMethod } from '../models'
import { RequestService } from './request-service'

export class DeliveryMethodService implements IDeliveryMethodService {
    private _requestService: IRequestService;
    constructor () {
      this._requestService = new RequestService(Configuration.okamApiBaseUrl)
    }

    public async Get (storeId: number): Promise<Array<DeliveryMethod>> {
      const response = await this._requestService.getRequest('/deliverymethods/' + storeId)
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { throw new Error('Failed to get delivery methods') }

      return parsedResponse
    }

    public async GetHomeDeliveryMethod (storeId: number, from: string, to: string): Promise<DeliveryMethod> {
      const response = await this._requestService.postRequest('/deliverymethods/homedeliverymethod', {
        storeId,
        from,
        to
      })
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { throw new Error('Failed to get delivery method') }

      return parsedResponse
    }
}
