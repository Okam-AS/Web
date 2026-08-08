// The personalliste, turned from a wire response into the sheet a labour inspector is handed.
//
// WHAT THE REGULATION ASKS FOR (`bokføringsforskriften § 8-5-6`), field by field, because every
// decision in this file is one of them:
//
//   • "den bokføringspliktiges navn og organisasjonsnummer" — the business name and organisation
//     number. Recorded ON EACH ENTRY by the backend projection, so it is read off the rows and never
//     resolved a second way. A day with no rows carries no business identity, and this file does not
//     invent one: nothing was observed, so nothing is asserted.
//   • "den enkeltes navn og fødselsnummer eller D-nummer" — the name and national identifier of each
//     person present. The wire carries a name and a PROTECTED IDENTITY CODE, never a national
//     identifier. See `IDENTITY_CODE_UNREGISTERED` below: the substitution the paragraph permits is
//     conditional, and the condition is not met today.
//   • "tidspunktet for arbeidsdagens begynnelse og slutt" — arrival AND departure. Both are rendered,
//     and a window with no recorded departure is called out rather than left blank.
//   • "hvem som har foretatt rettelsen og tidspunkt for når det er gjort" — who corrected an entry
//     and when. Carried per row and rendered when present.
//   • "oppbevares i Norge i tre år og seks måneder etter regnskapsårets slutt" — the retention
//     horizon the backend stamps on every entry; surfaced as a fact of the sheet.
//
// TWO THINGS THIS FILE REFUSES TO DO.
//
//   1. It never recomputes a figure the server stated. `presentCount` is the server's own count of
//      open windows and is passed through; a second count computed here that disagreed would leave
//      nobody able to say which one an inspector should believe.
//   2. It never renders an instant in the browser's zone. Every clock time is resolved through the
//      STORE's zone, which the response reports alongside the business day it bucketed the entries
//      into. A manager reading the list from another country still reads the venue's clock.

import { businessDateKey, isoDate, parseApiInstant, partsInZone } from '~/utils/workforce/week-range';

/** The read has not answered, or answered with a failure. NOT the same claim as "nobody was here". */
export const SHEET_UNKNOWN = 'unknown';
/** The read answered, and the venue registered nobody on this business day. A positive answer. */
export const SHEET_EMPTY = 'empty';
/** The read answered with entries. */
export const SHEET_READY = 'ready';

/** An open window on the venue's CURRENT business day: this person is on site now. */
export const STATUS_PRESENT = 'present';
/**
 * An open window on a PAST business day. Nobody is standing there — the departure was never
 * recorded. The two readings share one wire flag (`isPresent`) and must not share one word on
 * screen: "still present" on a list from three weeks ago is a claim about a person, when the true
 * claim is about a missing punch, and § 8-5-6 requires the end time that is missing.
 */
export const STATUS_NO_DEPARTURE = 'no-departure';
/** Arrival and departure both recorded. */
export const STATUS_COMPLETED = 'completed';

/**
 * The § 8-5-6 identity-code gap, named once so every surface that mentions it says the same thing.
 *
 * The paragraph reads: "Fødselsnumre og D-numre kan erstattes med unike koder. Det skal i så fall
 * utarbeides en oversikt over benyttede koder med tilhørende fødselsnummer eller D-nummer."
 *
 * The substitution is lawful ONLY together with that overview. What the backend puts on the wire is
 * `"wf-person:" + WorkforcePersonId` (`WorkforcePersonnelListProjection.ProtectedCodeRef`) — a code
 * derived from an internal identifier. Okam neither collects nor stores a fødselsnummer or D-nummer
 * anywhere (`WorkforcePerson`: "birth dates and national IDs are never carried here"), so no
 * overview mapping these codes back to national identifiers exists in this system, and none is
 * invented here.
 *
 * The consequence is stated on the sheet itself rather than softened: the list satisfies the times,
 * the names and the business identity, and does NOT on its own satisfy the identification
 * requirement. A screen that implied otherwise would be worse than no screen, because it would be
 * believed.
 */
export const IDENTITY_CODE_UNREGISTERED = 'unregistered';

const MS_PER_DAY = 86400000;

/**
 * Every relationship to the business the «Tilknytning» column can print, and the key it prints it
 * under. ONE list, exported, because three things have to agree about it and used to hold three
 * copies: the sheet's label lookup, the "is this category known" check below, and the caveat printed
 * above the column, which enumerates the values in prose.
 *
 * A fifth value added here is a fifth value on a statutory register, and
 * `test/workforce-personnel-list-evidence-world.test.js` reds until the caveat names it too.
 */
export const CATEGORY_LABEL_KEYS = {
  Employee: 'wfpl_cat_employee',
  WorkingOwnerManager: 'wfpl_cat_owner',
  Unpaid: 'wfpl_cat_unpaid',
  HiredIn: 'wfpl_cat_hiredin'
};

const CATEGORIES = Object.keys(CATEGORY_LABEL_KEYS);

/**
 * True when the platform can actually resolve clock times in this zone.
 *
 * The zone id is a SERVER-SUPPLIED string. `Intl.DateTimeFormat` throws a `RangeError` on one the
 * engine does not know, and that throw inside a render is a blank page rather than a message. Asked
 * once, up front, so an unusable zone becomes a stated refusal instead.
 */
function isUsableTimeZone (timeZoneId) {
  if (!timeZoneId) { return false; }
  try {
    partsInZone(timeZoneId, new Date(0));
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * The sheet for one business day.
 *
 * `response` is the endpoint 30 body, or null when the read has not answered (or failed) — the two
 * are the same state here and it is NOT emptiness. `options.contextTimeZoneId` is the store zone the
 * page resolved from `GET /context`, used only when the response omits its own, so the times are
 * always labelled with the zone they were actually rendered in.
 *
 * THE VENUE'S TODAY IS TAKEN FROM THE SERVER'S OWN CLOCK, never the browser's. `asOfUtc` is the
 * authoritative stamp the projection was computed at; resolved through the store zone it IS the
 * venue's current business date, and comparing the sheet's day against it is what separates "on site
 * now" from "no departure was ever recorded". A browser clock — wrong, in another zone, or merely
 * a minute either side of midnight — would decide that distinction for a person who is not there.
 */
export function buildPersonnelSheet (response, options) {
  const opts = options || {};
  const timeZoneId = (response && response.timeZoneId) || opts.contextTimeZoneId || null;
  const businessDate = response ? businessDateKey(response.businessDate) : null;

  const sheet = {
    state: SHEET_UNKNOWN,
    businessDate,
    // Null, not false: without the server's stamp we do not know whether this day is current, and
    // guessing decides whether an open window reads as a person or as a defect.
    isToday: null,
    timeZoneId,
    timeZoneIsFallback: !!(response && response.timeZoneIsFallback),
    zoneUnusable: false,
    asOf: null,
    businesses: [],
    businessIdentity: null,
    hasMixedBusinessIdentity: false,
    // The SERVER's count of open windows, never a second count made here.
    openWindowCount: response && typeof response.presentCount === 'number' ? response.presentCount : null,
    rows: [],
    correctedCount: 0,
    retainUntil: null,
    storeId: response && typeof response.storeId === 'number' ? response.storeId : null
  };

  if (!response) { return sheet; }

  if (!isUsableTimeZone(timeZoneId)) {
    sheet.zoneUnusable = true;
    return sheet;
  }

  sheet.asOf = stampIn(timeZoneId, response.asOfUtc, businessDate);
  if (sheet.asOf && businessDate) { sheet.isToday = sheet.asOf.isoDate === businessDate; }

  const rows = Array.isArray(response.rows) ? response.rows : [];
  if (!rows.length) {
    sheet.state = SHEET_EMPTY;
    return sheet;
  }

  sheet.state = SHEET_READY;
  sheet.rows = rows.map(row => buildRow(row, timeZoneId, businessDate, sheet.isToday));
  sheet.correctedCount = sheet.rows.filter(row => row.correction).length;
  sheet.businesses = distinctBusinesses(rows);
  sheet.businessIdentity = sheet.businesses.length === 1 ? sheet.businesses[0] : null;
  sheet.hasMixedBusinessIdentity = sheet.businesses.length > 1;
  sheet.retainUntil = latestRetainUntil(rows);

  return sheet;
}

function buildRow (row, timeZoneId, businessDate, isToday) {
  const start = stampIn(timeZoneId, row.onSiteStartUtc, businessDate);
  const end = stampIn(timeZoneId, row.onSiteEndUtc, businessDate);

  return {
    entryId: row.personnelListEntryId || null,
    // The name is printed as the register recorded it. A row that carries none is an explicit
    // "unnamed" at the component, never a participant id standing in for a person.
    name: row.participantName || null,
    identityCode: row.protectedIdentityCodeRef || null,
    // Passed through as the server spelled it. An unrecognised category is rendered raw rather than
    // bucketed into a known one — a wrong category on a statutory register is a false statement
    // about someone's relationship to the business.
    category: row.category || null,
    categoryIsKnown: CATEGORIES.includes(row.category),
    hiredInOrganizationNumber: row.hiredInOrganizationNumber || null,
    start,
    end,
    status: rowStatus(row, isToday),
    correction: buildCorrection(row, timeZoneId, businessDate)
  };
}

/**
 * § 8-5-6: "Dersom det foretas rettelser i personallisten, skal det fremgå hvem som har foretatt
 * rettelsen og tidspunkt for når det er gjort."
 *
 * EITHER field present makes this a corrected row. A correction that named only one of the two is
 * still a correction, and a register that hid it because the other half was missing would be
 * concealing the very fact the paragraph asks to be visible.
 */
function buildCorrection (row, timeZoneId, businessDate) {
  if (!row.correctionActorReference && !row.correctedAtUtc) { return null; }
  return {
    actor: row.correctionActorReference || null,
    at: stampIn(timeZoneId, row.correctedAtUtc, businessDate)
  };
}

/**
 * An open window means one of two different things, and which one depends on the day being read.
 *
 * `isToday` is null when the venue's today is unknown — and then an open window is reported as a
 * missing departure, the weaker of the two claims. Saying "on site now" about a day we cannot place
 * would be asserting somebody's whereabouts from a value we do not have.
 */
function rowStatus (row, isToday) {
  if (row.onSiteEndUtc) { return STATUS_COMPLETED; }
  return isToday === true ? STATUS_PRESENT : STATUS_NO_DEPARTURE;
}

/**
 * A UTC instant as the venue's own wall clock, plus how many CIVIL days it sits from the business
 * day on the sheet.
 *
 * The offset is not decoration. A window opened at 22:30 and closed at 02:10 keeps the OPENING day's
 * business date on the backend, so the departure legitimately falls on the next calendar day — and a
 * bare "02:10" beside "22:30" reads as a shift that ran backwards. The offset is what makes the
 * printed row unambiguous to somebody who was not there.
 */
function stampIn (timeZoneId, value, businessDate) {
  const instant = parseApiInstant(value);
  if (!instant) { return null; }

  const parts = partsInZone(timeZoneId, instant);
  const localDate = isoDate(parts.year, parts.month, parts.day);

  return {
    isoDate: localDate,
    time: pad(parts.hour) + ':' + pad(parts.minute),
    dayOffset: civilDayOffset(businessDate, localDate)
  };
}

/** Whole calendar days between two `yyyy-MM-dd` strings, or null when either is unusable. */
function civilDayOffset (fromIsoDate, toIsoDate) {
  const from = civilOf(fromIsoDate);
  const to = civilOf(toIsoDate);
  if (from === null || to === null) { return null; }
  return Math.round((to - from) / MS_PER_DAY);
}

function civilOf (value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) { return null; }
  return Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, Number(value.slice(8, 10)));
}

/**
 * The businesses the day's entries were recorded under, in the order they appear.
 *
 * Normally exactly one. It is a LIST rather than the first row's value because the entry carries the
 * legal employer the person is engaged under, and one venue can engage staff under more than one —
 * in which case "den bokføringspliktiges navn og organisasjonsnummer" has no single answer and the
 * sheet has to say so. Picking the first would print one organisation number over rows belonging to
 * another.
 */
function distinctBusinesses (rows) {
  const seen = [];
  for (const row of rows) {
    const name = row.businessName || null;
    const organizationNumber = row.organizationNumber || null;
    if (!name && !organizationNumber) { continue; }
    const key = String(name) + '|' + String(organizationNumber);
    if (seen.some(entry => entry.key === key)) { continue; }
    seen.push({ key, name, organizationNumber });
  }
  return seen.map(entry => ({ name: entry.name, organizationNumber: entry.organizationNumber }));
}

/**
 * The furthest retention horizon on the day's entries, as a calendar date.
 *
 * Sliced off the raw value rather than rendered through a zone: it is the backend's civil
 * "accounting-year end + 3 years 6 months", and converting it into a zone could move it a day.
 */
function latestRetainUntil (rows) {
  let latest = null;
  for (const row of rows) {
    const date = businessDateKey(row.retainUntilUtc);
    if (date && (latest === null || date > latest)) { latest = date; }
  }
  return latest;
}

/**
 * A Norwegian organisation number in its conventional 3-3-3 grouping, and untouched otherwise.
 *
 * Only exactly nine digits are regrouped. Anything else is printed as recorded — a value that is not
 * a Norwegian organisation number must not be dressed up as one on a statutory sheet.
 */
export function formatOrganizationNumber (value) {
  if (typeof value !== 'string') { return null; }
  const trimmed = value.trim();
  if (!/^\d{9}$/.test(trimmed)) { return trimmed || null; }
  return trimmed.slice(0, 3) + ' ' + trimmed.slice(3, 6) + ' ' + trimmed.slice(6);
}

function pad (value) {
  return String(value).padStart(2, '0');
}
