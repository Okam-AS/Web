import { mount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import MenuImportPage from '~/pages/admin/import.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

// The page renders inside AdminPage, which pulls in the whole admin shell. The flow itself is
// what is under test, so the shell is replaced by a pass-through wrapper.
jest.mock('~/components/organisms/AdminPage.vue', () => ({
  name: 'AdminPage',
  render (h) { return h('div', this.$slots.default) }
}))

jest.mock('~/components/atoms/Modal.vue', () => ({
  name: 'Modal',
  render (h) { return h('div', this.$slots.default) }
}))

// vuedraggable reaches for browser APIs jsdom does not provide, and nothing here edits a
// variant through the real modal.
jest.mock('~/components/admin/VariantEditorModal.vue', () => ({
  name: 'VariantEditorModal',
  render (h) { return h('div') },
  methods: { open: () => Promise.resolve(null) }
}))

const catalogue = [
  {
    productId: 'p1',
    name: '1. Vegetar',
    categoryId: 'c1',
    categoryName: 'Pizza',
    takeaway: 24000,
    eatIn: 26000,
    delivery: 26000,
    description: 'Ost og tomat',
    otherInformation: 'Gluten',
    tax: 15,
    eatInTax: 25,
    deliveryTax: 15,
    depositAmount: 0,
    soldOut: false,
    hide: false,
    variants: [{ variantGroupId: 'v1', name: 'Størrelse', required: true, multiSelect: false, orderIndex: 0, options: [] }]
  },
  { productId: 'p2', name: '2. Kjøtt', categoryId: 'c1', categoryName: 'Pizza', takeaway: 25000, eatIn: 27000, delivery: 27000, variants: [] }
]

const categories = [
  { categoryId: 'c1', name: 'Pizza', suggestedTax: 15, suggestedEatInTax: 25, suggestedDeliveryTax: 15, taxSuggestionAvailable: true }
]

const analysis = {
  storeId: 7,
  storeName: 'Jungel Torshov',
  sources: [{ documentName: 'meny.pdf', columns: [], pages: [{ pageNumber: 1, rowCount: 2 }], warnings: [] }],
  documents: [{ documentName: 'meny.pdf' }],
  sourceMetadata: [],
  sourceMetadataToken: 'meta-token',
  warnings: [],
  rows: [
    {
      rowKey: 'n:1',
      menuNumber: '1',
      name: 'Vegetar',
      sizeLabel: 'Medium',
      categoryName: 'Pizza',
      description: 'Ost, tomat og basilikum',
      suggestedAction: 'Update',
      suggestedProductId: 'p1',
      candidates: [],
      warnings: [],
      sourcePrices: [{ channel: 'Takeaway', amount: 24500 }]
    },
    {
      rowKey: 'n:2',
      name: 'Pistasjdessert',
      categoryName: 'Dessert',
      description: 'Pistasjkrem med knasende kjeks',
      otherInformation: 'Nøtter, melk',
      suggestedAction: 'Create',
      suggestedProductId: null,
      candidates: [],
      warnings: [],
      sourcePrices: [{ channel: 'Takeaway', amount: 10900 }]
    }
  ],
  catalogue,
  categories,
  unmatchedCatalogueProductIds: ['p2']
}

const validation = (overrides = {}) => ({
  operationId: 'op-1',
  planToken: 'token-1',
  expiresAt: '2026-09-09T12:00:00Z',
  catalogueHash: 'hash-1',
  normalizedPlan: { storeId: 7, rows: [{ rowKey: 'n:1' }, { rowKey: 'n:2' }] },
  canApply: true,
  rows: [
    {
      rowKey: 'n:1',
      changed: true,
      productName: '1. Vegetar',
      blockers: [],
      warnings: [],
      metadataChanges: [],
      takeaway: { currentAmount: 24000, newAmount: 24500, origin: 'Source', changed: true, deltaPercent: 2.1 },
      eatIn: { currentAmount: 26000, newAmount: 26000, origin: 'Unchanged', changed: false },
      delivery: { currentAmount: 26000, newAmount: 26000, origin: 'Unchanged', changed: false }
    },
    {
      rowKey: 'n:2',
      changed: true,
      productName: 'Pistasjdessert',
      blockers: [],
      warnings: [],
      metadataChanges: [],
      takeaway: { currentAmount: null, newAmount: 10900, origin: 'Source', changed: true },
      eatIn: { currentAmount: null, newAmount: 10900, origin: 'Rule', changed: true },
      delivery: { currentAmount: null, newAmount: 10900, origin: 'Rule', changed: true }
    }
  ],
  ...overrides
})

// A real receipt, not `{}`. The page reads its lists to say what happened, and a fixture that
// omits them tests a shape the API never returns.
const receipt = (overrides = {}) => ({
  operationId: 'op-1',
  replayed: false,
  updatedProductIds: ['p1'],
  createdProductIds: ['p9'],
  metadataUpdatedProductIds: [],
  createdCategoryIds: [],
  removedProductIds: [],
  prices: [
    { productId: 'p1', productName: '1. Vegetar', created: false, channels: [{ channel: 'Takeaway', amount: 24500 }] },
    { productId: 'p9', productName: 'Pistasjdessert', created: true, channels: [{ channel: 'Takeaway', amount: 10900 }] }
  ],
  ...overrides
})

function makeStorage () {
  const contents = {}
  return {
    contents,
    getItem: key => (key in contents ? contents[key] : null),
    setItem: (key, value) => { contents[key] = String(value) },
    removeItem: (key) => { delete contents[key] }
  }
}

function build ({ service = {}, selectedAdminStore = 7, storage = makeStorage() } = {}) {
  // The page reaches for the real localStorage, so the fake is installed there rather than
  // stubbed on the component: that keeps the storage code path itself under test.
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true, writable: true })

  const stub = {
    Analyze: jest.fn().mockResolvedValue(analysis),
    Remap: jest.fn().mockResolvedValue(analysis),
    Catalogue: jest.fn().mockResolvedValue({ storeId: 7, catalogue, categories }),
    Validate: jest.fn().mockResolvedValue(validation()),
    Apply: jest.fn().mockResolvedValue(receipt()),
    GetStatus: jest.fn().mockResolvedValue({ applied: false }),
    ...service
  }

  const store = new Vuex.Store({
    state: { selectedAdminStore, currentUser: { id: 'u1' } },
    getters: { userIsLoggedIn: () => true }
  })

  const wrapper = mount(MenuImportPage, {
    localVue,
    store,
    mocks: {
      $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
      $router: { push: jest.fn(), replace: jest.fn() },
      $route: { path: '/admin/import', query: {} }
    },
    computed: {
      _menuUpdateService: () => stub
    }
  })

  return { wrapper, stub, storage }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('one workspace, one plan', () => {
  it('asks for a store before offering anything to import', () => {
    const { wrapper } = build({ selectedAdminStore: 0 })
    expect(wrapper.text()).toContain('menuImport_selectStoreTitle')
    wrapper.destroy()
  })

  it('shows only the rows this import is about, never the rest of the catalogue', () => {
    // p2 is in the store and absent from the menu. It is not being changed, so it is not listed.
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)

    expect(wrapper.vm.rows).toHaveLength(2)
    expect(wrapper.vm.rows.map(row => row.rowKey)).toEqual(['n:1', 'n:2'])
    wrapper.destroy()
  })

  it('defaults a matched row to Update and an unmatched one to Create', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)

    expect(wrapper.vm.rows.map(row => row.action)).toEqual(['Update', 'Create'])
    wrapper.destroy()
  })

  it('lets a row be overridden to Create and back to a chosen product', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    const row = wrapper.vm.rows[0]

    wrapper.vm.linkProduct(row, null)
    expect(row).toMatchObject({ action: 'Create', targetProductId: null })
    expect(row.newProduct).toBeTruthy()

    wrapper.vm.linkProduct(row, 'p2')
    expect(row).toMatchObject({ action: 'Update', targetProductId: 'p2', matchConfirmed: true, newProduct: null })
    wrapper.destroy()
  })

  it('saves through the one signed plan the server normalised, not a rebuilt one', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    const ready = validation()
    wrapper.vm.validation = ready
    stub.Validate.mockResolvedValue(ready)

    await wrapper.vm.approve()

    expect(stub.Apply).toHaveBeenCalledTimes(1)
    expect(stub.Apply.mock.calls[0][0].plan).toBe(ready.normalizedPlan)
    wrapper.destroy()
  })

  it('refuses to apply when the fresh prices differ from the ones on screen', async () => {
    const changed = validation()
    changed.rows[0].takeaway.newAmount = 29900
    const { wrapper, stub } = build({ service: { Validate: jest.fn().mockResolvedValue(changed) } })
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()

    await wrapper.vm.approve()

    expect(stub.Apply).not.toHaveBeenCalled()
    expect(wrapper.vm.validationError).toBe('menuImport_pricesRefreshed')
    wrapper.destroy()
  })

  it('refuses to apply when a metadata change appears between the review and the approval', async () => {
    // A different write is a different plan, whether the number that changed is a price or not.
    const changed = validation()
    changed.rows[0].metadataChanges = [{ field: 'name', from: '1. Vegetar', to: 'Vegetar deluxe' }]
    const { wrapper, stub } = build({ service: { Validate: jest.fn().mockResolvedValue(changed) } })
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()

    await wrapper.vm.approve()

    expect(stub.Apply).not.toHaveBeenCalled()
    expect(wrapper.vm.validationError).toBe('menuImport_pricesRefreshed')
    wrapper.destroy()
  })

  it('will not approve before the current draft has been validated', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()
    wrapper.vm.setManual(wrapper.vm.rows[0], 'takeaway', '280')

    expect(wrapper.vm.validation).toBeNull()
    await wrapper.vm.approve()
    expect(stub.Apply).not.toHaveBeenCalled()
    wrapper.destroy()
  })
})

describe('existing metadata stays untouched until it is edited', () => {
  it('sends no metadata for an analysed row whose description differs from the product', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls[0][0].rows.find(row => row.rowKey === 'n:1')
    expect(sent.metadata).toBeUndefined()
    wrapper.destroy()
  })

  it('sends the patch once, and only once, the operator edits the field', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'description', 'Min egen tekst')
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0].rows.find(row => row.rowKey === 'n:1')
    expect(sent.metadata).toEqual({ description: 'Min egen tekst' })
    wrapper.destroy()
  })

  it('does not patch anything just because a column was made visible', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.onColumnPreset('all')
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0].rows.find(row => row.rowKey === 'n:1')
    expect(sent.metadata).toBeUndefined()
    wrapper.destroy()
  })

  it('leaves an existing product\'s option groups alone unless they were edited', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls[0][0].rows.find(row => row.rowKey === 'n:1')
    expect(sent.metadata).toBeUndefined()
    wrapper.destroy()
  })

  it('changes nothing when a group is opened and the edit is cancelled', async () => {
    // Taking the working copy before the modal is answered is enough to turn a row that leaves
    // the product's groups alone into one that replaces them.
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    const row = wrapper.vm.rows[0]
    wrapper.vm.$refs.variantEditor.open = () => Promise.resolve(null)

    await wrapper.vm.editVariantOf(row, 0)
    await wrapper.vm.validate()

    expect(row.variantGroups).toBeNull()
    const sent = stub.Validate.mock.calls.pop()[0].rows.find(item => item.rowKey === 'n:1')
    expect(sent.metadata).toBeUndefined()
    wrapper.destroy()
  })

  it('copies the current groups in before the first edit, so editing one cannot delete the rest', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    const row = wrapper.vm.rows[0]

    wrapper.vm.beginVariantEdit(row)

    expect(row.variantGroups).toHaveLength(1)
    expect(row.variantGroups[0].variantGroupId).toBe('v1')
    wrapper.destroy()
  })

  it('records removing the last group as an explicit clear, never as an empty list', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    const row = wrapper.vm.rows[0]

    wrapper.vm.beginVariantEdit(row)
    wrapper.vm.removeVariantOf(row, 0)
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0].rows.find(item => item.rowKey === 'n:1')
    expect(sent.metadata).toEqual({ clearVariants: true })
    wrapper.destroy()
  })
})

describe('categories', () => {
  it('proposes the source category for a new row, creating one only where none matches', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)

    // "Dessert" is not in the store, so it is declared once and the row points at it.
    expect(wrapper.vm.newCategories).toEqual([{ key: 'newcat-1', name: 'Dessert' }])
    expect(wrapper.vm.rows[1].metadataEdits.newCategoryKey).toBe('newcat-1')
    wrapper.destroy()
  })

  it('does not move an existing product into another category on its own', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)

    expect(wrapper.vm.rows[0].metadataEdits.categoryId).toBeUndefined()
    wrapper.destroy()
  })

  it('reuses an existing category rather than creating a second one with the same name', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.createCategoryFor(wrapper.vm.rows[1], 'Pizza')

    expect(wrapper.vm.rows[1].metadataEdits.categoryId).toBe('c1')
    expect(wrapper.vm.rows[1].metadataEdits.newCategoryKey).toBeUndefined()
    wrapper.destroy()
  })
})

describe('appending a second reading', () => {
  it('rekeys colliding rows instead of letting one shadow the other', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.adoptAnalysis(analysis, { append: true })

    const keys = wrapper.vm.rows.map(row => row.rowKey)
    expect(keys).toHaveLength(4)
    expect(new Set(keys).size).toBe(4)
    wrapper.destroy()
  })

  it('folds the same new category from both readings into one', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.adoptAnalysis(analysis, { append: true })

    expect(wrapper.vm.newCategories).toHaveLength(1)
    wrapper.destroy()
  })
})

describe('drafts', () => {
  it('never takes the store from a file, and never its replaceAll flag', async () => {
    const { wrapper } = build()
    wrapper.vm.draftImportText = JSON.stringify({
      storeId: 999,
      replaceAll: true,
      rows: [{ name: 'Gammel rad', priceAmount: 12000, tax: 15 }]
    })
    wrapper.vm.readDraft()

    expect(wrapper.vm.pendingDraft.declaredStoreId).toBe(999)
    expect(wrapper.vm.pendingDraft.declaredReplaceAll).toBe(true)

    wrapper.vm.acceptDraft(true)
    await flush()

    expect(wrapper.vm.selectedStore).toBe(7)
    expect(wrapper.vm.removalPreview).toBeNull()
    wrapper.destroy()
  })

  it('keeps the price rules with the draft, so it reopens showing the same money', async () => {
    const { wrapper, storage } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.activeRules = { ...wrapper.vm.activeRules, rounding: 'NearestFiveKroner' }
    wrapper.vm.saveDraft()

    const saved = JSON.parse(storage.contents['menuImport.draft.u1.7'])
    expect(saved.rules.rounding).toBe('NearestFiveKroner')

    const { wrapper: reopened } = build({ storage })
    await flush()
    expect(reopened.vm.activeRules.rounding).toBe('NearestFiveKroner')
    reopened.destroy()
    wrapper.destroy()
  })
})

describe('an apply whose result was never seen', () => {
  it('freezes the plan and offers only status or the same operation again', async () => {
    const failure = Object.assign(new Error('network'), { status: 0 })
    const { wrapper, stub } = build({ service: { Apply: jest.fn().mockRejectedValue(failure) } })
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()

    await wrapper.vm.approve()

    expect(wrapper.vm.outcomeUnknown).toBe(true)
    expect(wrapper.vm.canApprove).toBe(false)
    expect(stub.Apply).toHaveBeenCalledTimes(1)
    wrapper.destroy()
  })

  it('remembers the exact request before sending, so a reload cannot start a second one', async () => {
    const failure = Object.assign(new Error('network'), { status: 0 })
    const storage = makeStorage()
    const { wrapper } = build({ storage, service: { Apply: jest.fn().mockRejectedValue(failure) } })
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()
    await wrapper.vm.approve()
    wrapper.destroy()

    // A fresh page, the same person, the same store: still frozen on that operation.
    const { wrapper: reloaded } = build({ storage })
    await flush()

    expect(reloaded.vm.outcomeUnknown).toBe(true)
    expect(reloaded.vm.pendingApplyRequest.operationId).toBe('op-1')
    expect(reloaded.vm.canApprove).toBe(false)
    reloaded.destroy()
  })

  it('retries the very same signed request rather than building a new one', async () => {
    const failure = Object.assign(new Error('network'), { status: 0 })
    const Apply = jest.fn()
      .mockRejectedValueOnce(failure)
      .mockResolvedValueOnce(receipt({ replayed: true }))
    const { wrapper } = build({ service: { Apply } })
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()

    await wrapper.vm.approve()
    const sent = Apply.mock.calls[0][0]
    await wrapper.vm.retryPendingApply()

    expect(Apply).toHaveBeenCalledTimes(2)
    expect(Apply.mock.calls[1][0]).toEqual(sent)
    expect(wrapper.vm.receipt.replayed).toBe(true)
    wrapper.destroy()
  })

  it('stays frozen when the status says it has not been applied yet', async () => {
    const failure = Object.assign(new Error('network'), { status: 0 })
    const { wrapper } = build({
      service: { Apply: jest.fn().mockRejectedValue(failure), GetStatus: jest.fn().mockResolvedValue({ applied: false }) }
    })
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()
    await wrapper.vm.approve()

    await wrapper.vm.checkStatus()

    // "Not applied" is not a verdict: the ledger row only exists once the transaction commits.
    expect(wrapper.vm.outcomeUnknown).toBe(true)
    expect(wrapper.vm.applyError).toBe('menuImport_statusNotApplied')
    wrapper.destroy()
  })

  it('is released, and its saved note cleared, once a receipt proves the outcome', async () => {
    const failure = Object.assign(new Error('network'), { status: 0 })
    const Apply = jest.fn().mockRejectedValueOnce(failure)
    const storage = makeStorage()
    const { wrapper } = build({
      storage,
      service: { Apply, GetStatus: jest.fn().mockResolvedValue({ applied: true, receipt: receipt() }) }
    })
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()
    await wrapper.vm.approve()

    await wrapper.vm.checkStatus()

    expect(wrapper.vm.outcomeUnknown).toBe(false)
    expect(storage.contents['menuImport.pending.u1.7']).toBeUndefined()
    expect(storage.contents['menuImport.draft.u1.7']).toBeUndefined()
    wrapper.destroy()
  })

  it('drops the note when the server refuses, because a refusal means nothing was written', async () => {
    const refused = Object.assign(new Error('nope'), { status: 400 })
    const storage = makeStorage()
    const { wrapper } = build({ storage, service: { Apply: jest.fn().mockRejectedValue(refused) } })
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()

    await wrapper.vm.approve()

    expect(wrapper.vm.outcomeUnknown).toBe(false)
    expect(storage.contents['menuImport.pending.u1.7']).toBeUndefined()
    wrapper.destroy()
  })
})

describe('replacing the whole store menu', () => {
  it('is never requested by an ordinary save', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    await wrapper.vm.validate()

    expect(stub.Validate.mock.calls[0][0].catalogueReplacement).toBeUndefined()
    wrapper.destroy()
  })

  it('needs the typed word before it can be confirmed', async () => {
    const withRemoval = validation({ removal: { requested: true, productIds: ['p2'], products: [{ productId: 'p2', name: '2. Kjøtt' }] } })
    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(withRemoval) } })
    wrapper.vm.adoptAnalysis(analysis)
    await wrapper.vm.previewRemoval()

    expect(wrapper.vm.removalPreview.productIds).toEqual(['p2'])
    expect(wrapper.vm.canConfirmReplace).toBe(false)

    wrapper.vm.replaceConfirmation = 'menuImport_replaceWord'
    expect(wrapper.vm.canConfirmReplace).toBe(true)
    wrapper.destroy()
  })

  it('sends back exactly the ids that were shown', async () => {
    const withRemoval = validation({ removal: { requested: true, productIds: ['p2'], products: [{ productId: 'p2', name: '2. Kjøtt' }] } })
    const Validate = jest.fn().mockResolvedValue(withRemoval)
    const { wrapper, stub } = build({ service: { Validate } })
    wrapper.vm.adoptAnalysis(analysis)
    await wrapper.vm.previewRemoval()
    wrapper.vm.validation = withRemoval
    wrapper.vm.replaceConfirmation = 'menuImport_replaceWord'

    await wrapper.vm.confirmReplace()

    const sent = Validate.mock.calls.pop()[0]
    expect(sent.catalogueReplacement).toEqual({ requested: true, expectedRemovedProductIds: ['p2'] })
    expect(stub.Apply).toHaveBeenCalledTimes(1)
    wrapper.destroy()
  })

  it('stops and re-shows the list when what would be removed has changed', async () => {
    const shown = validation({ removal: { requested: true, productIds: ['p2'], products: [{ productId: 'p2', name: '2. Kjøtt' }] } })
    const moved = validation({ removal: { requested: true, productIds: ['p2', 'p3'], products: [{ productId: 'p2', name: '2. Kjøtt' }, { productId: 'p3', name: '3. Ny rett' }] } })
    const Validate = jest.fn().mockResolvedValueOnce(shown).mockResolvedValue(moved)
    const { wrapper, stub } = build({ service: { Validate } })
    wrapper.vm.adoptAnalysis(analysis)
    await wrapper.vm.previewRemoval()
    wrapper.vm.validation = shown
    wrapper.vm.replaceConfirmation = 'menuImport_replaceWord'

    await wrapper.vm.confirmReplace()

    // A product created between the preview and the confirmation must not be swept up silently.
    expect(stub.Apply).not.toHaveBeenCalled()
    expect(wrapper.vm.validationError).toBe('menuImport_replaceChanged')
    expect(wrapper.vm.removalPreview.productIds).toEqual(['p2', 'p3'])
    wrapper.destroy()
  })
})

describe('columns', () => {
  it('opens compact for a price update and rich for an import that creates products', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis({ ...analysis, rows: [analysis.rows[0]] })
    expect(wrapper.vm.visibleColumns).toEqual(['identity', 'link', 'takeaway', 'eatIn', 'delivery'])

    wrapper.vm.adoptAnalysis(analysis)
    expect(wrapper.vm.visibleColumns).toEqual(expect.arrayContaining(['name', 'category', 'description']))
    wrapper.destroy()
  })

  it('never rearranges a table the operator has arranged themselves', () => {
    const { wrapper } = build()
    wrapper.vm.onColumnToggle({ id: 'soldOut', visible: true })
    const chosen = [...wrapper.vm.visibleColumns]

    wrapper.vm.adoptAnalysis(analysis)

    expect(wrapper.vm.visibleColumns).toEqual(chosen)
    wrapper.destroy()
  })

  it('hands the decision back when the recommended view is asked for again', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.onColumnToggle({ id: 'soldOut', visible: true })
    expect(wrapper.vm.columnChoiceMade).toBe(true)

    wrapper.vm.onColumnPreset('recommended')

    expect(wrapper.vm.columnChoiceMade).toBe(false)
    expect(wrapper.vm.visibleColumns).not.toContain('soldOut')
    wrapper.destroy()
  })

  it('keeps a hidden column\'s edit, because hiding is not undoing', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'otherInformation', 'Nøtter')
    wrapper.vm.onColumnPreset('compact')
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0].rows.find(row => row.rowKey === 'n:1')
    expect(sent.metadata).toEqual({ otherInformation: 'Nøtter' })
    wrapper.destroy()
  })
})

describe('manual rows', () => {
  it('starts a linked manual row from what the product charges today, not from zero', () => {
    const { wrapper } = build()
    wrapper.vm.catalogueOnly = { catalogue, categories }
    wrapper.vm.addManualRow()
    const row = wrapper.vm.rows[0]

    wrapper.vm.linkProduct(row, 'p1')

    expect(wrapper.vm.priceValue(row, 'takeaway')).toBe(240)
    wrapper.destroy()
  })

  it('does not send those prices back as if the menu had asked for them', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.catalogueOnly = { catalogue, categories }
    wrapper.vm.addManualRow()
    wrapper.vm.linkProduct(wrapper.vm.rows[0], 'p1')
    await wrapper.vm.validate()

    expect(stub.Validate.mock.calls.pop()[0].rows[0].sourcePrices).toEqual([])
    wrapper.destroy()
  })

  it('duplicates a row as its own new product rather than a second write to the same one', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.duplicateRow(wrapper.vm.rows[0])

    const copy = wrapper.vm.rows[1]
    expect(copy.action).toBe('Create')
    expect(copy.targetProductId).toBeNull()
    expect(copy.rowKey).not.toBe(wrapper.vm.rows[0].rowKey)
    wrapper.destroy()
  })

  it('takes a removed row out of the draft only, and can put it back', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    const row = wrapper.vm.rows[0]

    wrapper.vm.removeRow(row)
    expect(wrapper.vm.rows).toHaveLength(1)

    wrapper.vm.undoRemove()
    expect(wrapper.vm.rows[0]).toBe(row)
    wrapper.destroy()
  })
})

describe('shared category options', () => {
  it('can be saved on their own, without inventing a product row to hang them on', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.addCategoryVariantGroup()
    wrapper.vm.setCategoryVariantCategory(0, 'c1')
    wrapper.vm.categoryVariants[0].variants = [{ name: 'Tilbehør', options: [{ name: 'Pommes', amount: 0 }] }]

    expect(wrapper.vm.hasSaveableIntent).toBe(true)
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0]
    expect(sent.rows).toEqual([])
    expect(sent.categoryVariants[0]).toMatchObject({ categoryId: 'c1' })
    wrapper.destroy()
  })

  it('leaves a genuinely empty draft unsaveable', () => {
    const { wrapper } = build()
    expect(wrapper.vm.hasSaveableIntent).toBe(false)
    expect(wrapper.vm.canApprove).toBe(false)
    wrapper.destroy()
  })
})

describe('a frozen plan cannot be edited from anywhere', () => {
  const freeze = async () => {
    const failure = Object.assign(new Error('network'), { status: 0 })
    const built = build({ service: { Apply: jest.fn().mockRejectedValue(failure) } })
    built.wrapper.vm.adoptAnalysis(analysis)
    built.wrapper.vm.validation = validation()
    await built.wrapper.vm.approve()
    expect(built.wrapper.vm.isLocked).toBe(true)
    return built
  }

  it('refuses every entry point that would change the draft, not just the table', async () => {
    const { wrapper } = await freeze()
    const before = JSON.stringify(wrapper.vm.rows)
    const row = wrapper.vm.rows[0]

    // Each of these is reachable from a different control, and a disabled attribute is only a
    // hint: a keyboard activation or a stale render must hit the same answer.
    wrapper.vm.addManualRow()
    wrapper.vm.duplicateRow(row)
    wrapper.vm.removeRow(row)
    wrapper.vm.restoreRow(row)
    wrapper.vm.linkProduct(row, 'p2')
    wrapper.vm.setManual(row, 'takeaway', '999')
    wrapper.vm.editMetadata(row, 'description', 'ny tekst')
    wrapper.vm.resetMetadata(row, 'description')
    wrapper.vm.createCategoryFor(row, 'Helt ny kategori')
    wrapper.vm.clearVariantsOf(row)
    wrapper.vm.addCategoryVariantGroup()
    wrapper.vm.acceptDraft(true)
    wrapper.vm.clearDraft()
    wrapper.vm.addFiles([{ name: 'ny.pdf', type: 'application/pdf', size: 1000 }])

    expect(JSON.stringify(wrapper.vm.rows)).toBe(before)
    expect(wrapper.vm.categoryVariants).toHaveLength(0)
    expect(wrapper.vm.newCategories).toHaveLength(1)
    expect(wrapper.vm.files).toHaveLength(0)
    wrapper.destroy()
  })

  it('will not open a tool that exists to change the draft, but will still export it', async () => {
    const { wrapper } = await freeze()

    wrapper.vm.openTool('source')
    wrapper.vm.openTool('categoryVariants')
    wrapper.vm.openTool('clear')
    expect(wrapper.vm.showSource).toBe(false)
    expect(wrapper.vm.showCategoryVariants).toBe(false)
    expect(wrapper.vm.showClear).toBe(false)

    // Reading the draft out as JSON changes nothing.
    wrapper.vm.openTool('draft')
    expect(wrapper.vm.showDraft).toBe(true)
    wrapper.destroy()
  })

  it('will not read a document again while an operation is outstanding', async () => {
    const { wrapper, stub } = await freeze()
    wrapper.vm.pastedText = 'ny meny'

    await wrapper.vm.runAnalysis()

    expect(stub.Analyze).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('keeps each store\'s outstanding operation with that store', async () => {
    const failure = Object.assign(new Error('network'), { status: 0 })
    const storage = makeStorage()
    const { wrapper } = build({ storage, service: { Apply: jest.fn().mockRejectedValue(failure) } })
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()
    await wrapper.vm.approve()
    wrapper.destroy()

    // Another store is not frozen by store 7's outstanding apply …
    const { wrapper: other } = build({ storage, selectedAdminStore: 8 })
    await flush()
    expect(other.vm.outcomeUnknown).toBe(false)
    other.destroy()

    // … and coming back to store 7 picks it up again.
    const { wrapper: back } = build({ storage })
    await flush()
    expect(back.vm.outcomeUnknown).toBe(true)
    expect(back.vm.pendingApplyRequest.operationId).toBe('op-1')
    back.destroy()
  })
})

describe('stale answers from work the operator has left behind', () => {
  it('drops a validate reply that belongs to an older revision of the plan', async () => {
    let release
    const slow = new Promise((resolve) => { release = resolve })
    const Validate = jest.fn()
      .mockReturnValueOnce(slow)
      .mockResolvedValue(validation({ planToken: 'newer' }))
    const { wrapper } = build({ service: { Validate } })
    wrapper.vm.adoptAnalysis(analysis)

    const first = wrapper.vm.validate()
    // An edit lands while the first check is still out, so its answer is about a plan that no
    // longer exists and must not become the one Apply would be given.
    wrapper.vm.setManual(wrapper.vm.rows[0], 'takeaway', '280')
    await wrapper.vm.validate()

    release(validation({ planToken: 'stale' }))
    await first
    await flush()

    expect(wrapper.vm.validation.planToken).toBe('newer')
    wrapper.destroy()
  })

  it('discards an analysis that came back after the store was changed', async () => {
    let release
    const slow = new Promise((resolve) => { release = resolve })
    const { wrapper } = build({ service: { Analyze: jest.fn().mockReturnValue(slow) } })
    wrapper.vm.pastedText = 'meny'

    const running = wrapper.vm.runAnalysis()
    wrapper.vm.onStoreChanged()

    release(analysis)
    await running
    await flush()

    expect(wrapper.vm.rows).toHaveLength(0)
    wrapper.destroy()
  })

  it('ignores an upload progress callback from a run that was abandoned', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'meny.pdf', type: 'application/pdf', size: 1000 }])
    let progress
    wrapper.vm._menuUpdateService.Analyze = jest.fn((_storeId, _payload, options) => {
      progress = options.onUploadProgress
      return Promise.resolve(analysis)
    })

    await wrapper.vm.runAnalysis()
    const percentAfter = wrapper.vm.uploadPercent
    wrapper.vm.requestGeneration++
    progress({ loaded: 10, total: 1000 })

    expect(wrapper.vm.uploadPercent).toBe(percentAfter)
    wrapper.destroy()
  })
})

describe('shared options for a whole category', () => {
  it('brings the category\'s existing groups along, so adding one cannot delete the rest', () => {
    // The API takes a sent list as the whole truth for that category.
    const withGroups = [{ ...categories[0], variants: [{ variantGroupId: 'cg1', name: 'Tilbehør', options: [] }, { variantGroupId: 'cg2', name: 'Saus', options: [] }] }]
    const { wrapper } = build()
    wrapper.vm.catalogueOnly = { catalogue, categories: withGroups }
    wrapper.vm.addCategoryVariantGroup()
    wrapper.vm.setCategoryVariantCategory(0, 'c1')

    expect(wrapper.vm.categoryVariants[0].variants.map(group => group.variantGroupId)).toEqual(['cg1', 'cg2'])
    wrapper.destroy()
  })

  it('merges an import\'s groups into what the category already has', () => {
    const withGroups = [{ ...categories[0], variants: [{ variantGroupId: 'cg1', name: 'Tilbehør', options: [] }] }]
    const { wrapper } = build()
    wrapper.vm.catalogueOnly = { catalogue, categories: withGroups }
    // The analysis calls these `sourceCategoryVariants` and puts the list under `groups`, which
    // is what MenuUpdateAnalysisModel and MenuExtractionCategoryVariants actually return.
    wrapper.vm.adoptAnalysis({
      ...analysis,
      categories: withGroups,
      sourceCategoryVariants: [{ categoryName: 'Pizza', groups: [{ name: 'Ekstra ost', options: [] }] }]
    })

    const names = wrapper.vm.categoryVariants[0].variants.map(group => group.name)
    expect(names).toEqual(['Tilbehør', 'Ekstra ost'])
    wrapper.destroy()
  })

  it('can remove a category\'s last group, which an empty list alone could never say', async () => {
    const withGroups = [{ ...categories[0], variants: [{ variantGroupId: 'cg1', name: 'Tilbehør', options: [] }] }]
    const { wrapper, stub } = build()
    wrapper.vm.catalogueOnly = { catalogue, categories: withGroups }
    wrapper.vm.addCategoryVariantGroup()
    wrapper.vm.setCategoryVariantCategory(0, 'c1')

    wrapper.vm.clearCategoryGroups(0)
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0]
    expect(sent.categoryVariants[0]).toEqual({ categoryId: 'c1', newCategoryKey: null, clearGroups: true })
    wrapper.destroy()
  })

  it('never carries one category\'s group ids into a write aimed at another', async () => {
    // The server checks that a group id belongs to what is being written, and if it did not,
    // this would be editing the category the operator just navigated away from.
    const twoCategories = [
      { ...categories[0], variants: [{ variantGroupId: 'cg1', name: 'Tilbehør', options: [] }] },
      { categoryId: 'c2', name: 'Dessert', suggestedTax: 15, suggestedEatInTax: 25, suggestedDeliveryTax: 15, taxSuggestionAvailable: true, variants: [{ variantGroupId: 'cg2', name: 'Topping', options: [] }] }
    ]
    const { wrapper, stub } = build()
    wrapper.vm.catalogueOnly = { catalogue, categories: twoCategories }
    wrapper.vm.addCategoryVariantGroup()
    wrapper.vm.setCategoryVariantCategory(0, 'c1')
    wrapper.vm.$refs.variantEditor.open = () => Promise.resolve({ name: 'Min egen gruppe', options: [] })
    await wrapper.vm.addCategoryVariant(0)

    wrapper.vm.setCategoryVariantCategory(0, 'c2')
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0].categoryVariants[0]
    expect(sent.categoryId).toBe('c2')
    // Dessert's own group is there; Pizza's is not, by id or by name.
    expect(sent.groups.map(group => group.variantGroupId)).toEqual(['cg2', null])
    expect(sent.groups.map(group => group.name)).toEqual(['Topping', 'Min egen gruppe'])
    wrapper.destroy()
  })

  it('takes back a pending removal as soon as a group is added, never sending both', async () => {
    // The API refuses a request that both replaces and removes, so the two cannot coexist.
    const withGroups = [{ ...categories[0], variants: [{ variantGroupId: 'cg1', name: 'Tilbehør', options: [] }] }]
    const { wrapper, stub } = build()
    wrapper.vm.catalogueOnly = { catalogue, categories: withGroups }
    wrapper.vm.addCategoryVariantGroup()
    wrapper.vm.setCategoryVariantCategory(0, 'c1')
    wrapper.vm.clearCategoryGroups(0)
    expect(wrapper.vm.categoryVariants[0].clearGroups).toBe(true)

    wrapper.vm.$refs.variantEditor.open = () => Promise.resolve({ name: 'Ny gruppe', options: [] })
    await wrapper.vm.addCategoryVariant(0)
    await wrapper.vm.validate()

    expect(wrapper.vm.categoryVariants[0].clearGroups).toBe(false)
    const sent = stub.Validate.mock.calls.pop()[0].categoryVariants[0]
    expect(sent.clearGroups).toBeUndefined()
    expect(sent.groups).toHaveLength(1)
    wrapper.destroy()
  })

  it('treats discarding the entry as saying nothing about the category at all', () => {
    const withGroups = [{ ...categories[0], variants: [{ variantGroupId: 'cg1', name: 'Tilbehør', options: [] }] }]
    const { wrapper } = build()
    wrapper.vm.catalogueOnly = { catalogue, categories: withGroups }
    wrapper.vm.addCategoryVariantGroup()
    wrapper.vm.setCategoryVariantCategory(0, 'c1')

    wrapper.vm.discardCategoryEntry(0)

    // No entry means no instruction, so the category keeps the group it has.
    expect(wrapper.vm.categoryVariants).toHaveLength(0)
    expect(wrapper.vm.hasSaveableIntent).toBe(false)
    wrapper.destroy()
  })

  it('keeps category edits through a re-read after a corrected column mapping', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.addCategoryVariantGroup()
    wrapper.vm.setCategoryVariantCategory(0, 'c1')
    wrapper.vm.categoryVariants[0].variants = [{ name: 'Min egen gruppe', options: [] }]

    wrapper.vm.adoptAnalysis(analysis, { preserveDecisions: true })

    expect(wrapper.vm.categoryVariants[0].variants.map(group => group.name)).toContain('Min egen gruppe')
    wrapper.destroy()
  })
})

describe('duplicating a linked row', () => {
  const duplicate = () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    const row = wrapper.vm.rows[0]
    wrapper.vm.beginVariantEdit(row)
    wrapper.vm.duplicateRow(row)
    return { wrapper, original: row, copy: wrapper.vm.rows[1] }
  }

  it('carries what was on screen into the copy rather than leaving it blank', () => {
    // The copy has no linked product behind it any more, so anything it was reading from that
    // product has to become its own.
    const { wrapper, copy } = duplicate()

    expect(copy.action).toBe('Create')
    expect(copy.metadataEdits.name).toBe('1. Vegetar')
    expect(copy.metadataEdits.description).toBe('Ost og tomat')
    expect(wrapper.vm.priceValue(copy, 'takeaway')).toBe(245)
    wrapper.destroy()
  })

  it('drops every group and option id, which belong to the product it was copied from', () => {
    const { wrapper, copy, original } = duplicate()

    expect(original.variantGroups[0].variantGroupId).toBe('v1')
    expect(copy.variantGroups[0].variantGroupId).toBeNull()
    expect(copy.variantGroups[0].name).toBe('Størrelse')
    wrapper.destroy()
  })
})

describe('a draft left behind by the old import page', () => {
  const withLegacy = (extra = {}) => {
    const storage = makeStorage()
    storage.setItem('importRows', JSON.stringify([
      { categoryName: 'Pizza', name: 'Gammel rad', priceAmount: 12000, tax: 15, tableAdditionalAmount: 2000, tableTax: 25, soldOut: false, depositAmount: 0 }
    ]))
    storage.setItem('importCategoryVariants', JSON.stringify([
      { categoryName: 'Pizza', variants: [{ name: 'Tilbehør', options: [] }] }
    ]))
    return build({ storage, ...extra })
  }

  it('is offered rather than adopted, because those keys record no store', async () => {
    const { wrapper } = withLegacy()
    await flush()

    expect(wrapper.vm.legacyDraft.rows).toHaveLength(1)
    // Nothing has been taken into the work list on its own.
    expect(wrapper.vm.rows).toHaveLength(0)
    wrapper.destroy()
  })

  it('asks where it should land before anything is loaded', async () => {
    const { wrapper } = withLegacy()
    await flush()

    wrapper.vm.offerLegacyDraft()

    expect(wrapper.vm.showDraft).toBe(true)
    expect(wrapper.vm.pendingDraft.rows).toHaveLength(1)
    expect(wrapper.vm.rows).toHaveLength(0)
    wrapper.destroy()
  })

  it('leaves the old keys alone when the offer is declined', async () => {
    const { wrapper, storage } = withLegacy()
    await flush()

    wrapper.vm.dismissLegacyDraft()

    // Declining is not deleting: this may be the only copy of that work.
    expect(storage.contents.importRows).toBeDefined()
    expect(storage.contents.importCategoryVariants).toBeDefined()
    wrapper.destroy()
  })

  it('releases the old keys only once it has been taken into a store', async () => {
    const { wrapper, storage } = withLegacy()
    await flush()
    wrapper.vm.offerLegacyDraft()

    wrapper.vm.acceptDraft(true)

    expect(wrapper.vm.rows).toHaveLength(1)
    expect(storage.contents.importRows).toBeUndefined()
    expect(storage.contents.importCategoryVariants).toBeUndefined()
    wrapper.destroy()
  })

  it('carries the old row\'s prices, taxes and options across', async () => {
    const { wrapper } = withLegacy()
    await flush()
    wrapper.vm.offerLegacyDraft()
    wrapper.vm.acceptDraft(true)

    const row = wrapper.vm.rows[0]
    expect(wrapper.vm.priceValue(row, 'takeaway')).toBe(120)
    // The old eat-in addition becomes an eat-in total, never a third addition.
    expect(wrapper.vm.priceValue(row, 'eatIn')).toBe(140)
    expect(row.metadataEdits.tax).toBe(15)
    expect(row.metadataEdits.eatInTax).toBe(25)
    expect(wrapper.vm.categoryVariants[0].variants[0].name).toBe('Tilbehør')
    wrapper.destroy()
  })
})

describe('what the analysis actually returns', () => {
  // These names are the API's, from MenuUpdateAnalysisModel and MenuUpdateExtractedRowModel.
  // Reading the wrong one loses a whole menu's worth of work without any error.
  const rich = {
    ...analysis,
    sourceCategoryVariants: [{ categoryName: 'Dessert', groups: [{ name: 'Topping', options: [{ name: 'Karamell', amount: 1000 }] }] }],
    rows: [{
      ...analysis.rows[1],
      depositAmount: 300,
      variants: [
        { name: 'Størrelse', required: true, multiSelect: false, options: [{ name: 'Stor', amount: 2000 }] },
        { name: 'Rabatt', options: [{ name: 'Uten krem', amount: 1500, negativeAmount: true }] }
      ]
    }]
  }

  it('reads shared groups from sourceCategoryVariants and their list from groups', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(rich)

    expect(wrapper.vm.categoryVariants).toHaveLength(1)
    expect(wrapper.vm.categoryVariants[0].variants[0].name).toBe('Topping')
    wrapper.destroy()
  })

  it('keeps an extracted row\'s option groups on the product it creates', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(rich)
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0].rows[0]
    expect(sent.newProduct.variants).toHaveLength(2)
    // A discount stays a discount on the way through.
    expect(sent.newProduct.variants[1].options[0]).toMatchObject({ amount: 1500, negativeAmount: true })
    wrapper.destroy()
  })

  it('offers an extracted deposit without writing it to a product nobody asked to change', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis({ ...rich, rows: [{ ...analysis.rows[0], depositAmount: 300 }] })

    const row = wrapper.vm.rows[0]
    expect(row.sourceMeta.depositAmount).toBe(300)
    expect(row.metadataEdits.depositAmount).toBeUndefined()
    wrapper.destroy()
  })
})

describe('what the reading could not use', () => {
  // The API drops an option group whole when it cannot read one of its prices, and says so with
  // a documentNotice. That note is the only record the group ever existed, so if the page does
  // not show it the import looks complete when it is not.
  const omitted = {
    ...analysis,
    warnings: [
      { code: 'documentNotice', message: 'Valggruppen «Tilbehør» ble utelatt: prisen på ett av valgene kunne ikke leses.' }
    ],
    sources: [{
      documentName: 'meny.pdf',
      columns: [],
      pages: [{ pageNumber: 1, rowCount: 2 }],
      warnings: [
        { code: 'documentNotice', message: 'Nr. 19 er trykket som 223 / 325 og kan være en kolonnefeil.' }
      ]
    }]
  }

  it('says an option group was left out, before anything can be approved', async () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(omitted)
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('Valggruppen «Tilbehør» ble utelatt')
    // Visible on the work list itself, not only after saving.
    expect(wrapper.vm.receipt).toBeNull()
    wrapper.destroy()
  })

  it('keeps the document\'s name with the note that came from it', async () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(omitted)
    await wrapper.vm.$nextTick()

    const note = wrapper.vm.sourceNotes.find(item => item.document === 'meny.pdf')
    expect(note.message).toContain('Nr. 19 er trykket som 223 / 325')
    expect(wrapper.text()).toContain('meny.pdf')
    wrapper.destroy()
  })

  it('keeps the reading\'s own wording rather than replacing it with a heading', () => {
    // Three different notices must not collapse into three identical lines.
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(omitted)

    const messages = wrapper.vm.sourceNotes.map(note => note.message)
    expect(new Set(messages).size).toBe(2)
    wrapper.destroy()
  })

  it('counts every note, from the analysis and from each document', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(omitted)

    expect(wrapper.vm.sourceNotes).toHaveLength(2)
    wrapper.destroy()
  })

  it('says nothing at all when the reading dropped nothing', async () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.sourceNotes).toHaveLength(0)
    expect(wrapper.find('.source-notes').exists()).toBe(false)
    wrapper.destroy()
  })

  it('survives a re-read after a corrected column mapping', async () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(omitted)
    wrapper.vm.adoptAnalysis(omitted, { preserveDecisions: true })
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.sourceNotes).toHaveLength(2)
    wrapper.destroy()
  })
})

describe('the receipt', () => {
  it('reports what was written without assuming any list is present', async () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()
    await wrapper.vm.approve()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('menuImport_receiptTitle')
    wrapper.destroy()
  })

  it('renders a receipt that omits every optional list rather than crashing on it', async () => {
    const { wrapper } = build({ service: { Apply: jest.fn().mockResolvedValue({ operationId: 'op-1' }) } })
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()

    await wrapper.vm.approve()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.receiptUpdatedIds).toEqual([])
    expect(wrapper.text()).toContain('menuImport_receiptTitle')
    wrapper.destroy()
  })
})
