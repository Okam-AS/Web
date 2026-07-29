// The Margin cost model: the pure function between what `GET /margin/recipes/{id}` returned and what
// the page draws. No Vue, no network — so the rules below are testable on their own.
//
// THE LAW THIS FILE EXISTS TO KEEP, and it is sharper here than anywhere else in the estate, because
// this module's entire subject matter is money: NOTHING IS ADDED UP HERE. The backend carries the
// explosion in decimal øre and rounds HALF-UP to integer øre exactly once, at the presentation
// boundary — separately for each line, for the batch total and for the per-portion figure
// (`MarginRecipeCostCalculator.PreviewVersionAsync`). `sum(lines[].lineCostMinor)` is therefore NOT
// `totalCostMinor`: each line was rounded on its own, so the sum drifts from the total by up to half
// an øre per line. Both are true; only one is the total. This module reads the total's own field and
// adds nothing.
//
// THE SECOND LAW: UNKNOWN IS NOT ZERO, AND A REFUSED MARGIN IS BETTER THAN A WRONG ONE. Five states
// are kept apart because a venue reads them as five different facts, and because someone prices a
// dish off whichever one is on screen:
//
//   unknown      — the read has not answered (or failed). Nothing may be claimed about the cost.
//   not-costed   — the read answered and there is NO version to price. A retired recipe with no draft
//                  is the real case: it has a name and a history and no current cost.
//   none-priced  — a version was priced and NOT ONE line resolved to a price. The wire says
//                  `totalCostMinor: 0` here, and that 0 is arithmetically a true lower bound — but a
//                  floor derived from zero knowledge carries no information about the dish and reads
//                  as "this is free". Rendered as unknown, never as an amount.
//   floor        — some lines priced, some did not (`complete: false`). The totals are LOWER BOUNDS.
//                  This is the contracted semantic: the menu-margin read (`MarginMenuMarginReadTests`,
//                  now its acceptance suite rather than its oracle) fixes plate cost as "a LOWER BOUND
//                  ('at least X') when CostComplete is false", and this module keeps the same meaning
//                  so the two surfaces cannot disagree. `utils/margin/menu-margin.js` reads it.
//   exact        — every line priced (`complete: true`). The totals are the totals.
//
// Only `floor` and `exact` produce numbers. The other three produce nulls, which the panel renders as
// an em dash.

import { parseApiInstant } from '~/utils/workforce/week-range';

// `parseApiInstant` is imported rather than re-implemented ON PURPOSE, and the import crossing a
// module boundary is the lesser evil. The Margin surface returns BOTH kinds of stamp on the same
// document: `pricedAtUtc` and `generatedAtUtc` are computed (`DateTimeKind.Utc`) and serialise with a
// `Z`, while `createdAtUtc`, `effectiveFrom` and `activatedAtUtc` are column-loaded, come back from
// EF as `Unspecified`, and serialise BARE. Newtonsoft is left on its default `RoundtripKind`
// (`Helpers/ServiceCollectionExtensions.cs:160` adds only the enum converter), so nothing on the
// server normalises them. A bare ISO string handed to `new Date()` is parsed as BROWSER-LOCAL, which
// is exactly the defect that shipped on the worker page and was fixed in b65501c. A second copy of
// this parser is how that comes back. It wants to live in a neutral `~/utils/api/instant`; moving it
// edits `utils/workforce/**`, which this lane does not own.

/** The read has not answered. Nothing about the money is known. */
export const COST_UNKNOWN = 'unknown';
/** The read answered and the recipe has no version to price at all. */
export const COST_NOT_COSTED = 'not-costed';
/** A version was priced and not one line resolved. A "total" of 0 that means nothing is known. */
export const COST_NONE_PRICED = 'none-priced';
/** Some lines priced, some did not: the totals are lower bounds ("at least X"). */
export const COST_FLOOR = 'floor';
/** Every line priced. The totals are exact. */
export const COST_EXACT = 'exact';

/** The ingredient list answered and named this line. */
export const NAME_RESOLVED = 'resolved';
/** The ingredient list answered and did NOT contain this id (archived, or removed since). */
export const NAME_UNRESOLVED = 'unresolved';
/** The ingredient list did not answer. We have not been told anything about this id. */
export const NAME_UNKNOWN = 'unknown';

/**
 * A wire number, or null.
 *
 * Exported because `utils/margin/menu-margin.js` needs the SAME reader: both modules depend on the
 * wire's `null` and the wire's `0` staying distinguishable, and the usual `Number(x) || 0` idiom
 * destroys exactly that. One implementation, so the two surfaces cannot drift apart on it.
 */
export function numberOrNull (value) {
  return typeof value === 'number' && isFinite(value) ? value : null;
}

/**
 * One priced component line.
 *
 * `lineCostMinor` IS READ ONLY BEHIND `incomplete`. The wire sends 0 for a line it could not price —
 * the calculator's own `return (0m, false, null)` — and that 0 means "unpriced", not "free". A
 * consumer that rendered it as `kr 0,00` would tell a venue an unpriced ingredient costs nothing,
 * which is the single most expensive thing this surface could say. The flag wins even over a number
 * that somehow arrived beside it.
 */
function readLine (line, names) {
  const incomplete = line.incomplete === true;
  const ingredientId = line.ingredientId || null;
  const subRecipeId = line.subRecipeId || null;

  let name = null;
  let nameState = NAME_UNKNOWN;
  if (names) {
    if (ingredientId && Object.prototype.hasOwnProperty.call(names, ingredientId)) {
      name = names[ingredientId];
      nameState = NAME_RESOLVED;
    } else if (ingredientId) {
      // The list answered and does not contain this id — an archived or since-removed ingredient.
      // A positive answer, and a different one from "we never got the list".
      nameState = NAME_UNRESOLVED;
    }
  }

  return {
    componentId: line.componentId || null,
    ingredientId,
    subRecipeId,
    // A component references EXACTLY ONE of the two (a DB CHECK, spec §3 entity 10). A line carrying
    // neither is a row planted past that guard; the backend surfaces it as incomplete rather than
    // costing it, and so does this.
    isSubRecipe: !!subRecipeId,
    isOrphan: !ingredientId && !subRecipeId,
    name,
    nameState,
    quantity: numberOrNull(line.quantity),
    unitCode: line.unitCode || null,
    incomplete,
    lineCostMinor: incomplete ? null : numberOrNull(line.lineCostMinor)
  };
}

/** `{ ingredientId: name }` from a `GET /margin/ingredients` body, or null when it did not answer. */
export function ingredientNames (listResponse) {
  if (!listResponse || !Array.isArray(listResponse.ingredients)) { return null; }
  const map = {};
  for (const item of listResponse.ingredients) {
    if (item && item.ingredientId) { map[item.ingredientId] = item.name || null; }
  }
  return map;
}

/**
 * Reads a `GET|POST /margin/recipes/{id}` detail document into the cost model.
 *
 * `detail` — the response body, or null/undefined while unknown.
 * `names`  — from `ingredientNames`, or null when that read did not answer.
 *
 * WHICH VERSION WAS PRICED IS NOT ON THE WIRE, and the distinction is the difference between "what
 * the menu costs" and "what a draft would cost". `MarginRecipeService.GetAsync` previews the ACTIVE
 * version when there is one and otherwise falls back to the latest Draft, and the response says only
 * which version id it used. The comparison is done once, here, so the page cannot get it wrong.
 */
export function readCostPreview (detail, names) {
  if (!detail || typeof detail !== 'object') { return emptyCost(COST_UNKNOWN); }

  const preview = detail.costPreview;
  if (!preview || typeof preview !== 'object') { return emptyCost(COST_NOT_COSTED); }

  const lines = (Array.isArray(preview.lines) ? preview.lines : []).map(line => readLine(line, names));
  const unpricedLineCount = lines.filter(line => line.incomplete).length;
  const pricedLineCount = lines.length - unpricedLineCount;

  const complete = preview.complete === true;
  // `none-priced` can only be reached with `complete: false`, and `complete` is only ever false
  // because some line failed — so a version with NO lines at all is `exact` with a true zero, which
  // is the right answer: an empty recipe genuinely costs nothing.
  let state = COST_EXACT;
  if (!complete) { state = pricedLineCount === 0 ? COST_NONE_PRICED : COST_FLOOR; }

  const showsAmount = state === COST_EXACT || state === COST_FLOOR;

  const active = detail.activeVersion || null;
  const versionId = preview.recipeVersionId || null;
  const pricedVersion = findVersion(detail, versionId);

  return {
    state,
    // Read from the preview's OWN fields. Never `sum(lines)` — see the header.
    totalCostMinor: showsAmount ? numberOrNull(preview.totalCostMinor) : null,
    perPortionCostMinor: showsAmount ? numberOrNull(preview.perPortionCostMinor) : null,
    currency: preview.currency || null,
    isFloor: state === COST_FLOOR,
    pricedAt: parseApiInstant(preview.pricedAtUtc),
    recipeVersionId: versionId,
    pricedVersionNumber: pricedVersion ? numberOrNull(pricedVersion.versionNumber) : null,
    // The yield the batch total is FOR, and the portion count the per-portion figure was divided by.
    // Not money — recipe facts — but without them the two amounts are two numbers with no unit, and
    // "kr 412,00" means nothing until you know it buys 20 portions out of 4 litres.
    portionCount: pricedVersion ? numberOrNull(pricedVersion.portionCount) : null,
    yieldQuantity: pricedVersion ? numberOrNull(pricedVersion.yieldQuantity) : null,
    yieldUnit: pricedVersion ? (pricedVersion.yieldUnit || null) : null,
    // Null, not false, when there is no id to compare against: "we cannot tell which version this
    // priced" is not the same claim as "it priced a draft".
    pricedVersionIsActive: versionId && active ? active.recipeVersionId === versionId : (versionId ? false : null),
    lines,
    lineCount: lines.length,
    pricedLineCount,
    unpricedLineCount,
    // The server's own prose, carried but NOT rendered: each sentence embeds a raw Guid
    // ("Ingredient {guid} has no effective price…"), and a venue cannot read a Guid. The panel says
    // the same thing per line, against the ingredient's name. Kept on the model so a support case can
    // still reach it.
    incompleteReasons: Array.isArray(preview.incompleteReasons) ? preview.incompleteReasons.slice() : []
  };
}

function findVersion (detail, versionId) {
  if (!versionId) { return null; }
  if (detail.activeVersion && detail.activeVersion.recipeVersionId === versionId) { return detail.activeVersion; }
  for (const draft of detail.draftVersions || []) {
    if (draft && draft.recipeVersionId === versionId) { return draft; }
  }
  return null;
}

function emptyCost (state) {
  return {
    state,
    totalCostMinor: null,
    perPortionCostMinor: null,
    currency: null,
    isFloor: false,
    pricedAt: null,
    recipeVersionId: null,
    pricedVersionNumber: null,
    portionCount: null,
    yieldQuantity: null,
    yieldUnit: null,
    pricedVersionIsActive: null,
    lines: [],
    lineCount: 0,
    pricedLineCount: 0,
    unpricedLineCount: 0,
    incompleteReasons: []
  };
}

/**
 * One row of the recipe list.
 *
 * `createdAtUtc` is a COLUMN-LOADED stamp and arrives bare (no `Z`) — see the note on the
 * `parseApiInstant` import. `activeVersionNumber` is nullable on the wire and its null is a real
 * answer ("no version is active"), so it stays null rather than collapsing to 0.
 */
export function readRecipeRow (item) {
  return {
    recipeId: item.recipeId || null,
    name: item.name || null,
    kind: item.kind || null,
    revision: item.revision || null,
    activeVersionNumber: numberOrNull(item.activeVersionNumber),
    draftVersionCount: numberOrNull(item.draftVersionCount),
    activeProductLinkCount: numberOrNull(item.activeProductLinkCount),
    createdAt: parseApiInstant(item.createdAtUtc)
  };
}

/**
 * The Draft version this surface may activate, or null.
 *
 * Activation is the one aggregate mutation here, and it needs the DRAFT's own revision — not the
 * recipe header's, which the detail document also carries under the same field name one level up.
 * Returning the whole version object keeps that mix-up from being possible at the call site.
 */
export function activatableDraft (detail) {
  const drafts = (detail && detail.draftVersions) || [];
  if (!drafts.length) { return null; }
  return drafts.reduce((best, d) => (!best || (d.versionNumber || 0) > (best.versionNumber || 0) ? d : best), null);
}
