import { Http, HttpResponse } from "@nativescript/core"
import { HttpMethod, HttpProperty } from "../enums"
import { ActionName } from "../enums"
import store from "../../vuex/store"
import Vue from 'vue';

export class RequestService {

    private _baseUrl: string
    constructor(baseUrl: string) {
        this._baseUrl = baseUrl;
    }

    deleteRequest(path: string): Promise<any> {
        let request = this._defaultRequest(path, undefined, HttpMethod.DELETE);
        return Http.request(request).then(response => {
            this._clearTokenIfExpired(response);
            if (response.statusCode !== 200) console.log(response.content.toString())
            return response;
        });
    }

    getRequest(path: string): Promise<any> {
        let request = this._defaultRequest(path, false, HttpMethod.GET);
        return Http.request(request).then(response => {
            this._clearTokenIfExpired(response);
            if (response.statusCode !== 200) console.log(response.content.toString())
            return response;
        });
    }

    postRequest(path: string, payload?: any): Promise<any> {
        let request = this._defaultRequest(path, payload, HttpMethod.POST);
        return Http.request(request).then(response => {
            this._clearTokenIfExpired(response);
            if (response.statusCode !== 200) console.log(response.content.toString())
            return response;
        });
    }

    putRequest(path: string, payload: any): Promise<any> {
        let request = this._defaultRequest(path, payload, HttpMethod.PUT);
        return Http.request(request).then(response => {
            this._clearTokenIfExpired(response);
            if (response.statusCode !== 200) console.log(response.content.toString())
            return response;
        });
    }

    tryParseResponse(response) {
        if (response && response.statusCode === 200) {
            var parsedResponse = undefined;
            try {
                parsedResponse = response.content.toJSON();
            } catch (e) {
                return undefined;
            }
            return parsedResponse;
        }
        else {
            return undefined;
        }
    }

    private _clearTokenIfExpired(response: HttpResponse) {
        if (response.statusCode === 440) store.dispatch(ActionName.ClearState);
    }

    private _defaultRequest(path: string, payload: any, method: HttpMethod): any {
        return this._buildRequest(path, method, payload ? JSON.stringify(payload) : "", store.state.currentUser?.token);
    };

    private _buildRequest(path: string, method: HttpMethod, content?: string, bearerToken?: string): any {
        let request = { headers: {} };
        request[HttpProperty.Url] = this._baseUrl + path;
        request[HttpProperty.Method] = method;
        request.headers[HttpProperty.ContentType] = 'application/json; charset=utf-8';
        
        if(Vue.prototype.$isIOS)
            request.headers[HttpProperty.ClientPlatform] ='iOS';
        else if(Vue.prototype.$isAndroid)
            request.headers[HttpProperty.ClientPlatform] ='Android';
        else
            request.headers[HttpProperty.ClientPlatform] = 'Unknown';

        request.headers[HttpProperty.ClientAppVersion] = Vue.prototype.$appVersion;
        
        if (content) request[HttpProperty.Content] = content;
        if (bearerToken) request.headers[HttpProperty.Authorization] = 'Bearer ' + bearerToken;
        return request
    };

}