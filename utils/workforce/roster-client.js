// The Workforce ROSTER API client — the identity/management surface of one store.
//
// It sits beside `utils/workforce/schedule-client.js` rather than inside it because the two answer
// different questions of the same controller family: the schedule client draws a week, this one
// manages who exists. Both extend the one `WorkforceClientBase`, and neither carries its own error
// type — `WorkforceApiError` is shared, and there is exactly one of it.
//
// Route-for-route with the backend, adding nothing. Endpoint numbers are the backend's own; the
// file references are `Controllers/WorkforceStaffController.cs` and `WorkforceAttendanceController.cs`
// in the OkamAPI repo.
//
//   GET   /workforce/stores/{storeId}/context                          #1   (:52)
//   GET   /workforce/stores/{storeId}/staff                            #2   (:67)
//   POST  /workforce/stores/{storeId}/staff                            #3   (:82)
//   GET   /workforce/stores/{storeId}/staff/{id}                       #4   (:107)
//   PATCH /workforce/stores/{storeId}/staff/{id}                       #5   (:122)
//   GET   /workforce/stores/{storeId}/roles                            #8   (:203)
//   GET   /workforce/stores/{storeId}/staff/{id}/roles                 #10  (:243)
//   PUT   /workforce/stores/{storeId}/staff/{id}/roles                 #11  (:258)
//   GET   /workforce/stores/{storeId}/staff/{id}/employment-terms      #12  (:283)
//   PUT   /workforce/stores/{storeId}/staff/{id}/employment-terms      #13  (:298)
//   GET   /workforce/stores/{storeId}/attendance?from&to               #25  (WorkforceAttendanceController:55)
//
// ROUTES THAT EXIST AND ARE DELIBERATELY NOT BOUND HERE, each a recorded decision rather than an
// oversight:
//   • `PUT /roles` (#9) — creating and retiring the store's job-role catalogue is a screen of its
//     own. This page assigns roles that exist; it does not define them, and a roster that silently
//     created a role because a manager typed a name would make the role list unownable.
//   • `POST /staff/{id}/invitations` (#6) — issuing a claim token returns the RAW token exactly
//     once and never again, which needs a handover flow (show once, copy, confirm sent) rather than
//     a button on a table row that can be double-clicked into an unrecoverable token.
//   • `POST /staff/pos-operator-import` (#7) — the manager-reviewed bulk link of existing POS
//     operators to engagements. A per-item outcome report, not a roster action.
//
// THERE IS NO DELETE. `WorkforceStaffController` binds none, for any resource. Ending employment is
// `PATCH { isActive: false }` and nothing else, which is why this client has no destructive verb to
// offer.

import { WorkforceClientBase, toUtcRangeParam } from '~/utils/workforce/api-client';

export class WorkforceRosterService extends WorkforceClientBase {
  _staffPath (storeId, staffMemberId) {
    return '/workforce/stores/' + storeId + '/staff/' + staffMemberId;
  }

  /** #1: the caller's own capabilities in this store, plus the store timezone every date renders in. */
  GetContext (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/context');
  }

  /**
   * #2: every engagement of this store — active and ended alike.
   *
   * It takes no parameters: no paging, no `activeOnly`, no search. The server returns the whole
   * roster ordered by display name, and that order is preserved rather than re-sorted here. Ended
   * engagements come back too, which is what makes a rehire visible as the SAME person rather than
   * as a stranger.
   */
  ListStaff (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/staff');
  }

  /**
   * #3: create an engagement — and, when `workforcePersonId` is absent, the person as well.
   *
   * Supplying `workforcePersonId` attaches a SECOND engagement to a person who already exists,
   * which is the whole point of the person/engagement split. It is also the path that meets the
   * one-active-engagement-per-legal-employer index, so a 409 here is a normal outcome and not an
   * error state.
   *
   * A POS `operatorId` is deliberately not accepted by the endpoint: operator linking is the
   * manager-reviewed import, so an operator session can never quietly become an engagement.
   */
  CreateStaff (storeId, request) {
    return this._mutate('POST', '/workforce/stores/' + storeId + '/staff', request);
  }

  /** #4: one engagement in full, including the contact fields and the opaque `revision` a PATCH needs. */
  GetStaff (storeId, staffMemberId) {
    return this._request('GET', this._staffPath(storeId, staffMemberId));
  }

  /**
   * #5: partially update an engagement. Every field is optional and a null means "leave unchanged".
   *
   * `revision` is the opaque base64 token `GET /staff/{id}` returned, resubmitted as `If-Match`.
   * Without it the surface answers a plain 400; with a stale one it answers
   * `workforce.stale-revision` (409) carrying the current token. The revision is null under SQLite,
   * where the backend has no rowversion — so a caller must be prepared for the header to be absent
   * rather than assume a token always exists.
   *
   * This is also the ONLY way to end employment: `{ isActive: false }`. There is no delete.
   */
  UpdateStaff (storeId, staffMemberId, revision, request) {
    // A falsy revision OMITS the header rather than sending an empty or literal-"null" one. The
    // difference matters: an absent If-Match is the honest 400 ("this update carried no
    // precondition"), while a junk one is compared against the real rowversion and comes back as
    // `workforce.stale-revision` — a 409 that tells the manager somebody else changed the row when
    // in fact nobody did.
    const headers = revision ? { 'If-Match': revision } : undefined;
    return this._mutate('PATCH', this._staffPath(storeId, staffMemberId), request, headers);
  }

  /**
   * #8: the store's job-role catalogue.
   *
   * Roles are AUTHORIZATION-FREE — name, station, colour, sort order, effective dates and nothing
   * else. Holding one grants nothing; capabilities live on the engagement. The read returns retired
   * roles too (there is no deletion, only `effectiveToUtc`), and it is the caller's job to say so.
   */
  ListRoles (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/roles');
  }

  /** #10: the roles one engagement holds. */
  ListStaffRoles (storeId, staffMemberId) {
    return this._request('GET', this._staffPath(storeId, staffMemberId) + '/roles');
  }

  /**
   * #11: set the engagement's roles to EXACTLY this set — links not listed are removed.
   *
   * Not a patch and not an add: sending a partial list silently unassigns everything omitted, so
   * callers must send the full intended set every time.
   */
  AssignStaffRoles (storeId, staffMemberId, roles) {
    return this._mutate('PUT', this._staffPath(storeId, staffMemberId) + '/roles', { roles });
  }

  /**
   * #12: the engagement's effective-dated employment terms, newest first.
   *
   * Requires WorkforceManager. The wage block inside each term additionally requires
   * WorkforcePayrollApprover and is nulled without it — indistinguishable on the wire from a term
   * that carries no wage, which is why the caller must decide the meaning from its own capabilities
   * rather than from the null.
   */
  GetEmploymentTerms (storeId, staffMemberId) {
    return this._request('GET', this._staffPath(storeId, staffMemberId) + '/employment-terms');
  }

  /**
   * #13: append a new effective-dated term. The previous open term is closed at the new one's
   * effective instant by the server, so terms never overlap and nothing is edited in place.
   *
   * Sending wage data requires WorkforcePayrollApprover: a manager who cannot READ a wage is
   * refused when writing one.
   */
  CreateEmploymentTerm (storeId, staffMemberId, request) {
    return this._mutate('PUT', this._staffPath(storeId, staffMemberId) + '/employment-terms', request);
  }

  /**
   * #25: the attendance grid, read here for ONE field — `openSessionCount`.
   *
   * The roster needs it before it may offer to end an engagement: the POS clock resolves its
   * operator through the engagement's `IsActive`, so ending one while a clock session is open
   * strands that session unclosable. `from`/`to` use the same bare wire format every workforce
   * range takes (see api-client.js for why they carry no zone designator).
   */
  GetAttendance (storeId, fromUtc, toUtc) {
    const query = '?from=' + encodeURIComponent(toUtcRangeParam(fromUtc)) +
      '&to=' + encodeURIComponent(toUtcRangeParam(toUtc));
    return this._request('GET', '/workforce/stores/' + storeId + '/attendance' + query);
  }
}

export default WorkforceRosterService;
