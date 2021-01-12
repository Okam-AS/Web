import { Cart, CartValidation, Order } from '../models'
import { ICartService, IRequestService } from '../interfaces'
import Configuration from '../helpers/configuration'
import { RequestService } from './request-service'

export class CartService implements ICartService {
  private _requestService: IRequestService;
  constructor () {
    this._requestService = new RequestService(Configuration.okamApiBaseUrl)
  }

  public async update (model: Cart): Promise<Cart> {
    const response = await this._requestService.putRequest('/carts', model)
    const parsedResponse = this._requestService.tryParseResponse(response)
    if (parsedResponse === undefined) { throw new Error('Failed to update carts') }

    return parsedResponse
  }

  public async validate (storeId: number): Promise<CartValidation> {
    const response = await this._requestService.getRequest('/carts/validate/' + storeId)
    const parsedResponse = this._requestService.tryParseResponse(response)
    if (parsedResponse === undefined) { throw new Error('Failed to validate cart') }

    return parsedResponse
  }

  public async complete (storeId: number): Promise<Order> {
    const response = await this._requestService.postRequest('/carts/complete/' + storeId)
    const parsedResponse = this._requestService.tryParseResponse(response)
    if (parsedResponse === undefined) { throw new Error('Failed to create order') }

    return parsedResponse
  }

  public async delete (storeId: Number): Promise<boolean> {
    const response = await this._requestService.deleteRequest('/carts/' + storeId)
    const parsedResponse = this._requestService.tryParseResponse(response)
    return parsedResponse !== undefined
  }
}
