import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import EventsPage from '~/pages/admin/events-pipeline.vue'
import {
  FACET_GATED,
  FACET_HELD,
  FACET_NONE,
  FACET_UNKNOWN,
  READ_DISABLED,
  READ_ANSWERED
} from '~/utils/events/journey'

const mockCalls = []
// What the next call of each name should do. A function is invoked, anything else is resolved.
let mockAnswers = {}

// The page builds its client in a computed, so the module is mocked rather than the instance. Every
// call is recorded so the tests can assert WHICH requests each step issues — the part of this page
// that is a contract with the backend rather than a rendering choice. `requireActual` keeps the real
// error type and codes, so a refusal below is the same object the real client would have thrown.
jest.mock('~/utils/events/events-client', () => {
  const actual = jest.requireActual('~/utils/events/events-client')
  const record = name => (...args) => {
    mockCalls.push([name].concat(args))
    const answer = mockAnswers[name]
    if (typeof answer === 'function') { return answer(...args) }
    return Promise.resolve(answer === undefined ? null : answer)
  }
  class MockEventsService {}
  for (const name of [
    'ListEvents', 'CreateEvent', 'GetEvent', 'CreateProposalVersion', 'SendProposalVersion',
    'MarkLost', 'IssueDeposit', 'CancelDeposit', 'ListDeposits', 'RefundDeposit', 'GetRunSheet',
    'GenerateRunSheet', 'StartService', 'CloseEvent', 'GetSettlement', 'AddSettlementLine',
    'ReconcileSettlement', 'CloseSettlement', 'CancelEvent', 'GetNotificationHealth',
    'RequeueNotification', 'RecordDietaryStatement'
  ]) {
    MockEventsService.prototype[name] = record(name)
  }
  return Object.assign({}, actual, { EventsService: MockEventsService })
})

// eslint-disable-next-line import/order -- must come after the jest.mock above for the real class.
const { EventsApiError } = jest.requireActual('~/utils/events/events-client')

const settled = () => new Promise(resolve => setTimeout(resolve, 0))
const refuse = (status, body) => () => Promise.reject(new EventsApiError(status, body))

const DETAIL = {
  id: 7,
  status: 'Confirmed',
  title: 'Julebord',
  eventDate: '2026-08-15T00:00:00',
  timeZoneId: 'Europe/Oslo',
  guestCountPlanned: 40,
  versions: [],
  transitions: []
}

function mountPage () {
  return shallowMount(EventsPage, {
    mocks: {
      $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
      priceLabel: minor => 'kr ' + minor,
      wholeAmount: minor => String(minor),
      fractionAmount: () => '00',
      marketConfig: { currency: 'NOK' },
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

const callsOf = name => mockCalls.filter(c => c[0] === name)

// The settlement read's envelope, as the server shapes it.
const settlementRead = settlement => ({ publicId: 'p', eventStatus: 'Settling', settlement })

beforeEach(() => {
  mockCalls.length = 0
  mockAnswers = {
    ListEvents: [],
    GetEvent: DETAIL,
    GetRunSheet: null,
    // Both facets answer the honest default: this enquiry has neither yet.
    ListDeposits: [],
    GetSettlement: settlementRead(null),
    GetNotificationHealth: { dispatchEnabled: true, queuedCount: 0, deadLetteredCount: 0, deadLettered: [] }
  }
})

describe('the pipeline read', () => {
  test('the venue comes from the selected admin store, not from anywhere else', async () => {
    mountPage()
    await settled()
    expect(callsOf('ListEvents')[0].slice(0, 2)).toEqual(['ListEvents', 42])
  })

  test('EVENTS_DISABLED lands as "disabled", never as an empty list', async () => {
    mockAnswers.ListEvents = refuse(404, { code: 'EVENTS_DISABLED', detail: 'Events is not enabled for this store.' })
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.listing.state).toBe(READ_DISABLED)
    expect(wrapper.vm.listing.rows).toBeNull()
  })

  // The positive control: the same page, on a real answer, does produce rows to count.
  test('an answered read produces rows', async () => {
    mockAnswers.ListEvents = [{ id: 7, status: 'Inquiry' }]
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.listing.state).toBe(READ_ANSWERED)
    expect(wrapper.vm.listing.rows).toHaveLength(1)
  })

  test('a filter is passed through as chosen, and omitted when it is not', async () => {
    const wrapper = mountPage()
    await settled()
    mockCalls.length = 0
    wrapper.setData({ filters: { status: 'ProposalSent', from: '2026-08-01', to: '' } })
    await wrapper.vm.loadPipeline()
    expect(callsOf('ListEvents')[0]).toEqual(['ListEvents', 42, 'ProposalSent', '2026-08-01', null])
  })
})

describe('opening one enquiry', () => {
  test('every facet of it is READ — the detail, the run sheet, the deposits and the settlement', async () => {
    const wrapper = mountPage()
    await settled()
    mockCalls.length = 0

    await wrapper.vm.selectEvent(7)
    await settled()

    expect(callsOf('GetEvent')).toHaveLength(1)
    expect(callsOf('GetRunSheet')).toHaveLength(1)
    expect(callsOf('ListDeposits')).toHaveLength(1)
    expect(callsOf('GetSettlement')).toHaveLength(1)
    // Each read is a READ. No mutation is fired to obtain a projection — `StartService` is the only
    // near-idempotent one and it still moves a Confirmed event.
    expect(callsOf('StartService')).toHaveLength(0)
    expect(callsOf('CloseEvent')).toHaveLength(0)
  })

  test('an answered read with nothing in it is NONE, and a read that fell over is UNKNOWN', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()

    expect(wrapper.vm.depositsFacet.state).toBe(FACET_NONE)
    expect(wrapper.vm.settlementFacet.state).toBe(FACET_NONE)

    mockAnswers.ListDeposits = () => Promise.reject(new Error('network down'))
    mockAnswers.GetSettlement = () => Promise.reject(new Error('network down'))
    await wrapper.vm.selectEvent(8)
    await settled()
    expect(wrapper.vm.depositsFacet.state).toBe(FACET_UNKNOWN)
    expect(wrapper.vm.settlementFacet.state).toBe(FACET_UNKNOWN)
  })

  // The point of the read: the tab that issued the deposit and a tab that merely opened the enquiry
  // see the same thing. Before it, only the first one did.
  test('a deposit issued in another session is there on a fresh open', async () => {
    mockAnswers.ListDeposits = [{ id: 9, status: 'Pending', amountMinor: 150000, receipts: [] }]
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()

    expect(wrapper.vm.depositsFacet.state).toBe(FACET_HELD)
    expect(wrapper.vm.cancellableDeposit.id).toBe(9)
  })

  // A stale deposit left on screen would be this surface reporting one enquiry's money against
  // another's.
  test('moving to another enquiry re-reads rather than carrying the previous one over', async () => {
    mockAnswers.ListDeposits = [{ id: 9, status: 'Pending', amountMinor: 150000, receipts: [] }]
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()
    expect(wrapper.vm.depositsFacet.state).toBe(FACET_HELD)

    mockAnswers.ListDeposits = []
    await wrapper.vm.selectEvent(8)
    await settled()
    expect(wrapper.vm.depositsFacet.state).toBe(FACET_NONE)
    expect(wrapper.vm.cancellableDeposit).toBeNull()
  })
})

describe('the deposit rail', () => {
  test('only the rail that is wired end to end on this branch is ever sent', async () => {
    mockAnswers.IssueDeposit = { deposit: { id: 9, status: 'Pending', amountMinor: 150000, receipts: [] } }
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.issueDeposit()
    await settled()

    expect(callsOf('IssueDeposit')[0][3]).toEqual({ paymentType: 'Vipps' })
  })

  test('a provider refusal is shown as the refusal it is, and no deposit appears', async () => {
    mockAnswers.IssueDeposit = refuse(400, {
      code: 'EVENTS_PAYMENT_PROVIDER',
      detail: 'Bare-deposit creation for Stripe is not wired.'
    })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.issueDeposit()
    await settled()

    expect(wrapper.vm.refusal.code).toBe('EVENTS_PAYMENT_PROVIDER')
    expect(wrapper.vm.depositsFacet.state).toBe(FACET_NONE)
    expect(wrapper.vm.cancellableDeposit).toBeNull()
  })

  test('cancel is offered only while the deposit the READ returned is still collectable', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()

    // Nothing read: nothing to cancel, and no id could be guessed from the event either.
    expect(wrapper.vm.cancellableDeposit).toBeNull()

    wrapper.setData({ depositsRead: [{ id: 9, status: 'Pending' }] })
    expect(wrapper.vm.cancellableDeposit.id).toBe(9)

    wrapper.setData({ depositsRead: [{ id: 9, status: 'Paid' }] })
    expect(wrapper.vm.cancellableDeposit).toBeNull()
    // …and a paid one is what refund acts on instead.
    expect(wrapper.vm.refundableDeposit.id).toBe(9)
  })

  // The whole reason the read is a list: after a cancel-and-reissue the history holds both, and the
  // action must find the live one by status rather than by being the newest or the first.
  test('after a withdrawal and a reissue, the action finds the live request', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    wrapper.setData({
      depositsRead: [
        { id: 8, status: 'Cancelled' },
        { id: 9, status: 'Pending' }
      ]
    })
    expect(wrapper.vm.cancellableDeposit.id).toBe(9)

    await wrapper.vm.cancelDeposit()
    await settled()
    expect(callsOf('CancelDeposit')[0][3]).toBe(9)
  })

  test('a refund sends the amount the operator typed, as integer minor units', async () => {
    mockAnswers.ListDeposits = [{ id: 9, status: 'Paid', amountMinor: 150000, refundedMinor: 0, receipts: [] }]
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()

    wrapper.setData({ draftRefund: { amount: '500,50' } })
    expect(wrapper.vm.refundBlocked).toBe('')
    await wrapper.vm.refundDeposit()
    await settled()

    expect(callsOf('RefundDeposit')[0][3]).toBe(9)
    expect(callsOf('RefundDeposit')[0][4]).toEqual({ amountMinor: 50050 })
  })

  test('and an unreadable or non-positive amount is not sent at all', async () => {
    mockAnswers.ListDeposits = [{ id: 9, status: 'Paid', amountMinor: 150000, refundedMinor: 0, receipts: [] }]
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()

    for (const amount of ['500 kroner', '1.2345', '0', '-100', '']) {
      wrapper.setData({ draftRefund: { amount } })
      expect(wrapper.vm.refundBlocked).not.toBe('')
      await wrapper.vm.refundDeposit()
      await settled()
    }
    expect(callsOf('RefundDeposit')).toHaveLength(0)
  })
})

// The tail of the journey on this branch. `Events.Settlement` is served by the default (hardcoded
// OFF) flag store, so the settlement machine answers 404 EVENTS_DISABLED — and that must read as the
// gate it is, never as "this event has no settlement".
describe('closing and settling', () => {
  test('a gated settlement is GATED, not an absent one', async () => {
    const gated = refuse(404, { code: 'EVENTS_DISABLED', detail: 'Events is not enabled for this store.' })
    mockAnswers.CloseEvent = gated
    // The READ is gated on the SAME flag as the mutation, so it answers the same way — which is what
    // makes the gate legible after a reload rather than only to the tab that pressed the button.
    mockAnswers.GetSettlement = gated
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.closeEvent()
    await settled()

    expect(wrapper.vm.settlementFacet.state).toBe(FACET_GATED)
    expect(wrapper.vm.settlementFacet.state).not.toBe(FACET_NONE)
  })

  // A call that fell over is a third thing again: we DID ask, so neither "there is none" nor "the
  // gate is closed" is a claim anybody made.
  test('a read that merely failed is UNKNOWN — neither gated nor absent', async () => {
    mockAnswers.CloseEvent = () => Promise.reject(new Error('network down'))
    mockAnswers.GetSettlement = () => Promise.reject(new Error('network down'))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.closeEvent()
    await settled()

    expect(wrapper.vm.settlementFacet.state).toBe(FACET_UNKNOWN)
    expect(wrapper.vm.settlementFacet.state).not.toBe(FACET_GATED)
    expect(wrapper.vm.settlementFacet.state).not.toBe(FACET_NONE)
  })

  // The positive control: with the flag on, the very same page holds the settlement — and holds the
  // one the READ returned, not the copy the mutation answered with.
  test('after a close the settlement on screen is the one the read returned', async () => {
    mockAnswers.CloseEvent = {
      publicId: 'x',
      eventStatus: 'Settling',
      settlement: { id: 3, status: 'Draft', statementTotalMinor: 150000, revision: 'stale-from-the-mutation', lines: [] }
    }
    mockAnswers.GetSettlement = settlementRead({
      id: 3, status: 'Draft', statementTotalMinor: 150000, revision: 'AAAAAAAAB9E=', lines: []
    })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.closeEvent()
    await settled()

    expect(wrapper.vm.settlementFacet.state).toBe(FACET_HELD)
    expect(wrapper.vm.settlementRevision).toBe('AAAAAAAAB9E=')
    expect(wrapper.vm.settlementRevision).not.toBe('stale-from-the-mutation')
  })

  test('the revision the READ answered with is echoed as the next If-Match', async () => {
    mockAnswers.CloseEvent = { eventStatus: 'Settling', settlement: { id: 3, revision: 'rev-1', lines: [] } }
    mockAnswers.GetSettlement = settlementRead({ id: 3, status: 'Draft', statementTotalMinor: 0, revision: 'rev-1', lines: [] })
    mockAnswers.ReconcileSettlement = { settlement: { id: 3, revision: 'rev-2', lines: [] }, mismatchedLineNos: [] }
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.closeEvent()
    await settled()

    // The read after the reconcile is what moves the token on, so the next call cannot replay it.
    mockAnswers.GetSettlement = settlementRead({ id: 3, status: 'Reconciled', statementTotalMinor: 0, revision: 'rev-2', lines: [] })
    await wrapper.vm.reconcile()
    await settled()

    expect(callsOf('ReconcileSettlement')[0][3]).toBe('rev-1')
    expect(wrapper.vm.settlementRevision).toBe('rev-2')
    await wrapper.vm.closeSettlement()
    await settled()
    expect(callsOf('CloseSettlement')[0][3]).toBe('rev-2')
  })

  // A SQLite host carries no rowversion, so the read answers `revision: null` and the guard demands
  // nothing. The page must still act: refusing without a token would break every local run.
  test('a null revision still mutates — the client sends no header rather than refusing', async () => {
    mockAnswers.GetSettlement = settlementRead({ id: 3, status: 'Draft', statementTotalMinor: 0, revision: null, lines: [] })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()
    expect(wrapper.vm.settlementRevision).toBeNull()

    await wrapper.vm.reconcile()
    await settled()
    expect(callsOf('ReconcileSettlement')).toHaveLength(1)
    expect(callsOf('ReconcileSettlement')[0][3]).toBeNull()
  })
})

// The step the demo journey stalled on: an invoice line is what gives reconcile something to check.
describe('the settlement line', () => {
  const openSettlement = () => settlementRead({
    id: 3, status: 'Draft', statementTotalMinor: 0, revision: 'rev-1', lines: []
  })

  const withOpenSettlement = async () => {
    mockAnswers.GetSettlement = openSettlement()
    mockAnswers.AddSettlementLine = { id: 3, status: 'Draft', statementTotalMinor: 120000, revision: 'rev-2', lines: [] }
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()
    return wrapper
  }

  test('an invoice line carries the amount, the revision, and no server-derived sourceKind', async () => {
    const wrapper = await withOpenSettlement()
    wrapper.setData({ draftLine: { kind: 'Invoice', amount: '1 200,00', sourceReference: 'INV-9', note: 'Catering', adjustmentReason: '' } })
    await wrapper.vm.addSettlementLine()
    await settled()

    const [, , , body, ifMatch] = callsOf('AddSettlementLine')[0]
    expect(body).toEqual({ kind: 'Invoice', amountMinor: 120000, sourceReference: 'INV-9', note: 'Catering', adjustmentReason: null })
    expect(ifMatch).toBe('rev-1')
    // The server overwrites `sourceKind` from `kind`; sending one would read as a choice nobody made.
    expect(Object.keys(body)).not.toContain('sourceKind')
  })

  test('an adjustment without a reason is refused here rather than round-tripped', async () => {
    const wrapper = await withOpenSettlement()
    wrapper.setData({ draftLine: { kind: 'Adjustment', amount: '100', sourceReference: '', note: '', adjustmentReason: '   ' } })
    expect(wrapper.vm.lineBlocked).toBe('ev_line_reason_needed')
    await wrapper.vm.addSettlementLine()
    await settled()
    expect(callsOf('AddSettlementLine')).toHaveLength(0)

    // The positive control: with a reason, the same form does send — and carries it.
    wrapper.setData({ draftLine: { kind: 'Adjustment', amount: '100', sourceReference: '', note: '', adjustmentReason: 'Broken glass' } })
    expect(wrapper.vm.lineBlocked).toBe('')
    await wrapper.vm.addSettlementLine()
    await settled()
    expect(callsOf('AddSettlementLine')[0][3].adjustmentReason).toBe('Broken glass')
  })

  test('an amount that cannot be read is not sent as a coerced number', async () => {
    const wrapper = await withOpenSettlement()
    wrapper.setData({ draftLine: { kind: 'Invoice', amount: '1 200 kroner', sourceReference: '', note: '', adjustmentReason: '' } })
    expect(wrapper.vm.lineBlocked).toBe('ev_line_amount_needed')
    await wrapper.vm.addSettlementLine()
    await settled()
    expect(callsOf('AddSettlementLine')).toHaveLength(0)
  })

  test('the form is offered while the statement is open and withdrawn once it is closed', async () => {
    const wrapper = await withOpenSettlement()
    expect(wrapper.vm.settlementIsOpen).toBe(true)

    mockAnswers.GetSettlement = settlementRead({ id: 3, status: 'Closed', statementTotalMinor: 120000, revision: 'rev-9', lines: [] })
    await wrapper.vm.loadSettlement()
    await settled()
    expect(wrapper.vm.settlementIsOpen).toBe(false)
  })
})

// The refusal the split was made for. It used to arrive as a retryable 409 telling the caller to
// re-read and try again — which, for a request that carried no header at all, is advice that cannot
// be followed, and the seed loop that proved it stalled here twice.
describe('a missing precondition is answered, not looped on', () => {
  test('EVENTS_REVISION_REQUIRED gets its own heading, distinct from the lost race', async () => {
    mockAnswers.ReconcileSettlement = refuse(400, {
      code: 'EVENTS_REVISION_REQUIRED',
      detail: 'An If-Match header carrying the settlement revision is required for this mutation.',
      retryable: false
    })
    mockAnswers.GetSettlement = settlementRead({ id: 3, status: 'Draft', revision: 'rev-1', lines: [] })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.reconcile()
    await settled()

    expect(wrapper.vm.refusal.code).toBe('EVENTS_REVISION_REQUIRED')
    expect(wrapper.vm.refusalHeading).toBe('ev_refusal_revision_required')
    expect(wrapper.vm.refusalHeading).not.toBe('ev_refusal_conflict')
    expect(wrapper.vm.refusalHeading).not.toBe('ev_refusal_other:{"code":"EVENTS_REVISION_REQUIRED"}')
  })

  test('the lost race keeps its own heading too', async () => {
    mockAnswers.CloseSettlement = refuse(409, { code: 'EVENTS_CONFLICT', detail: 'modified concurrently', retryable: true })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.closeSettlement()
    await settled()

    expect(wrapper.vm.refusalHeading).toBe('ev_refusal_conflict')
  })

  // The recovery is a DIFFERENT request, and the page has already made it — so pressing the button
  // again is a thing that can work, and only then is the user told to.
  test('both are followed by a re-read, so the revision on screen is current', async () => {
    mockAnswers.ReconcileSettlement = refuse(400, { code: 'EVENTS_REVISION_REQUIRED', detail: 'x', retryable: false })
    mockAnswers.GetSettlement = settlementRead({ id: 3, status: 'Draft', revision: 'rev-fresh', lines: [] })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()
    mockCalls.length = 0

    await wrapper.vm.reconcile()
    await settled()

    expect(callsOf('GetSettlement')).toHaveLength(1)
    expect(wrapper.vm.settlementRevision).toBe('rev-fresh')
    expect(wrapper.vm.refusalIsRetryable).toBe(true)
  })

  // The two other refusals a manager walking the tail actually meets. Neither is a concurrency
  // problem, and neither is served by "the action was refused (SOME_CODE)".
  test('closing an unreconciled settlement, and requeueing a link that arrived, each say what happened', async () => {
    mockAnswers.CloseSettlement = refuse(409, { code: 'EVENTS_SETTLEMENT_NOT_RECONCILED', detail: 'x' })
    mockAnswers.RequeueNotification = refuse(409, { code: 'EVENTS_NOTIFICATION_ALREADY_SENT', detail: 'x' })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)

    await wrapper.vm.closeSettlement()
    await settled()
    expect(wrapper.vm.refusalHeading).toBe('ev_refusal_not_reconciled')
    expect(wrapper.vm.refusalIsRetryable).toBe(false)

    await wrapper.vm.requeueNotification('n-1')
    await settled()
    expect(wrapper.vm.refusalHeading).toBe('ev_refusal_notification_sent')
  })

  // The control: a refusal that a second press CANNOT fix must not invite one.
  test('a state refusal is not advertised as retryable', async () => {
    mockAnswers.StartService = refuse(409, { code: 'EVENTS_STATE', currentStatus: 'Settled', permittedActions: [] })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.startService()
    await settled()

    expect(wrapper.vm.refusalIsRetryable).toBe(false)
  })

  // Nothing retries by itself. An automatic second attempt on a money path would decide, for the
  // operator, that whatever the other writer did is acceptable to write over.
  test('nothing is retried automatically', async () => {
    mockAnswers.CloseSettlement = refuse(409, { code: 'EVENTS_CONFLICT', detail: 'x', retryable: true })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.closeSettlement()
    await settled()

    expect(callsOf('CloseSettlement')).toHaveLength(1)
  })
})

describe('cancelling an event never decides about a guest\'s money', () => {
  test('no resolution is sent unless the operator picked one', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    wrapper.setData({ draftCancel: { reason: 'Guest called off', resolution: '' } })
    await wrapper.vm.cancelEvent()
    await settled()

    expect(callsOf('CancelEvent')[0][3]).toEqual({ reason: 'Guest called off', resolution: null })
  })

  test('and the one they picked is sent verbatim', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    for (const resolution of ['Refund', 'Forfeit']) {
      mockCalls.length = 0
      wrapper.setData({ draftCancel: { reason: 'x', resolution } })
      await wrapper.vm.cancelEvent()
      await settled()
      expect(callsOf('CancelEvent')[0][3].resolution).toBe(resolution)
    }
  })

  test('the deposit history is re-read afterwards, because the resolution moved it', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()
    mockCalls.length = 0

    wrapper.setData({ draftCancel: { reason: 'x', resolution: 'Refund' } })
    await wrapper.vm.cancelEvent()
    await settled()
    expect(callsOf('ListDeposits')).toHaveLength(1)
  })
})

// An empty dead-letter list means two opposite things depending on whether the drain runs at all.
describe('the guest-link watch', () => {
  test('the store health is read on load, without opening any enquiry', async () => {
    const wrapper = mountPage()
    await settled()
    expect(callsOf('GetNotificationHealth')[0]).toEqual(['GetNotificationHealth', 42])
    expect(wrapper.vm.notificationFacet.state).toBe(FACET_HELD)
  })

  test('dispatch being off is reported with the count that is waiting behind it', async () => {
    mockAnswers.GetNotificationHealth = { dispatchEnabled: false, queuedCount: 12, deadLetteredCount: 0, deadLettered: [] }
    const wrapper = mountPage()
    await settled()
    const text = wrapper.text()
    expect(text).toContain('ev_notify_dispatch_off:{"queued":12}')
    expect(text).not.toContain('ev_notify_dispatch_on')
  })

  test('an idempotent replay is reported as one, not as a fresh send', async () => {
    mockAnswers.GetNotificationHealth = {
      dispatchEnabled: true,
      queuedCount: 0,
      deadLetteredCount: 1,
      deadLettered: [{ notificationOutboxId: 'n-1', kind: 'DepositLink', attemptCount: 5, maxAttempts: 5, lastError: 'SmtpTimeout' }]
    }
    mockAnswers.RequeueNotification = { notificationOutboxId: 'n-1', requeued: false, status: 'Pending' }
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.requeueNotification('n-1')
    await settled()
    expect(callsOf('RequeueNotification')[0]).toEqual(['RequeueNotification', 42, 'n-1'])
    expect(wrapper.vm.toast.message).toBe('ev_toast_requeue_already_queued')

    mockAnswers.RequeueNotification = { notificationOutboxId: 'n-1', requeued: true, status: 'Pending' }
    await wrapper.vm.requeueNotification('n-1')
    await settled()
    expect(wrapper.vm.toast.message).toBe('ev_toast_requeued')
  })

  test('a health read that did not answer says so rather than "no problems"', async () => {
    mockAnswers.GetNotificationHealth = () => Promise.reject(new Error('down'))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.notificationFacet.state).toBe(FACET_UNKNOWN)
    expect(wrapper.text()).toContain('ev_notify_unknown')
    expect(wrapper.text()).not.toContain('ev_notify_none')
  })
})

describe('a refused action answers with the server truth, not a local guess', () => {
  test('the status the server holds and the transitions it permits are both kept', async () => {
    mockAnswers.StartService = refuse(409, {
      code: 'EVENTS_STATE',
      detail: 'The requested action is not permitted from the event state.',
      currentStatus: 'Settled',
      permittedActions: []
    })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.startService()
    await settled()

    expect(wrapper.vm.refusal.currentStatus).toBe('Settled')
    // An EMPTY permitted list is a real answer (a terminal state), and is not the same as no answer.
    expect(wrapper.vm.refusal.permittedActions).toEqual([])
    expect(wrapper.vm.refusalHeading).toBe('ev_refusal_state')
  })

  test('the next action clears the previous refusal rather than stacking two', async () => {
    mockAnswers.StartService = refuse(409, { code: 'EVENTS_STATE', currentStatus: 'Settled', permittedActions: [] })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.startService()
    await settled()
    expect(wrapper.vm.refusal).not.toBeNull()

    mockAnswers.GenerateRunSheet = { versionNo: 1, status: 'Issued', items: [] }
    await wrapper.vm.generateRunSheet()
    await settled()
    expect(wrapper.vm.refusal).toBeNull()
  })
})

// The run sheet printed "No dietary or allergen requirements recorded." on every sheet ever generated,
// having never asked. The field behind these tests is the ask; this page is the only place it exists.
describe('recording what the venue was told about allergies', () => {
  test('the statement goes on the wire and the run sheet is re-read, because saving made it stale', async () => {
    mockAnswers.RecordDietaryStatement = { eventId: 7, statement: 'One coeliac.', statedAtUtc: '2026-08-01T09:00:00Z' }
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()
    mockCalls.length = 0

    wrapper.setData({ draftDietary: '  One coeliac.  ' })
    await wrapper.vm.recordDietary()
    await settled()

    // Trimmed, and sent as the whole statement — this field replaces, it does not append.
    expect(callsOf('RecordDietaryStatement')[0]).toEqual(
      ['RecordDietaryStatement', 42, 7, { statement: 'One coeliac.' }])
    // The printed sheet is now out of date, and the operator has to be able to SEE that.
    expect(callsOf('GetRunSheet')).toHaveLength(1)
  })

  test('an empty statement is never sent — a blank field is "nobody asked", not "no requirements"', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    mockCalls.length = 0

    wrapper.setData({ draftDietary: '   ' })
    const result = await wrapper.vm.recordDietary()

    expect(result).toBeNull()
    expect(callsOf('RecordDietaryStatement')).toHaveLength(0)
  })

  test('the form opens on what is already recorded, so an edit cannot silently shorten it', async () => {
    mockAnswers.GetEvent = Object.assign({}, DETAIL, {
      dietary: { eventId: 7, statement: 'Severe nut allergy, table 3.', statedAtUtc: '2026-08-01T09:00:00Z' }
    })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()

    wrapper.vm.toggleDietary()
    expect(wrapper.vm.draftDietary).toBe('Severe nut allergy, table 3.')
  })
})

describe('the proposal draft sends what the operator typed, or nothing', () => {
  test('amounts go on the wire as integer minor units', async () => {
    mockAnswers.CreateProposalVersion = { versionNo: 1, status: 'Draft', lines: [] }
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)

    wrapper.setData({
      draftProposal: {
        currencyCode: 'NOK',
        minimumSpend: '4000',
        roomFee: '700.50',
        depositRequired: '1 500,00',
        termsText: '',
        expiryDay: '2026-08-01',
        lines: [{ kind: 'Package', description: 'Meny', quantity: 40, unitPrice: '625.25', vatRate: 0.25 }]
      }
    })
    await wrapper.vm.createProposal()
    await settled()

    const body = callsOf('CreateProposalVersion')[0][3]
    expect(body.minimumSpendMinor).toBe(400000)
    expect(body.roomFeeMinor).toBe(70050)
    expect(body.depositRequiredMinor).toBe(150000)
    expect(body.lines[0].unitPriceMinor).toBe(62525)
    for (const value of [body.minimumSpendMinor, body.roomFeeMinor, body.depositRequiredMinor, body.lines[0].unitPriceMinor]) {
      expect(Number.isInteger(value)).toBe(true)
    }
  })

  test('the expiry is the venue day, converted through the venue zone', async () => {
    mockAnswers.CreateProposalVersion = { versionNo: 1, status: 'Draft', lines: [] }
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    wrapper.setData({ draftProposal: Object.assign(wrapper.vm.draftProposal, { expiryDay: '2026-08-01' }) })
    await wrapper.vm.createProposal()
    await settled()

    // Midnight on 1 August in Oslo is 22:00 UTC on 31 July. Sent bare, so nothing converts it again.
    expect(callsOf('CreateProposalVersion')[0][3].expiresAtUtc).toBe('2026-07-31T22:00:00')
  })

  test('an amount that cannot be read blocks the submit instead of being coerced', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)

    wrapper.setData({
      draftProposal: Object.assign(wrapper.vm.draftProposal, { minimumSpend: '4 000 kroner', roomFee: '1.2345' })
    })
    expect(wrapper.vm.moneyFieldsRejected).toHaveLength(2)

    wrapper.setData({
      draftProposal: Object.assign(wrapper.vm.draftProposal, { minimumSpend: '4000', roomFee: '1.23' })
    })
    expect(wrapper.vm.moneyFieldsRejected).toEqual([])
  })
})

describe('the surface states its own limits on screen, not only in its code', () => {
  test('the venue is told which rails carry a deposit and which are absent, and why settling is gated', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()

    const text = wrapper.text()
    // The `$i` stand-in here echoes the key and its params, so these assert BOTH that the copy is
    // rendered and that the rail lists are the ones the model holds.
    expect(text).toContain('ev_deposit_rail_note:{"wired":"Vipps","unwired":"Stripe, Dintero"}')
    expect(text).toContain('ev_settlement_gate_note')
    expect(text).toContain('ev_accept_note')
  })
})

describe('the guest half of the journey is not here, because it cannot be', () => {
  // T5 (ProposalSent → Accepted) is reachable only through the anonymous token route, so this admin
  // surface offers no way to accept a proposal. The assertion is that no such call exists at all.
  test('there is no admin path from ProposalSent to Accepted', async () => {
    const wrapper = mountPage()
    await settled()
    const methods = Object.keys(wrapper.vm.$options.methods)
    expect(methods.filter(m => /accept/i.test(m))).toEqual([])
    expect(methods.filter(m => /decline/i.test(m))).toEqual([])
  })
})
