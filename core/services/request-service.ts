import { HttpMethod, HttpProperty, ActionName } from '../enums'

import { HttpModule, VuexModule } from '../platform'
import $config from '../helpers/configuration'

export class RequestService {
    private _baseUrl: string
    private _httpModule: typeof HttpModule
    private _vuexModule: typeof VuexModule

    constructor (baseUrl: string) {
      this._baseUrl = baseUrl
      this._httpModule = new HttpModule()
      this._vuexModule = new VuexModule()
    }

    deleteRequest (path: string): Promise<any> {
      const request = this._defaultRequest(path, undefined, HttpMethod.DELETE)
      return this._httpModule.httpClient(request).then((response) => {
        this._clearTokenIfExpired(response)
        if (response.status !== 200) { window.console.log(response.data.toString()) }
        return response
      })
    }

    getRequest (path: string): Promise<any> {
      const request = this._defaultRequest(path, false, HttpMethod.GET)
      return this._httpModule.httpClient(request).then((response) => {
        this._clearTokenIfExpired(response)
        if (response.status !== 200) { window.console.log(response.data.toString()) }
        return response
      })
    }

    postRequest (path: string, payload?: any): Promise<any> {
      const request = this._defaultRequest(path, payload, HttpMethod.POST)
      return this._httpModule.httpClient(request).then((response) => {
        this._clearTokenIfExpired(response)
        if (response.status !== 200) { window.console.log(response.data.toString()) }
        return response
      })
    }

    putRequest (path: string, payload: any): Promise<any> {
      const request = this._defaultRequest(path, payload, HttpMethod.PUT)
      return this._httpModule.httpClient(request).then((response) => {
        this._clearTokenIfExpired(response)
        if (response.status !== 200) { window.console.log(response.data.toString()) }
        return response
      })
    }

    tryParseResponse (response: any) {
      if (response && response.status === 200) {
        let parsedResponse
        try {
          parsedResponse = response.data
        } catch (e) {
          return undefined
        }
        return parsedResponse
      } else {
        return undefined
      }
    }

    private _clearTokenIfExpired (response: any) {
      if (response && response.status === 440) { this._vuexModule.dispatch(ActionName.ClearState) }
    }

    private _defaultRequest (path: string, payload: any, method: HttpMethod): any {
      return this._buildRequest(path, method, payload ? JSON.stringify(payload) : '', this._vuexModule.state?.currentUser?.token)
    };

    private _buildRequest (path: string, method: HttpMethod, content?: string, bearerToken?: string): any {
      const request = { headers: {}, data: null }
      request[HttpProperty.Url] = this._baseUrl + path
      request[HttpProperty.Method] = method
      request.headers[HttpProperty.ContentType] = 'application/json; charset=utf-8'
      request.headers[HttpProperty.ClientPlatform] = this._getClientPlatformName()
      request.headers[HttpProperty.ClientAppVersion] = $config.version

      if (content) {
        request[HttpProperty.Data] = JSON.parse(content)
        request[HttpProperty.Content] = content
      }

      if (bearerToken) { request.headers[HttpProperty.Authorization] = 'Bearer ' + bearerToken }
      return request
    };

    private _getClientPlatformName (): string {
      if (!$config.isNativeScript) { return 'Web' }
      if ($config.isIOS) { return 'iOS' }
      if ($config.isAndroid) { return 'Android' }
      return 'Unknown'
    }
}