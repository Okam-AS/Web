import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import GrowthNewsletterPage from '~/pages/admin/growth-newsletter.vue'
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
    EditDraft (storeId, id, req) { return this._call('EditDraft', [storeId, id, req], DETAIL_DRAFT) }
    TestSend (storeId, id, addr) { return this._call('TestSend', [storeId, id, addr], { accepted: true, status: 'Accepted' }) }
    Approve (storeId, id, req) { return this._call('Approve', [storeId, id, req], { approvalId: 7002 }) }
    Dispatch (storeId, id) { return this._call('Dispatch', [storeId, id], { run: RUN }) }
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

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function mountPage () {
  return shallowMount(GrowthNewsletterPage, {
    mocks: {
      $i: key => key,
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

beforeEach(() => {
  calls.length = 0
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
    wrapper.setData({ form: { subject: 'S2', contentJson: 'C2', plainTextAlternative: '' } })
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
