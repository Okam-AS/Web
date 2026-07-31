// The price-timeline model: what `GET /margin/supplier-items/{id}/prices` returned, turned into rows
// a venue can read. No Vue, no network, no arithmetic on money.
//
// THE ONE FACT THIS FILE EXISTS TO MAKE VISIBLE. A supplier item's prices are append-only and
// effective-dated: `[effectiveFrom, effectiveTo)` intervals that never overlap, of which at most one
// is open (`effectiveTo: null`). Recording a new price at instant D does NOT edit the old row's
// money — it CLOSES the open row at exactly D and appends a new open one starting at D
// (`MarginSupplierItemPriceService.ApplyEffectiveDatedPriceAsync`, step 3). So the boundary between
// two prices is a single instant that is simultaneously one row's end and the next row's start, and
// the timeline is only honest if a closed row READS as closed and the seam reads as a seam.
//
// A screen that showed three amounts and three dates would be read as three prices in force. Two of
// them stopped applying, at a stated moment, because of the row above them.
//
// WHAT IS NOT DONE HERE: no total, no average, no "price went up by X". Every amount is one field off
// the wire (`priceMinor`, integer øre), rendered by the shared money mixin. Dates ARE compared —
// that is how a seam is told from a gap — but no money is ever derived from another figure.

import { parseApiInstant } from '~/utils/workforce/week-range';
import { numberOrNull } from '~/utils/margin/cost-preview';

// `parseApiInstant` is imported for the reason written out in full in `utils/margin/cost-preview.js`:
// `effectiveFrom`, `effectiveTo` and `createdAtUtc` are COLUMN-LOADED, come back from EF as
// `Unspecified` and serialise BARE (no `Z`), and a bare stamp handed to `new Date()` is read as
// browser-local. On a price timeline that would shift every boundary by the browser's offset and
// could show a closed row as still open at the moment it was superseded.

/** The read has not answered. Nothing about this item's prices is known. */
export const TIMELINE_UNKNOWN = 'unknown';
/** The read answered and the item has no price at all — it cannot cost anything yet. */
export const TIMELINE_EMPTY = 'empty';
/** The read answered with a timeline. */
export const TIMELINE_PRICED = 'priced';

/** Written by hand through the prices endpoint. */
export const SOURCE_MANUAL = 'Manual';
/** Written by an approved CSV import batch, which the row names through `importBatchId`. */
export const SOURCE_IMPORT = 'Import';

/**
 * Reads the price history into `{ state, rows, openRow, openCount, currency }`.
 *
 * `rows` is newest effective instant first — the server's own order (`OrderByDescending`), kept
 * rather than re-sorted, so a timeline that arrives out of order is visible instead of tidied away.
 *
 * Each row carries:
 *   `priceMinor`   integer øre, or null if the wire sent no number (never coerced to 0);
 *   `isOpen`       `effectiveTo` is null — this is the price in force from `from` onwards;
 *   `closesInto`   'next' when this row's end is EXACTLY the next-newer row's start (the supersede
 *                  seam), 'gap' when it ends earlier than the next row starts (a stretch with no
 *                  price at all), null when there is nothing after it or it is open;
 *   `supersededBy` the id of the row that closed it, when `closesInto === 'next'`.
 */
export function readPriceTimeline (response) {
  if (!Array.isArray(response)) { return empty(TIMELINE_UNKNOWN); }
  if (!response.length) { return empty(TIMELINE_EMPTY); }

  const rows = response.map(readRow);

  // The rows are newest-first, so the row that CLOSED a given row is the one before it in the list.
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const newer = i > 0 ? rows[i - 1] : null;
    if (row.isOpen || !row.to || !newer || !newer.from) { continue; }
    if (row.to.getTime() === newer.from.getTime()) {
      row.closesInto = 'next';
      row.supersededBy = newer.id;
    } else {
      // Closed BEFORE the next price opened. The invariant forbids overlap, not a gap, and a gap is
      // a stretch of time in which the item had no effective price — which is why a recipe can be
      // unpriced at a past instant while looking priced today.
      row.closesInto = 'gap';
    }
  }

  const openRows = rows.filter(row => row.isOpen);
  return {
    state: TIMELINE_PRICED,
    rows,
    openRow: openRows.length === 1 ? openRows[0] : null,
    // More than one open row is a corrupt timeline (the price table carries no rowversion, so a
    // write-skew can leave two). The backend defends itself by taking the lowest; this reports it,
    // because a venue looking at two "current" prices deserves to know which of its costs are
    // suspect rather than to have one silently chosen.
    openCount: openRows.length,
    currency: rows.length ? rows[0].currency : null
  };
}

function readRow (row) {
  const item = row || {};
  return {
    id: item.id || null,
    priceMinor: numberOrNull(item.priceMinor),
    currency: item.currency || null,
    from: parseApiInstant(item.effectiveFrom),
    to: parseApiInstant(item.effectiveTo),
    isOpen: item.effectiveTo === null || item.effectiveTo === undefined,
    source: item.source || null,
    isImported: item.source === SOURCE_IMPORT,
    // Provenance: which approved batch wrote this row. Null for a manual price. The panel resolves
    // it to the batch's FILE NAME when the import list is available, and shows nothing when it is
    // not — a raw Guid is not something a venue can read.
    importBatchId: item.importBatchId || null,
    createdAt: parseApiInstant(item.createdAtUtc),
    closesInto: null,
    supersededBy: null
  };
}

function empty (state) {
  return { state, rows: [], openRow: null, openCount: 0, currency: null };
}
