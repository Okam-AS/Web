import { HttpMethod, HttpProperty } from '../enums'
import { IRequestService } from '../interfaces'
export class RequestService implements IRequestService {
  private _baseUrl: string
  private httpModule: any;
  constructor (baseUrl: string) {
    this._baseUrl = baseUrl
  }

  deleteRequest (path: string): Promise<any> {
    const request = this._defaultRequest(path, undefined, HttpMethod.DELETE)
    return this.httpModule.request(request).then((response: any) => {
      this._clearTokenIfExpired(response)
      if (response.statusCode !== 200) { window.console.log(response.content.toString()) }
      return response
    })
  }

  getRequest (path: string): Promise<any> {
    const request = this._defaultRequest(path, false, HttpMethod.GET)
    return this.httpModule.request(request).then((response: any) => {
      this._clearTokenIfExpired(response)
      if (response.statusCode !== 200) { window.console.log(response.content.toString()) }
      return response
    })
  }

  postRequest (path: string, payload?: any): Promise<any> {
    const request = this._defaultRequest(path, payload, HttpMethod.POST)
    return this.httpModule.request(request).then((response: any) => {
      this._clearTokenIfExpired(response)
      if (response.statusCode !== 200) { window.console.log(response.content.toString()) }
      return response
    })
  }

  putRequest (path: string, payload: any): Promise<any> {
    const request = this._defaultRequest(path, payload, HttpMethod.PUT)
    return this.httpModule.request(request).then((response: any) => {
      this._clearTokenIfExpired(response)
      if (response.statusCode !== 200) { window.console.log(response.content.toString()) }
      return response
    })
  }

  tryParseResponse (response: any) {
    if (response && response.statusCode === 200) {
      let parsedResponse
      try {
        parsedResponse = response.content.toJSON()
      } catch (e) {
        return undefined
      }
      return parsedResponse
    } else {
      return undefined
    }
  }

  private _clearTokenIfExpired (response: any) {
    if (response.statusCode === 440) {
      // TODO: store.dispatch(ActionName.ClearState)
    }
  }

  private _defaultRequest (path: string, payload: any, method: HttpMethod): any {
    return this._buildRequest(path, method, payload ? JSON.stringify(payload) : '', '')// TODO: siste param store.state.currentUser?.token)
  };

  private _buildRequest (path: string, method: HttpMethod, content?: string, bearerToken?: string): any {
    const request = { headers: {} }
    request[HttpProperty.Url] = this._baseUrl + path
    request[HttpProperty.Method] = method
    request.headers[HttpProperty.ContentType] = 'application/json; charset=utf-8'
    if (content) { request[HttpProperty.Content] = content }
    if (bearerToken) { request.headers[HttpProperty.Authorization] = 'Bearer ' + bearerToken }
    return request
  };
}
