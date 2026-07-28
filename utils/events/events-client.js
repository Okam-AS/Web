// The Events admin API client — route-for-route with the four `/events` controllers.
//
// It adds nothing the backend does not have. Every method below maps to an action that exists in
// `Controllers/EventsController.cs`, `EventsDepositsController.cs`, `EventsRunSheetController.cs` or
// `EventsSettlementController.cs`; the comment beside each is the route those files declare. A method
// with no controller action is a method that does not belong here — the two facts this surface most
// has to be honest about are both *absences*, and they are recorded at the bottom of this file rather
// than papered over with a client-side reconstruction.
//
// The HTTP layer is `WorkforceClientBase` (`~/utils/workforce/api-client`), reused rather than copied:
// it is deliberately route-agnostic (its own header says so) and owns the one thing worth having once
// — base URL, bearer token, problem+json parsing. What it does NOT own is the error type, because a
// Workforce error names Workforce extensions.
//
// NO `Idempotency-Key`. Workforce, Meals and Training all require one and refuse a mutation without
// it; Events has no such filter and no `*_IDEMPOTENCY_*` code in `Helpers/Events/EventsErrorCodes.cs`.
// Sending the header anyway would advertise a contract the module does not have, so these mutations go
// through `_request` and not through `_mutate`.

import { WorkforceClientBase, isWorkforceApiError } from '~/utils/workforce/api-client';

/**
 * A typed Events failure — the `EVENTS_*` family of RFC 9457 problem+json bodies.
 *
 * Rendering keys on `code` (from `EventsErrorCodes`), never on `detail`, which is server prose.
 *
 * `currentStatus` and `permittedActions` are the two extensions `EventsProblemException.State` carries,
 * and they are the reason a caller never has to guess: a refused lifecycle action answers with the
 * status the server actually holds and the transition ids that ARE legal from it. They are surfaced as
 * named fields so a caller cannot accidentally read them off a stale local copy of the state machine.
 * A field the response did not carry is null rather than absent.
 */
export class EventsApiError extends Error {
  constructor (status, body) {
    const problem = body || {};
    super(problem.detail || problem.title || ('HTTP ' + status));
    this.name = 'EventsApiError';
    // `instanceof` does not survive an ES5 transpile of a subclassed Error, so callers discriminate on
    // this flag — the same reason, and the same shape, as `isWorkforceApiError`.
    this.isEventsApiError = true;
    this.status = status;
    this.code = problem.code || null;
    this.conflictKind = problem.conflictKind || null;
    this.currentStatus = problem.currentStatus || null;
    this.permittedActions = Array.isArray(problem.permittedActions) ? problem.permittedActions : null;
    this.retryable = problem.retryable === true;
    this.problem = problem;
  }
}

/** True for a typed Events failure, transpile-proof (see the flag's comment). */
export function isEventsApiError (error) {
  return !!(error && error.isEventsApiError);
}

/** The `EVENTS_*` codes this surface renders differently from one another. */
export const EVENTS_DISABLED = 'EVENTS_DISABLED';
export const EVENTS_NOT_FOUND = 'EVENTS_NOT_FOUND';
export const EVENTS_RUNSHEET_NOT_FOUND = 'EVENTS_RUNSHEET_NOT_FOUND';
export const EVENTS_STATE = 'EVENTS_STATE';
export const EVENTS_PAYMENT_PROVIDER = 'EVENTS_PAYMENT_PROVIDER';
export const EVENTS_SETTLEMENT_NOT_RECONCILED = 'EVENTS_SETTLEMENT_NOT_RECONCILED';
export const EVENTS_CONFLICT = 'EVENTS_CONFLICT';

export class EventsService extends WorkforceClientBase {
  // Every `/events` failure arrives as problem+json with an `EVENTS_*` code; re-typing it here is the
  // ONE place the Workforce error becomes an Events error, so no call site has to remember to do it.
  async _events (method, path, options) {
    try {
      return await this._request(method, path, options);
    } catch (e) {
      if (isWorkforceApiError(e)) { throw new EventsApiError(e.status, e.problem); }
      throw e;
    }
  }

  _admin (storeId) {
    return '/events/admin/' + storeId;
  }

  _event (storeId, eventId) {
    return this._admin(storeId) + '/events/' + eventId;
  }

  // ---- pipeline ---------------------------------------------------------------------------------

  /**
   * GET /events/admin/{storeId}/events?status&from&to — the pipeline list.
   *
   * `status` is a single `EventStatus` NAME (the server `Enum.TryParse`s it and answers
   * `EVENTS_VALIDATION` for anything else) — not a list, not a comma-joined string. `from`/`to` are
   * compared against `EventDate`, which is a DATE column, so they are sent as `YYYY-MM-DD` and never
   * as an instant: an offset on this parameter would move the window by a day at the boundary.
   *
   * The server orders by `EventDate` then `Id` and that order is preserved rather than re-sorted here.
   */
  ListEvents (storeId, status, from, to) {
    const params = [];
    if (status) { params.push('status=' + encodeURIComponent(status)); }
    if (from) { params.push('from=' + encodeURIComponent(from)); }
    if (to) { params.push('to=' + encodeURIComponent(to)); }
    const query = params.length ? '?' + params.join('&') : '';
    return this._events('GET', this._admin(storeId) + '/events' + query);
  }

  /** POST /events/admin/{storeId}/events — staff-created event (T1, `Source = Manual`). */
  CreateEvent (storeId, request) {
    return this._events('POST', this._admin(storeId) + '/events', { body: request });
  }

  /**
   * GET /events/admin/{storeId}/events/{eventId} — the admin detail.
   *
   * Returns the event, its proposal versions (with lines) and its append-only transitions. It carries
   * NO deposit and NO settlement: see the absences recorded at the bottom of this file.
   */
  GetEvent (storeId, eventId) {
    return this._events('GET', this._event(storeId, eventId));
  }

  // ---- proposal ---------------------------------------------------------------------------------

  /** POST .../proposal-versions — a Draft version (T2 from Inquiry, T4 revive, T16 from Accepted). */
  CreateProposalVersion (storeId, eventId, request) {
    return this._events('POST', this._event(storeId, eventId) + '/proposal-versions', { body: request });
  }

  /** POST .../proposal-versions/{versionNo}/send — T3, stamps `SentAtUtc` and settles the content hash. */
  SendProposalVersion (storeId, eventId, versionNo) {
    return this._events('POST', this._event(storeId, eventId) + '/proposal-versions/' + versionNo + '/send');
  }

  /** POST .../mark-lost — T6 with a mandatory `reasonCode` (`Declined` / `Expired` / `Other`). */
  MarkLost (storeId, eventId, request) {
    return this._events('POST', this._event(storeId, eventId) + '/mark-lost', { body: request });
  }

  // ---- deposit ----------------------------------------------------------------------------------

  /**
   * POST .../deposits — issue a deposit request (T7).
   *
   * The body carries ONLY `paymentType`. The amount is not client-supplied: the server takes it from
   * the accepted proposal version's `DepositRequiredMinor`, so there is no figure to send and none to
   * compute. Which `paymentType` values actually work on this branch is `DEPOSIT_RAILS_WIRED` in
   * `~/utils/events/journey`.
   */
  IssueDeposit (storeId, eventId, request) {
    return this._events('POST', this._event(storeId, eventId) + '/deposits', { body: request });
  }

  /** POST .../deposits/{depositId}/cancel — T10, an UNPAID request only (Requested/Pending). */
  CancelDeposit (storeId, eventId, depositId) {
    return this._events('POST', this._event(storeId, eventId) + '/deposits/' + depositId + '/cancel');
  }

  // ---- run sheet --------------------------------------------------------------------------------

  /** GET .../run-sheet?version — the latest sheet, or one version. `EVENTS_RUNSHEET_NOT_FOUND` if none. */
  GetRunSheet (storeId, eventId, versionNo) {
    const query = versionNo ? '?version=' + encodeURIComponent(versionNo) : '';
    return this._events('GET', this._event(storeId, eventId) + '/run-sheet' + query);
  }

  /** PUT .../run-sheet — generate/reissue from the operative accepted version (requires ≥ Accepted). */
  GenerateRunSheet (storeId, eventId) {
    return this._events('PUT', this._event(storeId, eventId) + '/run-sheet');
  }

  // ---- lifecycle tail ---------------------------------------------------------------------------

  /** POST .../start-service — T11. Idempotent once the event is already `InService`. */
  StartService (storeId, eventId) {
    return this._events('POST', this._event(storeId, eventId) + '/start-service');
  }

  /**
   * POST .../close — T12: `InService` → `Settling`, and the settlement draft is generated.
   *
   * This and the two below sit behind the store-scoped `Events.Settlement` flag as well as
   * `Events.Core`. See the second absence at the bottom of this file for what that means today.
   */
  CloseEvent (storeId, eventId) {
    return this._events('POST', this._event(storeId, eventId) + '/close');
  }

  /**
   * POST .../settlement/reconcile — fetch each line's truth through the read seams and set its match
   * state. `ifMatch` is the settlement's opaque `revision`; the server rejects a stale one with
   * `EVENTS_CONFLICT`. Null under SQLite, where the guard is deliberately lenient — so it is omitted
   * rather than sent empty.
   */
  ReconcileSettlement (storeId, eventId, ifMatch) {
    return this._events(
      'POST', this._event(storeId, eventId) + '/settlement/reconcile', { headers: ifMatchHeader(ifMatch) });
  }

  /** POST .../settlement/close — T13: a `Reconciled` settlement → `Closed`, and the event → `Settled`. */
  CloseSettlement (storeId, eventId, ifMatch) {
    return this._events(
      'POST', this._event(storeId, eventId) + '/settlement/close', { headers: ifMatchHeader(ifMatch) });
  }
}

// `If-Match` is sent only when there is a revision to send. An empty header is not a weaker
// precondition than a correct one — `EventsSettlementConcurrency.GuardIfMatch` treats a blank token as
// "no token", so sending `If-Match: ""` against a SQL Server row would raise `EVENTS_CONFLICT` on the
// first try and look like someone else had edited the settlement.
function ifMatchHeader (ifMatch) {
  return ifMatch ? { 'If-Match': ifMatch } : undefined;
}

// ---- the two absences -------------------------------------------------------------------------
//
// These are recorded here, next to the routes, because both are the kind of gap a client "fixes" by
// accident — by keeping a stale copy of the last mutation's answer and calling it a read.
//
// 1. THERE IS NO ADMIN READ FOR A DEPOSIT. `EventsDepositView` is returned only by the three deposit
//    MUTATIONS (issue / cancel / refund) and by the guest's tokenised page, which needs the token.
//    `EventsEventDetailView` carries no deposit field at all (`EventsViewMapper.ToDetail`). So a
//    deposit's status, its id, its `publicToken` and its receipt trail exist on screen only for as long
//    as the tab that issued it lives. After a reload they are not "none" and not "zero" — they are
//    unreadable, and the surface says exactly that.
//
// 2. THERE IS NO ADMIN READ FOR A SETTLEMENT. Same shape: `EventsSettlementView` comes back only on a
//    lifecycle result (start-service / close / reconcile / close-settlement / cancel). There is no GET.
//    No mutation may be fired to fake one: `StartServiceAsync` is the only idempotent-ish call and it
//    still transitions a `Confirmed` event, so calling it to "read" would move the lifecycle.
//
// Neither is reconstructible from the detail read, so neither is reconstructed.

export default EventsService;
