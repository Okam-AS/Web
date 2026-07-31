// The worker's own availability (#36) and time-off requests (#37/#38), as logic.
//
// THE WHOLE POINT OF THIS FILE is the calendar-date → UTC-instant mapping. Both endpoints take UTC
// instants and the server derives the LOCAL business dates from them in the STORE's zone
// (`WorkforceTimeOffService`: `LocalStartDate = ConvertTimeFromUtc(startsUtc, zone).Date`). A worker
// picks calendar dates, and getting the conversion wrong does not fail — it silently files the
// request on the wrong days. Sending naive UTC midnight for "1–3 August" from Oslo stores it as
// 1–4 August, because 3 Aug 24:00 UTC is 4 Aug 02:00 local.
//
// Every conversion therefore goes through `zonedMidnightToUtc`, which resolves the offset AT the
// instant in question (two passes, so a DST weekend still lands on real local midnight) rather than
// reusing a "current offset" that is wrong for half the year.

import { zonedMidnightToUtc } from '~/utils/workforce/week-range';

const MINUTE_MS = 60000;
const MINUTES_PER_DAY = 1440;

/** The three kinds an availability rule or exception can express (`WorkforceAvailabilityKind`). */
export const AVAILABILITY_KINDS = ['Available', 'Preferred', 'Unavailable'];

/** Who may see a time-off request beyond the worker (`WorkforceTimeOffVisibility`). */
export const VISIBILITIES = ['Managers', 'Team'];

/** ISO weekday order for the form, mapped to the server's 0 = Sunday … 6 = Saturday. */
export const WEEKDAYS = [
  { dayOfWeek: 1, labelKey: 'wfme_day_mon' },
  { dayOfWeek: 2, labelKey: 'wfme_day_tue' },
  { dayOfWeek: 3, labelKey: 'wfme_day_wed' },
  { dayOfWeek: 4, labelKey: 'wfme_day_thu' },
  { dayOfWeek: 5, labelKey: 'wfme_day_fri' },
  { dayOfWeek: 6, labelKey: 'wfme_day_sat' },
  { dayOfWeek: 0, labelKey: 'wfme_day_sun' }
];

/** `"08:30"` → 510. Null for anything that is not a well-formed 24-hour clock time. */
export function minuteOfDay (clock) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(clock || '').trim());
  if (!match) { return null; }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) { return null; }
  return hours * 60 + minutes;
}

/** 510 → `"08:30"`. The inverse, used to reload the server's answer back into the form. */
export function clockOf (minutes) {
  if (typeof minutes !== 'number' || minutes < 0 || minutes > MINUTES_PER_DAY) { return ''; }
  const pad = n => String(n).padStart(2, '0');
  return pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60);
}

/** `"2026-08-01"` → `{ year, month, day }`, or null when it is not a calendar date. */
export function parseIsoDate (value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) { return null; }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Round-tripped through the civil calendar so 31 February is REFUSED rather than rolling silently
  // into 3 March — a date picker is not the only way this value arrives.
  const civil = new Date(Date.UTC(year, month - 1, day));
  if (civil.getUTCFullYear() !== year || civil.getUTCMonth() + 1 !== month || civil.getUTCDate() !== day) {
    return null;
  }
  return { year, month, day };
}

/** The UTC instant of local midnight on the day AFTER a calendar date, in the store's zone. */
function nextLocalMidnightUtc (timeZoneId, date) {
  const civil = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
  return zonedMidnightToUtc(timeZoneId, civil.getUTCFullYear(), civil.getUTCMonth() + 1, civil.getUTCDate());
}

/** Why a form cannot be submitted. Each is a distinct sentence, never a silently disabled button. */
export const INVALID_NO_ZONE = 'no-zone';
export const INVALID_DATES = 'dates';
export const INVALID_ORDER = 'order';
export const INVALID_WINDOW = 'window';
export const VALID = null;

/**
 * The #37 body for a whole-day leave over a store-local calendar range, inclusive of both ends.
 *
 * `endsUtc` is one minute BEFORE local midnight of the day after `toDate`, not that midnight itself:
 * the server takes `LocalEndDate` from `endsUtc`'s local DATE, so local midnight would file the
 * request as ending a day later than the worker asked for. One minute inside the last day is the
 * instant that yields the intended date in every zone.
 *
 * Returns `{ error }` rather than throwing, so the form can say which of the three refusals applies.
 */
export function buildTimeOffRequest (input) {
  const form = input || {};
  if (!form.timeZoneId) { return { error: INVALID_NO_ZONE }; }

  const from = parseIsoDate(form.fromDate);
  const to = parseIsoDate(form.toDate);
  if (!from || !to) { return { error: INVALID_DATES }; }

  const startsUtc = zonedMidnightToUtc(form.timeZoneId, from.year, from.month, from.day);
  const endsUtc = new Date(nextLocalMidnightUtc(form.timeZoneId, to).getTime() - MINUTE_MS);
  if (endsUtc <= startsUtc) { return { error: INVALID_ORDER }; }

  return {
    error: VALID,
    body: {
      startsUtc: wire(startsUtc),
      endsUtc: wire(endsUtc),
      reason: form.reason || null,
      visibility: VISIBILITIES.includes(form.visibility) ? form.visibility : 'Managers'
    }
  };
}

/**
 * The #36 body from the form's seven weekday rows and its one-off exception rows.
 *
 * ALWAYS THE WHOLE WEEK. The endpoint supersedes the active rule set with whatever it is given, so a
 * partial submission is a deletion of everything omitted. The form therefore holds all seven days and
 * this builder sends every enabled one; a disabled day is an intentional absence, which is the same
 * thing the server will store.
 *
 * `effectiveFromUtc` is left at the zero value on purpose: the service reads `default(DateTime)` as
 * "now", which is what a worker editing their own week means, and inventing a client clock here would
 * put the browser's idea of now into a column the server otherwise owns.
 */
export function buildAvailabilityRequest (input) {
  const form = input || {};
  if (!form.timeZoneId) { return { error: INVALID_NO_ZONE }; }

  const rules = [];
  for (const row of form.rules || []) {
    if (!row || !row.enabled) { continue; }

    const start = minuteOfDay(row.start);
    const end = minuteOfDay(row.end);
    // The server's own bound: 0 <= start < end <= 1440. Checked here so the refusal names the day
    // rather than arriving as one 400 for the whole week.
    if (start === null || end === null || start >= end) { return { error: INVALID_WINDOW, dayOfWeek: row.dayOfWeek }; }

    rules.push({
      kind: AVAILABILITY_KINDS.includes(row.kind) ? row.kind : 'Available',
      dayOfWeek: row.dayOfWeek,
      startMinuteOfDay: start,
      endMinuteOfDay: end,
      effectiveFromUtc: '0001-01-01T00:00:00',
      effectiveToUtc: null,
      cutoffHoursBeforeShift: null
    });
  }

  const exceptions = [];
  for (const row of form.exceptions || []) {
    if (!row) { continue; }

    const date = parseIsoDate(row.date);
    if (!date) { return { error: INVALID_DATES }; }

    // A window with no times is the WHOLE local day: midnight to the next midnight. The server takes
    // `LocalDate` from `startsUtc`, so the trailing midnight cannot mislabel it.
    const startMinute = row.start ? minuteOfDay(row.start) : 0;
    const endMinute = row.end ? minuteOfDay(row.end) : MINUTES_PER_DAY;
    if (startMinute === null || endMinute === null || startMinute >= endMinute) { return { error: INVALID_WINDOW }; }

    const midnight = zonedMidnightToUtc(form.timeZoneId, date.year, date.month, date.day);
    exceptions.push({
      kind: AVAILABILITY_KINDS.includes(row.kind) ? row.kind : 'Unavailable',
      startsUtc: wire(new Date(midnight.getTime() + startMinute * MINUTE_MS)),
      endsUtc: wire(new Date(midnight.getTime() + endMinute * MINUTE_MS)),
      note: row.note || null
    });
  }

  return { error: VALID, body: { rules, exceptions } };
}

/**
 * The wire format for an instant the workforce surface binds as a plain `DateTime`: bare
 * `YYYY-MM-DDTHH:mm:ss`, no `Z` and no offset.
 *
 * The same rule `toUtcRangeParam` keeps for query bounds, and for the same reason: these actions call
 * `DateTime.SpecifyKind(value, Utc)`, which RELABELS without converting, so a value the binder had
 * already shifted into server-local time would be stamped "UTC" while holding local wall-clock. A
 * bare value is converted by nothing and arrives as the exact instant meant.
 */
function wire (instant) {
  return instant.toISOString().slice(0, 19);
}

/** Reloads a #36 response into the form's seven rows, so the session's next edit starts from truth. */
export function rulesFromResponse (response) {
  const byDay = {};
  for (const rule of (response && response.rules) || []) {
    // The active set can hold several windows on one day; the form carries one. The EARLIEST is
    // kept and the caller is told the rest exist, rather than a later one silently winning.
    const existing = byDay[rule.dayOfWeek];
    if (!existing || rule.startMinuteOfDay < existing.startMinuteOfDay) { byDay[rule.dayOfWeek] = rule; }
  }

  return WEEKDAYS.map((day) => {
    const rule = byDay[day.dayOfWeek];
    return {
      dayOfWeek: day.dayOfWeek,
      labelKey: day.labelKey,
      enabled: !!rule,
      kind: rule ? rule.kind : 'Available',
      start: rule ? clockOf(rule.startMinuteOfDay) : '09:00',
      end: rule ? clockOf(rule.endMinuteOfDay) : '17:00'
    };
  });
}

/** How many recurring windows the server holds that the single-window-per-day form cannot show. */
export function hiddenRuleCount (response) {
  const rules = (response && response.rules) || [];
  const seen = {};
  let hidden = 0;
  for (const rule of rules) {
    if (seen[rule.dayOfWeek]) { hidden += 1; } else { seen[rule.dayOfWeek] = true; }
  }
  return hidden;
}

/** The blank seven-row week the form opens with when nothing has been read. */
export function blankRules () {
  return rulesFromResponse(null);
}

// --- how a refused self-service write is read ------------------------------------------------------
//
// A sibling of `claim-outcome.js`, which classifies the OPEN-SHIFT surface. They are separate on
// purpose: `award-taken` is a truthful answer to asking for a shift and means nothing about a
// time-off request, and a shared function would have to answer both vocabularies at once. What they
// share — that the branch is keyed on the stable `code` and never on the prose — is the rule, not the
// code.

/** The submitted window or dates were refused by the server's own validation. */
export const SELF_INVALID = 'invalid';
/** The request has already been decided or withdrawn — a withdrawal has nothing left to act on. */
export const SELF_ALREADY_DECIDED = 'already-decided';
/** The store's module or its self-service stage is switched off. Read-only, nothing to retry. */
export const SELF_DISABLED = 'disabled';
/** The engagement does not carry `WorkforceSelf`. */
export const SELF_FORBIDDEN = 'forbidden';
/** The engagement or the request is absent, or is not this caller's. */
export const SELF_GONE = 'gone';
/** Anything unmodelled — a genuine failure. */
export const SELF_ERROR = 'error';

/** Classifies a refused #36 / #37 / #38, keyed on the stable `code` extension. */
export function classifySelfFailure (error) {
  if (!error) { return SELF_ERROR; }

  switch (error.code) {
  case 'workforce.invalid-time-off':
  case 'workforce.invalid-availability': return SELF_INVALID;
  case 'workforce.request-not-decidable': return SELF_ALREADY_DECIDED;
  case 'workforce.module-disabled':
  case 'workforce.flag-disabled-read-only': return SELF_DISABLED;
  case 'workforce.forbidden': return SELF_FORBIDDEN;
  case 'workforce.not-found': return SELF_GONE;
  }

  if (error.status === 404) { return SELF_GONE; }
  if (error.status === 403) { return SELF_FORBIDDEN; }

  return SELF_ERROR;
}

/** The `$i` key for the worker-facing sentence an outcome earns, per action. */
export function selfFailureMessageKey (outcome, action) {
  if (outcome === SELF_INVALID) {
    return action === 'availability' ? 'wfme_avail_invalid' : 'wfme_timeoff_invalid';
  }
  switch (outcome) {
  case SELF_ALREADY_DECIDED: return 'wfme_timeoff_already_decided';
  case SELF_DISABLED: return 'wfme_self_disabled';
  case SELF_FORBIDDEN: return 'wfme_self_forbidden';
  case SELF_GONE: return 'wfme_self_gone';
  default:
    return action === 'availability' ? 'wfme_avail_error' : 'wfme_timeoff_error';
  }
}

/** The `$i` key for a local validation refusal, before anything is sent. */
export function validationMessageKey (error) {
  switch (error) {
  case INVALID_NO_ZONE: return 'wfme_self_no_zone';
  case INVALID_DATES: return 'wfme_timeoff_bad_dates';
  case INVALID_ORDER: return 'wfme_timeoff_bad_order';
  case INVALID_WINDOW: return 'wfme_avail_bad_window';
  default: return '';
  }
}

/** The `$i` key for a time-off request's server-side status. */
export function timeOffStatusKey (status) {
  switch (status) {
  case 'Submitted': return 'wfme_timeoff_status_submitted';
  case 'UnderReview': return 'wfme_timeoff_status_review';
  case 'Approved': return 'wfme_timeoff_status_approved';
  case 'Rejected': return 'wfme_timeoff_status_rejected';
  case 'Withdrawn': return 'wfme_timeoff_status_withdrawn';
  case 'Expired': return 'wfme_timeoff_status_expired';
  default: return 'wfme_timeoff_status_unknown';
  }
}

/** True while a request is still open, so a withdrawal is legal (`WorkforceTimeOffService.IsOpen`). */
export function isOpenRequest (request) {
  return !!request && (request.status === 'Submitted' || request.status === 'UnderReview');
}
