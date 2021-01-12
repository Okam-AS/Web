import { Cart, CartValidation, Order } from '../models'

export interface ICartService {
    update(model: Cart): Promise<Cart>;
    complete(storeId: number): Promise<Order>;
    validate(storeId: number): Promise<CartValidation>;
    delete(storeId: Number): Promise<boolean>;
}
