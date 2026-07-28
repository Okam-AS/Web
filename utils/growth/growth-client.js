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
//
// DELIBERATELY ABSENT, and each absence is a decision rather than an oversight:
//
//   #9  consent-timeline  — per-contact PII, gated on `growth.contact_pii.read` (PowerUser only).
//                           The capture-to-send journey never needs a named individual, and a lane
//                           is currently repairing that route's accessor attribution. Not surfaced.
//   #19 delivery-health   — post-send operations, a different journey from authoring a lawful send.
//   #20/#21 privacy-requests — the guest's own rights journey, not the venue's send journey.
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
}

export default GrowthService;
