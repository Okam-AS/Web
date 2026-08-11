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
//   GET   /workforce/stores/{storeId}/legal-employers                  L1   (:60)
//   POST  /workforce/stores/{storeId}/legal-employers                  L2   (:74)
//   GET   /workforce/stores/{storeId}/context                          #1   (:52)
//   GET   /workforce/stores/{storeId}/staff                            #2   (:67)
//   POST  /workforce/stores/{storeId}/staff                            #3   (:82)
//   GET   /workforce/stores/{storeId}/staff/{id}                       #4   (:107)
//   PATCH /workforce/stores/{storeId}/staff/{id}                       #5   (:122)
//   POST  /workforce/stores/{storeId}/staff/{id}/invitations           #6   (:156)
//   GET   /workforce/stores/{storeId}/invitations                      #6b  (:181)
//   POST  /workforce/stores/{storeId}/invitations/{id}/revoke          #6c  (:201)
//   GET   /workforce/stores/{storeId}/roles                            #8   (:203)
//   PUT   /workforce/stores/{storeId}/roles                            #9   (:218)
//   GET   /workforce/stores/{storeId}/staff/{id}/roles                 #10  (:243)
//   PUT   /workforce/stores/{storeId}/staff/{id}/roles                 #11  (:258)
//   GET   /workforce/stores/{storeId}/staff/{id}/employment-terms      #12  (:283)
//   PUT   /workforce/stores/{storeId}/staff/{id}/employment-terms      #13  (:298)
//   GET   /workforce/stores/{storeId}/attendance?from&to               #25  (WorkforceAttendanceController:55)
//
// `PUT /roles` (#9) IS BOUND HERE NOW, AND THE SCREEN IT WAS WAITING FOR IS `/admin/workforce-roles`.
// This paragraph used to say the route was deliberately unbound because "creating and retiring the
// store's job-role catalogue is a screen of its own" — a correct decision that was never finished,
// and the cost of leaving it there was not theoretical. A store whose catalogue nobody had seeded
// out of band had an EMPTY ROLE AXIS everywhere it mattered: `workforce-schedule.vue`'s shift editor
// offered a role select with no options, `workforce-rates.vue` could not open a role rate at all,
// and `WorkforceEngagementPanel.vue` said "no roles defined" while offering no way to define one.
// Planning a week was therefore impossible on any store that had never been curled.
//
// The reasoning the old note gave still holds and is why the write lives on its OWN page rather than
// being smuggled into the roster: a roster that silently created a role because a manager typed a
// name would make the role list unownable. The roster page still only ASSIGNS roles that exist.
//
// ROUTES THAT EXIST AND ARE DELIBERATELY NOT BOUND HERE, each a recorded decision rather than an
// oversight:
//   • `POST /staff/pos-operator-import` (#7) — the manager-reviewed bulk link of existing POS
//     operators to engagements. A per-item outcome report, not a roster action.
//
// THERE IS NO DELETE. `WorkforceStaffController` binds none, for any resource. Ending employment is
// `PATCH { isActive: false }` and nothing else, which is why this client has no destructive verb to
// offer.
//
// THE INVITATION SURFACE IS THREE ROUTES WIDE. It was one — issue (#6) and nothing else — and both
// this file and the panel above it carried a sentence saying so. `WorkforceStaffController` now also
// binds a store-scoped read (#6b) and a revoke verb (#6c), so the two gaps those sentences named are
// closed and the sentences are gone with them. A caller can ask what is outstanding and withdraw one.
//
// TWO PROPERTIES OF THE READ THAT A CALLER MUST NOT FLATTEN:
//
//   • `state` IS NOT LIVENESS. `WorkforceInvitationState.Expired` is written by no code path in the
//     module: expiry is decided at READ TIME by comparing `expiresAtUtc`, so an invitation that
//     lapsed a month ago still sits at `Pending` in its row. A client that rendered `state` would
//     tell a manager a dead code is still outstanding — the exact question this surface exists to
//     answer, answered backwards while looking right. Use `isLive`, which the server computes with
//     the same comparison the CLAIM path makes, so the two can never disagree.
//   • THE RESPONSE CARRIES NO TOKEN AND NO TOKEN HASH, at any level (spec §13.4). The raw token left
//     the building on the issue response and is unrecoverable; the hash is the stored secret. A
//     manager needs to know THAT a code is outstanding and to WHOM it went, never what it is.
//
// The read is STORE-scoped rather than engagement-scoped because "which codes are still out there"
// is a store-wide question. A caller wanting one engagement's codes filters by `staffMemberId`, which
// every element carries.
//
// A REISSUE IS STILL A REAL LEVER and still supersedes the single pending row in place. It is no
// longer the ONLY one: revoking withdraws without minting a replacement, which is what a manager
// wants when the code went to the wrong person and no new code should exist.

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
   * L1: the legal employers available at this store — the NAMES `CreateStaff` needs an id from.
   *
   * This replaced mining employer ids out of the staff list, which is what this file and the add
   * form both used to do because no route returned an employer at all. That workaround could only
   * ever surface employers somebody was already employed under, so an employer registered five
   * minutes ago was invisible until the first hire — and a manager who reloaded the page would
   * register a second row for the same company.
   *
   * THE LIST IS A UNION AND THE ELEMENTS SAY WHICH HALF THEY CAME FROM. An employer is org-level and
   * carries no owning store, so the server answers with the employers this store REGISTERED plus the
   * employers its own engagements REFERENCE. `inUseHere` is the second half: false means the row
   * exists and nobody here is employed under it yet, which is a real and normal state right after
   * registering one — not an error and not an empty list.
   *
   * Requires `WorkforceScheduler`, the same read gate as the roster this feeds.
   */
  ListLegalEmployers (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/legal-employers');
  }

  /**
   * L2: register the legal entity this store's staff are employed by.
   *
   * The roster's FIRST step: `CreateStaff` requires a `legalEmployerId` and nothing else on this
   * surface mints one.
   *
   * `request` is `{ organizationNumber, name, effectiveFromUtc? }`. The organization number is
   * stripped of whitespace server-side, so "912 345 678" and "912345678" are one company.
   *
   * THE REFUSAL THAT IS NOT AN ERROR: `workforce.legal-employer-exists` (409) means THIS STORE has
   * already registered that organization number, and the problem document carries the existing id in
   * `aggregateId` — so the correct response is to use that employer, not to retry. Two rows for one
   * company would let a person hold two active engagements with the same employer, which is the very
   * thing the one-active-engagement index exists to prevent.
   *
   * The check is this store's registrations only. A company some OTHER store registered is never
   * reported, because a global answer would make this endpoint an oracle for which companies are on
   * the platform.
   *
   * Requires `WorkforceManager` and the `workforce.setup` stage flag. The `Idempotency-Key` is
   * supplied by `_mutate`, and a retry under a FRESH key of a call that already succeeded is the
   * 409 above rather than a duplicate.
   */
  CreateLegalEmployer (storeId, request) {
    return this._mutate('POST', '/workforce/stores/' + storeId + '/legal-employers', request);
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
   * #6: issue — or REISSUE — the engagement's one-use claim invitation.
   *
   * The response carries the RAW token EXACTLY ONCE and the server keeps only its SHA-256 hash, so a
   * caller that loses this response has lost the token for good: there is no read that returns it and
   * no route that resends it. `token` is null on an idempotent REPLAY (the stored outcome is
   * deliberately token-less), which is a different thing from a failed issue and callers must not
   * treat a null token as an error — the invitation exists, this caller simply cannot see it again.
   *
   * A REISSUE SUPERSEDES IN PLACE. A filtered unique index permits one Pending invitation per
   * engagement, so the service overwrites that row's hash and expiry rather than adding a second one:
   * the previous raw token stops working the instant this call returns. For a code relayed to the
   * wrong person that is one of two remedies — see `RevokeInvitation`, which withdraws without
   * minting a replacement.
   *
   * `request` is optional and every field on it is: `{ expiresInHours }` overrides the server's
   * 14-day default and is clamped server-side to 60 days. An absent body is a valid issue.
   *
   * No `If-Match`. The invitation is a child resource with its own single-pending guard, not an
   * optimistic-concurrency aggregate, and the controller reads no precondition header — sending one
   * would be inventing a contract. The `Idempotency-Key` `_mutate` adds IS required: without it the
   * surface answers 400. A 409 `workforce.invitation-issue-conflict` means a concurrent request took
   * the single pending slot and the retry must carry a FRESH key, because the original one is already
   * reserved and would replay as in-progress for ever.
   */
  IssueInvitation (storeId, staffMemberId, request) {
    return this._mutate('POST', this._staffPath(storeId, staffMemberId) + '/invitations', request || {});
  }

  /**
   * #6b: the store's OUTSTANDING invitations — what is still redeemable, and to whom.
   *
   * PENDING ROWS ONLY. Claimed and Revoked rows are spent, and listing them would turn "what is
   * outstanding" into a directory of who has and has not signed in yet.
   *
   * EACH ELEMENT CARRIES BOTH `state` AND `isLive`, AND THEY ARE DIFFERENT CLAIMS. `state` is what
   * the row says and is always `Pending` here; `isLive` is whether the code can still be redeemed
   * RIGHT NOW. They diverge because `Expired` is written by no code path — expiry is a read-time
   * comparison of `expiresAtUtc` — so a code that lapsed a month ago is a `Pending` row with
   * `isLive: false`. Render `isLive`. Rendering `state` would report a dead code as outstanding.
   *
   * NO TOKEN, NO HASH, ever (spec §13.4). This read cannot recover a code and is not meant to: the
   * raw token was answerable exactly once, on the issue response.
   *
   * A read, so no `Idempotency-Key` and no `If-Match`. Requires `WorkforceManager` like every other
   * write on this surface — a caller who cannot issue cannot enumerate either.
   */
  ListInvitations (storeId) {
    return this._request('GET', '/workforce/stores/' + storeId + '/invitations');
  }

  /**
   * #6c: withdraw an outstanding invitation. Returns the invitation's summary in its new state.
   *
   * POST `/revoke` rather than DELETE: the row is NOT removed. It transitions `Pending -> Revoked`
   * and stays as the record of what was withdrawn and by whom, which is why this client — which has
   * no destructive verb anywhere — can offer it at all.
   *
   * THE REFUSAL THAT MATTERS: revoking an ALREADY-CLAIMED invitation is `409
   * workforce.invitation-not-revocable`, never a quiet success. The manager's reason for withdrawing
   * is almost always that the code went to the wrong person; if that person has already redeemed it,
   * a 200 would tell the manager they are safe at the exact moment they are not. Withdrawal cannot
   * undo a link — ending the engagement (`UpdateStaff` with `isActive: false`) is what removes
   * access — and callers must surface the refusal rather than swallowing it.
   *
   * `workforce.invitation-revoke-conflict` (409) is the other one: a concurrent claim or reissue
   * moved the row between the list the manager read and this press. Nothing persisted; the correct
   * response is to re-read the list, not to retry blindly. Both retryable invitation conflicts want a
   * FRESH `Idempotency-Key`, which `_mutate` mints per call, so a re-press is already a fresh key.
   *
   * Revoking an ALREADY-REVOKED invitation under a fresh key answers 200 with the same summary — a
   * manager who clicks twice is not told their withdrawal failed.
   *
   * REVOKING TELLS THE HOLDER NOTHING. The claim path admits `Pending` and nothing else, so from the
   * moment this returns the withdrawn token meets the same opaque 404 as a fabricated one. That is a
   * structural property of the claim path — it has no revoked branch — and it is why no caller should
   * ever make the refusal on the worker's side more informative.
   */
  RevokeInvitation (storeId, invitationId) {
    return this._mutate('POST', '/workforce/stores/' + storeId + '/invitations/' + invitationId + '/revoke', {});
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

  /**
   * #9: author the store's job-role catalogue — the write `ListRoles` above reads back.
   *
   * A MERGE, NOT A REPLACE, and the difference is the whole safety of this method.
   * `WorkforceStaffService.UpsertRolesAsync` loads the store's existing roles TRACKED and walks only
   * the items it was sent: an item WITH a `roleId` edits that role in place, an item WITHOUT one
   * becomes a new role, and — the part a caller must not get wrong the other way round —
   * "roles not present in the request are left untouched". So sending one item adds or edits exactly
   * one role, and a caller must NEVER send the full catalogue in order to append to it. That is the
   * opposite of `AssignStaffRoles` (#11) directly below, which is a full replace, and the two verbs
   * being both `PUT` is precisely why this paragraph is here.
   *
   * THERE IS NO DELETE, on this route or any other in the family. A role leaves the working
   * catalogue by being given an `effectiveToUtc` — it keeps existing, keeps its id, and keeps
   * appearing in `ListRoles`, because a week already planned against it must still be able to name
   * it. Retiring is therefore an upsert like any other, not a second verb.
   *
   * Requires `WorkforceManager` (the read needs only `WorkforceScheduler`) and the `workforce.setup`
   * stage flag, which is the one flag in the family that is ON by default. The `Idempotency-Key`
   * every Workforce mutation needs is supplied by `_mutate`.
   *
   * @param roles array of `{ roleId?, name, station, color, sortOrder, effectiveFromUtc?, effectiveToUtc? }`
   * @returns the FULL role list after the write, ordered by sortOrder then name — not just the items sent.
   */
  UpsertRoles (storeId, roles) {
    return this._mutate('PUT', '/workforce/stores/' + storeId + '/roles', { roles });
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
