import { IProductService, IRequestService } from '../interfaces'
import Configuration from '../helpers/configuration'
import { Product } from '../models'
// import { ActionName } from '../enums'
import { RequestService } from './request-service'

export class ProductService implements IProductService {
    private _requestService: IRequestService;
    constructor () {
      this._requestService = new RequestService(Configuration.okamApiBaseUrl)
    }

    public async GetByBarcode (storeId: number, barcode: string): Promise<Product> {
      const response = await this._requestService.getRequest('/products/store/' + storeId + '/' + barcode)
      const parsedResponse = this._requestService.tryParseResponse(response)
      // TODO: if (response.statusCode === 401 && store.state.currentUser.token) { store.dispatch(ActionName.ClearState) }
      if (parsedResponse === undefined || parsedResponse === false) { throw new Error('Utsalgsstedet har ikke registrert denne varen') }
      return parsedResponse
    }

    public async Get (storeId: number): Promise<Array<Product>> {
      const response = await this._requestService.getRequest('/products/store/' + storeId)
      const parsedResponse = this._requestService.tryParseResponse(response)
      // TODO: if (response.statusCode === 401 && store.state.currentUser.token) { store.dispatch(ActionName.ClearState) }
      if (parsedResponse === undefined) { throw new Error('Kunne ikke hente utvalg') }
      return parsedResponse
    }
}
