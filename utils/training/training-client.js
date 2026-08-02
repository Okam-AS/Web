// The Training & Internkontroll STORE client — the reads and writes a venue needs to walk the one
// journey this surface proves: a course becomes evidence.
//
// It is deliberately route-for-route with the backend and adds nothing. Endpoint numbers are the
// ones the backend's own XML docs use (`Controllers/TrainingController.cs`, spec §5.1):
//
//   GET    /training/stores/{storeId}/context                                     #1
//   GET    /training/stores/{storeId}/courses                                     #2
//   POST   /training/stores/{storeId}/courses                                     #2
//   GET    /training/stores/{storeId}/courses/{courseId}                          #3
//   POST   /training/stores/{storeId}/courses/{courseId}/versions                 #4
//   POST   /training/stores/{storeId}/courses/{courseId}/versions/{no}/publish    #6
//   GET    /training/stores/{storeId}/assignments                                 #8
//   POST   /training/stores/{storeId}/assignments                                 #8
//   DELETE /training/stores/{storeId}/assignments/{assignmentId}                  #9
//   GET    /training/stores/{storeId}/completions                                 #10
//   POST   /training/stores/{storeId}/completions                                 #11
//   GET    /training/stores/{storeId}/certificates                                #12
//   POST   /training/stores/{storeId}/certificates                                #12
//   GET    /training/stores/{storeId}/competency/holdings?person=                 #15
//   GET    /training/stores/{storeId}/evidence/disclosures[?personRef=]           #17
//
// THE FOUR ROUTES DELIBERATELY ABSENT, and why, so nobody adds them back by reflex:
//
//   #5  PATCH a draft version — editing authored content is the full authoring experience, not the
//       proof that a version can be frozen. Publish is what the journey needs.
//   #7  POST …/retire — the terminal half of a lifecycle whose first half is what carries evidence.
//   #13 PATCH a certificate — the ONE `If-Match` route on this surface. Binding it would drag in the
//       §5.3 stale-version conflict shape (`currentRevision`, `changedFieldPaths`) for a correction
//       the journey does not need, and it is the only reason this client would need a second error
//       family. It is absent, so it does not.
//   #14 GET …/certificates/expiring?withinDays — TR-B3 is open: the service compares `ExpiryDate`
//       against a UTC horizon (`TrainingCertificateService.ListExpiringAsync`) with no store-zone
//       resolution, so an Oslo certificate expiring on the 1st can be absent from a `withinDays:0`
//       feed asked for at 22:30Z on the 31st. The epoch ruling is Sven's and still open, and a
//       surfacing window is exactly the surface whose correctness would depend on it.
//
// TRANSPORT IS SHARED, NOT COPIED, AND THERE IS NO SECOND ERROR FAMILY. `WorkforceClientBase` is the
// repo's one HTTP layer; the Margin lane wrote out the test for when a module has earned its own
// (`utils/margin/api-client.js`), and Training fails it in the direction of reuse:
//
//   • THE MANDATORY MUTATION HEADER IS THE SAME ONE. Every Training mutation requires an
//     `Idempotency-Key` and the controller answers 400 without it (`TrainingControllerBase
//     .TryGetIdempotencyKey`) — byte-for-byte the rule `WorkforceClientBase._mutate` exists to hold.
//     That is the header Margin could not share and Training can.
//   • THE CONFLICT VOCABULARY OVERLAPS RATHER THAN BEING DISJOINT. Training's problem+json carries
//     `code`, `conflictKind` and `retryable` — three of the four fields `WorkforceApiError` already
//     reads. Only `conflictingAssignmentId` is permanently null here, and the whole document stays
//     on `.problem` for anything a caller needs beyond them.
//
// What is Training-specific is which refusal means what, and that lives in `gateOf`/`refusalOf`
// below, where it is testable without a network.

import { WorkforceClientBase, isWorkforceApiError } from '~/utils/workforce/api-client';

/** The `training.*` problem-code family. A code outside it did not come from this module. */
export const TRAINING_CODE_PREFIX = 'training.';

// ---- The codes this surface can actually meet ---------------------------------------------------
//
// Only the ones the bound routes throw. `training.stale-version` belongs to the certificate
// correction (#13) and `training.cross-store-denied` is DEAD BY RULING — the backend declares the
// factory and deliberately has no throw site, because a distinct 403 for a body naming another
// store's row would diverge from the absent-id 404 and turn the refusal into an existence oracle
// (`TrainingProblemException.CrossStoreDenied`, pinned by `TrainingTenantIsolationTests`). Neither is
// declared here: a constant is an invitation to key on it, and the second one must never be keyed on.

/** 400: a request failed a business/input rule. The `detail` is server prose; the code is the contract. */
export const TRAINING_VALIDATION = 'training.validation';

/**
 * 403: the caller does not hold the route store's manager capability.
 *
 * IT IS NOT DISTINGUISHABLE FROM A STORE THAT DOES NOT EXIST, and that is deliberate:
 * `TrainingAuthorizationService.RequireStoreAdminAsync` throws this same `Forbidden()` for a store
 * row that is absent, and `TrainingTenantIsolationTests
 * .Every_entry_point_answers_an_absent_store_exactly_as_one_the_caller_does_not_hold` asserts the two
 * answers are EQUAL, field for field. Any copy keyed on this code must therefore cover both, and no
 * caller may report "this store does not exist" or "you are not an admin here" as the reason.
 */
export const TRAINING_FORBIDDEN = 'training.forbidden';

/**
 * 404, opaque: the resource is absent, OR it belongs to a store the caller may not see, OR Training
 * was never enabled for this store. ONE answer for all three, by design and by pin.
 *
 * `TrainingProblemException.NotFound()` takes no discriminating input, so there is nothing in the
 * document to split on — and `TrainingTenantIsolationTests
 * .A_resource_of_another_store_is_the_same_opaque_answer_as_one_that_does_not_exist` compares the
 * cross-store answer against an id that exists nowhere and fails on any divergence. Nothing built on
 * this client may translate it into "this store has no courses".
 */
export const TRAINING_NOT_FOUND = 'training.not-found';

/** 409: the `Idempotency-Key` was reused with a DIFFERENT payload — a client bug, not a replay. */
export const TRAINING_IDEMPOTENCY_PAYLOAD_MISMATCH = 'training.idempotency-payload-mismatch';

/** 409, retryable: a concurrent request holds the same key and has not finished. */
export const TRAINING_IDEMPOTENCY_IN_PROGRESS = 'training.idempotency-in-progress';

/** 409: the version is not a draft — a published version's content is immutable, a change is a new version. */
export const TRAINING_COURSE_VERSION_IMMUTABLE = 'training.course-version-immutable';

/**
 * 409: the area's feature flag is off on a store that IS visible — reads answer, writes do not.
 *
 * This is the one refusal that says something a client could not have known from a read alone, and
 * it is the reason `GET /context`'s flag map is worth rendering: the same flag being off is a 409
 * here and an opaque 404 on a store that was never enabled at all (`TrainingModuleGate
 * .EnsureWritableAsync`).
 */
export const TRAINING_FLAG_DISABLED_READ_ONLY = 'training.flag-disabled-read-only';

// ---- How the module gate can have answered ------------------------------------------------------
//
// These classify the CONTEXT read only (#1), which is the one call whose refusal is informative:
// past it, every refusal is opaque on purpose.

/** The context read has not answered, or failed in a way that says nothing. Never a claim about the store. */
export const GATE_UNKNOWN = 'unknown';

/** 401 — no usable token. */
export const GATE_UNAUTHENTICATED = 'unauthenticated';

/** 403 — the caller does not hold this store. Indistinguishable from a store that is not there (see above). */
export const GATE_FORBIDDEN = 'forbidden';

/**
 * 404 carrying a `training.*` code: the module answered and is declining to say anything. Training
 * is invisible for this store — `training.setup` has never been on AND no `Training*` row exists
 * (`TrainingModuleGate.IsVisibleAsync`).
 *
 * The limit of what this proves is the code: a 404 with a `training.*` document was minted by this
 * module, so the module is deployed and its route is bound. A 404 WITHOUT one was not.
 */
export const GATE_INVISIBLE = 'invisible';

/**
 * 404 with no `training.*` code — an unrouted path, or somebody else's 404. The module did not
 * answer, so nothing may be claimed about this store at all. Kept apart from `GATE_INVISIBLE`
 * because "Training is off here" and "Training is not deployed" are different sentences and only one
 * of them is a venue's problem.
 */
export const GATE_UNREACHABLE = 'unreachable';

/** The context read answered. */
export const GATE_OPEN = 'open';

/**
 * Classifies a failed CONTEXT read into one of the gate states above.
 *
 * The 404 split keys on the problem CODE and requires the `training.` prefix rather than merely
 * "some code was present": an unrouted 404 has no code at all, and a 404 minted by anything else has
 * no `training.*` code either, so neither can be reported as "the Training module answered".
 *
 * Returns null for a non-error, so a caller can write `gateOf(err) || GATE_OPEN` without branching.
 */
export function gateOf (error) {
  if (!error) { return null; }
  if (!isWorkforceApiError(error)) { return GATE_UNKNOWN; }

  if (error.status === 401) { return GATE_UNAUTHENTICATED; }
  if (error.status === 403) { return GATE_FORBIDDEN; }
  if (error.status === 404) {
    return hasTrainingCode(error) ? GATE_INVISIBLE : GATE_UNREACHABLE;
  }
  return GATE_UNKNOWN;
}

/**
 * The stable `training.*` code of a failure, or null when it did not carry one.
 *
 * Callers key their copy on this and NEVER on `detail`, which is English prose written for a
 * developer ("Only a published course version can be assigned."). A null return means the failure
 * was not this module's to explain.
 */
export function codeOf (error) {
  return hasTrainingCode(error) ? error.code : null;
}

function hasTrainingCode (error) {
  return !!(error &&
    typeof error.code === 'string' &&
    error.code.indexOf(TRAINING_CODE_PREFIX) === 0);
}

/**
 * The store-scoped Training surface.
 *
 * Every method here maps to a controller action that exists today. The three the journey would also
 * want have no route on THIS surface, so there is no method for them here, and two of the three are
 * answered elsewhere:
 *
 *   • A PERSON DIRECTORY and a ROLE DIRECTORY exist on the WORKFORCE surface, and the page reads them
 *     through `WorkforceRosterService` to name references and populate pickers. They are not proxied
 *     into this client: it is route-for-route with `TrainingController` and adding a foreign route
 *     would hide that the read carries a different module's authorization (`WorkforceScheduler`, not
 *     StoreAdmin) and can be refused on its own.
 *   • A WORKER'S OWN QUIZ SUBMISSION has no route anywhere. The §5.2 self-service surface is not in
 *     this wave, which is why every completion filed here is `ManagerRecorded` and why the version
 *     panel authors no quiz content.
 */
export class TrainingStoreService extends WorkforceClientBase {
  /** #1: capabilities, store timezone, the full `training.*` flag family, competency-seam binding. */
  GetContext (storeId) {
    return this._request('GET', this._base(storeId) + '/context');
  }

  /** #2: the store's course envelopes with per-course version counts. */
  ListCourses (storeId) {
    return this._request('GET', this._base(storeId) + '/courses');
  }

  /** #2: create a course envelope. `competencyKey` is what a passing completion later confers. */
  CreateCourse (storeId, request) {
    return this._mutate('POST', this._base(storeId) + '/courses', request);
  }

  /** #3: one course with ALL its versions — the only read that carries version state and content hashes. */
  GetCourse (storeId, courseId) {
    return this._request('GET', this._base(storeId) + '/courses/' + encodeURIComponent(courseId));
  }

  /** #4: cut a new DRAFT version. The version number is server-assigned (max + 1), never sent. */
  CreateVersion (storeId, courseId, request) {
    return this._mutate('POST', this._base(storeId) + '/courses/' + encodeURIComponent(courseId) + '/versions', request);
  }

  /**
   * #6: Draft → Published. The server freezes the content and recomputes the content hash over the
   * exact snapshot being published; that hash is what a completion is later recorded against.
   *
   * Addressed by version NUMBER, not by `courseVersionId` — the route is
   * `versions/{versionNo:int}/publish`. Sending an id here would 404 opaquely and look like a
   * missing course.
   */
  PublishVersion (storeId, courseId, versionNo) {
    return this._mutate(
      'POST',
      this._base(storeId) + '/courses/' + encodeURIComponent(courseId) + '/versions/' + encodeURIComponent(versionNo) + '/publish'
    );
  }

  /** #8: every assignment at this store, each joined to its version number and course title. */
  ListAssignments (storeId) {
    return this._request('GET', this._base(storeId) + '/assignments');
  }

  /**
   * #8: assign a PUBLISHED version to a role or one person, both by value.
   *
   * `courseVersionId` is resolved store-scoped by the server: a version id belonging to another
   * store is the same opaque 404 as one that exists nowhere. Nothing here may treat a version id as
   * portable between stores.
   */
  CreateAssignment (storeId, request) {
    return this._mutate('POST', this._base(storeId) + '/assignments', request);
  }

  /** #9: revoke an assignment. 204 with no body; a person-scoped one that was attempted is refused 400. */
  RevokeAssignment (storeId, assignmentId) {
    return this._mutate('DELETE', this._base(storeId) + '/assignments/' + encodeURIComponent(assignmentId));
  }

  /** #10: the append-only completion ledger for this store. */
  ListCompletions (storeId) {
    return this._request('GET', this._base(storeId) + '/completions');
  }

  /**
   * #11: record a manager-observed completion against a frozen (Published or Retired) version.
   *
   * THE REQUEST CARRIES NO VERDICT. `RecordTrainingCompletionRequest` is `PersonRef`,
   * `CourseVersionId` and `ScorePercent` — nothing else — and the server derives the verdict itself:
   * `Passed = TrainingGrading.IsPass(request.ScorePercent, version.PassThresholdPercent)` against the
   * exact frozen version the attempt is stamped to (exactly at the threshold passes; the comparison
   * is exact decimal with no rounding). TR-B1 settled that way because the ledger is append-only
   * under a SQL trigger, so a verdict a client could assert would be an uncorrectable false
   * qualification. Do not add a `passed` field back: it would be silently ignored, which is precisely
   * the defect this surface used to ship.
   *
   * `personRef` IS BOUND, not merely non-empty. `TrainingPersonBinding.RequireKnownPersonAsync`
   * refuses an id identifying no `WorkforcePerson` with a 400 (`training.validation`). It is an
   * existence check across every person state, estate-wide, and explicitly NOT an employment check.
   * It runs AFTER the store-scoped version resolution, so a cross-store probe still receives the same
   * opaque 404 and this refusal is no existence oracle.
   *
   * Same store-scoped resolution as the assignment: `courseVersionId` from another store is an
   * opaque 404.
   */
  RecordCompletion (storeId, request) {
    return this._mutate('POST', this._base(storeId) + '/completions', request);
  }

  /** #12: the store's certificate vault, ordered by expiry, each with a server-DERIVED status. */
  ListCertificates (storeId) {
    return this._request('GET', this._base(storeId) + '/certificates');
  }

  /**
   * #12: register an externally-issued certificate for a person by value.
   *
   * `personRef` IS BOUND, exactly as on the completion write: `RegisterCertificateAsync` calls
   * `TrainingPersonBinding.RequireKnownPersonAsync`, so an id identifying no `WorkforcePerson` is
   * refused with a 400 and nothing is filed.
   *
   * WHAT IT DOES NOT CHECK is employment. A `WorkforcePerson` is not store-scoped and every state
   * binds — `Invited` is what a certificate filed before the engagement exists looks like, `Archived`
   * is what late filing of historical evidence looks like — so a known person who has never worked
   * at this store is accepted. Nothing built on this method may present the reference as belonging
   * to somebody employed here.
   */
  RegisterCertificate (storeId, request) {
    return this._mutate('POST', this._base(storeId) + '/certificates', request);
  }

  /**
   * #15: what one person HOLDS — competency keys from passing completions, plus their non-expired
   * certificates with validity windows.
   *
   * Possession only. Training never evaluates a role requirement and never issues a verdict, so an
   * absent key means "no fact recorded", never "not qualified".
   */
  GetHoldings (storeId, personRef) {
    return this._request('GET', this._base(storeId) + '/competency/holdings?person=' + encodeURIComponent(personRef));
  }

  /**
   * #17: who has looked at one person's training record in this store, oldest first.
   *
   * OMIT `personRef` TO ASK ABOUT YOURSELF, and mean it. The route resolves an unnamed subject from
   * the caller's own token, and that is the only way a worker reaches it — passing your own id
   * instead would take the store-admin branch, which a worker does not hold, and be refused. So this
   * method sends the parameter only when one is given, rather than sending an empty one.
   *
   * THIS IS THE ONE TRAINING READ A NON-ADMIN CAN MAKE. Everything else on this client needs the
   * route store's manager capability; here the subject of the record is admitted too, on identity
   * alone. A 403 therefore means "you are neither this person nor this store's admin" — it does NOT
   * mean the log is empty, and nothing built on this may say it does.
   *
   * WHAT COMES BACK IS THE LEDGER, NOT A SUMMARY. Each entry carries the stored `eventType`,
   * `actorReference`, `occurredAtUtc` and `payloadSnapshotJson` verbatim; `actorIsSubject` is the
   * only derived field. The actor reference is a user id and is DELIBERATELY not resolved to a name
   * — the server holds an id, and turning it into a colleague's name is a disclosure about the
   * READER that nobody has authorised. Do not join it against a roster here to "improve" the screen.
   *
   * READING IT IS RECORDED. The route appends a `disclosure-log.read` of its own, so a caller must
   * not poll it: every poll is a permanent row in an append-only ledger the subject will read.
   */
  GetDisclosures (storeId, personRef) {
    const query = personRef ? '?personRef=' + encodeURIComponent(personRef) : '';
    return this._request('GET', this._base(storeId) + '/evidence/disclosures' + query);
  }

  _base (storeId) {
    return '/training/stores/' + storeId;
  }
}

export default TrainingStoreService;
