import { isWorkforceApiError } from '~/utils/workforce/api-client'
import { WorkforceRosterService } from '~/utils/workforce/roster-client'

// The client is route-for-route with `WorkforceStaffController`, so these assert the wire contract
// itself: the exact paths, the `Idempotency-Key` every workforce mutation requires, the `If-Match`
// precondition the engagement PATCH additionally requires, and the typed problem+json the surface's
// conflicts come back as.
describe('WorkforceRosterService', () => {
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
    return new WorkforceRosterService({ bearerToken: 'tok-123' })
  }

  beforeEach(() => {
    global.crypto = { randomUUID: () => 'idem-key' }
  })

  afterEach(() => {
    global.fetch = originalFetch
    global.crypto = originalCrypto
  })

  test('ListStaff hits GET /staff with no query at all', async () => {
    respondWith(200, [])
    await service().ListStaff(42)

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/staff')
    expect(init.method).toBe('GET')
    expect(init.headers.Authorization).toBe('Bearer tok-123')
    // A read, so no Idempotency-Key is sent.
    expect(init.headers['Idempotency-Key']).toBeUndefined()
  })

  test('CreateStaff posts to /staff and carries the Idempotency-Key the surface demands', async () => {
    respondWith(200, { staffMemberId: 'sm-1' })
    await service().CreateStaff(42, { legalEmployerId: 'le-1', capabilities: ['WorkforceSelf'] })

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/staff')
    expect(init.method).toBe('POST')
    expect(init.headers['Idempotency-Key']).toBe('idem-key')
    // No If-Match: a create has no aggregate to be stale against.
    expect(init.headers['If-Match']).toBeUndefined()
    expect(JSON.parse(init.body).legalEmployerId).toBe('le-1')
  })

  // THE precondition of this surface. Without an If-Match the controller answers a plain 400 before
  // the service is even reached, so a client that forgot it would fail on every edit.
  test('UpdateStaff PATCHes with BOTH the idempotency key and the opaque revision as If-Match', async () => {
    respondWith(200, { staffMemberId: 'sm-1' })
    await service().UpdateStaff(42, 'sm-1', 'AAAAAAAAB9E=', { isActive: false })

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/staff/sm-1')
    expect(init.method).toBe('PATCH')
    expect(init.headers['Idempotency-Key']).toBe('idem-key')
    expect(init.headers['If-Match']).toBe('AAAAAAAAB9E=')
    expect(JSON.parse(init.body)).toEqual({ isActive: false })
  })

  // An absent If-Match is the honest 400 ("no precondition"); a literal "null" one would be
  // compared against the real rowversion and come back as a stale-revision 409, telling the manager
  // somebody else changed the row when nobody did.
  test('UpdateStaff OMITS If-Match entirely when there is no revision, rather than sending junk', async () => {
    respondWith(400, { code: 'workforce.module-error' })
    await service().UpdateStaff(42, 'sm-1', null, { isActive: false }).catch(() => {})

    const [, init] = global.fetch.mock.calls[0]
    expect(init.headers['If-Match']).toBeUndefined()
    expect(init.headers['Idempotency-Key']).toBe('idem-key')
  })

  test('GetStaff reads one engagement', async () => {
    respondWith(200, { staffMemberId: 'sm-1', revision: 'AAAA' })
    const detail = await service().GetStaff(42, 'sm-1')

    expect(global.fetch.mock.calls[0][0]).toBe('/workforce/stores/42/staff/sm-1')
    expect(detail.revision).toBe('AAAA')
  })

  test('roles: the store catalogue and the engagement\'s own set are two different routes', async () => {
    respondWith(200, [])
    await service().ListRoles(42)
    expect(global.fetch.mock.calls[0][0]).toBe('/workforce/stores/42/roles')

    respondWith(200, [])
    await service().ListStaffRoles(42, 'sm-1')
    expect(global.fetch.mock.calls[0][0]).toBe('/workforce/stores/42/staff/sm-1/roles')
  })

  // PUT sets the roles to EXACTLY the submitted set — links not listed are removed — so the client
  // always sends a full list rather than a delta.
  test('AssignStaffRoles PUTs the full intended set', async () => {
    respondWith(200, [])
    await service().AssignStaffRoles(42, 'sm-1', [{ roleId: 'r1' }, { roleId: 'r2' }])

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/staff/sm-1/roles')
    expect(init.method).toBe('PUT')
    expect(init.headers['Idempotency-Key']).toBe('idem-key')
    expect(JSON.parse(init.body).roles).toHaveLength(2)
  })

  test('employment terms read and append on the same path', async () => {
    respondWith(200, [])
    await service().GetEmploymentTerms(42, 'sm-1')
    expect(global.fetch.mock.calls[0][0]).toBe('/workforce/stores/42/staff/sm-1/employment-terms')

    respondWith(200, {})
    await service().CreateEmploymentTerm(42, 'sm-1', { effectiveFromUtc: '2026-08-01T00:00:00' })
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/staff/sm-1/employment-terms')
    expect(init.method).toBe('PUT')
  })

  // The bounds carry no zone designator, for the reason spelled out in api-client.js: a trailing Z
  // invites the query-string binder to convert into the server's own local time.
  test('GetAttendance sends bare range bounds', async () => {
    respondWith(200, { rows: [] })
    await service().GetAttendance(42, new Date('2026-06-29T00:00:00Z'), new Date('2026-07-30T00:00:00Z'))

    const [url] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/attendance?from=2026-06-29T00%3A00%3A00&to=2026-07-30T00%3A00%3A00')
  })

  // The two engagement conflicts are ONE rule with two answers, and the client must surface both
  // faithfully — the visible one names the row, the hidden one names nothing at all.
  test('the same-store conflict arrives typed and names the conflicting engagement', async () => {
    respondWith(409, {
      code: 'workforce.engagement-conflict',
      conflictKind: 'engagement-conflict',
      conflictingStaffMemberId: 'sm-9',
      detail: 'The person already holds an active engagement with this legal employer in this store.',
      retryable: false
    })

    await expect(service().CreateStaff(42, {})).rejects.toMatchObject({
      status: 409,
      code: 'workforce.engagement-conflict',
      conflictKind: 'engagement-conflict'
    })

    const error = await service().CreateStaff(42, {}).catch(e => e)
    expect(isWorkforceApiError(error)).toBe(true)
    // The whole body survives on `problem`, so the id is reachable without the base type growing a
    // field per surface.
    expect(error.problem.conflictingStaffMemberId).toBe('sm-9')
  })

  test('the cross-store conflict arrives typed and names NOTHING', async () => {
    respondWith(409, {
      code: 'workforce.hidden-engagement-conflict',
      conflictKind: 'hidden-engagement-conflict',
      detail: 'The person already holds a conflicting active engagement.',
      retryable: false
    })

    const error = await service().CreateStaff(42, {}).catch(e => e)
    expect(error.code).toBe('workforce.hidden-engagement-conflict')
    // Not a single identifier of the other store, its engagement or its times.
    expect(Object.keys(error.problem)).toEqual(['code', 'conflictKind', 'detail', 'retryable'])
    expect(error.problem.storeId).toBeUndefined()
  })

  test('a stale revision arrives typed, carrying the current token to re-read against', async () => {
    respondWith(409, {
      code: 'workforce.stale-revision',
      conflictKind: 'stale-revision',
      currentRevision: 'BBBB',
      retryable: true
    })

    const error = await service().UpdateStaff(42, 'sm-1', 'AAAA', {}).catch(e => e)
    expect(error.code).toBe('workforce.stale-revision')
    expect(error.retryable).toBe(true)
  })
})
