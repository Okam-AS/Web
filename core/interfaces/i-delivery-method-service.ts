import { DeliveryMethod } from '../models'

export interface IDeliveryMethodService {
    Get(storeId: number): Promise<Array<DeliveryMethod>>;
    GetHomeDeliveryMethod(storeId: number, from: string, to: string): Promise<DeliveryMethod>;
}
