import {
  MarginStatementService,
  assertBusinessDate,
  isMondayDate,
  mondayOfWeek,
  isUncodedRefusal
} from '~/utils/margin/statement-client'
import { MarginApiError, isMarginApiError, MARGIN_NOT_FOUND } from '~/utils/margin/api-client'

// The client is route-for-route with the backend, so these assert the wire contract: the exact paths
// and query `MarginStatementsController`, `MarginCoverageController`, `MarginSuppliersController` and
// `MarginProjectionController` bind, the mandatory `If-Match` on the THREE aggregate mutations and its
// absence on the create, the `yyyy-MM-dd` calendar-date form every date on this surface must take, and
// the `text/csv` read that does not go through the JSON path.
describe('MarginStatementService', () => {
  const originalFetch = global.fetch
  const STORE = 42
  const ID = 'f3000000-0000-0000-0000-000000000001'
  // Monday 6 July 2026 — the proven journey's own week start.
  const MONDAY = '2026-07-06'

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body)),
      headers: { get: () => null }
    })
  }

  function respondWithCsv (status, text, disposition) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(text),
      headers: { get: name => (/content-disposition/i.test(name) ? disposition || null : null) }
    })
  }

  function service () {
    return new MarginStatementService({ bearerToken: 'tok-123' })
  }

  afterEach(() => { global.fetch = originalFetch })

  describe('routes', () => {
    test('ListStatements hits GET /margin/statements with the store scope and no window', async () => {
      respondWith(200, { storeId: STORE, statements: [] })
      await service().ListStatements(STORE)

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/statements?storeId=42')
      expect(init.method).toBe('GET')
      expect(init.headers.Authorization).toBe('Bearer tok-123')
    })

    test('ListStatements passes the window as plain calendar dates', async () => {
      respondWith(200, { storeId: STORE, statements: [] })
      await service().ListStatements(STORE, '2026-06-01', '2026-07-31')
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/statements?from=2026-06-01&to=2026-07-31&storeId=42')
    })

    test('GetStatement, inputs, recalculate, finalize and export all hang off the statement id', async () => {
      const base = '/margin/statements/' + ID

      respondWith(200, {})
      await service().GetStatement(STORE, ID)
      expect(global.fetch.mock.calls[0][0]).toBe(base + '?storeId=42')

      respondWith(200, {})
      await service().SetInputs(STORE, ID, { spendEntries: [] }, 'rev')
      expect(global.fetch.mock.calls[0][0]).toBe(base + '/inputs?storeId=42')
      expect(global.fetch.mock.calls[0][1].method).toBe('PUT')

      respondWith(200, {})
      await service().Recalculate(STORE, ID, 'rev')
      expect(global.fetch.mock.calls[0][0]).toBe(base + '/recalculate?storeId=42')
      expect(global.fetch.mock.calls[0][1].method).toBe('POST')

      respondWith(200, {})
      await service().Finalize(STORE, ID, 'rev')
      expect(global.fetch.mock.calls[0][0]).toBe(base + '/finalize?storeId=42')
      expect(global.fetch.mock.calls[0][1].method).toBe('POST')

      respondWithCsv(200, 'a,b\n')
      await service().ExportCsv(STORE, ID)
      expect(global.fetch.mock.calls[0][0]).toBe(base + '/export?storeId=42')
    })

    test('GetCoverage hits its own controller with a required inclusive window', async () => {
      respondWith(200, { storeId: STORE })
      await service().GetCoverage(STORE, MONDAY, '2026-07-12')
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/coverage?from=2026-07-06&to=2026-07-12&storeId=42')
    })

    test('ListSuppliers hits the supplier surface and asks for no archived rows', async () => {
      respondWith(200, [])
      await service().ListSuppliers(STORE)
      // `includeArchived` defaults false server-side; sending it would be restating a default.
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/suppliers?storeId=42')
    })

    test('RebuildProjection hits the PowerUser-only repair route', async () => {
      respondWith(200, { factsAppended: 0 })
      await service().RebuildProjection(STORE)
      expect(global.fetch.mock.calls[0][0]).toBe('/margin/projection/rebuild?storeId=42')
      expect(global.fetch.mock.calls[0][1].method).toBe('POST')
    })
  })

  // THE PAIR. Margin's mutation contract is not uniform: a create has no prior revision to guard and
  // the controller does not ask for one, while the three aggregate mutations are refused outright
  // without `If-Match`. Asserting both makes the distinction real rather than a header that happens
  // to be present.
  describe('the If-Match contract, both halves', () => {
    test('CreateStatement sends the week start and NO If-Match', async () => {
      respondWith(200, { statementId: ID })
      await service().CreateStatement(STORE, MONDAY)

      const [url, init] = global.fetch.mock.calls[0]
      expect(url).toBe('/margin/statements?storeId=42')
      expect(init.method).toBe('POST')
      expect(JSON.parse(init.body)).toEqual({ weekStart: MONDAY })
      expect(init.headers['If-Match']).toBeUndefined()
      // Margin has no idempotency store. A header implying a replay guarantee the server does not make
      // is worse than no header.
      expect(init.headers['Idempotency-Key']).toBeUndefined()
    })

    test('all three aggregate mutations send the revision as a quoted If-Match', async () => {
      for (const call of [
        s => s.SetInputs(STORE, ID, { spendEntries: [] }, 'AAAAAAAAF9k='),
        s => s.Recalculate(STORE, ID, 'AAAAAAAAF9k='),
        s => s.Finalize(STORE, ID, 'AAAAAAAAF9k=')
      ]) {
        respondWith(200, {})
        await call(service())
        expect(global.fetch.mock.calls[0][1].headers['If-Match']).toBe('"AAAAAAAAF9k="')
      }
    })

    test('a missing revision is refused BEFORE the request on every one of the three', async () => {
      for (const call of [
        s => s.SetInputs(STORE, ID, { spendEntries: [] }, null),
        s => s.Recalculate(STORE, ID, null),
        s => s.Finalize(STORE, ID, null)
      ]) {
        respondWith(200, {})
        await expect(call(service())).rejects.toMatchObject({ code: 'margin.client-missing-revision' })
        expect(global.fetch).not.toHaveBeenCalled()
      }
    })
  })

  describe('the inputs body is a replace-set and states both stock fields every time', () => {
    test('an empty list is sent as an empty list — the way a statement is cleared of spend', async () => {
      respondWith(200, {})
      await service().SetInputs(STORE, ID, { spendEntries: [] }, 'rev')
      expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
        spendEntries: [],
        openingStockValueMinor: null,
        closingStockValueMinor: null
      })
    })

    // The two estimates are plain nullable columns the server assigns verbatim, so an OMITTED field
    // would arrive as null and clear a value the venue never touched. They are always stated.
    test('the stock estimates travel even when the caller supplied none', async () => {
      respondWith(200, {})
      await service().SetInputs(STORE, ID, { spendEntries: [], openingStockValueMinor: 25000 }, 'rev')
      const body = JSON.parse(global.fetch.mock.calls[0][1].body)
      expect(body.openingStockValueMinor).toBe(25000)
      expect(body).toHaveProperty('closingStockValueMinor', null)
    })

    // A `long?` column cannot hold a fraction of a minor unit; a float here would be rounded somewhere
    // the venue cannot see.
    test('a non-integer stock estimate is dropped rather than rounded onto the wire', async () => {
      respondWith(200, {})
      await service().SetInputs(STORE, ID, { spendEntries: [], closingStockValueMinor: 12.5 }, 'rev')
      expect(JSON.parse(global.fetch.mock.calls[0][1].body).closingStockValueMinor).toBeNull()
    })

    test('a spend line carries its date, supplier, amount, currency and note verbatim', async () => {
      respondWith(200, {})
      await service().SetInputs(STORE, ID, {
        spendEntries: [{ spendDate: MONDAY, supplierId: 's-1', amountMinor: 1500000, currency: 'NOK', note: 'F-1001' }]
      }, 'rev')
      expect(JSON.parse(global.fetch.mock.calls[0][1].body).spendEntries).toEqual([
        { spendDate: MONDAY, supplierId: 's-1', amountMinor: 1500000, currency: 'NOK', note: 'F-1001' }
      ])
    })
  })

  // Every date on this surface is a STORE CALENDAR DATE that the server reduces to `.Date`. An
  // instant would be reinterpreted by whichever zone the binder lands in, and one day of drift moves
  // money between two weekly statements. The client refuses rather than coercing, so the zone is never
  // chosen by a browser.
  describe('the calendar-date guard', () => {
    test('a DateTime, a Date object and a blank are all refused before the request', () => {
      respondWith(200, {})
      expect(() => service().CreateStatement(STORE, '2026-07-06T00:00:00Z')).toThrow(TypeError)
      expect(() => service().CreateStatement(STORE, new Date('2026-07-06'))).toThrow(TypeError)
      expect(() => service().GetCoverage(STORE, '', MONDAY)).toThrow(TypeError)
      expect(global.fetch).not.toHaveBeenCalled()
    })

    test('assertBusinessDate returns the value it accepted', () => {
      expect(assertBusinessDate(MONDAY, 'weekStart')).toBe(MONDAY)
    })
  })

  // Read through `Date.UTC` / `getUTCDay`, never `new Date('…').getDay()`, which reports the weekday
  // in the BROWSER's zone and would call every Monday west of Greenwich a Sunday.
  describe('the Monday guard is zone-proof', () => {
    test('a Monday is a Monday and the six other days are not', () => {
      expect(isMondayDate('2026-07-06')).toBe(true)
      for (const day of ['2026-07-05', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12']) {
        expect(isMondayDate(day)).toBe(false)
      }
    })

    test('a rolled-over date like 2026-02-31 is refused rather than silently becoming March', () => {
      expect(isMondayDate('2026-02-31')).toBe(false)
      expect(isMondayDate('not-a-date')).toBe(false)
      expect(isMondayDate(null)).toBe(false)
    })

    // The suggestion, which the venue confirms. Sunday is SIX days after its Monday, not one before —
    // the arithmetic every naive `getDay() - 1` gets wrong once a week.
    test('mondayOfWeek walks back to the Monday, including from a Sunday', () => {
      expect(mondayOfWeek('2026-07-06')).toBe('2026-07-06')
      expect(mondayOfWeek('2026-07-09')).toBe('2026-07-06')
      expect(mondayOfWeek('2026-07-12')).toBe('2026-07-06')
      expect(mondayOfWeek('2026-07-13')).toBe('2026-07-13')
      expect(mondayOfWeek('nope')).toBeNull()
    })
  })

  describe('the CSV export does not go through the JSON path', () => {
    test('it asks for text/csv and resolves the bytes plus the server-chosen file name', async () => {
      respondWithCsv(200, 'StatementId,StoreId\nabc,42\n', 'attachment; filename=margin-statement-2026-07-06-rev1.csv')
      const file = await service().ExportCsv(STORE, ID)

      expect(global.fetch.mock.calls[0][1].headers.Accept).toBe('text/csv')
      expect(file.text).toBe('StatementId,StoreId\nabc,42\n')
      expect(file.fileName).toBe('margin-statement-2026-07-06-rev1.csv')
    })

    // A cross-origin fetch only exposes the header when the server lists it, and inventing the
    // server's naming scheme here would be a second copy that silently stops matching.
    test('an unexposed Content-Disposition yields a null name rather than a guess', async () => {
      respondWithCsv(200, 'x\n')
      expect((await service().ExportCsv(STORE, ID)).fileName).toBeNull()
    })

    test('a problem+json failure on the CSV route still raises the ONE margin error family', async () => {
      respondWithCsv(404, JSON.stringify({ status: 404, detail: 'Not found.', code: MARGIN_NOT_FOUND }))
      const error = await service().ExportCsv(STORE, ID).catch(e => e)
      expect(isMarginApiError(error)).toBe(true)
      expect(error.code).toBe(MARGIN_NOT_FOUND)
    })
  })

  // The statement surface renders its business failures through `ModuleControllerBase.ModuleProblem`,
  // which emits NO `code`. That is what this predicate is for, and it must not swallow a coded one.
  describe('isUncodedRefusal separates the surface\'s business 400 from everything else', () => {
    test('a 400 with no code is a refusal; a 400 WITH a code is not', () => {
      expect(isUncodedRefusal(new MarginApiError(400, { detail: 'This statement is finalized and immutable.' }))).toBe(true)
      expect(isUncodedRefusal(new MarginApiError(400, { detail: 'x', code: 'margin.revision-required' }))).toBe(false)
    })

    test('a 404, a 409 and a plain Error are not refusals', () => {
      expect(isUncodedRefusal(new MarginApiError(404, { code: MARGIN_NOT_FOUND }))).toBe(false)
      expect(isUncodedRefusal(new MarginApiError(409, { code: 'margin.stale-revision' }))).toBe(false)
      expect(isUncodedRefusal(new Error('boom'))).toBe(false)
      expect(isUncodedRefusal(null)).toBe(false)
    })

    // The server's own sentence is the only thing that says WHICH rule was broken, so it has to
    // survive the trip to the page intact.
    test('the refusal carries the server prose as its message', () => {
      const error = new MarginApiError(400, { detail: 'This statement is finalized and immutable; create a new revision to correct it.' })
      expect(error.message).toContain('finalized and immutable')
    })
  })

  test('a 404 throws rather than resolving to an empty statement list', async () => {
    respondWith(404, { status: 404, detail: 'Not found.', code: MARGIN_NOT_FOUND })
    await expect(service().ListStatements(STORE)).rejects.toMatchObject({
      code: MARGIN_NOT_FOUND,
      isMarginApiError: true
    })
  })

  test('an anonymous client sends no Authorization header rather than an empty one', async () => {
    respondWith(200, { statements: [] })
    await new MarginStatementService({}).ListStatements(STORE)
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })
})
