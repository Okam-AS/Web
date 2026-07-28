// One refusal kind → one sentence. The map lives here rather than in each component so the two
// panels on the Meals page cannot come to disagree about what a 404 means, and so the claim each
// sentence makes can be reviewed in one place.
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
// So `dark` says "not switched on for this venue", which the problem document supports, and `absent`
// says "this server did not answer as Meals", which is all an empty-bodied 404 supports. Neither
// says "there are no agreements": that is a claim only a 200 with an empty list may make, and it has
// its own key on the components.

import {
  REFUSAL_DARK,
  REFUSAL_ABSENT,
  REFUSAL_FORBIDDEN,
  REFUSAL_UNAUTHENTICATED,
  REFUSAL_UNKNOWN
} from '~/utils/meals/meals-client';

export const REFUSAL_LABELS = {
  [REFUSAL_DARK]: 'meals_refusal_dark',
  [REFUSAL_ABSENT]: 'meals_refusal_absent',
  [REFUSAL_FORBIDDEN]: 'meals_refusal_forbidden',
  [REFUSAL_UNAUTHENTICATED]: 'meals_refusal_unauthenticated',
  [REFUSAL_UNKNOWN]: 'meals_refusal_unknown'
};

/**
 * The translation key for a refusal, including the case where there was none.
 *
 * A null refusal on an UNKNOWN read means no read has been issued yet — no store selected, first
 * paint — which is a different sentence from every refusal above: nothing was refused because
 * nothing was attempted. It is a function rather than another entry in the map because a `null` key
 * in an object literal is the string `"null"`, and a distinction that survives only by coercion is
 * one refactor from being lost.
 */
export function refusalKey (refusal) {
  if (refusal === null || refusal === undefined) { return 'meals_refusal_not_read'; }
  return REFUSAL_LABELS[refusal] || REFUSAL_LABELS[REFUSAL_UNKNOWN];
}

export default refusalKey;
