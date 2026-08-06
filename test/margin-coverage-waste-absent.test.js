import { mount } from '@vue/test-utils'
import translations from '~/translations'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import MarginStatementsPage from '~/pages/admin/margin-statements.vue'

// THE COVERAGE PANEL'S WASTE BUCKET, DRIVEN BY A 404 THAT ACTUALLY ARRIVES.
//
// A sibling lane fixed the waste PANEL, which is a few centimetres up the same screen, and flagged
// this bucket rather than folding it in. This file is that flag closed.
//
// WHY IT IS THE SAME WRONG. No backend checkout in this estate publishes `/margin/waste`: at the
// integration tip `8e2b57de` in `../OkamAPI-modules` there is no `MarginWasteController`, no
// `MarginWasteEntry` and no waste service, and `git ls-tree -r --name-only 8e2b57de | grep -ci waste`
// is 0. The controller exists on five refs, none of them a tip a deploy is cut from. So the coverage
// response carries no `waste` block, `readWasteSummary` returns null, and this panel printed
// `mrgs_waste_coverage_unknown` — "we were told nothing about waste for this window. It is unknown" —
// directly beneath the week's reconciled food-cost figures. That is an alarm about a READ for a
// capability that has never existed on that server. Absence invites a question; a read that could not
// tell invites a retry, then a support call, then doubt about the numbers printed above it.
//
// WHY THIS FILE EXISTS RATHER THAN AN EDIT TO THE SIBLING SUITE. `test/margin-statements-page.test.js`
// replaces `~/utils/margin/waste-client` with a class whose `ListWaste` resolves. Against a fixture
// that never 404s, `wasteAbsent` is false in every world it can express, so that suite is structurally
// blind to this defect and no edit to it could see it — its WORLD 3 asserts `coverage-waste-unknown`
// for a coverage response with no waste block, which stays CORRECT there and stays green here,
// because a server that serves the entry list and says nothing about waste totals genuinely has not
// told us. So this file leaves the waste client REAL — the real route strings, the real
// `MarginClientBase._request`, the real `MarginApiError`, the real `loadWaste` — and stands in only
// for `global.fetch`, which is where the server would be.
//
// Every test asserts THE REQUEST WENT OUT before asserting what rendered. A panel that says a feature
// is absent because no read was ever attempted has proved nothing at all, and this page had exactly
// that shape on one of its two entry paths until this change (see the create-week block below).

const calls = []
const script = {}

jest.mock('~/utils/margin/ingredient-client', () => ({
  MarginIngredientService: class {
    ListIngredients (_storeId) {
      calls.push(['ListIngredients'])
      return Promise.resolve({ ingredients: [] })
    }
  }
}))

jest.mock('~/utils/margin/recipe-client', () => ({
  MarginRecipeService: class {
    // BOTH FLAGS ON — the precondition that makes the defect reachable rather than scene-setting. The
    // page renders no statement panels at all unless the server has just said the statements surface
    // is ON, and at the tip `GET /margin/status` still says exactly that while `/margin/waste` 404s.
    GetStatus (storeId) {
      calls.push(['GetStatus', storeId])
      return Promise.resolve({
        storeId,
        flags: { module: true, statements: true },
        projection: { watermarkJournalEntryId: 9, latestJournalEntryId: 9, lagEntries: 0 }
      })
    }
  }
}))

const STATEMENT_ID = 'f3000000-0000-0000-0000-000000000001'
const MONDAY = '2026-07-06'

function detail () {
  return {
    statementId: STATEMENT_ID,
    storeId: 42,
    periodStart: MONDAY + 'T00:00:00Z',
    periodEnd: '2026-07-12T00:00:00Z',
    revisionNumber: 1,
    previousStatementId: null,
    state: 'Open',
    netFoodSalesMinor: 16400,
    theoreticalIngredientCostMinor: 10860,
    actualPurchaseSpendMinor: 23000,
    coveredNetSalesMinor: 26400,
    uncoveredNetSalesMinor: -10000,
    theoreticalFoodCostPercent: 66.22,
    actualFoodCostPercent: 140.24,
    gapPercentagePoints: 74.02,
    coveragePercent: 160.98,
    theoreticalCostComplete: true,
    theoreticalCostExcludedCurrencies: [],
    currency: 'NOK',
    projectionWatermark: 9,
    recipeVersionIds: ['v-1'],
    calculationTimestampUtc: '2026-07-13T09:00:00Z',
    finalizedAtUtc: null,
    inputReceiptJson: JSON.stringify({ Currency: 'NOK' }),
    spendEntries: [],
    revision: 'rev-1'
  }
}

function row () {
  return {
    statementId: STATEMENT_ID,
    periodStart: MONDAY + 'T00:00:00Z',
    periodEnd: '2026-07-12T00:00:00Z',
    revisionNumber: 1,
    state: 'Open',
    netFoodSalesMinor: 16400,
    actualFoodCostPercent: 140.24,
    theoreticalCostComplete: true,
    currency: 'NOK'
  }
}

/** The proven journey's coverage figures (MJ-E2E-09), with the waste block as the ONLY variable. */
function coverageResponse (waste) {
  const response = {
    fromDate: MONDAY + 'T00:00:00Z',
    toDate: '2026-07-12T00:00:00Z',
    coveragePercent: 160.98,
    netFoodSalesMinor: 16400,
    coveredNetSalesMinor: 26400,
    uncoveredNetSalesMinor: -10000,
    currency: 'NOK',
    uncoveredTopSellers: [],
    brokenLinks: [],
    priceFreshness: [],
    projectionWatermark: 9
  }
  // `undefined` means the key is ABSENT, which is what the tip's coverage endpoint actually sends.
  if (waste !== undefined) { response.waste = waste }
  return response
}

jest.mock('~/utils/margin/statement-client', () => {
  const actual = jest.requireActual('~/utils/margin/statement-client')
  return {
    // The date guards are the REAL ones — `waste-client` imports `assertBusinessDate` from this
    // module, so mocking it away would replace part of the code under test with a stub.
    assertBusinessDate: actual.assertBusinessDate,
    isMondayDate: actual.isMondayDate,
    mondayOfWeek: actual.mondayOfWeek,
    isUncodedRefusal: actual.isUncodedRefusal,
    // The fixtures travel through `script`, never as direct references: `jest.mock` factories are
    // hoisted above the file and may only close over a pure `const`.
    MarginStatementService: class {
      ListStatements (storeId) { calls.push(['ListStatements', storeId]); return script.list() }
      ListSuppliers () { calls.push(['ListSuppliers']); return Promise.resolve([]) }
      GetStatement (_storeId, id) { calls.push(['GetStatement', id]); return script.get() }
      GetCoverage (_storeId, from, to) { calls.push(['GetCoverage', from, to]); return script.coverage() }
      CreateStatement (_storeId, week) { calls.push(['CreateStatement', week]); return script.create() }
      Finalize () { return Promise.resolve(null) }
      SetInputs () { return Promise.resolve(null) }
      Recalculate () { return Promise.resolve(null) }
      ExportCsv () { return Promise.resolve({ text: '', fileName: 'x.csv' }) }
      RebuildProjection () { return Promise.resolve({ factsAppended: 0 }) }
    }
  }
})

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

/** The requests the real waste client actually put on the wire, in order. */
let wire

/**
 * A stand-in server for the waste route only. A body of `undefined` sends no bytes at all, which is
 * what an ASP.NET router answers for a route it does not know — no problem+json, and therefore NO
 * `margin.*` code for anything downstream to key on.
 */
function serve (answer) {
  global.fetch = jest.fn((url, options) => {
    wire.push({ url, method: options.method })
    const { status, body } = answer(url)
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  })
}

/**
 * The REAL Norwegian dictionary rather than a key-echoing mock. Two states that echo two different
 * KEYS can still resolve to one sentence, and the sentence is what misleads a venue. It also throws
 * on a key this build does not define, which is the other half of shipping a new string.
 */
const norwegian = (key, params) => {
  const template = translations.no[key]
  if (typeof template !== 'string' || template === '') { throw new Error('no `no` translation for ' + key) }
  return params ? template.replace(/\{(\w+)\}/g, (_, name) => String(params[name])) : template
}

function pageMocks () {
  return {
    $i: norwegian,
    priceLabel: minor => 'kr ' + minor,
    wholeAmount: minor => String(Math.trunc(minor / 100)),
    fractionAmount: minor => String(Math.abs(minor) % 100).padStart(2, '0'),
    marketConfig: { currency: 'NOK' },
    $store: {
      getters: { userIsLoggedIn: true },
      state: {
        selectedAdminStore: 42,
        adminLocale: 'no',
        currentUser: { id: 1, adminIn: [{ id: 42 }] }
      }
    },
    _coreInitializer: { bearerToken: 'tok' }
  }
}

/**
 * The page with ONE real child — `MarginCoveragePanel`. The waste panel is stubbed on purpose: it has
 * its own absent state and its own hooks, and leaving it mounted would let an assertion here pass on
 * the sibling's sentence. This block can then fail for exactly one reason.
 */
function mountPage () {
  return mount(MarginStatementsPage, {
    mocks: pageMocks(),
    stubs: {
      AdminPage: { template: '<div><slot /></div>' },
      MarginStatementFiguresPanel: true,
      MarginSpendPanel: true,
      MarginWastePanel: true
    }
  })
}

/** Opens an existing week the way a venue does: the page loads, then the period row is clicked. */
async function openWeek (waste) {
  script.list = () => Promise.resolve({ storeId: 42, statements: [row()] })
  script.get = () => Promise.resolve(detail())
  script.coverage = () => Promise.resolve(coverageResponse(waste))
  const wrapper = mountPage()
  await settled()
  wrapper.find('[data-test="period-row"]').trigger('click')
  await settled()
  return wrapper
}

const WASTE_URL = '/margin/waste?from=2026-07-06&to=2026-07-12&storeId=42'
const ABSENT = '[data-test="coverage-waste-absent"]'
const UNKNOWN = '[data-test="coverage-waste-unknown"]'

const RECORDED = {
  valuedMinor: 3000,
  entryCount: 2,
  unvaluedEntryCount: 0,
  byReason: [{ reason: 'Spoilage', valuedMinor: 3000, entryCount: 2, unvaluedEntryCount: 0 }]
}

beforeEach(() => {
  calls.length = 0
  wire = []
  for (const k of Object.keys(script)) { delete script[k] }
})

afterEach(() => { delete global.fetch })

describe('the coverage panel says the waste feature is ABSENT, never that it could not tell', () => {
  // THE WORLD THIS ESTATE ACTUALLY SERVES TODAY: coverage answers in full, says nothing about waste,
  // and the waste route answers the router's own bodiless 404.
  test('no waste block AND a routing 404 — the bucket says the feature is not here', async () => {
    serve(() => ({ status: 404, body: undefined }))
    const wrapper = await openWeek(undefined)

    // The read GENUINELY WENT OUT and genuinely came back 404. Asserted first: an absent state
    // rendered because nothing was ever asked would be a second way of claiming what we do not know.
    expect(wire).toEqual([{ url: WASTE_URL, method: 'GET' }])
    expect(wrapper.vm.wasteAbsent).toBe(true)
    expect(wrapper.vm.coverage.waste).toBeNull()

    expect(wrapper.find(ABSENT).text()).toBe(
      'Svinnregistrering er ikke tilgjengelig her ennå, så det finnes ingen svinntall for dette ' +
      'vinduet. Tallene over er upåvirket uansett — svinn inngår aldri i dekket eller udekket omsetning.')
    // THE POINT OF THE LANE, spelled out rather than referred to by key: this is the sentence the
    // venue was shown, and it is a claim about a read that could not tell rather than about a
    // capability that is not there.
    expect(wrapper.find(UNKNOWN).exists()).toBe(false)
    expect(wrapper.find(ABSENT).text()).not.toBe(translations.no.mrgs_waste_coverage_unknown)
  })

  // THE FLAG-GATED 404: the shape once the controller ships and a venue is not on the stage. Same
  // sentence deliberately — both mean "this surface is not served to you here" — so the answer does
  // not depend on a problem+json body the routing 404 will never carry.
  test('the coded margin.not-found 404 reads as absent too', async () => {
    serve(() => ({ status: 404, body: { code: 'margin.not-found', title: 'Not Found' } }))
    const wrapper = await openWeek(undefined)

    expect(wire).toHaveLength(1)
    expect(wrapper.find(ABSENT).exists()).toBe(true)
    expect(wrapper.find(UNKNOWN).exists()).toBe(false)
  })

  // THE OTHER DIRECTION, and the arm that keeps the first one honest. Routing every failure to
  // "absent" is the same defect with its sign flipped: a venue whose read genuinely broke would be
  // told the capability does not exist and would stop looking for the entries it recorded last week.
  test('a 500 on the waste route leaves the bucket saying UNKNOWN', async () => {
    serve(() => ({ status: 500, body: { title: 'Internal Server Error' } }))
    const wrapper = await openWeek(undefined)

    expect(wire).toEqual([{ url: WASTE_URL, method: 'GET' }])
    expect(wrapper.vm.wasteAbsent).toBe(false)
    expect(wrapper.find(UNKNOWN).text()).toBe(translations.no.mrgs_waste_coverage_unknown)
    expect(wrapper.find(ABSENT).exists()).toBe(false)
  })

  test('a 403 on the waste route leaves the bucket saying UNKNOWN', async () => {
    serve(() => ({ status: 403, body: { code: 'margin.forbidden' } }))
    const wrapper = await openWeek(undefined)

    expect(wrapper.find(UNKNOWN).exists()).toBe(true)
    expect(wrapper.find(ABSENT).exists()).toBe(false)
  })

  // A SERVER THAT DOES SERVE THE ENTRY LIST but sends no waste totals on the coverage read is a
  // genuine unknown and stays one — the API version this build met simply predates the block. This is
  // the world the sibling page suite drives in ALL of its worlds, which is why it can assert
  // `coverage-waste-unknown` there and stay right.
  test('waste served but no waste block on coverage is still UNKNOWN, not absent', async () => {
    serve(() => ({ status: 200, body: { entries: [] } }))
    const wrapper = await openWeek(undefined)

    expect(wire).toEqual([{ url: WASTE_URL, method: 'GET' }])
    expect(wrapper.vm.wasteAbsent).toBe(false)
    expect(wrapper.find(UNKNOWN).exists()).toBe(true)
    expect(wrapper.find(ABSENT).exists()).toBe(false)
  })

  // FIGURES THAT ARRIVED ARE ALWAYS PRINTED, whatever the entry route said. A server can serve the
  // coverage projection's waste totals while the entry-list controller is not deployed; those totals
  // are a MEASUREMENT the server made and this panel is the only place they appear. Replacing them
  // with "not available here yet" would withhold a figure that arrived, and would print that sentence
  // exactly where the numbers contradicting it should have been.
  test('a coverage response that DOES carry waste totals renders them even while the entry route 404s', async () => {
    serve(() => ({ status: 404, body: undefined }))
    const wrapper = await openWeek(RECORDED)

    expect(wrapper.vm.wasteAbsent).toBe(true)
    expect(wrapper.find('[data-test="waste-total"]').text()).toBe('Registrert svinn: kr 3000.')
    expect(wrapper.findAll('[data-test="waste-row"]')).toHaveLength(1)
    expect(wrapper.find(ABSENT).exists()).toBe(false)
    expect(wrapper.find(UNKNOWN).exists()).toBe(false)
  })

  // A MEASURED ZERO survives the same way: the server looked at the week and found no entry, which is
  // an answer about the DATA and outranks any claim about the feature.
  test('a measured none is still a measured none while the entry route 404s', async () => {
    serve(() => ({ status: 404, body: undefined }))
    const wrapper = await openWeek({ valuedMinor: 0, entryCount: 0, unvaluedEntryCount: 0, byReason: [] })

    expect(wrapper.vm.wasteAbsent).toBe(true)
    expect(wrapper.find('[data-test="waste-none"]').text())
      .toBe('Ingenting er registrert som svinn i dette vinduet.')
    expect(wrapper.find(ABSENT).exists()).toBe(false)
  })

  // The four states as ONE property rather than four separate absences a fifth world could slip
  // between — and four DIFFERENT sentences, because collapsing any two of them is the defect,
  // whichever direction it is collapsed in.
  test('exactly one of absent / unknown / none / total is on screen, and the four are four sentences', async () => {
    const worlds = [
      { waste: undefined, answer: { status: 404, body: undefined } },
      { waste: undefined, answer: { status: 500, body: {} } },
      { waste: { valuedMinor: 0, entryCount: 0, unvaluedEntryCount: 0, byReason: [] }, answer: { status: 404, body: undefined } },
      { waste: RECORDED, answer: { status: 200, body: { entries: [] } } }
    ]
    const said = []
    for (const world of worlds) {
      wire = []
      serve(() => world.answer)
      const wrapper = await openWeek(world.waste)
      const shown = [ABSENT, UNKNOWN, '[data-test="waste-none"]', '[data-test="waste-total"]']
        .map(hook => wrapper.find(hook))
        .filter(node => node.exists())
      expect(shown).toHaveLength(1)
      said.push(shown[0].text())
    }
    expect(new Set(said).size).toBe(4)
  })
})

// THE SECOND ENTRY ONTO THIS SCREEN, and the one where the state was unreachable rather than wrong.
//
// `createStatement` opened a week and then read the COVERAGE ALONE. `wasteEntries` and `wasteAbsent`
// kept whatever the previously selected week had left behind — on a fresh page, null and false — so
// both panels reported on a request that was never sent: the waste panel said "we could not fetch the
// entries" and this bucket said "we were told nothing about waste". The absent state could not be
// reached on this path at all, no matter what the server answered.
//
// EVERY TEST HERE OPENS A WEEK WITHOUT SELECTING ONE FIRST, deliberately. Clicking a period row first
// would set `wasteAbsent` through `selectStatement`, and the create path could then be deleted
// outright with this block still green — the mutant would look equivalent while a whole journey went
// unread. `init()` clears the flag to false, so the only thing that can set it here is the read this
// path makes for itself.
describe('opening a week reaches the same answer, because it now makes the same read', () => {
  async function createWeek (waste) {
    script.list = () => Promise.resolve({ storeId: 42, statements: [] })
    script.coverage = () => Promise.resolve(coverageResponse(waste))
    script.create = () => Promise.resolve(detail())
    const wrapper = mountPage()
    await settled()
    // No statement is selected and none exists to select: this is a venue opening its first week.
    expect(wrapper.find('[data-test="period-row"]').exists()).toBe(false)
    expect(wrapper.vm.wasteAbsent).toBe(false)

    wrapper.setData({ weekStart: MONDAY })
    await settled()
    wrapper.find('[data-test="create-statement"]').trigger('click')
    await settled()
    return wrapper
  }

  test('a week opened rather than selected still asks about waste, and is told the feature is absent', async () => {
    serve(() => ({ status: 404, body: undefined }))
    const wrapper = await createWeek(undefined)

    expect(calls).toContainEqual(['CreateStatement', MONDAY])
    // The read this path did not use to make. Asserted before the sentence, because the sentence
    // without it would be the absent state claimed rather than learned.
    expect(wire).toEqual([{ url: WASTE_URL, method: 'GET' }])
    expect(wrapper.find(ABSENT).exists()).toBe(true)
    expect(wrapper.find(UNKNOWN).exists()).toBe(false)
  })

  test('and a 500 on that same path is still a read that did not answer', async () => {
    serve(() => ({ status: 500, body: {} }))
    const wrapper = await createWeek(undefined)

    expect(wire).toEqual([{ url: WASTE_URL, method: 'GET' }])
    expect(wrapper.find(UNKNOWN).exists()).toBe(true)
    expect(wrapper.find(ABSENT).exists()).toBe(false)
  })

  // The coverage read is still made too — the new call is an addition, not a replacement.
  test('the coverage read still happens on the create path', async () => {
    serve(() => ({ status: 404, body: undefined }))
    const wrapper = await createWeek(undefined)

    expect(calls.filter(c => c[0] === 'GetCoverage')).toHaveLength(1)
    expect(wrapper.vm.coverage).not.toBeNull()
  })
})

describe('the copy', () => {
  test('the absent copy is defined, non-empty, and a different sentence from the unknown copy', () => {
    for (const locale of ['no', 'en', 'de']) {
      const absent = translations[locale].mrgs_waste_coverage_absent
      const unknown = translations[locale].mrgs_waste_coverage_unknown
      const none = translations[locale].mrgs_waste_coverage_none
      expect(typeof absent).toBe('string')
      expect(absent.trim().length).toBeGreaterThan(0)
      expect(absent).not.toBe(unknown)
      expect(absent).not.toBe(none)
    }
  })
})
