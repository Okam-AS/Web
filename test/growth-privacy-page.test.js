import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import PrivacyPage from '~/pages/admin/growth-privacy.vue'
import translations from '~/translations'
import { GrowthApiError } from '~/utils/growth/api-client'

const calls = []
const behaviour = {}

// The page builds its client in a computed, so the module is mocked rather than the instance. Every
// call is recorded so the tests can assert WHICH store the page asked about — the part of this page
// that is a contract with the backend rather than a rendering choice.
jest.mock('~/utils/growth/growth-client', () => ({
  GrowthService: class {
    _call (name, args, fallback) {
      calls.push([name].concat(args))
      const override = behaviour[name]
      if (typeof override === 'function') { return override.apply(null, args) }
      return Promise.resolve(fallback)
    }

    ListPrivacyRequests (storeId) { return this._call('ListPrivacyRequests', [storeId], LIST) }
    ResolvePrivacyRequest (storeId, id, res) { return this._call('ResolvePrivacyRequest', [storeId, id, res], RESOLVED_ROW) }
  }
}))

// 2026-08-01T10:00 is the clock the page reads through `new Date()`. Pinned so the deadlines below
// are the ones the assertions name rather than whatever day the suite runs on.
const NOW = new Date('2026-08-01T10:00:00Z')

// Store 42's queue, IN THE ORDER AND WITH THE DEADLINES THE SERVER SENDS — `ListAsync` returns
// everything still owing an answer first, soonest `dueAt` first, then the settled rows. `dueAt` is a
// FIELD on every row because it is the wire's, computed by `GrowthPrivacyObligation`; this page does
// not work it out, so a fixture that omitted it would darken the whole deadline column.
//
// Written as ONE self-contained literal on purpose: `babel-plugin-jest-hoist` lifts the ALL-CAPS
// consts a `jest.mock` factory references to the top of the module, so a `LIST` assembled from
// neighbouring consts would be evaluated before them and die in the temporal dead zone. The
// individual rows are read back out below, which needs no hoisting.
const LIST = {
  storeId: 42,
  requests: [
    // A guest's ERASURE, filed 20 June, due 20 July — already past. The journey this lane exists for,
    // and the row the server puts at the top because it is the one about to cost the venue.
    { requestId: 9001, contactPointId: 5501, requestType: 'Erasure', state: 'Received', receivedAt: '2026-06-20T08:00:00Z', dueAt: '2026-07-20T08:00:00Z', resolvedAt: null, noticeDelivery: null },
    // Filed 28 July — the newest, and the one with the most time left.
    { requestId: 9002, contactPointId: 5502, requestType: 'Access', state: 'Received', receivedAt: '2026-07-28T08:00:00Z', dueAt: '2026-08-28T08:00:00Z', resolvedAt: null, noticeDelivery: null },
    { requestId: 9000, contactPointId: 5500, requestType: 'Access', state: 'Fulfilled', receivedAt: '2026-06-01T08:00:00Z', dueAt: '2026-07-01T08:00:00Z', resolvedAt: '2026-06-03T08:00:00Z', noticeDelivery: 'SubmittedToTransport' }
  ]
}

const RESOLVED_ROW = {
  requestId: 9001,
  contactPointId: 5501,
  requestType: 'Erasure',
  state: 'Fulfilled',
  receivedAt: '2026-06-20T08:00:00Z',
  resolvedAt: '2026-08-01T10:00:00Z',
  noticeDelivery: 'SubmittedToTransport'
}

const i18nCalls = []

function mountPage (storeId = 42) {
  return shallowMount(PrivacyPage, {
    mocks: {
      $i: (key, params) => { i18nCalls.push([key, params]); return key },
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: storeId, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: storeId }] } }
      },
      // The Core initializer the global mixin normally supplies; `core/` is an uninitialised
      // submodule by design, so only `bearerToken` is ever read from it.
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

const settled = () => new Promise(resolve => setTimeout(resolve, 0))
const callsTo = name => calls.filter(c => c[0] === name)
const paramsFor = key => (i18nCalls.filter(c => c[0] === key).pop() || [])[1]

/**
 * Mounts, waits for the read, and PINS THE CLOCK.
 *
 * The page holds the read time in `readAt` and the queue is computed from it, so overwriting that
 * one field fixes every deadline below at 1 August 2026 without stubbing the global `Date` — which
 * this page cannot survive, because `init` runs inside a try/catch that would turn a broken stub
 * into an empty queue and make every assertion here pass for the wrong reason.
 */
async function openPage (storeId = 42) {
  const wrapper = mountPage(storeId)
  await settled()
  wrapper.vm.readAt = NOW
  await wrapper.vm.$nextTick()
  return wrapper
}

beforeEach(() => {
  calls.length = 0
  i18nCalls.length = 0
  Object.keys(behaviour).forEach(k => delete behaviour[k])
})

describe('the page reads the store it is looking at', () => {
  test('it lists the SELECTED store, not a hard-coded one', async () => {
    mountPage(42)
    await settled()
    expect(callsTo('ListPrivacyRequests')).toEqual([['ListPrivacyRequests', 42]])
  })

  test('a different store is a different read — the queue is not reused', async () => {
    // A page that held the previous store's rows would show one venue's data subjects to another,
    // which is the failure the route's own concealment 404 exists to prevent one layer down.
    mountPage(77)
    await settled()
    expect(callsTo('ListPrivacyRequests')).toEqual([['ListPrivacyRequests', 77]])
  })

  test('switching store re-reads and clears the queue to UNKNOWN first', async () => {
    const wrapper = mountPage(42)
    await settled()
    expect(wrapper.vm.queue.total).toBe(3)

    behaviour.ListPrivacyRequests = () => new Promise(() => {}) // never answers
    wrapper.vm.$store.state.selectedAdminStore = 77
    await wrapper.vm.$nextTick()
    await settled()

    // Not store 42's three rows still on screen while store 77's read is in flight.
    expect(wrapper.vm.queue.state).toBe('unknown')
    expect(wrapper.vm.queue.total).toBeNull()
    expect(callsTo('ListPrivacyRequests')).toEqual([
      ['ListPrivacyRequests', 42], ['ListPrivacyRequests', 77]
    ])
  })
})

describe('what the venue is shown', () => {
  test('the guest\'s erasure request is on the open queue, with its reference', async () => {
    const wrapper = await openPage()
    const html = wrapper.html()
    // The reference the guest was given (`gr_guest_request_reference` prints the same requestId), so
    // a guest who quotes it can be matched to this row.
    expect(html).toContain('data-request="9001"')
    expect(wrapper.vm.queue.open.map(r => r.requestId)).toContain(9001)
  })

  test('the request about to run out of month is drawn first, in the order the server sent', async () => {
    const wrapper = await openPage()
    // 9001 is due 20 July and already past; 9002 is due 28 August. `ListAsync` puts them in that
    // order because urgency is a property of the obligation, and the page RENDERS it rather than
    // choosing one of its own.
    expect(wrapper.vm.queue.open.map(r => r.requestId)).toEqual([9001, 9002])
    // And the markup agrees with the queue, so this is the order an operator actually sees rather
    // than one that only exists in a computed.
    expect(wrapper.findAll('[data-request]').wrappers.map(w => w.attributes('data-request')))
      .toEqual(['9001', '9002'])
  })

  test('the deadline printed on a row is the wire\'s, not one recomputed from the receipt', async () => {
    // Fed a deadline that no rule applied to `receivedAt` would produce. Whatever the server says is
    // the date the venue is held to, and the page must print that and nothing else — a module that
    // had kept its own arithmetic would answer 20 August here.
    const wrapper = await openPage()
    wrapper.vm.list = {
      storeId: 42,
      requests: [Object.assign({}, LIST.requests[1], { dueAt: '2026-09-04T11:30:00Z' })]
    }
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.queue.open[0].dueAt.toISOString()).toBe('2026-09-04T11:30:00.000Z')
    expect(paramsFor('gp_due').when).toBe(wrapper.vm.stamp(new Date('2026-09-04T11:30:00Z')))
  })

  test('the overdue banner counts only what is still open', async () => {
    const wrapper = await openPage()
    expect(wrapper.vm.queue.overdueCount).toBe(1)
    expect(wrapper.find('[data-test="overdue-banner"]').exists()).toBe(true)
  })

  test('a resolved request appears under the closed heading and offers no controls', async () => {
    const wrapper = await openPage()
    expect(wrapper.find('[data-resolved="9000"]').exists()).toBe(true)
    // No fulfil/reject affordance on a terminal row: the server is idempotent about it, but an
    // affordance that changes nothing is an invitation to think something happened.
    expect(wrapper.find('[data-resolved="9000"] [data-test="fulfil-open"]').exists()).toBe(false)
  })

  test('the page NEVER prints an address, and never claims one was destroyed', async () => {
    const wrapper = await openPage()
    const html = wrapper.html()
    expect(html).not.toMatch(/@/)
    // `gp_notice_*` says what the TRANSPORT reported. There is no key claiming destruction, because
    // a fulfilled erasure may have been deferred and this list cannot tell the two apart.
    const no = translations.no
    Object.keys(no).filter(k => k.indexOf('gp_') === 0).forEach((key) => {
      expect(String(no[key])).not.toMatch(/adressen er slettet|adressen ble slettet/i)
    })
  })

  test('a null noticeDelivery gets its own sentence, not one of the three states', async () => {
    const wrapper = await openPage()
    const open = wrapper.vm.queue.open.find(r => r.requestId === 9001)
    expect(open.noticeDelivery).toBeNull()
    expect(wrapper.vm.noticeLabel(open)).toBe('gp_notice_none')
    expect(wrapper.vm.noticeLabel({ noticeDelivery: 'SubmittedToTransport' })).toBe('gp_notice_submittedtotransport')
    expect(wrapper.vm.noticeLabel({ noticeDelivery: 'AttemptedAndFailed' })).toBe('gp_notice_attemptedandfailed')
  })

  test('the countdown reads in whole days and names the overdue case', async () => {
    const wrapper = await openPage()
    const overdue = wrapper.vm.queue.open.find(r => r.requestId === 9001)
    const fresh = wrapper.vm.queue.open.find(r => r.requestId === 9002)
    // Due 20 July 08:00, and it is 1 August 10:00 — twelve WHOLE days past, not thirteen. A floor
    // would say thirteen and tell an operator the answer was owed a day earlier than it was.
    expect(wrapper.vm.clockLabel(overdue)).toBe('gp_overdue_by')
    expect(paramsFor('gp_overdue_by').days).toBe(12)
    // Due 28 August 08:00 — 26 whole days and 22 hours. Twenty-six; a whole day is not left until
    // it is.
    expect(wrapper.vm.clockLabel(fresh)).toBe('gp_days_left')
    expect(paramsFor('gp_days_left').days).toBe(26)
    // Singular, plural and every edge get their own sentence rather than "1 dager igjen" or the
    // unsayable "the deadline ran out 0 days ago".
    expect(wrapper.vm.clockLabel({ daysLeft: 1, isOverdue: false })).toBe('gp_days_left_one')
    expect(wrapper.vm.clockLabel({ daysLeft: 0, isOverdue: false })).toBe('gp_due_today')
    expect(wrapper.vm.clockLabel({ daysLeft: 0, isOverdue: true })).toBe('gp_overdue_today')
    expect(wrapper.vm.clockLabel({ daysLeft: -1, isOverdue: true })).toBe('gp_overdue_by_one')
    expect(wrapper.vm.clockLabel({ daysLeft: -2, isOverdue: true })).toBe('gp_overdue_by')
    expect(wrapper.vm.clockLabel({ daysLeft: null, isOverdue: false })).toBe('gp_due_unknown')
  })
})

describe('resolving a request', () => {
  test('fulfilment is offered only behind the irreversibility warning', async () => {
    const wrapper = await openPage()
    // Not straight to the write: the server executes §13 in the same call.
    expect(wrapper.find('[data-request="9001"] [data-test="fulfil-confirm"]').exists()).toBe(false)

    await wrapper.find('[data-request="9001"] [data-test="fulfil-open"]').trigger('click')
    expect(wrapper.find('[data-request="9001"] [data-test="fulfil-warning"]').exists()).toBe(true)
    expect(callsTo('ResolvePrivacyRequest')).toHaveLength(0)
  })

  test('the erasure warning is the erasure one, and access gets its own', async () => {
    const wrapper = await openPage()
    wrapper.vm.confirming = 9001
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-request="9001"] [data-test="fulfil-warning"]').text()).toBe('gp_fulfil_erasure_warning')

    wrapper.vm.confirming = 9002
    await wrapper.vm.$nextTick()
    expect(wrapper.find('[data-request="9002"] [data-test="fulfil-warning"]').text()).toBe('gp_fulfil_access_warning')
  })

  test('confirming posts Fulfilled for THAT request and re-reads the queue', async () => {
    const wrapper = await openPage()
    wrapper.vm.confirming = 9001
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-request="9001"] [data-test="fulfil-confirm"]').trigger('click')
    await settled()

    expect(callsTo('ResolvePrivacyRequest')).toEqual([
      ['ResolvePrivacyRequest', 42, 9001, { outcome: 'Fulfilled', reason: null }]
    ])
    // The list is authoritative, not the single-row response: the counts, the ordering and the
    // overdue banner all derive from it.
    expect(callsTo('ListPrivacyRequests')).toHaveLength(2)
    expect(wrapper.vm.toast.type).toBe('success')
    expect(paramsFor('gp_toast_fulfilled').reference).toBe(9001)
  })

  test('a rejection with no reason is refused HERE — no write is attempted', async () => {
    const wrapper = await openPage()
    // The button is closed…
    const reject = wrapper.find('[data-request="9001"] [data-test="reject"]')
    expect(reject.attributes('disabled')).toBeTruthy()

    // …and the method refuses too, because a disabled attribute is a rendering. This is the
    // assertion that survives somebody removing the `:disabled` binding.
    await wrapper.vm.reject(wrapper.vm.queue.open[0])
    expect(callsTo('ResolvePrivacyRequest')).toHaveLength(0)
    expect(wrapper.vm.toast.type).toBe('error')
    expect(wrapper.vm.toast.message).toBe('gp_error_reason_required')
  })

  test('whitespace is not a reason', async () => {
    const wrapper = await openPage()
    wrapper.vm.reasons[9001] = '   '
    await wrapper.vm.reject(wrapper.vm.queue.open[0])
    expect(callsTo('ResolvePrivacyRequest')).toHaveLength(0)
  })

  test('a rejection with a reason posts it, trimmed', async () => {
    const wrapper = await openPage()
    wrapper.vm.reasons[9001] = '  Ikke registrert som den saken gjelder.  '
    await wrapper.vm.reject(wrapper.vm.queue.open[0])
    await settled()
    expect(callsTo('ResolvePrivacyRequest')).toEqual([
      ['ResolvePrivacyRequest', 42, 9001, {
        outcome: 'RejectedWithReason', reason: 'Ikke registrert som den saken gjelder.'
      }]
    ])
  })
})

describe('refusals are rendered by CODE, not by the server\'s prose', () => {
  test('a 503 notice_undeliverable says nothing was destroyed', async () => {
    // The most consequential mapping on the page. Collapsed into "something went wrong", an operator
    // would reasonably assume the erasure had half-happened; in fact nothing was destroyed and the
    // request is still open.
    behaviour.ResolvePrivacyRequest = () => Promise.reject(
      new GrowthApiError(503, { error: { code: 'growth.notice_undeliverable', message: 'server prose' } }))
    const wrapper = await openPage()
    await wrapper.vm.fulfil(wrapper.vm.queue.open[0])
    await settled()
    expect(wrapper.vm.toast.message).toBe('gp_error_notice_undeliverable')
    expect(wrapper.vm.toast.message).not.toBe('server prose')
  })

  test('an unattributed write, a not-found and an unmapped code each land somewhere honest', async () => {
    const wrapper = await openPage()

    behaviour.ResolvePrivacyRequest = () => Promise.reject(
      new GrowthApiError(401, { error: { code: 'growth.unattributed' } }))
    await wrapper.vm.fulfil(wrapper.vm.queue.open[0])
    expect(wrapper.vm.toast.message).toBe('gp_error_unattributed')

    behaviour.ResolvePrivacyRequest = () => Promise.reject(
      new GrowthApiError(404, { error: { code: 'growth.not_found' } }))
    await wrapper.vm.fulfil(wrapper.vm.queue.open[0])
    expect(wrapper.vm.toast.message).toBe('gp_error_not_found')

    // An unrecognised code falls to the generic sentence rather than rendering a missing key.
    behaviour.ResolvePrivacyRequest = () => Promise.reject(
      new GrowthApiError(500, { error: { code: 'growth.something_new' } }))
    await wrapper.vm.fulfil(wrapper.vm.queue.open[0])
    expect(wrapper.vm.toast.message).toBe('gp_error_generic')
  })

  test('a 404 on the LIST is the store-level blocker, and the queue stays unknown', async () => {
    behaviour.ListPrivacyRequests = () => Promise.reject(new GrowthApiError(404, { error: { code: 'growth.not_found' } }))
    const wrapper = await openPage()
    expect(wrapper.vm.blocker).toBe('gp_forbidden')
    expect(wrapper.vm.queue.state).toBe('unknown')
  })

  test('any other list failure leaves the queue UNKNOWN rather than empty', async () => {
    behaviour.ListPrivacyRequests = () => Promise.reject(new GrowthApiError(500, null))
    const wrapper = await openPage()
    // No blocker — the page is not blacked out — but it must not say "nobody has asked".
    expect(wrapper.vm.blocker).toBe('')
    expect(wrapper.vm.queue.state).toBe('unknown')
    expect(wrapper.find('[data-test="read-failed"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="open-empty"]').exists()).toBe(false)
  })
})

describe('the copy exists in all three locales', () => {
  // A key present in `no` and missing in `en`/`de` renders the raw key at an operator. The whole
  // point of this page is that a venue can read what it owes; a bare `gp_overdue_by` is not that.
  test('every gp_* and the nav label are translated three times', () => {
    const keys = Object.keys(translations.no).filter(k => k.indexOf('gp_') === 0).concat(['nav_growth_privacy'])
    expect(keys.length).toBeGreaterThan(40)
    const missing = []
    keys.forEach((key) => {
      ['en', 'de'].forEach((locale) => {
        if (!translations[locale][key]) { missing.push(locale + ':' + key) }
      })
    })
    expect(missing).toEqual([])
  })

  test('the deadline note names the article the guest was shown', () => {
    // C6: the statute is printed here because THIS change produces the answer it requires — the
    // resolve call is what sends the guest the notice art. 12(3) is about.
    expect(translations.no.gp_deadline_note).toMatch(/artikkel 12/)
    expect(translations.en.gp_deadline_note).toMatch(/article 12/)
    expect(translations.de.gp_deadline_note).toMatch(/Art\. 12/)
    // And it is the same article the guest's own page prints.
    expect(translations.no.gr_guest_request_deadline).toMatch(/artikkel 12/)
  })
})
