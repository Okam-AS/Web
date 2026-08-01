// The Growth admin API client — the StoreAdmin surface, scoped to one store.
//
// It lives here rather than in `core/services` because Core is a git submodule this repo does not
// carry a checkout of, and there is no Core service for the Growth surface. It is deliberately
// route-for-route with the backend and adds nothing: every method below maps to a controller action
// that exists. Endpoint numbers are the ones the backend's own XML docs use.
//
//   GET  /v1/growth/stores/{storeId}/consents/summary                         #8   GrowthConsentAdminController
//   GET  /v1/growth/stores/{storeId}/segments                                 #10  GrowthSegmentsController
//   POST /v1/growth/stores/{storeId}/segments/{segmentKey}/snapshots          #11  GrowthSegmentsController
//   GET  /v1/growth/stores/{storeId}/newsletters?state&cursor&limit           #12  GrowthNewslettersController
//   POST /v1/growth/stores/{storeId}/newsletters                              #13  GrowthNewslettersController
//   GET  /v1/growth/stores/{storeId}/newsletters/{id}                         #14  GrowthNewslettersController
//   PUT  /v1/growth/stores/{storeId}/newsletters/{id}                         #15  GrowthNewslettersController
//   POST /v1/growth/stores/{storeId}/newsletters/{id}/test-sends              #16  GrowthNewslettersController
//   POST /v1/growth/stores/{storeId}/newsletters/{id}/approval                #17  GrowthNewslettersController
//   POST /v1/growth/stores/{storeId}/newsletters/{id}/dispatch                #18  GrowthNewslettersController
//   GET  /v1/growth/stores/{storeId}/delivery-health                          #19  GrowthDeliveryHealthController
//   GET  /v1/growth/stores/{storeId}/privacy-requests                         #20  GrowthConsentAdminController
//   POST /v1/growth/stores/{storeId}/privacy-requests/{id}/resolution         #21  GrowthConsentAdminController
//
// DELIBERATELY ABSENT, and the absence is a decision rather than an oversight:
//
//   #9  consent-timeline  — per-contact PII, gated on `growth.contact_pii.read` (PowerUser only).
//                           The capture-to-send journey never needs a named individual, and neither
//                           does resolving a request: the art. 15 export is built and delivered
//                           SERVER-SIDE by `ExecuteAccessAsync`, so no admin screen has to read a
//                           named individual's history to discharge the obligation. The privacy
//                           queue is nonetheless the only surface in the product from which a
//                           `contactPointId` is discoverable, so #9 becomes reachable the day a
//                           PowerUser surface wants it. Not surfaced here.
//
// #20/#21 WERE on that list ("the guest's own rights journey, not the venue's send journey"). That
// reading was wrong, and expensively so: `gr_guest_request_deadline` tells the guest on screen that
// the venue has one month to answer them under GDPR art. 12, the request row is written — and with
// no caller for these two routes there was no surface at which any human at the venue could see the
// request, let alone answer it. A statutory promise with nothing behind it is worse than a missing
// feature. `pages/admin/growth-privacy.vue` is the surface; these two methods are its wire.
//
// #19 WAS on that list ("post-send operations, a different journey"). It is read now, for ONE narrow
// purpose that belongs to the send journey rather than to operations: it is the only StoreAdmin read
// that reports which mail-provider accounts a store has and whether any is PAUSED. The pause is one
// of the two kill switches the dispatch route checks before it creates anything
// (`GrowthDispatchService.EnsureDispatchIsPermittedAsync`), so without it the send gate cannot tell an
// operator that their send will 409. The rates/queue-age half of the response is still the operations
// journey and is still not surfaced here.
//
// The error type and the transport live in `~/utils/growth/api-client`.

import { GrowthClientBase } from '~/utils/growth/api-client';

/** The one system segment v1 defines (`GrowthSegmentService.NewsletterSubscribersKey`). */
export const NEWSLETTER_SUBSCRIBERS = 'newsletter-subscribers';

export class GrowthService extends GrowthClientBase {
  /**
   * #8: the store's consent standing — aggregate counts ONLY, never a contact list.
   *
   * This is the closest thing the admin surface has to "what did capture produce": every figure is
   * a distinct-contact count derived from the append-only consent ledger. It is NOT the audience —
   * a send's recipients come from an immutable snapshot (#11), never from these numbers.
   *
   * A failure here means the consent standing is UNKNOWN, never that the store has no consents.
   */
  GetConsentSummary (storeId) {
    return this._request('GET', '/v1/growth/stores/' + storeId + '/consents/summary');
  }

  /** #10: the fixed system-segment catalog. v1 has no custom builder, so this is a short, fixed list. */
  ListSegments (storeId) {
    return this._request('GET', '/v1/growth/stores/' + storeId + '/segments');
  }

  /**
   * #11: computes an IMMUTABLE membership snapshot — the only lawful source of a recipient count.
   *
   * Idempotent on the source watermark: recomputing over an unchanged ledger returns the SAME
   * snapshot rather than a new one, so pressing this twice is not two audiences.
   */
  ComputeSnapshot (storeId, segmentKey) {
    return this._send('POST', '/v1/growth/stores/' + storeId + '/segments/' +
      encodeURIComponent(segmentKey) + '/snapshots');
  }

  /**
   * #12: the cursor-paginated newsletter list (the GRW-OD4 frozen contract — id DESCENDING, opaque
   * forward-only cursor, limit clamped to 100, an empty tail is `items: []` and never a 404).
   */
  ListNewsletters (storeId, options) {
    const opts = options || {};
    const params = [];
    if (opts.state) { params.push('state=' + encodeURIComponent(opts.state)); }
    if (opts.cursor) { params.push('cursor=' + encodeURIComponent(opts.cursor)); }
    if (opts.limit) { params.push('limit=' + encodeURIComponent(opts.limit)); }
    const query = params.length ? '?' + params.join('&') : '';
    return this._request('GET', '/v1/growth/stores/' + storeId + '/newsletters' + query);
  }

  /** #13: creates draft version 1, bound to an existing snapshot id from #11. */
  CreateDraft (storeId, request) {
    return this._send('POST', '/v1/growth/stores/' + storeId + '/newsletters', request);
  }

  /** #14: the newsletter detail — current version, approval state, bound snapshot, and the run. */
  GetNewsletter (storeId, newsletterId) {
    return this._request('GET', '/v1/growth/stores/' + storeId + '/newsletters/' + newsletterId);
  }

  /**
   * #15: edits the draft into a NEW immutable version and invalidates any live approval.
   *
   * `baseVersionNo` is the optimistic-concurrency guard — a stale base is a 409
   * `growth.stale_version`, never a silent overwrite of someone else's edit.
   */
  EditDraft (storeId, newsletterId, request) {
    return this._request('PUT', '/v1/growth/stores/' + storeId + '/newsletters/' + newsletterId,
      { body: request });
  }

  /** #16: submits the current version to the admin's OWN named address via the provider test route. */
  TestSend (storeId, newsletterId, testAddress) {
    return this._send('POST',
      '/v1/growth/stores/' + storeId + '/newsletters/' + newsletterId + '/test-sends',
      { testAddress });
  }

  /**
   * #17: the human approval binding. It must pin the EXACT current version id, content hash and
   * bound snapshot; any drift is a 409 `growth.approval_stale`, so a stale review can never
   * green-light changed content or a changed audience.
   */
  Approve (storeId, newsletterId, request) {
    return this._send('POST',
      '/v1/growth/stores/' + storeId + '/newsletters/' + newsletterId + '/approval', request);
  }

  /**
   * #18: dispatch. Requires a live approval matching the current version — there is no send path
   * that bypasses approval. Idempotent: exactly one run per approved version.
   */
  Dispatch (storeId, newsletterId) {
    return this._send('POST',
      '/v1/growth/stores/' + storeId + '/newsletters/' + newsletterId + '/dispatch');
  }

  /**
   * #19: delivery health. Read here for the PROVIDER ACCOUNTS half only — see the header comment.
   *
   * `providers[]` is `{ providerKey, sendingDomain, paused }`. It reports the store's provisioned
   * accounts; it does NOT report which `IGrowthMailProvider` implementation the server has bound, and
   * no endpoint does (see `GrowthDeliveryHealthController` — the binding is a DI decision in
   * `Program.cs`, not a read). Callers must not infer the adapter from this list.
   */
  GetDeliveryHealth (storeId) {
    return this._request('GET', '/v1/growth/stores/' + storeId + '/delivery-health');
  }

  /**
   * #20: the store's data-subject requests — the art. 15 and art. 17 ones a guest has filed.
   *
   * SCOPED TO THE ROUTE'S STORE BY THE SERVER, not by the caller: `ListAsync` filters on
   * `p.StoreId == storeId` and `AuthorizeStoreAsync` refuses a store the caller does not administer
   * with the same opaque 404 it gives an absent one. So the store id in this path is the whole of the
   * tenancy boundary, and a caller that sent the wrong one would be shown another venue's queue if
   * it held that store and nothing at all if it did not — never a silently unfiltered list.
   *
   * The contact is MASKED: every item carries `contactPointId` and no address, by design (spec §3
   * invariant 11). A failure here means the queue is UNKNOWN, never that nobody has asked.
   */
  ListPrivacyRequests (storeId) {
    return this._request('GET', '/v1/growth/stores/' + storeId + '/privacy-requests');
  }

  /**
   * #21: records the resolution, and — for `Fulfilled` — EXECUTES it.
   *
   * This is not a status update. `Fulfilled` runs the spec §13 steps in the same call: an erasure
   * sends the subject their completion notice and then crypto-shreds the address (or defers the shred
   * while another controller still holds live consent), and an access request builds the subject's
   * export and mails it. None of that can be taken back, which is why the page re-asserts the
   * preconditions at the call site rather than trusting a disabled button.
   *
   * `RejectedWithReason` requires a reason and records it. Idempotent: a request already in a terminal
   * state answers its canonical row without re-executing anything.
   *
   * The refusals this raises, all of them typed:
   *   growth.body_required          400  no body
   *   growth.invalid_resolution     400  outcome was neither terminal state
   *   growth.reason_required        400  a rejection with no reason
   *   growth.not_found              404  concealment — absent OR another store's request
   *   growth.unattributed           401  no resolvable identity; nothing is destroyed on nobody's word
   *   growth.notice_undeliverable   503  the transport would not take the subject's notice, so the
   *                                      request stays OPEN and the address is intact — retryable
   */
  ResolvePrivacyRequest (storeId, requestId, resolution) {
    return this._send('POST',
      '/v1/growth/stores/' + storeId + '/privacy-requests/' + requestId + '/resolution', resolution);
  }
}

/**
 * The ONE route this surface calls that is not under `/v1/growth`, RE-EXPORTED rather than defined.
 *
 * WHY GROWTH READS IT AT ALL. Two store-scoped switches decide whether a dispatch can happen, and
 * neither is reported by any Growth endpoint:
 *
 *   growth.module   — off ⇒ `POST .../dispatch` and `POST .../test-sends` answer an opaque 404
 *                     (`GrowthNewslettersController.ModuleIsLiveAsync`). Deny-closed by default.
 *   growth.dispatch — off ⇒ 409 `growth.dispatch_disabled` before any run is created
 *                     (`GrowthDispatchService.EnsureDispatchIsPermittedAsync`). Deny-closed by default.
 *
 * Without them the send gate could only say "ready" and let the operator discover the refusal by
 * pressing the button — which is the defect this reader exists to remove.
 *
 * WHY THE CLASS ITSELF MOVED to `~/utils/platform/feature-flags-client`. It was written here because
 * Growth was the first caller that needed it, and this file's header called it "the ONE route this
 * surface calls that is not under /v1/growth". Six modules later that is no longer a Growth detail:
 * `StoreFeatureFlagsController` owns the flags of all six, and the operator screen at
 * `/admin/feature-flags` writes the same route. Two definitions of one route is where the drift
 * starts, so there is one, in the namespace the route actually belongs to. Callers here are
 * unchanged; the import path they use is not the point, the single definition is.
 *
 * The re-export also changes the error type this reader throws from `GrowthApiError` to
 * `PlatformApiError`, which is the correct one: this controller answers `Forbid()` and
 * `BadRequest(new { message })`, not the Growth `{ error: { code, message } }` envelope, so a
 * `GrowthApiError` read `code: null` off every one of its refusals.
 */
export { StoreFeatureFlagReader } from '~/utils/platform/feature-flags-client';

export default GrowthService;
