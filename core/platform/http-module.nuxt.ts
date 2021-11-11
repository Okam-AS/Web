import { IHttpModule } from '../interfaces'

export class HttpModuleNS implements IHttpModule {
  httpClient: any;

  constructor () {
    const temp = require('@nuxtjs/axios')
    this.httpClient = temp.default
  }
}