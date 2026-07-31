// The Margin CSV PRICE-IMPORT client — the six endpoints of `MarginPriceImportsController`:
//
//   GET  /margin/price-imports?storeId                      the store's batches, newest first
//   POST /margin/price-imports?storeId                      multipart upload -> parsed batch
//   GET  /margin/price-imports/{id}?storeId                 batch + rows + proposed mappings
//   PUT  /margin/price-imports/{id}/mappings?storeId        the operator's per-row resolutions
//   POST /margin/price-imports/{id}/approve?storeId         apply, atomically, through the writer
//   GET  /margin/price-imports/template?storeId             the template CSV (text/csv)
//
// NONE of them takes an `If-Match`. The batch carries a rowversion and answers it as `revision`, but
// no action asks for one: mappings and approve are guarded server-side (state machine + a
// concurrency catch that answers `margin.stale-revision` on a lost race). So this client sends none,
// rather than a header that would read as a guarantee the server does not make.
//
// THE WHOLE SURFACE IS BEHIND A SECOND FLAG. `Margin.PriceImport` is a per-store STAGE flag under the
// module master, defaulting off, and every route here answers the SAME opaque 404 when it is off as
// when the module is off as when the batch does not exist. Only `GET /margin/status` distinguishes
// them, which is why the page reads that first and never infers the flag from a 404.

import { MarginModuleClient, scoped } from '~/utils/margin/module-client';

export class MarginPriceImportService extends MarginModuleClient {
  /** The store's import batches, newest upload first. Summaries only — no rows. */
  ListImports (storeId) {
    return this._request('GET', scoped('/margin/price-imports', storeId));
  }

  /**
   * Uploads a CSV and answers the PARSED BATCH: rows, per-row errors, and the auto-proposed supplier
   * items. One round trip from "picked a file" to "here is what is in it".
   *
   * `supplierId` is an OPTIONAL batch-level scope. Set, it constrains auto-mapping and every later
   * manual mapping to that supplier's items; left null, the file may span suppliers.
   *
   * TWO OUTCOMES SHARE THIS 200, and they are not the same event:
   *
   *  • a new batch — `isDuplicateOfExistingBatch: false`;
   *  • an IDEMPOTENT REPLAY — `isDuplicateOfExistingBatch: true`. The file's SHA-256 already exists
   *    for this store, so NO new batch was created and NO second price effect can occur; what comes
   *    back is the ORIGINAL batch, in whatever state it has reached. This is not an error and the
   *    surface must not dress it as one.
   */
  UploadCsv (storeId, supplierId, file) {
    const form = new FormData();
    form.append('file', file, file.name);
    // Appended only when set: an empty string binds to `Guid?` as a model-state failure, which would
    // turn "no supplier scope" — the normal case — into a 400 about a field the venue left blank.
    if (supplierId) { form.append('supplierId', supplierId); }
    return this._upload(scoped('/margin/price-imports', storeId), form);
  }

  /** One batch with its rows. The same document the upload answered, re-read. */
  GetImport (storeId, batchId) {
    return this._request('GET', scoped(this._path(batchId), storeId));
  }

  /**
   * The operator's resolutions, as a partial instruction set: only the rows named are touched, and a
   * row omitted keeps whatever resolution it already had. `rows` is `[{ rowId, resolution,
   * resolvedSupplierItemId }]` where resolution is `Mapped` / `Skipped` / `Pending`.
   *
   * The server refuses the whole request — nothing is saved — if any single instruction is invalid:
   * mapping a row that carries an error (skip it instead), mapping without a supplier item, naming
   * an item outside the batch's supplier scope. Those are uncoded 400s whose `detail` names the row
   * number, which is why the page renders that prose verbatim instead of a generic failure.
   */
  SetMappings (storeId, batchId, rows) {
    return this._mutate('PUT', scoped(this._path(batchId) + '/mappings', storeId), { rows });
  }

  /**
   * Applies every `Mapped` row's price, atomically, through the one append-only price writer, and
   * moves the batch `Mapping → Approved → Applied`.
   *
   * IDEMPOTENT PER BATCH: approving an already-applied batch is a no-op that answers the applied
   * summary — no second price effect. Blocked while any row is still `Pending` (an uncoded 400 that
   * counts them), and every applied price carries this batch's id as its provenance.
   *
   * The answer is a SUMMARY, not a detail: it has no `rows`. The page re-reads the batch afterwards
   * rather than patching its row list from a response that does not carry one.
   */
  ApproveImport (storeId, batchId) {
    return this._mutate('POST', scoped(this._path(batchId) + '/approve', storeId), {});
  }

  /**
   * The template CSV, as TEXT — the response is `text/csv`, not JSON.
   *
   * Fetched rather than linked because every Margin route needs the bearer token, which a plain
   * `<a href>` cannot carry; the page turns this string into a download itself. A refusal still
   * arrives as problem+json and is thrown as a typed failure, so a venue never saves an error
   * document under a `.csv` name.
   */
  DownloadTemplate (storeId) {
    return this._request('GET', scoped('/margin/price-imports/template', storeId), { text: true });
  }

  _path (batchId) {
    return '/margin/price-imports/' + encodeURIComponent(batchId);
  }
}

export default MarginPriceImportService;
