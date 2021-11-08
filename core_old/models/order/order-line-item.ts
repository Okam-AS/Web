import { ProductImage } from '@/core/models/'

export class OrderLineItem {
  id: string;
  productId: string;
  image: ProductImage;
  quantity: number;
  notes: string;
  barcode: string;
  name: string;
  description: string;
  currency: string;
  amount: number;
  amountPreDiscount: number;
  tax: number;
}
