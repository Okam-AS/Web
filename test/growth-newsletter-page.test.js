import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import GrowthNewsletterPage from '~/pages/admin/growth-newsletter.vue'
import translations from '~/translations'
import { GrowthApiError } from '~/utils/growth/api-client'
import { UNSUBSCRIBE_ABSENT, UNSUBSCRIBE_PRESENT, GATE_READY } from '~/utils/growth/send-gate'

const calls = []
// Per-method overrides a test can install to make one read fail or answer differently.
const behaviour = {}

// The page builds its client in a computed, so the module is mocked rather than the instance. Every
// call is recorded so the tests can assert WHICH requests each step issues — the part of this page
// that is a contract with the backend rather than a rendering choice.
jest.mock('~/utils/growth/growth-client', () => ({
  NEWSLETTER_SUBSCRIBERS: 'newsletter-subscribers',
  GrowthService: class {
    _call (name, args, fallback) {
      calls.push([name].concat(args))
      const override = behaviour[name]
      if (typeof override === 'function') { return override.apply(null, args) }
      return Promise.resolve(fallback)
    }

    GetConsentSummary (storeId) { return this._call('GetConsentSummary', [storeId], SUMMARY) }
    ListSegments (storeId) { return this._call('ListSegments', [storeId], { storeId, segments: [] }) }
    ComputeSnapshot (storeId, key) { return this._call('ComputeSnapshot', [storeId, key], SNAPSHOT) }
    ListNewsletters (storeId, o) { return this._call('ListNewsletters', [storeId, o], { storeId, items: [], nextCursor: null }) }
    CreateDraft (storeId, req) { return this._call('CreateDraft', [storeId, req], DETAIL_DRAFT) }
    GetNewsletter (storeId, id) { return this._call('GetNewsletter', [storeId, id], DETAIL_DRAFT) }
    EditDraft (storeId, id, req) { return this._call('EditDraft', [storeId, id, req], DETAIL_EDITED) }
    TestSend (storeId, id, addr) { return this._call('TestSend', [storeId, id, addr], { accepted: true, status: 'Accepted' }) }
    Approve (storeId, id, req) { return this._call('Approve', [storeId, id, req], { approvalId: 7002 }) }
    Dispatch (storeId, id) { return this._call('Dispatch', [storeId, id], { run: RUN }) }
    GetDeliveryHealth (storeId) { return this._call('GetDeliveryHealth', [storeId], HEALTH) }
  },
  StoreFeatureFlagReader: class {
    GetStoreFlags (storeId) {
      calls.push(['GetStoreFlags', storeId])
      const override = behaviour.GetStoreFlags
      if (typeof override === 'function') { return override(storeId) }
      return Promise.resolve(FLAGS_ON)
    }
  }
}))

// The shipped platform capability, made flippable so a test can prove the page's OWN wiring can
// reach a ready gate — which is what makes the refusal below attributable to the capability rather
// than to a page that could never send anything.
let mockUnsubscribe = UNSUBSCRIBE_ABSENT
jest.mock('~/utils/growth/platform-capability', () => ({
  get UNSUBSCRIBE_MECHANISM () { return mockUnsubscribe }
}))

const SUMMARY = {
  storeId: 42,
  consentedContacts: 120,
  withdrawnContacts: 9,
  suppressedContacts: 14,
  pendingInvites: 3,
  suppressionsByReason: { Unsubscribe: 8 }
}

const SNAPSHOT = {
  snapshotId: 3002,
  segmentKey: 'newsletter-subscribers',
  definitionVersion: 1,
  watermarkHash: 'sha256:aabbccdd',
  computedAt: '2026-07-20T09:30:00+00:00',
  includedCount: 42,
  excludedCount: 6,
  exclusionReasonBreakdown: { Suppressed: 3 }
}

// A draft with a LIVE approval pinning its current version — everything the gate needs except the
// unsubscribe mechanism.
const DETAIL_DRAFT = {
  id: 1002,
  storeId: 42,
  state: 'Approved',
  createdAt: '2026-07-20T10:00:00+00:00',
  createdByUserId: 'admin-user-1',
  currentVersion: {
    versionId: 5002,
    versionNo: 2,
    subject: 'Sommermeny',
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
  boundSnapshot: { snapshotId: 3002, watermarkHash: 'sha256:aabbccdd', includedCount: 42, excludedCount: 6 },
  run: null
}

// What an EDIT returns: a NEW immutable version. The id differs from `DETAIL_DRAFT`'s, which is what
// lets the tests tell "the boxes hold the version the server has" from "the boxes hold something
// else" — the whole basis of the replace guard. Spelled out rather than spread from `DETAIL_DRAFT`
// because `jest.mock`'s factory may only close over ALL_CAPS constants initialised to plain values.
const DETAIL_EDITED = {
  id: 1002,
  storeId: 42,
  state: 'Draft',
  createdAt: '2026-07-20T10:00:00+00:00',
  createdByUserId: 'admin-user-1',
  currentVersion: {
    versionId: 5003,
    versionNo: 3,
    subject: 'Sommermeny',
    contentHash: 'sha256:9f8e7d6c5b',
    createdAt: '2026-07-20T10:20:00+00:00'
  },
  // An edit invalidates the live approval — the backend's own rule, and what makes the edited detail
  // a materially different body from the draft one.
  approval: {
    state: 'None',
    approvalId: null,
    newsletterVersionId: null,
    approvedAt: null,
    invalidatedAt: '2026-07-20T10:20:00+00:00'
  },
  boundSnapshot: { snapshotId: 3002, watermarkHash: 'sha256:aabbccdd', includedCount: 42, excludedCount: 6 },
  run: null
}

const RUN = {
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
  openRateLabel: 'event-deduped',
  startedAt: '2026-07-20T11:00:00+00:00',
  completedAt: null
}

// `GET /stores/{storeId}/feature-flags` — the two store switches the send route checks before any
// Growth rule. Transcribed from `StoreFeatureFlagState`.
const FLAGS_ON = [
  { flagKey: 'growth.module', module: 'Growth', title: 'Module (guest capture)', defaultEnabled: false, isOverridden: true, overrideEnabled: true, effective: true },
  { flagKey: 'growth.dispatch', module: 'Growth', title: 'Live newsletter dispatch (kill switch)', defaultEnabled: false, isOverridden: true, overrideEnabled: true, effective: true }
]
const flagsWith = overrides => FLAGS_ON.map(row => Object.assign({}, row, overrides[row.flagKey] || {}))

// `GET /v1/growth/stores/{storeId}/delivery-health` — only `providers` is read by this surface.
const HEALTH = {
  storeId: 42,
  providers: [{ providerKey: 'sandbox', sendingDomain: 'mail.virksomheten.no', paused: false }]
}

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

// `$i` still resolves to the raw key (every existing assertion reads the key, which is the stable
// thing), but the interpolation PARAMS are recorded — because for the send toast the values are the
// claim: "the provider accepted 40 of 40" is a different sentence from "the newsletter was sent",
// and only the params can show which one the page built.
const i18nCalls = []

function mountPage () {
  return shallowMount(GrowthNewsletterPage, {
    mocks: {
      $i: (key, params) => { i18nCalls.push([key, params]); return key },
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      // The Core initializer the global mixin normally supplies. `core/` is an uninitialised
      // submodule by design, so plugins/global-mixin.js can never load in a test; the workforce page
      // tests supply the same stand-in, and only `bearerToken` is ever read from it.
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

const callsTo = name => calls.filter(c => c[0] === name)
const i18nParamsFor = key => (i18nCalls.filter(c => c[0] === key).pop() || [])[1]

// A `GetNewsletter` that answers with no run until the dispatch has happened — what the real server
// does, and what keeps `selectNewsletter` from opening an already-dispatched newsletter.
function newsletterWithRunAfterDispatch (run) {
  return () => Promise.resolve(Object.assign({}, DETAIL_DRAFT, {
    run: callsTo('Dispatch').length ? run : null
  }))
}

beforeEach(() => {
  calls.length = 0
  i18nCalls.length = 0
  Object.keys(behaviour).forEach(k => delete behaviour[k])
  mockUnsubscribe = UNSUBSCRIBE_ABSENT
})

describe('the Growth page — what it reads', () => {
  test('it opens by reading consent standing and the newsletter list, scoped to the store', async () => {
    mountPage()
    await settled()
    expect(callsTo('GetConsentSummary')).toEqual([['GetConsentSummary', 42]])
    expect(callsTo('ListNewsletters')).toHaveLength(1)
    // It does NOT compute an audience on load: a snapshot is an immutable record, not a page read.
    expect(callsTo('ComputeSnapshot')).toHaveLength(0)
  })

  test('a failed consent read leaves the standing UNKNOWN — the list still loads', async () => {
    behaviour.GetConsentSummary = () => Promise.reject(new GrowthApiError(500, null))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.standing.state).toBe('unknown')
    expect(wrapper.vm.standing.consented).toBeNull()
    // The reads are independent, so one failing does not blank the other.
    expect(callsTo('ListNewsletters')).toHaveLength(1)
    expect(wrapper.vm.blocker).toBe('')
  })

  test('a 403 on the store read blocks the page rather than showing an empty one', async () => {
    behaviour.GetConsentSummary = () => Promise.reject(new GrowthApiError(403, { error: { code: 'growth.forbidden' } }))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.blocker).toBe('growth_error_forbidden')
  })

  test('computing the audience asks for the one system segment by key', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.computeAudience()
    expect(callsTo('ComputeSnapshot')).toEqual([['ComputeSnapshot', 42, 'newsletter-subscribers']])
    expect(wrapper.vm.audience.includedCount).toBe(42)
  })
})

describe('the Growth page — authoring is bound to an audience', () => {
  test('a draft cannot be written before an audience exists, and can after', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.canAuthor).toBe(false)
    // POSITIVE CONTROL: computing one flips it, so the refusal is about the missing snapshot.
    await wrapper.vm.computeAudience()
    expect(wrapper.vm.canAuthor).toBe(true)
  })

  test('creating a draft binds it to the computed snapshot id', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.computeAudience()
    wrapper.setData({ form: { subject: 'S', contentJson: 'C', plainTextAlternative: 'P' } })
    await wrapper.vm.saveDraft()
    expect(callsTo('CreateDraft')[0][2]).toEqual({
      subject: 'S', contentJson: 'C', plainTextAlternative: 'P', segmentSnapshotId: 3002
    })
  })

  test('an edit carries the current version as its base — the concurrency guard', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.computeAudience()
    await wrapper.vm.selectNewsletter('1002')
    // The body of an opened newsletter is never on screen (the detail read carries none), so the
    // replacement has to be acknowledged before the write is offered — see the data-loss block below.
    wrapper.setData({ form: { subject: 'S2', contentJson: 'C2', plainTextAlternative: '' }, replaceBodyAck: true })
    await wrapper.vm.saveDraft()
    expect(callsTo('EditDraft')[0][3].baseVersionNo).toBe(2)
  })

  test('approval posts the exact triple the backend 409s on drift', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectNewsletter('1002')
    await wrapper.vm.approve()
    expect(callsTo('Approve')[0][3]).toEqual({
      newsletterVersionId: 5002, contentHash: 'sha256:2b3c4d5e6f', segmentSnapshotId: 3002
    })
  })

  test('THE DATA LOSS: opening a saved newsletter does not carry another one\'s body into it', async () => {
    // The body is never returned by any read (`GrowthNewsletterVersionSummary` = versionId, versionNo,
    // subject, contentHash, createdAt). Restoring it is impossible, so the only safe thing is that
    // whatever the boxes held a moment ago does NOT survive the switch — otherwise a save appends one
    // newsletter's body as another's next immutable version, and the chain cannot be edited after.
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.computeAudience()
    wrapper.setData({ form: { subject: 'Draft A', contentJson: 'BODY OF A', plainTextAlternative: 'PLAIN A' } })

    await wrapper.vm.selectNewsletter('1002')
    expect(wrapper.vm.form.contentJson).toBe('')
    expect(wrapper.vm.form.plainTextAlternative).toBe('')
    // The subject IS restored — it is the one field the server vouches for.
    expect(wrapper.vm.form.subject).toBe('Sommermeny')
  })

  test('the save is refused while the stored body is invisible and unacknowledged', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.computeAudience()
    await wrapper.vm.selectNewsletter('1002')
    expect(wrapper.vm.bodyIsHidden).toBe(true)

    wrapper.setData({ form: { subject: 'Ny tittel', contentJson: 'noe', plainTextAlternative: '' } })
    expect(wrapper.vm.canSave).toBe(false)
    // Not merely a disabled attribute: the method itself issues no write.
    await wrapper.vm.saveDraft()
    expect(callsTo('EditDraft')).toHaveLength(0)

    // POSITIVE CONTROL: acknowledging the replacement is the only thing that changes, and the write
    // then goes through — so the refusal is attributable to the guard and not to a broken form.
    wrapper.setData({ replaceBodyAck: true })
    expect(wrapper.vm.canSave).toBe(true)
    await wrapper.vm.saveDraft()
    expect(callsTo('EditDraft')).toHaveLength(1)
  })

  test('an empty body can never be written over a stored one', async () => {
    // The backend 400s on empty content, but the refusal has to happen here too: the operator must
    // not be able to fire a write whose only outcome is an error against an append-only chain.
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.computeAudience()
    await wrapper.vm.selectNewsletter('1002')
    wrapper.setData({ form: { subject: 'Ny tittel', contentJson: '', plainTextAlternative: '' }, replaceBodyAck: true })
    expect(wrapper.vm.canSave).toBe(false)
    await wrapper.vm.saveDraft()
    expect(callsTo('EditDraft')).toHaveLength(0)
  })

  test('after a save the body IS the server version, and the warning goes away — until the next one', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.computeAudience()
    wrapper.setData({ form: { subject: 'S', contentJson: 'C', plainTextAlternative: 'P' } })
    await wrapper.vm.saveDraft()
    // A draft this session authored: the boxes and the server agree, for exactly this version.
    expect(wrapper.vm.bodyIsHidden).toBe(false)

    // Editing it produces a NEW version id, and the boxes still hold what was written to it.
    wrapper.setData({ form: { subject: 'S2', contentJson: 'C2', plainTextAlternative: 'P2' } })
    await wrapper.vm.saveDraft()
    expect(wrapper.vm.bodyIsHidden).toBe(false)
    expect(wrapper.vm.replaceBodyAck).toBe(false)

    // Re-opening it from the list loses the body again, and says so again.
    await wrapper.vm.selectNewsletter('1002')
    expect(wrapper.vm.bodyIsHidden).toBe(true)
  })

  test('the audience shown is the one BOUND to the open newsletter, not the last computed', async () => {
    // A recipient count beside a draft bound to a different snapshot would be a count for a send
    // that will not happen.
    behaviour.ComputeSnapshot = () => Promise.resolve(Object.assign({}, SNAPSHOT, { snapshotId: 4444, includedCount: 999 }))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.computeAudience()
    expect(wrapper.vm.audience.includedCount).toBe(999)
    await wrapper.vm.selectNewsletter('1002')
    expect(wrapper.vm.audience.snapshotId).toBe(3002)
    expect(wrapper.vm.audience.includedCount).toBe(42)
  })
})

describe('the Growth page — the send, as shipped', () => {
  test('THE STOP: with everything else lawful, the page still refuses to dispatch', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectNewsletter('1002')

    // Consent read, audience bound and non-empty, content saved, approval live and pinning the
    // current version. Every condition the venue controls is met.
    expect(wrapper.vm.standing.state).toBe('read')
    expect(wrapper.vm.audience.includedCount).toBe(42)
    expect(wrapper.vm.hasContent).toBe(true)
    expect(wrapper.vm.approval.state).toBe('live')

    // And it is still not ready, because recipients would have no working way to unsubscribe.
    expect(wrapper.vm.gate.state).not.toBe(GATE_READY)
    expect(wrapper.vm.gate.blocked).toContain('growth.gate.no_unsubscribe_mechanism')

    // Not merely a disabled button: the method itself issues no request.
    await wrapper.vm.dispatch()
    expect(callsTo('Dispatch')).toHaveLength(0)
  })

  test('POSITIVE CONTROL: the same page DOES dispatch once the mechanism is present', async () => {
    // This is what makes the refusal above meaningful. The only change is the platform capability;
    // every other input is identical, and the page then issues the send.
    mockUnsubscribe = UNSUBSCRIBE_PRESENT
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectNewsletter('1002')
    expect(wrapper.vm.gate.state).toBe(GATE_READY)

    await wrapper.vm.dispatch()
    expect(callsTo('Dispatch')).toEqual([['Dispatch', 42, 1002]])
    // It re-reads the newsletter afterwards so the run counts come from the server, never from the
    // dispatch call's own optimistic echo.
    expect(callsTo('GetNewsletter').length).toBeGreaterThan(1)
  })

  test('an unreadable consent record refuses the send even with the mechanism present', async () => {
    mockUnsubscribe = UNSUBSCRIBE_PRESENT
    behaviour.GetConsentSummary = () => Promise.reject(new GrowthApiError(500, null))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectNewsletter('1002')
    expect(wrapper.vm.gate.state).toBe('unknown')
    await wrapper.vm.dispatch()
    expect(callsTo('Dispatch')).toHaveLength(0)
  })

  test('a typed refusal renders its growth.* code, not the server prose', async () => {
    mockUnsubscribe = UNSUBSCRIBE_PRESENT
    behaviour.Dispatch = () => Promise.reject(
      new GrowthApiError(409, { error: { code: 'growth.no_live_approval', message: 'server prose' } }))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectNewsletter('1002')
    await wrapper.vm.dispatch()
    expect(wrapper.vm.toast.type).toBe('error')
    expect(wrapper.vm.toast.message).toBe('growth_error_no_live_approval')
  })

  test('THE FALSE CLAIM: the send toast reports what the provider accepted, not that mail arrived', async () => {
    mockUnsubscribe = UNSUBSCRIBE_PRESENT
    behaviour.GetNewsletter = newsletterWithRunAfterDispatch(RUN)
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectNewsletter('1002')
    await wrapper.vm.dispatch()

    expect(wrapper.vm.toast.type).toBe('success')
    // The sentence is built from the server's own run counts — 40 accepted of 40 eligible — and
    // `deliveredCount` (0 here) is deliberately not in it, because a dispatch response contains no
    // delivery. The sentence itself lives in the dictionary and is asserted there.
    expect(i18nParamsFor('growth_gate_dispatched_toast')).toEqual({ accepted: '40', eligible: '40' })
  })

  test('a run count the server did not vouch for is a dash inside the toast, never a 0', async () => {
    mockUnsubscribe = UNSUBSCRIBE_PRESENT
    behaviour.GetNewsletter = newsletterWithRunAfterDispatch(
      Object.assign({}, RUN, { providerAcceptedCount: null, finalEligibleCount: null }))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectNewsletter('1002')
    await wrapper.vm.dispatch()
    expect(i18nParamsFor('growth_gate_dispatched_toast')).toEqual({ accepted: '—', eligible: '—' })
  })

  test('the run counters can be re-read, and the page records when it read them', async () => {
    mockUnsubscribe = UNSUBSCRIBE_PRESENT
    behaviour.GetNewsletter = newsletterWithRunAfterDispatch(RUN)
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectNewsletter('1002')
    await wrapper.vm.dispatch()
    const reads = callsTo('GetNewsletter').length
    const firstStamp = wrapper.vm.runReadAt
    expect(firstStamp).toBeInstanceOf(Date)

    await wrapper.vm.refreshRun()
    expect(callsTo('GetNewsletter').length).toBe(reads + 1)
    expect(wrapper.vm.runReadAt.getTime()).toBeGreaterThanOrEqual(firstStamp.getTime())
  })

  test('growth.module off is named on the gate instead of being discovered as a 404', async () => {
    mockUnsubscribe = UNSUBSCRIBE_PRESENT
    behaviour.GetStoreFlags = () => Promise.resolve(flagsWith({ 'growth.module': { effective: false } }))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectNewsletter('1002')
    expect(wrapper.vm.gate.state).toBe('blocked')
    expect(wrapper.vm.gate.blocked).toContain('growth.gate.module_off')
    await wrapper.vm.dispatch()
    expect(callsTo('Dispatch')).toHaveLength(0)
    // And the test-send, which carries the same module gate, is held rather than left to 404.
    expect(wrapper.vm.moduleIsOff).toBe(true)
  })

  test('growth.dispatch off blocks the gate with its own reason', async () => {
    mockUnsubscribe = UNSUBSCRIBE_PRESENT
    behaviour.GetStoreFlags = () => Promise.resolve(flagsWith({ 'growth.dispatch': { effective: false } }))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectNewsletter('1002')
    expect(wrapper.vm.gate.blocked).toContain('growth.gate.dispatch_off')
    // The module is still on, so the test-send stays available.
    expect(wrapper.vm.moduleIsOff).toBe(false)
  })

  test('a failed flag read leaves the page usable but the gate unresolved', async () => {
    // The flags route answers 403 where the Growth routes answer 404, so it must not raise the
    // store-level blocker — and it must not be read as permission either.
    mockUnsubscribe = UNSUBSCRIBE_PRESENT
    behaviour.GetStoreFlags = () => Promise.reject(new GrowthApiError(403, null))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.blocker).toBe('')
    await wrapper.vm.selectNewsletter('1002')
    expect(wrapper.vm.gate.state).toBe('unknown')
    expect(wrapper.vm.gate.unknown).toContain('growth.gate.platform_unreadable')
    await wrapper.vm.dispatch()
    expect(callsTo('Dispatch')).toHaveLength(0)
  })

  test('a paused provider account blocks, and is read from delivery-health', async () => {
    mockUnsubscribe = UNSUBSCRIBE_PRESENT
    behaviour.GetDeliveryHealth = () => Promise.resolve({
      storeId: 42, providers: [{ providerKey: 'sandbox', sendingDomain: 'mail.example', paused: true }]
    })
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectNewsletter('1002')
    expect(wrapper.vm.gate.blocked).toContain('growth.gate.provider_paused')
    expect(callsTo('GetDeliveryHealth')).toEqual([['GetDeliveryHealth', 42]])
  })

  test('every dispatch-preflight refusal has its own sentence, not the generic one', async () => {
    // All four used to render «Noe gikk galt. Ingenting ble sendt.», which tells an operator to retry
    // when the fix is a switch, a config value or a paused account.
    mockUnsubscribe = UNSUBSCRIBE_PRESENT
    const cases = [
      ['growth.dispatch_disabled', 'growth_error_dispatch_disabled'],
      ['growth.provider_paused', 'growth_error_provider_paused'],
      ['growth.unsubscribe_unconfigured', 'growth_error_unsubscribe_unconfigured'],
      ['growth.preference_centre_unconfigured', 'growth_error_preference_centre_unconfigured']
    ]
    for (const entry of cases) {
      behaviour.Dispatch = () => Promise.reject(
        new GrowthApiError(409, { error: { code: entry[0], message: 'server prose' } }))
      const wrapper = mountPage()
      await settled()
      await wrapper.vm.selectNewsletter('1002')
      await wrapper.vm.dispatch()
      expect(wrapper.vm.toast.message).toBe(entry[1])
      expect(wrapper.vm.toast.message).not.toBe('growth_error_generic')
    }
  })

  test('a code this surface does not know falls to the generic message, not a raw key', async () => {
    // POSITIVE CONTROL for the map above: an unrecognised code must not render
    // `growth_error_something_new` at an operator, and must not be mistaken for a known refusal.
    mockUnsubscribe = UNSUBSCRIBE_PRESENT
    behaviour.Dispatch = () => Promise.reject(
      new GrowthApiError(409, { error: { code: 'growth.something_new', message: 'server prose' } }))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectNewsletter('1002')
    await wrapper.vm.dispatch()
    expect(wrapper.vm.toast.message).toBe('growth_error_generic')
    // And never the server's own prose, which is English and may be reworded.
    expect(wrapper.vm.toast.message).not.toBe('server prose')
  })
})

describe('the copy itself — what the screen is allowed to assert', () => {
  const LOCALES = ['no', 'en', 'de']

  test('the send confirmation names the accepted/eligible counts in every locale', () => {
    // A sentence without both placeholders would be an unqualified claim again, in whichever
    // language dropped them.
    LOCALES.forEach((locale) => {
      const copy = translations[locale].growth_gate_dispatched_toast
      expect(copy).toEqual(expect.stringContaining('{accepted}'))
      expect(copy).toEqual(expect.stringContaining('{eligible}'))
    })
  })

  test('the shipped Norwegian confirmation no longer claims the newsletter was sent', () => {
    // The exact string this lane removed. Pinned so it cannot come back as a "shorter" rewrite.
    expect(translations.no.growth_gate_dispatched_toast).not.toBe('Nyhetsbrevet ble sendt.')
    expect(translations.en.growth_gate_dispatched_toast).not.toBe('The newsletter was sent.')
  })

  test('every key this page and its components render exists in all three locales', () => {
    // A missing key renders as the raw key at an operator, and the page-level mock cannot catch that
    // because it returns the key by design.
    const keys = [
      'growth_draft_body_hidden_title', 'growth_draft_body_hidden', 'growth_draft_content_hidden_placeholder',
      'growth_draft_replace_ack', 'growth_draft_replace', 'growth_draft_replaced',
      'growth_test_module_off', 'growth_approval_unseen_body',
      'growth_gate_ready_caveat', 'growth_gate_mail_path', 'growth_gate_mail_unknown',
      'growth_gate_mail_none', 'growth_gate_mail_paused', 'growth_gate_mail_binding_note',
      'growth_gate_dispatched_toast', 'growth_gate_dispatched_note',
      'growth_block_module_off', 'growth_block_dispatch_off', 'growth_block_provider_paused',
      'growth_block_platform_unreadable',
      'growth_run_state_pending', 'growth_run_state_in_progress', 'growth_run_state_completed',
      'growth_run_state_reconciliation', 'growth_run_refresh', 'growth_run_refreshing',
      'growth_run_read_at', 'growth_run_read_unknown', 'growth_run_refresh_note',
      'growth_error_dispatch_disabled', 'growth_error_provider_paused',
      'growth_error_unsubscribe_unconfigured', 'growth_error_preference_centre_unconfigured'
    ]
    LOCALES.forEach((locale) => {
      keys.forEach((key) => {
        expect(typeof translations[locale][key]).toBe('string')
        expect(translations[locale][key].length).toBeGreaterThan(0)
      })
    })
  })
})

describe('the shipped platform capability', () => {
  test('UNSUBSCRIBE_MECHANISM ships as present, and that is the state of the backend', () => {
    // Read past the mock. This test exists to make the value a DELIBERATE statement about the
    // backend rather than a default nobody re-examines — so it is updated, never deleted, whenever
    // the backend's answer changes.
    //
    // It shipped as `absent` and was flipped at backend 4e2e3147, which closed all three conditions
    // the previous version of this comment demanded: the dispatcher now mints a per-recipient token
    // on the production path, composes the List-Unsubscribe pair and attaches it before the
    // irreversible Submitting transition, and an input formatter accepts the RFC 8058 form-encoded
    // body so the endpoint is no longer a 415. The backend's own 415 pin was inverted rather than
    // deleted, so reverting that action turns it red there.
    //
    // Flipping this back to absent is equally a statement, and equally requires evidence.
    const actual = jest.requireActual('~/utils/growth/platform-capability')
    expect(actual.UNSUBSCRIBE_MECHANISM).toBe(UNSUBSCRIBE_PRESENT)
  })
})
