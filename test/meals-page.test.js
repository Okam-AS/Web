import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import MealsPage from '~/pages/admin/meals-agreements.vue'
import { WorkforceApiError } from '~/utils/workforce/api-client'

const ACME = '11111111-1111-1111-1111-111111111111'
const BOLT = '22222222-2222-2222-2222-222222222222'

const mockCalls = []
let mockCompaniesAnswer = () => Promise.resolve([])
let mockOrdersAnswer = () => Promise.resolve({ orders: [] })

// The page builds its client in a computed, so the module is mocked rather than the instance. Every
// call is recorded so the tests can assert WHICH reads the page issues — the part of this page that
// is a contract with the backend rather than a rendering choice.
//
// `refusalOf` is deliberately the REAL one: the page's whole error story is that function's output,
// and a stubbed classifier would let the page pass while classifying nothing.
jest.mock('~/utils/meals/meals-client', () => {
  const actual = jest.requireActual('~/utils/meals/meals-client')
  return Object.assign({}, actual, {
    MealsStoreService: class {
      ListCompanies (storeId) {
        mockCalls.push(['ListCompanies', storeId])
        return mockCompaniesAnswer(storeId)
      }

      ListOrders (storeId) {
        mockCalls.push(['ListOrders', storeId])
        return mockOrdersAnswer(storeId)
      }
    }
  })
})

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function agreement (over) {
  return Object.assign({
    companyId: ACME,
    legalName: 'Acme Industri AS',
    displayName: 'Acme',
    organizationNumber: '912345678',
    companyStatus: 'Active',
    agreementId: 'a-1',
    currency: 'NOK',
    agreementStatus: 'Active',
    activeMemberCount: 12
  }, over)
}

function order (over) {
  return Object.assign({
    orderId: 5001,
    storeId: 42,
    companyId: ACME,
    reservationId: 'r-1',
    reservationState: 'Captured',
    reservedCapMinor: 25000,
    boundCartTotalMinor: 18900,
    capturedMinor: 18900,
    currency: 'NOK',
    boundAtUtc: '2026-07-28T22:30:00',
    capturedAtUtc: '2026-07-28T22:41:12'
  }, over)
}

function mountPage (options) {
  const opts = options || {}
  return shallowMount(MealsPage, {
    mocks: {
      $i: key => key,
      // The market mixin's currency, the single source the money formatter prints in.
      marketConfig: { currency: 'NOK' },
      $store: {
        getters: { userIsLoggedIn: opts.loggedIn !== false },
        state: {
          selectedAdminStore: opts.storeId === undefined ? 42 : opts.storeId,
          adminLocale: 'no',
          currentUser: { id: 1, adminIn: opts.adminIn === undefined ? [{ id: 42 }] : opts.adminIn }
        }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

beforeEach(() => {
  mockCalls.length = 0
  mockCompaniesAnswer = () => Promise.resolve([agreement()])
  mockOrdersAnswer = () => Promise.resolve({ orders: [order()] })
})

describe('which reads the page issues', () => {
  test('exactly the two store-scoped reads, once each, for the selected store', async () => {
    mountPage()
    await settled()
    expect(mockCalls).toEqual([['ListCompanies', 42], ['ListOrders', 42]])
  })

  test('nothing is read without a store to read it for', async () => {
    mountPage({ storeId: null, adminIn: [] })
    await settled()
    expect(mockCalls).toEqual([])
  })

  test('nothing is read while signed out', async () => {
    mountPage({ loggedIn: false })
    await settled()
    expect(mockCalls).toEqual([])
  })

  test('with no store explicitly selected it falls back to the first store administered', async () => {
    mountPage({ storeId: null, adminIn: [{ id: 77 }, { id: 78 }] })
    await settled()
    expect(mockCalls).toEqual([['ListCompanies', 77], ['ListOrders', 77]])
  })
})

describe('the two reads fail independently', () => {
  test('an orders read that 403s leaves the agreements exactly as they were read', async () => {
    mockOrdersAnswer = () => Promise.reject(new WorkforceApiError(403, { code: 'meals.forbidden' }))
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.view.agreements.state).toBe('loaded')
    expect(wrapper.vm.view.agreements.rows).toHaveLength(1)
    expect(wrapper.vm.view.orders.state).toBe('unknown')
    expect(wrapper.vm.view.orders.refusal).toBe('forbidden')
    // ...and the agreements read carries no refusal of its own.
    expect(wrapper.vm.view.agreements.refusal).toBeNull()
  })

  test('a directory that 404s dark leaves the agreements UNKNOWN, never empty', async () => {
    mockCompaniesAnswer = () => Promise.reject(new WorkforceApiError(404, { code: 'meals.not-found' }))
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.view.agreements.state).toBe('unknown')
    expect(wrapper.vm.view.agreements.isEmpty).toBe(false)
    expect(wrapper.vm.view.agreements.refusal).toBe('dark')

    // Positive control: an EMPTY answer from the same page is a different state, so the assertion
    // above is about the failure and not about the page never loading anything.
    mockCompaniesAnswer = () => Promise.resolve([])
    const empty = mountPage()
    await settled()
    expect(empty.vm.view.agreements.state).toBe('loaded')
    expect(empty.vm.view.agreements.isEmpty).toBe(true)
  })

  test('an empty-bodied 404 is classified apart from the module\'s own 404', async () => {
    // The wire distinction, carried all the way to the page: no `meals.*` code means the module did
    // not answer, and the page may not say the venue's Meals is switched off.
    mockCompaniesAnswer = () => Promise.reject(new WorkforceApiError(404, null))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.view.agreements.refusal).toBe('absent')
  })
})

describe('selecting an agreement', () => {
  test('selecting shows that company\'s orders; selecting again clears it', async () => {
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.view.selected).toBeNull()
    expect(wrapper.vm.view.orders.rows).toEqual([])

    wrapper.vm.select(ACME)
    expect(wrapper.vm.view.selected.companyId).toBe(ACME)
    expect(wrapper.vm.view.orders.rows.map(r => r.orderId)).toEqual([5001])

    wrapper.vm.select(ACME)
    expect(wrapper.vm.view.selected).toBeNull()
  })

  test('a selection that no longer exists after a reload is dropped, not left dangling', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select(ACME)
    expect(wrapper.vm.selectedCompanyId).toBe(ACME)

    // The venue's agreement with Acme ended and left the directory.
    mockCompaniesAnswer = () => Promise.resolve([agreement({ companyId: BOLT, displayName: 'Bolt', agreementId: 'a-2' })])
    await wrapper.vm.load()
    expect(wrapper.vm.selectedCompanyId).toBeNull()

    // Positive control: a selection that DOES survive the reload is kept.
    wrapper.vm.select(BOLT)
    await wrapper.vm.load()
    expect(wrapper.vm.selectedCompanyId).toBe(BOLT)
  })
})

describe('a reload in flight never renders as a venue with nothing', () => {
  test('the reads are cleared to UNKNOWN, not to empty lists', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.view.agreements.state).toBe('loaded')

    // Hold both reads open and inspect the state the page is in while they are pending.
    let releaseCompanies
    mockCompaniesAnswer = () => new Promise((resolve) => { releaseCompanies = () => resolve([agreement()]) })
    mockOrdersAnswer = () => new Promise(() => {})

    const pending = wrapper.vm.load()
    await settled()
    expect(wrapper.vm.view.agreements.state).toBe('unknown')
    expect(wrapper.vm.view.agreements.isEmpty).toBe(false)
    expect(wrapper.vm.view.agreements.refusal).toBeNull() // nothing refused — nothing answered yet

    releaseCompanies()
    return Promise.race([pending, settled()])
  })
})

describe('unlisted companies are reported rather than swallowed', () => {
  test('an order attributed to a company the directory does not list raises a notice', async () => {
    mockOrdersAnswer = () => Promise.resolve({ orders: [order(), order({ orderId: 5099, reservationId: 'r-9', companyId: BOLT })] })
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.view.orders.unlistedCompanyIds).toEqual([BOLT])
    expect(wrapper.vm.unlistedNotice).toBe('meals_unlisted_company_one')
  })

  test('with the directory known and complete there is no notice at all', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.view.orders.unlistedCompanyIds).toEqual([])
  })
})
