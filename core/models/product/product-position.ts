import { StoreImage } from '../store/store-image'
import { Product } from './product'

export class ProductPosition {
  id: string;
  percentX: number;
  percentY: number;
  products: Array<Product>;
  image: StoreImage;
  storId: number;
}
