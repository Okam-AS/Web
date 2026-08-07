// Reading the internkontroll evidence document (#16) into something a screen can render.
//
// This is not another list projection. Every other Training read on this surface feeds a WORKING
// screen — a table to act on, a form to file against — and the honest thing for those is to show the
// venue what it has. This one feeds a document that leaves the building: somebody outside the venue
// reads it and decides whether a named human was trained on a named content. So the rules are
// stricter in one specific direction.
//
// ---- NOTHING HERE DERIVES A CLAIM. NOT ONE. ----------------------------------------------------
//
// The server prints, for every claim it makes, the raw values the claim was computed from:
//
//   the verdict   `passed`, beside `scorePercent` AND `passThresholdPercent` — the threshold FROZEN
//                 into the version the attempt was stamped to, not one in force today.
//   the linkage   `contentHash`, beside `contentPagesJson`, `quizJson` and the same threshold, which
//                 are the three inputs the hash was computed over.
//   the coverage  `auditCoverage` and `contentHashLinkage`, which are the server's own comparison of
//                 the stored hash against the version's, and of the row against the ledger.
//
// That is the entire reason the route exists — a reader can re-check the document without trusting
// it. A browser that recomputed any of them would be publishing a SECOND opinion about append-only
// statutory evidence, off a threshold it may have read from a later version or with a rounding the
// server's exact decimal comparison does not do. So this module carries the values across and
// compares nothing. If a claim is not on the wire, it is not on the screen.
//
// ---- THE `*StoreLocal` FIELDS ARE NOT PARSED AS INSTANTS, AND THAT IS THE POINT ----------------
//
// The document carries each stamp twice: `completedAtUtc` / `completedAtStoreLocal`,
// `occurredAtUtc` / `occurredAtStoreLocal`. BOTH serialise bare (EF hands column-loaded stamps back
// `Unspecified`), and `parseApiInstant` reads a bare stamp as UTC — which is correct for the first of
// each pair and WRONG for the second, because the second is already a wall clock in the store's zone.
// Feeding it through would shift every timestamp on an inspector's document by the store's own
// offset, silently, and in summer by two hours.
//
// So only the `*Utc` half is turned into an instant, and the screen renders it in the zone the
// context read resolved — the same path every other instant on this surface takes
// (`instantLabel`). The `*StoreLocal` half is deliberately dropped rather than carried unused: a
// field on this object would eventually be printed by somebody who did not read this comment.

import { READ_ANSWERED, READ_UNKNOWN, instantOf, civilDateOf, stateOfError, trainingCodeOf } from '~/utils/training/journey';

// ---- the three states an inspector must be able to tell apart -----------------------------------
//
// `TrainingEvidenceTrainingState`, carried across verbatim. The absence of a record is NOT a failure
// and NOT a pass — it is the absence of evidence, and the backend has its own word for it precisely
// so that no reader has to guess which of the two an empty document means.

/** Not one completion row exists for this person. Nothing is claimed either way. */
export const TRAINING_STATE_NONE = 'NoCompletionOnFile';

/** Rows exist and none carries a pass. The person attempted and did not pass. */
export const TRAINING_STATE_NO_PASS = 'RecordedWithoutAPass';

/** At least one row carries the verdict the server derived when it was written. */
export const TRAINING_STATE_PASSED = 'RecordedAsPassed';

// ---- what the ledger says about one row ---------------------------------------------------------

/** No audit event names this row: who recorded it, and when, is unrecoverable. */
export const AUDIT_UNCOVERED = 'NoAuditEventForThisRow';

/** At least one audit event names this row. */
export const AUDIT_COVERED = 'Covered';

// ---- whether a completion still links to the material it claims to test -------------------------

/** The completion's frozen hash still equals the version's. */
export const LINKAGE_INTACT = 'Intact';

/** They disagree: the version's content moved under a completion that claims to test it. */
export const LINKAGE_BROKEN = 'Broken';

/** The referenced version could not be read, so there is nothing to compare against. */
export const LINKAGE_UNRESOLVABLE = 'Unresolvable';

/**
 * The evidence document, read into the same three-state axis as the rest of this surface.
 *
 * ANSWERED-AND-EMPTY IS A REAL DOCUMENT and is the one an inspection is most likely to be handed:
 * "this store holds no training record for this person" is a finding, and it is not the same screen
 * as a refused read or a read that never came back. The three are kept apart here so no caller can
 * render a 403 as an empty file.
 *
 * The shape gate is `Array.isArray` on all three collections plus a `personRef`. The server's own
 * model initialises every list, so a 200 missing one is a shape this build does not understand — and
 * a document whose shape is not understood must read UNKNOWN, never "nothing on file".
 */
export function readEvidence (payload, error) {
  if (error) {
    return {
      state: stateOfError(error),
      code: trainingCodeOf(error),
      document: null
    };
  }
  if (!payload ||
      !payload.personRef ||
      !Array.isArray(payload.completions) ||
      !Array.isArray(payload.certificates) ||
      !Array.isArray(payload.auditChain)) {
    return { state: READ_UNKNOWN, code: null, document: null };
  }
  return {
    state: READ_ANSWERED,
    code: null,
    document: {
      storeId: typeof payload.storeId === 'number' ? payload.storeId : null,
      personRef: payload.personRef,
      // WHO, and whether anybody. A person who exists and was never trained and an invented id
      // produce the same empty document, so the server distinguishes them and this carries the
      // distinction rather than flattening it into a missing name.
      displayName: payload.displayName || null,
      personOnFile: payload.personOnFile === true,
      timeZoneId: payload.timeZoneId || null,
      timeZoneIsFallback: payload.timeZoneIsFallback === true,
      trainingState: typeof payload.trainingState === 'string' ? payload.trainingState : null,
      completions: payload.completions.map(evidenceCompletionRow),
      certificates: payload.certificates.map(evidenceCertificateRow),
      auditChain: payload.auditChain.map(auditRow),
      integrity: integrityOf(payload.integrity),
      asOf: instantOf(payload.asOfUtc)
    }
  };
}

/**
 * One completion as the DOCUMENT carries it — a wider row than the management list's, because this
 * is the one that has to be re-checkable.
 *
 * `contentPages`, `quiz` and `passThreshold` are the frozen material, carried so the hash beside them
 * can be recomputed by hand. They are null when the version could not be read, which is exactly the
 * case `linkage === LINKAGE_UNRESOLVABLE` describes; the completion ledger references its course BY
 * VALUE with no foreign key, so a version that has gone is a real state and not a failed request.
 *
 * `recordedBy` is recoverable ONLY from the audit ledger — `TrainingCompletion` carries no recorder
 * column — so a row written before the ledger covered it names nobody and this is null. That null is
 * a finding about the record, not a rendering problem, and `auditCoverage` is the field that says so
 * in the server's own word.
 */
export function evidenceCompletionRow (entry) {
  const c = entry || {};
  return {
    completionId: c.completionId || null,
    courseId: c.courseId || null,
    courseTitle: c.courseTitle || null,
    courseVersionId: c.courseVersionId || null,
    // `typeof`, not truthiness: there is no v0 today, but a numbering that ever started at zero must
    // not print as "unnamed version".
    versionNo: typeof c.versionNo === 'number' ? c.versionNo : null,
    contentPages: c.contentPagesJson || null,
    quiz: c.quizJson || null,
    passThreshold: typeof c.passThresholdPercent === 'number' ? c.passThresholdPercent : null,
    contentHash: c.contentHash || null,
    // A score of 0 is a real score, and so is a verdict of false. Both need `typeof`.
    scorePercent: typeof c.scorePercent === 'number' ? c.scorePercent : null,
    passed: typeof c.passed === 'boolean' ? c.passed : null,
    source: c.source || null,
    recordedBy: c.recordedBy || null,
    // See the header: the `*Utc` half only. The store-local twin is a wall clock and parsing it as an
    // instant would move every timestamp on this document by the store's own offset.
    completed: instantOf(c.completedAtUtc),
    auditCoverage: c.auditCoverage || null,
    linkage: c.contentHashLinkage || null
  };
}

/**
 * One certificate as the document carries it.
 *
 * The dates are SLICED, never converted — the same refusal `civilDateOf` documents one level up.
 * Whether a stored expiry denotes UTC or the store's own local midnight is an open module-epoch
 * ruling (TR-B3), and on an evidence document the cost of picking wrong is a certificate printed as
 * expiring on the 31st when the venue wrote the 1st.
 *
 * `status` is the certificate service's own projection over the server's clock, read and never
 * recomputed: a browser clock disagreeing would produce a second opinion about whether somebody's
 * food-hygiene certificate is valid, on the document that exists to settle exactly that.
 */
export function evidenceCertificateRow (entry) {
  const c = entry || {};
  return {
    certificateId: c.certificateId || null,
    type: c.type || null,
    issuer: c.issuer || null,
    issueDate: civilDateOf(c.issueDateUtc),
    // Null means NO expiry, which the backend models as permanently valid. A real fact, printed as
    // such, and never as a missing value.
    expiryDate: civilDateOf(c.expiryDateUtc),
    hasExpiry: !!c.expiryDateUtc,
    documentReference: c.documentReference || null,
    status: c.status || null,
    auditCoverage: c.auditCoverage || null
  };
}

/**
 * One ledger row, verbatim.
 *
 * `actorReference` IS NOT RESOLVED TO A NAME, for the same reason `utils/training/disclosure.js`
 * refuses to: the server hands over the id its PII-minimized ledger stores, and turning it into a
 * colleague's name is a disclosure about that colleague which nobody authorised — and joining it
 * against a roster here would put back exactly what the backend withheld, one layer up, on a
 * document that then leaves the building.
 *
 * `linkedTo` is the server's own answer to which leg of the document the row belongs to, because the
 * raw aggregate id is a volatile Guid that says nothing on its own.
 */
export function auditRow (entry) {
  const e = entry || {};
  return {
    eventType: e.eventType || null,
    aggregateType: e.aggregateType || null,
    aggregateId: e.aggregateId || null,
    actorReference: e.actorReference || null,
    payloadSnapshotJson: e.payloadSnapshotJson || null,
    // The `*Utc` half only — see the header.
    occurred: instantOf(e.occurredAtUtc),
    linkedTo: e.linkedTo || null
  };
}

/**
 * What the document can honestly say about itself.
 *
 * BOTH FIELDS ARE FINDINGS, NOT REASSURANCES. A `Broken` linkage means a version's content moved
 * under a completion that claims to test it; a non-zero `rowsWithoutAuditEvent` means that many rows
 * cannot say who recorded them. The combined linkage is the server's, under a precedence a weaker
 * answer can never win (Broken outranks Unresolvable outranks Intact) — it is NOT recombined here,
 * because a client that folded these itself would be free to fold them the other way.
 *
 * An absent or malformed integrity block leaves both null. "The document did not tell us" and "the
 * document told us zero" are different statements about somebody's record, and only one of them may
 * be printed as a number.
 */
export function integrityOf (integrity) {
  const i = integrity || {};
  return {
    linkage: typeof i.contentHashLinkage === 'string' ? i.contentHashLinkage : null,
    rowsWithoutAuditEvent: typeof i.rowsWithoutAuditEvent === 'number' ? i.rowsWithoutAuditEvent : null
  };
}

/**
 * Whether the document has any finding against itself at all — the single question a manager asks
 * before handing it over.
 *
 * TRUE ONLY ON A POSITIVE FINDING. A null linkage or a null count is UNKNOWN and must never answer
 * "clean": a document that could not tell us about its own integrity has not told us it is sound.
 * Callers therefore get three answers from this, not two.
 */
export function integrityFinding (integrity) {
  const i = integrity || {};
  // ABSENT AND NULL ARE THE SAME SILENCE HERE, and they were not, which is why this is spelled out.
  // Every guard below asks `=== null`, and an absent property answers `undefined` to that — so an
  // integrity block that was never built at all (`integrityFinding(null)`, which is exactly what
  // `TrainingEvidenceDocument.vue`'s `this.doc && this.doc.integrity` hands over when there is no
  // document) fell through all four and returned `false`: A CLEAN BILL FOR A DOCUMENT THAT DOES NOT
  // EXIST. `integrityOf` normalises to null and so was the only caller that could not trigger it.
  // Normalising here means the three answers hold for every input, not only for the pre-normalised
  // one.
  const linkage = i.linkage === undefined ? null : i.linkage;
  const rowsWithoutAuditEvent = i.rowsWithoutAuditEvent === undefined ? null : i.rowsWithoutAuditEvent;

  if (linkage === null && rowsWithoutAuditEvent === null) { return null; }
  if (linkage === LINKAGE_BROKEN || linkage === LINKAGE_UNRESOLVABLE) { return true; }
  if (typeof rowsWithoutAuditEvent === 'number' && rowsWithoutAuditEvent > 0) { return true; }
  // One half answered and was clean while the other said nothing: still not a clean bill.
  if (linkage === null || rowsWithoutAuditEvent === null) { return null; }
  return false;
}
