// The Growth lawful-send model: the pure function between what the API returned and what the page
// is allowed to let an operator do. No Vue, no network — so every rule below is testable alone.
//
// THE LAW THIS FILE EXISTS TO KEEP: a marketing send is lawful or it does not happen. The backend
// already refuses an unlawful send (no dispatch path bypasses approval; every recipient is re-checked
// against the single consent authority at the irreversible `Submitting` transition). This file is the
// SAME refusal moved forward, so an operator is never offered a button whose only outcome is a 409 —
// and, more importantly, is never offered one whose outcome is a lawful-basis breach.
//
// Three data states, never collapsed, exactly as the workforce week grid keeps them apart:
//
//   unknown — the read has not answered (or failed). Nothing may be counted, claimed, or sent.
//   absent  — the read answered and the thing genuinely is not there. A real, positive negative.
//   read    — the read answered with content. Its numbers are real.
//
// `unknown` and `absent` are LEGALLY different here, not cosmetically. "We could not read consent"
// must never render as "consent is absent", and neither may ever render as "consent is granted".
// The backend draws the same line: a consent-store outage raises `GrowthConsentUnavailableException`,
// which its own doc calls "NOT a deny decision — the ABSENCE of a decision", and every caller must
// fail closed on it. So does this gate.
//
// COUNTS. Only a computed snapshot yields a recipient count. The consent summary's
// `consentedContacts` is NOT an audience and is never treated as one: it does not apply verification
// gating, it does not apply the rolling frequency cap, and it is a live figure rather than the
// immutable membership a dispatch actually reads. Using it would be wrong in the PERMISSIVE
// direction — the one direction in which a wrong number is a lawful-basis breach rather than a
// display bug — so an un-computed audience yields `null`, which renders as a dash and never as 0.

import { parseApiInstant } from '~/utils/workforce/week-range';

// --- the three read states ---------------------------------------------------------------------

/** The read has not answered, or failed. Nothing is known. */
export const UNKNOWN = 'unknown';
/** The read answered and the thing is genuinely not there. */
export const ABSENT = 'absent';
/** The read answered with content. */
export const READ = 'read';

// --- the unsubscribe mechanism ------------------------------------------------------------------
//
// RFC 8058 one-click unsubscribe is a legal obligation on bulk marketing mail, not a feature. It is
// NOT reported by any Growth endpoint, so it cannot be read off the wire; it is a property of the
// deployment. It is therefore an explicit INPUT to this gate rather than an assumption inside it —
// the moment the platform can report it, the page swaps where the value comes from and this file
// does not change.
//
// Fail closed: only an explicit `present` unblocks. `unknown` blocks exactly as `absent` does,
// because "we do not know whether recipients can unsubscribe" is not a lawful basis to send.

export const UNSUBSCRIBE_PRESENT = 'present';
export const UNSUBSCRIBE_ABSENT = 'absent';
export const UNSUBSCRIBE_UNKNOWN = 'unknown';

// --- gate outcomes -------------------------------------------------------------------------------

/** Something the gate depends on has not answered. Fail closed: no send. */
export const GATE_UNKNOWN = 'unknown';
/** Everything answered, and at least one condition refuses the send. */
export const GATE_BLOCKED = 'blocked';
/**
 * Every condition THIS SURFACE CAN CHECK is satisfied.
 *
 * It is deliberately not "the send will succeed", and the copy bound to it must not say so. One
 * precondition remains invisible from a browser: Growth's real gate ANDs the per-store flag with the
 * deployment-wide `Growth:Enabled` config switch (`StoreBackedGrowthFeatureFlags`), and no endpoint
 * reports that switch. A store row read as effective:true can still sit under a dark deployment.
 * READY therefore means "nothing we can see refuses this", and `growth_gate_ready_caveat` says the
 * rest out loud rather than letting the badge imply it.
 */
export const GATE_READY = 'ready';
/** A dispatch run already exists for this version. Dispatch is idempotent; there is nothing to do. */
export const GATE_DISPATCHED = 'dispatched';

// The blocking reasons. Rendering keys on these codes, never on prose.
export const BLOCK_CONSENT_UNREADABLE = 'growth.gate.consent_unreadable';
export const BLOCK_NO_AUDIENCE = 'growth.gate.no_audience';
export const BLOCK_EMPTY_AUDIENCE = 'growth.gate.empty_audience';
export const BLOCK_NO_CONTENT = 'growth.gate.no_content';
export const BLOCK_NOT_APPROVED = 'growth.gate.not_approved';
export const BLOCK_APPROVAL_SUPERSEDED = 'growth.gate.approval_superseded';
export const BLOCK_NO_UNSUBSCRIBE = 'growth.gate.no_unsubscribe_mechanism';
/** `growth.module` is off for this store, so the send route answers an opaque 404. */
export const BLOCK_MODULE_OFF = 'growth.gate.module_off';
/** `growth.dispatch` — the kill switch — is off, so the send route answers 409 `growth.dispatch_disabled`. */
export const BLOCK_DISPATCH_OFF = 'growth.gate.dispatch_off';
/** A provider account for this store is paused, so the send route answers 409 `growth.provider_paused`. */
export const BLOCK_PROVIDER_PAUSED = 'growth.gate.provider_paused';
/** The platform switches / mail path could not be read, so what the send route would do is unknown. */
export const BLOCK_PLATFORM_UNREADABLE = 'growth.gate.platform_unreadable';

// --- approval states -----------------------------------------------------------------------------

/** No live approval — never approved, or an edit invalidated it. */
export const APPROVAL_NONE = 'none';
/** A live approval that pins the CURRENT version. This is the only one that may dispatch. */
export const APPROVAL_LIVE = 'live';
/**
 * A live approval that pins some OTHER version than the current one.
 *
 * The backend invalidates approvals on edit, so this should not normally occur; it is kept as a
 * distinct state rather than folded into `live` because folding it would let a stale review
 * green-light changed content — the exact failure `GRW-VERSION-001` exists to prevent. If the two
 * ever disagree, this surface refuses rather than guesses.
 */
export const APPROVAL_SUPERSEDED = 'superseded';

function countOr (value) {
  return typeof value === 'number' && isFinite(value) ? value : null;
}

/**
 * Reads the consent summary (#8) into the store's consent standing.
 *
 * `null` in — the read never answered — yields `UNKNOWN` with every count `null`. It does NOT yield
 * zeros: "we could not read consent" and "this store has no consents" are different sentences, and
 * only one of them is a reason to stop.
 *
 * The reason breakdown is passed through as reasons ONLY. It is deliberately not annotated with a
 * suppression SCOPE: unsubscribe writes a store-scoped suppression while erasure writes a
 * channel-global one, and whether a venue is an independent controller is an open ruling (GB5). This
 * surface reports the reason the backend gave and claims nothing about reach.
 */
export function readConsentStanding (summary) {
  if (!summary || typeof summary !== 'object') {
    return {
      state: UNKNOWN,
      consented: null,
      withdrawn: null,
      suppressed: null,
      pendingInvites: null,
      reasons: []
    };
  }

  const byReason = summary.suppressionsByReason || {};
  return {
    state: READ,
    consented: countOr(summary.consentedContacts),
    withdrawn: countOr(summary.withdrawnContacts),
    suppressed: countOr(summary.suppressedContacts),
    pendingInvites: countOr(summary.pendingInvites),
    reasons: Object.keys(byReason)
      .map(reason => ({ reason, count: countOr(byReason[reason]) }))
      .sort((a, b) => (b.count || 0) - (a.count || 0) || a.reason.localeCompare(b.reason))
  };
}

/**
 * Reads a segment snapshot (#11), or a newsletter's bound snapshot summary (#14), into the audience.
 *
 * THE ONLY LAWFUL RECIPIENT COUNT. `includedCount` comes from an immutable snapshot whose membership
 * was decided by the same eligibility authority the dispatcher re-checks against. Nothing else on
 * this surface may produce a recipient figure.
 *
 * `computedAt` is parsed with `parseApiInstant`, never `new Date(iso)`: a column-loaded stamp
 * serialises bare and a bare ISO string is read by JS as browser-local, which would date the
 * audience to the viewer's offset rather than the server's.
 */
export function readAudience (snapshot) {
  if (!snapshot || typeof snapshot !== 'object') {
    return {
      state: UNKNOWN,
      snapshotId: null,
      includedCount: null,
      excludedCount: null,
      watermarkHash: null,
      computedAt: null,
      exclusions: []
    };
  }

  const breakdown = snapshot.exclusionReasonBreakdown || {};
  return {
    state: READ,
    snapshotId: snapshot.snapshotId || null,
    includedCount: countOr(snapshot.includedCount),
    excludedCount: countOr(snapshot.excludedCount),
    watermarkHash: snapshot.watermarkHash || null,
    computedAt: parseApiInstant(snapshot.computedAt),
    exclusions: Object.keys(breakdown)
      .map(reason => ({ reason, count: countOr(breakdown[reason]) }))
      .sort((a, b) => (b.count || 0) - (a.count || 0) || a.reason.localeCompare(b.reason))
  };
}

/**
 * Reads the approval block of a newsletter detail (#14) against the current version.
 *
 * The backend's own rule: an approval must pin the exact version id, content hash and snapshot, and
 * an edit invalidates it. This reproduces the VERSION half of that check so the button state matches
 * the refusal — it does not re-derive the content hash, which only the server can vouch for.
 */
export function readApproval (detail) {
  if (!detail || typeof detail !== 'object') {
    return { state: UNKNOWN, approvalId: null, approvedAt: null, invalidatedAt: null };
  }

  const approval = detail.approval || {};
  const currentVersionId = (detail.currentVersion && detail.currentVersion.versionId) || null;
  const invalidatedAt = parseApiInstant(approval.invalidatedAt);

  if (approval.state !== 'Live') {
    return { state: APPROVAL_NONE, approvalId: null, approvedAt: null, invalidatedAt };
  }

  const pinned = approval.newsletterVersionId || null;
  return {
    state: pinned && currentVersionId && pinned === currentVersionId ? APPROVAL_LIVE : APPROVAL_SUPERSEDED,
    approvalId: approval.approvalId || null,
    approvedAt: parseApiInstant(approval.approvedAt),
    invalidatedAt
  };
}

/**
 * Reads a dispatch run summary (#14 `run`, or #18's response) into the truthful outcome.
 *
 * The counts are reported SEPARATELY and never blended: `providerAccepted` is what the provider took
 * for sending, `delivered` is what it confirmed arrived, and folding the first into the second is the
 * precise misreport `GRW-TRUTH-001` forbids. `openRate` is null until something was delivered — the
 * server sends null rather than 0, and a 0 here would read as "nobody opened it" when the truth is
 * "nothing has been delivered to open".
 */
export function readRun (run) {
  if (!run || typeof run !== 'object') {
    return { state: UNKNOWN };
  }

  return {
    state: READ,
    runState: run.state || null,
    dispatchRunId: run.dispatchRunId || null,
    finalEligible: countOr(run.finalEligibleCount),
    suppressedAtDispatch: countOr(run.suppressedAtDispatchCount),
    providerAccepted: countOr(run.providerAcceptedCount),
    delivered: countOr(run.deliveredCount),
    failed: countOr(run.failedCount),
    ambiguous: countOr(run.ambiguousCount),
    opened: countOr(run.openedCount),
    // Null when nothing was delivered. Never coerced to 0 — see the doc comment.
    openRate: typeof run.openRate === 'number' && isFinite(run.openRate) ? run.openRate : null,
    openRateLabel: run.openRateLabel || null,
    startedAt: parseApiInstant(run.startedAt),
    completedAt: parseApiInstant(run.completedAt)
  };
}

// --- the platform switches the send route checks before any Growth rule ---------------------------

/** The store-level visibility master. Off ⇒ the send + test-send routes answer an opaque 404. */
export const FLAG_MODULE = 'growth.module';
/** The dispatch kill switch. Off ⇒ 409 `growth.dispatch_disabled` before a run is created. */
export const FLAG_DISPATCH = 'growth.dispatch';

/**
 * Reads `GET /stores/{storeId}/feature-flags` into the two switches that decide whether a dispatch
 * can happen at all.
 *
 * Both are deny-closed by default in the backend, and NEITHER is reported by any Growth endpoint —
 * which is why the gate used to say "ready" for a store whose send would 404. A flag the catalog did
 * not return is `null` (unknown), never `false`: "this deployment does not advertise the flag" and
 * "this store has it switched off" are different sentences.
 *
 * ASYMMETRY, and it matters. `effective: false` is reliable — Growth's gate ANDs the per-store row
 * with the deployment-wide `Growth:Enabled` switch, so a false row refuses whatever the switch says.
 * `effective: true` is NOT a promise: this endpoint has no Growth effective-resolver, so it cannot
 * see `Growth:Enabled` (see `StoreFeatureFlagReader`'s doc). The gate therefore uses a `false` to
 * block and never uses a `true` to claim the send will land.
 */
export function readModuleFlags (states) {
  // An empty catalog is UNKNOWN rather than READ-with-no-flags: the catalog always carries every
  // declared flag, so nothing back is a read that did not really answer.
  if (!Array.isArray(states) || !states.length) {
    return { state: UNKNOWN, module: null, dispatch: null };
  }

  function effective (key) {
    for (let i = 0; i < states.length; i += 1) {
      const row = states[i];
      if (row && row.flagKey === key) {
        return typeof row.effective === 'boolean' ? row.effective : null;
      }
    }
    return null;
  }

  return { state: READ, module: effective(FLAG_MODULE), dispatch: effective(FLAG_DISPATCH) };
}

/**
 * Reads the provider-account half of the delivery-health read (#19) into the store's mail path.
 *
 * WHAT IT REPORTS: which provider accounts the store has provisioned, and whether any is paused —
 * the second kill switch the dispatcher checks (`IsAnyProviderAccountPausedAsync`: ANY paused account
 * stops the store).
 *
 * WHAT IT DOES NOT REPORT, and nothing else does either: which `IGrowthMailProvider` the server has
 * bound. That is a DI decision in `Program.cs`, not a read, and today it is the in-memory
 * `GrowthFakeMailProvider`. An empty `providers` list is therefore evidence about PROVISIONING and
 * not about the adapter, and the copy bound to it must say which of the two it is talking about.
 */
export function readMailPath (health) {
  if (!health || typeof health !== 'object') {
    return { state: UNKNOWN, providers: [], anyPaused: null };
  }

  const rows = health.providers || [];
  const providers = rows.map(row => ({
    providerKey: (row && row.providerKey) || null,
    sendingDomain: (row && row.sendingDomain) || null,
    paused: !!(row && row.paused === true)
  }));

  return {
    state: READ,
    providers,
    anyPaused: providers.some(p => p.paused)
  };
}

/**
 * THE GATE. Resolves whether this newsletter may lawfully be dispatched, and if not, every reason.
 *
 * All blocking reasons are returned, not just the first: an operator who fixes the one thing they
 * were shown and finds another refusal behind it learns to distrust the surface. `state` is the
 * single answer the button binds to.
 *
 * `recipientCount` is emitted ONLY from a computed audience, and only when the gate is not unknown
 * for want of it. A figure an operator would act on is never produced from a live consent count.
 *
 * Evaluation order is fixed so the reasons read as a checklist, but every condition is evaluated —
 * there is no short-circuit that could hide a second breach behind the first.
 *
 * TWO CLASSES OF CONDITION, both returned in the same two lists because both stop the send and an
 * operator does not care which family a refusal came from:
 *
 *   1–5  LAWFULNESS — consent, audience, content, human approval, unsubscribe. These are the ones a
 *        venue can breach, and the reason the file exists.
 *   6    REACHABILITY — the store's `growth.module` / `growth.dispatch` switches and its provider
 *        pause state. These decide whether the route will answer at all. They are not a lawful-basis
 *        question, but a gate that reports "ready" for a send that will 404 is lying about the one
 *        thing the badge is for.
 */
export function resolveSendGate (options) {
  const opts = options || {};
  const standing = opts.standing || { state: UNKNOWN };
  const audience = opts.audience || { state: UNKNOWN };
  const approval = opts.approval || { state: UNKNOWN };
  const run = opts.run || { state: UNKNOWN };
  const unsubscribe = opts.unsubscribeMechanism || UNSUBSCRIBE_UNKNOWN;
  const hasContent = opts.hasContent === true;
  const flags = opts.moduleFlags || { state: UNKNOWN, module: null, dispatch: null };
  const mailPath = opts.mailPath || { state: UNKNOWN, providers: [], anyPaused: null };

  const blocked = [];
  const unknown = [];
  // Two independent reads can each leave the platform unreadable; the operator needs the sentence
  // once, not twice.
  function unknownOnce (code) {
    if (!unknown.includes(code)) { unknown.push(code); }
  }

  // 1. The unsubscribe obligation. Only an explicit `present` passes; `unknown` fails closed with
  //    the same force as `absent`, because not knowing is not a lawful basis.
  if (unsubscribe === UNSUBSCRIBE_UNKNOWN) {
    unknown.push(BLOCK_NO_UNSUBSCRIBE);
  } else if (unsubscribe !== UNSUBSCRIBE_PRESENT) {
    blocked.push(BLOCK_NO_UNSUBSCRIBE);
  }

  // 2. Consent standing must have been READ. An unreadable consent store is the absence of a
  //    decision, and the backend refuses to send on it; so does this.
  if (standing.state !== READ) {
    unknown.push(BLOCK_CONSENT_UNREADABLE);
  }

  // 3. A computed, non-empty audience.
  if (audience.state !== READ) {
    unknown.push(BLOCK_NO_AUDIENCE);
  } else if (audience.includedCount === null) {
    // A snapshot that answered without a readable count is not an audience of zero — it is an
    // audience nobody can vouch for.
    unknown.push(BLOCK_NO_AUDIENCE);
  } else if (audience.includedCount === 0) {
    blocked.push(BLOCK_EMPTY_AUDIENCE);
  }

  // 4. There must be content to send.
  if (!hasContent) {
    blocked.push(BLOCK_NO_CONTENT);
  }

  // 5. A live human approval pinning the current version.
  if (approval.state === UNKNOWN) {
    unknown.push(BLOCK_NOT_APPROVED);
  } else if (approval.state === APPROVAL_SUPERSEDED) {
    blocked.push(BLOCK_APPROVAL_SUPERSEDED);
  } else if (approval.state !== APPROVAL_LIVE) {
    blocked.push(BLOCK_NOT_APPROVED);
  }

  // 6. The platform switches the send route checks BEFORE any Growth rule.
  //
  // These are not lawful-basis conditions; they are "what will actually happen when the button is
  // pressed". They are here because the gate's whole promise is that an operator is never offered a
  // button whose only outcome is a refusal, and a store with `growth.module` off gets an opaque 404
  // from the send route with no explanation attached to it.
  //
  // Unknown fails closed, for the same reason as everywhere else in this file: a gate that says
  // "ready" while it cannot tell whether the route exists is making a claim it cannot back. The
  // reason code says the platform is UNREADABLE rather than off, so the two are never conflated.
  if (flags.state !== READ || flags.module === null || flags.dispatch === null) {
    unknownOnce(BLOCK_PLATFORM_UNREADABLE);
  } else {
    // Only an explicit `false` blocks. A `true` is not treated as a promise — see `readModuleFlags`.
    if (flags.module === false) { blocked.push(BLOCK_MODULE_OFF); }
    if (flags.dispatch === false) { blocked.push(BLOCK_DISPATCH_OFF); }
  }

  if (mailPath.state !== READ) {
    unknownOnce(BLOCK_PLATFORM_UNREADABLE);
  } else if (mailPath.anyPaused === true) {
    blocked.push(BLOCK_PROVIDER_PAUSED);
  }

  // The recipient count is emitted only from a computed audience — never from consent standing.
  const recipientCount = audience.state === READ ? audience.includedCount : null;

  // A run already exists: dispatch is idempotent and there is nothing further to do. Reported after
  // the checks so the reasons stay visible on a completed send rather than vanishing.
  if (run.state === READ) {
    return { state: GATE_DISPATCHED, blocked, unknown, recipientCount };
  }

  if (unknown.length) {
    return { state: GATE_UNKNOWN, blocked, unknown, recipientCount };
  }
  if (blocked.length) {
    return { state: GATE_BLOCKED, blocked, unknown, recipientCount };
  }
  return { state: GATE_READY, blocked, unknown, recipientCount };
}

/** True only for the one state in which a dispatch may be offered. */
export function maySend (gate) {
  return !!gate && gate.state === GATE_READY;
}
