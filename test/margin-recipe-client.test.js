import { MarginRecipeService } from '~/utils/margin/recipe-client'
import { isMarginApiError, MarginApiError, MARGIN_NOT_FOUND } from '~/utils/margin/api-client'

// The client is route-for-route with the backend, so these assert the wire contract: the exact paths
// and query the Margin controllers bind, the `If-Match` revision an AGGREGATE mutation must carry and
// a plain create must not, and the typed problem+json the `margin.*` family comes back as.
describe('MarginRecipeService', () => {
  const originalFetch = global.fetch
  const STORE = 42
  const RECIPE = '11111111-1111-1111-1111-111111111111'
  const VERSION = '22222222-2222-2222-2222-222222222222'

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  }

  function service () {
    return new MarginRecipeService({ bearerToken: 'tok-123' })
  }

  afterEach(() => { global.fetch = originalFetch })

  describe('routes', () => {
    test('GetStatus hits GET /margin/status with the store scope', async () => {
      respondWith(200, { storeId: STORE, flags: { module: true } })
      await service().GetStatus(STORE)

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/status?storeId=42')
      expect(init.method).toBe('GET')
      expect(init.headers.Authorization).toBe('Bearer tok-123')
    })

    test('ListRecipes and GetRecipe both carry storeId, the authoritative tenant scope', async () => {
      respondWith(200, [])
      await service().ListRecipes(STORE)
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/recipes?storeId=42')

      respondWith(200, {})
      await service().GetRecipe(STORE, RECIPE)
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/recipes/' + RECIPE + '?storeId=42')
    })

    test('ListIngredients hits the master surface, which also carries the starter library', async () => {
      respondWith(200, { ingredients: [], starterCandidates: [] })
      await service().ListIngredients(STORE)
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/ingredients?storeId=42')
    })
  })

  // THE PAIR. Margin's mutation contract is not uniform: a create has no prior revision to guard and
  // the controller does not ask for one, while an aggregate mutation is refused outright without
  // `If-Match`. Asserting both in one place is what makes the distinction a real one rather than a
  // header that happens to be present.
  describe('the If-Match contract, both halves', () => {
    test('CreateRecipe sends the body and NO If-Match', async () => {
      respondWith(200, { recipeId: RECIPE })
      await service().CreateRecipe(STORE, { name: 'Fiskesuppe', kind: 'Sellable' })

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/recipes?storeId=42')
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe('application/json')
      expect(init.headers['If-Match']).toBeUndefined()
      expect(JSON.parse(init.body).name).toBe('Fiskesuppe')
      // Margin has no idempotency store. A header implying a replay guarantee the server does not
      // make is worse than no header — this is the one thing the Workforce base would have added.
      expect(init.headers['Idempotency-Key']).toBeUndefined()
    })

    test('ActivateVersion sends the draft revision as a quoted If-Match', async () => {
      respondWith(200, { recipeVersionId: VERSION, state: 'Active' })
      await service().ActivateVersion(STORE, RECIPE, VERSION, 'AAAAAAAAF9k=')

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/recipes/' + RECIPE + '/versions/' + VERSION + '/activate?storeId=42')
      expect(init.method).toBe('POST')
      expect(init.headers['If-Match']).toBe('"AAAAAAAAF9k="')
    })

    // The server trims the quotes and then decodes; under a provider with no rowversion it accepts
    // whatever arrives. A placeholder would therefore be a concurrency guard silently downgraded to
    // none, so nothing is sent at all.
    test('a missing revision is refused BEFORE the request, not papered over', async () => {
      respondWith(200, {})
      await expect(service().ActivateVersion(STORE, RECIPE, VERSION, null))
        .rejects.toMatchObject({ code: 'margin.client-missing-revision' })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('the activate body carries no EffectiveFrom: the server clock decides', async () => {
      respondWith(200, {})
      await service().ActivateVersion(STORE, RECIPE, VERSION, 'rev')
      expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({})
    })
  })

  describe('typed failures', () => {
    test('a business 400 becomes a MarginApiError carrying the machine code', async () => {
      respondWith(400, {
        type: 'https://okam.no/problems/margin/component-invalid',
        title: 'Bad Request',
        status: 400,
        detail: 'A component quantity must be greater than zero.',
        code: 'margin.component-invalid',
        retryable: false
      })

      const error = await service().CreateRecipe(STORE, {}).catch(e => e)
      expect(isMarginApiError(error)).toBe(true)
      expect(error.code).toBe('margin.component-invalid')
      expect(error.status).toBe(400)
      expect(error.retryable).toBe(false)
    })

    // The 404 is DELIBERATELY ambiguous: unknown recipe, out-of-scope store, or `Margin.Module` off.
    // A client that turned it into an empty list would tell a venue its recipes are gone.
    test('a 404 throws rather than resolving to nothing', async () => {
      respondWith(404, { status: 404, detail: 'Not found.', code: MARGIN_NOT_FOUND })

      // `.rejects` rather than `.catch(e => e)`: a client that swallowed the 404 and resolved with
      // `[]` would satisfy a catch-shaped assertion and fail this one.
      await expect(service().ListRecipes(STORE)).rejects.toMatchObject({
        code: MARGIN_NOT_FOUND,
        isMarginApiError: true
      })
    })

    // CONTROL for the discriminator: it must not answer true for anything that merely failed.
    test('isMarginApiError is false for an ordinary error and true for a typed one', () => {
      expect(isMarginApiError(new Error('boom'))).toBe(false)
      expect(isMarginApiError(null)).toBe(false)
      expect(isMarginApiError(new MarginApiError(409, { code: 'margin.stale-revision' }))).toBe(true)
    })

    test('a non-JSON error body still produces a typed error rather than throwing on the parse', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 502,
        text: () => Promise.resolve('<html>gateway</html>')
      })

      const error = await service().GetStatus(STORE).catch(e => e)
      expect(isMarginApiError(error)).toBe(true)
      expect(error.status).toBe(502)
      expect(error.code).toBeNull()
    })
  })

  test('an anonymous client sends no Authorization header rather than an empty one', async () => {
    respondWith(200, [])
    await new MarginRecipeService({}).ListRecipes(STORE)
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })
})
