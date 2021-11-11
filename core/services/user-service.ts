import { Login, SendVerificationToken, Address } from '../models'
import { ActionName } from '../enums'
import { VuexModule } from '../platform'
import $config from '../helpers/configuration'
import { RequestService } from './request-service'

export class UserService {
    private _requestService: RequestService;
    private _vuexModule: typeof VuexModule;

    constructor () {
      this._requestService = new RequestService($config.okamApiBaseUrl)
      this._vuexModule = new VuexModule()
    }

    public Logout () {
      this._vuexModule.dispatch(ActionName.ClearState)
    }

    public async Get (): Promise<boolean> {
      if (!this._vuexModule.state.currentUser?.token) { return false }
      const response = await this._requestService.getRequest('/user')
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (response.statusCode === 401 && this._vuexModule.state.currentUser.token) { this._vuexModule.dispatch(ActionName.ClearState) }
      return parsedResponse !== undefined
    }

    public async Login (model: Login): Promise<boolean> {
      const response = await this._requestService.postRequest('/user/login', model)
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { return false }
      this._vuexModule.dispatch(ActionName.SetCurrentUser, parsedResponse)
      return true
    }

    public UpdateDeliveryAddress (model: Address): boolean {
      this._vuexModule.dispatch(ActionName.SetDeliveryAddress, model)
      return true
    }

    public async Delete (): Promise<boolean> {
      const response = await this._requestService.deleteRequest('/user')
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { return false }
      this._vuexModule.dispatch(ActionName.ClearState)
      return true
    }

    public async SendVerificationToken (model: SendVerificationToken): Promise<boolean> {
      const response = await this._requestService.postRequest('/user/sendverificationtoken', model)
      return this._requestService.tryParseResponse(response) === true
    }
}