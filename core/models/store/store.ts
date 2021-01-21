import { IUser } from '@/core/interfaces'
import { Address, DeliveryMethod, OpeningHour, ProductPosition } from '@/core/models'
import { StoreImage } from './store-image'

export class Store {
    id: number;
    name: string;
    logoUrl: string;
    address: Address;
    openingHours: Array<OpeningHour>;
    isOpenNow: boolean;
    productPositions: Array<ProductPosition>;
    images: Array<StoreImage>;
    admins: Array<IUser>;
    editors: Array<IUser>;
    homeDeliveryMethods: Array<DeliveryMethod>;
    approved: boolean;
    selfCheckout: boolean;
    selfPickUp: boolean;
    registered: Date;
    bankAccountId: string;
}
