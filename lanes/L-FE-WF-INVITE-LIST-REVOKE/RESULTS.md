# L-FE-WF-INVITE-LIST-REVOKE — measured results

All runs from `/Users/svendaneel/okam/web-fe-invlist` (branch `lane/fe-wf-invite-list-revoke`, cut
from `e34977a`). Ports `E2E_FIXTURE_PORT=4311`, `E2E_WEB_PORT=3311` — chosen because 4010 (orphan
PID 73160) and 4310 (another lane) were both occupied. The orphan was not touched.

## Browser journeys — the exit criterion

`npx playwright test test/e2e/journeys/workforce-invitation-list-revoke.spec.js`

**2 passed (26.1s)** — run 2, after the contradiction fix. Log: `journey-run-2.log`
(run 1, before the fix, is `journey-run-1.log` — also 2 passed, which is the point of the finding).

Fresh fixture bind confirmed in both logs by `[fixture] listening on http://127.0.0.1:4311`, the line
that only a newly bound process prints. `reuseExistingServer` adopted nothing.

### `workforce-invitation-list-revoke` — 8 steps, all passed

| # | Step | Recorded outcome |
|---|---|---|
| 1 | sign in as the manager on the roster | landed on /admin/workforce-roster |
| 2 | a code that lapsed a month ago is NOT shown as live | `Laget 21. juni kl. 22:13, utløpt 5. juli kl. 22:13. Den kan ikke brukes av noen lenger.` |
| 3 | withdrawing a lapsed code is housekeeping, not a rescue | lapsed code cleared; Kari now has nothing outstanding |
| 4 | issue a code and read it back off the list | the code just minted is in the list, and reads as live |
| 5 | the list never shows the code itself | the run's real code appears nowhere in the rendered list |
| 6 | withdraw the live code | withdrawn; nothing is outstanding for this engagement |
| 7 | the withdrawn code is refused EXACTLY as one that never existed | **both refusals identical, 344 characters** |
| 8 | what the browser said while this ran | 2 console errors recorded as findings |

Step 2's dates are the proof the seed is real and rendered in the store's zone: today −30d = 5 July,
today −44d = 21 June, at 22:13 Europe/Oslo for a 20:13 UTC run.

### `workforce-invitation-revoke-claimed` — 4 steps, all passed

| # | Step | Recorded outcome |
|---|---|---|
| 1 | the manager issues a code and reads it as live | a live code is outstanding for Nina |
| 2 | meanwhile, in another browser, the worker claims it | the code has been redeemed by the account that received it |
| 3 | the manager presses Withdraw on a list one moment stale | `Koden er allerede brukt — Noen har logget inn med denne koden før den ble trukket tilbake…` |
| 4 | what the browser said while this ran | 3 console errors recorded as findings |

## Console findings — recorded, not asserted

Neither journey fails on these, deliberately: the flows completed, so failing there would say the
capability does not work, which is false.

- **2× `pageerror: Navigation cancelled from "/admin?redirect=…" to "…&storeId=42"`** — pre-existing,
  fires on the admin redirect during sign-in, and appears in the onboarding journey's artifact on
  this branch too. Not introduced by this lane.
- **1× `Failed to load resource: the server responded with a status of 409 (Conflict)`** — the
  already-claimed refusal being logged by the browser. Inherent to a journey whose subject *is* a
  409; the page handles it, which is what step 3 asserts.

## Jest

`TZ=Europe/Oslo npx jest test/workforce --coverage=false`

**41 suites passed, 920 tests passed** (2.5s). Includes the two files carrying this lane's changes:

- `workforce-roster-components.test.js` — the inverted pin + 8 new tests for the list
- `workforce-roster-client.test.js` — 5 new wire-contract tests for #6b and #6c

The full Jest suite was **not** run: the brief notes it carries reds that are not this lane's
(`journey-artifact-store.test.js` pins the checkout's directory basename, so it fails in any
worktree). Scoping to `test/workforce` covers every suite that touches what changed.

## Regression: the journey I modified

`npx playwright test test/e2e/journeys/workforce-invitation-onboarding.spec.js`

**1 passed (28.1s)** — log `journey-onboarding.log`. Its pinning step is inverted and its stale
backend-handoff finding removed, and it still walks the full invite → claim → published-shift loop.

## Lint

`npx eslint` over all 13 changed/added files: **0 errors**. Three pre-existing `indent` warnings at
`translations/{en,no,de}.ts:698/715` — roughly 2,200 lines above anything this lane touched.

## Locale checks

- `grep -rniE "has no such routes|ingen slike ruter|keine Routen" translations/` → **no matches**.
  The exit criterion, measured directly.
- All 15 new keys present in **all three** locales; `wfr_access_no_list` present in **none**.

## Not done, and named rather than implied

- **`npm run test:e2e:fixture-divergence` was not run** against `/Users/svendaneel/okam/wt-wfinvlist`.
  That runner reads the backend live and compares refusal shapes, and it is the natural next check on
  my fixture handlers. My handlers were written from the backend source at `68f2472c`, but read by a
  person, not diffed by the instrument.
- **`workforce.invitation-revoke-conflict` was never walked.** It needs a real DB rowversion, so it
  is a SQL Server answer that neither this fixture nor the backend's own fast tier can reach. The
  client and the page handle the code and the copy exists; the path is unexercised and the fixture
  deliberately does not fake it.
- **No SQL tier, no container.** None was granted and none was started.
