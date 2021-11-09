import { Category } from '../models'
import $config from '../helpers/configuration'
import { RequestService } from './request-service'

export class CategoryService {
    private _requestService: RequestService;
    constructor () {
      this._requestService = new RequestService($config.okamApiBaseUrl)
    }

    public async Get (categoryId: string): Promise<Category> {
      const response = await this._requestService.getRequest('/categories/' + categoryId)
      return this.ParsedResponse(response, 'Kunne ikke hente kategori')
    }

    public async GetAll (storeId: number): Promise<Array<Category>> {
      const response = await this._requestService.getRequest('/categories/store/' + storeId)
      return this.ParsedResponse(response, 'Kunne ikke hente kategorier')
    }

    private ParsedResponse (response, errorMessage) {
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { throw new Error(errorMessage) }
      return parsedResponse
    }
}