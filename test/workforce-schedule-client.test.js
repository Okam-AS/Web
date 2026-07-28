import { WorkforceScheduleService, isWorkforceApiError } from '~/utils/workforce/schedule-client'

// The client is route-for-route with the backend, so these assert the wire contract: the exact paths
// and query the controllers bind, the Idempotency-Key every workforce mutation requires, and the
// typed problem+json a conflict comes back as.
describe('WorkforceScheduleService', () => {
  const originalFetch = global.fetch
  const originalCrypto = global.crypto

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  }

  function service () {
    return new WorkforceScheduleService({ bearerToken: 'tok-123' })
  }

  beforeEach(() => {
    global.crypto = { randomUUID: () => 'idem-key' }
  })

  afterEach(() => {
    global.fetch = originalFetch
    global.crypto = originalCrypto
  })

  test('GetRange hits GET /schedules with from, to and view', async () => {
    respondWith(200, { view: 'draft', assignments: [] })
    await service().GetRange(42, '2026-07-26T22:00:00', '2026-08-02T22:00:00', 'published')

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/schedules?from=2026-07-26T22%3A00%3A00&to=2026-08-02T22%3A00%3A00&view=published')
    expect(init.method).toBe('GET')
    expect(init.headers.Authorization).toBe('Bearer tok-123')
  })

  test('ListRequests asks for every state, so decided absences are included', async () => {
    respondWith(200, { items: [] })
    await service().ListRequests(42, null, 'all')

    expect(global.fetch.mock.calls[0][0]).toBe('/workforce/stores/42/requests?state=all')
  })

  test('the roster and context reads hit their own routes', async () => {
    respondWith(200, [])
    await service().ListStaff(42)
    expect(global.fetch.mock.calls[0][0]).toBe('/workforce/stores/42/staff')

    respondWith(200, {})
    await service().GetContext(42)
    expect(global.fetch.mock.calls[0][0]).toBe('/workforce/stores/42/context')
  })

  test('every mutation carries an Idempotency-Key, which the surface requires', async () => {
    respondWith(200, {})
    await service().CreateDraft(42, { rangeStartUtc: 'a', rangeEndUtc: 'b', copyFromRangeStartUtc: null })
    let init = global.fetch.mock.calls[0][1]
    expect(init.method).toBe('POST')
    expect(init.headers['Idempotency-Key']).toBe('idem-key')
    expect(JSON.parse(init.body)).toEqual({ rangeStartUtc: 'a', rangeEndUtc: 'b', copyFromRangeStartUtc: null })

    respondWith(200, {})
    await service().Validate(42, 'rev-1')
    expect(global.fetch.mock.calls[0][0]).toBe('/workforce/stores/42/schedules/rev-1/validate')
    expect(global.fetch.mock.calls[0][1].headers['Idempotency-Key']).toBe('idem-key')

    respondWith(200, {})
    await service().Publish(42, 'rev-1')
    init = global.fetch.mock.calls[0][1]
    expect(global.fetch.mock.calls[0][0]).toBe('/workforce/stores/42/schedules/rev-1/publish')
    expect(init.headers['Idempotency-Key']).toBe('idem-key')
  })

  test('a same-store double booking arrives typed, with the shift the API named', async () => {
    respondWith(409, {
      status: 409,
      detail: 'The assignment overlaps another active assignment for this person in the same legal-employer scope.',
      code: 'workforce.assignment-overlap',
      conflictKind: 'assignment-overlap',
      conflictingAssignmentId: 'a1',
      retryable: false
    })

    expect.assertions(4)
    try {
      await service().Publish(42, 'rev-1')
    } catch (e) {
      expect(isWorkforceApiError(e)).toBe(true)
      expect(e.status).toBe(409)
      expect(e.conflictKind).toBe('assignment-overlap')
      expect(e.conflictingAssignmentId).toBe('a1')
    }
  })

  test('a cross-store conflict arrives opaque — no store, no shift, nothing to leak', async () => {
    respondWith(409, {
      status: 409,
      detail: 'The operation conflicts with an existing engagement.',
      code: 'workforce.hidden-engagement-conflict',
      conflictKind: 'hidden-engagement-conflict',
      retryable: false
    })

    expect.assertions(2)
    try {
      await service().Publish(42, 'rev-1')
    } catch (e) {
      expect(e.conflictKind).toBe('hidden-engagement-conflict')
      expect(e.conflictingAssignmentId).toBeNull()
    }
  })

  test('a 403 is typed too, so the page can say "no access" rather than "something failed"', async () => {
    respondWith(403, { status: 403, detail: 'You do not have the required workforce capability for this store.', code: 'workforce.forbidden' })

    expect.assertions(2)
    try {
      await service().GetContext(42)
    } catch (e) {
      expect(e.status).toBe(403)
      expect(e.conflictKind).toBeNull()
    }
  })
})
