// What a refused invitation claim (#32) is allowed to say, and what it may offer to do about it.
//
// ---- WHY THIS IS ITS OWN FILE AND NOT `claim-outcome.js` --------------------------------------
//
// `claim-outcome.js` next door classifies a refused OPEN-SHIFT claim (#40), and the two look alike
// only from a distance. That one is about a race between coworkers over a shift, where losing is a
// normal outcome and the vocabulary is `award-taken` / `already-requested`. This one is about
// IDENTITY: a person turning a string into an engagement, before they have any engagement at all.
// Its whole shape is dictated by the backend's anti-oracle rule, which the other surface does not
// have. Merging them would put a discriminating vocabulary next to a deliberately opaque one and
// invite the next author to reach for the wrong half.
//
// ---- THE RULE THIS FILE EXISTS TO KEEP -------------------------------------------------------
//
// `POST /workforce/me/invitations/claim` answers ONE opaque `404 workforce.invitation-invalid` for
// every one of: a token that never existed, a token that expired, a token a manager revoked, a token
// somebody already claimed, and a token whose engagement belongs to a person bound to a DIFFERENT
// login (`Services/Workforce/WorkforceInvitationProblems.cs`). Identical status, identical code,
// identical detail, no extensions. That is deliberate: the claim surface offers no person search, so
// a client that could tell "no such token" from "a real token that is spent" would be a person
// enumerator with extra steps.
//
// A page therefore MUST NOT say "that code has expired" or "that code has already been used". It
// does not know, cannot know, and a friendly guess here is a lie that sends someone to argue with
// their manager about the wrong thing. The copy below names all five possibilities in one sentence
// and lets the reader recognise their own case — which is the most any client is entitled to say.
//
// Two answers sit OUTSIDE that opacity, and both are about the CALLER'S OWN identity links rather
// than about anybody else, which is why the backend permits them to be distinguishable at all.

import { isWorkforceApiError } from '~/utils/workforce/api-client';

/** Sign in (or as somebody else) — nothing about the code is known to be wrong. */
export const CLAIM_ACTION_SIGN_IN = 'sign-in';
/**
 * Press again with the SAME idempotency key. Offered only when the command may never have landed, so
 * the replay either returns the engagement the first attempt created or issues the command once.
 */
export const CLAIM_ACTION_RETRY = 'retry';
/**
 * Press again with a FRESH idempotency key. The server said so in as many words: the reservation for
 * the original key stays Reserved for ever, so reusing it replays as in-progress and can never
 * succeed. Distinct from `RETRY` because the two do genuinely different things.
 */
export const CLAIM_ACTION_RETRY_FRESH = 'retry-fresh';
/** Final, and only a manager can resolve it. There is no self-service path out of this one. */
export const CLAIM_ACTION_ASK_MANAGER = 'ask-manager';
/** Final for THIS code. A different code might work; pressing this one again never will. */
export const CLAIM_ACTION_OTHER_CODE = 'other-code';

const CODE_INVITATION_INVALID = 'workforce.invitation-invalid';
const CODE_PERSON_ATTACH_REFUSED = 'workforce.person-attach-refused';
const CODE_CLAIM_LINK_CONFLICT = 'workforce.claim-link-conflict';
const CODE_IDEMPOTENCY_IN_PROGRESS = 'workforce.idempotency-in-progress';

function refusal (heading, body, action) {
  return { heading, body, action };
}

/**
 * Turns a failed claim into the one thing the page is allowed to say about it.
 *
 * Keyed on the stable `code`, never on `detail` — which is English prose, may be reworded without
 * notice, and is shown only BESIDE the sentence below (see `claimProblemDetail`).
 */
export function invitationRefusal (error) {
  if (!error) { return null; }

  // Not a typed problem document at all: a dropped connection, an unparseable body, a proxy page.
  // The request may never have ARRIVED, which is a different fact from a refusal and the only one
  // that makes pressing again safe — the same key replays rather than issuing a second command.
  if (!isWorkforceApiError(error)) {
    return refusal('wfjoin_refuse_offline_title', 'wfjoin_refuse_offline_body', CLAIM_ACTION_RETRY);
  }

  if (error.status === 401) {
    return refusal('wfjoin_refuse_signedout_title', 'wfjoin_refuse_signedout_body', CLAIM_ACTION_SIGN_IN);
  }

  switch (error.code) {
  // THE OPAQUE ONE. Five causes, one answer, and the copy names all five rather than picking a
  // likely-sounding member of the set.
  case CODE_INVITATION_INVALID:
    return refusal('wfjoin_refuse_invalid_title', 'wfjoin_refuse_invalid_body', CLAIM_ACTION_OTHER_CODE);

  // The caller's login already belongs to another person record and the engagement cannot be moved
  // onto it. NOT retryable, and the module has no merge, relink or person-recovery route at all —
  // so the page must not offer a button, and must not send the reader hunting for a setting. A
  // manager re-composes the engagement on the right person; that is the whole resolution.
  case CODE_PERSON_ATTACH_REFUSED:
    return refusal('wfjoin_refuse_attach_title', 'wfjoin_refuse_attach_body', CLAIM_ACTION_ASK_MANAGER);

  // A concurrent write took a uniqueness slot; nothing persisted. Retryable, but the server requires
  // a fresh key and says so — reusing this one replays the stranded reservation for ever.
  case CODE_CLAIM_LINK_CONFLICT:
    return refusal('wfjoin_refuse_conflict_title', 'wfjoin_refuse_conflict_body', CLAIM_ACTION_RETRY_FRESH);

  // An earlier command under this key is still running. Pressing again with the same key is exactly
  // right: it is the replay this state exists for.
  case CODE_IDEMPOTENCY_IN_PROGRESS:
    return refusal('wfjoin_refuse_inflight_title', 'wfjoin_refuse_inflight_body', CLAIM_ACTION_RETRY);

  default:
    break;
  }

  // A 404 carrying no `workforce.*` code is not this module answering — it is a routing miss, an old
  // deployment, a proxy. Nothing may be concluded about the invitation from it, least of all that it
  // is invalid, so it is reported as a failure to reach the surface rather than as a refusal by it.
  if (error.status === 404) {
    return refusal('wfjoin_refuse_nomodule_title', 'wfjoin_refuse_nomodule_body', CLAIM_ACTION_RETRY);
  }

  return refusal('wfjoin_refuse_offline_title', 'wfjoin_refuse_offline_body', CLAIM_ACTION_RETRY);
}

/**
 * The server's own words, or null.
 *
 * Shown beside the keyed sentence and never instead of it: untranslated prose that can change
 * without notice may add detail, but a reader must never depend on it. Deliberately returns nothing
 * for the opaque refusal — its `detail` is a fixed English string carrying no information the
 * sentence above does not already carry, and printing it twice implies the server said something
 * specific about this particular code.
 */
export function claimProblemDetail (error) {
  if (!isWorkforceApiError(error)) { return null; }
  if (error.code === CODE_INVITATION_INVALID) { return null; }
  const problem = error.problem || {};
  const detail = problem.detail || problem.title;
  return typeof detail === 'string' && detail.length ? detail : null;
}

/** True when pressing the same button again can produce a different answer. */
export function isRetryable (refusalOrNull) {
  if (!refusalOrNull) { return false; }
  return refusalOrNull.action === CLAIM_ACTION_RETRY || refusalOrNull.action === CLAIM_ACTION_RETRY_FRESH;
}

export default invitationRefusal;
