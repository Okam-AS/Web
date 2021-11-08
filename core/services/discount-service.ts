import { RequestService } from './request-service';
import Configuration from "../helpers/configuration"

export class DiscountService {
    private _requestService: RequestService;
    constructor() {
        this._requestService = new RequestService(Configuration.okamApiBaseUrl);
    }

    public async exists(storeId: Number, discountCode: string): Promise<boolean> {
        let response = await this._requestService.getRequest('/discount/store/' + storeId + '/' + discountCode);
        const parsedResponse = this._requestService.tryParseResponse(response)
        return parsedResponse === true;
    }
}
