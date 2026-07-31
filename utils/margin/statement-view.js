// The read models for the weekly margin statement, and the ONE place its honest states are decided.
//
// NOTHING HERE ADDS MONEY UP OR TAKES IT AWAY. Every figure is one field off the wire. In particular
// `covered + uncovered == net` is a reconciliation the BACKEND pins (MJ-E2E-09 asserts it on the
// server's own numbers); recomputing either side here would put a figure on screen that the statement
// does not contain, in the one module whose whole purpose is that the two agree. The same goes for the
// gap: it arrives as `gapPercentagePoints` and is never `actual% − theoretical%` computed in a browser.
//
// WHAT THIS FILE IS ACTUALLY FOR: telling ZERO from UNKNOWN, which the wire does not do for itself.
//
//   • `netFoodSalesMinor`, `theoreticalIngredientCostMinor` and `actualPurchaseSpendMinor` are
//     non-nullable `long` columns. A statement that has never been calculated carries their column
//     DEFAULTS — three zeros — which are not answers. `calculationTimestampUtc` is the only field that
//     says whether a calculation ever ran, so every figure is withheld until it is present.
//   • `coveredNetSalesMinor`, `uncoveredNetSalesMinor`, `theoreticalCostComplete`, `recipeVersionIds`
//     and `currency` are not columns at all: the server reads them out of `inputReceiptJson` and falls
//     back to `0 / 0 / false / [] / the store's current currency` when that JSON is missing or does not
//     parse. Those fallbacks are indistinguishable from real answers on the wire, so this file parses
//     the receipt itself and withholds them when it is absent or unreadable. A covered figure of 0
//     against a net of 16 400 would otherwise read as "no sale this week was linked to a recipe".
//   • every percentage is `decimal?` and is NULL when net food sales is zero — division undefined. It
//     renders as the unknown mark and never as `0,00 %`.
//   • `theoreticalCostComplete === false` means the theoretical cost is a LOWER BOUND: the percentage
//     built on it UNDERSTATES food cost by an unknown amount. It is surfaced as "at least X" for the
//     same reason the recipe cost preview does, because this is the number a venue compares against a
//     target.
//
// Instants (`calculationTimestampUtc`, `finalizedAtUtc`, `priceFreshnessAsOfUtc`, `generatedAtUtc`) go
// through `parseApiInstant` — see the note in `~/utils/margin/cost-preview`, which imports it for the
// same reason: this surface returns both computed (`Z`-suffixed) and column-loaded (bare) stamps on
// one document, and a bare ISO string handed to `new Date()` is parsed as BROWSER-LOCAL.
//
// CALENDAR DATES (`periodStart`, `periodEnd`, `spendDate`) are deliberately NOT parsed into a `Date`
// at all. They are the store's calendar days, they arrive in both the `Z` and the bare form on the same
// document depending on whether EF loaded the row or the service just wrote it, and every conversion
// to a browser `Date` is a chance to display the day before. The ISO `yyyy-MM-dd` prefix is taken as a
// string and rendered as a string.

import { parseApiInstant } from '~/utils/workforce/week-range';

/** The read has not answered. Nothing about this statement is known. */
export const STATEMENT_UNKNOWN = 'unknown';
/** The read answered and no calculation has ever run: the money columns hold defaults, not figures. */
export const STATEMENT_UNCALCULATED = 'uncalculated';
/** Open: the inputs are editable and the figures are as of the last recalculation. */
export const STATEMENT_OPEN = 'open';
/** Finalized: the figures and the input receipt are frozen, and every mutation is refused. */
export const STATEMENT_FINALIZED = 'finalized';

/** The input receipt parsed and its fields are answers. */
export const RECEIPT_READ = 'read';
/** There is no receipt on the wire: the coverage split and the version list are unknown. */
export const RECEIPT_ABSENT = 'absent';
/** A receipt is present and did not parse: the same fields are unknown, for a different reason. */
export const RECEIPT_UNREADABLE = 'unreadable';

/** A wire integer, or null. Never coerces a string, an empty value or a NaN into a number. */
function longOrNull (value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * The `yyyy-MM-dd` prefix of a wire calendar date, or null.
 *
 * A string is required: this refuses to render a day it had to choose a timezone to work out.
 *
 * Not `businessDateKey` from `~/utils/workforce/week-range`, which is the same idea with a looser
 * guard — it takes `slice(0, 10)` of anything at least ten characters long, so a malformed value comes
 * back as a ten-character fragment that renders as though it were a date. On this surface the value
 * ends up beside money as the week it belongs to, so an unrecognised shape has to become null.
 */
export function readCalendarDate (value) {
  if (typeof value !== 'string') { return null; }
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : null;
}

function readReceipt (json) {
  if (json === null || json === undefined || json === '') { return { state: RECEIPT_ABSENT, receipt: null }; }
  if (typeof json !== 'string') { return { state: RECEIPT_UNREADABLE, receipt: null }; }
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object'
      ? { state: RECEIPT_READ, receipt: parsed }
      : { state: RECEIPT_UNREADABLE, receipt: null };
  } catch (e) {
    return { state: RECEIPT_UNREADABLE, receipt: null };
  }
}

/**
 * One spend line as entered, ready for both the read-only list and the editor.
 *
 * `supplierId` is carried through UNCHANGED whether or not the supplier list can name it. The save is
 * a replace-set, so an attribution this screen could not resolve would otherwise be deleted by the
 * next save without ever being shown.
 */
function readSpendEntry (entry) {
  return {
    id: entry.id || null,
    spendDate: readCalendarDate(entry.spendDate),
    supplierId: entry.supplierId || null,
    amountMinor: longOrNull(entry.amountMinor),
    currency: entry.currency || null,
    note: entry.note || null
  };
}

/**
 * The full statement, with every figure either an answer or an explicit unknown.
 *
 * `detail` is the raw `MarginStatementDetailResponse`, or null when the read has not answered.
 */
export function readStatement (detail) {
  if (!detail || typeof detail !== 'object') {
    return {
      state: STATEMENT_UNKNOWN,
      statementId: null,
      periodStart: null,
      periodEnd: null,
      revisionNumber: null,
      previousStatementId: null,
      currency: null,
      receiptState: RECEIPT_ABSENT,
      netFoodSalesMinor: null,
      theoreticalIngredientCostMinor: null,
      actualPurchaseSpendMinor: null,
      openingStockValueMinor: null,
      closingStockValueMinor: null,
      coveredNetSalesMinor: null,
      uncoveredNetSalesMinor: null,
      theoreticalFoodCostPercent: null,
      actualFoodCostPercent: null,
      gapPercentagePoints: null,
      coveragePercent: null,
      theoreticalCostComplete: null,
      theoreticalCostExcludedCurrencies: [],
      projectionWatermark: null,
      recipeVersionIds: null,
      priceFreshnessAsOf: null,
      calculatedAt: null,
      finalizedAt: null,
      spendEntries: [],
      revision: null,
      canMutate: false
    };
  }

  const { state: receiptState, receipt } = readReceipt(detail.inputReceiptJson);
  const receiptRead = receiptState === RECEIPT_READ;

  // The one field that says whether ANY calculation has run. Without it the three money columns are
  // schema defaults and the percentages are null for a reason that has nothing to do with zero sales.
  const calculatedAt = parseApiInstant(detail.calculationTimestampUtc);
  const calculated = calculatedAt !== null;

  const finalized = detail.state === 'Finalized';
  const revision = detail.revision || null;

  return {
    state: !calculated ? STATEMENT_UNCALCULATED : (finalized ? STATEMENT_FINALIZED : STATEMENT_OPEN),
    statementId: detail.statementId || null,
    periodStart: readCalendarDate(detail.periodStart),
    periodEnd: readCalendarDate(detail.periodEnd),
    revisionNumber: longOrNull(detail.revisionNumber),
    previousStatementId: detail.previousStatementId || null,

    // Off the receipt when there is one, because that is the currency the figures were PRODUCED in.
    // The server's fallback is the store's currency TODAY, which is a different claim about a frozen
    // statement, so it is only accepted when there is no receipt to disagree with it.
    //
    // `Currency` before `currency`: the receipt is written with a bare `JsonConvert.SerializeObject`
    // and NOT through the MVC pipeline, so it keeps its PascalCase property names while the document
    // carrying it is camelCased. Both spellings are accepted rather than pinning the one that happens
    // to be true today.
    currency: (receiptRead ? receipt.Currency || receipt.currency : null) || detail.currency || null,
    receiptState,

    // Withheld wholesale until a calculation has run: a `0` here would be the column default.
    netFoodSalesMinor: calculated ? longOrNull(detail.netFoodSalesMinor) : null,
    theoreticalIngredientCostMinor: calculated ? longOrNull(detail.theoreticalIngredientCostMinor) : null,
    actualPurchaseSpendMinor: calculated ? longOrNull(detail.actualPurchaseSpendMinor) : null,

    // The two stock estimates are genuinely nullable columns the venue either entered or did not, so
    // they are read straight through and are meaningful before any calculation.
    openingStockValueMinor: longOrNull(detail.openingStockValueMinor),
    closingStockValueMinor: longOrNull(detail.closingStockValueMinor),

    // Receipt-derived: the server answers 0 for both when it cannot read the receipt, and 0 covered
    // against a non-zero net is a claim ("nothing sold was linked to a recipe") rather than a silence.
    coveredNetSalesMinor: calculated && receiptRead ? longOrNull(detail.coveredNetSalesMinor) : null,
    uncoveredNetSalesMinor: calculated && receiptRead ? longOrNull(detail.uncoveredNetSalesMinor) : null,

    // Real `decimal?` columns: null means net food sales was zero and the ratio is undefined.
    theoreticalFoodCostPercent: calculated ? numberOrNull(detail.theoreticalFoodCostPercent) : null,
    actualFoodCostPercent: calculated ? numberOrNull(detail.actualFoodCostPercent) : null,
    gapPercentagePoints: calculated ? numberOrNull(detail.gapPercentagePoints) : null,
    coveragePercent: calculated ? numberOrNull(detail.coveragePercent) : null,

    // Tri-state on purpose. `false` is the server's fallback when the receipt is unreadable, and
    // "we cannot tell whether the cost is complete" must not render as "the cost is incomplete".
    theoreticalCostComplete: calculated && receiptRead ? detail.theoreticalCostComplete === true : null,
    theoreticalCostExcludedCurrencies: receiptRead && Array.isArray(detail.theoreticalCostExcludedCurrencies)
      ? detail.theoreticalCostExcludedCurrencies.slice()
      : [],

    projectionWatermark: longOrNull(detail.projectionWatermark),
    // Null, not `[]`: an empty array is "the explosion used no recipe version", which is a finding.
    recipeVersionIds: receiptRead && Array.isArray(detail.recipeVersionIds) ? detail.recipeVersionIds.slice() : null,
    priceFreshnessAsOf: parseApiInstant(detail.priceFreshnessAsOfUtc),
    calculatedAt,
    finalizedAt: parseApiInstant(detail.finalizedAtUtc),

    spendEntries: Array.isArray(detail.spendEntries) ? detail.spendEntries.map(readSpendEntry) : [],

    revision,
    /**
     * Whether this screen may mutate the statement AT ALL: it must be Open, and it must carry the
     * revision every aggregate mutation puts in `If-Match`. A finalized statement is refused by the
     * server; a revisionless one is refused by the client before the request leaves.
     */
    canMutate: !finalized && !!revision
  };
}

/** A wire decimal, or null. Percentages arrive exact and are rounded at presentation only. */
function numberOrNull (value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * The statement list, newest week first — the server's own order, preserved.
 *
 * A row's figures come from the same nullable/receipt-backed fields as the detail, so the same
 * withholding applies: a list row cannot say whether a calculation ran (the summary carries no
 * `calculationTimestampUtc`), so its money is shown only alongside its state and its percentages are
 * the unknown mark whenever the server sent null.
 */
export function readStatementRows (response) {
  if (!response || !Array.isArray(response.statements)) { return null; }
  return response.statements.map(row => ({
    statementId: row.statementId || null,
    periodStart: readCalendarDate(row.periodStart),
    periodEnd: readCalendarDate(row.periodEnd),
    revisionNumber: longOrNull(row.revisionNumber),
    previousStatementId: row.previousStatementId || null,
    finalized: row.state === 'Finalized',
    netFoodSalesMinor: longOrNull(row.netFoodSalesMinor),
    theoreticalFoodCostPercent: numberOrNull(row.theoreticalFoodCostPercent),
    actualFoodCostPercent: numberOrNull(row.actualFoodCostPercent),
    gapPercentagePoints: numberOrNull(row.gapPercentagePoints),
    coveragePercent: numberOrNull(row.coveragePercent),
    // The summary's own honesty flag: false here is authoritative (the server read the row's receipt
    // to produce it), unlike the detail's, so it is a plain boolean.
    theoreticalCostComplete: row.theoreticalCostComplete === true,
    currency: row.currency || null,
    finalizedAt: parseApiInstant(row.finalizedAtUtc)
  }));
}

/**
 * The coverage diagnostic: what the statement's coverage percentage is MADE OF.
 *
 * The uncovered buckets are returned net-descending by the server and are passed through in that
 * order. The open-price bucket (`isOpenPrice`, a null product id — an open-price sale or a referenced
 * return) is first-class here and is never filtered out: it is frequently the largest single reason a
 * week's coverage is short, and dropping it would make the remainder look like the whole story.
 */
export function readCoverage (response) {
  if (!response || typeof response !== 'object') { return null; }
  return {
    fromDate: readCalendarDate(response.fromDate),
    toDate: readCalendarDate(response.toDate),
    coveragePercent: numberOrNull(response.coveragePercent),
    netFoodSalesMinor: longOrNull(response.netFoodSalesMinor),
    coveredNetSalesMinor: longOrNull(response.coveredNetSalesMinor),
    uncoveredNetSalesMinor: longOrNull(response.uncoveredNetSalesMinor),
    currency: response.currency || null,
    uncoveredTopSellers: (response.uncoveredTopSellers || []).map(line => ({
      productId: line.productId || null,
      isOpenPrice: line.isOpenPrice === true,
      productName: line.productNameSnapshot || null,
      netSalesMinor: longOrNull(line.netSalesMinor),
      lineCount: longOrNull(line.lineCount)
    })),
    brokenLinks: (response.brokenLinks || []).map(link => ({
      linkId: link.linkId || null,
      recipeId: link.recipeId || null,
      recipeName: link.recipeName || null,
      productId: link.productId || null,
      detectedAt: parseApiInstant(link.brokenDetectedAtUtc)
    })),
    priceFreshness: (response.priceFreshness || []).map(line => ({
      supplierId: line.supplierId || null,
      supplierName: line.supplierName || null,
      latestPriceEffectiveFrom: parseApiInstant(line.latestPriceEffectiveFromUtc),
      // Null is "this supplier has no priced item at all", which is a different state from 0 days old.
      priceAgeDays: longOrNull(line.priceAgeDays),
      itemsWithPrice: longOrNull(line.itemsWithPrice),
      itemsWithoutPrice: longOrNull(line.itemsWithoutPrice)
    })),
    projectionWatermark: longOrNull(response.projectionWatermark)
  };
}

/**
 * The supplier list as an id → name lookup, or null when the read did not answer.
 *
 * Null rather than `{}` so a spend line attributed to a supplier can say "we could not fetch the
 * supplier names" instead of "this supplier no longer exists" — two different claims, and only one of
 * them is about the store's data.
 */
export function readSupplierNames (response) {
  if (!Array.isArray(response)) { return null; }
  const names = {};
  for (const supplier of response) {
    if (supplier && supplier.supplierId) { names[supplier.supplierId] = supplier.name || null; }
  }
  return names;
}
