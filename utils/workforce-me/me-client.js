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
//   PUT  /workforce/me/staff-memberships/{id}/availability                   #36  (:215)
//   POST /workforce/me/staff-memberships/{id}/time-off                       #37  (:242)
//   POST /workforce/me/staff-memberships/{id}/requests/{requestId}/withdraw  #38  (:269)
//   GET  /workforce/me/staff-memberships/{id}/open-assignments?from&to       #39  (:293)
//   POST /workforce/me/staff-memberships/{id}/open-assignments/{aid}/requests #40 (:312)
//   POST /workforce/me/staff-memberships/{id}/exchanges/{exchangeId}/decisions #42 (:361)
//
// Plus ONE route that is not on `/workforce/me` at all, bound here deliberately:
//
//   GET  /workforce/stores/{storeId}/context                                 #1   (WorkforceStaffController:52)
//
// It is the only route that tells a WORKER the store's IANA timezone. `RequireAnyCapabilityAsync`
// admits any non-empty capability grant, so a caller holding merely `WorkforceSelf` may read it,
// while the membership list (#31) carries no zone at all. Without a zone a picked calendar date
// cannot be mapped to the UTC instant that yields the intended `LocalEndDate`: in any zone ahead of
// UTC, "1–3 August" naively sent as midnight-to-midnight is stored as 1–4 August. The date pickers
// are withheld entirely when this read fails, rather than guessing with the phone's own zone.
//
// Every mutation carries an `Idempotency-Key`; the surface rejects one without it.
//
// Routes that EXIST but are deliberately not bound here, because binding them would produce a screen
// that cannot tell the truth. Each is a backend gap recorded in the lane report, not an oversight:
//   • `/workforce/stores/{storeId}/requests` (#23) is the MANAGER decision inbox and needs the
//     WorkforceManager capability. It — not `/me/inbox` — is the surface that unions the four request
//     families and honours `?kind=`/`?state=`. A worker page must never call it; the manager surface
//     is `/admin/workforce-requests`.
//   • #41 (initiate a give-away / swap): no worker-side read reports the caller's own outstanding
//     offers, so the result would vanish on reload.
//
// Out of this page's scope rather than blocked: #32 (invitation claim) belongs to the deep-link
// onboarding flow and #43 (own worked time) wants a screen of its own.
//
// A GAP THE BOUND ROUTES INHERIT, which the screens must state rather than paper over: there is NO
// worker-side READ for either availability (#36 is a PUT and #14's GET requires WorkforceScheduler)
// or the caller's own time-off requests (`/me/inbox` carries publication items only). Each write's
// RESPONSE is the canonical state, so a submission is visible for as long as the page is open and
// no longer. The two forms say so in as many words.
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

  /**
   * #1: the store's context — read here for ONE field, `timeZone.id`.
   *
   * The only store-scoped route this worker client binds, and the only one that answers a zone to a
   * caller who is merely `WorkforceSelf`. It also returns the caller's own capability list, which is
   * how the page can tell a worker apart from a worker who is also a manager.
   */
  GetStoreContext (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/context');
  }

  /**
   * #36: set the caller's OWN availability. A REPLACE, not a patch.
   *
   * The recurring `rules` supersede the whole active set — anything omitted stops being in force
   * (history is preserved server-side, but it stops applying). The one-off `exceptions` replace every
   * FUTURE/ongoing exception; already-elapsed ones are retained, because you edit the future and
   * never rewrite the past. A caller that sent only the day it changed would silently clear the other
   * six, which is why the form always submits the whole week.
   *
   * Availability is advisory scheduler input and NEVER mutates a published assignment.
   */
  SetAvailability (staffMemberId, request) {
    return this._mutate(
      'PUT',
      '/workforce/me/staff-memberships/' + staffMemberId + '/availability',
      request
    );
  }

  /**
   * #37: ask to be off for a UTC interval.
   *
   * The local business dates are SERVER-computed from the store zone, so the instants sent here
   * decide which calendar days the request lands on. `visibility` is `Managers` (default — only the
   * worker and a deciding manager see the row) or `Team` (coworkers may see that the worker is off,
   * never the reason). The reason is never broadcast either way.
   */
  RequestTimeOff (staffMemberId, request) {
    return this._mutate(
      'POST',
      '/workforce/me/staff-memberships/' + staffMemberId + '/time-off',
      request
    );
  }

  /**
   * #38: withdraw the caller's own request, legal only while it is still open (Submitted /
   * UnderReview). A request a manager has already decided is a typed
   * `409 workforce.request-not-decidable` — a normal outcome, not a fault.
   */
  WithdrawRequest (staffMemberId, requestId) {
    return this._mutate(
      'POST',
      '/workforce/me/staff-memberships/' + staffMemberId + '/requests/' + requestId + '/withdraw'
    );
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
