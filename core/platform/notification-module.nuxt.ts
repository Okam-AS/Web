import { INotificationModule } from '../interfaces'

export class NotificationModuleNUXT implements INotificationModule {
    areNotificationsEnabled: any;
    registerForPushNotifications: any;
    addOnPushTokenReceivedCallback: any;
    addOnMessageReceivedCallback: any;
    schedule: any;
}