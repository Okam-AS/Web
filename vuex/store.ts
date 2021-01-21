import Vue from 'vue'
import { Cart, Order, Store, Address } from '../core/models'
import { CartService, StoreService, OrderService, ProductPositionService } from '../core/services'
import { MutationName, ActionName } from '../core/enums'
import { IUser } from '../core/interfaces'

const _cartService = new CartService()
const _storeService = new StoreService()
const _productPositionService = new ProductPositionService()
const _orderService = new OrderService()

export const state = () => ({
  currentUser: {} as IUser,
  carts: [] as Array<Cart>,
  orders: [] as Array<Order>,
  stores: [] as Array<Store>,
  cartIsLoading: false,
  introIsSeen: false
})

export const getters = {
  userIsLoggedIn: state => state.currentUser && state.currentUser.id,
  cartByStoreId (state) {
    return (storeId: number) => {
      return (state.carts || []).find(x => x.storeId === storeId) || {}
    }
  },
  deliveryAddress (state) {
    return () => {
      if (!state.currentUser || !state.currentUser.id || !state.currentUser.address || !state.currentUser.address.fullAddress || !state.currentUser.address.zipCode || !state.currentUser.address.city) { return '' }
      const address = state.currentUser.address
      return address.fullAddress + ', ' + address.zipCode + ' ' + address.city
    }
  }
}

export const actions = {
  [ActionName.Load] ({ commit }) {
    commit(MutationName.Load)
  },
  [ActionName.UpdateCartInDbAndSetState] ({ commit, getters }, storeId) {
    if (getters.userIsLoggedIn) {
      const updatedCart = getters.cartByStoreId(storeId)
      commit(MutationName.SetCartIsLoading, true)
      _cartService.update(updatedCart).then((cart) => {
        commit(MutationName.SetCarts, [cart])
        commit(MutationName.SetCartIsLoading, false)
      }).catch(() => {
        commit(MutationName.SetCartIsLoading, false)
      })
    }
  },
  [ActionName.GetOrders] ({ commit }, { thenHandler, catchHandler }) {
    _orderService.getAll().then((orders) => {
      if (Array.isArray(orders)) {
        commit(MutationName.SetOrders, orders)
      }
      if (thenHandler) { thenHandler(state().orders) }
    }).catch(() => {
      if (catchHandler) { catchHandler() }
    })
  },
  [ActionName.GetStores] ({ commit }, { thenHandler, catchHandler }) {
    _storeService.getAll().then((stores) => {
      if (Array.isArray(stores)) {
        commit(MutationName.SetStores, stores)
      }
      if (thenHandler) { thenHandler(state().stores) }
    }).catch(() => {
      if (catchHandler) { catchHandler() }
    })
  },
  [ActionName.GetStore] ({ commit }, { storeId, thenHandler, catchHandler }) {
    _storeService.get(storeId).then((store) => {
      if (store && store.id) {
        commit(MutationName.SetStore, store)
      }
      if (thenHandler) { thenHandler(store) }
    }).catch(() => {
      if (catchHandler) { catchHandler() }
    })
  },
  [ActionName.GetStoreImageProductPositions] ({ commit }, { storeId, storeImageId, thenHandler, catchHandler }) {
    _productPositionService.Get(storeImageId).then((pp) => {
      if (pp && Array.isArray(pp)) {
        commit(MutationName.SetStoreImageProductPositions, {
          storeId,
          productPositions: pp
        })
      }
      if (thenHandler) { thenHandler(pp) }
    }).catch(() => {
      if (catchHandler) { catchHandler() }
    })
  },
  [ActionName.SetDeliveryAddress] ({ commit }, address: Address) {
    commit(MutationName.SetDeliveryAddress, address)
  },
  [ActionName.SetCurrentUser] ({ commit }, user: IUser) {
    commit(MutationName.SetCurrentUser, user)
  },
  [ActionName.ClearState] ({ commit }) {
    commit(MutationName.ClearCurrentUser)
    commit(MutationName.SetCarts, [])
    commit(MutationName.SetOrders, [])
  },
  [ActionName.RemoveCart] ({ commit }, storeId) {
    commit(MutationName.RemoveCart, storeId)
    _cartService.delete(storeId)
  },
  [ActionName.SetCartRootProperties] ({ commit, dispatch }, {
    storeId, homeDeliveryMethodId, isSelfPickup, discountCode, fullAddress, zipCode, city, paymentIntentId, comment
  }) {
    commit(MutationName.SetCartRootProperties, {
      storeId, homeDeliveryMethodId, isSelfPickup, discountCode, fullAddress, zipCode, city, paymentIntentId, comment
    })
    dispatch(ActionName.UpdateCartInDbAndSetState, storeId)
  },
  [ActionName.SetLineItem] ({ commit, dispatch }, { storeId, lineItem }) {
    commit(MutationName.SetLineItem, { storeId, lineItem })
    dispatch(ActionName.UpdateCartInDbAndSetState, storeId)
  },
  [ActionName.RemoveLineItem] ({ commit, dispatch }, { storeId, productId }) {
    commit(MutationName.RemoveLineItem, { storeId, productId })
    dispatch(ActionName.UpdateCartInDbAndSetState, storeId)
  }
}

export const mutations = {
  [MutationName.Load] () {
    // const appsettingState = getString(AppSettingKey.State, '{}')
    // this.replaceState(
    //   Object.assign(state, JSON.parse(appsettingState))
    // )
    // TODO: Lagre state i storage
  },
  [MutationName.SetIntroIsSeen] (state, value: boolean) {
    state.introIsSeen = value
  },
  [MutationName.SetOrders] (state, orders: Array<Order>) {
    state.orders = orders
  },
  [MutationName.SetStores] (state, stores: Array<Store>) {
    state.stores = stores
  },
  [MutationName.SetStoreImageProductPositions] (state, { storeId, productPositions }) {
    const store = (state.stores || []).find(x => x.id === storeId)
    if (!store) { return }
    store.productPositions = productPositions
  },
  [MutationName.SetStore] (state, store: Store) {
    const storeIndex = state.stores.findIndex(x => x.id === store.id)
    if (storeIndex >= 0) {
      Vue.set(state.stores, storeIndex, store)
    } else {
      state.stores.push(store)
    }
  },
  [MutationName.SetDeliveryAddress] (state, address: Address) {
    state.currentUser.address = address
  },
  [MutationName.SetCurrentUser] (state, user: IUser) {
    state.currentUser = user
  },
  [MutationName.ClearCurrentUser] (state) {
    state.currentUser = {} as IUser
  },
  [MutationName.SetCarts] (state, carts: Array<Cart>) {
    if (Array.isArray(carts)) { state.carts = carts }
  },
  [MutationName.RemoveCart] (state, storeId) {
    const cart = state.carts.find(x => x.storeId === storeId)
    if (!cart) { return }
    cart.items = []
    cart.discountCode = ''
    cart.paymentIntentId = ''
    cart.comment = ''
  },
  [MutationName.SetCartIsLoading] (state, cartIsLoading) {
    state.cartIsLoading = cartIsLoading
  },
  [MutationName.SetCartRootProperties] (state, payload) {
    const cartIndex = state.carts.findIndex(x => x.storeId === payload.storeId)
    if (cartIndex >= 0) {
      ['homeDeliveryMethodId', 'isSelfPickup', 'discountCode', 'fullAddress', 'zipCode', 'city', 'paymentIntentId', 'comment']
        .forEach((key) => {
          if (payload[key] !== undefined) { Vue.set(state.carts[cartIndex], key, payload[key]) }
        })
    }
  },
  [MutationName.SetLineItem] (state, { storeId, lineItem }) {
    const cartIndex = state.carts.findIndex(x => x.storeId === storeId)
    if (cartIndex >= 0) {
      const itemIndex = state.carts[cartIndex].items.findIndex(item => item.product.id === lineItem.product.id)
      if (itemIndex >= 0) {
        Vue.set(state.carts[cartIndex].items, itemIndex, lineItem)
      } else {
        state.carts[cartIndex].items.unshift(lineItem)
      }
    } else {
      state.carts.push({ storeId, items: [lineItem] } as Cart)
    }
  },
  [MutationName.RemoveLineItem] (state, { storeId, productId }) {
    const cart = state.carts.find(x => x.storeId === storeId)
    if (!cart) { return }
    const index = (cart.items || []).map(item => item.product.id ? item.product.id : '').indexOf(productId)
    Vue.delete(cart.items, index)
  }
}