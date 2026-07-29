// The attendance read (`GET /attendance?from&to`, endpoint 25) as a table: planned against clocked,
// per person per venue business day.
//
// THE ONE THING A READER MUST BE TOLD. `PlannedMinutes` counts PUBLISHED shift assignments and
// nothing else (`WorkforceAttendanceService`: `a.State == WorkforceShiftAssignmentState.Published`).
// A week still in draft contributes NO planned minutes, so every variance in it reads as pure
// overtime and every unclocked draft shift is invisible. That is a correct answer to the question
// the endpoint was asked and a badly misleading one to the question a manager thinks they asked, so
// the table states it in prose above the rows (`wfrt_att_published_only`) in every state it can be
// in, rather than leaving it for someone to discover from a variance that made no sense.
//
// A ROW EXISTS FOR A PUBLISHED PLAN, A CLOCKED SESSION, OR BOTH. So `plannedMinutes: 0` on a row is
// a real answer — "no published shift contributed to this staff-day" — and it is rendered as the
// zero it is. It is NOT turned into a dash: unknown and zero are different claims and this figure is
// never unknown once the read succeeds.
//
// EVERY INSTANT GOES THROUGH `parseApiInstant`. `localBusinessDate` is an EF column-loaded
// `DateTime` and serialises BARE (`2026-09-01T00:00:00`); `new Date` would read it as browser-local
// and, east of UTC, name the day before.

import { businessDateKey, parseApiInstant } from '~/utils/workforce/week-range';

/** The read failed or has not run. */
export const ATTENDANCE_UNKNOWN = 'unknown';
/** The server answered: no published shift and no clocked session in this window. */
export const ATTENDANCE_EMPTY = 'empty';
/** The server answered with rows. */
export const ATTENDANCE_LISTED = 'listed';

/**
 * Projects a `WorkforceAttendanceResponse`.
 *
 * A null/failed response is `unknown` and carries no rows. An answered response with an empty row
 * list is `empty` — a positive claim about the window, and the only one that may be rendered as
 * "nothing happened here".
 */
export function buildAttendance (response) {
  if (!response || !Array.isArray(response.rows)) {
    return {
      state: ATTENDANCE_UNKNOWN,
      rows: [],
      timeZoneId: null,
      asOfUtc: null,
      missingPunchCount: 0,
      adjustedRowCount: 0
    };
  }

  const rows = response.rows.map(toRow);

  return {
    state: rows.length ? ATTENDANCE_LISTED : ATTENDANCE_EMPTY,
    rows,
    timeZoneId: response.timeZoneId || null,
    asOfUtc: parseApiInstant(response.asOfUtc),
    // Counts of rows the SERVER flagged, not a re-derivation of the flag. `missingPunch` already
    // means "a planned day with nothing clocked, or a session left open", and recomputing it here
    // would put a second definition of the same word on the same screen.
    missingPunchCount: rows.filter(row => row.missingPunch).length,
    adjustedRowCount: rows.filter(row => row.adjustmentCount > 0).length
  };
}

function toRow (source) {
  const row = source || {};
  const pending = wholeOrZero(row.pendingAdjustmentCount);
  const approved = wholeOrZero(row.approvedAdjustmentCount);
  const rejected = wholeOrZero(row.rejectedAdjustmentCount);

  return {
    staffMemberId: row.staffMemberId || null,
    // Null when the engagement could not be named. Rendered as a dash — never as the id, which
    // would look like a name nobody has.
    displayName: row.displayName || null,
    // The venue's business day as `YYYY-MM-DD`, sliced off the wire rather than derived from an
    // instant: the server already placed this day in the store's zone.
    businessDate: businessDateKey(row.localBusinessDate),
    plannedMinutes: wholeOrNull(row.plannedMinutes),
    actualMinutes: wholeOrNull(row.actualMinutes),
    paidBreakMinutes: wholeOrNull(row.paidBreakMinutes),
    unpaidBreakMinutes: wholeOrNull(row.unpaidBreakMinutes),
    varianceMinutes: wholeOrNull(row.varianceMinutes),
    missingPunch: row.missingPunch === true,
    openSessionCount: wholeOrZero(row.openSessionCount),
    pendingAdjustmentCount: pending,
    approvedAdjustmentCount: approved,
    rejectedAdjustmentCount: rejected,
    adjustmentCount: pending + approved + rejected,
    locked: row.locked === true
  };
}

/**
 * A minute count as `7 t 30 min`, or a dash when it is unknown.
 *
 * Signed, because variance is genuinely negative when somebody worked less than planned. The sign is
 * PLACED in front of the formatted magnitude rather than left inside the arithmetic, for the same
 * reason `utils/margin/money.js` does it for money: a formatter fed a negative value renders
 * "-1 t -15 min", which reads as two negatives and is not the figure. The minus is U+2212 so it
 * cannot be mistaken for a hyphen.
 */
export function formatMinutes (minutes, dash = '—') {
  if (minutes === null || minutes === undefined || !Number.isFinite(minutes)) { return dash; }

  const magnitude = Math.abs(minutes);
  const hours = Math.floor(magnitude / 60);
  const rest = magnitude % 60;
  const body = hours > 0 ? hours + ' t ' + rest + ' min' : rest + ' min';

  return minutes < 0 ? '−' + body : body;
}

function wholeOrNull (value) {
  return Number.isFinite(value) ? value : null;
}

function wholeOrZero (value) {
  return Number.isFinite(value) ? value : 0;
}

export default buildAttendance;
