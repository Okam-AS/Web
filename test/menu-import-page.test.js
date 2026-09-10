import fs from 'fs'
import path from 'path'
import { mount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import MenuImportPage from '~/pages/admin/import.vue'
import { COLUMN_IDS } from '~/utils/menu-workspace'

const COLUMN_IDS_FOR_TEST = COLUMN_IDS

// The real $i returns the key itself when a translation is missing, and the page relies on that
// to tell a code it has phrased from one it has never heard of. The mock therefore has to know
// which keys actually exist, so it reads them from the Norwegian file — which also means a test
// fails if a key the page asks for was never written.
const TRANSLATED = new Set(
  (fs.readFileSync(path.join(__dirname, '..', 'translations', 'no.ts'), 'utf8')
    .match(/^ {2}[A-Za-z0-9_]+:/gm) || []).map(line => line.trim().replace(':', ''))
)

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

// The shape the API actually returns: previous* is null for a product that did not exist, every
// new* is a plain integer, and 0 is a real price. A fixture with a `channels` array tested a
// shape that never existed, which is how the receipt shipped showing dashes.
const receipt = (overrides = {}) => ({
  operationId: 'op-1',
  storeId: 7,
  replayed: false,
  updatedProductIds: ['p1'],
  createdProductIds: ['p9'],
  metadataUpdatedProductIds: [],
  createdCategoryIds: [],
  removedProductIds: [],
  skippedRowCount: 0,
  unchangedRowCount: 0,
  prices: [
    {
      productId: 'p1',
      productName: '1. Vegetar',
      created: false,
      previousTakeaway: 24000,
      previousEatIn: 26000,
      previousDelivery: 26000,
      newTakeaway: 24500,
      newEatIn: 26000,
      newDelivery: 26000
    },
    {
      productId: 'p9',
      productName: 'Pistasjdessert',
      created: true,
      previousTakeaway: null,
      previousEatIn: null,
      previousDelivery: null,
      newTakeaway: 10900,
      newEatIn: 10900,
      newDelivery: 10900
    }
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
    GetStatus: jest.fn().mockResolvedValue({ applied: false, cancelled: false }),
    Cancel: jest.fn().mockResolvedValue({ operationId: 'op-1', storeId: 7, outcome: 'Cancelled', receipt: null, cancelledAt: '2026-09-10T12:00:00' }),
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
      $i: (key, params) => {
        if (!TRANSLATED.has(key)) { return key }
        return params ? key + ':' + JSON.stringify(params) : 'T:' + key
      },
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

// Saving is a two-step act now: the button opens a confirmation, and only its own button
// applies. Every test that used to call approve() goes through both, so the dialog is on the
// path of every assertion about what does and does not reach the API.
const approveThroughDialog = async (wrapper) => {
  await wrapper.vm.openApproval()
  await wrapper.vm.confirmApproval()
}

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

    await approveThroughDialog(wrapper)

    expect(stub.Apply).toHaveBeenCalledTimes(1)
    expect(stub.Apply.mock.calls[0][0].plan).toBe(ready.normalizedPlan)
    wrapper.destroy()
  })

  it('refuses to apply when the prices move between the dialog and the confirmation', async () => {
    const reviewed = validation()
    const moved = validation()
    moved.rows[0].takeaway.newAmount = 29900
    // The first answer is what the dialog shows; the second is what is true when it is confirmed.
    const Validate = jest.fn().mockResolvedValueOnce(reviewed).mockResolvedValue(moved)
    const { wrapper, stub } = build({ service: { Validate } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()
    await wrapper.vm.confirmApproval()

    expect(stub.Apply).not.toHaveBeenCalled()
    expect(wrapper.vm.confirmStale).toBe(true)
    // The dialog stays open showing the new numbers, so the second confirmation is informed.
    expect(wrapper.vm.showConfirm).toBe(true)
    wrapper.destroy()
  })

  it('refuses when a metadata change appears between the dialog and the confirmation', async () => {
    const reviewed = validation()
    const moved = validation()
    moved.rows[0].metadataChanges = [{ field: 'name', from: '1. Vegetar', to: 'Vegetar deluxe' }]
    const Validate = jest.fn().mockResolvedValueOnce(reviewed).mockResolvedValue(moved)
    const { wrapper, stub } = build({ service: { Validate } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()
    await wrapper.vm.confirmApproval()

    expect(stub.Apply).not.toHaveBeenCalled()
    expect(wrapper.vm.confirmStale).toBe(true)
    wrapper.destroy()
  })

  it('cannot be confirmed until a fresh check has come back', async () => {
    let release
    const slow = new Promise((resolve) => { release = resolve })
    const { wrapper, stub } = build({ service: { Validate: jest.fn().mockReturnValue(slow) } })
    wrapper.vm.adoptAnalysis(analysis)

    const opening = wrapper.vm.openApproval()
    // The dialog is up, but nothing has been checked yet, so there is nothing to agree to.
    expect(wrapper.vm.showConfirm).toBe(true)
    expect(wrapper.vm.canConfirmApply).toBe(false)
    await wrapper.vm.confirmApproval()
    expect(stub.Apply).not.toHaveBeenCalled()

    release(validation())
    await opening
    expect(wrapper.vm.canConfirmApply).toBe(true)
    wrapper.destroy()
  })

  it('applies nothing at all when the confirmation is cancelled', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()
    wrapper.vm.closeApproval()

    expect(stub.Apply).not.toHaveBeenCalled()
    expect(wrapper.vm.showConfirm).toBe(false)
    wrapper.destroy()
  })

  it('says what is about to happen, counted off the validated plan', async () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    await wrapper.vm.openApproval()

    expect(wrapper.vm.confirmSummary).toMatchObject({ create: 1, changed: 1, unchanged: 0 })
    wrapper.destroy()
  })

  it('opens even when the plan is blocked, and explains why in the operator\'s language', async () => {
    const blocked = validation({
      canApply: false,
      blockers: [
        { code: 'unsupportedNegativeSurcharge', rowKey: 'n:1', channel: 'EatIn' },
        { code: 'unsupportedNegativeSurcharge', rowKey: 'n:2', channel: 'EatIn' }
      ]
    })
    const { wrapper, stub } = build({ service: { Validate: jest.fn().mockResolvedValue(blocked) } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()

    expect(wrapper.vm.showConfirm).toBe(true)
    expect(wrapper.vm.canConfirmApply).toBe(false)
    // Grouped: one reason, naming the rows, not the same sentence twice.
    expect(wrapper.vm.confirmErrors).toHaveLength(1)
    expect(wrapper.vm.confirmErrors[0].names).toHaveLength(2)
    // Localised through a key, and it names the channel the server named.
    expect(wrapper.vm.confirmErrors[0].message).toContain('menuImport_error_unsupportedNegativeSurcharge')
    expect(wrapper.vm.confirmErrors[0].message).toContain('menuImport_channelEatIn')
    expect(stub.Apply).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('is not deadlocked by the very questions it exists to answer', async () => {
    // canApply is false until the matches are confirmed, and confirming them is what this
    // dialog does. Requiring canApply to enable its button would disable it for good.
    const unconfirmed = validation({
      canApply: false,
      blockers: [{ code: 'matchNotConfirmed', rowKey: 'n:1' }]
    })
    const ready = validation({ canApply: true })
    const Validate = jest.fn().mockResolvedValueOnce(unconfirmed).mockResolvedValue(ready)
    const { wrapper, stub } = build({ service: { Validate } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()
    expect(wrapper.vm.confirmErrors).toHaveLength(0)
    expect(wrapper.vm.canConfirmApply).toBe(true)

    await wrapper.vm.confirmApproval()

    expect(stub.Apply).toHaveBeenCalledTimes(1)
    expect(Validate.mock.calls.pop()[0].rows[0].matchConfirmed).toBe(true)
    wrapper.destroy()
  })

  it('reads blockers reported on a row as well as on the plan', async () => {
    const rowOnly = validation({ canApply: false, blockers: [] })
    rowOnly.rows[0].blockers = [{ code: 'invalidAmount', rowKey: 'n:1' }]
    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(rowOnly) } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()

    expect(wrapper.vm.confirmErrors).toHaveLength(1)
    expect(wrapper.vm.canConfirmApply).toBe(false)
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
    wrapper.vm.setColumns(COLUMN_IDS_FOR_TEST, true)
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

describe('correcting one column of a reading', () => {
  // A remap re-merges the original documents, so a column left out of the payload goes back to
  // whatever the first pass made of it — and the first pass is exactly what could not tell.
  // Two ambiguous size columns, both resolved to Takeaway by the automatic pass.
  const sized = {
    ...analysis,
    documents: [{ documentName: 'meny.pdf' }],
    sources: [{
      documentName: 'meny.pdf',
      pages: [{ pageNumber: 1, rowCount: 1 }],
      warnings: [],
      columns: [
        { label: 'Small', resolvedKind: 'Size', resolvedChannel: 'Takeaway', unresolved: false, ignored: false },
        { label: 'Large', resolvedKind: 'Size', resolvedChannel: 'Takeaway', unresolved: false, ignored: false }
      ]
    }],
    rows: [
      { rowKey: 'c:1', name: 'Suppe', sizeLabel: 'Small', categoryName: 'Pizza', suggestedAction: 'Create', suggestedProductId: null, candidates: [], warnings: [], sourcePrices: [{ channel: 'Takeaway', amount: 10000 }] },
      { rowKey: 'c:2', name: 'Suppe', sizeLabel: 'Large', categoryName: 'Pizza', suggestedAction: 'Create', suggestedProductId: null, candidates: [], warnings: [], sourcePrices: [{ channel: 'Takeaway', amount: 14000 }] }
    ]
  }

  const editedOne = (wrapper) => {
    const column = sized.sources[0].columns[0]
    wrapper.vm.setColumnChannel('meny.pdf', column, 'EatIn')
  }

  it('sends every column of the reading, not only the one that was touched', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(sized)
    editedOne(wrapper)

    await wrapper.vm.applyColumnMapping()

    const sent = stub.Remap.mock.calls.pop()[1].sourceMappings
    expect(sent).toHaveLength(1)
    expect(sent[0].columns.map(column => column.label)).toEqual(['Small', 'Large'])
    wrapper.destroy()
  })

  it('keeps the untouched column on the channel the reading gave it', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(sized)
    editedOne(wrapper)

    await wrapper.vm.applyColumnMapping()

    const columns = stub.Remap.mock.calls.pop()[1].sourceMappings[0].columns
    expect(columns.find(column => column.label === 'Small').channel).toBe('EatIn')
    // Its automatic resolution was never written down anywhere, and used to be dropped here.
    expect(columns.find(column => column.label === 'Large').channel).toBe('Takeaway')
    // And its kind survives with it, so it stays a size rather than becoming unknown.
    expect(columns.find(column => column.label === 'Large').kind).toBe('Size')
    wrapper.destroy()
  })

  it('keeps both size rows after the remap', async () => {
    const { wrapper } = build({ service: { Remap: jest.fn().mockResolvedValue(sized) } })
    wrapper.vm.adoptAnalysis(sized)
    editedOne(wrapper)

    await wrapper.vm.applyColumnMapping()

    expect(wrapper.vm.rows.map(row => row.sizeLabel)).toEqual(['Small', 'Large'])
    wrapper.destroy()
  })

  it('does not send a document default nobody chose', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(sized)
    editedOne(wrapper)

    await wrapper.vm.applyColumnMapping()

    // A blanket default would override the channels the reading resolved for itself.
    expect(stub.Remap.mock.calls.pop()[1].sourceMappings[0].defaultChannel).toBeNull()
    wrapper.destroy()
  })

  it('sends a document default only when one is actually set', async () => {
    // There is no control for a whole-document default today, so this exercises the state the
    // request builder reads rather than a button. It exists so that adding one later cannot
    // quietly start overriding channels the reading resolved for itself.
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(sized)
    wrapper.vm.mappingFor('meny.pdf').defaultChannel = 'Delivery'

    await wrapper.vm.applyColumnMapping()

    const sent = stub.Remap.mock.calls.pop()[1].sourceMappings[0]
    expect(sent.defaultChannel).toBe('Delivery')
    // The columns still carry their own channels, so the default cannot flatten them.
    expect(sent.columns.find(column => column.label === 'Large').channel).toBe('Takeaway')
    wrapper.destroy()
  })

  it('does not carry a decision into a re-upload of the same file', async () => {
    // The obvious case pruning by document name misses: the file is called the same thing and
    // its columns now mean something else. The old edit would have overridden the new reading.
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(sized)
    editedOne(wrapper)
    expect(wrapper.vm.columnMappingChanged).toBe(true)

    // Same file name, re-read, and this time the reading knows what the columns are.
    const reread = {
      ...sized,
      sources: [{
        ...sized.sources[0],
        columns: [
          { label: 'Small', resolvedKind: 'Channel', resolvedChannel: 'Delivery', unresolved: false, ignored: false },
          { label: 'Large', resolvedKind: 'Channel', resolvedChannel: 'Delivery', unresolved: false, ignored: false }
        ]
      }]
    }
    wrapper.vm.adoptAnalysis(reread)

    expect(wrapper.vm.columnMappingChanged).toBe(false)
    await wrapper.vm.applyColumnMapping()

    const columns = stub.Remap.mock.calls.pop()[1].sourceMappings[0].columns
    expect(columns.find(column => column.label === 'Small').channel).toBe('Delivery')
    expect(columns.find(column => column.label === 'Small').kind).toBe('Channel')
    wrapper.destroy()
  })

  it('drops decisions when a second menu is appended, and keeps them through a remap', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(sized)
    editedOne(wrapper)

    // A remap continues this reading, so the edit is exactly what it is for.
    wrapper.vm.adoptAnalysis(sized, { preserveDecisions: true })
    expect(wrapper.vm.columnMappingChanged).toBe(true)

    // Appending is a different menu, and its columns are not this one's.
    wrapper.vm.adoptAnalysis(sized, { append: true })
    expect(wrapper.vm.columnMappingChanged).toBe(false)
    wrapper.destroy()
  })

  it('leaves the draft and its decisions alone when a reading fails', async () => {
    const { wrapper } = build({ service: { Analyze: jest.fn().mockRejectedValue(new Error('nope')) } })
    wrapper.vm.adoptAnalysis(sized)
    editedOne(wrapper)
    const rowsBefore = wrapper.vm.rows.length

    wrapper.vm.pastedText = 'en ny meny'
    await wrapper.vm.runAnalysis()

    // Nothing came back, so nothing is replaced.
    expect(wrapper.vm.analysisError).toBe('nope')
    expect(wrapper.vm.rows).toHaveLength(rowsBefore)
    expect(wrapper.vm.columnMappingChanged).toBe(true)
    wrapper.destroy()
  })

  it('does not carry another menu\'s columns into a new reading', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(sized)
    editedOne(wrapper)

    // A different document entirely.
    wrapper.vm.adoptAnalysis({ ...analysis, documents: [{ documentName: 'annen.pdf' }], sources: [{ documentName: 'annen.pdf', columns: [{ label: 'Pris', resolvedKind: 'Channel', resolvedChannel: 'Takeaway' }], pages: [], warnings: [] }] })
    wrapper.vm.setColumnChannel('annen.pdf', { label: 'Pris' }, 'Delivery')
    await wrapper.vm.applyColumnMapping()

    const sent = stub.Remap.mock.calls.pop()[1].sourceMappings
    expect(sent.map(mapping => mapping.documentName)).toEqual(['annen.pdf'])
    wrapper.destroy()
  })
})

describe('correcting a column after other work', () => {
  // A remap re-reads one particular set of documents. Everything else in the list — a dish
  // typed by hand, a second menu added through "append" — has nothing to do with the columns
  // being corrected, and used to vanish when they were.
  const sourceB = {
    ...analysis,
    documents: [{ documentName: 'b.pdf' }],
    rows: [{ ...analysis.rows[0], rowKey: 'b:1', name: 'Fra meny B', suggestedProductId: 'p2' }]
  }
  const remappedB = {
    ...sourceB,
    rows: [{ ...sourceB.rows[0], name: 'Fra meny B, rettet' }]
  }

  const buildMixedDraft = () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.catalogueOnly = { catalogue, categories }
    wrapper.vm.addManualRow()
    const manual = wrapper.vm.rows[wrapper.vm.rows.length - 1]
    wrapper.vm.editMetadata(manual, 'name', 'Håndskrevet rett')
    wrapper.vm.adoptAnalysis(sourceB, { append: true })
    return { wrapper, stub, manualKey: manual.rowKey }
  }

  it('keeps the manual row and the earlier source when a later one is re-read', () => {
    const { wrapper, manualKey } = buildMixedDraft()
    expect(wrapper.vm.rows).toHaveLength(4)

    wrapper.vm.adoptAnalysis(remappedB, { preserveDecisions: true })

    expect(wrapper.vm.rows).toHaveLength(4)
    const manual = wrapper.vm.rows.find(row => row.rowKey === manualKey)
    expect(manual).toBeTruthy()
    // Its own edits survive too, not just the row.
    expect(manual.metadataEdits.name).toBe('Håndskrevet rett')
    // Source A is untouched.
    expect(wrapper.vm.rows.some(row => row.rowKey === 'n:1')).toBe(true)
    expect(wrapper.vm.rows.some(row => row.rowKey === 'n:2')).toBe(true)
    wrapper.destroy()
  })

  it('replaces only the re-read rows, with the corrected reading', () => {
    const { wrapper } = buildMixedDraft()

    wrapper.vm.adoptAnalysis(remappedB, { preserveDecisions: true })

    const fromB = wrapper.vm.rows.filter(row => row.displayName && row.displayName.startsWith('Fra meny B'))
    expect(fromB).toHaveLength(1)
    expect(fromB[0].displayName).toBe('Fra meny B, rettet')
    wrapper.destroy()
  })

  it('leaves the re-read rows where they were rather than moving them to the end', () => {
    const { wrapper } = buildMixedDraft()
    const before = wrapper.vm.rows.findIndex(row => row.analysisId === wrapper.vm.analysis.localAnalysisId)

    wrapper.vm.adoptAnalysis(remappedB, { preserveDecisions: true })

    expect(wrapper.vm.rows.findIndex(row => row.displayName === 'Fra meny B, rettet')).toBe(before)
    wrapper.destroy()
  })

  it('carries decisions from the re-read source only', () => {
    const { wrapper } = buildMixedDraft()
    const bRow = wrapper.vm.rows.find(row => row.rowKey === 'b:1')
    wrapper.vm.setManual(bRow, 'takeaway', '333')

    wrapper.vm.adoptAnalysis(remappedB, { preserveDecisions: true })

    const carried = wrapper.vm.rows.find(row => row.rowKey === 'b:1')
    expect(wrapper.vm.priceValue(carried, 'takeaway')).toBe(333)
    wrapper.destroy()
  })

  it('survives a reload before the second source is added', async () => {
    // A counter restarts at zero on reload, so a restored reading and a later one would share
    // an id — and remapping the later one would delete the restored rows.
    const storage = makeStorage()
    const first = build({ storage })
    first.wrapper.vm.adoptAnalysis(analysis)
    first.wrapper.vm.saveDraft()
    first.wrapper.destroy()

    const { wrapper } = build({ storage })
    await flush()
    expect(wrapper.vm.rows).toHaveLength(2)

    wrapper.vm.adoptAnalysis(sourceB, { append: true })
    expect(wrapper.vm.rows).toHaveLength(3)

    wrapper.vm.adoptAnalysis(remappedB, { preserveDecisions: true })

    // The restored reading is still here; only B was re-read.
    expect(wrapper.vm.rows).toHaveLength(3)
    expect(wrapper.vm.rows.some(row => row.rowKey === 'n:1')).toBe(true)
    expect(wrapper.vm.rows.some(row => row.rowKey === 'n:2')).toBe(true)
    wrapper.destroy()
  })

  it('keeps decisions made on a row whose key was changed by appending', () => {
    // Appending rekeys a colliding row, so the fresh reading's key and the stored one differ.
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.adoptAnalysis({ ...sourceB, rows: [{ ...sourceB.rows[0], rowKey: 'n:1' }] }, { append: true })

    const appended = wrapper.vm.rows[2]
    expect(appended.rowKey).not.toBe('n:1')
    wrapper.vm.setManual(appended, 'takeaway', '444')
    wrapper.vm.editMetadata(appended, 'description', 'min tekst')
    wrapper.vm.linkProduct(appended, 'p2')

    wrapper.vm.adoptAnalysis({ ...remappedB, rows: [{ ...remappedB.rows[0], rowKey: 'n:1' }] }, { preserveDecisions: true })

    const after = wrapper.vm.rows.find(row => row.analysisId === wrapper.vm.analysis.localAnalysisId)
    expect(wrapper.vm.priceValue(after, 'takeaway')).toBe(444)
    expect(after.metadataEdits.description).toBe('min tekst')
    expect(after.targetProductId).toBe('p2')
    wrapper.destroy()
  })

  it('treats a duplicated source row as the operator\'s own', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.duplicateRow(wrapper.vm.rows[0])
    const copy = wrapper.vm.rows[1]
    expect(copy.analysisId).toBeNull()

    wrapper.vm.adoptAnalysis(analysis, { preserveDecisions: true })

    // Re-reading the source it was copied from must not delete a row made by hand.
    expect(wrapper.vm.rows.some(row => row.rowKey === copy.rowKey)).toBe(true)
    wrapper.destroy()
  })

  it('does not let a re-read row take a surviving row\'s key', () => {
    const { wrapper } = buildMixedDraft()

    wrapper.vm.adoptAnalysis({ ...remappedB, rows: [{ ...remappedB.rows[0], rowKey: 'n:1' }] }, { preserveDecisions: true })

    const keys = wrapper.vm.rows.map(row => row.rowKey)
    expect(new Set(keys).size).toBe(keys.length)
    wrapper.destroy()
  })
})

describe('when the instructions say to touch existing products only', () => {
  it('keeps a Skip the reading asked for instead of turning it into a new product', () => {
    // The API returns unmatched rows as Skip and says why. Deriving the action from the link
    // alone turned exactly those into creations — the one thing it had been told not to do.
    const updateExistingOnly = {
      ...analysis,
      operatorPreferences: { updateExistingOnly: true },
      rows: [
        { ...analysis.rows[0], suggestedAction: 'Update', suggestedProductId: 'p1' },
        {
          ...analysis.rows[1],
          suggestedAction: 'Skip',
          suggestedProductId: null,
          suggestedReason: 'Instruksjonene ber om bare eksisterende produkter.',
          warnings: [{ code: 'documentNotice', message: 'Hoppet over: finnes ikke fra før.' }]
        }
      ]
    }

    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(updateExistingOnly)

    expect(wrapper.vm.rows.map(row => row.action)).toEqual(['Update', 'Skip'])
    // Nothing is being created, so nothing is proposed for creation either.
    expect(wrapper.vm.rows[1].newProduct).toBeNull()
    expect(wrapper.vm.countBy('Create')).toBe(0)
    wrapper.destroy()
  })

  it('still lets the operator overrule that row', () => {
    const skipped = {
      ...analysis,
      rows: [analysis.rows[0], { ...analysis.rows[1], suggestedAction: 'Skip', suggestedProductId: null }]
    }
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(skipped)

    wrapper.vm.restoreRow(wrapper.vm.rows[1])

    expect(wrapper.vm.rows[1].action).toBe('Create')
    expect(wrapper.vm.rows[1].newProduct).toBeTruthy()
    wrapper.destroy()
  })

  it('still defaults an unmatched row to Create when nothing said otherwise', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(analysis)

    expect(wrapper.vm.rows.map(row => row.action)).toEqual(['Update', 'Create'])
    wrapper.destroy()
  })
})

describe('an apply whose result was never seen', () => {
  it('freezes the plan and offers only status or the same operation again', async () => {
    const failure = Object.assign(new Error('network'), { status: 0 })
    const { wrapper, stub } = build({ service: { Apply: jest.fn().mockRejectedValue(failure) } })
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()

    await approveThroughDialog(wrapper)

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
    await approveThroughDialog(wrapper)
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

    await approveThroughDialog(wrapper)
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
    await approveThroughDialog(wrapper)

    await wrapper.vm.checkStatus()

    // "Not applied" is not a verdict: the ledger row only exists once the transaction commits.
    expect(wrapper.vm.outcomeUnknown).toBe(true)
    expect(wrapper.vm.applyError).toBe('T:menuImport_statusNotApplied')
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
    await approveThroughDialog(wrapper)

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

    await approveThroughDialog(wrapper)

    expect(wrapper.vm.outcomeUnknown).toBe(false)
    expect(storage.contents['menuImport.pending.u1.7']).toBeUndefined()
    wrapper.destroy()
  })
})

describe('a metadata-only edit is saved like any other', () => {
  // Vue 2 observes the properties an object had when it became reactive and nothing after.
  // Adding a key to an empty metadataEdits — the state every row starts in — changed the draft
  // without the row watcher noticing, so the autosave never ran and the edit was gone on reload.
  const linkedDraft = async (storage) => {
    const built = build({ storage })
    built.wrapper.vm.adoptAnalysis(analysis)
    await flush()
    return built
  }

  it('schedules the autosave when only a metadata field changes', async () => {
    const { wrapper } = await linkedDraft(makeStorage())
    const scheduled = jest.spyOn(wrapper.vm, 'scheduleAutosave')

    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'description', 'ny beskrivelse')
    await wrapper.vm.$nextTick()

    expect(scheduled).toHaveBeenCalled()
    wrapper.destroy()
  })

  it('schedules it again when the edit is taken back', async () => {
    const { wrapper } = await linkedDraft(makeStorage())
    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'description', 'ny beskrivelse')
    await wrapper.vm.$nextTick()
    const scheduled = jest.spyOn(wrapper.vm, 'scheduleAutosave')

    wrapper.vm.resetMetadata(wrapper.vm.rows[0], 'description')
    await wrapper.vm.$nextTick()

    // Otherwise the older write intent stays in storage and comes back on reload.
    expect(scheduled).toHaveBeenCalled()
    wrapper.destroy()
  })

  it('survives a reload with nothing but that edit', async () => {
    const storage = makeStorage()
    const { wrapper } = await linkedDraft(storage)
    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'description', 'overlever omstart')
    await wrapper.vm.$nextTick()
    wrapper.vm.saveDraft()
    wrapper.destroy()

    const reopened = build({ storage })
    await flush()

    const restored = reopened.wrapper.vm.rows.find(row => row.rowKey === 'n:1')
    expect(restored.metadataEdits.description).toBe('overlever omstart')
    reopened.wrapper.destroy()
  })

  it('replaces the edits object rather than mutating it, so watchers can see it', async () => {
    const { wrapper } = await linkedDraft(makeStorage())
    const row = wrapper.vm.rows[0]
    const before = row.metadataEdits

    wrapper.vm.editMetadata(row, 'otherInformation', 'Nøtter')

    expect(row.metadataEdits).not.toBe(before)
    expect(row.metadataEdits.otherInformation).toBe('Nøtter')
    wrapper.destroy()
  })
})

describe('a category the operator chose', () => {
  const newDish = {
    ...analysis,
    rows: [{ ...analysis.rows[1], rowKey: 'n:9', categoryName: 'Pizza', suggestedAction: 'Create', suggestedProductId: null }]
  }
  const twoCategories = [
    categories[0],
    { categoryId: 'c2', name: 'Burger', suggestedTax: 15, suggestedEatInTax: 25, suggestedDeliveryTax: 15, taxSuggestionAvailable: true }
  ]

  it('is not overwritten when a column is corrected', () => {
    // The menu still says Pizza however many times somebody has moved the dish to Burger.
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis({ ...newDish, categories: twoCategories })
    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'categoryId', 'c2')
    expect(wrapper.vm.rows[0].metadataEdits.categoryId).toBe('c2')

    wrapper.vm.adoptAnalysis({ ...newDish, categories: twoCategories }, { preserveDecisions: true })

    expect(wrapper.vm.rows[0].metadataEdits.categoryId).toBe('c2')
    wrapper.destroy()
  })

  it('keeps the product set up for the category actually chosen', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis({ ...newDish, categories: twoCategories })
    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'categoryId', 'c2')

    wrapper.vm.adoptAnalysis({ ...newDish, categories: twoCategories }, { preserveDecisions: true })

    expect(wrapper.vm.rows[0].newProduct.categoryId).toBe('c2')
    wrapper.destroy()
  })

  it('keeps a category still waiting to be created, and keeps declaring it', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(newDish)
    wrapper.vm.createCategoryFor(wrapper.vm.rows[0], 'Helt ny kategori')
    const key = wrapper.vm.rows[0].metadataEdits.newCategoryKey
    expect(key).toBeTruthy()

    wrapper.vm.adoptAnalysis(newDish, { preserveDecisions: true })

    expect(wrapper.vm.rows[0].metadataEdits.newCategoryKey).toBe(key)
    // A row pointing at a category the request no longer declares is refused by the server.
    expect(wrapper.vm.newCategories.some(category => category.key === key)).toBe(true)
    wrapper.destroy()
  })

  it('does not let a proposal steal the key a chosen row already means', () => {
    // The collision: a carried row means newcat-1, a fresh proposal is handed newcat-1 for a
    // different section, and the carried declaration is then skipped because "the key exists".
    // The chosen row silently ends up in the proposed category.
    const mixed = {
      ...analysis,
      rows: [
        { ...analysis.rows[1], rowKey: 'm:1', name: 'Valgt rett', categoryName: 'Pizza', suggestedAction: 'Create', suggestedProductId: null },
        { ...analysis.rows[1], rowKey: 'm:2', name: 'Uavklart rett', categoryName: 'Snacks', suggestedAction: 'Create', suggestedProductId: null }
      ]
    }

    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(mixed)
    // The operator declares a brand new category for the first row only.
    wrapper.vm.createCategoryFor(wrapper.vm.rows[0], 'Burger')
    const burgerKey = wrapper.vm.rows[0].metadataEdits.newCategoryKey

    wrapper.vm.adoptAnalysis(mixed, { preserveDecisions: true })

    const chosen = wrapper.vm.rows.find(row => row.rowKey === 'm:1')
    const inferred = wrapper.vm.rows.find(row => row.rowKey === 'm:2')

    // The chosen row still means Burger, and Burger is still declared under that key.
    expect(chosen.metadataEdits.newCategoryKey).toBe(burgerKey)
    const burger = wrapper.vm.newCategories.find(category => category.key === burgerKey)
    expect(burger.name).toBe('Burger')

    // The inferred one got a key of its own, not Burger's.
    expect(inferred.metadataEdits.newCategoryKey).not.toBe(burgerKey)
    expect(wrapper.vm.newCategories.find(category => category.key === inferred.metadataEdits.newCategoryKey).name).toBe('Snacks')

    // And no key means two things.
    const keys = wrapper.vm.newCategories.map(category => category.key)
    expect(new Set(keys).size).toBe(keys.length)
    wrapper.destroy()
  })

  it('keeps a pending category shared with an option group pointing at one key', () => {
    const withGroup = {
      ...analysis,
      rows: [{ ...analysis.rows[1], rowKey: 'm:1', categoryName: 'Snacks', suggestedAction: 'Create', suggestedProductId: null }],
      sourceCategoryVariants: [{ categoryName: 'Snacks', groups: [{ name: 'Tilbehør', options: [{ name: 'Dip', amount: 500 }] }] }]
    }

    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(withGroup)
    wrapper.vm.createCategoryFor(wrapper.vm.rows[0], 'Burger')

    wrapper.vm.adoptAnalysis(withGroup, { preserveDecisions: true })

    const groupKey = wrapper.vm.categoryVariants[0].newCategoryKey
    const rowKey = wrapper.vm.rows[0].metadataEdits.newCategoryKey
    // The group's category and the row's chosen category are different things, under different
    // keys, and both are declared.
    expect(groupKey).not.toBe(rowKey)
    expect(wrapper.vm.newCategories.find(category => category.key === groupKey).name).toBe('Snacks')
    expect(wrapper.vm.newCategories.find(category => category.key === rowKey).name).toBe('Burger')
    wrapper.destroy()
  })

  it('sends every referenced pending category, and no key twice', async () => {
    const mixed = {
      ...analysis,
      rows: [
        { ...analysis.rows[1], rowKey: 'm:1', categoryName: 'Pizza', suggestedAction: 'Create', suggestedProductId: null },
        { ...analysis.rows[1], rowKey: 'm:2', categoryName: 'Snacks', suggestedAction: 'Create', suggestedProductId: null }
      ]
    }
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(mixed)
    wrapper.vm.createCategoryFor(wrapper.vm.rows[0], 'Burger')
    wrapper.vm.adoptAnalysis(mixed, { preserveDecisions: true })
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0]
    const declaredKeys = sent.newCategories.map(category => category.key)
    expect(new Set(declaredKeys).size).toBe(declaredKeys.length)
    // Every key a row points at is actually declared; the server refuses one that is not.
    sent.rows.forEach((row) => {
      const key = row.newProduct && row.newProduct.newCategoryKey
      if (key) { expect(declaredKeys).toContain(key) }
    })
    wrapper.destroy()
  })

  it('still proposes one for a row nobody has decided about', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(newDish)

    // The source names a category the store already has, so the row is pointed at it — and the
    // row is still marked as undecided, so a later reading may propose again.
    expect(wrapper.vm.rows[0].categoryChosen).toBe(false)
    expect(wrapper.vm.rows[0].metadataEdits.categoryId).toBe('c1')
    wrapper.destroy()
  })

  it('declares one the store does not have yet', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis({ ...newDish, rows: [{ ...newDish.rows[0], categoryName: 'Ukjent seksjon' }] })

    expect(wrapper.vm.newCategories.map(category => category.name)).toEqual(['Ukjent seksjon'])
    wrapper.destroy()
  })
})

describe('two sizes of one numbered dish', () => {
  const sized = {
    ...analysis,
    rows: [
      { rowKey: 's:1', menuNumber: '1', name: 'Margherita', sizeLabel: 'Medium', categoryName: 'Pizza', suggestedAction: 'Create', suggestedProductId: null, candidates: [], warnings: [], sourcePrices: [{ channel: 'Takeaway', amount: 16900 }] },
      { rowKey: 's:2', menuNumber: '1', name: 'Margherita', sizeLabel: 'Stor', categoryName: 'Pizza', suggestedAction: 'Create', suggestedProductId: null, candidates: [], warnings: [], sourcePrices: [{ channel: 'Takeaway', amount: 21900 }] }
    ]
  }

  it('creates two products a customer can tell apart', async () => {
    // The size is review data, not something the product carries separately, so it has to be in
    // the name or it is lost the moment the draft is saved.
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(sized)
    await wrapper.vm.validate()

    const names = stub.Validate.mock.calls.pop()[0].rows.map(row => row.newProduct.name)
    expect(names).toEqual(['1. Margherita Medium', '1. Margherita Stor'])
    wrapper.destroy()
  })

  it('shows for approval exactly the name it will store', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(sized)

    expect(wrapper.vm.rows.map(row => wrapper.vm.metadataValue(row, 'name')))
      .toEqual(['1. Margherita Medium', '1. Margherita Stor'])
    wrapper.destroy()
  })

  it('lets a typed name win outright', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(sized)
    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'name', 'Margherita liten')
    await wrapper.vm.validate()

    const names = stub.Validate.mock.calls.pop()[0].rows.map(row => row.newProduct.name)
    expect(names).toEqual(['Margherita liten', '1. Margherita Stor'])
    wrapper.destroy()
  })

  it('does not rename a product it merely matched', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    await wrapper.vm.validate()

    const updated = stub.Validate.mock.calls.pop()[0].rows.find(row => row.rowKey === 'n:1')
    expect(updated.metadata).toBeUndefined()
    wrapper.destroy()
  })
})

describe('warnings the plan is waiting to have accepted', () => {
  // The API promotes every unaccepted requiresAcceptance warning into a blocker, so an ordinary
  // large price rise arrives looking like a validation failure. Treating it as one disabled the
  // only button that could accept it, and correct menu updates could not be saved at all.
  const promoted = (code, overrides = {}) => validation({
    canApply: false,
    blockers: [{ code, rowKey: 'n:1', requiresAcceptance: true, accepted: false }],
    warnings: [{ code, rowKey: 'n:1', requiresAcceptance: true, accepted: false, message: 'Fra serveren' }],
    ...overrides
  })

  it('lets the operator confirm a large price change instead of dead-ending', async () => {
    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(promoted('largePriceChange')) } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()

    expect(wrapper.vm.confirmErrors).toHaveLength(0)
    expect(wrapper.vm.canConfirmApply).toBe(true)
    wrapper.destroy()
  })

  it('does the same for a surcharge the change switches on', async () => {
    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(promoted('enablesEatInSurcharge')) } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()

    expect(wrapper.vm.canConfirmApply).toBe(true)
    wrapper.destroy()
  })

  it('shows what confirming will accept, in the operator\'s language', async () => {
    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(promoted('largePriceChange')) } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.confirmAcceptances).toHaveLength(1)
    expect(wrapper.vm.confirmAcceptances[0].message).toBe('T:menuImport_warning_largePriceChange')
    const text = wrapper.text()
    expect(text).toContain('menuImport_confirmAcceptTitle')
    expect(text).toContain('menuImport_warning_largePriceChange')
    wrapper.destroy()
  })

  it('records the acceptance and revalidates before applying', async () => {
    const ready = validation({ canApply: true })
    const Validate = jest.fn().mockResolvedValueOnce(promoted('largePriceChange')).mockResolvedValue(ready)
    const { wrapper, stub } = build({ service: { Validate } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()
    await wrapper.vm.confirmApproval()

    // The code reaches the row, and the server is asked again with it before anything is written.
    const sent = Validate.mock.calls.pop()[0].rows.find(row => row.rowKey === 'n:1')
    expect(sent.acceptedWarnings).toContain('largePriceChange')
    expect(stub.Apply).toHaveBeenCalledTimes(1)
    wrapper.destroy()
  })

  it('accepts a warning reported for the plan rather than for one row', async () => {
    // A plan-wide warning carries a row key and has no row-level twin, and nothing could ever
    // accept those.
    const planWide = validation({
      canApply: false,
      blockers: [{ code: 'sizeAssumed', rowKey: 'n:2', requiresAcceptance: true, accepted: false }]
    })
    const ready = validation({ canApply: true })
    const Validate = jest.fn().mockResolvedValueOnce(planWide).mockResolvedValue(ready)
    const { wrapper } = build({ service: { Validate } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()
    await wrapper.vm.confirmApproval()

    const sent = Validate.mock.calls.pop()[0].rows.find(row => row.rowKey === 'n:2')
    expect(sent.acceptedWarnings).toContain('sizeAssumed')
    wrapper.destroy()
  })

  it('phrases a refused product detail rather than showing the server\'s English', async () => {
    // The API refuses a blank product name as invalidMetadata. Without a phrase of our own the
    // operator was shown a sentence written for whoever reads a log.
    const refused = validation({
      canApply: false,
      blockers: [{ code: 'invalidMetadata', rowKey: 'n:1', message: 'Name must not be empty.' }]
    })
    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(refused) } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()

    expect(wrapper.vm.confirmErrors).toHaveLength(1)
    expect(wrapper.vm.confirmErrors[0].message).toBe('T:menuImport_error_invalidMetadata')
    expect(wrapper.vm.confirmErrors[0].message).not.toContain('Name must not be empty')

    // The same code covers a name that is too long, so the phrase must fit that too rather
    // than claiming the field is empty.
    const tooLong = validation({
      canApply: false,
      blockers: [{ code: 'invalidMetadata', rowKey: 'n:1', message: 'A product name can be at most 150 characters.' }]
    })
    wrapper.vm.validation = tooLong
    expect(wrapper.vm.confirmErrors[0].message).toBe('T:menuImport_error_invalidMetadata')
    expect(wrapper.vm.canConfirmApply).toBe(false)
    wrapper.destroy()
  })

  it('still refuses a hard blocker that carries no acceptance flag', async () => {
    // The distinction is the server's own word, not the name of the code.
    const hard = validation({
      canApply: false,
      blockers: [{ code: 'unsupportedNegativeSurcharge', rowKey: 'n:1', channel: 'EatIn' }]
    })
    const { wrapper, stub } = build({ service: { Validate: jest.fn().mockResolvedValue(hard) } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()
    await wrapper.vm.confirmApproval()

    expect(wrapper.vm.canConfirmApply).toBe(false)
    expect(wrapper.vm.confirmErrors).toHaveLength(1)
    expect(stub.Apply).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('refuses a hard blocker even when an acceptable one is present too', async () => {
    const mixed = validation({
      canApply: false,
      blockers: [
        { code: 'largePriceChange', rowKey: 'n:1', requiresAcceptance: true, accepted: false },
        { code: 'invalidAmount', rowKey: 'n:2' }
      ]
    })
    const { wrapper, stub } = build({ service: { Validate: jest.fn().mockResolvedValue(mixed) } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()

    expect(wrapper.vm.confirmErrors).toHaveLength(1)
    expect(wrapper.vm.canConfirmApply).toBe(false)
    expect(stub.Apply).not.toHaveBeenCalled()
    wrapper.destroy()
  })
})

describe('somebody else editing while the confirmation is open', () => {
  // Enumerating product rows alone gave every category-only plan the same signature — an empty
  // list — so a shared option's price changing under the dialog compared equal to no change.
  const categoryOnly = (overrides = {}) => validation({
    canApply: true,
    rows: [],
    summary: { updateCount: 0, createCount: 0 },
    plannedCategories: [],
    ...overrides
  })

  const withCategoryWork = (wrapper) => {
    wrapper.vm.addCategoryVariantGroup()
    wrapper.vm.setCategoryVariantCategory(0, 'c1')
    wrapper.vm.categoryVariants[0].variants = [{ name: 'Tilbehør', options: [{ name: 'Pommes', amount: 900 }] }]
  }

  it('refuses to apply when the state the plan was built on has moved', async () => {
    const reviewed = categoryOnly({ reviewFingerprint: 'catalogue-v1' })
    const moved = categoryOnly({ reviewFingerprint: 'catalogue-v2' })
    const Validate = jest.fn().mockResolvedValueOnce(reviewed).mockResolvedValue(moved)
    const { wrapper, stub } = build({ service: { Validate } })
    withCategoryWork(wrapper)

    await wrapper.vm.openApproval()
    await wrapper.vm.confirmApproval()

    expect(stub.Apply).not.toHaveBeenCalled()
    expect(wrapper.vm.confirmStale).toBe(true)
    wrapper.destroy()
  })

  it('fetches the current choices again before inviting a second look', async () => {
    const Validate = jest.fn()
      .mockResolvedValueOnce(categoryOnly({ reviewFingerprint: 'catalogue-v1' }))
      .mockResolvedValue(categoryOnly({ reviewFingerprint: 'catalogue-v2' }))
    const { wrapper, stub } = build({ service: { Validate } })
    withCategoryWork(wrapper)
    stub.Catalogue.mockClear()

    await wrapper.vm.openApproval()
    await wrapper.vm.confirmApproval()

    // Otherwise the screen behind the dialog still shows the values that were just rejected.
    expect(stub.Catalogue).toHaveBeenCalled()
    wrapper.destroy()
  })

  it('notices a category being created that was not there when it was read', async () => {
    const Validate = jest.fn()
      .mockResolvedValueOnce(categoryOnly({ plannedCategories: [] }))
      .mockResolvedValue(categoryOnly({ plannedCategories: [{ key: 'newcat-1', name: 'Ny' }] }))
    const { wrapper, stub } = build({ service: { Validate } })
    withCategoryWork(wrapper)

    await wrapper.vm.openApproval()
    await wrapper.vm.confirmApproval()

    expect(stub.Apply).not.toHaveBeenCalled()
    expect(wrapper.vm.confirmStale).toBe(true)
    wrapper.destroy()
  })

  it('notices a product option edit that leaves the group count unchanged', async () => {
    // The count is the same on both sides; only the contents moved.
    const reviewed = validation({ canApply: true })
    reviewed.rows[0].metadataChanges = [{ field: 'variants', from: '1 gruppe', to: '1 gruppe' }]
    const moved = validation({ canApply: true })
    moved.rows[0].metadataChanges = [{ field: 'variants', from: '1 gruppe (900)', to: '1 gruppe (1200)' }]
    const Validate = jest.fn().mockResolvedValueOnce(reviewed).mockResolvedValue(moved)
    const { wrapper, stub } = build({ service: { Validate } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()
    await wrapper.vm.confirmApproval()

    expect(stub.Apply).not.toHaveBeenCalled()
    expect(wrapper.vm.confirmStale).toBe(true)
    wrapper.destroy()
  })

  it('compares the review fingerprint the API supplies, not the catalogue hash', async () => {
    // The two differ on purpose: the catalogue hash covers ids minted for products being
    // created, so comparing it would call every ordinary creation stale.
    const ready = validation({ canApply: true, reviewFingerprint: 'inputs-v1' })
    const { wrapper, stub } = build({ service: { Validate: jest.fn().mockResolvedValue(ready) } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()
    expect(wrapper.vm.confirmSignature).toContain('inputs-v1')

    await wrapper.vm.confirmApproval()
    expect(stub.Apply).toHaveBeenCalledTimes(1)
    wrapper.destroy()
  })

  it('does not cry stale over an ordinary creation approval', async () => {
    // Newly allocated ids differ between two validations of the same plan, which is why the
    // full catalogue hash is not what this compares.
    const ready = validation({ canApply: true, catalogueHash: 'hash-1', plannedCategories: [{ key: 'newcat-1', name: 'Ny' }] })
    const again = validation({ canApply: true, catalogueHash: 'hash-2-different-ids', plannedCategories: [{ key: 'newcat-1', name: 'Ny' }] })
    const Validate = jest.fn().mockResolvedValueOnce(ready).mockResolvedValue(again)
    const { wrapper, stub } = build({ service: { Validate } })
    wrapper.vm.adoptAnalysis(analysis)

    await wrapper.vm.openApproval()
    await wrapper.vm.confirmApproval()

    expect(wrapper.vm.confirmStale).toBe(false)
    expect(stub.Apply).toHaveBeenCalledTimes(1)
    wrapper.destroy()
  })

  it('applies normally when a category-only plan really has not moved', async () => {
    const steady = categoryOnly({ reviewFingerprint: 'catalogue-v1' })
    const { wrapper, stub } = build({ service: { Validate: jest.fn().mockResolvedValue(steady) } })
    withCategoryWork(wrapper)

    await wrapper.vm.openApproval()
    await wrapper.vm.confirmApproval()

    expect(stub.Apply).toHaveBeenCalledTimes(1)
    wrapper.destroy()
  })
})

describe('when the browser cannot record the save', () => {
  // An operation whose id was never written down cannot be asked about and cannot be settled.
  // A lost response would leave products that may already exist, a draft that still wants to
  // create them, and no way to tell which.
  const withStorage = (storage) => {
    const built = build({ storage })
    built.wrapper.vm.adoptAnalysis(analysis)
    built.wrapper.vm.validation = validation()
    return built
  }

  const full = () => {
    const storage = makeStorage()
    storage.setItem = () => { throw new Error('quota') }
    return storage
  }

  it('does not send the apply at all when storage is full', async () => {
    const { wrapper, stub } = withStorage(full())

    await approveThroughDialog(wrapper)

    expect(stub.Apply).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('leaves the draft editable rather than freezing it', async () => {
    const { wrapper } = withStorage(full())
    const rowsBefore = wrapper.vm.rows.length

    await approveThroughDialog(wrapper)

    // Nothing was sent, so there is nothing to be uncertain about.
    expect(wrapper.vm.outcomeUnknown).toBe(false)
    expect(wrapper.vm.pendingApplyRequest).toBeNull()
    expect(wrapper.vm.rows).toHaveLength(rowsBefore)

    // The dialog stays up saying why, and closing it leaves an ordinary editable draft.
    expect(wrapper.vm.applyError).toBeTruthy()
    wrapper.vm.closeApproval()
    expect(wrapper.vm.isLocked).toBe(false)

    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'description', 'fortsatt redigerbar')
    expect(wrapper.vm.rows[0].metadataEdits.description).toBe('fortsatt redigerbar')
    wrapper.destroy()
  })

  it('says so, in the operator\'s language', async () => {
    const { wrapper } = withStorage(full())

    await approveThroughDialog(wrapper)

    expect(wrapper.vm.applyError).toBe('T:menuImport_cannotRecordSave')
    wrapper.destroy()
  })

  it('refuses just as firmly when there is no storage at all', async () => {
    const { wrapper, stub } = withStorage(null)

    await approveThroughDialog(wrapper)

    expect(stub.Apply).not.toHaveBeenCalled()
    expect(wrapper.vm.outcomeUnknown).toBe(false)
    wrapper.destroy()
  })

  it('refuses when the write is accepted but reads back as something else', async () => {
    // A storage that lies is as dangerous as one that throws, and only a readback catches it.
    const storage = makeStorage()
    const realSet = storage.setItem
    storage.setItem = (key, value) => {
      if (key.indexOf('menuImport.pending.') === 0) { return }
      realSet(key, value)
    }
    const { wrapper, stub } = withStorage(storage)

    await approveThroughDialog(wrapper)

    expect(stub.Apply).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('never clears the operator\'s draft to make room', async () => {
    const storage = full()
    const { wrapper } = withStorage(storage)
    storage.contents['menuImport.draft.u1.7'] = '{"rows":[]}'

    await approveThroughDialog(wrapper)

    expect(storage.contents['menuImport.draft.u1.7']).toBeDefined()
    wrapper.destroy()
  })

  it('sends normally once the record can be written', async () => {
    const { wrapper, stub, storage } = withStorage(makeStorage())

    await approveThroughDialog(wrapper)

    expect(stub.Apply).toHaveBeenCalledTimes(1)
    // Written before the call, and cleared by the receipt that followed.
    expect(storage.contents['menuImport.pending.u1.7']).toBeUndefined()
    expect(wrapper.vm.receipt).toBeTruthy()
    wrapper.destroy()
  })

  it('records the envelope before sending, when the answer never comes', async () => {
    const failure = Object.assign(new Error('lost response'), { status: 0 })
    const storage = makeStorage()
    const { wrapper } = build({ storage, service: { Apply: jest.fn().mockRejectedValue(failure) } })
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.validation = validation()

    await approveThroughDialog(wrapper)

    expect(wrapper.vm.outcomeUnknown).toBe(true)
    expect(JSON.parse(storage.contents['menuImport.pending.u1.7']).operationId).toBe('op-1')
    wrapper.destroy()
  })
})

describe('settling an apply that was never answered', () => {
  const frozen = async (service = {}) => {
    const failure = Object.assign(new Error('network'), { status: 0 })
    const storage = makeStorage()
    const built = build({ storage, service: { Apply: jest.fn().mockRejectedValue(failure), ...service } })
    built.wrapper.vm.adoptAnalysis(analysis)
    built.wrapper.vm.validation = validation()
    await approveThroughDialog(built.wrapper)
    expect(built.wrapper.vm.outcomeUnknown).toBe(true)
    return built
  }

  it('stays frozen when the server says only that it has not been applied', async () => {
    // The ledger row appears on commit, so an apply still in flight looks exactly like one that
    // never happened. That is an absence of an answer, not an answer.
    const { wrapper } = await frozen({ GetStatus: jest.fn().mockResolvedValue({ applied: false, cancelled: false }) })

    await wrapper.vm.checkStatus()

    expect(wrapper.vm.outcomeUnknown).toBe(true)
    expect(wrapper.vm.pendingApplyRequest).toBeTruthy()
    wrapper.destroy()
  })

  it('stays frozen when retrying the request is refused as expired', async () => {
    // A 400 says this attempt was rejected, not that the original cannot still land.
    const expired = Object.assign(new Error('plan expired'), { status: 400 })
    const { wrapper, storage } = await frozen()
    wrapper.vm._menuUpdateService.Apply = jest.fn().mockRejectedValue(expired)

    await wrapper.vm.retryPendingApply()

    expect(wrapper.vm.outcomeUnknown).toBe(true)
    expect(storage.contents['menuImport.pending.u1.7']).toBeDefined()
    wrapper.destroy()
  })

  it('releases and keeps the draft when the server confirms it never committed', async () => {
    const { wrapper, stub, storage } = await frozen()
    const rowsBefore = wrapper.vm.rows.length

    await wrapper.vm.settleOperation()

    // Sent back the very envelope that was persisted, so the server settles that operation.
    expect(stub.Cancel).toHaveBeenCalledTimes(1)
    expect(stub.Cancel.mock.calls[0][0].operationId).toBe('op-1')

    expect(wrapper.vm.outcomeUnknown).toBe(false)
    expect(wrapper.vm.isLocked).toBe(false)
    expect(wrapper.vm.pendingApplyRequest).toBeNull()
    expect(storage.contents['menuImport.pending.u1.7']).toBeUndefined()
    // Nothing was written, so the work is still wanted.
    expect(wrapper.vm.rows).toHaveLength(rowsBefore)
    expect(wrapper.vm.receipt).toBeNull()
    wrapper.destroy()
  })

  it('lets a fresh plan be built after it has been settled', async () => {
    const { wrapper, stub } = await frozen()
    await wrapper.vm.settleOperation()

    stub.Validate.mockClear()
    await wrapper.vm.validate()

    // Safe precisely because the old operation is now known to be dead rather than merely quiet.
    expect(stub.Validate).toHaveBeenCalled()
    wrapper.destroy()
  })

  it('shows the receipt when it turns out to have committed after all', async () => {
    const { wrapper, storage } = await frozen({
      Cancel: jest.fn().mockResolvedValue({ operationId: 'op-1', storeId: 7, outcome: 'Applied', receipt: receipt(), cancelledAt: null })
    })

    await wrapper.vm.settleOperation()

    expect(wrapper.vm.outcomeUnknown).toBe(false)
    expect(wrapper.vm.receipt.updatedProductIds).toEqual(['p1'])
    expect(storage.contents['menuImport.pending.u1.7']).toBeUndefined()
    wrapper.destroy()
  })

  it('reports everything a recovered receipt now carries, not just the prices', async () => {
    // The ledger used to drop these three lists, so a recovered receipt always had them empty.
    // They are populated on this path now, and the rendering must not have assumed otherwise.
    const complete = receipt({
      removedProductIds: ['p7', 'p8'],
      createdCategoryIds: [{ key: 'newcat-1', categoryId: 'c9' }],
      metadataUpdatedProductIds: ['p1']
    })
    const { wrapper } = await frozen({
      Cancel: jest.fn().mockResolvedValue({ operationId: 'op-1', storeId: 7, outcome: 'Applied', receipt: complete, cancelledAt: null })
    })

    await wrapper.vm.settleOperation()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.receiptRemovedIds).toHaveLength(2)
    expect(wrapper.vm.receiptCreatedCategories).toHaveLength(1)
    expect(wrapper.vm.receiptMetadataIds).toHaveLength(1)
    const text = wrapper.text()
    expect(text).toContain('menuImport_receiptRemoved')
    expect(text).toContain('menuImport_receiptCategories')
    expect(text).toContain('menuImport_receiptMetadata')
    wrapper.destroy()
  })

  it('reports the same completeness when the status check is what found it', async () => {
    const complete = receipt({ removedProductIds: ['p7'], createdCategoryIds: [{ key: 'newcat-1', categoryId: 'c9' }], metadataUpdatedProductIds: ['p1'] })
    const { wrapper } = await frozen({
      GetStatus: jest.fn().mockResolvedValue({ applied: true, cancelled: false, receipt: complete })
    })

    await wrapper.vm.checkStatus()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('menuImport_receiptRemoved')
    expect(wrapper.vm.receiptCreatedCategories).toHaveLength(1)
    wrapper.destroy()
  })

  it('settles the same way when asked twice', async () => {
    // The server returns the identical answer, including cancelledAt, so a retry after a
    // dropped connection needs nothing special here.
    const { wrapper, stub } = await frozen()

    await wrapper.vm.settleOperation()
    expect(wrapper.vm.outcomeUnknown).toBe(false)

    await wrapper.vm.settleOperation()

    // Nothing left to settle, so it does not ask again.
    expect(stub.Cancel).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.outcomeUnknown).toBe(false)
    wrapper.destroy()
  })

  it('stays frozen when settling it fails', async () => {
    const refused = Object.assign(new Error('bad signature'), { status: 400 })
    const { wrapper, storage } = await frozen({ Cancel: jest.fn().mockRejectedValue(refused) })

    await wrapper.vm.settleOperation()

    // A refusal here says this request was rejected, not that the operation did not commit.
    expect(wrapper.vm.outcomeUnknown).toBe(true)
    expect(wrapper.vm.pendingApplyRequest).toBeTruthy()
    expect(storage.contents['menuImport.pending.u1.7']).toBeDefined()
    wrapper.destroy()
  })

  it('stays frozen on an answer that is neither outcome', async () => {
    const { wrapper } = await frozen({ Cancel: jest.fn().mockResolvedValue({ operationId: 'op-1' }) })

    await wrapper.vm.settleOperation()

    expect(wrapper.vm.outcomeUnknown).toBe(true)
    wrapper.destroy()
  })

  it('accepts a tombstone reported through an ordinary status check', async () => {
    const { wrapper } = await frozen({
      GetStatus: jest.fn().mockResolvedValue({ applied: false, cancelled: true, cancelledAt: '2026-09-10T12:00:00' })
    })

    await wrapper.vm.checkStatus()

    expect(wrapper.vm.outcomeUnknown).toBe(false)
    expect(wrapper.vm.rows.length).toBeGreaterThan(0)
    wrapper.destroy()
  })

  it('survives a reload and can be settled afterwards', async () => {
    const { wrapper, storage } = await frozen()
    wrapper.destroy()

    const reloaded = build({ storage })
    await flush()
    expect(reloaded.wrapper.vm.outcomeUnknown).toBe(true)

    await reloaded.wrapper.vm.settleOperation()

    expect(reloaded.wrapper.vm.outcomeUnknown).toBe(false)
    expect(storage.contents['menuImport.pending.u1.7']).toBeUndefined()
    reloaded.wrapper.destroy()
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

    wrapper.vm.replaceConfirmation = wrapper.vm.replaceWord
    expect(wrapper.vm.canConfirmReplace).toBe(true)
    wrapper.destroy()
  })

  it('sends back exactly the ids that were shown, through the shared confirmation', async () => {
    const withRemoval = validation({ removal: { requested: true, productIds: ['p2'], products: [{ productId: 'p2', name: '2. Kjøtt' }] } })
    const Validate = jest.fn().mockResolvedValue(withRemoval)
    const { wrapper, stub } = build({ service: { Validate } })
    wrapper.vm.adoptAnalysis(analysis)
    await wrapper.vm.previewRemoval()
    wrapper.vm.replaceConfirmation = wrapper.vm.replaceWord

    // The typed word agrees to the deletion; the confirmation agrees to what gets written.
    await wrapper.vm.confirmReplace()
    expect(stub.Apply).not.toHaveBeenCalled()
    expect(wrapper.vm.showConfirm).toBe(true)
    expect(wrapper.vm.confirmSummary.removals).toBe(1)

    await wrapper.vm.confirmApproval()

    const sent = Validate.mock.calls.pop()[0]
    expect(sent.catalogueReplacement).toEqual({ requested: true, expectedRemovedProductIds: ['p2'] })
    expect(stub.Apply).toHaveBeenCalledTimes(1)
    wrapper.destroy()
  })

  it('stops and re-shows the list when what would be removed has changed', async () => {
    const shown = validation({ removal: { requested: true, productIds: ['p2'], products: [{ productId: 'p2', name: '2. Kjøtt' }] } })
    const moved = validation({ removal: { requested: true, productIds: ['p2', 'p3'], products: [{ productId: 'p2', name: '2. Kjøtt' }, { productId: 'p3', name: '3. Ny rett' }] } })
    const Validate = jest.fn().mockResolvedValueOnce(shown).mockResolvedValueOnce(shown).mockResolvedValue(moved)
    const { wrapper, stub } = build({ service: { Validate } })
    wrapper.vm.adoptAnalysis(analysis)
    await wrapper.vm.previewRemoval()
    wrapper.vm.replaceConfirmation = wrapper.vm.replaceWord
    await wrapper.vm.confirmReplace()

    await wrapper.vm.confirmApproval()

    // A product created between the preview and the confirmation must not be swept up silently.
    expect(stub.Apply).not.toHaveBeenCalled()
    expect(wrapper.vm.removalPreview.productIds).toEqual(['p2', 'p3'])
    wrapper.destroy()
  })
})

describe('columns', () => {
  it('opens compact for a price update and rich for an import that creates products', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis({ ...analysis, rows: [analysis.rows[0]] })
    expect(wrapper.vm.visibleColumns).toEqual(['link', 'name', 'takeaway', 'eatIn', 'delivery'])

    wrapper.vm.adoptAnalysis(analysis)
    expect(wrapper.vm.visibleColumns).toEqual(expect.arrayContaining(['name', 'category', 'description']))
    expect(wrapper.vm.visibleColumns).not.toContain('identity')
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

  it('remembers a manual choice across closing and reopening the browser', async () => {
    // Same person, same store, nothing on the server: the choice lives in local storage and has
    // to survive the component being torn down and built again from that storage alone.
    const storage = makeStorage()
    const first = build({ storage })
    first.wrapper.vm.adoptAnalysis(analysis)
    first.wrapper.vm.onColumnToggle({ id: 'soldOut', visible: true })
    first.wrapper.vm.onColumnToggle({ id: 'description', visible: false })
    const chosen = [...first.wrapper.vm.visibleColumns]
    first.wrapper.destroy()

    const { wrapper } = build({ storage })
    await flush()

    expect(wrapper.vm.columnChoiceMade).toBe(true)
    expect(wrapper.vm.visibleColumns).toEqual(chosen)

    // And a fresh import does not quietly rearrange it afterwards.
    wrapper.vm.adoptAnalysis(analysis)
    expect(wrapper.vm.visibleColumns).toEqual(chosen)
    expect(wrapper.vm.visibleColumns).toContain('soldOut')
    expect(wrapper.vm.visibleColumns).not.toContain('description')
    wrapper.destroy()
  })

  it('keeps the structural columns even when an older saved choice left them out', async () => {
    // A preference saved before the identity column was removed must not leave a create row
    // with nothing naming it.
    const storage = makeStorage()
    storage.setItem('menuImport.columns.u1.7', JSON.stringify({ chosen: true, visible: ['identity', 'takeaway'] }))

    const { wrapper } = build({ storage })
    await flush()

    expect(wrapper.vm.visibleColumns).toContain('name')
    expect(wrapper.vm.visibleColumns).toContain('link')
    expect(wrapper.vm.visibleColumns).not.toContain('identity')
    wrapper.destroy()
  })

  it('keeps a hidden column\'s edit, because hiding is not undoing', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.adoptAnalysis(analysis)
    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'otherInformation', 'Nøtter')
    wrapper.vm.setColumns(['takeaway'], true)
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
    wrapper.vm.clearDraft()
    wrapper.vm.addFiles([{ name: 'ny.pdf', type: 'application/pdf', size: 1000 }])

    expect(JSON.stringify(wrapper.vm.rows)).toBe(before)
    expect(wrapper.vm.categoryVariants).toHaveLength(0)
    expect(wrapper.vm.newCategories).toHaveLength(1)
    expect(wrapper.vm.files).toHaveLength(0)
    wrapper.destroy()
  })

  it('will not open a tool that exists to change the draft', async () => {
    const { wrapper } = await freeze()

    wrapper.vm.openTool('source')
    wrapper.vm.openTool('categoryVariants')
    wrapper.vm.openTool('clear')

    expect(wrapper.vm.showSource).toBe(false)
    expect(wrapper.vm.showCategoryVariants).toBe(false)
    expect(wrapper.vm.showClear).toBe(false)
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
    await approveThroughDialog(wrapper)
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

  it('keeps option identities when an unchanged menu is imported again', async () => {
    // Astra's path: resolveCategoryGroup merges the store's groups with extracted ones, and the
    // request that results is what the API replaces the group's options with. An identity lost
    // here is a basket selection deleted by a reimport that changed nothing.
    const withGroups = [{
      ...categories[0],
      variants: [{
        variantGroupId: 'cg1',
        name: 'Tilbehør',
        required: false,
        multiSelect: false,
        orderIndex: 0,
        options: [
          { variantOptionId: 'o1', name: 'Pommes', amount: 0, negativeAmount: false, orderIndex: 0 },
          { variantOptionId: 'o2', name: 'Salat', amount: 1500, negativeAmount: false, orderIndex: 1 }
        ]
      }]
    }]

    const { wrapper, stub } = build()
    wrapper.vm.catalogueOnly = { catalogue, categories: withGroups }
    wrapper.vm.adoptAnalysis({
      ...analysis,
      categories: withGroups,
      sourceCategoryVariants: [{
        categoryName: 'Pizza',
        groups: [{ name: 'Tilbehør', options: [{ name: 'Pommes', amount: 0 }, { name: 'Salat', amount: 1500 }] }]
      }]
    })
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0].categoryVariants[0]
    expect(sent.categoryId).toBe('c1')
    expect(sent.groups[0].variantGroupId).toBe('cg1')
    // The whole point: the ids the customers' baskets point at go back unchanged.
    expect(sent.groups[0].options.map(option => option.variantOptionId)).toEqual(['o1', 'o2'])
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

describe('pointing a proposed row at a product that already exists', () => {
  // A reading proposes groups for a product it thinks is new, and nothing in a document carries
  // an identity. Sent as they are they replace whatever the chosen product already offers —
  // every group removed, its options deleted, and the baskets pointing at them deleted too.
  const withGroups = [{
    ...catalogue[0],
    productId: 'p5',
    name: 'Eksisterende rett',
    variants: [
      {
        variantGroupId: 'g1',
        name: 'Saus',
        required: false,
        multiSelect: false,
        orderIndex: 0,
        options: [{ variantOptionId: 'o1', name: 'Tomat', amount: 500, negativeAmount: false, orderIndex: 0 }]
      },
      {
        variantGroupId: 'g2',
        name: 'Tilbehør',
        required: false,
        multiSelect: false,
        orderIndex: 1,
        options: [{ variantOptionId: 'o2', name: 'Ris', amount: 900, negativeAmount: false, orderIndex: 0 }]
      }
    ]
  }]

  const proposed = {
    ...analysis,
    catalogue: withGroups,
    rows: [{
      rowKey: 'p:1',
      name: 'Ny rett',
      categoryName: 'Pizza',
      suggestedAction: 'Create',
      suggestedProductId: null,
      candidates: [],
      warnings: [],
      sourcePrices: [{ channel: 'Takeaway', amount: 12000 }],
      variants: [{ name: 'Saus', options: [{ name: 'Tomat', amount: 500 }] }]
    }]
  }

  const linked = () => {
    const built = build()
    built.wrapper.vm.catalogueOnly = { catalogue: withGroups, categories }
    built.wrapper.vm.adoptAnalysis(proposed)
    // The proposal is on the row while it is still a creation.
    expect(built.wrapper.vm.rows[0].variantGroups).toHaveLength(1)
    built.wrapper.vm.linkProduct(built.wrapper.vm.rows[0], 'p5')
    return built
  }

  it('sends no option instruction at all for an untouched proposal', async () => {
    const { wrapper, stub } = linked()
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0].rows[0]
    // Existing metadata is unchanged until it is edited, and this was never edited.
    expect(sent.metadata).toBeUndefined()
    expect(wrapper.vm.rows[0].variantGroups).toBeNull()
    wrapper.destroy()
  })

  it('still shows the product\'s real groups after linking', () => {
    const { wrapper } = linked()

    expect(wrapper.vm.variantGroupsOf(wrapper.vm.rows[0]).map(group => group.variantGroupId))
      .toEqual(['g1', 'g2'])
    wrapper.destroy()
  })

  it('keeps identities and untouched groups when the operator has edited them', async () => {
    const { wrapper, stub } = linked()
    const row = wrapper.vm.rows[0]

    // Editing takes a working copy of what the product actually has, and re-selecting the same
    // product is not a change, so the work in progress survives.
    wrapper.vm.beginVariantEdit(row)
    wrapper.vm.linkProduct(row, 'p5')
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0].rows[0]
    expect(sent.metadata.variants.map(group => group.variantGroupId)).toEqual(['g1', 'g2'])
    expect(sent.metadata.variants[0].options[0].variantOptionId).toBe('o1')
    // The group the row never mentioned is still there.
    expect(sent.metadata.variants[1].options[0].variantOptionId).toBe('o2')
    wrapper.destroy()
  })

  it('starts again from the product now chosen when the link is changed', async () => {
    const other = [...withGroups, {
      ...catalogue[1],
      productId: 'p6',
      name: 'En annen rett',
      variants: [{ variantGroupId: 'g9', name: 'Saus', required: false, multiSelect: false, orderIndex: 0, options: [{ variantOptionId: 'o9', name: 'Tomat', amount: 700, negativeAmount: false, orderIndex: 0 }] }]
    }]
    const { wrapper, stub } = build()
    wrapper.vm.catalogueOnly = { catalogue: other, categories }
    wrapper.vm.adoptAnalysis({ ...proposed, catalogue: other })
    const row = wrapper.vm.rows[0]

    wrapper.vm.linkProduct(row, 'p5')
    wrapper.vm.beginVariantEdit(row)
    // Now pointed somewhere else entirely.
    wrapper.vm.linkProduct(row, 'p6')
    await wrapper.vm.validate()

    const sent = stub.Validate.mock.calls.pop()[0].rows[0]
    // A working set built against the first product describes that product, not this one, so
    // nothing is carried across — and the first product's ids certainly are not.
    expect(sent.metadata).toBeUndefined()
    expect(row.variantGroups).toBeNull()
    expect(row.variantsChosen).toBe(false)
    // What the row shows is the new target's own groups.
    expect(wrapper.vm.variantGroupsOf(row).map(group => group.variantGroupId)).toEqual(['g9'])
    wrapper.destroy()
  })

  it('tells the operator when a target change discards option work', async () => {
    // Discarding is the safe behaviour, but doing it silently would lose work someone did.
    const other = [...withGroups, {
      ...catalogue[1],
      productId: 'p6',
      name: 'En annen rett',
      variants: [{ variantGroupId: 'g9', name: 'Saus', required: false, multiSelect: false, orderIndex: 0, options: [] }]
    }]
    const { wrapper } = build()
    wrapper.vm.catalogueOnly = { catalogue: other, categories }
    wrapper.vm.adoptAnalysis({ ...proposed, catalogue: other })
    const row = wrapper.vm.rows[0]
    wrapper.vm.linkProduct(row, 'p5')
    wrapper.vm.beginVariantEdit(row)

    wrapper.vm.linkProduct(row, 'p6')
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.remapNotice).toContain('menuImport_variantsResetOnRelink')
    expect(wrapper.text()).toContain('menuImport_variantsResetOnRelink')
    wrapper.destroy()
  })

  it('says nothing when there was no option work to discard', () => {
    const { wrapper } = linked()

    // An untouched proposal is not work the operator did, so there is nothing to report.
    expect(wrapper.vm.remapNotice).toBe('')
    wrapper.destroy()
  })

  it('keeps identities out of a row that goes back to creating a product', () => {
    const { wrapper } = linked()
    const row = wrapper.vm.rows[0]
    wrapper.vm.beginVariantEdit(row)
    expect(row.variantGroups[0].variantGroupId).toBe('g1')

    wrapper.vm.linkProduct(row, null)

    expect(row.variantGroups.every(group => group.variantGroupId === null)).toBe(true)
    expect(row.variantGroups.every(group => group.options.every(option => option.variantOptionId === null))).toBe(true)
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
  const LEGACY_ROWS = [
    { categoryName: 'Pizza', name: 'Gammel rad', priceAmount: 12000, tax: 15, tableAdditionalAmount: 2000, tableTax: 25, soldOut: false, depositAmount: 0 }
  ]
  const LEGACY_GROUPS = [{ categoryName: 'Pizza', variants: [{ name: 'Tilbehør', options: [] }] }]

  const seeded = (storage = makeStorage()) => {
    storage.setItem('importRows', JSON.stringify(LEGACY_ROWS))
    storage.setItem('importCategoryVariants', JSON.stringify(LEGACY_GROUPS))
    return storage
  }

  it('is adopted into the selected store without asking, once the catalogue is known', async () => {
    const storage = seeded()
    const { wrapper } = build({ storage })
    await flush()

    expect(wrapper.vm.rows).toHaveLength(1)
    expect(wrapper.vm.priceValue(wrapper.vm.rows[0], 'takeaway')).toBe(120)
    // The old eat-in addition becomes an eat-in total, never a third addition.
    expect(wrapper.vm.priceValue(wrapper.vm.rows[0], 'eatIn')).toBe(140)
    expect(wrapper.vm.categoryVariants[0].variants.some(group => group.name === 'Tilbehør')).toBe(true)
    expect(storage.contents.importRows).toBeUndefined()
    wrapper.destroy()
  })

  it('does not adopt the same draft a second time on reload', async () => {
    const storage = seeded()
    const first = build({ storage })
    await flush()
    first.wrapper.destroy()

    const { wrapper } = build({ storage })
    await flush()

    expect(wrapper.vm.rows).toHaveLength(1)
    wrapper.destroy()
  })

  it('appends to a draft this store already has, rekeying what would collide', async () => {
    const storage = seeded()
    const first = build({ storage })
    await flush()
    const existingKey = first.wrapper.vm.rows[0].rowKey
    first.wrapper.destroy()

    // The same old keys turn up again — a cleanup that failed — with a scoped draft in place.
    seeded(storage)
    delete storage.contents['menuImport.migrated.u1']
    const draft = JSON.parse(storage.contents['menuImport.draft.u1.7'])
    draft.migratedFrom = []
    storage.setItem('menuImport.draft.u1.7', JSON.stringify(draft))

    const { wrapper } = build({ storage })
    await flush()

    expect(wrapper.vm.rows).toHaveLength(2)
    expect(new Set(wrapper.vm.rows.map(row => row.rowKey)).size).toBe(2)
    expect(wrapper.vm.rows[0].rowKey).toBe(existingKey)
    wrapper.destroy()
  })

  it('never touches the old keys when the draft cannot be saved', async () => {
    // The exact sequence that would otherwise delete the only copy: the write fails, and
    // whatever was recorded beforehand must not authorise a cleanup.
    const storage = seeded()
    storage.setItem = () => { throw new Error('quota') }

    const { wrapper } = build({ storage })
    await flush()

    expect(storage.contents.importRows).toBeDefined()
    expect(storage.contents.importCategoryVariants).toBeDefined()
    expect(storage.contents['menuImport.migrated.u1']).toBeUndefined()
    wrapper.destroy()
  })

  it('recovers the old rows on a later load once storage works again', async () => {
    const storage = seeded()
    const failing = { ...storage, setItem: () => { throw new Error('quota') } }
    const first = build({ storage: failing })
    await flush()
    first.wrapper.destroy()

    const { wrapper } = build({ storage })
    await flush()

    expect(wrapper.vm.rows).toHaveLength(1)
    expect(storage.contents.importRows).toBeUndefined()
    wrapper.destroy()
  })

  it('does not adopt it a second time in another store when the cleanup failed', async () => {
    const storage = seeded()
    const first = build({ storage })
    await flush()
    first.wrapper.destroy()

    // The rows were saved, but clearing the old keys did not take.
    seeded(storage)

    const { wrapper } = build({ storage, selectedAdminStore: 8 })
    await flush()

    expect(wrapper.vm.rows).toHaveLength(0)
    wrapper.destroy()
  })

  it('recognises the half of a failed cleanup that was already taken', async () => {
    // The rows key was deleted and the groups key was not. The surviving half must be seen as
    // already adopted, not appended a second time.
    const storage = seeded()
    const first = build({ storage })
    await flush()
    first.wrapper.destroy()

    storage.setItem('importCategoryVariants', JSON.stringify(LEGACY_GROUPS))

    const { wrapper } = build({ storage })
    await flush()

    expect(wrapper.vm.rows).toHaveLength(1)
    expect(wrapper.vm.categoryVariants).toHaveLength(1)
    expect(storage.contents.importCategoryVariants).toBeUndefined()
    wrapper.destroy()
  })

  it('still takes option groups that are genuinely new after a partial cleanup', async () => {
    const storage = seeded()
    const first = build({ storage })
    await flush()
    first.wrapper.destroy()

    // Different content under the same key: this has not been adopted and must not be skipped.
    storage.setItem('importCategoryVariants', JSON.stringify([
      { categoryName: 'Dessert', variants: [{ name: 'Topping', options: [] }] }
    ]))

    const { wrapper } = build({ storage })
    await flush()

    expect(wrapper.vm.categoryVariants).toHaveLength(2)
    wrapper.destroy()
  })

  it('waits while an apply of unknown outcome is outstanding', async () => {
    const storage = seeded()
    storage.setItem('menuImport.pending.u1.7', JSON.stringify({ operationId: 'op-1', plan: {} }))

    const { wrapper } = build({ storage })
    await flush()

    expect(wrapper.vm.outcomeUnknown).toBe(true)
    expect(wrapper.vm.rows).toHaveLength(0)
    // Still there, to be adopted once that operation is settled.
    expect(storage.contents.importRows).toBeDefined()
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
  const shown = async (overrides) => {
    const { wrapper } = build({ service: { Apply: jest.fn().mockResolvedValue(receipt(overrides)) } })
    wrapper.vm.adoptAnalysis(analysis)
    await approveThroughDialog(wrapper)
    await wrapper.vm.$nextTick()
    return wrapper
  }

  it('shows what each price actually went from and to', async () => {
    const wrapper = await shown()
    const changed = wrapper.vm.receiptChannels(wrapper.vm.receiptPrices[0])

    expect(changed[0]).toMatchObject({ before: 24000, after: 24500, changed: true })
    // Same before and after is not a change, and is not marked as one.
    expect(changed[1]).toMatchObject({ before: 26000, after: 26000, changed: false })
    expect(wrapper.text()).toContain('245')
    wrapper.destroy()
  })

  it('shows a created product as prices without a before', async () => {
    const wrapper = await shown()
    const created = wrapper.vm.receiptChannels(wrapper.vm.receiptPrices[1])

    expect(created.every(field => field.before === null)).toBe(true)
    expect(created.every(field => field.changed === false)).toBe(true)
    expect(created[0].after).toBe(10900)
    wrapper.destroy()
  })

  it('treats zero as a real price rather than as a missing one', async () => {
    const wrapper = await shown({
      prices: [{ productId: 'p1', productName: 'Gratis kaffe', created: false, previousTakeaway: 2000, previousEatIn: 0, previousDelivery: 0, newTakeaway: 0, newEatIn: 0, newDelivery: 0 }]
    })
    const fields = wrapper.vm.receiptChannels(wrapper.vm.receiptPrices[0])

    expect(fields[0]).toMatchObject({ before: 2000, after: 0, changed: true })
    // 0 to 0 is unchanged, not absent.
    expect(fields[1]).toMatchObject({ after: 0, changed: false })
    expect(wrapper.text()).not.toContain('—')
    wrapper.destroy()
  })

  it('copes with a receipt that omits a field instead of crashing on it', async () => {
    const wrapper = await shown({
      prices: [{ productId: 'p1', productName: 'Delvis', created: false, newTakeaway: 1000 }]
    })
    const fields = wrapper.vm.receiptChannels(wrapper.vm.receiptPrices[0])

    expect(fields[0]).toMatchObject({ before: null, after: 1000 })
    expect(fields[1].after).toBeNull()
    wrapper.destroy()
  })

  it('says how many rows were left alone, once, rather than per row', async () => {
    const wrapper = await shown({ unchangedRowCount: 30, skippedRowCount: 4 })

    expect(wrapper.vm.receiptQuietCount).toBe(34)
    expect(wrapper.text()).toContain('menuImport_receiptUntouched')
    wrapper.destroy()
  })

  it('never puts a product id on screen', async () => {
    const wrapper = await shown({
      prices: [{ productId: 'b2c3d4e5-1111-2222-3333-444455556666', productName: 'Vegetar', created: false, previousTakeaway: 100, newTakeaway: 200, newEatIn: 200, newDelivery: 200 }]
    })

    expect(wrapper.text()).not.toContain('b2c3d4e5')
    expect(wrapper.text()).toContain('Vegetar')
    wrapper.destroy()
  })

  it('writes a changed price as a move, and an unchanged one as a single number', async () => {
    const wrapper = await shown()
    const text = wrapper.text()

    // The old price, the arrow and the new one, so the change reads as a change.
    expect(text).toContain('→')
    expect(wrapper.findAll('.channel-summary del').length).toBeGreaterThan(0)
    expect(wrapper.findAll('.channel-summary .now').length).toBeGreaterThan(0)
    // And a quiet cell is one plain number with no struck-through partner.
    expect(wrapper.findAll('.channel-summary .same').length).toBeGreaterThan(0)
    expect(text).toContain('menuImport_receiptLegend')
    wrapper.destroy()
  })

  it('reports a replayed receipt as the same operation, not a second one', async () => {
    const wrapper = await shown({ replayed: true })

    expect(wrapper.vm.receipt.replayed).toBe(true)
    expect(wrapper.text()).toContain('menuImport_receiptReplayed')
    // Still the real prices, not dashes.
    expect(wrapper.vm.receiptChannels(wrapper.vm.receiptPrices[0])[0].after).toBe(24500)
    wrapper.destroy()
  })
})

describe('re-importing a menu that has not changed', () => {
  // Every row matches and none of them moves. Reading "36 oppdateres" off the match rather than
  // off the diff tells the operator 36 products are about to change when nothing is.
  const quiet = () => {
    const noDiff = validation({ canApply: false, summary: { updateCount: 0, createCount: 0 } })
    noDiff.rows.forEach((row) => {
      row.changed = false
      row.metadataChanges = []
      ;['takeaway', 'eatIn', 'delivery'].forEach((channel) => {
        row[channel] = { currentAmount: 24000, newAmount: 24000, changed: false, origin: 'Unchanged' }
      })
    })
    return noDiff
  }

  const linkedOnly = { ...analysis, rows: [{ ...analysis.rows[0] }, { ...analysis.rows[1], suggestedAction: 'Update', suggestedProductId: 'p2' }] }

  it('counts nothing as changing, and says so on each row', async () => {
    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(quiet()) } })
    wrapper.vm.adoptAnalysis(linkedOnly)
    await wrapper.vm.validate()

    expect(wrapper.vm.updateSplit).toEqual({ changed: 0, unchanged: 2, checking: 0 })
    expect(wrapper.vm.rowIntentKey(wrapper.vm.rows[0])).toBe('menuImport_rowNoChanges')
    // The rows stay visible, so any of them can still be overridden.
    expect(wrapper.vm.rows).toHaveLength(2)
    wrapper.destroy()
  })

  it('refuses to offer a save that would write nothing', async () => {
    const { wrapper, stub } = build({ service: { Validate: jest.fn().mockResolvedValue(quiet()) } })
    wrapper.vm.adoptAnalysis(linkedOnly)

    await wrapper.vm.openApproval()

    // The server refuses an empty plan with no blockers attached, so without asking here the
    // dialog would show a confident button that quietly did nothing.
    expect(wrapper.vm.nothingToWrite).toBe(true)
    expect(wrapper.vm.canConfirmApply).toBe(false)
    expect(wrapper.vm.confirmErrors).toHaveLength(0)
    await wrapper.vm.confirmApproval()
    expect(stub.Apply).not.toHaveBeenCalled()
    wrapper.destroy()
  })

  it('counts one edited price as one change and leaves the rest quiet', async () => {
    const oneMoved = quiet()
    oneMoved.canApply = true
    oneMoved.summary = { updateCount: 1, createCount: 0 }
    oneMoved.rows[0].changed = true
    oneMoved.rows[0].takeaway = { currentAmount: 24000, newAmount: 28000, changed: true, deltaPercent: 16.7 }

    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(oneMoved) } })
    wrapper.vm.adoptAnalysis(linkedOnly)
    await wrapper.vm.validate()

    expect(wrapper.vm.updateSplit).toEqual({ changed: 1, unchanged: 1, checking: 0 })
    expect(wrapper.vm.nothingToWrite).toBe(false)
    wrapper.destroy()
  })

  it('does not badge a row whose edit resolves to no change', async () => {
    // An edit that the server works out to nothing is not a change, and the badge saying so
    // beside "Ingen endringer" would contradict it.
    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(quiet()) } })
    wrapper.vm.adoptAnalysis(linkedOnly)
    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'description', 'noe annet')
    await wrapper.vm.validate()

    expect(wrapper.vm.hasMetadataPatch(wrapper.vm.rows[0])).toBe(true)
    expect(wrapper.vm.rowMetadataChanged(wrapper.vm.rows[0])).toBe(false)
    expect(wrapper.vm.rowIntentKey(wrapper.vm.rows[0])).toBe('menuImport_rowNoChanges')
    wrapper.destroy()
  })

  it('never renders the badge and "no changes" together', async () => {
    // The rendered row, not just the computed: the binding is what regressed last time.
    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(quiet()) } })
    wrapper.vm.adoptAnalysis(linkedOnly)
    // An explicit edit that the server resolves to nothing at all.
    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'description', 'noe annet')
    await wrapper.vm.validate()
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.hasMetadataPatch(wrapper.vm.rows[0])).toBe(true)
    expect(wrapper.text()).toContain('menuImport_rowNoChanges')
    expect(wrapper.text()).not.toContain('menuImport_alsoChangesDetails')
    expect(wrapper.findAll('.row-intent .modified')).toHaveLength(0)
    wrapper.destroy()
  })

  it('does render the badge when a field really moves', async () => {
    const moved = quiet()
    moved.rows[0].metadataChanges = [{ field: 'description', from: 'a', to: 'b' }]

    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(moved) } })
    wrapper.vm.adoptAnalysis(linkedOnly)
    await wrapper.vm.validate()
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.row-intent .modified').length).toBeGreaterThan(0)
    // That row says it updates; the other one is still quiet, which is the whole distinction.
    expect(wrapper.vm.rowIntentKey(wrapper.vm.rows[0])).toBe('menuImport_willUpdate')
    expect(wrapper.vm.rowIntentKey(wrapper.vm.rows[1])).toBe('menuImport_rowNoChanges')
    wrapper.destroy()
  })

  it('marks the price field that actually moves', async () => {
    const oneMoved = quiet()
    oneMoved.rows[0].changed = true
    oneMoved.rows[0].takeaway = { currentAmount: 24000, newAmount: 28000, changed: true }

    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(oneMoved) } })
    wrapper.vm.adoptAnalysis(linkedOnly)
    await wrapper.vm.validate()

    expect(wrapper.vm.isPriceChanged(wrapper.vm.rows[0], 'takeaway')).toBe(true)
    expect(wrapper.vm.isPriceChanged(wrapper.vm.rows[0], 'eatIn')).toBe(false)
    wrapper.destroy()
  })

  it('counts a metadata-only change as a change', async () => {
    const metadataOnly = quiet()
    metadataOnly.canApply = true
    metadataOnly.summary = { updateCount: 1, createCount: 0 }
    metadataOnly.rows[0].metadataChanges = [{ field: 'description', from: 'a', to: 'b' }]

    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(metadataOnly) } })
    wrapper.vm.adoptAnalysis(linkedOnly)
    await wrapper.vm.validate()

    expect(wrapper.vm.updateSplit.changed).toBe(1)
    expect(wrapper.vm.nothingToWrite).toBe(false)
    wrapper.destroy()
  })

  it('does not turn an untaken suggestion into a change', async () => {
    // "Bruk fra menyen" is an offer. Until it is pressed nothing is sent, so nothing counts.
    const { wrapper } = build({ service: { Validate: jest.fn().mockResolvedValue(quiet()) } })
    wrapper.vm.adoptAnalysis(linkedOnly)
    await wrapper.vm.validate()

    expect(wrapper.vm.sourceDiffers(wrapper.vm.rows[0], 'description')).toBe(true)
    expect(wrapper.vm.updateSplit.changed).toBe(0)
    wrapper.destroy()
  })

  it('says it is still checking rather than claiming nothing changed', () => {
    const { wrapper } = build()
    wrapper.vm.adoptAnalysis(linkedOnly)

    // No validation has come back yet.
    expect(wrapper.vm.updateSplit).toMatchObject({ changed: 0, unchanged: 0, checking: 2 })
    expect(wrapper.vm.rowIntentKey(wrapper.vm.rows[0])).toBe('menuImport_rowChecking')
    wrapper.destroy()
  })
})

describe('choosing menu files', () => {
  const file = (name, type = '', size = 1000) => ({ name, type, size })

  it('takes a mixed pick of everything the reader can read', () => {
    const { wrapper } = build()

    wrapper.vm.addFiles([
      file('meny.pdf', 'application/pdf'),
      file('tavle.jpg', 'image/jpeg'),
      file('priser.xlsx', ''),
      file('drikke.csv', 'application/octet-stream'),
      file('notater.txt', 'text/plain')
    ])

    expect(wrapper.vm.files).toHaveLength(5)
    expect(wrapper.vm.analysisError).toBe('')
    expect(wrapper.vm.canAnalyze).toBe(true)
    wrapper.destroy()
  })

  it('accepts the same mixture dropped rather than picked', () => {
    const { wrapper } = build()

    wrapper.vm.onDrop({ dataTransfer: { files: [file('meny.webp', 'image/webp'), file('meny.tsv', '')] } })

    expect(wrapper.vm.files.map(item => item.name)).toEqual(['meny.webp', 'meny.tsv'])
    wrapper.destroy()
  })

  it('names the files it cannot read, and keeps the ones it can', () => {
    const { wrapper } = build()

    // The last one reports a readable type but has no extension to classify it by, and the
    // reader would refuse it after the upload rather than before it.
    wrapper.vm.addFiles([file('meny.pdf', 'application/pdf'), file('meny.docx'), file('bilde.heic'), file('skann', 'image/png')])

    expect(wrapper.vm.files.map(item => item.name)).toEqual(['meny.pdf'])
    // Listed by name: "2 files were not added" leaves someone working out which two.
    expect(wrapper.vm.analysisError).toContain('meny.docx')
    expect(wrapper.vm.analysisError).toContain('bilde.heic')
    expect(wrapper.vm.analysisError).toContain('skann')
    wrapper.destroy()
  })

  it('does not add the same file twice, however it arrived', () => {
    const { wrapper } = build()

    wrapper.vm.addFiles([file('meny.pdf', 'application/pdf')])
    wrapper.vm.onDrop({ dataTransfer: { files: [file('meny.pdf', 'application/pdf')] } })

    expect(wrapper.vm.files).toHaveLength(1)
    wrapper.destroy()
  })

  it('applies the same limits whatever the format', () => {
    const { wrapper } = build()

    wrapper.vm.addFiles([file('stor.xlsx', '', 20 * 1024 * 1024)])
    expect(wrapper.vm.uploadTooLarge).toBe(true)
    expect(wrapper.vm.analysisError).toContain('menuImport_tooLarge')

    wrapper.vm.removeFile(0)
    wrapper.vm.addFiles(Array.from({ length: 9 }, (_unused, index) => file('meny' + index + '.png', 'image/png')))
    expect(wrapper.vm.uploadTooLarge).toBe(true)
    expect(wrapper.vm.canAnalyze).toBe(false)
    wrapper.destroy()
  })

  it('keeps a refusal on screen when the size check afterwards is happy', () => {
    const { wrapper } = build()

    wrapper.vm.addFiles([file('meny.pdf', 'application/pdf'), file('meny.docx')])

    // The size was fine, but a file really was refused and that is still true.
    expect(wrapper.vm.uploadTooLarge).toBe(false)
    expect(wrapper.vm.analysisError).toContain('meny.docx')
    wrapper.destroy()
  })

  it('sends the typed text as instructions when there are files, and as the menu when there are none', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.pastedText = 'Behold navnene'
    wrapper.vm.addFiles([file('meny.xlsx', '')])

    await wrapper.vm.runAnalysis()

    expect(stub.Analyze.mock.calls[0][1]).toMatchObject({ instructions: 'Behold navnene', text: '' })

    const second = build()
    second.wrapper.vm.pastedText = 'Pizza 200'
    await second.wrapper.vm.runAnalysis()
    expect(second.stub.Analyze.mock.calls[0][1]).toMatchObject({ text: 'Pizza 200', instructions: '' })

    second.wrapper.destroy()
    wrapper.destroy()
  })

  it('offers the picker the formats it accepts and nothing it does not', async () => {
    const { wrapper } = build()
    wrapper.vm.showSource = true
    await wrapper.vm.$nextTick()
    const accept = wrapper.find('input[type="file"]').attributes('accept')

    expect(accept).toContain('.pdf')
    expect(accept).toContain('.xlsx')
    expect(accept).toContain('image/png')
    expect(accept).not.toContain('.docx')
    wrapper.destroy()
  })

  it('badges each chosen file with what it actually is', async () => {
    const { wrapper } = build()
    wrapper.vm.showSource = true
    wrapper.vm.addFiles([file('priser.xlsx', ''), file('tavle.jpeg', 'image/jpeg')])
    await wrapper.vm.$nextTick()

    const badges = wrapper.findAll('.file-tag').wrappers.map(item => item.text())
    expect(badges).toEqual(['XLSX', 'JPG'])
    wrapper.destroy()
  })
})

describe('while a menu is being read', () => {
  const reading = () => {
    let release
    const slow = new Promise((resolve) => { release = resolve })
    const built = build({ service: { Analyze: jest.fn().mockReturnValue(slow) } })
    built.wrapper.vm.pastedText = 'meny'
    const running = built.wrapper.vm.runAnalysis()
    return { ...built, running, release }
  }

  it('closes the tool while the reading is in flight', () => {
    const { wrapper } = reading()

    expect(wrapper.vm.isAnalyzing).toBe(true)
    expect(wrapper.vm.isLocked).toBe(true)
    expect(wrapper.vm.canApprove).toBe(false)
    wrapper.destroy()
  })

  it('refuses every mutation until it lands', async () => {
    const { wrapper, running, release } = reading()
    wrapper.vm.rows = [makeManualRow(wrapper)]
    const before = JSON.stringify(wrapper.vm.rows)

    wrapper.vm.addManualRow()
    wrapper.vm.removeRow(wrapper.vm.rows[0])
    wrapper.vm.editMetadata(wrapper.vm.rows[0], 'description', 'ny')
    wrapper.vm.setManual(wrapper.vm.rows[0], 'takeaway', '999')
    wrapper.vm.openTool('clear')

    expect(JSON.stringify(wrapper.vm.rows)).toBe(before)
    expect(wrapper.vm.showClear).toBe(false)

    release(analysis)
    await running
  })

  it('will not start a second reading on top of the first', async () => {
    const { wrapper, stub, running, release } = reading()

    await wrapper.vm.runAnalysis()

    expect(stub.Analyze).toHaveBeenCalledTimes(1)
    release(analysis)
    await running
    wrapper.destroy()
  })

  it('will not start a reading while a save is in flight', async () => {
    // Independent of the confirmation being open: an apply on its own is reason enough.
    let releaseApply
    const held = new Promise((resolve) => { releaseApply = resolve })
    const { wrapper, stub } = build({ service: { Apply: jest.fn().mockReturnValue(held) } })
    wrapper.vm.adoptAnalysis(analysis)
    await wrapper.vm.openApproval()
    const saving = wrapper.vm.confirmApproval()
    await flush()
    // The confirmation is closed, so only the save itself is holding the lock.
    wrapper.vm.showConfirm = false
    expect(wrapper.vm.isApplying).toBe(true)

    wrapper.vm.pastedText = 'en helt ny meny'
    await wrapper.vm.runAnalysis()

    expect(stub.Analyze).not.toHaveBeenCalled()
    releaseApply(receipt())
    await saving
    wrapper.destroy()
  })

  it('will not open the save dialog on a plan that is being rebuilt', async () => {
    const { wrapper, stub, running, release } = reading()

    await wrapper.vm.openApproval()

    expect(wrapper.vm.showConfirm).toBe(false)
    expect(stub.Apply).not.toHaveBeenCalled()
    release(analysis)
    await running
    wrapper.destroy()
  })

  it('adopts the result and unlocks once it arrives', async () => {
    const { wrapper, running, release } = reading()

    release(analysis)
    await running
    await flush()

    expect(wrapper.vm.isAnalyzing).toBe(false)
    expect(wrapper.vm.isLocked).toBe(false)
    expect(wrapper.vm.rows).toHaveLength(2)
    wrapper.destroy()
  })

  it('unlocks after a reading that fails', async () => {
    const { wrapper } = build({ service: { Analyze: jest.fn().mockRejectedValue(new Error('nope')) } })
    wrapper.vm.pastedText = 'meny'

    await wrapper.vm.runAnalysis()

    expect(wrapper.vm.isAnalyzing).toBe(false)
    expect(wrapper.vm.isLocked).toBe(false)
    expect(wrapper.vm.analysisError).toBe('nope')
    wrapper.destroy()
  })
})

// A manual row built without going through the lock, for tests that need a row to poke at.
function makeManualRow (wrapper) {
  return { ...wrapper.vm.rows[0] || {}, rowKey: 'manual-test', action: 'Create', metadataEdits: {}, sourceMeta: {}, manualPrices: [], sourcePrices: [], variantGroups: null, acceptedWarnings: [], sourceIssues: [] }
}
