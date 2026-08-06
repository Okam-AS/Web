import { MarginRecipeService } from '~/utils/margin/recipe-client'
import {
  isMarginApiError,
  MarginApiError,
  MARGIN_NOT_FOUND,
  MARGIN_STALE_REVISION,
  MARGIN_REVISION_REQUIRED,
  MARGIN_REVISION_INVALID
} from '~/utils/margin/api-client'

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

    test('GetMenuMargin hits GET /margin/menu-margin, store-scoped and with no per-recipe filter', async () => {
      respondWith(200, { storeId: STORE, rows: [] })
      await service().GetMenuMargin(STORE)

      const [url, init] = global.fetch.mock.calls[0]
      // The read has no per-dish or per-recipe route: it answers for the whole store and the caller
      // selects. A client that invented `&recipeId=` would be sending a filter the server ignores.
      expect(url).toBe('/margin/menu-margin?storeId=42')
      expect(init.method).toBe('GET')
    })

    test('GetProductLinks hits the recipe-scoped link surface', async () => {
      respondWith(200, { recipeId: RECIPE, links: [] })
      await service().GetProductLinks(STORE, RECIPE)
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/recipes/' + RECIPE + '/product-links?storeId=42')
    })
  })

  describe('the product-link save is a PUT replace-set, and carries neither header', () => {
    test('the whole desired set travels in the body', async () => {
      respondWith(200, { recipeId: RECIPE, links: [] })
      await service().SetProductLinks(STORE, RECIPE, [
        { productId: 'p-1', quantityPerSoldUnit: 0.25 },
        { productId: 'p-2', quantityPerSoldUnit: 1 }
      ])

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/recipes/' + RECIPE + '/product-links?storeId=42')
      expect(init.method).toBe('PUT')
      expect(JSON.parse(init.body).links).toEqual([
        { productId: 'p-1', quantityPerSoldUnit: 0.25 },
        { productId: 'p-2', quantityPerSoldUnit: 1 }
      ])
    })

    // The controller routes this action through `Run`, not `RunWithIfMatch`: it asks for no revision
    // and checks none. Sending one would be a guard the server does not apply, which reads as a
    // guarantee and is not one — the same reasoning that keeps `Idempotency-Key` off this client.
    test('no If-Match and no Idempotency-Key are sent', async () => {
      respondWith(200, { recipeId: RECIPE, links: [] })
      await service().SetProductLinks(STORE, RECIPE, [])

      const init = global.fetch.mock.calls[0][1]
      expect(init.headers['If-Match']).toBeUndefined()
      expect(init.headers['Idempotency-Key']).toBeUndefined()
      expect(init.headers['Content-Type']).toBe('application/json')
    })

    // CONTROL for the row above: an AGGREGATE mutation on the same client DOES send `If-Match`, so
    // the absence asserted there is a contract difference rather than a client that never sends one.
    test('CONTROL: the aggregate mutation on the same client still sends If-Match', async () => {
      respondWith(200, {})
      await service().ActivateVersion(STORE, RECIPE, VERSION, 'rev-1')
      expect(global.fetch.mock.calls[0][1].headers['If-Match']).toBe('"rev-1"')
    })

    // Exactly as on activate: the server's injected clock decides. A client-supplied instant has no
    // business entering a module whose journal epoch is an open defect.
    test('no EffectiveFrom is sent, even when the caller has one', async () => {
      respondWith(200, { recipeId: RECIPE, links: [] })
      await service().SetProductLinks(STORE, RECIPE, [
        { productId: 'p-1', quantityPerSoldUnit: 1, effectiveFrom: '2020-01-01T00:00:00Z' }
      ])
      expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
        links: [{ productId: 'p-1', quantityPerSoldUnit: 1 }]
      })
    })

    test('an empty set is sent as an empty list — the way a recipe is unlinked', async () => {
      respondWith(200, { recipeId: RECIPE, links: [] })
      await service().SetProductLinks(STORE, RECIPE, [])
      expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ links: [] })
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

  // The three routes that let a chef change a recipe AFTER activating it. Without them an active
  // recipe is frozen: its version is immutable by rule, and the name-uniqueness check blocks
  // re-creating it under the same name.
  describe('revising and ending a live recipe', () => {
    test('CreateVersion posts to the versions collection and sends NO If-Match', async () => {
      respondWith(200, { recipeVersionId: VERSION, state: 'Draft' })
      await service().CreateVersion(STORE, RECIPE, {})

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/recipes/' + RECIPE + '/versions?storeId=42')
      expect(init.method).toBe('POST')
      // `Run`, not `RunWithIfMatch`: the controller asks for no precondition and checks none, so a
      // revision here would be a guard the server does not apply.
      expect(init.headers['If-Match']).toBeUndefined()
      expect(JSON.parse(init.body)).toEqual({})
    })

    // Omitting `notes` is meaningful, not lazy: the server falls back to the Active version's own
    // (`request?.Notes ?? active.Notes`), which is what a clone should inherit. Sending an empty
    // string instead would blank a note nobody was shown.
    test('CreateVersion sends an empty body when the caller supplies nothing', async () => {
      respondWith(200, {})
      await service().CreateVersion(STORE, RECIPE)
      expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({})
    })

    test('UpdateVersion PUTs the version and carries the draft revision as a quoted If-Match', async () => {
      respondWith(200, { recipeVersionId: VERSION, state: 'Draft' })
      await service().UpdateVersion(STORE, RECIPE, VERSION, {
        yieldQuantity: 4,
        yieldUnit: 'Liter',
        portionCount: 20,
        notes: 'Simmer 40 minutes',
        components: [{ ingredientId: 'i-1', subRecipeId: null, quantity: 0.8, unitCode: 'kg', yieldFactor: null }]
      }, 'rev-draft')

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/recipes/' + RECIPE + '/versions/' + VERSION + '?storeId=42')
      expect(init.method).toBe('PUT')
      expect(init.headers['If-Match']).toBe('"rev-draft"')
      // The version WHOLE. `EditDraftAsync` assigns each of these unconditionally, so a body that
      // dropped `components` would delete every line and one that dropped `notes` would blank it.
      const body = JSON.parse(init.body)
      expect(body.notes).toBe('Simmer 40 minutes')
      expect(body.components).toHaveLength(1)
      expect(body.components[0].yieldFactor).toBeNull()
    })

    test('Retire posts to the retire route and carries a revision', async () => {
      respondWith(200, { recipeVersionId: VERSION, state: 'Retired' })
      await service().Retire(STORE, RECIPE, 'rev-active')

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/recipes/' + RECIPE + '/retire?storeId=42')
      expect(init.method).toBe('POST')
      expect(init.headers['If-Match']).toBe('"rev-active"')
      // No EffectiveFrom, exactly as on activate: the server's injected clock decides.
      expect(JSON.parse(init.body)).toEqual({})
    })

    // Both aggregate mutations refuse BEFORE the request rather than sending an empty precondition,
    // which under a provider with no rowversion would be a guard silently downgraded to none.
    test('a missing revision is refused before the request on both aggregate mutations', async () => {
      respondWith(200, {})
      await expect(service().UpdateVersion(STORE, RECIPE, VERSION, {}, null))
        .rejects.toMatchObject({ code: 'margin.client-missing-revision' })
      await expect(service().Retire(STORE, RECIPE, ''))
        .rejects.toMatchObject({ code: 'margin.client-missing-revision' })
      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('the typed refusals of this family survive the trip', async () => {
      respondWith(400, { code: 'margin.no-active-version', detail: 'x', retryable: false })
      await expect(service().CreateVersion(STORE, RECIPE, {}))
        .rejects.toMatchObject({ code: 'margin.no-active-version', status: 400 })

      respondWith(400, { code: 'margin.version-not-draft', detail: 'x', retryable: false })
      await expect(service().UpdateVersion(STORE, RECIPE, VERSION, {}, 'rev'))
        .rejects.toMatchObject({ code: 'margin.version-not-draft', status: 400 })
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

    // The backend split one code into three, and the split is only usable if the client exports all
    // three as distinct constants — an `ERROR_KEYS` map built on two of them silently sends the third
    // to the generic failure.
    test('the three concurrency codes are three distinct exported constants', () => {
      expect(MARGIN_REVISION_REQUIRED).toBe('margin.revision-required')
      expect(MARGIN_REVISION_INVALID).toBe('margin.revision-invalid')
      expect(MARGIN_STALE_REVISION).toBe('margin.stale-revision')
      expect(new Set([MARGIN_REVISION_REQUIRED, MARGIN_REVISION_INVALID, MARGIN_STALE_REVISION]).size).toBe(3)
    })

    // Only ONE of the three is retryable now, and the client must carry the server's own word for it
    // rather than inferring retryability from the status.
    test('only the lost race arrives retryable', async () => {
      respondWith(400, { code: MARGIN_REVISION_REQUIRED, detail: 'x', retryable: false })
      await expect(service().ListRecipes(STORE)).rejects.toMatchObject({ retryable: false, status: 400 })

      respondWith(400, { code: MARGIN_REVISION_INVALID, detail: 'x', retryable: false })
      await expect(service().ListRecipes(STORE)).rejects.toMatchObject({ retryable: false, status: 400 })

      respondWith(409, { code: MARGIN_STALE_REVISION, detail: 'x', retryable: true })
      await expect(service().ListRecipes(STORE)).rejects.toMatchObject({ retryable: true, status: 409 })
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
