import { shallowMount, mount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import EvidencePage from '~/pages/admin/training-evidence.vue'
import { TRAINING_FORBIDDEN } from '~/utils/training/training-client'

// WHAT THIS FILE IS FOR, AND WHAT IT DELIBERATELY CANNOT SAY.
//
// The page promises a record «slik den kan legges fram ved tilsyn». Until this lane the product had
// no way to hand one over at all — no file, no download, not even a print stylesheet — so a manager
// asked for it on the day could show an inspector a browser tab. The hand-over is a control plus two
// print stylesheets, and those two halves need two different instruments:
//
//   THE CONTROL — this file. When it is offered, what it calls, what it does on a browser that has
//   no print command, and that pressing it never issues a second read. All of that is behaviour in
//   the page's own code and jsdom can measure it.
//
//   THE PAPER — NOT this file, and asserting it here would be worse than not asserting it. jsdom has
//   no print media, no `@media print` cascade and no page box, so a test here could only check that
//   a rule EXISTS in a `.vue` file. This estate has already shipped a print stylesheet that was
//   present in the file and inert in the browser — its guard was a body class vue-meta rebuilt away —
//   and every test stayed green while the document printed with the admin shell down the side of it.
//   The paper is measured in a browser, under emulated print media, against the produced PDF.
//
// So: no assertion below looks at a stylesheet. The furthest this file goes is the paper-only
// heading's PRESENCE in the tree, because a rule that reveals an element the template never renders
// is a rule that reveals nothing — and that is a fact about the markup, not about the cascade.

const PERSON = '44444444-4444-4444-4444-444444444444'

const mockCalls = []
let mockAnswers = {}

jest.mock('~/utils/training/training-client', () => {
  const actual = jest.requireActual('~/utils/training/training-client')
  const record = (name, args) => {
    mockCalls.push([name].concat(args))
    const answer = mockAnswers[name]
    if (answer instanceof Error) { return Promise.reject(answer) }
    return typeof answer === 'function' ? answer.apply(null, args) : Promise.resolve(answer)
  }
  return Object.assign({}, actual, {
    TrainingStoreService: class {
      GetContext (...a) { return record('GetContext', a) }
      GetEvidence (...a) { return record('GetEvidence', a) }
    }
  })
})

// Another module's read, with another module's authorization — refused here on purpose in the
// default answers, because a manager entitled to this document may hold nothing in Workforce and the
// print path must not depend on the picker having been populated.
jest.mock('~/utils/workforce/roster-client', () => ({
  WorkforceRosterService: class {
    ListStaff () { return Promise.resolve(null) }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function context () {
  return {
    storeId: 42,
    capabilities: ['manage'],
    timeZone: { id: 'Europe/Oslo', isFallback: false, currentUtcOffsetMinutes: 120 },
    featureFlags: { 'training.setup': true },
    asOfUtc: '2026-08-07T08:00:00Z'
  }
}

/** One completion, one certificate and the ledger row that filed each — the shape of a real read. */
function evidence () {
  return {
    storeId: 42,
    personRef: PERSON,
    displayName: 'Selma Haug',
    personOnFile: true,
    trainingState: 'RecordedAsPassed',
    timeZoneId: 'Europe/Oslo',
    timeZoneIsFallback: false,
    asOfUtc: '2026-08-07T08:00:00Z',
    integrity: { contentHashLinkage: 'Intact', rowsWithoutAuditEvent: 0 },
    completions: [{
      completionId: 'c-1',
      courseTitle: 'Næringsmiddelhygiene og temperaturkontroll',
      versionNo: 1,
      scorePercent: 85,
      passThresholdPercent: 80,
      passed: true,
      contentHash: 'sha256:db69110e',
      contentPages: 'Krysskontaminering',
      quiz: null,
      linkage: 'Intact',
      auditCoverage: 'Covered',
      recordedBy: 'user-manager',
      source: 'ManagerRecorded',
      completedAtUtc: '2026-08-07T07:59:27Z'
    }],
    certificates: [{
      certificateId: 'cert-1',
      type: 'fagbrev-kokk',
      issuer: 'Vestland fylkeskommune',
      issueDateUtc: '2022-06-29T00:00:00',
      expiryDateUtc: null,
      auditCoverage: 'Covered',
      status: 'Valid'
    }],
    auditChain: [{
      eventType: 'completion.record',
      actorReference: 'user-manager',
      payloadSnapshotJson: '{"passed":"true"}',
      occurredAtUtc: '2026-08-07T07:59:27Z',
      linkedTo: 'completion'
    }]
  }
}

/** A typed training refusal as the client constructs one. */
function refusal (code) {
  const error = new Error('server said so')
  error.isTrainingApiError = true
  error.status = 403
  error.code = code
  error.problem = { code }
  return error
}

function mountPage (mounter = shallowMount) {
  return mounter(EvidencePage, {
    mocks: {
      $i: (key, params) => (params ? key + ' ' + JSON.stringify(params) : key),
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

/** Opens the record the way the manager does: type the reference, submit the form. */
async function openRecord (wrapper) {
  wrapper.setData({ personRef: PERSON })
  wrapper.vm.submit()
  await settled()
}

beforeEach(() => {
  mockCalls.length = 0
  mockAnswers = { GetContext: context(), GetEvidence: evidence() }
})

describe('the record can be handed over', () => {
  test('printing calls the browser\'s own print, which is what produces the paper and the PDF', async () => {
    const wrapper = mountPage()
    await settled()
    await openRecord(wrapper)

    const original = window.print
    window.print = jest.fn()
    wrapper.vm.printDocument()
    expect(window.print).toHaveBeenCalled()
    expect(wrapper.vm.printFailure).toBe('')
    window.print = original
  })

  test('a browser with no print command says so, rather than a button that appears to work', async () => {
    const wrapper = mountPage()
    await settled()
    await openRecord(wrapper)

    const original = window.print
    window.print = undefined
    wrapper.vm.printDocument()
    expect(wrapper.vm.printFailure).toBe('trn_ev_print_unavailable')
    window.print = original
  })

  test('the refusal is its OWN line and never the read\'s banner', async () => {
    // `failure` is keyed on a `training.*` code the server issued. A browser without a print command
    // is not a thing the server has an opinion about, and attributing it to the module would be the
    // page blaming a backend for the reader's browser.
    const wrapper = mountPage()
    await settled()
    await openRecord(wrapper)

    const original = window.print
    window.print = undefined
    wrapper.vm.printDocument()
    expect(wrapper.vm.failure).toBe('')
    window.print = original
  })

  test('a second press never issues a second read, so it never writes a second disclosure', async () => {
    // `GET …/evidence` appends an `evidence.read` row and commits it in the same request; there is
    // no path that removes one. A print that re-fetched would write «this manager opened this
    // person's file» for somebody who only pressed print, twice, permanently.
    const wrapper = mountPage()
    await settled()
    await openRecord(wrapper)
    expect(mockCalls.filter(c => c[0] === 'GetEvidence')).toHaveLength(1)

    const original = window.print
    window.print = jest.fn()
    wrapper.vm.printDocument()
    wrapper.vm.printDocument()
    await settled()
    expect(mockCalls.filter(c => c[0] === 'GetEvidence')).toHaveLength(1)
    window.print = original
  })
})

describe('nothing is offered for printing that is not the record', () => {
  test('an idle page offers no print — the paper would carry a heading and «choose a person»', async () => {
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.evidence.state).toBe('idle')
    expect(wrapper.vm.canPrint).toBe(false)
  })

  test('a REFUSED read is not printable, because a refusal on this page\'s letterhead reads as a clean file', async () => {
    mockAnswers.GetEvidence = refusal(TRAINING_FORBIDDEN)
    const wrapper = mountPage()
    await settled()
    await openRecord(wrapper)

    expect(wrapper.vm.evidence.state).toBe('refused')
    expect(wrapper.vm.canPrint).toBe(false)
  })

  test('a read that never came back is not printable either', async () => {
    mockAnswers.GetEvidence = new Error('the network, not the server')
    const wrapper = mountPage()
    await settled()
    await openRecord(wrapper)

    expect(wrapper.vm.evidence.state).toBe('unknown')
    expect(wrapper.vm.canPrint).toBe(false)
  })

  test('an EMPTY record IS printable — «this store holds nothing for this person» is a finding', async () => {
    // The document a venue is asked for may honestly be empty, and an inspection can act on that.
    // Withholding the paper copy of it would be the product deciding which findings may be produced.
    mockAnswers.GetEvidence = Object.assign(evidence(), {
      trainingState: 'NoCompletionOnFile', completions: [], certificates: [], auditChain: []
    })
    const wrapper = mountPage()
    await settled()
    await openRecord(wrapper)

    expect(wrapper.vm.canPrint).toBe(true)
  })

  test('switching store clears the document AND withdraws the print offer with it', async () => {
    // The record belongs to the store it was read from. A print button still live after the switch
    // would put one store's record under another store's heading.
    const wrapper = mountPage()
    await settled()
    await openRecord(wrapper)
    expect(wrapper.vm.canPrint).toBe(true)

    wrapper.vm.$store.state.selectedAdminStore = 43
    wrapper.vm.init()
    await settled()

    expect(wrapper.vm.canPrint).toBe(false)
  })
})

describe('the control and the paper-only heading are really in the tree', () => {
  // A rule that reveals an element nothing renders reveals nothing, and a handler no control is
  // bound to is the unreachable-capability shape this branch has shipped four times.

  test('the button is rendered, bound, and disabled until there is a record', async () => {
    const wrapper = mountPage(mount)
    await settled()

    const button = wrapper.find('[data-test="evidence-print"]')
    expect(button.exists()).toBe(true)
    expect(button.attributes('disabled')).toBeTruthy()

    await openRecord(wrapper)
    expect(wrapper.find('[data-test="evidence-print"]').attributes('disabled')).toBeFalsy()

    const original = window.print
    window.print = jest.fn()
    wrapper.find('[data-test="evidence-print"]').trigger('click')
    expect(window.print).toHaveBeenCalled()
    window.print = original
  })

  test('the paper-only heading is rendered on screen too, hidden by CSS rather than absent', async () => {
    // It has to EXIST for the print rule to reveal it. Rendering it only when printing is not
    // something a stylesheet can do, and a `v-if` on a media query is not something Vue can do.
    const wrapper = mountPage(mount)
    await settled()
    await openRecord(wrapper)

    expect(wrapper.find('.trn-ev-page__sheet-head').exists()).toBe(true)
    expect(wrapper.find('.trn-ev-page__sheet-title').text()).toBe('trn_ev_page_title')
  })
})
