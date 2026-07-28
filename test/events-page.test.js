import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import EventsPage from '~/pages/admin/events-pipeline.vue'
import {
  FACET_NO_READ_ENDPOINT,
  FACET_GATED,
  FACET_HELD,
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
    'MarkLost', 'IssueDeposit', 'CancelDeposit', 'GetRunSheet', 'GenerateRunSheet',
    'StartService', 'CloseEvent', 'ReconcileSettlement', 'CloseSettlement'
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

beforeEach(() => {
  mockCalls.length = 0
  mockAnswers = { ListEvents: [], GetEvent: DETAIL, GetRunSheet: null }
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
  test('reads the detail and the run sheet — and nothing else, because nothing else is readable', async () => {
    const wrapper = mountPage()
    await settled()
    mockCalls.length = 0

    await wrapper.vm.selectEvent(7)
    await settled()

    expect(callsOf('GetEvent')).toHaveLength(1)
    expect(callsOf('GetRunSheet')).toHaveLength(1)
    // There is no admin GET for either, so neither is attempted — and no mutation is fired to fake one.
    expect(callsOf('StartService')).toHaveLength(0)
    expect(callsOf('CloseEvent')).toHaveLength(0)
  })

  test('the deposit and the settlement begin as unreadable, not as absent', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()

    expect(wrapper.vm.depositFacet.state).toBe(FACET_NO_READ_ENDPOINT)
    expect(wrapper.vm.settlementFacet.state).toBe(FACET_NO_READ_ENDPOINT)
  })

  // A stale deposit left on screen would be this surface reporting one enquiry's money against
  // another's. The clear is asserted with a held deposit actually in hand first.
  test('moving to another enquiry drops the deposit rather than carrying it over', async () => {
    mockAnswers.IssueDeposit = { deposit: { id: 9, status: 'Pending', amountMinor: 150000, receipts: [] } }
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await settled()

    await wrapper.vm.issueDeposit()
    await settled()
    expect(wrapper.vm.depositFacet.state).toBe(FACET_HELD)

    await wrapper.vm.selectEvent(8)
    await settled()
    expect(wrapper.vm.depositFacet.state).toBe(FACET_NO_READ_ENDPOINT)
    expect(wrapper.vm.depositFacet.view).toBeNull()
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

  test('a provider refusal is shown as the refusal it is, and holds no deposit', async () => {
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
    expect(wrapper.vm.depositFacet.view).toBeNull()
  })

  test('cancel is offered only while the HELD deposit is still collectable', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)

    // Nothing held: nothing to cancel, and no id could be guessed from the event either.
    expect(wrapper.vm.cancellableDepositId).toBeNull()

    wrapper.setData({ depositView: { id: 9, status: 'Pending' } })
    expect(wrapper.vm.cancellableDepositId).toBe(9)

    wrapper.setData({ depositView: { id: 9, status: 'Paid' } })
    expect(wrapper.vm.cancellableDepositId).toBeNull()
  })
})

// The tail of the journey on this branch. `Events.Settlement` is served by the default (hardcoded
// OFF) flag store, so the settlement machine answers 404 EVENTS_DISABLED — and that must read as the
// gate it is, never as "this event has no settlement".
describe('closing and settling', () => {
  test('a gated close is GATED, not an absent settlement', async () => {
    mockAnswers.CloseEvent = refuse(404, { code: 'EVENTS_DISABLED', detail: 'Events is not enabled for this store.' })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.closeEvent()
    await settled()

    expect(wrapper.vm.settlementFacet.state).toBe(FACET_GATED)
    expect(wrapper.vm.settlementFacet.state).not.toBe(FACET_NO_READ_ENDPOINT)
  })

  // A call that fell over is a third thing again: we DID ask, so "there is no route to ask" would be
  // wrong, and "the gate is closed" would be a claim the server never made.
  test('a close that merely failed is UNKNOWN — neither gated nor unaskable', async () => {
    mockAnswers.CloseEvent = () => Promise.reject(new Error('network down'))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.closeEvent()
    await settled()

    expect(wrapper.vm.settlementFacet.state).toBe(FACET_UNKNOWN)
    expect(wrapper.vm.settlementFacet.state).not.toBe(FACET_GATED)
    expect(wrapper.vm.settlementFacet.state).not.toBe(FACET_NO_READ_ENDPOINT)
  })

  // The positive control: with the flag on, the very same page holds the settlement the close returned.
  test('a close that succeeds holds the settlement it answered with', async () => {
    mockAnswers.CloseEvent = {
      publicId: 'x',
      eventStatus: 'Settling',
      settlement: { id: 3, status: 'Draft', statementTotalMinor: 150000, revision: 'AAAAAAAAB9E=', lines: [] }
    }
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.closeEvent()
    await settled()

    expect(wrapper.vm.settlementFacet.state).toBe(FACET_HELD)
    expect(wrapper.vm.settlementRevision).toBe('AAAAAAAAB9E=')
  })

  test('the revision the close answered with is echoed as the next If-Match', async () => {
    mockAnswers.CloseEvent = {
      eventStatus: 'Settling',
      settlement: { id: 3, status: 'Draft', statementTotalMinor: 0, revision: 'rev-1', lines: [] }
    }
    mockAnswers.ReconcileSettlement = {
      settlement: { id: 3, status: 'Reconciled', statementTotalMinor: 0, revision: 'rev-2', lines: [] },
      mismatchedLineNos: []
    }
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectEvent(7)
    await wrapper.vm.closeEvent()
    await settled()
    await wrapper.vm.reconcile()
    await settled()

    expect(callsOf('ReconcileSettlement')[0][3]).toBe('rev-1')
    // And the answer moves it on, so the close after this one cannot replay a stale token.
    expect(wrapper.vm.settlementRevision).toBe('rev-2')
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
