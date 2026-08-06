// The Training & Internkontroll half of the fixture backend.
//
// The module's one journey is "a course becomes evidence", and the only step of it that proves the
// other four did anything is the last: a completion filed against a FROZEN version, graded by the
// SERVER against that version's own threshold, and readable afterwards as a possession.
//
// WHAT IT HOLDS OF THE CONTRACT, so a green journey means these refusals did NOT fire:
//
//   • THE COMPLETION CARRIES NO VERDICT AND THIS FIXTURE IGNORES ONE IF IT ARRIVES. TR-B1 settled
//     that `RecordTrainingCompletionRequest` is `PersonRef` / `CourseVersionId` / `ScorePercent` and
//     nothing else, and the server writes `Passed = IsPass(score, version.PassThresholdPercent)`
//     against the exact frozen version. A `passed` field on the wire is silently discarded here for
//     the same reason it is discarded there — the ledger is append-only under a SQL trigger, so a
//     verdict a client could assert is an uncorrectable false qualification. The journey files 55
//     against a threshold of 80 and asserts the row comes back NOT PASSED; if the UI ever started
//     deciding, that assertion is what catches it.
//   • `personRef` IS BOUND. `TrainingPersonBinding.RequireKnownPersonAsync` refuses an id naming no
//     `WorkforcePerson` with a 400 `training.validation` — an existence check across every person
//     state, estate-wide, and explicitly NOT an employment check. It runs AFTER the store-scoped
//     version resolution, so a cross-store probe still gets the opaque 404 and this is no oracle.
//   • A COMPLETION MAY NOT BE RECORDED AGAINST A DRAFT (`training.validation`), and only a PUBLISHED
//     version may be ASSIGNED. Those are two different sets — a Retired version is still recordable,
//     because what a completion needs is a frozen hash and retiring freezes further — and the page's
//     two pickers are built from the two different filters.
//   • PUBLISHING FREEZES. A second publish of the same version is `training.course-version-immutable`.
//   • Every mutation needs an `Idempotency-Key`; the shared guard in `api-server.js` enforces it.
//   • THE EVIDENCE READ (#16) WRITES. It is the one GET on the surface that appends to the ledger,
//     because asking for a named person's training record is itself a disclosure of personal data.
//     The row is appended AFTER the document is assembled and only on the answered path, so a refused
//     read records nothing — and the disclosures never appear inside the document's own audit chain,
//     which is about the completion and certificate ROWS and is not an access log. All three are
//     backend properties (`TrainingEvidenceService`, pinned by `TrainingEvidenceReadTests`), and a
//     fixture that answered the document without recording the read would let the page print
//     «opening this is recorded» and stay green with nothing behind the sentence.
//
// WHAT IT IS NOT: it holds no quiz content model (nothing in the estate authors one — §5.2 does not
// exist in this wave, which is why every completion filed here is `ManagerRecorded`), and no
// certificate expiry horizon, because TR-B3 — whether a stored expiry denotes UTC or store-local
// midnight — is an open ruling and a fixture that picked an answer would be asserting it.

const world = require('./world');

/**
 * The content hash, over the exact snapshot being published.
 *
 * A real hash is not the point; DETERMINISM is. The completion row is stamped with the version's
 * hash and the journey matches the two against each other on screen, so the value has to be stable
 * across the read that shows the version and the read that shows the completion.
 */
function contentHash (contentPagesJson, quizJson, threshold) {
  const material = String(contentPagesJson || '') + '|' + String(quizJson || '') + '|' + String(threshold);
  let h1 = 0x811C9DC5;
  let h2 = 0x01000193;
  for (let i = 0; i < material.length; i++) {
    h1 = ((h1 ^ material.charCodeAt(i)) * 16777619) >>> 0;
    h2 = ((h2 + material.charCodeAt(i) * (i + 7)) * 2654435761) >>> 0;
  }
  return ('00000000' + h1.toString(16)).slice(-8) + ('00000000' + h2.toString(16)).slice(-8);
}

function stamp () {
  return new Date().toISOString().slice(0, 19) + 'Z';
}

/** A column-loaded stamp. EF hands these back `Unspecified` and they serialise BARE — see world.js. */
function bare () {
  return new Date().toISOString().slice(0, 19);
}

function fresh () {
  return {
    seq: 0,
    courses: {},
    assignments: [],
    completions: [],
    certificates: [],
    // THE APPEND-ONLY LEDGER, modelled because the evidence read (#16) is a projection OF it and
    // would otherwise be a document about nothing. One row per privileged mutation, plus one per
    // evidence read — and the two kinds are told apart by `eventType`, exactly as the backend's
    // `TrainingAuditWriter` does. Nothing ever removes a row from this array, which is the property
    // the SQL trigger enforces there and the reason a retake is a second row rather than an edit.
    auditEvents: []
  };
}

/**
 * A GUID-SHAPED id, because every id and every `*Ref` on this surface binds to a `Guid` server-side
 * — `TrainingReferenceField` refuses anything else before sending, so an id shaped like `course-1`
 * would be rejected by the client and would never reach a route.
 */
function nextId (state) {
  state.seq += 1;
  return ('00000000' + state.seq).slice(-8) + '-0000-4000-8000-000000000000';
}

function known (personRef) {
  return world.STAFF.some(s => s.workforcePersonId === String(personRef || '').toLowerCase());
}

function staffMember (personRef) {
  return world.STAFF.find(s => s.workforcePersonId === String(personRef || '').toLowerCase()) || null;
}

// ---- the ledger ---------------------------------------------------------------------------------
//
// `TrainingAuditWriter.Append` STAGES a row into the caller's own unit of work, so the audit row and
// the domain row commit together or not at all. Here that is one push at the end of a handler that
// has already decided to answer 200, which has the same observable consequence: a refused write
// leaves no ledger row.
//
// THE SEMANTIC DELTA IS SERIALISED KEY-SORTED AND ITS VALUES ARE STRINGS — both are the backend's
// contract, not incidental. `TrainingEvidenceReadTests` asserts a disclosure's `PayloadSnapshotJson`
// byte-for-byte against `{"disclosedCertificates":"1","disclosedCompletions":"1","personRef":"…"}`,
// and `utils/training/disclosure.js` reads the counts back out as strings for exactly this reason.
// A fixture that emitted numbers, or emitted keys in insertion order, would let a client ship that
// only works against itself.
function appendAudit (state, ctx, storeId, eventType, aggregateType, aggregateId, delta) {
  const sorted = {};
  Object.keys(delta).sort().forEach((key) => { sorted[key] = String(delta[key]); });
  state.auditEvents.push({
    storeId: Number(storeId),
    eventType,
    aggregateType,
    aggregateId: String(aggregateId),
    // The caller's own id. `TrainingEvidenceService.CurrentUserId` REFUSES rather than defaulting
    // when it cannot resolve one, so there is no such thing as an unattributed row here either.
    actorReference: (ctx.caller && ctx.caller.id) || null,
    payloadSnapshotJson: JSON.stringify(sorted),
    occurredAtUtc: stamp()
  });
}

/**
 * A UTC stamp rendered as the store's own wall clock, which is what `*StoreLocal` denotes.
 *
 * It exists so this fixture answers a document where the two halves of every stamp pair DIFFER —
 * Europe/Oslo is an hour or two ahead of UTC all year. That difference is load-bearing evidence: the
 * client deliberately parses only the `*Utc` half (a bare `*StoreLocal` fed to `parseApiInstant`
 * would be read as UTC and shift every timestamp on an inspector's document by the store's offset),
 * and a fixture that emitted the two identically could not tell the correct wiring from the bug.
 */
function storeLocal (utcStamp) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: world.TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(new Date(utcStamp.endsWith('Z') ? utcStamp : utcStamp + 'Z'));
  return parts.replace(' ', 'T');
}

function versionsOf (course) {
  return course.versions.map(v => ({
    courseVersionId: v.courseVersionId,
    versionNo: v.versionNo,
    state: v.state,
    passThresholdPercent: v.passThresholdPercent,
    contentHash: v.contentHash,
    publishedAtUtc: v.publishedAtUtc
  }));
}

/**
 * The version summaries the course LIST carries, newest number first.
 *
 * `TrainingCourseService.ListCoursesAsync` projects these off the same rows it counts, and no
 * content: the list is read for the whole catalogue and a picker does not need the pages somebody
 * was tested against. A list without them forces a caller to fetch endpoint 3 once per course before
 * it can offer anything, which is why the admin surface could only ever offer the expanded course's
 * versions — and said the store had none whenever nothing was expanded.
 */
function versionSummariesOf (course) {
  return course.versions
    .slice()
    .sort((a, b) => b.versionNo - a.versionNo)
    .map(v => ({
      courseVersionId: v.courseVersionId,
      versionNo: v.versionNo,
      state: v.state,
      passThresholdPercent: v.passThresholdPercent
    }));
}

function courseRow (course) {
  return {
    courseId: course.courseId,
    title: course.title,
    category: course.category,
    competencyKey: course.competencyKey,
    isActive: true,
    versionCount: course.versions.length,
    hasPublishedVersion: course.versions.some(v => v.state === 'Published'),
    versions: versionSummariesOf(course),
    createdAtUtc: course.createdAtUtc
  };
}

function findVersion (state, courseVersionId) {
  for (const courseId of Object.keys(state.courses)) {
    const course = state.courses[courseId];
    const version = course.versions.find(v => v.courseVersionId === courseVersionId);
    if (version) { return { course, version }; }
  }
  return null;
}

/**
 * A completion, named. `TrainingCompletionService.ListCompletionsAsync` resolves the title and the
 * version number on the READ, so this does too rather than stamping them at write time — a fixture
 * that snapshotted them would answer a question the server answers differently and the journey would
 * be proving the fixture.
 *
 * Resolved through the version's OWN id, never through the course's current version: a completion
 * filed against v1 must keep saying v1 after v2 is published. The server's join is OUTER for the
 * same reason this returns nulls instead of dropping the row — the ledger references its course by
 * value, so an unresolvable one is a state and not an error.
 */
function named (state, completion) {
  const found = findVersion(state, completion.courseVersionId);
  return Object.assign({}, completion, {
    courseTitle: found ? found.course.title : null,
    versionNo: found ? found.version.versionNo : null
  });
}

// ---- the two flags that actually gate something -------------------------------------------------
//
// READ-ONLY, NOT DARK, and that is Training's own shape rather than Margin's. `training-client.js`
// documents `training.flag-disabled-read-only` as «409: the area's feature flag is off on a store
// that IS visible — reads answer, writes do not», and says in the same comment that this is «the
// reason `GET /context`'s flag map is worth rendering». So a store with the flags down still lists
// its courses, its versions and its completions — an inspector's evidence does not disappear because
// a switch was thrown — and every WRITE answers 409 naming the flag.
//
// WHICH WRITE SITS BEHIND WHICH is read off the operator catalog's own titles rather than guessed:
// `training.setup` is «Setup (courses/certificates)» and `training.assignments` is «Assignments».
// Courses, versions, publication and certificates are setup; assignments and the completions filed
// against them are the other.
//
// THE VALUES ARE RESOLVED FROM THE SHARED OVERRIDE STORE. This file used to answer a hard-coded
// `world.TRAINING_FLAGS` map with `training.setup: true` in it, which meant every Training journey
// ran against a store nobody can have: both flags are deny-closed, so on a real venue the first
// course create would have answered 409. That is the fixture-models-no-flags defect, and reading
// `ctx.flagEffective` is the fix — a journey now turns the switch on through the operator screen and
// this module reads what it wrote.
const SETUP_FLAG = 'training.setup';
const ASSIGNMENTS_FLAG = 'training.assignments';

/**
 * The five flags Training DECLARES and WITHHOLDS from the operator catalog.
 *
 * `training.onboarding`, `training.checklists`, `training.deviations`, `training.competency-seam`
 * and `training.reminders` change the outcome of no request, and are withheld for exactly that
 * reason: a flag an operator can flip while nothing reads it is a lever that lies. They are reported
 * on the context read anyway — a flag ABSENT from that map is `unknown`, which is a different claim
 * from `off` — and they are reported false, because nothing turns them on.
 */
const WITHHELD_FLAGS = {
  'training.onboarding': false,
  'training.checklists': false,
  'training.deviations': false,
  'training.competency-seam': false,
  'training.reminders': false
};

/** 409 naming the flag, the way `TRAINING_FLAG_DISABLED_READ_ONLY` reaches the page's banner. */
function flagOff (ctx, flagKey) {
  ctx.problem(409, 'training.flag-disabled-read-only',
    'The ' + flagKey + ' feature flag is off for this store; this area is read-only.', { flag: flagKey });
  return true;
}

function route (ctx) {
  const { method, body, url } = ctx;
  const state = ctx.state.training;

  const match = /^\/training\/stores\/([^/]+)(\/.*)?$/.exec(ctx.path);
  if (!match) { return false; }
  const rest = match[2] || '';
  const storeId = match[1];

  const setupOn = ctx.flagEffective(storeId, SETUP_FLAG);
  const assignmentsOn = ctx.flagEffective(storeId, ASSIGNMENTS_FLAG);

  // ---- #1 the gate ------------------------------------------------------------------------------
  //
  // The ONE read whose refusal is informative. Past it every refusal is opaque on purpose: the same
  // 404 for absent / another store's / never enabled, and the same 403 for a store the caller does
  // not hold and one that does not exist.
  if (rest === '/context' && method === 'GET') {
    ctx.send(200, {
      storeId: Number(match[1]),
      capabilities: ['TrainingManager'],
      timeZone: { id: world.TIME_ZONE, isFallback: false },
      featureFlags: Object.assign({}, WITHHELD_FLAGS, {
        [SETUP_FLAG]: setupOn,
        [ASSIGNMENTS_FLAG]: assignmentsOn
      }),
      // TOP-LEVEL AND A BOOLEAN. `TrainingContextPanel` reads `context.competencySeamBound`, not a
      // nested `competencySeam.bound` — this file used to send the nested shape, and the panel
      // rendered the seam as «Ukjent» while the fixture believed it had said «Koblet». A journey
      // asserting the seam is bound would have been asserting against a field nothing reads.
      competencySeamBound: true
    });
    return true;
  }

  // Every WRITE, gated once. Listed as a table rather than spelled at each of the seven call sites,
  // which is how the seven would drift apart — and a write this table does not name reaches its
  // handler ungated, which is a visible omission rather than a silent one.
  if (method !== 'GET') {
    const setupWrite = rest === '/courses' || rest === '/certificates' ||
      /^\/courses\/[^/]+\/versions$/.test(rest) ||
      /^\/courses\/[^/]+\/versions\/\d+\/publish$/.test(rest);
    const assignmentWrite = rest === '/assignments' || rest === '/completions' ||
      /^\/assignments\/[^/]+$/.test(rest);
    if (setupWrite && !setupOn) { return flagOff(ctx, SETUP_FLAG); }
    if (assignmentWrite && !assignmentsOn) { return flagOff(ctx, ASSIGNMENTS_FLAG); }
  }

  // ---- #2/#3/#4/#6 courses and versions ---------------------------------------------------------
  if (rest === '/courses' && method === 'GET') {
    ctx.send(200, {
      courses: Object.keys(state.courses).map(id => courseRow(state.courses[id])),
      asOfUtc: stamp()
    });
    return true;
  }

  if (rest === '/courses' && method === 'POST') {
    const title = ((body && body.title) || '').trim();
    if (!title) { return refuse(ctx, 400, 'training.validation', 'A course needs a title.'); }
    const courseId = nextId(state);
    state.courses[courseId] = {
      courseId,
      title,
      category: (body && body.category) || null,
      competencyKey: (body && body.competencyKey) || null,
      createdAtUtc: bare(),
      versions: []
    };
    ctx.send(200, Object.assign({ versions: [] }, courseRow(state.courses[courseId])));
    return true;
  }

  const courseRoute = /^\/courses\/([^/]+)(\/.*)?$/.exec(rest);
  if (courseRoute) {
    const course = state.courses[decodeURIComponent(courseRoute[1])] || null;
    const tail = courseRoute[2] || '';
    if (!course) { return refuse(ctx, 404, 'training.not-found', 'No such course.'); }

    if (!tail && method === 'GET') {
      ctx.send(200, Object.assign({}, courseRow(course), { versions: versionsOf(course) }));
      return true;
    }

    if (tail === '/versions' && method === 'POST') {
      const threshold = body && body.passThresholdPercent;
      if (!Number.isInteger(threshold) || threshold < 0 || threshold > 100) {
        return refuse(ctx, 400, 'training.validation', 'The pass threshold must be between 0 and 100.');
      }
      const version = {
        courseVersionId: nextId(state),
        // SERVER-ASSIGNED (max + 1), never sent by the client.
        versionNo: course.versions.length + 1,
        state: 'Draft',
        passThresholdPercent: threshold,
        contentPagesJson: (body && body.contentPagesJson) || null,
        quizJson: (body && body.quizJson) || null,
        // A draft has no frozen hash: the hash is minted over the exact snapshot at PUBLISH, and one
        // computed earlier would be a claim about content that can still change.
        contentHash: null,
        publishedAtUtc: null
      };
      course.versions.push(version);
      ctx.send(200, Object.assign({}, courseRow(course), { versions: versionsOf(course) }));
      return true;
    }

    const publish = /^\/versions\/(\d+)\/publish$/.exec(tail);
    if (publish && method === 'POST') {
      // Addressed by version NUMBER, not by id — the route is `versions/{versionNo:int}/publish`, and
      // an id here would 404 opaquely and read as a missing course.
      const version = course.versions.find(v => v.versionNo === Number(publish[1]));
      if (!version) { return refuse(ctx, 404, 'training.not-found', 'No such version.'); }
      if (version.state !== 'Draft') {
        return refuse(ctx, 409, 'training.course-version-immutable',
          'A published version is immutable; a change is a new version.');
      }
      version.state = 'Published';
      version.publishedAtUtc = bare();
      version.contentHash = contentHash(version.contentPagesJson, version.quizJson, version.passThresholdPercent);
      ctx.send(200, Object.assign({}, courseRow(course), { versions: versionsOf(course) }));
      return true;
    }
  }

  // ---- #8/#9 assignments ------------------------------------------------------------------------
  if (rest === '/assignments' && method === 'GET') {
    ctx.send(200, { assignments: state.assignments.slice(), asOfUtc: stamp() });
    return true;
  }

  if (rest === '/assignments' && method === 'POST') {
    const found = findVersion(state, (body && body.courseVersionId) || '');
    if (!found) { return refuse(ctx, 404, 'training.not-found', 'No such course version.'); }
    if (found.version.state !== 'Published') {
      return refuse(ctx, 400, 'training.validation', 'Only a published course version can be assigned.');
    }
    const scope = (body && body.scope) || null;
    // ValidateScope checks only that exactly one reference is set for the chosen scope. NEITHER
    // reference is bound — unlike the two evidence writes below — and the panel's copy says so.
    if ((scope === 'Role' && !body.roleRef) || (scope === 'Person' && !body.personRef)) {
      return refuse(ctx, 400, 'training.validation', 'The scope and its reference disagree.');
    }
    const assignment = {
      assignmentId: nextId(state),
      courseVersionId: found.version.courseVersionId,
      versionNo: found.version.versionNo,
      courseTitle: found.course.title,
      scope,
      roleRef: (body && body.roleRef) || null,
      personRef: (body && body.personRef) || null,
      dueDateUtc: (body && body.dueDateUtc) || null,
      assignedByReference: 'user-manager',
      createdAtUtc: bare()
    };
    state.assignments.push(assignment);
    ctx.send(200, assignment);
    return true;
  }

  const revoke = /^\/assignments\/([^/]+)$/.exec(rest);
  if (revoke && method === 'DELETE') {
    const id = decodeURIComponent(revoke[1]);
    const before = state.assignments.length;
    state.assignments = state.assignments.filter(a => a.assignmentId !== id);
    if (state.assignments.length === before) { return refuse(ctx, 404, 'training.not-found', 'No such assignment.'); }
    ctx.send(204, undefined);
    return true;
  }

  // ---- #10/#11 completions ----------------------------------------------------------------------
  if (rest === '/completions' && method === 'GET') {
    ctx.send(200, { completions: state.completions.map(c => named(state, c)), asOfUtc: stamp() });
    return true;
  }

  if (rest === '/completions' && method === 'POST') {
    const found = findVersion(state, (body && body.courseVersionId) || '');
    // Store-scoped resolution FIRST, so a cross-store probe gets the opaque 404 before the person
    // check can turn into an existence oracle.
    if (!found) { return refuse(ctx, 404, 'training.not-found', 'No such course version.'); }
    if (found.version.state === 'Draft') {
      return refuse(ctx, 400, 'training.validation', 'A completion cannot be recorded against a draft course version.');
    }
    const score = body && body.scorePercent;
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return refuse(ctx, 400, 'training.validation', 'The score must be between 0 and 100.');
    }
    if (!known(body && body.personRef)) {
      return refuse(ctx, 400, 'training.validation', 'The person reference does not identify a known person.');
    }

    const completion = {
      completionId: nextId(state),
      personRef: String(body.personRef).toLowerCase(),
      courseId: found.course.courseId,
      courseVersionId: found.version.courseVersionId,
      scorePercent: score,
      // THE SERVER'S VERDICT, derived here and nowhere else. Exact decimal comparison, no rounding;
      // exactly at the threshold passes.
      passed: score >= found.version.passThresholdPercent,
      versionContentHash: found.version.contentHash,
      // No production code writes `Quiz`: the self-service surface does not exist in this wave.
      source: 'ManagerRecorded',
      completedAtUtc: bare()
    };
    // APPEND-ONLY. A retake is a second row; the first one survives, which is the whole reason the
    // ledger is not an upsert.
    state.completions.push(completion);
    // …and the ledger row that makes this completion say WHO recorded it. `TrainingCompletion`
    // carries no recorder column, so the evidence read recovers `recordedBy` from here and from
    // nowhere else — a completion filed without this row would come back naming nobody, which is
    // precisely the `NoAuditEventForThisRow` finding the document reports.
    appendAudit(state, ctx, storeId, 'completion.recorded', 'TrainingCompletion', completion.completionId, {
      personRef: completion.personRef,
      courseVersionId: completion.courseVersionId,
      scorePercent: completion.scorePercent,
      passed: completion.passed
    });
    ctx.send(200, named(state, completion));
    return true;
  }

  // ---- #12 certificates -------------------------------------------------------------------------
  if (rest === '/certificates' && method === 'GET') {
    ctx.send(200, { certificates: state.certificates.slice(), asOfUtc: stamp() });
    return true;
  }

  if (rest === '/certificates' && method === 'POST') {
    if (!((body && body.type) || '').trim()) {
      return refuse(ctx, 400, 'training.validation', 'A certificate needs a type.');
    }
    if (!known(body && body.personRef)) {
      return refuse(ctx, 400, 'training.validation', 'The person reference does not identify a known person.');
    }
    const certificate = {
      certificateId: nextId(state),
      personRef: String(body.personRef).toLowerCase(),
      type: body.type.trim(),
      issuer: body.issuer || null,
      issueDateUtc: body.issueDateUtc || null,
      expiryDateUtc: body.expiryDateUtc || null,
      // DERIVED server-side over the expiry and the server's own clock, and never recomputed by a
      // browser whose clock may disagree.
      status: body.expiryDateUtc ? 'Valid' : 'Valid',
      documentReference: body.documentReference || null,
      createdAtUtc: bare()
    };
    state.certificates.push(certificate);
    // The type and the issuer are ON the allowlist for this event (they are what was registered);
    // the document reference is NOT, and is deliberately absent — a ledger that restated the evidence
    // it recorded would put a second copy of it somewhere a reader of the first has no reason to look.
    appendAudit(state, ctx, storeId, 'certificate.registered', 'TrainingCertificate', certificate.certificateId, {
      personRef: certificate.personRef,
      type: certificate.type
    });
    ctx.send(200, certificate);
    return true;
  }

  // ---- #16 the evidence document ----------------------------------------------------------------
  //
  // THE ONE READ ON THIS SURFACE THAT WRITES, and the reason it is worth modelling here rather than
  // stubbing: the whole point of the route is that asking for a named person's training record is
  // itself a disclosure, so the server appends an `evidence.read` row and commits it in the same
  // request (`TrainingEvidenceService.RecordDisclosureAsync` → `SaveChangesAsync`). A fixture that
  // answered the document without recording the read would let a page print «opening this is
  // recorded» and be green while the control behind the sentence did nothing.
  //
  // THE DISCLOSURE IS COMMITTED AFTER THE DOCUMENT IS ASSEMBLED, and both refusals below return
  // before that point — because a request the gate turned away discloses nothing and must record
  // nothing. `TrainingEvidenceReadTests.A_refused_read_writes_no_disclosure` pins that on the server,
  // with a positive control so the emptiness cannot be a writer that never works; the same ordering
  // is what makes it true here.
  //
  // NOTHING IS RECOMPUTED ON THE WAY OUT. `passed` is the verdict written at recording time and
  // `status` is the certificate projection — both copied off the stored row. What IS derived here is
  // only what the backend derives at read time too: the audit coverage, the hash linkage, and the
  // three-state training state, all of them comparisons over rows this file already holds.
  if (rest === '/evidence' && method === 'GET') {
    const personRef = String(url.searchParams.get('personRef') || '').toLowerCase();
    if (!personRef) {
      // The CONTROLLER's own guard, before the service is reached — and it is a `ModuleProblem`,
      // which carries no `training.*` code at all. The page must land on its unknown sentence rather
      // than on a Training-specific one, so this must not be given a code it does not have.
      ctx.problem(400, null, 'A personRef query parameter is required for the evidence read.');
      return true;
    }

    const person = staffMember(personRef);
    const completions = state.completions.filter(c => c.personRef === personRef);
    const certificates = state.certificates.filter(c => c.personRef === personRef);
    const rowIds = completions.map(c => c.completionId).concat(certificates.map(c => c.certificateId));

    // Only the events naming THIS document's rows, which is why the disclosures appended by earlier
    // reads never appear in it: they are keyed to the PERSON, not to a completion or a certificate.
    // `TrainingEvidenceReadTests` asserts that absence directly — the chain is the provenance of the
    // evidence, not a record of who has seen it, and a surface that conflated the two would present
    // an access log as a training record.
    const chain = state.auditEvents
      .filter(e => e.storeId === Number(storeId) && rowIds.includes(e.aggregateId))
      .slice()
      .sort((a, b) => (a.occurredAtUtc < b.occurredAtUtc ? -1 : a.occurredAtUtc > b.occurredAtUtc ? 1 : 0));

    const coverageOf = id => (state.auditEvents.some(e => e.aggregateId === id) ? 'Covered' : 'NoAuditEventForThisRow');
    const recordedByOf = (id) => {
      const event = state.auditEvents.find(e => e.aggregateId === id);
      return event ? event.actorReference : null;
    };

    const completionRows = completions.map((c) => {
      const found = findVersion(state, c.courseVersionId);
      const version = found ? found.version : null;
      return {
        completionId: c.completionId,
        courseId: c.courseId,
        courseTitle: found ? found.course.title : null,
        courseVersionId: c.courseVersionId,
        versionNo: version ? version.versionNo : null,
        // THE FROZEN MATERIAL, printed so the hash beside it can be recomputed by hand. This is the
        // whole difference between an evidence document and a report: an inspector does not have to
        // believe the hash, they can re-derive it from these three fields.
        contentPagesJson: version ? version.contentPagesJson : null,
        quizJson: version ? version.quizJson : null,
        passThresholdPercent: version ? version.passThresholdPercent : null,
        // The hash the COMPLETION froze, not the version's current one — comparing the two is the
        // linkage below, and reading both off the same place would make that comparison vacuous.
        contentHash: c.versionContentHash,
        scorePercent: c.scorePercent,
        passed: c.passed,
        source: c.source,
        recordedBy: recordedByOf(c.completionId),
        completedAtUtc: c.completedAtUtc,
        completedAtStoreLocal: storeLocal(c.completedAtUtc),
        auditCoverage: coverageOf(c.completionId),
        contentHashLinkage: !version
          ? 'Unresolvable'
          : (version.contentHash === c.versionContentHash ? 'Intact' : 'Broken')
      };
    });

    const certificateRows = certificates.map(c => ({
      certificateId: c.certificateId,
      type: c.type,
      issuer: c.issuer,
      issueDateUtc: c.issueDateUtc,
      expiryDateUtc: c.expiryDateUtc,
      documentReference: c.documentReference,
      status: c.status,
      auditCoverage: coverageOf(c.certificateId)
    }));

    // Broken outranks Unresolvable outranks Intact — a precedence a weaker answer can never win,
    // because the document's own summary must not be able to report clean while a row underneath it
    // is not.
    const linkages = completionRows.map(c => c.contentHashLinkage);
    const combined = linkages.includes('Broken')
      ? 'Broken'
      : (linkages.includes('Unresolvable') ? 'Unresolvable' : 'Intact');

    const document = {
      storeId: Number(storeId),
      personRef,
      // NULL when the id names nobody. An invented Guid and a person who was never trained produce
      // the same empty document, so the two are separated HERE — otherwise a manager could hand over
      // an empty file as evidence about a colleague it does not describe.
      displayName: person ? person.displayName : null,
      personOnFile: !!person,
      timeZoneId: world.TIME_ZONE,
      timeZoneIsFallback: false,
      // Three states, never two: no record is not a failure and not a pass.
      trainingState: completionRows.length === 0
        ? 'NoCompletionOnFile'
        : (completionRows.some(c => c.passed) ? 'RecordedAsPassed' : 'RecordedWithoutAPass'),
      completions: completionRows,
      certificates: certificateRows,
      auditChain: chain.map(e => ({
        eventType: e.eventType,
        aggregateType: e.aggregateType,
        aggregateId: e.aggregateId,
        actorReference: e.actorReference,
        payloadSnapshotJson: e.payloadSnapshotJson,
        occurredAtUtc: e.occurredAtUtc,
        occurredAtStoreLocal: storeLocal(e.occurredAtUtc),
        linkedTo: completions.some(c => c.completionId === e.aggregateId) ? 'completion' : 'certificate'
      })),
      integrity: {
        contentHashLinkage: combined,
        rowsWithoutAuditEvent:
          completionRows.filter(c => c.auditCoverage === 'NoAuditEventForThisRow').length +
          certificateRows.filter(c => c.auditCoverage === 'NoAuditEventForThisRow').length
      },
      asOfUtc: stamp()
    };

    // The counts, never the evidence. A disclosure event that restated a score or a certificate type
    // would put the record into a second ledger — one whose readers came for an access log.
    appendAudit(state, ctx, storeId, 'evidence.read', 'TrainingEvidence', personRef, {
      personRef,
      disclosedCompletions: completionRows.length,
      disclosedCertificates: certificateRows.length
    });

    ctx.send(200, document);
    return true;
  }

  // ---- #15 holdings -----------------------------------------------------------------------------
  if (rest === '/competency/holdings' && method === 'GET') {
    const person = String(url.searchParams.get('person') || '').toLowerCase();
    // POSSESSION ONLY. An absent key means "no fact recorded", never "not qualified" — Training
    // never evaluates a requirement and never issues a verdict.
    const keys = state.completions
      .filter(c => c.personRef === person && c.passed)
      .map(c => (state.courses[c.courseId] || {}).competencyKey)
      .filter(Boolean);
    ctx.send(200, {
      personRef: person,
      heldCompetencyKeys: Array.from(new Set(keys)),
      certificates: state.certificates
        .filter(c => c.personRef === person)
        .map(c => ({ type: c.type, issuer: c.issuer, issueDateUtc: c.issueDateUtc, expiryDateUtc: c.expiryDateUtc, status: c.status })),
      asOfUtc: stamp()
    });
    return true;
  }

  return false;
}

function refuse (ctx, status, code, detail) {
  ctx.problem(status, code, detail);
  return true;
}

module.exports = { fresh, route };
