// The Workforce REQUESTS API client — the manager DECISION inbox of one store.
//
// It sits beside `schedule-client.js` and `roster-client.js` rather than inside either, for the same
// reason those two are separate: one client per backend controller. `WorkforceRequestsController` is
// its own controller with its own capability (WorkforceManager) and its own aggregate — a request,
// not a schedule revision — and the `If-Match` it takes is the REQUEST's revision, which is a
// different token from the draft checksum the schedule's batch edit sends. Two aggregates'
// preconditions on one client is how a caller ends up sending the wrong one.
//
// Route-for-route with the backend, adding nothing. Endpoint numbers are the backend's own; the file
// references are `Controllers/WorkforceRequestsController.cs` in the OkamAPI repo.
//
//   GET   /workforce/stores/{storeId}/requests?kind&state    #23  (:44)
//   PATCH /workforce/stores/{storeId}/requests/{requestId}   #24  (:61)
//
// `ListRequests` used to live on `schedule-client.js`, which read it for the week grid's absence
// markers. It moved here rather than being copied: a second binding of the same route is the shape
// that drifts (one caller gains a filter the other does not), and the schedule page now reads its
// markers through this service too.
//
// THERE IS NO CREATE AND NO WITHDRAW HERE. A request is created by the worker (#37 time-off, #40
// open-shift, #41 exchange, all on `/workforce/me`) and withdrawn by the worker (#38, #42). The
// manager surface has exactly one verb — decide — which is why this client has exactly one mutation.

import { WorkforceClientBase } from '~/utils/workforce/api-client';

export class WorkforceRequestsService extends WorkforceClientBase {
  /**
   * #23: the manager inbox, unioning the four request families (time-off, availability exception,
   * shift exchange, open-shift request) over one row shape.
   *
   * Both filters are optional. An UNRECOGNISED value is a 400, never a silently empty list — the
   * backend made that choice deliberately (`WorkforceRequestProblems.InvalidInboxFilter`) because the
   * pre-WB5 inbox accepted any token and returned the unfiltered list, so a client could not tell a
   * filter that matched nothing from one the server never applied. Callers must therefore send a
   * token from `requests-inbox.js`'s vocabulary rather than free text from a URL.
   *
   * Omitting `state` selects the server's DEFAULT projection — the work still in flight, which is
   * what an inbox is. `state=all` is how the decided history is reached.
   */
  ListRequests (storeId, kind, state) {
    const params = [];
    if (kind) { params.push('kind=' + encodeURIComponent(kind)); }
    if (state) { params.push('state=' + encodeURIComponent(state)); }
    const query = params.length ? '?' + params.join('&') : '';
    return this._request('GET', '/workforce/stores/' + storeId + '/requests' + query);
  }

  /**
   * #24: decide one request — approve or reject a time-off request, or AWARD (approve) / pass over
   * (reject) one shift-exchange candidacy.
   *
   * There is no discriminator in the body. The server dispatches on the id's own identity
   * (`IsExchangeRequestAsync`), so a client cannot steer a request into the wrong aggregate, and the
   * two branches answer identically for an id that is not in this store. Which means the response
   * shape depends on the family: a time-off decision answers `WorkforceTimeOffRequestModel`
   * (`firstAffectedScheduleRevisionId`), an award answers `WorkforceShiftExchangeRequestModel`
   * (`affectedScheduleRevisionId` + `requiresSuccessorRevision`). Callers must read both.
   *
   * `revision` is the opaque token the inbox row carried, resubmitted as `If-Match`. A FALSY revision
   * omits the header rather than sending an empty or literal-"null" one, exactly as the roster's
   * `UpdateStaff` does: an absent If-Match is the honest 400 ("this decision carried no
   * precondition"), while a junk one is compared against the real rowversion and comes back as
   * `workforce.stale-revision` — a 409 telling the manager somebody else moved the request when
   * nobody did. The token is null under SQLite, where the backend has no rowversion, so a caller must
   * be prepared for it to be absent rather than assume one always exists.
   */
  DecideRequest (storeId, requestId, revision, decision, decisionNote) {
    const headers = revision ? { 'If-Match': revision } : undefined;
    return this._mutate(
      'PATCH',
      '/workforce/stores/' + storeId + '/requests/' + requestId,
      { decision, decisionNote: decisionNote || null },
      headers
    );
  }
}

export default WorkforceRequestsService;
