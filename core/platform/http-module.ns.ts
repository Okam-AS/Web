import { IHttpModule } from '../interfaces'

class HttpModuleNS implements IHttpModule {
  httpClient: any;

  constructor () {
    const client = require('@nativescript/core')
    this.httpClient = client.Http.request
  }
}

export const HttpModule = HttpModuleNS