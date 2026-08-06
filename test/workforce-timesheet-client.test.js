import { isWorkforceApiError } from '~/utils/workforce/api-client'
import { WorkforceTimesheetService, assertApproveRequest } from '~/utils/workforce/timesheet-client'

// The client is route-for-route with `WorkforceTimesheetsController`, so these assert the WIRE
// contract itself: the five exact paths, the `Idempotency-Key` both writes require, that the
// approval's range leaves as CALENDAR DATES rather than instants, and — the property that decides
// whether a manager ever sees the finalize-then-refuse chain — that two clicks send two DIFFERENT
// idempotency keys.
//
// These tests are meaningful only under a non-UTC TZ — run the suite with TZ=Europe/Oslo.
describe('WorkforceTimesheetService', () => {
  const originalFetch = global.fetch
  const originalCrypto = global.crypto

  const PERIOD = 'd0e2dee3-a24b-5929-8e90-7842777502ed'
  const BATCH = 'c1b2d0ce-2f56-4584-9cf4-b9f63c871c85'

  function respondWith (status, body) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
    })
  }

  function respondWithCsv (status, text, headers) {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      headers: headers === null ? null : { get: name => (headers || {})[String(name).toLowerCase()] || null },
      text: () => Promise.resolve(text)
    })
  }

  function service () {
    return new WorkforceTimesheetService({ bearerToken: 'tok-123' })
  }

  const range = { fromBusinessDate: '2026-07-21', toBusinessDate: '2026-08-03' }

  beforeEach(() => {
    let n = 0
    global.crypto = { randomUUID: () => 'idem-key-' + (++n) }
  })

  afterEach(() => {
    global.fetch = originalFetch
    global.crypto = originalCrypto
  })

  // ---- the five routes -------------------------------------------------------------------------

  it('lists a period range on the endpoint-27 path, as inclusive calendar dates', async () => {
    respondWith(200, { periods: [] })
    await service().ListTimesheets(42, '2026-07-21', '2026-08-03')

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toContain('/workforce/stores/42/timesheets?from=2026-07-21&to=2026-08-03')
    expect(init.method).toBe('GET')
    expect(init.headers.Authorization).toBe('Bearer tok-123')
  })

  it('reads one period on its own path', async () => {
    respondWith(200, { period: {}, lines: [], batches: [] })
    await service().GetTimesheet(42, PERIOD)

    expect(global.fetch.mock.calls[0][0]).toContain('/workforce/stores/42/timesheets/' + PERIOD)
  })

  it('approves on the endpoint-28 path, carrying an Idempotency-Key', async () => {
    respondWith(200, { period: {}, lines: [], batches: [] })
    await service().ApproveTimesheet(42, PERIOD, range)

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toContain('/workforce/stores/42/timesheets/' + PERIOD + '/approve')
    expect(init.method).toBe('POST')
    expect(init.headers['Idempotency-Key']).toBeTruthy()
  })

  it('exports on the endpoint-29 path, carrying an Idempotency-Key', async () => {
    respondWith(200, { batchId: BATCH })
    await service().CreateTimesheetExport(42, PERIOD, {})

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toContain('/workforce/stores/42/timesheets/' + PERIOD + '/exports')
    expect(init.method).toBe('POST')
    expect(init.headers['Idempotency-Key']).toBeTruthy()
  })

  it('downloads a batch as text/csv and reports the server-chosen filename', async () => {
    respondWithCsv(200, '# okam-workforce-timesheet\n', {
      'content-disposition': 'attachment; filename="okam-timesheet-42-2026-07-21-2026-08-03.csv"'
    })
    const file = await service().DownloadTimesheetExport(42, PERIOD, BATCH)

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toContain('/timesheets/' + PERIOD + '/exports/' + BATCH)
    expect(init.headers.Accept).toBe('text/csv')
    expect(file.text).toBe('# okam-workforce-timesheet\n')
    expect(file.fileName).toBe('okam-timesheet-42-2026-07-21-2026-08-03.csv')
  })

  // THE PROPERTY THE WHOLE REFUSAL CHAIN RESTS ON. A same-key repeat REPLAYS the stored 200 on the
  // server; only a fresh key reaches the domain check and earns the 409. So if this client reused a
  // key between clicks, a manager pressing Approve twice would silently get the first answer back
  // and the finalize-then-refuse chain would be invisible from the browser.
  it('sends a DIFFERENT idempotency key on each write, so a second click is a second attempt', async () => {
    respondWith(200, { period: {}, lines: [], batches: [] })
    const client = service()
    await client.ApproveTimesheet(42, PERIOD, range)
    await client.ApproveTimesheet(42, PERIOD, range)

    const first = global.fetch.mock.calls[0][1].headers['Idempotency-Key']
    const second = global.fetch.mock.calls[1][1].headers['Idempotency-Key']
    expect(first).not.toBe(second)
  })

  it('does not send an Idempotency-Key on the reads', async () => {
    respondWith(200, { periods: [] })
    await service().ListTimesheets(42, '2026-07-21', '2026-08-03')
    expect(global.fetch.mock.calls[0][1].headers['Idempotency-Key']).toBeUndefined()
  })

  // ---- the wire guards -------------------------------------------------------------------------

  // Throws SYNCHRONOUSLY, matching `GetHoursExport` on the sibling client: the guard runs before any
  // promise exists, so a caller cannot accidentally swallow it in a `.catch()` meant for transport.
  it('refuses a Date on the list range rather than choosing a zone for the venue', () => {
    respondWith(200, { periods: [] })
    expect(() => service().ListTimesheets(42, new Date('2026-07-21T00:00:00Z'), '2026-08-03'))
      .toThrow(/yyyy-MM-dd/)
    // `toUtcRangeParam`'s output — the exact value the ATTENDANCE read sends — must not pass here.
    // The two ranges are in different units and mixing them is a 400 on one and a silently wrong
    // window on the other.
    expect(() => service().ListTimesheets(42, '2026-07-21T00:00:00', '2026-08-03T00:00:00'))
      .toThrow(/yyyy-MM-dd/)
    expect(() => service().ListTimesheets(42, '2026-07-21', null)).toThrow(/yyyy-MM-dd/)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('refuses a datetime on the approval range', () => {
    expect(() => assertApproveRequest({
      fromBusinessDate: '2026-07-21T00:00:00', toBusinessDate: '2026-08-03'
    })).toThrow(/venue calendar date/)
  })

  // An omitted flag must MEAN false. `allowIncomplete` is a manager's explicit decision to freeze
  // hours nobody can account for; if `undefined` reached the wire as absent and the server defaulted
  // differently, the decision would be made by neither of them.
  it('normalises an absent allowIncomplete to a real false', () => {
    expect(assertApproveRequest(range).allowIncomplete).toBe(false)
  })

  it('refuses a non-boolean allowIncomplete rather than coercing a form string', () => {
    expect(() => assertApproveRequest(Object.assign({ allowIncomplete: 'true' }, range)))
      .toThrow(/allowIncomplete must be a boolean/)
  })

  it('sends the range in the body even though the route carries the period id', async () => {
    respondWith(200, { period: {}, lines: [], batches: [] })
    await service().ApproveTimesheet(42, PERIOD, Object.assign({ allowIncomplete: true }, range))

    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({
      fromBusinessDate: '2026-07-21',
      toBusinessDate: '2026-08-03',
      allowIncomplete: true
    })
  })

  // ---- the failure family ----------------------------------------------------------------------

  it('raises a typed workforce error carrying the refusal code', async () => {
    respondWith(409, {
      code: 'workforce.timesheet-period-already-approved',
      conflictKind: 'timesheet-period-already-approved',
      detail: 'This period was already approved and frozen.'
    })

    let caught = null
    try {
      await service().ApproveTimesheet(42, PERIOD, range)
    } catch (e) { caught = e }

    expect(isWorkforceApiError(caught)).toBe(true)
    expect(caught.status).toBe(409)
    expect(caught.code).toBe('workforce.timesheet-period-already-approved')
  })

  it('raises the same typed error family from the CSV download path', async () => {
    respondWithCsv(409, JSON.stringify({ code: 'workforce.timesheet-export-failed' }), {})

    let caught = null
    try {
      await service().DownloadTimesheetExport(42, PERIOD, BATCH)
    } catch (e) { caught = e }

    expect(isWorkforceApiError(caught)).toBe(true)
    expect(caught.code).toBe('workforce.timesheet-export-failed')
  })

  // A cross-origin download cannot read `Content-Disposition` unless the server exposes it. The
  // client must answer null rather than inventing the server's naming scheme — a second copy of it
  // here would silently stop matching the day the server's changed.
  it('reports a null filename rather than guessing when the header is unreadable', async () => {
    respondWithCsv(200, 'x', {})
    expect((await service().DownloadTimesheetExport(42, PERIOD, BATCH)).fileName).toBeNull()
  })
})
