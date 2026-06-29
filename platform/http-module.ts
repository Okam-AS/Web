import axios from "axios";
import { IHttpModule } from "~/core/interfaces";

// Web platform HTTP adapter (axios). Registered into core via setPlatform() at startup.
export class HttpModule implements IHttpModule {
  httpClient: any;

  constructor() {
    this.httpClient = axios;
  }
}
