import { state } from '@/store/index'
import { Login, SendVerificationToken, Address } from '../models'
// import { ActionName } from '../enums'
import { IUserService, IRequestService } from '../interfaces'
import Configuration from '../helpers/configuration'
import { RequestService } from './request-service'

export class UserService implements IUserService {
  private _requestService: IRequestService;
  constructor () {
    window.console.log('State', state())
    this._requestService = new RequestService(Configuration.okamApiBaseUrl)
  }

  public Logout () {
    // TODO: store.dispatch(ActionName.ClearState)
  }

  public async Get (): Promise<boolean> {
    const response = await this._requestService.getRequest('/user')
    const parsedResponse = this._requestService.tryParseResponse(response)
    // TODO: if (response.statusCode === 401 && store.state.currentUser.token) { store.dispatch(ActionName.ClearState) }
    return parsedResponse !== undefined
  }

  public async Login (model: Login): Promise<boolean> {
    const response = await this._requestService.postRequest('/user/login', model)
    const parsedResponse = this._requestService.tryParseResponse(response)
    if (parsedResponse === undefined) { return false }
    // TODO: store.dispatch(ActionName.SetCurrentUser, parsedResponse)
    return true
  }

  public UpdateDeliveryAddress (model: Address): boolean {
    // TODO: store.dispatch(ActionName.SetDeliveryAddress, model)
    window.console.log(model)
    return true
  }

  public async Delete (): Promise<boolean> {
    const response = await this._requestService.deleteRequest('/user')
    const parsedResponse = this._requestService.tryParseResponse(response)
    if (parsedResponse === undefined) { return false }
    // TODO: store.dispatch(ActionName.ClearState)
    return true
  }

  public async SendVerificationToken (model: SendVerificationToken): Promise<boolean> {
    const response = await this._requestService.postRequest('/user/sendverificationtoken', model)
    return this._requestService.tryParseResponse(response) === true
  }
}
