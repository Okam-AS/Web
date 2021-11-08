import { Login, SendVerificationToken, Address } from "../models";
import { ActionName } from "../enums"
import { RequestService } from './request-service';
import Configuration from "../helpers/configuration"
import store from "../../vuex/store"

export class UserService {

    private _requestService: RequestService;
    constructor() {
        this._requestService = new RequestService(Configuration.okamApiBaseUrl);
    }

    public Logout() {
        store.dispatch(ActionName.ClearState);
    }

    public async Get(): Promise<boolean> {
        if(!store.state.currentUser?.token) return false;
        let response = await this._requestService.getRequest('/user');
        const parsedResponse = this._requestService.tryParseResponse(response)
        if (response.statusCode === 401 && store.state.currentUser.token) store.dispatch(ActionName.ClearState);
        return parsedResponse !== undefined;
    }

    public async Login(model: Login): Promise<boolean> {
        let response = await this._requestService.postRequest('/user/login', model);
        const parsedResponse = this._requestService.tryParseResponse(response)
        if (parsedResponse === undefined) return false;
        store.dispatch(ActionName.SetCurrentUser, parsedResponse);
        return true
    }

    public async UpdateDeliveryAddress(model: Address): Promise<boolean> {
        store.dispatch(ActionName.SetDeliveryAddress, model);
        return true
    }

    public async Delete(): Promise<boolean> {
        let response = await this._requestService.deleteRequest('/user');
        const parsedResponse = this._requestService.tryParseResponse(response)
        if (parsedResponse === undefined) return false;
        store.dispatch(ActionName.ClearState);
        return true
    }

    public async SendVerificationToken(model: SendVerificationToken): Promise<boolean> {
        var response = await this._requestService.postRequest('/user/sendverificationtoken', model)
        return this._requestService.tryParseResponse(response) === true;
    }
}