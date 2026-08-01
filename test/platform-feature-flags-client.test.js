import { StoreFeatureFlagReader, PlatformApiError, isPlatformApiError } from '~/utils/platform/feature-flags-client'
import { StoreFeatureFlagReader as GrowthReExport } from '~/utils/growth/growth-client'

const originalFetch = global.fetch

function respond (body, options) {
  const opts = options || {}
  global.fetch = jest.fn().mockResolvedValue({
    ok: opts.ok === undefined ? true : opts.ok,
    status: opts.status || 200,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
  })
}

const reader = () => new StoreFeatureFlagReader({ bearerToken: 'tok-123' })
const lastCall = () => global.fetch.mock.calls[global.fetch.mock.calls.length - 1]
const lastUrl = () => lastCall()[0]
const lastInit = () => lastCall()[1]

afterEach(() => { global.fetch = originalFetch })

describe('StoreFeatureFlagReader — route-for-route with StoreFeatureFlagsController', () => {
  test('the catalog read is deployment-wide and carries no store', async () => {
    respond([])
    await reader().GetCatalog()
    expect(lastUrl()).toBe('/feature-flags/catalog')
    expect(lastInit().method).toBe('GET')
  })

  test('the store read is scoped to the store', async () => {
    respond([])
    await reader().GetStoreFlags(42)
    expect(lastUrl()).toBe('/stores/42/feature-flags')
    expect(lastInit().method).toBe('GET')
  })

  test('the write is a PUT whose body carries the key, the value and the note', async () => {
    respond({})
    await reader().SetStoreFlag(42, 'workforce.publication', true, 'incident 4412 stood down')
    expect(lastUrl()).toBe('/stores/42/feature-flags')
    expect(lastInit().method).toBe('PUT')
    expect(JSON.parse(lastInit().body))
      .toEqual({ flagKey: 'workforce.publication', enabled: true, note: 'incident 4412 stood down' })
  })

  // `enabled` is what decides whether a kill switch is up or down. A truthy value that is not `true`
  // reaching the wire would be a bug the server could not see, so it is coerced here and asserted.
  test('the write sends a boolean, never whatever truthy value the caller held', async () => {
    respond({})
    await reader().SetStoreFlag(42, 'Margin.Module', 1)
    expect(JSON.parse(lastInit().body)).toEqual({ flagKey: 'Margin.Module', enabled: true, note: null })

    await reader().SetStoreFlag(42, 'Margin.Module', undefined)
    expect(JSON.parse(lastInit().body)).toEqual({ flagKey: 'Margin.Module', enabled: false, note: null })
  })

  test('clearing is a DELETE with the key in the query, encoded', async () => {
    respond({ flagKey: 'training.setup', cleared: true })
    await reader().ClearStoreFlag(42, 'training.setup')
    expect(lastUrl()).toBe('/stores/42/feature-flags?flagKey=training.setup')
    expect(lastInit().method).toBe('DELETE')

    await reader().ClearStoreFlag(42, 'Events.Core/../admin')
    expect(lastUrl()).toBe('/stores/42/feature-flags?flagKey=Events.Core%2F..%2Fadmin')
  })

  // No workforce surface accepts a mutation without an `Idempotency-Key`; this controller reads no
  // such header. Sending one would imply a contract that does not exist — and, worse, would make a
  // future reader believe the write is replay-protected server-side when it is not.
  test('no mutation carries an Idempotency-Key, because this controller reads none', async () => {
    respond({})
    await reader().SetStoreFlag(42, 'workforce.publication', false)
    expect(lastInit().headers['Idempotency-Key']).toBeUndefined()

    await reader().ClearStoreFlag(42, 'workforce.publication')
    expect(lastInit().headers['Idempotency-Key']).toBeUndefined()
  })

  test('every call carries the bearer the initializer holds', async () => {
    respond([])
    await reader().GetCatalog()
    expect(lastInit().headers.Authorization).toBe('Bearer tok-123')
  })
})

describe('the refusal shape this controller actually emits', () => {
  // The reason this client does not reuse `WorkforceApiError`: a 400 from `Set`/`Clear` is
  // `{ message: "Unknown feature flag: …" }`, which is the only thing the server says about WHY the
  // write was refused. Read through the workforce type that sentence becomes "HTTP 400".
  test('a 400 keeps the server\'s own sentence', async () => {
    respond({ message: 'Unknown feature flag: workforce.personnel-list' }, { ok: false, status: 400 })
    await expect(reader().SetStoreFlag(42, 'workforce.personnel-list', true))
      .rejects.toMatchObject({ status: 400, message: 'Unknown feature flag: workforce.personnel-list' })
  })

  // `Forbid()` answers 403 with no body at all, and it is the SAME answer for "not a store admin"
  // and "no such store" — deliberately, so the API never leaks a store's existence. A caller must be
  // able to see the status; it must not be able to read a sentence that distinguishes the two.
  test('a 403 is typed and carries no body to distinguish the two things it means', async () => {
    respond(undefined, { ok: false, status: 403 })
    const error = await reader().GetStoreFlags(42).catch(e => e)
    expect(isPlatformApiError(error)).toBe(true)
    expect(error.status).toBe(403)
    // No sentence at all: nothing here can be rendered as "no such store" or as "you lack the
    // capability", because the server said neither and only the status is a fact.
    expect(error.body).toEqual({})
    expect(error.message).toBe('HTTP 403')
  })

  test('an ASP.NET problem-details body is read through its own fields', async () => {
    respond({ title: 'Unauthorized', detail: 'No bearer token.', status: 401 }, { ok: false, status: 401 })
    await expect(reader().GetCatalog()).rejects.toMatchObject({ status: 401, message: 'No bearer token.' })
  })

  // The discriminator is a flag rather than `instanceof`, because `instanceof` against a subclassed
  // Error does not survive an ES5 transpile — the failure is silent and the typed refusal simply
  // stops being recognised.
  test('the discriminator survives losing the prototype, which instanceof does not', () => {
    const error = new PlatformApiError(403, null)
    expect(isPlatformApiError(error)).toBe(true)

    // What an ES5 transpile of `class X extends Error` does to an instance, in one line: the
    // prototype chain no longer leads back to the class. `instanceof` stops working; the flag does
    // not, and that is the whole reason the flag is there.
    const transpiled = Object.assign(Object.create(null), error)
    expect(transpiled instanceof PlatformApiError).toBe(false)
    expect(isPlatformApiError(transpiled)).toBe(true)

    expect(isPlatformApiError(new Error('nope'))).toBe(false)
    expect(isPlatformApiError(null)).toBe(false)
  })

  // A network rejection is not a refusal. If it were re-keyed into a typed error, "the request never
  // happened" would render as "the server said no" — which on a kill-switch page is the difference
  // between an operator retrying and an operator believing the switch is down.
  test('a network rejection propagates untouched', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await reader().GetCatalog().catch(e => e)
    expect(isPlatformApiError(error)).toBe(false)
    expect(error.message).toBe('Failed to fetch')
  })
})

describe('one definition of the route', () => {
  // Growth read this route first and defined the class; the operator screen writes the same route.
  // Two definitions is where a route drifts, so Growth re-exports rather than keeping a copy — and
  // this asserts it is the same class object, not a same-shaped twin.
  test('the Growth client re-exports the platform reader rather than defining a second one', () => {
    expect(GrowthReExport).toBe(StoreFeatureFlagReader)
  })
})
