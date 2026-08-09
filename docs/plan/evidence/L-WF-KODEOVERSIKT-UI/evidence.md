# L-WF-KODEOVERSIKT-UI — evidence

Baseline taken by me, not inherited: frontend `feature/restaurant-modules` @ `e34977ac`
(matches the orchestrator's last measurement). Backend checkout was on `lane/meals-grace-pins`
@ `34c6c103`, **not** the integration branch — everything backend below was read via
`git show 8e2b57de:<path>` without touching that checkout.

Work landed on `lane/wf-kodeoversikt-ui` in worktree `/Users/svendaneel/okam/web-kodeui`,
three commits, nothing pushed:

| commit | what |
|---|---|
| `1e5b523` | cherry-pick of the unmerged `a649e08` (button, client method, caveat rewrite, 6 keys × 3 langs) |
| `ba09fe3` | the browser journey + the two fixture routes + the append-only issue record |
| `3def258` | eslint `arrow-parens` / `require-await` in the journey |

## The finding that shaped the lane

The brief said "no client method, no button". True at `e34977ac` — and the frontend map
confirmed the whole surface was absent there. But the work **existed**, built and never merged,
on `lane/wf-idreg` @ `a649e08` (worktree `/Users/svendaneel/okam/web-wf-idreg`). Its parent
`bbb80d65` is an ancestor of `e34977ac`, so it cherry-picked with no conflict. The prior lane's
own return states plainly: *"C5: not accepted. Nobody has walked this in a browser."* That was
the actual gap, and it is what this lane closes.

## Backend verified at `8e2b57de`, not trusted

Both idreg commits (`a04f51ca`, `d22c84c9`) **are** ancestors of the integration tip. The
handler exists and is wired — contradicting the sibling lane that found a briefed route with no
handler at all. All four briefed claims hold:

- **Route** — `Controllers/WorkforcePersonnelListController.cs`,
  `[HttpGet("personnel-list/code-register")]` on `[Route("workforce/stores/{storeId:int}")]`,
  class-level plain `[Authorize]`. Returns `File(bytes, "text/csv; charset=utf-8",
  "okam-kodeoversikt-{storeId}-{yyyy-MM-dd}.csv")`. DI at `Program.cs:721`.
- **Deterministic rows** — coded rows ordinal-ascending by `identityCode`, codeless last by name
  then category; one row per code regardless of how many windows a person worked.
- **Uncoded counted, not dropped** — codeless participants are *not* collapsed (two of them are
  two people to resolve by hand), printed with an empty code column and counted on
  `# rowsWithoutIdentityCode=`.
- **Append-only issue record** — `WorkforceIdentityCodeRegisterIssues`, guarded twice:
  `GuardAppendOnly` in `ApplicationDbContext.cs:1531-1544` and an `AFTER UPDATE, DELETE`
  trigger that `ROLLBACK`s and `THROW 50018`. One `Guid.NewGuid()`, one `.Add`, one
  `SaveChangesAsync` ⇒ **one call inserts exactly one row**; a refused caller inserts zero.
- **Retention stamp** — `RetainUntilUtc` = accounting-year-end + 3y6m, on the row *and* on the
  document face as `# retainUntil=`.

The wire path matches the client byte for byte, and `Content-Disposition` is genuinely readable
cross-origin (`BrowserReadableHeaders.All` applied at `Program.cs:99-102`).

## The three exit clauses, each driven by clicking

`test/e2e/journeys/workforce-kodeoversikt.spec.js`, real Chromium at 1280×720, no container.
Eight steps, all green (`journey-green.json`):

1. `landed on /admin/workforce-personnel-list`
2. `three participants on 2026-07-13, one of them uncoded`
3. **`the caveat names the issued template`** ← exit clause 3
4. `control at 176×37 inside 1280px` ← the Training hit-test hazard, checked
5. **`downloaded okam-kodeoversikt-42-2026-07-13.csv`** ← exit clause 1, server-chosen name
6. `template carries 2 codes, 1 uncoded participant, retain-until 2030-06-30`
7. **`two issue rows, distinct ids, both stamped with an actor`** ← exit clause 2, read back
8. `no page-owned console errors (2 shell-redirect entries recorded as a note)`

The issue row is **read back off the server**, not inferred from the request log: "the browser
sent a request" and "the handover was recorded" are different facts and only the second is the
one § 8-5-6 leans on. A second click appends a second row — the designed behaviour (a GET with
no Idempotency-Key, because suppressing the second production is exactly wrong for a handover),
now pinned so nobody "fixes" it into an idempotent read.

## Non-vacuity proved by mutation, not by a green run

Each mutation applied, run, observed red, restored with `git checkout --`, tree confirmed clean:

| mutation | result |
|---|---|
| delete the button block from the page template | RED — `locator('.wfpl-page__btn--register')` element(s) not found |
| revert `wfpl_identity_gap` to the pre-lane wording | RED — `Expected substring: "lastes ned fra personallistesiden"` |
| dedupe the issue record per business day | RED — `Expected length: 2 / Received length: 1` |

## Suites

- Jest, `TZ=Europe/Oslo`: **113 suites / 2596 passed**, 1 suite / 2 tests failed.
- The 2 failures are **proved pre-existing**, not inherited as an assumption: reproduced
  identically at the untouched baseline `e34977ac` in a throwaway detached worktree (since
  removed). `test/journey-artifact-store.test.js:457` asserts the process holding the fixture
  port runs from a directory literally named `Web-modules`, so it fails in *any* worktree.
- eslint: 0 errors on every file this lane touched.

## Two environment hazards found

1. **An orphaned fixture server (PID 73160, PPID 1) has held port 4010 since 16:03**, running
   from `/Users/svendaneel/okam/wt-jwf` — another lane's worktree. Playwright's
   `reuseExistingServer` silently adopted it and my first run 404'd on routes that exist,
   because it was serving four-hour-old code. **Any lane running e2e on the default ports right
   now is testing against that stale build.** I did not kill it (not mine); I ran on
   `E2E_FIXTURE_PORT=4021 E2E_WEB_PORT=3021` instead.
2. A fresh git worktree gets an **empty `core/` submodule mount**, which makes three unrelated
   Jest suites fail to run. Populated by copying from the main checkout; not a code defect.

## Constraints

- **C1** — no UPDATE/DELETE against an append-only table; the fixture's issue list is
  append-only by construction and the mutation that made it dedupe is what proves the test bites.
- **C2** — no migration authored or touched.
- **C3** — the page was already linked from `AdminPageHeader.vue:362`; client method, button,
  route and nav all exist in one reachable path, and the journey is the proof rather than the claim.
- **C4** — every issue row carries `issuedBy`, asserted non-null on both rows.
- **C5** — **not acceptance.** Sven has not walked this. What is proved is that a browser can.
- **C6** — the caveat now names the template the button issues. **The statutory naming was not
  widened**: still exactly one § reference on the sheet, asserted by count (`toBe(1)`), and the
  new copy promises only that the overview is produced and that the venue completes and keeps it.
- **C7** — no log or telemetry call added. The issue rows map codes to a business day and are
  fetched from Node over the fixture control surface, never through the page, so they never enter
  page state or the journey artifact.

## Not done, named rather than absorbed

- The real table's retention lock (THROW 50018, `GuardAppendOnly`) is **not** exercised here —
  this harness runs with no backend and no SQL Server by design, and my brief granted no
  container. The fixture models the observable behaviour; the locking is the backend suite's
  ground, where it is already pinned.
- The two product gaps the prior lane reported still **hold and are unfixed**: only `Employee` is
  ever set in production (`WorkforcePersonnelListProjection.cs:207`), and there is no correction
  path (`correctionActor` is null at both call sites). Both are § 8-5-6 obligations.
- `D-IDCODE` is `venue-procedure-template`: this produces a **template**, not the register.
  § 8-5-6 is satisfied only once the venue fills in the fødselsnummer column and keeps it.
  The legal gap is **mitigated, not closed** — F-WF-NOREG should stay open at reduced severity.
