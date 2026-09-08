import { mount, createLocalVue } from '@vue/test-utils'
import Vuex from 'vuex'
import MenuUpdatePage from '~/pages/admin/menu-update.vue'

const localVue = createLocalVue()
localVue.use(Vuex)

// The page renders inside AdminPage, which pulls in the whole admin shell. The flow itself is
// what is under test, so the shell is replaced by a pass-through wrapper.
jest.mock('~/components/organisms/AdminPage.vue', () => ({
  name: 'AdminPage',
  render (h) { return h('div', this.$slots.default) }
}))

const analysis = {
  storeId: 7,
  storeName: 'Jungel Torshov',
  sources: [{ documentName: 'torshov.pdf', pageCount: 2, warnings: [], pages: [{ pageNumber: 2, rowCount: 2 }] }],
  warnings: [],
  rows: [
    {
      rowKey: 'n:1',
      menuNumber: '1',
      name: 'Jungel sterk salami',
      sizeLabel: 'Medium',
      categoryName: 'Pizza',
      suggestedAction: 'Update',
      suggestedProductId: 'p1',
      needsReview: false,
      warnings: [],
      candidates: [],
      sourcePrices: [{ channel: 'Takeaway', amount: 24200, documentName: 'torshov.pdf', pageNumber: 2, columnLabel: 'Ta med' }]
    },
    {
      rowKey: 'n:2',
      menuNumber: '2',
      name: 'Rabarbra',
      sizeLabel: 'Medium',
      categoryName: 'Pizza',
      suggestedAction: 'Update',
      suggestedProductId: 'p2',
      needsReview: true,
      warnings: [],
      candidates: [],
      sourcePrices: [
        { channel: 'Takeaway', amount: 24500, documentName: 'takeaway.pdf', pageNumber: 2, columnLabel: 'Medium' },
        { channel: 'Takeaway', amount: 23200, documentName: 'torshov.pdf', pageNumber: 2, columnLabel: 'Ta med' }
      ]
    }
  ],
  catalogue: [
    { productId: 'p1', name: '1. Jungel sterk salami', categoryName: 'Pizza', takeaway: 24000, eatIn: 26000, delivery: 26000 },
    { productId: 'p2', name: '2. Rabarbra', categoryName: 'Pizza', takeaway: 23500, eatIn: 25500, delivery: 25500 }
  ],
  categories: [
    { categoryId: 'c1', name: 'Pizza', suggestedTax: 15, suggestedEatInTax: 25, suggestedDeliveryTax: 15, taxSuggestionAvailable: true }
  ],
  unmatchedCatalogueProductIds: []
}

const validation = (overrides = {}) => ({
  operationId: 'op-1',
  planToken: 'token-1',
  expiresAt: '2026-09-09T12:00:00Z',
  catalogueHash: 'hash-1',
  canApply: false,
  summary: { updateCount: 1, createCount: 0, skipCount: 0, unchangedCount: 0, channels: [] },
  rateSuggestions: [],
  blockers: [{ code: 'sourceConflict', rowKey: 'n:2' }],
  warnings: [],
  rows: [
    {
      rowKey: 'n:1',
      changed: true,
      productName: '1. Jungel sterk salami',
      blockers: [],
      warnings: [],
      takeaway: { channel: 'Takeaway', currentAmount: 24000, newAmount: 24200, origin: 'Source', changed: true, deltaPercent: 0.83 },
      eatIn: { channel: 'EatIn', currentAmount: 26000, newAmount: 26000, origin: 'Unchanged', changed: false },
      delivery: { channel: 'Delivery', currentAmount: 26000, newAmount: 26000, origin: 'Unchanged', changed: false }
    },
    {
      rowKey: 'n:2',
      changed: false,
      productName: '2. Rabarbra',
      blockers: [{ code: 'sourceConflict', rowKey: 'n:2' }],
      warnings: [],
      takeaway: { channel: 'Takeaway', currentAmount: 23500, newAmount: 23500, origin: 'Conflict', changed: false },
      eatIn: { channel: 'EatIn', currentAmount: 25500, newAmount: 25500, origin: 'Unchanged', changed: false },
      delivery: { channel: 'Delivery', currentAmount: 25500, newAmount: 25500, origin: 'Unchanged', changed: false }
    }
  ],
  ...overrides
})

function build ({ service = {}, selectedAdminStore = 7 } = {}) {
  const calls = { analyze: [], validate: [], apply: [], status: [] }

  const stub = {
    Analyze: jest.fn((...args) => { calls.analyze.push(args); return Promise.resolve(analysis) }),
    Validate: jest.fn((...args) => { calls.validate.push(args); return Promise.resolve(validation()) }),
    Apply: jest.fn((...args) => { calls.apply.push(args); return Promise.resolve({}) }),
    GetStatus: jest.fn((...args) => { calls.status.push(args); return Promise.resolve({ applied: false }) }),
    ...service
  }

  const store = new Vuex.Store({ state: { selectedAdminStore } })

  const wrapper = mount(MenuUpdatePage, {
    localVue,
    store,
    mocks: {
      $i: (key, params) => (params ? key + ':' + JSON.stringify(params) : key),
      $router: { push: jest.fn() }
    },
    computed: {
      _menuUpdateService: () => stub
    }
  })

  return { wrapper, stub, calls }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

describe('menu update page', () => {
  it('asks for a store before offering to read any document', () => {
    const { wrapper } = build({ selectedAdminStore: 0 })
    expect(wrapper.text()).toContain('menuUpdate_selectStoreTitle')
    expect(wrapper.find('input[type="file"]').exists()).toBe(false)
  })

  it('starts on the source step with the analyse button disabled', () => {
    const { wrapper } = build()
    expect(wrapper.vm.step).toBe(1)
    expect(wrapper.vm.canAnalyze).toBe(false)
  })

  it('rejects a file that is not a PDF instead of uploading it', () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'meny.docx', type: 'application/msword', size: 1000 }])

    expect(wrapper.vm.files).toHaveLength(0)
    expect(wrapper.vm.analysisError).toBe('menuUpdate_onlyPdf')
  })

  it('refuses an upload past the size limit before sending it', () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'stor.pdf', type: 'application/pdf', size: 25 * 1024 * 1024 }])

    expect(wrapper.vm.analysisError).toContain('menuUpdate_tooLarge')
  })

  it('accepts the two real menu sizes together', () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([
      { name: 'takeaway.pdf', type: 'application/pdf', size: 7890390 },
      { name: 'torshov.pdf', type: 'application/pdf', size: 12271703 }
    ])

    expect(wrapper.vm.files).toHaveLength(2)
    expect(wrapper.vm.analysisError).toBe('')
    expect(wrapper.vm.canAnalyze).toBe(true)
  })

  it('moves to the review step and validates the draft after an analysis', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])

    await wrapper.vm.runAnalysis()
    await flush()

    expect(stub.Analyze).toHaveBeenCalled()
    expect(stub.Validate).toHaveBeenCalled()
    expect(wrapper.vm.step).toBe(2)
    expect(wrapper.vm.rows).toHaveLength(2)
  })

  it('counts the unresolved conflict and blocks approval until it is settled', async () => {
    const { wrapper } = build()
    wrapper.setData({ rows: [] })
    await wrapper.vm.$nextTick()

    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    expect(wrapper.vm.planCounts.review).toBe(1)
    expect(wrapper.vm.canApply).toBe(false)
  })

  it('skips every unresolved row in one action', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    wrapper.vm.skipAllUnresolved()

    expect(wrapper.vm.rows.find(r => r.rowKey === 'n:2').action).toBe('Skip')
    expect(wrapper.vm.rows.find(r => r.rowKey === 'n:1').action).toBe('Update')
  })

  it('drops the catalogue link but keeps the unresolved prices when a row becomes a create', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    const row = wrapper.vm.rows.find(r => r.rowKey === 'n:2')
    wrapper.vm.changeAction(row, 'Create')

    expect(row.targetProductId).toBeNull()
    expect(row.sourcePrices).toHaveLength(2)
    // The VAT proposal comes from the store's own category, not a fixed default.
    expect(row.newProduct.tax).toBe(15)
    expect(row.newProduct.eatInTax).toBe(25)
    expect(row.newProduct.setupConfirmed).toBe(false)
  })

  it('invalidates the previous server check as soon as the plan is edited', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    expect(wrapper.vm.validation).not.toBeNull()

    wrapper.vm.changeAction(wrapper.vm.rows[0], 'Skip')
    expect(wrapper.vm.validation).toBeNull()
  })

  it('resets to the analysed draft without reading the documents again', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    wrapper.vm.changeAction(wrapper.vm.rows[0], 'Skip')
    wrapper.vm.rows[0].manualPrices = [{ channel: 'EatIn', amount: 1 }]

    const analyzeCallsBefore = stub.Analyze.mock.calls.length
    wrapper.vm.resetRules()

    expect(wrapper.vm.rows[0].action).toBe('Update')
    expect(wrapper.vm.rows[0].manualPrices).toEqual([])
    expect(stub.Analyze.mock.calls.length).toBe(analyzeCallsBefore)
  })

  it('restores the exact draft when a bulk action is undone', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    wrapper.setData({ draftRules: { ...wrapper.vm.draftRules, absentProductRule: 'CustomPercent', absentProductPercent: 10 } })
    await wrapper.vm.previewRules()
    wrapper.vm.commitRulePreview()

    expect(wrapper.vm.activeRules.absentProductRule).toBe('CustomPercent')

    wrapper.vm.undoBulk()
    expect(wrapper.vm.activeRules.absentProductRule).toBe('Keep')
    expect(wrapper.vm.rows[0].excludedFromRules).toBe(false)
  })

  it('sends exactly the plan the server validated, with its token', async () => {
    const { wrapper, stub } = build({ service: { Validate: jest.fn(() => Promise.resolve(validation({ canApply: true, blockers: [] }))) } })
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    await wrapper.vm.applyPlan()

    const [request] = stub.Apply.mock.calls[0]
    expect(request.operationId).toBe('op-1')
    expect(request.planToken).toBe('token-1')
    expect(request.catalogueHash).toBe('hash-1')
    expect(request.plan.rows).toHaveLength(2)
  })

  it('asks for the operation status after a failed apply instead of retrying it', async () => {
    const failing = {
      Validate: jest.fn(() => Promise.resolve(validation({ canApply: true, blockers: [] }))),
      Apply: jest.fn(() => Promise.reject(Object.assign(new Error('timeout'), { status: undefined }))),
      GetStatus: jest.fn(() => Promise.resolve({ applied: true, receipt: { updatedProductIds: ['p1'], createdProductIds: [], prices: [] } }))
    }
    const { wrapper, stub } = build({ service: failing })
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    await wrapper.vm.applyPlan()
    expect(wrapper.vm.applyError).toBe('timeout')
    expect(stub.Apply).toHaveBeenCalledTimes(1)

    await wrapper.vm.checkStatus()

    expect(stub.GetStatus).toHaveBeenCalledWith(7, 'op-1')
    expect(stub.Apply).toHaveBeenCalledTimes(1)
    expect(wrapper.vm.receipt.updatedProductIds).toEqual(['p1'])
  })

  it('discards the draft and ignores the in-flight response when the store changes', async () => {
    window.alert = jest.fn()

    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    expect(wrapper.vm.rows).toHaveLength(2)
    const generationBefore = wrapper.vm.requestGeneration

    wrapper.vm.onStoreChanged()

    expect(window.alert).toHaveBeenCalled()
    expect(wrapper.vm.rows).toHaveLength(0)
    expect(wrapper.vm.validation).toBeNull()
    expect(wrapper.vm.step).toBe(1)
    // A response from before the switch belongs to a generation that is no longer current.
    expect(wrapper.vm.requestGeneration).toBeGreaterThan(generationBefore)
  })

  it('shows before and after for all three channels in the review table', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()
    await wrapper.vm.$nextTick()

    const headers = wrapper.findAll('thead th').wrappers.map(w => w.text())
    expect(headers).toContain('menuUpdate_channelTakeaway')
    expect(headers).toContain('menuUpdate_channelEatIn')
    expect(headers).toContain('menuUpdate_channelDelivery')

    const firstRow = wrapper.findAll('tbody tr').at(0)
    expect(firstRow.find('del').text()).toBe('240')
    expect(firstRow.find('.newprice').text()).toBe('242')
  })
})
