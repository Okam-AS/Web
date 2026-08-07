import Vue from 'vue'
import { mount } from '@vue/test-utils'
import translations from '~/translations'
import WorkforceTimesheetsPage from '~/pages/admin/workforce-timesheets.vue'
import WorkforcePublicationsPage from '~/pages/admin/workforce-publications.vue'
import WorkforceDeliveryPage from '~/pages/admin/workforce-delivery.vue'

// THE SHELL THE THREE WORKFORCE SCREENS SIT IN.
//
// Three questions that are the same question on all three pages, and were untested on all three:
// which store am I looking at, what happens when somebody switches store, and what does the page do
// when it is mounted before anybody has signed in. The last is the one with teeth — an admin route
// is routinely rendered to a signed-out visitor, the sign-in modal belongs to `AdminPage`, and a
// page that only reads in `mounted` shows an empty screen for the rest of the session.
//
// The sign-in is raised as the shell's own `login-success` EVENT rather than by calling `init`,
// which is strictly stronger: it travels the page's own template binding, so a page that dropped the
// binding fails here.

const calls = []
const behaviour = {}

jest.mock('~/utils/workforce/schedule-client', () => ({
  WorkforceScheduleService: class {
    GetContext (storeId) {
      calls.push(['GetContext', storeId])
      return Promise.resolve({
        capabilities: ['WorkforceManager', 'WorkforceScheduler', 'WorkforcePayrollApprover']
      })
    }

    ListStaff (storeId) { calls.push(['ListStaff', storeId]); return Promise.resolve([]) }
    GetPublicationHistory (storeId) { calls.push(['GetPublicationHistory', storeId]); return Promise.resolve([]) }
    GetNotificationFailures (storeId) { calls.push(['GetNotificationFailures', storeId]); return Promise.resolve([]) }
  }
}))

jest.mock('~/utils/workforce/timesheet-client', () => ({
  WorkforceTimesheetService: class {
    ListTimesheets (storeId) {
      calls.push(['ListTimesheets', storeId])
      return Promise.resolve({ exportEnabled: true, periods: [] })
    }

    GetTimesheet (storeId, periodId) { calls.push(['GetTimesheet', periodId]); return Promise.resolve({ period: null, batches: [] }) }
  }
}))

function $i (key, params) {
  const text = translations.no[key]
  if (!text) { throw new Error('missing translation key: ' + key) }
  return params ? text.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : text
}

const AdminPageStub = { name: 'AdminPageStub', template: '<div><slot /></div>' }

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

// The read each page fires FIRST once it has a store and a session. `GetContext` is common to all
// three, which is exactly why it is the thing to count.
const PAGES = [
  ['workforce-timesheets', WorkforceTimesheetsPage],
  ['workforce-publications', WorkforcePublicationsPage],
  ['workforce-delivery', WorkforceDeliveryPage]
]

// A `$store` that can actually change: plain objects passed through `mocks` are not reactive, so a
// store switch would never reach the `storeId` computed the three pages watch.
function makeStore (over) {
  return {
    state: Vue.observable(Object.assign({
      currentUser: { id: 1, adminIn: [{ id: 77 }, { id: 88 }] },
      selectedAdminStore: 42,
      adminLocale: 'no'
    }, over || {})),
    getters: Vue.observable({ userIsLoggedIn: true })
  }
}

function mountPage (Page, store) {
  return mount(Page, {
    mocks: { $i, $store: store, _coreInitializer: { bearerToken: 'tok' } },
    stubs: { AdminPage: AdminPageStub, NuxtLink: true }
  })
}

beforeEach(() => {
  calls.length = 0
  for (const key of Object.keys(behaviour)) { delete behaviour[key] }
})

describe.each(PAGES)('%s — the store the screen is about', (_name, Page) => {
  test('reads the store that is actually selected', async () => {
    mountPage(Page, makeStore())
    await settled()

    expect(calls.find(c => c[0] === 'GetContext')[1]).toBe(42)
  })

  test('falls back to the first store this admin administers when none is selected', async () => {
    mountPage(Page, makeStore({ selectedAdminStore: null }))
    await settled()

    // Not a blank screen and not store 0: an admin of exactly one store never picks it explicitly.
    expect(calls.find(c => c[0] === 'GetContext')[1]).toBe(77)
  })

  test('reads nothing at all for an admin who administers nothing', async () => {
    mountPage(Page, makeStore({ selectedAdminStore: null, currentUser: { id: 1, adminIn: [] } }))
    await settled()

    expect(calls).toEqual([])
  })

  test('switching store re-reads the screen for the NEW store', async () => {
    const store = makeStore()
    mountPage(Page, store)
    await settled()
    calls.length = 0

    store.state.selectedAdminStore = 88
    await settled()

    // Leaving the previous store's answer on screen under the new store's name is the one outcome
    // a manager cannot detect by looking.
    const context = calls.filter(c => c[0] === 'GetContext')
    expect(context.length).toBe(1)
    expect(context[0][1]).toBe(88)
  })
})

describe.each(PAGES)('%s — arriving before anybody has signed in', (_name, Page) => {
  test('reads nothing while signed out', async () => {
    const store = makeStore()
    store.getters.userIsLoggedIn = false
    mountPage(Page, store)
    await settled()

    expect(calls).toEqual([])
  })

  test('starts reading when the shell reports the sign-in, without needing a reload', async () => {
    const store = makeStore()
    store.getters.userIsLoggedIn = false
    const page = mountPage(Page, store)
    await settled()

    store.getters.userIsLoggedIn = true
    page.findComponent(AdminPageStub).vm.$emit('login-success')
    await settled()

    expect(calls.filter(c => c[0] === 'GetContext').length).toBe(1)
  })
})
