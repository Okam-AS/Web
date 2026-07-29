import {
  TrainingStoreService,
  gateOf,
  codeOf,
  GATE_UNKNOWN,
  GATE_UNAUTHENTICATED,
  GATE_FORBIDDEN,
  GATE_INVISIBLE,
  GATE_UNREACHABLE
} from '~/utils/training/training-client'
import { WorkforceApiError } from '~/utils/workforce/api-client'

// The client is route-for-route with `Controllers/TrainingController.cs`, so these assert the wire
// contract rather than a rendering choice: the exact paths the controller binds, the
// `Idempotency-Key` every mutation must carry and no read may, and the classification of the ONE
// refusal on this surface that is allowed to mean something.

const STORE = 42
const COURSE = '11111111-1111-1111-1111-111111111111'
const VERSION = '22222222-2222-2222-2222-222222222222'
const ASSIGNMENT = '33333333-3333-3333-3333-333333333333'
const PERSON = '44444444-4444-4444-4444-444444444444'

// `newGuid` reaches for the platform `crypto`, which jsdom does not provide here. A COUNTER rather
// than a constant: a stub returning one fixed string would make the "two writes get different keys"
// test assert nothing — it would pass whether `_mutate` minted a key per call or cached one forever.
const originalCrypto = global.crypto
let minted = 0
beforeEach(() => {
  minted = 0
  global.crypto = { randomUUID: () => 'idem-key-' + (++minted) }
})
afterEach(() => { global.crypto = originalCrypto })

describe('TrainingStoreService — routes', () => {
  const originalFetch = global.fetch

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  }

  function service () {
    return new TrainingStoreService({ bearerToken: 'tok-123' })
  }

  afterEach(() => { global.fetch = originalFetch })

  test('every read hits the store-scoped route the controller binds', async () => {
    const cases = [
      [s => s.GetContext(STORE), 'GET', '/training/stores/42/context'],
      [s => s.ListCourses(STORE), 'GET', '/training/stores/42/courses'],
      [s => s.GetCourse(STORE, COURSE), 'GET', '/training/stores/42/courses/' + COURSE],
      [s => s.ListAssignments(STORE), 'GET', '/training/stores/42/assignments'],
      [s => s.ListCompletions(STORE), 'GET', '/training/stores/42/completions'],
      [s => s.ListCertificates(STORE), 'GET', '/training/stores/42/certificates'],
      [s => s.GetHoldings(STORE, PERSON), 'GET', '/training/stores/42/competency/holdings?person=' + PERSON]
    ]

    for (const [call, method, url] of cases) {
      respondWith(200, {})
      await call(service())
      const [gotUrl, init] = global.fetch.mock.calls[0]
      expect(gotUrl).toBe(url)
      expect(init.method).toBe(method)
      expect(init.headers.Authorization).toBe('Bearer tok-123')
    }
  })

  test('every write hits the store-scoped route the controller binds', async () => {
    const cases = [
      [s => s.CreateCourse(STORE, { title: 'IK' }), 'POST', '/training/stores/42/courses'],
      [s => s.CreateVersion(STORE, COURSE, {}), 'POST', '/training/stores/42/courses/' + COURSE + '/versions'],
      [s => s.PublishVersion(STORE, COURSE, 2), 'POST', '/training/stores/42/courses/' + COURSE + '/versions/2/publish'],
      [s => s.CreateAssignment(STORE, {}), 'POST', '/training/stores/42/assignments'],
      [s => s.RevokeAssignment(STORE, ASSIGNMENT), 'DELETE', '/training/stores/42/assignments/' + ASSIGNMENT],
      [s => s.RecordCompletion(STORE, {}), 'POST', '/training/stores/42/completions'],
      [s => s.RegisterCertificate(STORE, {}), 'POST', '/training/stores/42/certificates']
    ]

    for (const [call, method, url] of cases) {
      respondWith(200, {})
      await call(service())
      const [gotUrl, init] = global.fetch.mock.calls[0]
      expect(gotUrl).toBe(url)
      expect(init.method).toBe(method)
    }
  })

  test('publish addresses the version by NUMBER, which is what the route binds', async () => {
    // `versions/{versionNo:int}/publish`. Sending the `courseVersionId` here would 404 opaquely and
    // be indistinguishable from a course that is not there — so this pins the discriminating half.
    respondWith(200, {})
    await service().PublishVersion(STORE, COURSE, 3)
    expect(global.fetch.mock.calls[0][0]).toBe('/training/stores/42/courses/' + COURSE + '/versions/3/publish')
    expect(global.fetch.mock.calls[0][0]).not.toContain(VERSION)
  })

  test('the holdings read carries the person as a query parameter, not as a path segment', async () => {
    respondWith(200, { heldCompetencyKeys: [], certificates: [] })
    await service().GetHoldings(STORE, PERSON)
    expect(global.fetch.mock.calls[0][0]).toBe('/training/stores/42/competency/holdings?person=' + PERSON)
  })
})

describe('TrainingStoreService — the Idempotency-Key rule', () => {
  const originalFetch = global.fetch

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  }

  const service = () => new TrainingStoreService({ bearerToken: 'tok' })

  afterEach(() => { global.fetch = originalFetch })

  test('every mutation carries one; the controller answers 400 without it', async () => {
    const writes = [
      s => s.CreateCourse(STORE, {}),
      s => s.CreateVersion(STORE, COURSE, {}),
      s => s.PublishVersion(STORE, COURSE, 1),
      s => s.CreateAssignment(STORE, {}),
      s => s.RevokeAssignment(STORE, ASSIGNMENT),
      s => s.RecordCompletion(STORE, {}),
      s => s.RegisterCertificate(STORE, {})
    ]

    for (const write of writes) {
      respondWith(200, {})
      await write(service())
      expect(global.fetch.mock.calls[0][1].headers['Idempotency-Key']).toEqual(expect.any(String))
      expect(global.fetch.mock.calls[0][1].headers['Idempotency-Key'].length).toBeGreaterThan(0)
    }
  })

  test('POSITIVE CONTROL: no read carries one, so the assertion above is not vacuous', async () => {
    const reads = [
      s => s.GetContext(STORE),
      s => s.ListCourses(STORE),
      s => s.GetCourse(STORE, COURSE),
      s => s.ListAssignments(STORE),
      s => s.ListCompletions(STORE),
      s => s.ListCertificates(STORE),
      s => s.GetHoldings(STORE, PERSON)
    ]

    for (const read of reads) {
      respondWith(200, {})
      await read(service())
      expect(global.fetch.mock.calls[0][1].headers['Idempotency-Key']).toBeUndefined()
    }
  })

  test('two writes get DIFFERENT keys — a reused key with a different payload is a 409, not a replay', async () => {
    respondWith(200, {})
    await service().CreateCourse(STORE, { title: 'A' })
    const first = global.fetch.mock.calls[0][1].headers['Idempotency-Key']

    respondWith(200, {})
    await service().CreateCourse(STORE, { title: 'B' })
    const second = global.fetch.mock.calls[0][1].headers['Idempotency-Key']

    expect(second).not.toBe(first)
  })

  test('the revoke DELETE tolerates the 204 the controller returns, rather than treating it as a failure', async () => {
    // `RevokeAssignment` answers `NoContent()`. An empty body must come back as null, not throw.
    respondWith(204)
    await expect(service().RevokeAssignment(STORE, ASSIGNMENT)).resolves.toBeNull()
  })
})

describe('gateOf — the one refusal on this surface that is allowed to mean something', () => {
  const problem = (status, body) => new WorkforceApiError(status, body)

  test('a 404 the Training module wrote means the module is invisible for this store', () => {
    expect(gateOf(problem(404, { code: 'training.not-found', detail: 'x' }))).toBe(GATE_INVISIBLE)
  })

  test('a 404 with NO training code means the module never answered — a different sentence', () => {
    // The discriminator is the code, and this varies exactly that: same status, same shape, no code.
    expect(gateOf(problem(404, {}))).toBe(GATE_UNREACHABLE)
    expect(gateOf(problem(404, null))).toBe(GATE_UNREACHABLE)
  })

  test('a 404 carrying somebody ELSE\'S code is unreachable too, not invisible', () => {
    // "Some code was present" is the loose test that would let a gateway's document be reported as
    // Training answering. The prefix is required, so this varies the prefix and nothing else.
    expect(gateOf(problem(404, { code: 'workforce.not-found' }))).toBe(GATE_UNREACHABLE)
    expect(gateOf(problem(404, { code: 'meals.not-found' }))).toBe(GATE_UNREACHABLE)
  })

  test('403 is forbidden and 401 is unauthenticated', () => {
    expect(gateOf(problem(403, { code: 'training.forbidden' }))).toBe(GATE_FORBIDDEN)
    expect(gateOf(problem(401, {}))).toBe(GATE_UNAUTHENTICATED)
  })

  test('anything else is UNKNOWN — never "the module is off"', () => {
    expect(gateOf(problem(500, {}))).toBe(GATE_UNKNOWN)
    expect(gateOf(problem(409, { code: 'training.flag-disabled-read-only' }))).toBe(GATE_UNKNOWN)
    // Not even a typed error: a network failure says nothing about the store.
    expect(gateOf(new Error('network down'))).toBe(GATE_UNKNOWN)
  })

  test('POSITIVE CONTROL: a successful read is not classified at all', () => {
    expect(gateOf(null)).toBeNull()
    expect(gateOf(undefined)).toBeNull()
  })

  test('THE POSTURE: no 403 code can produce a screen that distinguishes WHY the caller was refused', () => {
    // `TrainingAuthorizationService` throws the same `Forbidden()` for a store the caller does not
    // hold and for a store row that is absent, and `TrainingTenantIsolationTests` pins the two
    // answers EQUAL — divergence is the disclosure. The backend also declares a
    // `training.cross-store-denied` 403 with a DISTINCT code, deliberately left with no throw site
    // for exactly that reason.
    //
    // So the property worth pinning is not that two identical documents classify identically (they
    // trivially would): it is that this classifier has NO branch on the 403's code at all, and
    // therefore could not surface a distinction even if one arrived on the wire. That means varying
    // the code and asserting the screen does not move.
    const forbidden = problem(403, { code: 'training.forbidden', detail: 'You must be an admin of this store to manage its training.' })
    const crossStore = problem(403, { code: 'training.cross-store-denied', detail: 'The request targeted a store other than the route store.', retryable: false })
    const codeless = problem(403, {})

    expect(gateOf(forbidden)).toBe(GATE_FORBIDDEN)
    expect(gateOf(crossStore)).toBe(GATE_FORBIDDEN)
    expect(gateOf(codeless)).toBe(GATE_FORBIDDEN)

    // POSITIVE CONTROL, and the reason the three above are not vacuous: the classifier is not a
    // constant — a different STATUS genuinely moves the screen.
    expect(gateOf(problem(404, { code: 'training.not-found' }))).not.toBe(GATE_FORBIDDEN)
  })
})

describe('codeOf — copy is keyed on the stable code, never on the prose', () => {
  test('a training code comes back', () => {
    expect(codeOf(new WorkforceApiError(409, { code: 'training.course-version-immutable' })))
      .toBe('training.course-version-immutable')
  })

  test('a code from another module does not, so its failure is not attributed to Training', () => {
    expect(codeOf(new WorkforceApiError(409, { code: 'workforce.hidden-engagement-conflict' }))).toBeNull()
  })

  test('a failure with no code at all does not', () => {
    expect(codeOf(new WorkforceApiError(500, {}))).toBeNull()
    expect(codeOf(new Error('boom'))).toBeNull()
    expect(codeOf(null)).toBeNull()
  })
})
