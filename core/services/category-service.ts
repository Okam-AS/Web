import Configuration from '../helpers/configuration'
import { Category, CategoryProductListItem } from '../models'
import { ActionName } from '../enums'
import { RequestService } from './request-service'

export class CategoryService {
    private _requestService: RequestService;
    private _store: any;

    constructor ($store: any) {
      this._store = $store
      this._requestService = new RequestService(Configuration.okamApiBaseUrl)
    }

    public async GetImageSelection (categoryId: string): Promise<Category> {
      const response = await this._requestService.getRequest('/categories/' + categoryId + '/imageselection')
      return this.ParsedResponse(response, 'Kunne ikke hente bilder')
    }

    public async Get (categoryId: string): Promise<Category> {
      const response = await this._requestService.getRequest('/categories/' + categoryId)
      if (response.statusCode === 401 && this._store.state.currentUser.token) { this._store.dispatch(ActionName.ClearState) }
      return this.ParsedResponse(response, 'Kunne ikke hente kategori')
    }

    public async HasAnyValid (storeId: number): Promise<Boolean> {
      const response = await this._requestService.getRequest('/categories/store/' + storeId + '/hasanyvalid')
      if (response.statusCode === 401 && this._store.state.currentUser.token) { this._store.dispatch(ActionName.ClearState) }
      return this.ParsedResponse(response, 'Kunne ikke hente kategori informasjon')
    }

    public async GetAll (storeId: number): Promise<Array<Category>> {
      const response = await this._requestService.getRequest('/categories/store/' + storeId)
      return this.ParsedResponse(response, 'Kunne ikke hente kategorier')
    }

    public async Create (category: Category): Promise<Category> {
      const response = await this._requestService.postRequest('/categories', category)
      return this.ParsedResponse(response, 'Kunne ikke lagre kategori')
    }

    public async Update (category: Category): Promise<Category> {
      const response = await this._requestService.putRequest('/categories', category)
      return this.ParsedResponse(response, 'Kunne ikke lagre kategori')
    }

    public async Reorder (storeId: number, categories: Array<Category>): Promise<Category> {
      const response = await this._requestService.putRequest('/categories/reorder', { storeId, categories })
      return this.ParsedResponse(response, 'Kunne ikke lagre sortering')
    }

    public async Delete (categoryId: string): Promise<void> {
      const response = await this._requestService.deleteRequest('/categories/' + categoryId)
      if (response.statusCode >= 300 || response.statusCode < 200) { throw new Error('Kunne ikke slette kategori') }
    }

    public async CreateOrUpdateCategoryProductList (categoryId: string, categoryProductListItems: Array<CategoryProductListItem>): Promise<Category> {
      const response = await this._requestService.postRequest('/categories/categoryproductlistitem', { categoryId, categoryProductListItems })
      return this.ParsedResponse(response, 'Kunne ikke lagre prduktlisten')
    }

    public async DeleteCategoryProductListItem (categoryProductListItemId: string): Promise<void> {
      const response = await this._requestService.deleteRequest('/categories/categoryproductlistitem/' + categoryProductListItemId)
      if (response.statusCode >= 300 || response.statusCode < 200) { throw new Error('Kunne ikke slette rad i produktlisten') }
    }

    private ParsedResponse (response, errorMessage) {
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { throw new Error(errorMessage) }
      return parsedResponse
    }
}