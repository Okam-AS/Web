import { shallowMount } from '@vue/test-utils'
// eslint-disable-next-line import/first -- the mocks must be registered before the page is imported.
import MarginPriceImportsPage from '~/pages/admin/margin-price-imports.vue'
import { MarginApiError } from '~/utils/margin/api-client'

const calls = []
const script = {}

jest.mock('~/utils/margin/price-import-client', () => ({
  MarginPriceImportService: class {
    GetStatus (storeId) {
      calls.push(['GetStatus', storeId])
      return script.status ? script.status() : Promise.resolve({ storeId, flags: { module: true, priceImport: true } })
    }

    ListImports (storeId) {
      calls.push(['ListImports', storeId])
      return script.imports ? script.imports() : Promise.resolve({ imports: [] })
    }

    UploadCsv (_storeId, supplierId, file) {
      calls.push(['UploadCsv', supplierId, file && file.name])
      return script.upload ? script.upload() : Promise.resolve(mockBatchDetail())
    }

    GetImport (_storeId, batchId) {
      calls.push(['GetImport', batchId])
      return script.get ? script.get() : Promise.resolve(mockBatchDetail())
    }

    SetMappings (_storeId, batchId, rows) {
      calls.push(['SetMappings', batchId, rows])
      return script.mappings ? script.mappings(rows) : Promise.resolve(mockBatchDetail())
    }

    ApproveImport (_storeId, batchId) {
      calls.push(['ApproveImport', batchId])
      return script.approve ? script.approve() : Promise.resolve({ batchId, state: 'Applied' })
    }

    DownloadTemplate (storeId) {
      calls.push(['DownloadTemplate', storeId])
      return script.template ? script.template() : Promise.resolve('ArticleNumber;Price\r\n')
    }
  }
}))

jest.mock('~/utils/margin/supplier-client', () => ({
  MarginSupplierService: class {
    ListSuppliers (storeId) {
      calls.push(['ListSuppliers', storeId])
      return script.suppliers ? script.suppliers() : Promise.resolve([{ supplierId: 's-1', name: 'Grossisten AS', status: 'Active' }])
    }

    ListItems (_storeId, supplierId) {
      calls.push(['ListItems', supplierId])
      return script.items
        ? script.items(supplierId)
        : Promise.resolve([{ supplierItemId: 'si-1', name: 'Tomat 10 kg', supplierArticleNumber: '12345' }])
    }
  }
}))

function mockBatchDetail (overrides) {
  return Object.assign({
    batchId: 'b-1',
    supplierId: null,
    fileName: 'priser-mars.csv',
    fileSha256: 'a1b2c3d4e5f6' + '0'.repeat(52),
    state: 'Mapping',
    rowCount: 2,
    mappedCount: 1,
    skippedCount: 0,
    pendingCount: 1,
    errorCount: 1,
    uploadedAtUtc: '2026-03-01T09:00:00',
    appliedAtUtc: null,
    isDuplicateOfExistingBatch: false,
    rows: [
      { id: 'r-1', rowNumber: 1, articleNumber: '12345', name: 'Tomat', priceMinor: 4990, currency: 'NOK', unitCode: 'kg', proposedSupplierItemId: 'si-1', resolvedSupplierItemId: 'si-1', resolution: 'Mapped', rowError: null },
      { id: 'r-2', rowNumber: 2, articleNumber: '67890', name: 'Løk', priceMinor: null, currency: null, unitCode: 'kg', proposedSupplierItemId: null, resolvedSupplierItemId: null, resolution: 'Pending', rowError: 'The row states no currency, and none is assumed.' }
    ]
  }, overrides)
}

const settled = () => new Promise(resolve => setTimeout(resolve, 0))

function mountPage () {
  return shallowMount(MarginPriceImportsPage, {
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

describe('THE TWO FLAGS — one 404 answers three different questions', () => {
  test('the master flag off is the module being invisible', async () => {
    script.status = () => Promise.resolve({ flags: { module: false, priceImport: false } })
    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrg_module_off')
    expect(calls.map(call => call[0])).toEqual(['GetStatus'])
  })

  test('the STAGE flag off is its own sentence — the module works, this part is not in use', async () => {
    // Without `GET /margin/status` this would be indistinguishable from a broken page: every import
    // route answers the same opaque 404.
    script.status = () => Promise.resolve({ flags: { module: true, priceImport: false } })
    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrg_imp_stage_off')
    expect(calls.map(call => call[0])).toEqual(['GetStatus'])
  })

  test('a failed status read is unknown, and claims nothing about either flag', async () => {
    script.status = () => Promise.reject(new MarginApiError(503, { detail: 'down' }))
    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('[data-test="blocker"]').text()).toBe('mrg_status_unknown')
  })

  test('with both flags on, the batches and the suppliers load', async () => {
    const wrapper = mountPage()
    await settled()

    expect(wrapper.find('[data-test="blocker"]').exists()).toBe(false)
    expect(calls.map(call => call[0])).toEqual(expect.arrayContaining(['ListImports', 'ListSuppliers']))
  })
})

describe('the upload', () => {
  test('carries the chosen supplier scope, or none at all', async () => {
    const wrapper = mountPage()
    await settled()

    wrapper.setData({ file: { name: 'priser.csv' } })
    await wrapper.vm.upload()
    await settled()
    expect(calls.find(call => call[0] === 'UploadCsv')[1]).toBeNull()

    calls.length = 0
    wrapper.setData({ file: { name: 'priser.csv' }, supplierScope: 's-1' })
    await wrapper.vm.upload()
    await settled()
    expect(calls.find(call => call[0] === 'UploadCsv')[1]).toBe('s-1')
  })

  test('refuses before the request when no file is picked', async () => {
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.upload()
    expect(wrapper.vm.uploadError).toBe('mrg_imp_err_no_file')
    expect(calls.map(call => call[0])).not.toContain('UploadCsv')
  })

  test('a MALFORMED file surfaces the server’s own refusal, which names the missing column', async () => {
    const detail = 'The CSV header is missing a required column. Expected at least an article-number column and a price column (e.g. \'ArticleNumber;Name;Price;Currency;Unit\').'
    script.upload = () => Promise.reject(new MarginApiError(400, { title: 'Bad Request', detail }))
    const wrapper = mountPage()
    await settled()

    wrapper.setData({ file: { name: 'us-format.csv' } })
    await wrapper.vm.upload()
    await settled()

    // Rendered through `mrg_err_server_detail`, so the venue reads the server's words rather than
    // "something went wrong" — the only sentence that says which column is missing.
    expect(wrapper.vm.failure).toBe('mrg_err_server_detail')
    expect(wrapper.vm.batch).toBeNull()
  })

  test('THE DUPLICATE IS NOT A FAILURE: no banner, and the original batch is shown', async () => {
    // Journey L04: identical bytes, no second batch, no second price effect.
    script.upload = () => Promise.resolve(mockBatchDetail({
      isDuplicateOfExistingBatch: true,
      state: 'Applied',
      appliedAtUtc: '2026-03-01T10:00:00',
      pendingCount: 0
    }))
    const wrapper = mountPage()
    await settled()

    wrapper.setData({ file: { name: 'priser-mars.csv' } })
    await wrapper.vm.upload()
    await settled()

    expect(wrapper.vm.failure).toBe('')
    expect(wrapper.vm.batch.isDuplicate).toBe(true)
    expect(wrapper.vm.batch.batchId).toBe('b-1')
    // And it cannot be approved a second time either.
    expect(wrapper.vm.batch.canApprove).toBe(false)
    expect(wrapper.vm.batch.approveBlocker).toBe('applied')
  })
})

describe('the mapping picker', () => {
  test('an unscoped batch offers items from every supplier, labelled with which', async () => {
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.selectBatch('b-1')
    await settled()

    expect(wrapper.vm.mappableItems).toEqual([
      { supplierItemId: 'si-1', name: 'Tomat 10 kg', supplierArticleNumber: '12345', supplierName: 'Grossisten AS' }
    ])
  })

  test('a supplier-scoped batch reads ONLY that supplier’s items', async () => {
    // The server refuses a mapping outside the batch's supplier scope, so a wider picker would be
    // offering choices that come back as a refusal.
    script.get = () => Promise.resolve(mockBatchDetail({ supplierId: 's-1' }))
    const wrapper = mountPage()
    await settled()

    calls.length = 0
    await wrapper.vm.selectBatch('b-1')
    await settled()

    expect(calls.filter(call => call[0] === 'ListItems')).toEqual([['ListItems', 's-1']])
  })

  test('a supplier whose items fail to load is left out rather than shown as selling nothing', async () => {
    script.items = () => Promise.reject(new MarginApiError(500, { detail: 'boom' }))
    const wrapper = mountPage()
    await settled()

    await wrapper.vm.selectBatch('b-1')
    await settled()

    expect(wrapper.vm.mappableItems).toEqual([])
  })
})

describe('approve', () => {
  test('is blocked while a row is unresolved, and the model says which condition failed', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectBatch('b-1')
    await settled()

    expect(wrapper.vm.batch.canApprove).toBe(false)
    expect(wrapper.vm.batch.approveBlocker).toBe('pending')
  })

  test('RE-READS the batch afterwards, because the approve response carries no rows', async () => {
    script.get = () => Promise.resolve(mockBatchDetail({ pendingCount: 0, skippedCount: 1 }))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectBatch('b-1')
    await settled()

    calls.length = 0
    await wrapper.vm.approve()
    await settled()

    expect(calls.map(call => call[0])).toEqual(expect.arrayContaining(['ApproveImport', 'GetImport', 'ListImports']))
    // The table did not empty itself at the moment of success.
    expect(wrapper.vm.batch.rows).toHaveLength(2)
  })

  test('an unresolved-rows refusal from the server is shown in its own words', async () => {
    const detail = '3 row(s) are unresolved; map or skip every row before approving this import.'
    script.approve = () => Promise.reject(new MarginApiError(400, { title: 'Bad Request', detail }))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectBatch('b-1')
    await settled()

    await wrapper.vm.approve()
    await settled()

    expect(wrapper.vm.failure).toBe('mrg_err_server_detail')
  })
})

describe('the mappings save', () => {
  test('sends every row, so what is stored is what is on screen', async () => {
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectBatch('b-1')
    await settled()

    await wrapper.vm.saveMappings([
      { rowId: 'r-1', resolution: 'Mapped', resolvedSupplierItemId: 'si-1' },
      { rowId: 'r-2', resolution: 'Skipped', resolvedSupplierItemId: null }
    ])
    await settled()

    expect(calls.find(call => call[0] === 'SetMappings')[2]).toHaveLength(2)
  })

  test('a per-row refusal names the row, and that prose reaches the screen', async () => {
    const detail = 'Row 2 cannot be mapped while it carries an error; skip it instead.'
    script.mappings = () => Promise.reject(new MarginApiError(400, { title: 'Bad Request', detail }))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.selectBatch('b-1')
    await settled()

    await wrapper.vm.saveMappings([{ rowId: 'r-2', resolution: 'Mapped', resolvedSupplierItemId: 'si-1' }])
    await settled()

    expect(wrapper.vm.failure).toBe('mrg_err_server_detail')
  })
})

describe('the template', () => {
  test('is fetched with the token and handed to the browser as a download', async () => {
    // A plain `<a href>` cannot carry the bearer token every Margin route needs.
    const createObjectURL = jest.fn().mockReturnValue('blob:x')
    const revokeObjectURL = jest.fn()
    global.URL.createObjectURL = createObjectURL
    global.URL.revokeObjectURL = revokeObjectURL
    // jsdom implements no navigation, so the anchor's own click is stubbed — and stubbing it is also
    // what lets the file name be asserted, which is the part a venue sees.
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      expect(this.download).toBe('margin-price-import-template.csv')
      expect(this.href).toBe('blob:x')
    })

    const wrapper = mountPage()
    await settled()
    await wrapper.vm.downloadTemplate()
    await settled()

    expect(calls).toContainEqual(['DownloadTemplate', 42])
    expect(createObjectURL).toHaveBeenCalled()
    expect(click).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x')
    expect(wrapper.vm.failure).toBe('')
    click.mockRestore()
  })

  test('a refused download renders as a failure instead of saving an error document', async () => {
    script.template = () => Promise.reject(new MarginApiError(404, { code: 'margin.not-found', detail: 'nope' }))
    const wrapper = mountPage()
    await settled()
    await wrapper.vm.downloadTemplate()
    await settled()

    expect(wrapper.vm.failure).toBe('mrg_err_not_found')
  })
})
