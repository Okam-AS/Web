import $config from '../helpers/configuration'
import { Store } from '../models'
import { GeolocationModule } from '../platform'
import { RequestService } from './request-service'

export class StoreService {
    private _requestService: RequestService;
    constructor () {
      this._requestService = new RequestService($config.okamApiBaseUrl)
    }

    public async feedback (feedback: string) {
      const response = await this._requestService.postRequest('/stores/feedback', { feedback })
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { throw new Error('Failed to post feedback') }
    }

    public async get (id: number): Promise<Store> {
      const response = await this._requestService.getRequest('/stores/' + id)
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { throw new Error('Failed to get store') }

      return parsedResponse
    }

    public async getAll (location?: any): Promise<Array<Store>> {
      const queryString = !!location && location.latitude && location.longitude ? '?longitude=' + location.longitude + '&latitude=' + location.latitude : ''
      const response = await this._requestService.getRequest('/stores' + queryString)
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { throw new Error('Failed to get stores') }

      return parsedResponse
    }

    public async getAllTryLocationSorted (): Promise<Array<Store>> {
      const comp = this
      try {
        const locationEnabled = await GeolocationModule.isEnabled({ timeout: 3000 })
        if (locationEnabled) {
          const currentLocation = await GeolocationModule.getCurrentLocation({ timeout: 3000, desiredAccuracy: 100 })
          return await comp.getAll(currentLocation)
        } else {
          return await comp.getAll()
        }
      } catch (error) {
        return await comp.getAll()
      }
    }
}