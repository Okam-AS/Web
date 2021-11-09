import { INotificationModule } from '../interfaces'

const messagingPath = '@nativescript/firebase/messaging'
const messaging = require(messagingPath)

const localNotificationsPath = '@nativescript/local-notifications'
const localNotifications = require(localNotificationsPath)

export class NotificationModuleNS implements INotificationModule {
    areNotificationsEnabled: any;
    registerForPushNotifications: any;
    addOnPushTokenReceivedCallback: any;
    addOnMessageReceivedCallback: any;
    schedule: any;

    constructor () {
      this.areNotificationsEnabled = messaging.areNotificationsEnabled
      this.registerForPushNotifications = messaging.registerForPushNotifications
      this.addOnPushTokenReceivedCallback = messaging.addOnPushTokenReceivedCallback
      this.addOnMessageReceivedCallback = messaging.addOnMessageReceivedCallback
      this.schedule = localNotifications.schedule
    }
}