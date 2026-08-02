import { mount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import WorkforceMePage from '~/pages/admin/workforce-me.vue'
import { WorkforceApiError } from '~/utils/workforce/api-client'
import translations from '~/translations'

// The worker half of the requests family, driven through the page: setting availability, asking for
// time off, and seeing the outcome. Run under TZ=Europe/Oslo — under UTC the date mapping these
// assertions exist for is a no-op and a green run would prove nothing.

const calls = []
let mockContextZone = 'Europe/Oslo'
let mockTimeOffResult = null

jest.mock('~/utils/workforce-me/me-client', () => ({
  WorkforceMeService: class {
    GetMemberships () {
      return Promise.resolve([{
        staffMemberId: 'sm-1',
        storeId: 42,
        displayName: 'Anna Haugen',
        isActive: true,
        capabilityGrants: ['WorkforceSelf'],
        roleNames: ['Kokk']
      }])
    }

    GetSchedule () { return Promise.resolve({ items: [] }) }
    GetInbox () { return Promise.resolve({ items: [] }) }
    GetOpenAssignments () { return Promise.resolve({ items: [] }) }

    GetStoreContext (storeId) {
      calls.push(['GetStoreContext', storeId])
      return mockContextZone
        ? Promise.resolve({ timeZone: { id: mockContextZone }, capabilities: ['WorkforceSelf'] })
        : Promise.reject(new Error('boom'))
    }

    SetAvailability (staffMemberId, body) {
      calls.push(['SetAvailability', staffMemberId, body])
      return Promise.resolve({ storeId: 42, staffMemberId, timeZoneId: 'Europe/Oslo', rules: body.rules, exceptions: [] })
    }

    RequestTimeOff (staffMemberId, body) {
      calls.push(['RequestTimeOff', staffMemberId, body])
      return typeof mockTimeOffResult === 'function' ? mockTimeOffResult() : Promise.resolve(mockTimeOffResult)
    }

    WithdrawRequest (staffMemberId, requestId) {
      calls.push(['WithdrawRequest', staffMemberId, requestId])
      return Promise.resolve({
        timeOffRequestId: requestId,
        status: 'Withdrawn',
        localStartDate: '2026-08-01T00:00:00',
        localEndDate: '2026-08-03T00:00:00'
      })
    }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

function mountPage () {
  return mount(WorkforceMePage, {
    mocks: {
      $i,
      $store: {
        getters: { userIsLoggedIn: true },
        state: { adminLocale: 'no', currentUser: { id: 1, adminIn: [] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

beforeEach(() => {
  calls.length = 0
  mockContextZone = 'Europe/Oslo'
  mockTimeOffResult = {
    timeOffRequestId: 'r1',
    status: 'Submitted',
    reason: 'bryllup',
    localStartDate: '2026-08-01T00:00:00',
    localEndDate: '2026-08-03T00:00:00',
    firstAffectedScheduleRevisionId: null
  }
})

describe('the worker surface now offers both halves of WFJ-08', () => {
  // The `training` tab is the worker's own disclosure log — "who has looked at my training record".
  // It sits here rather than on the manager page because the person the record is about is one of
  // the two readers the route admits, and this is the only /admin page a pure worker can reach.
  test('the tabs include availability, time off and the worker\'s own training disclosure log', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.tabs.map(t => t.key))
      .toEqual(['shifts', 'open', 'asks', 'availability', 'timeoff', 'training'])
  })

  // The zone is read from #1 because nothing on /workforce/me carries one, and both date forms need
  // it to place a picked calendar date in the store's calendar.
  test('the store zone is read once per engagement store', async () => {
    const wrapper = mountPage()
    await settled()
    expect(calls.filter(c => c[0] === 'GetStoreContext')).toEqual([['GetStoreContext', 42]])
    expect(wrapper.vm.activeTimeZoneId).toBe('Europe/Oslo')
  })

  test('without a zone the forms refuse to render their pickers rather than guessing', async () => {
    mockContextZone = null
    const wrapper = mountPage()
    await settled()

    wrapper.vm.tab = 'timeoff'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.wfto__blocked').text()).toBe(translations.no.wfme_self_no_zone)
    expect(wrapper.find('.wfto__field input[type="date"]').exists()).toBe(false)
  })
})

describe('setting availability', () => {
  test('the whole week is submitted, because the endpoint replaces the whole week', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.tab = 'availability'
    await wrapper.vm.$nextTick()

    const form = wrapper.findComponent({ name: 'WorkforceAvailabilityForm' })
    form.vm.rules[0].enabled = true
    form.vm.rules[0].start = '08:00'
    form.vm.rules[0].end = '16:00'
    form.vm.rules[4].enabled = true
    form.vm.submit()
    await settled()

    const [, staffMemberId, body] = calls.find(c => c[0] === 'SetAvailability')
    expect(staffMemberId).toBe('sm-1')
    expect(body.rules.map(r => r.dayOfWeek)).toEqual([1, 5])
    expect(body.rules[0]).toMatchObject({ startMinuteOfDay: 480, endMinuteOfDay: 960 })
  })

  test('the form says outright that it cannot show what is already stored', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.tab = 'availability'
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.wfav__note--warn').text()).toBe(translations.no.wfme_avail_no_read)
  })

  test('after a save the form shows the server\'s answer and says it is session-scoped', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.tab = 'availability'
    await wrapper.vm.$nextTick()

    const form = wrapper.findComponent({ name: 'WorkforceAvailabilityForm' })
    form.vm.rules[0].enabled = true
    form.vm.submit()
    await settled()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.toast.message).toBe(translations.no.wfme_avail_saved)
    expect(wrapper.find('.wfav__note--warn').text()).toBe(translations.no.wfme_avail_showing_saved)
  })
})

describe('asking for time off', () => {
  test('the picked dates reach the wire as the store-local days they mean', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.tab = 'timeoff'
    await wrapper.vm.$nextTick()

    const form = wrapper.findComponent({ name: 'WorkforceTimeOffForm' })
    form.vm.fromDate = '2026-08-01'
    form.vm.toDate = '2026-08-03'
    form.vm.reason = 'bryllup'
    form.vm.submit()
    await settled()

    const [, staffMemberId, body] = calls.find(c => c[0] === 'RequestTimeOff')
    expect(staffMemberId).toBe('sm-1')
    // Oslo is UTC+2 in August. Naive midnight-to-midnight would have filed this as 1–4 August.
    expect(body.startsUtc).toBe('2026-07-31T22:00:00')
    expect(body.endsUtc).toBe('2026-08-03T21:59:00')
    expect(body.visibility).toBe('Managers')
  })

  test('the sent request is shown with its status, and the list says it is session-only', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.tab = 'timeoff'
    await wrapper.vm.$nextTick()

    const form = wrapper.findComponent({ name: 'WorkforceTimeOffForm' })
    form.vm.fromDate = '2026-08-01'
    form.vm.toDate = '2026-08-03'
    form.vm.submit()
    await settled()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.wfto__status').text()).toBe(translations.no.wfme_timeoff_status_submitted)
    expect(wrapper.find('.wfto__note--muted').text()).toBe(translations.no.wfme_timeoff_session_only)
    // Cleared only after the server accepted it; a refused request keeps what was typed.
    expect(form.vm.fromDate).toBe('')
  })

  // The same truth the manager is told, told to the worker: the answer is yes and the roster has not
  // moved yet.
  test('an approval that overlaps a published shift says the schedule was not changed', async () => {
    mockTimeOffResult = {
      timeOffRequestId: 'r1',
      status: 'Approved',
      localStartDate: '2026-08-01T00:00:00',
      localEndDate: '2026-08-03T00:00:00',
      firstAffectedScheduleRevisionId: 'rev-77'
    }

    const wrapper = mountPage()
    await settled()
    wrapper.vm.tab = 'timeoff'
    await wrapper.vm.$nextTick()

    const form = wrapper.findComponent({ name: 'WorkforceTimeOffForm' })
    form.vm.fromDate = '2026-08-01'
    form.vm.toDate = '2026-08-03'
    form.vm.submit()
    await settled()
    await wrapper.vm.$nextTick()

    expect(wrapper.find('.wfto__affected').text()).toBe(translations.no.wfme_timeoff_affects_published)
  })

  test('withdrawal is offered while the request is open and replaces it with the server\'s answer', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.tab = 'timeoff'
    await wrapper.vm.$nextTick()

    const form = wrapper.findComponent({ name: 'WorkforceTimeOffForm' })
    form.vm.fromDate = '2026-08-01'
    form.vm.toDate = '2026-08-03'
    form.vm.submit()
    await settled()
    await wrapper.vm.$nextTick()

    await wrapper.vm.withdrawTimeOff(wrapper.vm.submittedTimeOff[0])
    await wrapper.vm.$nextTick()

    expect(calls.filter(c => c[0] === 'WithdrawRequest')).toEqual([['WithdrawRequest', 'sm-1', 'r1']])
    expect(wrapper.vm.submittedTimeOff).toHaveLength(1)
    expect(wrapper.find('.wfto__status').text()).toBe(translations.no.wfme_timeoff_status_withdrawn)
  })

  // A manager decided it first. The worker asked a legitimate question and the answer is that it is
  // settled — informational tone, not an error.
  test('withdrawing an already-decided request is informational, not a failure', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.tab = 'timeoff'
    await wrapper.vm.$nextTick()

    const form = wrapper.findComponent({ name: 'WorkforceTimeOffForm' })
    form.vm.fromDate = '2026-08-01'
    form.vm.toDate = '2026-08-03'
    form.vm.submit()
    await settled()

    const meClient = require('~/utils/workforce-me/me-client')
    const original = meClient.WorkforceMeService.prototype.WithdrawRequest
    meClient.WorkforceMeService.prototype.WithdrawRequest = () => Promise.reject(new WorkforceApiError(409, {
      code: 'workforce.request-not-decidable', conflictKind: 'request-not-decidable'
    }))

    await wrapper.vm.withdrawTimeOff(wrapper.vm.submittedTimeOff[0])

    expect(wrapper.vm.toast.message).toBe(translations.no.wfme_timeoff_already_decided)
    expect(wrapper.vm.toast.type).toBe('info')
    meClient.WorkforceMeService.prototype.WithdrawRequest = original
  })

  test('a refused request keeps the dates that were typed', async () => {
    mockTimeOffResult = () => Promise.reject(new WorkforceApiError(400, { code: 'workforce.invalid-time-off' }))

    const wrapper = mountPage()
    await settled()
    wrapper.vm.tab = 'timeoff'
    await wrapper.vm.$nextTick()

    const form = wrapper.findComponent({ name: 'WorkforceTimeOffForm' })
    form.vm.fromDate = '2026-08-01'
    form.vm.toDate = '2026-08-03'
    form.vm.submit()
    await settled()

    expect(wrapper.vm.toast.message).toBe(translations.no.wfme_timeoff_invalid)
    expect(form.vm.fromDate).toBe('2026-08-01')
  })
})
