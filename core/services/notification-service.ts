import { ActionName, NotificationPlatform } from "../enums"
import { RequestService } from './request-service';
import Configuration from "../helpers/configuration"
import { NotificationRegistration } from '../models';
import store from "../../vuex/store"
import { isAndroid } from "@nativescript/core";
import { messaging } from "@nativescript/firebase/messaging";
import { LocalNotifications } from "@nativescript/local-notifications";

export class NotificationService {

    private _requestService: RequestService;
    constructor() {
        this._requestService = new RequestService(Configuration.okamApiBaseUrl);
    }

    public isEnabled() {
        const enabled = !!messaging.areNotificationsEnabled();
        const loggedIn = store.state.currentUser && store.state.currentUser.id;
        if (enabled && loggedIn && !store.state.notificationApproved) store.dispatch(ActionName.SetNotificationApproved, true);
        return store.state.notificationApproved;
    }

    public register() {
        store.dispatch(ActionName.SetNotificationApproved, true);
        messaging.registerForPushNotifications({
            onPushTokenReceivedCallback: token => this.registerNotificationOnServer(token),
            onMessageReceivedCallback: data => this.messageReceivedCallback(data),
            showNotifications: true,
            showNotificationsWhenInForeground: true
        });
    }

    //Already registered, but was deactivated
    public activate() {
        const that = this;
        setTimeout(() => {
            if (this.isEnabled()) {
                messaging.addOnPushTokenReceivedCallback(token => that.registerNotificationOnServer(token));
                messaging.addOnMessageReceivedCallback(message => that.messageReceivedCallback(message));
            }
        }, 500);
    }

    //Turn off (called when user logges off)
    public deactivate() {
        store.dispatch(ActionName.SetNotificationApproved, false);
        if (store.state.notificationId) this.delete(store.state.notificationId)
    }

    private registerNotificationOnServer(token) {
        this.createRegistrationId(token).then(notificationId => {
            const model = new NotificationRegistration(
                notificationId,
                isAndroid ? NotificationPlatform.Fcm : NotificationPlatform.Apns,
                token
            );
            this.update(model);
        });
    }

    private messageReceivedCallback(data) {
        setTimeout(() => {
            if (isAndroid) {
                LocalNotifications.schedule([
                    {
                        title: "Okam",
                        body: data.data.message,
                        thumbnail: false,
                        forceShowWhenInForeground: true
                    }
                ]);
            }
            store.dispatch(ActionName.GetOrders);
        }, 500);
    }

    private async createRegistrationId(handle: string): Promise<string> {
        let response = await this._requestService.getRequest('/notification/consumer/' + handle);
        const parsedResponse = this._requestService.tryParseResponse(response)
        if (parsedResponse === undefined) return "";
        store.dispatch(ActionName.SetNotificationId, parsedResponse.id);
        return parsedResponse.id
    }

    private async update(model: NotificationRegistration): Promise<boolean> {
        let response = await this._requestService.putRequest('/notification/consumer', model);
        return this._requestService.tryParseResponse(response) !== undefined
    }

    private async delete(registrationId: string): Promise<boolean> {
        let response = await this._requestService.deleteRequest('/notification/consumer/' + registrationId);
        return this._requestService.tryParseResponse(response) !== undefined
    }

}