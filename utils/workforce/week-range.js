// Week boundaries for the Workforce schedule read, resolved in the STORE's timezone.
//
// GET /workforce/stores/{storeId}/context returns the store zone as an IANA id (`timeZone.id`)
// alongside `timeZone.currentUtcOffsetMinutes`. That sibling is the offset RIGHT NOW, never the
// offset of the week on screen: reusing it across a DST boundary shifts every instant by an hour,
// which silently moves late-evening shifts into the neighbouring day column. Everything here
// resolves the offset AT the instant in question through Intl instead, so the last week of March
// and the last week of October are as correct as any other.

const WEEKDAY_MONDAY = 1;
const MINUTE_MS = 60000;
const DAYS_PER_WEEK = 7;

// `hourCycle: 'h23'` rather than `hour12: false`: the latter is allowed to render midnight as
// hour "24" in some engines, which would push the reconstructed instant a full day forward.
function zoneFormatter (timeZoneId) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timeZoneId,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/** The store-local calendar/clock fields of a UTC instant. */
export function partsInZone (timeZoneId, instant) {
  const parts = {};
  for (const part of zoneFormatter(timeZoneId).formatToParts(instant)) {
    if (part.type !== 'literal') { parts[part.type] = Number(part.value); }
  }
  return parts;
}

/** The store zone's UTC offset, in minutes, at `instant` (positive east of UTC). */
export function offsetMinutesAt (timeZoneId, instant) {
  const p = partsInZone(timeZoneId, instant);
  const asIfUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asIfUtc - instant.getTime()) / MINUTE_MS);
}

/**
 * The UTC instant of local midnight on a store-local calendar date. Two passes: the first uses the
 * offset at the naive instant, the second re-reads the offset at the corrected one, so a date whose
 * offset differs from the naive guess (the DST-change weekend) still lands on real local midnight.
 */
export function zonedMidnightToUtc (timeZoneId, year, month, day) {
  const naive = Date.UTC(year, month - 1, day, 0, 0, 0);
  let ts = naive - offsetMinutesAt(timeZoneId, new Date(naive)) * MINUTE_MS;
  ts = naive - offsetMinutesAt(timeZoneId, new Date(ts)) * MINUTE_MS;
  return new Date(ts);
}

/** `YYYY-MM-DD` for a civil (timezone-free) date triple. */
export function isoDate (year, month, day) {
  const pad = n => String(n).padStart(2, '0');
  return year + '-' + pad(month) + '-' + pad(day);
}

/**
 * The seven store-local calendar dates of the ISO week (Monday first) containing `anchor`, plus the
 * UTC instants bounding it. `weekOffset` steps whole weeks. Days are stepped as CIVIL dates rather
 * than by adding 24h, so a 23- or 25-hour day does not drop or duplicate a column.
 */
export function weekRange (timeZoneId, anchor, weekOffset = 0) {
  const local = partsInZone(timeZoneId, anchor);
  const civil = Date.UTC(local.year, local.month - 1, local.day);
  const weekdayFromMonday = (new Date(civil).getUTCDay() + DAYS_PER_WEEK - WEEKDAY_MONDAY) % DAYS_PER_WEEK;
  const monday = new Date(civil - weekdayFromMonday * 86400000 + weekOffset * DAYS_PER_WEEK * 86400000);

  const days = [];
  for (let i = 0; i < DAYS_PER_WEEK; i++) {
    const d = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + i));
    days.push({
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      isoDate: isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
    });
  }

  const first = days[0];
  const afterLast = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate() + DAYS_PER_WEEK));

  return {
    days,
    startUtc: zonedMidnightToUtc(timeZoneId, first.year, first.month, first.day),
    endUtc: zonedMidnightToUtc(timeZoneId, afterLast.getUTCFullYear(), afterLast.getUTCMonth() + 1, afterLast.getUTCDate())
  };
}

/**
 * The ISO-8601 week number of a civil date, with its ISO week-year. Derived from the week's Thursday
 * so the turn of the year lands correctly: 1 January can belong to week 52/53 of the previous year,
 * and 29 December to week 1 of the next.
 */
export function isoWeekNumber (year, month, day) {
  const thursday = new Date(Date.UTC(year, month - 1, day));
  thursday.setUTCDate(thursday.getUTCDate() - ((thursday.getUTCDay() + 6) % 7) + 3);

  const weekYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(weekYear, 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);

  return {
    week: 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * 86400000)),
    year: weekYear
  };
}

/**
 * The wire format for the schedule range bounds.
 *
 * `GET /schedules?from&to` binds plain `DateTime` parameters and compares them against UTC columns,
 * so only the numeric value matters. A trailing `Z` invites the query-string binder to convert into
 * the server's Oslo local time and shift the window by the offset; a bare `YYYY-MM-DDTHH:mm:ss` is
 * converted by nothing, under any binder setting, and therefore arrives as the exact instant meant.
 */
export function toRangeParam (instant) {
  return instant.toISOString().slice(0, 19);
}

/**
 * Parses an instant off the workforce API.
 *
 * The surface returns BOTH kinds on the same document: server-computed stamps (`asOfUtc`) are
 * `DateTimeKind.Utc` and serialise with a `Z`, while column-loaded stamps (`startsUtc`,
 * `localBusinessDate`) come back from EF as `Unspecified` and serialise bare. Both denote UTC, so a
 * bare string is read as UTC rather than as browser-local — reading it as local would move every
 * shift by the viewer's own offset.
 */
export function parseApiInstant (value) {
  if (!value) { return null; }
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value);
  const parsed = new Date(hasZone ? value : value + 'Z');
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** The `YYYY-MM-DD` day key of an API `localBusinessDate` (a date-at-midnight `DateTime`). */
export function businessDateKey (value) {
  return typeof value === 'string' && value.length >= 10 ? value.slice(0, 10) : null;
}
