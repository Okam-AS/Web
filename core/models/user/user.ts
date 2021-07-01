import { StoreName } from '@/core/models'

export class User {
  id: string;
  phoneNumber: string;
  adminIn: Array<StoreName>;
  token: string;
}