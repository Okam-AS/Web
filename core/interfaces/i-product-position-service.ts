import { ProductPosition } from '../models'

export interface IProductPositionService {
    Get(storeImageId: string): Promise<Array<ProductPosition>>;
}
