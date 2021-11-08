import { Product, ProductImage } from '@/core/models/'

export class CartLineItem {
  id: number | undefined;
  product: Product | undefined;
  image: ProductImage | undefined;
  quantity: number | undefined;
  notes: string | undefined;
}
