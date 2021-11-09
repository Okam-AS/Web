import { IGeolocationModule } from '../interfaces'

export class GeolocationModuleNUXT implements IGeolocationModule {
    getCurrentLocation: any;
    isEnabled: any;
    longitude: any;
    latitude: any;
}