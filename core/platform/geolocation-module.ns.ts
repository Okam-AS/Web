import { IGeolocationModule } from '../interfaces'

const geolocationPath = '@nativescript/geolocation'
const geolocation = require(geolocationPath)

export class GeolocationModuleNS implements IGeolocationModule {
    getCurrentLocation: any;
    isEnabled: any;
    longitude: any;
    latitude: any;

    constructor () {
      this.getCurrentLocation = geolocation.getCurrentLocation
      this.isEnabled = geolocation.isEnabled
      this.longitude = geolocation.longitude
      this.latitude = geolocation.latitude
    }
}