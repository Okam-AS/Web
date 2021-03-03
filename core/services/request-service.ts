import axios from 'axios'
import { HttpMethod, HttpProperty } from '../enums'
import { IRequestService } from '../interfaces'

export class RequestService implements IRequestService {
  private _baseUrl: string
  constructor (baseUrl: string) {
    this._baseUrl = baseUrl
  }

  deleteRequest (path: string): Promise<any> {
    const request = this._defaultRequest(path, undefined, HttpMethod.DELETE)
    return axios(request).then((response: any) => {
      this._clearTokenIfExpired(response)
      if (response.status !== 200) { window.console.log(response.data) }
      return response
    })
  }

  getRequest (path: string): Promise<any> {
    const request = this._defaultRequest(path, false, HttpMethod.GET)
    return axios(request).then((response: any) => {
      this._clearTokenIfExpired(response)
      if (response.status !== 200) { window.console.log(response.data) }
      return response
    })
  }

  postRequest (path: string, payload?: any): Promise<any> {
    const request = this._defaultRequest(path, payload, HttpMethod.POST)
    window.console.log('postRequest', payload)
    return axios(request).then((response: any) => {
      this._clearTokenIfExpired(response)
      if (response.status !== 200) { window.console.log(response.data) }
      window.console.log('postRequest return', response)
      return response
    })
  }

  putRequest (path: string, payload: any): Promise<any> {
    const request = this._defaultRequest(path, payload, HttpMethod.PUT)
    return axios(request).then((response: any) => {
      this._clearTokenIfExpired(response)
      if (response.status !== 200) { window.console.log(response.data) }
      return response
    })
  }

  tryParseResponse (response: any) {
    window.console.log('tryParseResponse', response)
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
    if (response.status === 440) {
      // TODO: store.dispatch(ActionName.ClearState)
    }
  }

  private _defaultRequest (path: string, payload: any, method: HttpMethod): any {
    return this._buildRequest(path, method, payload ? JSON.stringify(payload) : '', '')// TODO: siste param store.state.currentUser?.token)
  };

  private _buildRequest (path: string, method: HttpMethod, content?: string, bearerToken?: string): any {
    const request = {
      headers: {
        'Content-Type': 'application/json'
      },
      url: this._baseUrl + path,
      method,
      data: JSON.parse(content || '')
    }
    if (bearerToken) { request.headers[HttpProperty.Authorization] = 'Bearer ' + bearerToken }
    return request
  };
}
