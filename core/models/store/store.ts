import { Address, OpeningHour, StoreUserSetting, User, Category } from '@/core/models'

export class Store {
    id: number;
    name: string;
    logoUrl: string;
    address: Address;
    categories: Array<Category>;
    openingHours: Array<OpeningHour>;
    admins: Array<User>;
    storeUserSettings: Array<StoreUserSetting>;
    approved: boolean;
    selfPickUp: boolean;
    tableDeliveryEnabled: boolean;
    homeDeliveryEnabled: boolean;
    selfCheckout: boolean;
    registered: Date;
    bankAccountId: string;
    minimumOrderPriceForHomeDelivery: number;
}