import { mount } from '@vue/test-utils'
import translations from '~/translations'
import EventsPipeline from '~/components/admin/events/EventsPipeline.vue'
import EventsJourney from '~/components/admin/events/EventsJourney.vue'
import { readListing, readDeposits, readSettlement, readRunSheet } from '~/utils/events/journey'

// The real Norwegian dictionary, resolved the way plugins/i18n.js resolves it, so these tests assert
// the copy a venue actually sees — and fail if a key was never added to no.ts.
const $i = (key, params) => {
  const str = translations.no[key] || key
  return params ? str.replace(/\{(\w+)\}/g, (m, token) => (params[token] != null ? params[token] : m)) : str
}

// The admin's money formatter lives on the global mixin (plugins/global-mixin.js), which resolves
// `priceLabel` out of `~/core/helpers/tools` — a git submodule this repo carries no checkout of, so
// it cannot be imported here. These stand-ins reproduce its shape exactly (minor units in, "kr "
// prefix, space-grouped whole part, comma, two-digit fraction) so the assertions below read as the
// strings a venue sees. What is under test is WHICH figure is rendered, never the grouping.
const wholeAmount = minor => String(Math.trunc(Math.abs(minor) / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const fractionAmount = minor => String(Math.abs(minor) % 100).padStart(2, '0')
const priceLabel = minor => 'kr ' + wholeAmount(minor) + ',' + fractionAmount(minor)

const mocks = { $i, priceLabel, wholeAmount, fractionAmount }

const problem = (status, code) => ({ status, code, message: 'server detail' })

function row (over) {
  return Object.assign({
    id: 1,
    publicId: 'a0000000-0000-0000-0000-000000000001',
    status: 'Inquiry',
    title: 'Julebord',
    eventDate: '2026-08-15T00:00:00',
    guestCountPlanned: 40,
    contactName: 'Kari Nordmann',
    acceptedProposalVersionNo: null,
    createdAtUtc: '2026-07-01T09:00:00'
  }, over)
}

function pipeline (listing, selectedId) {
  return mount(EventsPipeline, { propsData: { listing, locale: 'no', selectedId: selectedId || null }, mocks })
}

// ---- the pipeline ------------------------------------------------------------------------------

describe('the pipeline never says "no enquiries" about a read that did not answer', () => {
  // The positive control the three refusals below are measured against: an ANSWERED empty read does
  // produce the empty sentence, so its absence elsewhere is a real distinction and not a dead branch.
  test('an answered empty read says the venue has none in this selection', () => {
    const text = pipeline(readListing([], null)).text()
    expect(text).toContain(translations.no.ev_pipeline_empty)
  })

  test('EVENTS_DISABLED says the module is off, and does NOT say the list is empty', () => {
    const text = pipeline(readListing(null, problem(404, 'EVENTS_DISABLED'))).text()
    expect(text).toContain(translations.no.ev_pipeline_disabled)
    expect(text).not.toContain(translations.no.ev_pipeline_empty)
  })

  test('403 says the caller cannot read it, and does NOT say the list is empty', () => {
    const text = pipeline(readListing(null, problem(403, null))).text()
    expect(text).toContain(translations.no.ev_pipeline_forbidden)
    expect(text).not.toContain(translations.no.ev_pipeline_empty)
  })

  test('a failed read says so, and does NOT say the list is empty', () => {
    const text = pipeline(readListing(null, problem(500, null))).text()
    expect(text).toContain(translations.no.ev_pipeline_unknown)
    expect(text).not.toContain(translations.no.ev_pipeline_empty)
  })

  test('the four sentences are four different sentences', () => {
    const said = [
      translations.no.ev_pipeline_empty,
      translations.no.ev_pipeline_disabled,
      translations.no.ev_pipeline_forbidden,
      translations.no.ev_pipeline_unknown
    ]
    expect(new Set(said).size).toBe(4)
  })

  test('no table is drawn at all unless the read answered', () => {
    expect(pipeline(readListing(null, problem(404, 'EVENTS_DISABLED'))).find('table').exists()).toBe(false)
    expect(pipeline(readListing([row()], null)).find('table').exists()).toBe(true)
  })
})

describe('the pipeline rows', () => {
  test('an absent accepted-version number is a dash — and a present one is the number', () => {
    const wrapper = pipeline(readListing([
      row({ id: 1, acceptedProposalVersionNo: null }),
      row({ id: 2, acceptedProposalVersionNo: 2 })
    ], null))
    const cells = wrapper.findAll('tbody tr')
    expect(cells.at(0).text()).toContain('—')
    expect(cells.at(1).text()).toContain('2')
  })

  // An event shown on the wrong day is the failure mode that ends trust in this module, so each row's
  // day is asserted to be ITS day and not its neighbour's.
  test('each row lands on its own day, with no timezone applied to a date', () => {
    const wrapper = pipeline(readListing([
      row({ id: 1, eventDate: '2026-08-15T00:00:00' }),
      row({ id: 2, eventDate: '2026-08-16T00:00:00' })
    ], null))
    const rows = wrapper.findAll('tbody tr')
    expect(rows.at(0).find('.ev-pipeline__date').text()).toContain('15')
    expect(rows.at(0).find('.ev-pipeline__date').text()).not.toContain('16')
    expect(rows.at(1).find('.ev-pipeline__date').text()).toContain('16')
    expect(rows.at(1).find('.ev-pipeline__date').text()).not.toContain('15')
  })

  test('a status the surface knows is translated; one it does not is shown verbatim', () => {
    const wrapper = pipeline(readListing([
      row({ id: 1, status: 'ProposalSent' }),
      row({ id: 2, status: 'Marinating' })
    ], null))
    const rows = wrapper.findAll('tbody tr')
    expect(rows.at(0).text()).toContain(translations.no.ev_status_ProposalSent)
    expect(rows.at(1).text()).toContain('Marinating')
    expect(translations.no.ev_status_ProposalSent).not.toBe('Marinating')
  })

  test('selecting a row emits its id rather than navigating', async () => {
    const wrapper = pipeline(readListing([row({ id: 77 })], null))
    await wrapper.find('tbody tr').trigger('click')
    expect(wrapper.emitted('select')).toEqual([[77]])
  })
})

// ---- one event ---------------------------------------------------------------------------------

function detail (over) {
  return Object.assign({
    id: 7,
    publicId: 'a0000000-0000-0000-0000-000000000007',
    storeId: 42,
    status: 'Confirmed',
    title: 'Julebord',
    eventDate: '2026-08-15T00:00:00',
    startTime: '18:30:00',
    endTime: '23:00:00',
    timeZoneId: 'Europe/Oslo',
    guestCountPlanned: 40,
    contactName: 'Kari Nordmann',
    contactEmail: 'kari@example.no',
    contactPhone: null,
    companyName: null,
    source: 'Manual',
    acceptedProposalVersionNo: 1,
    createdAtUtc: '2026-07-01T09:00:00',
    versions: [],
    transitions: []
  }, over)
}

function version (over) {
  return Object.assign({
    versionNo: 1,
    status: 'Accepted',
    currencyCode: 'NOK',
    totalMinor: 500000,
    minimumSpendMinor: 400000,
    roomFeeMinor: 70000,
    depositRequiredMinor: 150000,
    termsText: null,
    expiresAtUtc: null,
    publicToken: 'b0000000-0000-0000-0000-000000000001',
    contentHash: 'hash',
    createdAtUtc: '2026-07-02T09:00:00',
    sentAtUtc: '2026-07-02T10:00:00',
    lines: []
  }, over)
}

// A settlement read as the server shapes it: the envelope, with the settlement inside or null.
const settlementRead = settlement => ({ publicId: 'p', eventStatus: 'Settling', settlement })

function journey (over) {
  const opts = over || {}
  return mount(EventsJourney, {
    propsData: {
      detail: opts.detail || detail(),
      deposits: opts.deposits || readDeposits([], null),
      settlement: opts.settlement || readSettlement(settlementRead(null), null),
      runSheet: opts.runSheet || readRunSheet(null, null),
      locale: 'no',
      currency: opts.currency === undefined ? 'NOK' : opts.currency
    },
    mocks
  })
}

describe('an ANSWERED absence is a different sentence from every way of not knowing', () => {
  // Both facets now have an idempotent GET, so "there is none" is a claim the server made. It must
  // still be told apart from the gate and from a read that fell over.
  test('an answered read with nothing in it says so, and names the absence', () => {
    const text = journey().text()
    expect(text).toContain(translations.no.ev_deposit_none)
    expect(text).toContain(translations.no.ev_settlement_none)
  })

  // The positive control: handed a read that DID hold rows, the same panels render the figures.
  test('a deposit the read returned is rendered in full', () => {
    const text = journey({
      deposits: readDeposits([{
        id: 9,
        status: 'Paid',
        amountMinor: 150000,
        currencyCode: 'NOK',
        paymentType: 'Vipps',
        publicToken: 'c0000000-0000-0000-0000-000000000001',
        requestedAtUtc: '2026-07-03T09:00:00',
        expiresAtUtc: null,
        paidAtUtc: '2026-07-03T10:00:00',
        refundedMinor: 0,
        receipts: []
      }], null)
    }).text()
    expect(text).toContain('kr 1 500,00')
    expect(text).toContain('Vipps')
    expect(text).not.toContain(translations.no.ev_deposit_none)
  })

  // The whole history, because a withdrawn request and its replacement are two facts and the newest
  // is not automatically the relevant one.
  test('every deposit the enquiry has had is drawn, not just the newest', () => {
    const wrapper = journey({
      deposits: readDeposits([
        { id: 8, status: 'Cancelled', amountMinor: 150000, currencyCode: 'NOK', paymentType: 'Vipps', refundedMinor: 0, receipts: [] },
        { id: 9, status: 'Paid', amountMinor: 150000, currencyCode: 'NOK', paymentType: 'Vipps', refundedMinor: 0, receipts: [] }
      ], null)
    })
    expect(wrapper.text()).toContain('Cancelled')
    expect(wrapper.text()).toContain('Paid')
  })

  test('the settlement machine being GATED is not the same sentence as there being none', () => {
    const text = journey({ settlement: readSettlement(null, problem(404, 'EVENTS_DISABLED')) }).text()
    expect(text).toContain(translations.no.ev_settlement_gated)
    expect(text).not.toContain(translations.no.ev_settlement_none)
    expect(translations.no.ev_settlement_gated).not.toBe(translations.no.ev_settlement_none)
  })

  test('and neither is the same sentence as a failed call', () => {
    const text = journey({ settlement: readSettlement(null, problem(409, 'EVENTS_CONFLICT')) }).text()
    expect(text).toContain(translations.no.ev_settlement_unknown)
    expect(text).not.toContain(translations.no.ev_settlement_gated)
    expect(text).not.toContain(translations.no.ev_settlement_none)
  })

  // The run sheet is the one facet that can be asked, so it is the one that can answer "none yet".
  test('the run sheet distinguishes "none generated yet" from "not asked"', () => {
    const none = journey({ runSheet: readRunSheet(null, problem(404, 'EVENTS_RUNSHEET_NOT_FOUND')) }).text()
    expect(none).toContain(translations.no.ev_runsheet_none)

    const unasked = journey({ runSheet: readRunSheet(null, null) }).text()
    expect(unasked).toContain(translations.no.ev_runsheet_unknown)
    expect(unasked).not.toContain(translations.no.ev_runsheet_none)
  })
})

describe('money is read, never assembled', () => {
  // The fixture VARIES the thing under test: the lines sum to kr 300,00 while the server says the
  // total is kr 500,00. A surface that added the lines up would print the wrong one of the two.
  test('a version total is the servers figure, not the sum of the lines on screen', () => {
    const v = version({
      totalMinor: 500000,
      lines: [
        { lineNo: 1, kind: 'Package', description: 'Meny', quantity: 40, unitPriceMinor: 2500, amountMinor: 100000, vatRate: 0.25 },
        { lineNo: 2, kind: 'AddOn', description: 'Drikke', quantity: 40, unitPriceMinor: 5000, amountMinor: 200000, vatRate: 0.25 }
      ]
    })
    const text = journey({ detail: detail({ versions: [v] }) }).text()
    expect(text).toContain('kr 5 000,00')
    expect(text).not.toContain('kr 3 000,00')
  })

  test('the room fee is its own figure and is never folded into the total', () => {
    const text = journey({ detail: detail({ versions: [version({ totalMinor: 500000, roomFeeMinor: 70000 })] }) }).text()
    expect(text).toContain('kr 5 000,00')
    expect(text).toContain('kr 700,00')
    // kr 5 700,00 would be the total with the room fee added in. It is not shown, because the server
    // never said it — and a draft carrying a RoomFee line would then count the fee twice.
    expect(text).not.toContain('kr 5 700,00')
  })

  test('a figure the API priced in another currency keeps that currency and loses the symbol', () => {
    const text = journey({
      detail: detail({ versions: [version({ currencyCode: 'CHF', totalMinor: 500000 })] }),
      currency: 'NOK'
    }).text()
    expect(text).toContain('5 000,00 CHF')
    expect(text).not.toContain('kr 5 000,00')
  })

  test('a settlement line with no truth yet is a dash — while a truth of ZERO is money', () => {
    const text = journey({
      settlement: readSettlement(settlementRead({
        id: 3,
        status: 'Draft',
        statementTotalMinor: 150000,
        reconciledAtUtc: null,
        closedAtUtc: null,
        closedByUserId: null,
        revision: 'AAAAAAAAB9E=',
        lines: [
          { lineNo: 1, kind: 'DepositApplied', sourceKind: 'Deposit', sourceReference: '9', amountMinor: 150000, truthAmountMinor: null, matchState: 'Unverified', note: null, adjustmentReason: null },
          { lineNo: 2, kind: 'PosCheck', sourceKind: 'OrderRef', sourceReference: 'ord-1', amountMinor: 0, truthAmountMinor: 0, matchState: 'Matched', note: null, adjustmentReason: null }
        ]
      }), null)
    }).text()
    const cells = journey({
      settlement: readSettlement(settlementRead({
        id: 3,
        status: 'Draft',
        statementTotalMinor: 150000,
        reconciledAtUtc: null,
        closedAtUtc: null,
        closedByUserId: null,
        revision: null,
        lines: [
          { lineNo: 1, kind: 'DepositApplied', sourceKind: 'Deposit', sourceReference: '9', amountMinor: 150000, truthAmountMinor: null, matchState: 'Unverified' },
          { lineNo: 2, kind: 'PosCheck', sourceKind: 'OrderRef', sourceReference: 'ord-1', amountMinor: 0, truthAmountMinor: 0, matchState: 'Matched' }
        ]
      }), null)
    }).findAll('tbody tr')

    // An unverified line must not read as matched at its own recorded amount, and must not read as 0.
    expect(cells.at(0).text()).toContain('—')
    expect(cells.at(1).text()).toContain('kr 0,00')
    expect(text).toContain('kr 1 500,00')
  })

  test('the statement total is shown, and no balance is netted off it', () => {
    const wrapper = journey({
      settlement: readSettlement(settlementRead({
        id: 3,
        status: 'Draft',
        statementTotalMinor: 150000,
        reconciledAtUtc: null,
        closedAtUtc: null,
        closedByUserId: null,
        revision: null,
        lines: []
      }), null)
    })
    expect(wrapper.text()).toContain('kr 1 500,00')
    expect(wrapper.text()).toContain(translations.no.ev_settlement_no_balance)
  })

  test('and no outstanding deposit figure is worked out either', () => {
    const wrapper = journey({
      deposits: readDeposits([{
        id: 9,
        status: 'PartiallyRefunded',
        amountMinor: 150000,
        currencyCode: 'NOK',
        paymentType: 'Vipps',
        publicToken: null,
        requestedAtUtc: '2026-07-03T09:00:00',
        expiresAtUtc: null,
        paidAtUtc: '2026-07-03T10:00:00',
        refundedMinor: 50000,
        receipts: []
      }], null)
    })
    expect(wrapper.text()).toContain('kr 1 500,00')
    expect(wrapper.text()).toContain('kr 500,00')
    // kr 1 000,00 is amount − refunded. The backend computes it internally and never exposes it.
    expect(wrapper.text()).not.toContain('kr 1 000,00')
    expect(wrapper.text()).toContain(translations.no.ev_deposit_no_net)
  })
})

describe('an event is a dated thing', () => {
  test('a bare wire stamp is placed in the VENUE zone, not read as browser-local', () => {
    // 23:30 UTC on the 15th is 01:30 on the 16th in Oslo. Read as browser-local (the b65501c defect)
    // it would print 23:30 on the 15th, because this suite runs with TZ=Europe/Oslo.
    const text = journey({ detail: detail({ createdAtUtc: '2026-08-15T23:30:00' }) }).text()
    expect(text).toContain('01:30')
    expect(text).not.toContain('23:30')
  })

  test('without the venue zone an instant is withheld rather than shown in the browsers', () => {
    const text = journey({ detail: detail({ timeZoneId: null, createdAtUtc: '2026-08-15T23:30:00' }) }).text()
    expect(text).not.toContain('01:30')
    expect(text).not.toContain('23:30')
  })

  test('the event date itself is never converted', () => {
    expect(journey({ detail: detail({ eventDate: '2026-08-15T00:00:00' }) }).text()).toContain('15. august 2026')
    expect(journey({ detail: detail({ eventDate: '2026-08-16T00:00:00' }) }).text()).toContain('16. august 2026')
    // The falsifying case. A date column normally arrives at midnight, so a surface that pushed it
    // through a zone would still show the right day and nobody would notice — until it did not. Read
    // as an instant and printed in Oslo, this value lands on the 16th; sliced, it stays the 15th.
    expect(journey({ detail: detail({ eventDate: '2026-08-15T23:00:00' }) }).text()).toContain('15. august 2026')
    expect(journey({ detail: detail({ eventDate: '2026-08-15T23:00:00' }) }).text()).not.toContain('16. august 2026')
  })

  test('a multi-day TimeSpan is refused rather than printed on the wrong day', () => {
    expect(journey({ detail: detail({ startTime: '18:30:00', endTime: '23:00:00' }) }).text()).toContain('18:30–23:00')
    // 26 hours: rendering "02:00" would put the end of the party on a day it does not fall on.
    expect(journey({ detail: detail({ startTime: '18:30:00', endTime: '1.02:00:00' }) }).text()).toContain('18:30–—')
  })
})

describe('an absent author renders honestly', () => {
  const settlementWith = closedByUserId => readSettlement(settlementRead({
    id: 3,
    status: 'Closed',
    statementTotalMinor: 0,
    reconciledAtUtc: null,
    closedAtUtc: '2026-08-16T09:00:00',
    closedByUserId,
    revision: null,
    lines: []
  }), null)

  // Rows written before the claim fix in a69edf41 carry a null author while their action genuinely
  // happened, so this is an ordinary value — not a defect to dress up as a user.
  test('a null author is "no author recorded", never "Unknown user" and never blank', () => {
    const text = journey({ settlement: settlementWith(null) }).text()
    expect(text).toContain(translations.no.ev_author_none)
    expect(text.toLowerCase()).not.toContain('ukjent bruker')
    expect(text.toLowerCase()).not.toContain('unknown')
  })

  test('a present author shows the reference the API actually exposes, labelled as one', () => {
    const text = journey({ settlement: settlementWith('4f2a-9c11') }).text()
    expect(text).toContain('4f2a-9c11')
    expect(text).not.toContain(translations.no.ev_author_none)
  })
})

describe('the rail refuses to guess', () => {
  test('a reported status lights exactly its own node', () => {
    const wrapper = journey({ detail: detail({ status: 'Confirmed' }) })
    const current = wrapper.findAll('.ev-journey__node--current')
    expect(current.length).toBe(1)
    expect(current.at(0).text()).toBe(translations.no.ev_status_Confirmed)
  })

  test('a status the server did not report lights nothing, and says why', () => {
    const wrapper = journey({ detail: detail({ status: null }) })
    expect(wrapper.findAll('.ev-journey__node--current').length).toBe(0)
    expect(wrapper.findAll('.ev-journey__node--done').length).toBe(0)
    expect(wrapper.text()).toContain(translations.no.ev_status_absent_note)
  })

  test('a status the server reported but this surface does not know lights nothing either', () => {
    const wrapper = journey({ detail: detail({ status: 'Marinating' }) })
    expect(wrapper.findAll('.ev-journey__node--current').length).toBe(0)
    expect(wrapper.text()).toContain('Marinating')
  })
})

describe('the dietary field says unanswered, never "none"', () => {
  test('an empty field reads as nobody having answered, and names it as not a confirmation', () => {
    const text = journey().text()
    expect(text).toContain(translations.no.ev_dietary_unstated)
    // The sentence the run sheet used to print unconditionally, in any language, must not appear.
    expect(text).not.toContain('Ingen allergier')
    expect(text).not.toContain('No dietary')
  })

  test('a recorded statement is shown whole, beside the sheet it will print on', () => {
    const text = journey({
      detail: detail({ dietary: { eventId: 7, statement: 'Coeliac + nut allergy (EpiPen), table 3.', statedAtUtc: '2026-08-01T09:00:00Z' } })
    }).text()
    expect(text).toContain('Coeliac + nut allergy (EpiPen), table 3.')
    expect(text).not.toContain(translations.no.ev_dietary_unstated)
  })
})

// The finding this block exists for: four causes fold into `isStale`, and the ONE sentence the
// kitchen sees blames the proposal version. When the real cause is an allergy recorded after the
// paper was printed, that sentence sends a cook to reprint paperwork rather than to the allergen.
describe('the staleness banner names a post-composition dietary statement as its own cause', () => {
  const heldSheet = over => readRunSheet(Object.assign({
    versionNo: 1,
    status: 'Issued',
    generatedFromProposalVersionNo: 2,
    operativeProposalVersionNo: 2,
    issuedByUserId: 'u-1',
    createdAtUtc: '2026-08-01T09:00:00',
    issuedAtUtc: '2026-08-01T09:05:00',
    isStale: true,
    items: []
  }, over), null)

  test('the dietary cause is on screen in its own words, with when it was recorded', () => {
    const wrapper = journey({
      detail: detail({ dietary: { statement: 'Nut allergy, table 3', statedAtUtc: '2026-08-01T11:00:00' } }),
      runSheet: heldSheet()
    })
    const line = wrapper.find('[data-test="runsheet-stale-dietary"]')
    expect(line.exists()).toBe(true)
    expect(line.text()).toContain('allergi eller kosthold')
    // The stamp is placed in the VENUE's zone by the same formatter as every other instant here.
    expect(line.text()).toContain('13:00')
    expect(wrapper.find('[data-test="runsheet-stale-note"]').exists()).toBe(false)
  })

  // The shared sentence is left exactly as it was. It is not reworded to cover four causes — a
  // sentence that covers everything names nothing — and it is not suppressed either, because
  // `isStale` is the server's boolean and this surface does not overrule it.
  test('the shared version sentence is untouched and still shown beside it', () => {
    const wrapper = journey({
      detail: detail({ dietary: { statement: 'Nut allergy', statedAtUtc: '2026-08-01T11:00:00' } }),
      runSheet: heldSheet()
    })
    expect(wrapper.find('[data-test="runsheet-stale"]').text()).toBe(translations.no.ev_runsheet_stale)
    expect(wrapper.find('[data-test="runsheet-stale-dietary"]').exists()).toBe(true)
  })

  test('a later note gets the weaker sentence, and never the allergy one', () => {
    const wrapper = journey({
      detail: detail({ notes: [{ id: 1, body: 'Ringte kunden', createdAtUtc: '2026-08-01T10:00:00' }] }),
      runSheet: heldSheet()
    })
    expect(wrapper.find('[data-test="runsheet-stale-dietary"]').exists()).toBe(false)
    const note = wrapper.find('[data-test="runsheet-stale-note"]')
    expect(note.exists()).toBe(true)
    expect(note.text()).toContain('1 nye notater')
  })

  test('a sheet nothing has moved under carries neither extra line', () => {
    const wrapper = journey({
      detail: detail({ dietary: { statement: 'Nut allergy', statedAtUtc: '2026-07-31T11:00:00' } }),
      runSheet: heldSheet({ isStale: false })
    })
    expect(wrapper.find('[data-test="runsheet-stale-dietary"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="runsheet-stale-note"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="runsheet-stale"]').exists()).toBe(false)
  })

  // The comparison the dietary line asserts has to be checkable by the person reading it, and the
  // issue time already on the sheet is NOT the stamp the rule uses.
  test('the composition time is a field of its own, distinct from the issue time', () => {
    const text = journey({ runSheet: heldSheet() }).text()
    expect(text).toContain(translations.no.ev_runsheet_composed)
    expect(text).toContain('11:00') // composed 09:00Z
    expect(text).toContain('11:05') // issued 09:05Z
  })

  test('no sheet in hand means no claim about drift in either direction', () => {
    const wrapper = journey({
      detail: detail({ dietary: { statement: 'Nut allergy', statedAtUtc: '2026-08-01T11:00:00' } }),
      runSheet: readRunSheet(null, problem(404, 'EVENTS_RUNSHEET_NOT_FOUND'))
    })
    expect(wrapper.find('[data-test="runsheet-stale-dietary"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="runsheet-stale-note"]').exists()).toBe(false)
  })
})

describe('the proposal link is a handover, because nothing sends it', () => {
  test('the token is shown with the reason it has to be handed over', () => {
    const text = journey({ detail: detail({ versions: [version()] }) }).text()
    expect(text).toContain('b0000000-0000-0000-0000-000000000001')
    expect(text).toContain(translations.no.ev_handover_note)
  })
})

// ---- the copy ----------------------------------------------------------------------------------

describe('every ev_ key exists in all three dictionaries', () => {
  const keys = Object.keys(translations.no).filter(k => k.indexOf('ev_') === 0)

  test('the block is the size this surface needs', () => {
    expect(keys.length).toBeGreaterThan(100)
  })

  test('no key is missing from en or de, and none is a non-string', () => {
    for (const key of keys) {
      expect(typeof translations.no[key]).toBe('string')
      expect(typeof translations.en[key]).toBe('string')
      expect(typeof translations.de[key]).toBe('string')
    }
  })

  test('and neither dictionary carries an ev_ key the Norwegian one lacks', () => {
    for (const locale of ['en', 'de']) {
      const extra = Object.keys(translations[locale])
        .filter(k => k.indexOf('ev_') === 0 && !keys.includes(k))
      expect(extra).toEqual([])
    }
  })

  // The sentences whose whole job is to be different from one another.
  test('the honest-state sentences are all distinct in all three languages', () => {
    const distinguishing = [
      'ev_pipeline_empty', 'ev_pipeline_disabled', 'ev_pipeline_forbidden', 'ev_pipeline_unknown',
      'ev_settlement_none', 'ev_settlement_gated', 'ev_settlement_unknown',
      'ev_deposit_none', 'ev_deposit_gated', 'ev_deposit_unknown',
      'ev_runsheet_none', 'ev_runsheet_unknown'
    ]
    for (const locale of ['no', 'en', 'de']) {
      const said = distinguishing.map(k => translations[locale][k])
      expect(new Set(said).size).toBe(distinguishing.length)
    }
  })
})
