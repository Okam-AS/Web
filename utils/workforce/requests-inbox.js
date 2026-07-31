// The manager decision inbox, as logic: the filter vocabulary, the published-week collision probe,
// the open-shift contest grouping, and how a refused decision is read.
//
// Everything here is pure. The page does the HTTP and the rendering; this file decides what the rows
// MEAN, so the three claims the surface must not get wrong — "this collides with a published week",
// "exactly one of these people can get the shift", "somebody else already decided this" — are
// testable without a browser.

import { parseApiInstant, weekRange } from '~/utils/workforce/week-range';

// --- the filter vocabulary ---------------------------------------------------------------------
//
// These are the backend's own tokens (`WorkforceRequestKinds`, and the `AcceptedStates` list in
// `WorkforceRequestsService`). They are declared here rather than typed at the call site because an
// unrecognised token is a 400, not an empty list: a typo would take the whole inbox down rather than
// quietly showing too much, and there is no reason for the page to be able to produce one.

export const KIND_TIME_OFF = 'time-off';
export const KIND_AVAILABILITY_EXCEPTION = 'availability-exception';
export const KIND_EXCHANGE = 'exchange';
export const KIND_OPEN_SHIFT_REQUEST = 'open-shift-request';

/** The four families, in the order the inbox offers them as filters. */
export const KINDS = [KIND_TIME_OFF, KIND_EXCHANGE, KIND_OPEN_SHIFT_REQUEST, KIND_AVAILABILITY_EXCEPTION];

/**
 * The server's default projection: everything still awaiting a manager. Sent as an ABSENT `state`
 * parameter — `in-flight` is the token the response echoes back, not one the query accepts.
 */
export const STATE_IN_FLIGHT = 'in-flight';
/** The decided history as well. The one other projection this surface offers. */
export const STATE_ALL = 'all';

/** The `?state=` value for a screen state. `in-flight` is the absence of the parameter. */
export function stateParam (state) {
  return state === STATE_ALL ? STATE_ALL : null;
}

/** The `$i` key for a kind badge. */
export function kindLabelKey (kind) {
  switch (kind) {
  case KIND_TIME_OFF: return 'wfq_kind_time_off';
  case KIND_EXCHANGE: return 'wfq_kind_exchange';
  case KIND_OPEN_SHIFT_REQUEST: return 'wfq_kind_open_shift';
  case KIND_AVAILABILITY_EXCEPTION: return 'wfq_kind_availability';
  default: return 'wfq_kind_unknown';
  }
}

/** The `$i` key for the kind-agnostic state token every family sets. */
export function stateLabelKey (state) {
  switch (state) {
  case 'submitted': return 'wfq_state_submitted';
  case 'under-review': return 'wfq_state_under_review';
  case 'approved': return 'wfq_state_approved';
  case 'rejected': return 'wfq_state_rejected';
  case 'withdrawn': return 'wfq_state_withdrawn';
  case 'expired': return 'wfq_state_expired';
  case 'open': return 'wfq_state_open';
  case 'request-submitted': return 'wfq_state_request_submitted';
  case 'awarded': return 'wfq_state_awarded';
  case 'not-awarded': return 'wfq_state_not_awarded';
  case 'informational': return 'wfq_state_informational';
  default: return 'wfq_state_unknown';
  }
}

// --- what a manager may actually do with a row ---------------------------------------------------

/** Why a row carries no decision. Each is a different sentence; none of them is a disabled button. */
export const BLOCK_NONE = 'none';
/** The server says this row is not decidable — an availability exception, or an already-closed row. */
export const BLOCK_NOT_DECIDABLE = 'not-decidable';
/** Decidable, but the row carried no revision, so `If-Match` cannot be formed and #24 is a 400. */
export const BLOCK_NO_REVISION = 'no-revision';

/**
 * Whether the manager may decide this row, and if not, which of the two reasons applies.
 *
 * The revision check is not defensive noise: the token is null wherever the backend has no
 * rowversion (SQLite), and a decision without `If-Match` is refused with a plain 400 before it
 * starts. Offering a button that is guaranteed to fail is worse than offering none — the same rule
 * the roster page applies to `PATCH /staff/{id}`.
 */
export function decisionBlock (item) {
  if (!item || !item.isDecidable) { return BLOCK_NOT_DECIDABLE; }
  return item.revision ? BLOCK_NONE : BLOCK_NO_REVISION;
}

// --- the published-week collision probe -----------------------------------------------------------
//
// WHY THIS EXISTS. Approving leave that overlaps an already-published shift does NOT rewrite the
// publication (`WorkforceRequestsService.DecideAsync`: "a conflicting approval records the affected
// revision and leaves the published schedule untouched"). The manager therefore needs to know BEFORE
// deciding that the approval will leave a rostered shift standing with nobody able to work it —
// after the fact the response only reports `firstAffectedScheduleRevisionId`, which is the same news
// arriving too late to change the answer.
//
// The probe is `GET /schedules?from&to&view=published`, one call per ISO WEEK. Not one call per
// request span: that read resolves a range to ONE revision — the latest-starting one that overlaps —
// and returns that revision's whole set, so a multi-week range answers with one week and silently
// omits the rest. Weeks are the unit the month grid already fetches in, for exactly this reason.

/** A leave longer than this is not probed: the read cost grows per week and the answer stops being a glance. */
export const MAX_PROBE_WEEKS = 6;

/** The probe answered and this leave overlaps at least one published shift for this person. */
export const COLLISION_PUBLISHED = 'published';
/** The probe answered and nothing published collides. */
export const COLLISION_NONE = 'none';
/** The probe did not answer (a failed week read, no zone, or a span past `MAX_PROBE_WEEKS`). */
export const COLLISION_UNKNOWN = 'unknown';

/**
 * The distinct ISO weeks the given rows touch, as `{ key, startUtc, endUtc }`, deduplicated.
 *
 * Deduplication is the point: an inbox where eight people ask for the same Easter week is two reads,
 * not sixteen. Rows that are not decidable time-off are skipped — an availability exception is
 * advisory and never collides with anything, and a decided request is not a decision to make.
 */
export function collisionProbeWeeks (items, timeZoneId) {
  if (!timeZoneId) { return []; }

  const seen = {};
  const weeks = [];
  for (const item of items || []) {
    for (const week of weeksForRequest(item, timeZoneId)) {
      if (seen[week.key]) { continue; }
      seen[week.key] = true;
      weeks.push(week);
    }
  }
  return weeks;
}

/**
 * The ISO weeks one request spans, or `[]` when it must not be probed.
 *
 * Exported so the row can ask the same question the fetcher asked: a row whose span exceeds
 * `MAX_PROBE_WEEKS` gets `[]` here and therefore `COLLISION_UNKNOWN` below, rather than a
 * false "nothing collides" derived from weeks nobody fetched.
 */
export function weeksForRequest (item, timeZoneId) {
  if (!timeZoneId || !item || item.kind !== KIND_TIME_OFF || !item.isDecidable) { return []; }

  const start = parseApiInstant(item.startsUtc);
  const end = parseApiInstant(item.endsUtc);
  if (!start || !end || end <= start) { return []; }

  const weeks = [];
  let cursor = weekRange(timeZoneId, start, 0);
  for (let i = 0; i < MAX_PROBE_WEEKS; i += 1) {
    weeks.push({ key: cursor.days[0].isoDate, startUtc: cursor.startUtc, endUtc: cursor.endUtc });
    if (cursor.endUtc >= end) { return weeks; }
    // Stepped from the week's own start rather than by adding 7×24h, so a DST week does not drift.
    cursor = weekRange(timeZoneId, cursor.startUtc, 1);
  }

  // The leave outran the cap. Answering with the weeks we WOULD have read would make the row claim a
  // clean bill of health for a period nobody looked at.
  return [];
}

/**
 * Whether an approval of this request would leave a published shift standing.
 *
 * `weeksByKey` maps a week key (from `collisionProbeWeeks`) to that week's `GET /schedules`
 * PUBLISHED body, or to null where the read failed. A missing or failed week is UNKNOWN for the
 * whole row — a partial answer here would be read as "checked, and clear".
 *
 * Returns `{ state, shifts }`. `shifts` is the overlapping published assignments, so the row can name
 * the days rather than only the verdict.
 */
export function publishedCollision (item, weeksByKey, timeZoneId) {
  const weeks = weeksForRequest(item, timeZoneId);
  if (!weeks.length) { return { state: COLLISION_UNKNOWN, shifts: [] }; }

  const start = parseApiInstant(item.startsUtc);
  const end = parseApiInstant(item.endsUtc);
  const shifts = [];
  for (const week of weeks) {
    const body = weeksByKey ? weeksByKey[week.key] : undefined;
    if (!body) { return { state: COLLISION_UNKNOWN, shifts: [] }; }

    for (const assignment of body.assignments || []) {
      if (!assignment || assignment.staffMemberId !== item.staffMemberId) { continue; }
      // Cancelled rows survive in a revision as tombstones; a cancelled shift collides with nothing.
      if (assignment.state === 'Cancelled') { continue; }

      const from = parseApiInstant(assignment.startsUtc);
      const to = parseApiInstant(assignment.endsUtc);
      if (!from || !to) { continue; }
      if (from < end && to > start) { shifts.push(assignment); }
    }
  }

  // Deduplicated: consecutive week reads can resolve to the same revision and return the same shift.
  const unique = [];
  const seen = {};
  for (const shift of shifts) {
    if (seen[shift.shiftAssignmentId]) { continue; }
    seen[shift.shiftAssignmentId] = true;
    unique.push(shift);
  }
  unique.sort((a, b) => String(a.startsUtc).localeCompare(String(b.startsUtc)));

  return { state: unique.length ? COLLISION_PUBLISHED : COLLISION_NONE, shifts: unique };
}

// --- the open-shift contest -----------------------------------------------------------------------

/**
 * Groups exchange and open-shift candidacies by the SHIFT they compete for.
 *
 * The one-award rule is enforced on the TARGET assignment, not on the exchange id: awarding one
 * candidacy closes every other live candidacy for the same target, "including candidacies filed under
 * a different ExchangeId by the find-or-create race" (`WorkforceShiftExchangeService.AwardAsync`).
 * Grouping on `exchangeId` would therefore draw two separate contests for one shift and let a manager
 * believe they were awarding two different things.
 *
 * Rows with no target (which the wire allows) are returned as their own single-member groups rather
 * than being folded into one bucket keyed on nothing.
 */
export function groupContests (items) {
  const groups = [];
  const byTarget = {};

  for (const item of items || []) {
    if (item.kind !== KIND_EXCHANGE && item.kind !== KIND_OPEN_SHIFT_REQUEST) { continue; }

    const target = item.targetShiftAssignmentId;
    if (!target) {
      groups.push({ key: 'request:' + item.requestId, targetShiftAssignmentId: null, items: [item] });
      continue;
    }

    if (!byTarget[target]) {
      byTarget[target] = { key: 'shift:' + target, targetShiftAssignmentId: target, items: [] };
      groups.push(byTarget[target]);
    }
    byTarget[target].items.push(item);
  }

  return groups;
}

/** How many of a contest's rows are still awaiting the award. One award closes all of them. */
export function liveCandidateCount (group) {
  return ((group && group.items) || []).filter(item => item.isDecidable).length;
}

/**
 * The whole inbox as ordered GROUPS: every contest as one block, every other request as a block of
 * one.
 *
 * The grouping is what makes the one-award rule visible. Two workers who asked for the same shift
 * eleven seconds apart would sit next to each other in the server's `createdAtUtc` order by luck
 * alone; a third who asked a week later would be pages away, and a manager awarding one of them would
 * never see that they had just closed somebody else's request. A block says it outright.
 *
 * Groups are ordered by their EARLIEST `createdAtUtc`, so a contest keeps the place its first
 * candidacy earned rather than jumping to the top when a late candidate joins.
 */
export function buildInboxGroups (items) {
  const groups = groupContests(items);

  for (const item of items || []) {
    if (item.kind === KIND_EXCHANGE || item.kind === KIND_OPEN_SHIFT_REQUEST) { continue; }
    groups.push({ key: 'request:' + item.requestId, targetShiftAssignmentId: null, items: [item] });
  }

  for (const group of groups) {
    group.createdAtUtc = group.items
      .map(item => String(item.createdAtUtc || ''))
      .sort()[0] || '';
    group.isContest = !!group.targetShiftAssignmentId && group.items.length > 1;
  }

  return groups.sort((a, b) => a.createdAtUtc.localeCompare(b.createdAtUtc) || a.key.localeCompare(b.key));
}

// --- how a refused decision is read ----------------------------------------------------------------

/** The request moved on before the decision landed — withdrawn, or decided by another manager. */
export const OUTCOME_ALREADY_DECIDED = 'already-decided';
/** The `If-Match` no longer matches: the row changed while the manager had it open. */
export const OUTCOME_STALE = 'stale';
/** The target shift went to another candidate first (the one-award backstop). */
export const OUTCOME_AWARD_TAKEN = 'award-taken';
/** The award revalidation refused on its merits (role, overlap, ended engagement, unpublished shift). */
export const OUTCOME_NOT_AWARDABLE = 'not-awardable';
/** The caller lacks WorkforceManager in this store. */
export const OUTCOME_FORBIDDEN = 'forbidden';
/** The request is absent, or belongs to a store this caller may not see. */
export const OUTCOME_GONE = 'gone';
/** The module or the write stage is switched off for this store. */
export const OUTCOME_DISABLED = 'disabled';
/** Anything unmodelled — a genuine failure. */
export const OUTCOME_ERROR = 'error';

const CODE_NOT_DECIDABLE = 'workforce.request-not-decidable';
const CODE_STALE = 'workforce.stale-revision';
const CODE_AWARD_TAKEN = 'workforce.award-taken';
const CODE_NOT_AWARDABLE = 'workforce.exchange-not-awardable';
const CODE_FORBIDDEN = 'workforce.forbidden';
const CODE_NOT_FOUND = 'workforce.not-found';
const CODE_MODULE_DISABLED = 'workforce.module-disabled';
const CODE_FLAG_DISABLED = 'workforce.flag-disabled-read-only';

/**
 * Classifies a refused decision, keyed on the stable `code` extension and never on the prose detail.
 *
 * `OUTCOME_ALREADY_DECIDED` and `OUTCOME_STALE` are BOTH 409s and are deliberately kept apart. They
 * are different events with different remedies: the first means the answer already exists and this
 * manager has nothing left to decide, the second means the row moved underneath a decision that is
 * still open. Collapsing them into one "conflict" would tell a manager to re-read a list in the case
 * where re-reading changes nothing, and would hide the second manager in the case where it does.
 *
 * An unknown 409 stays `OUTCOME_ERROR`. Guessing at a conflict family from the bare status is how a
 * real refusal gets swallowed.
 */
export function classifyDecisionFailure (error) {
  if (!error) { return OUTCOME_ERROR; }

  switch (error.code) {
  case CODE_NOT_DECIDABLE: return OUTCOME_ALREADY_DECIDED;
  case CODE_STALE: return OUTCOME_STALE;
  case CODE_AWARD_TAKEN: return OUTCOME_AWARD_TAKEN;
  case CODE_NOT_AWARDABLE: return OUTCOME_NOT_AWARDABLE;
  case CODE_FORBIDDEN: return OUTCOME_FORBIDDEN;
  case CODE_NOT_FOUND: return OUTCOME_GONE;
  case CODE_MODULE_DISABLED:
  case CODE_FLAG_DISABLED: return OUTCOME_DISABLED;
  }

  // The typed code is the contract; the status is a usable second source only where it carries no
  // ambiguity, for the case where an intermediary strips the problem body.
  if (error.status === 404) { return OUTCOME_GONE; }
  if (error.status === 403) { return OUTCOME_FORBIDDEN; }

  return OUTCOME_ERROR;
}

/**
 * True when the outcome means the list on screen is known to be stale.
 *
 * `OUTCOME_STALE` is deliberately ABSENT. Re-reading is the manager's own act there — the same rule
 * the schedule page keeps for a refused batch: an automatic refetch would take the other manager's
 * version as the base for a decision written against the version they replaced, and would clear the
 * note the manager had typed. The stale block offers a button instead.
 */
export function requiresRefresh (outcome) {
  return outcome === OUTCOME_ALREADY_DECIDED ||
    outcome === OUTCOME_AWARD_TAKEN ||
    outcome === OUTCOME_GONE;
}

/** The `$i` key for the sentence an outcome earns. */
export function outcomeMessageKey (outcome) {
  switch (outcome) {
  case OUTCOME_ALREADY_DECIDED: return 'wfq_outcome_already_decided';
  case OUTCOME_STALE: return 'wfq_outcome_stale';
  case OUTCOME_AWARD_TAKEN: return 'wfq_outcome_award_taken';
  case OUTCOME_NOT_AWARDABLE: return 'wfq_outcome_not_awardable';
  case OUTCOME_FORBIDDEN: return 'wfq_outcome_forbidden';
  case OUTCOME_GONE: return 'wfq_outcome_gone';
  case OUTCOME_DISABLED: return 'wfq_outcome_disabled';
  default: return 'wfq_outcome_error';
  }
}

// --- what a committed decision says about the published schedule -----------------------------------

/**
 * Reads a #24 response for the ONE fact the manager must not be allowed to miss: the decision landed,
 * and a published schedule now disagrees with it.
 *
 * Both branches of #24 report it, with different field names because they are different aggregates:
 *
 *  • a time-off approval sets `firstAffectedScheduleRevisionId` — the revision holding the earliest
 *    published shift the leave overlaps — and leaves that publication exactly as it was;
 *  • an award sets `affectedScheduleRevisionId` and `requiresSuccessorRevision` — the target sits in
 *    a published revision, whose assignment rows are immutable, so the roster change is real but is
 *    applied by the scheduler publishing a successor.
 *
 * In both cases the SCHEDULE DID NOT CHANGE. Reporting the decision without this is the one dishonest
 * thing this surface could do, because the manager would reasonably read "approved" as "handled".
 */
export function successorNeed (response) {
  if (!response) { return null; }

  if (response.requiresSuccessorRevision) {
    return { kind: 'award', revisionId: response.affectedScheduleRevisionId || null };
  }
  if (response.firstAffectedScheduleRevisionId) {
    return { kind: 'time-off', revisionId: response.firstAffectedScheduleRevisionId };
  }
  return null;
}
