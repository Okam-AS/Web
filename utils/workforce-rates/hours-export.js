// The payroll hours file: which range may be asked for, and what the returned file says about
// itself before anyone hands it to payroll.
//
// THE RANGE IS THE VENUE'S CALENDAR, INCLUSIVE AT BOTH ENDS. `GetHoursExport` binds two strings and
// parses them with `DateOnly.TryParseExact(…, "yyyy-MM-dd")` — deliberately not as `DateTime`,
// because a `DateTime` carries a Kind and the export must never re-derive a business date from a UTC
// instant. Everything in this file is therefore civil-date arithmetic on `yyyy-MM-dd` strings: no
// instant is constructed, so no zone can be picked wrongly.
//
// WHAT THE FILE SAYS ABOUT ITSELF. The CSV opens with a `# key=value` preamble the server renders
// itself (`WorkforceHoursExportService.RenderCsv`), and `complete` / `incompleteRowCount` in it are
// the whole reason a manager can trust the file. A row whose minutes are UNKNOWN — an open session,
// a missing punch, an approved correction the export cannot apply — is exported with an EMPTY
// minutes cell and counted there, never as a zero. These figures are READ off the preamble and
// never recomputed from the rows: a second count that disagreed with the server's would leave
// nobody able to say which one payroll should believe.

import { isoDate, partsInZone } from '~/utils/workforce/week-range';

/** `WorkforceHoursExportService.MaxRangeDays` — the server refuses a longer window with a 400. */
export const MAX_EXPORT_DAYS = 366;

/** The preamble version this parser understands (`# version=1`). */
export const SUPPORTED_META_VERSION = '1';

/** One or both bounds are missing or malformed. */
export const RANGE_MISSING = 'missing';
/** `to` precedes `from`. */
export const RANGE_REVERSED = 'reversed';
/** More than `MAX_EXPORT_DAYS` inclusive days. */
export const RANGE_TOO_LONG = 'too-long';

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86400000;

/**
 * The store-local calendar date of an instant, as `yyyy-MM-dd`.
 *
 * Resolved through the STORE's zone, never the browser's. A manager in a different zone from the
 * venue must still be offered the venue's today — the export's business dates are the venue's, and
 * defaulting the form to the viewer's date would silently ask for a different day.
 */
export function businessDateIn (timeZoneId, instant) {
  if (!timeZoneId || !instant) { return null; }
  const parts = partsInZone(timeZoneId, instant);
  return isoDate(parts.year, parts.month, parts.day);
}

/** `yyyy-MM-dd` stepped by whole CIVIL days. Returns null for a malformed input. */
export function shiftBusinessDate (localDate, days) {
  const civil = civilOf(localDate);
  if (civil === null) { return null; }
  const moved = new Date(civil + days * MS_PER_DAY);
  return isoDate(moved.getUTCFullYear(), moved.getUTCMonth() + 1, moved.getUTCDate());
}

/**
 * How many days the inclusive range covers, or null when either bound is malformed.
 *
 * Computed on `Date.UTC` triples — a fixed 86 400 000 ms per day with no zone in sight. Doing this
 * in a real zone would make a DST weekend 23 or 25 hours long and round a range to the wrong count;
 * a payroll period is a count of CALENDAR days, not of elapsed time.
 */
export function inclusiveDayCount (fromBusinessDate, toBusinessDate) {
  const from = civilOf(fromBusinessDate);
  const to = civilOf(toBusinessDate);
  if (from === null || to === null) { return null; }
  return Math.round((to - from) / MS_PER_DAY) + 1;
}

/**
 * The range the server would accept, checked here first.
 *
 * Not decoration: the server's refusals are plain module 400s with an English `detail`, so a form
 * that let them through would render untranslated prose at a manager who typed a perfectly
 * understandable mistake. Returns null when the range is good.
 */
export function validateExportRange (fromBusinessDate, toBusinessDate) {
  const days = inclusiveDayCount(fromBusinessDate, toBusinessDate);
  if (days === null) { return RANGE_MISSING; }
  if (days < 1) { return RANGE_REVERSED; }
  if (days > MAX_EXPORT_DAYS) { return RANGE_TOO_LONG; }
  return null;
}

/**
 * The `# key=value` preamble of a returned CSV.
 *
 * Every field is null when the preamble did not carry it, and `complete` is TRI-STATE — `true`,
 * `false`, or null for "the file did not say". Defaulting an unstated `complete` to either boolean
 * would be the exact lie this whole surface exists to avoid: a file that never claimed to be
 * complete must not be shown as complete, and one that never claimed to be incomplete must not be
 * shown as broken.
 *
 * `version` is returned so the caller can refuse to interpret a preamble it does not know. A future
 * version 2 that renamed `complete` would otherwise be read as "did not say" and shown as unknown,
 * which is survivable — but the caller should be able to say WHY.
 */
export function parseHoursExportMeta (csvText) {
  const meta = {
    version: null,
    storeId: null,
    timeZoneId: null,
    fromBusinessDate: null,
    toBusinessDate: null,
    basis: null,
    wageMath: null,
    rowCount: null,
    complete: null,
    incompleteRowCount: null
  };

  if (typeof csvText !== 'string' || csvText === '') { return meta; }

  for (const rawLine of csvText.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    // The preamble is a contiguous block at the top; the first non-comment line is the column
    // header and every line after it is data. Stopping here keeps a `#` inside a quoted name from
    // ever being read as metadata.
    if (line.charAt(0) !== '#') { break; }

    const body = line.slice(1).trim();
    const equals = body.indexOf('=');
    if (equals < 1) { continue; }

    const key = body.slice(0, equals).trim();
    const value = body.slice(equals + 1).trim();

    switch (key) {
    case 'version': meta.version = value; break;
    case 'storeId': meta.storeId = value; break;
    case 'timeZoneId': meta.timeZoneId = value; break;
    case 'fromBusinessDate': meta.fromBusinessDate = value; break;
    case 'toBusinessDate': meta.toBusinessDate = value; break;
    case 'basis': meta.basis = value; break;
    case 'wageMath': meta.wageMath = value; break;
    case 'rowCount': meta.rowCount = wholeNumber(value); break;
    case 'incompleteRowCount': meta.incompleteRowCount = wholeNumber(value); break;
    case 'complete':
      // Only the two spellings the server emits are believed. Anything else stays unknown.
      meta.complete = value === 'true' ? true : (value === 'false' ? false : null);
      break;
    default: break;
    }
  }

  return meta;
}

/** True only when the preamble is the version this parser was written against. */
export function metaIsUnderstood (meta) {
  return !!meta && meta.version === SUPPORTED_META_VERSION;
}

function civilOf (localDate) {
  const match = typeof localDate === 'string' ? LOCAL_DATE.exec(localDate) : null;
  if (!match) { return null; }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const civil = Date.UTC(year, month - 1, day);

  // `Date.UTC(2026, 1, 31)` silently rolls into 3 March. A date the manager typed that does not
  // exist must be refused, not quietly moved — the export would then cover a window nobody asked
  // for. Round-tripping the components is what catches it.
  const back = new Date(civil);
  if (back.getUTCFullYear() !== year || back.getUTCMonth() + 1 !== month || back.getUTCDate() !== day) {
    return null;
  }

  return civil;
}

function wholeNumber (value) {
  return /^\d+$/.test(value) ? Number(value) : null;
}
