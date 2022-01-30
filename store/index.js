import Vue from 'vue'
import { MutationName, ActionName } from '../core/enums'

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
      return (state.carts || []).find(x => x.storeId === storeId) || { calculations: {} }
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
  [ActionName.SetNotificationApproved] () {
    // Used for mobile push
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
    state.currentUser = JSON.parse(JSON.stringify(user))
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
  [MutationName.RemoveLineItem] (state, { storeId, lineItem }) {
    const cart = state.carts.find(x => x.storeId === storeId)
    if (!cart) { return }
    const index = (cart.items || []).findIndex(x => x.id === lineItem.id)
    Vue.delete(cart.items, index)
  }
}