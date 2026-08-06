import { mount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import MarginStatementsPage from '~/pages/admin/margin-statements.vue'

// THE WASTE CLIENT IS DELIBERATELY NOT MOCKED IN THIS FILE, and that is the whole point of the file.
//
// `test/margin-statements-page.test.js` replaces `~/utils/margin/waste-client` with a class whose
// `ListWaste` resolves. Against a fake that never fails, a panel renders the same way whether the page
// reads a 404 honestly or swallows it — so every assertion about what a venue sees when the feature is
// missing is made against a world where the feature is present. That suite cannot see this defect, and
// no edit to it could, because the fixture it drives has no 404 in it.
//
// So here the REAL `MarginWasteService` runs: the real route strings, the real `_request`, the real
// `MarginApiError`, the real `loadWaste`. The only stand-in is `global.fetch`, which is where the
// server would be. Everything between the panel and the wire is the code that ships.
//
// WHAT THIS PINS, AND WHY IT IS A BLOCKER RATHER THAN COPY. No backend checkout in this estate
// publishes `/margin/waste`: at the integration tip `8e2b57de` in `../OkamAPI-modules` there is no
// `MarginWasteController`, no `MarginWasteEntry` and no waste service, while `GET /margin/status` still
// answers `statements: true` — which is exactly what puts this panel on a venue's screen. So a real
// venue meets the 404 arm below on every week it opens, and the sentence it produced was "we could not
// fetch the waste entries": an alarm about a request, for a capability that was never there. Absence
// invites a question; a failed read invites a retry, then a support call, then doubt about the
// reconciled figures printed above this panel on the same screen.

const calls = []
const script = {}

jest.mock('~/utils/margin/ingredient-client', () => ({
  MarginIngredientService: class {
    ListIngredients (_storeId) {
      calls.push(['ListIngredients'])
      return Promise.resolve({ ingredients: [{ ingredientId: 'i-1', name: 'Tomat', baseUnit: 'Gram', status: 'Active' }] })
    }
  }
}))

jest.mock('~/utils/margin/recipe-client', () => ({
  MarginRecipeService: class {
    // BOTH FLAGS ON. This is not scene-setting: it is the precondition that makes the defect reachable.
    // The page renders no waste panel at all when the module or the statements stage is off, so the
    // only world in which a venue can be shown a waste 404 is the one where the server has just said
    // the statements surface is ON.
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

jest.mock('~/utils/margin/statement-client', () => {
  const actual = jest.requireActual('~/utils/margin/statement-client')
  return {
    // The date guards are the REAL ones — `waste-client` imports `assertBusinessDate` from this module,
    // so mocking it away would replace part of the code under test with a stub.
    assertBusinessDate: actual.assertBusinessDate,
    isMondayDate: actual.isMondayDate,
    mondayOfWeek: actual.mondayOfWeek,
    isUncodedRefusal: actual.isUncodedRefusal,
    // The fixtures travel through `script`, never as direct references: `jest.mock` factories are
    // hoisted above the file and may only close over a pure `const`, so a factory calling `detail()`
    // does not compile at all.
    MarginStatementService: class {
      ListStatements (storeId) { calls.push(['ListStatements', storeId]); return script.list() }
      ListSuppliers () { calls.push(['ListSuppliers']); return Promise.resolve([]) }
      GetStatement (_storeId, id) { calls.push(['GetStatement', id]); return script.get() }
      GetCoverage (_storeId, from, to) { calls.push(['GetCoverage', from, to]); return Promise.resolve(null) }
      Finalize () { return Promise.resolve(null) }
      CreateStatement () { return Promise.resolve(null) }
      SetInputs () { return Promise.resolve(null) }
      Recalculate () { return Promise.resolve(null) }
      ExportCsv () { return Promise.resolve({ text: '', fileName: 'x.csv' }) }
      RebuildProjection () { return Promise.resolve({ factsAppended: 0 }) }
    }
  }
})

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

/** The requests the real client actually put on the wire, in order. */
let wire

/**
 * A stand-in server. `answer(url)` returns `{ status, body }`; a body of `undefined` sends no bytes at
 * all, which is what an ASP.NET router answers for a route it does not know — no problem+json, and so
 * NO `margin.*` code for anything downstream to key on.
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

function pageMocks () {
  return {
    $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
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
 * The page with ONE real child — `MarginWastePanel`. The other panels are stubbed so this file can
 * fail for exactly one reason, and so an assertion here is about the sentence a venue reads rather
 * than about a stub's props.
 */
async function openWeek () {
  script.list = () => Promise.resolve({ storeId: 42, statements: [row()] })
  script.get = () => Promise.resolve(detail())
  const wrapper = mount(MarginStatementsPage, {
    mocks: pageMocks(),
    stubs: {
      AdminPage: { template: '<div><slot /></div>' },
      MarginStatementFiguresPanel: true,
      MarginSpendPanel: true,
      MarginCoveragePanel: true
    }
  })
  await settled()
  wrapper.find('[data-test="period-row"]').trigger('click')
  await settled()
  return wrapper
}

const WASTE_URL = '/margin/waste?from=2026-07-06&to=2026-07-12&storeId=42'

beforeEach(() => {
  calls.length = 0
  wire = []
  for (const k of Object.keys(script)) { delete script[k] }
})

afterEach(() => { delete global.fetch })

describe('a 404 on the waste route reads as a feature that is absent, never as a read that failed', () => {
  // THE ROUTE-DOES-NOT-EXIST 404: the shape today's estate actually serves. No body, so no code.
  test('the routing 404 — no controller, no problem+json, no code — says the feature is not here', async () => {
    serve(() => ({ status: 404, body: undefined }))
    const wrapper = await openWeek()

    // The request GENUINELY WENT OUT and genuinely came back 404. Asserted first, because a panel that
    // renders an absent state because no read ever happened has proved nothing.
    expect(wire).toEqual([{ url: WASTE_URL, method: 'GET' }])

    expect(wrapper.find('[data-test="waste-absent"]').text()).toBe('mrgs_waste_absent')
    // THE POINT OF THE LANE. This is the sentence the venue used to be shown, and it is a claim about
    // a broken request rather than about a missing capability.
    expect(wrapper.find('[data-test="waste-unknown"]').exists()).toBe(false)
  })

  // THE FLAG-GATED 404: the shape once the controller ships and a venue is not on the stage. Same
  // sentence, deliberately — both mean "this surface is not served to you here".
  test('the coded margin.not-found 404 reads as absent too, so the answer does not depend on a body', async () => {
    serve(() => ({ status: 404, body: { code: 'margin.not-found', title: 'Not Found', detail: 'No such surface.' } }))
    const wrapper = await openWeek()

    expect(wrapper.find('[data-test="waste-absent"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="waste-unknown"]').exists()).toBe(false)
  })

  // The absent panel offers NO WAY TO TYPE INTO A ROUTE THAT 404s. A form here would collect a loss the
  // venue had counted, post it to a route that does not exist, and answer with an error — which is the
  // failed-read reading arriving a second time, by a longer path.
  test('the absent panel carries no form, no record button and no table', async () => {
    serve(() => ({ status: 404, body: undefined }))
    const wrapper = await openWeek()

    for (const hook of ['waste-record', 'waste-date', 'waste-reason', 'waste-value', 'waste-description',
      'waste-row', 'waste-empty', 'waste-frozen', 'waste-unknown', 'waste-ingredients-unknown']) {
      expect(wrapper.find('[data-test="' + hook + '"]').exists()).toBe(false)
    }
    // The section is still identifiable: the absence is STATED, not silently hidden.
    expect(wrapper.find('[data-test="waste-absent"]').exists()).toBe(true)
  })

  // THE OTHER DIRECTION, and it is the arm that keeps the first one honest. Routing every failure to
  // "absent" would be the same defect with the sign flipped: a venue whose read genuinely broke would
  // be told the feature does not exist and would stop looking for the entries it recorded last week.
  test('a 500 on the SAME real path still reads as a read that did not answer', async () => {
    serve(() => ({ status: 500, body: { title: 'Internal Server Error' } }))
    const wrapper = await openWeek()

    expect(wire).toEqual([{ url: WASTE_URL, method: 'GET' }])
    expect(wrapper.find('[data-test="waste-unknown"]').text()).toBe('mrgs_waste_unknown')
    expect(wrapper.find('[data-test="waste-absent"]').exists()).toBe(false)
    expect(wrapper.vm.wasteEntries).toBeNull()
  })

  test('a 403 reads as a read that did not answer, not as a feature that is missing', async () => {
    serve(() => ({ status: 403, body: { code: 'margin.forbidden' } }))
    const wrapper = await openWeek()

    expect(wrapper.find('[data-test="waste-unknown"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="waste-absent"]').exists()).toBe(false)
  })

  // A SERVER THAT DOES SERVE WASTE is unchanged by any of this — the three data claims still read the
  // way they did, so the new state cannot be reached by a venue whose feature works.
  test('a served empty week still says nothing was recorded, which is a claim about the DATA', async () => {
    serve(() => ({ status: 200, body: { entries: [] } }))
    const wrapper = await openWeek()

    expect(wrapper.find('[data-test="waste-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="waste-absent"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="waste-unknown"]').exists()).toBe(false)
    // The form is back, because the feature is there.
    expect(wrapper.find('[data-test="waste-record"]').exists()).toBe(true)
  })

  test('a served week WITH entries renders them, and claims no absence', async () => {
    serve(() => ({
      status: 200,
      body: {
        entries: [{
          wasteEntryId: 'w-1',
          wasteDate: '2026-07-08T00:00:00Z',
          reason: 'Spoilage',
          ingredientId: 'i-1',
          ingredientName: 'Tomat',
          quantity: 2500,
          description: null,
          valueMinor: 3000,
          currency: 'NOK',
          valuationSource: 'PriceBook',
          note: null,
          frozen: false,
          revision: 'wrev-1'
        }]
      }
    }))
    const wrapper = await openWeek()

    expect(wrapper.findAll('[data-test="waste-row"]')).toHaveLength(1)
    expect(wrapper.find('[data-test="waste-absent"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="waste-unknown"]').exists()).toBe(false)
  })

  // The three states are MUTUALLY EXCLUSIVE across every world, checked as one property rather than as
  // three separate absences that a fourth world could slip between.
  test('exactly one of absent / unknown / recorded is ever on screen', async () => {
    const worlds = [
      { status: 404, body: undefined },
      { status: 404, body: { code: 'margin.not-found' } },
      { status: 500, body: {} },
      { status: 403, body: { code: 'margin.forbidden' } },
      { status: 200, body: { entries: [] } }
    ]
    for (const world of worlds) {
      wire = []
      serve(() => world)
      const wrapper = await openWeek()
      const shown = ['waste-absent', 'waste-unknown', 'waste-empty']
        .filter(hook => wrapper.find('[data-test="' + hook + '"]').exists())
      expect(shown).toHaveLength(1)
    }
  })

  // A 404 IS NOT STICKY. It describes the server the page just spoke to, so re-opening the week against
  // a server that now serves waste must clear it — otherwise the day the controller ships, a venue that
  // never reloads keeps being told the feature is missing while it is answering.
  test('the absent state clears when the same week is re-opened against a server that answers', async () => {
    serve(() => ({ status: 404, body: undefined }))
    const wrapper = await openWeek()
    expect(wrapper.vm.wasteAbsent).toBe(true)

    serve(() => ({ status: 200, body: { entries: [] } }))
    wrapper.find('[data-test="period-row"]').trigger('click')
    await settled()

    expect(wrapper.vm.wasteAbsent).toBe(false)
    expect(wrapper.find('[data-test="waste-absent"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="waste-empty"]').exists()).toBe(true)
  })

  // THE RE-READ WITH NO RESET IN FRONT OF IT, which is the path that actually decides the question.
  // `selectStatement` clears the flag before it reads, so it would look non-sticky even if the read
  // could only ever set it. `loadWaste` is ALSO reached from finalising, from recording and from
  // removing, and none of those three clears anything first — so the assignment itself has to be the
  // whole answer rather than a narrowing of what came before.
  test('a re-read that is NOT preceded by a reset still answers for the server it just spoke to', async () => {
    serve(() => ({ status: 404, body: undefined }))
    const wrapper = await openWeek()
    expect(wrapper.vm.wasteAbsent).toBe(true)

    serve(() => ({ status: 200, body: { entries: [] } }))
    await wrapper.vm.loadWaste()
    await settled()
    expect(wrapper.vm.wasteAbsent).toBe(false)

    // And back again, so this pins the assignment rather than a one-way clear.
    serve(() => ({ status: 404, body: undefined }))
    await wrapper.vm.loadWaste()
    await settled()
    expect(wrapper.vm.wasteAbsent).toBe(true)
  })
})
