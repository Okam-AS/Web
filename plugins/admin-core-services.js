// Admin-only adapters over the unified, stateless core services.
//
// The unified core services are stateless API clients constructed from an
// ICoreInitializer. Unlike the old v3 services they REJECT on auth failure and no
// longer mutate Vuex internally. These thin subclasses restore the exact v3 contract
// the admin call-sites depend on — in ONE documented place — by overriding only the
// methods whose semantics changed and inheriting everything else. No monkey-patching,
// no per-access method re-binding, no name-drift for un-overridden methods.

import { UserService, CartService } from '~/core/services'

// Only a genuine HTTP 401 (expired/invalid token) should end the session. A transient
// failure (network blip, 5xx, timeout) or a momentary missing token must NOT log the
// user out — a catch-all ClearState caused spurious logouts while navigating admin.
const isUnauthorized = (err) => {
  const status = err && ((err.response && err.response.status) || err.statusCode || err.status)
  return status === 401
}

export class AdminUserService extends UserService {
  constructor (store, coreInitializer) {
    super(coreInitializer)
    this._store = store
  }

  get _token () {
    return (this._store.state.currentUser && this._store.state.currentUser.token) || ''
  }

  // boolean; on success preserve the token (the /user payload has none) + SetCurrentUser.
  Reload () {
    return super.Reload()
      .then((user) => {
        if (!user) return false
        user.token = this._token // preserve token across reload (v3 parity)
        this._store.dispatch('SetCurrentUser', user)
        return true
      })
      .catch((err) => { if (isUnauthorized(err)) this._store.dispatch('ClearState'); return false })
  }

  // boolean; clear only on a genuine 401.
  Get () {
    return super.Get()
      .then((u) => !!u)
      .catch((err) => { if (isUnauthorized(err)) this._store.dispatch('ClearState'); return false })
  }

  // boolean; on success dispatch SetCurrentUser.
  Login (phoneNumber, token) {
    return super.Login(phoneNumber, token)
      .then((user) => { if (user) { this._store.dispatch('SetCurrentUser', user); return true } return false })
      .catch(() => false)
  }

  // user|false; on success dispatch SetCurrentUser.
  LoginAdmin (phoneNumber, token, setCurrentStoreFunction) {
    return super.LoginAdmin(phoneNumber, token, setCurrentStoreFunction)
      .then((user) => { if (user) this._store.dispatch('SetCurrentUser', user); return user })
      .catch(() => false)
  }

  // route logout through the unified clearState callback.
  Logout (notificationId) {
    return super.Logout(notificationId, () => this._store.dispatch('ClearState'))
  }
}

export class AdminCartService extends CartService {
  constructor (store, coreInitializer) {
    super(coreInitializer)
    this._store = store
  }

  // v3 Vuex-mutation helpers removed from the stateless core; re-expose as direct commits.
  SetLineItem ({ storeId, lineItem }) {
    this._store.commit('SetLineItem', { storeId, lineItem })
  }

  RemoveLineItem ({ storeId, lineItem }) {
    this._store.commit('RemoveLineItem', { storeId, lineItem })
  }
}
