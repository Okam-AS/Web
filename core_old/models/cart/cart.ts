import { DeliveryMethod, CartLineItem, CartCalculation } from '@/core/models'
export class Cart {
  id: string | undefined;
  items: Array<CartLineItem> = [];
  storeId: number | undefined;

  homeDeliveryMethodId: string | undefined;
  homeDeliveryMethod: DeliveryMethod | undefined;

  isSelfPickup: boolean = false;

  discountCode: string = '';
  fullAddress: string = '';
  zipCode: string = '';
  city: string = '';
  paymentIntentId: string = '';
  comment: string = '';

  calculations: CartCalculation | undefined;
}
