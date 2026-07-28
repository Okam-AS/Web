// How the worker surface reads the answer to "I want that open shift" (#40).
//
// THE POINT OF THIS FILE. Two workers can ask for the same open shift and exactly one can win — the
// guarantee is a pair of filtered unique indexes on `WorkforceShiftExchangeRequests`, not a
// pre-check, so the loser learns they lost at commit time
// (`Services/Workforce/WorkforceExchangeProblems.cs:56-70`). The backend converts that refusal into a
// typed `409 workforce.award-taken` precisely so the client does not have to see a 500.
//
// Losing is therefore a NORMAL OUTCOME of asking, not a fault. A worker who taps "ask for this shift"
// a second too late has done nothing wrong, and the surface must not tell them they have: no red, no
// "something went wrong", no retry button that cannot succeed. It says the shift is taken, drops it
// from the list, and leaves the rest of the list usable. That difference is the difference between a
// worker trusting the app and not.
//
// Every branch below is keyed on the stable `code` extension, never on the human-readable detail.

/** The shift went to someone else. Normal, final, informational. */
export const OUTCOME_AWARD_TAKEN = 'award-taken';
/** The caller already holds a live candidacy on this shift. Normal, final, informational. */
export const OUTCOME_ALREADY_REQUESTED = 'already-requested';
/** The exchange has left the state a worker decision can act on. Normal, final, informational. */
export const OUTCOME_NOT_DECIDABLE = 'not-decidable';
/** The shift is no longer open to this caller (withdrawn, unpublished, another store). Refresh. */
export const OUTCOME_GONE = 'gone';
/** The ask was refused on its merits (already started, already the caller's own shift). */
export const OUTCOME_INVALID = 'invalid';
/** The caller lacks WorkforceSelf on the engagement. */
export const OUTCOME_FORBIDDEN = 'forbidden';
/** Anything the surface does not model — a genuine failure. */
export const OUTCOME_ERROR = 'error';

const CODE_AWARD_TAKEN = 'workforce.award-taken';
const CODE_ALREADY_REQUESTED = 'workforce.exchange-already-requested';
const CODE_NOT_DECIDABLE = 'workforce.request-not-decidable';
const CODE_INVALID_EXCHANGE = 'workforce.invalid-exchange';
const CODE_NOT_FOUND = 'workforce.not-found';
const CODE_FORBIDDEN = 'workforce.forbidden';

// The outcomes that are a truthful answer to the question rather than a malfunction. The page uses
// this to pick its tone, and — more importantly — to decide NOT to offer a retry: none of these get
// a different answer on a second tap, so a retry button would be a lie about what is possible.
const NORMAL_OUTCOMES = [OUTCOME_AWARD_TAKEN, OUTCOME_ALREADY_REQUESTED, OUTCOME_NOT_DECIDABLE];

// Outcomes after which the row on screen is known to be stale, so the list must be re-read rather
// than patched: the shift is gone for this worker either way.
const STALE_LIST_OUTCOMES = [OUTCOME_AWARD_TAKEN, OUTCOME_ALREADY_REQUESTED, OUTCOME_NOT_DECIDABLE, OUTCOME_GONE];

/**
 * Classifies a failed claim / worker decision into one of the outcomes above.
 *
 * Falls back to `OUTCOME_ERROR` for anything unmodelled — including a 409 whose code we do not
 * recognise. Guessing "probably award-taken" from a bare 409 would silently swallow a real conflict,
 * so an unknown code stays an error.
 */
export function classifyClaimFailure (error) {
  if (!error) { return OUTCOME_ERROR; }

  switch (error.code) {
  case CODE_AWARD_TAKEN: return OUTCOME_AWARD_TAKEN;
  case CODE_ALREADY_REQUESTED: return OUTCOME_ALREADY_REQUESTED;
  case CODE_NOT_DECIDABLE: return OUTCOME_NOT_DECIDABLE;
  case CODE_INVALID_EXCHANGE: return OUTCOME_INVALID;
  case CODE_NOT_FOUND: return OUTCOME_GONE;
  case CODE_FORBIDDEN: return OUTCOME_FORBIDDEN;
  }

  // A typed code is the contract, but the status is a usable second source when an intermediary
  // (a proxy, a gateway error page) strips the problem body. 404/403 carry no ambiguity.
  if (error.status === 404) { return OUTCOME_GONE; }
  if (error.status === 403) { return OUTCOME_FORBIDDEN; }

  return OUTCOME_ERROR;
}

/** True when the outcome is a truthful answer rather than a malfunction — informational tone, no retry. */
export function isNormalOutcome (outcome) {
  return NORMAL_OUTCOMES.includes(outcome);
}

/** True when the open-shift list on screen is known to be stale and must be re-read. */
export function requiresRefresh (outcome) {
  return STALE_LIST_OUTCOMES.includes(outcome);
}

/** The `$i` translation key carrying the worker-facing sentence for an outcome. */
export function outcomeMessageKey (outcome) {
  switch (outcome) {
  case OUTCOME_AWARD_TAKEN: return 'wfme_claim_award_taken';
  case OUTCOME_ALREADY_REQUESTED: return 'wfme_claim_already_requested';
  case OUTCOME_NOT_DECIDABLE: return 'wfme_claim_not_decidable';
  case OUTCOME_GONE: return 'wfme_claim_gone';
  case OUTCOME_INVALID: return 'wfme_claim_invalid';
  case OUTCOME_FORBIDDEN: return 'wfme_claim_forbidden';
  default: return 'wfme_claim_error';
  }
}
