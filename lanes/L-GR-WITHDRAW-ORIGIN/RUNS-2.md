# L-GR-WITHDRAW-ORIGIN, run 2 — evidence

Run 1 returned `fail-spec`: the exit named a deployed preference centre and there is none. This run is
against the wire-tier exit, and it closes the half that was still missing everywhere.

## 0. What already existed, and what did not

Read before writing anything, across worktrees, because two lanes solving one problem in different
places has happened repeatedly here.

| half | state on arrival | where |
|---|---|---|
| named CORS policy + credentialed grant | **DONE** | OkamAPI `lane/growth-prefcentre` @ `2a052800` |
| Events guest origin as a relationship | **DONE** | OkamAPI `lane/ev-guest-origin` @ `b0b501a5` |
| `API_BASE_URL` -> `api.okam.no` | **DONE** | Web `lane/fe-growth-prefcentre` @ `7a8b0d3` |
| browser walk with the grant taken away | **DONE** | same commit, fixture mode |
| **the session COOKIE, at any tier** | **ABSENT** | — |
| **any test relating the committed API origin to the pages** | **ABSENT** | — |

`7a8b0d3` moved the origin as a **bare literal with no test**. That is the same shape as the defect it
fixes: the wrong value also cost nobody a failing test.

## 1. Live production state, re-measured (read-only, no credentials, no mutation)

```
dig api.okam.no    -> okamapi.azurewebsites.net -> 40.118.102.46   (the ruled host exists)
dig okam.no        -> 185.199.108-111.153       (GitHub Pages)

OPTIONS https://api.okam.no/v1/growth/preference-session/preferences
  Origin: https://okam.no · Access-Control-Request-Method: GET
->  HTTP/2 204
    access-control-allow-origin: *        <-- F-PROD-CORS-WILDCARD still live
    (no access-control-allow-credentials)

GET https://okam.no/preferences/communications -> 404   <-- guest surface still unshipped
```

Both unchanged since run 1. The **brief file's** exit ("a browser at the deployed preference-centre
URL") remains unreachable and is gated by `D-PREFCENTRE-DEPLOY`.

## 2. Backend — `lane/gr-withdraw-origin` @ `e0c2b02f`, base `2a052800`

`WebApi.Tests/Wire/GrowthWithdrawalOriginWireTests.cs` (4 tests) + `RegistrableDomain.cs`.
Container-free, real pipeline, real link token spent over HTTP.

- a guest opens a real session and the **real `Set-Cookie`** is read off the response:
  `httponly`, `secure`, `samesite=strict`, `path=/v1/growth`.
- **the non-vacuity pair**: two reads built by ONE factory from one session — same route, same Origin,
  same CSRF header — differing in exactly one header. With the cookie: 200. Without: 401
  `growth.session_invalid`. Both carry the CORS grant, which is why the refusal is *readable* by the
  page rather than discarded by the browser.
- the withdrawal itself: refused PUT leaves the consent state **unchanged** (asserted on state, not
  only on status), then the same PUT with the cookie answers 200 `consented=false suppressed=true`,
  and carries no address (GRW-PII-001).
- the ruling as a **relationship**: the page origin the guest links are minted from and the committed
  API origin (`Mcp:PublicBaseUrl`, the same authority `b0b501a5` used) share a registrable domain;
  the page origin is in the set the policy was built from; and same site is NOT same origin.

### Mutations (each restored, `touch`ed so MSBuild recompiles — the stale-binary trap in CLAUDE.md)

| # | mutation | result |
|---|---|---|
| M1 | `Mcp:PublicBaseUrl` -> `okamapi.azurewebsites.net` | relationship test RED: `Expected: azurewebsites.net / Actual: okam.no` |
| M2 | cookie `SameSite=Strict` -> `Lax` | cookie test RED: `Not found: samesite=strict` |
| M3 | session cookie renamed | 3 of 4 RED — the suite is bound to the cookie the product actually sets |
| M4 | `[EnableCors]` removed from endpoint 3 | RED with the **production symptom**: `Expected: https://okam.no / Actual: *` |

M2 first failed printing the whole `Set-Cookie`, i.e. a working session credential into a red CI log.
Fixed before committing: value and attributes are split and never recombined for an assertion (C7).

### Numbers

| | failed | passed | skipped | total |
|---|---|---|---|---|
| base `2a052800`, same worktree | 0 | 4390 | 12 | 4402 |
| `e0c2b02f` | 0 | **4394** | 12 | 4406 |

Delta **+4**, one-for-one my four tests. No regressions.

## 3. Frontend — `lane/fe-gr-withdraw-origin` @ `8049332`, base `7a8b0d3`

`test/growth-withdrawal-origin.test.js` (5 tests) + the two file headers that still stated the defect
as live and unfixable (`utils/growth/growth-guest-client.js`, `pages/preferences/communications.vue`).
No rendered copy changed; no translation file touched.

The pin holds the committed API origin to **the market's own hostname** (`config/edition.js`), not to
a second copy of the string.

| # | mutation | result |
|---|---|---|
| F1 | `API_BASE_URL` -> `okamapi.azurewebsites.net` | RED: `Expected "okam.no" / Received "azurewebsites.net"` |
| F2 | Swiss market hostname -> under `okam.no` | the CH-gap test RED — it is a live pin, not a comment |

| | failed suites | failed tests | passed | total |
|---|---|---|---|---|
| base `7a8b0d3`, same worktree | 4 | 1 | 2427 | 2428 |
| `8049332` | 4 | 1 | **2432** | 2433 |

Delta **+5**, one-for-one. The 4 failing suites are environmental and pre-existing: three cannot run
because `core/` is an empty submodule mount in every lane worktree, and `journey-artifact-store`
hardcodes the checkout DIRECTORY NAME (`Web-modules@<sha>`), so it reds in any differently-named
worktree — flagged in the brief, not chased.

## 4. What this does NOT cover, said plainly

- **The wire tier cannot discriminate SameSite.** Every request above runs against one loopback host,
  which is trivially same-site. What the tier proves is that the cookie is Strict, that it is the only
  difference between authorised and not, and that the two committed hosts stand in the relationship
  the ruling turns on. It cannot prove a browser attaches it across `okam.no` -> `api.okam.no`.
- **The browser capture that would count needs the deploy.** `okam.no/preferences/communications` is
  404 and the live API still answers `*`. A local capture is loopback, i.e. same-site by construction,
  which is exactly what run 1's own harness concluded.
- **CH is still broken and is now measurable rather than a note in a return.**

## 5. Merge notes

- Order: `2a052800` -> `e0c2b02f`. `b0b501a5` is independent (appsettings + EventsSettings doc + one
  test file) and does not collide.
- **`RegistrableDomain` is extracted; `b0b501a5` holds an identical PRIVATE copy** for the Events
  origin. Whoever merges the two should collapse them — otherwise the estate carries two answers to
  "are these the same site".
- Nothing pushed. Both worktrees clean; the `artifacts/journeys/ev-dietary/` files the wire tier
  dirties were restored, never committed.
