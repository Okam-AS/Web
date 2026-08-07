// What the register may believe about a person's clock session after a punch.
//
// ---- THE ONE RULE THIS FILE EXISTS TO STATE ---------------------------------------------------
//
// NEITHER FIELD ON `POST /workforce/pos/clock-events` IS TRUSTWORTHY ALONE. A definite state needs
// both of them to agree, and anything else is the honest third answer.
//
// Each half has been the whole rule at some point, and each was wrong on its own:
//
//   • `sessionState` alone. The backend derived it from `ClosedUtc` alone, and a fold that moved
//     nothing sets no `ClosedUtc` either — so clocking OUT with nothing open answered
//     `{ "clockSessionId": null, "sessionState": "Open", "closedUtc": null }` and a register bound to
//     that field flipped to CLOCKED IN at the moment the worker pressed *Stemple ut*. FIXED backend
//     side on 2026-08-05 (`4d103ca8a`): `PosClockEventResponse.SessionStateOf` now switches on the
//     fold's own outcome and answers the third state, `AttendanceException`.
//
//   • `clockSessionId` alone — the rule this file used to hold, written while the wire was still
//     lying, and wrong in the same direction as what it was avoiding. A CROSS-ENGAGEMENT clock-in
//     (a worker with two legal employers, §3.7) answers `AttendanceException` while carrying the
//     OTHER employer's OPEN session id, because the adjustment references it. So the id is present
//     and `closedUtc` is null, and "id present, not closed" read that as OPEN: the register told her
//     she was clocked in on the engagement that folded nothing.
//
// The backend states the trap directly, and its test is this module's specification:
// `PosClockOutStateWireTests.A_cross_engagement_clock_in_carries_a_session_id_and_still_does_not_report_this_engagement_open`
// — "a fix that only mapped 'null id' to the third state would answer Open here and be wrong in the
// same direction."
//
// So the rule is corroboration, and it is deliberately hard to satisfy:
//
//   • no session folded at all (no id)                      -> EXCEPTION, whatever the label claims
//   • the server declares AttendanceException               -> EXCEPTION
//   • a session folded AND the server declares Open/Closed  -> OPEN / CLOSED
//   • anything else, including a state this client does not
//     know and a response that never arrived                -> UNKNOWN
//
// The no-id guard is kept even though the wire no longer needs it: this client and the API deploy
// independently, so a till can meet a server from before 2026-08-05, and that is the exact body it
// answers. Losing that guard costs a § 8-5-6 end time; keeping it costs one branch.
//
// UNKNOWN is not a failure state. Both buttons stay live and the SERVER decides on the next press
// (see `canClockIn`/`canClockOut` below), so a fourth state added server-side lands here rather than
// being guessed into OPEN — which is how the original defect was written.
//
// The exception branch is NOT an error and must never be rendered as one — the punch IS on the
// append-only record (spec §3.4: raw truth is accepted, never rounded or rejected, hence
// `accepted: true` and `200`) and an adjustment path exists for a manager. It is a distinct, honest
// third state, and the screen says so rather than guessing.
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
 * Both halves must agree before the register claims a definite state — see the header. Neither
 * `clockSessionId` nor `sessionState` decides this on its own, because each of them has already been
 * the whole rule and each was wrong in the same direction: towards telling a worker she is on the
 * clock when nothing of hers is open.
 */
export function stateFromClockEvent (response) {
  if (!response) { return SESSION_UNKNOWN; }

  // The server's own classification of what the fold did. `AttendanceException` is the answer for BOTH
  // shapes that move nothing — a clock-out with no open session (no id at all) and a cross-engagement
  // clock-in (which carries another employer's id) — so it is read before anything is inferred from
  // the id.
  if (response.sessionState === 'AttendanceException') { return SESSION_EXCEPTION; }

  // No session folded, whatever the label claims. This catches a server older than 2026-08-05, whose
  // `sessionState` reads "Open" on a clock-out that closed nothing.
  if (!response.clockSessionId) { return SESSION_EXCEPTION; }

  // A session moved AND the server said which way. `closedUtc` is not consulted: the state is what the
  // fold did, and a timestamp is the thing that could not tell "absent" from "running".
  if (response.sessionState === 'Closed') { return SESSION_CLOSED; }
  if (response.sessionState === 'Open') { return SESSION_OPEN; }

  // A state this client does not know. Say so rather than guess — a guess here is the defect.
  return SESSION_UNKNOWN;
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
 *
 * An unreadable answer is held to the same rule, and for the same reason: it is not evidence that
 * anything folded, so it may not overwrite something the register had established either.
 */
export function nextState (previous, response) {
  const observed = stateFromClockEvent(response);
  if (observed === SESSION_EXCEPTION || observed === SESSION_UNKNOWN) {
    return previous === SESSION_UNKNOWN ? observed : previous;
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
