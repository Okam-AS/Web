import { mount, shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import MarginStatementsPage from '~/pages/admin/margin-statements.vue'
import translations from '~/translations'
import { MarginApiError } from '~/utils/margin/api-client'

const calls = []
// Per-test scripting of the fake backend. The page builds its clients in computeds, so the MODULES
// are mocked rather than the instances.
const script = {}

jest.mock('~/utils/margin/waste-client', () => ({
  MarginWasteService: class {
    ListWaste (_storeId, from, to) {
      calls.push(['ListWaste', from, to])
      return script.waste ? script.waste() : Promise.resolve({ entries: [] })
    }

    RecordWaste (_storeId, entry) {
      calls.push(['RecordWaste', entry])
      return script.recordWaste ? script.recordWaste() : Promise.resolve({ wasteEntryId: 'w-1' })
    }

    DeleteWaste (_storeId, wasteEntryId, revision) {
      calls.push(['DeleteWaste', wasteEntryId, revision])
      return script.deleteWaste ? script.deleteWaste() : Promise.resolve(undefined)
    }
  }
}))

jest.mock('~/utils/margin/ingredient-client', () => ({
  MarginIngredientService: class {
    ListIngredients (_storeId) {
      calls.push(['ListIngredients'])
      return script.ingredients
        ? script.ingredients()
        : Promise.resolve({ ingredients: [{ ingredientId: 'i-1', name: 'Tomat', baseUnit: 'Gram', status: 'Active' }] })
    }
  }
}))

jest.mock('~/utils/margin/recipe-client', () => ({
  MarginRecipeService: class {
    GetStatus (storeId) {
      calls.push(['GetStatus', storeId])
      return script.status
        ? script.status()
        : Promise.resolve({ storeId, flags: { module: true, statements: true }, projection: { watermarkJournalEntryId: 9, latestJournalEntryId: 9, lagEntries: 0 } })
    }
  }
}))

const STATEMENT_ID = 'f3000000-0000-0000-0000-000000000001'
const MONDAY = '2026-07-06'

// The proven journey's own figures (MJ-E2E-09).
function detail (overrides) {
  return Object.assign({
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
    inputReceiptJson: JSON.stringify({ Currency: 'NOK', CoveredNetSalesMinor: 26400, UncoveredNetSalesMinor: -10000, TheoreticalCostComplete: true, RecipeVersionIds: ['v-1'] }),
    spendEntries: [],
    revision: 'rev-1'
  }, overrides || {})
}

function row (overrides) {
  return Object.assign({
    statementId: STATEMENT_ID,
    periodStart: MONDAY + 'T00:00:00Z',
    periodEnd: '2026-07-12T00:00:00Z',
    revisionNumber: 1,
    state: 'Open',
    netFoodSalesMinor: 16400,
    actualFoodCostPercent: 140.24,
    theoreticalCostComplete: true,
    currency: 'NOK'
  }, overrides || {})
}

jest.mock('~/utils/margin/statement-client', () => {
  const actual = jest.requireActual('~/utils/margin/statement-client')
  return {
    // The date guards and the refusal predicate are the REAL ones: mocking them would test a fake.
    assertBusinessDate: actual.assertBusinessDate,
    isMondayDate: actual.isMondayDate,
    mondayOfWeek: actual.mondayOfWeek,
    isUncodedRefusal: actual.isUncodedRefusal,
    MarginStatementService: class {
      ListStatements (storeId) {
        calls.push(['ListStatements', storeId])
        return script.list ? script.list() : Promise.resolve({ storeId, statements: [] })
      }

      ListSuppliers (storeId) {
        calls.push(['ListSuppliers', storeId])
        return script.suppliers ? script.suppliers() : Promise.resolve([])
      }

      GetStatement (_storeId, id) {
        calls.push(['GetStatement', id])
        return script.get ? script.get() : Promise.resolve(null)
      }

      CreateStatement (_storeId, weekStart) {
        calls.push(['CreateStatement', weekStart])
        return script.create ? script.create(weekStart) : Promise.resolve(null)
      }

      SetInputs (_storeId, id, request, revision) {
        calls.push(['SetInputs', id, request, revision])
        return script.setInputs ? script.setInputs() : Promise.resolve(null)
      }

      Recalculate (_storeId, id, revision) {
        calls.push(['Recalculate', id, revision])
        return script.recalculate ? script.recalculate() : Promise.resolve(null)
      }

      Finalize (_storeId, id, revision) {
        calls.push(['Finalize', id, revision])
        return script.finalize ? script.finalize() : Promise.resolve(null)
      }

      ExportCsv (_storeId, id) {
        calls.push(['ExportCsv', id])
        return script.exportCsv ? script.exportCsv() : Promise.resolve({ text: 'StatementId\nabc\n', fileName: 'margin-statement-2026-07-06-rev1.csv' })
      }

      GetCoverage (_storeId, from, to) {
        calls.push(['GetCoverage', from, to])
        return script.coverage ? script.coverage() : Promise.resolve(null)
      }

      RebuildProjection (storeId) {
        calls.push(['RebuildProjection', storeId])
        return script.rebuild ? script.rebuild() : Promise.resolve({ factsAppended: 0 })
      }
    }
  }
})

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function pageMocks (user, i18n) {
  return {
    $i: i18n || ((key, params) => (params ? key + ':' + JSON.stringify(params) : key)),
    priceLabel: minor => 'kr ' + minor,
    wholeAmount: minor => String(Math.trunc(minor / 100)),
    fractionAmount: minor => String(Math.abs(minor) % 100).padStart(2, '0'),
    marketConfig: { currency: 'NOK' },
    $store: {
      getters: { userIsLoggedIn: true },
      state: {
        selectedAdminStore: 42,
        adminLocale: 'no',
        currentUser: Object.assign({ id: 1, adminIn: [{ id: 42 }] }, user || {})
      }
    },
    _coreInitializer: { bearerToken: 'tok' }
  }
}

function mountPage (user) {
  return shallowMount(MarginStatementsPage, {
    mocks: pageMocks(user),
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

/**
 * The same page with ONE real child: `MarginCoveragePanel`.
 *
 * `shallowMount` stubs every panel, so an assertion made against it is an assertion about a stub's
 * props — the shape a sibling lane found asserting nothing at all. This mounts the coverage panel for
 * real so the claim under test is the SENTENCE A VENUE READS, produced by the page's own wire read
 * going through `readCoverage`, and stubs the other three panels so this block can fail for one
 * reason only.
 */
function mountPageWithCoverage (user, i18n) {
  return mount(MarginStatementsPage, {
    mocks: pageMocks(user, i18n),
    stubs: {
      AdminPage: { template: '<div><slot /></div>' },
      MarginStatementFiguresPanel: true,
      MarginSpendPanel: true,
      MarginWastePanel: true
    }
  })
}

const named = name => calls.filter(c => c[0] === name)
const reset = () => { calls.length = 0; for (const k of Object.keys(script)) { delete script[k] } }

// The statement surface sits behind TWO flags and every one of its routes answers the same opaque 404
// when either is off. `GET /margin/status` is the only read that can tell a venue which it is looking
// at, so the three answers have to be three screens.
describe('the two flags are asked first, and their answers are three different screens', () => {
  beforeEach(reset)

  test('both flags ON: no blocker, and the surface reads', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="blocker"]').exists()).toBe(false)
    expect(named('ListStatements')).toHaveLength(1)
    expect(named('ListSuppliers')).toHaveLength(1)
  })

  test('module master OFF: the whole module is invisible and nothing is read', async () => {
    script.status = () => Promise.resolve({ storeId: 42, flags: { module: false, statements: false } })
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrgs_module_off')
    expect(named('ListStatements')).toHaveLength(0)
  })

  // The distinction that matters to a venue: recipes and plate cost still work, only this stage is
  // dark. Rendering the module-off copy here would send them looking for the wrong switch.
  test('master ON but the Statements STAGE off: a different blocker, and still no read', async () => {
    script.status = () => Promise.resolve({ storeId: 42, flags: { module: true, statements: false } })
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrgs_stage_off')
    expect(named('ListStatements')).toHaveLength(0)
  })

  test('the status read failing is UNKNOWN, not "off" — we do not claim a flag we could not read', async () => {
    script.status = () => Promise.reject(new MarginApiError(500, { detail: 'boom' }))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrgs_status_unknown')
  })

  test('the three blockers say three different things in all three dictionaries', () => {
    const keys = ['mrgs_module_off', 'mrgs_stage_off', 'mrgs_status_unknown']
    for (const locale of ['no', 'en', 'de']) {
      for (const key of keys) { expect(typeof translations[locale][key]).toBe('string') }
      expect(new Set(keys.map(k => translations[locale][k])).size).toBe(keys.length)
    }
  })
})

describe('the list is UNKNOWN when it did not answer, never an empty store', () => {
  beforeEach(reset)

  test('a failed list read shows the unknown notice, not the empty one', async () => {
    script.list = () => Promise.reject(new MarginApiError(500, { detail: 'boom' }))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="periods-unknown"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="periods-empty"]').exists()).toBe(false)
  })

  test('an answered but empty list shows the empty notice', async () => {
    const wrapper = mountPage()
    await settled()
    expect(wrapper.find('[data-test="periods-empty"]').exists()).toBe(true)
  })
})

// The journey the backend proves: open → enter spend → recalculate → finalise → correct → export.
describe('the proven journey, step by step', () => {
  beforeEach(reset)

  async function openStatement (overrides) {
    script.list = () => Promise.resolve({ storeId: 42, statements: [row()] })
    script.get = () => Promise.resolve(detail(overrides))
    const wrapper = mountPage()
    await settled()
    wrapper.find('[data-test="period-row"]').trigger('click')
    await settled()
    return wrapper
  }

  test('a week is opened for its Monday, and the response is used without a second read', async () => {
    script.create = weekStart => Promise.resolve(detail({ periodStart: weekStart + 'T00:00:00Z' }))
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ weekStart: MONDAY })
    await wrapper.vm.$nextTick()

    wrapper.find('[data-test="create-statement"]').trigger('click')
    await settled()

    expect(named('CreateStatement')).toEqual([['CreateStatement', MONDAY]])
    // The create answers with the FULL detail, so the statement is selected from it.
    expect(named('GetStatement')).toHaveLength(0)
    expect(wrapper.vm.selectedStatementId).toBe(STATEMENT_ID)
  })

  // Not snapped silently: that would produce a statement for a week nobody chose.
  test('a non-Monday offers its Monday as a suggestion instead of a create button', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ weekStart: '2026-07-09' })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="not-monday"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="create-statement"]').exists()).toBe(false)

    wrapper.find('[data-test="use-monday"]').trigger('click')
    await wrapper.vm.$nextTick()
    expect(wrapper.vm.weekStart).toBe(MONDAY)
    expect(wrapper.find('[data-test="create-statement"]').exists()).toBe(true)
  })

  // A week has at most one Open statement and the server refuses a second in prose with no machine
  // code. Pre-empted, because the fix is to go to the one that exists rather than to try again.
  test('a week that already has an Open statement offers a way to it, not a create button', async () => {
    script.list = () => Promise.resolve({ storeId: 42, statements: [row()] })
    script.get = () => Promise.resolve(detail())
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ weekStart: MONDAY })
    await wrapper.vm.$nextTick()

    expect(wrapper.find('[data-test="open-conflict"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="create-statement"]').exists()).toBe(false)

    wrapper.find('[data-test="open-existing"]').trigger('click')
    await settled()
    expect(named('GetStatement')).toEqual([['GetStatement', STATEMENT_ID]])
  })

  test('selecting a statement also reads the coverage for its OWN week', async () => {
    await openStatement()
    expect(named('GetCoverage')).toEqual([['GetCoverage', MONDAY, '2026-07-12']])
  })

  // REACHABILITY, not decoration: the waste routes exist only if this page calls them. A service with
  // a controller and a DI registration that no screen reaches is the exact shape this estate has
  // shipped four times in one day.
  test('selecting a statement reads the SAME week\'s waste as its coverage', async () => {
    await openStatement()
    expect(named('ListWaste')).toEqual([['ListWaste', MONDAY, '2026-07-12']])
  })

  test('the ingredient master is read once, for the form that lets the module price a loss', async () => {
    mountPage()
    await settled()
    expect(named('ListIngredients')).toHaveLength(1)
  })

  test('an archived ingredient is kept out of the pick-list', async () => {
    script.ingredients = () => Promise.resolve({
      ingredients: [
        { ingredientId: 'i-1', name: 'Tomat', baseUnit: 'Gram', status: 'Active' },
        { ingredientId: 'i-2', name: 'Gammel', baseUnit: 'Gram', status: 'Archived' }
      ]
    })
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.ingredients.map(i => i.id)).toEqual(['i-1'])
  })

  test('a failed ingredient read leaves the list UNKNOWN rather than empty', async () => {
    script.ingredients = () => Promise.reject(new MarginApiError(500, {}))
    const wrapper = mountPage()
    await settled()
    expect(wrapper.vm.ingredients).toBeNull()
  })

  test('recording waste re-reads BOTH the entries and the coverage totals', async () => {
    const wrapper = await openStatement()
    calls.length = 0
    wrapper.vm.recordWaste({ wasteDate: '2026-07-08', reason: 'Spoilage', ingredientId: 'i-1', quantity: 2500, valueMinor: null, description: null, note: null })
    await settled()

    expect(named('RecordWaste')).toHaveLength(1)
    // The per-reason breakdown is the SERVER's, so it would otherwise disagree with the row that just
    // landed beside it.
    expect(named('ListWaste')).toHaveLength(1)
    expect(named('GetCoverage')).toHaveLength(1)
  })

  test('removing an entry carries its OWN revision, not the statement\'s', async () => {
    const wrapper = await openStatement()
    calls.length = 0
    wrapper.vm.removeWaste({ wasteEntryId: 'w-1', revision: 'wrev-1' })
    await settled()

    expect(named('DeleteWaste')).toEqual([['DeleteWaste', 'w-1', 'wrev-1']])
  })

  test('finalising re-reads the waste, because the same act freezes it', async () => {
    script.finalize = () => Promise.resolve(detail({ state: 'Finalized', finalizedAtUtc: '2026-07-13T10:00:00Z', revision: 'rev-2' }))
    const wrapper = await openStatement()
    calls.length = 0
    wrapper.find('[data-test="finalize"]').trigger('click')
    await settled()

    expect(named('ListWaste')).toHaveLength(1)
  })

  test('saving the spend carries the statement revision in the client contract', async () => {
    script.setInputs = () => Promise.resolve(detail({ revision: 'rev-2' }))
    const wrapper = await openStatement()
    wrapper.vm.saveInputs({ spendEntries: [], openingStockValueMinor: null, closingStockValueMinor: null })
    await settled()

    expect(named('SetInputs')[0][1]).toBe(STATEMENT_ID)
    expect(named('SetInputs')[0][3]).toBe('rev-1')
    // The response IS the recalculated statement, so nothing is re-read for the panel — but the list
    // is, because the spend that just changed moves the row's percentage.
    expect(named('GetStatement')).toHaveLength(1)
    expect(named('ListStatements')).toHaveLength(2)
  })

  test('recalculating re-reads the coverage too, so the panel underneath cannot go stale', async () => {
    script.recalculate = () => Promise.resolve(detail({ revision: 'rev-2' }))
    const wrapper = await openStatement()
    calls.length = 0
    wrapper.find('[data-test="recalculate"]').trigger('click')
    await settled()

    expect(named('Recalculate')).toEqual([['Recalculate', STATEMENT_ID, 'rev-1']])
    expect(named('GetCoverage')).toHaveLength(1)
  })

  test('finalising freezes it, and the surface changes shape rather than refusing afterwards', async () => {
    script.finalize = () => Promise.resolve(detail({ state: 'Finalized', finalizedAtUtc: '2026-07-13T10:00:00Z', revision: 'rev-2' }))
    const wrapper = await openStatement()
    wrapper.find('[data-test="finalize"]').trigger('click')
    await settled()

    expect(named('Finalize')).toEqual([['Finalize', STATEMENT_ID, 'rev-1']])
    expect(wrapper.vm.statement.canMutate).toBe(false)
  })

  test('a finalised statement offers NO recalculate and NO finalise — only the correction path', async () => {
    script.list = () => Promise.resolve({ storeId: 42, statements: [row({ state: 'Finalized' })] })
    const wrapper = await openStatement({ state: 'Finalized', finalizedAtUtc: '2026-07-13T10:00:00Z' })

    expect(wrapper.find('[data-test="recalculate"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="finalize"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="immutable"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="create-correction"]').exists()).toBe(true)
  })

  test('the correction is the SAME create call, on the same week — forward-only revision 2', async () => {
    script.list = () => Promise.resolve({ storeId: 42, statements: [row({ state: 'Finalized' })] })
    script.create = () => Promise.resolve(detail({ statementId: 'st-2', revisionNumber: 2, previousStatementId: STATEMENT_ID }))
    const wrapper = await openStatement({ state: 'Finalized', finalizedAtUtc: '2026-07-13T10:00:00Z' })

    wrapper.find('[data-test="create-correction"]').trigger('click')
    await settled()

    expect(named('CreateStatement')).toEqual([['CreateStatement', MONDAY]])
    expect(wrapper.vm.statement.revisionNumber).toBe(2)
    expect(wrapper.vm.statement.previousStatementId).toBe(STATEMENT_ID)
  })

  // Offering it on an older revision would be a button whose single outcome is a server refusal.
  test('the correction is NOT offered on a superseded revision', async () => {
    script.list = () => Promise.resolve({
      storeId: 42,
      statements: [
        row({ statementId: 'st-2', revisionNumber: 2, state: 'Open' }),
        row({ statementId: STATEMENT_ID, revisionNumber: 1, state: 'Finalized' })
      ]
    })
    script.get = () => Promise.resolve(detail({ state: 'Finalized', finalizedAtUtc: '2026-07-13T10:00:00Z' }))
    const wrapper = mountPage()
    await settled()
    wrapper.findAll('[data-test="period-row"]').at(1).trigger('click')
    await settled()

    expect(wrapper.find('[data-test="immutable"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="create-correction"]').exists()).toBe(false)
  })

  // The bytes are fetched once and held: a second request could answer differently on an Open
  // statement, and the venue would save a file whose figures are not the ones it was shown.
  test('the export fetches once and hands the SAME bytes to the browser', async () => {
    const wrapper = await openStatement()
    wrapper.find('[data-test="export"]').trigger('click')
    await settled()

    expect(named('ExportCsv')).toEqual([['ExportCsv', STATEMENT_ID]])
    expect(wrapper.find('[data-test="export-ready"]').text()).toContain('margin-statement-2026-07-06-rev1.csv')

    const created = []
    const clicked = []
    global.URL.createObjectURL = () => { created.push(1); return 'blob:x' }
    global.URL.revokeObjectURL = () => {}
    const anchor = { click () { clicked.push(this.download) } }
    const originalCreate = document.createElement.bind(document)
    document.createElement = tag => (tag === 'a' ? anchor : originalCreate(tag))

    wrapper.find('[data-test="download"]').trigger('click')
    await settled()
    document.createElement = originalCreate

    expect(clicked).toEqual(['margin-statement-2026-07-06-rev1.csv'])
    expect(named('ExportCsv')).toHaveLength(1)
  })
})

// PowerUser only: a rebuild re-scans the store's whole journal, so a store admin would meet a 403 from
// the role filter. A control nobody in the room can use is a dead control.
describe('the projection repair is offered only to whoever the server would let use it', () => {
  beforeEach(reset)

  test('a store admin is not offered it', async () => {
    const wrapper = mountPage({ isPowerUser: false })
    await settled()
    expect(wrapper.find('[data-test="rebuild-projection"]').exists()).toBe(false)
  })

  test('a PowerUser is, with the lag that is the reason to press it', async () => {
    script.status = () => Promise.resolve({
      storeId: 42,
      flags: { module: true, statements: true },
      projection: { watermarkJournalEntryId: 4, latestJournalEntryId: 9, lagEntries: 5 }
    })
    const wrapper = mountPage({ isPowerUser: true })
    await settled()
    expect(wrapper.find('[data-test="projection-lag"]').text()).toContain('"lag":5')

    wrapper.find('[data-test="rebuild-projection"]').trigger('click')
    await settled()
    expect(named('RebuildProjection')).toEqual([['RebuildProjection', 42]])
    // The status is re-read because the lag is what the button is about; the statement is NOT
    // recalculated, because that is a mutation with its own control.
    expect(named('GetStatus')).toHaveLength(2)
    expect(named('Recalculate')).toHaveLength(0)
  })
})

describe('failures', () => {
  beforeEach(reset)

  async function failWith (error) {
    script.list = () => Promise.reject(error)
    const wrapper = mountPage()
    await settled()
    return wrapper.find('[data-test="failure"]').text()
  }

  test('a coded margin failure renders this page\'s own sentence', async () => {
    expect(await failWith(new MarginApiError(404, { code: 'margin.not-found', detail: 'x' }))).toBe('mrgs_err_not_found')
    expect(await failWith(new MarginApiError(403, { code: 'margin.forbidden', detail: 'x' }))).toBe('mrgs_err_forbidden')
    expect(await failWith(new MarginApiError(409, { code: 'margin.stale-revision', detail: 'x' }))).toBe('mrgs_err_stale')
  })

  // The statement surface answers its business rules with NO machine code — only English prose that
  // says which rule was broken. Quoting it beats flattening it into "something went wrong", and
  // beats inventing a translation for a sentence nobody here authored or can enumerate.
  test('an uncoded 400 is QUOTED verbatim inside a translated frame', async () => {
    const message = await failWith(new MarginApiError(400, { detail: 'This statement is finalized and immutable; create a new revision to correct it.' }))
    expect(message).toContain('mrgs_err_refused')
    expect(message).toContain('finalized and immutable')
  })

  // The positive control for the row above: a surprise still falls through to the generic sentence, so
  // the quoting branch is a real distinction rather than a catch-all.
  test('a 500 with no code is a surprise and says so', async () => {
    expect(await failWith(new MarginApiError(500, { detail: 'boom' }))).toBe('mrgs_err_generic')
  })

  test('every failure key exists in all three dictionaries', () => {
    const keys = [
      'mrgs_err_not_found', 'mrgs_err_forbidden', 'mrgs_err_stale', 'mrgs_err_revision_required',
      'mrgs_err_revision_invalid', 'mrgs_err_missing_revision', 'mrgs_err_refused', 'mrgs_err_generic',
      'mrgs_err_download_unavailable'
    ]
    for (const locale of ['no', 'en', 'de']) {
      for (const key of keys) { expect(typeof translations[locale][key]).toBe('string') }
    }
  })

  // The frame has to leave a slot for the server's sentence, or the only thing that says WHICH rule
  // was broken is dropped on the floor in that language.
  test('the refusal frame keeps the {detail} slot in every language', () => {
    for (const locale of ['no', 'en', 'de']) {
      expect(translations[locale].mrgs_err_refused).toContain('{detail}')
    }
  })
})

// THREE STATES, NOT TWO — driven through the page, in the words a venue actually reads.
//
// The coverage response carries a reason-coded waste block. When it does not carry one, the panel
// used to print "Ingenting er registrert som svinn i dette vinduet." — a statement of fact about a
// kitchen nobody had measured. "There is no waste block" and "the waste was recorded as none" are
// different claims and only the second one is a measurement.
//
// Three worlds and not two on purpose: the middle one (a block that IS present and IS zero) is what
// proves the fix is a new distinction rather than a relabelling. Without it a panel that answered
// "unknown" to everything would pass this block.
describe('an absent waste block reads as unknown, a zeroed one reads as zero', () => {
  beforeEach(reset)

  // The REAL Norwegian dictionary rather than the key-echoing mock the rest of this file uses: two
  // states that echo two different KEYS can still be one sentence once the dictionary resolves them,
  // and the sentence is the thing that misleads a venue. It also fails loudly on a key this build
  // does not define, which is the other half of shipping a new string.
  const norwegian = (key, params) => {
    const template = translations.no[key]
    if (typeof template !== 'string' || template === '') { throw new Error('no `no` translation for ' + key) }
    return params
      ? template.replace(/\{(\w+)\}/g, (_, name) => String(params[name]))
      : template
  }

  // The proven journey's own coverage figures (MJ-E2E-09), with the waste block as the ONLY variable.
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
    // `undefined` means the key is NEVER SET, which is what an API that predates the block sends —
    // not a `waste: undefined` property that a JSON round-trip would have dropped anyway.
    if (waste !== undefined) { response.waste = waste }
    return response
  }

  async function openWeekWhoseWasteIs (waste) {
    script.list = () => Promise.resolve({ storeId: 42, statements: [row()] })
    script.get = () => Promise.resolve(detail())
    script.coverage = () => Promise.resolve(coverageResponse(waste))
    const wrapper = mountPageWithCoverage(null, norwegian)
    await settled()
    wrapper.find('[data-test="period-row"]').trigger('click')
    await settled()
    return wrapper
  }

  const RECORDED = {
    valuedMinor: 3000,
    entryCount: 2,
    unvaluedEntryCount: 0,
    byReason: [{ reason: 'Spoilage', valuedMinor: 3000, entryCount: 2, unvaluedEntryCount: 0 }]
  }
  const MEASURED_AS_NONE = { valuedMinor: 0, entryCount: 0, unvaluedEntryCount: 0, byReason: [] }

  test('WORLD 1 — waste recorded with a value: the page prints the total the server sent', async () => {
    const wrapper = await openWeekWhoseWasteIs(RECORDED)

    expect(wrapper.find('[data-test="waste-total"]').text())
      .toBe('Registrert svinn: kr 3000.')
    expect(wrapper.find('[data-test="waste-none"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="coverage-waste-unknown"]').exists()).toBe(false)
  })

  test('WORLD 2 — waste recorded AS NONE: the page still says nothing was recorded', async () => {
    const wrapper = await openWeekWhoseWasteIs(MEASURED_AS_NONE)

    // The server looked at the week and found no entry. That is an answer, and it stays one.
    expect(wrapper.find('[data-test="waste-none"]').text())
      .toBe('Ingenting er registrert som svinn i dette vinduet.')
    expect(wrapper.find('[data-test="coverage-waste-unknown"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="waste-total"]').exists()).toBe(false)
  })

  test('WORLD 3 — NO waste block at all: the page says it could not tell, and claims no zero', async () => {
    const wrapper = await openWeekWhoseWasteIs(undefined)

    const text = wrapper.find('[data-test="coverage-waste-unknown"]').text()
    expect(text).toBe('Vi fikk ingen svinntall for dette vinduet. Det er ukjent — det betyr ikke at ingenting ble kastet.')
    // The sentence a venue must NOT be shown here, spelled out rather than referred to by key.
    expect(text).not.toBe('Ingenting er registrert som svinn i dette vinduet.')
    expect(wrapper.find('[data-test="waste-none"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="waste-total"]').exists()).toBe(false)
    // Not a zero anywhere on the way in either: the read model withholds rather than defaults.
    expect(wrapper.vm.coverage.waste).toBeNull()
  })

  // The whole lane in one assertion: the three worlds must be three different sentences on screen.
  // Collapsing any two of them is the defect, whichever direction it is collapsed in.
  test('the three worlds are three different sentences, not two', async () => {
    const said = []
    for (const waste of [RECORDED, MEASURED_AS_NONE, undefined]) {
      const wrapper = await openWeekWhoseWasteIs(waste)
      const shown = ['waste-total', 'waste-none', 'coverage-waste-unknown']
        .map(hook => wrapper.find('[data-test="' + hook + '"]'))
        .filter(node => node.exists())
      expect(shown).toHaveLength(1)
      said.push(shown[0].text())
      reset()
    }
    expect(new Set(said).size).toBe(3)
  })

  // A read that never answered is a fourth thing again, and it must not have been swallowed by the
  // new branch: the panel still refuses the whole surface rather than reporting on the waste alone.
  test('a coverage read that FAILED still hides the whole panel body, waste included', async () => {
    script.list = () => Promise.resolve({ storeId: 42, statements: [row()] })
    script.get = () => Promise.resolve(detail())
    script.coverage = () => Promise.reject(new MarginApiError(500, { detail: 'boom' }))
    const wrapper = mountPageWithCoverage(null, norwegian)
    await settled()
    wrapper.find('[data-test="period-row"]').trigger('click')
    await settled()

    expect(wrapper.find('[data-test="coverage-unknown"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="coverage-waste-unknown"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="waste-none"]').exists()).toBe(false)
  })

  test('the unknown copy exists, is non-empty, and differs from the none copy in all three dictionaries', () => {
    for (const locale of ['no', 'en', 'de']) {
      const unknown = translations[locale].mrgs_waste_coverage_unknown
      const none = translations[locale].mrgs_waste_coverage_none
      expect(typeof unknown).toBe('string')
      expect(unknown.trim().length).toBeGreaterThan(0)
      expect(unknown).not.toBe(none)
    }
  })
})
