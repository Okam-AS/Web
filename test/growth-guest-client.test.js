import { GrowthGuestService, CSRF_HEADER } from '~/utils/growth/growth-guest-client'
import { GrowthService } from '~/utils/growth/growth-client'
import { isGrowthApiError } from '~/utils/growth/api-client'

const originalFetch = global.fetch

function respond (body, options) {
  const opts = options || {}
  global.fetch = jest.fn().mockResolvedValue({
    ok: opts.ok === undefined ? true : opts.ok,
    status: opts.status || 200,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
  })
}

const lastCall = () => global.fetch.mock.calls[global.fetch.mock.calls.length - 1]
const lastUrl = () => lastCall()[0]
const lastInit = () => lastCall()[1]
const guest = () => new GrowthGuestService()

afterEach(() => { global.fetch = originalFetch })

describe('the guest client cannot authenticate as anybody', () => {
  test('no Authorization header is ever sent, on any route', async () => {
    respond({})
    const service = guest()
    await service.GetConsentText(7)
    expect(lastInit().headers.Authorization).toBeUndefined()

    await service.Confirm('t')
    expect(lastInit().headers.Authorization).toBeUndefined()

    await service.OpenPreferenceSession('t')
    expect(lastInit().headers.Authorization).toBeUndefined()

    await service.Unsubscribe('t')
    expect(lastInit().headers.Authorization).toBeUndefined()
  })

  test('there is no constructor argument through which a token could arrive', async () => {
    respond({})
    // The admin client takes an initializer and uses it; this one takes none. Passing one anyway
    // must change nothing — a venue's own staff open these links, and a page that rode their token
    // would answer differently for them than for the guest it was built for.
    const smuggled = new GrowthGuestService({ bearerToken: 'staff-token' })
    await smuggled.GetConsentText(7)
    expect(lastInit().headers.Authorization).toBeUndefined()

    await new GrowthService({ bearerToken: 'staff-token' }).GetConsentSummary(7)
    expect(lastInit().headers.Authorization).toBe('Bearer staff-token')
  })
})

describe('the routes are the anonymous ones the backend declares', () => {
  test('capture and confirmation', async () => {
    respond({})
    const service = guest()

    await service.GetConsentText(42)
    expect(lastUrl()).toBe('/v1/growth/stores/42/consent-text')
    expect(lastInit().method).toBe('GET')

    await service.Subscribe(42, { email: 'a@b.no', consentTextVersionId: 3, captureSource: 'web-signup' })
    expect(lastUrl()).toBe('/v1/growth/stores/42/subscriptions')
    expect(JSON.parse(lastInit().body)).toEqual({ email: 'a@b.no', consentTextVersionId: 3, captureSource: 'web-signup' })

    await service.Confirm('v3~opaque')
    expect(lastUrl()).toBe('/v1/growth/subscription-confirmations')
    // The token is in the BODY, never a path or query: it rode a URL fragment to get here, and a
    // path would put it back into every access log between the browser and the API.
    expect(JSON.parse(lastInit().body)).toEqual({ token: 'v3~opaque' })
  })

  test('the preference session and the endpoints behind it', async () => {
    respond({})
    const service = guest()

    await service.OpenPreferenceSession('link')
    expect(lastUrl()).toBe('/v1/growth/preference-sessions')
    expect(JSON.parse(lastInit().body)).toEqual({ token: 'link' })

    await service.GetPreferences('csrf-1')
    expect(lastUrl()).toBe('/v1/growth/preference-session/preferences')
    expect(lastInit().headers[CSRF_HEADER]).toBe('csrf-1')

    await service.UpdatePreference('csrf-1', 'Email', 'Newsletter', false)
    expect(lastUrl()).toBe('/v1/growth/preference-session/preferences/Email/Newsletter')
    expect(lastInit().method).toBe('PUT')
    expect(JSON.parse(lastInit().body)).toEqual({ consented: false })

    await service.FilePrivacyRequest('csrf-1', 'Erasure')
    expect(lastUrl()).toBe('/v1/growth/preference-session/privacy-requests')
    expect(JSON.parse(lastInit().body)).toEqual({ requestType: 'Erasure' })
  })

  test('one-click unsubscribe posts the JSON shape, not the RFC 8058 mail-client shape', async () => {
    respond({})
    await guest().Unsubscribe('unsub-token')
    expect(lastUrl()).toBe('/v1/growth/unsubscribe')
    expect(lastInit().method).toBe('POST')
    expect(JSON.parse(lastInit().body)).toEqual({ token: 'unsub-token' })
  })
})

describe('the session cookie is asked for on exactly the four calls that need it', () => {
  test('credentials are included for the session exchange and the three PrefSession endpoints', async () => {
    respond({})
    const service = guest()

    await service.OpenPreferenceSession('link')
    expect(lastInit().credentials).toBe('include')

    await service.GetPreferences('c')
    expect(lastInit().credentials).toBe('include')

    await service.UpdatePreference('c', 'Email', 'Newsletter', true)
    expect(lastInit().credentials).toBe('include')

    await service.FilePrivacyRequest('c', 'Access')
    expect(lastInit().credentials).toBe('include')
  })

  test('and are NOT included anywhere else, here or on the admin surface', async () => {
    respond({})
    const service = guest()

    await service.GetConsentText(7)
    expect(lastInit().credentials).toBeUndefined()

    await service.Subscribe(7, {})
    expect(lastInit().credentials).toBeUndefined()

    await service.Confirm('t')
    expect(lastInit().credentials).toBeUndefined()

    await service.Unsubscribe('t')
    expect(lastInit().credentials).toBeUndefined()

    // The shared transport gained an opt-in `credentials` passthrough for the preference centre. Every
    // other surface in this app authenticates with a bearer header and must not start sending cookies.
    await new GrowthService({ bearerToken: 't' }).GetConsentSummary(7)
    expect(lastInit().credentials).toBeUndefined()
  })
})

describe('refusals arrive as the Growth envelope, not the workforce one', () => {
  test('the growth.* code survives, so a page can branch on it', async () => {
    respond({ error: { code: 'growth.token_invalid', message: 'gone', traceId: 'tr-1' } }, { ok: false, status: 410 })
    await expect(guest().Confirm('dead')).rejects.toMatchObject({
      isGrowthApiError: true, status: 410, code: 'growth.token_invalid', traceId: 'tr-1'
    })
  })

  test('a network rejection stays untyped, so "never happened" is never read as a refusal', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    await guest().Unsubscribe('t').then(
      () => { throw new Error('should have rejected') },
      (e) => { expect(isGrowthApiError(e)).toBe(false) }
    )
  })
})
