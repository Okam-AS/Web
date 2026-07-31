import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import MealsCompaniesPage from '~/pages/admin/meals-companies.vue'
import { WorkforceApiError } from '~/utils/workforce/api-client'

const ACME = '11111111-1111-1111-1111-111111111111'
const BOLT = '22222222-2222-2222-2222-222222222222'

const mockCalls = []
let mockAnswers = {}

// The page builds its clients in computeds, so the MODULES are mocked rather than the instances.
// Every call is recorded so the tests can assert WHICH reads and writes the page issues — the part
// of this page that is a contract with the backend rather than a rendering choice.
//
// `refusalOf` and `writeFailureKey` are deliberately the REAL ones: the page's whole error story is
// those two functions' output, and stubbing them would let the page pass while classifying nothing.
jest.mock('~/utils/meals/meals-client', () => {
  const actual = jest.requireActual('~/utils/meals/meals-client')
  return Object.assign({}, actual, {
    MealsStoreService: class {
      ListCompanies (storeId) {
        mockCalls.push(['ListCompanies', storeId])
        return mockAnswers.ListCompanies(storeId)
      }
    }
  })
})

jest.mock('~/utils/store-market/market-client', () => ({
  StoreMarketService: class {
    Get (storeId) {
      mockCalls.push(['Market', storeId])
      return mockAnswers.Market(storeId)
    }
  }
}))

jest.mock('~/utils/meals/admin-client', () => ({
  MealsAdminService: class {
    GetCompany (id) { mockCalls.push(['GetCompany', id]); return mockAnswers.GetCompany(id) }
    ListPrograms (id) { mockCalls.push(['ListPrograms', id]); return mockAnswers.ListPrograms(id) }
    ListInvitations (id) { mockCalls.push(['ListInvitations', id]); return mockAnswers.ListInvitations(id) }
    ListMembers (id) { mockCalls.push(['ListMembers', id]); return mockAnswers.ListMembers(id) }
    CreateCompany (body) { mockCalls.push(['CreateCompany', body]); return mockAnswers.CreateCompany(body) }
    UpdateCompany (id, body) { mockCalls.push(['UpdateCompany', id, body]); return mockAnswers.UpdateCompany(id, body) }
    SignAgreement (storeId, id, body) { mockCalls.push(['SignAgreement', storeId, id, body]); return mockAnswers.SignAgreement(body) }
    CreateProgram (id, body) { mockCalls.push(['CreateProgram', id, body]); return mockAnswers.CreateProgram(body) }
    CreatePolicyVersion (id, body) { mockCalls.push(['CreatePolicyVersion', id, body]); return mockAnswers.CreatePolicyVersion(body) }
    CreateInvitation (id, body) { mockCalls.push(['CreateInvitation', id, body]); return mockAnswers.CreateInvitation(body) }
    RevokeInvitation (id, inviteId, body) { mockCalls.push(['RevokeInvitation', id, inviteId, body]); return mockAnswers.RevokeInvitation(body) }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function directoryEntry (over) {
  return Object.assign({
    companyId: ACME,
    legalName: 'Acme Industri AS',
    displayName: 'Acme',
    organizationNumber: '912345678',
    companyStatus: 'Active',
    agreementId: 'a-1',
    currency: 'NOK',
    agreementStatus: 'Active',
    activeMemberCount: 3
  }, over)
}

function mountPage (options) {
  const opts = options || {}
  return shallowMount(MealsCompaniesPage, {
    mocks: {
      $i: key => key,
      marketConfig: { currency: 'NOK' },
      $store: {
        getters: { userIsLoggedIn: opts.loggedIn !== false },
        state: {
          selectedAdminStore: opts.storeId === undefined ? 42 : opts.storeId,
          adminLocale: 'no',
          currentUser: Object.assign(
            { id: 'user-1', adminIn: opts.adminIn === undefined ? [{ id: 42 }] : opts.adminIn },
            opts.isPowerUser ? { isPowerUser: true } : {})
        }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

beforeEach(() => {
  mockCalls.length = 0
  mockAnswers = {
    ListCompanies: () => Promise.resolve([directoryEntry()]),
    Market: () => Promise.resolve({ country: 'NO', currencyCode: 'NOK', timeZone: 'Europe/Oslo' }),
    // Faithful to the id it was asked for: the page admits a read company into the picker only when
    // it matches the selection, and a fixture that always answered ACME would hide that.
    GetCompany: id => Promise.resolve({ companyId: id, displayName: 'Acme', revision: 'r1' }),
    ListPrograms: () => Promise.resolve([]),
    ListInvitations: () => Promise.resolve([]),
    ListMembers: () => Promise.resolve([]),
    CreateCompany: () => Promise.resolve({ companyId: BOLT, legalName: 'Bolt AS', displayName: 'Bolt', status: 'Active', revision: 'r1' }),
    UpdateCompany: () => Promise.resolve({}),
    SignAgreement: () => Promise.resolve({ agreementId: 'a-2' }),
    CreateProgram: () => Promise.resolve({ programId: 'p-1' }),
    CreatePolicyVersion: () => Promise.resolve({ version: 1 }),
    CreateInvitation: () => Promise.resolve({
      invitationId: 'i-1',
      intendedContactEmail: 'kari@acme.no',
      intendedRole: 'Employee',
      state: 'Pending',
      expiresAtUtc: '2026-08-14T09:00:00',
      token: 'mealsinv_abc123'
    }),
    RevokeInvitation: () => Promise.resolve({})
  }
})

describe('which reads the page issues', () => {
  test('on load: the venue directory and the venue market, and nothing company-scoped', async () => {
    mountPage()
    await settled()
    expect(mockCalls).toEqual([['ListCompanies', 42], ['Market', 42]])
  })

  test('nothing is read without a store, or while signed out', async () => {
    mountPage({ storeId: null, adminIn: [] })
    await settled()
    expect(mockCalls).toEqual([])

    mountPage({ loggedIn: false })
    await settled()
    expect(mockCalls).toEqual([])
  })

  test('selecting a company issues exactly the four company-scoped reads for it', async () => {
    const wrapper = mountPage()
    await settled()
    mockCalls.length = 0

    wrapper.vm.select(ACME)
    await settled()
    expect(mockCalls.map(c => c[0]).sort()).toEqual(['GetCompany', 'ListInvitations', 'ListMembers', 'ListPrograms'])
    expect(mockCalls.every(c => c[1] === ACME)).toBe(true)
  })
})

describe('the reads fail independently', () => {
  test('a programmes read that 403s leaves the invitations exactly as they were read', async () => {
    mockAnswers.ListPrograms = () => Promise.reject(new WorkforceApiError(403, { code: 'meals.forbidden' }))
    mockAnswers.ListInvitations = () => Promise.resolve([{ invitationId: 'i-1', state: 'Pending' }])

    const wrapper = mountPage()
    await settled()
    wrapper.vm.select(ACME)
    await settled()

    expect(wrapper.vm.view.programs.state).toBe('unknown')
    expect(wrapper.vm.view.programs.refusal).toBe('forbidden')
    expect(wrapper.vm.view.invitations.state).toBe('loaded')
    expect(wrapper.vm.view.invitations.rows).toHaveLength(1)
    expect(wrapper.vm.view.invitations.refusal).toBeNull()
  })

  test('a dark company surface leaves the company UNKNOWN, never empty', async () => {
    mockAnswers.GetCompany = () => Promise.reject(new WorkforceApiError(404, { code: 'meals.not-found' }))
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select(ACME)
    await settled()

    expect(wrapper.vm.view.company.state).toBe('unknown')
    expect(wrapper.vm.view.company.refusal).toBe('dark')
    // The venue directory answered on the SAME page and is untouched — the two gates are separate.
    expect(wrapper.vm.view.companies.state).toBe('loaded')
  })

  test('a market read that fails withholds the corridor currency rather than guessing one', async () => {
    mockAnswers.Market = () => Promise.reject(new Error('nope'))
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.corridorCurrency).toBeNull()
    // ...and it does NOT fall back to the browser edition's currency, which is a different fact.
    expect(wrapper.vm.currency).toBe('NOK')
  })
})

describe('creating a company', () => {
  test('the new company is kept in session state, selected, and read — the directory cannot see it', async () => {
    mockAnswers.ListCompanies = () => Promise.resolve([])
    const wrapper = mountPage({ isPowerUser: true })
    await settled()
    expect(wrapper.vm.view.companies.rows).toEqual([])

    await wrapper.vm.createCompany({ legalName: 'Bolt AS', organizationNumber: '999', countryCode: 'NO', adminApplicationUserId: 'user-1' })
    await settled()

    expect(wrapper.vm.view.companies.rows.map(r => r.companyId)).toEqual([BOLT])
    expect(wrapper.vm.selectedCompanyId).toBe(BOLT)
    expect(wrapper.vm.view.companies.unconfirmedCompanyIds).toEqual([BOLT])
    expect(mockCalls.map(c => c[0])).toContain('GetCompany')
  })

  test('a refused create leaves the picker alone and records the concierge sentence', async () => {
    mockAnswers.CreateCompany = () => Promise.reject(new WorkforceApiError(403, { code: 'meals.forbidden', detail: 'concierge required' }))
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.createCompany({ legalName: 'Bolt AS' })
    expect(wrapper.vm.sessionCompanies).toEqual([])
    expect(wrapper.vm.selectedCompanyId).toBeNull()
    expect(wrapper.vm.failureKey('createCompany')).toBe('meals_refusal_concierge_forbidden')
    expect(wrapper.vm.failureDetail('createCompany')).toBe('concierge required')
  })
})

describe('the invitation token', () => {
  test('it is held from the create response, and no read can displace it', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select(ACME)
    await settled()

    await wrapper.vm.createInvitation({ intendedContactEmail: 'kari@acme.no', intendedRole: 'Employee', expiresInDays: 14 })
    await settled()

    expect(wrapper.vm.issued.token).toBe('mealsinv_abc123')
    // The reload that follows a successful create re-reads the invitation LIST, which never carries
    // a token; the held one must survive it or the only copy is gone.
    expect(mockCalls.map(c => c[0])).toContain('ListInvitations')
    expect(wrapper.vm.issued.token).toBe('mealsinv_abc123')
  })

  test('a refused create produces no token at all', async () => {
    mockAnswers.CreateInvitation = () => Promise.reject(new WorkforceApiError(400, { code: 'meals.validation', detail: 'contact required' }))
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select(ACME)
    await settled()

    await wrapper.vm.createInvitation({})
    expect(wrapper.vm.issued).toBeNull()
    expect(wrapper.vm.failureKey('createInvitation')).toBe('meals_write_validation')
  })

  test('changing company takes the token off the screen — it belongs to one company only', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select(ACME)
    await settled()
    await wrapper.vm.createInvitation({ intendedContactEmail: 'kari@acme.no' })
    await settled()
    expect(wrapper.vm.issued).not.toBeNull()

    wrapper.vm.select(BOLT)
    await settled()
    expect(wrapper.vm.issued).toBeNull()
  })
})

describe('writes that fail change nothing on screen', () => {
  test('a stale-revision update is named, and no re-read is issued', async () => {
    mockAnswers.UpdateCompany = () => Promise.reject(new WorkforceApiError(409, { code: 'meals.stale-revision' }))
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select(ACME)
    await settled()
    mockCalls.length = 0

    await wrapper.vm.updateCompany({ displayName: 'Acme II', expectedVersion: 'r1' })
    expect(wrapper.vm.failureKey('updateCompany')).toBe('meals_write_stale')
    expect(mockCalls.map(c => c[0])).toEqual(['UpdateCompany'])
  })

  test('a stale policy version is told apart from a stale aggregate revision', async () => {
    mockAnswers.CreatePolicyVersion = () => Promise.reject(new WorkforceApiError(409, { code: 'meals.stale-policy-version' }))
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select(ACME)
    await settled()

    await wrapper.vm.createPolicy({ programId: 'p-1', request: { expectedCurrentVersion: 0 } })
    expect(wrapper.vm.failureKey('createPolicy')).toBe('meals_write_stale_policy')
    expect(wrapper.vm.failureKey('createPolicy')).not.toBe('meals_write_stale')
  })

  test('each operation has its own failure slot — one failure never speaks for another', async () => {
    mockAnswers.CreateProgram = () => Promise.reject(new WorkforceApiError(400, { code: 'meals.validation' }))
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select(ACME)
    await settled()

    await wrapper.vm.createProgram({ agreementId: 'a-1', name: 'Lunsj' })
    expect(wrapper.vm.failureKey('createProgram')).toBe('meals_write_validation')
    expect(wrapper.vm.failureKey('createPolicy')).toBeNull()
    expect(wrapper.vm.failureKey('createInvitation')).toBeNull()
  })
})

describe('signing a corridor', () => {
  test('it is addressed to the SELECTED venue and the selected company, and re-reads the directory', async () => {
    const wrapper = mountPage({ isPowerUser: true })
    await settled()
    wrapper.vm.select(ACME)
    await settled()
    mockCalls.length = 0

    await wrapper.vm.signAgreement({ currency: 'NOK', sellerLegalName: 'Kafé Nord AS', sellerOrganizationNumber: '123' })
    await settled()

    const sign = mockCalls.find(c => c[0] === 'SignAgreement')
    expect(sign[1]).toBe(42)
    expect(sign[2]).toBe(ACME)
    // The directory is the authority on which corridor exists here, so it is re-read rather than
    // patched from the signing response.
    expect(mockCalls.map(c => c[0])).toContain('ListCompanies')
  })
})
