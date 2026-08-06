// What the register may believe about a person's clock session after a punch.
//
// ---- THE ONE RULE THIS FILE EXISTS TO STATE ---------------------------------------------------
//
// `POST /workforce/pos/clock-events` answers a `sessionState` field. DO NOT BIND THE BUTTON TO IT.
//
// The wire shape is `PosClockEventResponse.From` (backend `Models/Workforce/WorkforcePosModels.cs`):
//
//     SessionState = result.ClosedUtc.HasValue ? Closed : Open
//
// so `sessionState` is derived from `closedUtc` ALONE, and a punch that folded no session at all has
// no `closedUtc` either. `WorkforceClockProjection.StageClockOutAsync` returns
// `Outcome = MissingPunchException` — with `ClockSessionId`, `OpenedUtc` and `ClosedUtc` all null —
// when a clock-OUT arrives and no session is open. The raw punch is still retained as truth (spec
// §3.4: raw truth is accepted, never rounded or rejected), so the response is `200` with
// `accepted: true`.
//
// Put together, clocking OUT with nothing open answers:
//
//     { "clockSessionId": null, "sessionState": "Open", "closedUtc": null, "accepted": true }
//
// A register that read `sessionState` would flip to "clocked in" at the exact moment a worker pressed
// *Stemple ut*. The worker walks away believing they clocked out; the personalliste carries no end
// time; and § 8-5-6's end time — the one the whole register exists to record — is the thing missing.
// That is the failure this module refuses to let the screen make.
//
// `clockSessionId` IS the authoritative signal, because it is the only field that reports whether the
// canonical fold actually moved anything:
//
//   • id present, closedUtc absent   -> OPEN     (clocked in; the session is running)
//   • id present, closedUtc present  -> CLOSED   (clocked out; the window is complete)
//   • id absent                      -> EXCEPTION(the punch is recorded, no session moved)
//
// The exception branch is NOT an error and must never be rendered as one — the punch IS on the
// append-only record and an adjustment path exists for a manager. It is a distinct, honest third
// state, and the screen says so rather than guessing.
//
// It is a module rather than a computed on the component because a screen cannot be asked to hold a
// rule whose whole point is that the obvious reading of the payload is wrong.

/** The canonical session is running: the person is on site. */
export const SESSION_OPEN = 'open';
/** The canonical session is complete: the person clocked out. */
export const SESSION_CLOSED = 'closed';
/** The punch was recorded but folded no session (missing or cross-engagement punch, spec §3.7). */
export const SESSION_EXCEPTION = 'exception';
/** Nothing has been punched on this device yet in this operator's session. */
export const SESSION_UNKNOWN = 'unknown';

/**
 * The state a clock-event RESPONSE puts the register in.
 *
 * Reads `clockSessionId` and `closedUtc` only. `sessionState` is deliberately ignored — see the
 * header; passing it through would reintroduce the exact bug this file documents.
 */
export function stateFromClockEvent (response) {
  if (!response) { return SESSION_UNKNOWN; }
  // A null/absent id means the fold produced no session: a clock-out with nothing open, or a
  // cross-engagement second open punch. Both are attendance exceptions, never a clocked state.
  if (!response.clockSessionId) { return SESSION_EXCEPTION; }
  return response.closedUtc ? SESSION_CLOSED : SESSION_OPEN;
}

/**
 * True when the register may offer *Stemple inn*, and true when the register may offer *Stemple ut*.
 *
 * ---- WHY BOTH ARE OFFERED WHILE THE STATE IS UNKNOWN ----
 *
 * On a fresh load the register genuinely does not know whether this person is already clocked in.
 * Endpoint 46 lists who is on site by NAME and protected code — it carries no `staffMemberId` — so
 * the screen cannot match a row to the operator standing in front of it, and there is no
 * "my current session" read on the POS surface at all.
 *
 * A register that guessed CLOSED and greyed out *Stemple ut* would strand every worker who reloads
 * the till, or comes back to it after an operator switch, in exactly the state where they most need
 * to clock out — end of shift. So while the state is unknown BOTH actions stay live and the SERVER
 * is the authority, which it is anyway: a clock-in that was already open answers 409
 * `workforce.open-session-exists`, and a clock-out with nothing open answers the null-session
 * exception. Either answer teaches the screen the truth (see `stateFromRefusal`), and the next press
 * is offered against a state that is now known rather than assumed.
 *
 * Once a punch HAS landed the state is known and the buttons narrow to the one honest action.
 */
export function canClockIn (state) {
  return state !== SESSION_OPEN;
}

export function canClockOut (state) {
  return state !== SESSION_CLOSED;
}

/**
 * What a typed REFUSAL tells the register about the state it failed to reach.
 *
 * A refusal is not only an error — `workforce.open-session-exists` is the server saying "this person
 * is clocked in", which is precisely the fact the screen was missing. Returns null when the code says
 * nothing about session state (a flag, a link, a device problem), leaving the state untouched.
 */
export function stateFromRefusal (code) {
  return code === 'workforce.open-session-exists' ? SESSION_OPEN : null;
}

/**
 * The state the register should hold after a punch, given what it believed BEFORE it.
 *
 * An exception outcome must not overwrite a known state: if the person was open and a stray clock-out
 * for a *different* engagement folded nothing, they are still open. Only a fold that moved a session
 * changes what the register believes.
 */
export function nextState (previous, response) {
  const observed = stateFromClockEvent(response);
  if (observed === SESSION_EXCEPTION) {
    return previous === SESSION_UNKNOWN ? SESSION_EXCEPTION : previous;
  }
  return observed;
}

export default {
  SESSION_OPEN,
  SESSION_CLOSED,
  SESSION_EXCEPTION,
  SESSION_UNKNOWN,
  stateFromClockEvent,
  canClockIn,
  canClockOut,
  stateFromRefusal,
  nextState
};
