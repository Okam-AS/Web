import { GrowthService, StoreFeatureFlagReader, NEWSLETTER_SUBSCRIBERS } from '~/utils/growth/growth-client'
import { GrowthApiError, isGrowthApiError } from '~/utils/growth/api-client'
import { WorkforceApiError } from '~/utils/workforce/api-client'

const originalFetch = global.fetch

function respond (body, options) {
  const opts = options || {}
  global.fetch = jest.fn().mockResolvedValue({
    ok: opts.ok === undefined ? true : opts.ok,
    status: opts.status || 200,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
  })
}

function service () {
  return new GrowthService({ bearerToken: 'tok-123' })
}

const lastCall = () => global.fetch.mock.calls[global.fetch.mock.calls.length - 1]
const lastUrl = () => lastCall()[0]
const lastInit = () => lastCall()[1]

afterEach(() => { global.fetch = originalFetch })

describe('GrowthService — route-for-route with the Growth controllers', () => {
  test('every read hits the documented /v1/growth path', async () => {
    respond({})
    await service().GetConsentSummary(42)
    expect(lastUrl()).toBe('/v1/growth/stores/42/consents/summary')
    expect(lastInit().method).toBe('GET')

    await service().ListSegments(42)
    expect(lastUrl()).toBe('/v1/growth/stores/42/segments')

    await service().GetNewsletter(42, 1002)
    expect(lastUrl()).toBe('/v1/growth/stores/42/newsletters/1002')

    await service().GetDeliveryHealth(42)
    expect(lastUrl()).toBe('/v1/growth/stores/42/delivery-health')
    expect(lastInit().method).toBe('GET')
  })

  test('the store flag read is the ONE route outside /v1/growth, and it is a separate client', () => {
    // `GrowthService` promises to be route-for-route with the Growth controllers; the platform flag
    // route is not one of them, so it lives on its own class rather than quietly breaking that.
    expect(typeof GrowthService.prototype.GetStoreFlags).toBe('undefined')
  })

  test('the flag reader hits the platform store-flag route', async () => {
    respond([])
    await new StoreFeatureFlagReader({ bearerToken: 'tok-123' }).GetStoreFlags(42)
    expect(lastUrl()).toBe('/stores/42/feature-flags')
    expect(lastInit().method).toBe('GET')
  })

  test('the segment key is encoded into the snapshot path', async () => {
    respond({})
    await service().ComputeSnapshot(42, NEWSLETTER_SUBSCRIBERS)
    expect(lastUrl()).toBe('/v1/growth/stores/42/segments/newsletter-subscribers/snapshots')
    expect(lastInit().method).toBe('POST')
  })

  test('the list query carries only the parameters that were supplied', async () => {
    respond({})
    await service().ListNewsletters(42)
    expect(lastUrl()).toBe('/v1/growth/stores/42/newsletters')

    await service().ListNewsletters(42, { state: 'Draft', limit: 20 })
    expect(lastUrl()).toBe('/v1/growth/stores/42/newsletters?state=Draft&limit=20')

    // The cursor is opaque and base64, so it MUST be encoded — `MTAwMQ==` carries an `=`.
    await service().ListNewsletters(42, { cursor: 'MTAwMQ==' })
    expect(lastUrl()).toBe('/v1/growth/stores/42/newsletters?cursor=MTAwMQ%3D%3D')
  })

  test('approval posts the exact pinning triple the backend 409s on drift', async () => {
    respond({})
    await service().Approve(42, 1002, {
      newsletterVersionId: 5002, contentHash: 'sha256:2b3c4d5e6f', segmentSnapshotId: 3002
    })
    expect(lastUrl()).toBe('/v1/growth/stores/42/newsletters/1002/approval')
    expect(JSON.parse(lastInit().body)).toEqual({
      newsletterVersionId: 5002, contentHash: 'sha256:2b3c4d5e6f', segmentSnapshotId: 3002
    })
  })

  test('an edit carries baseVersionNo — the optimistic-concurrency guard', async () => {
    respond({})
    await service().EditDraft(42, 1002, { baseVersionNo: 2, subject: 's', contentJson: 'c', segmentSnapshotId: 3002 })
    expect(lastInit().method).toBe('PUT')
    expect(JSON.parse(lastInit().body).baseVersionNo).toBe(2)
  })

  test('dispatch is a POST with a body the server ignores, and names no recipient', async () => {
    respond({})
    await service().Dispatch(42, 1002)
    expect(lastUrl()).toBe('/v1/growth/stores/42/newsletters/1002/dispatch')
    expect(lastInit().method).toBe('POST')
    expect(JSON.parse(lastInit().body)).toEqual({})
  })

  test('the bearer token rides every request', async () => {
    respond({})
    await service().GetConsentSummary(42)
    expect(lastInit().headers.Authorization).toBe('Bearer tok-123')
  })

  test('NO Idempotency-Key: no Growth controller reads one, so none is claimed', async () => {
    respond({})
    await service().Dispatch(42, 1002)
    expect(lastInit().headers['Idempotency-Key']).toBeUndefined()
    // POSITIVE CONTROL: the header object is real and does carry what this surface does send, so
    // the assertion above is about absence rather than about an empty headers bag.
    expect(lastInit().headers.Authorization).toBe('Bearer tok-123')
    expect(lastInit().headers['Content-Type']).toBe('application/json')
  })
})

describe('GrowthApiError — the Growth envelope is not problem+json', () => {
  // The whole reason this type exists. Growth answers
  //   { "error": { "code", "message", "traceId" } }
  // while every Workforce surface answers RFC 9457 with a TOP-LEVEL `code`.
  const GROWTH_409 = {
    error: {
      code: 'growth.no_live_approval',
      message: 'This newsletter has no live approval; approve the current version before dispatching.',
      traceId: '0HN7A:00000003'
    }
  }

  test('a typed refusal surfaces its growth.* code, status and traceId', async () => {
    respond(GROWTH_409, { ok: false, status: 409 })
    await expect(service().Dispatch(42, 1002)).rejects.toMatchObject({
      status: 409,
      code: 'growth.no_live_approval',
      traceId: '0HN7A:00000003'
    })
  })

  test('THE BUG THIS TYPE PREVENTS: the workforce error reads null off the same body', () => {
    // The positive control for the whole file. If the Growth surface had reused `WorkforceApiError`,
    // EVERY Growth refusal would carry `code: null` — silently, with no failing request — and a
    // "you have not approved this yet" would stop being distinguishable from "the server broke".
    expect(new WorkforceApiError(409, GROWTH_409).code).toBeNull()
    expect(new GrowthApiError(409, GROWTH_409).code).toBe('growth.no_live_approval')
  })

  test('isGrowthApiError is true for a refusal and false for a network failure', async () => {
    respond(GROWTH_409, { ok: false, status: 409 })
    const refusal = await service().Dispatch(42, 1002).catch(e => e)
    expect(isGrowthApiError(refusal)).toBe(true)

    // A `fetch` rejection is NOT a server refusal — the request never happened. It must propagate
    // untouched so a caller can never read "offline" as a typed decision.
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const offline = await service().Dispatch(42, 1002).catch(e => e)
    expect(isGrowthApiError(offline)).toBe(false)
    expect(offline).toBeInstanceOf(TypeError)
  })

  test('a concealment 404 carries growth.not_found and nothing that discriminates', async () => {
    // Cross-tenant and absent are deliberately the SAME answer. The client must not invent a
    // distinction the server refused to make.
    respond({ error: { code: 'growth.not_found', message: 'The requested Growth resource was not found.', traceId: 't' } },
      { ok: false, status: 404 })
    const error = await service().GetNewsletter(42, 999).catch(e => e)
    expect(error.status).toBe(404)
    expect(error.code).toBe('growth.not_found')
  })

  test('a body that is not the Growth envelope yields a null code rather than a guess', async () => {
    respond({ something: 'else' }, { ok: false, status: 500 })
    const error = await service().GetConsentSummary(42).catch(e => e)
    expect(isGrowthApiError(error)).toBe(true)
    expect(error.code).toBeNull()
    expect(error.status).toBe(500)
  })
})
