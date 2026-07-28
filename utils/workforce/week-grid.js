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
//
// MONEY IS A FOURTH AXIS, not a fourth value of the one above. A week can be fully `counted` and
// still have no wage sum (a shift with no rate), and it can have a wage sum that is only a FLOOR (an
// unfilled vacancy). Those are different sentences from "the read failed" and from "there is no
// plan", so `readCost` below produces its own state and neither axis collapses the other.

import { parseApiInstant, businessDateKey, isoDate, partsInZone, offsetMinutesAt } from '~/utils/workforce/week-range';

export const DATA_UNKNOWN = 'unknown';
export const DATA_NO_PLAN = 'no-plan';
export const DATA_COUNTED = 'counted';

export const OPEN_ROW_KEY = 'open';

// --- the money axis --------------------------------------------------------------------------
//
// The states a cost node can be in. `refused` is the wire's `costComplete:false`: the backend
// deliberately withholds the total rather than hand over a partial sum, so there is no number to
// show and none may be reconstructed. `open` belongs to a single shift and is NOT a refusal — see
// `readShiftCost`.

/** No cost was read (or the week is not `counted`): nothing is known about the money. */
export const COST_UNKNOWN = 'unknown';
/** `costComplete:false` — a total does not exist. `incompleteCode` says why. */
export const COST_REFUSED = 'refused';
/** A real total in `totalMinor`. It is a FLOOR when `openShiftCount` is above zero. */
export const COST_TOTALLED = 'totalled';
/** One shift only: a vacancy. Never priced, never zero, never a defect. */
export const COST_OPEN = 'open';

// The `workforce.*` codes that reach a cost node's `incompleteCode`. Rendering keys on these, never
// on `incompleteDetail`, which is server prose.
export const COST_CURRENCY_MISMATCH = 'workforce.cost-currency-mismatch';
export const RATE_CURRENCY_MISMATCH = 'workforce.rate-currency-mismatch';
export const RATE_UNRESOLVED = 'workforce.rate-unresolved';

function numberOr (value, fallback) {
  return typeof value === 'number' && isFinite(value) ? value : fallback;
}

/**
 * Reads one totals node (`cost`, or one of `cost.days[]`) into the money axis.
 *
 * THE TWO RULES THE BACKEND'S SHAPE IMPOSES, both enforced here rather than at each call site:
 *
 * 1. `totalMinor` IS READ ONLY BEHIND `costComplete`. On the wire it is null exactly when the cost
 *    is incomplete, and the backend's own aggregator THROWS rather than expose the partial sum. A
 *    consumer that treated the null as 0 would reinvent the bug the whole layer exists to prevent,
 *    so the flag wins here even over a number that somehow arrived beside a false flag.
 * 2. AN OPEN SHIFT IS NOT AN INCOMPLETENESS. Vacancies are counted separately and excluded from the
 *    total, so a week holding them has a real cost that is a FLOOR. `isFloor` says so; it never
 *    suppresses the total, and the vacancy is never priced at a stand-in rate.
 *
 * Returns null when there is nothing to read at all, which the caller renders as unknown.
 */
export function readCost (node) {
  if (!node || typeof node !== 'object') { return null; }

  const complete = node.costComplete === true;
  const totalMinor = complete ? numberOr(node.totalMinor, null) : null;
  const openShiftCount = numberOr(node.openShiftCount, 0);

  return {
    // `complete` with no readable number is not a total — it stays unknown rather than becoming 0.
    state: complete ? (totalMinor === null ? COST_UNKNOWN : COST_TOTALLED) : COST_REFUSED,
    totalMinor,
    currency: node.currency || null,
    incompleteCode: complete ? null : (node.incompleteCode || null),
    incompleteDetail: complete ? null : (node.incompleteDetail || null),
    pricedShiftCount: numberOr(node.pricedShiftCount, 0),
    unpricedShiftCount: numberOr(node.unpricedShiftCount, 0),
    openShiftCount,
    openShiftMinutes: numberOr(node.openShiftMinutes, 0),
    // A total that vacancies will only add to. True even of a 0: a week of nothing but open shifts
    // costs "at least nothing", which is a very different claim from "this week is free".
    isFloor: openShiftCount > 0
  };
}

/**
 * Reads one shift's cost. A vacancy takes its OWN state: the backend refuses to price it because
 * there is no engagement to price and a role default would invent a stand-in for someone not yet
 * chosen. Folding it into the refusal would call a deliberate planning state a data defect; folding
 * it into a total would call it free.
 */
export function readShiftCost (node) {
  if (!node || typeof node !== 'object') { return null; }

  const isOpenShift = node.isOpenShift === true;
  const complete = !isOpenShift && node.costComplete === true;
  const totalMinor = complete ? numberOr(node.totalMinor, null) : null;

  let state = COST_REFUSED;
  if (isOpenShift) { state = COST_OPEN; } else if (complete) { state = totalMinor === null ? COST_UNKNOWN : COST_TOTALLED; }

  return {
    state,
    isOpenShift,
    totalMinor,
    currency: node.currency || null,
    refusalCode: state === COST_REFUSED ? (node.refusalCode || null) : null,
    refusalDetail: state === COST_REFUSED ? (node.refusalDetail || null) : null
  };
}

/**
 * The only member of the backend's closed `WorkforceExternalCommitmentKinds` vocabulary. It is
 * closed on purpose — every member must be provably store-anonymous — so an unrecognised kind is
 * rendered with a deliberately vaguer sentence rather than being described as a shift.
 */
export const EXTERNAL_PUBLISHED_SHIFT = 'external-published-shift';

const MINUTE_MS = 60000;
const DAY_MS = 86400000;

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

/**
 * One assignment, placed. THE shared shift primitive: the employee pivot, the role pivot and the
 * month view all draw this same object, so a placement rule fixed here is fixed everywhere.
 *
 * `roleId` and `staffName` are carried even though the employee grid renders neither — they are what
 * the role pivot groups on and what its cells label, and deriving them a second time somewhere else
 * is exactly the drift this file exists to prevent.
 *
 * `cost` is OPTIONAL and is passed only by the employee week grid, which is the one pivot whose
 * money the API actually answers (per shift, per day, per range). The role and month pivots call
 * this with one argument and get `cost: null` — not because the chip is unavailable to them, but
 * because a pivot that showed chips it may not add up would invite exactly the sum this layer
 * forbids. See `buildRoleGrid` and `month-grid.js` for the two refusals.
 */
export function toShift (assignment, cost) {
  const starts = parseApiInstant(assignment.startsUtc);
  const ends = parseApiInstant(assignment.endsUtc);
  return {
    id: assignment.shiftAssignmentId,
    // What THIS shift costs, rounded once by the backend over its own rate segments. Null when the
    // cost overlay is not on the response at all. It is a chip figure and nothing else: summing
    // these does not produce the day or the week (see `buildCostIndex`).
    cost: cost || null,
    // Nullable server-side. Null is a real answer — "this shift has no role" — and must never be
    // confused with a role id we merely failed to resolve.
    roleId: assignment.roleId || null,
    roleName: assignment.roleName || null,
    staffMemberId: assignment.staffMemberId || null,
    staffName: assignment.staffDisplayName || null,
    isOpen: !!(assignment.isOpenShift || !assignment.staffMemberId),
    note: assignment.note || null,
    state: assignment.state || null,
    start: localClock(starts, assignment.startOffsetMinutes),
    end: localClock(ends, assignment.endOffsetMinutes),
    // Instants, kept for the cross-store overlap check: an overlap is a fact about time, so it is
    // decided on UTC and no zone can change the answer. Null when the pair is unusable.
    startsMs: starts ? starts.getTime() : null,
    endsMs: ends ? ends.getTime() : null,
    paidMinutes: paidMinutesOf(assignment),
    // An assignment whose end falls on a later local date than its business date is an overnight
    // shift; it stays in its business-date column (the server's own day attribution) and says so.
    crossesMidnight: !!(ends && starts &&
      Math.floor((ends.getTime() + (assignment.endOffsetMinutes || 0) * MINUTE_MS) / DAY_MS) >
      Math.floor((starts.getTime() + (assignment.startOffsetMinutes || 0) * MINUTE_MS) / DAY_MS)),
    isConflicting: false,
    // Advisory, from the cross-store overlay — distinct from `isConflicting`, which is the server
    // naming this shift in a 409 it already refused.
    hasExternalClash: false
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

function emptyCell (dayKey) {
  return { isoDate: dayKey, shifts: [], markers: [], external: [], hasConflict: false, hasExternalClash: false };
}

/**
 * Places the cross-store overlay (`GET /schedules/external-commitments`) onto the week.
 *
 * TWO RULES THIS FUNCTION EXISTS TO KEEP.
 *
 * 1. THE OTHER STORE IS NEVER NAMED. The response carries kind and times only, because the write
 *    path's refusal for exactly these rows (`workforce.hidden-engagement-conflict`) names nothing
 *    either — the read must disclose no more than the refusal already does. Nothing is derived,
 *    joined or guessed here that could reintroduce an identity.
 *
 * 2. PLACEMENT IS BY `startsUtc` IN THE ROUTE STORE'S ZONE, NEVER BY `localBusinessDate`. That field
 *    is the OTHER store's business day — the backend says so explicitly — and the grid's columns are
 *    this store's days. Two stores in different zones (or with different day-cut conventions) would
 *    otherwise put the marker in the wrong column, which is the same epoch class of bug already
 *    pinned against Margin and Meals. `localBusinessDate` is deliberately not read at all.
 *
 * A commitment that spans midnight locally is placed on EVERY route-local day it covers, all of them
 * derived from `startsUtc`/`endsUtc`: a 23:00–07:00 commitment elsewhere blocks both evenings and
 * mornings, and showing it on one day only would tell a manager the other day is free.
 *
 * Returns `{ known, byStaff, unplaced }`. `byStaff` holds one entry per (commitment, day) pair, each
 * carrying `commitmentId` so a caller can count COMMITMENTS rather than cells. `known` is false when
 * the read did not answer, or answered without the zone the placement needs — an unplaced overlay is
 * UNKNOWN, never empty.
 */
export function placeExternalCommitments (external, dayKeys) {
  if (!external || !Array.isArray(external.items) || !external.timeZoneId) {
    return { known: false, byStaff: {}, unplaced: null };
  }

  const zone = external.timeZoneId;
  const days = dayKeys || [];

  const byStaff = {};
  let unplaced = 0;

  for (const item of external.items) {
    const starts = item && parseApiInstant(item.startsUtc);
    const ends = item && parseApiInstant(item.endsUtc);
    // No instants, no honest column. Counted rather than dropped: the grid says how many it could
    // not place instead of quietly showing a shorter list than the server sent.
    if (!item || !item.staffMemberId || !starts || !ends || ends.getTime() <= starts.getTime()) {
      unplaced += 1;
      continue;
    }

    const startParts = partsInZone(zone, starts);
    // The last instant the commitment actually occupies. An end at exactly local midnight belongs to
    // the day before, not to the empty day after it.
    const lastParts = partsInZone(zone, new Date(ends.getTime() - 1));
    const startKey = isoDate(startParts.year, startParts.month, startParts.day);
    const lastKey = isoDate(lastParts.year, lastParts.month, lastParts.day);

    // Walk the GRID's days rather than the commitment's, so the loop is bounded by the seven columns
    // and no length of commitment can truncate the placement. ISO day keys sort chronologically.
    const placed = days.filter(dayKey => dayKey >= startKey && dayKey <= lastKey);
    if (!placed.length) { unplaced += 1; continue; }

    const commitmentId = item.staffMemberId + '|' + starts.getTime() + '|' + ends.getTime();
    const base = {
      commitmentId,
      kind: item.kind || null,
      startsMs: starts.getTime(),
      endsMs: ends.getTime(),
      // Wall clock in the ROUTE store's zone, with the offset resolved AT each instant so a
      // commitment on a DST weekend is not shifted by an hour.
      start: localClock(starts, offsetMinutesAt(zone, starts)),
      end: localClock(ends, offsetMinutesAt(zone, ends)),
      crossesMidnight: startKey !== lastKey,
      isClashing: false
    };

    if (!byStaff[item.staffMemberId]) { byStaff[item.staffMemberId] = []; }
    placed.forEach((dayKey) => {
      byStaff[item.staffMemberId].push(Object.assign({
        key: commitmentId + '|' + dayKey,
        dayKey,
        continuesFromPreviousDay: dayKey !== startKey,
        continuesIntoNextDay: dayKey !== lastKey
      }, base));
    });
  }

  return { known: true, byStaff, unplaced };
}

/** How many distinct COMMITMENTS a list of placed (commitment, day) entries represents. */
function distinctCommitments (entries) {
  const seen = {};
  let count = 0;
  for (const entry of entries || []) {
    if (seen[entry.commitmentId]) { continue; }
    seen[entry.commitmentId] = true;
    count += 1;
  }
  return count;
}

/** True when two half-open UTC intervals overlap. Instants, so no zone can change the answer. */
function overlaps (aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Which of the three data states a `GET /schedules` body is in. Shared by every pivot: the state is
 * a property of the READ, not of how the answer is grouped afterwards.
 */
export function resolveDataState (range) {
  if (!range) { return DATA_UNKNOWN; }
  return range.scheduleRevisionId ? DATA_COUNTED : DATA_NO_PLAN;
}

/**
 * The advisory clash pass: does a shift PLANNED HERE overlap a commitment the person already has
 * elsewhere? That is the question the §3.8.4 guard only ever answered on write, as an opaque 409 at
 * publish. Answering it while planning is the whole point of the overlay.
 *
 * Compared on UTC instants across the WHOLE week rather than within a day column, because the two
 * sides are bucketed by different days on purpose: this store's shifts sit under their stored
 * business date, the commitments under the route-local day of their start.
 *
 * Mutates in place (`shift.hasExternalClash`, `item.isClashing`) and returns how many DISTINCT
 * shifts were flagged. Extracted so the employee and role pivots cannot answer it differently — a
 * shift that clashes must clash in every view that draws it.
 */
export function markExternalClashes (shiftsByStaff, external) {
  let flagged = 0;
  for (const staffMemberId of Object.keys(external.byStaff || {})) {
    const shifts = shiftsByStaff[staffMemberId] || [];
    for (const item of external.byStaff[staffMemberId]) {
      for (const shift of shifts) {
        if (shift.startsMs === null || shift.endsMs === null) { continue; }
        if (!overlaps(shift.startsMs, shift.endsMs, item.startsMs, item.endsMs)) { continue; }
        item.isClashing = true;
        if (!shift.hasExternalClash) {
          shift.hasExternalClash = true;
          flagged += 1;
        }
      }
    }
  }
  return flagged;
}

/**
 * Indexes the cost overlay by shift and by local business date.
 *
 * THE RULE THIS INDEX EXISTS TO KEEP: THE DAY AND WEEK FIGURES ARE READ, NEVER SUMMED. The backend
 * rounds each shift once, and rounds each day and the week once over the UNROUNDED amounts — so
 * `sum(shift chips) !== day total` by up to an øre per shift, and the discrepancy grows with the
 * week. The day and the week are therefore taken from their own nodes and nothing here adds a chip
 * to anything.
 *
 * A day with no shifts is simply absent from `cost.days`; that is a real "nothing was planned", not
 * an unknown, so it resolves to null here and the caller renders it against the shift count it
 * already has.
 */
function buildCostIndex (cost) {
  const byShift = {};
  const byDay = {};
  if (!cost || typeof cost !== 'object') { return { byShift, byDay, known: false }; }

  for (const day of cost.days || []) {
    const dayKey = businessDateKey(day && day.localBusinessDate);
    if (dayKey !== null) { byDay[dayKey] = readCost(day); }
    for (const shift of (day && day.shifts) || []) {
      if (shift && shift.shiftAssignmentId) { byShift[shift.shiftAssignmentId] = readShiftCost(shift); }
    }
  }

  return { byShift, byDay, known: true };
}

/**
 * Builds the week grid.
 *
 * `days`      — the seven store-local dates from `weekRange`.
 * `range`     — the `GET /schedules` body, or null/undefined while unknown.
 * `staff`     — the `GET /staff` roster, or null/undefined while unknown.
 * `markers`   — from `markersFromRequests`, or null/undefined while unknown.
 * `external`  — the `GET /schedules/external-commitments` body, or null/undefined while unknown.
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

  const external = placeExternalCommitments(opts.external, dayKeys);

  // Gated on `counted` on purpose. The range read carries a cost even with no revision — the
  // backend says so: "a range with no revision costs 0 over no days, which is a different statement
  // from 'no total'". Rendering that 0 would turn "there is no plan" into "the plan costs nothing",
  // which is the same collapse the shift counts are already forbidden to make.
  const costs = buildCostIndex(counted ? range.cost : null);

  // Bucket assignments by row and day. The day comes from the server's `localBusinessDate`, never
  // from re-deriving a date off `startsUtc` here: the business date is what the backend attributes
  // the shift to (and what an overnight shift is counted under), so re-deriving it would put the
  // grid and the payroll/attendance side on different days.
  const buckets = {};
  const seenStaff = {};
  const shiftsByStaff = {};
  for (const assignment of assignments) {
    const dayKey = businessDateKey(assignment.localBusinessDate);
    if (dayKey === null || !(dayKey in perDayCount)) { continue; }

    const rowKey = assignment.isOpenShift || !assignment.staffMemberId
      ? OPEN_ROW_KEY
      : assignment.staffMemberId;
    if (rowKey !== OPEN_ROW_KEY) {
      seenStaff[rowKey] = assignment.staffDisplayName || null;
    }

    const shift = toShift(assignment, costs.byShift[assignment.shiftAssignmentId]);
    if (conflictingId && shift.id === conflictingId) { shift.isConflicting = true; }

    if (!buckets[rowKey]) { buckets[rowKey] = {}; }
    if (!buckets[rowKey][dayKey]) { buckets[rowKey][dayKey] = []; }
    buckets[rowKey][dayKey].push(shift);
    if (rowKey !== OPEN_ROW_KEY) {
      if (!shiftsByStaff[rowKey]) { shiftsByStaff[rowKey] = []; }
      shiftsByStaff[rowKey].push(shift);
    }
    perDayCount[dayKey]++;
  }

  const externalClashCount = markExternalClashes(shiftsByStaff, external);

  const buildRow = (key, name, meta) => {
    // The open row is a shift without a person, so no person can be committed elsewhere on it.
    const commitments = key === OPEN_ROW_KEY ? [] : (external.byStaff[key] || []);

    const cells = days.map((day) => {
      const cell = emptyCell(day.isoDate);
      const shifts = (buckets[key] && buckets[key][day.isoDate]) || [];
      cell.shifts = shifts.slice().sort((a, b) => String(a.start).localeCompare(String(b.start)));
      cell.hasConflict = cell.shifts.some(s => s.isConflicting);
      cell.markers = key === OPEN_ROW_KEY ? [] : markersFor(markers, key, day.isoDate);
      cell.external = commitments
        .filter(item => item.dayKey === day.isoDate)
        .sort((a, b) => a.startsMs - b.startsMs);
      cell.hasExternalClash = cell.shifts.some(s => s.hasExternalClash);
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
      hasExternalClash: cells.some(c => c.hasExternalClash),
      // Null rather than 0 when the overlay did not answer: "nobody is committed elsewhere" and "we
      // do not know" are the same blank cell otherwise.
      externalCount: external.known ? distinctCommitments(commitments) : null,
      // PER PERSON THERE IS NO TOTAL, and none is manufactured. The cost overlay rolls up per shift,
      // per day and for the range — never per staff member — and adding a row's rounded chips would
      // produce a figure that disagrees with the footer by an øre per shift. The row cell says it
      // does not know rather than showing a number the API never stated.
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

  // A commitment whose route-store roster row is not on screen at all. The response is keyed on THIS
  // store's engagement ids, so this only happens when the roster read failed AND the person has no
  // shift here — but it is counted rather than dropped, because "we hid one" must never look like
  // "there were none". It joins the items that could not be placed on a day.
  let unplaced = external.unplaced;
  if (external.known) {
    const shownRows = {};
    for (const row of rows) { shownRows[row.key] = true; }
    for (const staffMemberId of Object.keys(external.byStaff)) {
      if (!shownRows[staffMemberId]) { unplaced += distinctCommitments(external.byStaff[staffMemberId]); }
    }
  }

  return {
    dataState,
    rosterKnown,
    markersKnown: Array.isArray(markers),
    // Three states again, deliberately: `externalKnown === false` is "the cross-store check did not
    // answer", which is not the same fact as an answer holding no commitments.
    externalKnown: external.known,
    externalUnplaced: external.known ? unplaced : null,
    externalClashCount: external.known ? externalClashCount : null,
    view: (range && range.view) || null,
    state: (range && range.state) || null,
    revisionNumber: (range && typeof range.revisionNumber === 'number') ? range.revisionNumber : null,
    publicationNumber: (range && typeof range.publicationNumber === 'number') ? range.publicationNumber : null,
    scheduleRevisionId: (range && range.scheduleRevisionId) || null,
    timeZoneId: (range && range.timeZoneId) || null,
    asOfUtc: (range && range.asOfUtc) || null,
    hiddenConflict,
    // True when the response carried a cost overlay at all, so "the money is not on this response"
    // stays distinguishable from "the money is on it and it refuses to total".
    costKnown: costs.known,
    days: days.map(day => ({
      isoDate: day.isoDate,
      year: day.year,
      month: day.month,
      day: day.day,
      shiftCount: counted ? perDayCount[day.isoDate] : null,
      // Read from the day's own node, never summed from the chips above it.
      cost: costs.byDay[day.isoDate] || null
    })),
    openRow,
    rows,
    totals: {
      shiftCount: counted ? Object.keys(perDayCount).reduce((sum, k) => sum + perDayCount[k], 0) : null,
      minutes: counted
        ? [openRow].concat(rows).reduce((sum, r) => sum + (r.totals.minutes || 0), 0)
        : null,
      // THE footer figure: the range node, rounded once by the backend over the unrounded shift
      // amounts. Deliberately not `sum(days)` and not `sum(chips)` — both drift, and both would put
      // a number on screen that disagrees with the one the backend calls true.
      cost: readCost(counted ? range.cost : null)
    }
  };
}

// ---------------------------------------------------------------------------------------------
// The ROLE pivot — the same week, grouped by what the shift is rather than by who works it.
// ---------------------------------------------------------------------------------------------
//
// WHY `WorkforceRole` AND NOT A NEW AXIS. Planday calls this tab "Personalgrupper" and backs it with
// a staff-group object of its own, separate from the role a shift is scheduled as. Okam deliberately
// does not: a venue that kept both would have to keep two lists aligned by hand, and the day they
// drift the schedule and the group totals stop describing the same thing. `WorkforceRole` is already
// on every assignment (`roleId`) and already has a store-level list, so it IS the axis.
//
// THE THREE ROLE-ISH THINGS A SHIFT CAN BE, kept apart for the same reason the data states are:
//
//   a resolved role   — `roleId` is set and appears in `GET /roles`. A normal row.
//   no role at all    — `roleId` is null. A real, common state (a shift can be scheduled without
//                       one), and its own row — but only when something is in it, because "no role"
//                       is not an object a manager defined.
//   an unresolved id  — `roleId` is set and does NOT appear in the role list. One row PER id, never
//                       merged with each other or with "no role". Since the surface has no role
//                       deletion, this means the list read was partial, the role was created after
//                       it, or (in `view=published`) the shift carries a snapshot id. The server's
//                       frozen `roleName` is shown when there is one and the row says the role is
//                       not in the store's list; with no name it is an id and nothing else, and the
//                       row says that instead of inventing a label.

// Rows are keyed by `roleId` directly; this is the one key that is not an id, and it is namespaced
// so it can never collide with a Guid.
export const ROLE_NONE_KEY = 'role:none';

/**
 * Whether a role's `[effectiveFromUtc, effectiveToUtc)` window overlaps the week on screen.
 *
 * There is no role deletion and no `isActive` flag in this surface — `effectiveToUtc` is the only
 * retire lever, and `GET /roles` does not filter on it, so every role the store ever defined comes
 * back on every read. Without this a week in 2026 would carry a row for a role retired in 2024,
 * forever.
 */
function roleIsEffective (role, windowStartMs, windowEndMs) {
  const from = parseApiInstant(role.effectiveFromUtc);
  const to = parseApiInstant(role.effectiveToUtc);
  if (from && windowEndMs !== null && from.getTime() >= windowEndMs) { return false; }
  if (to && windowStartMs !== null && to.getTime() <= windowStartMs) { return false; }
  return true;
}

/**
 * Builds the role pivot for one week.
 *
 * `days`, `range`, `external` and `conflict` are the same inputs `buildWeekGrid` takes and are read
 * the same way — the day bucketing, the shift shape and the clash pass are the shared functions
 * above, not copies.
 *
 * `roles` is the `GET /roles` body, or null/undefined while unknown.
 * `windowStartUtc`/`windowEndUtc` bound the week, for the effectiveness test.
 *
 * AN EMPTY ROLE STILL GETS A ROW. That row is the answer to "is anyone on the bar this week?", and
 * a row that disappears when the answer is "no" deletes the question. It reads `0t / 0 vakter` when
 * the week is counted — a true zero — and the unknown mark when it is not.
 */
export function buildRoleGrid (options) {
  const opts = options || {};
  const days = opts.days || [];
  const range = opts.range;
  const conflict = opts.conflict;
  const dataState = resolveDataState(range);
  const counted = dataState === DATA_COUNTED;

  const assignments = (range && range.assignments) || [];
  const rolesKnown = Array.isArray(opts.roles);
  const roles = rolesKnown ? opts.roles : [];

  const windowStartMs = opts.windowStartUtc ? new Date(opts.windowStartUtc).getTime() : null;
  const windowEndMs = opts.windowEndUtc ? new Date(opts.windowEndUtc).getTime() : null;

  const conflictingId = conflict && conflict.conflictKind === 'assignment-overlap'
    ? conflict.conflictingAssignmentId
    : null;

  const dayKeys = days.map(d => d.isoDate);
  const inGrid = {};
  for (const key of dayKeys) { inGrid[key] = true; }

  const external = placeExternalCommitments(opts.external, dayKeys);

  // Bucket by (role row, day). Same business-date attribution as the employee pivot — re-deriving a
  // date off `startsUtc` here would put the two pivots of the SAME week on different days.
  const buckets = {};
  const shiftsByStaff = {};
  const unresolvedNames = {};
  let noRoleShiftCount = 0;

  for (const assignment of assignments) {
    const dayKey = businessDateKey(assignment.localBusinessDate);
    if (dayKey === null || !inGrid[dayKey]) { continue; }

    const shift = toShift(assignment);
    if (conflictingId && shift.id === conflictingId) { shift.isConflicting = true; }

    let rowKey;
    if (!shift.roleId) {
      rowKey = ROLE_NONE_KEY;
      noRoleShiftCount += 1;
    } else {
      rowKey = shift.roleId;
      // Provisional: resolved against the role list below. Remembering the server's name here is
      // what lets an unresolved row still be labelled rather than shown as a bare id.
      if (!unresolvedNames[shift.roleId]) { unresolvedNames[shift.roleId] = shift.roleName || null; }
    }

    if (!buckets[rowKey]) { buckets[rowKey] = {}; }
    if (!buckets[rowKey][dayKey]) { buckets[rowKey][dayKey] = []; }
    buckets[rowKey][dayKey].push(shift);

    if (shift.staffMemberId) {
      if (!shiftsByStaff[shift.staffMemberId]) { shiftsByStaff[shift.staffMemberId] = []; }
      shiftsByStaff[shift.staffMemberId].push(shift);
    }
  }

  const externalClashCount = markExternalClashes(shiftsByStaff, external);

  const buildRow = (key, name, meta) => {
    const cells = days.map((day) => {
      const cell = emptyCell(day.isoDate);
      const shifts = (buckets[key] && buckets[key][day.isoDate]) || [];
      // Sorted by clock, then by person, so two shifts starting together have a stable order
      // instead of whatever the response happened to hold.
      cell.shifts = shifts.slice().sort((a, b) =>
        String(a.start).localeCompare(String(b.start)) || String(a.staffName).localeCompare(String(b.staffName)));
      cell.hasConflict = cell.shifts.some(s => s.isConflicting);
      cell.hasExternalClash = cell.shifts.some(s => s.hasExternalClash);
      return cell;
    });

    const shiftCount = counted ? cells.reduce((sum, c) => sum + c.shifts.length, 0) : null;
    const minutes = counted
      ? cells.reduce((sum, c) => sum + c.shifts.reduce((s, shift) => s + shift.paidMinutes, 0), 0)
      : null;

    // How many DISTINCT people cover this role in the week. A role staffed by one person for 40
    // hours and one staffed by five for 8 each are different facts about a rota.
    const staffIds = {};
    let openShiftCount = 0;
    for (const cell of cells) {
      for (const shift of cell.shifts) {
        if (shift.isOpen) { openShiftCount += 1; } else if (shift.staffMemberId) { staffIds[shift.staffMemberId] = true; }
      }
    }

    return Object.assign({
      key,
      name,
      cells,
      hasConflict: cells.some(c => c.hasConflict),
      hasExternalClash: cells.some(c => c.hasExternalClash),
      totals: {
        shiftCount,
        minutes,
        staffCount: counted ? Object.keys(staffIds).length : null,
        openShiftCount: counted ? openShiftCount : null,
        // PERMANENTLY NULL, and not because the money is missing. `WorkforceScheduleCostModel`
        // totals per shift, per day and for the range — there is no per-role node, and there is no
        // per-employee one either, which is why the week grid's person rows are a dash for the same
        // reason. The only figure obtainable here is `sum(this role's rounded chips)`, and that is
        // the one sum the backend forbids: it drifts from the range total by up to an øre per shift.
        // A number here would disagree with the footer of the very same week on the next tab.
        cost: null
      }
    }, meta || {});
  };

  const rows = [];
  const listedRoleIds = {};
  let hiddenRetiredCount = 0;

  for (const role of roles) {
    if (!role || !role.roleId) { continue; }
    listedRoleIds[role.roleId] = true;
    const hasShifts = !!buckets[role.roleId];
    // A role outside its effective window occupies a row only while it still holds shifts. Hiding
    // it otherwise keeps a decade of retired roles off a manager's screen; COUNTING what was hidden
    // keeps that from being a silent omission.
    if (!hasShifts && !roleIsEffective(role, windowStartMs, windowEndMs)) {
      hiddenRetiredCount += 1;
      continue;
    }
    rows.push(buildRow(role.roleId, role.name || null, {
      roleId: role.roleId,
      station: role.station || null,
      color: role.color || null,
      isListed: true,
      isEffective: roleIsEffective(role, windowStartMs, windowEndMs)
    }));
  }

  // Shifts whose role id the list did not account for. One row each — two vanished roles are two
  // facts — and appended after the listed roles rather than dropped, because dropping them would
  // delete real scheduled shifts from the pivot.
  //
  // `isListed` is FALSE only when the list actually answered and did not contain the id. When the
  // list itself is unknown it is NULL: we have not been told these roles are missing from it, and a
  // row that said "not in the role list" on the strength of a read that never happened would be
  // asserting the very thing we failed to find out.
  const unresolvedRows = [];
  for (const roleId of Object.keys(buckets)) {
    if (roleId === ROLE_NONE_KEY || listedRoleIds[roleId]) { continue; }
    unresolvedRows.push(buildRow(roleId, unresolvedNames[roleId] || null, {
      roleId,
      station: null,
      color: null,
      isListed: rolesKnown ? false : null,
      isEffective: null
    }));
  }
  unresolvedRows.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  // "No role" is not a role, so it is pinned last and appears only when it holds something — unlike
  // an empty listed role, which is exactly the row a manager came to see.
  const noRoleRow = buckets[ROLE_NONE_KEY]
    ? buildRow(ROLE_NONE_KEY, null, { roleId: null, station: null, color: null, isListed: false, isEffective: null, isNoRole: true })
    : null;

  const allRows = rows.concat(unresolvedRows);

  return {
    dataState,
    // Three states again: `rolesKnown === false` is "the role list did not answer", which is not the
    // same fact as a store that has defined no roles.
    rolesKnown,
    hiddenRetiredCount: rolesKnown ? hiddenRetiredCount : null,
    // Only countable against a list that answered. Without one, every role-bearing shift would be
    // "unresolved" and the count would be measuring our own failed read.
    unresolvedCount: rolesKnown ? unresolvedRows.length : null,
    noRoleShiftCount: counted ? noRoleShiftCount : null,
    externalKnown: external.known,
    externalClashCount: external.known ? externalClashCount : null,
    view: (range && range.view) || null,
    state: (range && range.state) || null,
    revisionNumber: (range && typeof range.revisionNumber === 'number') ? range.revisionNumber : null,
    timeZoneId: (range && range.timeZoneId) || null,
    days: days.map(day => ({
      isoDate: day.isoDate,
      year: day.year,
      month: day.month,
      day: day.day,
      shiftCount: counted
        ? allRows.concat(noRoleRow ? [noRoleRow] : [])
          .reduce((sum, row) => sum + row.cells.filter(c => c.isoDate === day.isoDate)
            .reduce((s, c) => s + c.shifts.length, 0), 0)
        : null
    })),
    rows: allRows,
    noRoleRow,
    totals: {
      shiftCount: counted
        ? allRows.concat(noRoleRow ? [noRoleRow] : []).reduce((sum, r) => sum + (r.totals.shiftCount || 0), 0)
        : null,
      minutes: counted
        ? allRows.concat(noRoleRow ? [noRoleRow] : []).reduce((sum, r) => sum + (r.totals.minutes || 0), 0)
        : null,
      // Minutes and counts above are summed here because they are exact integers and every shift is
      // in exactly one row, so the arithmetic is lossless. MONEY IS NOT, so it is not summed and not
      // shown. The week's real wage sum does exist — it is `range.cost`, the same node the employee
      // pivot's footer reads, and it is grouping-independent, so this footer COULD read it. It
      // deliberately does not: rendering it honestly means reproducing the whole refusal vocabulary
      // (`Ingen sum` on `costComplete:false`, the `minst` floor prefix and its vacancy caveat, the
      // two currency-clash sentences, the ISO-code fallback for a foreign currency) in a second
      // component. Two copies of the money rules is how two tabs of the same week end up printing
      // different money. Until that render is one shared thing, this pivot shows none — the wage
      // sum has one home, and the caveat under the table says where.
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
