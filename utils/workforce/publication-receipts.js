// READING WHO A PUBLISHED WEEK ACTUALLY REACHED.
//
// Two reads, one question. `GET /workforce/stores/{id}/schedules/publication-history` (#21) lists
// every publication this store has ever made; `GET .../schedules/publications/{id}/recipients` (#22)
// names, for one of them, every worker it was addressed to and what each of them did about it.
// Everything here is pure — no HTTP, no Vue — so the judgements it makes can be tested without a
// browser.
//
// This exists because the publish button answers with a recipient COUNT and nothing else. That count
// is how many recipient rows were WRITTEN, and `~/utils/workforce/delivery-failures` already shows
// what became of the outbox commands behind them. Neither answers the question a venue is actually
// asked — "show me that the people on this plan were told" — because a transport accepting a message
// is not a person having received it.
//
// ---- THE ONE JUDGEMENT: WHO ATTESTED, AND NEVER ONE "DELIVERED" BUCKET -------------------------
//
// Four states, kept apart on purpose. The backend's own enum doc draws the line first:
// `WorkforcePublicationDeliveryState` "tracks whether the schedule reached the worker, INCLUDING the
// manager's manual-delivery fallback", and is "distinct from the informational seen/acknowledged
// receipt". So `deliveryState` describes the SEND. The timestamps describe what a PERSON did.
//
//   WORKER CONFIRMED — `acknowledgedAtUtc` is set. The worker pressed confirm on their own screen.
//     This is the only row a venue can hold up as "this worker confirmed their plan". Everything
//     else is weaker, and the difference is the entire point of this surface.
//
//   WORKER OPENED — `seenAtUtc` set, not acknowledged. The worker's own inbox rendered it. Still
//     the worker's act, and still evidence, but they did not confirm and must not be counted as if
//     they had.
//
//   MANAGER RECORDED BY HAND — `manuallyDeliveredAtUtc` set and the worker did neither. A manager
//     stated that they delivered it out of band. That is evidence about the MANAGER, not about the
//     worker, and a surface that adds it to the confirmed pile lets a venue produce, as proof it
//     told somebody, a row that only says a colleague ticked a box.
//
//   NO RECEIPT — none of the three. `deliveryState: Delivered` lands HERE, deliberately. A push that
//     the hub accepted, an SMS the gateway took, an inbox row that was written: none of them is a
//     person. Folding `Delivered` into a receipt bucket would reinstate exactly the false all-clear
//     that the delivery-failures surface was built to end, one layer further up.
//
// There is deliberately NO combined "reached" count. The buckets are returned separately for the
// same reason `summarise` in the failures module returns no total: any single number here would be
// read as "N of M were told", and no number on this screen can honestly say that.
//
// ---- THREE THINGS THE HISTORY PAYLOAD DOES NOT CARRY, AND ARE NOT INVENTED ---------------------
//
// Endpoint 21 projects a fixed field list, and two fields of `WorkforceSchedulePublicationModel` are
// NOT among them. They therefore arrive as their serialised defaults, which are indistinguishable
// from measurements:
//
//   `cost` — null. The model's own doc says endpoint 21 leaves it null on purpose ("pricing every
//     publication in a list is a rate lookup per shift per publication for a read nobody opened to
//     see money"). Nothing here surfaces it.
//
//   `noticeLeadDays` — arrives as 0, and 0 is a DEFAULT, not a measurement. Rendering it would put
//     "0 days notice" against every publication in the store's history, including ones published
//     weeks ahead, and it is advisory in the backend anyway (spec §13.2: "observability, never a
//     gate"). `decoratePublication` drops it rather than passing a zero through, because a zero that
//     a missing projection also produces is not a fact about notice. Endpoint 20 — the publish
//     response — DOES populate it, so a surface that reads that response may use it; this one reads
//     the history and may not.
//
//   Superseded-ness — not a field at all. Each publication points BACKWARD through
//     `supersedesPublicationId`, so "has this one been replaced" is only derivable by looking at the
//     whole list. `supersededIds` does that; see its own note on what makes the derivation sound.
//
// ---- WHY THE TWO COUNTS ARE COMPARED ----------------------------------------------------------
//
// `recipientCount` on the history row is a COUNT of recipient rows. The recipients read INNER JOINs
// those rows to the staff member and the person to get a display name, so a recipient whose staff
// member is gone drops out of the list silently and the roster is simply shorter. That is the shape
// this whole surface exists to refuse, so `summariseRecipients` carries both numbers and names the
// gap rather than letting the shorter list stand as the answer.

/** A read that has not answered, or answered with a failure. NOT the same as "nothing here". */
export const RECEIPTS_UNKNOWN = 'receipts_unknown';

/** The worker pressed confirm. The only worker-attested confirmation. */
export const ATTEST_CONFIRMED = 'confirmed';

/** The worker's own screen opened it; they did not confirm. Their act, weaker claim. */
export const ATTEST_OPENED = 'opened';

/** A manager recorded an out-of-band delivery. Evidence about the manager, not the worker. */
export const ATTEST_BY_HAND = 'by_hand';

/** Nobody attested anything. Includes a send every transport accepted. */
export const ATTEST_NONE = 'none';

/**
 * `WorkforcePublicationDeliveryState` as it arrives — STRINGS, because the API serialises every enum
 * through `StringEnumConverter`. Carried through for display only: it never decides an attestation.
 */
const DELIVERY_STATES = ['pending', 'delivered', 'failed', 'manuallydelivered'];

/** True when the wire value is a delivery state this build recognises. */
export function isKnownDeliveryState (state) {
  return DELIVERY_STATES.indexOf(String(state || '').toLowerCase()) !== -1;
}

/**
 * The single judgement: which of the four states one recipient row is in.
 *
 * Order is significant and is strongest-first. A worker who confirmed AND was also hand-delivered is
 * CONFIRMED — the stronger, worker-attested fact wins, and the weaker one is not worth demoting it
 * to. The reverse order would let a manager's own note mask the worker's confirmation.
 *
 * `deliveryState` is never consulted. It describes the send; these three timestamps describe people.
 */
export function attestationOf (row) {
  const source = row || {};
  if (source.acknowledgedAtUtc) { return ATTEST_CONFIRMED; }
  if (source.seenAtUtc) { return ATTEST_OPENED; }
  if (source.manuallyDeliveredAtUtc) { return ATTEST_BY_HAND; }
  return ATTEST_NONE;
}

/**
 * The set of publication ids that some LATER publication in the same list has replaced.
 *
 * Each publication names only its predecessor (`supersedesPublicationId`), so the successor
 * relationship has to be inverted across the whole list. That is sound here for one reason worth
 * writing down: endpoint 21 returns EVERY publication for the store in one unpaged array. If it ever
 * grows a page cursor this derivation starts silently under-reporting — a superseded publication on
 * page two would read as current — so the invariant it depends on is named rather than assumed.
 */
export function supersededIds (publications) {
  const ids = {};
  (Array.isArray(publications) ? publications : []).forEach(p => {
    const predecessor = p && p.supersedesPublicationId;
    if (predecessor) { ids[predecessor] = true; }
  });
  return ids;
}

/** One wire publication -> one row the history list can render. */
export function decoratePublication (publication, superseded) {
  const source = publication || {};
  const id = source.schedulePublicationId || null;
  // ONLY WHAT A SURFACE READS. `noticeLeadDays` and `cost` are absent rather than present-and-null,
  // and `contentHash`/`scheduleRevisionId` are absent rather than carried on the chance somebody
  // wants them: this lane exists because two capabilities were advertised and reached by nobody, and
  // a decorated row that offers fields no caller reads is the same defect one size down. The two the
  // history endpoint cannot vouch for are explained in the module header, which is where a fact
  // about the wire belongs — not as a key on an object, where `noticeLeadDays: null` would read as a
  // measured absence and `cost: null` as a free schedule.
  return {
    id,
    number: typeof source.publicationNumber === 'number' ? source.publicationNumber : null,
    // Derived across the list, never read off the row — see `supersededIds`.
    superseded: !!(id && superseded && superseded[id]),
    // C4: the publish transaction froze who caused it. Carried through verbatim; the page shows it
    // rather than a generic "system", because a publication nobody is named for is not evidence.
    publishedBy: source.publishedByActorReference || null,
    publishedAtUtc: source.publishedAtUtc || null,
    rangeStartUtc: source.rangeStartUtc || null,
    rangeEndUtc: source.rangeEndUtc || null,
    // How many recipient rows the publish transaction wrote. The denominator, and the number the
    // recipients list is checked against.
    addressed: typeof source.recipientCount === 'number' ? source.recipientCount : null
  };
}

/**
 * The publication history, in the shape the list renders.
 *
 * `known: false` is a read that did not answer. It is a different structure from an answered store
 * with no publications, because "we could not read the history" and "this store has never published"
 * are opposite facts and a surface that renders them identically is lying about one of them.
 *
 * Order is preserved exactly as the backend sent it. It sorts published-desc, then revision-desc,
 * then publication-number-desc precisely so a same-tick republish puts the successor first, and
 * re-sorting here would throw away a guarantee the server went out of its way to make.
 */
export function listPublications (publications) {
  if (publications === RECEIPTS_UNKNOWN || publications === null || publications === undefined) {
    return { known: false, rows: [], empty: false };
  }
  const list = Array.isArray(publications) ? publications : [];
  const superseded = supersededIds(list);
  return {
    known: true,
    rows: list.map(p => decoratePublication(p, superseded)),
    empty: list.length === 0
  };
}

/** One wire recipient -> one row the roster renders. */
export function decorateRecipient (row) {
  const source = row || {};
  return {
    id: source.publicationRecipientId || null,
    staffMemberId: source.staffMemberId || null,
    // The backend joins the person to get this. Null rather than a placeholder when it is missing:
    // the roster says "an unnamed recipient", which is honest, where "Unknown" invites the reader to
    // believe there is a worker called Unknown.
    staffLabel: source.staffDisplayName || null,
    // Whether this worker had claimed a login when the publication was written. A worker who never
    // claimed one cannot confirm from a screen, so a `none` against them is a different fact from a
    // `none` against somebody who could have pressed the button and did not.
    claimed: !!source.claimedByApplicationUserId,
    channel: source.channel || null,
    deliveryState: source.deliveryState || null,
    deliveryStateKnown: isKnownDeliveryState(source.deliveryState),
    attestation: attestationOf(source),
    seenAtUtc: source.seenAtUtc || null,
    acknowledgedAtUtc: source.acknowledgedAtUtc || null,
    manuallyDeliveredAtUtc: source.manuallyDeliveredAtUtc || null,
    createdAtUtc: source.createdAtUtc || null
  };
}

/**
 * The recipients of one publication, bucketed by who attested what.
 *
 * `addressed` is the history row's `recipientCount` — how many recipient rows the publish wrote.
 * `listed` is how many this read named. They should be equal; when they are not, `shortBy` is the
 * number of workers the publication was addressed to that this list cannot name, and the panel says
 * so. The recipients query inner-joins staff member and person, so a recipient whose staff member is
 * gone simply vanishes from the result — and a roster quietly one name short, presented as the
 * answer to "who was told", is the precise failure this surface exists to refuse.
 *
 * No combined "reached" figure is returned. See the module header for why there cannot be one.
 */
export function summariseRecipients (rows, addressed) {
  if (rows === RECEIPTS_UNKNOWN || rows === null || rows === undefined) {
    return {
      known: false,
      confirmed: [],
      opened: [],
      byHand: [],
      noReceipt: [],
      addressed: typeof addressed === 'number' ? addressed : null,
      listed: null,
      shortBy: null,
      empty: false
    };
  }

  const list = (Array.isArray(rows) ? rows : []).map(decorateRecipient);
  const addressedCount = typeof addressed === 'number' ? addressed : null;
  // Only a positive difference is a gap. A list LONGER than the count is not "minus two missing"; it
  // is a contradiction between two reads, and `shortBy` stays 0 while the two numbers remain on
  // screen for whoever has to explain it.
  const shortBy = addressedCount === null ? null : Math.max(0, addressedCount - list.length);

  return {
    known: true,
    confirmed: list.filter(r => r.attestation === ATTEST_CONFIRMED),
    opened: list.filter(r => r.attestation === ATTEST_OPENED),
    byHand: list.filter(r => r.attestation === ATTEST_BY_HAND),
    noReceipt: list.filter(r => r.attestation === ATTEST_NONE),
    addressed: addressedCount,
    listed: list.length,
    shortBy,
    empty: list.length === 0
  };
}

export default {
  listPublications,
  summariseRecipients,
  decoratePublication,
  decorateRecipient,
  attestationOf,
  supersededIds,
  isKnownDeliveryState,
  RECEIPTS_UNKNOWN,
  ATTEST_CONFIRMED,
  ATTEST_OPENED,
  ATTEST_BY_HAND,
  ATTEST_NONE
};
