import { MarginPriceImportService } from '~/utils/margin/price-import-client'
import { describeMarginFailure } from '~/utils/margin/failure'
import { MarginApiError, MARGIN_NOT_FOUND, MARGIN_UNATTRIBUTED } from '~/utils/margin/api-client'

// Route-for-route with `MarginPriceImportsController`, plus the two things this surface does that no
// other Margin client does: a multipart upload and a `text/csv` download.
describe('MarginPriceImportService', () => {
  const originalFetch = global.fetch
  const STORE = 42
  const BATCH = '44444444-4444-4444-4444-444444444444'
  const SUPPLIER = '11111111-1111-1111-1111-111111111111'

  function respondWith (status, body, asText) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(asText ? body : JSON.stringify(body))
    })
  }

  const service = () => new MarginPriceImportService({ bearerToken: 'tok-123' })
  const csvFile = () => new File(['ArticleNumber;Price\r\n12345;49,90\r\n'], 'priser.csv', { type: 'text/csv' })

  afterEach(() => { global.fetch = originalFetch })

  test('the list, the detail, the mappings and the approve all bind the store scope', async () => {
    respondWith(200, { imports: [] })
    await service().ListImports(STORE)
    expect(global.fetch.mock.calls[0][0]).toBe('/margin/price-imports?storeId=42')

    respondWith(200, { batchId: BATCH })
    await service().GetImport(STORE, BATCH)
    expect(global.fetch.mock.calls[0][0]).toBe('/margin/price-imports/' + BATCH + '?storeId=42')

    respondWith(200, { batchId: BATCH })
    await service().SetMappings(STORE, BATCH, [{ rowId: 'r-1', resolution: 'Skipped', resolvedSupplierItemId: null }])
    const [mappingUrl, mappingInit] = global.fetch.mock.calls[0]
    expect(mappingUrl).toBe('/margin/price-imports/' + BATCH + '/mappings?storeId=42')
    expect(mappingInit.method).toBe('PUT')
    expect(JSON.parse(mappingInit.body).rows).toHaveLength(1)

    respondWith(200, { batchId: BATCH, state: 'Applied' })
    await service().ApproveImport(STORE, BATCH)
    const [approveUrl, approveInit] = global.fetch.mock.calls[0]
    expect(approveUrl).toBe('/margin/price-imports/' + BATCH + '/approve?storeId=42')
    expect(approveInit.method).toBe('POST')
  })

  test('NO mutation on this surface carries an If-Match — the controller asks for none', async () => {
    respondWith(200, { batchId: BATCH })
    await service().SetMappings(STORE, BATCH, [])
    expect(global.fetch.mock.calls[0][1].headers['If-Match']).toBeUndefined()

    respondWith(200, { batchId: BATCH })
    await service().ApproveImport(STORE, BATCH)
    expect(global.fetch.mock.calls[0][1].headers['If-Match']).toBeUndefined()
  })

  describe('the upload', () => {
    test('is multipart, and sets NO Content-Type so the browser can write the boundary', async () => {
      // A hand-written `multipart/form-data` header omits the boundary, and then the form binder
      // finds no file — the endpoint answers "A CSV file is required." about a file that was there.
      respondWith(200, { batchId: BATCH })
      await service().UploadCsv(STORE, null, csvFile())

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/price-imports?storeId=42')
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBeUndefined()
      expect(init.headers.Authorization).toBe('Bearer tok-123')
      expect(init.body instanceof FormData).toBe(true)
      expect(init.body.get('file')).toBeTruthy()
    })

    test('omits the supplier scope entirely when there is none', async () => {
      // An empty string binds to `Guid?` as a model-state failure, which would turn the NORMAL case
      // — a file that may span suppliers — into a 400 about a field the venue left blank.
      respondWith(200, { batchId: BATCH })
      await service().UploadCsv(STORE, null, csvFile())
      expect(global.fetch.mock.calls[0][1].body.get('supplierId')).toBeNull()

      respondWith(200, { batchId: BATCH })
      await service().UploadCsv(STORE, SUPPLIER, csvFile())
      expect(global.fetch.mock.calls[0][1].body.get('supplierId')).toBe(SUPPLIER)
    })

    test('THE DUPLICATE ARRIVES AS A SUCCESS, not as a throw', async () => {
      // Journey L04. The client must not turn a 200 carrying `isDuplicateOfExistingBatch` into an
      // error, or the surface would report a no-op as a breakage.
      respondWith(200, { batchId: BATCH, state: 'Applied', isDuplicateOfExistingBatch: true })
      const detail = await service().UploadCsv(STORE, null, csvFile())
      expect(detail.isDuplicateOfExistingBatch).toBe(true)
      expect(detail.batchId).toBe(BATCH)
    })

    test('a malformed file is a typed failure carrying the server’s own explanation', async () => {
      const detail = 'The CSV header is missing a required column. Expected at least an article-number column and a price column.'
      respondWith(400, { title: 'Bad Request', status: 400, detail })
      const error = await service().UploadCsv(STORE, null, csvFile()).catch(e => e)
      expect(error.status).toBe(400)
      expect(error.problem.detail).toBe(detail)
    })
  })

  describe('the template', () => {
    test('comes back as raw CSV text rather than being parsed as JSON', async () => {
      const csv = 'ArticleNumber;Name;Price;Currency;Unit\r\n12345;Sample ingredient;49,90;NOK;kg\r\n'
      respondWith(200, csv, true)
      const body = await service().DownloadTemplate(STORE)

      expect(global.fetch.mock.calls[0][0]).toBe('/margin/price-imports/template?storeId=42')
      expect(body).toBe(csv)
    })

    test('a REFUSED download is still a typed failure — never saved as a .csv', async () => {
      respondWith(404, { code: MARGIN_NOT_FOUND, detail: 'nope' })
      const error = await service().DownloadTemplate(STORE).catch(e => e)
      expect(error.status).toBe(404)
      expect(error.code).toBe(MARGIN_NOT_FOUND)
    })
  })
})

// The rule these two surfaces render failures by. It is deliberately different from the recipes
// page's, because the refusals that matter here carry no code at all.
describe('describeMarginFailure', () => {
  test('a known code renders translated copy', () => {
    expect(describeMarginFailure(new MarginApiError(404, { code: MARGIN_NOT_FOUND, detail: 'x' })))
      .toEqual({ key: 'mrg_err_not_found', params: {} })
    expect(describeMarginFailure(new MarginApiError(401, { code: MARGIN_UNATTRIBUTED, detail: 'x' })))
      .toEqual({ key: 'mrg_err_unattributed', params: {} })
  })

  test('an UNCODED refusal carries the server’s prose through verbatim', () => {
    const detail = '3 row(s) are unresolved; map or skip every row before approving this import.'
    expect(describeMarginFailure(new MarginApiError(400, { title: 'Bad Request', detail })))
      .toEqual({ key: 'mrg_err_server_detail', params: { detail } })
  })

  test('an UNKNOWN code with prose still informs rather than falling back to "something went wrong"', () => {
    const detail = 'Some future rule refused this.'
    expect(describeMarginFailure(new MarginApiError(400, { code: 'margin.some-future-code', detail })))
      .toEqual({ key: 'mrg_err_server_detail', params: { detail } })
  })

  test('only a failure with nothing to say falls through to the generic sentence', () => {
    expect(describeMarginFailure(new MarginApiError(500, {}))).toEqual({ key: 'mrg_err_generic', params: {} })
    expect(describeMarginFailure(new MarginApiError(400, { title: 'Bad Request' }))).toEqual({ key: 'mrg_err_generic', params: {} })
    expect(describeMarginFailure(new TypeError('network down'))).toEqual({ key: 'mrg_err_generic', params: {} })
  })

  test('a blank detail is not prose', () => {
    expect(describeMarginFailure(new MarginApiError(400, { detail: '   ' }))).toEqual({ key: 'mrg_err_generic', params: {} })
  })
})
