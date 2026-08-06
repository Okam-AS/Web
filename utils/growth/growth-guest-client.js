// The Growth GUEST API client — the anonymous and token-scoped routes, and nothing else.
//
// It is separate from `~/utils/growth/growth-client` (the StoreAdmin surface) for the same reason
// `events-guest-client` is separate from `events-client`, and the separation is a security posture
// rather than a filing preference:
//
//   • NO BEARER TOKEN IS EVER SENT. `GrowthClientBase` attaches one when its initializer carries one;
//     this client is constructed with no initializer at all, so it cannot. A venue's own staff open
//     these links too — a preference-centre link lands in an inbox that may belong to a signed-in
//     admin — and a page that quietly rode their admin token would answer differently for them than
//     for the guest it was built for. That is the one difference a consent surface must never have.
//   • Every route below is `[AllowAnonymous]` on `GrowthSubscriptionsController`,
//     `GrowthPreferenceController`, or the single `[AllowAnonymous]` read on
//     `GrowthConsentTextsController`. A method with no anonymous action does not belong here.
//
// Route-for-route with the backend, using the endpoint numbers its own XML docs use:
//
//   GET  /v1/growth/stores/{storeId}/consent-text          GrowthConsentTextsController (public read)
//   POST /v1/growth/stores/{storeId}/subscriptions         #1  GrowthSubscriptionsController
//   POST /v1/growth/subscription-confirmations             #2  GrowthSubscriptionsController
//   POST /v1/growth/preference-sessions                    #3  GrowthPreferenceController
//   GET  /v1/growth/preference-session/preferences         #4  GrowthPreferenceController
//   PUT  /v1/growth/preference-session/preferences/{c}/{p} #5  GrowthPreferenceController
//   POST /v1/growth/unsubscribe                            #6  GrowthPreferenceController
//   POST /v1/growth/preference-session/privacy-requests    #7  GrowthPreferenceController
//
// THE SESSION IS A COOKIE, NOT A TOKEN THIS CLIENT HOLDS. Endpoint 3 returns a CSRF token in the body
// and sets `growth_pref_session` as an HttpOnly/Secure/SameSite=Strict cookie scoped to `/v1/growth`.
// JS cannot read that cookie by design, so endpoints 4/5/7 are authorised by the browser attaching it
// plus this client echoing the CSRF token in `X-Growth-Csrf` — the signed double-submit pair
// `GrowthPreferenceController.TryAuthorizeSession` validates. Hence `credentials: 'include'` on
// exactly those four calls and on nothing else.
//
// ⚠ TWO CONDITIONS MUST BOTH HOLD BEFORE THAT COOKIE WORKS, and neither is fixable from this file.
// Neither substitutes for the other, which is the trap: each one reads like it should have covered
// the other, and satisfying one alone leaves the surface just as broken.
//
//   1. CORS MUST NAME THIS WEB ORIGIN with `AllowCredentials`. The API serves the credentialed four
//      (3/4/5/7) with a dedicated policy rather than the wildcard default — `Access-Control-Allow-
//      Origin: *` is refused outright by every browser once a request's credentials mode is
//      `include`. That policy's allowlist is DERIVED from the guest links Growth mints
//      (`Growth:PreferenceCentreBaseUrl`, `Growth:ConfirmBaseUrl`) plus any `Growth:GuestOrigins`,
//      so this half is now a deployment setting rather than a code defect — but an origin nobody
//      named is still refused, and the refusal lands on the preflight as an opaque network error
//      with no status code and no server log line.
//   2. THE COOKIE MUST BE ABLE TO RIDE THE REQUEST AT ALL. It is `SameSite=Strict`, and this app's
//      `API_BASE_URL` default is `https://okamapi.azurewebsites.net` while the pages are served from
//      `https://okam.no`. Those are different SITES (`azurewebsites.net` is a public suffix), so the
//      browser attaches no cookie whatever CORS says. Only serving the API same-site fixes this.
//
// Same-SITE serving does NOT remove condition 1: a different host is still a different ORIGIN, so
// CORS still applies. A named policy does NOT remove condition 2: no CORS header persuades a Strict
// cookie onto a cross-site request. Today condition 2 is unmet, so the endpoints answer 401.
//
// The client is written to the contract rather than to the defect: it sends what the endpoints
// specify, so it starts working once BOTH conditions hold. The preference page renders the failure
// honestly instead of pretending the session opened.

import { GrowthClientBase } from '~/utils/growth/api-client';

/** The header `GrowthPreferenceController` reads the double-submit CSRF token from. */
export const CSRF_HEADER = 'X-Growth-Csrf';

export class GrowthGuestService extends GrowthClientBase {
  constructor () {
    // Explicitly empty: see the header. There is no initializer argument to pass one in by mistake.
    super({});
  }

  /**
   * The current consent wording for a store, plus the version id a capture must pin.
   *
   * ONE call, never two: `GrowthPublicConsentTextResponse` carries the text and its id together
   * precisely so a page cannot display one version and post another. The page renders `text`
   * VERBATIM — it is the sentence the guest will be recorded as having agreed to, and it is
   * platform-global (`GrowthConsentTextSeed`, one row per locale, no store).
   *
   * An opaque 404 means the store has `growth.module` off (or does not exist — deliberately the same
   * answer). There is then no version id in existence for this page to pin, so there is no capture to
   * offer and the page offers none.
   */
  GetConsentText (storeId) {
    return this._request('GET', '/v1/growth/stores/' + storeId + '/consent-text');
  }

  /**
   * #1: double-opt-in START. ALWAYS 202 for a well-formed request — the response never varies by
   * whether the address is new, already pending, or already verified, because varying would make this
   * route an address-existence oracle. The only failures are a malformed request
   * (`growth.address_required`, `growth.consent_text_unknown`) and the dark-store 404.
   *
   * `consentTextVersionId` MUST be the id from the same `GetConsentText` response whose text was
   * displayed. It is pinned into the confirm token and onto the resulting consent receipt.
   */
  Subscribe (storeId, request) {
    return this._request('POST', '/v1/growth/stores/' + storeId + '/subscriptions', { body: request });
  }

  /**
   * #2: spends the double-opt-in token. 200 `{ status: 'confirmed' }` on the first confirm AND on
   * every replay (identical by design, so a replay is indistinguishable); 410 `growth.token_invalid`
   * for a token that is unknown, expired, or superseded by a later subscribe.
   */
  Confirm (token) {
    return this._request('POST', '/v1/growth/subscription-confirmations', { body: { token } });
  }

  /**
   * #3: exchanges the single-use preference LINK token for a scoped session.
   *
   * Single-use is absolute: the row is claimed `WHERE UsedAt IS NULL`, so the same link cannot open a
   * second session even seconds later. An unsubscribe token is refused here with the same 410 as an
   * unknown one — it must never be upgradeable into a session that can file an erasure.
   */
  OpenPreferenceSession (token) {
    return this._request('POST', '/v1/growth/preference-sessions', {
      body: { token },
      credentials: 'include'
    });
  }

  /** #4: the masked preference state for the session's scope. Carries no address, by design. */
  GetPreferences (csrfToken) {
    return this._request('GET', '/v1/growth/preference-session/preferences', {
      headers: this._csrf(csrfToken),
      credentials: 'include'
    });
  }

  /**
   * #5: sets consent for the session's own channel+purpose.
   *
   * `channel` and `purpose` are echoed from the session response and never chosen by the page: a
   * session can NEVER widen its scope, and a mismatch is a typed 403 `growth.scope_mismatch`.
   *
   * `consented: false` withdraws (suppression-first, idempotent). `consented: true` records a
   * re-consent receipt but does NOT lift an existing suppression — the returned state is the truth
   * and the page must render it rather than what was asked for.
   */
  UpdatePreference (csrfToken, channel, purpose, consented) {
    return this._request(
      'PUT',
      '/v1/growth/preference-session/preferences/' +
        encodeURIComponent(channel) + '/' + encodeURIComponent(purpose),
      { body: { consented: !!consented }, headers: this._csrf(csrfToken), credentials: 'include' });
  }

  /**
   * #6: one-click unsubscribe. Independent of any session — the per-recipient token is the entire
   * security boundary, and the endpoint is idempotent (a replay returns the same canonical state
   * rather than a 410).
   *
   * The JSON-body shape is used here. The RFC 8058 shape (`?token=` plus the fixed form body) is what
   * a MAIL CLIENT posts; a browser page has no reason to imitate it.
   */
  Unsubscribe (token) {
    return this._request('POST', '/v1/growth/unsubscribe', { body: { token } });
  }

  /**
   * #7: files an `Access` (GDPR art. 15) or `Erasure` (art. 17) request for the session's contact.
   *
   * Idempotent on (contact, store, type): an already-open request of the same type is RETURNED rather
   * than duplicated, so a second press is not a second request — the response is the canonical row
   * either way, which is why the page renders the response and never its own optimism.
   *
   * Filing an erasure writes a channel-global suppression IMMEDIATELY. The destruction itself is NOT
   * performed here: the row lands in `Received` and a store admin must resolve it
   * (`GrowthPrivacyRequestService.ResolveAsync`). Copy that implies the data is gone would be false.
   */
  FilePrivacyRequest (csrfToken, requestType) {
    return this._request('POST', '/v1/growth/preference-session/privacy-requests', {
      body: { requestType },
      headers: this._csrf(csrfToken),
      credentials: 'include'
    });
  }

  _csrf (csrfToken) {
    const headers = {};
    headers[CSRF_HEADER] = csrfToken || '';
    return headers;
  }
}

export default GrowthGuestService;
