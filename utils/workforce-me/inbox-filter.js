// Filtering for the worker's own inbox (#34 `GET /workforce/me/inbox`).
//
// WHY THIS IS CLIENT-SIDE. The worker inbox action takes no query parameters at all
// (`Controllers/WorkforceMeController.cs:155`). The endpoint that unions the four request families
// and honours `?kind=` / `?state=` is #23 `GET /workforce/stores/{storeId}/requests` — the MANAGER
// decision inbox, gated on the WorkforceManager capability. A worker page must not call it, and
// appending those parameters to `/me/inbox` would be silently ignored: the page would believe it had
// filtered while showing everything.
//
// That silent-ignore is exactly the bug the backend closed on the manager side, where an unrecognised
// filter value is a 400 carrying the accepted values rather than an unfiltered list
// (`Services/Workforce/WorkforceHandoffProblems.cs`, `workforce.invalid-inbox-filter`). This module
// keeps that law at the layer that actually owns the filtering here: an unrecognised value THROWS and
// names what it would have accepted. It never degrades to "show everything".
//
// The kind vocabulary is deliberately narrow because the backend's inbox is narrow: the only
// `entityType` ever written is `WorkforceSchedulePublication`
// (`Services/Workforce/WorkforceSchedulePublishService.cs:338`). Inventing tokens for request
// families that never reach this inbox would be a UI promising a filter that can only ever match
// nothing.

/** The `entityType` value the backend writes for a schedule publication inbox item. */
export const ENTITY_TYPE_PUBLICATION = 'WorkforceSchedulePublication';

/** Accepted `kind` tokens. `all` is the unfiltered view and must be asked for explicitly. */
export const INBOX_KINDS = ['all', 'publication'];

/** Accepted `state` tokens. Derived from the item's `isRead`, which is server truth. */
export const INBOX_STATES = ['all', 'unread', 'read'];

/**
 * An unrecognised filter value. Mirrors the shape of the backend's `workforce.invalid-inbox-filter`
 * problem (`parameter` / `submitted` / `accepted`) so the two surfaces fail the same way.
 */
export class InboxFilterError extends Error {
  constructor (parameter, submitted, accepted) {
    super('The filter value for ' + parameter + ' is not recognized: ' + submitted);
    this.name = 'InboxFilterError';
    // See the transpile note in me-client.js — `instanceof` on a subclassed Error is not reliable
    // after an ES5 down-level, and a filter error that stops being recognised becomes a silent
    // unfiltered list, which is the one outcome this module exists to prevent.
    this.isInboxFilterError = true;
    this.parameter = parameter;
    this.submitted = submitted;
    this.accepted = accepted.slice();
  }
}

/** True for an unrecognised-filter failure, transpile-proof. */
export function isInboxFilterError (error) {
  return !!(error && error.isInboxFilterError);
}

// Matched leniently — case- and hyphen/underscore-insensitively — so `Publication`, `publication`
// and `PUBLICATION` select the same thing. This follows the backend's own lenient matching
// (`Models/Workforce/WorkforceRequestModels.cs:57-68`): a client should not get a surprising result
// for spelling a token in a different case. Lenient matching is not the same as silent acceptance —
// anything outside the vocabulary still throws.
function normalize (value) {
  return String(value).trim().toLowerCase().replace(/[-_\s]/g, '');
}

function resolve (parameter, value, accepted) {
  if (value === null || value === undefined || value === '') { return 'all'; }

  const wanted = normalize(value);
  const match = accepted.find(token => normalize(token) === wanted);
  if (!match) { throw new InboxFilterError(parameter, String(value), accepted); }
  return match;
}

/** Resolves a `kind` token, or throws `InboxFilterError`. An empty value means `all`. */
export function resolveKind (kind) {
  return resolve('kind', kind, INBOX_KINDS);
}

/** Resolves a `state` token, or throws `InboxFilterError`. An empty value means `all`. */
export function resolveState (state) {
  return resolve('state', state, INBOX_STATES);
}

/**
 * Filters inbox items by the resolved `kind` / `state` vocabulary.
 *
 * Throws `InboxFilterError` on an unrecognised value rather than returning the unfiltered list, so a
 * caller can never mistake "the filter matched nothing" for "the filter was never applied".
 *
 * `items` being null/undefined means NOT LOADED and is preserved as `null` — it is not the same as an
 * empty inbox and the caller must be able to tell the two apart.
 */
export function filterInboxItems (items, options) {
  const opts = options || {};
  const kind = resolveKind(opts.kind);
  const state = resolveState(opts.state);

  if (!items) { return null; }

  return items.filter((item) => {
    if (kind === 'publication' && item.entityType !== ENTITY_TYPE_PUBLICATION) { return false; }
    if (state === 'unread' && item.isRead) { return false; }
    if (state === 'read' && !item.isRead) { return false; }
    return true;
  });
}

/**
 * The publication items a worker has NOT yet read, newest first.
 *
 * `isRead` reflects the recipient's `seenAtUtc` — the same seen-state the manager's recipient read
 * reports. It does NOT tell us whether the worker acknowledged: acknowledging implies seen, but
 * marking read does not imply acknowledged, and the inbox row carries no acknowledgement field. The
 * UI must therefore never render "bekreftet" from this — only "lest".
 */
export function unreadPublications (items) {
  if (!items) { return null; }
  return filterInboxItems(items, { kind: 'publication', state: 'unread' });
}

/**
 * When an inbox row arrived, as a number, for ordering only.
 *
 * `createdAtUtc` is column-loaded and arrives BARE — no `Z`, no offset — so `new Date(...)` would
 * read it in the reader's own zone. Every row in one response is bare in the same way, so a naive
 * parse would still order them correctly; this reads them as UTC anyway because the same list can
 * carry a row kept from an earlier press, and two rows parsed under two rules cannot be compared.
 * An unreadable instant sorts LAST rather than throwing: a bad timestamp on one row must never take
 * the whole notice off the worker's screen.
 */
function arrivedAt (value) {
  const text = String(value || '');
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(text);
  const parsed = Date.parse(text ? (hasZone ? text : text + 'Z') : '');
  return isNaN(parsed) ? -Infinity : parsed;
}

/**
 * THE ORDER THE NOTICE PUTS PUBLICATIONS IN, and the reason it is computed rather than inherited.
 *
 * Newest first, which is what `GET /workforce/me/inbox` already answers
 * (`WorkforceSelfService.GetInboxAsync`, `OrderByDescending(i => i.CreatedAtUtc)`), with the inbox
 * item id breaking a tie.
 *
 * The position of a row has to be a function of the ROW SET and of nothing else, because this page
 * RE-READS the inbox after every press and re-renders from the answer. Two things would otherwise
 * move a row for a reason the worker did not perform: a SQL `ORDER BY` whose keys are equal has no
 * defined order and may answer two reads differently, and a row carried over from a press is not in
 * the server's list at all. A row that moves is not cosmetic here — see `publicationsForNotice`.
 */
function noticeOrder (items) {
  return items.slice().sort((a, b) => {
    const at = arrivedAt(a.createdAtUtc);
    const bt = arrivedAt(b.createdAtUtc);
    if (at !== bt) { return bt - at; }
    const ai = String(a.inboxItemId);
    const bi = String(b.inboxItemId);
    return ai < bi ? -1 : (ai > bi ? 1 : 0);
  });
}

/**
 * The publications the notice must put on screen: everything still unread, PLUS everything this
 * session holds an acknowledgement receipt for — in an order that does not depend on either.
 *
 * WHY THE SECOND HALF EXISTS, AND WHY IT IS NOT A RENDERING DETAIL. Acknowledging IMPLIES seen, so
 * the act that produces a receipt is the same act that makes the row read. A notice fed
 * `unreadPublications` alone therefore loses the row one tick after the receipt for it arrives —
 * and the receipt line lives ON that row, so it goes with it. The worker pressed "Bekreft mottatt"
 * and was shown nothing at all. The renderer needed an item that was both unread and acknowledged,
 * and no such item can exist; this is where that contradiction is resolved, because no change to the
 * template can resolve it.
 *
 * WHY CONFIRMING ONE ROW MAY NOT MOVE ANOTHER, which is the half this function used to get wrong.
 * It sorted unread-first and appended what had just been confirmed, so with TWO unread publications
 * the first press pushed the row it confirmed to the BOTTOM and lifted the other week into the
 * position the worker had just pressed. Every row offers an acknowledge control, so a second press
 * at the same place — the press of a person who thinks the first one did not register — wrote a NEW
 * acknowledgement for a week she had never looked at. That was walked live against trunk `6b98839`
 * on 2026-08-07: two presses, two publications acknowledged, no error, nothing on screen saying the
 * second press had addressed a different week.
 *
 * An acknowledgement is a person's statement that she has seen a roster she is on. So the repair is
 * to RE-TARGET rather than to refuse: one ordering is applied to the whole set, and read state and
 * acknowledgement state are used only to decide WHICH rows are on screen, never in what order. The
 * control at a given place therefore keeps addressing the same publication across a press, and the
 * second press is the idempotent replay it looks like. Refusing instead — dropping or disabling the
 * control once something had been confirmed — would have taken away the replay this notice
 * deliberately keeps a caller for, and would also have stopped a worker rostered on BOTH weeks from
 * confirming the second one at all: it would have prevented the accident by preventing the act.
 *
 * `acknowledged` is keyed by `schedulePublicationId` and holds the inbox item AS IT STOOD when the
 * worker pressed. Kept from the press rather than looked up afterwards, so the confirmation does not
 * depend on a second request succeeding: an inbox re-read that failed leaves the receipt on screen.
 *
 * Null still means NOT LOADED, exactly as `unreadPublications` does — null in, with nothing
 * acknowledged, gives null out. Receipts alone are enough to render, because they are this page's
 * own first-hand record of an act it performed, not an inference about server state.
 */
export function publicationsForNotice (items, acknowledged) {
  const kept = acknowledged || {};
  const ids = Object.keys(kept).filter(id => kept[id]);
  const unread = unreadPublications(items);
  if (unread === null && !ids.length) { return null; }

  const reported = filterInboxItems(items, { kind: 'publication', state: 'all' }) || [];

  // WHICH rows belong on screen — still unread, or confirmed in this session. This is the only thing
  // read state and acknowledgement state decide. Neither reaches the ordering below.
  const belongs = {};
  (unread || []).forEach((item) => { belongs[item.inboxItemId] = true; });
  ids.forEach((id) => { belongs[kept[id].inboxItemId] = true; });

  // The SERVER's copy of each row, because that copy is the one carrying `isRead: true` — which is
  // what the surface reads to stop calling a confirmed row new.
  const shown = noticeOrder(reported).filter(item => belongs[item.inboxItemId]);

  // A row confirmed in this session that the re-read no longer reports — a failed inbox read, or one
  // that came back without it. The receipt is rendered ON the row, so the row is carried from the
  // press rather than lost with the request: a confirmation must not depend on a second request
  // succeeding. Ordered among themselves by the same rule, for the same reason.
  const missing = ids.map(id => kept[id])
    .filter(pressed => !reported.some(item => item.inboxItemId === pressed.inboxItemId));
  return shown.concat(noticeOrder(missing));
}

/**
 * How many publications have ever reached this worker, or `null` when the inbox is not loaded.
 *
 * This is the only worker-visible evidence that a schedule was ever published to them, and it is what
 * separates "no schedule has been published to you yet" from "you are not on this period's schedule".
 * `null` must stay `null` all the way to the screen — rendering it as 0 would assert the first
 * sentence on no evidence.
 */
export function publicationCount (items) {
  const filtered = filterInboxItems(items, { kind: 'publication', state: 'all' });
  return filtered === null ? null : filtered.length;
}
