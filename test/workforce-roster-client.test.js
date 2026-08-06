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

  test('IssueInvitation posts to the engagement\'s invitations, with a key and NO If-Match', async () => {
    respondWith(200, { invitationId: 'inv-1', token: 'wfinv_raw', expiresAtUtc: '2026-08-14T00:00:00' })
    await service().IssueInvitation(42, 'sm-1', { expiresInHours: 168 })

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/staff/sm-1/invitations')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ expiresInHours: 168 })
    // A mutation, so the key is mandatory.
    expect(init.headers['Idempotency-Key']).toBe('idem-key')
    // And NO precondition. The invitation is a child resource with its own single-Pending guard, not
    // an optimistic-concurrency aggregate: the controller reads no If-Match, so sending one would be
    // inventing a contract — and gating the button on having a revision (as every other write here
    // is gated) would hide the module's only way in from a deployment with no rowversion.
    expect(init.headers['If-Match']).toBeUndefined()
  })

  test('IssueInvitation with no request body still sends an object, never undefined', async () => {
    respondWith(200, { invitationId: 'inv-1', token: 'wfinv_raw' })
    await service().IssueInvitation(42, 'sm-1')

    const [, init] = global.fetch.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({})
  })

  test('a replayed issue answers a null token, which is not a failure', async () => {
    // The stored idempotency outcome is deliberately token-less — the raw token is persisted
    // nowhere. A caller that treated a null token as an error would tell a manager the invitation
    // failed when it exists and is pending.
    respondWith(200, { invitationId: 'inv-1', token: null, expiresAtUtc: '2026-08-14T00:00:00' })
    const issued = await service().IssueInvitation(42, 'sm-1')

    expect(issued.invitationId).toBe('inv-1')
    expect(issued.token).toBeNull()
  })

  // ---- THE OTHER TWO THIRDS OF THE INVITATION SURFACE ----------------------------------------
  //
  // This client bound issue and nothing else, and said so in a comment, because the controller bound
  // nothing else. Endpoints 6b and 6c landed; these pin them.
  test('ListInvitations reads the STORE, not the engagement, and sends no key', async () => {
    respondWith(200, [])
    await service().ListInvitations(42)

    const [url, init] = global.fetch.mock.calls[0]
    // Store-scoped: "which codes are still out there" is a store-wide question, and one read then
    // serves every row the manager clicks through.
    expect(url).toBe('/workforce/stores/42/invitations')
    expect(init.method).toBe('GET')
    // A read. An Idempotency-Key here would be inventing a contract the controller does not have.
    expect(init.headers['Idempotency-Key']).toBeUndefined()
    expect(init.headers['If-Match']).toBeUndefined()
  })

  test('the list distinguishes the STORED state from liveness, and carries no token', async () => {
    // `WorkforceInvitationState.Expired` is written by no code path: expiry is a read-time
    // comparison, so a code that lapsed a month ago is still `Pending` in its row. A caller that
    // took `state` for liveness would report a dead code as outstanding.
    respondWith(200, [{
      invitationId: 'inv-1',
      storeId: 42,
      staffMemberId: 'sm-1',
      displayName: 'Ida Berg',
      state: 'Pending',
      isLive: false,
      expiresAtUtc: '2026-06-01T00:00:00',
      createdAtUtc: '2026-05-18T00:00:00'
    }])

    const [outstanding] = await service().ListInvitations(42)
    expect(outstanding.state).toBe('Pending')
    expect(outstanding.isLive).toBe(false)
    // §13.4: the raw token left the building on the issue response and the hash never leaves the
    // data layer. A manager needs to know THAT a code is out and to WHOM, never what it is.
    expect(Object.keys(outstanding)).not.toContain('token')
    expect(Object.keys(outstanding)).not.toContain('tokenHash')
  })

  test('RevokeInvitation posts to the STORE-scoped revoke, with a key and no If-Match', async () => {
    respondWith(200, { invitationId: 'inv-1', state: 'Revoked', isLive: false })
    await service().RevokeInvitation(42, 'inv-1')

    const [url, init] = global.fetch.mock.calls[0]
    // POST /revoke rather than DELETE: the row is not removed, it transitions and stays as the
    // record of what was withdrawn. A DELETE verb would advertise the opposite.
    expect(url).toBe('/workforce/stores/42/invitations/inv-1/revoke')
    expect(init.method).toBe('POST')
    expect(init.headers['Idempotency-Key']).toBe('idem-key')
    expect(init.headers['If-Match']).toBeUndefined()
  })

  // THE REFUSAL A QUIET SUCCESS WOULD MAKE DANGEROUS. A manager withdraws because the code went to
  // the wrong person; if that person already redeemed it, a 200 says "safe" at the moment they are
  // not. The client must surface it as an error rather than resolving.
  test('revoking an already-claimed code REJECTS, typed and not retryable', async () => {
    respondWith(409, {
      code: 'workforce.invitation-not-revocable',
      conflictKind: 'invitation-not-revocable',
      retryable: false,
      detail: 'This invitation has already been claimed; withdrawing it cannot undo the access it granted.'
    })

    const error = await service().RevokeInvitation(42, 'inv-1').catch(e => e)
    expect(isWorkforceApiError(error)).toBe(true)
    expect(error.code).toBe('workforce.invitation-not-revocable')
    expect(error.retryable).toBe(false)
  })

  test('the concurrent-revoke conflict arrives typed and wants a fresh key', async () => {
    respondWith(409, {
      code: 'workforce.invitation-revoke-conflict',
      conflictKind: 'invitation-revoke-conflict',
      retryable: true,
      retryWithFreshKey: true
    })

    const error = await service().RevokeInvitation(42, 'inv-1').catch(e => e)
    expect(error.code).toBe('workforce.invitation-revoke-conflict')
    expect(error.problem.retryWithFreshKey).toBe(true)
  })

  test('the concurrent-issue conflict arrives typed and retryable', async () => {
    respondWith(409, {
      code: 'workforce.invitation-issue-conflict',
      conflictKind: 'invitation-issue-conflict',
      retryable: true,
      retryWithFreshKey: true
    })

    const error = await service().IssueInvitation(42, 'sm-1').catch(e => e)
    expect(isWorkforceApiError(error)).toBe(true)
    expect(error.code).toBe('workforce.invitation-issue-conflict')
    expect(error.retryable).toBe(true)
    // The retry must carry a FRESH key, which is automatic: `_mutate` mints one per call, so simply
    // pressing the button again is the correct retry rather than a resubmission of a reserved key.
    expect(error.problem.retryWithFreshKey).toBe(true)
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
