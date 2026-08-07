import { WorkforcePersonnelListService } from '~/utils/workforce/personnel-list-client'

// The KODEOVERSIKT route, route-for-route with `WorkforcePersonnelListController`:
//
//   GET /workforce/stores/{storeId}/personnel-list/code-register?businessDate=
//
// It answers `text/csv`, so it goes through the shared `_requestFile` rather than `_request` — and
// the failure path still has to raise the ONE workforce error family, or a 403 on this route would
// surface as a bare fetch result nothing on the page knows how to read.
//
// Deliberately a separate file from the page suite: that one mocks this module, so a client test
// living beside it would be asserting the mock's behaviour.
describe('the code-register route', () => {
  const originalFetch = global.fetch
  const service = () => new WorkforcePersonnelListService({ bearerToken: 'tok' })

  afterEach(() => { global.fetch = originalFetch })

  test('carries the venue business date and asks for text/csv', async () => {
    const requested = []
    global.fetch = jest.fn((url, init) => {
      requested.push([url, init])
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve('# okam-workforce-kodeoversikt\n'),
        headers: {
          get: name => (String(name).toLowerCase() === 'content-disposition'
            ? 'attachment; filename=okam-kodeoversikt-42-2026-07-13.csv'
            : null)
        }
      })
    })

    const file = await service().GetIdentityCodeRegister(42, '2026-07-13')

    expect(requested[0][0]).toContain('/workforce/stores/42/personnel-list/code-register?businessDate=2026-07-13')
    expect(requested[0][1].method).toBe('GET')
    expect(requested[0][1].headers.Accept).toBe('text/csv')
    expect(requested[0][1].headers.Authorization).toBe('Bearer tok')
    // The server's own download name, off Content-Disposition — never a second copy of its scheme.
    expect(file.fileName).toBe('okam-kodeoversikt-42-2026-07-13.csv')
    expect(file.text).toContain('okam-workforce-kodeoversikt')
  })

  test('a Date is REFUSED rather than converted in the browser\'s zone', () => {
    // The venue's zone is the only one entitled to turn an instant into a business date, and the
    // server is what holds it. Coercing here would pick the reader's zone instead.
    expect(() => service().GetIdentityCodeRegister(42, new Date('2026-07-13T00:00:00Z')))
      .toThrow(TypeError)
  })

  test('omitting the date sends no query at all, so the SERVER resolves the venue today', async () => {
    const requested = []
    global.fetch = jest.fn((url) => {
      requested.push(url)
      return Promise.resolve({ ok: true, text: () => Promise.resolve(''), headers: { get: () => null } })
    })

    await service().GetIdentityCodeRegister(42, null)

    expect(requested[0]).toContain('/workforce/stores/42/personnel-list/code-register')
    expect(requested[0]).not.toContain('businessDate')
  })

  test('a problem+json failure is the ONE workforce error family, not a bare fetch result', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 403,
      text: () => Promise.resolve(JSON.stringify({ code: 'workforce.forbidden', detail: 'no grant' })),
      headers: { get: () => null }
    }))

    let failure = null
    try {
      await service().GetIdentityCodeRegister(42, '2026-07-13')
    } catch (e) {
      failure = e
    }

    expect(failure).not.toBeNull()
    expect(failure.isWorkforceApiError).toBe(true)
    expect(failure.status).toBe(403)
    expect(failure.code).toBe('workforce.forbidden')
  })

  test('a non-JSON failure body still becomes the same error, carrying the text as detail', async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: false,
      status: 500,
      text: () => Promise.resolve('gateway said no'),
      headers: { get: () => null }
    }))

    let failure = null
    try {
      await service().GetIdentityCodeRegister(42, '2026-07-13')
    } catch (e) {
      failure = e
    }

    expect(failure.isWorkforceApiError).toBe(true)
    expect(failure.message).toBe('gateway said no')
  })
})
