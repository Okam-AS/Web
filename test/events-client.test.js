import { EventsService, EventsApiError, isEventsApiError } from '~/utils/events/events-client'

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
  })

  // `GuardIfMatch` treats a blank token as "no token", so a blank header is not a weaker
  // precondition — against a SQL Server row it would raise EVENTS_CONFLICT on the very first try and
  // read as though somebody else had edited the settlement.
  test('and is ABSENT rather than blank when there is none (the SQLite case)', async () => {
    for (const none of [null, undefined, '']) {
      await service().ReconcileSettlement(42, 7, none)
      expect(lastCall().init.headers['If-Match']).toBeUndefined()
    }
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

  test('the discriminator survives a transpile, so a typed refusal is never mistaken for a crash', () => {
    const error = new EventsApiError(409, { code: 'EVENTS_CONFLICT' })
    expect(error.isEventsApiError).toBe(true)
    expect(isEventsApiError(error)).toBe(true)
    expect(isEventsApiError(new Error('boom'))).toBe(false)
    expect(isEventsApiError(null)).toBe(false)
  })
})
