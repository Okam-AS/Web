import { IDiscountService, IRequestService } from '../interfaces'
import Configuration from '../helpers/configuration'
import { RequestService } from './request-service'

export class DiscountService implements IDiscountService {
    private _requestService: IRequestService;
    constructor () {
      this._requestService = new RequestService(Configuration.okamApiBaseUrl)
    }

    public async exists (storeId: Number, discountCode: string): Promise<boolean> {
      const response = await this._requestService.getRequest('/discount/store/' + storeId + '/' + discountCode)
      const parsedResponse = this._requestService.tryParseResponse(response)
      return parsedResponse === true
    }
}
