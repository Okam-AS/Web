import { Product } from '../models'

export interface IProductService {
    GetByBarcode(storeId: number, barcode: string): Promise<Product>;
    Get(storeId: number): Promise<Array<Product>>;
}
