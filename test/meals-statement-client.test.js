import { MealsStatementService } from '~/utils/meals/statement-client'
import { WorkforceClientBase, WorkforceApiError, fileNameFrom } from '~/utils/workforce/api-client'

// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// `utils/meals/statement-client.js` is 124 lines and was at 0% on trunk `a63c30f` — no jest test
// referenced it, and its only consumer, `pages/admin/meals-statements.vue`, is one of exactly two
// Meals `.vue` files no test ever loads. The browser journey that walks it (`meals-statement-month`)
// "asserts no amount, no total and no currency anywhere". Three instruments, one file.
//
// WHAT IT IS: the reads for THE MONTHLY BILL A COMPANY PAYS. #22 is the run and its lines, #21 is
// the buyer's statement history, #23 is the deterministic CSV a bokføring inspector may later be
// handed. The backend computes the statement at 91.9% line coverage; this file is the only thing
// between that and the screen, and it was untested.
//
// ---- WHAT CAN GO WRONG HERE, AND WHAT EACH ARM PINS --------------------------------------------
//
//   1. A ROUTE THAT DOES NOT EXIST. Thirteen request paths across seven core services carried a
//      trailing slash that ASP.NET matched either way, so production never noticed and the strict
//      fixture 404'd (`test/core-request-path-shape.test.js`). Every path below is asserted
//      character for character, including the `?format=csv` that is PINNED rather than defaulted —
//      anything else is a 400 `meals.export-format-unsupported` and there is no second format.
//   2. AN ID THAT IS NOT ESCAPED. A statement id is a Guid today, but the escaping is the only
//      thing between an id and the route above it, and an unescaped `/` re-points the request at a
//      different document. Asserted with an id that actually contains one.
//   3. A FILENAME OR A HASH INVENTED RATHER THAN READ. `Content-Disposition` and
//      `X-Meals-Content-Hash` are not CORS-safelisted, so on a cross-origin admin app they are
//      readable ONLY if the API exposes them. Returning null is the contract — the caller then
//      knows it is naming the file itself. A guessed filename or a re-derived hash would prove
//      nothing about the document the server signed, and would look exactly like one that did.
//   4. A REFUSAL RENDERED AS A DOCUMENT. #21 admits ONLY a company admin, so a venue asking for the
//      buyer's history gets `meals.forbidden`. That must surface as the same typed error the JSON
//      routes throw — never as an empty list a venue would read as "no statements yet".
//
// ---- WHY THESE ASSERTIONS CANNOT PASS VACUOUSLY -----------------------------------------------
//
// Each URL arm uses `toBe` on the whole string, not `toContain` on a fragment: a fragment match
// survives a trailing slash, a doubled slash and a wrong query string, which are the three faults
// this class of defect actually takes. The header arms assert an exact filename and an exact hash,
// and the null arms assert `toBeNull()` against a world where the header IS present but unreadable,
// so "returned null" cannot come from the value simply being absent. The error arms read `status`
// and `code` off the thrown object rather than asserting that something threw.

const originalFetch = global.fetch

const STATEMENT = '3fa85f64-5717-4562-b3fc-2c963f66afa6'
const COMPANY = '9b2c1d0e-4444-4562-b3fc-2c963f66afa6'

/** A `Headers`-shaped object: case-insensitive `get`, exactly as `fetch` hands one over. */
function headers (bag) {
  const lower = {}
  Object.keys(bag || {}).forEach((k) => { lower[k.toLowerCase()] = bag[k] })
  return { get: name => (Object.prototype.hasOwnProperty.call(lower, String(name).toLowerCase()) ? lower[String(name).toLowerCase()] : null) }
}

function respondJson (status, body) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
  })
}

function respondCsv (status, text, headerBag) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: headerBag === null ? undefined : headers(headerBag || {}),
    text: () => Promise.resolve(text)
  })
}

async function failureFrom (call) {
  try {
    await call()
    return null
  } catch (e) {
    return e
  }
}

const service = () => new MealsStatementService({ bearerToken: 'tok-77' })

afterEach(() => { global.fetch = originalFetch })

describe('MealsStatementService — route-for-route with the three statement READS', () => {
  test('it is the SHARED HTTP layer, not a fourth copy of it', () => {
    expect(service()).toBeInstanceOf(WorkforceClientBase)
  })

  test('#22 get — the run and its lines, at the exact path the backend binds', async () => {
    respondJson(200, { statementRunId: STATEMENT, lines: [] })
    await service().Get(STATEMENT)
    expect(global.fetch.mock.calls[0][0]).toBe('/v1/meals/statements/' + STATEMENT)
  })

  test('#21 list — the COMPANY\'s statement history, company-scoped and not store-scoped', async () => {
    respondJson(200, { statements: [] })
    await service().ListForCompany(COMPANY)
    expect(global.fetch.mock.calls[0][0]).toBe('/v1/meals/companies/' + COMPANY + '/statements')
  })

  test('#23 export — the deterministic CSV, with format PINNED to csv', async () => {
    respondCsv(200, '#\nline', {})
    await service().ExportCsv(STATEMENT)
    expect(global.fetch.mock.calls[0][0])
      .toBe('/v1/meals/statements/' + STATEMENT + '/export?format=csv')
  })

  test('all three are READS: GET, bearer token, no body, and NO Idempotency-Key', async () => {
    respondJson(200, {})
    await service().Get(STATEMENT)
    let init = global.fetch.mock.calls[0][1]
    expect(init.method).toBe('GET')
    expect(init.body).toBeUndefined()
    expect(init.headers.Authorization).toBe('Bearer tok-77')
    expect(init.headers['Idempotency-Key']).toBeUndefined()

    respondJson(200, {})
    await service().ListForCompany(COMPANY)
    init = global.fetch.mock.calls[0][1]
    expect(init.method).toBe('GET')
    expect(init.headers['Idempotency-Key']).toBeUndefined()

    // The export goes round `_request`, so its headers are assembled separately and are the ones
    // most likely to drift. It is still a read and still mints nothing.
    respondCsv(200, '', {})
    await service().ExportCsv(STATEMENT)
    init = global.fetch.mock.calls[0][1]
    expect(init.method).toBe('GET')
    expect(init.headers.Accept).toBe('text/csv')
    expect(init.headers.Authorization).toBe('Bearer tok-77')
    expect(init.headers['Idempotency-Key']).toBeUndefined()
  })

  test('an anonymous caller sends no Authorization header at all rather than an empty one', async () => {
    respondJson(200, {})
    await new MealsStatementService({}).Get(STATEMENT)
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBeUndefined()
  })

  test('the id is ESCAPED into the path on all three routes', async () => {
    // Not a Guid today — but the escaping is the only thing between an id and the route above it,
    // and an unescaped `/` re-points the request at an entirely different document.
    const hostile = 'a/b?c=d#e'
    const escaped = encodeURIComponent(hostile)
    expect(escaped).toBe('a%2Fb%3Fc%3Dd%23e')

    respondJson(200, {})
    await service().Get(hostile)
    expect(global.fetch.mock.calls[0][0]).toBe('/v1/meals/statements/' + escaped)

    respondJson(200, {})
    await service().ListForCompany(hostile)
    expect(global.fetch.mock.calls[0][0]).toBe('/v1/meals/companies/' + escaped + '/statements')

    respondCsv(200, '', {})
    await service().ExportCsv(hostile)
    expect(global.fetch.mock.calls[0][0]).toBe('/v1/meals/statements/' + escaped + '/export?format=csv')
  })
})

describe('ExportCsv — the document, its name and the hash the server signed it with', () => {
  test('the CSV body is handed back verbatim, not parsed', async () => {
    // Twelve `#` preamble lines, a header row, then one row per line. A client that ran this
    // through `_request` would JSON-parse it and hand the caller `{ detail: <the whole bill> }` —
    // a shape that happens to work only because a CSV never parses as JSON.
    const csv = '# Okam meals statement\n# storeId,42\nallocationId,amountMinor\nalloc-1,12500\n'
    respondCsv(200, csv, { 'Content-Disposition': 'attachment; filename="statement-2026-06.csv"' })
    const file = await service().ExportCsv(STATEMENT)
    expect(file.text).toBe(csv)
    expect(typeof file.text).toBe('string')
  })

  test('the server\'s own filename is READ off Content-Disposition — plain and RFC 5987 forms', async () => {
    respondCsv(200, 'x', { 'Content-Disposition': 'attachment; filename="statement-2026-06.csv"' })
    expect((await service().ExportCsv(STATEMENT)).fileName).toBe('statement-2026-06.csv')

    respondCsv(200, 'x', { 'Content-Disposition': 'attachment; filename=statement-2026-06.csv' })
    expect((await service().ExportCsv(STATEMENT)).fileName).toBe('statement-2026-06.csv')

    // A Norwegian venue name in the filename arrives percent-encoded and must be decoded.
    respondCsv(200, 'x', { 'Content-Disposition': "attachment; filename*=UTF-8''oppgj%C3%B8r-2026-06.csv" })
    expect((await service().ExportCsv(STATEMENT)).fileName).toBe('oppgjør-2026-06.csv')

    // RFC 6266: the extended form WINS when both are present, so a browser that only understood the
    // plain one does not get a different file name from the one the server meant.
    respondCsv(200, 'x', {
      'Content-Disposition': "attachment; filename=fallback.csv; filename*=UTF-8''oppgj%C3%B8r-2026-06.csv"
    })
    expect((await service().ExportCsv(STATEMENT)).fileName).toBe('oppgjør-2026-06.csv')

    // A lowercase header name is the same header. `Headers.get` is case-insensitive and so is this.
    respondCsv(200, 'x', { 'content-disposition': 'attachment; filename="lower.csv"' })
    expect((await service().ExportCsv(STATEMENT)).fileName).toBe('lower.csv')
  })

  test('a malformed extended filename falls back to the raw token rather than throwing', async () => {
    // `decodeURIComponent('%E0%A4%A')` throws URIError. A download must not die on a bad header.
    respondCsv(200, 'x', { 'Content-Disposition': "attachment; filename*=UTF-8''broken-%E0%A4%A.csv" })
    const file = await service().ExportCsv(STATEMENT)
    expect(file.fileName).toBe('broken-%E0%A4%A.csv')
  })

  test('AN UNREADABLE NAME IS NULL, NEVER A GUESS — three separate ways it can be unreadable', async () => {
    // (a) the header is simply not there.
    respondCsv(200, 'x', {})
    expect((await service().ExportCsv(STATEMENT)).fileName).toBeNull()

    // (b) the header is PRESENT on the response but the browser was not allowed to read it, so
    // `get` answers null. This is the cross-origin case and the one that matters: the value exists,
    // and null here is a statement about permission rather than about absence.
    respondCsv(200, 'x', { 'X-Meals-Content-Hash': 'sha256:aaa' })
    expect((await service().ExportCsv(STATEMENT)).fileName).toBeNull()

    // (c) there is no readable headers object at all.
    respondCsv(200, 'x', null)
    expect((await service().ExportCsv(STATEMENT)).fileName).toBeNull()
  })

  test('the content hash is the SERVER\'s, read off X-Meals-Content-Hash and never re-derived', async () => {
    respondCsv(200, 'body-that-would-hash-differently', {
      'X-Meals-Content-Hash': 'sha256:0011223344556677'
    })
    const file = await service().ExportCsv(STATEMENT)
    expect(file.contentHash).toBe('sha256:0011223344556677')
    // A hash this client computed would prove nothing about the document the server signed, so a
    // body that plainly does not hash to that value changes nothing.
    expect(file.text).toBe('body-that-would-hash-differently')
  })

  test('an unexposed or absent hash header is null — the caller must know it has no signature', async () => {
    respondCsv(200, 'x', { 'Content-Disposition': 'attachment; filename="a.csv"' })
    expect((await service().ExportCsv(STATEMENT)).contentHash).toBeNull()

    respondCsv(200, 'x', null)
    expect((await service().ExportCsv(STATEMENT)).contentHash).toBeNull()
  })

  test('name and hash are read INDEPENDENTLY — one being unreadable does not blank the other', async () => {
    respondCsv(200, 'x', { 'X-Meals-Content-Hash': 'sha256:only-the-hash' })
    let file = await service().ExportCsv(STATEMENT)
    expect(file.fileName).toBeNull()
    expect(file.contentHash).toBe('sha256:only-the-hash')

    respondCsv(200, 'x', { 'Content-Disposition': 'attachment; filename="only-the-name.csv"' })
    file = await service().ExportCsv(STATEMENT)
    expect(file.fileName).toBe('only-the-name.csv')
    expect(file.contentHash).toBeNull()
  })

  test('its filename reading does not drift from the shared layer\'s, which is a second copy of it', () => {
    // `utils/workforce/api-client.js` exports `fileNameFrom` and `_requestFile` already uses it;
    // `utils/meals/statement-client.js` carries its own private copy of the same function. Two
    // copies of a header parser is the failure mode that file's own header warns about — silent,
    // and one field at a time. There is no way to import the private one, so the copies are held
    // together through the only observable that reaches it: `ExportCsv`'s `fileName`.
    const worlds = [
      'attachment; filename="statement-2026-06.csv"',
      'attachment; filename=statement-2026-06.csv',
      "attachment; filename*=UTF-8''oppgj%C3%B8r-2026-06.csv",
      "attachment; filename=fallback.csv; filename*=UTF-8''oppgj%C3%B8r-2026-06.csv",
      "attachment; filename*=UTF-8''broken-%E0%A4%A.csv",
      'inline',
      'attachment'
    ]
    expect(worlds).toHaveLength(7)
    return worlds.reduce((chain, disposition) => chain.then(async () => {
      respondCsv(200, 'x', { 'Content-Disposition': disposition })
      const mine = (await service().ExportCsv(STATEMENT)).fileName
      const shared = fileNameFrom(headers({ 'Content-Disposition': disposition }))
      expect(mine).toBe(shared)
    }), Promise.resolve())
  })
})

describe('the refusals — a bill that was not produced is never an empty bill', () => {
  test('#21 to a store admin is the typed meals.forbidden, not an empty history', async () => {
    respondJson(403, { code: 'meals.forbidden', detail: 'company admin only' })
    const error = await failureFrom(() => service().ListForCompany(COMPANY))
    expect(error).toBeInstanceOf(WorkforceApiError)
    expect(error.status).toBe(403)
    expect(error.code).toBe('meals.forbidden')
  })

  test('a dark module answers meals.not-found, which the client carries and does not interpret', async () => {
    respondJson(404, { code: 'meals.not-found', detail: 'no' })
    const error = await failureFrom(() => service().Get(STATEMENT))
    expect(error.status).toBe(404)
    expect(error.code).toBe('meals.not-found')
    // A statement that does not exist answers the same code. The client never splits them.
    expect(error.isWorkforceApiError).toBe(true)
  })

  test('THE EXPORT THROWS THE SAME TYPED ERROR THE JSON ROUTES DO, so the page has one input', async () => {
    respondCsv(400, JSON.stringify({ code: 'meals.export-format-unsupported', detail: 'csv only' }), {})
    const error = await failureFrom(() => service().ExportCsv(STATEMENT))
    expect(error).toBeInstanceOf(WorkforceApiError)
    expect(error.status).toBe(400)
    expect(error.code).toBe('meals.export-format-unsupported')
  })

  test('a non-JSON failure body becomes the detail, and never a fileName', async () => {
    respondCsv(500, '<html>gateway</html>', {})
    const error = await failureFrom(() => service().ExportCsv(STATEMENT))
    expect(error.status).toBe(500)
    expect(error.code).toBeNull()
    expect(error.problem).toEqual({ detail: '<html>gateway</html>' })
    expect(error.message).toBe('<html>gateway</html>')
  })

  test('an EMPTY failure body is a routing 404 and carries no code at all', async () => {
    respondCsv(404, '', {})
    const error = await failureFrom(() => service().ExportCsv(STATEMENT))
    expect(error.status).toBe(404)
    expect(error.code).toBeNull()
    expect(error.problem).toEqual({})
    expect(error.message).toBe('HTTP 404')
  })

  test('a refusal is a THROW, never a resolved value the page could render as a document', async () => {
    respondCsv(403, JSON.stringify({ code: 'meals.forbidden' }), {})
    let resolved = 'never-assigned'
    try {
      resolved = await service().ExportCsv(STATEMENT)
    } catch (e) {
      resolved = 'threw'
    }
    expect(resolved).toBe('threw')
  })
})
