// THE PUBLICATION HISTORY AND ITS RECIPIENT ROSTERS — endpoints #21 and #22.
//
// Its own module rather than a field on the publish response, for the same reason the delivery
// outbox is one: what a publication REACHED is a family of its own, and the publish response's
// `recipientCount` is only how many recipient rows were written.
//
// ---- WHAT IS MODELLED FROM THE BACKEND ---------------------------------------------------------
//
//   `GET /schedules/publication-history` — a BARE ARRAY of `WorkforceSchedulePublicationModel`,
//     `WorkforceScheduler`, ordered publishedAt-desc then revision-desc then number-desc, and
//     UNPAGED. `recipientCount` is a COUNT of recipient rows, computed separately from the roster.
//
//   `GET /schedules/publications/{id}/recipients` — a BARE ARRAY of
//     `WorkforcePublicationRecipientModel`, `WorkforceManager` (a HIGHER grant than the history
//     beside it), 404 for an id this store does not own. It carries NO OrderBy in the service, so
//     nothing here or in the page may depend on the order.
//
//   The projection's two holes. The history endpoint does not project `cost` (null by design) or
//     `noticeLeadDays` (so it serialises as 0). Both are reproduced here EXACTLY as the API sends
//     them — a fixture that helpfully filled them in would let a page ship that renders a default
//     zero as a measured notice period, which is the defect the reader module exists to refuse.
//
// ---- WHAT IS NOT MODELLED ----------------------------------------------------------------------
//
// No acknowledgement WRITE. The worker's own page owns `POST /workforce/me/publications/{id}/
// acknowledgements`, and this lane binds neither it nor a manual-delivery write — there is no manual
// -delivery endpoint on the backend at all. So the receipts on the seeded publications are HISTORY:
// they are what those people already did, exactly as the delivery fixture seeds one historical dead
// letter so the worker tier is reachable at all.
//
// ---- THE SEEDED WORLD, AND WHY IT IS SHAPED THIS WAY -------------------------------------------
//
// It follows the world's own facts and invents none. Of `world.STAFF`, only `staff-1` is `Claimed`;
// `staff-2` and `staff-3` have never claimed a login and therefore have NO SCREEN to confirm from.
// So a roster where all three had confirmed would be impossible in this world, and one where the two
// invited workers simply show nothing would teach the reader that they ignored their plan. What is
// seeded instead is what actually happens to a store like this one:
//
//   The freshly published week (written by the journey's own publish) — nobody has confirmed
//     anything yet, because it was published seconds ago. This is the TRUE state of a new
//     publication, and it is the case a venue most needs to see honestly.
//
//   The current historical week — `staff-1` confirmed it from her own screen; `staff-2` could not,
//     so a manager recorded delivering it by hand; `staff-3` produced nothing at all.
//
//   The week before it, which the one above REPLACED — `staff-1` opened it and never confirmed. Its
//     `recipientCount` is 3 while only 2 recipients can be named, because the third was written for
//     a staff member who has since left the roster: the recipients read inner-joins the staff member
//     and the person, so that row silently vanishes from the roster and only the count remembers it.

'use strict';

/** Wire format for a `DateTime`: no zone designator, exactly as the API serialises one. */
function iso (date) {
  return new Date(date).toISOString().replace(/\.\d{3}Z$/, '');
}

const DAY = 24 * 60 * 60 * 1000;

// Fixed offsets from the reset instant, so a journey reads a plausible history rather than dates in
// 1970 — and so the newest seeded publication is still older than anything the journey publishes.
const SEEDED_CURRENT_AGO = 7 * DAY;
const SEEDED_REPLACED_AGO = 9 * DAY;

/**
 * `staff-N` -> the display name the recipients read joins in. Keyed to `world.STAFF`; it lives here
 * so the roster's own wire shape, which other journeys assert, is untouched by this lane.
 */
const NAMES = {
  'staff-1': 'Ola Ansatt',
  'staff-2': 'Kari Hansen',
  'staff-3': 'Nina Nyansatt'
};

/** The one person in this world who has claimed a login, and so the only one who can confirm. */
const CLAIMED = { 'staff-1': 'user-worker' };

function recipient (publicationId, staffMemberId, over) {
  return Object.assign({
    publicationRecipientId: 'rec-' + publicationId + '-' + staffMemberId,
    schedulePublicationId: publicationId,
    staffMemberId,
    staffDisplayName: NAMES[staffMemberId] || null,
    claimedByApplicationUserId: CLAIMED[staffMemberId] || null,
    channel: CLAIMED[staffMemberId] ? 'Inbox' : 'Email',
    deliveryState: 'Delivered',
    seenAtUtc: null,
    acknowledgedAtUtc: null,
    manuallyDeliveredAtUtc: null,
    createdAtUtc: null
  }, over || {});
}

function publication (id, over) {
  return Object.assign({
    schedulePublicationId: id,
    scheduleRevisionId: 'rev-' + id,
    // Adopted on the first read, exactly like the delivery fixture's seeded dead letter: the store
    // id is not known until a journey signs in.
    storeId: null,
    publicationNumber: 1,
    supersedesPublicationId: null,
    contentHash: 'hash-' + id,
    // C4: the publish transaction froze who caused it, and the page shows that name.
    publishedByActorReference: 'user:manager-e2e',
    publishedAtUtc: null,
    ruleSetVersionId: null,
    legalEmployerId: null,
    timeZoneId: 'Europe/Oslo',
    countryCode: 'NO',
    region: null,
    rangeStartUtc: null,
    rangeEndUtc: null,
    recipientCount: 0,
    // THE TWO HOLES, REPRODUCED. Endpoint 21 projects neither, so this is what the wire carries.
    noticeLeadDays: 0,
    cost: null
  }, over || {});
}

/** The reset slice: two historical publications and their rosters. */
function fresh () {
  const now = Date.now();
  const replacedId = 'pub-seed-replaced';
  const currentId = 'pub-seed-current';

  // Both cover the SAME week — that is what makes one the replacement of the other.
  const weekStart = iso(now - 14 * DAY);
  const weekEnd = iso(now - 7 * DAY);

  const replaced = publication(replacedId, {
    publicationNumber: 1,
    publishedAtUtc: iso(now - SEEDED_REPLACED_AGO),
    rangeStartUtc: weekStart,
    rangeEndUtc: weekEnd,
    // THREE rows were written; only two can still be named. The count is the only witness that the
    // third recipient ever existed.
    recipientCount: 3
  });

  const current = publication(currentId, {
    publicationNumber: 2,
    supersedesPublicationId: replacedId,
    publishedAtUtc: iso(now - SEEDED_CURRENT_AGO),
    rangeStartUtc: weekStart,
    rangeEndUtc: weekEnd,
    recipientCount: 3
  });

  return {
    publications: [current, replaced],
    recipients: {
      [replacedId]: [
        // Opened on her own screen and never confirmed.
        recipient(replacedId, 'staff-1', {
          seenAtUtc: iso(now - SEEDED_REPLACED_AGO + 3600000),
          createdAtUtc: iso(now - SEEDED_REPLACED_AGO)
        }),
        recipient(replacedId, 'staff-2', { createdAtUtc: iso(now - SEEDED_REPLACED_AGO) })
        // The third row is deliberately ABSENT while `recipientCount` still says 3.
      ],
      [currentId]: [
        // Confirmed from her own screen. The only worker-attested receipt in the world.
        recipient(currentId, 'staff-1', {
          seenAtUtc: iso(now - SEEDED_CURRENT_AGO + 1800000),
          acknowledgedAtUtc: iso(now - SEEDED_CURRENT_AGO + 3600000),
          createdAtUtc: iso(now - SEEDED_CURRENT_AGO)
        }),
        // No login, so no screen to confirm from; a manager recorded handing it over.
        recipient(currentId, 'staff-2', {
          deliveryState: 'ManuallyDelivered',
          manuallyDeliveredAtUtc: iso(now - SEEDED_CURRENT_AGO + 7200000),
          createdAtUtc: iso(now - SEEDED_CURRENT_AGO)
        }),
        // Nothing came back at all.
        recipient(currentId, 'staff-3', { createdAtUtc: iso(now - SEEDED_CURRENT_AGO) })
      ]
    }
  };
}

/**
 * Record what a publish just wrote. Called from the publish route beside the outbox enqueue, so the
 * history a journey reads is the history its own publish made, not a fixture constant.
 *
 * The recipients it writes carry NO receipt of any kind, which is the truth about a week published
 * seconds ago: the outbox has accepted the commands and not one person has answered yet.
 */
function recordPublication (state, { storeId, publicationId, revisionId, recipients, rangeStartUtc, rangeEndUtc, actor }) {
  const now = iso(Date.now());
  const list = Array.isArray(recipients) ? recipients : [];

  state.publications.unshift(publication(publicationId, {
    scheduleRevisionId: revisionId || ('rev-' + publicationId),
    storeId,
    publicationNumber: 1,
    publishedAtUtc: now,
    publishedByActorReference: actor || 'user:manager-e2e',
    rangeStartUtc: rangeStartUtc || null,
    rangeEndUtc: rangeEndUtc || null,
    recipientCount: list.length
  }));

  state.recipients[publicationId] = list.map(staffMemberId => recipient(publicationId, staffMemberId, {
    deliveryState: 'Pending',
    createdAtUtc: now
  }));

  return list.length;
}

/**
 * Endpoint 21. Adopts the seeded rows into the signed-in store on first read, then filters and
 * orders exactly as `GetPublicationHistoryAsync` does.
 */
function history (state, storeId) {
  state.publications.forEach((p) => {
    if (p.storeId === null) { p.storeId = storeId; }
  });

  return state.publications
    .filter(p => String(p.storeId) === String(storeId))
    .slice()
    .sort((a, b) => {
      const at = String(b.publishedAtUtc || '').localeCompare(String(a.publishedAtUtc || ''));
      if (at !== 0) { return at; }
      return (b.publicationNumber || 0) - (a.publicationNumber || 0);
    });
}

/**
 * Endpoint 22, or null when this store owns no such publication — the caller turns that into the
 * 404 the service raises from its existence check, which is what stops a guessed id from reaching
 * another store's roster.
 */
function recipientsFor (state, storeId, publicationId) {
  const owned = state.publications.some(p =>
    String(p.storeId) === String(storeId) && p.schedulePublicationId === publicationId);
  if (!owned) { return null; }
  return state.recipients[publicationId] || [];
}

module.exports = { fresh, recordPublication, history, recipientsFor };
