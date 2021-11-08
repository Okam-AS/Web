import { Login, SendVerificationToken, Address } from '../models'
import { ActionName } from '../enums'
import { IUserService, IRequestService } from '../interfaces'
import Configuration from '../helpers/configuration'
import { RequestService } from './request-service'
export class UserService implements IUserService {
  private _requestService: IRequestService;
  private _store: any;

  constructor ($store: any) {
    this._store = $store
    this._requestService = new RequestService(Configuration.okamApiBaseUrl)
  }

  public Logout () {
    this._store.dispatch(ActionName.ClearState)
  }

  public async Get (): Promise<boolean> {
    const response = await this._requestService.getRequest('/user')
    const parsedResponse = this._requestService.tryParseResponse(response)
    if (response.status === 401 && this._store.getters.currentUser.token) { this._store.dispatch(ActionName.ClearState) }
    return parsedResponse !== undefined
  }

  public async Login (model: Login): Promise<boolean> {
    const response = await this._requestService.postRequest('/user/login', model)
    const parsedResponse = this._requestService.tryParseResponse(response)
    if (parsedResponse === undefined) { return false }
    this._store.dispatch(ActionName.SetCurrentUser, parsedResponse)
    return parsedResponse
  }

  public UpdateDeliveryAddress (model: Address): boolean {
    this._store.dispatch(ActionName.SetDeliveryAddress, model)
    // window.console.log(model)
    return true
  }

  public async Delete (): Promise<boolean> {
    const response = await this._requestService.deleteRequest('/user')
    const parsedResponse = this._requestService.tryParseResponse(response)
    if (parsedResponse === undefined) { return false }
    this._store.dispatch(ActionName.ClearState)
    return true
  }

  public async SendVerificationToken (model: SendVerificationToken): Promise<boolean> {
    const response = await this._requestService.postRequest('/user/sendverificationtoken', model)
    return this._requestService.tryParseResponse(response) === true
  }
}
