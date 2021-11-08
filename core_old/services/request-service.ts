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
    window.console.log(response)
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
    let bearerToken = ''
    const storedState = localStorage.getItem('state') || false
    const stateObject = { currentUser: { token: '' } }
    if (storedState) {
      Object.assign(stateObject, JSON.parse(storedState))
      if (stateObject.currentUser && stateObject.currentUser.token) {
        bearerToken = stateObject.currentUser.token
      }
    }

    return this._buildRequest(path, method, payload ? JSON.stringify(payload) : '', bearerToken)
  };

  private _buildRequest (path: string, method: HttpMethod, content?: string, bearerToken?: string): any {
    const request = {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ClientPlatform: 'Desktop',
        ClientAppVersion: '1.0.0'
      },
      url: this._baseUrl + path,
      method,
      data: null
    }

    if (content) {
      request.data = JSON.parse(content)
    }

    if (bearerToken) { request.headers[HttpProperty.Authorization] = 'Bearer ' + bearerToken }
    return request
  };
}
