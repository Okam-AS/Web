// The venue's privacy queue, derived. No HTTP, no rendering, no Vue.
//
// WHY IT IS A MODULE AND NOT PAGE CODE — the same reason `send-gate.js` is one. Two of the three
// things this surface has to get right are judgements rather than layout:
//
//   • WHEN THE ANSWER IS DUE. The guest is told, in `gr_guest_request_deadline`, that «the venue has
//     one month to answer you. That follows from GDPR article 12.» Nothing in the wire carries that
//     date — `GrowthPrivacyRequestListItem` reports `receivedAt` and nothing else about time — so the
//     deadline the guest was promised exists only if something derives it. That is `dueAt` below, and
//     it is the whole reason this queue is more than a table.
//   • WHETHER A RESOLUTION MAY BE SENT AT ALL. `GrowthPrivacyRequestService.ResolveAsync` refuses an
//     outcome that is not one of the two terminal states (`growth.invalid_resolution`) and a rejection
//     with no reason (`growth.reason_required`). Both are re-asserted here so the page refuses before
//     the write instead of discovering it — a resolution is irreversible, and «try it and see» is not
//     an acceptable way to find out that a required field was blank.
//
// WHAT IT WILL NOT DO. It does not decide anything the server has not said. A list that did not
// answer is UNKNOWN and never an empty queue; a request with no `receivedAt` has no deadline rather
// than a deadline of today; and nothing here claims an address was destroyed — see `noticeDelivery`.

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

/**
 * GDPR art. 12(3): «without undue delay and in any event within one month of receipt of the request».
 *
 * ONE CALENDAR MONTH, not thirty days. Reg. (EEC, Euratom) 1182/71 art. 3(2)(c) — the counting rules
 * the GDPR's periods run on — puts a period expressed in months at the same day-number of the last
 * month, and where that day does not exist, on that month's LAST day. So 31 January + one month is
 * 28 February, not 3 March, and `addOneMonth` clamps rather than letting the Date rollover invent two
 * extra days of headroom against a statutory deadline.
 */
export const RESPONSE_WINDOW_MONTHS = 1;

function toDate (value) {
  if (!value) { return null; }
  const parsed = value instanceof Date ? value : new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** One calendar month later, clamped to the last day of the target month (see RESPONSE_WINDOW_MONTHS). */
function addOneMonth (date) {
  const month = date.getUTCMonth();
  const shifted = new Date(Date.UTC(
    date.getUTCFullYear(), month + 1, date.getUTCDate(),
    date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()
  ));
  // The day-number did not exist in the target month and rolled into the next one. Step back to the
  // last day of the month that was meant: `setUTCDate(0)` is the previous month's final day.
  if (shifted.getUTCMonth() !== (month + 1) % 12) { shifted.setUTCDate(0); }
  return shifted;
}

/**
 * The date the answer is due, or `null` when the request carries no readable receipt time.
 *
 * Null and never "now": a deadline invented from a timestamp we could not read would be printed with
 * the same confidence as a real one, and the one the guest was promised is the only one that counts.
 */
export function dueAt (receivedAt) {
  const received = toDate(receivedAt);
  return received ? addOneMonth(received) : null;
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
  const received = toDate(item.receivedAt);
  const due = received ? addOneMonth(received) : null;
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
    receivedAt: received,
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
 * @param now  the clock, injected so the deadline arithmetic is testable rather than ambient
 */
export function readQueue (body, now) {
  if (!body || !Array.isArray(body.requests)) {
    // Counts are null, not zero. «Nobody has asked» and «we could not find out» are different things
    // to tell a venue that is under a one-month clock, and only one of them means do nothing.
    return { state: QUEUE_UNKNOWN, storeId: null, open: [], resolved: [], total: null, overdueCount: null };
  }

  const at = toDate(now) || new Date();
  const rows = body.requests.filter(Boolean).map(item => readRow(item, at));
  const open = rows.filter(row => row.isOpen);
  const resolved = rows.filter(row => !row.isOpen);

  return {
    state: QUEUE_READ,
    storeId: body.storeId === undefined ? null : body.storeId,
    // OPEN IS SORTED BY DEADLINE, ASCENDING — deliberately NOT the order the wire arrived in. The
    // server orders by `receivedAt` descending, which is the right default for a log and exactly
    // wrong for a work queue: it puts the request with the most time left at the top and buries the
    // one about to run out of month. A row with no readable receipt time sorts last rather than
    // first, because an unknown deadline is not an urgent one.
    open: open.slice().sort((a, b) => {
      if (a.dueAt && b.dueAt) { return a.dueAt.getTime() - b.dueAt.getTime(); }
      if (a.dueAt) { return -1; }
      if (b.dueAt) { return 1; }
      return 0;
    }),
    // Resolved keeps the server's newest-first order: it is a record, and the most recent decision is
    // the one somebody is usually looking for.
    resolved,
    total: rows.length,
    overdueCount: open.filter(row => row.isOverdue).length
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
