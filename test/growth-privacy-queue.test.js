import {
  readQueue, resolveRefusal, dueAt,
  QUEUE_UNKNOWN, QUEUE_READ,
  OUTCOME_FULFILLED, OUTCOME_REJECTED,
  REFUSAL_INVALID_OUTCOME, REFUSAL_REASON_REQUIRED,
  OPEN_STATES, RESOLVED_STATES
} from '~/utils/growth/privacy-queue'

// The clock every deadline below is measured against. Injected rather than ambient, so the
// arithmetic these tests pin is the module's and not today's date.
const NOW = new Date('2026-08-01T10:00:00Z')

function item (overrides) {
  return Object.assign({
    requestId: 900,
    contactPointId: 5501,
    requestType: 'Erasure',
    state: 'Received',
    receivedAt: '2026-07-20T08:00:00Z',
    resolvedAt: null,
    noticeDelivery: null
  }, overrides || {})
}

function list (items, storeId) {
  return { storeId: storeId === undefined ? 42 : storeId, requests: items }
}

describe('the article 12 deadline', () => {
  // The guest is told «the venue has one month to answer you. That follows from GDPR article 12.»
  // Nothing on the wire carries that date. If this arithmetic is wrong, the venue's whole queue is
  // counting down to the wrong day and the promise on the guest's screen is the only correct one.
  test('is one calendar month from receipt, not thirty days', () => {
    expect(dueAt('2026-01-15T09:00:00Z').toISOString()).toBe('2026-02-15T09:00:00.000Z')
    // Thirty days from 15 January is 14 February. A month is not.
    expect(dueAt('2026-01-15T09:00:00Z').getTime())
      .not.toBe(new Date('2026-01-15T09:00:00Z').getTime() + 30 * 24 * 3600 * 1000)
  })

  test('clamps to the last day of the target month rather than rolling over', () => {
    // Reg. 1182/71 art. 3(2)(c): 31 January + one month is 28 February, NOT 3 March. A rollover
    // would hand the venue two days of headroom it does not have.
    expect(dueAt('2026-01-31T09:00:00Z').toISOString()).toBe('2026-02-28T09:00:00.000Z')
    expect(dueAt('2026-03-31T09:00:00Z').toISOString()).toBe('2026-04-30T09:00:00.000Z')
  })

  test('crosses the year boundary', () => {
    expect(dueAt('2026-12-31T09:00:00Z').toISOString()).toBe('2027-01-31T09:00:00.000Z')
  })

  test('is null — never today — when the receipt time cannot be read', () => {
    expect(dueAt(null)).toBeNull()
    expect(dueAt('not a date')).toBeNull()
  })
})

describe('readQueue — an unanswered read is UNKNOWN, never an empty queue', () => {
  test('a null body reports unknown with null counts', () => {
    const queue = readQueue(null, NOW)
    expect(queue.state).toBe(QUEUE_UNKNOWN)
    // Null and not 0. «Nobody has asked» and «we could not find out» call for opposite actions from
    // a venue under a one-month clock.
    expect(queue.total).toBeNull()
    expect(queue.overdueCount).toBeNull()
    expect(queue.open).toEqual([])
  })

  test('a body with no requests array is unknown, not empty', () => {
    expect(readQueue({ storeId: 42 }, NOW).state).toBe(QUEUE_UNKNOWN)
  })

  test('an answered EMPTY list is READ with a zero count — a different fact', () => {
    const queue = readQueue(list([]), NOW)
    expect(queue.state).toBe(QUEUE_READ)
    expect(queue.total).toBe(0)
    expect(queue.overdueCount).toBe(0)
  })
})

describe('readQueue — the open/resolved split', () => {
  test('Received and InProgress are open; Fulfilled and RejectedWithReason are not', () => {
    const queue = readQueue(list([
      item({ requestId: 1, state: 'Received' }),
      item({ requestId: 2, state: 'InProgress' }),
      item({ requestId: 3, state: 'Fulfilled', resolvedAt: '2026-07-25T08:00:00Z' }),
      item({ requestId: 4, state: 'RejectedWithReason', resolvedAt: '2026-07-26T08:00:00Z' })
    ]), NOW)

    expect(queue.open.map(r => r.requestId).sort()).toEqual([1, 2])
    expect(queue.resolved.map(r => r.requestId).sort()).toEqual([3, 4])
    expect(queue.total).toBe(4)
  })

  test('the two state lists are the backend enum and nothing else', () => {
    expect(OPEN_STATES).toEqual(['Received', 'InProgress'])
    expect(RESOLVED_STATES).toEqual(['Fulfilled', 'RejectedWithReason'])
  })

  test('an unrecognised state is NOT treated as open', () => {
    // Deny-closed against a wire value we do not understand: putting it in the work queue would
    // invite an operator to resolve a request whose state nobody here can vouch for.
    const queue = readQueue(list([item({ state: 'Something' })]), NOW)
    expect(queue.open).toHaveLength(0)
    expect(queue.resolved).toHaveLength(1)
  })
})

describe('readQueue — urgency', () => {
  test('open requests are ordered by deadline, NOT by the wire order', () => {
    // The server orders by receivedAt DESCENDING — right for a log, exactly wrong for a work queue:
    // it puts the request with the most time left first. Mutating the sort to keep wire order makes
    // this red.
    const queue = readQueue(list([
      item({ requestId: 10, receivedAt: '2026-07-28T08:00:00Z' }), // due 28 Aug — most slack
      item({ requestId: 11, receivedAt: '2026-07-05T08:00:00Z' }), // due 5 Aug — most urgent
      item({ requestId: 12, receivedAt: '2026-07-15T08:00:00Z' })
    ]), NOW)
    expect(queue.open.map(r => r.requestId)).toEqual([11, 12, 10])
  })

  test('a request with no readable receipt time sorts LAST, not first', () => {
    const queue = readQueue(list([
      item({ requestId: 20, receivedAt: null }),
      item({ requestId: 21, receivedAt: '2026-07-05T08:00:00Z' })
    ]), NOW)
    expect(queue.open.map(r => r.requestId)).toEqual([21, 20])
    expect(queue.open[1].dueAt).toBeNull()
    expect(queue.open[1].daysLeft).toBeNull()
    // An unknown deadline is not a missed one.
    expect(queue.open[1].isOverdue).toBe(false)
  })

  test('overdue is counted for open requests only', () => {
    const queue = readQueue(list([
      // Received 20 June, due 20 July, and it is 1 August. Over.
      item({ requestId: 30, receivedAt: '2026-06-20T08:00:00Z' }),
      // Same age but already answered — an operator has nothing left to do about it.
      item({ requestId: 31, receivedAt: '2026-06-20T08:00:00Z', state: 'Fulfilled', resolvedAt: '2026-06-25T08:00:00Z' }),
      item({ requestId: 32, receivedAt: '2026-07-28T08:00:00Z' })
    ]), NOW)

    expect(queue.overdueCount).toBe(1)
    expect(queue.open.find(r => r.requestId === 30).isOverdue).toBe(true)
    expect(queue.resolved.find(r => r.requestId === 31).isOverdue).toBe(false)
    expect(queue.open.find(r => r.requestId === 32).isOverdue).toBe(false)
  })

  test('daysLeft counts whole days and goes negative past the deadline', () => {
    // Received 20 July -> due 20 August. From 1 August that is 19 days.
    const inTime = readQueue(list([item({ receivedAt: '2026-07-20T10:00:00Z' })]), NOW).open[0]
    expect(inTime.daysLeft).toBe(19)

    // Received 20 June -> due 20 July, twelve days before NOW.
    const late = readQueue(list([item({ receivedAt: '2026-06-20T10:00:00Z' })]), NOW).open[0]
    expect(late.daysLeft).toBe(-12)
  })

  test('the count truncates TOWARDS ZERO, so a part-day is never rounded against the venue', () => {
    // Due 28 Aug 08:00 with NOW at 1 Aug 10:00 — 26 days and 22 hours. Twenty-six: a whole day is
    // not left until it is.
    const ahead = readQueue(list([item({ receivedAt: '2026-07-28T08:00:00Z' })]), NOW).open[0]
    expect(ahead.daysLeft).toBe(26)

    // Due 20 Jul 08:00 — twelve days and two hours PAST. Twelve whole days have gone by, not
    // thirteen. A floor would report thirteen and make the page say the answer was owed a day
    // earlier than it was.
    const behind = readQueue(list([item({ receivedAt: '2026-06-20T08:00:00Z' })]), NOW).open[0]
    expect(behind.daysLeft).toBe(-12)

    // And a deadline that ran out hours ago is overdue with a count of zero — the page has its own
    // sentence for that, because «0 days ago» is not one.
    const justNow = readQueue(list([item({ receivedAt: '2026-07-01T06:00:00Z' })]), NOW).open[0]
    expect(justNow.daysLeft).toBe(0)
    expect(justNow.isOverdue).toBe(true)
  })
})

describe('readQueue — what it refuses to claim', () => {
  test('noticeDelivery is passed through untouched, null included', () => {
    // The DTO is explicit: null is NOT a fourth state, it means no receipt exists. Folding it into
    // NotAttempted would tell an operator no notice was owed when nobody has decided anything.
    const queue = readQueue(list([
      item({ requestId: 40, noticeDelivery: null }),
      item({ requestId: 41, noticeDelivery: 'SubmittedToTransport' }),
      item({ requestId: 42, noticeDelivery: 'AttemptedAndFailed' })
    ]), NOW)
    const byId = id => queue.open.concat(queue.resolved).find(r => r.requestId === id)
    expect(byId(40).noticeDelivery).toBeNull()
    expect(byId(41).noticeDelivery).toBe('SubmittedToTransport')
    expect(byId(42).noticeDelivery).toBe('AttemptedAndFailed')
  })

  test('no row carries an address, and none is invented from the contact id', () => {
    // The list is masked by contract (spec §3 invariant 11). Anything address-shaped on a row would
    // be a value this client made up.
    const row = readQueue(list([item()]), NOW).open[0]
    expect(Object.keys(row).sort()).toEqual([
      'contactPointId', 'daysLeft', 'dueAt', 'isOpen', 'isOverdue',
      'noticeDelivery', 'receivedAt', 'requestId', 'resolvedAt', 'state', 'type'
    ])
    expect(JSON.stringify(row)).not.toMatch(/@/)
  })

  test('the store id is reported as the SERVER said it, never assumed', () => {
    expect(readQueue(list([], 77), NOW).storeId).toBe(77)
    expect(readQueue({ requests: [] }, NOW).storeId).toBeNull()
  })
})

describe('resolveRefusal — the preconditions, mirrored from the server', () => {
  test('a fulfilment needs no reason', () => {
    expect(resolveRefusal({ outcome: OUTCOME_FULFILLED, reason: null })).toBeNull()
  })

  test('a rejection with a reason is admissible', () => {
    expect(resolveRefusal({ outcome: OUTCOME_REJECTED, reason: 'Not the data subject.' })).toBeNull()
  })

  test('a rejection with a blank or whitespace reason is refused with the SERVER code', () => {
    expect(resolveRefusal({ outcome: OUTCOME_REJECTED, reason: '' })).toBe(REFUSAL_REASON_REQUIRED)
    expect(resolveRefusal({ outcome: OUTCOME_REJECTED, reason: '   ' })).toBe(REFUSAL_REASON_REQUIRED)
    expect(resolveRefusal({ outcome: OUTCOME_REJECTED })).toBe(REFUSAL_REASON_REQUIRED)
  })

  test('any outcome that is not one of the two terminal states is refused', () => {
    // `ResolveAsync` accepts Fulfilled and RejectedWithReason and nothing else. Sending InProgress
    // would earn a 400 after the round trip; it is refused here first.
    expect(resolveRefusal({ outcome: 'InProgress' })).toBe(REFUSAL_INVALID_OUTCOME)
    expect(resolveRefusal({ outcome: 'Received' })).toBe(REFUSAL_INVALID_OUTCOME)
    expect(resolveRefusal({})).toBe(REFUSAL_INVALID_OUTCOME)
    expect(resolveRefusal(null)).toBe(REFUSAL_INVALID_OUTCOME)
  })

  test('the refusal codes are the backend contract, spelled exactly', () => {
    // One vocabulary for a refusal caught here and one that came back over the wire. A local string
    // would make the page's message map cover only half of them.
    expect(REFUSAL_INVALID_OUTCOME).toBe('growth.invalid_resolution')
    expect(REFUSAL_REASON_REQUIRED).toBe('growth.reason_required')
  })
})
