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
  sources: [{
    documentName: 'torshov.pdf',
    declaredPageCount: 2,
    detectedPageCount: 2,
    pagesReturned: 2,
    coverageVerified: true,
    warnings: [],
    columns: [
      { label: 'Sitte her', proposedKind: 'Channel', proposedChannel: 'EatIn', resolvedKind: 'Channel', resolvedChannel: 'EatIn', unresolved: false, ignored: false },
      { label: 'Ta med', proposedKind: 'Channel', proposedChannel: 'Takeaway', resolvedKind: 'Channel', resolvedChannel: 'Takeaway', unresolved: false, ignored: false }
    ],
    pages: [{ pageNumber: 2, rowCount: 2 }]
  }],
  documents: [{ documentName: 'torshov.pdf' }],
  sourceMetadata: [{ documentName: 'torshov.pdf', detectedPageCount: 2, sizeInBytes: 1000 }],
  sourceMetadataToken: 'meta-token',
  warnings: [
    { code: 'documentNotice', message: 'Nr. 19 er trykket som 223 / 325 og kan vaere en kolonnefeil.' },
    { code: 'documentNotice', message: 'Nr. 21 mangler pris for stor.' },
    { code: 'documentNotice', message: 'Extra-kolonnen inneholder tillegg, ikke pizzapriser.' }
  ],
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
      description: 'Rorosromme, mozzarella, rabarbrakompott',
      otherInformation: 'Gluten, kumelk',
      suggestedAction: 'Update',
      suggestedProductId: 'p2',
      needsReview: true,
      warnings: [],
      candidates: [],
      sourceIssues: ['matchNotConfirmed'],
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
  // What the server signed, including the ids it generated. The client must return this as is.
  normalizedPlan: { storeId: 7, rules: {}, rows: [{ rowKey: 'n:1' }, { rowKey: 'n:2' }] },
  canApply: false,
  summary: { updateCount: 1, createCount: 0, skipCount: 0, unchangedCount: 0, channels: [] },
  rateSuggestions: [],
  blockers: [{ code: 'sourceConflict', rowKey: 'n:2' }],
  warnings: [
    { code: 'documentNotice', message: 'Nr. 19 er trykket som 223 / 325 og kan vaere en kolonnefeil.' },
    { code: 'documentNotice', message: 'Nr. 21 mangler pris for stor.' },
    { code: 'documentNotice', message: 'Extra-kolonnen inneholder tillegg, ikke pizzapriser.' }
  ],
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
  const calls = { analyze: [], validate: [], apply: [], status: [], remap: [] }

  const stub = {
    Analyze: jest.fn((...args) => { calls.analyze.push(args); return Promise.resolve(analysis) }),
    Validate: jest.fn((...args) => { calls.validate.push(args); return Promise.resolve(validation()) }),
    Apply: jest.fn((...args) => { calls.apply.push(args); return Promise.resolve({}) }),
    Remap: jest.fn((...args) => { calls.remap.push(args); return Promise.resolve(analysis) }),
    GetStatus: jest.fn((...args) => { calls.status.push(args); return Promise.resolve({ applied: false }) }),
    ...service
  }

  const store = new Vuex.Store({ state: { selectedAdminStore } })

  const wrapper = mount(MenuUpdatePage, {
    localVue,
    store,
    mocks: {
      $i: (key, params) => {
        if (TRANSLATED_KEYS.has(key)) { return 'T:' + key }
        return params ? key + ':' + JSON.stringify(params) : key
      },
      $router: { push: jest.fn() }
    },
    computed: {
      _menuUpdateService: () => stub
    }
  })

  return { wrapper, stub, calls }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0))

// The real $i returns the key only when a translation is missing. Most tests assert on raw keys,
// so the mock keeps doing that, except for the few keys whose translated-or-not branch is itself
// under test.
const TRANSLATED_KEYS = new Set([
  'menuUpdate_issue_documentNotice',
  'menuUpdate_issue_sourceConflict'
])

const buildRows = () => analysis.rows.map(row => ({
  rowKey: row.rowKey,
  action: 'Update',
  targetProductId: row.suggestedProductId,
  displayName: row.name,
  sourcePrices: row.sourcePrices,
  manualPrices: [],
  acceptedWarnings: [],
  sourceIssues: [],
  inSource: true
}))

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

  it('resets the price rules without discarding what the operator decided', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    wrapper.vm.changeAction(wrapper.vm.rows[0], 'Skip')
    wrapper.vm.rows[0].manualPrices = [{ channel: 'EatIn', amount: 1 }]
    wrapper.setData({ activeRules: { ...wrapper.vm.activeRules, absentProductRule: 'CustomPercent', absentProductPercent: 10 } })

    const analyzeCallsBefore = stub.Analyze.mock.calls.length
    wrapper.vm.resetRules()

    // Rules go back to their defaults; the operator's own choices are not rule output.
    expect(wrapper.vm.activeRules.absentProductRule).toBe('Keep')
    expect(wrapper.vm.activeRules.absentProductPercent).toBeNull()
    expect(wrapper.vm.rows[0].action).toBe('Skip')
    expect(wrapper.vm.rows[0].manualPrices).toEqual([{ channel: 'EatIn', amount: 1 }])
    expect(stub.Analyze.mock.calls.length).toBe(analyzeCallsBefore)
  })

  it('previews a rule without changing the draft or the live validation', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    const validationBefore = wrapper.vm.validation
    wrapper.setData({ draftRules: { ...wrapper.vm.draftRules, absentProductRule: 'CustomPercent', absentProductPercent: 10 } })

    await wrapper.vm.previewRules()

    // The draft is untouched and the plan in hand is still the committed one.
    expect(wrapper.vm.rows.every(r => r.excludedFromRules === false)).toBe(true)
    expect(wrapper.vm.validation).toBe(validationBefore)
    expect(wrapper.vm.activeRules.absentProductRule).toBe('Keep')
    expect(wrapper.vm.rulePreview).not.toBeNull()
  })

  it('commits exactly the previewed rule and scope', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    wrapper.setData({
      ruleScope: 'CheckedRows',
      checkedKeys: ['n:1'],
      draftRules: { ...wrapper.vm.draftRules, absentProductRule: 'CustomPercent', absentProductPercent: 10 }
    })

    await wrapper.vm.previewRules()
    wrapper.vm.commitRulePreview()

    expect(wrapper.vm.activeRules.absentProductRule).toBe('CustomPercent')
    expect(wrapper.vm.rows.find(r => r.rowKey === 'n:1').excludedFromRules).toBe(false)
    expect(wrapper.vm.rows.find(r => r.rowKey === 'n:2').excludedFromRules).toBe(true)
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
    // The server's own normalised plan, sent back untouched. Rebuilding it here would drop the
    // ids the server generated for new products and every create would fail verification.
    expect(request.plan).toBe(wrapper.vm.validation.normalizedPlan)
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
    expect(wrapper.vm.outcomeUnknown).toBe(false)
  })

  it('stays frozen when the status says not applied, because the apply may still be in flight', async () => {
    // The status endpoint reads the ledger, and the ledger row only appears on commit, so an
    // apply that has not finished looks exactly like one that never happened. Building a new
    // plan on that answer would mint a second operation and could create products twice.
    const failing = {
      Validate: jest.fn(() => Promise.resolve(validation({ canApply: true, blockers: [] }))),
      Apply: jest.fn(() => Promise.reject(Object.assign(new Error('network down'), { status: undefined }))),
      GetStatus: jest.fn(() => Promise.resolve({ applied: false }))
    }
    const { wrapper, stub } = build({ service: failing })
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    await wrapper.vm.applyPlan()
    expect(wrapper.vm.outcomeUnknown).toBe(true)

    const validateCallsBefore = stub.Validate.mock.calls.length
    await wrapper.vm.checkStatus()

    expect(wrapper.vm.outcomeUnknown).toBe(true)
    expect(wrapper.vm.receipt).toBeNull()
    // No new plan, so no new operation id can be minted.
    expect(stub.Validate.mock.calls.length).toBe(validateCallsBefore)
    expect(wrapper.vm.canApply).toBe(false)
  })

  it('retries only the very same signed operation, never a rebuilt one', async () => {
    let attempts = 0
    const flaky = {
      Validate: jest.fn(() => Promise.resolve(validation({ canApply: true, blockers: [] }))),
      Apply: jest.fn(() => {
        attempts++
        if (attempts === 1) {
          return Promise.reject(Object.assign(new Error('network down'), { status: undefined }))
        }
        return Promise.resolve({ updatedProductIds: ['p1'], createdProductIds: [], prices: [], replayed: true })
      }),
      GetStatus: jest.fn(() => Promise.resolve({ applied: false }))
    }
    const { wrapper, stub } = build({ service: flaky })
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    await wrapper.vm.applyPlan()
    expect(wrapper.vm.outcomeUnknown).toBe(true)

    await wrapper.vm.retryPendingApply()

    const first = stub.Apply.mock.calls[0][0]
    const second = stub.Apply.mock.calls[1][0]
    expect(second).toBe(first)
    expect(second.operationId).toBe('op-1')
    expect(wrapper.vm.receipt.replayed).toBe(true)
    expect(wrapper.vm.outcomeUnknown).toBe(false)
  })

  it('stays pending when a retry is refused, because that does not prove the first attempt failed', async () => {
    // The original call may still be in flight and about to commit while the retry loses a race
    // or finds the plan expired. Only a receipt settles it.
    let attempts = 0
    const refusing = {
      Validate: jest.fn(() => Promise.resolve(validation({ canApply: true, blockers: [] }))),
      Apply: jest.fn(() => {
        attempts++
        return attempts === 1
          ? Promise.reject(Object.assign(new Error('network down'), { status: undefined }))
          : Promise.reject(Object.assign(new Error('plan expired'), { status: 400 }))
      }),
      GetStatus: jest.fn(() => Promise.resolve({ applied: false }))
    }
    const { wrapper, stub } = build({ service: refusing })
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    await wrapper.vm.applyPlan()
    expect(wrapper.vm.outcomeUnknown).toBe(true)

    const validateCallsBefore = stub.Validate.mock.calls.length
    await wrapper.vm.retryPendingApply()

    expect(wrapper.vm.outcomeUnknown).toBe(true)
    expect(wrapper.vm.pendingApplyRequest).not.toBeNull()
    expect(wrapper.vm.canApply).toBe(false)
    // No new plan, so no second operation id.
    expect(stub.Validate.mock.calls.length).toBe(validateCallsBefore)
  })

  it('rebuilds the plan when the very first apply is refused, which is terminal', async () => {
    const refused = {
      Validate: jest.fn(() => Promise.resolve(validation({ canApply: true, blockers: [] }))),
      Apply: jest.fn(() => Promise.reject(Object.assign(new Error('stale plan'), { status: 400 })))
    }
    const { wrapper, stub } = build({ service: refused })
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    const validateCallsBefore = stub.Validate.mock.calls.length
    await wrapper.vm.applyPlan()

    // The server answered before writing anything, so re-checking is safe here.
    expect(wrapper.vm.outcomeUnknown).toBe(false)
    expect(stub.Validate.mock.calls.length).toBeGreaterThan(validateCallsBefore)
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

    const headers = wrapper.findAll('.review thead th').wrappers.map(w => w.text())
    expect(headers).toContain('menuUpdate_channelTakeaway')
    expect(headers).toContain('menuUpdate_channelEatIn')
    expect(headers).toContain('menuUpdate_channelDelivery')

    // Scoped to the review table: the column mapping panel has its own table above it.
    const firstRow = wrapper.findAll('.review tbody tr').at(0)
    expect(firstRow.find('del').text()).toBe('240')
    expect(firstRow.find('.newprice').text()).toBe('242')
  })

  it('ignores a validate reply that belongs to an older revision of the plan', async () => {
    // A slow earlier reply must not land last and overwrite the current plan or its canApply.
    const replies = []
    const slow = {
      Validate: jest.fn(() => new Promise((resolve) => { replies.push(resolve) }))
    }
    const { wrapper } = build({ service: slow })
    wrapper.setData({
      rows: buildRows(),
      step: 2
    })

    wrapper.vm.validate()
    wrapper.vm.onPlanChanged()
    wrapper.vm.validate()

    // Resolve the newest first, then the stale one.
    replies[1](validation({ canApply: true, blockers: [], operationId: 'newest' }))
    await flush()
    replies[0](validation({ canApply: true, blockers: [], operationId: 'stale' }))
    await flush()

    expect(wrapper.vm.validation.operationId).toBe('newest')
  })

  it('keeps the operator decisions that still apply when a column mapping is corrected', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    wrapper.vm.changeAction(wrapper.vm.rows.find(r => r.rowKey === 'n:1'), 'Skip')
    wrapper.vm.setManual(wrapper.vm.rows.find(r => r.rowKey === 'n:2'), 'eatIn', '250')
    wrapper.vm.setMatchConfirmed(wrapper.vm.rows.find(r => r.rowKey === 'n:2'), true)

    wrapper.vm.setColumnKind('torshov.pdf', { label: 'Ta med' }, 'Channel')
    wrapper.vm.setColumnChannel('torshov.pdf', { label: 'Ta med' }, 'Delivery')

    await wrapper.vm.applyColumnMapping()
    await flush()

    expect(stub.Remap).toHaveBeenCalled()
    expect(stub.Analyze).toHaveBeenCalledTimes(1)

    expect(wrapper.vm.rows.find(r => r.rowKey === 'n:1').action).toBe('Skip')
    expect(wrapper.vm.rows.find(r => r.rowKey === 'n:2').manualPrices)
      .toEqual([{ channel: 'EatIn', amount: 25000 }])
    expect(wrapper.vm.rows.find(r => r.rowKey === 'n:2').matchConfirmed).toBe(true)
  })

  it('drops the plan the moment a remap starts so the old mapping cannot be applied', async () => {
    let release
    const slowRemap = {
      Validate: jest.fn(() => Promise.resolve(validation({ canApply: true, blockers: [] }))),
      Remap: jest.fn(() => new Promise((resolve) => { release = () => resolve(analysis) }))
    }
    const { wrapper } = build({ service: slowRemap })
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    expect(wrapper.vm.canApply).toBe(true)

    wrapper.vm.setDefaultChannel('torshov.pdf', 'Takeaway')
    const pending = wrapper.vm.applyColumnMapping()

    expect(wrapper.vm.validation).toBeNull()
    expect(wrapper.vm.canApply).toBe(false)

    release()
    await pending
    await flush()
  })

  it('sends the signed source metadata back so verified coverage is not lost on a remap', async () => {
    const { wrapper, stub } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    wrapper.vm.setDefaultChannel('torshov.pdf', 'Takeaway')
    await wrapper.vm.applyColumnMapping()
    await flush()

    const [, payload] = stub.Remap.mock.calls[0]
    expect(payload.sourceMetadataToken).toBe('meta-token')
    expect(payload.sourceMetadata).toEqual(analysis.sourceMetadata)
    expect(payload.sourceMappings[0].defaultChannel).toBe('Takeaway')
  })

  it('carries an uncertain match into the plan and clears it only when confirmed', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    const row = wrapper.vm.rows.find(r => r.rowKey === 'n:2')
    expect(row.sourceIssues).toContain('matchNotConfirmed')
    expect(wrapper.vm.needsMatchConfirmation(row)).toBe(true)
    expect(row.matchConfirmed).toBe(false)

    wrapper.vm.setMatchConfirmed(row, true)
    expect(row.matchConfirmed).toBe(true)
  })

  it('keeps the document text and the menu number when a row becomes a new product', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    const row = wrapper.vm.rows.find(r => r.rowKey === 'n:2')
    wrapper.vm.changeAction(row, 'Create')

    // The number and the size both stay in the name, because that is where a later import reads
    // them back from. This row is the Medium; the Stor of the same dish must not collide with it.
    expect(row.newProduct.name).toBe('2. Rabarbra Medium')
    expect(row.newProduct.description).toBe('Rorosromme, mozzarella, rabarbrakompott')
    expect(row.newProduct.otherInformation).toBe('Gluten, kumelk')
  })

  it('will not analyse an upload that breaks a limit', () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'stor.pdf', type: 'application/pdf', size: 15 * 1024 * 1024 }])

    expect(wrapper.vm.uploadTooLarge).toBe(true)
    expect(wrapper.vm.canAnalyze).toBe(false)
    expect(wrapper.vm.analysisError).toContain('menuUpdate_tooLarge')
  })

  it('reports document coverage from the checked page count, never from an undefined field', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    const verified = wrapper.vm.sourcePageSummary(wrapper.vm.analysis.sources[0])
    expect(verified).toContain('menuUpdate_sourcePagesVerified')
    expect(verified).not.toContain('undefined')

    const unchecked = wrapper.vm.sourcePageSummary({
      detectedPageCount: null, pagesReturned: 1, pages: [{ rowCount: 3 }]
    })
    expect(unchecked).toContain('menuUpdate_sourcePagesUnverified')
    expect(unchecked).not.toContain('undefined')
  })

  it('keeps each reading note distinct instead of collapsing them into one generic line', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    const messages = wrapper.vm.allSourceWarnings.map(w => w.message)

    // Three different notes, still three different lines. The useful part is what the reading
    // actually said, e.g. that product 19 is printed as 223 / 325.
    expect(new Set(messages).size).toBe(messages.length)
    expect(messages.some(m => m.includes('223 / 325'))).toBe(true)
    expect(messages.some(m => m.includes('Extra-kolonnen'))).toBe(true)

    // The localized heading introduces the note rather than replacing it.
    expect(messages[0]).toContain('T:menuUpdate_issue_documentNotice')
    expect(messages[0]).toContain('Nr. 19')
  })

  it('still localizes an issue whose message carries no information of its own', () => {
    const { wrapper } = build()

    expect(wrapper.vm.issueText({ code: 'sourceConflict', message: 'Two sources give different prices.' }))
      .toBe('T:menuUpdate_issue_sourceConflict')
    // An unknown code falls back to whatever the server said rather than showing nothing.
    expect(wrapper.vm.issueText({ code: 'somethingNew', message: 'Server text' })).toBe('Server text')
  })

  it('shows the candidate prices from the preview, not from the untouched draft', async () => {
    const previewValidation = validation({
      canApply: true,
      blockers: [],
      rows: [
        {
          rowKey: 'n:1',
          changed: true,
          productName: '1. Jungel sterk salami',
          blockers: [],
          warnings: [],
          takeaway: { channel: 'Takeaway', currentAmount: 24000, newAmount: 24200, origin: 'Source', changed: true },
          eatIn: { channel: 'EatIn', currentAmount: 26000, newAmount: 26200, origin: 'Rule', changed: true },
          delivery: { channel: 'Delivery', currentAmount: 26000, newAmount: 26000, origin: 'Unchanged', changed: false }
        },
        {
          rowKey: 'n:2',
          changed: false,
          productName: '2. Rabarbra',
          blockers: [],
          warnings: [],
          takeaway: { channel: 'Takeaway', currentAmount: 23500, newAmount: 23500, origin: 'Unchanged', changed: false },
          eatIn: { channel: 'EatIn', currentAmount: 25500, newAmount: 25500, origin: 'Unchanged', changed: false },
          delivery: { channel: 'Delivery', currentAmount: 25500, newAmount: 25500, origin: 'Unchanged', changed: false }
        }
      ]
    })

    let call = 0
    const service = {
      Validate: jest.fn(() => {
        call++
        return Promise.resolve(call === 1 ? validation() : previewValidation)
      })
    }

    const { wrapper } = build({ service })
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    wrapper.setData({ draftRules: { ...wrapper.vm.draftRules, missingChannelRule: 'SamePercent' } })
    await wrapper.vm.previewRules()
    await wrapper.vm.$nextTick()

    const diff = wrapper.vm.previewDiff
    expect(diff.productCount).toBe(1)
    expect(diff.scopeCount).toBe(2)
    expect(diff.fromRule).toBe(1)
    expect(diff.fromSource).toBe(1)
    expect(diff.rows[0].rowKey).toBe('n:1')

    // And it is actually on screen, with the real old and new amounts.
    const rendered = wrapper.find('.preview-table').text()
    expect(rendered).toContain('240')
    expect(rendered).toContain('242')
    expect(rendered).toContain('260')
    expect(rendered).toContain('262')

    // The live plan is still the committed one, so the preview only informs.
    expect(wrapper.vm.activeRules.missingChannelRule).toBe('KeepCurrent')
  })

  it('counts the preview against the scope that was previewed', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    wrapper.setData({ ruleScope: 'CheckedRows', checkedKeys: ['n:1'] })
    await wrapper.vm.previewRules()

    // Only the checked row is in scope, whatever the draft looks like now.
    expect(wrapper.vm.previewDiff.scopeCount).toBe(1)
  })

  it('has no preview to show before one has been asked for', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    expect(wrapper.vm.previewDiff).toBeNull()
    expect(wrapper.find('.preview').exists()).toBe(false)
  })

  it('keeps every wide table inside a bounded scroll container', async () => {
    // The mapping and preview tables are wider than a phone. They have to scroll within their
    // own panel rather than stretching the page sideways.
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()
    await wrapper.vm.$nextTick()

    const tables = wrapper.findAll('table').wrappers
    expect(tables.length).toBeGreaterThan(0)
    tables.forEach((table) => {
      expect(table.element.closest('.tablewrap')).not.toBeNull()
    })
  })

  it('leads a matched row with the catalogue product name, not the menu paragraph', async () => {
    // The real menus print a number and an ingredient list and no dish name, so the extracted
    // name is a paragraph. Leading with it filled the product column and made rows 200px tall.
    const ingredients = 'Rorosromme, mozzarella, rabarbrakompott, sjalottlok, spekepolse av lam og storfe, parmesan'
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    const row = wrapper.vm.rows.find(r => r.rowKey === 'n:2')
    row.displayName = ingredients

    expect(wrapper.vm.rowPrimaryName(row)).toBe('2. Rabarbra')
    // The menu's own wording is kept, as secondary context rather than as the heading.
    expect(wrapper.vm.rowSourceText(row)).toBe(ingredients)
    // And "linked to X" is not repeated once the name itself is X.
    expect(wrapper.vm.rowLinkText(row)).toBe('')
    // The catalogue name already starts with the number, so it is not prefixed again.
    expect(wrapper.vm.rowNumberPrefix(row)).toBe('')
  })

  it('prefixes the menu number only when the name does not already carry one', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()
    await wrapper.vm.$nextTick()

    const numbered = wrapper.vm.rows.find(r => r.rowKey === 'n:1')
    expect(wrapper.vm.rowPrimaryName(numbered)).toBe('1. Jungel sterk salami')
    expect(wrapper.vm.rowNumberPrefix(numbered)).toBe('')

    // Rendered once, not twice.
    const cell = wrapper.findAll('.review tbody tr').at(0).find('.col-product strong').text()
    expect(cell).toContain('1. Jungel sterk salami')
    expect(cell).not.toContain('1. 1.')

    // A catalogue product with no number of its own still gets the menu number in front.
    const unnumbered = { ...numbered, menuNumber: '7', targetProductId: null, displayName: 'Cola 0,5' }
    expect(wrapper.vm.rowPrimaryName(unnumbered)).toBe('Cola 0,5')
    expect(wrapper.vm.rowNumberPrefix(unnumbered)).toBe('7.')

    // And a row with no menu number at all gets no prefix.
    expect(wrapper.vm.rowNumberPrefix({ ...unnumbered, menuNumber: '' })).toBe('')
  })

  it('falls back to the menu wording when there is no catalogue product to name', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    const row = wrapper.vm.rows.find(r => r.rowKey === 'n:2')
    wrapper.vm.changeAction(row, 'Create')

    expect(wrapper.vm.rowPrimaryName(row)).toBe('Rabarbra')
    // Nothing is duplicated underneath when the heading is already the menu's wording.
    expect(wrapper.vm.rowSourceText(row)).toBe('')
    expect(wrapper.vm.rowLinkText(row)).toBe('menuUpdate_willCreate')
  })

  it('gives every review column an explicit class so widths do not depend on position', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()
    await wrapper.vm.$nextTick()

    const headers = wrapper.findAll('.review thead th').wrappers.map(w => w.attributes('class'))
    expect(headers).toEqual(['col-product', 'col-suggestion', 'col-price', 'col-price', 'col-price', 'col-action'])

    const firstRow = wrapper.findAll('.review tbody tr').at(0)
    expect(firstRow.find('.col-product').exists()).toBe(true)
    expect(firstRow.find('.col-action select').exists()).toBe(true)

    // The amounts stay together while the provenance beside them is free to wrap.
    expect(firstRow.find('.col-price .amounts').exists()).toBe(true)
    expect(firstRow.find('.col-price .origin.clamp').exists()).toBe(true)
  })

  // ---------------------------------------------------------------- waiting for the reading

  const pdf = () => ({ name: 'torshov.pdf', type: 'application/pdf', size: 1000 })

  /** A promise the test settles by hand, to hold a request open or fail it late. */
  const deferred = () => {
    const box = {}
    box.promise = new Promise((resolve, reject) => { box.resolve = resolve; box.reject = reject })
    return box
  }

  // A run that never settles, so the screen can be inspected mid-wait.
  const buildWaiting = (overrides = {}) => build({
    service: { Analyze: jest.fn(() => new Promise(() => {})), ...overrides }
  })

  const startAnalysis = async (wrapper) => {
    wrapper.vm.addFiles([pdf()])
    wrapper.vm.runAnalysis()
    await wrapper.vm.$nextTick()
  }

  describe('while an analysis is running', () => {
    beforeEach(() => { jest.useFakeTimers() })
    afterEach(() => { jest.useRealTimers() })

    it('measures the upload and says so', async () => {
      const { wrapper } = buildWaiting()
      await startAnalysis(wrapper)

      wrapper.vm.uploadPercent = 40
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.analysisPhase).toBe('uploading')
      expect(wrapper.find('.progress-bar').exists()).toBe(true)
      expect(wrapper.find('.progress-bar').attributes('aria-valuenow')).toBe('40')
      expect(wrapper.text()).toContain('menuUpdate_uploading:{"percent":40}')
      expect(wrapper.find('.reading-spinner').exists()).toBe(false)
    })

    it('drops the bar for a spinner once the reading starts, with no percentage left on screen', async () => {
      const { wrapper } = buildWaiting()
      await startAnalysis(wrapper)

      wrapper.setData({ analysisPhase: 'reading' })
      await wrapper.vm.$nextTick()

      // Nothing that could be read as a finished job, and nothing that predicts an end.
      expect(wrapper.find('.progress-bar').exists()).toBe(false)
      expect(wrapper.find('.reading-spinner').exists()).toBe(true)
      expect(wrapper.text()).toContain('menuUpdate_readingWithAi')
      expect(wrapper.text()).not.toContain('menuUpdate_uploading')
      expect(wrapper.text()).not.toContain('%')
    })

    it('switches to the reading phase on the bytes, not on a percentage that rounds to 100', async () => {
      const { wrapper, stub } = buildWaiting()
      await startAnalysis(wrapper)

      const onUploadProgress = stub.Analyze.mock.calls[0][2].onUploadProgress

      // 99.6 % rounds to 100 while the last bytes are still going out, so it is held at 99.
      onUploadProgress({ loaded: 996, total: 1000 })
      expect(wrapper.vm.uploadPercent).toBe(99)
      expect(wrapper.vm.analysisPhase).toBe('uploading')

      onUploadProgress({ loaded: 1000, total: 1000 })
      expect(wrapper.vm.uploadPercent).toBe(100)
      expect(wrapper.vm.analysisPhase).toBe('reading')
    })

    it('ignores upload progress from a run the operator has left behind', async () => {
      const { wrapper, stub } = buildWaiting()
      await startAnalysis(wrapper)

      const stale = stub.Analyze.mock.calls[0][2].onUploadProgress
      wrapper.vm.requestGeneration++

      stale({ loaded: 1000, total: 1000 })

      expect(wrapper.vm.analysisPhase).toBe('uploading')
      expect(wrapper.vm.uploadPercent).toBe(0)
    })

    it('counts the seconds that actually passed', async () => {
      const started = 1757000000000
      const now = jest.spyOn(Date, 'now').mockReturnValue(started)

      const { wrapper } = buildWaiting()
      await startAnalysis(wrapper)

      expect(wrapper.vm.analysisElapsedSeconds).toBe(0)

      // A throttled tab wakes up once after five seconds rather than five times.
      now.mockReturnValue(started + 5000)
      jest.advanceTimersByTime(1000)
      expect(wrapper.vm.analysisElapsedSeconds).toBe(5)

      now.mockRestore()
    })

    it('explains a long wait without promising when it ends', async () => {
      const started = 1757000000000
      const now = jest.spyOn(Date, 'now').mockReturnValue(started)

      const { wrapper } = buildWaiting()
      await startAnalysis(wrapper)
      wrapper.setData({ analysisPhase: 'reading' })

      now.mockReturnValue(started + 19000)
      jest.advanceTimersByTime(1000)
      await wrapper.vm.$nextTick()
      expect(wrapper.vm.analysisIsTakingLong).toBe(false)
      expect(wrapper.find('.long-wait').exists()).toBe(false)

      now.mockReturnValue(started + 20000)
      jest.advanceTimersByTime(1000)
      await wrapper.vm.$nextTick()
      expect(wrapper.find('.long-wait').text()).toContain('menuUpdate_readingTakingLonger')

      now.mockRestore()
    })

    it('never announces the ticking seconds to a screen reader', async () => {
      const { wrapper } = buildWaiting()
      await startAnalysis(wrapper)
      wrapper.setData({ analysisPhase: 'reading' })
      await wrapper.vm.$nextTick()

      // The container is not a live region, and the one part that changes every second says so
      // itself, so it can still be read on demand without being announced each tick. Only the
      // phase and the long-wait notice speak.
      expect(wrapper.find('.progress').attributes('role')).toBeUndefined()

      const elapsed = wrapper.findAll('.reading-body small').at(0)
      expect(elapsed.text()).toContain('menuUpdate_readingElapsed')
      expect(elapsed.attributes('aria-live')).toBe('off')
      expect(elapsed.attributes('aria-hidden')).toBeUndefined()
      expect(wrapper.find('.reading-body strong').attributes('role')).toBe('status')
    })

    it('stops the clock and the wait when the operator moves to another store', async () => {
      window.alert = jest.fn()
      const { wrapper } = buildWaiting()
      await startAnalysis(wrapper)

      wrapper.vm.onStoreChanged()

      expect(wrapper.vm.analysisTimer).toBeNull()
      expect(wrapper.vm.isAnalyzing).toBe(false)
      expect(wrapper.vm.analysisPhase).toBe('idle')
      expect(wrapper.vm.analysisElapsedSeconds).toBe(0)
    })

    it('stops the clock when the page goes away mid-reading', async () => {
      const { wrapper } = buildWaiting()
      await startAnalysis(wrapper)

      expect(wrapper.vm.analysisTimer).not.toBeNull()

      wrapper.destroy()

      expect(clearInterval).toHaveBeenCalled()
    })
  })

  describe('when an analysis ends', () => {
    it('stops the clock once the reading finishes', async () => {
      const { wrapper } = build()
      wrapper.vm.addFiles([pdf()])

      await wrapper.vm.runAnalysis()
      await flush()

      expect(wrapper.vm.analysisTimer).toBeNull()
      expect(wrapper.vm.analysisPhase).toBe('idle')
      expect(wrapper.find('.reading-spinner').exists()).toBe(false)
    })

    it('stops the clock when the reading fails', async () => {
      const { wrapper } = build({
        service: { Analyze: jest.fn(() => Promise.reject(new Error('boom'))) }
      })
      wrapper.vm.addFiles([pdf()])

      await wrapper.vm.runAnalysis()
      await flush()

      expect(wrapper.vm.analysisError).toBe('boom')
      expect(wrapper.vm.analysisTimer).toBeNull()
      expect(wrapper.vm.analysisPhase).toBe('idle')
    })

    it('leaves a later run counting when an abandoned one settles', async () => {
      // The operator switches store while a reading is running and starts another one. The
      // first request then rejects, late, and must not stop the clock the second run owns.
      window.alert = jest.fn()

      const first = deferred()
      const { wrapper, stub } = build({
        service: {
          Analyze: jest.fn()
            .mockImplementationOnce(() => first.promise)
            .mockImplementationOnce(() => new Promise(() => {}))
        }
      })

      await startAnalysis(wrapper)
      const firstTimer = wrapper.vm.analysisTimer
      expect(firstTimer).not.toBeNull()

      wrapper.vm.onStoreChanged()
      await startAnalysis(wrapper)

      expect(stub.Analyze).toHaveBeenCalledTimes(2)
      const secondTimer = wrapper.vm.analysisTimer
      expect(secondTimer).not.toBeNull()
      expect(secondTimer).not.toBe(firstTimer)

      first.reject(Object.assign(new Error('cancelled'), { cancelled: true }))
      await flush()

      expect(wrapper.vm.analysisTimer).toBe(secondTimer)
      expect(wrapper.vm.isAnalyzing).toBe(true)
      expect(wrapper.vm.analysisPhase).not.toBe('idle')
    })
  })

  it('keeps the column classes aligned when the checkbox column appears', async () => {
    const { wrapper } = build()
    wrapper.vm.addFiles([{ name: 'torshov.pdf', type: 'application/pdf', size: 1000 }])
    await wrapper.vm.runAnalysis()
    await flush()

    wrapper.setData({ ruleScope: 'CheckedRows' })
    await wrapper.vm.$nextTick()

    const headers = wrapper.findAll('.review thead th').wrappers.map(w => w.attributes('class'))
    expect(headers[0]).toBe('col-select')
    expect(headers[1]).toBe('col-product')

    const firstRow = wrapper.findAll('.review tbody tr').at(0)
    expect(firstRow.findAll('td').at(0).attributes('class')).toBe('col-select')
    expect(firstRow.findAll('td').at(1).attributes('class')).toBe('col-product')
  })
})
