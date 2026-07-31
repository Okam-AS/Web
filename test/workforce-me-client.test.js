import { isWorkforceApiError, toUtcRangeParam } from '~/utils/workforce/api-client'
import { WorkforceMeService } from '~/utils/workforce-me/me-client'

jest.mock('~/utils/guid', () => ({ newGuid: () => 'test-idempotency-key' }))

let calls = []

function respond (status, body) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
  })
}

beforeEach(() => {
  calls = []
  global.fetch = jest.fn((url, options) => {
    calls.push({ url, options })
    return respond(200, { ok: true })
  })
})

const service = () => new WorkforceMeService({ bearerToken: 'token-123' })
const lastCall = () => calls[calls.length - 1]

describe('the client is route-for-route with /workforce/me', () => {
  test('every read hits the route the controller declares', async () => {
    const svc = service()

    await svc.GetMemberships()
    expect(lastCall().url).toBe('/workforce/me/staff-memberships')

    await svc.GetInbox()
    expect(lastCall().url).toBe('/workforce/me/inbox')

    await svc.GetOpenAssignments('sm-1')
    expect(lastCall().url).toBe('/workforce/me/staff-memberships/sm-1/open-assignments')
  })

  test('every mutation hits the route the controller declares', async () => {
    const svc = service()

    await svc.MarkInboxRead('item-1')
    expect(lastCall().url).toBe('/workforce/me/inbox/item-1/read')

    await svc.AcknowledgePublication('pub-1')
    expect(lastCall().url).toBe('/workforce/me/publications/pub-1/acknowledgements')

    await svc.RequestOpenShift('sm-1', 'shift-1', 'kan ta den')
    expect(lastCall().url).toBe('/workforce/me/staff-memberships/sm-1/open-assignments/shift-1/requests')

    await svc.DecideExchange('sm-1', 'ex-1', 'withdraw')
    expect(lastCall().url).toBe('/workforce/me/staff-memberships/sm-1/exchanges/ex-1/decisions')
  })

  test('the client binds no route the controller does not declare', () => {
    // A client method for a route that does not exist is the failure mode this surface is audited
    // for. Every public method here is checked against Controllers/WorkforceMeController.cs.
    const bound = Object.getOwnPropertyNames(WorkforceMeService.prototype)
      .filter(name => name !== 'constructor' && name.charAt(0) !== '_')
      .sort()
    expect(bound).toEqual([
      'AcknowledgePublication',
      'DecideExchange',
      'GetInbox',
      'GetMemberships',
      'GetOpenAssignments',
      'GetSchedule',
      'GetStoreContext',
      'MarkInboxRead',
      'RequestOpenShift',
      'RequestTimeOff',
      'SetAvailability',
      'WithdrawRequest'
    ])
  })

  test('the self-service writes hit the routes the controller declares', async () => {
    const svc = service()

    await svc.SetAvailability('sm-1', { rules: [], exceptions: [] })
    expect(lastCall().url).toBe('/workforce/me/staff-memberships/sm-1/availability')
    expect(lastCall().options.method).toBe('PUT')

    await svc.RequestTimeOff('sm-1', { startsUtc: 'a', endsUtc: 'b' })
    expect(lastCall().url).toBe('/workforce/me/staff-memberships/sm-1/time-off')

    await svc.WithdrawRequest('sm-1', 'req-9')
    expect(lastCall().url).toBe('/workforce/me/staff-memberships/sm-1/requests/req-9/withdraw')
  })

  test('the manager decision inbox is never called from the worker surface', async () => {
    const svc = service()
    await svc.GetInbox()
    await svc.GetMemberships()
    await svc.GetSchedule()
    // The ONE store-scoped route this client binds is #1, read for the store's timezone: it admits
    // any capability grant, so a WorkforceSelf engagement may call it.
    await svc.GetStoreContext(42)
    expect(lastCall().url).toBe('/workforce/stores/42/context')

    // #23 GET /workforce/stores/{id}/requests needs WorkforceManager. A worker page asking for it
    // would be asking for a 403 at best and a coworker's data at worst.
    calls.forEach(call => expect(call.url).not.toContain('/requests'))
  })
})

describe('the inbox is never sent a filter it was not given', () => {
  // #34 declares no query parameters. A ?kind=/?state= appended here would be silently ignored and
  // the page would believe it had filtered — the exact lie the manager inbox 400s to prevent.
  test('GetInbox sends no query string at all', async () => {
    await service().GetInbox()
    expect(lastCall().url).toBe('/workforce/me/inbox')
    expect(lastCall().url).not.toContain('?')
    expect(lastCall().url).not.toContain('kind')
    expect(lastCall().url).not.toContain('state')
  })

  test('GetInbox takes no arguments that could reach the wire', async () => {
    await service().GetInbox({ kind: 'time-off', state: 'submitted' })
    expect(lastCall().url).toBe('/workforce/me/inbox')
  })
})

describe('range parameters carry no zone designator', () => {
  // The actions bind from/to and then SpecifyKind(Utc), which RELABELS without converting. A value
  // model binding had already converted to local time would be stamped UTC while holding local
  // wall-clock — an offset-sized silent window shift.
  test('toUtcRangeParam emits UTC wall clock with no Z', () => {
    expect(toUtcRangeParam(new Date('2026-07-06T05:00:00Z'))).toBe('2026-07-06T05:00:00')
    expect(toUtcRangeParam(new Date('2026-07-06T05:00:00Z'))).not.toContain('Z')
    expect(toUtcRangeParam(new Date('2026-01-01T23:59:59Z'))).toBe('2026-01-01T23:59:59')
  })

  test('the schedule range reaches the wire without a designator', async () => {
    await service().GetSchedule(new Date('2026-07-06T00:00:00Z'), new Date('2026-08-03T00:00:00Z'))
    expect(decodeURIComponent(lastCall().url))
      .toBe('/workforce/me/schedule?from=2026-07-06T00:00:00&to=2026-08-03T00:00:00')
  })

  test('the open-assignments range reaches the wire without a designator', async () => {
    await service().GetOpenAssignments('sm-1', new Date('2026-07-06T00:00:00Z'), null)
    expect(decodeURIComponent(lastCall().url))
      .toBe('/workforce/me/staff-memberships/sm-1/open-assignments?from=2026-07-06T00:00:00')
  })

  test('an omitted range sends no query string', async () => {
    await service().GetSchedule()
    expect(lastCall().url).toBe('/workforce/me/schedule')
  })
})

describe('preconditions the surface enforces', () => {
  test('every mutation carries an Idempotency-Key', async () => {
    const svc = service()
    await svc.MarkInboxRead('item-1')
    await svc.AcknowledgePublication('pub-1')
    await svc.RequestOpenShift('sm-1', 'shift-1')
    await svc.DecideExchange('sm-1', 'ex-1', 'withdraw')

    expect(calls.length).toBe(4)
    calls.forEach((call) => {
      expect(call.options.method).toBe('POST')
      expect(call.options.headers['Idempotency-Key']).toBe('test-idempotency-key')
    })
  })

  test('reads carry no Idempotency-Key', async () => {
    await service().GetSchedule()
    expect(lastCall().options.headers['Idempotency-Key']).toBeUndefined()
    expect(lastCall().options.method).toBe('GET')
  })

  test('the bearer token is attached', async () => {
    await service().GetInbox()
    expect(lastCall().options.headers.Authorization).toBe('Bearer token-123')
  })

  test('an absent token sends no Authorization header rather than "Bearer undefined"', async () => {
    await new WorkforceMeService({}).GetInbox()
    expect(lastCall().options.headers.Authorization).toBeUndefined()
  })

  test('the worker decision body carries the decision verb the surface accepts', async () => {
    await service().DecideExchange('sm-1', 'ex-1', 'withdraw', 'ombestemte meg')
    expect(JSON.parse(lastCall().options.body)).toEqual({ decision: 'withdraw', note: 'ombestemte meg' })
  })
})

describe('typed failures survive the boundary', () => {
  test('a problem+json 409 becomes a typed error carrying code and conflictKind', async () => {
    global.fetch = jest.fn(() => respond(409, {
      title: 'Conflict',
      status: 409,
      detail: 'The open assignment has already been awarded.',
      code: 'workforce.award-taken',
      conflictKind: 'award-taken',
      aggregateId: 'shift-1',
      retryable: false
    }))

    let caught = null
    try {
      await service().RequestOpenShift('sm-1', 'shift-1')
    } catch (e) {
      caught = e
    }

    expect(caught).not.toBeNull()
    expect(isWorkforceApiError(caught)).toBe(true)
    expect(caught.status).toBe(409)
    expect(caught.code).toBe('workforce.award-taken')
    expect(caught.conflictKind).toBe('award-taken')
    expect(caught.retryable).toBe(false)
    expect(caught.message).toBe('The open assignment has already been awarded.')
  })

  test('a non-JSON error body still produces a typed error rather than a parse crash', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 502,
      text: () => Promise.resolve('<html>gateway</html>')
    }))

    let caught = null
    try {
      await service().GetInbox()
    } catch (e) {
      caught = e
    }
    expect(isWorkforceApiError(caught)).toBe(true)
    expect(caught.status).toBe(502)
    expect(caught.code).toBeNull()
  })

  test('isWorkforceApiError is false for unrelated errors', () => {
    expect(isWorkforceApiError(new Error('offline'))).toBe(false)
    expect(isWorkforceApiError(null)).toBe(false)
  })

  test('an empty 200 body resolves to null rather than throwing', async () => {
    global.fetch = jest.fn(() => respond(200, undefined))
    await expect(service().MarkInboxRead('item-1')).resolves.toBeNull()
  })
})
