// The Margin MENU-MARGIN model: the pure function between what `GET /margin/menu-margin` answered and
// what the page draws. No Vue, no network — so the rules below are testable on their own.
//
// THE LAW, unchanged from `cost-preview.js` and sharper here because this read is the one a venue
// prices a dish off: NOTHING IS ADDED UP OR SUBTRACTED HERE. `contributionMinor` looks like
// `netPriceMinor − plateCostMinor` and is NOT recomputed as one. The backend rounds the plate cost
// half-up ONCE after multiplying the batch cost by the link's quantity per sold unit, so a
// client-side subtraction of two already-rounded figures can disagree with the server's own — and the
// module's whole point is that a dish's menu margin and its share of the weekly statement cannot
// disagree (`Services/Margin/MarginMenuMarginService.cs`). Every figure below is one field off the
// wire; an absent field renders as nothing.
//
// THE THREE STATES OF A PLATE COST, which the backend keeps apart on purpose and this module must not
// collapse (`MarginMenuMarginReadTests.MB4_a_dish_that_earns_exactly_zero_…`):
//
//   absent  — `plateCostMinor: null`. There is no cost side at all: the product is linked to no
//             recipe, or the linked recipe has no version active at the read instant. Not a zero.
//   floor   — `costComplete: false` with a number. That number is a LOWER BOUND ("at least X"): the
//             priced lines only. `0` here means NOTHING could be priced — still a bound, still not a
//             cost.
//   exact   — `costComplete: true`. The cost, including a genuine `0` for a version with no
//             components, which is a FACT and not an unknown.
//
// A manager acts on those three in different directions — reprice, investigate, ignore — so they get
// three different renderings, and a zero bound may never become "0 % food cost", the most dangerous
// wrong answer on the surface because it makes an uncosted dish look like the best on the menu.
//
// AND THE RATIO IS NOT MONEY. `foodCostPercent` arrives as an EXACT decimal in percentage POINTS
// (0–100), never as a fraction and never in minor units. It is rounded to 2 dp at presentation only,
// through the locale number formatter — never through the admin's money formatter, which would print
// a percentage as kroner. The backend carries a reflection pin asserting every `*Minor` is a `long`
// and that this field is not named like money; the same discipline is kept here by giving it its own
// reader and its own renderer.

import { numberOrNull } from '~/utils/margin/cost-preview';
import { parseApiInstant } from '~/utils/workforce/week-range';

/** The read has not answered (or failed). Nothing about any dish's margin is known. */
export const MENU_MARGIN_UNKNOWN = 'unknown';
/** The read answered. Individual rows may still withhold individual figures. */
export const MENU_MARGIN_READY = 'ready';

/** `plateCostMinor` is null: no recipe link, or no version active at the read instant. */
export const PLATE_ABSENT = 'absent';
/** `costComplete: false` — the number is a lower bound, not a cost. */
export const PLATE_FLOOR = 'floor';
/** `costComplete: true` — the cost, including a genuine zero. */
export const PLATE_EXACT = 'exact';

/** The dish carries no menu price, so no margin exists to quote (`netPriceMinor` null). */
export const BLOCKED_NO_PRICE = 'no-price';
/** There is no cost side at all (`plateCostMinor` null). */
export const BLOCKED_NO_COST = 'no-cost';
/** Some component of the linked version could not be priced, so the cost is only a bound. */
export const BLOCKED_COST_INCOMPLETE = 'cost-incomplete';

/** The price bases the backend emits, in the order it emits them. */
export const BASIS_BASE = 'Base';
export const BASIS_TABLE = 'Table';
export const BASIS_DELIVERY = 'Delivery';

function plateState (row) {
  if (row.plateCostMinor === null) { return PLATE_ABSENT; }
  return row.costComplete ? PLATE_EXACT : PLATE_FLOOR;
}

/**
 * Why a row's contribution and food-cost percent are absent — never guessed, and never reduced to one
 * reason when two apply.
 *
 * The backend withholds BOTH derived figures unless the cost is complete AND the price is known, so a
 * dish that is neither priced nor fully costed has two things wrong with it and a venue has to fix
 * both. Collapsing that to a single sentence would send someone to price a dish whose recipe is also
 * unpriced, and they would be back tomorrow.
 */
function blockers (row) {
  const reasons = [];
  if (row.netPriceMinor === null) { reasons.push(BLOCKED_NO_PRICE); }
  if (row.plateCostMinor === null) { reasons.push(BLOCKED_NO_COST); } else if (!row.costComplete) { reasons.push(BLOCKED_COST_INCOMPLETE); }
  return reasons;
}

/**
 * One (product × price basis) row.
 *
 * EVERY NULLABLE FIELD STAYS NULL. `numberOrNull` is used rather than `Number(x) || 0` precisely
 * because the wire's `null` and the wire's `0` are different facts on four of these fields, and the
 * coalescing idiom destroys the distinction the whole read exists to preserve.
 */
export function readMenuMarginRow (row) {
  const read = {
    productId: row.productId || null,
    productName: row.productName || null,
    goodsGroupName: row.goodsGroupName || null,
    productHidden: row.productHidden === true,
    recipeId: row.recipeId || null,
    recipeName: row.recipeName || null,
    quantityPerSoldUnit: numberOrNull(row.quantityPerSoldUnit),
    // The link points at a product the catalog has deleted or hidden. Surfaced, never dropped.
    linkBroken: row.linkBroken === true,
    priceBasis: row.priceBasis || null,
    vatPercent: numberOrNull(row.vatPercent),
    grossPriceMinor: numberOrNull(row.grossPriceMinor),
    // Pant sits INSIDE the gross and OUTSIDE the VAT base. It is shown so the net does not look like
    // arithmetic that failed: gross minus VAT-on-gross is not the net when a deposit is involved.
    depositMinor: numberOrNull(row.depositMinor),
    netPriceMinor: numberOrNull(row.netPriceMinor),
    plateCostMinor: numberOrNull(row.plateCostMinor),
    contributionMinor: numberOrNull(row.contributionMinor),
    // A ratio in percentage points. Not money, not a fraction, and never formatted as either.
    foodCostPercent: numberOrNull(row.foodCostPercent),
    costComplete: row.costComplete === true
  };

  read.plateState = plateState(read);
  read.blockers = read.contributionMinor === null ? blockers(read) : [];
  return read;
}

/**
 * Reads a `GET /margin/menu-margin` body into the model, or the UNKNOWN state when it did not answer.
 *
 * A failed read is never rendered as "this store has no priced dishes": the two are different claims
 * and only one of them is about the menu.
 */
export function readMenuMargin (response) {
  if (!response || typeof response !== 'object' || !Array.isArray(response.rows)) {
    return {
      state: MENU_MARGIN_UNKNOWN,
      currency: null,
      pricedAt: null,
      rows: [],
      products: [],
      unsoldRecipeIds: []
    };
  }

  const rows = response.rows.map(readMenuMarginRow);

  return {
    state: MENU_MARGIN_READY,
    currency: response.currency || null,
    // A computed stamp, so it carries a `Z` — but it goes through `parseApiInstant` all the same,
    // because the same document elsewhere carries bare column-loaded stamps and one `new Date(iso)`
    // on this surface is how a bare stamp gets read as browser-local.
    pricedAt: parseApiInstant(response.pricedAtUtc),
    rows,
    // Every product in the catalog, once, in the order the read returned them. This is also the only
    // catalog the Margin surface has: the module deliberately owns no product endpoint of its own.
    products: distinctProducts(rows),
    // Sellable recipes nobody sells. A recipe here has a cost and no price, which is a different fact
    // from "we could not compute its margin".
    unsoldRecipeIds: (Array.isArray(response.unlinkedRecipes) ? response.unlinkedRecipes : [])
      .map(r => (r && r.recipeId) || null)
      .filter(Boolean)
  };
}

function distinctProducts (rows) {
  const seen = {};
  const products = [];
  for (const row of rows) {
    if (!row.productId || seen[row.productId]) { continue; }
    seen[row.productId] = true;
    products.push({
      productId: row.productId,
      productName: row.productName,
      goodsGroupName: row.goodsGroupName,
      productHidden: row.productHidden,
      // Which recipe already claims this product, if any. The backend allows at most ONE active link
      // per product, so linking a claimed product to a second recipe is refused
      // (`margin.product-link-invalid`) — the picker says so before the round trip.
      recipeId: row.recipeId,
      recipeName: row.recipeName
    });
  }
  return products;
}

/**
 * The dishes one recipe is sold as, grouped by product and keeping the wire's row order within each.
 *
 * ALL THREE PRICE BASES ARE KEPT. Which channels a venue actually sells through is not knowable from
 * the catalog, so the backend answers all three deliberately; dropping the ones a venue "probably"
 * does not use would be a lie where a redundant row is not. The basis travels with the figure because
 * servering and take-away carry different VAT, and a food-cost percentage without its basis is not a
 * number.
 */
export function dishesForRecipe (model, recipeId) {
  if (!model || model.state !== MENU_MARGIN_READY || !recipeId) { return []; }

  const byProduct = {};
  const dishes = [];
  for (const row of model.rows) {
    if (row.recipeId !== recipeId) { continue; }
    let dish = byProduct[row.productId];
    if (!dish) {
      dish = {
        productId: row.productId,
        productName: row.productName,
        goodsGroupName: row.goodsGroupName,
        productHidden: row.productHidden,
        linkBroken: row.linkBroken,
        quantityPerSoldUnit: row.quantityPerSoldUnit,
        bases: []
      };
      byProduct[row.productId] = dish;
      dishes.push(dish);
    }
    dish.bases.push(row);
  }
  return dishes;
}

/** True when the read named this recipe as one nobody sells. */
export function isRecipeUnsold (model, recipeId) {
  return !!(model && model.state === MENU_MARGIN_READY && recipeId &&
    model.unsoldRecipeIds.includes(recipeId));
}

/**
 * The recipe's own product links, read from `GET /margin/recipes/{id}/product-links`.
 *
 * THIS IS NOT THE SAME LIST AS THE MENU-MARGIN ROWS, and the difference is why the second read
 * exists. The menu margin is built from the CATALOG, so a link pointing at a product the catalog no
 * longer has produces no row at all. The link surface reports it, flagged broken. Seeding the editor
 * from the menu margin instead would make the next save — a replace-set — silently delete a link the
 * venue was never shown.
 */
export function readProductLinks (response) {
  if (!response || !Array.isArray(response.links)) { return null; }
  return response.links
    .filter(link => link && link.isActive === true)
    .map(link => ({
      productId: link.productId || null,
      quantityPerSoldUnit: numberOrNull(link.quantityPerSoldUnit),
      productName: link.productName || null,
      goodsGroupName: link.goodsGroupName || null,
      productHidden: link.productHidden === true,
      isBroken: link.isBroken === true
    }));
}
