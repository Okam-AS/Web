# L-DATED-TEST-OUTPUT — a test suite stops dirtying the tree it runs in

brief 4091f761 · lane branch `lane/dated-test-output` off backend `569887a5` · worktree
`/Users/svendaneel/okam/wt-datedout` · commit `b10eb11c` (local only, never pushed)

---

## 1. The writer, named precisely

| | |
|---|---|
| File | `WebApi.Tests/Wire/EventsDietaryRunSheetWireTests.cs` |
| Test | `A_venue_records_a_requirement_and_the_reissued_run_sheet_prints_it` |
| Method | `WriteCapture(List<Step>, List<Item>, List<Item>)`, lines 268/290 at `569887a5` |
| Paths | `artifacts/journeys/ev-dietary/run-sheet.md` and `run-sheet.json`, both **tracked** at `569887a5` |
| Root | `TestRepoRoot.Resolve()` — walks up to `WebApi.csproj`, so it always lands in the checkout |

It is the **only** unconditional writer into a tracked path in the whole repository. Everything else
that writes (six golden-fixture regenerators, one Postmark sandbox smoke, one dev signing key) is
behind an explicit env opt-in or writes to `bin/`.

### What was dated in it

Not one field, five sources of per-run drift — which is why the clock was not the fix:

| Where | Value | Source |
|---|---|---|
| `run-sheet.json` | `capturedAtUtc` | `DateTime.UtcNow` in `WriteCapture` |
| `run-sheet.json` | `createdAtUtc`, `sentAtUtc`, `issuedAtUtc`, `statedAtUtc` (6 distinct values) | `EventsRunSheetService`/`EventsInquiryService` off the injected `TimeProvider` |
| `run-sheet.json` | 2 GUIDs | `Guid.NewGuid()` in the suite's own `SeedSubject()` (event `PublicId`, proposal `PublicToken`) |
| `run-sheet.md` | `Dietary and allergen requirement recorded by the venue (stated YYYY-MM-DD)` | `EventsRunSheetComposer.cs:213`, `statedAtUtc.Value.ToString("yyyy-MM-dd")` |

Committed copy said `stated 2026-07-31`. The copy this lane's tier run produced says `stated 2026-08-04`.
That single field is the whole "the wire tier dirties two files" line every brief has carried.

---

## 2. The fix, and why this one

**Chosen: move the artifact out of git's ledger, leaving the path unchanged.**
`.gitignore` gains `artifacts/journeys/`; the two files are `git rm`'d. The test is otherwise untouched
and still writes exactly where it always did.

The brief said prefer the clock when the artifact is meant to be reviewed. This artifact *is* meant to be
reviewed — there is no Events UI, so the run sheet's `Body` strings are the printed document. I chose the
path move anyway, on three grounds:

1. **The clock cannot make the JSON stable.** It is an HTTP transcript embedding two `Guid.NewGuid()`
   identifiers. Freezing time leaves it dirty on every run regardless.
2. **Freezing the clock means changing a fixture the whole wire collection shares.** The dated fields come
   from the composition root's `TimeProvider.System`, resolved inside `WireHostFixture`. Two other suites
   document *relying* on that being the real clock —
   `WebApi.Tests/Wire/MealsFundedCheckoutWireTests.cs:535` ("this host runs on `TimeProvider.System` (the
   composition root's own registration)") and `MealsVenueReachabilityWireTests.cs:188`. Overriding it for
   the whole collection to make one capture reproducible is exactly the shared-anchor change this estate
   keeps paying for.
3. **The estate had already ruled on this, on the other side of the fence.** `Web-modules/.gitignore`
   ignores `artifacts/` with the comment *"The FILES are a record of a run, not source, so they are not
   committed — but the CONTRACT is."* The backend was the outlier; it now states the same rule. Its
   `artifacts/tests/` (deliberate, date-free evidence) stays tracked — the rule is scoped to
   `artifacts/journeys/`, not to `artifacts/`.

Reviewability is preserved, not traded away: the capture is still produced at the same path on every run,
and the two docs that pointed at it (`docs/plans/events-dietary-capture-decision.md`,
`docs/plans/PENDING-MIGRATIONS-LEDGER.md`) now say it is regenerated rather than committed, and name the
filter that regenerates it.

---

## 3. The pin — `WebApi.Tests/TestOutputContainmentTests.cs`

Two facts.

### `Every_file_a_run_writes_lands_where_git_does_not_track_it`

Walks **every `*.cs` in the repository** (production and test; `obj/`, `bin/` excluded — scope is the
tree, never a list). For each file-writing call site it resolves the destination expression out of the
source and **asks git** `check-ignore` about it.

**What it actually asserts, in words:** *the destination of every write in this repository is a path git
does not track, or it is named in the allowlist with the reason it must be committed.*

- It does **not** match on `run-sheet`, on `ev-dietary`, or on any artifact name. It asks git a question
  about a resolved path. A dated file added tomorrow, under any name, in any directory, hits the same
  question — proved by arm B below, which uses `docs/plans/kitchen-brief-<date>.md`.
- **Unresolvable is a failure, not a pass.** A site whose destination the source does not state reds and
  must be allowlisted, so the sweep cannot be stepped past by computing a path at runtime (arm C).
- Where an expression's tail is not a literal (`Path.Combine(dir, fileName)`) resolution stops at the last
  literal segment and answers with the *directory* — the shallower, less-likely-to-be-ignored answer, so
  doubt reds rather than passes.
- Allowlist entries are checked in both directions: an entry naming a permitted destination stops covering
  a site that writes elsewhere (which then falls through to the ordinary rule), an entry claiming
  "unresolvable" reds if the site becomes resolvable, and an entry covering nothing is reported as stale.

### `A_file_written_into_the_journey_capture_directory_does_not_dirty_the_checkout`

Writes a probe into `artifacts/journeys/` and asserts `git status --porcelain` says nothing, **and** writes
a counter-probe into `WebApi.Tests/` and asserts git does speak. Without the counter-probe an empty status
looks the same whether the path was ignored or the command was wrong. Both are deleted in a `finally`.

### Coverage census (instrumented run, then restored)

```
CENSUS sites=12 inRepoCheckedByGit=3 exemptionsUsed=9 offenders=0
```

12 write sites; 3 resolved into the repository and were put to git; 9 are allowlisted. **State this
plainly: three quarters of the sites are exempt.** They are the six `OKAM_EMIT_WORKFORCE_FIXTURES=1`
golden regenerators, the Postmark sandbox smoke (destination from `GROWTH_POSTMARK_JOURNEY_OUT`, suite
skipped without a token), the dev signing key (writes to `AppContext.BaseDirectory` = `bin/`), and this
suite's own counter-probe. Each entry names one permitted destination, so none of them is a file-wide
blindfold — a new write to a new place in an exempt file is judged by the ordinary rule.

### What this check cannot see

- A write by a NuGet dependency, or by a process the suite shells out to.
- A write-call pattern occurring inside a **string literal** (comments and literals are masked before
  matching, which fixed the sweep's first false positive — its own doc comment saying
  `new StreamWriter(path)` — but a pattern *inside* a literal would still be parsed as a call).
- A destination helper defined in a **different file**: resolution is same-file only, so it comes back
  unresolvable, which reds rather than passes.
- The `--logger trx` files: those are the runner's writes, not the suite's.
- Anything in the frontend checkout. `Web-modules/.gitignore` states the rule there; nothing enforces it.

---

## 4. Non-vacuity — four mutation arms

`lanes/L-DATED-TEST-OUTPUT/mutation-proof.py` → full transcript in `mutation-proof.txt`. Every arm mutates,
runs the pin, restores, runs again. Restores are **written** (not `mv`'d) and `utime`d, per the CLAUDE.md
stale-build trap; no `--no-build` anywhere.

```
BASELINE: Passed!  - Failed: 0, Passed: 2, Skipped: 0, Total: 2

ARM A. the ignore rule is removed (the defect exactly as it shipped)
  mutated  -> Failed!  - Failed: 2, Passed: 0
    A run must leave the checkout clean. 3 write site(s) do not:
    WebApi.Tests/Wire/EventsDietaryRunSheetWireTests.cs: writes to `artifacts/journeys/ev-dietary/run-sheet.md`, which git tracks.
    WebApi.Tests/Wire/EventsDietaryRunSheetWireTests.cs: writes to `artifacts/journeys/ev-dietary/run-sheet.json`, which git tracks.
    Assert.Equal() Failure                      <- the probe fact reds too
  restored -> Passed!

ARM B. a second dated artifact, other directory, other name (docs/plans/kitchen-brief-<date>.md)
  mutated  -> Failed!  - Failed: 1, Passed: 1
    WebApi.Tests/Wire/EventsDietaryRunSheetWireTests.cs: writes to `docs/plans`, which git tracks.
  restored -> Passed!

ARM C. a destination the source does not state (Environment.GetEnvironmentVariable("SOMEWHERE") ?? "x.md")
  mutated  -> Failed!  - Failed: 1, Passed: 1
    ... which cannot be resolved from the source.
  restored -> Passed!

ARM D. git always answers "clean" (why the counter-probe exists)
  mutated  -> Failed!  - Failed: 1, Passed: 1
    Assert.NotEqual() Failure
  restored -> Passed!

RED-ON-DEFECT, GREEN-ON-RESTORE: A / B / C / D
```

Arm A is the exit criterion's own mutation: it reintroduces the defect and the pin names the exact two
files a dozen lanes have been restoring by hand.

---

## 5. The exit criterion — a full container-free tier leaves the checkout clean

### Backend

```
$ cd /Users/svendaneel/okam/wt-datedout
$ dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"
Passed!  - Failed:     0, Passed:  4631, Skipped:    12, Total:  4643, Duration: 5 m 20 s - WebApi.Tests.dll (net8.0)

$ git status --porcelain
$ git status --porcelain | wc -l
       0
```

**Verbatim, and empty.** Not "only the usual two". No container was started; the filter was
`Database!=SqlServer`, never `FullyQualifiedName!~SqlServer`. No `--no-build`.

The capture was still produced by that run, and git ignores it:

```
$ ls -l artifacts/journeys/ev-dietary/
-rw-r--r--  1 svendaneel  staff  9670 Aug  4 11:21 run-sheet.json
-rw-r--r--  1 svendaneel  staff  2837 Aug  4 11:21 run-sheet.md

$ git check-ignore -v artifacts/journeys/ev-dietary/run-sheet.md
.gitignore:57:artifacts/journeys/   artifacts/journeys/ev-dietary/run-sheet.md

$ grep -m1 capturedAtUtc artifacts/journeys/ev-dietary/run-sheet.json
  "capturedAtUtc": "2026-08-04T09:21:31.5890090Z",
$ grep -m1 "recorded by the venue" artifacts/journeys/ev-dietary/run-sheet.md
  Dietary and allergen requirement recorded by the venue (stated 2026-08-04): One coeliac ...
```

Today's date, in both files, with `git status` still empty. That is the defect, still happening, and no
longer costing anybody anything.

### Frontend (`/Users/svendaneel/okam/Web-modules`, `4b5c5c2`)

```
$ npx jest --ci
Test Suites: 112 passed, 112 total
Tests:       2583 passed, 2583 total

entries the run ADDED:   0
entries the run REMOVED: 0
```

Measured as a before/after diff of `git status --porcelain` because this checkout is shared and already
dirty. The tier changed nothing. The frontend never had this defect — its `artifacts/` has been ignored
all along, and its jest suites write under `os.tmpdir()`.

### Someone else's dirt in `Web-modules`, reported and NOT touched

Present before my run and after it, unchanged by it, not mine:

```
 M lanes/L-EV-JOURNEY-TIMEBOMB/mutation-proof.py
 M lanes/L-EV-JOURNEY-TIMEBOMB/mutation-proof.txt
 M pages/preferences/communications.vue
 M test/e2e/journeys/admin-refusal-worker.spec.js
 M utils/growth/growth-guest-client.js
```

plus ~77 untracked `lanes/L-*/` directories. I cleaned none of it and will not: it is other lanes' live
work in a shared checkout. This is precisely the case the brief describes — and with the backend now
reliably clean, deciding whether a modified file matters there is a one-second check instead of a
judgement call.

---

## 6. Ship note for the brief template

**The restore line can come out of the brief template.** The instruction

> *the wire tier dirties two tracked `artifacts/journeys/ev-dietary/` files — restore, do not commit*

is now false on this branch, and was teaching every agent that a dirty tree after a test run is normal. A
full container-free tier leaves the backend checkout byte-for-byte clean (§5), and
`TestOutputContainmentTests` reds if anything puts dated output back into a tracked path (§4).

---

## 7. What I touched

Backend worktree `/Users/svendaneel/okam/wt-datedout`, commit `b10eb11c` (local; **not pushed**):

- `.gitignore` — `artifacts/journeys/` + the reason
- `artifacts/journeys/ev-dietary/run-sheet.json`, `run-sheet.md` — deleted from the index
- `WebApi.Tests/TestOutputContainmentTests.cs` — new, the pin
- `WebApi.Tests/Wire/EventsDietaryRunSheetWireTests.cs` — docstring only; no behaviour change
- `docs/plans/events-dietary-capture-decision.md`, `docs/plans/PENDING-MIGRATIONS-LEDGER.md` — one line each

`Web-modules`: only `lanes/L-DATED-TEST-OUTPUT/` (this file, `mutation-proof.py`, `mutation-proof.txt`) and
`docs/plan/returns/L-DATED-TEST-OUTPUT-1.md`.

No migration authored. No push. No container started. No shared ref moved — backend `569887a5` and
frontend `4b5c5c2` both verified unchanged after the work; `lane/dated-test-output` is a new branch.

**No failure failed to reproduce**: the tier was green on its first and only run, and all four mutation
arms reproduced deterministically on both passes.
