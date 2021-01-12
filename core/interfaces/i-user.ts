import { Address } from '@/core/models/address/address'

export interface IUser {
  id: string;
  phoneNumber: string;
  address: Address;
  token: string;
}
