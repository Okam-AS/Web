import { mount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import WorkforceRequestsPage from '~/pages/admin/workforce-requests.vue'
import { WorkforceApiError } from '~/utils/workforce/api-client'
import translations from '~/translations'

// The manager decision inbox, driven end to end through the page. The three things asserted here are
// the three the surface must not get wrong: an award closes exactly one of several claims, a
// committed decision over a published week says the schedule did NOT move, and a second decision on
// an already-decided request is named as such rather than as a generic failure.

const calls = []
let mockInboxItems = []
let mockPublishedAssignments = []
let mockDecideResult = null

jest.mock('~/utils/workforce/requests-client', () => ({
  WorkforceRequestsService: class {
    ListRequests (storeId, kind, state) {
      calls.push(['ListRequests', storeId, kind, state])
      return Promise.resolve({ storeId, items: mockInboxItems })
    }

    DecideRequest (storeId, requestId, revision, decision, note) {
      calls.push(['DecideRequest', storeId, requestId, revision, decision, note])
      return typeof mockDecideResult === 'function' ? mockDecideResult() : Promise.resolve(mockDecideResult)
    }
  }
}))

jest.mock('~/utils/workforce/schedule-client', () => ({
  WorkforceScheduleService: class {
    GetContext (storeId) {
      calls.push(['GetContext', storeId])
      return Promise.resolve({
        timeZone: { id: 'Europe/Oslo' },
        capabilities: ['WorkforceScheduler', 'WorkforceManager']
      })
    }

    GetRange (_storeId, from, to, view) {
      calls.push(['GetRange', from, to, view])
      return Promise.resolve({ view, assignments: mockPublishedAssignments })
    }
  }
}))

const ANNA = 'aaaa-1'
const BJORN = 'bbbb-2'

const timeOff = over => Object.assign({
  kind: 'time-off',
  requestId: 'r1',
  staffMemberId: ANNA,
  staffDisplayName: 'Anna Haugen',
  status: 'Submitted',
  state: 'submitted',
  isDecidable: true,
  reason: 'bryllup',
  startsUtc: '2026-08-02T22:00:00',
  endsUtc: '2026-08-03T21:59:00',
  localStartDate: '2026-08-03T00:00:00',
  localEndDate: '2026-08-03T00:00:00',
  createdAtUtc: '2026-07-20T09:00:00',
  revision: 'rev-1'
}, over)

const candidacy = over => Object.assign({
  kind: 'open-shift-request',
  requestId: 'c1',
  staffMemberId: ANNA,
  staffDisplayName: 'Anna Haugen',
  state: 'request-submitted',
  isDecidable: true,
  startsUtc: '2026-08-05T06:00:00',
  endsUtc: '2026-08-05T14:00:00',
  localStartDate: '2026-08-05T00:00:00',
  localEndDate: '2026-08-05T00:00:00',
  exchangeId: 'x1',
  exchangeKind: 'OpenShiftRequest',
  exchangeStatus: 'RequestSubmitted',
  targetShiftAssignmentId: 'shift-9',
  createdAtUtc: '2026-07-21T09:00:00',
  revision: 'rev-c1'
}, over)

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

// The real Norwegian dictionary, so a missing key fails the test rather than rendering its own name.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

function mountPage () {
  return mount(WorkforceRequestsPage, {
    mocks: {
      $i,
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: {
      AdminPage: { template: '<div><slot /></div>' },
      NuxtLink: { template: '<a><slot /></a>' }
    }
  })
}

beforeEach(() => {
  calls.length = 0
  mockInboxItems = []
  mockPublishedAssignments = []
  mockDecideResult = {}
})

describe('the inbox reads and refuses honestly', () => {
  test('the default projection sends no state parameter; "all" is opt-in', async () => {
    const wrapper = mountPage()
    await settled()
    expect(calls.filter(c => c[0] === 'ListRequests')[0]).toEqual(['ListRequests', 42, null, null])

    wrapper.vm.setState('all')
    await settled()
    expect(calls.filter(c => c[0] === 'ListRequests').pop()).toEqual(['ListRequests', 42, null, 'all'])
  })

  test('a caller without the manager capability is told so instead of shown a broken page', async () => {
    const scheduleClient = require('~/utils/workforce/schedule-client')
    const original = scheduleClient.WorkforceScheduleService.prototype.GetContext
    scheduleClient.WorkforceScheduleService.prototype.GetContext = () =>
      Promise.resolve({ timeZone: { id: 'Europe/Oslo' }, capabilities: ['WorkforceScheduler'] })

    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.contextError).toBe(translations.no.wfq_no_capability)
    expect(calls.some(c => c[0] === 'ListRequests')).toBe(false)
    scheduleClient.WorkforceScheduleService.prototype.GetContext = original
  })
})

describe('WFJ-10: two workers claim one open shift and exactly one is awarded', () => {
  test('both claims are drawn as one contest, and the award says what it closes', async () => {
    mockInboxItems = [
      candidacy({ requestId: 'c1', staffMemberId: ANNA, staffDisplayName: 'Anna Haugen' }),
      candidacy({ requestId: 'c2', staffMemberId: BJORN, staffDisplayName: 'Bjørn Ek', exchangeId: 'x2' })
    ]

    const wrapper = mountPage()
    await settled()

    // One group, not two: the one-award rule is keyed on the TARGET shift, so a manager must see
    // both claims together or they will close somebody's request without knowing it.
    expect(wrapper.vm.groups).toHaveLength(1)
    expect(wrapper.find('.wfq__contesthead').text()).toContain('2')
    expect(wrapper.findAll('.wfq-card')).toHaveLength(2)
    expect(wrapper.findAll('.wfq-card__contest').at(0).text()).toContain('1')
  })

  test('awarding one candidacy sends approve under that row\'s own revision', async () => {
    mockInboxItems = [candidacy({ requestId: 'c1' }), candidacy({ requestId: 'c2', revision: 'rev-c2' })]

    const wrapper = mountPage()
    await settled()

    wrapper.vm.setNote({ requestId: 'c2', value: 'hun kan rollen' })
    await wrapper.vm.decide(mockInboxItems[1], 'approve')

    expect(calls.filter(c => c[0] === 'DecideRequest').pop())
      .toEqual(['DecideRequest', 42, 'c2', 'rev-c2', 'approve', 'hun kan rollen'])
  })

  test('the loser\'s typed 409 is named as a taken shift and the list is re-read', async () => {
    mockInboxItems = [candidacy()]
    mockDecideResult = () => Promise.reject(new WorkforceApiError(409, {
      code: 'workforce.award-taken', conflictKind: 'award-taken', aggregateId: 'shift-9'
    }))

    const wrapper = mountPage()
    await settled()
    const before = calls.filter(c => c[0] === 'ListRequests').length

    await wrapper.vm.decide(mockInboxItems[0], 'approve')
    await settled()

    expect(wrapper.vm.toast.message).toBe(translations.no.wfq_outcome_award_taken)
    expect(calls.filter(c => c[0] === 'ListRequests').length).toBe(before + 1)
  })
})

describe('WFJ-09: approving leave over a published week does not rewrite the publication', () => {
  test('the collision is shown BEFORE the decision, one probe per distinct week', async () => {
    mockInboxItems = [timeOff()]
    mockPublishedAssignments = [{
      shiftAssignmentId: 's1',
      staffMemberId: ANNA,
      state: 'Published',
      startsUtc: '2026-08-03T06:00:00',
      endsUtc: '2026-08-03T14:00:00'
    }]

    const wrapper = mountPage()
    await settled()

    expect(calls.filter(c => c[0] === 'GetRange').map(c => c[3])).toEqual(['published'])
    expect(wrapper.find('.wfq-card__collision--published').text())
      .toBe(translations.no.wfq_collision_one)
  })

  test('a week that failed to load reads as unknown, never as clear', async () => {
    mockInboxItems = [timeOff()]
    const scheduleClient = require('~/utils/workforce/schedule-client')
    const original = scheduleClient.WorkforceScheduleService.prototype.GetRange
    scheduleClient.WorkforceScheduleService.prototype.GetRange = () => Promise.reject(new Error('boom'))

    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('.wfq-card__collision--unknown').text())
      .toBe(translations.no.wfq_collision_unknown)
    expect(wrapper.find('.wfq__notice--warn').text()).toBe(translations.no.wfq_collision_probe_failed)
    scheduleClient.WorkforceScheduleService.prototype.GetRange = original
  })

  // The load-bearing claim of this whole lane. The endpoint commits the approval and leaves the
  // publication exactly as it was; a surface that only said "approved" would be read as "handled".
  test('an approval that names an affected revision says the schedule was NOT changed', async () => {
    mockInboxItems = [timeOff()]
    mockDecideResult = { timeOffRequestId: 'r1', status: 'Approved', firstAffectedScheduleRevisionId: 'rev-77777777-abc' }

    const wrapper = mountPage()
    await settled()
    await wrapper.vm.decide(mockInboxItems[0], 'approve')
    await settled()

    const notice = wrapper.find('.wfq__successor')
    expect(notice.exists()).toBe(true)
    expect(notice.text()).toContain(translations.no.wfq_successor_title)
    expect(notice.text()).toContain('Anna Haugen')
    expect(notice.text()).toContain('rev-7777')
  })

  test('an award over a published target says the same thing, from its own field', async () => {
    mockInboxItems = [candidacy()]
    mockDecideResult = { requiresSuccessorRevision: true, affectedScheduleRevisionId: 'rev-88888888-def' }

    const wrapper = mountPage()
    await settled()
    await wrapper.vm.decide(mockInboxItems[0], 'approve')
    await settled()

    expect(wrapper.find('.wfq__successor').text())
      .toContain($i('wfq_successor_award', { person: 'Anna Haugen' }))
  })

  test('a decision that touched no publication raises no notice at all', async () => {
    mockInboxItems = [timeOff()]
    mockDecideResult = { timeOffRequestId: 'r1', status: 'Approved', firstAffectedScheduleRevisionId: null }

    const wrapper = mountPage()
    await settled()
    await wrapper.vm.decide(mockInboxItems[0], 'approve')
    await settled()

    expect(wrapper.find('.wfq__successor').exists()).toBe(false)
  })
})

describe('a second decision on an already-decided request', () => {
  test('is named as somebody else\'s decision, not as a generic failure', async () => {
    mockInboxItems = [timeOff()]
    mockDecideResult = () => Promise.reject(new WorkforceApiError(409, {
      code: 'workforce.request-not-decidable',
      conflictKind: 'request-not-decidable',
      currentStatus: 'Approved',
      retryable: false
    }))

    const wrapper = mountPage()
    await settled()
    await wrapper.vm.decide(mockInboxItems[0], 'approve')
    await settled()

    expect(wrapper.vm.toast.message).toBe(translations.no.wfq_outcome_already_decided)
    expect(wrapper.vm.toast.message).not.toBe(translations.no.wfq_outcome_error)
  })

  // The house treatment for a stale write, kept identical to the schedule editor's: the note stays
  // in the field, nothing is re-read behind the manager's back, and the way forward is a button.
  test('a stale revision keeps the typed note and offers the re-read as a deliberate act', async () => {
    mockInboxItems = [timeOff()]
    mockDecideResult = () => Promise.reject(new WorkforceApiError(409, {
      code: 'workforce.stale-revision', conflictKind: 'stale-revision', retryable: true
    }))

    const wrapper = mountPage()
    await settled()
    wrapper.vm.setNote({ requestId: 'r1', value: 'godkjent muntlig' })
    await wrapper.vm.$nextTick()

    const before = calls.filter(c => c[0] === 'ListRequests').length
    await wrapper.vm.decide(mockInboxItems[0], 'approve')
    await settled()

    // Not re-read automatically: that would re-base the decision on a version nobody saw.
    expect(calls.filter(c => c[0] === 'ListRequests').length).toBe(before)
    expect(wrapper.vm.notes.r1).toBe('godkjent muntlig')

    const block = wrapper.find('.wfq-card__conflict--stale')
    expect(block.exists()).toBe(true)
    expect(block.text()).toContain(translations.no.wfq_stale_title)
    expect(block.text()).toContain(translations.no.wfq_stale_reload)
  })
})

describe('rows that cannot be decided say why, rather than showing a dead button', () => {
  test('an availability exception is informational', async () => {
    mockInboxItems = [{
      kind: 'availability-exception',
      requestId: 'a1',
      staffMemberId: ANNA,
      staffDisplayName: 'Anna Haugen',
      state: 'informational',
      isDecidable: false,
      availabilityKind: 'Unavailable',
      startsUtc: '2026-08-06T00:00:00',
      endsUtc: '2026-08-06T22:00:00',
      localStartDate: '2026-08-06T00:00:00',
      localEndDate: '2026-08-06T00:00:00',
      createdAtUtc: '2026-07-22T09:00:00',
      revision: null
    }]

    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('.wfq-card__decide').exists()).toBe(false)
    expect(wrapper.find('.wfq-card__blocked').text()).toBe(translations.no.wfq_blocked_informational)
  })

  test('a decidable row with no revision is blocked on the missing precondition', async () => {
    mockInboxItems = [timeOff({ revision: null })]

    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('.wfq-card__decide').exists()).toBe(false)
    expect(wrapper.find('.wfq-card__blocked').text()).toBe(translations.no.wfq_blocked_no_revision)
  })
})

describe('unknown is never rendered as empty', () => {
  test('a failed list read offers a retry and does not claim the inbox is empty', async () => {
    const requestsClient = require('~/utils/workforce/requests-client')
    const original = requestsClient.WorkforceRequestsService.prototype.ListRequests
    requestsClient.WorkforceRequestsService.prototype.ListRequests = () => Promise.reject(new Error('boom'))

    const wrapper = mountPage()
    await settled()

    expect(wrapper.text()).toContain(translations.no.wfq_unknown)
    expect(wrapper.text()).not.toContain(translations.no.wfq_none_open)
    requestsClient.WorkforceRequestsService.prototype.ListRequests = original
  })

  test('an empty inbox says nothing is waiting, which is a different sentence', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.text()).toContain(translations.no.wfq_none_open)
  })
})
