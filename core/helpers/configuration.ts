import { IConfiguration } from '../interfaces'

class Configuration implements IConfiguration {
  okamApiBaseUrl: string;

  constructor () {
    this.okamApiBaseUrl = 'https://okamapitest.azurewebsites.net'
    // this.okamApiBaseUrl = 'https://okamapi.azurewebsites.net'
  }
}

export default new Configuration()
