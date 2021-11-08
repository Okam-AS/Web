import { OrderStatus } from '../enums'
import { Order } from '../models'

export interface IOrderService {
    getAll(): Promise<Array<Order>>;
    updateStatus(orderId: string, status: OrderStatus): Promise<Order>;
}
