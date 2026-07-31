import {
  readConsentStanding,
  readAudience,
  readApproval,
  readRun,
  readModuleFlags,
  readMailPath,
  resolveSendGate,
  maySend,
  UNKNOWN,
  READ,
  APPROVAL_NONE,
  APPROVAL_LIVE,
  APPROVAL_SUPERSEDED,
  UNSUBSCRIBE_PRESENT,
  UNSUBSCRIBE_ABSENT,
  UNSUBSCRIBE_UNKNOWN,
  GATE_UNKNOWN,
  GATE_BLOCKED,
  GATE_READY,
  GATE_DISPATCHED,
  BLOCK_CONSENT_UNREADABLE,
  BLOCK_NO_AUDIENCE,
  BLOCK_EMPTY_AUDIENCE,
  BLOCK_NO_CONTENT,
  BLOCK_NOT_APPROVED,
  BLOCK_APPROVAL_SUPERSEDED,
  BLOCK_NO_UNSUBSCRIBE,
  BLOCK_MODULE_OFF,
  BLOCK_DISPATCH_OFF,
  BLOCK_PROVIDER_PAUSED,
  BLOCK_PLATFORM_UNREADABLE
} from '~/utils/growth/send-gate'

// ---------------------------------------------------------------------------------------------
// The wire bodies below are copied VERBATIM from the backend's committed golden fixtures at
// OkamAPI-modules `docs/api/fixtures/growth/` (asserted by GrowthNewsletterContractFixtureTests, so
// a contract drift fails there). Using the real bytes rather than a hand-written shape is what stops
// this suite from proving only that it agrees with itself.
//
// The two endpoints with no committed golden (#8 consents/summary, #11 segment snapshot) are
// transcribed from their DTOs — GrowthConsentSummaryResponse and GrowthSegmentSnapshotResponse —
// through the estate's documented wire law (docs/api/README.md: "The wire is camelCase", string
// enums), which the four committed goldens independently confirm for this exact module.
// ---------------------------------------------------------------------------------------------

const NEWSLETTER_DETAIL = {
  id: 1002,
  storeId: 90100,
  state: 'Completed',
  createdAt: '2026-07-20T10:00:00+00:00',
  createdByUserId: 'admin-user-1',
  currentVersion: {
    versionId: 5002,
    versionNo: 2,
    subject: 'Sommermeny hos virksomheten',
    contentHash: 'sha256:2b3c4d5e6f',
    createdAt: '2026-07-20T10:05:00+00:00'
  },
  approval: {
    state: 'Live',
    approvalId: 7002,
    newsletterVersionId: 5002,
    approvedAt: '2026-07-20T10:10:00+00:00',
    invalidatedAt: null
  },
  boundSnapshot: {
    snapshotId: 3002,
    watermarkHash: 'sha256:aabbccdd',
    includedCount: 42,
    excludedCount: 6
  },
  run: {
    dispatchRunId: 9002,
    state: 'Completed',
    finalEligibleCount: 40,
    suppressedAtDispatchCount: 2,
    providerAcceptedCount: 40,
    deliveredCount: 38,
    failedCount: 0,
    ambiguousCount: 0,
    openedCount: 19,
    openRate: 0.5,
    openRateLabel: 'event-deduped (OpenedCount / DeliveredCount), not unique-recipient',
    startedAt: '2026-07-20T11:00:00+00:00',
    completedAt: '2026-07-20T11:02:00+00:00'
  }
}

// dispatch-response.json's run: accepted by the provider, nothing delivered yet, openRate null.
const RUN_JUST_DISPATCHED = {
  dispatchRunId: 9002,
  state: 'Completed',
  finalEligibleCount: 40,
  suppressedAtDispatchCount: 2,
  providerAcceptedCount: 40,
  deliveredCount: 0,
  failedCount: 0,
  ambiguousCount: 0,
  openedCount: 0,
  openRate: null,
  openRateLabel: 'event-deduped (OpenedCount / DeliveredCount), not unique-recipient',
  startedAt: '2026-07-20T11:00:00+00:00',
  completedAt: '2026-07-20T11:02:00+00:00'
}

const CONSENT_SUMMARY = {
  storeId: 90100,
  consentedContacts: 120,
  withdrawnContacts: 9,
  suppressedContacts: 14,
  pendingInvites: 3,
  suppressionsByReason: { Unsubscribe: 8, HardBounce: 4, Complaint: 2 }
}

const SNAPSHOT = {
  snapshotId: 3002,
  segmentKey: 'newsletter-subscribers',
  definitionVersion: 1,
  watermarkHash: 'sha256:aabbccdd',
  computedAt: '2026-07-20T09:30:00+00:00',
  includedCount: 42,
  excludedCount: 6,
  exclusionReasonBreakdown: { Suppressed: 3, Unverified: 2, FrequencyCapped: 1 }
}

// `GET /stores/{storeId}/feature-flags`, transcribed from `StoreFeatureFlagState` through the
// estate's camelCase wire law. The two Growth rows are the only ones this surface reads; the
// Workforce row is kept so the reader is exercised against a catalog it must search rather than a
// two-element list that would pass by accident.
const FLAGS_ON = [
  { flagKey: 'workforce.module', module: 'Workforce', title: 'Module', defaultEnabled: false, isOverridden: true, overrideEnabled: true, effective: true },
  { flagKey: 'growth.module', module: 'Growth', title: 'Module (guest capture)', defaultEnabled: false, isOverridden: true, overrideEnabled: true, effective: true },
  { flagKey: 'growth.dispatch', module: 'Growth', title: 'Live newsletter dispatch (kill switch)', defaultEnabled: false, isOverridden: true, overrideEnabled: true, effective: true }
]

function flagsWith (overrides) {
  return FLAGS_ON.map(row => Object.assign({}, row, overrides[row.flagKey] || {}))
}

// `GET /v1/growth/stores/{storeId}/delivery-health`, transcribed from `GrowthDeliveryHealthResponse`.
// Only `providers` is read by this surface.
const HEALTH = {
  storeId: 90100,
  queuedCount: 0,
  oldestQueuedAgeSeconds: null,
  deliveryStateCounts: {},
  attemptedCount: 0,
  bounceRate: 0,
  complaintRate: 0,
  failureRate: 0,
  suppressionInflowLast24h: 0,
  providers: [{ providerKey: 'sandbox', sendingDomain: 'mail.virksomheten.no', paused: false }]
}

// A gate whose every input is satisfied. Each test below flips exactly ONE field, so a refusal is
// attributable to that field and to nothing else — and the untouched baseline is the positive
// control proving the probe can reach READY at all.
function readyInputs (overrides) {
  return Object.assign({
    standing: readConsentStanding(CONSENT_SUMMARY),
    audience: readAudience(SNAPSHOT),
    approval: readApproval(NEWSLETTER_DETAIL),
    run: { state: UNKNOWN },
    unsubscribeMechanism: UNSUBSCRIBE_PRESENT,
    hasContent: true,
    moduleFlags: readModuleFlags(FLAGS_ON),
    mailPath: readMailPath(HEALTH)
  }, overrides || {})
}

describe('readConsentStanding — unknown is not zero, and the distinction is legal', () => {
  test('a read that never answered is UNKNOWN with null counts, never zeros', () => {
    const standing = readConsentStanding(null)
    expect(standing.state).toBe(UNKNOWN)
    expect(standing.consented).toBeNull()
    expect(standing.withdrawn).toBeNull()
    expect(standing.suppressed).toBeNull()
    expect(standing.pendingInvites).toBeNull()
    // POSITIVE CONTROL: the same reader DOES produce numbers when the read answered, so the nulls
    // above are the unknown state and not a reader that can only ever return null.
    const real = readConsentStanding(CONSENT_SUMMARY)
    expect(real.state).toBe(READ)
    expect(real.consented).toBe(120)
  })

  test('a store with genuinely nothing captured reads as real zeros, NOT as unknown', () => {
    // The other half of the same law: an answered read of an empty store is a positive fact and
    // must be distinguishable from a failed read. If these two collapsed, "we could not reach the
    // consent store" would render identically to "nobody has ever subscribed".
    const empty = readConsentStanding({
      storeId: 1,
      consentedContacts: 0,
      withdrawnContacts: 0,
      suppressedContacts: 0,
      pendingInvites: 0,
      suppressionsByReason: {}
    })
    expect(empty.state).toBe(READ)
    expect(empty.consented).toBe(0)
    expect(readConsentStanding(null).state).toBe(UNKNOWN)
    expect(readConsentStanding(null).consented).toBeNull()
    // The two are different objects in the two fields that matter.
    expect(empty.state).not.toBe(readConsentStanding(null).state)
    expect(empty.consented).not.toBe(readConsentStanding(null).consented)
  })

  test('suppression reasons are reported as reasons, never annotated with a scope', () => {
    const standing = readConsentStanding(CONSENT_SUMMARY)
    expect(standing.reasons.map(r => r.reason)).toEqual(['Unsubscribe', 'HardBounce', 'Complaint'])
    // GB5 is an OPEN ruling on whether a venue is an independent controller: unsubscribe writes a
    // store-scoped suppression while erasure writes a channel-global one. This surface must not
    // pre-empt that ruling, so no reason carries a reach/scope claim.
    for (const entry of standing.reasons) {
      expect(Object.keys(entry).sort()).toEqual(['count', 'reason'])
    }
  })
})

describe('readAudience — the only lawful recipient count', () => {
  test('no snapshot is UNKNOWN with a null count, never an audience of zero', () => {
    const none = readAudience(null)
    expect(none.state).toBe(UNKNOWN)
    expect(none.includedCount).toBeNull()
    // POSITIVE CONTROL: a real snapshot produces the count, so the null is the state and not the
    // reader's only possible answer.
    expect(readAudience(SNAPSHOT).includedCount).toBe(42)
  })

  test('a computed snapshot of nobody is a real 0, distinct from an uncomputed audience', () => {
    const emptyAudience = readAudience(Object.assign({}, SNAPSHOT, {
      includedCount: 0, excludedCount: 9, exclusionReasonBreakdown: { Suppressed: 9 }
    }))
    expect(emptyAudience.state).toBe(READ)
    expect(emptyAudience.includedCount).toBe(0)
    expect(readAudience(null).includedCount).toBeNull()
  })

  test('computedAt goes through parseApiInstant, so a bare stamp is UTC and not browser-local', () => {
    // The estate shipped and fixed exactly this defect (b65501c). A bare ISO string parsed by
    // `new Date(iso)` is read as browser-LOCAL; under TZ=Europe/Oslo in July that is +02:00, which
    // would move the audience's computation two hours — and a consent timestamp on the wrong day
    // undermines the record it exists to prove.
    const bare = readAudience(Object.assign({}, SNAPSHOT, { computedAt: '2026-07-20T09:30:00' }))
    const zoned = readAudience(Object.assign({}, SNAPSHOT, { computedAt: '2026-07-20T09:30:00+00:00' }))
    expect(bare.computedAt.toISOString()).toBe('2026-07-20T09:30:00.000Z')
    expect(bare.computedAt.getTime()).toBe(zoned.computedAt.getTime())
    // POSITIVE CONTROL: the naive parse this rule forbids really does differ under this suite's
    // zone, so the assertion above is discriminating rather than trivially true.
    expect(new Date('2026-07-20T09:30:00').getTime()).not.toBe(bare.computedAt.getTime())
  })

  test('exclusion reasons come through with their counts, ordered by size', () => {
    expect(readAudience(SNAPSHOT).exclusions).toEqual([
      { reason: 'Suppressed', count: 3 },
      { reason: 'Unverified', count: 2 },
      { reason: 'FrequencyCapped', count: 1 }
    ])
  })
})

describe('readApproval — a stale review can never green-light a changed send', () => {
  test('a live approval pinning the current version is LIVE', () => {
    expect(readApproval(NEWSLETTER_DETAIL).state).toBe(APPROVAL_LIVE)
  })

  test('a live approval pinning some OTHER version is SUPERSEDED, never LIVE', () => {
    const drifted = Object.assign({}, NEWSLETTER_DETAIL, {
      currentVersion: Object.assign({}, NEWSLETTER_DETAIL.currentVersion, { versionId: 5003 })
    })
    expect(readApproval(drifted).state).toBe(APPROVAL_SUPERSEDED)
    // POSITIVE CONTROL: the ONLY change was the current version id, and the same reader called on
    // the unmodified body returns LIVE — so SUPERSEDED is attributable to the drift.
    expect(readApproval(NEWSLETTER_DETAIL).state).toBe(APPROVAL_LIVE)
  })

  test('approval state "None" is NONE, and an unreadable detail is UNKNOWN — not the same thing', () => {
    const unapproved = Object.assign({}, NEWSLETTER_DETAIL, {
      approval: { state: 'None', approvalId: null, newsletterVersionId: null, approvedAt: null, invalidatedAt: '2026-07-20T10:20:00+00:00' }
    })
    expect(readApproval(unapproved).state).toBe(APPROVAL_NONE)
    expect(readApproval(unapproved).invalidatedAt.toISOString()).toBe('2026-07-20T10:20:00.000Z')
    expect(readApproval(null).state).toBe(UNKNOWN)
  })
})

describe('readRun — truthful counts, never blended', () => {
  test('providerAccepted is reported separately from delivered', () => {
    const run = readRun(NEWSLETTER_DETAIL.run)
    expect(run.providerAccepted).toBe(40)
    expect(run.delivered).toBe(38)
    // GRW-TRUTH-001: the two must not be the same field read twice, nor one folded into the other.
    expect(run.providerAccepted).not.toBe(run.delivered)
  })

  test('an openRate of null stays null and never becomes 0', () => {
    const fresh = readRun(RUN_JUST_DISPATCHED)
    expect(fresh.delivered).toBe(0)
    expect(fresh.openRate).toBeNull()
    // POSITIVE CONTROL: a run that DID deliver carries a real rate through the same reader, so the
    // null above is the wire's null rather than a reader that drops the field.
    expect(readRun(NEWSLETTER_DETAIL.run).openRate).toBe(0.5)
  })

  test('run timestamps go through parseApiInstant', () => {
    const run = readRun(Object.assign({}, NEWSLETTER_DETAIL.run, { startedAt: '2026-07-20T11:00:00' }))
    expect(run.startedAt.toISOString()).toBe('2026-07-20T11:00:00.000Z')
  })

  test('no run is UNKNOWN, not a run of zeros', () => {
    expect(readRun(null).state).toBe(UNKNOWN)
    expect(readRun(null).delivered).toBeUndefined()
    expect(readRun(NEWSLETTER_DETAIL.run).state).toBe(READ)
  })
})

describe('resolveSendGate — the send is lawful or it does not happen', () => {
  test('every condition satisfied is READY — the positive control for every refusal below', () => {
    const gate = resolveSendGate(readyInputs())
    expect(gate.state).toBe(GATE_READY)
    expect(gate.blocked).toEqual([])
    expect(gate.unknown).toEqual([])
    expect(maySend(gate)).toBe(true)
  })

  test('an absent unsubscribe mechanism BLOCKS a send that is otherwise entirely lawful', () => {
    const gate = resolveSendGate(readyInputs({ unsubscribeMechanism: UNSUBSCRIBE_ABSENT }))
    expect(gate.state).toBe(GATE_BLOCKED)
    expect(gate.blocked).toContain(BLOCK_NO_UNSUBSCRIBE)
    expect(maySend(gate)).toBe(false)
    // POSITIVE CONTROL: consent, audience, content and approval were all satisfied — flipping only
    // this one field is what refused, and flipping it back reaches READY.
    expect(resolveSendGate(readyInputs()).state).toBe(GATE_READY)
  })

  test('an UNKNOWN unsubscribe mechanism fails closed exactly as an absent one does', () => {
    const gate = resolveSendGate(readyInputs({ unsubscribeMechanism: UNSUBSCRIBE_UNKNOWN }))
    expect(gate.state).toBe(GATE_UNKNOWN)
    expect(gate.unknown).toContain(BLOCK_NO_UNSUBSCRIBE)
    expect(maySend(gate)).toBe(false)
  })

  test('an unreadable consent store fails CLOSED — it is never read as permission', () => {
    const gate = resolveSendGate(readyInputs({ standing: readConsentStanding(null) }))
    expect(gate.state).toBe(GATE_UNKNOWN)
    expect(gate.unknown).toContain(BLOCK_CONSENT_UNREADABLE)
    expect(maySend(gate)).toBe(false)
  })

  test('THE COUNT LAW: a consent standing of 120 does NOT become a recipient count', () => {
    // The permissive-direction error this whole file exists to prevent. `consentedContacts` applies
    // neither verification gating nor the rolling frequency cap, so using it as an audience would
    // over-count in the one direction that is a lawful-basis breach.
    const gate = resolveSendGate(readyInputs({ audience: readAudience(null) }))
    expect(gate.recipientCount).toBeNull()
    expect(gate.state).toBe(GATE_UNKNOWN)
    expect(gate.unknown).toContain(BLOCK_NO_AUDIENCE)
    // POSITIVE CONTROL: with a computed snapshot the SAME inputs do produce a count — and it is the
    // snapshot's 42, never the consent standing's 120.
    const computed = resolveSendGate(readyInputs())
    expect(computed.recipientCount).toBe(42)
    expect(computed.recipientCount).not.toBe(readConsentStanding(CONSENT_SUMMARY).consented)
  })

  test('a computed audience of nobody BLOCKS, and is not the same state as an uncomputed one', () => {
    const empty = resolveSendGate(readyInputs({
      audience: readAudience(Object.assign({}, SNAPSHOT, { includedCount: 0 }))
    }))
    expect(empty.state).toBe(GATE_BLOCKED)
    expect(empty.blocked).toContain(BLOCK_EMPTY_AUDIENCE)
    expect(empty.recipientCount).toBe(0)

    const uncomputed = resolveSendGate(readyInputs({ audience: readAudience(null) }))
    expect(uncomputed.state).toBe(GATE_UNKNOWN)
    expect(uncomputed.recipientCount).toBeNull()
    // The two refusals are different facts and must not collapse.
    expect(empty.state).not.toBe(uncomputed.state)
  })

  test('no live approval BLOCKS — there is no send path that bypasses human approval', () => {
    const gate = resolveSendGate(readyInputs({
      approval: { state: APPROVAL_NONE, approvalId: null, approvedAt: null, invalidatedAt: null }
    }))
    expect(gate.state).toBe(GATE_BLOCKED)
    expect(gate.blocked).toContain(BLOCK_NOT_APPROVED)
    expect(resolveSendGate(readyInputs()).state).toBe(GATE_READY)
  })

  test('an approval pinning a superseded version BLOCKS with its own distinct reason', () => {
    const gate = resolveSendGate(readyInputs({
      approval: { state: APPROVAL_SUPERSEDED, approvalId: 7002, approvedAt: null, invalidatedAt: null }
    }))
    expect(gate.state).toBe(GATE_BLOCKED)
    expect(gate.blocked).toContain(BLOCK_APPROVAL_SUPERSEDED)
    expect(gate.blocked).not.toContain(BLOCK_NOT_APPROVED)
  })

  test('empty content BLOCKS', () => {
    const gate = resolveSendGate(readyInputs({ hasContent: false }))
    expect(gate.state).toBe(GATE_BLOCKED)
    expect(gate.blocked).toContain(BLOCK_NO_CONTENT)
  })

  test('EVERY reason is reported, so fixing one does not reveal an unannounced second', () => {
    const gate = resolveSendGate({
      standing: readConsentStanding(null),
      audience: readAudience(null),
      approval: { state: APPROVAL_NONE },
      run: { state: UNKNOWN },
      unsubscribeMechanism: UNSUBSCRIBE_ABSENT,
      hasContent: false
    })
    expect(gate.unknown).toEqual(expect.arrayContaining([BLOCK_CONSENT_UNREADABLE, BLOCK_NO_AUDIENCE]))
    expect(gate.blocked).toEqual(expect.arrayContaining([BLOCK_NO_UNSUBSCRIBE, BLOCK_NO_CONTENT, BLOCK_NOT_APPROVED]))
    // Unknown outranks blocked for the button state: fail closed on the absence of a decision.
    expect(gate.state).toBe(GATE_UNKNOWN)
  })

  test('an existing run reports DISPATCHED and still refuses a second send', () => {
    const gate = resolveSendGate(readyInputs({ run: readRun(NEWSLETTER_DETAIL.run) }))
    expect(gate.state).toBe(GATE_DISPATCHED)
    expect(maySend(gate)).toBe(false)
  })

  test('a call with no inputs at all is UNKNOWN, never READY', () => {
    // The default-deny floor: a caller that forgets to pass anything must not be handed a send.
    const gate = resolveSendGate()
    expect(gate.state).toBe(GATE_UNKNOWN)
    expect(maySend(gate)).toBe(false)
    expect(gate.recipientCount).toBeNull()
  })
})

describe('readModuleFlags — the switches no Growth endpoint reports', () => {
  test('a read that never answered is UNKNOWN with null switches, never off', () => {
    // "We could not read the flags" and "the flags are off" send an operator to two different
    // places, so they may not collapse into one another.
    const flags = readModuleFlags(null)
    expect(flags.state).toBe(UNKNOWN)
    expect(flags.module).toBeNull()
    expect(flags.dispatch).toBeNull()
  })

  test('the two Growth rows are found by key inside the full catalog', () => {
    const flags = readModuleFlags(FLAGS_ON)
    expect(flags.state).toBe(READ)
    expect(flags.module).toBe(true)
    expect(flags.dispatch).toBe(true)
  })

  test('a catalog that does not carry a Growth flag leaves it null, not false', () => {
    // A deployment that does not advertise the flag has not told us it is off.
    const flags = readModuleFlags([FLAGS_ON[0]])
    expect(flags.state).toBe(READ)
    expect(flags.module).toBeNull()
    expect(flags.dispatch).toBeNull()
  })

  test('`effective` is read, not `overrideEnabled` — the row is not the whole answer', () => {
    // The backend's own contract: `effective` is what the module's gate resolves; an override row
    // read on its own can disagree with it.
    const flags = readModuleFlags(flagsWith({
      'growth.dispatch': { overrideEnabled: true, effective: false }
    }))
    expect(flags.dispatch).toBe(false)
  })
})

describe('readMailPath — provisioning, and not the running adapter', () => {
  test('a read that never answered is UNKNOWN with a null pause state', () => {
    const path = readMailPath(null)
    expect(path.state).toBe(UNKNOWN)
    expect(path.providers).toEqual([])
    expect(path.anyPaused).toBeNull()
  })

  test('a store with no provider account reads as a real empty list, not as unknown', () => {
    const path = readMailPath(Object.assign({}, HEALTH, { providers: [] }))
    expect(path.state).toBe(READ)
    expect(path.providers).toEqual([])
    expect(path.anyPaused).toBe(false)
  })

  test('ANY paused account marks the store paused — the dispatcher stops on any of them', () => {
    const path = readMailPath(Object.assign({}, HEALTH, {
      providers: [
        { providerKey: 'a', sendingDomain: 'a.example', paused: false },
        { providerKey: 'b', sendingDomain: 'b.example', paused: true }
      ]
    }))
    expect(path.anyPaused).toBe(true)
  })
})

describe('the gate reconciles its badge with what the send route will actually do', () => {
  test('growth.module off BLOCKS — the send would 404 while the gate said ready', () => {
    // THE DEFECT: every lawfulness condition here is satisfied, and the dispatch route still answers
    // an opaque 404 because the store-level module gate is off.
    const gate = resolveSendGate(readyInputs({
      moduleFlags: readModuleFlags(flagsWith({ 'growth.module': { effective: false } }))
    }))
    expect(gate.state).toBe(GATE_BLOCKED)
    expect(gate.blocked).toContain(BLOCK_MODULE_OFF)
    // POSITIVE CONTROL: the only change is the flag.
    expect(resolveSendGate(readyInputs()).state).toBe(GATE_READY)
  })

  test('growth.dispatch off BLOCKS with its OWN reason — the two switches are undone differently', () => {
    const gate = resolveSendGate(readyInputs({
      moduleFlags: readModuleFlags(flagsWith({ 'growth.dispatch': { effective: false } }))
    }))
    expect(gate.state).toBe(GATE_BLOCKED)
    expect(gate.blocked).toContain(BLOCK_DISPATCH_OFF)
    expect(gate.blocked).not.toContain(BLOCK_MODULE_OFF)
  })

  test('a paused provider account BLOCKS', () => {
    const gate = resolveSendGate(readyInputs({
      mailPath: readMailPath(Object.assign({}, HEALTH, {
        providers: [{ providerKey: 'sandbox', sendingDomain: 'mail.example', paused: true }]
      }))
    }))
    expect(gate.state).toBe(GATE_BLOCKED)
    expect(gate.blocked).toContain(BLOCK_PROVIDER_PAUSED)
  })

  test('an unreadable platform is UNKNOWN, and says unreadable rather than off', () => {
    const gate = resolveSendGate(readyInputs({ moduleFlags: readModuleFlags(null) }))
    expect(gate.state).toBe(GATE_UNKNOWN)
    expect(gate.unknown).toContain(BLOCK_PLATFORM_UNREADABLE)
    // Not knowing is never reported as a switch being off — that would send the operator to a
    // control that is already in the right position.
    expect(gate.blocked).not.toContain(BLOCK_MODULE_OFF)
    expect(gate.blocked).not.toContain(BLOCK_DISPATCH_OFF)
  })

  test('both platform reads failing says it once, not twice', () => {
    const gate = resolveSendGate(readyInputs({
      moduleFlags: readModuleFlags(null),
      mailPath: readMailPath(null)
    }))
    expect(gate.unknown.filter(c => c === BLOCK_PLATFORM_UNREADABLE)).toHaveLength(1)
  })

  test('a flag the catalog did not carry is UNKNOWN, never treated as enabled', () => {
    // The dangerous direction: an absent row must not be read as permission to promise a send.
    const gate = resolveSendGate(readyInputs({ moduleFlags: readModuleFlags([FLAGS_ON[0]]) }))
    expect(gate.state).toBe(GATE_UNKNOWN)
    expect(gate.unknown).toContain(BLOCK_PLATFORM_UNREADABLE)
  })
})
