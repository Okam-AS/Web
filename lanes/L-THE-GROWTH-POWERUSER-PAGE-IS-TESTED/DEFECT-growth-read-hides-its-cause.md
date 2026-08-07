# The platform-growth read tells the poweruser the wrong thing about why it failed

`F-GROWTH-PUBLISH-LIES-ABOUT-WHY-IT-FAILED`, measured on the read path behind
`pages/admin/poweruser-growth.vue`. **Left failing on purpose** — three arms in
`test/growth-poweruser-page.test.js`, under
`describe('[KNOWN DEFECT] the reason the backend gave is what reaches the screen')`.

Not fixed here. The fix is one service away and this lane's remit was the page's tests.

## What was measured

`StatisticsService.GetPlatformGrowth` (`core/services/statistics-service.ts:40-45`) reads through
the **unsafe** `RequestService.GetRequest`, which does not catch. Axios rejects on every non-2xx, so
the rejection leaves the service **as the raw axios error**, and the page's `catch` puts
`error.message` on screen unchanged.

Driven through the real service against a transport that fails the way axios fails, with a backend
that answered with a reason in its body:

| what happened | body the backend sent | what the operator reads |
|---|---|---|
| 401 session expired | `Sesjonen din er utløpt` | `Request failed with status code 401` |
| 403 not entitled | `Du har ikke tilgang til plattformtall` | `Request failed with status code 403` |
| 500 report engine crashed | `Noe gikk galt i rapportmotoren` | `Request failed with status code 500` |
| offline | — | `Network Error` |

Under the heading `Kunne ikke hente vekstdata`.

## Why it matters, in three parts

1. **The backend's own reason is discarded every time.** The operator is shown a transport string
   instead of the sentence the server wrote for them.
2. **`error.statusCode` is `undefined` on all four**, so the page cannot branch on it either — an
   expired session cannot be told from a refusal or from a crashed report engine. The operator's
   correct next action differs in all three cases (sign in again / ask for the right / tell someone),
   and the screen supports none of them.
3. **The string is untranslated English inside a Norwegian admin UI.**

## The parts that fix it already exist, and say so

`RequestService` carries both halves, documented for exactly this purpose:

- `SafeGetRequest` (`:151`) resolves the transport rejection so the failed response can be read;
- `BuildError` (`:139`) prefers *"the backend's own message (an AppException reason the operator can
  act on) over the caller's generic fallback"* and attaches `statusCode` *"so callers can branch on
  e.statusCode — e.g. 401 => session expired, undefined => network failure"*.

`GetPlatformGrowth` calls neither.

## A second, quieter finding

The service's own fallback string, `'Failed to get platform growth'`, is reachable **only** when the
transport *resolves* a non-2xx — which axios on web never does. **On this platform that line is
dead**, which is why nobody noticed the message was never used.

## Scope

The other four reads in `statistics-service.ts` — `Get`, `GetPendingSettlements`,
`GetWoltDriveInvoice`, `GetHeatmapData` — are written to the same pattern and share the flaw. A fix
should take the file, not the one method.
