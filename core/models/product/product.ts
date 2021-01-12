export class Product {
  id: string;
  barcode: string;
  name: string;
  description: string;
  currency: string;
  amount: number;
  tax: number;
  inventory?: number;
  storeId: number;

  hasDiscount: boolean;
  amountPreDiscount: number;
  discountLabel: string;
}
