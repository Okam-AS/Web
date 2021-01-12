import { SendVerificationToken, Login, Address } from '../models'

export interface IUserService {
    Logout(): any;
    Get(): Promise<boolean>;
    Login(model: Login): Promise<boolean>;
    UpdateDeliveryAddress(model: Address): boolean;
    Delete(): Promise<boolean>;
    SendVerificationToken(model: SendVerificationToken): Promise<boolean>;
}
