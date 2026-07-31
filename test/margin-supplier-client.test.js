import { MarginSupplierService } from '~/utils/margin/supplier-client'
import { MarginIngredientService } from '~/utils/margin/ingredient-client'
import { isMarginApiError, MARGIN_STALE_REVISION } from '~/utils/margin/api-client'

// Route-for-route with `MarginSuppliersController` and `MarginIngredientsController`. These assert
// the wire contract: the exact paths and query the controllers bind, which mutations carry an
// `If-Match` and which must not, and the typed problem+json the `margin.*` family comes back as.
describe('MarginSupplierService', () => {
  const originalFetch = global.fetch
  const STORE = 42
  const SUPPLIER = '11111111-1111-1111-1111-111111111111'
  const ITEM = '22222222-2222-2222-2222-222222222222'
  const REVISION = 'AAAAAAAAB9E='

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  }

  function service () {
    return new MarginSupplierService({ bearerToken: 'tok-123' })
  }

  afterEach(() => { global.fetch = originalFetch })

  describe('suppliers', () => {
    test('the list is store-scoped and hides archived rows unless asked', async () => {
      respondWith(200, [])
      await service().ListSuppliers(STORE)
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/suppliers?storeId=42')

      respondWith(200, [])
      await service().ListSuppliers(STORE, true)
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/suppliers?includeArchived=true&storeId=42')
    })

    test('create carries NO If-Match — there is no prior revision of a row that does not exist', async () => {
      respondWith(200, { supplierId: SUPPLIER })
      await service().CreateSupplier(STORE, { name: 'Grossisten AS' })

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/suppliers?storeId=42')
      expect(init.method).toBe('POST')
      expect(init.headers['If-Match']).toBeUndefined()
      expect(init.headers.Authorization).toBe('Bearer tok-123')
      expect(JSON.parse(init.body)).toEqual({ name: 'Grossisten AS' })
    })

    test('update sends the revision, quoted per RFC 9110', async () => {
      respondWith(200, { supplierId: SUPPLIER })
      await service().UpdateSupplier(STORE, SUPPLIER, REVISION, { name: 'Grossisten AS' })

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/suppliers/' + SUPPLIER + '?storeId=42')
      expect(init.method).toBe('PUT')
      expect(init.headers['If-Match']).toBe('"' + REVISION + '"')
    })

    test('archive is a POST to its own sub-route, and it too carries the revision', async () => {
      respondWith(200, { supplierId: SUPPLIER, status: 'Archived' })
      await service().ArchiveSupplier(STORE, SUPPLIER, REVISION)

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/suppliers/' + SUPPLIER + '/archive?storeId=42')
      expect(init.method).toBe('POST')
      expect(init.headers['If-Match']).toBe('"' + REVISION + '"')
    })

    test('a mutation with NO revision is refused BEFORE the request leaves', async () => {
      // The whole reason the page withholds the edit controls: an invented or empty token would be
      // a real concurrency guard silently downgraded to none.
      global.fetch = jest.fn()
      await expect(service().UpdateSupplier(STORE, SUPPLIER, null, { name: 'x' })).rejects.toMatchObject({
        code: 'margin.client-missing-revision'
      })
      expect(global.fetch).not.toHaveBeenCalled()
    })
  })

  describe('supplier items', () => {
    test('items hang off the supplier and honour includeArchived', async () => {
      respondWith(200, [])
      await service().ListItems(STORE, SUPPLIER)
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/suppliers/' + SUPPLIER + '/items?storeId=42')

      respondWith(200, [])
      await service().ListItems(STORE, SUPPLIER, true)
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/suppliers/' + SUPPLIER + '/items?includeArchived=true&storeId=42')
    })

    test('create posts to the supplier’s items collection', async () => {
      respondWith(200, { supplierItemId: ITEM })
      await service().CreateItem(STORE, SUPPLIER, { ingredientId: 'i-1', name: 'Tomat 10 kg', isPreferred: true })

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/suppliers/' + SUPPLIER + '/items?storeId=42')
      expect(JSON.parse(init.body).isPreferred).toBe(true)
    })

    test('update is nested under both ids and carries the item’s own revision', async () => {
      respondWith(200, { supplierItemId: ITEM })
      await service().UpdateItem(STORE, SUPPLIER, ITEM, REVISION, { name: 'Tomat 10 kg' })

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/suppliers/' + SUPPLIER + '/items/' + ITEM + '?storeId=42')
      expect(init.headers['If-Match']).toBe('"' + REVISION + '"')
    })
  })

  describe('prices', () => {
    test('the history hangs off the ITEM, not off the supplier', async () => {
      respondWith(200, [])
      await service().GetPrices(STORE, ITEM)
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/supplier-items/' + ITEM + '/prices?storeId=42')
    })

    test('a manual price carries NO If-Match: price rows are append-only and have no rowversion', async () => {
      respondWith(200, [])
      await service().AddManualPrice(STORE, ITEM, {
        priceMinor: 4990,
        currency: 'NOK',
        effectiveFromUtc: '2026-03-01T10:00:00.000Z'
      })

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/supplier-items/' + ITEM + '/prices?storeId=42')
      expect(init.method).toBe('POST')
      expect(init.headers['If-Match']).toBeUndefined()
      // Money leaves as integer øre, never as a decimal string or a float of kroner.
      expect(JSON.parse(init.body).priceMinor).toBe(4990)
    })
  })

  test('a typed 409 comes back as a Margin failure with its code and retry flag', async () => {
    respondWith(409, { code: MARGIN_STALE_REVISION, detail: 'moved on', retryable: true })
    const error = await service().UpdateSupplier(STORE, SUPPLIER, REVISION, { name: 'x' }).catch(e => e)

    expect(isMarginApiError(error)).toBe(true)
    expect(error.code).toBe(MARGIN_STALE_REVISION)
    expect(error.retryable).toBe(true)
  })

  test('an UNCODED 400 keeps the server’s prose, which is the only instruction it carries', async () => {
    // Every business rule on this surface refuses this way: `AppException` renders through
    // `ModuleControllerBase` with a `detail` and no `code`.
    const detail = 'A later-dated price already exists; prices supersede forward and cannot be backdated.'
    respondWith(400, { title: 'Bad Request', status: 400, detail })
    const error = await service().AddManualPrice(STORE, ITEM, { priceMinor: 1, currency: 'NOK' }).catch(e => e)

    expect(error.code).toBeNull()
    expect(error.problem.detail).toBe(detail)
  })

  test('GetStatus is inherited, so every Margin client reads the flags the same way', async () => {
    respondWith(200, { storeId: STORE, flags: { module: true, priceImport: false } })
    await service().GetStatus(STORE)
    expect(global.fetch.mock.calls[0][0]).toBe('/margin/status?storeId=42')
  })
})

describe('MarginIngredientService', () => {
  const originalFetch = global.fetch
  const STORE = 42
  const INGREDIENT = '33333333-3333-3333-3333-333333333333'
  const REVISION = 'AAAAAAAAB9E='

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(JSON.stringify(body))
    })
  }

  const service = () => new MarginIngredientService({ bearerToken: 'tok-123' })

  afterEach(() => { global.fetch = originalFetch })

  test('the list carries the starter library, and can widen to archived rows', async () => {
    respondWith(200, { ingredients: [], starterCandidates: [] })
    await service().ListIngredients(STORE)
    expect(global.fetch.mock.calls[0][0]).toBe('/margin/ingredients?storeId=42')

    respondWith(200, { ingredients: [], starterCandidates: [] })
    await service().ListIngredients(STORE, true)
    expect(global.fetch.mock.calls[0][0]).toBe('/margin/ingredients?includeArchived=true&storeId=42')
  })

  test('the per-id read exists — which is what makes the ingredient editor possible at all', async () => {
    respondWith(200, { ingredientId: INGREDIENT, revision: REVISION, conversions: [] })
    const detail = await service().GetIngredient(STORE, INGREDIENT)

    expect(global.fetch.mock.calls[0][0]).toBe('/margin/ingredients/' + INGREDIENT + '?storeId=42')
    expect(detail.revision).toBe(REVISION)
  })

  test('update and archive both carry the revision the detail read supplied', async () => {
    respondWith(200, { ingredientId: INGREDIENT })
    await service().UpdateIngredient(STORE, INGREDIENT, REVISION, { name: 'Tomat', conversions: [] })
    expect(global.fetch.mock.calls[0][1].headers['If-Match']).toBe('"' + REVISION + '"')

    respondWith(200, { ingredientId: INGREDIENT, status: 'Archived' })
    await service().ArchiveIngredient(STORE, INGREDIENT, REVISION)
    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/margin/ingredients/' + INGREDIENT + '/archive?storeId=42')
    expect(init.headers['If-Match']).toBe('"' + REVISION + '"')
  })

  test('create carries no revision', async () => {
    respondWith(200, { ingredientId: INGREDIENT })
    await service().CreateIngredient(STORE, { name: 'Tomat', baseUnit: 'Kilogram', conversions: [] })

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/margin/ingredients?storeId=42')
    expect(init.headers['If-Match']).toBeUndefined()
  })
})
