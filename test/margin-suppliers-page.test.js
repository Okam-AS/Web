import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported,
// and `jest.mock` is hoisted above imports while the page import is not.
import MarginSuppliersPage from '~/pages/admin/margin-suppliers.vue'
import { MarginApiError } from '~/utils/margin/api-client'

const calls = []
// Per-test scripting of the fake backend. The page builds its clients in computeds, so the MODULES
// are mocked rather than the instances.
const script = {}

jest.mock('~/utils/margin/supplier-client', () => ({
  MarginSupplierService: class {
    GetStatus (storeId) {
      calls.push(['GetStatus', storeId])
      return script.status ? script.status() : Promise.resolve({ storeId, flags: { module: true, priceImport: false } })
    }

    ListSuppliers (_storeId, includeArchived) {
      calls.push(['ListSuppliers', includeArchived])
      return script.suppliers ? script.suppliers() : Promise.resolve([])
    }

    CreateSupplier (_storeId, request) {
      calls.push(['CreateSupplier', request])
      return script.createSupplier
        ? script.createSupplier(request)
        : Promise.resolve({ supplierId: 's-new', name: request.name, revision: 'rev-1' })
    }

    UpdateSupplier (_storeId, supplierId, revision, request) {
      calls.push(['UpdateSupplier', supplierId, revision, request])
      return Promise.resolve({ supplierId, name: request.name, revision: 'rev-2' })
    }

    ArchiveSupplier (_storeId, supplierId, revision) {
      calls.push(['ArchiveSupplier', supplierId, revision])
      return Promise.resolve({ supplierId, status: 'Archived', revision: 'rev-3' })
    }

    ListItems (_storeId, supplierId, includeArchived) {
      calls.push(['ListItems', supplierId, includeArchived])
      return script.items ? script.items() : Promise.resolve([])
    }

    CreateItem (_storeId, supplierId, request) {
      calls.push(['CreateItem', supplierId, request])
      return Promise.resolve({ supplierItemId: 'si-new', revision: 'irev-1' })
    }

    UpdateItem (_storeId, _supplierId, itemId, revision, request) {
      calls.push(['UpdateItem', itemId, revision, request])
      return Promise.resolve({ supplierItemId: itemId, revision: 'irev-2' })
    }

    GetPrices (_storeId, supplierItemId) {
      calls.push(['GetPrices', supplierItemId])
      return script.prices ? script.prices() : Promise.resolve([])
    }

    AddManualPrice (_storeId, supplierItemId, request) {
      calls.push(['AddManualPrice', supplierItemId, request])
      return script.addPrice ? script.addPrice(request) : Promise.resolve([])
    }
  }
}))

jest.mock('~/utils/margin/ingredient-client', () => ({
  MarginIngredientService: class {
    ListIngredients (_storeId, includeArchived) {
      calls.push(['ListIngredients', includeArchived])
      return script.ingredients ? script.ingredients() : Promise.resolve({ ingredients: [], starterCandidates: [] })
    }

    GetIngredient (_storeId, ingredientId) {
      calls.push(['GetIngredient', ingredientId])
      return script.ingredient
        ? script.ingredient()
        : Promise.resolve({ ingredientId, name: 'Tomat', baseUnit: 'Kilogram', revision: 'grev-1', conversions: [] })
    }

    CreateIngredient (_storeId, request) {
      calls.push(['CreateIngredient', request])
      return Promise.resolve({ ingredientId: 'i-new', revision: 'grev-1', conversions: [] })
    }

    UpdateIngredient (_storeId, ingredientId, revision, request) {
      calls.push(['UpdateIngredient', ingredientId, revision, request])
      return Promise.resolve({ ingredientId, revision: 'grev-2', conversions: [] })
    }

    ArchiveIngredient (_storeId, ingredientId, revision) {
      calls.push(['ArchiveIngredient', ingredientId, revision])
      return Promise.resolve({ ingredientId, status: 'Archived', revision: 'grev-3', conversions: [] })
    }
  }
}))

jest.mock('~/utils/margin/price-import-client', () => ({
  MarginPriceImportService: class {
    ListImports (storeId) {
      calls.push(['ListImports', storeId])
      return script.imports ? script.imports() : Promise.resolve({ imports: [] })
    }
  }
}))

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function mountPage () {
  return shallowMount(MarginSuppliersPage, {
    mocks: {
      $i: key => key,
      priceLabel: minor => 'kr ' + minor,
      wholeAmount: minor => String(Math.trunc(minor / 100)),
      fractionAmount: minor => String(minor % 100).padStart(2, '0'),
      marketConfig: { currency: 'NOK' },
      $store: {
        getters: { userIsLoggedIn: true },
        state: { selectedAdminStore: 42, adminLocale: 'no', currentUser: { id: 1, adminIn: [{ id: 42 }] } }
      },
      _coreInitializer: { bearerToken: 'tok' }
    },
    stubs: { AdminPage: { template: '<div><slot /></div>' } }
  })
}

beforeEach(() => {
  calls.length = 0
  Object.keys(script).forEach(key => delete script[key])
})

describe('the module gate', () => {
  test('with the master flag off the page says so and issues NO further reads', async () => {
    script.status = () => Promise.resolve({ flags: { module: false, priceImport: false } })
    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrg_module_off')
    expect(calls.map(call => call[0])).toEqual(['GetStatus'])
  })

  test('a status read that FAILS says the state is unknown — never that the module is off', async () => {
    script.status = () => Promise.reject(new MarginApiError(500, { detail: 'boom' }))
    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrg_status_unknown')
  })

  test('an opaque 404 on status IS the module being invisible', async () => {
    script.status = () => Promise.reject(new MarginApiError(404, { code: 'margin.not-found' }))
    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrg_module_off')
  })

  test('with the module on it loads the ingredient master and the suppliers', async () => {
    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('[data-test="blocker"]').exists()).toBe(false)
    expect(calls.map(call => call[0])).toEqual(expect.arrayContaining(['ListIngredients', 'ListSuppliers']))
  })

  test('the import list is read ONLY when the stage flag says the surface exists', async () => {
    const wrapper = mountPage()
    await settled()
    // Off: every import route would answer the same opaque 404, so the read is not made at all.
    expect(calls.map(call => call[0])).not.toContain('ListImports')
    expect(wrapper.vm.batchNames).toBeNull()

    calls.length = 0
    script.status = () => Promise.resolve({ flags: { module: true, priceImport: true } })
    script.imports = () => Promise.resolve({ imports: [{ batchId: 'b-1', fileName: 'mars.csv' }] })
    const withStage = mountPage()
    await settled()
    await settled()

    expect(calls.map(call => call[0])).toContain('ListImports')
    // Provenance the timeline can print instead of a Guid.
    expect(withStage.vm.batchNames).toEqual({ 'b-1': 'mars.csv' })
  })
})

describe('a failed read is unknown, not empty', () => {
  test('the supplier list stays null so the page cannot claim the store has no suppliers', async () => {
    script.suppliers = () => Promise.reject(new MarginApiError(500, { detail: 'boom' }))
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.suppliers).toBeNull()
    expect(wrapper.find('[data-test="suppliers-unknown"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="suppliers-empty"]').exists()).toBe(false)
  })

  test('an answered but empty list is a different sentence', async () => {
    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('[data-test="suppliers-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="suppliers-unknown"]').exists()).toBe(false)
  })
})

describe('THE SUPPLIER REVISION GAP — the backend has no per-supplier read', () => {
  test('a supplier picked from the LIST cannot be edited, and the page says why', async () => {
    // `MarginSupplierSummary` carries no revision and there is no `GET /suppliers/{id}`, so the
    // If-Match a write must send is simply not obtainable. The controls are withheld rather than
    // offered and refused.
    script.suppliers = () => Promise.resolve([{ supplierId: 's-1', name: 'Grossisten AS', status: 'Active' }])
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.selectSupplier('s-1')
    await settled()

    expect(wrapper.vm.editingSupplier).toBe(false)
    expect(wrapper.find('[data-test="supplier-no-revision"]').exists()).toBe(true)
  })

  test('a supplier CREATED in this session is editable, because its response carried the revision', async () => {
    const wrapper = mountPage()
    await settled()

    wrapper.vm.supplierForm.name = 'Grossisten AS'
    await wrapper.vm.saveSupplier()
    await settled()

    expect(wrapper.vm.editingSupplier).toBe(true)
    expect(wrapper.vm.supplierRevisions['s-new']).toBe('rev-1')
    expect(wrapper.find('[data-test="supplier-no-revision"]').exists()).toBe(false)
  })

  test('the second save sends the NEW revision, not the one the create answered with', async () => {
    const wrapper = mountPage()
    await settled()

    wrapper.vm.supplierForm.name = 'Grossisten AS'
    await wrapper.vm.saveSupplier()
    await settled()

    wrapper.vm.supplierForm.name = 'Grossisten Norge AS'
    await wrapper.vm.saveSupplier()
    await settled()

    const update = calls.find(call => call[0] === 'UpdateSupplier')
    expect(update[2]).toBe('rev-1')
    // And the response's fresh token replaced it, so a third save would not reuse a spent one.
    expect(wrapper.vm.supplierRevisions['s-new']).toBe('rev-2')
  })

  test('switching store drops every held revision — a token belongs to one row of one store', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.vm.supplierForm.name = 'Grossisten AS'
    await wrapper.vm.saveSupplier()
    await settled()
    expect(wrapper.vm.supplierRevisions['s-new']).toBe('rev-1')

    await wrapper.vm.init()
    await settled()
    expect(wrapper.vm.supplierRevisions).toEqual({})
  })
})

describe('supplier items and the cost trap', () => {
  const ITEMS = [
    { supplierItemId: 'si-1', supplierId: 's-1', ingredientId: 'i-1', name: 'Tomat 10 kg', packSize: 10, purchaseUnitCode: 'kg', purchaseUnitToBaseFactor: 1, isPreferred: true, status: 'Active', revision: 'irev-1' },
    { supplierItemId: 'si-2', supplierId: 's-1', ingredientId: 'i-1', name: 'Tomat kasse', packSize: null, purchaseUnitCode: 'kasse', purchaseUnitToBaseFactor: null, isPreferred: false, status: 'Active', revision: 'irev-2' }
  ]

  test('an item without a pack size or a conversion is flagged as uncostable', async () => {
    script.suppliers = () => Promise.resolve([{ supplierId: 's-1', name: 'Grossisten AS', status: 'Active' }])
    script.items = () => Promise.resolve(ITEMS)
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectSupplier('s-1')
    await settled()

    const rows = wrapper.vm.itemRows
    expect(rows[0].costState).toBe('costable')
    expect(rows[1].costState).toBe('incomplete')
    expect(rows[1].missingPackSize).toBe(true)
    expect(rows[1].missingFactor).toBe(true)
  })

  test('an incomplete PREFERRED item is reported at ingredient level, because it blocks the others', async () => {
    // The resolver returns NO price for the ingredient when its preferred item cannot cost — it does
    // not fall through to a complete rival — so one bad article un-prices a well-stocked ingredient.
    script.suppliers = () => Promise.resolve([{ supplierId: 's-1', name: 'Grossisten AS', status: 'Active' }])
    script.items = () => Promise.resolve([
      Object.assign({}, ITEMS[0], { packSize: null, purchaseUnitToBaseFactor: null }),
      ITEMS[1]
    ])
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectSupplier('s-1')
    await settled()
    await wrapper.vm.selectItem('si-2')
    await settled()

    expect(wrapper.vm.preferredBlocker).not.toBeNull()
    expect(wrapper.vm.preferredBlocker.supplierItemId).toBe('si-1')
    expect(wrapper.find('[data-test="preferred-blocker"]').exists()).toBe(true)
  })

  test('an item write re-reads the WHOLE list, because preferring one clears another', async () => {
    script.suppliers = () => Promise.resolve([{ supplierId: 's-1', name: 'Grossisten AS', status: 'Active' }])
    script.items = () => Promise.resolve(ITEMS)
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectSupplier('s-1')
    await settled()

    calls.length = 0
    await wrapper.vm.createItem({ ingredientId: 'i-1', name: 'Tomat 5 kg', isPreferred: true })
    await settled()

    expect(calls.map(call => call[0])).toEqual(expect.arrayContaining(['CreateItem', 'ListItems']))
  })

  test('only ACTIVE ingredients are offered to a new item — archived ones are out of pick-lists', async () => {
    script.ingredients = () => Promise.resolve({
      ingredients: [
        { ingredientId: 'i-1', name: 'Tomat', baseUnit: 'Kilogram', status: 'Active' },
        { ingredientId: 'i-2', name: 'Gammel råvare', baseUnit: 'Kilogram', status: 'Archived' }
      ],
      starterCandidates: []
    })
    const wrapper = mountPage()
    await settled()

    expect(wrapper.vm.activeIngredients.map(i => i.ingredientId)).toEqual(['i-1'])
  })
})

describe('prices', () => {
  test('the manual price goes out as integer øre and a UTC instant', async () => {
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ selectedItemId: 'si-1' })

    await wrapper.vm.addPrice({ priceMinor: 4990, currency: 'NOK', effectiveFromUtc: '2026-03-01T09:00:00.000Z' })
    await settled()

    const call = calls.find(entry => entry[0] === 'AddManualPrice')
    expect(call[2]).toEqual({ priceMinor: 4990, currency: 'NOK', effectiveFromUtc: '2026-03-01T09:00:00.000Z' })
  })

  test('the response IS the refreshed timeline, so nothing is re-read for it', async () => {
    script.addPrice = () => Promise.resolve([
      { id: 'p-2', priceMinor: 5250, currency: 'NOK', effectiveFrom: '2026-04-01T00:00:00', effectiveTo: null, source: 'Manual' },
      { id: 'p-1', priceMinor: 4990, currency: 'NOK', effectiveFrom: '2026-03-01T00:00:00', effectiveTo: '2026-04-01T00:00:00', source: 'Manual' }
    ])
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ selectedItemId: 'si-1' })

    calls.length = 0
    await wrapper.vm.addPrice({ priceMinor: 5250, currency: 'NOK', effectiveFromUtc: '2026-04-01T00:00:00.000Z' })
    await settled()

    expect(calls.map(call => call[0])).toEqual(['AddManualPrice'])
    // And the supersede seam is already visible without a second round trip.
    expect(wrapper.vm.timeline.rows[1].closesInto).toBe('next')
    expect(wrapper.vm.timeline.openRow.id).toBe('p-2')
  })

  test('a REFUSED price shows the server’s own words, not "something went wrong"', async () => {
    // The overlap and backdating refusals are uncoded 400s. Their prose is the only instruction.
    const detail = 'A later-dated price already exists; prices supersede forward and cannot be backdated (overlapping effective ranges are not allowed).'
    script.addPrice = () => Promise.reject(new MarginApiError(400, { title: 'Bad Request', detail }))
    const wrapper = mountPage()
    await settled()
    wrapper.setData({ selectedItemId: 'si-1' })

    await wrapper.vm.addPrice({ priceMinor: 1, currency: 'NOK', effectiveFromUtc: '2020-01-01T00:00:00.000Z' })
    await settled()

    expect(wrapper.vm.failure).toBe('mrg_err_server_detail')
  })
})

describe('ingredients', () => {
  test('selecting one reads its DETAIL, which is what carries the revision', async () => {
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.selectIngredient('i-1')
    await settled()

    expect(calls).toContainEqual(['GetIngredient', 'i-1'])
    expect(wrapper.vm.ingredientDetail.revision).toBe('grev-1')
  })

  test('a write adopts the FRESH revision from its response', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectIngredient('i-1')
    await settled()

    await wrapper.vm.updateIngredient({ detail: wrapper.vm.ingredientDetail, request: { name: 'Tomat', conversions: [] } })
    await settled()

    const update = calls.find(call => call[0] === 'UpdateIngredient')
    expect(update[2]).toBe('grev-1')
    expect(wrapper.vm.ingredientDetail.revision).toBe('grev-2')
  })

  test('archiving sends the revision and leaves the detail showing the archived row', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectIngredient('i-1')
    await settled()

    await wrapper.vm.archiveIngredient(wrapper.vm.ingredientDetail)
    await settled()

    expect(calls).toContainEqual(['ArchiveIngredient', 'i-1', 'grev-1'])
    expect(wrapper.vm.ingredientDetail.status).toBe('Archived')
  })
})
