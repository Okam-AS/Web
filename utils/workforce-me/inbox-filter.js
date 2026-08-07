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
 * The publications the notice must put on screen: everything still unread, PLUS everything this
 * session holds an acknowledgement receipt for.
 *
 * WHY THE SECOND HALF EXISTS, AND WHY IT IS NOT A RENDERING DETAIL. Acknowledging IMPLIES seen, so
 * the act that produces a receipt is the same act that makes the row read. A notice fed
 * `unreadPublications` alone therefore loses the row one tick after the receipt for it arrives —
 * and the receipt line lives ON that row, so it goes with it. The worker pressed "Bekreft mottatt"
 * and was shown nothing at all. The renderer needed an item that was both unread and acknowledged,
 * and no such item can exist; this is where that contradiction is resolved, because no change to the
 * template can resolve it.
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

  // Unread first, then what was just confirmed. What still needs the worker's attention outranks
  // what no longer does.
  const shown = (unread || []).slice();
  const reported = filterInboxItems(items, { kind: 'publication', state: 'all' }) || [];
  ids.forEach((id) => {
    const pressed = kept[id];
    // Already there, because the server has not marked it read. Nothing to add.
    if (shown.some(item => item.inboxItemId === pressed.inboxItemId)) { return; }
    // The SERVER's copy where the inbox still reports it, because that copy is the one carrying
    // `isRead: true` — which is what the surface reads to stop calling this row new. Falling back to
    // the row as it was pressed is what keeps the receipt on screen when the re-read failed or no
    // longer carries it: a confirmation must not depend on a second request succeeding.
    const current = reported.find(item => item.inboxItemId === pressed.inboxItemId);
    shown.push(current || pressed);
  });
  return shown;
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
