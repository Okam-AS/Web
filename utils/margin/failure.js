// How a Margin failure becomes a sentence, for the supplier / price / import surfaces.
//
// The recipes page keys its rendering on `code` and falls through to "Something went wrong. Nothing
// was saved." for anything it does not recognise. That is right THERE, because every refusal the
// recipe surface can produce is coded — `MarginRecipeProblems` gives each one a `margin.*` code.
//
// IT WOULD BE WRONG HERE, and this file exists because of that difference. The supplier, price and
// import surfaces raise their business-rule refusals as `AppException`, which
// `ModuleControllerBase.ModuleProblem` renders as a 400 problem+json carrying `detail` AND NO `code`.
// Those uncoded 400s are not the exotic cases; they are the ones a venue meets on a normal day and
// the only ones that say what to do about it:
//
//   "A later-dated price already exists; prices supersede forward and cannot be backdated…"
//   "The CSV header is missing a required column. Expected at least an article-number column…"
//   "12 row(s) are unresolved; map or skip every row before approving this import."
//   "Row 4 cannot be mapped while it carries an error; skip it instead."
//   "A supplier with this name already exists in the store."
//
// Rendering those as "Something went wrong" would replace an instruction with an alarm, and would do
// it on every refusal that matters. So an uncoded failure is shown VERBATIM, framed as the server's
// own words. It is English prose inside a Norwegian screen, which is a real cost and a smaller one
// than withholding the only fact the venue can act on.
//
// What this is NOT is the forbidden thing: nothing here READS the prose to decide what happened. The
// text is carried through opaquely, never matched against, so a reworded server message changes what
// the venue reads and never changes what the screen does. Codes remain the only thing branched on.

import {
  isMarginApiError,
  MARGIN_NOT_FOUND,
  MARGIN_FORBIDDEN,
  MARGIN_STALE_REVISION,
  MARGIN_REVISION_REQUIRED,
  MARGIN_REVISION_INVALID,
  MARGIN_UNATTRIBUTED
} from '~/utils/margin/api-client';

/** The coded `margin.*` failures these surfaces can meet, mapped to translated copy. */
export const MARGIN_FAILURE_KEYS = {
  [MARGIN_NOT_FOUND]: 'mrg_err_not_found',
  [MARGIN_FORBIDDEN]: 'mrg_err_forbidden',
  [MARGIN_STALE_REVISION]: 'mrg_err_stale',
  [MARGIN_REVISION_REQUIRED]: 'mrg_err_revision_required',
  [MARGIN_REVISION_INVALID]: 'mrg_err_revision_invalid',
  [MARGIN_UNATTRIBUTED]: 'mrg_err_unattributed',
  'margin.client-missing-revision': 'mrg_err_missing_revision'
};

/**
 * `{ key, params }` for `$i` — the sentence to show for a failure.
 *
 * Three outcomes, in priority order:
 *   • a known `margin.*` code            → its own translated copy;
 *   • no code but the server said why    → `mrg_err_server_detail`, carrying the prose verbatim;
 *   • neither (a network error, an empty
 *     body, an unknown code with no text) → `mrg_err_generic`.
 *
 * An UNKNOWN code that still carries prose lands in the middle case rather than the last: a code
 * this file has not been taught is a reason to stop translating, not a reason to stop informing.
 */
export function describeMarginFailure (error) {
  if (!isMarginApiError(error)) { return { key: 'mrg_err_generic', params: {} }; }

  const key = MARGIN_FAILURE_KEYS[error.code];
  if (key) { return { key, params: {} }; }

  const detail = serverDetail(error);
  return detail
    ? { key: 'mrg_err_server_detail', params: { detail } }
    : { key: 'mrg_err_generic', params: {} };
}

/**
 * The server's own explanation, or null.
 *
 * `MarginApiError` puts `detail || title || 'HTTP <status>'` in `message`, so `message` is never
 * empty and is useless as a test for "did the server explain". The problem document is read directly
 * instead, and `title` is deliberately not accepted: it is the reason phrase ("Bad Request"), which
 * tells a venue nothing it did not already know from the failure being on screen.
 */
function serverDetail (error) {
  const problem = error.problem || {};
  const detail = typeof problem.detail === 'string' ? problem.detail.trim() : '';
  return detail.length ? detail : null;
}
