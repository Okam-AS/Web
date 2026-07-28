// Presentation helpers for the worker's own shifts — grouping, wall-clock formatting, and the
// honest-state derivation the page renders its empty screens from.
//
// EVERY instant off the wire is parsed with `parseApiInstant`, never with `new Date(...)` directly.
// The Workforce surface serialises column-loaded stamps (`startsUtc`, `endsUtc`, `createdAtUtc`)
// BARE — no `Z` — because EF materialises them as `DateTimeKind.Unspecified` and Newtonsoft's
// default `RoundtripKind` writes no designator for that kind. JavaScript reads a bare ISO string as
// BROWSER-LOCAL, so `new Date('2026-07-28T06:00:00')` on a phone in Oslo is 04:00 UTC rather than
// the 06:00 UTC the server meant, and every shift time on this page moves by the viewer's own
// offset. `parseApiInstant` reads a bare string as UTC and leaves a `Z`-suffixed one alone, so it is
// correct for both shapes the surface emits.

import { parseApiInstant } from '~/utils/workforce/week-range';

/** The schedule read has not completed, or it failed. Nothing is known — never render 0. */
export const SCHEDULE_UNKNOWN = 'unknown';
/** Loaded, no shifts, and we know no publication has ever reached this worker. */
export const SCHEDULE_NEVER_PUBLISHED = 'never-published';
/** Loaded, no shifts, but publications have reached this worker: they are simply not on this period. */
export const SCHEDULE_NONE_IN_WINDOW = 'none-in-window';
/** Loaded, no shifts, and the inbox is unknown — so which of the two sentences above is true is unknown. */
export const SCHEDULE_NONE_UNVERIFIED = 'none-unverified';
/** Loaded, with shifts. */
export const SCHEDULE_HAS_SHIFTS = 'has-shifts';

/**
 * Which sentence the empty schedule screen is allowed to say.
 *
 * "No schedule has been published to you yet" and "you have no shifts in this period" are different
 * claims and a worker needs to know which one they are being told: the first means the roster does
 * not exist yet and more is coming, the second means the roster exists and they are not on it. #33
 * cannot tell them apart on its own — it returns an empty list either way, because a draft schedule
 * is never disclosed on the worker surface.
 *
 * The one worker-visible piece of evidence is the inbox: every publication that names this worker as
 * a recipient leaves an item there. So a worker whose inbox has never held a publication has
 * genuinely never been published to. If the inbox itself is unknown, neither sentence is licensed and
 * the page says so rather than picking the friendlier one.
 *
 * @param {object} input
 * @param {boolean} input.loaded         the #33 read completed successfully
 * @param {Array|null} input.items       the returned shifts, or null when not loaded
 * @param {number|null} input.publications how many publications have ever reached this worker, or null
 */
export function scheduleState (input) {
  const state = input || {};
  if (!state.loaded || !state.items) { return SCHEDULE_UNKNOWN; }
  if (state.items.length > 0) { return SCHEDULE_HAS_SHIFTS; }
  if (state.publications === null || state.publications === undefined) { return SCHEDULE_NONE_UNVERIFIED; }
  return state.publications === 0 ? SCHEDULE_NEVER_PUBLISHED : SCHEDULE_NONE_IN_WINDOW;
}

/** The `$i` key for the sentence that belongs to a schedule state. */
export function scheduleStateMessageKey (state) {
  switch (state) {
  case SCHEDULE_NEVER_PUBLISHED: return 'wfme_schedule_never_published';
  case SCHEDULE_NONE_IN_WINDOW: return 'wfme_schedule_none_in_window';
  case SCHEDULE_NONE_UNVERIFIED: return 'wfme_schedule_none_unverified';
  case SCHEDULE_UNKNOWN: return 'wfme_schedule_unknown';
  default: return '';
  }
}

/**
 * The business-date key of a shift: the date portion of `localBusinessDate` as a plain string.
 *
 * `localBusinessDate` arrives WITHOUT a zone designator (`"2026-07-06T00:00:00"`) because it is a
 * calendar date in the store's zone, not an instant. Parsing it into a Date would place it in the
 * browser's zone and can move it by a day; it is only ever used as an opaque grouping key here.
 */
export function businessDateKey (item) {
  const raw = item && item.localBusinessDate;
  return raw ? String(raw).slice(0, 10) : '';
}

/**
 * Groups shifts into `{ key, items }` buckets by business date, preserving the server's ordering
 * (#33 already sorts by `startsUtc`). Returns `null` for a not-loaded list so callers cannot mistake
 * unknown for empty.
 */
export function groupByBusinessDate (items) {
  if (!items) { return null; }

  const order = [];
  const buckets = {};
  items.forEach((item) => {
    const key = businessDateKey(item);
    if (!buckets[key]) { buckets[key] = { key, items: [] }; order.push(key); }
    buckets[key].items.push(item);
  });
  return order.map(key => buckets[key]);
}

// A business-date key is a calendar date, so it is read back at UTC midnight and formatted in UTC.
// Any other zone could shift it to the previous day and relabel the whole group.
function dateFromKey (key) {
  return new Date(key + 'T00:00:00Z');
}

/** "mandag 6. juli" for a business-date key, in the given locale. */
export function formatBusinessDate (key, locale) {
  if (!key) { return ''; }
  return new Intl.DateTimeFormat(locale || 'nb-NO', {
    weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
  }).format(dateFromKey(key));
}

/**
 * The wall-clock time of a UTC instant in the STORE's zone — the zone the shift was rostered in, not
 * the phone's. A worker travelling, or a phone with a wrong zone, must still read the shift as the
 * restaurant means it.
 *
 * When the zone is absent the time is rendered in UTC and the caller is told so via
 * `timeZoneIsKnown`, rather than silently substituting the browser's zone and producing a plausible
 * wrong number.
 */
export function formatWallClock (utcIso, timeZoneId, locale) {
  if (!utcIso) { return ''; }
  const date = parseApiInstant(utcIso);
  if (!date) { return ''; }

  try {
    return new Intl.DateTimeFormat(locale || 'nb-NO', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timeZoneId || 'UTC'
    }).format(date);
  } catch (e) {
    // An unknown IANA id throws rather than falling back. Render UTC and let `timeZoneIsKnown` mark it.
    return new Intl.DateTimeFormat(locale || 'nb-NO', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC'
    }).format(date);
  }
}

/** False when a shift carries no usable zone, so the page can label the times it shows as UTC. */
export function timeZoneIsKnown (timeZoneId) {
  if (!timeZoneId) { return false; }
  try {
    // Building the formatter is the only way to ask whether the runtime knows this IANA id — an
    // unknown zone throws a RangeError. The instance itself is not wanted.
    Intl.DateTimeFormat('en', { timeZone: timeZoneId });
    return true;
  } catch (e) {
    return false;
  }
}

/** "07:00–15:00" in the store's zone. */
export function formatShiftRange (item, locale) {
  if (!item) { return ''; }
  const zone = item.timeZoneId;
  return formatWallClock(item.startsUtc, zone, locale) + '–' + formatWallClock(item.endsUtc, zone, locale);
}

/**
 * Paid minutes on a shift: its length less the unpaid break. Never a wage — there are no rates on
 * this surface and none are implied.
 *
 * Returns null when either instant is missing or unparseable, so the caller renders nothing rather
 * than a zero it cannot stand behind.
 *
 * Both ends are parsed as UTC. A same-offset misparse would cancel in the subtraction, but a shift
 * whose BROWSER-local reading straddles a DST transition does not cancel: read as local Oslo time,
 * 02:30→03:30 on the autumn fall-back date spans the repeated hour and measures 120 minutes for a
 * 60-minute shift. Parsing as UTC has no folds and no gaps, so the duration is the real one.
 */
export function paidMinutes (item) {
  if (!item || !item.startsUtc || !item.endsUtc) { return null; }
  const startDate = parseApiInstant(item.startsUtc);
  const endDate = parseApiInstant(item.endsUtc);
  if (!startDate || !endDate) { return null; }
  const start = startDate.getTime();
  const end = endDate.getTime();

  const unpaid = typeof item.unpaidBreakMinutes === 'number' ? item.unpaidBreakMinutes : 0;
  const minutes = Math.round((end - start) / 60000) - unpaid;
  return minutes > 0 ? minutes : 0;
}

/** "7t 30m" / "45m". Returns '' for null so an unknown duration renders as nothing at all. */
export function formatMinutes (minutes) {
  if (minutes === null || minutes === undefined) { return ''; }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) { return rest + 'm'; }
  if (rest === 0) { return hours + 't'; }
  return hours + 't ' + rest + 'm';
}

/** True when a shift crosses midnight in the store's zone — worth flagging on a phone. */
export function crossesMidnight (item, locale) {
  if (!item || !item.startsUtc || !item.endsUtc) { return false; }
  const zone = item.timeZoneId || 'UTC';
  const day = (iso) => {
    const instant = parseApiInstant(iso);
    if (!instant) { return ''; }
    try {
      return new Intl.DateTimeFormat(locale || 'en-CA', {
        year: 'numeric', month: '2-digit', day: '2-digit', timeZone: zone
      }).format(instant);
    } catch (e) {
      return '';
    }
  };
  const from = day(item.startsUtc);
  const to = day(item.endsUtc);
  return !!from && !!to && from !== to;
}
