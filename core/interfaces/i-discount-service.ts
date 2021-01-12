
export interface IDiscountService {
    exists(storeId: Number, discountCode: string): Promise<boolean>;
}
