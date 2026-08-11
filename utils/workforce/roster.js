// The roster's reading of the Workforce identity model — everything the page decides, decided here.
//
// THE MODEL, AND WHY THE UI MUST NOT FLATTEN IT.
//
//   WorkforcePerson        one human. NOT store-scoped. Chain-wide identity, an optional
//                          ApplicationUser link claimed once through a one-use invitation, and a
//                          lifecycle of Invited -> Claimed -> Archived.
//   WorkforceStaffMember   the ENGAGEMENT: that person's employment at ONE store, under ONE legal
//                          employer, carrying its OWN capability grants and its own active window.
//   WorkforceRole          a job role / station (Kokk, Bar, Vakt). Store-scoped, effective-dated,
//                          and deliberately AUTHORIZATION-FREE — it grants nothing.
//   WorkforceEmploymentTerm  effective-dated contract facts on an engagement: contract size,
//                          employment category, pay code, cost centre, and wage behind a separate
//                          capability.
//
// One person, different powers per venue. The same human can be a scheduler here and a plain
// worker there, and the two engagements are two rows that share nothing but the person id. This is
// where Okam differs from Planday, which conflates a staff group with an access level — so nothing
// in this file may collapse a person and an engagement into "a user with a role", and nothing may
// let a ROLE read as a permission. The two lists are computed separately and named separately on
// purpose.
//
// WHAT THE UNIQUE INDEX ACTUALLY FORBIDS. `UX_WorkforceStaffMembers_ActiveEngagement` is
// UNIQUE (WorkforcePersonId, LegalEmployerId) WHERE IsActive = 1. StoreId is NOT in it. So the rule
// is one active engagement per (person, legal employer) ACROSS THE WHOLE ESTATE, and two
// simultaneous engagements are possible only when the two stores' legal employers differ. Half of
// that is checkable here and half is not: a conflict inside this store is visible in the roster and
// is refused before the call; a conflict in a store the caller cannot see is invisible by
// construction and comes back as the opaque `workforce.hidden-engagement-conflict`, which names no
// store, no engagement and no time. `activeEngagementConflict` therefore says what it checked, and
// the caller must not present its "no conflict" as a guarantee.

import { toUtcRangeParam } from '~/utils/workforce/api-client';
import { hasCapability } from '~/utils/workforce-me/memberships';
import { parseApiInstant, zonedMidnightToUtc } from '~/utils/workforce/week-range';

// The roster's three states, the same distinction the week grid draws with unknown/no-plan/counted.
// `unknown` and `counted` carry the identical strings deliberately; the middle one differs because
// the roster's positive zero is a different sentence — "this store has no staff", not "no plan".
//
// The whole point is that a read which FAILED must never render as an empty roster. "We could not
// load the staff" and "this store has no staff" are different claims and the second one is the
// dangerous one to make wrongly: it invites a manager to add someone who is already there.
export const ROSTER_UNKNOWN = 'unknown';
export const ROSTER_EMPTY = 'empty';
export const ROSTER_COUNTED = 'counted';

/**
 * The four capability grants, in bit order (Enums/Workforce/WorkforceCapability.cs).
 *
 * These are CAPABILITIES, not roles. They are the only thing that authorises anything in this
 * module: `WorkforceAuthorizationService` resolves them ONLY from the engagement's grant bits and
 * can neither read StoreAdmin nor be satisfied by PowerUser. A job role grants nothing at all.
 */
export const CAPABILITY_SELF = 'WorkforceSelf';
export const CAPABILITY_SCHEDULER = 'WorkforceScheduler';
export const CAPABILITY_MANAGER = 'WorkforceManager';
export const CAPABILITY_PAYROLL = 'WorkforcePayrollApprover';

export const CAPABILITIES = [
  CAPABILITY_SELF,
  CAPABILITY_SCHEDULER,
  CAPABILITY_MANAGER,
  CAPABILITY_PAYROLL
];

/**
 * The capability grants on one engagement, as a list of the known grants it holds.
 *
 * TWO WIRE SHAPES, ONE PARSER. This surface (`GET /staff`, `GET /staff/{id}`, `GET /context`)
 * returns a DECOMPOSED list — `["WorkforceSelf","WorkforceManager"]` — because the service maps the
 * flags through `WorkforceContractSupport.ToCapabilityList`. The self-service surface
 * (`GET /me/staff-memberships`) returns the raw [Flags] value, which Newtonsoft renders as the
 * comma-separated `"WorkforceSelf, WorkforceManager"`. Rather than grow a second parser next to the
 * one `utils/workforce-me/memberships.js` already has, every shape goes through `hasCapability`,
 * which handles the array, the comma string and the numeric bitmask alike.
 *
 * Getting this wrong fails silently and totally — every engagement reads as un-capable and the page
 * shows a roster of people who apparently can do nothing — which is exactly why it is not
 * reimplemented here.
 *
 * Returns null for a null/undefined grant field: not knowing what someone may do is not the same
 * as knowing they may do nothing.
 */
export function capabilitySet (grants) {
  if (grants === null || grants === undefined) { return null; }
  return CAPABILITIES.filter(capability => hasCapability(grants, capability));
}

/** True when the caller's own context capabilities include `capability`. Null context = false. */
export function callerHas (capabilities, capability) {
  return !!capabilities && hasCapability(capabilities, capability);
}

/**
 * One roster row, per ENGAGEMENT (not per person). Two rows may share a `workforcePersonId`: the
 * same human re-engaged after an earlier engagement ended, or engaged twice under different legal
 * employers. `engagementCount` says how many rows THIS STORE holds for that person, and it is
 * deliberately a same-store count — how many engagements the person holds elsewhere is not
 * knowable here and must never be implied.
 */
function toRow (summary, personCounts) {
  return {
    staffMemberId: summary.staffMemberId,
    workforcePersonId: summary.workforcePersonId,
    displayName: summary.displayName || null,
    employmentNumber: summary.employmentNumber || null,
    capabilities: capabilitySet(summary.capabilities),
    isActive: summary.isActive === true,
    // Column-loaded stamps serialise bare; `parseApiInstant` reads a bare string as UTC. `new Date`
    // would read it as browser-local and move every date by the viewer's own offset — the defect
    // fixed in b65501c.
    activeFromUtc: parseApiInstant(summary.activeFromUtc),
    activeToUtc: parseApiInstant(summary.activeToUtc),
    legalEmployerId: summary.legalEmployerId || null,
    personState: summary.personState || null,
    engagementCount: personCounts[summary.workforcePersonId] || 1
  };
}

/**
 * The roster, as three distinguishable answers.
 *
 * `staff` is the `GET /staff` body, or null when the read did not answer. A null is UNKNOWN. An
 * empty array is the positive claim that this store has nobody. They are never merged.
 */
export function buildRoster (staff) {
  if (!Array.isArray(staff)) {
    return { state: ROSTER_UNKNOWN, rows: [], activeManagerCount: null };
  }

  const personCounts = staff.reduce((acc, s) => {
    acc[s.workforcePersonId] = (acc[s.workforcePersonId] || 0) + 1;
    return acc;
  }, {});

  const rows = staff.map(s => toRow(s, personCounts));

  return {
    state: rows.length ? ROSTER_COUNTED : ROSTER_EMPTY,
    rows,
    // Counted, not guessed: the number of ACTIVE engagements in this store that hold
    // WorkforceManager. See `wouldStrandStore`.
    activeManagerCount: rows.filter(r => r.isActive && r.capabilities && r.capabilities.includes(CAPABILITY_MANAGER)).length
  };
}

// The legal-employer list's three states, the same distinction the roster draws. `unknown` is a read
// that did not answer; `empty` is the positive claim that this store has no legal employer
// registered, which is what the add form turns into an offer to register one. Merging them would
// mean offering to register a second employer to a manager whose network hiccuped — and the server
// would then refuse it as a duplicate, or worse, not, because the hiccup hid a DIFFERENT company.
export const EMPLOYERS_UNKNOWN = 'unknown';
export const EMPLOYERS_EMPTY = 'empty';
export const EMPLOYERS_LISTED = 'listed';

/**
 * The legal employers this store may hire under, from `GET /legal-employers`, with this store's own
 * engagement counts folded in.
 *
 * THE GAP THIS CLOSED. This used to derive the list from the roster rows, because `POST /staff`
 * required a `legalEmployerId` and no route returned an employer — so the options were "employers
 * somebody here is already employed under", rendered as bare GUIDs since no name reached the wire.
 * An employer nobody was employed under yet could not be offered and could not be created, which
 * made a store's second legal entity unreachable and its first re-registrable by accident.
 *
 * `employers` is the endpoint's body, or null when the read did not answer. `rows` are the roster's
 * rows and contribute ONLY the counts: how many of this store's engagements sit under each employer,
 * which is what tells a manager which of two similar-looking companies is the live one. The counts
 * are same-store by construction, like every other number on this page.
 *
 * The server's own `inUseHere` is kept as well as the counts, and they are not the same claim: the
 * counts come from the roster read, so they are null-shaped when THAT read failed, while `inUseHere`
 * is the employer read's own answer. A row is offered whether or not it is in use — that is the
 * whole point.
 */
export function buildEmployers (employers, rows) {
  if (!Array.isArray(employers)) {
    return { state: EMPLOYERS_UNKNOWN, rows: [] };
  }

  const counted = Array.isArray(rows);
  const built = employers.map((employer) => {
    const engaged = counted ? rows.filter(row => row.legalEmployerId === employer.legalEmployerId) : null;
    return {
      legalEmployerId: employer.legalEmployerId,
      organizationNumber: employer.organizationNumber || null,
      name: employer.name || null,
      inUseHere: employer.inUseHere === true,
      // Null, not zero, when the roster is unknown: "nobody is employed under this" is a claim a
      // failed roster read has not earned.
      count: engaged ? engaged.length : null,
      activeCount: engaged ? engaged.filter(row => row.isActive).length : null
    };
  });

  // Most engagements first so the store's working employer leads, then by name, then by id — a
  // deterministic order even when two rows carry neither a count nor a name.
  built.sort((a, b) =>
    (b.activeCount || 0) - (a.activeCount || 0) ||
    String(a.name || '').localeCompare(String(b.name || '')) ||
    String(a.legalEmployerId).localeCompare(String(b.legalEmployerId)));

  return { state: built.length ? EMPLOYERS_LISTED : EMPLOYERS_EMPTY, rows: built };
}

/**
 * The `POST /legal-employers` body. Trimmed here so a stray space cannot become part of a company
 * name; the organization number's INTERNAL spaces are left for the server, which strips them as part
 * of the duplicate guard — normalising here as well would mean two implementations of one rule and
 * only one of them enforced.
 */
export function buildEmployerRequest (form) {
  return {
    organizationNumber: (form.organizationNumber || '').trim(),
    name: (form.name || '').trim()
  };
}

/**
 * The `POST /first-run` body. Same trimming rule as the employer request above, and the same reason:
 * the organization number's internal spaces are the SERVER's to strip, because the duplicate guard is
 * its rule and two implementations of one rule means one of them is not enforced.
 *
 * `confirmModuleActivation` is forced TRUE rather than copied from the form, and that is not a
 * bypass: the form's checkbox governs whether `submit` fires at all (see `WorkforceFirstRunForm`),
 * and a request that reached here having not been confirmed would be a bug in this page rather than a
 * decision to respect. Sending `false` would only produce a 400 the operator cannot act on. The
 * ACTUAL enforcement is the server's, which refuses an unconfirmed body outright — this field is the
 * client saying it has shown the consequence, not the client granting itself permission.
 *
 * There is deliberately no field for WHO to engage. The endpoint takes no subject: it engages the
 * caller, which is what stops the bootstrap being a way to hand Workforce capability to a third party.
 */
export function buildFirstRunRequest (form) {
  return {
    confirmModuleActivation: true,
    organizationNumber: (form.organizationNumber || '').trim(),
    legalEmployerName: (form.legalEmployerName || '').trim(),
    displayName: (form.displayName || '').trim()
  };
}

/**
 * The D1 pre-check: does this store already hold an ACTIVE engagement for this (person, employer)?
 *
 * Returns the conflicting row, or null. A null is NOT a guarantee that the write will succeed — the
 * index spans every store, and an engagement in a store the caller cannot see is unknowable from
 * here. That half is answered only by the server's opaque 409. Callers must phrase their "looks
 * fine" accordingly.
 *
 * `excludeStaffMemberId` is the row being reactivated, which must not conflict with itself.
 */
export function activeEngagementConflict (rows, workforcePersonId, legalEmployerId, excludeStaffMemberId) {
  if (!workforcePersonId || !legalEmployerId) { return null; }
  return rows.find(row =>
    row.isActive &&
    row.workforcePersonId === workforcePersonId &&
    row.legalEmployerId === legalEmployerId &&
    row.staffMemberId !== excludeStaffMemberId) || null;
}

/**
 * The people already on this store's roster, offered as targets for a SECOND engagement (a rehire,
 * or a second employer).
 *
 * Only this store's people: there is no person directory and no person search on the surface, and
 * inventing one would mean disclosing that a person exists at some other store — precisely what the
 * opaque 404/409 pair is built to prevent. Re-engaging someone who has never worked here is
 * therefore a new person record, and that is the honest outcome rather than a bug.
 *
 * A person who already holds an active engagement under `legalEmployerId` is returned BLOCKED with
 * the reason rather than dropped, because a silently missing name reads as "we have never heard of
 * them", which is a different and wrong sentence.
 */
export function personOptions (rows, legalEmployerId) {
  const byPerson = new Map();
  for (const row of rows) {
    if (!byPerson.has(row.workforcePersonId)) {
      byPerson.set(row.workforcePersonId, {
        workforcePersonId: row.workforcePersonId,
        displayName: row.displayName,
        personState: row.personState
      });
    }
  }

  return Array.from(byPerson.values()).map((person) => {
    const conflict = activeEngagementConflict(rows, person.workforcePersonId, legalEmployerId, null);
    return Object.assign({}, person, {
      blocked: !!conflict,
      blockingStaffMemberId: conflict ? conflict.staffMemberId : null
    });
  });
}

/**
 * Whether ending (or de-capabilitating) this engagement would leave the store with no active
 * WorkforceManager at all.
 *
 * This is not a nicety. Capabilities are resolved ONLY from an active engagement's grant bits —
 * `WorkforceAuthorizationService` cannot read StoreAdmin and explicitly forbids PowerUser from
 * standing in. A store whose last WorkforceManager engagement goes inactive can no longer be
 * managed by anyone through this API: there is no endpoint that could grant the capability back,
 * because every one of them requires the capability. It is a one-way door with no key.
 */
export function wouldStrandStore (roster, row) {
  if (!roster || roster.state !== ROSTER_COUNTED || !row) { return false; }
  if (!row.isActive) { return false; }
  if (!row.capabilities || !row.capabilities.includes(CAPABILITY_MANAGER)) { return false; }
  return roster.activeManagerCount === 1;
}

// ---- Open clock sessions ----------------------------------------------------------------------

export const SESSIONS_UNKNOWN = 'unknown';

/**
 * How many clock sessions this engagement has left OPEN, from `GET /attendance`'s per-day
 * `openSessionCount`.
 *
 * WHY THE ROSTER ASKS AT ALL. Ending an engagement flips `IsActive`, and the POS clock path
 * resolves its operator through `WorkforceStaffMembers ... && sm.IsActive`. That resolution guards
 * clock-OUT exactly as it guards clock-in, so ending an engagement while a session is open strands
 * that session open forever: the person can no longer punch out, and the personalliste entry for
 * that day keeps a null on-site end. The only remaining repair is a manager attendance
 * ADJUSTMENT, which is an append-only correction layered on the session, not a close.
 *
 * `attendance` is the response body or null. A null — including a failed or forbidden read — is
 * `SESSIONS_UNKNOWN`, never zero. Reporting an unanswered check as "no open sessions" is the
 * failure that would make the guard worse than no guard.
 */
export function openSessionCount (attendance, staffMemberId) {
  if (!attendance || !Array.isArray(attendance.rows)) { return SESSIONS_UNKNOWN; }
  return attendance.rows
    .filter(r => r.staffMemberId === staffMemberId)
    .reduce((sum, r) => sum + (Number(r.openSessionCount) || 0), 0);
}

/**
 * Everything true about ending THIS engagement, as facts the screen can state without inventing
 * any.
 *
 * ENDING IS NOT DELETION, and the surface makes that structural: `WorkforceStaffController` binds
 * no DELETE at all. The only lever is `PATCH { isActive: false }`, and the row, its grants, its
 * roles, its terms and its whole history stay exactly where they are. What actually changes:
 *
 *   SHIFTS      Published assignments keep pointing at the engagement and stay on the board —
 *               nothing cascades, and the schedule read does not filter on IsActive. Three things
 *               do change: a NEW assignment naming the engagement is refused
 *               (`The staff member is not active for the whole assignment`), a republish drops the
 *               person from the notified recipients (`ResolveEligibleRecipientsAsync` filters
 *               IsActive), and their own `/workforce/me` reads stop answering, so they can no
 *               longer SEE the shift they are still assigned to. The roster cannot count those
 *               shifts — `GET /schedules?from&to` resolves a range to ONE revision rather than
 *               returning everything in it — so it says the count is unknown and points at the
 *               schedule instead of guessing a number.
 *   PUNCHES     Raw clock events are append-only and sessions are untouched. An OPEN session is
 *               the hazard: see `openSessionCount`.
 *   PERSONALLISTE  Untouched, and untouchable. `WorkforcePersonnelListEntry` is append-only under a
 *               SQL Server AFTER UPDATE,DELETE trigger AND the EF GuardAppendOnly, with a statutory
 *               `RetainUntilUtc` of accounting-year end + 3 years 6 months
 *               (bokføringsforskriften § 8-5). There is no path from this screen that could alter
 *               or orphan a personalliste row, which is why ending an engagement is offered here at
 *               all rather than refused.
 */
export function endEngagementEffects (roster, row, attendance) {
  return {
    // Not a count and never rendered as one. The surface cannot answer it in one read.
    futureShifts: SESSIONS_UNKNOWN,
    openSessions: openSessionCount(attendance, row ? row.staffMemberId : null),
    personnelListPreserved: true,
    stranding: wouldStrandStore(roster, row)
  };
}

/**
 * Whether a stale end date would keep this engagement unschedulable even after reactivation.
 *
 * `PATCH /staff/{id}` applies `ActiveToUtc` only when the request carries a value, so a null means
 * "leave unchanged" and there is NO WAY to clear an end date once it is set. Meanwhile the schedule
 * write checks `staff.ActiveToUtc < endsUtc` and refuses. Together: an engagement ended WITH a date
 * and later reactivated is active but permanently unschedulable past that date.
 *
 * That is why the end-date field on the end form is opt-in rather than filled in for the manager.
 * `asOf` is passed in rather than read from the clock so the check is testable.
 */
export function reactivationBlockedBy (row, asOf) {
  if (!row || !row.activeToUtc) { return null; }
  return row.activeToUtc.getTime() < asOf.getTime() ? row.activeToUtc : null;
}

// ---- Employment terms -------------------------------------------------------------------------

export const WAGE_WITHHELD = 'withheld';
export const WAGE_NONE = 'none';
export const WAGE_SET = 'set';

/**
 * What a term's absent `wage` actually means, which depends entirely on who is asking.
 *
 * `GET /staff/{id}/employment-terms` nulls the wage block unless the caller holds
 * WorkforcePayrollApprover, and nulls it just the same when there is genuinely no wage recorded.
 * One null, two meanings. Without the capability the honest answer is WITHHELD — the field is not
 * empty, it is not for you — and rendering it as "no wage" would state a fact the response never
 * made.
 */
export function wageState (term, hasPayrollApprover) {
  if (!hasPayrollApprover) { return WAGE_WITHHELD; }
  return term && term.wage && (term.wage.amount !== null && term.wage.amount !== undefined) ? WAGE_SET : WAGE_NONE;
}

/**
 * The terms, newest first, as the page renders them. `null` in, `null` out: an unfetched or failed
 * term history is unknown, not "this engagement has no terms".
 */
export function buildTerms (terms, hasPayrollApprover) {
  if (!Array.isArray(terms)) { return null; }
  return terms.map(term => ({
    id: term.id,
    effectiveFromUtc: parseApiInstant(term.effectiveFromUtc),
    effectiveToUtc: parseApiInstant(term.effectiveToUtc),
    contractMinutesPerWeek: typeof term.contractMinutesPerWeek === 'number' ? term.contractMinutesPerWeek : null,
    contractPercentage: typeof term.contractPercentage === 'number' ? term.contractPercentage : null,
    employmentCategory: term.employmentCategory || null,
    payCode: term.payCode || null,
    costCenter: term.costCenter || null,
    wageState: wageState(term, hasPayrollApprover),
    wage: term.wage || null,
    isOpen: !term.effectiveToUtc
  }));
}

/**
 * `ContractMinutesPerWeek` as hours per week. Null stays null so the screen can print a dash — a
 * contract nobody has recorded is not a zero-hour contract, and printing 0 would state one.
 */
export function contractHoursPerWeek (minutes) {
  if (typeof minutes !== 'number' || !isFinite(minutes)) { return null; }
  return Math.round((minutes / 60) * 100) / 100;
}

// ---- Roles ------------------------------------------------------------------------------------

/**
 * The store's job roles, with the retired ones marked rather than dropped.
 *
 * `GET /roles` returns every role the store has ever defined — there is no deletion on this surface
 * and no `includeInactive` filter, only `effectiveToUtc`. Hiding an expired role would make an
 * engagement that still holds it look role-less; marking it says what is true.
 */
export function buildRoles (roles, asOf) {
  if (!Array.isArray(roles)) { return null; }
  return roles.map((role) => {
    const to = parseApiInstant(role.effectiveToUtc);
    return {
      roleId: role.roleId,
      name: role.name || null,
      station: role.station || null,
      color: role.color || null,
      sortOrder: role.sortOrder,
      effectiveFromUtc: parseApiInstant(role.effectiveFromUtc),
      effectiveToUtc: to,
      retired: !!(to && asOf && to.getTime() <= asOf.getTime())
    };
  });
}

// ---- Rendering helpers ------------------------------------------------------------------------

/**
 * A parsed instant as a date in the STORE's zone, never the browser's.
 *
 * Takes an already-parsed Date (from `parseApiInstant`) rather than the raw string, so there is no
 * second place a bare stamp could be handed to `new Date` and silently read as local time.
 */
export function formatDate (instant, timeZoneId, locale) {
  if (!instant) { return null; }
  return new Intl.DateTimeFormat(locale || 'no', {
    timeZone: timeZoneId || 'UTC',
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(instant);
}

/** A value or an em dash. Nulls render as dashes; they never render as zeros. */
export function orDash (value) {
  return value === null || value === undefined || value === '' ? '—' : value;
}

// ---- Wire shapes ------------------------------------------------------------------------------
//
// Every request body this surface sends is assembled here rather than in a component, so the two
// things that are easy to get quietly wrong live in one tested place:
//
//   THE DATE FORMAT. Instants go on the wire as the bare `YYYY-MM-DDTHH:mm:ss` that
//   `toUtcRangeParam` produces — no `Z`, no offset — the same format the schedule lane already
//   sends in bodies. A trailing `Z` invites a binder to convert into the server's own local time;
//   a bare stamp is converted by nothing and arrives as the instant meant.
//
//   THE MEANING OF NULL. `PATCH /staff/{id}` treats every absent field as "leave unchanged", so a
//   builder that helpfully filled in a null would be sending a no-op where the caller meant one
//   thing and reading a change where none happened.

/**
 * A store-local calendar date (`YYYY-MM-DD` from a date input) as the UTC instant of local midnight
 * in the STORE's zone.
 *
 * Not `new Date(value)`: that parses `YYYY-MM-DD` as UTC midnight, which in any zone east of UTC is
 * the previous local day, so a start date of 1 August would be stored as 31 July. `zonedMidnightToUtc`
 * resolves the offset at the date itself, so a DST weekend lands correctly too.
 */
export function localDateToInstant (isoDay, timeZoneId) {
  if (!isoDay || !timeZoneId) { return null; }
  const parts = String(isoDay).split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => !isFinite(n))) { return null; }
  return zonedMidnightToUtc(timeZoneId, parts[0], parts[1], parts[2]);
}

function wireInstant (isoDay, timeZoneId) {
  const instant = localDateToInstant(isoDay, timeZoneId);
  return instant ? toUtcRangeParam(instant) : null;
}

/**
 * `POST /staff`.
 *
 * `workforcePersonId` present = attach a second engagement to an EXISTING person; absent = create
 * the person too. The two are mutually exclusive in meaning, so the display/contact fields are sent
 * only on the new-person path — sending them alongside a person id would look like an edit of that
 * person, which this endpoint does not do (it ignores them, and the manager would believe a
 * correction had been saved).
 */
export function buildCreateRequest (form, timeZoneId) {
  const existing = !!form.workforcePersonId;
  return {
    workforcePersonId: existing ? form.workforcePersonId : null,
    displayName: existing ? null : (form.displayName || null),
    contactEmail: existing ? null : (form.contactEmail || null),
    contactPhone: existing ? null : (form.contactPhone || null),
    legalEmployerId: form.legalEmployerId || null,
    capabilities: Array.isArray(form.capabilities) ? form.capabilities.slice() : [],
    employmentNumber: form.employmentNumber || null,
    payrollNumber: form.payrollNumber || null,
    activeFromUtc: wireInstant(form.activeFromDate, timeZoneId)
  };
}

/**
 * `PATCH /staff/{id}` for an ordinary edit.
 *
 * `capabilities` is sent only when the caller actually touched it, because a non-null list REPLACES
 * the whole grant set — an accidental empty array would silently strip every capability the
 * engagement had.
 *
 * `activeToUtc` is never sent from here. See `buildEndRequest`.
 */
export function buildUpdateRequest (form) {
  return {
    capabilities: form.capabilitiesTouched ? (form.capabilities || []) : null,
    isActive: null,
    employmentNumber: form.employmentNumber === undefined ? null : form.employmentNumber,
    payrollNumber: form.payrollNumber === undefined ? null : form.payrollNumber,
    activeFromUtc: null,
    activeToUtc: null
  };
}

/**
 * `PATCH /staff/{id}` that ENDS the engagement.
 *
 * `isActive: false` is the whole act — it is the sole runtime authorization gate, and there is no
 * delete on this surface at all.
 *
 * The end DATE is opt-in and defaults to absent, which looks like an omission and is not. The PATCH
 * applies `ActiveToUtc` only when a value is present, so null means "leave unchanged" and there is
 * NO request that can clear a date once set. The schedule write meanwhile refuses any assignment
 * running past `ActiveToUtc`. Recording an end date therefore permanently caps this engagement's
 * schedulability even if it is later reactivated — a one-way door. It is offered, with that said
 * out loud, rather than filled in on the manager's behalf.
 */
export function buildEndRequest (form, timeZoneId) {
  return {
    capabilities: null,
    isActive: false,
    employmentNumber: null,
    payrollNumber: null,
    activeFromUtc: null,
    activeToUtc: form && form.recordEndDate ? wireInstant(form.endDate, timeZoneId) : null
  };
}

/** `PATCH /staff/{id}` that reactivates. Never touches the dates; see `reactivationBlockedBy`. */
export function buildReactivateRequest () {
  return {
    capabilities: null,
    isActive: true,
    employmentNumber: null,
    payrollNumber: null,
    activeFromUtc: null,
    activeToUtc: null
  };
}

/**
 * `PUT /staff/{id}/employment-terms`.
 *
 * Wage is omitted entirely unless the caller holds WorkforcePayrollApprover: the endpoint refuses a
 * wage write from a caller who cannot read one, so sending an empty wage block from a manager
 * without the capability would turn every term save into a 403.
 */
export function buildTermRequest (form, timeZoneId, hasPayrollApprover) {
  const minutes = form.contractHoursPerWeek === '' || form.contractHoursPerWeek === null || form.contractHoursPerWeek === undefined
    ? null
    : Math.round(Number(form.contractHoursPerWeek) * 60);

  const request = {
    effectiveFromUtc: wireInstant(form.effectiveFromDate, timeZoneId),
    contractMinutesPerWeek: isFinite(minutes) ? minutes : null,
    contractPercentage: null,
    employmentCategory: form.employmentCategory || null,
    payCode: form.payCode || null,
    costCenter: form.costCenter || null,
    wage: null
  };

  if (hasPayrollApprover && form.wageAmount !== '' && form.wageAmount !== null && form.wageAmount !== undefined) {
    request.wage = {
      amount: Number(form.wageAmount),
      currency: form.wageCurrency || null,
      interval: form.wageInterval || null
    };
  }

  return request;
}
