import { RequestService } from './request-service';
import Configuration from "../helpers/configuration"
import { Category } from '../models';
import { ActionName } from '../enums'
import store from "../../vuex/store"

export class CategoryService {

    private _requestService: RequestService;
    constructor() {
        this._requestService = new RequestService(Configuration.okamApiBaseUrl);
    }

    public async Get(categoryId: string): Promise<Category> {
        let response = await this._requestService.getRequest('/categories/' + categoryId );
        return this.ParsedResponse(response, "Kunne ikke hente kategori");
    }

    public async GetAll(storeId: number): Promise<Array<Category>> {
        let response = await this._requestService.getRequest('/categories/store/'+storeId);
        return this.ParsedResponse(response, "Kunne ikke hente kategorier");
    }

    private ParsedResponse(response, errorMessage){
        const parsedResponse = this._requestService.tryParseResponse(response)
        if (parsedResponse === undefined) throw new Error(errorMessage)
        return parsedResponse;
    }
}