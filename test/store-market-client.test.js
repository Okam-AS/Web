import { WorkforceClientBase } from '~/utils/workforce/api-client'
import { StoreMarketService, StoreMarketApiError, isStoreMarketApiError } from '~/utils/store-market/market-client'

// The store-market client. Three things are under test and they are different in kind:
//
//   1. THE ROUTES — that the two methods call paths `StoreMarketController` actually binds. This is
//      the class of defect that produced four Workforce client functions calling routes that never
//      existed.
//   2. THE BODY — that no currency is ever sent as a value, and that `expectedCurrencyCode` is sent
//      as an assertion only when the caller holds one. The market-authority law lives or dies here.
//   3. THE ENVELOPE — that `{ code, message, market }` is read, including `market`, which is the
//      store's UNCHANGED state and the only reason the card can keep telling the truth after a
//      refusal.

const originalFetch = global.fetch
let lastRequest = null

function respondWith (status, body) {
  global.fetch = jest.fn().mockImplementation((url, options) => {
    lastRequest = { url, options }
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
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

const market = over => Object.assign({
  storeId: 1,
  country: 'NO',
  currencyCode: 'NOK',
  timeZone: 'Europe/Oslo',
  effectiveTimeZone: 'Europe/Oslo',
  timeZoneIsFallback: false,
  isConfigured: true
}, over)

const body = () => JSON.parse(lastRequest.options.body)

beforeEach(() => { lastRequest = null })
afterEach(() => { global.fetch = originalFetch })

describe('StoreMarketService — route-for-route with StoreMarketController', () => {
  test('it is the SHARED HTTP layer, not another copy of it', () => {
    expect(new StoreMarketService({})).toBeInstanceOf(WorkforceClientBase)
  })

  test('Get reads GET /stores/{id}/market', async () => {
    respondWith(200, market())
    const read = await new StoreMarketService({ bearerToken: 'tok' }).Get(1)

    expect(lastRequest.url).toBe('/stores/1/market')
    expect(lastRequest.options.method).toBe('GET')
    expect(lastRequest.options.headers.Authorization).toBe('Bearer tok')
    expect(read.effectiveTimeZone).toBe('Europe/Oslo')
  })

  test('Update writes PUT /stores/{id}/market', async () => {
    respondWith(200, market())
    await new StoreMarketService({}).Update(1, { country: 'NO', timeZone: 'Europe/Oslo' })

    expect(lastRequest.url).toBe('/stores/1/market')
    expect(lastRequest.options.method).toBe('PUT')
  })
})

describe('the request body — the market is the only input', () => {
  test('country and timeZone are sent, and no currency VALUE ever is', async () => {
    respondWith(200, market())
    await new StoreMarketService({}).Update(1, { country: 'NO', timeZone: 'Europe/Oslo' })

    expect(body()).toEqual({ country: 'NO', timeZone: 'Europe/Oslo' })
    // The law: `CurrencyCode` derives from the market on the server. A field named anything like a
    // currency VALUE would make this page a second authority that could disagree with the first.
    expect(body()).not.toHaveProperty('currency')
    expect(body()).not.toHaveProperty('currencyCode')
  })

  test('an expectation the caller holds is sent as an ASSERTION', async () => {
    respondWith(200, market())
    await new StoreMarketService({}).Update(1, {
      country: 'NO',
      timeZone: 'Europe/Oslo',
      expectedCurrencyCode: 'NOK'
    })

    expect(body()).toEqual({ country: 'NO', timeZone: 'Europe/Oslo', expectedCurrencyCode: 'NOK' })
  })

  test('an expectation the caller does NOT hold is omitted, not sent empty', async () => {
    respondWith(200, market())
    await new StoreMarketService({}).Update(1, {
      country: 'NO',
      timeZone: 'Europe/Oslo',
      expectedCurrencyCode: null
    })

    // The backend treats blank as "no assertion" either way, but a caller with no expectation must
    // not appear to be making an empty one.
    expect(body()).not.toHaveProperty('expectedCurrencyCode')
  })

  test('no Idempotency-Key is sent: this controller reads none', async () => {
    respondWith(200, market())
    await new StoreMarketService({}).Update(1, { country: 'NO', timeZone: 'Europe/Oslo' })

    expect(lastRequest.options.headers).not.toHaveProperty('Idempotency-Key')
  })
})

describe('the refusal envelope — { code, message, market }', () => {
  test('a 400 becomes a typed market refusal carrying the stable code', async () => {
    respondWith(400, {
      code: 'store.market.country-invalid',
      message: '\'ZZ\' is not an ISO 3166-1 alpha-2 country code.',
      market: market({ country: null, currencyCode: null })
    })

    const error = await failureFrom(() => new StoreMarketService({}).Update(1, { country: 'ZZ', timeZone: 'Europe/Oslo' }))

    expect(isStoreMarketApiError(error)).toBe(true)
    expect(error).toBeInstanceOf(StoreMarketApiError)
    expect(error.status).toBe(400)
    expect(error.code).toBe('store.market.country-invalid')
    // The human sentence is on `message`, NOT on problem+json's `detail` — the whole reason this
    // type exists rather than reusing WorkforceApiError.
    expect(error.message).toContain('ISO 3166-1')
  })

  test('a refusal carries the store market as it STILL is', async () => {
    respondWith(409, {
      code: 'store.market.timezone-change-unsafe',
      message: 'This store already has schedule history recorded against Europe/Oslo.',
      market: market()
    })

    const error = await failureFrom(() => new StoreMarketService({}).Update(1, { country: 'NO', timeZone: 'America/New_York' }))

    expect(error.market.timeZone).toBe('Europe/Oslo')
    expect(error.market.currencyCode).toBe('NOK')
  })

  test('a refusal with no state carries market: null, never an empty market', async () => {
    respondWith(404, { code: 'store.market.store-not-found', message: 'Store not found' })
    const error = await failureFrom(() => new StoreMarketService({}).Update(9, { country: 'NO', timeZone: 'Europe/Oslo' }))

    // "We were not told" must stay distinguishable from "the store has no country".
    expect(error.market).toBeNull()
  })

  test('a 403 arrives with an empty body, so status is all there is to read', async () => {
    respondWith(403, undefined)
    const error = await failureFrom(() => new StoreMarketService({}).Get(1))

    expect(isStoreMarketApiError(error)).toBe(true)
    expect(error.status).toBe(403)
    expect(error.code).toBeNull()
  })

  test('a network rejection is NOT a typed refusal and propagates untouched', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await failureFrom(() => new StoreMarketService({}).Get(1))

    // "The request never happened" must never be mistaken for a decision the platform made.
    expect(isStoreMarketApiError(error)).toBe(false)
    expect(error).toBeInstanceOf(TypeError)
  })
})
