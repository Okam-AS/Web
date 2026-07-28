// The Workforce MONTH view: per-day totals for a calendar month, and a per-weekday column total
// across the whole month (every Monday summed, every Tuesday summed, …).
//
// The weekday columns are the reason this view is worth building. "How much do I staff a Monday?"
// is a question the week grid structurally cannot answer — it only ever holds one of them — and it
// is the question behind almost every rota decision a manager makes.
//
// NOTHING HERE RE-DERIVES A PLACEMENT RULE. The day a shift belongs to, the paid length of a shift
// and the three data states all come from `week-grid.js`; the calendar comes from `week-range.js`.
// This file is the arithmetic on top of those, and only that.
//
// ── THE ONE THING THE BACKEND FORCES ─────────────────────────────────────────────────────────────
//
// `GET /schedules?from&to` does NOT return the assignments in a range. It resolves the range to a
// SINGLE schedule revision (`.OrderByDescending(RangeStartUtc).FirstOrDefaultAsync()`) and returns
// that revision's entire assignment set, unclipped by `from`/`to`. Asking it for 31 days would
// return the latest-starting week's revision and silently drop the other four — a month that looks
// answered and is four fifths missing.
//
// So a month is N WEEK READS, one per ISO week `monthRange` enumerates, merged here. Two consequences
// that shape everything below:
//
//   1. EACH WEEK HAS ITS OWN DATA STATE. One week can be counted, the next unplanned, the third a
//      failed read. There is no single month-wide answer, and pretending there is would be the
//      exact dishonesty the week grid was built to avoid.
//   2. A REVISION'S ASSIGNMENTS ARE NOT CLIPPED TO ITS WEEK. A week read can hand back shifts that
//      fall outside that week. Every day is therefore attributed to exactly ONE week — its own —
//      and only that week's read may place shifts on it. Without that rule two overlapping
//      revisions would both place a shift on the same day and the month would double-count.

import { businessDateKey } from '~/utils/workforce/week-range';
import { DATA_COUNTED, DATA_NO_PLAN, DATA_UNKNOWN, resolveDataState, toShift } from '~/utils/workforce/week-grid';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

/**
 * An empty accumulator for a set of days.
 *
 * `minutes` and `shiftCount` start at null rather than 0 on purpose: a bucket that never receives a
 * counted day must come out unknown, and starting at 0 would make "we could not read any of these
 * days" indistinguishable from "these days are genuinely empty".
 */
function emptyTally () {
  return {
    dayCount: 0,
    countedDays: 0,
    noPlanDays: 0,
    unknownDays: 0,
    minutes: null,
    shiftCount: null
  };
}

function addDayToTally (tally, day) {
  tally.dayCount += 1;
  if (day.dataState === DATA_COUNTED) {
    tally.countedDays += 1;
    tally.minutes = (tally.minutes || 0) + day.minutes;
    tally.shiftCount = (tally.shiftCount || 0) + day.shiftCount;
  } else if (day.dataState === DATA_NO_PLAN) {
    tally.noPlanDays += 1;
  } else {
    tally.unknownDays += 1;
  }
}

/**
 * Seals a tally.
 *
 * `isComplete` is the whole honesty of this view. A weekday column over five Mondays of which one
 * week never loaded holds a real sum of four Mondays — genuinely useful — but presenting it as "the
 * Monday total" is a lie by omission of the denominator. So the number survives and is always
 * accompanied by `countedDays` / `dayCount`; the RENDERER is required to show the denominator
 * whenever `isComplete` is false, and shows the unknown mark when nothing was counted at all.
 *
 * `noPlanDays` and `unknownDays` are kept apart so the caveat can be the right sentence: days with
 * no schedule and days we could not read are not the same fact.
 */
function sealTally (tally) {
  return Object.assign({}, tally, {
    isComplete: tally.dayCount > 0 && tally.countedDays === tally.dayCount,
    // A mean is only meaningful over what was actually counted, so it uses `countedDays` as its
    // denominator — never `dayCount`, which would silently divide a partial sum by a full month.
    averageMinutes: tally.countedDays > 0 ? Math.round(tally.minutes / tally.countedDays) : null
  });
}

/**
 * Builds the month model.
 *
 * `month`      — from `monthRange(timeZoneId, anchor, monthOffset)`.
 * `weekRanges` — one entry per `month.weeks`, each the `GET /schedules` body for that week or
 *                null/undefined where the read failed or has not answered.
 * `conflict`   — the last typed 409, if any, so a named shift is marked in this view too.
 *
 * A `weekRanges` shorter than `month.weeks` is not an error and is not padded with zeroes: the
 * missing weeks come out UNKNOWN, which is what they are.
 */
export function buildMonthGrid (options) {
  const opts = options || {};
  const month = opts.month || { days: [], weeks: [] };
  const weekRanges = opts.weekRanges || [];
  const conflict = opts.conflict;

  const conflictingId = conflict && conflict.conflictKind === 'assignment-overlap'
    ? conflict.conflictingAssignmentId
    : null;

  // Which month day belongs to which week. Built from the WEEKS' own day lists, so the attribution
  // is the same one `weekRange` made — a day is never assigned to a week by re-deriving its Monday.
  const weekOfDay = {};
  const monthDayKeys = {};
  for (const day of month.days) { monthDayKeys[day.isoDate] = true; }
  month.weeks.forEach((week, index) => {
    for (const day of week.days) {
      if (monthDayKeys[day.isoDate]) { weekOfDay[day.isoDate] = index; }
    }
  });

  // A week with no entry in `weekRanges` resolves to UNKNOWN, which is what a read that never
  // happened is.
  const weekStates = month.weeks.map((_week, index) => resolveDataState(weekRanges[index]));

  // Place each week's assignments, but only onto the days that week owns. See rule 2 in the header.
  const shiftsByDay = {};
  month.weeks.forEach((_week, index) => {
    if (weekStates[index] !== DATA_COUNTED) { return; }
    const assignments = (weekRanges[index] && weekRanges[index].assignments) || [];
    for (const assignment of assignments) {
      const dayKey = businessDateKey(assignment.localBusinessDate);
      if (dayKey === null || weekOfDay[dayKey] !== index) { continue; }
      const shift = toShift(assignment);
      if (conflictingId && shift.id === conflictingId) { shift.isConflicting = true; }
      if (!shiftsByDay[dayKey]) { shiftsByDay[dayKey] = []; }
      shiftsByDay[dayKey].push(shift);
    }
  });

  const days = month.days.map((day) => {
    const weekIndex = weekOfDay[day.isoDate];
    const dataState = weekIndex === undefined ? DATA_UNKNOWN : weekStates[weekIndex];
    const counted = dataState === DATA_COUNTED;
    const shifts = (shiftsByDay[day.isoDate] || [])
      .sort((a, b) => String(a.start).localeCompare(String(b.start)));

    return {
      isoDate: day.isoDate,
      year: day.year,
      month: day.month,
      day: day.day,
      weekday: day.weekday,
      weekIndex: weekIndex === undefined ? null : weekIndex,
      dataState,
      shifts,
      // Only a counted day produces numbers. An unplanned day and an unread day both produce null,
      // and the renderer says which of the two it is.
      shiftCount: counted ? shifts.length : null,
      minutes: counted ? shifts.reduce((sum, shift) => sum + shift.paidMinutes, 0) : null,
      hasConflict: shifts.some(s => s.isConflicting)
    };
  });

  const byIsoDate = {};
  for (const day of days) { byIsoDate[day.isoDate] = day; }

  // ── the weekday columns ──────────────────────────────────────────────────────────────────────
  // One tally per ISO weekday, over EVERY day of that weekday in the month — 4 or 5 of them, and 5
  // for exactly the weekdays the month happens to start on. The denominator is therefore per column
  // and must be carried, not assumed.
  const weekdayColumns = WEEKDAYS.map((weekday) => {
    const tally = emptyTally();
    const dayKeys = [];
    for (const day of days) {
      if (day.weekday !== weekday) { continue; }
      dayKeys.push(day.isoDate);
      addDayToTally(tally, day);
    }
    return Object.assign({ weekday, dayKeys }, sealTally(tally));
  });

  const monthTally = emptyTally();
  for (const day of days) { addDayToTally(monthTally, day); }

  const weeks = month.weeks.map((week, index) => {
    const tally = emptyTally();
    for (const day of week.days) {
      if (byIsoDate[day.isoDate]) { addDayToTally(tally, byIsoDate[day.isoDate]); }
    }
    return Object.assign({
      index,
      isoWeek: week.isoWeek,
      dataState: weekStates[index],
      // The days of this week that fall OUTSIDE the month — the calendar's leading and trailing
      // blanks. Carried so a renderer can lay out a full 7-column row without inventing days.
      outsideMonth: week.days.filter(day => !monthDayKeys[day.isoDate]).map(day => day.isoDate)
    }, sealTally(tally));
  });

  return {
    year: month.year,
    month: month.month,
    leadingBlanks: month.leadingBlanks,
    days,
    weeks,
    weekdayColumns,
    // Never collapsed into one month-wide state: the mix is the fact. `allCounted` is the only
    // condition under which a total may be presented without a denominator.
    weekStates,
    allCounted: weekStates.length > 0 && weekStates.every(state => state === DATA_COUNTED),
    anyUnknown: weekStates.some(state => state === DATA_UNKNOWN),
    // PERMANENTLY NULL. Not "the rates lane has not landed yet" — it has, and the month still gets
    // no money, for three independent reasons any one of which would be enough:
    //
    //   1. A month is N WEEK READS and each week's `range.cost` is rounded ONCE by the backend over
    //      its own unrounded amounts. `sum(weeks)` therefore drifts from any true month figure, the
    //      same drift `buildCostIndex` exists to refuse one scale down.
    //   2. The weeks need not agree on a currency. Adding a CHF week to a NOK week is not a rounding
    //      error, it is a category error.
    //   3. An unknown or unplanned week contributes nothing, so a month sum would silently shrink —
    //      exactly what `isComplete` and the denominators above exist to prevent, and no denominator
    //      makes a WRONG total honest the way it makes a PARTIAL one honest.
    //
    // The backend would have to emit a month node. Until it does, the month view carries hours and
    // counts, which are exact, and no money at all.
    totals: Object.assign({ cost: null }, sealTally(monthTally))
  };
}
