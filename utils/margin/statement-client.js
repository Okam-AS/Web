// The Margin STATEMENT API client — the weekly theoretical-vs-actual reconciliation, scoped to one
// store.
//
// Deliberately route-for-route with the backend and adds nothing: every method below maps to a
// controller action that exists today in `OkamAPI-modules`. The controller file and its own endpoint
// numbering are named on each method so the two can be diffed by eye.
//
//   GET  /margin/statements?storeId[&from&to]                     MarginStatementsController #1
//   POST /margin/statements?storeId                               MarginStatementsController #2
//   GET  /margin/statements/{statementId}?storeId                 MarginStatementsController #3
//   PUT  /margin/statements/{statementId}/inputs?storeId          MarginStatementsController #4 (If-Match)
//   POST /margin/statements/{statementId}/recalculate?storeId     MarginStatementsController #5 (If-Match)
//   POST /margin/statements/{statementId}/finalize?storeId        MarginStatementsController #6 (If-Match)
//   GET  /margin/statements/{statementId}/export?storeId          MarginStatementsController #7 (text/csv)
//   GET  /margin/coverage?storeId&from&to                         MarginCoverageController
//   GET  /margin/suppliers?storeId                                MarginSuppliersController #1
//   POST /margin/projection/rebuild?storeId                       MarginProjectionController (PowerUser)
//
// ROUTES THIS PAGE USES BUT DOES NOT BIND HERE, because `~/utils/margin/recipe-client` already owns
// the controller they belong to and a second binding is a second place for the contract to drift:
//   • `GET /margin/status` — `MarginStatusController`, bound by `MarginRecipeService.GetStatus`. It is
//     the ONLY read that distinguishes "the module is off for this store" from "the read failed", and
//     it is also the only place `flags.statements` — the per-store stage flag this whole surface sits
//     behind — is reported. Every route above answers the SAME opaque 404 when either flag is off.
//
// WHAT IS DELIBERATELY ABSENT, so its absence is not read as an oversight:
//
//  • an invoice-CSV / EHF intake on this surface. The venue's purchase spend reaches a statement
//    through `PUT .../inputs` and nowhere else: `MarginCsvParser` and `MarginEhfInvoiceParser` feed
//    the SUPPLIER PRICE import (`MarginPriceImportsController`, behind its own `Margin.PriceImport`
//    stage flag), which writes item prices — never a spend entry. A file drop on this screen would
//    look like the way to load a week of invoices and would silently be a different feature.
//  • a spend-entry DELETE, a statement delete, and an un-finalize. There is no route for any of them.
//    Spend is edited by replacing the whole set (#4); a finalized statement is corrected by creating
//    the next forward-only revision (#2), never by reopening this one.
//
// THE WIRE'S TWO KINDS OF DATE, and why nothing here hands one to `new Date()`:
// `weekStart`, `from`, `to` and `spendDate` are the store's CALENDAR DATES. They are bound server-side
// as `DateTime` and immediately reduced to `.Date`, so a bare `yyyy-MM-dd` is the only form that
// cannot move: an instant with a `Z` would be reinterpreted in whatever zone the binder lands in, and
// a week is exactly the window where one day of drift moves money between two statements.
// `assertBusinessDate` refuses anything else at the door rather than coercing, for the same reason
// `assertRateRequest` does on the Workforce rates client — a client that converted a `Date` here would
// be choosing the zone, and the browser's zone is not the store's.

import { MarginClientBase } from '~/utils/margin/api-client';

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** `?storeId=` is the authoritative tenant scope on every Margin route; body tenant ids are ignored. */
function scoped (path, storeId) {
  return path + (path.includes('?') ? '&' : '?') + 'storeId=' + encodeURIComponent(storeId);
}

/**
 * `yyyy-MM-dd` or nothing. Throws rather than coercing — see this file's header.
 */
export function assertBusinessDate (value, field) {
  if (typeof value !== 'string' || !LOCAL_DATE.test(value)) {
    throw new TypeError(field + ' must be the store calendar date as yyyy-MM-dd, never a DateTime.');
  }
  return value;
}

/**
 * True when a `yyyy-MM-dd` names a Monday.
 *
 * Read through `Date.UTC` and `getUTCDay`, never through `new Date('2026-07-06')`-then-`getDay()`:
 * the latter parses as UTC midnight and then reports the weekday in the BROWSER's zone, so every
 * Monday west of Greenwich would read as a Sunday. The server's own guard is
 * `MarginStatementSupport.IsMonday`, and this one exists so a venue is told before the round trip
 * rather than after it — the server stays authoritative either way.
 */
export function isMondayDate (value) {
  if (typeof value !== 'string' || !LOCAL_DATE.test(value)) { return false; }
  const parts = value.split('-').map(Number);
  const utc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  // A date like 2026-02-31 rolls over silently; comparing the round trip rejects it.
  if (utc.getUTCFullYear() !== parts[0] || utc.getUTCMonth() !== parts[1] - 1 || utc.getUTCDate() !== parts[2]) {
    return false;
  }
  return utc.getUTCDay() === 1;
}

/**
 * The Monday of the ISO week a `yyyy-MM-dd` falls in, as `yyyy-MM-dd`, or null when the input is not
 * a date. Computed in UTC for the same reason `isMondayDate` is.
 *
 * It is a SUGGESTION the venue confirms, never an automatic correction: silently snapping a picked
 * date to its Monday would produce a statement for a week nobody chose.
 */
export function mondayOfWeek (value) {
  if (typeof value !== 'string' || !LOCAL_DATE.test(value)) { return null; }
  const parts = value.split('-').map(Number);
  const utc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  if (Number.isNaN(utc.getTime())) { return null; }
  const shift = (utc.getUTCDay() + 6) % 7; // Sunday (0) is six days after its Monday, not one before.
  utc.setUTCDate(utc.getUTCDate() - shift);
  return utc.toISOString().slice(0, 10);
}

/**
 * True for the statement surface's BUSINESS refusals: a 400 whose problem+json carries no `code`.
 *
 * The recipe surface types every business failure into the `margin.*` family, and its page renders
 * from the code alone. The statement surface does not: `MarginStatementsController` catches
 * `AppException` and renders it through `ModuleControllerBase.ModuleProblem`, which builds a
 * ProblemDetails with `detail` and a `traceId` and NO `code` extension. So "this statement is
 * finalized and immutable", "the week must start on a Monday", "an open statement already exists for
 * this week", "a purchase-spend amount must not be negative", "the entries state more than one
 * currency" and "the store states no currency" all arrive as ONE indistinguishable shape whose only
 * content is English prose written for a developer.
 *
 * That is why the page pre-empts every one of those rules it can see (it offers no edit control on a
 * finalized statement, no create button for a week that already has an Open one, refuses a non-Monday
 * and a negative amount before sending, and denominates every spend line in the statement's own
 * currency so two can never disagree) and quotes the server verbatim for whatever is left. Matching on
 * `detail` text is not an option: it is server prose and may be reworded, and the one rule this
 * codebase holds about error rendering is that it keys on codes and never on sentences.
 */
export function isUncodedRefusal (error) {
  return !!(error && error.isMarginApiError && error.status === 400 && !error.code);
}

export class MarginStatementService extends MarginClientBase {
  /**
   * The store's statements — ALL revisions, newest week first, then newest revision first.
   *
   * `from`/`to` filter on OVERLAP, not containment (`PeriodEnd >= from && PeriodStart <= to`), so a
   * window that clips a week still returns it. Both are optional; omitting them returns every
   * statement the store has.
   */
  ListStatements (storeId, fromDate, toDate) {
    let path = '/margin/statements';
    const query = [];
    if (fromDate !== undefined && fromDate !== null) {
      query.push('from=' + encodeURIComponent(assertBusinessDate(fromDate, 'from')));
    }
    if (toDate !== undefined && toDate !== null) {
      query.push('to=' + encodeURIComponent(assertBusinessDate(toDate, 'to')));
    }
    if (query.length) { path += '?' + query.join('&'); }
    return this._request('GET', scoped(path, storeId));
  }

  /**
   * Opens the week — or, when the week's latest statement is already Finalized, opens the NEXT
   * forward-only revision of it, with `previousStatementId` pointing back at its predecessor. One call
   * does both; the server decides which by looking at what is already there.
   *
   * A week whose latest statement is still Open is refused ("edit or finalize it before creating a
   * revision"): there is at most one Open statement per week, so a correction is never a parallel
   * draft.
   *
   * No `If-Match`: there is no prior revision of a resource that does not exist yet, and the
   * controller routes this action through `Run` rather than `RunWithIfMatch`.
   */
  CreateStatement (storeId, weekStartDate) {
    return this._mutate('POST', scoped('/margin/statements', storeId), {
      weekStart: assertBusinessDate(weekStartDate, 'weekStart')
    });
  }

  /**
   * One statement in full: the figures, the spend lines behind the actual, and the honesty provenance
   * (watermark, recipe versions, coverage %, price freshness, calculation timestamp, input receipt).
   *
   * THIS READ NEVER RECOMPUTES. It returns the stored figures verbatim — frozen for a Finalized
   * statement (the freeze obligation: a later price or recipe change must never reprice the past) and
   * last-recalculated for an Open one. So an Open statement's figures are as old as its last
   * `Recalculate`, which is why the screen shows `calculationTimestampUtc` beside them.
   */
  GetStatement (storeId, statementId) {
    return this._request('GET', scoped(this._path(statementId), storeId));
  }

  /**
   * REPLACE-SET: `spendEntries` is the statement's complete desired set of purchase-spend lines, not a
   * delta. Sending `{ spendEntries: [] }` clears them. There is no per-entry route, so anything left
   * out of this body is deleted — a caller that seeded its editor from a partial read would silently
   * drop the lines it never showed.
   *
   * The two stock estimates are sent on EVERY call, `null` included: they are plain nullable columns
   * the server assigns verbatim, so omitting one clears it rather than leaving it alone.
   *
   * Open only, and an aggregate mutation: the statement's own revision travels in `If-Match`.
   */
  SetInputs (storeId, statementId, request, revision) {
    const body = request || {};
    return this._mutateWithRevision('PUT', scoped(this._path(statementId) + '/inputs', storeId), {
      spendEntries: (body.spendEntries || []).map(entry => ({
        spendDate: assertBusinessDate(entry.spendDate, 'spendDate'),
        supplierId: entry.supplierId || null,
        amountMinor: entry.amountMinor,
        currency: entry.currency,
        note: entry.note || null
      })),
      openingStockValueMinor: minorOrNull(body.openingStockValueMinor),
      closingStockValueMinor: minorOrNull(body.closingStockValueMinor)
    }, revision);
  }

  /**
   * Re-rolls the period's projected sales facts through the recipe/cost surface at each fact's own
   * business date and re-derives every figure and percentage. The venue's spend lines are re-summed
   * from what is stored; nothing in the body.
   *
   * This is the call that makes an Open statement current after the projector has caught up or a
   * recipe has changed — and the reason a stale `calculationTimestampUtc` is worth showing.
   */
  Recalculate (storeId, statementId, revision) {
    return this._mutateWithRevision('POST', scoped(this._path(statementId) + '/recalculate', storeId), {}, revision);
  }

  /**
   * Open → Finalized, and the statement is IMMUTABLE from that moment: it recalculates once more on
   * the way in, freezes the figures plus the input receipt, and every later mutation is refused.
   *
   * There is no route back. The correction path is `CreateStatement` on the same week, which opens
   * revision N+1 — forward-only, with the finalized one preserved as its predecessor.
   */
  Finalize (storeId, statementId, revision) {
    return this._mutateWithRevision('POST', scoped(this._path(statementId) + '/finalize', storeId), {}, revision);
  }

  /**
   * The deterministic CSV: one header + one figures row, a blank line, then the spend lines.
   *
   * Answers `text/csv`, not JSON, so it does not go through `_request`. Resolves
   * `{ text, fileName }` — `fileName` is the server's own (`margin-statement-<periodStart>-rev<n>.csv`)
   * when the `Content-Disposition` header is exposed to this origin, and null otherwise, so the caller
   * knows when it is naming the file itself.
   *
   * Reachable on an Open statement as well as a Finalized one; it exports the stored figures, which on
   * an Open statement are the last-recalculated ones rather than a frozen record.
   */
  ExportCsv (storeId, statementId) {
    return this._requestCsv(scoped(this._path(statementId) + '/export', storeId));
  }

  /**
   * The coverage & freshness diagnostic for a date window: the share of net food sales linked to an
   * active recipe, the uncovered buckets that make up the rest, the product links flagged broken, and
   * the per-supplier price age.
   *
   * A statement already carries its own `coveragePercent`; this read is what EXPLAINS it. Without the
   * uncovered top sellers a venue is told 80 % and not which dishes are the other 20 %.
   *
   * Gated on the module master ALONE — not on `Margin.Statements` — so it can answer where a statement
   * read 404s. The window is the store's inclusive calendar dates.
   */
  GetCoverage (storeId, fromDate, toDate) {
    const from = assertBusinessDate(fromDate, 'from');
    const to = assertBusinessDate(toDate, 'to');
    return this._request('GET', scoped(
      '/margin/coverage?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to), storeId));
  }

  /**
   * The store's active suppliers. Read for ONE reason: a spend line carries an optional `supplierId`
   * and nothing else names it, so without this list an existing attribution would render as a raw
   * GUID or, worse, be dropped by the replace-set save above without anyone seeing it.
   *
   * Archived suppliers are deliberately not requested: `includeArchived` defaults false and a spend
   * line should not be newly attributed to a supplier the store has retired. An existing line pointing
   * at one is still round-tripped unchanged — the id travels whether or not this list can name it.
   */
  ListSuppliers (storeId) {
    return this._request('GET', scoped('/margin/suppliers', storeId));
  }

  /**
   * Rebuilds the store's sales-fact projection from watermark zero — the ONLY sanctioned repair for a
   * hole in the facts a statement is computed from.
   *
   * POWERUSER ONLY, unlike every other route here (StoreAdmin): a rebuild re-scans the store's whole
   * journal. A store admin calling it gets a 403 from the framework's role filter, before the module
   * gate, so the screen offers it only to a PowerUser rather than letting a venue meet that wall.
   *
   * Non-destructive by construction: the fact write is append-only and idempotent on `journalLineId`,
   * so over an intact fact set it appends nothing and its only effect is to fill a gap. There is no
   * destructive mode to guard against.
   */
  RebuildProjection (storeId) {
    return this._mutate('POST', scoped('/margin/projection/rebuild', storeId), {});
  }

  _path (statementId) {
    return '/margin/statements/' + encodeURIComponent(statementId);
  }
}

/**
 * An integer number of minor units, or null. Anything that is not already an integer is null: the
 * stock estimates are `long?` øre columns, and a float here would be a value the schema cannot hold
 * and the server would round somewhere nobody can see.
 */
function minorOrNull (value) {
  if (value === null || value === undefined || value === '') { return null; }
  return typeof value === 'number' && Number.isInteger(value) ? value : null;
}

export default MarginStatementService;
