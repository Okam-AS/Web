import { shallowMount } from '@vue/test-utils'
import DashboardPage from '~/pages/admin/index.vue'
import StoreMarketCard from '~/components/admin/StoreMarketCard.vue'
import translations from '~/translations'

// The market form is only worth anything if a venue owner can REACH it. This lane exists because
// `Store.Country` had no UI lever at all: the endpoint was there and an operator with an HTTP client
// could set a market, while the owner in a browser could not — and so could not publish a schedule.
//
// So this asserts the wire, not the rendering: the dashboard's Butikkinformasjon grid mounts the card
// and hands it the selected store. Deleting the card from the grid would put the owner back where the
// lane started, and every other test in this suite would still pass.

const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

function mountDashboard (selectedAdminStore) {
  return shallowMount(DashboardPage, {
    mocks: {
      $i,
      // The dashboard's shop link is built from the market now (`shopUrl`), not from a
      // shop.okam.no literal, so a bare mount has to carry a market the way the app's
      // market-mixin does. Norway's row, because that is what this dashboard test is about.
      marketConfig: { shopUrl: 'https://shop.okam.no' },
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore, adminLocale: 'no', currentUser: { fullName: 'Sven' } }
      },
      _userService: { Reload: () => Promise.resolve(true) },
      _storeService: {
        Get: () => Promise.resolve({ name: 'Bryggen Bistro', openingHours: [], specialOpeningHours: [] }),
        GetSpecialOpeningHours: () => Promise.resolve([])
      }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

describe('the dashboard reaches the market form', () => {
  test('the Butikkinformasjon grid mounts the market card', () => {
    const card = mountDashboard(1).findComponent(StoreMarketCard)
    expect(card.exists()).toBe(true)
  })

  test('the card is given the selected store, so it reads the right market', () => {
    expect(mountDashboard(42).findComponent(StoreMarketCard).props('storeId')).toBe(42)
  })

  test('with no store selected the card is still mounted and told there is none', () => {
    // It renders its own "choose a store" state rather than the grid hiding it, so the setting does
    // not silently disappear on a page where no store has been picked yet.
    expect(mountDashboard(null).findComponent(StoreMarketCard).props('storeId')).toBeNull()
  })
})
