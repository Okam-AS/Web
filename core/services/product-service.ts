import $config from '../helpers/configuration'
import { Product } from '../models'
import { RequestService } from './request-service'

export class ProductService {
    private _requestService: RequestService;
    constructor () {
      this._requestService = new RequestService($config.okamApiBaseUrl)
    }

    public async GetByBarcode (storeId: number, barcode: string): Promise<Product> {
      const response = await this._requestService.getRequest('/products/consumer/search/' + storeId + '/' + (barcode || false))
      return this.ParsedResponse(response, 'Utsalgsstedet har ikke registrert denne varen')
    }

    private ParsedResponse (response, errorMessage) {
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { throw new Error(errorMessage) }
      return parsedResponse
    }
}