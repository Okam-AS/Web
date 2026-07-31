import { isWorkforceApiError } from '~/utils/workforce/api-client'
import { WorkforceRequestsService } from '~/utils/workforce/requests-client'

// The wire contract of the manager decision inbox: the two routes WorkforceRequestsController binds,
// the If-Match the decision requires, and the typed conflicts a refusal comes back as.
describe('WorkforceRequestsService', () => {
  const originalFetch = global.fetch
  const originalCrypto = global.crypto

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  }

  const service = () => new WorkforceRequestsService({ bearerToken: 'tok-123' })
  const lastInit = () => global.fetch.mock.calls[0][1]
  const lastUrl = () => global.fetch.mock.calls[0][0]

  beforeEach(() => { global.crypto = { randomUUID: () => 'idem-key' } })
  afterEach(() => {
    global.fetch = originalFetch
    global.crypto = originalCrypto
  })

  test('the client binds exactly the two routes the controller declares', () => {
    const bound = Object.getOwnPropertyNames(WorkforceRequestsService.prototype)
      .filter(name => name !== 'constructor' && name.charAt(0) !== '_')
      .sort()
    expect(bound).toEqual(['DecideRequest', 'ListRequests'])
  })

  test('ListRequests sends only the filters it was given', async () => {
    respondWith(200, { items: [] })
    await service().ListRequests(42)
    expect(lastUrl()).toBe('/workforce/stores/42/requests')

    respondWith(200, { items: [] })
    await service().ListRequests(42, 'time-off', 'all')
    expect(lastUrl()).toBe('/workforce/stores/42/requests?kind=time-off&state=all')
  })

  test('a decision carries both preconditions the endpoint requires', async () => {
    respondWith(200, {})
    await service().DecideRequest(42, 'req-1', 'AAAAAAAAB9E=', 'approve', 'ok fra meg')

    expect(lastUrl()).toBe('/workforce/stores/42/requests/req-1')
    expect(lastInit().method).toBe('PATCH')
    // Both are refused when absent: the Idempotency-Key by the shared boundary helper, the If-Match
    // by the action itself.
    expect(lastInit().headers['Idempotency-Key']).toBe('idem-key')
    expect(lastInit().headers['If-Match']).toBe('AAAAAAAAB9E=')
    expect(JSON.parse(lastInit().body)).toEqual({ decision: 'approve', decisionNote: 'ok fra meg' })
  })

  // The roster client's rule, kept here for the same reason: an ABSENT If-Match is the honest 400
  // ("no precondition"), while a junk one is compared against the real rowversion and answers
  // stale-revision — a 409 saying somebody else moved the row when nobody did.
  test('a missing revision omits the header rather than sending an empty one', async () => {
    respondWith(400, {})
    await service().DecideRequest(42, 'req-1', null, 'reject').catch(() => null)

    expect(Object.keys(lastInit().headers)).not.toContain('If-Match')
  })

  test('an empty note travels as null rather than an empty string', async () => {
    respondWith(200, {})
    await service().DecideRequest(42, 'req-1', 'rev', 'approve', '')
    expect(JSON.parse(lastInit().body).decisionNote).toBeNull()
  })

  test('the already-decided 409 arrives typed and apart from a stale one', async () => {
    respondWith(409, {
      status: 409,
      detail: 'The request is no longer in a state that can be decided or withdrawn.',
      code: 'workforce.request-not-decidable',
      conflictKind: 'request-not-decidable',
      aggregateId: 'req-1',
      currentStatus: 'Approved',
      retryable: false
    })

    const error = await service().DecideRequest(42, 'req-1', 'rev', 'approve').catch(e => e)
    expect(isWorkforceApiError(error)).toBe(true)
    expect(error.status).toBe(409)
    expect(error.code).toBe('workforce.request-not-decidable')
    expect(error.conflictKind).toBe('request-not-decidable')
    expect(error.retryable).toBe(false)
    expect(error.problem.currentStatus).toBe('Approved')
  })

  test('the one-award backstop arrives typed', async () => {
    respondWith(409, {
      status: 409,
      detail: 'The open shift has already been awarded.',
      code: 'workforce.award-taken',
      conflictKind: 'award-taken',
      aggregateId: 'shift-1'
    })

    const error = await service().DecideRequest(42, 'req-1', 'rev', 'approve').catch(e => e)
    expect(error.code).toBe('workforce.award-taken')
    expect(error.aggregateId).toBe('shift-1')
  })
})
