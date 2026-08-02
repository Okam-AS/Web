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
    certificates: []
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

function courseRow (course) {
  return {
    courseId: course.courseId,
    title: course.title,
    category: course.category,
    competencyKey: course.competencyKey,
    isActive: true,
    versionCount: course.versions.length,
    hasPublishedVersion: course.versions.some(v => v.state === 'Published'),
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
    ctx.send(200, { completions: state.completions.slice(), asOfUtc: stamp() });
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
    ctx.send(200, completion);
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
    ctx.send(200, certificate);
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
