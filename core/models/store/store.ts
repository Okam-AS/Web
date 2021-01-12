import { IUser } from '@/core/interfaces'
import { Address, DeliveryMethod, OpeningHour, ProductPosition } from '@/core/models'
import { StoreImage } from './store-image'

export class Store {
    id: number | undefined;
    name: string | undefined;
    logoUrl: string | undefined;
    address: Address | undefined;
    openingHours: Array<OpeningHour> | undefined;
    isOpenNow: boolean | undefined;
    productPositions: Array<ProductPosition> | undefined;
    images: Array<StoreImage> | undefined;
    admins: Array<IUser> | undefined;
    editors: Array<IUser> | undefined;
    homeDeliveryMethods: Array<DeliveryMethod> | undefined;
    approved: boolean | undefined;
    selfCheckout: boolean | undefined;
    selfPickUp: boolean | undefined;
    registered: Date | undefined;
    bankAccountId: string | undefined;
}
