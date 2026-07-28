// The Workforce SELF-SERVICE API client — the `/workforce/me` surface a worker calls for themselves.
//
// It lives here rather than in `core/services` because Core is a git submodule this repo carries no
// checkout of, and there is no Core service for the workforce surface. It is deliberately
// route-for-route with the backend and adds nothing: every method below maps to a controller action
// that exists today. Endpoint numbers are the ones the backend's own XML docs use, and the file:line
// references are `Controllers/WorkforceMeController.cs` in the OkamAPI repo.
//
//   GET  /workforce/me/staff-memberships                                     #31  (:115)
//   GET  /workforce/me/schedule?from&to                                      #33  (:133)
//   GET  /workforce/me/inbox                                                 #34  (:153)
//   POST /workforce/me/inbox/{itemId}/read                                   #35  (:170)
//   POST /workforce/me/publications/{publicationId}/acknowledgements         #44  (:193)
//   GET  /workforce/me/staff-memberships/{id}/open-assignments?from&to       #39  (:293)
//   POST /workforce/me/staff-memberships/{id}/open-assignments/{aid}/requests #40 (:312)
//   POST /workforce/me/staff-memberships/{id}/exchanges/{exchangeId}/decisions #42 (:361)
//
// Every mutation carries an `Idempotency-Key`; the surface rejects one without it.
//
// Routes that EXIST but are deliberately not bound here, because binding them would produce a screen
// that cannot tell the truth. Each is a backend gap recorded in the lane report, not an oversight:
//   • `/workforce/stores/{storeId}/requests` (#23) is the MANAGER decision inbox and needs the
//     WorkforceManager capability. It — not `/me/inbox` — is the surface that unions the four request
//     families and honours `?kind=`/`?state=`. A worker page must never call it.
//   • #41 (initiate a give-away / swap): no worker-side read reports the caller's own outstanding
//     offers, so the result would vanish on reload.
//   • #37/#38 (time-off request + withdraw): the membership carries no store `timeZoneId`, so a
//     picked calendar date cannot be mapped to the UTC instant that yields the intended
//     `LocalEndDate` — in any zone ahead of UTC a request for 1–3 Aug can be stored as 1–4 Aug. And
//     there is no route to list the caller's own requests, so the result would vanish on reload.
//
// Out of this page's scope rather than blocked: #32 (invitation claim) belongs to the deep-link
// onboarding flow, #36 (set own availability) and #43 (own worked time) each want a screen of their
// own. All three are sound routes waiting for a caller.
//
// The error type, the `Idempotency-Key` mutation rule and the range wire format live in
// `~/utils/workforce/api-client`, shared with the manager surface. This lane and the schedule lane
// each grew their own copy of all three; the merge kept one.

import { WorkforceClientBase, toUtcRangeParam } from '~/utils/workforce/api-client';

export class WorkforceMeService extends WorkforceClientBase {
  _range (from, to) {
    const params = [];
    if (from) { params.push('from=' + encodeURIComponent(toUtcRangeParam(from))); }
    if (to) { params.push('to=' + encodeURIComponent(toUtcRangeParam(to))); }
    return params.length ? '?' + params.join('&') : '';
  }

  /** #31: the caller's own store-scoped engagements. */
  GetMemberships () {
    return this._request('GET', '/workforce/me/staff-memberships');
  }

  /** #33: the caller's own PUBLISHED shifts across engagements. A draft is never disclosed here. */
  GetSchedule (from, to) {
    return this._request('GET', '/workforce/me/schedule' + this._range(from, to));
  }

  /**
   * #34: the caller's canonical inbox.
   *
   * It takes NO query parameters (WorkforceMeController.cs:155 declares none). Appending `?kind=` or
   * `?state=` would be silently ignored and the page would believe it had filtered — the precise lie
   * the manager inbox's 400-on-unknown-filter exists to prevent. Filtering happens client-side, over
   * the vocabulary in `inbox-filter.js`, which refuses an unrecognised value the same way.
   */
  GetInbox () {
    return this._request('GET', '/workforce/me/inbox');
  }

  /** #35: idempotent read marker on one owned inbox item. */
  MarkInboxRead (inboxItemId) {
    return this._mutate('POST', '/workforce/me/inbox/' + inboxItemId + '/read');
  }

  /** #44: informational receipt for one owned publication. Never legal acceptance. */
  AcknowledgePublication (publicationId) {
    return this._mutate('POST', '/workforce/me/publications/' + publicationId + '/acknowledgements');
  }

  /** #39: the shifts in the caller's own store that are awardable to them. */
  GetOpenAssignments (staffMemberId, from, to) {
    return this._request(
      'GET',
      '/workforce/me/staff-memberships/' + staffMemberId + '/open-assignments' + this._range(from, to)
    );
  }

  /**
   * #40: ask for one open shift. Creates a candidacy, never an assignment — a manager awards exactly
   * one candidate, so a `409 workforce.award-taken` here is a normal outcome. See `claim-outcome.js`.
   */
  RequestOpenShift (staffMemberId, shiftAssignmentId, note) {
    return this._mutate(
      'POST',
      '/workforce/me/staff-memberships/' + staffMemberId +
        '/open-assignments/' + shiftAssignmentId + '/requests',
      { note: note || null }
    );
  }

  /** #42: the caller's OWN accept / decline / withdraw on an exchange. Never the manager award. */
  DecideExchange (staffMemberId, exchangeId, decision, note) {
    return this._mutate(
      'POST',
      '/workforce/me/staff-memberships/' + staffMemberId + '/exchanges/' + exchangeId + '/decisions',
      { decision, note: note || null }
    );
  }
}

export default WorkforceMeService;
