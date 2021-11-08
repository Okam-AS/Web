import { RequestService } from './request-service';
import Configuration from "../helpers/configuration"
import { Store } from '../models';
import * as geolocation from "@nativescript/geolocation";

export class StoreService {

    private _requestService: RequestService;
    constructor() {
        this._requestService = new RequestService(Configuration.okamApiBaseUrl);
    }

    public async feedback(feedback: string) {
        let response = await this._requestService.postRequest('/stores/feedback', {feedback});
        const parsedResponse = this._requestService.tryParseResponse(response);
        if (parsedResponse === undefined)
            throw new Error("Failed to post feedback")
    }

    public async get(id: number): Promise<Store> {
        let response = await this._requestService.getRequest('/stores/' + id);
        const parsedResponse = this._requestService.tryParseResponse(response);
        if (parsedResponse === undefined)
            throw new Error("Failed to get store")

        return parsedResponse
    }

    public async getAll(location?: geolocation.Location): Promise<Array<Store>> {
        var queryString = !!location && location.latitude && location.longitude ? "?longitude=" + location.longitude + "&latitude="+ location.latitude : "";
        let response = await this._requestService.getRequest('/stores' + queryString);
        const parsedResponse = this._requestService.tryParseResponse(response);
        if (parsedResponse === undefined)
                throw new Error("Failed to get stores")

        return parsedResponse
    }

    public async getAllTryLocationSorted(): Promise<Array<Store>> {
        const comp = this;
        try {
            const locationEnabled = await geolocation.isEnabled({timeout: 3000 });
            if(locationEnabled){
                const currentLocation = await geolocation.getCurrentLocation({timeout: 3000, desiredAccuracy: 100});
                return await comp.getAll(currentLocation);
            }else{
                return await comp.getAll();
            }
        } catch (error) {
            return await comp.getAll();
        }
    }    
    
}