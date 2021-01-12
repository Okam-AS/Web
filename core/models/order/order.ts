import { OrderStatus } from '@/core/enums'
import { OrderLineItem } from '@/core/models'

export class Order {
    id: string;
    userId: string;
    storeId: string;
    pickUp: Date;

    dateTimeNow: Date;
    countdownEndTime: Date;

    status: OrderStatus;
    items: Array<OrderLineItem>;

    itemsAmount: number;
    itemsAmountLineThrough: number;
    orderDiscountAmount: number;
    deliveryAmount: number;
    finalAmount: number;

    isSelfPickup: boolean;
    fullAddress: string;
    zipCode: string;
    city: string;

    storeLegalName: string;
    storeVAT: number;
    storeFullAddress: string;
    storeZipCode: string;
    storeCity: string;

    comment: string;
}
