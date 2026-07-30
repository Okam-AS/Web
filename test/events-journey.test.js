import {
  READ_UNKNOWN,
  READ_DISABLED,
  READ_FORBIDDEN,
  READ_ANSWERED,
  FACET_GATED,
  FACET_UNKNOWN,
  FACET_HELD,
  FACET_NONE,
  STATUS_REPORTED,
  STATUS_ABSENT,
  STATUS_UNRECOGNISED,
  AUTHOR_NONE,
  AUTHOR_REFERENCE,
  PHASE_SEQUENCE,
  DEPOSIT_RAILS_WIRED,
  DEPOSIT_RAILS_UNWIRED,
  CANCELLABLE_DEPOSIT_STATUSES,
  REFUNDABLE_DEPOSIT_STATUSES,
  readListing,
  readDetail,
  readDeposits,
  readSettlement,
  readNotificationHealth,
  readRunSheet,
  actionableDeposit,
  readEventStatus,
  buildPhaseRail,
  readAuthor,
  readMinor,
  parseMinorUnits,
  eventDateKey,
  clockLabel,
  readInstant,
  proposalExpiryParam
} from '~/utils/events/journey'

// A typed failure the way `EventsApiError` presents one. Built here rather than imported so these
// tests fail if the model starts depending on something other than `status` + `code`.
const problem = (status, code) => ({ status, code, message: 'detail from the server' })

describe('a listing that carries no rows — four answers, never one', () => {
  test('a read that answered with an empty array is a TRUE empty', () => {
    const listing = readListing([], null)
    expect(listing.state).toBe(READ_ANSWERED)
    expect(listing.rows).toEqual([])
  })

  // The positive control for the three below: the same function, on a real answer, does produce rows.
  test('a read that answered with rows produces them', () => {
    const listing = readListing([{ id: 1 }], null)
    expect(listing.state).toBe(READ_ANSWERED)
    expect(listing.rows).toHaveLength(1)
  })

  test('EVENTS_DISABLED is a configuration fact, and carries NO rows to count', () => {
    const listing = readListing(null, problem(404, 'EVENTS_DISABLED'))
    expect(listing.state).toBe(READ_DISABLED)
    // `rows` is null rather than `[]` on purpose: a caller reading `.length` cannot render "0".
    expect(listing.rows).toBeNull()
  })

  test('403 is the caller, not the data', () => {
    const listing = readListing(null, problem(403, null))
    expect(listing.state).toBe(READ_FORBIDDEN)
    expect(listing.rows).toBeNull()
  })

  test('anything else is unknown, and unknown is not empty', () => {
    expect(readListing(null, problem(500, null)).state).toBe(READ_UNKNOWN)
    // A 200 whose body is not a list did not answer the question that was asked.
    expect(readListing({ items: [] }, null).state).toBe(READ_UNKNOWN)
    expect(readListing({ items: [] }, null).rows).toBeNull()
  })

  test('the four states are four distinct values', () => {
    const states = [READ_ANSWERED, READ_DISABLED, READ_FORBIDDEN, READ_UNKNOWN]
    expect(new Set(states).size).toBe(4)
  })
})

describe('readDetail — the same axis for a single object', () => {
  test('an object is an answer; a non-object is not', () => {
    expect(readDetail({ id: 4, status: 'Inquiry' }, null).state).toBe(READ_ANSWERED)
    expect(readDetail(null, null).state).toBe(READ_UNKNOWN)
    expect(readDetail('', null).view).toBeNull()
  })

  test('it keeps the code so the surface can say WHICH refusal it was', () => {
    const read = readDetail(null, problem(404, 'EVENTS_NOT_FOUND'))
    expect(read.code).toBe('EVENTS_NOT_FOUND')
  })
})

// The settlement's absence dialect is a 200 whose `settlement` field is null. That is the server's
// own statement that there is none — as distinct from the gate, from a failure, and from not having
// asked, which are three ways of not knowing.
describe('the settlement read', () => {
  const envelope = settlement => ({ publicId: 'p', eventStatus: 'Settling', settlement })

  test('a 200 carrying a settlement holds it, with its revision', () => {
    const facet = readSettlement(envelope({ id: 3, status: 'Draft', revision: 'rev-1' }), null)
    expect(facet.state).toBe(FACET_HELD)
    expect(facet.view.revision).toBe('rev-1')
  })

  test('a 200 whose settlement is null is NONE — an answered absence, not an unknown', () => {
    const facet = readSettlement(envelope(null), null)
    expect(facet.state).toBe(FACET_NONE)
    expect(facet.view).toBeNull()
    expect(FACET_NONE).not.toBe(FACET_UNKNOWN)
  })

  // A null revision is what a SQLite host answers, and it is ordinary. The settlement is still HELD:
  // treating a missing rowversion as "no settlement" would blank the whole tab on every local run.
  test('a settlement whose revision is null is still a settlement', () => {
    const facet = readSettlement(envelope({ id: 3, status: 'Draft', revision: null }), null)
    expect(facet.state).toBe(FACET_HELD)
    expect(facet.view.revision).toBeNull()
  })

  test('not yet asked is unknown, and so is a 200 that is not this shape at all', () => {
    expect(readSettlement(null, null).state).toBe(FACET_UNKNOWN)
    expect(readSettlement('nonsense', null).state).toBe(FACET_UNKNOWN)
  })

  test('EVENTS_DISABLED is gated, and any other refusal is unknown', () => {
    expect(readSettlement(null, problem(404, 'EVENTS_DISABLED')).state).toBe(FACET_GATED)
    expect(readSettlement(null, problem(409, 'EVENTS_CONFLICT')).state).toBe(FACET_UNKNOWN)
    expect(FACET_GATED).not.toBe(FACET_UNKNOWN)
  })

  test('an error never leaves a view behind', () => {
    expect(readSettlement({ settlement: { id: 3 } }, problem(409, 'EVENTS_CONFLICT')).view).toBeNull()
  })
})

// The deposit's dialect is an empty list, and the list is kept as one.
describe('the deposit read', () => {
  test('an empty list is NONE, and a populated one is HELD with every row', () => {
    expect(readDeposits([], null).state).toBe(FACET_NONE)
    const held = readDeposits([{ id: 8, status: 'Cancelled' }, { id: 9, status: 'Paid' }], null)
    expect(held.state).toBe(FACET_HELD)
    expect(held.rows).toHaveLength(2)
  })

  test('an empty list still carries an array, so a caller can count zero without a null check', () => {
    expect(readDeposits([], null).rows).toEqual([])
    // …whereas not knowing carries no array at all, so "0 deposits" cannot be printed over it.
    expect(readDeposits(null, null).rows).toBeNull()
    expect(readDeposits(null, problem(500, null)).rows).toBeNull()
  })

  test('a 200 that is not an array is unknown, never an empty list', () => {
    expect(readDeposits({ id: 9 }, null).state).toBe(FACET_UNKNOWN)
  })

  test('EVENTS_DISABLED is gated', () => {
    expect(readDeposits(null, problem(404, 'EVENTS_DISABLED')).state).toBe(FACET_GATED)
  })
})

// Which deposit an action applies to is decided by STATUS, never by position.
describe('the deposit an action applies to', () => {
  const rows = [
    { id: 8, status: 'Cancelled' },
    { id: 9, status: 'Pending' },
    { id: 10, status: 'Expired' }
  ]

  test('cancel finds the unpaid request wherever it sits in the history', () => {
    expect(actionableDeposit(rows, CANCELLABLE_DEPOSIT_STATUSES).id).toBe(9)
    // The newest row is Expired. Picking by position would have named it.
    expect(rows[rows.length - 1].id).toBe(10)
  })

  test('refund finds a paid, partially refunded or quarantined one — and nothing else', () => {
    for (const status of ['Paid', 'PartiallyRefunded', 'Quarantined']) {
      expect(actionableDeposit([{ id: 1, status }], REFUNDABLE_DEPOSIT_STATUSES).id).toBe(1)
    }
    for (const status of ['Pending', 'Refunded', 'Forfeited', 'Expired', 'Failed']) {
      expect(actionableDeposit([{ id: 1, status }], REFUNDABLE_DEPOSIT_STATUSES)).toBeNull()
    }
  })

  test('no rows, or rows not yet read, name nothing — an id is never guessed', () => {
    expect(actionableDeposit([], CANCELLABLE_DEPOSIT_STATUSES)).toBeNull()
    expect(actionableDeposit(null, CANCELLABLE_DEPOSIT_STATUSES)).toBeNull()
  })

  // The server's invariant is one active deposit at a time. Two matching rows means it broke, and
  // choosing one of them would act on money while hiding that.
  test('two candidates name none rather than picking one', () => {
    const twoPending = [{ id: 9, status: 'Pending' }, { id: 11, status: 'Pending' }]
    expect(actionableDeposit(twoPending, CANCELLABLE_DEPOSIT_STATUSES)).toBeNull()
  })
})

// The envelope is the answer. An empty dead-letter list means two opposite things depending on
// whether the drain is running at all, so there is no NONE state here to collapse them into.
describe('the notification health read', () => {
  test('an answered read is held whatever it contains, including empty', () => {
    const off = readNotificationHealth({ dispatchEnabled: false, queuedCount: 12, deadLetteredCount: 0, deadLettered: [] }, null)
    expect(off.state).toBe(FACET_HELD)
    expect(off.view.dispatchEnabled).toBe(false)
    expect(off.view.queuedCount).toBe(12)
  })

  test('a body without the dispatch flag is unknown — the flag is what makes an empty list legible', () => {
    expect(readNotificationHealth({ deadLettered: [] }, null).state).toBe(FACET_UNKNOWN)
    expect(readNotificationHealth(null, null).state).toBe(FACET_UNKNOWN)
  })

  test('EVENTS_DISABLED is gated, not "nothing is wrong"', () => {
    expect(readNotificationHealth(null, problem(404, 'EVENTS_DISABLED')).state).toBe(FACET_GATED)
  })
})

describe('the run sheet says "there is none" with a code of its own', () => {
  test('EVENTS_RUNSHEET_NOT_FOUND is an answer, not a failure', () => {
    expect(readRunSheet(null, problem(404, 'EVENTS_RUNSHEET_NOT_FOUND')).state).toBe(FACET_NONE)
  })

  // The three facets answer "there is none" in three different dialects, and one reader cannot serve
  // them all: the run sheet's own 404 code means nothing to the other two.
  test('the run sheet code means nothing to the settlement or the deposit reader', () => {
    const notFound = problem(404, 'EVENTS_RUNSHEET_NOT_FOUND')
    expect(readRunSheet(null, notFound).state).toBe(FACET_NONE)
    expect(readSettlement(null, notFound).state).toBe(FACET_UNKNOWN)
    expect(readDeposits(null, notFound).state).toBe(FACET_UNKNOWN)
  })

  test('not yet asked is unknown, not none — an absence must be established, not assumed', () => {
    expect(readRunSheet(null, null).state).toBe(FACET_UNKNOWN)
    expect(readRunSheet({ versionNo: 1 }, null).state).toBe(FACET_HELD)
  })
})

describe('the lifecycle status is READ, never inferred', () => {
  test('a reported status resolves to its phase', () => {
    const read = readEventStatus('Confirmed')
    expect(read.state).toBe(STATUS_REPORTED)
    expect(read.index).toBe(PHASE_SEQUENCE.indexOf('Confirmed'))
  })

  test('NO status is not the first phase', () => {
    for (const absent of [undefined, null, '']) {
      const read = readEventStatus(absent)
      expect(read.state).toBe(STATUS_ABSENT)
      expect(read.status).toBeNull()
      expect(read.index).toBeNull()
    }
  })

  test('a status this surface does not know is kept verbatim, never mapped to a neighbour', () => {
    const read = readEventStatus('Marinating')
    expect(read.state).toBe(STATUS_UNRECOGNISED)
    expect(read.status).toBe('Marinating')
    expect(read.index).toBeNull()
  })

  test('the terminal off-ramps leave the rail rather than sit on it', () => {
    for (const status of ['Lost', 'Cancelled']) {
      const read = readEventStatus(status)
      expect(read.isOffRamp).toBe(true)
      expect(read.index).toBeNull()
    }
  })
})

describe('the phase rail', () => {
  test('exactly one node is current, and it is the reported one', () => {
    const rail = buildPhaseRail('DepositPending')
    expect(rail.filter(n => n.state === 'current').map(n => n.phase)).toEqual(['DepositPending'])
    expect(rail.filter(n => n.state === 'done').map(n => n.phase))
      .toEqual(['Inquiry', 'Proposing', 'ProposalSent', 'Accepted'])
  })

  // Positive control on the negative case: the rail above DOES light up, so a dark rail below is the
  // refusal to guess and not a broken builder.
  test('an absent, unrecognised or off-ramp status lights NOTHING', () => {
    for (const status of [null, 'Marinating', 'Cancelled']) {
      const rail = buildPhaseRail(status)
      expect(rail.filter(n => n.state !== 'ahead')).toEqual([])
      expect(rail).toHaveLength(PHASE_SEQUENCE.length)
    }
  })
})

describe('an absent author is an ordinary value', () => {
  test('a null author is "none" — not an empty string and not a stand-in user', () => {
    for (const empty of [null, undefined, '', '   ']) {
      const author = readAuthor(empty)
      expect(author.state).toBe(AUTHOR_NONE)
      expect(author.reference).toBeNull()
    }
  })

  test('a present author is an opaque REFERENCE, kept exactly as the server sent it', () => {
    const author = readAuthor('  9a1f-user  ')
    expect(author.state).toBe(AUTHOR_REFERENCE)
    expect(author.reference).toBe('9a1f-user')
  })
})

describe('money is read, and read as integers', () => {
  test('an integer minor amount passes through, INCLUDING zero', () => {
    expect(readMinor(0)).toBe(0)
    expect(readMinor(123450)).toBe(123450)
    expect(readMinor(-500)).toBe(-500)
  })

  test('a missing or non-integer amount is unknown, never rounded into existence', () => {
    expect(readMinor(null)).toBeNull()
    expect(readMinor(undefined)).toBeNull()
    expect(readMinor(12.5)).toBeNull()
    expect(readMinor('1200')).toBeNull()
    expect(readMinor(NaN)).toBeNull()
  })

  // Zero and unknown are the pair this module must never collapse, so they are asserted as a pair.
  test('zero and unknown are different answers', () => {
    expect(readMinor(0)).not.toBe(readMinor(null))
  })
})

describe('operator-typed money → minor units, without floating point', () => {
  test('the float trap is real, and this parser does not fall into it', () => {
    // What a naive `amount * 100` does to two utterly ordinary prices — 29 øre and kr 1,13:
    expect(Math.trunc(0.29 * 100)).toBe(28)
    expect(Math.trunc(1.13 * 100)).toBe(112)
    // What string arithmetic does with the same two:
    expect(parseMinorUnits('0.29')).toBe(29)
    expect(parseMinorUnits('1.13')).toBe(113)
    expect(parseMinorUnits('1234.56')).toBe(123456)
  })

  test('the ordinary cases', () => {
    expect(parseMinorUnits('10')).toBe(1000)
    expect(parseMinorUnits('0.05')).toBe(5)
    expect(parseMinorUnits('0')).toBe(0)
    expect(parseMinorUnits('1 234,50')).toBe(123450)
    expect(parseMinorUnits('-12.50')).toBe(-1250)
  })

  test('anything it cannot read is REFUSED, never coerced to a number nobody typed', () => {
    for (const bad of ['', '   ', 'abc', '1.234', '12,345', '1.2.3', '1e3', null, undefined, '--5']) {
      expect(parseMinorUnits(bad)).toBeNull()
    }
  })
})

describe('an event is a dated thing', () => {
  test('the event date is SLICED, never converted', () => {
    // A UTC→local conversion of this value moves it to the 16th in Oslo; a local→UTC conversion moves
    // it to the 14th west of Greenwich. It does neither, because it applies no zone at all.
    expect(eventDateKey('2026-08-15T23:00:00')).toBe('2026-08-15')
    expect(eventDateKey('2026-08-15T00:00:00')).toBe('2026-08-15')
  })

  test('and it tracks the day it was given', () => {
    expect(eventDateKey('2026-08-16T00:00:00')).toBe('2026-08-16')
    expect(eventDateKey(null)).toBeNull()
    expect(eventDateKey(123)).toBeNull()
  })

  test('a bare wire stamp is read as UTC, not as browser-local', () => {
    // Under TZ=Europe/Oslo `new Date('2026-08-15T23:30:00')` is 21:30Z. This is the defect fixed in
    // b65501c, stated as an assertion.
    expect(readInstant('2026-08-15T23:30:00').toISOString()).toBe('2026-08-15T23:30:00.000Z')
    expect(new Date('2026-08-15T23:30:00').toISOString()).not.toBe('2026-08-15T23:30:00.000Z')
  })

  test('a zoned stamp keeps its zone, and nothing unparseable becomes an epoch', () => {
    expect(readInstant('2026-08-15T23:30:00Z').toISOString()).toBe('2026-08-15T23:30:00.000Z')
    expect(readInstant(null)).toBeNull()
    expect(readInstant('not a date')).toBeNull()
  })
})

describe('a clock time inside the event day', () => {
  test('a same-day TimeSpan reads as HH:mm', () => {
    expect(clockLabel('18:30:00')).toBe('18:30')
    expect(clockLabel('9:05:00')).toBe('09:05')
    expect(clockLabel('00:00:00')).toBe('00:00')
  })

  test('a multi-day or impossible TimeSpan is refused rather than shown on the wrong day', () => {
    // `1.02:00:00` is 26 hours. Rendering it as "02:00" would put it on a day it does not fall on.
    expect(clockLabel('1.02:00:00')).toBeNull()
    expect(clockLabel('25:00:00')).toBeNull()
    expect(clockLabel('18:70:00')).toBeNull()
    expect(clockLabel(null)).toBeNull()
    expect(clockLabel('')).toBeNull()
  })
})

describe('the proposal expiry is the venue day, not the browser day', () => {
  test('midnight in Oslo is a different instant in summer and in winter', () => {
    const summer = proposalExpiryParam('Europe/Oslo', '2026-08-15')
    const winter = proposalExpiryParam('Europe/Oslo', '2026-01-15')
    // CEST is UTC+2, CET is UTC+1 — the offsets differ, so the two stamps must differ in shape.
    expect(summer).toBe('2026-08-14T22:00:00')
    expect(winter).toBe('2026-01-14T23:00:00')
  })

  test('a different venue zone gives a different instant for the same day', () => {
    const oslo = proposalExpiryParam('Europe/Oslo', '2026-08-15')
    const utc = proposalExpiryParam('UTC', '2026-08-15')
    expect(utc).toBe('2026-08-15T00:00:00')
    expect(oslo).not.toBe(utc)
  })

  test('without the venue zone, or without a day, nothing is sent', () => {
    expect(proposalExpiryParam(null, '2026-08-15')).toBeNull()
    expect(proposalExpiryParam('Europe/Oslo', '')).toBeNull()
    expect(proposalExpiryParam('Europe/Oslo', '15.08.2026')).toBeNull()
  })
})

describe('the deposit rails this branch actually carries', () => {
  // Both halves of a rail were checked in the backend before this list was written: Stripe/Dintero
  // throw EVENTS_PAYMENT_PROVIDER at `Initiate`, and only VippsController dispatches to the
  // completion sink. The list is asserted so a later edit that "adds Stripe back" fails here first.
  test('exactly one rail is offered, and it is Vipps', () => {
    expect(DEPOSIT_RAILS_WIRED).toEqual(['Vipps'])
  })

  test('the unwired rails are named rather than quietly dropped', () => {
    expect(DEPOSIT_RAILS_UNWIRED).toEqual(['Stripe', 'Dintero'])
    for (const rail of DEPOSIT_RAILS_UNWIRED) {
      expect(DEPOSIT_RAILS_WIRED).not.toContain(rail)
    }
  })
})
