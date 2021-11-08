import { Store } from '../models'

export interface IStoreService {
    getAll(): Promise<Array<Store>>;
}
