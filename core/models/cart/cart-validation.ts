import { Product } from '@/core/models/'
export class CartValidation {
  itemsOutOfStock: Array<Product> | undefined;
  deliveryAddressError: boolean | undefined;
  deliveryMethodError: boolean | undefined;
  priceDifferError: boolean | undefined;
  priceTooLowError: boolean | undefined;
  storeIsClosed: boolean | undefined;
  cartIsEmpty: boolean | undefined;
  itemsInStock: boolean | undefined;
  hasErrors: boolean | undefined;
  minimumPrice: number | undefined;
}
