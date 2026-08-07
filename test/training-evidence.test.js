import {
  readEvidence,
  evidenceCompletionRow,
  evidenceCertificateRow,
  auditRow,
  integrityOf,
  integrityFinding,
  TRAINING_STATE_NONE,
  TRAINING_STATE_NO_PASS,
  TRAINING_STATE_PASSED,
  AUDIT_COVERED,
  AUDIT_UNCOVERED,
  LINKAGE_INTACT,
  LINKAGE_BROKEN,
  LINKAGE_UNRESOLVABLE
} from '~/utils/training/evidence'
import { READ_ANSWERED, READ_REFUSED, READ_UNKNOWN } from '~/utils/training/journey'
import { WorkforceApiError } from '~/utils/workforce/api-client'

// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// `utils/training/evidence.js` is 259 lines and was at 0% statements with 101 UNCOVERED BRANCHES on
// trunk `a63c30f`. No jest test loaded it at all — its only two consumers
// (`pages/admin/training-evidence.vue`, `components/admin/training/TrainingEvidenceDocument.vue`)
// are also the only two Training `.vue` files no test ever mounts, and the browser journey that
// walks it has a "DEFECT CHECK" step containing no `expect`. Three independent instruments —
// coverage, never-loaded analysis and the journey census — landed on this one file.
//
// It is not an ordinary list projection. It is the READER FOR A DOCUMENT THAT LEAVES THE BUILDING:
// one named person's training record, produced for somebody outside the venue who decides whether
// that person was trained on named material. Everything on it is either the server's own value
// carried across, or a finding about the record. So the arms below are about the four ways this
// file could quietly lie on a document nobody in the building will re-read before handing it over:
//
//   1. A TIMESTAMP MOVED. Every stamp arrives TWICE — `completedAtUtc` beside
//      `completedAtStoreLocal`, `occurredAtUtc` beside `occurredAtStoreLocal`. Both serialise bare
//      (EF hands column-loaded stamps back `Unspecified`) and `parseApiInstant` reads a bare stamp
//      as UTC, which is right for the first of each pair and WRONG for the second. Reading the
//      wrong half shifts every time on an inspector's document by the store's own offset — two
//      hours in a Norwegian summer — silently, because both parse.
//   2. A REAL VALUE FLATTENED TO "MISSING". A score of 0 is a score. A verdict of `false` is a
//      verdict. A version numbered 0 is a version. Truthiness would print all three as blank.
//   3. UNKNOWN PRINTED AS CLEAN. A document that could not tell us about its own integrity has not
//      told us it is sound, and "no record on file" is not "recorded without a pass".
//   4. A SHAPE THIS BUILD DOES NOT UNDERSTAND RENDERED AS AN EMPTY FILE. The server's own model
//      initialises every collection, so a 200 missing one must read UNKNOWN — never "this store
//      holds no training record for this person", which is itself a finding an inspection acts on.
//
// ---- WHY THESE ASSERTIONS CANNOT PASS VACUOUSLY -----------------------------------------------
//
// Every arm names an exact value, never a presence. The two-hour pair in `SUMMER_*` exists so that
// swapping `completedAtUtc` for `completedAtStoreLocal` — a mutation both fields survive, because
// both parse — produces a different ISO string rather than a different type. The three-state arms
// each assert all three states in one block, so a reader collapsed to two reds on the third rather
// than passing on the two it kept. `integrityFinding` is asserted with `toBe(null)` and
// `toBe(false)` separately, because `null` and `false` are the two answers this function exists to
// keep apart and `toBeFalsy` would accept either.

const PERSON = '77777777-7777-7777-7777-777777777777'

// Oslo, high summer: the store's wall clock runs two hours ahead of UTC. Both halves of the pair
// are bare — this is exactly what the wire carries — so only the field NAME distinguishes them.
const SUMMER_UTC = '2026-06-15T08:30:00'
const SUMMER_STORE_LOCAL = '2026-06-15T10:30:00'

const refusal = code => new WorkforceApiError(403, { code, detail: 'nope' })

/** A complete completion row as the backend's evidence model emits it. */
const fullCompletion = () => ({
  completionId: 'c-1',
  courseId: 'course-1',
  courseTitle: 'Allergener',
  courseVersionId: 'ver-1',
  versionNo: 3,
  contentPagesJson: '[{"h":"Gluten"}]',
  quizJson: '[{"q":"?","a":1}]',
  passThresholdPercent: 80,
  contentHash: 'sha256:abc',
  scorePercent: 92,
  passed: true,
  source: 'SelfService',
  recordedBy: 'actor-9',
  completedAtUtc: SUMMER_UTC,
  completedAtStoreLocal: SUMMER_STORE_LOCAL,
  auditCoverage: AUDIT_COVERED,
  contentHashLinkage: LINKAGE_INTACT
})

const fullCertificate = () => ({
  certificateId: 'cert-1',
  type: 'FoodHygiene',
  issuer: 'Mattilsynet',
  issueDateUtc: '2025-01-02T00:00:00',
  expiryDateUtc: '2027-12-31T00:00:00',
  documentReference: 'doc-42',
  status: 'Valid',
  auditCoverage: AUDIT_COVERED
})

const fullAudit = () => ({
  eventType: 'completion.recorded',
  aggregateType: 'TrainingCompletion',
  aggregateId: 'agg-1',
  actorReference: 'actor-9',
  payloadSnapshotJson: '{"scorePercent":"92"}',
  occurredAtUtc: SUMMER_UTC,
  occurredAtStoreLocal: SUMMER_STORE_LOCAL,
  linkedTo: 'Completion'
})

const fullPayload = (over = {}) => ({
  storeId: 42,
  personRef: PERSON,
  displayName: 'Ada Lovelace',
  personOnFile: true,
  timeZoneId: 'Europe/Oslo',
  timeZoneIsFallback: false,
  trainingState: TRAINING_STATE_PASSED,
  completions: [fullCompletion()],
  certificates: [fullCertificate()],
  auditChain: [fullAudit()],
  integrity: { contentHashLinkage: LINKAGE_INTACT, rowsWithoutAuditEvent: 0 },
  asOfUtc: '2026-06-15T09:00:00Z',
  ...over
})

describe('readEvidence — the four answers a document read can have', () => {
  test('a refusal carrying a training.* code is REFUSED, keeps the code, and produces no document', () => {
    const read = readEvidence(null, refusal('training.forbidden'))
    expect(read.state).toBe(READ_REFUSED)
    expect(read.code).toBe('training.forbidden')
    expect(read.document).toBeNull()
  })

  test('a failure that is not this module\'s is UNKNOWN with no code — never a refusal', () => {
    const read = readEvidence(null, new Error('socket hung up'))
    expect(read.state).toBe(READ_UNKNOWN)
    expect(read.code).toBeNull()
    expect(read.document).toBeNull()
  })

  test('a 200 missing ANY of the four required members reads UNKNOWN, not "nothing on file"', () => {
    // The server's own model initialises every list, so each of these is a shape this build does
    // not understand. Rendering one as an empty document would hand an inspector a finding
    // ("this store holds no training record for this person") the server never made.
    const shapes = [
      undefined,
      null,
      { ...fullPayload(), personRef: undefined },
      { ...fullPayload(), completions: undefined },
      { ...fullPayload(), completions: { length: 0 } },
      { ...fullPayload(), certificates: undefined },
      { ...fullPayload(), certificates: 'none' },
      { ...fullPayload(), auditChain: undefined },
      { ...fullPayload(), auditChain: {} }
    ]
    shapes.forEach((payload) => {
      const read = readEvidence(payload, null)
      expect(read.state).toBe(READ_UNKNOWN)
      expect(read.document).toBeNull()
      expect(read.code).toBeNull()
    })
    expect(shapes).toHaveLength(9)
  })

  test('ANSWERED-AND-EMPTY is a real document: three empty lists, and it is not UNKNOWN', () => {
    const read = readEvidence(fullPayload({
      completions: [],
      certificates: [],
      auditChain: [],
      trainingState: TRAINING_STATE_NONE,
      personOnFile: true
    }), null)

    expect(read.state).toBe(READ_ANSWERED)
    expect(read.document.trainingState).toBe(TRAINING_STATE_NONE)
    expect(read.document.completions).toEqual([])
    expect(read.document.certificates).toEqual([])
    expect(read.document.auditChain).toEqual([])
    // The person exists and was never trained. That is not the same document as an invented id.
    expect(read.document.personOnFile).toBe(true)
  })

  test('an id nobody holds and a person never trained produce the SAME empty lists and DIFFERENT personOnFile', () => {
    const known = readEvidence(fullPayload({ completions: [], certificates: [], auditChain: [], personOnFile: true, displayName: 'Ada Lovelace' }), null)
    const invented = readEvidence(fullPayload({ completions: [], certificates: [], auditChain: [], personOnFile: false, displayName: null }), null)

    expect(known.document.completions).toEqual(invented.document.completions)
    expect(known.document.personOnFile).toBe(true)
    expect(invented.document.personOnFile).toBe(false)
    expect(invented.document.displayName).toBeNull()
  })

  test('the three training states are carried verbatim and never folded into a boolean', () => {
    const stateOf = value => readEvidence(fullPayload({ trainingState: value }), null).document.trainingState
    expect(stateOf(TRAINING_STATE_NONE)).toBe('NoCompletionOnFile')
    expect(stateOf(TRAINING_STATE_NO_PASS)).toBe('RecordedWithoutAPass')
    expect(stateOf(TRAINING_STATE_PASSED)).toBe('RecordedAsPassed')
    // Three distinct strings, not two — the absence of evidence is neither a pass nor a failure.
    expect(new Set([TRAINING_STATE_NONE, TRAINING_STATE_NO_PASS, TRAINING_STATE_PASSED]).size).toBe(3)
    // A non-string (an enum ordinal a future serializer might emit) is not printed as a state.
    expect(readEvidence(fullPayload({ trainingState: 2 }), null).document.trainingState).toBeNull()
  })

  test('the document header carries the store, the zone and whether that zone was a fallback', () => {
    const doc = readEvidence(fullPayload(), null).document
    expect(doc.storeId).toBe(42)
    expect(doc.personRef).toBe(PERSON)
    expect(doc.displayName).toBe('Ada Lovelace')
    expect(doc.timeZoneId).toBe('Europe/Oslo')
    expect(doc.timeZoneIsFallback).toBe(false)
    expect(doc.asOf.toISOString()).toBe('2026-06-15T09:00:00.000Z')

    // `timeZoneIsFallback` is a STRICT `=== true`: a document rendered in a guessed zone must say so,
    // and a truthy-but-not-true value from a future serializer must not read as "the venue's own".
    expect(readEvidence(fullPayload({ timeZoneIsFallback: 'true' }), null).document.timeZoneIsFallback).toBe(false)
    expect(readEvidence(fullPayload({ timeZoneIsFallback: true }), null).document.timeZoneIsFallback).toBe(true)
    // A non-numeric store id is not printed as a store number.
    expect(readEvidence(fullPayload({ storeId: '42' }), null).document.storeId).toBeNull()
    expect(readEvidence(fullPayload({ timeZoneId: '' }), null).document.timeZoneId).toBeNull()
  })

  test('every row of every collection goes through its own mapper — the whole document, not the first row', () => {
    const doc = readEvidence(fullPayload({
      completions: [fullCompletion(), { ...fullCompletion(), completionId: 'c-2', scorePercent: 0, passed: false }],
      certificates: [fullCertificate(), { ...fullCertificate(), certificateId: 'cert-2', expiryDateUtc: null }],
      auditChain: [fullAudit(), { ...fullAudit(), aggregateId: 'agg-2', linkedTo: 'Certificate' }]
    }), null).document

    expect(doc.completions.map(r => r.completionId)).toEqual(['c-1', 'c-2'])
    expect(doc.completions.map(r => r.scorePercent)).toEqual([92, 0])
    expect(doc.certificates.map(r => r.certificateId)).toEqual(['cert-1', 'cert-2'])
    expect(doc.certificates.map(r => r.hasExpiry)).toEqual([true, false])
    expect(doc.auditChain.map(r => r.linkedTo)).toEqual(['Completion', 'Certificate'])
  })
})

describe('evidenceCompletionRow — the row that has to be re-checkable', () => {
  test('the claim and the three inputs it was computed from are all carried', () => {
    const row = evidenceCompletionRow(fullCompletion())
    // The verdict beside the score AND the threshold frozen into the version it was stamped to.
    expect(row.passed).toBe(true)
    expect(row.scorePercent).toBe(92)
    expect(row.passThreshold).toBe(80)
    // The hash beside the three things it was computed over, so a reader can recompute it by hand.
    expect(row.contentHash).toBe('sha256:abc')
    expect(row.contentPages).toBe('[{"h":"Gluten"}]')
    expect(row.quiz).toBe('[{"q":"?","a":1}]')
    // The server's own comparisons, carried and not recomputed.
    expect(row.auditCoverage).toBe(AUDIT_COVERED)
    expect(row.linkage).toBe(LINKAGE_INTACT)
    expect(row.courseTitle).toBe('Allergener')
    expect(row.courseVersionId).toBe('ver-1')
    expect(row.versionNo).toBe(3)
    expect(row.source).toBe('SelfService')
    expect(row.recordedBy).toBe('actor-9')
  })

  test('THE STAMP IS THE UTC HALF. The store-local twin is dropped, not carried unused', () => {
    const row = evidenceCompletionRow(fullCompletion())
    // Two hours apart. Reading the wrong half moves this timestamp on an inspector's document by
    // the store's own offset — and both halves parse, so only the value can tell them apart.
    expect(row.completed.toISOString()).toBe('2026-06-15T08:30:00.000Z')
    expect(row.completed.toISOString()).not.toBe('2026-06-15T10:30:00.000Z')
    // Dropped rather than carried: a field on this object would eventually be printed by somebody.
    expect(Object.keys(row).filter(k => /storelocal/i.test(k))).toEqual([])
    expect(Object.keys(row)).not.toContain('completedAtStoreLocal')
  })

  test('a zero score, a false verdict and a version numbered zero are all REAL and printed as such', () => {
    const row = evidenceCompletionRow({
      ...fullCompletion(),
      scorePercent: 0,
      passed: false,
      versionNo: 0,
      passThresholdPercent: 0
    })
    expect(row.scorePercent).toBe(0)
    expect(row.passed).toBe(false)
    expect(row.versionNo).toBe(0)
    expect(row.passThreshold).toBe(0)
    // …and none of them is the null that means "the document did not say".
    expect(row.scorePercent).not.toBeNull()
    expect(row.passed).not.toBeNull()
    expect(row.versionNo).not.toBeNull()
  })

  test('a value of the wrong TYPE is not printed as a number or a verdict', () => {
    const row = evidenceCompletionRow({
      ...fullCompletion(),
      scorePercent: '92',
      passed: 'true',
      versionNo: '3',
      passThresholdPercent: null
    })
    expect(row.scorePercent).toBeNull()
    expect(row.passed).toBeNull()
    expect(row.versionNo).toBeNull()
    expect(row.passThreshold).toBeNull()
  })

  test('an unresolvable version leaves the frozen material null — a real state, not a failed request', () => {
    const row = evidenceCompletionRow({
      completionId: 'c-9',
      courseId: 'course-9',
      courseTitle: 'Retired course',
      contentPagesJson: null,
      quizJson: null,
      passThresholdPercent: null,
      contentHash: 'sha256:zzz',
      contentHashLinkage: LINKAGE_UNRESOLVABLE,
      auditCoverage: AUDIT_UNCOVERED
    })
    expect(row.contentPages).toBeNull()
    expect(row.quiz).toBeNull()
    expect(row.passThreshold).toBeNull()
    expect(row.linkage).toBe(LINKAGE_UNRESOLVABLE)
    // The hash survives even though there is nothing left to compare it against.
    expect(row.contentHash).toBe('sha256:zzz')
  })

  test('a row written before the ledger covered it names NOBODY, and says so in the server\'s own word', () => {
    const row = evidenceCompletionRow({ ...fullCompletion(), recordedBy: undefined, auditCoverage: AUDIT_UNCOVERED })
    expect(row.recordedBy).toBeNull()
    expect(row.auditCoverage).toBe('NoAuditEventForThisRow')
  })

  test('an absent row maps to an all-null row rather than throwing', () => {
    const row = evidenceCompletionRow(undefined)
    expect(row.completionId).toBeNull()
    expect(row.courseId).toBeNull()
    expect(row.courseTitle).toBeNull()
    expect(row.courseVersionId).toBeNull()
    expect(row.versionNo).toBeNull()
    expect(row.contentHash).toBeNull()
    expect(row.source).toBeNull()
    expect(row.completed).toBeNull()
    expect(row.auditCoverage).toBeNull()
    expect(row.linkage).toBeNull()
    expect(evidenceCompletionRow(null).completionId).toBeNull()
  })
})

describe('evidenceCertificateRow — dates sliced, status never recomputed', () => {
  test('the dates are SLICED to the authored day, never run through a zone', () => {
    const row = evidenceCertificateRow({
      ...fullCertificate(),
      issueDateUtc: '2025-01-02T00:00:00',
      // Local midnight in Oslo, i.e. 23:00 UTC the day before. A conversion would print the 30th.
      expiryDateUtc: '2026-03-31T23:00:00Z'
    })
    expect(row.issueDate).toBe('2025-01-02')
    expect(row.expiryDate).toBe('2026-03-31')
    expect(row.expiryDate).not.toBe('2026-03-30')
    expect(row.hasExpiry).toBe(true)
  })

  test('no expiry is PERMANENTLY VALID — a real fact, and never a missing value', () => {
    const row = evidenceCertificateRow({ ...fullCertificate(), expiryDateUtc: null })
    expect(row.expiryDate).toBeNull()
    expect(row.hasExpiry).toBe(false)
    // …which is a different statement from "the document did not carry an issue date".
    expect(row.issueDate).toBe('2025-01-02')
  })

  test('status is the certificate service\'s projection over the SERVER\'s clock, carried verbatim', () => {
    expect(evidenceCertificateRow({ ...fullCertificate(), status: 'Expired' }).status).toBe('Expired')
    expect(evidenceCertificateRow({ ...fullCertificate(), status: 'ExpiringSoon' }).status).toBe('ExpiringSoon')
    expect(evidenceCertificateRow({ ...fullCertificate(), status: null }).status).toBeNull()
  })

  test('the rest of the row is carried, and an absent row is all-null', () => {
    const row = evidenceCertificateRow(fullCertificate())
    expect(row.certificateId).toBe('cert-1')
    expect(row.type).toBe('FoodHygiene')
    expect(row.issuer).toBe('Mattilsynet')
    expect(row.documentReference).toBe('doc-42')
    expect(row.auditCoverage).toBe(AUDIT_COVERED)

    const empty = evidenceCertificateRow(null)
    expect(empty.certificateId).toBeNull()
    expect(empty.type).toBeNull()
    expect(empty.issuer).toBeNull()
    expect(empty.issueDate).toBeNull()
    expect(empty.expiryDate).toBeNull()
    expect(empty.hasExpiry).toBe(false)
    expect(empty.documentReference).toBeNull()
    expect(empty.status).toBeNull()
    expect(empty.auditCoverage).toBeNull()
  })
})

describe('auditRow — the ledger, verbatim and un-joined', () => {
  test('the actor reference is the id the PII-minimized ledger stores, and is NOT resolved to a name', () => {
    const row = auditRow(fullAudit())
    expect(row.actorReference).toBe('actor-9')
    // Resolving it here would put back exactly what the backend withheld, one layer up, on a
    // document that then leaves the building.
    expect(Object.keys(row)).not.toContain('actorName')
    expect(Object.keys(row)).not.toContain('actorDisplayName')
    expect(Object.keys(row).filter(k => /name/i.test(k))).toEqual([])
  })

  test('THE STAMP IS THE UTC HALF here too; the store-local twin is dropped', () => {
    const row = auditRow(fullAudit())
    expect(row.occurred.toISOString()).toBe('2026-06-15T08:30:00.000Z')
    expect(row.occurred.toISOString()).not.toBe('2026-06-15T10:30:00.000Z')
    expect(Object.keys(row).filter(k => /storelocal/i.test(k))).toEqual([])
  })

  test('linkedTo is the server\'s own answer to which leg of the document the row belongs to', () => {
    expect(auditRow({ ...fullAudit(), linkedTo: 'Certificate' }).linkedTo).toBe('Certificate')
    expect(auditRow({ ...fullAudit(), linkedTo: undefined }).linkedTo).toBeNull()
    const row = auditRow(fullAudit())
    expect(row.eventType).toBe('completion.recorded')
    expect(row.aggregateType).toBe('TrainingCompletion')
    expect(row.aggregateId).toBe('agg-1')
    expect(row.payloadSnapshotJson).toBe('{"scorePercent":"92"}')
  })

  test('an absent row is all-null rather than a throw', () => {
    const row = auditRow(null)
    expect(row.eventType).toBeNull()
    expect(row.aggregateType).toBeNull()
    expect(row.aggregateId).toBeNull()
    expect(row.actorReference).toBeNull()
    expect(row.payloadSnapshotJson).toBeNull()
    expect(row.occurred).toBeNull()
    expect(row.linkedTo).toBeNull()
  })
})

describe('integrityOf — what the document can honestly say about itself', () => {
  test('both halves are carried when both are present and of the right type', () => {
    expect(integrityOf({ contentHashLinkage: LINKAGE_BROKEN, rowsWithoutAuditEvent: 3 }))
      .toEqual({ linkage: 'Broken', rowsWithoutAuditEvent: 3 })
    expect(integrityOf({ contentHashLinkage: LINKAGE_INTACT, rowsWithoutAuditEvent: 0 }))
      .toEqual({ linkage: 'Intact', rowsWithoutAuditEvent: 0 })
  })

  test('an absent or malformed block leaves BOTH null — "did not tell us" is not "told us zero"', () => {
    expect(integrityOf(undefined)).toEqual({ linkage: null, rowsWithoutAuditEvent: null })
    expect(integrityOf(null)).toEqual({ linkage: null, rowsWithoutAuditEvent: null })
    expect(integrityOf({})).toEqual({ linkage: null, rowsWithoutAuditEvent: null })
    // Only one of them may ever be printed as a number, so a string count is refused.
    expect(integrityOf({ contentHashLinkage: LINKAGE_INTACT, rowsWithoutAuditEvent: '0' }))
      .toEqual({ linkage: 'Intact', rowsWithoutAuditEvent: null })
    expect(integrityOf({ contentHashLinkage: 7, rowsWithoutAuditEvent: 2 }))
      .toEqual({ linkage: null, rowsWithoutAuditEvent: 2 })
  })

  test('the combined linkage is the SERVER\'s, under a precedence this file does not re-fold', () => {
    // Broken outranks Unresolvable outranks Intact — and the client never recombines, so whatever
    // the server said arrives unchanged even when the two halves would suggest otherwise.
    expect(integrityOf({ contentHashLinkage: LINKAGE_BROKEN, rowsWithoutAuditEvent: 0 }).linkage).toBe('Broken')
    expect(integrityOf({ contentHashLinkage: LINKAGE_UNRESOLVABLE, rowsWithoutAuditEvent: 0 }).linkage).toBe('Unresolvable')
    expect(readEvidence(fullPayload({ integrity: { contentHashLinkage: LINKAGE_BROKEN, rowsWithoutAuditEvent: 4 } }), null)
      .document.integrity).toEqual({ linkage: 'Broken', rowsWithoutAuditEvent: 4 })
    expect(readEvidence(fullPayload({ integrity: undefined }), null)
      .document.integrity).toEqual({ linkage: null, rowsWithoutAuditEvent: null })
  })
})

describe('integrityFinding — THREE answers, and "unknown" is never "clean"', () => {
  test('a clean document, and only a fully-answered one, reads false', () => {
    expect(integrityFinding({ linkage: LINKAGE_INTACT, rowsWithoutAuditEvent: 0 })).toBe(false)
  })

  test('a positive finding reads true — broken linkage, unresolvable linkage, or an uncovered row', () => {
    expect(integrityFinding({ linkage: LINKAGE_BROKEN, rowsWithoutAuditEvent: 0 })).toBe(true)
    expect(integrityFinding({ linkage: LINKAGE_UNRESOLVABLE, rowsWithoutAuditEvent: 0 })).toBe(true)
    expect(integrityFinding({ linkage: LINKAGE_INTACT, rowsWithoutAuditEvent: 1 })).toBe(true)
    // A finding on either half is a finding on the document.
    expect(integrityFinding({ linkage: LINKAGE_BROKEN, rowsWithoutAuditEvent: 12 })).toBe(true)
  })

  test('A DOCUMENT THAT SAID NOTHING HAS NOT SAID IT IS SOUND — null, and not false', () => {
    // Both halves silent.
    expect(integrityFinding({ linkage: null, rowsWithoutAuditEvent: null })).toBeNull()
    expect(integrityFinding(undefined)).toBeNull()
    expect(integrityFinding(null)).toBeNull()
    // One half answered and clean while the other said nothing: still not a clean bill.
    expect(integrityFinding({ linkage: LINKAGE_INTACT, rowsWithoutAuditEvent: null })).toBeNull()
    expect(integrityFinding({ linkage: null, rowsWithoutAuditEvent: 0 })).toBeNull()
  })

  test('THE CALL SHAPE THE DOCUMENT COMPONENT ACTUALLY USES: no document at all is UNKNOWN, not clean', () => {
    // `components/admin/training/TrainingEvidenceDocument.vue:315` reads
    //     integrityFinding(this.doc && this.doc.integrity)
    // and that `&&` yields `null` — not a normalised block — whenever there is no document. On
    // trunk `a63c30f` that answered `false`, which `integrityLabel` prints as
    // `trn_ev_integrity_clean`: «no finding against this record», for a record nobody had read.
    // Only `integrityOf`'s output reached the guards in a state they recognised.
    const noDocument = null
    expect(integrityFinding(noDocument && noDocument.integrity)).toBeNull()
    const documentWithoutAnIntegrityBlock = { personRef: PERSON }
    expect(integrityFinding(documentWithoutAnIntegrityBlock && documentWithoutAnIntegrityBlock.integrity)).toBeNull()
    // The reachable path — through `integrityOf` — is unchanged by that repair.
    expect(integrityFinding(integrityOf({ contentHashLinkage: LINKAGE_INTACT, rowsWithoutAuditEvent: 0 }))).toBe(false)
    expect(integrityFinding(integrityOf(undefined))).toBeNull()
  })

  test('null and false are DIFFERENT answers, asserted apart so neither can stand in for the other', () => {
    const unknown = integrityFinding({ linkage: LINKAGE_INTACT, rowsWithoutAuditEvent: null })
    const clean = integrityFinding({ linkage: LINKAGE_INTACT, rowsWithoutAuditEvent: 0 })
    expect(unknown).toBeNull()
    expect(clean).toBe(false)
    expect(unknown).not.toBe(clean)
    // Three distinct answers over the whole input space this function is given.
    const answers = [
      integrityFinding({ linkage: LINKAGE_BROKEN, rowsWithoutAuditEvent: 0 }),
      integrityFinding({ linkage: LINKAGE_INTACT, rowsWithoutAuditEvent: 0 }),
      integrityFinding({ linkage: null, rowsWithoutAuditEvent: null })
    ]
    expect(answers).toEqual([true, false, null])
  })

  test('it reads the block integrityOf produced, so the two agree end to end on a real document', () => {
    const doc = readEvidence(fullPayload({ integrity: { contentHashLinkage: LINKAGE_INTACT } }), null).document
    // The server sent a linkage and no count. The document must not say it is clean.
    expect(doc.integrity).toEqual({ linkage: 'Intact', rowsWithoutAuditEvent: null })
    expect(integrityFinding(doc.integrity)).toBeNull()

    const sound = readEvidence(fullPayload(), null).document
    expect(integrityFinding(sound.integrity)).toBe(false)

    const broken = readEvidence(fullPayload({ integrity: { contentHashLinkage: LINKAGE_BROKEN, rowsWithoutAuditEvent: 2 } }), null).document
    expect(integrityFinding(broken.integrity)).toBe(true)
  })
})
