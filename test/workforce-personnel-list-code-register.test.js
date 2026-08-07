import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import PersonnelListPage from '~/pages/admin/workforce-personnel-list.vue'

// The § 8-5-6 KODEOVERSIKT — the code overview the paragraph requires wherever the personnel list
// substitutes a code for a person's fødselsnummer.
//
// WHAT THESE TESTS ARE FOR. The page prints a statute. Until this control existed it printed one
// behind which no document could be produced, and the honest wording on the sheet closed the honesty
// problem and none of the compliance one. So what is asserted here is not "a button works": it is
// that the day the overview is produced for is the day on screen, that the obligation the venue is
// taking on is stated where the control is, and that a failure never leaves a manager believing a
// register was filed.

const calls = []
const behaviour = {}

jest.mock('~/utils/workforce/roster-client', () => ({
  WorkforceRosterService: class {
    GetContext (storeId) {
      calls.push(['GetContext', storeId])
      return Promise.resolve({
        timeZone: { id: 'Europe/Oslo' },
        capabilities: behaviour.capabilities || ['WorkforceManager']
      })
    }
  }
}))

jest.mock('~/utils/workforce/personnel-list-client', () => ({
  WorkforcePersonnelListService: class {
    GetPersonnelList (storeId, businessDate) {
      calls.push(['GetPersonnelList', storeId, businessDate])
      if (behaviour.readFails) { return Promise.reject(behaviour.readFails) }
      return Promise.resolve(mockListFor(businessDate || behaviour.venueToday || '2026-07-13'))
    }

    GetIdentityCodeRegister (storeId, businessDate) {
      calls.push(['GetIdentityCodeRegister', storeId, businessDate])
      if (behaviour.registerFails) { return Promise.reject(behaviour.registerFails) }
      return Promise.resolve({
        text: behaviour.registerText === undefined ? '# okam-workforce-kodeoversikt\n' : behaviour.registerText,
        fileName: behaviour.registerFileName === undefined ? 'okam-kodeoversikt-42-2026-07-13.csv' : behaviour.registerFileName
      })
    }
  }
}))

function mockListFor (businessDate) {
  return {
    storeId: 42,
    businessDate: businessDate + 'T00:00:00',
    timeZoneId: 'Europe/Oslo',
    timeZoneIsFallback: false,
    asOfUtc: '2026-07-13T12:00:00Z',
    presentCount: 1,
    rows: [{
      personnelListEntryId: 'entry-1',
      participantId: 'p-1',
      category: 'Employee',
      participantName: 'Kari Claimed',
      protectedIdentityCodeRef: 'wf-person:2000',
      businessName: 'Okam Pilot Servering AS',
      organizationNumber: '923456789',
      onSiteStartUtc: businessDate + 'T07:00:00',
      onSiteEndUtc: null,
      isPresent: true,
      retainUntilUtc: '2030-06-30T00:00:00'
    }]
  }
}

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

const problem = (status, code) => ({
  isWorkforceApiError: true, status, code, message: 'server said so', problem: { code }
})

function mountPage () {
  return shallowMount(PersonnelListPage, {
    mocks: {
      $i: (key, params) => (params ? key + ' ' + JSON.stringify(params) : key),
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

let downloads
let objectUrls

beforeEach(() => {
  calls.length = 0
  for (const key of Object.keys(behaviour)) { delete behaviour[key] }

  downloads = []
  objectUrls = { created: 0, revoked: 0 }

  global.Blob = class { constructor (parts, options) { this.parts = parts; this.options = options } }
  global.URL.createObjectURL = () => { objectUrls.created++; return 'blob:kodeoversikt' }
  global.URL.revokeObjectURL = () => { objectUrls.revoked++ }

  jest.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag !== 'a') { return document.createElementNS('http://www.w3.org/1999/xhtml', tag) }
    const link = { href: null, download: null, click () { downloads.push({ href: link.href, download: link.download }) } }
    return link
  })
})

afterEach(() => {
  document.createElement.mockRestore()
})

describe('the overview is produced for the day the SERVER answered for', () => {
  test('the download asks for the echoed business date, not for whatever is in the picker', async () => {
    // An overview headed by one date, filed beside a list headed by another, decodes nothing. The
    // server's echo is the only date on this page that anybody established.
    behaviour.venueToday = '2026-07-13'
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.downloadCodeRegister()
    await settled()

    expect(calls).toContainEqual(['GetIdentityCodeRegister', 42, '2026-07-13'])
    expect(downloads).toEqual([{ href: 'blob:kodeoversikt', download: 'okam-kodeoversikt-42-2026-07-13.csv' }])
    expect(objectUrls.revoked).toBe(1)
  })

  test('stepping the day moves the overview with it', async () => {
    behaviour.venueToday = '2026-07-13'
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.stepDay(-1)
    await settled()
    await wrapper.vm.downloadCodeRegister()
    await settled()

    expect(calls).toContainEqual(['GetIdentityCodeRegister', 42, '2026-07-12'])
  })

  test('nothing is offered before a day has answered', async () => {
    // `canIssueRegister` keys on the SERVER's echo. Before the first answer there is no day to
    // produce an overview for, and a control that fired anyway would invent one.
    behaviour.readFails = problem(500, null)
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.canIssueRegister).toBe(false)
    await wrapper.vm.downloadCodeRegister()
    expect(calls.map(c => c[0])).not.toContain('GetIdentityCodeRegister')
  })

  test('an empty day still produces an overview — an empty one is a true statement', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.response = { ...mockListFor('2026-07-13'), rows: [], presentCount: 0 }
    await settled()

    expect(wrapper.vm.canIssueRegister).toBe(true)
  })
})

describe('the obligation is stated where the control is', () => {
  test('the procedure note names the paragraph, the venue duty and the retention', async () => {
    const wrapper = mountPage()
    await settled()

    expect(wrapper.text()).toContain('wfpl_coderegister_procedure')
    expect(wrapper.text()).toContain('wfpl_coderegister')
  })

  test('a completed download tells the manager what they now have to do with the file', async () => {
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.downloadCodeRegister()
    await settled()

    expect(wrapper.vm.toast.type).toBe('success')
    expect(wrapper.vm.toast.message).toContain('wfpl_coderegister_done')
    expect(wrapper.vm.toast.message).toContain('2026-07-13')
  })
})

describe('a failure never leaves a manager believing a register was filed', () => {
  test('a failed production downloads nothing and says so', async () => {
    behaviour.registerFails = problem(403, 'workforce.forbidden')
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.downloadCodeRegister()
    await settled()

    expect(downloads).toEqual([])
    expect(wrapper.vm.toast.type).toBe('error')
    expect(wrapper.vm.issuing).toBe(false)
  })

  test('a browser that cannot make an object URL is told, and the bytes are never fetched', async () => {
    const wrapper = mountPage()
    await settled()

    const create = global.URL.createObjectURL
    delete global.URL.createObjectURL
    try {
      await wrapper.vm.downloadCodeRegister()
      await settled()
    } finally {
      global.URL.createObjectURL = create
    }

    expect(calls.map(c => c[0])).not.toContain('GetIdentityCodeRegister')
    expect(wrapper.vm.toast.message).toBe('wfpl_coderegister_unavailable')
    expect(wrapper.vm.toast.type).toBe('error')
  })

  test('the server naming the file wins; a fallback is used only when it did not', async () => {
    behaviour.registerFileName = null
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.downloadCodeRegister()
    await settled()

    expect(downloads[0].download).toBe('okam-kodeoversikt-42-2026-07-13.csv')
  })
})
