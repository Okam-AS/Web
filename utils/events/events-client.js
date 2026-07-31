// The Events admin API client — route-for-route with the five `/events` controllers.
//
// It adds nothing the backend does not have. Every method below maps to an action that exists in
// `Controllers/EventsController.cs`, `EventsDepositsController.cs`, `EventsNotificationsController.cs`,
// `EventsRunSheetController.cs` or `EventsSettlementController.cs`; the comment beside each is the route
// those files declare. A method with no controller action is a method that does not belong here.
//
// EVERY FACET OF AN EVENT IS READABLE. The deposit and the settlement each have an idempotent admin GET
// (`86cb4d25`), so nothing on this surface has to be reconstructed from the answer to the last mutation
// — which is what a client does when it is told a read does not exist, and it is why that claim, once
// it stops being true, is more dangerous than no claim at all.
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
export const EVENTS_NOTIFICATION_ALREADY_SENT = 'EVENTS_NOTIFICATION_ALREADY_SENT';

/**
 * 400 — a settlement mutation arrived with no `If-Match` while the server row HAS a revision.
 *
 * It is separated from `EVENTS_CONFLICT` at the source (`EventsSettlementConcurrency.GuardIfMatch`)
 * and the separation is the whole point: `EVENTS_CONFLICT` carries `retryable: true` and means
 * "re-read and retry", advice a caller that is not sending the header at all can never act on — the
 * retry fails identically, forever. This code means "fetch the revision first", and the recovery is a
 * DIFFERENT request: `GetSettlement`.
 */
export const EVENTS_REVISION_REQUIRED = 'EVENTS_REVISION_REQUIRED';

/**
 * 409 — a genuine lost race: the `If-Match` sent was well-formed and no longer current. Retryable,
 * and now ONLY this. A malformed token is `EVENTS_VALIDATION`, an absent one is the code above.
 */
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
   * NO deposit and NO settlement — `EventsViewMapper.ToDetail` projects neither — so those two are
   * their own reads (`ListDeposits`, `GetSettlement`) and are never inferred from this one.
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
   * GET .../deposits — the idempotent admin deposit read.
   *
   * Answers a LIST, not "the current deposit", and the list is the reason this is not a single view:
   * an event accumulates deposits across a cancel-and-reissue, and the server returns the whole
   * history rather than guessing which one is meant. Which one an action applies to is decided from
   * the STATUS on each row, never from its position.
   *
   * An event with no deposits answers `[]` — an answered absence, which is a different fact from a
   * read that failed. Gated on the same `Events.Core` flag as the deposit mutations beside it, so the
   * read and the writes of one resource never answer to different switches.
   */
  ListDeposits (storeId, eventId) {
    return this._events('GET', this._event(storeId, eventId) + '/deposits');
  }

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

  /**
   * POST .../deposits/{depositId}/refund — money back to the guest (part of T14/T15, or resolving a
   * `Quarantined` late payment).
   *
   * The body is `{ amountMinor }` and the amount is the CALLER's: unlike the deposit's own amount,
   * which the server takes from the accepted proposal, a refund can be partial. It must be a positive
   * integer in minor units, and the server refuses `RefundedMinor + amountMinor > AmountMinor` with
   * `EVENTS_REFUND_EXCEEDS_PAID`. Nothing is clamped here — a clamp would silently refund a different
   * figure from the one the operator typed.
   */
  RefundDeposit (storeId, eventId, depositId, request) {
    return this._events(
      'POST', this._event(storeId, eventId) + '/deposits/' + depositId + '/refund', { body: request });
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
   * POST .../cancel — T14/T15. The body is `{ reason, resolution }`.
   *
   * `resolution` (`Refund` / `Forfeit`) is what the server does with a PAID deposit, and it is
   * mandatory in exactly that case: cancelling with money held and no instruction is refused with
   * `EVENTS_DEPOSIT_UNRESOLVED` rather than the money being quietly kept or quietly returned. There
   * is no client-side default, because either default would be someone else's decision about a
   * guest's money.
   */
  CancelEvent (storeId, eventId, request) {
    return this._events('POST', this._event(storeId, eventId) + '/cancel', { body: request });
  }

  /**
   * POST .../close — T12: `InService` → `Settling`, and the settlement draft is generated.
   *
   * This and the three below sit behind the store-scoped `Events.Settlement` flag as well as
   * `Events.Core`. The flag has a real lever as of `86cb4d25` (the same per-store feature-flag table
   * `Events.Core` uses, `defaultEnabled: false`), so a 404 `EVENTS_DISABLED` from any of them means
   * the venue has not been switched on — not that the module cannot be switched on.
   */
  CloseEvent (storeId, eventId) {
    return this._events('POST', this._event(storeId, eventId) + '/close');
  }

  /**
   * GET .../settlement — the idempotent settlement read, and THE PLACE THE `If-Match` TOKEN COMES
   * FROM.
   *
   * Read `settlement.revision` off the body; the `ETag` response header mirrors it, and the body is
   * used because a header is not reachable through this transport (`_request` returns the parsed
   * payload). This read sends no precondition of its own — it is the call a client with no token has
   * to be able to make.
   *
   * Three distinguishable answers, and they must not be collapsed:
   *   • 200 with `settlement` — there is one;
   *   • 200 with `settlement: null` — the event genuinely has none yet (it has not been closed);
   *   • 404 `EVENTS_DISABLED` — the settlement machine is off for this store, which says nothing at
   *     all about whether a settlement exists.
   *
   * `revision` IS NULL ON A SQLITE HOST. It is a SQL Server `rowversion`, the column does not exist
   * under SQLite, and `EventsSettlementConcurrency.GuardIfMatch` is deliberately lenient there — it
   * demands a token only when the server row carries one. So a null revision is an ordinary value to
   * be passed straight back through `ifMatchHeader`, which omits the header entirely. A client that
   * REFUSED to mutate without one would work in production and look broken on every local host.
   */
  GetSettlement (storeId, eventId) {
    return this._events('GET', this._event(storeId, eventId) + '/settlement');
  }

  /**
   * POST .../settlement/lines — add one `Invoice` or `Adjustment` line to the statement.
   *
   * The only way to put a hand-entered figure on a settlement: `DepositApplied` and `PosCheck` lines
   * are generated by close and by pos-links, and asking for either here is refused with
   * `EVENTS_SETTLEMENT_STATE`. An `Adjustment` requires a non-empty `adjustmentReason`.
   *
   * `sourceKind` is DERIVED by the server from `kind` (`InvoiceRef` for an Invoice, `Manual` for an
   * Adjustment) and any value sent for it is discarded, so it is not sent: a field on the wire that
   * the server overwrites reads as a choice the caller made and did not.
   *
   * Carries the `If-Match` precondition — see `GetSettlement` for where the token comes from and why
   * a null one is sent as no header rather than as an empty one.
   */
  AddSettlementLine (storeId, eventId, request, ifMatch) {
    return this._events(
      'POST',
      this._event(storeId, eventId) + '/settlement/lines',
      { body: request, headers: ifMatchHeader(ifMatch) });
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

  // ---- guest notifications ----------------------------------------------------------------------

  /**
   * GET /events/admin/{storeId}/notifications/health — the store-wide "a guest was never told" read.
   *
   * Store-scoped, not event-scoped: a dead-lettered link is discovered by watching the store, not by
   * opening the one event that happens to own it.
   *
   * The answer is an ENVELOPE and not a bare list, and the envelope is load-bearing: an empty
   * `deadLettered` means "everyone was reached" when `dispatchEnabled` is true and "nothing has been
   * delivered at all" when it is false. `queuedCount` is what makes the second legible. It carries no
   * token and no recipient address by design — the remedy is `RequeueNotification`, not handing a
   * bearer link around.
   */
  GetNotificationHealth (storeId) {
    return this._events('GET', this._admin(storeId) + '/notifications/health');
  }

  /**
   * POST /events/admin/{storeId}/notifications/{notificationOutboxId}/requeue — put an undelivered
   * link back in the drain's way. The id is the outbox row's GUID off the health read.
   *
   * The result's `requeued` is false on an idempotent replay (the row was already queued), which is a
   * success and not a failure — a double-clicked button must be able to say "already in flight". A
   * row the guest DID receive is refused with `EVENTS_NOTIFICATION_ALREADY_SENT` rather than replayed,
   * because delivery is not idempotent and the payload is a live credential.
   */
  RequeueNotification (storeId, notificationOutboxId) {
    return this._events(
      'POST', this._admin(storeId) + '/notifications/' + notificationOutboxId + '/requeue');
  }
}

// `If-Match` is sent only when there is a revision to send. An empty header is not a weaker
// precondition than a correct one — `EventsSettlementConcurrency.GuardIfMatch` treats a blank token as
// "no token", so sending `If-Match: ""` against a SQL Server row now raises 400
// `EVENTS_REVISION_REQUIRED`, and before that split it raised a 409 advising a retry that could never
// succeed. Omitting the header is also what makes a SQLite host work: there the row carries no
// rowversion, the guard demands nothing, and there is nothing to send.
function ifMatchHeader (ifMatch) {
  return ifMatch ? { 'If-Match': ifMatch } : undefined;
}

// ---- what this client still cannot do ----------------------------------------------------------
//
// TWO STEPS OF THE JOURNEY ARE THE GUEST'S, and no admin route exists for either: accepting a
// proposal (T5) and paying a deposit (T8/T9) happen on the anonymous tokenised pages. They are absent
// here because they are absent from the admin API — not because a read is missing.
//
// Those anonymous routes now have a client of their own, `~/utils/events/events-guest-client`, and
// pages behind it (`pages/events/proposal/_token.vue`, `pages/events/deposit/_token.vue`,
// `pages/events/inquiry/_store.vue`). It is a SEPARATE client and not an addition here: it must send
// no bearer token, and a class that carries one for its admin methods would carry it for the guest
// ones too.

export default EventsService;
