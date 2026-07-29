import { isWorkforceApiError } from '~/utils/workforce/api-client'
import { WorkforceRatesService, assertBusinessDate, assertRateRequest } from '~/utils/workforce-rates/rates-client'

// The client is route-for-route with `WorkforceRatesController` and the one W6 read on
// `WorkforceAttendanceController`, so these assert the wire contract itself: the exact paths, the
// `Idempotency-Key` every workforce mutation requires, and — the point of this surface — that the
// effective date leaves as a CALENDAR DATE and the export range as CALENDAR DATES, never as
// instants.
//
// These tests are meaningful only under a non-UTC TZ — run the suite with TZ=Europe/Oslo.
describe('WorkforceRatesService', () => {
  const originalFetch = global.fetch
  const originalCrypto = global.crypto

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
    return new WorkforceRatesService({ bearerToken: 'tok-123' })
  }

  const statement = { effectiveFromLocalDate: '2026-09-01', hourlyRateMinor: 23550, currency: 'NOK' }

  beforeEach(() => {
    global.crypto = { randomUUID: () => 'idem-key' }
  })

  afterEach(() => {
    global.fetch = originalFetch
    global.crypto = originalCrypto
  })

  // ---- the four rate routes ---------------------------------------------------------------------

  test('GetEngagementRates reads the engagement timeline and sends no idempotency key', async () => {
    respondWith(200, { versions: [] })
    await service().GetEngagementRates(42, 'sm-1')

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/staff/sm-1/rates')
    expect(init.method).toBe('GET')
    expect(init.headers.Authorization).toBe('Bearer tok-123')
    // A read, so no Idempotency-Key — the surface only demands one on a mutation.
    expect(init.headers['Idempotency-Key']).toBeUndefined()
  })

  test('GetRoleRates reads the role timeline off the ROLE route, not the staff one', async () => {
    respondWith(200, { versions: [] })
    await service().GetRoleRates(42, 'role-9')

    expect(global.fetch.mock.calls[0][0]).toBe('/workforce/stores/42/roles/role-9/rates')
  })

  test('SetEngagementRate PUTs with the Idempotency-Key the surface demands', async () => {
    respondWith(200, { applied: {} })
    await service().SetEngagementRate(42, 'sm-1', statement)

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/staff/sm-1/rates')
    // PUT, and PUT APPENDS. There is no POST here and no PATCH anywhere on this controller.
    expect(init.method).toBe('PUT')
    expect(init.headers['Idempotency-Key']).toBe('idem-key')
    // No If-Match: an append has no aggregate revision to be stale against.
    expect(init.headers['If-Match']).toBeUndefined()
  })

  test('SetRoleRate PUTs to the role route', async () => {
    respondWith(200, { applied: {} })
    await service().SetRoleRate(42, 'role-9', statement)

    expect(global.fetch.mock.calls[0][0]).toBe('/workforce/stores/42/roles/role-9/rates')
    expect(global.fetch.mock.calls[0][1].method).toBe('PUT')
  })

  // ---- THE date-shape contract ------------------------------------------------------------------

  // The whole reason `effectiveFromLocalDate` is a string. A `DateTime` on the wire invites a binder
  // to pick an epoch nobody chose, and the boundary is load-bearing: UTC midnight is 02:00 on the
  // Oslo summer day, so a rate dated 1 September would price the evening of 31 August.
  test('the effective date leaves as a bare calendar date — no instant anywhere in the body', async () => {
    respondWith(200, { applied: {} })
    await service().SetEngagementRate(42, 'sm-1', statement)

    const body = JSON.parse(global.fetch.mock.calls[0][1].body)
    expect(body.effectiveFromLocalDate).toBe('2026-09-01')
    expect(body.effectiveFromLocalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    // POSITIVE CONTROL for the assertion above: a datetime would still satisfy a naive
    // `toContain('2026-09-01')`, so the whole serialised body is checked for the time marker and
    // the zone designator that an instant carries and a calendar date cannot.
    const wire = global.fetch.mock.calls[0][1].body
    expect(wire).not.toMatch(/T\d{2}:\d{2}/)
    expect(wire).not.toMatch(/\d{2}:\d{2}:\d{2}/)
    expect(wire).not.toContain('Z"')
  })

  test('and the guard REFUSES the shapes that would reintroduce an instant', () => {
    // A Date. Coercing it here would silently choose the BROWSER's zone for a date only the store
    // is entitled to place.
    expect(() => assertRateRequest({ ...statement, effectiveFromLocalDate: new Date('2026-09-01T00:00:00Z') }))
      .toThrow(/yyyy-MM-dd/)
    // An ISO datetime string, which reads as a date to a human and as an instant to a binder.
    expect(() => assertRateRequest({ ...statement, effectiveFromLocalDate: '2026-09-01T00:00:00' }))
      .toThrow(/yyyy-MM-dd/)
    expect(() => assertRateRequest({ ...statement, effectiveFromLocalDate: '2026-09-01T00:00:00Z' }))
      .toThrow(/yyyy-MM-dd/)
    // A loose date a strict `DateOnly.TryParseExact` would reject server-side anyway.
    expect(() => assertRateRequest({ ...statement, effectiveFromLocalDate: '2026-9-1' })).toThrow(/yyyy-MM-dd/)
    expect(() => assertRateRequest({ ...statement, effectiveFromLocalDate: '' })).toThrow(/yyyy-MM-dd/)
    expect(() => assertRateRequest({ ...statement, effectiveFromLocalDate: null })).toThrow(/yyyy-MM-dd/)
  })

  // POSITIVE CONTROL for the guard: it must accept the one shape the API takes, or the tests above
  // would pass just as well against a function that threw unconditionally.
  test('the guard PASSES a well-formed statement through unchanged', () => {
    expect(assertRateRequest(statement)).toEqual(statement)
    expect(assertBusinessDate('2026-02-29', 'from')).toBe('2026-02-29')
  })

  test('a non-integer amount is refused: minor units are whole, and a float would be rounded out of sight', () => {
    expect(() => assertRateRequest({ ...statement, hourlyRateMinor: 235.5 })).toThrow(/integer/)
    expect(() => assertRateRequest({ ...statement, hourlyRateMinor: '23550' })).toThrow(/integer/)
    expect(() => assertRateRequest({ ...statement, hourlyRateMinor: undefined })).toThrow(/integer/)
  })

  test('a malformed statement never reaches the network at all', () => {
    respondWith(200, {})
    expect(() => service().SetEngagementRate(42, 'sm-1', { ...statement, effectiveFromLocalDate: new Date() }))
      .toThrow(TypeError)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  // ---- the hours export: the OTHER unit -----------------------------------------------------------

  // The attendance read takes UTC INSTANTS; this one takes the venue's CALENDAR DATES. Mixing them
  // is a 400 (`Both 'from' and 'to' are required as local business dates in yyyy-MM-dd form.`), so
  // the two live behind differently-shaped signatures and this one refuses an instant outright.
  test('GetHoursExport sends bare calendar dates, inclusive, with no instant in the query', async () => {
    respondWithCsv(200, '# okam-workforce-hours\n', { 'content-disposition': 'attachment; filename=okam-hours-42-2026-09-01-2026-09-14.csv' })
    await service().GetHoursExport(42, '2026-09-01', '2026-09-14')

    const [url, init] = global.fetch.mock.calls[0]
    expect(url).toBe('/workforce/stores/42/attendance/hours-export?from=2026-09-01&to=2026-09-14')
    expect(init.method).toBe('GET')
    expect(init.headers.Accept).toBe('text/csv')
    expect(init.headers.Authorization).toBe('Bearer tok-123')
    // The control that makes the URL assertion mean something: no time component, no zone marker.
    expect(url).not.toMatch(/T\d{2}:\d{2}/)
    expect(url).not.toContain('Z')
  })

  test('GetHoursExport REFUSES an instant, which is the shape the attendance read takes', () => {
    expect(() => service().GetHoursExport(42, new Date('2026-09-01T00:00:00Z'), '2026-09-14')).toThrow(/yyyy-MM-dd/)
    // `toUtcRangeParam`'s output — the exact value the attendance read sends — must not pass here.
    expect(() => service().GetHoursExport(42, '2026-09-01T00:00:00', '2026-09-14T00:00:00')).toThrow(/yyyy-MM-dd/)
    expect(() => service().GetHoursExport(42, '2026-09-01', null)).toThrow(/yyyy-MM-dd/)
  })

  test('GetHoursExport returns the CSV text and the name the server chose', async () => {
    const csv = '# okam-workforce-hours\n# version=1\nstaffMemberId,minutes\nsm-1,450\n'
    respondWithCsv(200, csv, { 'content-disposition': 'attachment; filename="okam-hours-42-2026-09-01-2026-09-14.csv"' })

    const file = await service().GetHoursExport(42, '2026-09-01', '2026-09-14')
    // The bytes are returned verbatim — nothing here parses, reformats or recounts the file.
    expect(file.text).toBe(csv)
    expect(file.fileName).toBe('okam-hours-42-2026-09-01-2026-09-14.csv')
  })

  test('an unreadable Content-Disposition yields a NULL name rather than an invented one', async () => {
    // Cross-origin, the header is hidden unless the server exposes it. A client that guessed the
    // server's naming scheme here would be a second copy of it, silently drifting.
    respondWithCsv(200, '# okam-workforce-hours\n', {})
    expect((await service().GetHoursExport(42, '2026-09-01', '2026-09-14')).fileName).toBeNull()

    respondWithCsv(200, '# okam-workforce-hours\n', null)
    expect((await service().GetHoursExport(42, '2026-09-01', '2026-09-14')).fileName).toBeNull()
  })

  test('the RFC 6266 extended filename wins over the plain one when both are present', async () => {
    respondWithCsv(200, '#\n', {
      'content-disposition': 'attachment; filename=fallback.csv; filename*=UTF-8\'\'okam-timer-%C3%A5r.csv'
    })
    expect((await service().GetHoursExport(42, '2026-09-01', '2026-09-14')).fileName).toBe('okam-timer-år.csv')
  })

  // ---- one error family --------------------------------------------------------------------------

  test('a problem+json refusal on the CSV route raises the ONE shared workforce error', async () => {
    respondWithCsv(403, JSON.stringify({ code: 'workforce.forbidden', detail: 'nope' }), {})

    await expect(service().GetHoursExport(42, '2026-09-01', '2026-09-14')).rejects.toMatchObject({
      status: 403,
      code: 'workforce.forbidden'
    })
    await service().GetHoursExport(42, '2026-09-01', '2026-09-14').catch((e) => {
      expect(isWorkforceApiError(e)).toBe(true)
    })
  })

  test('a non-JSON failure body still becomes that same error, carrying the text', async () => {
    respondWithCsv(500, 'upstream exploded', {})
    await service().GetHoursExport(42, '2026-09-01', '2026-09-14').catch((e) => {
      expect(isWorkforceApiError(e)).toBe(true)
      expect(e.status).toBe(500)
      expect(e.message).toBe('upstream exploded')
    })
  })

  test('the rate 409 arrives typed, naming the statement already in force', async () => {
    respondWith(409, {
      code: 'workforce.rate-version-exists',
      conflictKind: 'rate-version-exists',
      aggregateId: 'rv-77',
      effectiveFromLocalDate: '2026-09-01',
      retryable: false,
      detail: 'A rate already takes effect on 2026-09-01 for this timeline.'
    })

    await service().SetEngagementRate(42, 'sm-1', statement).catch((e) => {
      expect(isWorkforceApiError(e)).toBe(true)
      expect(e.status).toBe(409)
      expect(e.code).toBe('workforce.rate-version-exists')
      // The id is what lets the page MARK the colliding row rather than describe it.
      expect(e.aggregateId).toBe('rv-77')
      expect(e.retryable).toBe(false)
      expect(e.problem.effectiveFromLocalDate).toBe('2026-09-01')
    })
    expect.assertions(6)
  })
})
