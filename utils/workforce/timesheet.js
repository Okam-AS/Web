// What the timesheet screen is allowed to CONCLUDE, kept out of the component that renders it.
//
// The page below this module holds no judgement of its own: it asks these functions what state a
// period is in, whether a control may be offered, and what a refusal means, then renders the answer.
// That split is not tidiness — every one of these decisions is about a payroll artifact, and a rule
// that lives in a `v-if` cannot be tested against the contract it claims to implement.
//
// ---- THE THREE-STATE RULE THIS MODULE EXISTS TO HOLD --------------------------------------------
//
// `null` is UNKNOWN and is never emptiness. A read that has not answered, or that failed, must not
// spend one frame claiming a period has no unknown hours, no batches, or nothing to approve. The
// difference matters more here than on any sibling surface: "this period is complete" and "we could
// not tell whether this period is complete" lead a manager to opposite acts, and only one of them is
// reversible.
//
// ---- WHAT MINUTES MEAN -------------------------------------------------------------------------
//
// A line's `minutes` is `int?` and is NULL when the hours are genuinely unknown — an open session, a
// missing punch, a correction that could not be applied. It is never 0 for those. The backend's CSV
// renders them as an EMPTY cell for the same reason, and `formatMinutes` below returns the unknown
// marker rather than "0 t" so the two surfaces cannot disagree about a person's pay.

/** The period status projection the server sends. It is derived on read, never persisted. */
export const STATUS_OPEN = 'Open';
export const STATUS_APPROVED = 'Approved';
export const STATUS_EXPORTED = 'Exported';

/** A line whose hours the server could not determine. Mirrors `WorkforceTimesheetLineStatus`. */
export const LINE_COMPLETE = 'Complete';

/** The provider the server resolves when a request names none. `WorkforceNeutralCsvTimesheetExportProvider.Key`. */
export const DEFAULT_PROVIDER_KEY = 'okam-csv';

/**
 * The refusal codes this surface can actually receive, and what each one means for the manager.
 *
 * Keyed on the problem `code`, never on `detail`, which is prose and may be localised or reworded —
 * the same rule every workforce surface follows. A code absent from this map is NOT guessed at: the
 * caller falls back to a sentence that says the act was refused and names the code, which is honest
 * about the limit rather than inventing a cause.
 *
 * The i18n key is returned rather than a sentence so this module stays free of the translation
 * layer and can be tested without it.
 */
const REFUSAL_KEYS = {
  'workforce.timesheet-period-already-approved': 'wft_refusal_already_approved',
  'workforce.timesheet-period-incomplete': 'wft_refusal_incomplete',
  'workforce.timesheet-period-empty': 'wft_refusal_empty',
  'workforce.timesheet-period-not-approved': 'wft_refusal_not_approved',
  'workforce.timesheet-period-id-mismatch': 'wft_refusal_id_mismatch',
  'workforce.timesheet-nothing-to-reconcile': 'wft_refusal_nothing_to_reconcile',
  'workforce.timesheet-export-provider-unknown': 'wft_refusal_provider_unknown',
  'workforce.timesheet-export-failed': 'wft_refusal_export_failed',
  'workforce.flag-disabled-read-only': 'wft_refusal_flag_disabled',
  'workforce.idempotency-in-progress': 'wft_refusal_in_progress'
};

/**
 * The i18n key for a typed refusal, or null when this surface has no sentence for it.
 *
 * Null is the signal to print the generic refusal WITH the code, not to swallow the error. A page
 * that mapped everything unknown onto "something went wrong" would hide exactly the new refusal a
 * future backend adds.
 */
export function refusalKeyFor (code) {
  if (!code) { return null; }
  return REFUSAL_KEYS[code] || null;
}

/** True when the failure is worth offering a retry for. Only one refusal in this family is. */
export function isRetryable (error) {
  return !!(error && error.retryable === true);
}

/**
 * Hours as a venue reads them, from a minute count that may be UNKNOWN.
 *
 * `null`/`undefined` is the unknown marker rather than "0 t" — see this file's header. Minutes are
 * integers on the wire; a non-integer is a contract violation rather than something to round, so it
 * is reported as unknown too rather than silently floored into a payroll number.
 */
export function formatMinutes (minutes) {
  if (minutes === null || minutes === undefined) { return '—'; }
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || !Number.isInteger(minutes)) { return '—'; }
  const sign = minutes < 0 ? '-' : '';
  const total = Math.abs(minutes);
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return sign + hours + ' t ' + (rest < 10 ? '0' + rest : rest) + ' min';
}

/**
 * THE STAGE FLAG IS THREE-STATE, AND THIS IS WHERE THAT IS ENFORCED.
 *
 * `true` the store's export switch is on, `false` it is off — both are the SERVER'S answer, read off
 * the list response's own field. `null`/`undefined` is UNKNOWN: the list has not answered, or the
 * read failed, and nobody has asked the store about its switch at all.
 *
 * The two are kept apart for the same reason every other UNKNOWN on this surface is. "Export is
 * switched off for this store" is a statement about the store's configuration; a page that says it
 * because a read timed out is telling a manager something nobody established, and the sentence is
 * one they may act on — it reads as "stop asking, an operator has to pull a lever".
 *
 * It shipped collapsed. `exportEnabled` on the page was `!!(listResult && listResult.exportEnabled)`,
 * so an unread flag arrived here as `false`, and the page's own flag-off BANNER two elements away
 * got it right (`v-if="listResult && !listResult.exportEnabled"`) while the withheld-reason beside
 * the button did not. The path is not exotic: `refresh()` re-reads the detail whatever
 * `ListTimesheets` did, so ANY approve or export — success or refusal — followed by one failed list
 * re-read leaves a real period on screen under a fabricated claim about the switch.
 */
function flagState (exportEnabled) {
  if (exportEnabled === null || exportEnabled === undefined) { return 'unread'; }
  return exportEnabled === true ? 'on' : 'off';
}

/**
 * Whether the APPROVE control may be offered at all, and if not, why.
 *
 * Returns `{ enabled, reasonKey }` rather than a bare boolean: a control that is simply missing
 * teaches a manager nothing, and this surface has five distinct reasons it can be withheld. The
 * reason is what the page prints beside the disabled button.
 *
 * The capability and the flag are BOTH the server's answers, not this app's opinion — `capabilities`
 * comes from `GET /context` and `exportEnabled` from the list response's own field. Deriving either
 * locally would be a second copy of an authorization rule.
 *
 * An UNREAD flag withholds the control exactly as an off one does — a write whose gate nobody has
 * read cannot honestly be offered, and the server would refuse it anyway. Only the SENTENCE differs,
 * and the sentence is the whole point.
 */
export function approveAvailability (options) {
  const opts = options || {};
  const period = opts.period || null;

  if (!opts.hasPayrollCapability) {
    return { enabled: false, reasonKey: 'wft_gate_no_payroll_capability' };
  }
  if (flagState(opts.exportEnabled) === 'unread') {
    return { enabled: false, reasonKey: 'wft_gate_flag_unread' };
  }
  if (opts.exportEnabled !== true) {
    return { enabled: false, reasonKey: 'wft_gate_flag_off' };
  }
  if (!period) {
    return { enabled: false, reasonKey: 'wft_gate_no_period' };
  }
  if (period.status === STATUS_APPROVED || period.status === STATUS_EXPORTED) {
    return { enabled: false, reasonKey: 'wft_gate_already_approved' };
  }
  // An empty period is refused by the server (`timesheet-period-empty`) because freezing one would
  // put a payroll artifact on the record asserting that nobody worked. Saying so before the click
  // beats firing a request that can only fail.
  if (!period.lineCount) {
    return { enabled: false, reasonKey: 'wft_gate_empty' };
  }
  return { enabled: true, reasonKey: null };
}

/**
 * Whether the EXPORT control may be offered, and if not, why.
 *
 * Note what is NOT withheld here: a period that has already been exported keeps the control, because
 * a second export is how an ADJUSTMENT batch is raised when something has changed since. The server
 * decides whether there is a delta and refuses with `timesheet-nothing-to-reconcile` when there is
 * not. Hiding the button would make the adjustment path unreachable, which is the one correction
 * route an immutable period has.
 *
 * The flag is three-state here for the same reason it is in `approveAvailability` — see `flagState`.
 */
export function exportAvailability (options) {
  const opts = options || {};
  const period = opts.period || null;

  if (!opts.hasPayrollCapability) {
    return { enabled: false, reasonKey: 'wft_gate_no_payroll_capability' };
  }
  if (flagState(opts.exportEnabled) === 'unread') {
    return { enabled: false, reasonKey: 'wft_gate_flag_unread' };
  }
  if (opts.exportEnabled !== true) {
    return { enabled: false, reasonKey: 'wft_gate_flag_off' };
  }
  if (!period) {
    return { enabled: false, reasonKey: 'wft_gate_no_period' };
  }
  if (period.status === STATUS_OPEN) {
    return { enabled: false, reasonKey: 'wft_gate_not_approved' };
  }
  return { enabled: true, reasonKey: null };
}

/**
 * Whether a batch's bytes can be fetched back.
 *
 * Deliberately independent of the export flag and of the period's status: the download is UNGATED on
 * the server (§9.2 / WFJ-15) precisely so that what has already been sent stays retrievable after
 * the switch goes down. A page that gated it on `exportEnabled` would make an accountant's file
 * unreachable at exactly the moment somebody pulled the lever.
 *
 * A FAILED batch has no bytes — the attempt is recorded and the key spent, but nothing was rendered
 * — so it is the one case that is genuinely not downloadable.
 */
export function canDownload (batch) {
  return !!(batch && batch.batchId && batch.outcome === 'Succeeded');
}

/**
 * The unknown-hours count a manager must decide about before freezing, or null when UNKNOWN.
 *
 * Null propagates rather than collapsing to 0 — see this file's header. The caller renders the
 * unknown marker; it must not render "0 rows need attention".
 */
export function incompleteCount (period) {
  if (!period) { return null; }
  const value = period.incompleteRowCount;
  if (typeof value !== 'number' || !Number.isFinite(value)) { return null; }
  return value;
}

/**
 * The periods a list response carries, newest range first, with UNKNOWN preserved.
 *
 * The server inserts the synthesised `Open` row at index 0 for the requested range; that ORDER is
 * meaningful (it is the period the manager asked about) and is preserved rather than re-sorted.
 */
export function periodsOf (listResult) {
  if (!listResult) { return null; }
  const periods = listResult.periods;
  return Array.isArray(periods) ? periods : null;
}

/** The period a manager is acting on — the one matching the range they asked for. */
export function periodFor (listResult, fromBusinessDate, toBusinessDate) {
  const periods = periodsOf(listResult);
  if (!periods) { return null; }
  return periods.find(p => p &&
    p.fromBusinessDate === fromBusinessDate &&
    p.toBusinessDate === toBusinessDate) || null;
}
