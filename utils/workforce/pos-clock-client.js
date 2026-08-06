// The register's own clock surface — `WorkforcePosController` (spec §5.3, endpoints 45 & 46).
//
//   POST /workforce/pos/clock-events     (endpoint 45)  the punch
//   GET  /workforce/pos/personnel-list   (endpoint 46)  the on-venue register
//
// Route-for-route with the controller, adding nothing.
//
// ---- WHY THIS IS A SECOND CLIENT AND NOT A METHOD ON THE MANAGER ONE --------------------------
//
// `utils/workforce/personnel-list-client.js` binds endpoint 30 and explains, correctly, why it does
// NOT bind endpoint 46: that route authenticates a DEVICE JWT plus an `X-Operator-Session` header
// rather than a manager's bearer token, so on a manager's page it could only ever answer 403. This
// file is the other side of that same sentence — it is only ever constructed from inside the POS
// shell, which is the one place in the app that holds an operator session.
//
// ---- WHAT IDENTIFIES THE PERSON (HARD LAW 1, §5.3/§7.2) --------------------------------------
//
// Nothing in the body does. The device JWT and `X-Operator-Session` identify the DEVICE and the
// OPERATOR; the backend then resolves the operator's EXPLICITLY LINKED staff member through the
// manager-reviewed `WorkforceStaffMember.OperatorId` link (seam S-B). The operator login itself never
// clocks, and an unlinked operator is a 403 `workforce.pos-operator-not-linked`. A client cannot
// claim a staff identity, a store, or a device — which is why this request body is as thin as it is.
//
// There is deliberately NO `storeId` on either route: the store is device-authoritative, taken from
// the operator session. Passing one would be inventing a parameter the surface does not have.

import { WorkforceClientBase } from '~/utils/workforce/api-client';

/**
 * The register's LOCAL wall-clock time as `YYYY-MM-DDTHH:mm:ss`, with NO `Z` and no offset.
 *
 * This is the one place in the workforce clients that deliberately sends a LOCAL time rather than a
 * UTC instant, and it is not a slip: `PosClockEventRequest.LocalEventTime` is documented as "the
 * LOCAL wall-clock time the register recorded the punch at", and the ingest resolves it to `EventUtc`
 * through the STORE's validated zone (§3.8.13) before stamping its own authoritative
 * `ServerReceivedUtc`. The device clock is never trusted for the instant — only for the wall time it
 * displayed to the person who pressed the button.
 *
 * So the components are read LOCALLY (`getHours`, not `getUTCHours`). `toISOString()` would convert
 * to UTC and hand the server a wall time nobody saw — one that the store zone would then shift a
 * second time. The assumption this rests on is the physical one the surface is built for: the till
 * stands at the venue, so its wall clock is the venue's wall clock.
 *
 * A DST-ambiguous wall time (the repeated hour on a fall-back day) is answered 409
 * `workforce.dst-ambiguous-offset-required`; `eventOffsetMinutes` is the disambiguator and is null
 * for every unambiguous punch, which is all of them outside that one hour a year.
 */
export function toLocalEventTime (date) {
  const pad = n => (n < 10 ? '0' + n : String(n));
  return date.getFullYear() +
    '-' + pad(date.getMonth() + 1) +
    '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) +
    ':' + pad(date.getMinutes()) +
    ':' + pad(date.getSeconds());
}

export class WorkforcePosClockService extends WorkforceClientBase {
  /**
   * `operatorSessionId` is stamped by the caller before each call, exactly as the POS shell already
   * does for every session-scoped Core service (`posSvc()`, `checkSvc()`, …). Same convention, so
   * this client is not a second mechanism to learn.
   */
  constructor (initializer) {
    super(initializer);
    this.operatorSessionId = '';
  }

  _sessionHeaders () {
    return this.operatorSessionId ? { 'X-Operator-Session': this.operatorSessionId } : {};
  }

  /**
   * Record one punch.
   *
   * `clientEventId` is the register-minted stable id of this PHYSICAL punch and is the natural dedupe
   * key — `(Source, ClientEventId)` carries a unique index (§3.8.10). A retry of the same punch must
   * re-send the SAME id verbatim, which is why this is a parameter rather than minted here: a client
   * that minted its own id per attempt would turn every retry into a second punch on an append-only
   * table, and there is no delete to undo it with (C1).
   *
   * The `Idempotency-Key` header is added by `_mutate` and is a separate wire-uniformity guard
   * (HARD LAW 2, 400 when absent); the clock's real dedupe is the natural key above.
   */
  ClockEvent (eventType, clientEventId, options) {
    const opts = options || {};
    const at = opts.at || new Date();
    return this._mutate('POST', '/workforce/pos/clock-events', {
      eventType,
      clientEventId,
      localEventTime: toLocalEventTime(at),
      eventOffsetMinutes: opts.eventOffsetMinutes === undefined ? null : opts.eventOffsetMinutes,
      isPaidBreak: opts.isPaidBreak === true,
      // The OD-2 verification assertion is OPAQUE on the wire and its mechanism (operator-PIN
      // re-entry vs per-worker QR) is a PENDING Sven decision (OD-2, due 2026-10-01). The register
      // forwards whatever the seam gave it and interprets nothing; a failed assertion is a 403
      // `workforce.pos-verification-failed`.
      verification: opts.verification === undefined ? null : opts.verification
    }, this._sessionHeaders());
  }

  /**
   * The on-venue personalliste for the register's own business day (endpoint 46).
   *
   * Takes no `businessDate` and no `storeId`: both are the device's. The READ survives both the
   * `workforce.clock` kill-switch and the module gate, because a statutory register that was already
   * written must stay producible on inspection — so this keeps answering after a punch has been
   * refused, which is exactly when someone needs to look at it.
   */
  GetPersonnelList () {
    return this._request('GET', '/workforce/pos/personnel-list', { headers: this._sessionHeaders() });
  }
}

export default WorkforcePosClockService;
