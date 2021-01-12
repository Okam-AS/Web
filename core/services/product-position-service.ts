import { IProductPositionService, IRequestService } from '../interfaces'
import Configuration from '../helpers/configuration'
import { ProductPosition } from '../models'
import { RequestService } from './request-service'

export class ProductPositionService implements IProductPositionService {
  private _requestService: IRequestService;
  constructor () {
    this._requestService = new RequestService(Configuration.okamApiBaseUrl)
  }

  public async Get (storeImageId: string): Promise<Array<ProductPosition>> {
    const response = await this._requestService.getRequest('/productposition/' + storeImageId)
    const parsedResponse = this._requestService.tryParseResponse(response)
    if (parsedResponse === undefined) { throw new Error('Kunne ikke hente bilder') }
    return parsedResponse
  }
}
