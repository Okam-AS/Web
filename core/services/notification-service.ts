import { ActionName, NotificationPlatform } from '../enums'
import { NotificationRegistration } from '../models'
import { NotificationModule, VuexModule } from '../platform'
import $config from '../helpers/configuration'
import { RequestService } from './request-service'

export class NotificationService {
    private _requestService: RequestService;
    constructor () {
      this._requestService = new RequestService($config.okamApiBaseUrl)
    }

    public isEnabled () {
      const enabled = !!NotificationModule.areNotificationsEnabled()
      const loggedIn = VuexModule.state.currentUser && VuexModule.state.currentUser.id
      if (enabled && loggedIn && !VuexModule.state.notificationApproved) { VuexModule.dispatch(ActionName.SetNotificationApproved, true) }
      return VuexModule.state.notificationApproved
    }

    public register () {
      VuexModule.dispatch(ActionName.SetNotificationApproved, true)
      NotificationModule.registerForPushNotifications({
        onPushTokenReceivedCallback: token => this.registerNotificationOnServer(token),
        onMessageReceivedCallback: data => this.messageReceivedCallback(data),
        showNotifications: true,
        showNotificationsWhenInForeground: true
      })
    }

    // Already registered, but was deactivated
    public activate () {
      const that = this
      setTimeout(() => {
        if (this.isEnabled()) {
          NotificationModule.addOnPushTokenReceivedCallback(token => that.registerNotificationOnServer(token))
          NotificationModule.addOnMessageReceivedCallback(message => that.messageReceivedCallback(message))
        }
      }, 500)
    }

    // Turn off (called when user logges off)
    public deactivate () {
      VuexModule.dispatch(ActionName.SetNotificationApproved, false)
      if (VuexModule.state.notificationId) { this.delete(VuexModule.state.notificationId) }
    }

    private registerNotificationOnServer (token) {
      this.createRegistrationId(token).then((notificationId) => {
        const model = new NotificationRegistration(
          notificationId,
          $config.isAndroid ? NotificationPlatform.Fcm : NotificationPlatform.Apns,
          token
        )
        this.update(model)
      })
    }

    private messageReceivedCallback (data) {
      setTimeout(() => {
        if ($config.isAndroid) {
          NotificationModule.schedule([
            {
              title: 'Okam',
              body: data.data.message,
              thumbnail: false,
              forceShowWhenInForeground: true
            }
          ])
        }
        VuexModule.dispatch(ActionName.GetOrders)
      }, 500)
    }

    private async createRegistrationId (handle: string): Promise<string> {
      const response = await this._requestService.getRequest('/notification/consumer/' + handle)
      const parsedResponse = this._requestService.tryParseResponse(response)
      if (parsedResponse === undefined) { return '' }
      VuexModule.dispatch(ActionName.SetNotificationId, parsedResponse.id)
      return parsedResponse.id
    }

    private async update (model: NotificationRegistration): Promise<boolean> {
      const response = await this._requestService.putRequest('/notification/consumer', model)
      return this._requestService.tryParseResponse(response) !== undefined
    }

    private async delete (registrationId: string): Promise<boolean> {
      const response = await this._requestService.deleteRequest('/notification/consumer/' + registrationId)
      return this._requestService.tryParseResponse(response) !== undefined
    }
}