import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import PersonnelListPage from '~/pages/admin/workforce-personnel-list.vue'
import { SHEET_EMPTY, SHEET_READY, SHEET_UNKNOWN } from '~/utils/workforce/personnel-list'

// The page is a contract with the backend and a set of promises to a manager standing beside an
// inspector. These tests assert BOTH: which reads it issues and with what, and what it refuses to
// show when it does not know.
//
// These tests are meaningful only under a non-UTC TZ — run the suite with TZ=Europe/Oslo. The page
// is supposed to be indifferent to it, which is one of the things asserted below.

const calls = []
const behaviour = {}

jest.mock('~/utils/workforce/roster-client', () => ({
  WorkforceRosterService: class {
    GetContext (storeId) {
      calls.push(['GetContext', storeId])
      if (behaviour.contextFails) { return Promise.reject(behaviour.contextFails) }
      return Promise.resolve({
        timeZone: { id: behaviour.timeZoneId === undefined ? 'Europe/Oslo' : behaviour.timeZoneId },
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
      if (behaviour.response !== undefined) { return Promise.resolve(behaviour.response) }
      // The real endpoint ECHOES the business day it answered for: the day asked for, or the venue's
      // today when none was. The page follows that echo, so a mock that echoed something else would
      // be testing a server that does not exist.
      return Promise.resolve(mockResponseFor(businessDate || behaviour.venueToday || '2026-07-13'))
    }
  }
}))

function mockResponseFor (businessDate) {
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
      onSiteStartUtc: '2026-07-13T07:00:00',
      onSiteEndUtc: null,
      isPresent: true,
      retainUntilUtc: '2030-06-30T00:00:00'
    }]
  }
}

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

// A typed workforce failure as `api-client` constructs it, without importing the class into a file
// whose subject is how the page reacts to one.
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

beforeEach(() => {
  calls.length = 0
  for (const key of Object.keys(behaviour)) { delete behaviour[key] }
})

describe('the page cannot render a store it could not resolve', () => {
  test('a 403 on the context read blocks the page and never asks for the register', async () => {
    behaviour.contextFails = problem(403, 'workforce.forbidden')
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.contextError).toBe('wfpl_no_capability')
    expect(calls.map(c => c[0])).toEqual(['GetContext'])
  })

  test('a context WITHOUT a timezone blocks rather than printing the viewer\'s clock', async () => {
    // Every time on a personalliste is the VENUE's wall clock. Without the store's zone the page
    // would be putting the reader's own clock onto a statutory register.
    behaviour.timeZoneId = null
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.contextError).toBe('wfpl_context_failed')
    expect(calls.map(c => c[0])).toEqual(['GetContext'])
  })

  test('WorkforceManager is required, and without it the page refuses instead of firing a doomed read', async () => {
    // The service resolves capability from the ENGAGEMENT's grants only: a store admin or a
    // PowerUser without the grant is answered 403. A read fired anyway would report a failure where
    // the truth is a refusal.
    behaviour.capabilities = ['WorkforceSelf', 'WorkforceScheduler']
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.canManage).toBe(false)
    expect(wrapper.text()).toContain('wfpl_no_capability')
    expect(calls.map(c => c[0])).toEqual(['GetContext'])
  })
})

describe('the day on screen is the venue\'s, and the server decides which one', () => {
  test('the first read sends NO businessDate at all', async () => {
    // Omitting it is what makes the SERVER resolve the venue's today in the store's own zone. A
    // client-computed default would be the browser's idea of the venue's date.
    mountPage()
    await settled()

    expect(calls).toEqual([['GetContext', 42], ['GetPersonnelList', 42, null]])
  })

  test('the picker adopts the day the server answered for', async () => {
    // Asked for nothing, and the venue's day comes back — that echo is what fills the picker. The
    // page never computes the venue's today itself.
    behaviour.venueToday = '2026-07-11'
    const wrapper = mountPage()
    await settled()

    expect(calls).toContainEqual(['GetPersonnelList', 42, null])
    expect(wrapper.vm.selectedDate).toBe('2026-07-11')
    expect(wrapper.vm.sheet.state).toBe(SHEET_READY)
    expect(wrapper.vm.sheet.businessDate).toBe('2026-07-11')
  })

  test('picking a date re-reads for exactly that calendar date', async () => {
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    await wrapper.vm.pickDate('2026-07-01')
    await settled()

    expect(calls).toEqual([['GetPersonnelList', 42, '2026-07-01']])
  })

  test('a value that is not a calendar date is refused, and no read is issued', async () => {
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    await wrapper.vm.pickDate('')
    await wrapper.vm.pickDate('2026-07')

    expect(calls).toEqual([])
    expect(wrapper.vm.toast.message).toBe('wfpl_date_invalid')
    expect(wrapper.vm.toast.type).toBe('error')
  })

  test('the arrows step whole CIVIL days, across the weekend the clocks change', async () => {
    behaviour.venueToday = '2026-03-29'
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    // The Sunday European clocks go forward: that day is 23 hours long. A step made by adding
    // 86 400 000 ms to an instant in a real zone would land on the wrong date; these are civil dates
    // and carry no hours at all.
    await wrapper.vm.stepDay(-1)
    await wrapper.vm.stepDay(-1)
    await wrapper.vm.stepDay(1)

    expect(calls).toEqual([
      ['GetPersonnelList', 42, '2026-03-28'],
      ['GetPersonnelList', 42, '2026-03-27'],
      ['GetPersonnelList', 42, '2026-03-28']
    ])
  })

  test('the arrows step across a month and a year boundary without special-casing either', async () => {
    behaviour.venueToday = '2026-12-31'
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    await wrapper.vm.stepDay(1)
    await wrapper.vm.stepDay(-1)
    await wrapper.vm.stepDay(-1)

    expect(calls).toEqual([
      ['GetPersonnelList', 42, '2027-01-01'],
      ['GetPersonnelList', 42, '2026-12-31'],
      ['GetPersonnelList', 42, '2026-12-30']
    ])
  })

  test('"today" is a question for the server, not a date computed here', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.pickDate('2026-07-01')
    await settled()
    calls.length = 0

    await wrapper.vm.goToVenueToday()

    expect(calls).toEqual([['GetPersonnelList', 42, null]])
  })
})

describe('what the page refuses to show', () => {
  test('a failed read leaves the sheet UNKNOWN — it never becomes an empty venue', async () => {
    behaviour.readFails = problem(500, null)
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.response).toBeNull()
    expect(wrapper.vm.sheet.state).toBe(SHEET_UNKNOWN)
    expect(wrapper.vm.toast.type).toBe('error')
    // The server's own wording when it typed one.
    expect(wrapper.vm.toast.message).toBe('server said so')
  })

  test('a read that answered with no rows IS an empty day, and says so', async () => {
    behaviour.response = Object.assign(mockResponseFor('2026-07-13'), { rows: [], presentCount: 0 })
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.sheet.state).toBe(SHEET_EMPTY)
  })

  test('the previous day\'s people are cleared before the next day is asked for', async () => {
    // Otherwise a slow read leaves one day's rows on screen under another day's heading — and the
    // print button is live the whole time.
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.sheet.state).toBe(SHEET_READY)

    const pending = wrapper.vm.pickDate('2026-07-01')
    expect(wrapper.vm.response).toBeNull()
    expect(wrapper.vm.sheet.state).toBe(SHEET_UNKNOWN)
    await pending
  })

  test('an answer for a day the manager has already navigated away from is discarded', async () => {
    const wrapper = mountPage()
    await settled()

    const first = wrapper.vm.pickDate('2026-07-01')
    wrapper.vm.selectedDate = '2026-07-02'
    await first

    // The in-flight answer belonged to 07-01 and must not be adopted under 07-02.
    expect(wrapper.vm.response).toBeNull()
  })
})

describe('the print path', () => {
  test('printing calls the browser\'s own print, which is what produces paper', async () => {
    const wrapper = mountPage()
    await settled()

    const original = window.print
    window.print = jest.fn()
    wrapper.vm.printSheet()
    expect(window.print).toHaveBeenCalled()
    window.print = original
  })

  test('a browser with no print command says so rather than a button that does nothing', async () => {
    const wrapper = mountPage()
    await settled()

    const original = window.print
    window.print = undefined
    wrapper.vm.printSheet()
    expect(wrapper.vm.toast.message).toBe('wfpl_print_unavailable')
    expect(wrapper.vm.toast.type).toBe('error')
    window.print = original
  })

  test('nothing is offered for printing while there is no register to print', async () => {
    behaviour.readFails = problem(500, null)
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.canPrint).toBe(false)
  })

  test('an EMPTY day is printable — "nobody was here" is an answer an inspector may be shown', async () => {
    behaviour.response = Object.assign(mockResponseFor('2026-07-13'), { rows: [], presentCount: 0 })
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.canPrint).toBe(true)
  })

  // ---- the print-host class -------------------------------------------------------------------
  //
  // This block used to assert `document.body.classList.contains('wfpl-print-host')` after mount, and
  // it PASSED while the app was broken — which is the whole reason it now reads the way it does.
  // jsdom has no vue-meta, so an imperative `classList.add` in `mounted` survives here and nowhere
  // else: in the running app `layouts/default.vue` declares `bodyAttrs.class`, vue-meta rewrites that
  // attribute wholesale on every head update, and the class was measured GONE in a browser after the
  // login redirect. A test that mounts a component in jsdom cannot see the head manager at all, so
  // what it may honestly assert is the DECLARATION, not the resulting DOM.

  test('the print chrome class is DECLARED through head(), not added to the body', async () => {
    const wrapper = mountPage()
    await settled()

    // The regression guard. If someone reintroduces the imperative form it will "work" in jsdom and
    // fail on paper, so the absence is what is asserted.
    expect(document.body.classList.contains('wfpl-print-host')).toBe(false)

    // The page ships an UNSCOPED print stylesheet whose rules are all guarded by this class. A page's
    // CSS chunk outlives the page in a Nuxt build, so without the guard those rules would restyle the
    // printing of every other admin screen.
    const head = wrapper.vm.$options.head.call(wrapper.vm)
    expect(head.bodyAttrs.class.split(' ')).toContain('wfpl-print-host')

    wrapper.destroy()
    expect(document.body.classList.contains('wfpl-print-host')).toBe(false)
  })

  test('declaring the class carries the market class through instead of replacing it', async () => {
    // A page's `bodyAttrs.class` REPLACES the layout's rather than merging with it. `okam-ch` is what
    // themes the entire Swiss site, so a page that declared only its own class would silently
    // un-theme itself on that market — a regression traded for the fix.
    const wrapper = mountPage()
    await settled()

    const norwegian = wrapper.vm.$options.head.call({ isCh: false })
    expect(norwegian.bodyAttrs.class).toBe('wfpl-print-host')

    const swiss = wrapper.vm.$options.head.call({ isCh: true })
    expect(swiss.bodyAttrs.class.split(' ').sort()).toEqual(['okam-ch', 'wfpl-print-host'])
  })
})
