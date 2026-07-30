import fs from 'fs'
import path from 'path'
import {
  EventsService,
  EventsApiError,
  isEventsApiError,
  EVENTS_CONFLICT,
  EVENTS_REVISION_REQUIRED
} from '~/utils/events/events-client'

// `fetch` is stubbed at the global, the same way `test/workforce-schedule-client.test.js` does it, so
// the exact URL, method and headers each method builds are the thing under test — the part of this
// client that is a contract with the backend rather than a rendering choice.
let calls = []
const originalFetch = global.fetch

function respondWith (status, body) {
  calls = []
  global.fetch = jest.fn((url, init) => {
    calls.push({ url, init })
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  })
}

function service () {
  return new EventsService({ bearerToken: 'tok-123' })
}

const lastCall = () => calls[calls.length - 1]

afterEach(() => { global.fetch = originalFetch })

describe('the routes are the controllers routes', () => {
  beforeEach(() => respondWith(200, []))

  test('the pipeline list, with each filter optional', async () => {
    await service().ListEvents(42, null, null, null)
    expect(lastCall().url).toBe('/events/admin/42/events')
    expect(lastCall().init.method).toBe('GET')

    await service().ListEvents(42, 'ProposalSent', '2026-08-01', '2026-08-31')
    expect(lastCall().url).toBe('/events/admin/42/events?status=ProposalSent&from=2026-08-01&to=2026-08-31')
  })

  // `from`/`to` are compared against a DATE column. A zone designator on them is exactly how a window
  // slides by a day at its boundary, so the client must pass the day through untouched.
  test('the date filters go on the wire as bare days, with nothing appended', async () => {
    await service().ListEvents(42, null, '2026-08-01', '2026-08-31')
    expect(lastCall().url).not.toContain('T00:00')
    expect(lastCall().url).not.toContain('Z')
  })

  test('the detail, the manual create and the proposal routes', async () => {
    await service().GetEvent(42, 7)
    expect(lastCall().url).toBe('/events/admin/42/events/7')

    await service().CreateEvent(42, { title: 'Julebord' })
    expect(lastCall().url).toBe('/events/admin/42/events')
    expect(lastCall().init.method).toBe('POST')
    expect(JSON.parse(lastCall().init.body)).toEqual({ title: 'Julebord' })

    await service().CreateProposalVersion(42, 7, { currencyCode: 'NOK' })
    expect(lastCall().url).toBe('/events/admin/42/events/7/proposal-versions')

    await service().SendProposalVersion(42, 7, 2)
    expect(lastCall().url).toBe('/events/admin/42/events/7/proposal-versions/2/send')

    await service().MarkLost(42, 7, { reasonCode: 'Other' })
    expect(lastCall().url).toBe('/events/admin/42/events/7/mark-lost')
  })

  test('the deposit routes', async () => {
    await service().IssueDeposit(42, 7, { paymentType: 'Vipps' })
    expect(lastCall().url).toBe('/events/admin/42/events/7/deposits')
    expect(JSON.parse(lastCall().init.body)).toEqual({ paymentType: 'Vipps' })

    await service().CancelDeposit(42, 7, 9)
    expect(lastCall().url).toBe('/events/admin/42/events/7/deposits/9/cancel')

    await service().ListDeposits(42, 7)
    expect(lastCall().url).toBe('/events/admin/42/events/7/deposits')
    expect(lastCall().init.method).toBe('GET')

    await service().RefundDeposit(42, 7, 9, { amountMinor: 50000 })
    expect(lastCall().url).toBe('/events/admin/42/events/7/deposits/9/refund')
    expect(lastCall().init.method).toBe('POST')
    expect(JSON.parse(lastCall().init.body)).toEqual({ amountMinor: 50000 })
  })

  test('the settlement read, the line write, and cancel', async () => {
    await service().GetSettlement(42, 7)
    expect(lastCall().url).toBe('/events/admin/42/events/7/settlement')
    expect(lastCall().init.method).toBe('GET')

    await service().AddSettlementLine(42, 7, { kind: 'Invoice', amountMinor: 120000 }, 'rev-1')
    expect(lastCall().url).toBe('/events/admin/42/events/7/settlement/lines')
    expect(lastCall().init.method).toBe('POST')
    expect(JSON.parse(lastCall().init.body)).toEqual({ kind: 'Invoice', amountMinor: 120000 })

    await service().CancelEvent(42, 7, { reason: 'Guest cancelled', resolution: 'Refund' })
    expect(lastCall().url).toBe('/events/admin/42/events/7/cancel')
    expect(JSON.parse(lastCall().init.body)).toEqual({ reason: 'Guest cancelled', resolution: 'Refund' })
  })

  test('the notification health routes are store-scoped, not event-scoped', async () => {
    await service().GetNotificationHealth(42)
    expect(lastCall().url).toBe('/events/admin/42/notifications/health')
    expect(lastCall().init.method).toBe('GET')

    await service().RequeueNotification(42, 'd0000000-0000-0000-0000-000000000001')
    expect(lastCall().url).toBe('/events/admin/42/notifications/d0000000-0000-0000-0000-000000000001/requeue')
    expect(lastCall().init.method).toBe('POST')
  })

  test('the run-sheet routes, and its optional version', async () => {
    await service().GetRunSheet(42, 7, null)
    expect(lastCall().url).toBe('/events/admin/42/events/7/run-sheet')

    await service().GetRunSheet(42, 7, 3)
    expect(lastCall().url).toBe('/events/admin/42/events/7/run-sheet?version=3')

    await service().GenerateRunSheet(42, 7)
    expect(lastCall().url).toBe('/events/admin/42/events/7/run-sheet')
    expect(lastCall().init.method).toBe('PUT')
  })

  test('the lifecycle tail', async () => {
    await service().StartService(42, 7)
    expect(lastCall().url).toBe('/events/admin/42/events/7/start-service')

    await service().CloseEvent(42, 7)
    expect(lastCall().url).toBe('/events/admin/42/events/7/close')

    await service().ReconcileSettlement(42, 7, null)
    expect(lastCall().url).toBe('/events/admin/42/events/7/settlement/reconcile')

    await service().CloseSettlement(42, 7, null)
    expect(lastCall().url).toBe('/events/admin/42/events/7/settlement/close')
  })
})

describe('headers', () => {
  beforeEach(() => respondWith(200, {}))

  // The positive control for the assertion below: header assembly DOES work, and the bearer proves it.
  test('the bearer token is attached', async () => {
    await service().GetEvent(42, 7)
    expect(lastCall().init.headers.Authorization).toBe('Bearer tok-123')
  })

  // Workforce, Meals and Training all refuse a mutation without one. Events declares no such code and
  // enforces no such filter, so sending the header would advertise a contract the module lacks.
  test('an Events mutation carries NO Idempotency-Key', async () => {
    await service().CreateEvent(42, { title: 'x' })
    expect(lastCall().init.headers['Idempotency-Key']).toBeUndefined()
    expect(lastCall().init.headers['Content-Type']).toBe('application/json')
  })

  test('If-Match is sent when there is a revision', async () => {
    await service().ReconcileSettlement(42, 7, 'AAAAAAAAB9E=')
    expect(lastCall().init.headers['If-Match']).toBe('AAAAAAAAB9E=')

    await service().CloseSettlement(42, 7, 'AAAAAAAAB9E=')
    expect(lastCall().init.headers['If-Match']).toBe('AAAAAAAAB9E=')

    await service().AddSettlementLine(42, 7, { kind: 'Invoice', amountMinor: 1 }, 'AAAAAAAAB9E=')
    expect(lastCall().init.headers['If-Match']).toBe('AAAAAAAAB9E=')
  })

  // `GuardIfMatch` treats a blank token as "no token", so a blank header is not a weaker
  // precondition — against a SQL Server row it would raise EVENTS_CONFLICT on the very first try and
  // read as though somebody else had edited the settlement.
  test('and is ABSENT rather than blank when there is none (the SQLite case)', async () => {
    for (const none of [null, undefined, '']) {
      await service().ReconcileSettlement(42, 7, none)
      expect(lastCall().init.headers['If-Match']).toBeUndefined()

      await service().AddSettlementLine(42, 7, { kind: 'Invoice', amountMinor: 1 }, none)
      expect(lastCall().init.headers['If-Match']).toBeUndefined()
    }
  })

  // The read is where the token comes from, so it must not itself demand one: a client holding no
  // revision would be locked out of the only call that can hand it one.
  test('the settlement READ sends no If-Match of its own', async () => {
    await service().GetSettlement(42, 7)
    expect(lastCall().init.headers['If-Match']).toBeUndefined()
  })
})

// `revision` is a SQL Server `rowversion`. On a SQLite host the column does not exist, the server
// sends no ETag, and `settlement.revision` is null — and the guard is lenient there precisely because
// there was never a token to hand out. A client that REQUIRED one would refuse every local mutation.
describe('the revision comes off the settlement read', () => {
  test('it is read from the body, which mirrors the ETag header', async () => {
    respondWith(200, {
      publicId: 'a1', eventStatus: 'Settling', settlement: { id: 3, status: 'Draft', revision: 'rev-9', lines: [] }
    })
    const read = await service().GetSettlement(42, 7)
    expect(read.settlement.revision).toBe('rev-9')

    await service().AddSettlementLine(42, 7, { kind: 'Invoice', amountMinor: 1 }, read.settlement.revision)
    expect(lastCall().init.headers['If-Match']).toBe('rev-9')
  })

  test('a null revision (the SQLite host) still mutates, with no header at all', async () => {
    respondWith(200, {
      publicId: 'a1', eventStatus: 'Settling', settlement: { id: 3, status: 'Draft', revision: null, lines: [] }
    })
    const read = await service().GetSettlement(42, 7)
    expect(read.settlement.revision).toBeNull()

    await service().AddSettlementLine(42, 7, { kind: 'Invoice', amountMinor: 1 }, read.settlement.revision)
    expect(lastCall().init.headers['If-Match']).toBeUndefined()
    // And the call was made: a missing revision is not a client-side refusal on this surface.
    expect(lastCall().url).toBe('/events/admin/42/events/7/settlement/lines')
  })
})

describe('a refusal arrives typed', () => {
  test('EVENTS_STATE carries the status the server holds and the transitions that ARE legal', async () => {
    respondWith(409, {
      detail: 'The requested action is not permitted from the event state.',
      code: 'EVENTS_STATE',
      conflictKind: 'state',
      currentStatus: 'Confirmed',
      permittedActions: ['T11', 'T14', 'T17'],
      retryable: false
    })

    expect.assertions(6)
    try {
      await service().CloseEvent(42, 7)
    } catch (e) {
      expect(isEventsApiError(e)).toBe(true)
      expect(e.status).toBe(409)
      expect(e.code).toBe('EVENTS_STATE')
      expect(e.currentStatus).toBe('Confirmed')
      expect(e.permittedActions).toEqual(['T11', 'T14', 'T17'])
      expect(e.retryable).toBe(false)
    }
  })

  test('a refusal without those extensions leaves them null, not invented', async () => {
    respondWith(404, { detail: 'Events is not enabled for this store.', code: 'EVENTS_DISABLED' })

    expect.assertions(3)
    try {
      await service().ListEvents(42)
    } catch (e) {
      expect(e.code).toBe('EVENTS_DISABLED')
      expect(e.currentStatus).toBeNull()
      expect(e.permittedActions).toBeNull()
    }
  })

  // The absent-precondition arm used to arrive as a RETRYABLE 409 advising a re-read and a retry —
  // advice a caller that is not sending the header can never act on, so it looped. It is now its own
  // 400 code, and the client must carry it as the permanent, caller-fixable input error it is.
  test('EVENTS_REVISION_REQUIRED is a 400 that does NOT claim to be retryable', async () => {
    respondWith(400, {
      detail: 'An If-Match header carrying the settlement revision is required for this mutation.',
      code: 'EVENTS_REVISION_REQUIRED',
      retryable: false
    })

    expect.assertions(3)
    try {
      await service().AddSettlementLine(42, 7, { kind: 'Invoice', amountMinor: 1 }, null)
    } catch (e) {
      expect(e.code).toBe(EVENTS_REVISION_REQUIRED)
      expect(e.status).toBe(400)
      expect(e.retryable).toBe(false)
    }
  })

  test('and it is a DIFFERENT code from the lost race, which is retryable', async () => {
    expect(EVENTS_REVISION_REQUIRED).not.toBe(EVENTS_CONFLICT)
    respondWith(409, { code: 'EVENTS_CONFLICT', detail: 'modified concurrently', retryable: true })

    expect.assertions(4)
    try {
      await service().CloseSettlement(42, 7, 'stale')
    } catch (e) {
      expect(e.code).toBe(EVENTS_CONFLICT)
      expect(e.status).toBe(409)
      expect(e.retryable).toBe(true)
    }
  })

  test('the discriminator survives a transpile, so a typed refusal is never mistaken for a crash', () => {
    const error = new EventsApiError(409, { code: 'EVENTS_CONFLICT' })
    expect(error.isEventsApiError).toBe(true)
    expect(isEventsApiError(error)).toBe(true)
    expect(isEventsApiError(new Error('boom'))).toBe(false)
    expect(isEventsApiError(null)).toBe(false)
  })
})

// The file used to end with a block declaring that neither the deposit nor the settlement had an
// admin read. Both routes landed in 86cb4d25, and the comment outlived them — which is worse than no
// comment, because a surface built on it holds the last mutation's answer and calls it a read. The
// claim is pinned as gone so it cannot be reinstated by a merge that takes the older side.
describe('the client no longer documents absences that ended', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'utils', 'events', 'events-client.js'), 'utf8')

  test('it does not claim there is no admin read for a deposit or a settlement', () => {
    expect(source.toUpperCase()).not.toContain('NO ADMIN READ')
  })

  test('and it names both routes instead', () => {
    expect(source).toContain('/settlement');
    expect(typeof EventsService.prototype.GetSettlement).toBe('function')
    expect(typeof EventsService.prototype.ListDeposits).toBe('function')
  })
})
