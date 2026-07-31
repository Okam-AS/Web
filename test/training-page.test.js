import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mock must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import TrainingPage from '~/pages/admin/training-courses.vue'
import { WorkforceApiError } from '~/utils/workforce/api-client'

const COURSE = '11111111-1111-1111-1111-111111111111'
const PUBLISHED_V = '22222222-2222-2222-2222-222222222222'
const DRAFT_V = '33333333-3333-3333-3333-333333333333'
const PERSON = '44444444-4444-4444-4444-444444444444'
const ROLE = '99999999-9999-9999-9999-999999999999'

// Both are `mock`-prefixed because `jest.mock`'s factory is hoisted above them and only
// mock-prefixed identifiers may be referenced from inside it.
const mockCalls = []
let mockAnswers = {}

function mockRoster (name, args) {
  mockCalls.push([name].concat(args))
  const answer = mockAnswers[name]
  return typeof answer === 'function' ? answer.apply(null, args) : Promise.resolve(answer)
}

// The page builds its client in a computed, so the module is mocked rather than the instance. Every
// call is recorded so the tests can assert WHICH calls the page issues — the part of this page that
// is a contract with the backend rather than a rendering choice.
//
// `gateOf`, `codeOf` and everything in `journey.js` are deliberately the REAL ones: the page's whole
// honest-state story is those functions' output, and stubbing them would let the page pass while
// classifying nothing.
jest.mock('~/utils/training/training-client', () => {
  const actual = jest.requireActual('~/utils/training/training-client')
  const record = (name, args) => {
    mockCalls.push([name].concat(args))
    const answer = mockAnswers[name]
    return typeof answer === 'function' ? answer.apply(null, args) : Promise.resolve(answer)
  }
  return Object.assign({}, actual, {
    TrainingStoreService: class {
      GetContext (...a) { return record('GetContext', a) }
      ListCourses (...a) { return record('ListCourses', a) }
      GetCourse (...a) { return record('GetCourse', a) }
      CreateCourse (...a) { return record('CreateCourse', a) }
      CreateVersion (...a) { return record('CreateVersion', a) }
      PublishVersion (...a) { return record('PublishVersion', a) }
      ListAssignments (...a) { return record('ListAssignments', a) }
      CreateAssignment (...a) { return record('CreateAssignment', a) }
      RevokeAssignment (...a) { return record('RevokeAssignment', a) }
      ListCompletions (...a) { return record('ListCompletions', a) }
      RecordCompletion (...a) { return record('RecordCompletion', a) }
      ListCertificates (...a) { return record('ListCertificates', a) }
      RegisterCertificate (...a) { return record('RegisterCertificate', a) }
      GetHoldings (...a) { return record('GetHoldings', a) }
    }
  })
})

// The WORKFORCE roster/role reads the page makes purely to name references. Mocked separately from
// the Training client because the whole point of them is that they are ANOTHER module's calls with
// another module's authorization, and can be refused on their own.
jest.mock('~/utils/workforce/roster-client', () => ({
  WorkforceRosterService: class {
    ListStaff (...a) { return mockRoster('ListStaff', a) }
    ListRoles (...a) { return mockRoster('ListRoles', a) }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function context (over) {
  return Object.assign({
    storeId: 42,
    capabilities: ['manage'],
    timeZone: { id: 'Europe/Oslo', isFallback: false, currentUtcOffsetMinutes: 120 },
    featureFlags: {
      'training.setup': true,
      'training.assignments': true,
      'training.onboarding': false,
      'training.checklists': false,
      'training.deviations': false,
      'training.competency-seam': true,
      'training.reminders': false
    },
    competencySeamBound: true,
    asOfUtc: '2026-07-29T08:00:00Z'
  }, over)
}

function courseDetail () {
  return {
    storeId: 42,
    courseId: COURSE,
    title: 'Internkontroll grunnkurs',
    category: 'IK',
    competencyKey: 'food-hygiene',
    isActive: true,
    createdAtUtc: '2026-07-01T09:00:00',
    versions: [
      { courseVersionId: PUBLISHED_V, versionNo: 1, state: 'Published', passThresholdPercent: 80, contentHash: 'abcdef0123456789', publishedAtUtc: '2026-07-02T09:00:00', createdAtUtc: '2026-07-01T09:05:00' },
      { courseVersionId: DRAFT_V, versionNo: 2, state: 'Draft', passThresholdPercent: 80, contentHash: 'fedcba9876543210', publishedAtUtc: null, createdAtUtc: '2026-07-03T09:05:00' }
    ],
    asOfUtc: '2026-07-29T08:00:00Z'
  }
}

function defaults () {
  return {
    GetContext: context(),
    ListCourses: { storeId: 42, courses: [{ courseId: COURSE, title: 'Internkontroll grunnkurs', category: 'IK', competencyKey: 'food-hygiene', isActive: true, versionCount: 2, hasPublishedVersion: true, createdAtUtc: '2026-07-01T09:00:00' }], asOfUtc: '2026-07-29T08:00:00Z' },
    GetCourse: courseDetail(),
    ListAssignments: { storeId: 42, assignments: [], asOfUtc: '2026-07-29T08:00:00Z' },
    ListCompletions: { storeId: 42, completions: [], asOfUtc: '2026-07-29T08:00:00Z' },
    ListCertificates: { storeId: 42, certificates: [], asOfUtc: '2026-07-29T08:00:00Z' },
    CreateCourse: courseDetail(),
    CreateVersion: {},
    PublishVersion: {},
    CreateAssignment: {},
    RevokeAssignment: null,
    RecordCompletion: {},
    RegisterCertificate: {},
    GetHoldings: { storeId: 42, personRef: PERSON, heldCompetencyKeys: ['food-hygiene'], certificates: [], asOfUtc: '2026-07-29T08:00:00Z' },
    ListStaff: [
      { staffMemberId: 's-1', workforcePersonId: PERSON, displayName: 'Kari Nordmann', isActive: true, capabilities: [] }
    ],
    ListRoles: [
      { roleId: ROLE, name: 'Kokk', station: 'Kjøkken', sortOrder: 1, effectiveFromUtc: '2026-01-01T00:00:00', effectiveToUtc: null }
    ]
  }
}

function mountPage (options) {
  const opts = options || {}
  return shallowMount(TrainingPage, {
    mocks: {
      $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
      $store: {
        getters: { userIsLoggedIn: opts.loggedIn !== false },
        state: {
          selectedAdminStore: opts.storeId === undefined ? 42 : opts.storeId,
          adminLocale: 'no',
          currentUser: { id: 1, adminIn: opts.adminIn === undefined ? [{ id: 42 }] : opts.adminIn }
        }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

const names = () => mockCalls.map(c => c[0])

beforeEach(() => {
  mockCalls.length = 0
  mockAnswers = defaults()
})

describe('which calls the page issues', () => {
  test('the context read first, then the four Training lists and the two directory reads, once each', async () => {
    mountPage()
    await settled()
    expect(names()).toEqual(['GetContext', 'ListCourses', 'ListAssignments', 'ListCompletions', 'ListCertificates', 'ListStaff', 'ListRoles'])
    mockCalls.forEach(call => expect(call[1]).toBe(42))
  })

  test('nothing is read while signed out', async () => {
    mountPage({ loggedIn: false })
    await settled()
    expect(mockCalls).toEqual([])
  })

  test('nothing is read without a store to read it for', async () => {
    mountPage({ storeId: null, adminIn: [] })
    await settled()
    expect(mockCalls).toEqual([])
  })

  test('with no store explicitly selected it falls back to the first store administered', async () => {
    mountPage({ storeId: null, adminIn: [{ id: 77 }, { id: 78 }] })
    await settled()
    expect(mockCalls[0]).toEqual(['GetContext', 77])
  })

  test('the course detail is read only when a course is selected, and cleared when it is deselected', async () => {
    const wrapper = mountPage()
    await settled()
    expect(names()).not.toContain('GetCourse')

    wrapper.vm.select(COURSE)
    await settled()
    expect(mockCalls.filter(c => c[0] === 'GetCourse')).toEqual([['GetCourse', 42, COURSE]])
    expect(wrapper.vm.detailView.state).toBe('answered')

    // Clicking the selected course again clears it — that state is the page's own instruction.
    wrapper.vm.select(COURSE)
    await settled()
    expect(wrapper.vm.selectedCourseId).toBeNull()
    expect(wrapper.vm.detailView.state).toBe('unknown')
  })
})

describe('the gate — the only refusal on this page that says anything', () => {
  test('a 404 the module wrote is reported as invisible, and NO list read is attempted', async () => {
    mockAnswers.GetContext = () => Promise.reject(new WorkforceApiError(404, { code: 'training.not-found' }))
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.gate).toBe('invisible')
    expect(wrapper.find('[data-test="gate"]').text()).toBe('trn_gate_invisible')
    // With the module invisible every route answers the same opaque 404, so four reads that cannot
    // succeed would only decorate a deliberate screen with failures about it.
    expect(names()).toEqual(['GetContext'])
  })

  test('POSITIVE CONTROL: with the gate open the same reads DO fire', async () => {
    // Without this the assertion above would pass on a page that never read anything.
    mountPage()
    await settled()
    expect(names()).toEqual(['GetContext', 'ListCourses', 'ListAssignments', 'ListCompletions', 'ListCertificates', 'ListStaff', 'ListRoles'])
  })

  test('a 403 is reported as a refusal that does NOT name a reason', async () => {
    mockAnswers.GetContext = () => Promise.reject(new WorkforceApiError(403, { code: 'training.forbidden' }))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.gate).toBe('forbidden')
    expect(names()).toEqual(['GetContext'])
  })

  test('a 404 with no training code is UNREACHABLE, a different sentence from invisible', async () => {
    mockAnswers.GetContext = () => Promise.reject(new WorkforceApiError(404, {}))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.gate).toBe('unreachable')
    expect(wrapper.find('[data-test="gate"]').text()).toBe('trn_gate_unreachable')
  })

  test('a failure that is nobody\'s problem in particular leaves the gate UNKNOWN', async () => {
    mockAnswers.GetContext = () => Promise.reject(new Error('network down'))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.gate).toBe('unknown')
    expect(wrapper.find('[data-test="gate"]').text()).toBe('trn_gate_unknown')
  })

  test('THE DISTINCTION, varied: the four refusals produce four different screens', async () => {
    const cases = [
      [new WorkforceApiError(404, { code: 'training.not-found' }), 'invisible'],
      [new WorkforceApiError(404, {}), 'unreachable'],
      [new WorkforceApiError(403, { code: 'training.forbidden' }), 'forbidden'],
      [new Error('x'), 'unknown']
    ]
    const seen = []
    for (const [error, expected] of cases) {
      mockAnswers.GetContext = () => Promise.reject(error)
      const wrapper = mountPage()
      await settled()
      expect(wrapper.vm.gate).toBe(expected)
      seen.push(wrapper.find('[data-test="gate"]').text())
    }
    expect(new Set(seen).size).toBe(4)
  })
})

describe('honest state — the reads fail independently', () => {
  test('a failed course read leaves the courses UNKNOWN and does not touch the certificates', async () => {
    mockAnswers.ListCourses = () => Promise.reject(new WorkforceApiError(404, { code: 'training.not-found' }))
    mockAnswers.ListCertificates = {
      storeId: 42,
      certificates: [{ certificateId: 'c-1', personRef: PERSON, type: 'food-handler', issuer: 'Mattilsynet', issueDateUtc: '2026-01-10T00:00:00', expiryDateUtc: '2028-01-10T00:00:00', status: 'Valid', createdAtUtc: '2026-01-10T09:00:00' }],
      asOfUtc: '2026-07-29T08:00:00Z'
    }

    const wrapper = mountPage()
    await settled()

    // Refused, and carrying NO rows — so nothing downstream can render "this store has no courses".
    expect(wrapper.vm.coursesListing.state).toBe('refused')
    expect(wrapper.vm.coursesListing.rows).toBeNull()
    // And an opaque 404 on ONE read is not promoted into a claim about the module: the gate stays
    // open, because the context read is the only thing entitled to close it.
    expect(wrapper.vm.gate).toBe('open')
    // The read that answered still says exactly what it said.
    expect(wrapper.vm.certificatesListing.state).toBe('answered')
    expect(wrapper.vm.certificatesListing.rows).toHaveLength(1)
  })

  test('an empty answered list is a real zero, distinct from a refused one', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.assignmentsListing.state).toBe('answered')
    expect(wrapper.vm.assignmentsListing.rows).toEqual([])
  })

  test('a reload clears to UNKNOWN, never to empty', async () => {
    const wrapper = mountPage()
    await settled()
    let resolveCourses
    mockAnswers.ListCourses = () => new Promise((resolve) => { resolveCourses = resolve })

    wrapper.vm.init()
    await settled()
    // Mid-flight the courses must not read as a store that has stopped having any.
    expect(wrapper.vm.coursesListing.state).toBe('unknown')
    expect(wrapper.vm.coursesListing.rows).toBeNull()
    resolveCourses({ courses: [] })
  })
})

describe('the flags come from the server and never from an inference', () => {
  test('the two flags the writes gate on are read off the context document', async () => {
    mockAnswers.GetContext = context({
      featureFlags: { 'training.setup': true, 'training.assignments': false }
    })
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.setupFlag).toBe(true)
    expect(wrapper.vm.assignmentsFlag).toBe(false)
  })

  test('a flag the server did not report is UNKNOWN, not off', async () => {
    mockAnswers.GetContext = context({ featureFlags: { 'training.setup': true } })
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.assignmentsFlag).toBeNull()
  })
})

describe('the writes', () => {
  test('publishing addresses the version by NUMBER and then re-reads the course and the list', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select(COURSE)
    await settled()
    mockCalls.length = 0

    await wrapper.vm.publishVersion(2)
    await settled()

    expect(mockCalls[0]).toEqual(['PublishVersion', 42, COURSE, 2])
    // Re-read rather than spliced: the publish response is a version model and the list rows are a
    // different projection, so a spliced row would be one this page invented.
    expect(names()).toContain('GetCourse')
    expect(names()).toContain('ListCourses')
  })

  test('a refused write sets the banner from the stable code and leaves every list as it was', async () => {
    const wrapper = mountPage()
    await settled()
    const before = wrapper.vm.certificatesListing

    mockAnswers.RegisterCertificate = () => Promise.reject(new WorkforceApiError(409, { code: 'training.flag-disabled-read-only' }))
    await wrapper.vm.registerCertificate({ personRef: PERSON, type: 'food-handler' })
    await settled()

    expect(wrapper.vm.failure).toBe('trn_err_flag_off')
    // Nothing on screen became less true because a write was refused.
    expect(wrapper.vm.certificatesListing.state).toBe(before.state)
    expect(wrapper.vm.certificatesListing.rows).toEqual(before.rows)
    // And the re-read was NOT run — there is nothing new to read.
    expect(names().filter(n => n === 'ListCertificates')).toHaveLength(1)
  })

  test('a failure with no training code is not attributed to a Training rule', async () => {
    const wrapper = mountPage()
    await settled()
    mockAnswers.CreateCourse = () => Promise.reject(new Error('network down'))
    await wrapper.vm.createCourse({ title: 'x' })
    await settled()
    expect(wrapper.vm.failure).toBe('trn_err_unknown')
  })

  test('THE DISTINCTION, varied: three different codes give three different sentences', async () => {
    const wrapper = mountPage()
    await settled()
    const said = []
    for (const code of ['training.validation', 'training.course-version-immutable', 'training.not-found']) {
      mockAnswers.CreateCourse = () => Promise.reject(new WorkforceApiError(409, { code }))
      await wrapper.vm.createCourse({ title: 'x' })
      await settled()
      said.push(wrapper.vm.failure)
    }
    expect(new Set(said).size).toBe(3)
  })

  test('a successful write re-reads only what it changed, and never re-reads the directory', async () => {
    const wrapper = mountPage()
    await settled()
    mockCalls.length = 0

    await wrapper.vm.recordCompletion({ personRef: PERSON, courseVersionId: PUBLISHED_V, scorePercent: 90 })
    await settled()

    // A completion does not change who works here.
    expect(names()).toEqual(['RecordCompletion', 'ListCompletions'])
  })

  test('a 400 on the two writes that BIND a person names the cause instead of shrugging', async () => {
    // `training.validation` carries no discriminator and the page may not key on `detail`, so the
    // cause is established by elimination — the panels refuse every other 400 these routes can
    // throw before sending. See `fail` on the page.
    const wrapper = mountPage()
    await settled()

    mockAnswers.RecordCompletion = () => Promise.reject(new WorkforceApiError(400, { code: 'training.validation' }))
    await wrapper.vm.recordCompletion({ personRef: PERSON, courseVersionId: PUBLISHED_V, scorePercent: 90 })
    await settled()
    expect(wrapper.vm.failure).toBe('trn_err_person_unknown')

    mockAnswers.RegisterCertificate = () => Promise.reject(new WorkforceApiError(400, { code: 'training.validation' }))
    await wrapper.vm.registerCertificate({ personRef: PERSON, type: 'food-handler' })
    await settled()
    expect(wrapper.vm.failure).toBe('trn_err_person_unknown')
  })

  test('the SAME code on a write that does not bind a person stays unattributed', async () => {
    // `CreateAssignmentAsync` has several reachable 400s — the published-version check is a genuine
    // race — and no TrainingPersonBinding call at all. Naming a cause there would be a guess.
    const wrapper = mountPage()
    await settled()
    mockAnswers.CreateAssignment = () => Promise.reject(new WorkforceApiError(400, { code: 'training.validation' }))
    await wrapper.vm.createAssignment({ courseVersionId: PUBLISHED_V, scope: 'Role', roleRef: ROLE })
    await settled()
    expect(wrapper.vm.failure).toBe('trn_err_validation')
  })

  test('only the VALIDATION code is redirected — every other refusal on those writes is unchanged', async () => {
    const wrapper = mountPage()
    await settled()
    mockAnswers.RecordCompletion = () => Promise.reject(new WorkforceApiError(409, { code: 'training.flag-disabled-read-only' }))
    await wrapper.vm.recordCompletion({ personRef: PERSON, courseVersionId: PUBLISHED_V, scorePercent: 90 })
    await settled()
    expect(wrapper.vm.failure).toBe('trn_err_flag_off')

    // A 400 carrying no training code did not come from this module and is not the person rule: a
    // missing Idempotency-Key is answered by `ModuleProblem`, which emits no code at all.
    mockAnswers.RecordCompletion = () => Promise.reject(new WorkforceApiError(400, {}))
    await wrapper.vm.recordCompletion({ personRef: PERSON, courseVersionId: PUBLISHED_V, scorePercent: 90 })
    await settled()
    expect(wrapper.vm.failure).toBe('trn_err_unknown')
  })
})

describe('the reference directories — another module\'s read, and its failures stay its own', () => {
  test('the roster and the role catalogue become the two pickers', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.peopleDirectory).toEqual({
      state: 'answered',
      options: [{ id: PERSON, label: 'Kari Nordmann', ended: false }]
    })
    expect(wrapper.vm.rolesDirectory.state).toBe('answered')
    expect(wrapper.vm.rolesDirectory.options[0]).toEqual({ id: ROLE, label: 'Kokk · Kjøkken', ended: false })
  })

  test('THE ORDINARY CASE: a 403 on the roster is REFUSED and touches nothing on the Training side', async () => {
    // Workforce capability is resolved from the caller's own engagement grant bits and cannot be
    // satisfied by StoreAdmin, so a Training manager being refused the roster is normal — not an
    // error state, and not a claim about this store's training records.
    mockAnswers.ListStaff = () => Promise.reject(new WorkforceApiError(403, { code: 'workforce.forbidden' }))
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.peopleDirectory.state).toBe('refused')
    expect(wrapper.vm.peopleDirectory.options).toEqual([])
    // Everything Training answered still says exactly what it said.
    expect(wrapper.vm.gate).toBe('open')
    expect(wrapper.vm.failure).toBe('')
    expect(wrapper.vm.coursesListing.state).toBe('answered')
    expect(wrapper.vm.rolesDirectory.state).toBe('answered')
  })

  test('THE DISTINCTION: a refusal and a non-answer are two states, and neither is an empty roster', async () => {
    mockAnswers.ListStaff = () => Promise.reject(new Error('network down'))
    const unanswered = mountPage()
    await settled()
    expect(unanswered.vm.peopleDirectory.state).toBe('unknown')

    mockAnswers.ListStaff = () => Promise.reject(new WorkforceApiError(404, { code: 'workforce.not-found' }))
    const declined = mountPage()
    await settled()
    expect(declined.vm.peopleDirectory.state).toBe('refused')

    // POSITIVE CONTROL: a store that genuinely engages nobody is a third, ANSWERED state.
    mockAnswers.ListStaff = []
    const empty = mountPage()
    await settled()
    expect(empty.vm.peopleDirectory).toEqual({ state: 'answered', options: [] })
  })

  test('a reload clears the directories to UNKNOWN, never to empty', async () => {
    const wrapper = mountPage()
    await settled()
    let resolveStaff
    mockAnswers.ListStaff = () => new Promise((resolve) => { resolveStaff = resolve })

    wrapper.vm.init()
    await settled()
    expect(wrapper.vm.peopleDirectory.state).toBe('unknown')
    resolveStaff([])
  })
})

describe('the version pickers offered to the two write panels differ', () => {
  test('assign is offered the published version only; record is offered published and retired', async () => {
    mockAnswers.GetCourse = {
      storeId: 42,
      courseId: COURSE,
      versions: [
        { courseVersionId: 'v-draft', versionNo: 3, state: 'Draft' },
        { courseVersionId: PUBLISHED_V, versionNo: 2, state: 'Published' },
        { courseVersionId: 'v-retired', versionNo: 1, state: 'Retired' }
      ],
      asOfUtc: '2026-07-29T08:00:00Z'
    }
    const wrapper = mountPage()
    await settled()
    wrapper.vm.select(COURSE)
    await settled()

    expect(wrapper.vm.assignable.map(v => v.courseVersionId)).toEqual([PUBLISHED_V])
    expect(wrapper.vm.recordable.map(v => v.courseVersionId)).toEqual([PUBLISHED_V, 'v-retired'])
  })

  test('with no course selected neither panel is offered anything', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.assignable).toEqual([])
    expect(wrapper.vm.recordable).toEqual([])
  })
})

describe('holdings — the step that proves the rest of the journey did anything', () => {
  test('nothing is looked up until somebody asks, and IDLE is not a failed read', async () => {
    const wrapper = mountPage()
    await settled()
    expect(names()).not.toContain('GetHoldings')
    expect(wrapper.vm.holdings.state).toBe('idle')
  })

  test('a lookup asks for that person and reports what came back', async () => {
    const wrapper = mountPage()
    await settled()
    mockCalls.length = 0

    await wrapper.vm.lookupHoldings(PERSON)
    await settled()

    expect(mockCalls).toEqual([['GetHoldings', 42, PERSON]])
    expect(wrapper.vm.holdings.state).toBe('answered')
    expect(wrapper.vm.holdings.keys).toEqual(['food-hygiene'])
  })

  test('a refused lookup is refused, not "this person holds nothing"', async () => {
    const wrapper = mountPage()
    await settled()
    mockAnswers.GetHoldings = () => Promise.reject(new WorkforceApiError(404, { code: 'training.not-found' }))

    await wrapper.vm.lookupHoldings(PERSON)
    await settled()

    expect(wrapper.vm.holdings.state).toBe('refused')
    expect(wrapper.vm.holdings.keys).toBeNull()
  })

  test('POSITIVE CONTROL: an answered lookup with nothing on record is a real empty', async () => {
    const wrapper = mountPage()
    await settled()
    mockAnswers.GetHoldings = { storeId: 42, personRef: PERSON, heldCompetencyKeys: [], certificates: [], asOfUtc: '2026-07-29T08:00:00Z' }

    await wrapper.vm.lookupHoldings(PERSON)
    await settled()

    expect(wrapper.vm.holdings.state).toBe('answered')
    expect(wrapper.vm.holdings.keys).toEqual([])
  })
})

describe('the clock the page prints instants in', () => {
  test('the store zone comes from the context document', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.zoneId).toBe('Europe/Oslo')
    expect(wrapper.find('[data-test="zone-footnote"]').text()).toBe('trn_footnote_zone:{"zone":"Europe/Oslo"}')
  })

  test('a server-declared FALLBACK zone is labelled as one, not presented as the store\'s setting', async () => {
    mockAnswers.GetContext = context({ timeZone: { id: 'Europe/Oslo', isFallback: true, currentUtcOffsetMinutes: 120 } })
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="zone-footnote"]').text()).toBe('trn_footnote_zone_fallback:{"zone":"Europe/Oslo"}')
  })

  test('with no zone at all the page says it is printing UTC rather than guessing one', async () => {
    mockAnswers.GetContext = context({ timeZone: null })
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.zoneId).toBeNull()
    expect(wrapper.find('[data-test="zone-footnote"]').text()).toBe('trn_footnote_zone_utc')
  })
})
