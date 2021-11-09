import { Login, SendVerificationToken, Address } from '../models'
import { ActionName } from '../enums'
import $config from '../helpers/configuration'
import { RequestService } from './request-service'

export class UserService {
    private _requestService: RequestService;

    constructor () {
      this._requestService = new RequestService($config.okamApiBaseUrl)
    }

    public Logout () {
      $config.store.dispatch(ActionName.ClearState)
    }

    public async Get (): Promise<boolean> {
      if (!$config.store.state.currentUser?.token) { return false }
      const response = await this._requestService.getRequest('/user')
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (response.statusCode === 401 && $config.store.state.currentUser.token) { $config.store.dispatch(ActionName.ClearState) }
      return parsedResponse !== undefined
    }

    public async Login (model: Login): Promise<boolean> {
      const response = await this._requestService.postRequest('/user/login', model)
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { return false }
      $config.store.dispatch(ActionName.SetCurrentUser, parsedResponse)
      return true
    }

    public UpdateDeliveryAddress (model: Address): boolean {
      $config.store.dispatch(ActionName.SetDeliveryAddress, model)
      return true
    }

    public async Delete (): Promise<boolean> {
      const response = await this._requestService.deleteRequest('/user')
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { return false }
      $config.store.dispatch(ActionName.ClearState)
      return true
    }

    public async SendVerificationToken (model: SendVerificationToken): Promise<boolean> {
      const response = await this._requestService.postRequest('/user/sendverificationtoken', model)
      return this._requestService.tryParseResponse(response) === true
    }
}