// One refusal kind → one sentence. The map lives here rather than in each component so the panels on
// the two Meals pages cannot come to disagree about what a 404 means, and so the claim each sentence
// makes can be reviewed in one place.
//
// THE CLAIM EACH KEY IS ALLOWED TO MAKE — this is the part that needs care, because Meals is a dark
// module and it would be very easy to write copy that overstates its darkness.
//
// A backend wire test (`MealsWireTests.PINNED_a_dark_route_is_already_distinguishable_from_a_path_
// that_is_not_routed`) established the honest limit: a dark Meals route answers 404 with an
// `application/problem+json` document, while a path that is not routed at all answers 404 with an
// EMPTY body. The module therefore conceals WHICH company, agreement and program exist — it does not
// conceal that it is deployed, and it never claimed to.
//
// So `dark` says "not switched on", which the problem document supports, and `absent` says "this
// server did not answer as Meals", which is all an empty-bodied 404 supports. Neither says "there
// are no agreements": that is a claim only a 200 with an empty list may make, and it has its own key
// on the components.
//
// ---- WHY THE SENTENCES ARE SCOPED --------------------------------------------------------------
//
// Meals has TWO independent visibility gates, and a single "not switched on for this venue" sentence
// was true of one of them and wrong about the other:
//
//   store scope     — `IMealsStoreFeatureFlags`: the PER-STORE `meals.module` override, falling back
//                     to the module-wide config. This is what the venue's agreement/orders reads and
//                     the corridor signing resolve. Authority is StoreAdmin at that store.
//   company scope   — `IMealsFeatureGate`: the module-wide `Features:Meals` configuration section,
//                     with no per-store dimension at all. This is what the company account,
//                     programmes, policy versions, invitations and memberships resolve. Authority is
//                     an active `CompanyAdmin` MEMBERSHIP, never StoreAdmin and never PowerUser.
//   concierge scope — the same module-wide gate, but authority is the platform PowerUser role:
//                     creating a company account and signing a corridor agreement.
//
// A venue can therefore have its Meals surface lit while every company-scoped route answers 404, and
// the reverse. Only `dark` and `forbidden` differ between the scopes — `absent`, `unauthenticated`,
// `unknown` and "not read yet" say nothing scope-specific and are shared, so there is one sentence
// for each of those rather than three that could drift.

import {
  REFUSAL_DARK,
  REFUSAL_ABSENT,
  REFUSAL_FORBIDDEN,
  REFUSAL_UNAUTHENTICATED,
  REFUSAL_UNKNOWN
} from '~/utils/meals/meals-client';

import { isWorkforceApiError } from '~/utils/workforce/api-client';

/** The per-store `meals.module` flag, StoreAdmin authority. The default — the venue's own surface. */
export const SCOPE_STORE = 'store';

/** The module-wide `Features:Meals` gate, `CompanyAdmin` membership authority. */
export const SCOPE_COMPANY = 'company';

/** The module-wide gate, platform PowerUser (Okam concierge) authority. */
export const SCOPE_CONCIERGE = 'concierge';

/**
 * The corridor-agreement signing route, and the only place the two gates mix: it is
 * store-addressable, so its 404 is the PER-STORE flag exactly like the venue's own reads, while its
 * 403 is the concierge role. Both halves are named rather than one being approximated by the other —
 * telling an operator the installation is dark when their venue's flag is off would send them to the
 * wrong person.
 */
export const SCOPE_CORRIDOR = 'corridor';

export const REFUSAL_LABELS = {
  [REFUSAL_DARK]: 'meals_refusal_dark',
  [REFUSAL_ABSENT]: 'meals_refusal_absent',
  [REFUSAL_FORBIDDEN]: 'meals_refusal_forbidden',
  [REFUSAL_UNAUTHENTICATED]: 'meals_refusal_unauthenticated',
  [REFUSAL_UNKNOWN]: 'meals_refusal_unknown'
};

// Only the two sentences whose CLAIM changes with the gate. Everything not overridden falls through
// to `REFUSAL_LABELS` above, so a kind added there is covered in every scope without being copied.
const SCOPED_LABELS = {
  [SCOPE_COMPANY]: {
    [REFUSAL_DARK]: 'meals_refusal_company_dark',
    [REFUSAL_FORBIDDEN]: 'meals_refusal_company_forbidden'
  },
  [SCOPE_CONCIERGE]: {
    [REFUSAL_DARK]: 'meals_refusal_company_dark',
    [REFUSAL_FORBIDDEN]: 'meals_refusal_concierge_forbidden'
  },
  // Dark is deliberately absent here: the corridor route's 404 IS the per-store flag, so it falls
  // through to the venue sentence in `REFUSAL_LABELS` rather than repeating it.
  [SCOPE_CORRIDOR]: {
    [REFUSAL_FORBIDDEN]: 'meals_refusal_concierge_forbidden'
  }
};

/**
 * The translation key for a refusal, including the case where there was none.
 *
 * A null refusal on an UNKNOWN read means no read has been issued yet — no store selected, no
 * company selected, first paint — which is a different sentence from every refusal above: nothing
 * was refused because nothing was attempted. It is a branch rather than another entry in the map
 * because a `null` key in an object literal is the string `"null"`, and a distinction that survives
 * only by coercion is one refactor from being lost.
 *
 * `scope` defaults to the store surface, which is what every caller before the company surface
 * existed meant.
 */
export function refusalKey (refusal, scope) {
  if (refusal === null || refusal === undefined) { return 'meals_refusal_not_read'; }
  const overrides = SCOPED_LABELS[scope] || {};
  return overrides[refusal] || REFUSAL_LABELS[refusal] || REFUSAL_LABELS[REFUSAL_UNKNOWN];
}

// ---- Write failures ------------------------------------------------------------------------------
//
// A refusal above answers "why is there nothing on screen". These answer "what happened to the thing
// I just tried to do", which is a different question with a different obligation: every sentence
// below must say whether anything was SAVED, because the caller is about to decide whether to retry.
//
// The typed `meals.*` codes are a public contract (`Helpers/Meals/MealsProblemCodes.cs`) and are
// keyed on directly. The human `detail` is deliberately NOT the message — it is server prose, in
// English, and may be reworded — but it is offered separately by `problemDetail` so a panel can show
// it as the platform's own words beside the page's sentence, which is the precedent the store-market
// card set for a refusal that names a value the client does not hold.

const WRITE_CODE_LABELS = {
  'meals.stale-revision': 'meals_write_stale',
  'meals.stale-policy-version': 'meals_write_stale_policy',
  'meals.idempotency-payload-mismatch': 'meals_write_idempotency_mismatch',
  'meals.idempotency-in-progress': 'meals_write_in_progress',
  'meals.invitation-not-claimable': 'meals_write_invitation_not_claimable',
  'meals.currency-mismatch': 'meals_write_currency_mismatch',
  'meals.validation': 'meals_write_validation'
};

/**
 * The translation key for a failed mutation.
 *
 * The CODE is consulted before the status: a `meals.validation` 400 and a bare 400 from the
 * controller's own precondition guard are both 400s and mean different things, and every typed
 * conflict is a 409 whose sentence differs. A failure carrying no recognised code falls back to the
 * status, and anything that is not a typed API error at all — a network drop, a body that did not
 * parse — is its own sentence, because "the request never arrived" and "the server refused it" are
 * not the same fact and the second one is the only one that tells you the state on the server.
 */
export function writeFailureKey (error, scope) {
  if (!error) { return null; }
  if (!isWorkforceApiError(error)) { return 'meals_write_network'; }

  const byCode = WRITE_CODE_LABELS[error.code];
  if (byCode) { return byCode; }

  if (error.status === 401) { return REFUSAL_LABELS[REFUSAL_UNAUTHENTICATED]; }
  if (error.status === 403) { return refusalKey(REFUSAL_FORBIDDEN, scope); }
  if (error.status === 404) {
    // Same strict split the read path makes: only a document this module demonstrably wrote earns
    // the "switched off" sentence. Without a `meals.*` code nothing may be claimed about the gate.
    return (typeof error.code === 'string' && error.code.indexOf('meals.') === 0)
      ? refusalKey(REFUSAL_DARK, scope)
      : refusalKey(REFUSAL_ABSENT, scope);
  }
  if (error.status === 400) { return 'meals_write_rejected'; }

  return 'meals_write_unknown';
}

/**
 * The server's own words for a failure, or null.
 *
 * Shown BESIDE the keyed sentence and never instead of it: it is untranslated English prose that can
 * be reworded without notice, so it may add detail but must never be the only thing on screen.
 */
export function problemDetail (error) {
  if (!isWorkforceApiError(error)) { return null; }
  const problem = error.problem || {};
  const detail = problem.detail || problem.title;
  return typeof detail === 'string' && detail.length ? detail : null;
}

export default refusalKey;
