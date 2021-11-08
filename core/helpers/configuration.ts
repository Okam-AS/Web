class Configuration {
  okamApiBaseUrl: string;

  constructor() {
    this.okamApiBaseUrl = "https://okamapi.azurewebsites.net"
  }
}

export default new Configuration()