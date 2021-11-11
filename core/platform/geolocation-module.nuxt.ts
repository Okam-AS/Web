import { IGeolocationModule } from '../interfaces'

class GeolocationModuleNUXT implements IGeolocationModule {
    getCurrentLocation: any;
    isEnabled: any;
    longitude: any;
    latitude: any;
}

export const GeolocationModule = GeolocationModuleNUXT