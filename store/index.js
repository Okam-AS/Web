import Vue from 'vue'
import { MutationName, ActionName } from '../core/enums'
import { CartService, StoreService, OrderService } from '../core/services'

const _cartService = new CartService()
const _storeService = new StoreService()
const _orderService = new OrderService()

export const state = () => ({
  currentUser: {},
  carts: [],
  orders: [],
  stores: [],
  cartIsLoading: false
})

export const getters = {
  userIsLoggedIn: state => state.currentUser && state.currentUser.id,
  cartByStoreId (state) {
    return (storeId) => {
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
  [ActionName.SetDeliveryAddress] ({ commit }, address) {
    commit(MutationName.SetDeliveryAddress, address)
  },
  [ActionName.SetCurrentUser] ({ commit }, user) {
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
    storeId, homeDeliveryMethodId, isWaiterOrder, deliveryType, discountCode, fullAddress, zipCode, city, paymentIntentId, comment, tipPercent, tableName
  }) {
    commit(MutationName.SetCartRootProperties, {
      storeId, homeDeliveryMethodId, isWaiterOrder, deliveryType, discountCode, fullAddress, zipCode, city, paymentIntentId, comment, tipPercent, tableName
    })
    dispatch(ActionName.UpdateCartInDbAndSetState, storeId)
  },
  [ActionName.SetLineItem] ({ commit, dispatch }, { storeId, lineItem }) {
    commit(MutationName.SetLineItem, { storeId, lineItem })
    dispatch(ActionName.UpdateCartInDbAndSetState, storeId)
  },
  [ActionName.RemoveLineItem] ({ commit, dispatch }, { storeId, lineItemId }) {
    commit(MutationName.RemoveLineItem, { storeId, lineItemId })
    dispatch(ActionName.UpdateCartInDbAndSetState, storeId)
  }
}

export const mutations = {
  [MutationName.Load] (state) {
    const storedState = localStorage.getItem('state') || false
    if (storedState) {
      Object.assign(state, JSON.parse(storedState))
    }
  },
  [MutationName.SetOrders] (state, orders) {
    state.orders = orders
  },
  [MutationName.SetStores] (state, stores) {
    state.stores = stores
  },
  [MutationName.SetStore] (state, store) {
    const storeIndex = state.stores.findIndex(x => x.id === store.id)
    if (storeIndex >= 0) {
      Vue.set(state.stores, storeIndex, store)
    } else {
      state.stores.push(store)
    }
  },
  [MutationName.SetDeliveryAddress] (state, address) {
    state.currentUser.address = address
  },
  [MutationName.SetCurrentUser] (state, user) {
    state.currentUser = { ...user }
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('user', JSON.stringify(user))
    }
  },
  [MutationName.ClearCurrentUser] (state) {
    state.currentUser = {}
  },
  [MutationName.SetCarts] (state, carts) {
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
      ['homeDeliveryMethodId', 'isWaiterOrder', 'deliveryType', 'discountCode', 'fullAddress', 'zipCode', 'city', 'paymentIntentId', 'comment', 'tipPercent', 'tableName']
        .forEach((key) => {
          if (payload[key] !== undefined) { Vue.set(state.carts[cartIndex], key, payload[key]) }
        })
    }
  },
  [MutationName.SetLineItem] (state, { storeId, lineItem }) {
    const cartIndex = state.carts.findIndex(x => x.storeId === storeId)
    if (cartIndex >= 0) {
      const itemIndex = state.carts[cartIndex].items.findIndex(item => item.id === lineItem.id)
      if (itemIndex >= 0) {
        Vue.set(state.carts[cartIndex].items, itemIndex, lineItem)
      } else {
        state.carts[cartIndex].items.unshift(lineItem)
      }
    } else {
      state.carts.push({ storeId, items: [lineItem] })
    }
  },
  [MutationName.RemoveLineItem] (state, { storeId, lineItemId }) {
    const cart = state.carts.find(x => x.storeId === storeId)
    if (!cart) { return }
    const index = (cart.items || []).findIndex(x => x.id === lineItemId)
    Vue.delete(cart.items, index)
  }
}