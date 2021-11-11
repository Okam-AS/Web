import { IHttpModule } from '../interfaces'

export class HttpModuleNS implements IHttpModule {
  httpClient: any;

  constructor () {
    const client = require('@nativescript/core')
    this.httpClient = client.Http.request
  }
}