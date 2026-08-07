// The Company Meals STATEMENT READS — the month's bill as a document: #21 list, #22 get, #23 export.
//
// ---- WHY THIS FILE BINDS THREE ROUTES AND NOT FIVE ---------------------------------------------
//
// The statement family is five endpoints and they split cleanly in two, by authority and by act:
//
//   POST /v1/stores/{storeId}/meals/statements/drafts          #19  Draft     StoreAdmin   — a WRITE
//   POST /v1/meals/statements/{statementId}/finalize           #20  Finalize  StoreAdmin   — a FREEZE
//   GET  /v1/meals/companies/{companyId}/statements            #21  List      CompanyAdmin ONLY
//   GET  /v1/meals/statements/{statementId}                    #22  Get       StoreAdmin or CompanyAdmin
//   GET  /v1/meals/statements/{statementId}/export?format=csv  #23  Export    StoreAdmin or CompanyAdmin
//
// #19 AND #20 ARE NOT BOUND HERE, AND THAT IS A DECISION RATHER THAN AN OMISSION. They are the venue's
// MONTH CLOSE, and the month close belongs beside the reconciliation queue that unblocks it:
// `meals.statement-period-open-exceptions` blocks both, its problem document carries a COUNT and no
// identity, and naming the row that blocks a freeze needs the exception queue joined against the
// refusal. `components/admin/meals/MealsMonthClose.vue` on `/admin/meals-agreements` does that, and
// `utils/meals/meals-client.js` binds the two writes for it. A FREEZE IS IRREVERSIBLE — there is no
// un-finalize route and a trigger enforces it below the service layer — so a second control for it on
// a second screen would mean an operator can find the one that cannot say what is blocking them.
//
// The seam is the one that client drew itself: its header records that "the statement READS (#21
// list, #22 get, #23 export) are deliberately still absent". This file is those reads, and nothing
// else. Between the two files the family is bound exactly once, each half beside the thing it is for
// — the close beside its blocker, the document beside its lines.
//
// ---- ONE GATE, AND IT HAS NO OPERATOR LEVER ---------------------------------------------------
//
// Every route here resolves `IMealsFeatureGate`, which reads the module-wide `Features:Meals`
// configuration section: BOTH `Features:Meals:Module` and `Features:Meals:Statements` must be true.
// `MealsFeatureFlags` puts `meals.statements` in its `Withheld` dictionary on purpose — "a statement
// issued to a company under a half-enabled module is a document that cannot be withdrawn" — so unlike
// `meals.module` there is no per-store override row, and nothing on `/admin/feature-flags` can move
// it in either direction. A dark module answers `meals.not-found`, which is the same answer as a
// statement that does not exist; the page never splits them.
//
// ---- THE AUTHORITY SPLIT INSIDE THE READS -----------------------------------------------------
//
// #22 and #23 admit a store admin OR a company admin. #21 admits ONLY a company admin, so a venue
// asking for the buyer's statement history is refused `meals.forbidden` — which is a real product
// fact and is rendered as a sentence rather than as an empty list a venue would read as "none yet".
//
// TRANSPORT IS SHARED, NOT COPIED — `WorkforceClientBase` is this repo's one HTTP layer. Nothing here
// mutates, so nothing here mints an `Idempotency-Key`.

// `fileNameFrom` is the SHARED parser, not a private copy of it. This file carried its own
// character-identical duplicate until 2026-08-07; two copies of a `Content-Disposition` parser drift
// one field at a time and in silence, which is the exact failure this module's own header warns
// about elsewhere. `_requestFile` in the shared layer already used the exported one.
//
// On what it returns: `Content-Disposition` is not a CORS-safelisted response header, so a
// cross-origin admin app can only read it where the API's policy exposes it — which THIS API does
// (`Helpers/BrowserReadableHeaders.cs:29,38` reaches `Program.cs`'s `WithExposedHeaders`). Null is
// still the honest answer for every other deployment, and the caller then knows it is naming the
// file itself rather than repeating the server.
import { WorkforceClientBase, WorkforceApiError, fileNameFrom } from '~/utils/workforce/api-client';

function statementPath (statementId) {
  return '/v1/meals/statements/' + encodeURIComponent(statementId);
}

export class MealsStatementService extends WorkforceClientBase {
  /** #22 — the run and its lines. StoreAdmin or CompanyAdmin. */
  Get (statementId) {
    return this._request('GET', statementPath(statementId));
  }

  /**
   * #21 — the company's statement history. COMPANY ADMIN ONLY; a store admin is a `meals.forbidden`
   * 403. Bound because it is the buyer surface's read, and called by no venue screen.
   */
  ListForCompany (companyId) {
    return this._request('GET', '/v1/meals/companies/' + encodeURIComponent(companyId) + '/statements');
  }

  /**
   * #23 — the deterministic CSV: a twelve-line `#` preamble, then one header row and one row per
   * line, sorted by `orderOccurredAtUtc` then `allocationId`.
   *
   * Answers `text/csv`, so it does not go through `_request`. Resolves `{ text, fileName,
   * contentHash }`. `contentHash` comes from the `X-Meals-Content-Hash` response header the API
   * exposes for exactly this purpose, and is null when the browser was not allowed to read it — it is
   * never re-derived from the body, because a hash this client computed would prove nothing about
   * the document the server signed.
   *
   * `format` is pinned to `csv` rather than defaulted: anything else is a 400
   * `meals.export-format-unsupported`, and there is no second format.
   */
  async ExportCsv (statementId) {
    const response = await fetch(
      this._baseUrl + statementPath(statementId) + '/export?format=csv',
      { method: 'GET', headers: this._headers({ Accept: 'text/csv' }) });

    const text = await response.text();

    if (!response.ok) {
      let payload = null;
      if (text) {
        try { payload = JSON.parse(text); } catch (e) { payload = { detail: text }; }
      }
      // The same typed error the JSON routes throw, so the page's refusal copy has one input.
      throw new WorkforceApiError(response.status, payload);
    }

    return {
      text,
      fileName: fileNameFrom(response.headers),
      contentHash: (response.headers && typeof response.headers.get === 'function')
        ? response.headers.get('X-Meals-Content-Hash')
        : null
    };
  }
}

export default MealsStatementService;
