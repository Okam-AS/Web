import { WorkforceClientBase } from '~/utils/workforce/api-client'
import {
  MealsStoreService,
  refusalOf,
  REFUSAL_DARK,
  REFUSAL_ABSENT,
  REFUSAL_FORBIDDEN,
  REFUSAL_UNAUTHENTICATED,
  REFUSAL_UNKNOWN
} from '~/utils/meals/meals-client'

// The Meals store client. Two things are under test and they are different in kind:
//
//   1. THE ROUTES — that the two methods call paths the backend actually binds. This is the class of
//      defect that produced four Workforce client functions calling routes that never existed.
//   2. THE 404 SPLIT — the only piece of Meals-specific judgement in the client. Meals is a dark
//      module, and everything the surface is allowed to SAY about that darkness is derived from this
//      one function, so it is tested against both halves of the wire behaviour rather than one.

const originalFetch = global.fetch

function respondWith (status, body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    // `undefined` means an EMPTY body — the routing-404 case. `null` would be the JSON literal.
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
  })
}

async function failureFrom (call) {
  try {
    await call()
    return null
  } catch (e) {
    return e
  }
}

afterEach(() => { global.fetch = originalFetch })

describe('MealsStoreService — route-for-route with the backend', () => {
  test('it is the SHARED HTTP layer, not a third copy of it', () => {
    expect(new MealsStoreService({})).toBeInstanceOf(WorkforceClientBase)
  })

  test('the two reads hit the two store-scoped routes the backend binds', async () => {
    respondWith(200, [])
    await new MealsStoreService({ bearerToken: 'tok' }).ListCompanies(42)
    expect(global.fetch.mock.calls[0][0]).toContain('/v1/stores/42/meals/companies')

    respondWith(200, { orders: [] })
    await new MealsStoreService({ bearerToken: 'tok' }).ListOrders(42)
    expect(global.fetch.mock.calls[0][0]).toContain('/v1/stores/42/meals/orders')
  })

  test('both are reads: bearer token, no Idempotency-Key, no body', async () => {
    respondWith(200, [])
    await new MealsStoreService({ bearerToken: 'tok' }).ListCompanies(42)
    const init = global.fetch.mock.calls[0][1]
    expect(init.method).toBe('GET')
    expect(init.headers.Authorization).toBe('Bearer tok')
    expect(init.headers['Idempotency-Key']).toBeUndefined()
    expect(init.body).toBeUndefined()
  })

  // The surface binds NO mutation. The one store-scoped Meals mutation that exists — resolving a
  // reconciliation exception — gates on the module-wide config flag rather than the per-store one,
  // so it is unreachable wherever these reads are reachable. A method for it would be a button that
  // can only 404.
  test('the client exposes exactly two methods, and neither mutates', () => {
    const methods = Object.getOwnPropertyNames(MealsStoreService.prototype)
      .filter(name => name !== 'constructor')
    expect(methods.sort()).toEqual(['ListCompanies', 'ListOrders'])
  })
})

describe('refusalOf — the 404 split, which is the whole of what darkness may claim', () => {
  // THE LOAD-BEARING PAIR. Both are 404s. What separates them is the wire fact the backend pinned
  // in `MealsWireTests.PINNED_a_dark_route_is_already_distinguishable_from_a_path_that_is_not_routed`:
  // a dark Meals route answers with a problem document carrying a `meals.*` code, a path that is not
  // routed answers with an empty body. The fixtures below therefore VARY the body, not the status.
  test('a dark module 404 and an unrouted 404 are two different answers', async () => {
    respondWith(404, {
      type: 'https://okam.no/problems/meals/not-found',
      title: 'Not Found',
      status: 404,
      detail: 'The requested Company Meals resource was not found.',
      code: 'meals.not-found'
    })
    const dark = await failureFrom(() => new MealsStoreService({}).ListCompanies(42))

    respondWith(404) // empty body — exactly what routing's own 404 sends
    const unrouted = await failureFrom(() => new MealsStoreService({}).ListCompanies(42))

    expect(dark.status).toBe(404)
    expect(unrouted.status).toBe(404)
    // The positive control: the split is not an artefact of one side failing to produce an error.
    expect(refusalOf(dark)).toBe(REFUSAL_DARK)
    expect(refusalOf(unrouted)).toBe(REFUSAL_ABSENT)
    expect(refusalOf(dark)).not.toBe(refusalOf(unrouted))
  })

  // The strict direction. A 404 that carries SOME code but not a `meals.*` one was not written by
  // this module, so it may not be reported as "the Meals module answered". Getting this wrong is how
  // a proxy's JSON 404 would end up telling a venue their Meals is switched off.
  test('a 404 whose code is not in the meals.* family is ABSENT, never dark', async () => {
    respondWith(404, { status: 404, code: 'gateway.route-not-found', detail: 'no upstream' })
    const foreign = await failureFrom(() => new MealsStoreService({}).ListOrders(42))
    expect(foreign.code).toBe('gateway.route-not-found')
    expect(refusalOf(foreign)).toBe(REFUSAL_ABSENT)
  })

  test('403 and 401 are their own claims, not folded into unknown', async () => {
    respondWith(403, { status: 403, code: 'meals.forbidden', detail: 'store admin required' })
    expect(refusalOf(await failureFrom(() => new MealsStoreService({}).ListOrders(42)))).toBe(REFUSAL_FORBIDDEN)

    respondWith(401, { status: 401 })
    expect(refusalOf(await failureFrom(() => new MealsStoreService({}).ListOrders(42)))).toBe(REFUSAL_UNAUTHENTICATED)
  })

  test('a 500 and a network failure are unknown — and unknown is not absent', async () => {
    respondWith(500, { status: 500 })
    expect(refusalOf(await failureFrom(() => new MealsStoreService({}).ListOrders(42)))).toBe(REFUSAL_UNKNOWN)

    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const offline = await failureFrom(() => new MealsStoreService({}).ListOrders(42))
    expect(refusalOf(offline)).toBe(REFUSAL_UNKNOWN)
    expect(refusalOf(offline)).not.toBe(REFUSAL_ABSENT)
  })

  test('no error is no refusal', () => {
    expect(refusalOf(null)).toBeNull()
    expect(refusalOf(undefined)).toBeNull()
  })
})
