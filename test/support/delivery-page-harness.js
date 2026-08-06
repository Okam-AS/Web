// The `pages/admin/delivery.vue` test harness, shared by the two files that pin this page:
//
//   * `test/delivery-save-failure.test.js` — a write that did not land is reported and corrected
//   * `test/delivery-minimum-ore.test.js`  — the minimum-order amount shows every øre it holds
//
// It was written by the first of those and moved here by the second rather than copied, because the
// thing that makes it worth anything is that it HOLDS ITS OWN TRUTH: tests say what the server
// accepts and what it refuses, and the store's fields only change when the fake accepts a write.
// Two divergent copies of a fake backend is two different servers, and the second lane's arms would
// then be pinning the page against a world the first lane's arms had never agreed to.

import { shallowMount } from '@vue/test-utils'
import DeliveryPage from '~/pages/admin/delivery.vue'
import translations from '~/translations'

export const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

// Awaits the promise chains the page starts in `mounted` / a change handler. Each toggle is
// service call -> notification -> `refreshStore` (a second service call) -> `setLocalVariables`,
// so several microtask turns are needed before the DOM settles.
export async function settle (wrapper) {
  for (let i = 0; i < 12; i++) {
    await Promise.resolve()
  }
  await wrapper.vm.$nextTick()
}

// ---------------------------------------------------------------------------------------------
// A fake backend that HOLDS ITS OWN TRUTH. `Get` hands back a copy, so the page cannot mutate the
// server's state by holding a reference to it.
//
// `SetMinimumAmountForDelivery` stores WHATEVER INTEGER IT IS GIVEN, with no rounding and no
// multiple-of-100 constraint, because that is exactly what the route does:
// `StoresController.SetMinimumAmountForDelivery(int storeId, int amount)` assigns `amount` to
// `store.MinimumOrderPriceForHomeDelivery` and saves. A fake that quietly rounded here would hide
// the only direction of this field that can go wrong unnoticed.
// ---------------------------------------------------------------------------------------------
export function fakeBackend (storeOverrides = {}, refused = []) {
  const store = {
    id: 7,
    name: 'Bryggen Bistro',
    selfPickUp: true,
    tableDeliveryEnabled: false,
    homeDeliveryEnabled: false,
    dineHomeDeliveryEnabled: false,
    woltDriveEnabled: false,
    woltDriveIsConfigured: true,
    address: { fullAddress: 'Kong Oscars gate 1', zipCode: '5017', city: 'Bergen' },
    homeDeliveryFromAddress: null,
    minimumOrderPriceForHomeDelivery: 15000,
    ...storeOverrides
  }
  const calls = { get: 0, writes: [] }

  // Mirrors a store-service toggle exactly: it RESOLVES `false` when the write did not land. It
  // never rejects, because a 204 / non-200 / unparseable body never rejects either.
  const write = (name, field) => (_storeId, newValue) => {
    calls.writes.push({ name, newValue })
    if (refused.includes(name)) {
      return Promise.resolve(false)
    }
    store[field] = newValue
    return Promise.resolve(true)
  }

  return {
    store,
    calls,
    service: {
      Get: () => {
        calls.get += 1
        return Promise.resolve({ ...store, address: { ...store.address } })
      },
      UpdateSelfPickUp: write('UpdateSelfPickUp', 'selfPickUp'),
      UpdateTableDelivery: write('UpdateTableDelivery', 'tableDeliveryEnabled'),
      UpdateHomeDelivery: write('UpdateHomeDelivery', 'homeDeliveryEnabled'),
      UpdateDineHomeDelivery: write('UpdateDineHomeDelivery', 'dineHomeDeliveryEnabled'),
      UpdateWoltDelivery: write('UpdateWoltDelivery', 'woltDriveEnabled'),
      SetMinimumAmountForDelivery: (_storeId, amount) => {
        calls.writes.push({ name: 'SetMinimumAmountForDelivery', newValue: amount })
        if (refused.includes('SetMinimumAmountForDelivery')) {
          return Promise.resolve(false)
        }
        store.minimumOrderPriceForHomeDelivery = amount
        return Promise.resolve(true)
      },
      CreateOrUpdateHomeDeliveryFromAddress: (_storeId, address) => {
        calls.writes.push({ name: 'CreateOrUpdateHomeDeliveryFromAddress', newValue: address })
        if (refused.includes('CreateOrUpdateHomeDeliveryFromAddress')) {
          return Promise.resolve(false)
        }
        store.homeDeliveryFromAddress = { ...address }
        return Promise.resolve(true)
      }
    }
  }
}

export async function mountDelivery (backend) {
  const wrapper = shallowMount(DeliveryPage, {
    mocks: {
      $i,
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 7, adminLocale: 'no' }
      },
      _storeService: backend.service,
      _deliveryMethodService: { Get: () => Promise.resolve([]) }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
  await settle(wrapper)
  return wrapper
}
