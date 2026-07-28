// The view model behind the venue's Meals surface: two independent reads in, one shape out.
//
// It is pure — no fetching, no Vue, no formatting — so every distinction it draws is unit-testable
// without a network and without a DOM. The page owns WHEN to read; this owns WHAT the two answers
// (or two failures) mean together.
//
// THE THREE-STATE RULE, inherited from `utils/workforce/week-grid.js` and not softened here:
//
//   unknown  — the read did not answer. Nothing may be said about the store's agreements or orders.
//   loaded   — the read answered. Its row count is then a FACT, zero included.
//   ...and a loaded-but-empty list is a positive claim ("this store has no company agreements"),
//      which is why it is never the fallback for a failure.
//
// THE MONEY RULE. Every figure here is one server-computed integer copied through unchanged. This
// module adds, subtracts and totals nothing:
//
//   • The API exposes no rollup on either read — no store total, no per-company total, no
//     per-order remainder. Meals settles CREDIT SALES ON A COMPANY ACCOUNT (SAF-T transType 11002,
//     payment medium 12006), so these are fiscal figures: the backend rounds each unit once and
//     rounds a rollup once over the UNROUNDED sum. A client-side sum of the rounded units is a
//     different number from the one the backend would have produced, and it is the number that
//     would end up on a bill. Where the API shows no figure, this shows none.
//   • A store can hold agreements in DIFFERENT currencies at once (the directory carries a currency
//     per agreement), so even a "harmless" column total would be adding francs to kroner.
//   • Amounts are validated as safe integers before they are treated as money. A non-integer minor
//     value is not money we will print; it becomes unknown rather than being rendered as though the
//     backend had sent it.

import { parseApiInstant } from '~/utils/workforce/week-range';

/** A read that did not answer. Never rendered as an empty list. */
export const DATA_UNKNOWN = 'unknown';

/** A read that answered. Its contents — including emptiness — are then a fact. */
export const DATA_LOADED = 'loaded';

/** The order's capture is a real, server-computed figure and is rendered. */
export const CAPTURE_KNOWN = 'known';

/**
 * Nothing has been captured against this order yet: the attribution carries no `capturedAtUtc` AND
 * the net allocation sum is zero.
 *
 * This is NOT rendered as "0,00". The backend computes `capturedMinor` as `SUM(GrossMinor) ?? 0`
 * over the reservation's allocation rows, so a reservation that has produced no allocation at all
 * answers 0 — the same wire value as a sale that was captured and then fully reversed. Those are
 * two different facts about somebody's money and the surface keeps them apart: a zero that means
 * "not yet" is a dash, a zero that means "captured, then reversed to nothing" is a zero.
 */
export const CAPTURE_NONE = 'none';

/** The wire carried no usable capture figure at all. Distinct from both of the above. */
export const CAPTURE_UNKNOWN = 'unknown';

/**
 * A money amount the API stated, or null.
 *
 * `Number.isSafeInteger` rather than `Number.isInteger`: the wire type is a C# `long`, whose range
 * exceeds JS's exact-integer range. A value past 2^53 has already lost øre by the time it reaches
 * here, and a lost øre on a credit-sale statement line is a real defect, so it is refused rather
 * than printed.
 */
function money (minor, currency) {
  if (!Number.isSafeInteger(minor)) { return null; }
  return { minor, currency: typeof currency === 'string' && currency ? currency : null };
}

/** A count the API stated, or null. Zero is a count; absent is not. */
function count (value) {
  return Number.isSafeInteger(value) ? value : null;
}

function text (value) {
  return typeof value === 'string' && value.length ? value : null;
}

/**
 * One directory row = one company that has an agreement with this store.
 *
 * `displayName` is the company's chosen label and `legalName` is its registered one; the backend
 * orders on `displayName ?? legalName` and that fallback is repeated here so the label a venue
 * reads matches the order the list arrived in. Neither is invented: a row carrying neither has a
 * null label and the component shows a dash, because a company with no readable name is a data
 * problem to see rather than a blank to fill with an id.
 */
function agreementRow (entry) {
  const e = entry || {};
  const displayName = text(e.displayName);
  const legalName = text(e.legalName);
  return {
    companyId: text(e.companyId),
    label: displayName || legalName,
    displayName,
    legalName,
    // Shown only when it differs from the label, so a company that uses its legal name as its
    // display name does not get the same string printed twice.
    secondaryName: displayName && legalName && displayName !== legalName ? legalName : null,
    organizationNumber: text(e.organizationNumber),
    companyStatus: text(e.companyStatus),
    agreementId: text(e.agreementId),
    agreementStatus: text(e.agreementStatus),
    currency: text(e.currency),
    activeMemberCount: count(e.activeMemberCount)
  };
}

/**
 * One attributed order = one funded order.
 *
 * Timestamps go through `parseApiInstant`, never `new Date(iso)`. `boundAtUtc` and `capturedAtUtc`
 * are loaded straight off `datetime2` columns, so Newtonsoft serialises them BARE — no `Z`, no
 * offset — and `new Date('2026-07-28T22:30:00')` is read by JS as browser-local wall clock. That is
 * the defect that shipped on the workforce surface and was fixed in b65501c; it is an offset-sized
 * error on an instant that decides which day a sale happened.
 */
function orderRow (order, knownCompanyIds) {
  const o = order || {};
  const companyId = text(o.companyId);
  const currency = text(o.currency);
  const capturedAt = parseApiInstant(o.capturedAtUtc);
  const capturedMinor = Number.isSafeInteger(o.capturedMinor) ? o.capturedMinor : null;

  let captureState = CAPTURE_UNKNOWN;
  if (capturedMinor !== null) {
    // A non-zero figure is always shown, even without a `capturedAtUtc`: the projection writes
    // allocation rows and stamps the attribution in separate steps, so a non-zero sum with no stamp
    // is a capture in flight, not an absence. Only "no stamp AND nothing summed" is an absence.
    captureState = (capturedAt === null && capturedMinor === 0) ? CAPTURE_NONE : CAPTURE_KNOWN;
  }

  return {
    orderId: Number.isSafeInteger(o.orderId) ? o.orderId : null,
    companyId,
    reservationId: text(o.reservationId),
    // Copied verbatim. The wire sends the reservation state as a name (`Reserved` / `Bound` /
    // `Captured` / `Released`); an unrecognised value is passed through for the component to mark
    // as unknown rather than being silently mapped onto one of the four we know.
    reservationState: text(o.reservationState),
    reservedCap: money(o.reservedCapMinor, currency),
    boundTotal: money(o.boundCartTotalMinor, currency),
    captured: { state: captureState, minor: capturedMinor, currency: capturedMinor === null ? null : currency },
    boundAt: parseApiInstant(o.boundAtUtc),
    capturedAt,
    // Only meaningful once the directory answered — see `buildStoreView`.
    isUnlistedCompany: knownCompanyIds ? !!companyId && !knownCompanyIds.has(companyId) : false
  };
}

/**
 * The venue's Meals view: the agreements at this store, and the orders funded against the selected
 * one.
 *
 * The two reads are independent on purpose. Either can fail alone, and a failure of one must not
 * change what the other is allowed to claim — an orders read that 403s does not turn a company that
 * demonstrably has an agreement into a company with no orders.
 *
 * @param {object|null} input.directory        the `GET /v1/stores/{id}/meals/companies` body, or null
 * @param {string|null} input.directoryRefusal a `REFUSAL_*` from `meals-client`, or null
 * @param {object|null} input.orders           the `GET /v1/stores/{id}/meals/orders` body, or null
 * @param {string|null} input.ordersRefusal    a `REFUSAL_*` from `meals-client`, or null
 * @param {string|null} input.selectedCompanyId the company whose orders are on screen
 */
export function buildStoreView (input) {
  const src = input || {};

  // The directory read answers with a bare ARRAY (the controller returns the service's List<T>
  // directly), unlike the orders read which answers with an `{ orders: [...] }` envelope. Both
  // shapes are checked for rather than assumed: anything that is not the expected container is
  // UNKNOWN, not empty.
  const directoryAnswered = Array.isArray(src.directory);
  const agreementRows = directoryAnswered ? src.directory.map(agreementRow) : [];

  const ordersAnswered = !!(src.orders && Array.isArray(src.orders.orders));

  // Built only from a directory that ANSWERED. While the directory is unknown, an order's company
  // cannot be called "unlisted" — we simply do not have the list to check it against.
  const knownCompanyIds = directoryAnswered
    ? new Set(agreementRows.map(r => r.companyId).filter(Boolean))
    : null;

  const allOrderRows = ordersAnswered ? src.orders.orders.map(o => orderRow(o, knownCompanyIds)) : [];

  const selectedCompanyId = text(src.selectedCompanyId);
  const selected = agreementRows.find(r => r.companyId === selectedCompanyId) || null;

  // Grouping, not filtering-away: the count of orders belonging to each company is kept so the
  // agreement list can show it, and orders for a company the directory does not list are surfaced
  // rather than dropped.
  const ordersByCompany = new Map();
  for (const row of allOrderRows) {
    if (!row.companyId) { continue; }
    if (!ordersByCompany.has(row.companyId)) { ordersByCompany.set(row.companyId, []); }
    ordersByCompany.get(row.companyId).push(row);
  }

  const unlistedCompanyIds = [];
  for (const row of allOrderRows) {
    if (row.isUnlistedCompany && !unlistedCompanyIds.includes(row.companyId)) {
      unlistedCompanyIds.push(row.companyId);
    }
  }

  return {
    agreements: {
      state: directoryAnswered ? DATA_LOADED : DATA_UNKNOWN,
      refusal: src.directoryRefusal || null,
      rows: agreementRows.map(row => Object.assign({}, row, {
        // Null, not 0, while the orders read is unknown: "we have not read this company's orders"
        // is not "this company has placed none".
        orderCount: ordersAnswered ? (ordersByCompany.get(row.companyId) || []).length : null,
        isSelected: !!selectedCompanyId && row.companyId === selectedCompanyId
      })),
      isEmpty: directoryAnswered && agreementRows.length === 0
    },
    orders: {
      state: ordersAnswered ? DATA_LOADED : DATA_UNKNOWN,
      refusal: src.ordersRefusal || null,
      // The orders of the SELECTED company only. With nothing selected this is empty and the page
      // says "pick an agreement" rather than showing the store's whole set under one company's name.
      rows: selectedCompanyId ? (ordersByCompany.get(selectedCompanyId) || []) : [],
      isEmpty: ordersAnswered && !!selectedCompanyId && (ordersByCompany.get(selectedCompanyId) || []).length === 0,
      // Companies the orders read attributed money to that the directory did not list. Reported
      // rather than hidden: it means an agreement or a company row the venue cannot see, which is
      // exactly the kind of thing a proving surface exists to make visible.
      unlistedCompanyIds
    },
    selected
  };
}

export default buildStoreView;
