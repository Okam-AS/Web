// The Workforce schedule API client — the MANAGER surface, scoped to one store.
//
// It lives here rather than in `core/services` because Core is a git submodule this repo does not
// carry a checkout of, and there is no Core service for the workforce surface yet. It is deliberately
// route-for-route with the backend and adds nothing: every method below maps to a controller action
// that exists. Endpoint numbers are the ones the backend's own XML docs use.
//
//   GET  /workforce/stores/{storeId}/context                                #1   WorkforceStaffController
//   GET  /workforce/stores/{storeId}/staff                                  #2   WorkforceStaffController
//   GET  /workforce/stores/{storeId}/roles                                  #8   WorkforceStaffController
//   GET  /workforce/stores/{storeId}/schedules?from&to&view                 #17  WorkforceSchedulesController
//   GET  /workforce/stores/{storeId}/schedules/external-commitments?from&to  #23  WorkforceSchedulesController
//   GET  /workforce/stores/{storeId}/requests?kind&state                    #23  WorkforceRequestsController
//   POST /workforce/stores/{storeId}/schedules/drafts                       #16  WorkforceSchedulesController
//   POST /workforce/stores/{storeId}/schedules/{revisionId}/validate        #19  WorkforceSchedulesController
//   POST /workforce/stores/{storeId}/schedules/{revisionId}/publish         #20  WorkforceSchedulesController
//   GET  /workforce/stores/{storeId}/schedules/publication-history          #21  WorkforceSchedulesController
//
// The error type, the `Idempotency-Key` mutation rule and the range wire format live one level up in
// `~/utils/workforce/api-client`, shared with the worker surface.

import { WorkforceClientBase } from '~/utils/workforce/api-client';

export class WorkforceScheduleService extends WorkforceClientBase {
  GetContext (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/context');
  }

  ListStaff (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/staff');
  }

  /**
   * #8: the store's `WorkforceRole` list — the axis the role pivot groups on.
   *
   * Takes NO parameters: not a range, not a paging cursor, not an `includeInactive`. The server
   * returns every role the store has ever defined, already ordered by `sortOrder` then `name`, and
   * that order is preserved rather than re-sorted here.
   *
   * There is no role deletion in this surface (no `DELETE` verb, no `isActive` flag). The only
   * retire lever is `effectiveToUtc`, and this read does NOT filter on it — so a role retired last
   * year still comes back and the client decides what to say about it.
   *
   * Same capability as the range read (`WorkforceScheduler`), so a caller who can draw the week can
   * read the roles; a failure here means the role axis is UNKNOWN, never that the store has none.
   */
  ListRoles (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/roles');
  }

  // `from`/`to` are the range params produced by `toUtcRangeParam` (see api-client.js for why they
  // carry no zone designator). `view` is `draft` (default) or `published`.
  GetRange (storeId, from, to, view) {
    const query = '?from=' + encodeURIComponent(from) +
      '&to=' + encodeURIComponent(to) +
      '&view=' + encodeURIComponent(view || 'draft');
    return this._request('GET', '/workforce/stores/' + storeId + '/schedules' + query);
  }

  /**
   * #23: the advisory cross-store overlay — per rostered person, the PUBLISHED commitments that
   * exist for the same (person, legal employer) scope at some store OTHER than this one.
   *
   * The response is KIND AND TIMES ONLY. It names no other store, no other assignment and no other
   * engagement, because the write path's refusal for exactly these rows
   * (`workforce.hidden-engagement-conflict`) names none of them either — a read that disclosed more
   * than the refusal would be a §5.4 leak. Nothing downstream of this call may invent a store.
   *
   * Same capability as the range read (WorkforceScheduler at THIS store), so a caller who can draw
   * the week can draw the overlay; a 403 here means the overlay is unknown, never that it is empty.
   */
  GetExternalCommitments (storeId, from, to) {
    const query = '?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to);
    return this._request('GET', '/workforce/stores/' + storeId + '/schedules/external-commitments' + query);
  }

  // `state=all` rather than the default in-flight inbox: an APPROVED time-off is decided, so the
  // default projection omits it — and an approved absence is exactly what the grid must show.
  ListRequests (storeId, kind, state) {
    const params = [];
    if (kind) { params.push('kind=' + encodeURIComponent(kind)); }
    if (state) { params.push('state=' + encodeURIComponent(state)); }
    const query = params.length ? '?' + params.join('&') : '';
    return this._request('GET', '/workforce/stores/' + storeId + '/requests' + query);
  }

  CreateDraft (storeId, request) {
    return this._mutate('POST', '/workforce/stores/' + storeId + '/schedules/drafts', request);
  }

  Validate (storeId, revisionId) {
    return this._mutate('POST', '/workforce/stores/' + storeId + '/schedules/' + revisionId + '/validate');
  }

  Publish (storeId, revisionId) {
    return this._mutate('POST', '/workforce/stores/' + storeId + '/schedules/' + revisionId + '/publish');
  }

  GetPublicationHistory (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/schedules/publication-history');
  }
}

export default WorkforceScheduleService;
