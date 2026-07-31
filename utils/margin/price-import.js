// The CSV price-import model: what the upload / detail reads returned, turned into a wizard a venue
// can finish. No Vue, no network, no arithmetic on money.
//
// THE STATE MACHINE, because the screen is only honest if it shows where the batch actually is:
//
//   Mapping  → uploaded and parsed. Rows can be resolved. Nothing has touched a price.
//   Approved → a transient inside the approve transaction; a batch at rest is never seen here.
//   Applied  → the prices ARE written. Mappings can no longer be changed, approve is a no-op, and
//              the effect is permanent: `MarginSupplierItemPrices` is append-only and has no
//              retraction path. A wrong price is superseded forward, never withdrawn.
//
// AND THE OUTCOME THAT IS NOT A FAILURE. Re-uploading a file whose bytes were already uploaded for
// this store answers 200 with `isDuplicateOfExistingBatch: true` and the ORIGINAL batch: no second
// batch, no second price effect (the SHA-256 is the dedup key). The venue did nothing wrong and
// nothing broke — they asked for something that had already happened. This model reports it as its
// own state so the page cannot render it in the red box next to the real refusals.

import { parseApiInstant } from '~/utils/workforce/week-range';
import { numberOrNull } from '~/utils/margin/cost-preview';

/** Uploaded and parsed. The rows are editable; no price has moved. */
export const BATCH_MAPPING = 'Mapping';
/** Inside the approve transaction. */
export const BATCH_APPROVED = 'Approved';
/** The prices are written. Permanent, and idempotent to re-approve. */
export const BATCH_APPLIED = 'Applied';

/** A row nobody has resolved yet. It BLOCKS approval. */
export const ROW_PENDING = 'Pending';
/** A row that will write a price on approve. */
export const ROW_MAPPED = 'Mapped';
/** A row deliberately excluded. No price effect. */
export const ROW_SKIPPED = 'Skipped';

/**
 * Reads an upload / `GET {id}` / mappings response into the wizard model.
 *
 * Returns null when there is nothing to show, so the caller's `v-if` is a plain truthiness check and
 * an unknown batch never renders as an empty one.
 */
export function readImportBatch (detail) {
  if (!detail || typeof detail !== 'object' || !detail.batchId) { return null; }

  const rows = (Array.isArray(detail.rows) ? detail.rows : []).map(readRow);
  const state = detail.state || null;
  const pendingCount = countOrNull(detail.pendingCount);

  return {
    batchId: detail.batchId,
    supplierId: detail.supplierId || null,
    fileName: detail.fileName || null,
    // The dedup key itself. Shown, abbreviated, only where it explains the duplicate outcome — it is
    // the reason a second upload of the same file changed nothing.
    fileSha256: detail.fileSha256 || null,
    state,
    isMapping: state === BATCH_MAPPING,
    isApplied: state === BATCH_APPLIED,
    /**
     * The idempotent replay. TRUE means: this file was already here, the batch below is the original,
     * no new batch was created and no price moved. Only ever true on an upload response — a re-read
     * of the same batch reports false, because re-reading it is not a duplicate upload.
     */
    isDuplicate: detail.isDuplicateOfExistingBatch === true,
    rowCount: countOrNull(detail.rowCount),
    mappedCount: countOrNull(detail.mappedCount),
    skippedCount: countOrNull(detail.skippedCount),
    pendingCount,
    errorCount: countOrNull(detail.errorCount),
    uploadedAt: parseApiInstant(detail.uploadedAtUtc),
    appliedAt: parseApiInstant(detail.appliedAtUtc),
    rows,
    /**
     * Whether `POST {id}/approve` can succeed right now. The server owns the rule — every row
     * resolved, batch still in Mapping — and refuses with a counted 400 either way; this only
     * decides whether the button is offered, and `approveBlocker` says which condition is missing so
     * the absence is never mute.
     */
    canApprove: state === BATCH_MAPPING && pendingCount === 0,
    approveBlocker: approveBlockerOf(state, pendingCount)
  };
}

/**
 * Why approve is not on offer: `null` (it is), `'applied'`, `'pending'` or `'state'`.
 *
 * `pending` is the one a venue can act on, and the error rows are inside it: a row carrying a parse
 * error CANNOT be mapped (the server refuses it and says to skip it instead), so it stays Pending
 * until somebody skips it. "Resolve the remaining rows" is therefore the whole instruction, and
 * counting the error rows separately would suggest a second, different action that does not exist.
 */
function approveBlockerOf (state, pendingCount) {
  if (state === BATCH_APPLIED) { return 'applied'; }
  if (state !== BATCH_MAPPING) { return 'state'; }
  return pendingCount === 0 ? null : 'pending';
}

function readRow (row) {
  const item = row || {};
  const hasError = typeof item.rowError === 'string' && item.rowError.length > 0;
  return {
    id: item.id || null,
    rowNumber: numberOrNull(item.rowNumber),
    rawLine: item.rawLine || null,
    articleNumber: item.articleNumber || null,
    name: item.name || null,
    /**
     * Integer øre, or null. Null is the honest answer for a row whose price would not parse, and it
     * renders as the unknown mark — never `kr 0,00`, which on an import review screen would read as
     * "this supplier now charges nothing" for the rows most likely to be wrong.
     */
    priceMinor: numberOrNull(item.priceMinor),
    // The currency the row's own document stated. The import assumes NONE — not the market's, not
    // the store's — so a row without one carries a `rowError` and cannot be mapped.
    currency: item.currency || null,
    unitCode: item.unitCode || null,
    proposedSupplierItemId: item.proposedSupplierItemId || null,
    resolvedSupplierItemId: item.resolvedSupplierItemId || null,
    resolution: item.resolution || ROW_PENDING,
    // The server's own per-row prose, shown verbatim. It names the offending cell ("The currency
    // 'KRONER' is not a 3-letter ISO 4217 code."), which no generic sentence could.
    rowError: hasError ? item.rowError : null,
    hasError,
    /**
     * A row carrying an error may only be SKIPPED. Mapping it is refused server-side, on purpose:
     * mapping around a parse refusal would be a route to writing a price the parser rejected.
     */
    canMap: !hasError,
    // Auto-resolved on upload from a UNIQUE supplier-article match. An ambiguous article (two items,
    // same number) is deliberately left Pending rather than guessed at.
    wasAutoMapped: !!item.proposedSupplierItemId && item.proposedSupplierItemId === item.resolvedSupplierItemId
  };
}

/** A wire count, or null when the wire sent no number — never silently 0. */
function countOrNull (value) {
  return numberOrNull(value);
}

/** One batch as a list row (`GET /margin/price-imports`), which carries no rows of its own. */
export function readImportSummary (summary) {
  const item = summary || {};
  return {
    batchId: item.batchId || null,
    fileName: item.fileName || null,
    state: item.state || null,
    isApplied: item.state === BATCH_APPLIED,
    rowCount: countOrNull(item.rowCount),
    mappedCount: countOrNull(item.mappedCount),
    skippedCount: countOrNull(item.skippedCount),
    pendingCount: countOrNull(item.pendingCount),
    errorCount: countOrNull(item.errorCount),
    uploadedAt: parseApiInstant(item.uploadedAtUtc),
    appliedAt: parseApiInstant(item.appliedAtUtc)
  };
}
