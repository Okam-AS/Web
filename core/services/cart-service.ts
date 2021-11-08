import { Cart, CartValidation, Order, CartLineItem, Product} from "../models";
import { RequestService } from './request-service';
import Configuration from "../helpers/configuration"

export class CartService {
    private _requestService: RequestService;
    constructor() {
        this._requestService = new RequestService(Configuration.okamApiBaseUrl);
    }

    public async getCartLineItem(cartLineItem: CartLineItem): Promise<CartLineItem> {
        let response = await this._requestService.postRequest('/carts/lineItem', cartLineItem);
        const parsedResponse = this._requestService.tryParseResponse(response)
        if (parsedResponse === undefined)
            throw new Error("Kunne ikke hente produkt")

        return parsedResponse;
    }

    public async update(model: Cart): Promise<Cart> {
        let response = await this._requestService.putRequest('/carts', model);
        const parsedResponse = this._requestService.tryParseResponse(response)
        if (parsedResponse === undefined)
            throw new Error("Kunne ikke oppdatere handlevogn")

        return parsedResponse;
    }

    public async validate(storeId: number): Promise<CartValidation> {
        let response = await this._requestService.getRequest('/carts/validate/' + storeId);
        const parsedResponse = this._requestService.tryParseResponse(response)
        if (parsedResponse === undefined)
            throw new Error("Kunne ikke validere handlevogn")

        return parsedResponse;
    }

    public async complete(storeId: number): Promise<Order> {
        let response = await this._requestService.postRequest('/carts/complete/' + storeId);
        const parsedResponse = this._requestService.tryParseResponse(response)
        if (parsedResponse === undefined)
            throw new Error("Kunne ikke fullføre ordre")

        return parsedResponse;
    }

    public async delete(storeId: Number): Promise<boolean> {
        let response = await this._requestService.deleteRequest('/carts/' + storeId);
        const parsedResponse = this._requestService.tryParseResponse(response)
        return parsedResponse !== undefined;
    }
}
