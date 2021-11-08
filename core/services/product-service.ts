import { RequestService } from './request-service';
import Configuration from "../helpers/configuration"
import { Product } from '../models';
import { ActionName } from '../enums'
import store from "../../vuex/store"

export class ProductService {

    private _requestService: RequestService;
    constructor() {
        this._requestService = new RequestService(Configuration.okamApiBaseUrl);
    }

    public async GetByBarcode(storeId: number, barcode: string): Promise<Product> {
        let response = await this._requestService.getRequest('/products/consumer/search/' + storeId + '/' + (barcode ? barcode : false));
        return this.ParsedResponse(response, "Utsalgsstedet har ikke registrert denne varen");
    }

    private ParsedResponse(response, errorMessage){
        const parsedResponse = this._requestService.tryParseResponse(response)
        if (parsedResponse === undefined) throw new Error(errorMessage)
        return parsedResponse;
    }
}