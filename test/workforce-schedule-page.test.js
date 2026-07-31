import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import WorkforceSchedulePage from '~/pages/admin/workforce-schedule.vue'

const calls = []

// The page builds its client in a computed, so the module is mocked rather than the instance. Every
// call is recorded so the tests can assert WHICH reads each pivot issues — the part of this page
// that is a contract with the backend rather than a rendering choice.
jest.mock('~/utils/workforce/schedule-client', () => ({
  WorkforceScheduleService: class {
    GetContext (storeId) {
      calls.push(['GetContext', storeId])
      return Promise.resolve({
        timeZone: { id: 'Europe/Oslo' },
        capabilities: ['WorkforceScheduler', 'WorkforceManager']
      })
    }

    ListStaff () { calls.push(['ListStaff']); return Promise.resolve([]) }
    ListRoles () { calls.push(['ListRoles']); return Promise.resolve([]) }
    GetExternalCommitments () { calls.push(['GetExternalCommitments']); return Promise.resolve({ items: [], timeZoneId: 'Europe/Oslo' }) }

    GetRange (_storeId, from, to, view) {
      calls.push(['GetRange', from, to, view])
      return Promise.resolve({ view, assignments: [] })
    }
  }
}))

// The absence markers come off the REQUESTS controller, which has its own client since the decision
// inbox was built on it. Mocked here too, so the page stays hermetic.
jest.mock('~/utils/workforce/requests-client', () => ({
  WorkforceRequestsService: class {
    ListRequests () { calls.push(['ListRequests']); return Promise.resolve({ items: [] }) }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function mountPage () {
  return shallowMount(WorkforceSchedulePage, {
    mocks: {
      $i: key => key,
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

const rangeCalls = () => calls.filter(c => c[0] === 'GetRange')

describe('the workforce schedule page — three views of the same schedule', () => {
  beforeEach(() => { calls.length = 0 })

  test('offers exactly three pivots, and no staff-group axis', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.pivotOptions.map(o => o.key)).toEqual(['employees', 'roles', 'month'])
  })

  test('the employee pivot does NOT fetch the role list', async () => {
    mountPage()
    await settled()
    expect(calls.filter(c => c[0] === 'ListRoles')).toHaveLength(0)
    expect(rangeCalls()).toHaveLength(1)
  })

  test('the role pivot fetches the role axis, so an unstaffed role can have a row', async () => {
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    wrapper.setData({ pivot: 'roles' })
    await settled()
    expect(calls.filter(c => c[0] === 'ListRoles')).toHaveLength(1)
    // Still ONE range read: the role pivot re-groups the same week, it does not re-fetch it wider.
    expect(rangeCalls()).toHaveLength(1)
  })

  // The load-bearing one. `GET /schedules` resolves a range to a SINGLE revision, so one 31-day
  // call would answer with one week and silently drop the rest.
  test('THE MONTH IS N WEEK READS, never one month-wide range call', async () => {
    const wrapper = mountPage()
    await settled()
    calls.length = 0

    wrapper.setData({ pivot: 'month' })
    await settled()

    const ranges = rangeCalls()
    expect(ranges.length).toBe(wrapper.vm.month.weeks.length)
    expect(ranges.length).toBeGreaterThanOrEqual(4)

    // Every call spans exactly seven days — no call is a month wide.
    for (const [, from, to] of ranges) {
      const days = (new Date(to + 'Z') - new Date(from + 'Z')) / 86400000
      expect(days).toBe(7)
    }
  })

  test('a week that fails leaves that week UNKNOWN instead of shrinking the month total', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ pivot: 'month' })
    await settled()

    // Every week resolved but held no revision, so the month is "no plan", not "0 hours".
    expect(wrapper.vm.monthGrid.totals.minutes).toBeNull()
    expect(wrapper.vm.monthGrid.anyUnknown).toBe(false)

    // Now blank one week's answer the way a failed read does.
    const weeks = wrapper.vm.monthWeeks.slice()
    weeks[1] = null
    wrapper.setData({ monthWeeks: weeks })
    expect(wrapper.vm.monthGrid.anyUnknown).toBe(true)
    expect(wrapper.vm.monthGrid.weekStates[1]).toBe('unknown')
  })

  test('week and month steppers keep separate offsets', async () => {
    const wrapper = mountPage()
    await settled()

    wrapper.vm.stepWeek(3)
    await settled()
    wrapper.setData({ pivot: 'month' })
    await settled()
    wrapper.vm.stepMonth(-1)
    await settled()

    expect(wrapper.vm.weekOffset).toBe(3)
    expect(wrapper.vm.monthOffset).toBe(-1)
    // Switching back does not move the week the manager left behind.
    wrapper.setData({ pivot: 'employees' })
    await settled()
    expect(wrapper.vm.weekOffset).toBe(3)
  })

  test('the revision actions are withheld in the month pivot — a month spans several revisions', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ pivot: 'month', range: { view: 'draft', scheduleRevisionId: 'r', state: 'Validated', assignments: [] } })
    await settled()

    expect(wrapper.vm.canCreateDraft).toBe(false)
    expect(wrapper.vm.canValidate).toBe(false)
    expect(wrapper.vm.canPublish).toBe(false)
  })

  test('without the store timezone nothing is placed — the browser zone is never a fallback', () => {
    const wrapper = mountPage()
    expect(wrapper.vm.timeZoneId).toBeNull()
    expect(wrapper.vm.week).toBeNull()
    expect(wrapper.vm.month).toBeNull()
  })
})
