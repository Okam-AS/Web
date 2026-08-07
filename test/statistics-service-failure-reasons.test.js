import { setPlatform } from '~/core/platform'
import { StatisticsService } from '~/core/services/statistics-service'

// ---- WHY THIS FILE EXISTS ---------------------------------------------------------------------
//
// Every read in `core/services/statistics-service.ts` threw away the reason the backend had
// written and replaced it with a sentence of its own, and none of them carried the HTTP status. A
// poweruser whose session had expired, one who was refused, and one whose report engine had
// crashed were all told the same thing.
//
// It was broken in TWO different ways in one file, which is why the fix took the file rather than
// the method that was reported:
//
//   the four POST reads    `PostRequest` already resolves a transport rejection into the returned
//                          value, so these DID reach their own `throw new Error('Failed to get
//                          statistics')`. The backend's reason was read off the wire and dropped.
//
//   the one GET read       `GetRequest` does NOT catch, so the axios rejection left the service
//                          before its `throw` was reached and the caller got axios's own "Request
//                          failed with status code 401". Its fallback sentence had therefore NEVER
//                          RUN ONCE on web — reaching it requires a RESOLVED non-2xx and axios
//                          only resolves 2xx. That is asserted below as a fact about the fix, not
//                          left as a claim: the read is now `SafeGetRequest`, which is what gives
//                          that line its first real job.
//
// The arms run the REAL service over a transport that fails the way axios fails: rejects on any
// non-2xx with the real response under `.response`, rejects with no response at all when offline.
// A double that resolved failures instead would be testing a world the product never meets.

let respondWith
class FakeHttpModule { httpClient () { return respondWith() } }
class FakePersistenceModule {}

beforeEach(() => setPlatform(FakeHttpModule, FakePersistenceModule))

const service = () => new StatisticsService({ bearerToken: '', clientPlatformName: 'Web', cultureCode: 'no' })

const axiosRejects = (status, body) => () => {
  const error = new Error('Request failed with status code ' + status)
  error.isAxiosError = true
  error.response = { status, data: body }
  return Promise.reject(error)
}
const axiosOffline = () => Promise.reject(Object.assign(new Error('Network Error'), { isAxiosError: true }))

// Every read in the file, with the shape of call each one takes. Named so a failure says which
// read broke rather than which index of an array did.
const READS = [
  ['Get', s => s.Get({})],
  ['GetPendingSettlements', s => s.GetPendingSettlements({})],
  ['GetWoltDriveInvoice', s => s.GetWoltDriveInvoice({})],
  ['GetHeatmapData', s => s.GetHeatmapData({})],
  ['GetPlatformGrowth', s => s.GetPlatformGrowth()]
]

async function failureFrom (call) {
  try {
    await call(service())
  } catch (error) {
    return error
  }
  throw new Error('the read resolved when it should have thrown')
}

describe('every read carries the reason the backend gave', () => {
  test.each(READS)('%s surfaces the backend reason instead of a sentence of its own', async (_name, call) => {
    respondWith = axiosRejects(500, { message: 'Noe gikk galt i rapportmotoren' })
    const error = await failureFrom(call)

    expect(error.message).toBe('Noe gikk galt i rapportmotoren')
    expect(error.hasBackendMessage).toBe(true)
    // and none of the file's own English fallbacks reached the caller
    expect(error.message).not.toContain('Failed to get')
    expect(error.message).not.toContain('Request failed with status code')
  })

  test.each(READS)('%s carries the status, so a caller can tell 401 from 403 from 500', async (_name, call) => {
    for (const status of [401, 403, 500]) {
      respondWith = axiosRejects(status, { message: 'uansett' })
      expect((await failureFrom(call)).statusCode).toBe(status)
    }
  })

  test.each(READS)('%s leaves the status undefined when the request never reached the server', async (_name, call) => {
    respondWith = axiosOffline
    const error = await failureFrom(call)

    // The distinction the page depends on: `undefined` means offline, a number means the server
    // answered. Without it "no connection" and "the server refused you" are the same screen.
    expect(error.statusCode).toBeUndefined()
    expect(error.hasBackendMessage).toBe(false)
  })

  test.each(READS)('%s falls back to its own sentence only when the body carried no reason', async (_name, call) => {
    respondWith = axiosRejects(503, null)
    const error = await failureFrom(call)

    expect(error.hasBackendMessage).toBe(false)
    expect(error.message).toContain('Failed to get')
    expect(error.statusCode).toBe(503)
  })

  test.each(READS)('%s still resolves a good response', async (_name, call) => {
    // So the arms above are about failure handling and not about a service that throws at everything.
    respondWith = () => Promise.resolve({ status: 200, data: { ok: true } })
    await expect(call(service())).resolves.toEqual({ ok: true })
  })
})

describe('the platform-growth read no longer loses the rejection', () => {
  test('a non-2xx reaches the service instead of escaping it as an axios error', async () => {
    // This is the arm that pins `SafeGetRequest` specifically. Before it, `GetRequest` let the
    // rejection past and the caller saw axios's message; the service's own handler never ran.
    respondWith = axiosRejects(401, null)
    const error = await failureFrom(s => s.GetPlatformGrowth())

    expect(error.message).toBe('Failed to get platform growth')
    expect(error.statusCode).toBe(401)
  })

  test('the fallback sentence on that read had never run before, and runs now', async () => {
    // The dead line, stated as a fact rather than as a comment. A RESOLVED non-2xx is the only
    // thing that ever reached it, and axios never produces one — so on web this branch was
    // unreachable until the read became safe. Both routes into it are asserted here.
    respondWith = () => Promise.resolve({ status: 503, data: null })   // the NativeScript shape
    expect((await failureFrom(s => s.GetPlatformGrowth())).message).toBe('Failed to get platform growth')

    respondWith = axiosRejects(503, null)                              // the web shape, newly reaching it
    expect((await failureFrom(s => s.GetPlatformGrowth())).message).toBe('Failed to get platform growth')
  })
})
