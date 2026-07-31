// The Training journey, as state rather than as rendering.
//
// Everything a Training panel shows is derived here, so the panels hold no logic that could quietly
// answer a question the server did not. Three rules run through the whole file:
//
// UNKNOWN, REFUSED AND EMPTY ARE THREE DIFFERENT ANSWERS. A read that has not returned, a read the
// server refused, and a read that answered with nothing are never collapsed. `rows` is null unless
// the read ANSWERED, so a panel that renders `rows.length` cannot print "no courses" over a refusal
// — there is no array to take a length of.
//
// A REFUSAL PAST THE GATE EXPLAINS NOTHING, AND THIS FILE DOES NOT PRETEND OTHERWISE. Training's 404
// is one answer for "absent", "another store's" and "module never enabled", and its 403 is one
// answer for "you do not hold this store" and "there is no such store". Both are pinned equal by
// `WebApi.Tests/Training/TrainingTenantIsolationTests`. So there is exactly ONE refused state here,
// carrying the code the server sent and no interpretation of it.
//
// DATES ARE EVIDENCE, SO THEY ARE NOT CONVERTED UNLESS CONVERSION IS LOSSLESS. Two families arrive
// on this surface and they are handled differently on purpose — see `civilDateOf` and `instantOf`.

import { parseApiInstant, businessDateKey } from '~/utils/workforce/week-range';
import { isWorkforceApiError } from '~/utils/workforce/api-client';
import { buildRoster, buildRoles, ROSTER_UNKNOWN } from '~/utils/workforce/roster';

// ---- how a read can have gone ------------------------------------------------------------------

/** The read has not answered, or failed in a way that says nothing about the data. */
export const READ_UNKNOWN = 'unknown';

/**
 * The server refused, with a `training.*` document. That document does NOT say why, by design.
 * Carries the code so copy can be keyed on it; carries no rows and no interpretation.
 */
export const READ_REFUSED = 'refused';

/** The read answered. Rows may legitimately be zero, and zero then means zero. */
export const READ_ANSWERED = 'answered';

/**
 * Reads one list response into the three-state axis above.
 *
 * `collectionKey` is the property the backend's list envelope carries its rows on
 * (`courses`, `assignments`, `completions`, `certificates`). A 200 whose envelope is missing that
 * property — or carries something that is not an array — is UNKNOWN rather than empty: the server's
 * own model initialises every one of them to a list, so a non-array is a shape this client does not
 * understand, not a store with nothing in it.
 */
export function readListing (payload, error, collectionKey) {
  if (error) {
    return { state: stateOfError(error), rows: null, code: trainingCodeOf(error), asOf: null };
  }
  const rows = payload ? payload[collectionKey] : null;
  if (!Array.isArray(rows)) {
    return { state: READ_UNKNOWN, rows: null, code: null, asOf: null };
  }
  return { state: READ_ANSWERED, rows, code: null, asOf: instantOf(payload.asOfUtc) };
}

/** The same three-state read for the single-course detail document (#3). */
export function readCourseDetail (payload, error) {
  if (error) {
    return { state: stateOfError(error), course: null, versions: null, code: trainingCodeOf(error) };
  }
  if (!payload || !payload.courseId || !Array.isArray(payload.versions)) {
    return { state: READ_UNKNOWN, course: null, versions: null, code: null };
  }
  return { state: READ_ANSWERED, course: payload, versions: payload.versions, code: null };
}

/**
 * The same three-state read for the competency holdings document (#15).
 *
 * `keys` and `certificates` stay null unless the read answered. An empty answered holdings document
 * is a real fact — "no possession recorded for this person" — and it is NEVER a qualification
 * verdict: Training returns possession only and Workforce reads absence as unknown (spec §7.3).
 */
export function readHoldings (payload, error) {
  if (error) {
    return { state: stateOfError(error), personRef: null, keys: null, certificates: null, code: trainingCodeOf(error), asOf: null };
  }
  if (!payload || !Array.isArray(payload.heldCompetencyKeys) || !Array.isArray(payload.certificates)) {
    return { state: READ_UNKNOWN, personRef: null, keys: null, certificates: null, code: null, asOf: null };
  }
  return {
    state: READ_ANSWERED,
    personRef: payload.personRef || null,
    keys: payload.heldCompetencyKeys,
    certificates: payload.certificates,
    code: null,
    asOf: instantOf(payload.asOfUtc)
  };
}

function stateOfError (error) {
  return trainingCodeOf(error) ? READ_REFUSED : READ_UNKNOWN;
}

function trainingCodeOf (error) {
  return (error && typeof error.code === 'string' && error.code.indexOf('training.') === 0)
    ? error.code
    : null;
}

// ---- who a reference can name -------------------------------------------------------------------
//
// `personRef` and `roleRef` are `Workforce*` GUIDs carried BY VALUE. Training holds no foreign key to
// either and has no route that lists people or roles, so the only place a name for one can come from
// is the Workforce surface itself — a DIFFERENT module, with its OWN authorization.
//
// THAT IS WHY THE DIRECTORY IS THREE-STATE LIKE EVERY OTHER READ ON THIS PAGE, and why a missing one
// never closes a field. `GET /workforce/…/staff` needs the caller's own ACTIVE engagement to hold
// `WorkforceScheduler` (`WorkforceAuthorizationService.RequireCapabilityAsync`), which is resolved
// from engagement grant bits and CANNOT be satisfied by StoreAdmin or PowerUser. A Training manager
// who administers this store may therefore hold nothing at all in Workforce and get a 403 — while
// still being perfectly entitled to file the evidence. So the directory assists typing and never
// replaces it: every reference field keeps its text input under every one of these states.
//
// The suggestions are also NOT the set the server will accept. `TrainingPersonBinding
// .RequireKnownPersonAsync` checks that a `WorkforcePersonId` EXISTS — estate-wide, every person
// state, explicitly not an employment check — so a person engaged at another store in the chain, or
// one still `Invited`, is accepted and will never appear in this store's roster. An id absent from
// the list is therefore unrecognised HERE, which is not the same claim as invalid.

/** The directory read has not answered, or failed in a way that says nothing about the roster. */
export const DIRECTORY_UNKNOWN = 'unknown';

/** Workforce declined: no `WorkforceScheduler` grant in this store, or the module is off here. */
export const DIRECTORY_REFUSED = 'refused';

/** The directory answered. `options` may legitimately be empty, and empty then means empty. */
export const DIRECTORY_ANSWERED = 'answered';

/**
 * A Workforce failure that is a REFUSAL rather than a non-answer.
 *
 * 403 is "you hold no capability in this store" and 404 is the module gate's opaque answer; both are
 * the server declining. Anything else — a network failure, a 500 — says nothing, and is kept apart so
 * the copy can say "we did not hear back" instead of "you may not see this".
 */
function directoryStateOf (error) {
  return (isWorkforceApiError(error) && (error.status === 403 || error.status === 404))
    ? DIRECTORY_REFUSED
    : DIRECTORY_UNKNOWN;
}

/**
 * The store's people, as reference suggestions keyed on `workforcePersonId`.
 *
 * PER PERSON, NOT PER ENGAGEMENT. `GET /staff` returns one row per engagement and the same human can
 * hold two (a rehire, or two legal employers), while `personRef` names the PERSON — so two rows that
 * share a person id are one suggestion, and it counts as current when ANY of them is active. An
 * engagement that has ended still names a real person whose historical evidence is filed the same
 * way, so it is marked rather than dropped.
 */
export function personDirectory (staff, error) {
  if (error) { return { state: directoryStateOf(error), options: [] }; }

  const roster = buildRoster(staff);
  if (roster.state === ROSTER_UNKNOWN) { return { state: DIRECTORY_UNKNOWN, options: [] }; }

  const byPerson = new Map();
  for (const row of roster.rows) {
    if (!row.workforcePersonId) { continue; }
    const existing = byPerson.get(row.workforcePersonId);
    if (existing) {
      existing.ended = existing.ended && !row.isActive;
      continue;
    }
    byPerson.set(row.workforcePersonId, {
      id: row.workforcePersonId,
      label: row.displayName || row.workforcePersonId,
      ended: !row.isActive
    });
  }

  return { state: DIRECTORY_ANSWERED, options: Array.from(byPerson.values()) };
}

/**
 * The store's job roles, as reference suggestions keyed on `roleId`.
 *
 * `GET /roles` returns every role the store has ever defined — there is no deletion, only
 * `effectiveToUtc` — so a retired role is MARKED rather than hidden. Hiding one would make the
 * assignments that still name it look like they point at nothing.
 */
export function roleDirectory (roles, error, asOf) {
  if (error) { return { state: directoryStateOf(error), options: [] }; }

  const built = buildRoles(roles, asOf || new Date());
  if (built === null) { return { state: DIRECTORY_UNKNOWN, options: [] }; }

  return {
    state: DIRECTORY_ANSWERED,
    options: built.filter(r => r.roleId).map(role => ({
      id: role.roleId,
      label: role.station ? role.name + ' · ' + role.station : (role.name || role.roleId),
      ended: role.retired
    }))
  };
}

/** The suggestion whose id is exactly `reference`, or null. Used to name what an operator typed. */
export function directoryMatch (directory, reference) {
  const wanted = String(reference || '').trim().toLowerCase();
  if (!wanted || !directory || directory.state !== DIRECTORY_ANSWERED) { return null; }
  return directory.options.find(o => String(o.id).toLowerCase() === wanted) || null;
}

/**
 * Whether a typed reference is a well-formed GUID.
 *
 * Every `*Ref` on this surface binds to a `Guid` on the server, so anything else fails MODEL BINDING
 * — a framework 400 that carries no `training.*` code at all and therefore cannot be explained by
 * this page. The forms refuse it before sending, the same way they already refuse a score outside
 * 0–100: a control whose only outcome is a refusal is not a control.
 */
export function isReferenceId (value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || '').trim());
}

// ---- the feature-flag family -------------------------------------------------------------------

/**
 * One `training.*` flag's state, as THREE values: `true`, `false`, or null for unknown.
 *
 * Null is not "off". `GET /context` reports all seven flags, so a flag missing from the map means
 * the context read did not answer (or answered a shape this client does not understand) — and a
 * panel that greyed its buttons out on that would be telling a venue their module is switched off
 * on the strength of a failed read.
 */
export function flagState (context, flag) {
  const flags = context && context.featureFlags;
  if (!flags || typeof flags !== 'object') { return null; }
  return typeof flags[flag] === 'boolean' ? flags[flag] : null;
}

/** The store timezone id `GET /context` resolved, or null when unknown. */
export function zoneIdOf (context) {
  const zone = context && context.timeZone;
  return (zone && typeof zone.id === 'string' && zone.id) ? zone.id : null;
}

/** True only when the server SAID it fell back to Europe/Oslo because the store carried no valid zone. */
export function zoneIsFallback (context) {
  const zone = context && context.timeZone;
  return !!(zone && zone.isFallback === true);
}

// ---- versions ----------------------------------------------------------------------------------

/**
 * The versions of a read course that may be ASSIGNED: `Published` only.
 *
 * `TrainingAssignmentService.CreateAssignmentAsync` refuses anything else with a 400
 * ("Only a published course version can be assigned."), and a Retired version is refused too — that
 * is what retiring a version means. Offering a draft or a retired version in an assign picker would
 * be offering a control whose only outcome is a refusal.
 */
export function assignableVersions (detail) {
  return versionsOf(detail).filter(v => v.state === 'Published');
}

/**
 * The versions a COMPLETION may be recorded against: `Published` OR `Retired`.
 *
 * This is a genuinely different set from the assignable one, and the difference is the point.
 * `TrainingCompletionService.RecordCompletionAsync` refuses only `Draft` ("A completion cannot be
 * recorded against a draft course version"), because what a completion needs is a FROZEN content
 * hash to be recorded against — and retiring a version freezes it further rather than unfreezing it.
 * A venue that retires a course still has to be able to file the completions of the people who took
 * it before it was withdrawn.
 */
export function recordableVersions (detail) {
  return versionsOf(detail).filter(v => v.state === 'Published' || v.state === 'Retired');
}

function versionsOf (detail) {
  return (detail && Array.isArray(detail.versions)) ? detail.versions : [];
}

/** A version picker label: `v3 · Published` — state included because the two sets above differ by it. */
export function versionLabel (version) {
  if (!version) { return null; }
  const no = typeof version.versionNo === 'number' ? 'v' + version.versionNo : null;
  return [no, version.state].filter(Boolean).join(' · ') || null;
}

// ---- time --------------------------------------------------------------------------------------

/**
 * A wire INSTANT (`asOfUtc`, `createdAtUtc`, `publishedAtUtc`, `completedAtUtc`).
 *
 * Always `parseApiInstant`, never `new Date(iso)`. Training's serialised timestamps come in both
 * shapes on the same document: a server-computed `asOfUtc` is `DateTimeKind.Utc` and carries a `Z`,
 * while every column-loaded stamp comes back from EF as `Unspecified` and serialises BARE. Both
 * denote UTC, and JS reads a bare one as browser-local — which for a completion stamp means the
 * evidence of when somebody was trained moves by the reader's own offset. That defect shipped once
 * on this estate already.
 */
export function instantOf (value) {
  return parseApiInstant(value);
}

/**
 * A wire CIVIL DATE (`issueDateUtc`, `expiryDateUtc`, `dueDateUtc`) → its `YYYY-MM-DD` day.
 *
 * SLICED, NEVER CONVERTED, and that is a deliberate refusal to answer an open question. These three
 * are authored as days — a certificate expires on a date, an assignment is due on a date — and they
 * are stored in `*Utc`-named columns which `TrainingCertificateService` then compares against a UTC
 * horizon with no store-zone resolution at all. Whether the stored midnight denotes UTC or the
 * store's own local midnight is TR-B3, an open module-epoch ruling on Sven's list.
 *
 * Slicing the authored day is true under either answer. Running it through a zone is true under only
 * one, and under the other it shows a certificate expiring on the 1st as expiring on the 31st — a
 * date shown wrong on the record that exists to prove it.
 */
export function civilDateOf (value) {
  return businessDateKey(value);
}

/**
 * A civil `YYYY-MM-DD` from a date input → the wire form to POST: `YYYY-MM-DDT00:00:00`.
 *
 * Deliberately WITHOUT a `Z` or an offset, for the reason `toUtcRangeParam` documents one level up:
 * a bare value is converted by nothing under any model-binder or serializer setting, so the day the
 * operator typed is the day the column holds, and `civilDateOf` slices it back out unchanged.
 * Returns null for an empty input, which is how "no expiry" and "no due date" are sent.
 */
export function toApiDate (civil) {
  return (typeof civil === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(civil)) ? civil + 'T00:00:00' : null;
}

/**
 * An instant rendered in the venue's own clock.
 *
 * The zone is the one `GET /context` resolved, never a guess: when it is unknown the instant is
 * rendered in UTC and the caller labels it as such, because an unlabelled clock is worse than an
 * inconvenient one. Converting an instant between zones is lossless — this is a display choice, not
 * the epoch claim `civilDateOf` refuses to make.
 */
export function instantLabel (instant, locale, timeZoneId) {
  if (!instant) { return null; }
  return new Intl.DateTimeFormat(locale || 'no', {
    timeZone: timeZoneId || 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(instant);
}

// ---- rows ---------------------------------------------------------------------------------------

/**
 * A certificate row: the dated fields sliced, the DERIVED status passed straight through.
 *
 * `status` is computed server-side over the expiry and the server's own clock and is explicitly
 * never a blocking claim (spec §3.4). It is read, never recomputed here: a browser clock disagreeing
 * with the server's would produce a second opinion about whether a food-hygiene certificate is
 * valid, and there is no reading on which that is an improvement.
 */
export function certificateRow (certificate) {
  const c = certificate || {};
  return {
    certificateId: c.certificateId || null,
    personRef: c.personRef || null,
    type: c.type || null,
    issuer: c.issuer || null,
    issueDate: civilDateOf(c.issueDateUtc),
    // Null means the certificate has NO expiry, which the backend models as permanently Valid. It is
    // a real fact and prints as a dash with a title, never as a missing value and never as a zero.
    expiryDate: civilDateOf(c.expiryDateUtc),
    hasExpiry: !!c.expiryDateUtc,
    status: typeof c.status === 'string' ? c.status : null,
    documentReference: c.documentReference || null,
    created: instantOf(c.createdAtUtc)
  };
}

/**
 * A completion row.
 *
 * `passed` IS THE SERVER'S OWN VERDICT AND IS READ, NEVER RECOMPUTED. TR-B1 is settled:
 * `RecordTrainingCompletionRequest` carries no verdict field at all, and
 * `TrainingCompletionService.RecordCompletionAsync` writes
 * `Passed = TrainingGrading.IsPass(request.ScorePercent, version.PassThresholdPercent)` against the
 * exact immutable version the attempt was recorded against.
 *
 * So the score and the verdict are still carried side by side and still never compared HERE. The
 * reason has changed rather than gone away: the row is append-only statutory evidence, the threshold
 * that graded it is the one frozen into that version, and a browser recomputing the comparison — off
 * a threshold read from a later version, or with a rounding the server does not do — would print a
 * second opinion about the same record.
 */
export function completionRow (completion) {
  const c = completion || {};
  return {
    completionId: c.completionId || null,
    personRef: c.personRef || null,
    courseId: c.courseId || null,
    courseVersionId: c.courseVersionId || null,
    // A score of 0 is a real score. `typeof` rather than truthiness, or every 0% would print as a dash.
    scorePercent: typeof c.scorePercent === 'number' ? c.scorePercent : null,
    passed: typeof c.passed === 'boolean' ? c.passed : null,
    versionContentHash: c.versionContentHash || null,
    source: c.source || null,
    completed: instantOf(c.completedAtUtc)
  };
}

/** An assignment row: scope, the by-value reference it carries, and the version it points at. */
export function assignmentRow (assignment) {
  const a = assignment || {};
  const scope = a.scope || null;
  return {
    assignmentId: a.assignmentId || null,
    courseVersionId: a.courseVersionId || null,
    versionNo: typeof a.versionNo === 'number' ? a.versionNo : null,
    courseTitle: a.courseTitle || null,
    scope,
    // Exactly one of the two is set for a given scope (a DB CHECK constraint enforces it), so the
    // reference shown is the one the scope names rather than whichever happened to be non-null.
    reference: scope === 'Role' ? (a.roleRef || null) : (scope === 'Person' ? (a.personRef || null) : null),
    dueDate: civilDateOf(a.dueDateUtc),
    assignedBy: a.assignedByReference || null,
    created: instantOf(a.createdAtUtc)
  };
}

/** A course row for the list. `versionCount`/`hasPublishedVersion` are server-projected, not counted here. */
export function courseRow (course) {
  const c = course || {};
  return {
    courseId: c.courseId || null,
    title: c.title || null,
    category: c.category || null,
    competencyKey: c.competencyKey || null,
    isActive: c.isActive === true,
    versionCount: typeof c.versionCount === 'number' ? c.versionCount : null,
    hasPublishedVersion: c.hasPublishedVersion === true,
    created: instantOf(c.createdAtUtc)
  };
}
