// The venue's privacy queue, read. No HTTP, no rendering, no Vue.
//
// WHAT IT IS FOR. Two things this surface has to get right are judgements rather than layout:
//
//   • WHAT THE SERVER'S ANSWER MEANS. A list that did not answer is UNKNOWN and never an empty queue;
//     an unreadable state is not an open request; `noticeDelivery: null` is not a fourth state. Those
//     readings are one place so the page cannot hold a second opinion about them.
//   • WHETHER A RESOLUTION MAY BE SENT AT ALL. `GrowthPrivacyRequestService.ResolveAsync` refuses an
//     outcome that is not one of the two terminal states (`growth.invalid_resolution`) and a rejection
//     with no reason (`growth.reason_required`). Both are re-asserted here so the page refuses before
//     the write instead of discovering it — a resolution is irreversible, and «try it and see» is not
//     an acceptable way to find out that a required field was blank.
//
// WHAT IT NO LONGER DOES, AND WHY THAT IS THE POINT. It does not work out when the answer is due, and
// it does not decide which request is the pressing one. Both are properties of the OBLIGATION rather
// than of this page: the guest is told, in `gr_guest_request_deadline`, that «the venue has one month
// to answer you. That follows from GDPR article 12», and the date that promise resolves to is what
// the venue is legally held to. So the server computes it once — `GrowthPrivacyObligation.DueAt`, one
// calendar month from receipt with the Reg. 1182/71 art. 3(2)(c) end-of-month clamp — and sends it as
// `dueAt`, already ordered by urgency. This module reads both and re-derives neither. A deadline
// recomputed here would be a second answer to a legal question, free to drift from the first the
// moment either side changed, and with exactly one client today nothing would notice that it had.
//
// WHAT IT WILL NOT DO. It does not decide anything the server has not said. A request whose `dueAt`
// cannot be read has no deadline rather than a deadline of today, and nothing here claims an address
// was destroyed — see `noticeDelivery`.

/** The list read has not answered. NOT "this store has no privacy requests". */
export const QUEUE_UNKNOWN = 'unknown';
/** The list read answered, and `open`/`resolved` are what it said. */
export const QUEUE_READ = 'read';

/** `GrowthPrivacyRequestState` — the two non-terminal members. A request in either still owes an answer. */
export const OPEN_STATES = ['Received', 'InProgress'];
/** `GrowthPrivacyRequestState` — the two terminal members. */
export const RESOLVED_STATES = ['Fulfilled', 'RejectedWithReason'];

/** The two outcomes `POST .../resolution` accepts. Anything else is `growth.invalid_resolution`. */
export const OUTCOME_FULFILLED = 'Fulfilled';
export const OUTCOME_REJECTED = 'RejectedWithReason';

/** `GrowthPrivacyRequestType`. Access is GDPR art. 15, Erasure is art. 17. */
export const TYPE_ACCESS = 'Access';
export const TYPE_ERASURE = 'Erasure';

// The refusals this module raises, spelled with the backend's OWN codes rather than local strings.
// One vocabulary means the page's message map covers a refusal whether it was caught here or came
// back over the wire, and a code that drifted on the server would surface as an unmapped message
// rather than as two screens quietly disagreeing about the same rule.
export const REFUSAL_INVALID_OUTCOME = 'growth.invalid_resolution';
export const REFUSAL_REASON_REQUIRED = 'growth.reason_required';

function toDate (value) {
  if (!value) { return null; }
  const parsed = value instanceof Date ? value : new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * One wire item as the queue renders it.
 *
 * `noticeDelivery` is passed through UNTOUCHED, including `null`. The DTO says so explicitly: null is
 * not a fourth state, it means no receipt exists — an open request, or one resolved before the field
 * did — and «no decision has been taken» and «no notice was owed» are different facts an operator
 * acts on differently. Nothing here folds one into the other.
 *
 * Nothing here reports DESTRUCTION either, and that is deliberate rather than an omission: a
 * fulfilled erasure may have shredded the address or DEFERRED it because another controller still
 * holds live consent for the same contact point (`GrowthErasureShred.ShredOrDeferAsync`), and the
 * list DTO carries no field that tells the two apart. A queue that printed «the address was deleted»
 * would be claiming, from a response that does not contain it, the one thing art. 17 is about.
 */
function readRow (item, now) {
  // THE SERVER'S DATE, PARSED — never recomputed from `receivedAt`. `GrowthPrivacyRequestListItem`
  // carries `dueAt`, and it is the deadline the venue is held to; there is deliberately no local
  // fallback for a response that omits it, because a fallback is precisely the divergence this
  // module gave up its own arithmetic to remove. A row with no readable deadline says so.
  const due = toDate(item.dueAt);
  const state = item.state || null;
  const isOpen = OPEN_STATES.includes(state);

  return {
    requestId: item.requestId === undefined ? null : item.requestId,
    // The MASKED contact — its internal id, never an address (`GrowthPrivacyRequestListItem`, spec §5
    // endpoint 20). It is also the only place in the product this id is discoverable, which is what
    // makes the PowerUser consent-timeline read (#9) reachable at all; see the page for why this
    // surface stops at printing it.
    contactPointId: item.contactPointId === undefined ? null : item.contactPointId,
    type: item.requestType || null,
    state,
    isOpen,
    receivedAt: toDate(item.receivedAt),
    resolvedAt: toDate(item.resolvedAt),
    dueAt: due,
    // WHOLE days, truncated TOWARDS ZERO, and negative once the month has run out. Null when there
    // is no deadline to count to.
    //
    // Truncation rather than a floor, because a floor is only conservative in one direction: with
    // 26 days 22 hours left it says 26 (right — a whole day is not left until it is), but 12 days 2
    // hours past the deadline it says 13, and the page would tell an operator the answer was a day
    // later than it was. Trunc reads the same both ways: N whole days remain, or N whole days have
    // passed. Neither number is ever generous about time the venue does not have.
    // `+ 0` normalises the negative zero `Math.trunc` returns for a deadline that ran out a few
    // hours ago. `-0 === 0` is true, so nothing branches wrongly on it, but it prints as "-0" and
    // survives `Object.is`, which is exactly the kind of value that makes a later reader distrust
    // the whole column.
    daysLeft: due ? Math.trunc((due.getTime() - now.getTime()) / DAY_MS) + 0 : null,
    // OPEN requests only. A resolved one cannot become overdue afterwards, and marking it so would
    // put a red row in front of an operator who has nothing left to do about it.
    isOverdue: !!(isOpen && due && now.getTime() > due.getTime()),
    noticeDelivery: item.noticeDelivery === undefined ? null : item.noticeDelivery
  };
}

/**
 * The wire list -> the two queues the venue works from.
 *
 * @param body `GrowthPrivacyRequestListResponse`, or null/undefined for a read that did not answer
 * @param now  the clock, injected so the countdown is testable rather than ambient
 */
export function readQueue (body, now) {
  if (!body || !Array.isArray(body.requests)) {
    // Counts are null, not zero. «Nobody has asked» and «we could not find out» are different things
    // to tell a venue that is under a one-month clock, and only one of them means do nothing.
    return { state: QUEUE_UNKNOWN, storeId: null, open: [], resolved: [], total: null, overdueCount: null };
  }

  const at = toDate(now) || new Date();
  const rows = body.requests.filter(Boolean).map(item => readRow(item, at));

  return {
    state: QUEUE_READ,
    storeId: body.storeId === undefined ? null : body.storeId,
    // SPLIT ONLY — the wire's order is kept, and this page chooses none of its own. `ListAsync`
    // returns every request that still owes an answer first, soonest `dueAt` first, then the settled
    // ones newest-received first; `filter` is stable, so both groups come out of here in the order
    // the server put them in. Which obligation is the pressing one is the server's ruling for the
    // same reason the deadline is: a work queue re-sorted per client is a work queue that can rank
    // the same two legal duties differently on two screens.
    open: rows.filter(row => row.isOpen),
    resolved: rows.filter(row => !row.isOpen),
    total: rows.length,
    overdueCount: rows.filter(row => row.isOpen && row.isOverdue).length
  };
}

/**
 * The refusal a resolution would earn, or `null` if it may be sent.
 *
 * Mirrors `GrowthPrivacyRequestService.ResolveAsync` rather than guessing at it, and returns the
 * SERVER's code so the caller has one vocabulary for both. It is asserted at the call site as well as
 * in a disabled button: a disabled attribute is a rendering, and this write destroys an address.
 */
export function resolveRefusal (resolution) {
  const outcome = resolution && resolution.outcome;
  if (outcome !== OUTCOME_FULFILLED && outcome !== OUTCOME_REJECTED) {
    return REFUSAL_INVALID_OUTCOME;
  }
  if (outcome === OUTCOME_REJECTED && !String((resolution && resolution.reason) || '').trim()) {
    return REFUSAL_REASON_REQUIRED;
  }
  return null;
}
