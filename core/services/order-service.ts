import { RequestService } from './request-service';
import Configuration from "../helpers/configuration"
import { Order } from '../models';
import { OrderStatus } from '../enums';

export class OrderService {

    private _requestService: RequestService;
    constructor() {
        this._requestService = new RequestService(Configuration.okamApiBaseUrl);
    }

    public async getAll(): Promise<Array<Order>> {
        let response = await this._requestService.getRequest('/orders');
        const parsedResponse = this._requestService.tryParseResponse(response);
        if (parsedResponse === undefined)
            throw new Error("Failed to get orders")

        return parsedResponse
    }

    public async updateStatus(orderId: string, status: OrderStatus): Promise<Order> {
        let response = await this._requestService.putRequest('/orders/update/', { id: orderId, status: status });
        const parsedResponse = this._requestService.tryParseResponse(response);
        if (parsedResponse === undefined)
            throw new Error("Failed to update orderstatus")

        return parsedResponse
    }
}