// The Workforce week grid model: the pure function between what the API returned and what the page
// draws. No Vue, no network — so the placement rules below are testable on their own.
//
// The one law this file exists to keep: UNKNOWN IS NOT ZERO. Three data states are distinguished
// and never collapsed, because a manager reads them as three different facts:
//
//   unknown  — the range read has not answered (or failed). Nothing may be counted or claimed.
//   no-plan  — the read answered and NO revision resolves for this view. There is no schedule here.
//   counted  — a revision resolved. Its shift counts are real, and a day holding none is a true 0.
//
// Only `counted` produces numbers. `unknown` and `no-plan` produce nulls, which the grid renders as
// an em dash rather than as a confident "0 vakter".

import { parseApiInstant, businessDateKey } from '~/utils/workforce/week-range';

export const DATA_UNKNOWN = 'unknown';
export const DATA_NO_PLAN = 'no-plan';
export const DATA_COUNTED = 'counted';

export const OPEN_ROW_KEY = 'open';

const MINUTE_MS = 60000;

const MARKER_UNAVAILABLE = 'unavailable';
const MARKER_PREFER_NOT = 'prefer-not';
const MARKER_TIME_OFF = 'time-off';
const MARKER_TIME_OFF_PENDING = 'time-off-pending';

function pad2 (n) {
  return String(n).padStart(2, '0');
}

/** Wall-clock `HH:mm` in the store zone, from the instant plus the offset the server stamped on it. */
function localClock (instant, offsetMinutes) {
  if (!instant) { return null; }
  const shifted = new Date(instant.getTime() + (offsetMinutes || 0) * MINUTE_MS);
  return pad2(shifted.getUTCHours()) + ':' + pad2(shifted.getUTCMinutes());
}

/**
 * The paid length of one assignment. Unpaid breaks are subtracted (paid breaks are, by definition,
 * already inside the span). Never negative: a malformed pair must read as 0 rather than as a
 * negative that would quietly shrink a week total.
 */
export function paidMinutesOf (assignment) {
  const starts = parseApiInstant(assignment.startsUtc);
  const ends = parseApiInstant(assignment.endsUtc);
  if (!starts || !ends) { return 0; }
  const span = Math.round((ends.getTime() - starts.getTime()) / MINUTE_MS);
  return Math.max(0, span - (assignment.unpaidBreakMinutes || 0));
}

function toShift (assignment) {
  const starts = parseApiInstant(assignment.startsUtc);
  const ends = parseApiInstant(assignment.endsUtc);
  return {
    id: assignment.shiftAssignmentId,
    roleName: assignment.roleName || null,
    note: assignment.note || null,
    state: assignment.state || null,
    start: localClock(starts, assignment.startOffsetMinutes),
    end: localClock(ends, assignment.endOffsetMinutes),
    paidMinutes: paidMinutesOf(assignment),
    // An assignment whose end falls on a later local date than its business date is an overnight
    // shift; it stays in its business-date column (the server's own day attribution) and says so.
    crossesMidnight: !!(ends && starts &&
      Math.floor((ends.getTime() + (assignment.endOffsetMinutes || 0) * MINUTE_MS) / 86400000) >
      Math.floor((starts.getTime() + (assignment.startOffsetMinutes || 0) * MINUTE_MS) / 86400000)),
    isConflicting: false
  };
}

/**
 * Unavailability markers for the week, from the manager request inbox
 * (`GET /workforce/stores/{storeId}/requests?state=all`). That one read carries both families the
 * grid needs: one-off availability exceptions (informational, never decided) and time-off requests
 * (decided or in flight). A REJECTED, withdrawn or expired time-off is not an absence and produces
 * no marker; a still-undecided one does, marked as pending, because a manager scheduling over a
 * pending request needs to see it is pending rather than see nothing at all.
 */
export function markersFromRequests (requests) {
  const markers = [];
  for (const item of requests || []) {
    if (!item || !item.staffMemberId) { continue; }

    let kind = null;
    if (item.kind === 'availability-exception') {
      if (item.availabilityKind === 'Unavailable') { kind = MARKER_UNAVAILABLE; }
      if (item.availabilityKind === 'Preferred') { kind = MARKER_PREFER_NOT; }
    } else if (item.kind === 'time-off') {
      if (item.status === 'Approved') { kind = MARKER_TIME_OFF; }
      if (item.status === 'Submitted' || item.status === 'UnderReview') { kind = MARKER_TIME_OFF_PENDING; }
    }
    if (!kind) { continue; }

    const from = businessDateKey(item.localStartDate);
    const to = businessDateKey(item.localEndDate) || from;
    if (!from) { continue; }

    markers.push({ staffMemberId: item.staffMemberId, kind, fromKey: from, toKey: to });
  }
  return markers;
}

// Deduplicated by kind: two separate unavailability exceptions covering the same day are one fact
// to a manager, and rendering them twice would also collide on the list key.
function markersFor (markers, staffMemberId, dayKey) {
  const kinds = [];
  for (const marker of markers || []) {
    if (marker.staffMemberId !== staffMemberId) { continue; }
    if (marker.fromKey > dayKey || dayKey > marker.toKey) { continue; }
    if (!kinds.includes(marker.kind)) { kinds.push(marker.kind); }
  }
  return kinds;
}

function emptyCell (isoDate) {
  return { isoDate, shifts: [], markers: [], hasConflict: false };
}

function resolveDataState (range) {
  if (!range) { return DATA_UNKNOWN; }
  return range.scheduleRevisionId ? DATA_COUNTED : DATA_NO_PLAN;
}

/**
 * Builds the week grid.
 *
 * `days`      — the seven store-local dates from `weekRange`.
 * `range`     — the `GET /schedules` body, or null/undefined while unknown.
 * `staff`     — the `GET /staff` roster, or null/undefined while unknown.
 * `markers`   — from `markersFromRequests`, or null/undefined while unknown.
 * `conflict`  — the last typed 409 the surface returned, if any (see `applyConflict` semantics).
 *
 * Every rostered employee occupies a row even with nothing scheduled: an unstaffed row is the
 * information a manager came for, and a row that disappears when empty hides exactly that. The open
 * shift row is pinned first for the same reason — an unassigned shift is a first-class object here
 * (`staffMemberId` is nullable server-side), not a gap.
 */
export function buildWeekGrid (options) {
  const opts = options || {};
  const days = opts.days || [];
  const range = opts.range;
  const markers = opts.markers;
  const conflict = opts.conflict;
  const dataState = resolveDataState(range);
  const counted = dataState === DATA_COUNTED;

  const assignments = (range && range.assignments) || [];
  const rosterKnown = Array.isArray(opts.staff);
  const roster = rosterKnown ? opts.staff : [];

  const conflictingId = conflict && conflict.conflictKind === 'assignment-overlap'
    ? conflict.conflictingAssignmentId
    : null;
  const hiddenConflict = !!(conflict && conflict.conflictKind === 'hidden-engagement-conflict');

  const dayKeys = days.map(d => d.isoDate);
  const perDayCount = {};
  for (const key of dayKeys) { perDayCount[key] = 0; }

  // Bucket assignments by row and day. The day comes from the server's `localBusinessDate`, never
  // from re-deriving a date off `startsUtc` here: the business date is what the backend attributes
  // the shift to (and what an overnight shift is counted under), so re-deriving it would put the
  // grid and the payroll/attendance side on different days.
  const buckets = {};
  const seenStaff = {};
  for (const assignment of assignments) {
    const dayKey = businessDateKey(assignment.localBusinessDate);
    if (dayKey === null || !(dayKey in perDayCount)) { continue; }

    const rowKey = assignment.isOpenShift || !assignment.staffMemberId
      ? OPEN_ROW_KEY
      : assignment.staffMemberId;
    if (rowKey !== OPEN_ROW_KEY) {
      seenStaff[rowKey] = assignment.staffDisplayName || null;
    }

    const shift = toShift(assignment);
    if (conflictingId && shift.id === conflictingId) { shift.isConflicting = true; }

    if (!buckets[rowKey]) { buckets[rowKey] = {}; }
    if (!buckets[rowKey][dayKey]) { buckets[rowKey][dayKey] = []; }
    buckets[rowKey][dayKey].push(shift);
    perDayCount[dayKey]++;
  }

  const buildRow = (key, name, meta) => {
    const cells = days.map((day) => {
      const cell = emptyCell(day.isoDate);
      const shifts = (buckets[key] && buckets[key][day.isoDate]) || [];
      cell.shifts = shifts.slice().sort((a, b) => String(a.start).localeCompare(String(b.start)));
      cell.hasConflict = cell.shifts.some(s => s.isConflicting);
      cell.markers = key === OPEN_ROW_KEY ? [] : markersFor(markers, key, day.isoDate);
      return cell;
    });

    const shiftCount = counted ? cells.reduce((sum, c) => sum + c.shifts.length, 0) : null;
    const minutes = counted
      ? cells.reduce((sum, c) => sum + c.shifts.reduce((s, shift) => s + shift.paidMinutes, 0), 0)
      : null;

    return Object.assign({
      key,
      name,
      cells,
      hasConflict: cells.some(c => c.hasConflict),
      totals: { shiftCount, minutes, cost: null }
    }, meta || {});
  };

  const rows = roster
    .filter(s => s && s.staffMemberId)
    .map(s => buildRow(s.staffMemberId, s.displayName || s.staffMemberId, {
      staffMemberId: s.staffMemberId,
      isRostered: true,
      isActive: s.isActive !== false,
      employmentNumber: s.employmentNumber || null
    }));

  // A shift can reference someone the roster read did not return (an engagement closed since the
  // draft was built). Dropping the row would delete a real, scheduled shift from the manager's
  // view, so it is appended and flagged instead.
  const rosterIds = {};
  for (const row of rows) { rosterIds[row.key] = true; }
  for (const staffMemberId of Object.keys(seenStaff)) {
    if (rosterIds[staffMemberId]) { continue; }
    rows.push(buildRow(staffMemberId, seenStaff[staffMemberId] || staffMemberId, {
      staffMemberId,
      isRostered: false,
      isActive: null,
      employmentNumber: null
    }));
  }

  const openRow = buildRow(OPEN_ROW_KEY, null, { isOpenRow: true });

  return {
    dataState,
    rosterKnown,
    markersKnown: Array.isArray(markers),
    view: (range && range.view) || null,
    state: (range && range.state) || null,
    revisionNumber: (range && typeof range.revisionNumber === 'number') ? range.revisionNumber : null,
    publicationNumber: (range && typeof range.publicationNumber === 'number') ? range.publicationNumber : null,
    scheduleRevisionId: (range && range.scheduleRevisionId) || null,
    timeZoneId: (range && range.timeZoneId) || null,
    asOfUtc: (range && range.asOfUtc) || null,
    hiddenConflict,
    days: days.map(day => ({
      isoDate: day.isoDate,
      year: day.year,
      month: day.month,
      day: day.day,
      shiftCount: counted ? perDayCount[day.isoDate] : null
    })),
    openRow,
    rows,
    totals: {
      shiftCount: counted ? Object.keys(perDayCount).reduce((sum, k) => sum + perDayCount[k], 0) : null,
      minutes: counted
        ? [openRow].concat(rows).reduce((sum, r) => sum + (r.totals.minutes || 0), 0)
        : null,
      // The money lane owns this. It stays null until a rate resolves; it is never a 0.
      cost: null
    }
  };
}

/** `7t 30m` — the grid's hour format. Null in, null out: an unknown total must not read as `0t`. */
export function formatMinutes (minutes) {
  if (minutes === null || minutes === undefined) { return null; }
  const whole = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? whole + 't' : whole + 't ' + rest + 'm';
}
