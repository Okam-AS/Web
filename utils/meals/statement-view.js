// What `pages/admin/meals-statements.vue` renders, derived once, here, where it can be tested
// without a browser.
//
// ---- THE ONE RULE THIS FILE EXISTS TO HOLD ----------------------------------------------------
//
// A STATEMENT LINE'S MEMBER REFERENCE IS READ, NEVER DERIVED. `memberDisplayRef` is written onto the
// line row at DRAFT time by `MealsStatementService.MemberDisplayRef` — the company-supplied
// `EmployeeReference` from the membership, or the membership's bare id when the invitation carried
// none — and it is frozen at finalization by `TR_MealsStatementLines_FinalizedImmutable` (THROW
// 50043). The read path does no join: `MapLine` copies the stored column and nothing else.
//
// So this module copies it and nothing else either. It does not fall back to `allocationId`, to
// `orderId`, or to any other identifier on the line, and there is no second rule anywhere in the
// client that could produce a plausible-looking reference:
//
//   • A LINE CARRIES NO OTHER MEMBER IDENTIFIER AT ALL. `MealsStatementLine` has no `MembershipId`
//     and no `ApplicationUserId` — not on the entity, not on the DTO. The membership id reaches the
//     wire only AS THE VALUE of `memberDisplayRef`, in the no-reference case. There is therefore
//     nothing on this payload from which a correct-looking reference could be reconstructed, which
//     is what makes an assertion on the rendered value an assertion about the stored one.
//   • AN ABSENT FIELD IS UNKNOWN, NOT A SUBSTITUTE. A line that arrives without the property renders
//     the unknown mark. A statement line is a bookkeeping artifact somebody reconciles against a
//     payroll list; a page that filled the gap with the nearest available id would be printing an
//     attribution the server never made, and it would be indistinguishable on screen from one it did.
//
// `hasMemberRef` is separate from the value for the same reason `store-view.js` splits "captured
// nothing" from "capture unknown": empty is an answer the surface must be able to state.
//
// ---- WHAT IS NOT DERIVED HERE ------------------------------------------------------------------
//
// No figure is summed, averaged or scaled. `totalGrossMinor` / `totalNetMinor` / `totalVatMinor` are
// the server's own and are rendered as they arrive; a page that re-summed the lines would show a
// total that disagreed with the `contentHash` the operator is about to sign.

/** The unknown mark every Meals surface uses for a fact the API did not state. */
export const UNKNOWN_MARK = '—';

export const STATUS_DRAFT = 'Draft';
export const STATUS_FINALIZED = 'Finalized';

/** A string, or null. Never `''` and never `String(undefined)`. */
function text (value) {
  if (value === null || value === undefined) { return null; }
  const s = String(value).trim();
  return s === '' ? null : s;
}

/** An integer, or null. A non-integer minor amount is a value the schema cannot hold. */
function intOrNull (value) {
  return Number.isSafeInteger(value) ? value : null;
}

/** `{ minor, currency }` or null — the shape `store-view.js` already uses for Meals money. */
function money (minor, currency) {
  const amount = intOrNull(minor);
  if (amount === null) { return null; }
  return { minor: amount, currency: text(currency) };
}

/**
 * One statement line.
 *
 * `kind` is `Capture` or `Reversal` over the wire. A reversal is a real, negative bookkeeping row —
 * it is not an error and it is not filtered out here.
 */
export function readLine (source) {
  const l = source || {};
  const currency = text(l.currency);
  // READ, NOT DERIVED. See this file's header: there is no other member identifier on a line, and no
  // fallback is applied to this value anywhere in this module.
  const memberDisplayRef = text(l.memberDisplayRef);
  return {
    statementLineId: text(l.statementLineId),
    allocationId: text(l.allocationId),
    kind: text(l.kind),
    orderId: text(l.orderId),
    sourceReceiptNumber: text(l.sourceReceiptNumber),
    memberDisplayRef,
    hasMemberRef: memberDisplayRef !== null,
    gross: money(l.grossMinor, currency),
    net: money(l.netMinor, currency),
    vat: money(l.vatMinor, currency),
    currency,
    orderOccurredAtUtc: text(l.orderOccurredAtUtc),
    linkedFinalizedStatementRunId: text(l.linkedFinalizedStatementRunId)
  };
}

/**
 * One row of the run summary — what `#21 list` returns per statement, and the head of what `#22 get`
 * returns. Extracted so the history list and the opened document read the same fields by one rule.
 *
 * `canFinalize` is deliberately absent: this module binds no write. Whether a run can be closed is
 * the month-close surface's question, and answering it here would be a second opinion.
 */
export function readSummary (source) {
  const summary = source || {};
  const year = intOrNull(summary.periodYear);
  const month = intOrNull(summary.periodMonth);
  const currency = text(summary.currency);
  const status = text(summary.status);
  return {
    statementRunId: text(summary.statementRunId),
    companyId: text(summary.companyId),
    storeId: text(summary.storeId),
    currency,
    periodYear: year,
    periodMonth: month,
    // `YYYY-MM`, the same tag the CSV preamble prints, so the file and the screen name one period.
    period: (year !== null && month !== null)
      ? String(year) + '-' + (month < 10 ? '0' + month : String(month))
      : null,
    status,
    isDraft: status === STATUS_DRAFT,
    isFinalized: status === STATUS_FINALIZED,
    lineCount: intOrNull(summary.lineCount),
    totalGross: money(summary.totalGrossMinor, currency),
    totalNet: money(summary.totalNetMinor, currency),
    totalVat: money(summary.totalVatMinor, currency),
    // The signature the venue signed and the row version it signed at. Held as read; never recomputed.
    contentHash: text(summary.contentHash),
    revision: text(summary.revision),
    finalizedAtUtc: text(summary.finalizedAtUtc),
    createdAtUtc: text(summary.createdAtUtc)
  };
}

/**
 * The run plus its lines, or null when nothing has been read. `#22 get` returns `{ summary, lines }`;
 * a payload that is flat is read as its own summary rather than rejected.
 */
export function readStatement (source) {
  if (!source) { return null; }
  const summary = readSummary(
    source.summary && typeof source.summary === 'object' ? source.summary : source);
  const lines = Array.isArray(source.lines) ? source.lines.map(readLine) : [];
  return Object.assign({}, summary, {
    lines,
    // The lines the server returned, not `lineCount`. A disagreement between them is worth seeing
    // rather than smoothing over — it would mean the payload was truncated.
    renderedLineCount: lines.length
  });
}

// ---- refusals ----------------------------------------------------------------------------------
//
// Every one of these is rendered as a SENTENCE. NONE of them promises anything about what was saved,
// because this module binds no write: #21, #22 and #23 are reads, and a read that is refused changed
// nothing by construction. The write family's two interesting refusals — a stale content hash and a
// stale expected version — belong to the surface that owns the freeze
// (`components/admin/meals/MealsMonthClose.vue`), and are deliberately not restated here: a second
// copy of a sentence about an act this page cannot perform is a sentence that will drift.

/**
 * The refusal a Meals statement READ produced, as `{ key, params }` for `$i`.
 *
 * KEYED ON `code`, NEVER ON `detail`, which is prose the server may reword or localise. The 404 is
 * NOT split: `RequireVisible()` on a dark module and a genuinely absent run emit the same
 * `meals.not-found`, so a screen that claimed "the module is switched off" would be inventing a
 * distinction the wire refuses to make. The copy says both possibilities and commits to neither.
 */
export function statementRefusal (error) {
  if (!error) { return null; }

  const code = error.code || null;

  if (code === 'meals.forbidden') {
    // NOT a failure. #21 is `RequireCompanyAdminAsync`, so a venue asking for the buyer's statement
    // history meets the authority boundary working exactly as designed, and the sentence says that
    // rather than apologising for an error.
    return { key: 'mlst_refusal_forbidden', params: {} };
  }
  if (code === 'meals.export-format-unsupported') {
    return { key: 'mlst_refusal_export_format', params: {} };
  }
  if (code === 'meals.validation') {
    return { key: 'mlst_refusal_validation', params: {} };
  }
  if (code === 'meals.not-found') {
    return { key: 'mlst_refusal_not_found', params: {} };
  }
  if (error.status === 401) {
    return { key: 'mlst_refusal_unauthenticated', params: {} };
  }
  // Anything else, including a bare 400 from `MealsControllerBase`, whose problem document carries no
  // `code` extension at all. The unknown sentence is honest about that rather than naming a code that
  // is not on the document.
  return { key: 'mlst_refusal_unknown', params: {} };
}
