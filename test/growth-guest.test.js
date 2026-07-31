import {
  GROWTH_HELD,
  GROWTH_UNAVAILABLE,
  GROWTH_TOKEN_DEAD,
  GROWTH_SESSION_DEAD,
  GROWTH_UNKNOWN,
  CHANNEL_EMAIL,
  PURPOSE_NEWSLETTER,
  PRIVACY_ACCESS,
  PRIVACY_ERASURE,
  readGrowth,
  growthState,
  growthRefusalKey,
  tokenFromUrl,
  standing,
  receiving,
  reconsentBlocked,
  subscribeProblems,
  consentLocaleDiffers
} from '~/utils/growth/guest'
import { GrowthApiError } from '~/utils/growth/api-client'
import translations from '~/translations'

const refusal = (status, code) => new GrowthApiError(status, { error: { code, message: 'x' } })

describe('reading what the Growth guest routes answered', () => {
  test('a payload is held; a null one claims nothing', () => {
    expect(readGrowth({ consentTextVersionId: 7 }, null).state).toBe(GROWTH_HELD)
    expect(readGrowth(null, null).state).toBe(GROWTH_UNKNOWN)
    expect(readGrowth(null, null).view).toBeNull()
  })

  test('the four refusal families are told apart by their stable code', () => {
    expect(growthState(refusal(404, 'growth.not_found'))).toBe(GROWTH_UNAVAILABLE)
    expect(growthState(refusal(410, 'growth.token_invalid'))).toBe(GROWTH_TOKEN_DEAD)
    expect(growthState(refusal(401, 'growth.session_invalid'))).toBe(GROWTH_SESSION_DEAD)
    expect(growthState(refusal(500, null))).toBe(GROWTH_UNKNOWN)
  })

  test('a refusal with no envelope at all still lands in the right family', () => {
    // A gateway or a proxy can answer with no `{ error: {...} }` body, so `code` is null. Falling
    // back to the status is what stops that becoming a generic "something went wrong" on a page
    // whose whole job is to explain why a link no longer works.
    expect(growthState(new GrowthApiError(410, null))).toBe(GROWTH_TOKEN_DEAD)
    expect(growthState(new GrowthApiError(404, null))).toBe(GROWTH_UNAVAILABLE)
    expect(growthState(new GrowthApiError(401, null))).toBe(GROWTH_SESSION_DEAD)
  })

  test('every branch of the refusal map resolves to a key the dictionary really carries', () => {
    const codes = [
      'growth.address_required', 'growth.consent_text_unknown', 'growth.not_found',
      'growth.token_invalid', 'growth.session_invalid', 'growth.scope_mismatch',
      'growth.body_required', 'something.nobody.declared', null
    ]
    for (const code of codes) {
      const key = growthRefusalKey(code)
      expect(typeof translations.no[key]).toBe('string')
    }
  })
})

describe('the token in the address bar', () => {
  test('the fragment is the contract, and it is what gets read', () => {
    expect(tokenFromUrl('#token=abc123', '')).toBe('abc123')
  })

  test('the query is accepted as the RFC 8058 fallback, and the fragment wins over it', () => {
    expect(tokenFromUrl('', '?token=from-query')).toBe('from-query')
    expect(tokenFromUrl('#token=from-fragment', '?token=from-query')).toBe('from-fragment')
  })

  test('percent-escaping survives the round trip the backend writes', () => {
    // `GrowthPreferenceCentreLink` escapes with `Uri.EscapeDataString`, so a token containing a
    // reserved character arrives percent-encoded and must be decoded back byte-for-byte.
    expect(tokenFromUrl('#token=a%2Bb%2Fc%3D', '')).toBe('a+b/c=')
  })

  test('a mangled or absent token is absent, never a string posted at the API', () => {
    expect(tokenFromUrl('', '')).toBeNull()
    expect(tokenFromUrl('#', '')).toBeNull()
    expect(tokenFromUrl('#token=', '')).toBeNull()
    expect(tokenFromUrl('#other=abc', '')).toBeNull()
    expect(tokenFromUrl('#token=%E0%A4%A', '')).toBeNull()
    expect(tokenFromUrl(null, undefined)).toBeNull()
  })

  test('a token is not confused with a parameter whose name merely ends in "token"', () => {
    expect(tokenFromUrl('#preftoken=abc', '')).toBeNull()
  })
})

describe('what the preference state means to a guest', () => {
  const state = over => Object.assign(
    { channel: CHANNEL_EMAIL, purpose: PURPOSE_NEWSLETTER, reachable: true, consented: true, suppressed: false },
    over || {})

  test('suppression wins over consent, whatever the consent flag says', () => {
    // Spec §3 invariant 4. A page that read `consented` first would tell a suppressed guest they are
    // subscribed while the dispatcher would never send to them.
    expect(standing(state({ suppressed: true }))).toBe('suppressed')
    expect(standing(state({ consented: true, suppressed: true }))).toBe('suppressed')
    expect(receiving(state({ consented: true, suppressed: true }))).toBe(false)
  })

  test('an unverified contact is never reported as receiving', () => {
    expect(standing(state({ reachable: false }))).toBe('unverified')
    expect(receiving(state({ reachable: false, consented: true }))).toBe(false)
  })

  test('on and off are only reported for a verified, unsuppressed contact', () => {
    expect(standing(state())).toBe('on')
    expect(receiving(state())).toBe(true)
    expect(standing(state({ consented: false }))).toBe('off')
  })

  test('every standing has a sentence in all three dictionaries', () => {
    for (const value of ['on', 'off', 'suppressed', 'unverified', 'unknown']) {
      for (const lang of ['no', 'en', 'de']) {
        expect(typeof translations[lang]['gr_guest_standing_' + value]).toBe('string')
      }
    }
  })

  test('a request to resume that the server did not honour is flagged, and nothing else is', () => {
    // `UpdatePreferenceAsync` records a re-consent but never lifts a suppression, so this is the one
    // case where what came back contradicts what was asked for.
    expect(reconsentBlocked(true, state({ suppressed: true }))).toBe(true)
    expect(reconsentBlocked(true, state())).toBe(false)
    expect(reconsentBlocked(false, state({ suppressed: true }))).toBe(false)
    expect(reconsentBlocked(null, state({ suppressed: true }))).toBe(false)
  })
})

describe('the capture form', () => {
  test('a capture needs BOTH an address and the affirmative tick', () => {
    expect(subscribeProblems({ email: 'a@b.no', consented: true })).toEqual([])
    expect(subscribeProblems({ email: 'a@b.no', consented: false })).toEqual(['consent'])
    expect(subscribeProblems({ email: '', consented: true })).toEqual(['email'])
    expect(subscribeProblems({ email: 'not-an-address', consented: true })).toEqual(['email'])
    expect(subscribeProblems(null)).toEqual(['email', 'consent'])
  })

  test('the address check is permissive, because the backend does not validate at all', () => {
    expect(subscribeProblems({ email: '  a@b.co.uk  ', consented: true })).toEqual([])
    expect(subscribeProblems({ email: 'o\'brien+news@sub.domain.no', consented: true })).toEqual([])
  })

  test('the consent language note fires only when the served wording is not the page language', () => {
    expect(consentLocaleDiffers({ locale: 'nb-NO' }, 'no')).toBe(false)
    expect(consentLocaleDiffers({ locale: 'nb-NO' }, 'en')).toBe(true)
    expect(consentLocaleDiffers({ locale: 'nb-NO' }, 'de')).toBe(true)
    expect(consentLocaleDiffers({ locale: 'de-CH' }, 'de')).toBe(false)
    expect(consentLocaleDiffers({}, 'en')).toBe(false)
  })
})

describe('the enum values that travel on the wire', () => {
  test('they are the backend spellings, because they are posted back verbatim', () => {
    // `GrowthChannel` / `GrowthPurpose` / `GrowthPrivacyRequestType` serialise as names (Newtonsoft
    // `StringEnumConverter`), and endpoint 5 binds channel + purpose out of the PATH. A lower-cased
    // copy here would 404 the route, not merely mislabel it.
    expect(CHANNEL_EMAIL).toBe('Email')
    expect(PURPOSE_NEWSLETTER).toBe('Newsletter')
    expect(PRIVACY_ACCESS).toBe('Access')
    expect(PRIVACY_ERASURE).toBe('Erasure')
  })
})
