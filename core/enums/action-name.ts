export enum ActionName {
    Load = 'Load',
    UpdateCartInDbAndSetState = 'UpdateCartInDbAndSetState',
    SetCurrentUser = 'SetCurrentUser',
    SetDeliveryAddress = 'SetDeliveryAddress',
    SetNotificationId = 'SetNotificationId',
    SetNotificationApproved = 'SetNotificationApproved',
    GetOrders = 'GetOrders',
    GetStores = 'GetStores',
    GetStore = 'GetStore',
    ClearState = 'ClearState',
    RemoveCart = 'RemoveCart',
    SetLineItem = 'SetLineItem',
    AddQuantityLineItem = 'AddQuantityLineItem',
    SetCartRootProperties = 'SetCartRootProperties',
    RemoveLineItem = 'RemoveLineItem'
}