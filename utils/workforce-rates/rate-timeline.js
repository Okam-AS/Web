// The rate timeline as a manager reads it: every statement ever made about what an hour costs, and
// which one is in force now.
//
// THE MODEL THIS PROJECTION HAS TO CARRY INTACT. `WorkforceRateAuthoringService` appends and never
// edits. Setting a rate closes the row in force at the new instant and opens a new one beside it;
// the only column ever written on an existing row is its END BOUND. There is no update and no
// delete on that controller, so this file exposes no notion of an editable row and the components
// above it have no "edit" affordance to bind. A row that could be opened for editing on screen is a
// promise the API cannot keep.
//
// A restatement at an instant that ALREADY carries one is `workforce.rate-version-exists` (409),
// not an overwrite — `collisionOn` is what lets the form say so before the manager presses save
// rather than after.
//
// HONEST STATE. `unknown` (the read failed or has not happened) and `empty` (the server answered,
// this scope has no rate) are different claims and are never the same value: a failed read must
// never render as "this store has no rates", which invites a manager to type one that is already
// there and get a 409 they cannot explain.

import { parseApiInstant } from '~/utils/workforce/week-range';

/** The read failed or has not run. Nothing is known about this scope's rates. */
export const RATE_UNKNOWN = 'unknown';
/** The server answered, and this scope has never had a rate stated. */
export const RATE_EMPTY = 'empty';
/** The server answered with at least one statement. */
export const RATE_LISTED = 'listed';

/** Scope kinds this page authors on. The route differs; nothing else does. */
export const SCOPE_STAFF = 'staff';
export const SCOPE_ROLE = 'role';

/**
 * One timeline from `GET .../rates` (a `WorkforceRateHistoryModel`).
 *
 * Every instant is read with `parseApiInstant`, never `new Date(iso)`. The two stamps on this
 * document arrive in DIFFERENT shapes from the same server: `effectiveFromUtc` on a row loaded from
 * the column comes back `DateTimeKind.Unspecified` and serialises BARE, while the row this same
 * request just appended was built from `StartOfDayUtc`/`TimeProvider` and serialises with a `Z`.
 * `new Date('2026-09-01T00:00:00')` is read as BROWSER-LOCAL, which in Oslo is 22:00 on 31 August —
 * the rate would be shown starting the day before it does. That defect has shipped on this estate
 * once already, which is why nothing here parses a stamp itself.
 */
export function buildTimeline (history) {
  if (!history || !Array.isArray(history.versions)) {
    return { state: RATE_UNKNOWN, rows: [], timeZoneId: null, source: null, headCurrency: null };
  }

  const rows = history.versions.map(toRow);

  return {
    state: rows.length ? RATE_LISTED : RATE_EMPTY,
    rows,
    // The zone the server converted the local dates through. Rendered, never re-derived: a client
    // that resolved the zone itself would be answering a question the server already answered.
    timeZoneId: history.timeZoneId || null,
    source: history.source || null,
    // What the currently-open row is denominated in, so a new statement defaults to the currency
    // this timeline already uses rather than to the admin's market. Null when nothing is open.
    headCurrency: headCurrencyOf(rows)
  };
}

function toRow (version) {
  const row = version || {};
  const effectiveToUtc = parseApiInstant(row.effectiveToUtc);

  return {
    rateVersionId: row.rateVersionId || null,
    source: row.source || null,
    // The venue's own calendar date, verbatim off the wire. NOT derived from the instant: deriving
    // it would need a zone, and the server has already done that conversion through the store's.
    effectiveFromLocalDate: typeof row.effectiveFromLocalDate === 'string' ? row.effectiveFromLocalDate : null,
    effectiveFromUtc: parseApiInstant(row.effectiveFromUtc),
    effectiveToUtc,
    // The head of the timeline: open-ended, so it governs every instant from its start onwards.
    isOpen: effectiveToUtc === null,
    // Integer minor units per worked hour, exactly as the API stated it. Never scaled here.
    //
    // `Number.isFinite`, not `typeof === 'number'`: `typeof NaN` is `'number'`, so the looser guard
    // admitted a non-finite as a stated rate. The one consumer, `amountLabel` in
    // `WorkforceRateTimeline.vue`, tests `=== null` — and a `NaN` past it reaches the CROSS-CURRENCY
    // branch, whose `wholeAmount`/`fractionAmount` are ungated by design and answer "0"/"00" to
    // anything falsy. A rate nobody stated would have printed `0,00 SEK`: an hour of work priced at
    // nothing. Same shape as `wholeOrNull` in `attendance-view.js` beside this.
    //
    // `isFinite` is right because this value's DOMAIN is numeric, not because falsiness is a general
    // hazard — the same reflex on a string field would enforce nothing (`!'0'` is `false`). Zero
    // survives: `Number.isFinite(0)` is true, and a `|| null` here would have erased a real figure.
    hourlyRateMinor: Number.isFinite(row.hourlyRateMinor) ? row.hourlyRateMinor : null,
    currency: row.currency || null,
    timeZoneId: row.timeZoneId || null,
    createdAtUtc: parseApiInstant(row.createdAtUtc)
  };
}

/**
 * The currency of the open row.
 *
 * The server returns the timeline newest first, but this scans for `isOpen` rather than taking
 * `rows[0]`: a backdated statement is bounded by its successor and is therefore CLOSED even though
 * it may sort first on some other ordering, and the currency that matters is the one currently in
 * force. Null when nothing is open, which is a real state — every row closed means the scope has no
 * rate today.
 */
function headCurrencyOf (rows) {
  const open = rows.find(row => row.isOpen);
  return open ? open.currency : null;
}

/**
 * The row that already takes effect on `localDate`, or null.
 *
 * This is the pre-emptive half of the 409. The server refuses a second statement at an instant that
 * already carries one and names the existing row; a form that only found out afterwards would let a
 * manager believe a mistyped rate can be corrected where it stands. It cannot: it can only be
 * SUPERSEDED from a later date, and the earlier statement stays standing forever.
 *
 * Matched on the LOCAL DATE the server itself echoed, not on a converted instant — the local date is
 * the identity of the statement, and comparing instants would need this file to pick a zone.
 */
export function collisionOn (timeline, localDate) {
  if (!timeline || timeline.state !== RATE_LISTED || !localDate) { return null; }
  return timeline.rows.find(row => row.effectiveFromLocalDate === localDate) || null;
}

/**
 * The row in force at the local date a new statement would start on — the one the server will close
 * forward. Named so the form can say WHICH statement is about to be superseded, which is the whole
 * content of the confirmation a manager needs before appending.
 *
 * Compared on local dates as strings: `yyyy-MM-dd` sorts lexicographically exactly as it sorts
 * chronologically, so no parsing (and therefore no zone) is involved.
 */
export function predecessorOn (timeline, localDate) {
  if (!timeline || timeline.state !== RATE_LISTED || !localDate) { return null; }

  const earlier = timeline.rows.filter(row =>
    row.effectiveFromLocalDate && row.effectiveFromLocalDate < localDate);
  if (!earlier.length) { return null; }

  // The latest of the earlier statements. Its end bound may already be closed before this date, in
  // which case the server closes nothing — so `isOpenAt` says which it is rather than assuming.
  return earlier.reduce((latest, row) =>
    row.effectiveFromLocalDate > latest.effectiveFromLocalDate ? row : latest);
}

/**
 * The row a later statement would BOUND rather than replace: the earliest statement starting after
 * `localDate`.
 *
 * A backdated rate does not cancel a raise somebody already dated to a later day — the server bounds
 * the new row at the successor's start instead. The form says so, because a manager backdating a
 * correction otherwise reasonably expects the new number to apply from then on.
 */
export function successorOn (timeline, localDate) {
  if (!timeline || timeline.state !== RATE_LISTED || !localDate) { return null; }

  const later = timeline.rows.filter(row =>
    row.effectiveFromLocalDate && row.effectiveFromLocalDate > localDate);
  if (!later.length) { return null; }

  return later.reduce((earliest, row) =>
    row.effectiveFromLocalDate < earliest.effectiveFromLocalDate ? row : earliest);
}

export default buildTimeline;
