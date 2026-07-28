import { WorkforceApiError, isWorkforceApiError, toUtcRangeParam, WorkforceClientBase } from '~/utils/workforce/api-client'
import { WorkforceScheduleService } from '~/utils/workforce/schedule-client'
import { WorkforceMeService } from '~/utils/workforce-me/me-client'

jest.mock('~/utils/guid', () => ({ newGuid: () => 'test-idempotency-key' }))

// The manager lane and the worker lane each built their own problem+json error type, their own
// `_request`/`_mutate`, and their own transpile-proof discriminator flag. Two copies of a
// discriminator is the dangerous kind of duplication — its failure mode is silent — so the merge
// kept one. These tests are what "one" means: same class, same flag, same base, both directions.
describe('the shared Workforce HTTP layer', () => {
  const originalFetch = global.fetch

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  }

  afterEach(() => { global.fetch = originalFetch })

  async function failureFrom (call) {
    try {
      await call()
      return null
    } catch (e) {
      return e
    }
  }

  test('both services are the same client, not two clients that look alike', () => {
    expect(new WorkforceScheduleService({})).toBeInstanceOf(WorkforceClientBase)
    expect(new WorkforceMeService({})).toBeInstanceOf(WorkforceClientBase)
  })

  test('a failure on EITHER surface is the one error type, recognised by the one predicate', async () => {
    respondWith(409, { status: 409, code: 'workforce.hidden-engagement-conflict', conflictKind: 'hidden-engagement-conflict' })
    const fromManager = await failureFrom(() => new WorkforceScheduleService({}).Publish(42, 'rev-1'))

    respondWith(409, { status: 409, code: 'workforce.award-taken', conflictKind: 'award-taken', aggregateId: 'ex-1' })
    const fromWorker = await failureFrom(() => new WorkforceMeService({}).RequestOpenShift('sm-1', 'shift-1'))

    expect(fromManager.name).toBe('WorkforceApiError')
    expect(fromWorker.name).toBe('WorkforceApiError')
    expect(isWorkforceApiError(fromManager)).toBe(true)
    expect(isWorkforceApiError(fromWorker)).toBe(true)
    expect(fromManager.constructor).toBe(fromWorker.constructor)
  })

  test('the one type carries both lanes\' extensions, nulled rather than absent', () => {
    const overlap = new WorkforceApiError(409, {
      code: 'workforce.assignment-overlap',
      conflictKind: 'assignment-overlap',
      conflictingAssignmentId: 'a1'
    })
    expect(overlap.conflictingAssignmentId).toBe('a1')
    expect(overlap.aggregateId).toBeNull()

    const award = new WorkforceApiError(409, { code: 'workforce.award-taken', aggregateId: 'ex-1' })
    expect(award.aggregateId).toBe('ex-1')
    expect(award.conflictingAssignmentId).toBeNull()
  })

  // The flag, not `instanceof`: subclassing Error does not survive an ES5 transpile, and the failure
  // is silent — the conflict simply stops being recognised.
  test('the discriminator is an own property, so an ES5 transpile cannot break it', () => {
    const error = new WorkforceApiError(409, { code: 'workforce.award-taken' })
    expect(Object.prototype.hasOwnProperty.call(error, 'isWorkforceApiError')).toBe(true)
    expect(isWorkforceApiError(JSON.parse(JSON.stringify({ isWorkforceApiError: true })))).toBe(true)
    expect(isWorkforceApiError(new Error('offline'))).toBe(false)
    expect(isWorkforceApiError(null)).toBe(false)
  })

  test('the message falls back detail -> title -> status, never to undefined', () => {
    expect(new WorkforceApiError(409, { detail: 'd', title: 't' }).message).toBe('d')
    expect(new WorkforceApiError(409, { title: 't' }).message).toBe('t')
    expect(new WorkforceApiError(502, null).message).toBe('HTTP 502')
  })

  test('a non-JSON body still produces a typed error rather than a parse crash', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false, status: 502, text: () => Promise.resolve('<html>gateway</html>')
    })
    const error = await failureFrom(() => new WorkforceScheduleService({}).GetContext(42))
    expect(isWorkforceApiError(error)).toBe(true)
    expect(error.status).toBe(502)
    expect(error.code).toBeNull()
  })

  test('the base carries the bearer token and the Idempotency-Key for both surfaces', async () => {
    respondWith(200, {})
    await new WorkforceScheduleService({ bearerToken: 'tok' }).Validate(42, 'rev-1')
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok')
    expect(global.fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('test-idempotency-key')

    respondWith(200, {})
    await new WorkforceMeService({ bearerToken: 'tok' }).MarkInboxRead('item-1')
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer tok')
    expect(global.fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('test-idempotency-key')
  })

  test('a read carries no Idempotency-Key and no body', async () => {
    respondWith(200, {})
    await new WorkforceScheduleService({}).ListStaff(42)
    const init = global.fetch.mock.calls[0][1]
    expect(init.headers['Idempotency-Key']).toBeUndefined()
    expect(init.headers['Content-Type']).toBeUndefined()
    expect(init.body).toBeUndefined()
  })
})

// Moved here with the function it tests: the wire format is a property of the HTTP surface, not of
// the week arithmetic it used to live next to.
describe('toUtcRangeParam', () => {
  // A trailing Z invites the query-string binder to convert into the server's local zone, and the
  // /me actions then `SpecifyKind` the already-converted value to UTC. A bare local-looking string
  // is converted by nothing and therefore arrives as the instant meant.
  test('emits second precision with no zone designator', () => {
    expect(toUtcRangeParam(new Date('2026-07-26T22:00:00.000Z'))).toBe('2026-07-26T22:00:00')
    expect(toUtcRangeParam(new Date('2026-07-06T05:00:00Z'))).not.toContain('Z')
    expect(toUtcRangeParam(new Date('2026-01-01T23:59:59Z'))).toBe('2026-01-01T23:59:59')
  })
})
