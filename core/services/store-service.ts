import { IStoreService, IRequestService } from '../interfaces'
import Configuration from '../helpers/configuration'
import { Store } from '../models'
import { RequestService } from './request-service'

export class StoreService implements IStoreService {
    private _requestService: IRequestService;
    constructor () {
      this._requestService = new RequestService(Configuration.okamApiBaseUrl)
    }

    public async get (id: number): Promise<Store> {
      const response = await this._requestService.getRequest('/stores/basic/' + id)
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { throw new Error('Failed to get store') }

      return parsedResponse
    }

    public async getAll (): Promise<Array<Store>> {
      const response = await this._requestService.getRequest('/stores')
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { throw new Error('Failed to get stores') }

      return parsedResponse
    }
}
