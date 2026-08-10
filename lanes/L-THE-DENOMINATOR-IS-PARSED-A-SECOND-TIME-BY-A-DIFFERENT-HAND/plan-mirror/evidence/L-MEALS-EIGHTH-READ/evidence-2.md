# L-MEALS-EIGHTH-READ — evidence, return 2 (re-scoped to the merge)

Ruling in force: `re-scope-to-the-merge` (D-SPEC-L-MEALS-EIGHTH-READ, ruled 2026-08-05 by @sven).
The exit in brief `05ee3134` is superseded; return 1's `evidence.md` in this directory is left
untouched because the ruling cites it.

Re-scoped hazard: **the re-quote release landing without the pin**, which leaves the fourth release
site unaudited while the board reads as covered.

Refs are read with `git show <ref>:<path>` / `git grep <ref>` against the shared object store of the
OkamAPI worktree set. The only working-directory reads are in my own worktree
`/Users/svendaneel/okam/wt-meals-eighth-read`, and each is named as such.

---

## 1. The brief's measurement, re-taken at the integration tip

Integration tip: `feature/restaurant-modules` = `8e2b57de8442a389a9b5f8025312c9750614c85e`
("L-VIOLATION-EXACT-LAND: merge receipt for the constraint-exactness landing", 2026-08-04 11:58).
`lane/gr-delivery-record` and `lane/train-demo-seed` also point at that commit.

```
git grep -n "ReservedMinor = ReservedMinor -" 8e2b57de -- Services
  Services/Meals/MealsFundingAuthority.cs:453
  Services/Meals/MealsReconciliationWorker.cs:132          -> exactly two

git merge-base --is-ancestor 9fe599c6 8e2b57de             -> NO   (pin still unmerged)
git grep -l "SupersedesToken" 8e2b57de                     -> 0 files (release not at the tip)
```

The brief's measurement is confirmed at the ref it names.

## 2. Three SQL statements, four release entry points

At the tip `MealsFundingAuthority` already carries three public release members — `ReleaseAsync`
(:283), `ReleaseByOrderIdAsync` (:311), `ReleaseSupersededAsync` (:335) — all funnelling into the
single statement in `ReleaseResolvedReservationAsync` (:453). **The tip's `ReleaseSupersededAsync`
is the explicit owner release** (an employee asking for their own budget back, called from
`MealsQuoteService.cs:377`, landed with `lane/meals-release`). It is *not* the re-quote's implicit
supersede, and it must not be mistaken for it when reading the tip.

`lane/meals-requote-release` @ d5483cb3 adds the **fourth entry point and the third SQL statement**:
a private supersede release inside `MealsQuoteService` that mutates the tracked reservation and
issues its own `ExecuteSqlInterpolatedAsync`. It never enters `MealsFundingAuthority`.

## 3. The hazard, measured: the pin does not ride with the release

`git branch --contains d5483cb3` → six branches carry the re-quote release. Whether each also carries
the pin (`9fe599c6`) and the SQL twin (`7dafec47`):

| branch | sha | pin | SQL twin | supersede fixture |
|---|---|---|---|---|
| lane/meals-requote-release | d5483cb3 | **NO** | no  | 9 tests, 0 uninvolved holds |
| lane/meals-fourway-tier    | 702d9481 | **NO** | no  | 9 tests, 0 |
| lane/meals-supersede-sql   | 7dafec47 | **NO** | yes | 9 tests, 0 |
| lane/meals-eighth-pin      | 9fe599c6 | yes    | no  | 10 tests, 8 |
| lane/meals-eighth-read     | 9c450f80 | yes    | no  | 10 tests, 8 |
| lane/meals-quote-retry     | 92d45967 | yes    | yes | 10 tests, 8 |

(fixture columns = `public async Task` count and `HoldUninvolvedAsync` reference count in
`WebApi.Tests/Meals/MealsRequoteSupersedeTests.cs`; the unpinned three share blob `39cec9c35b08`,
the pinned three share `8197ccc53484`.)

**Three of the six re-quote-bearing branches carry the release without the pin** — and they are the
three the plan positions as landing or proof candidates: the release lane itself, the four-way
composition (L-MEALS-FOURWAY-TIER, *"the merged state gets a full run"*), and the SQL lane
(L-MEALS-SUPERSEDE-SQL). Only `lane/meals-quote-retry` carries release + pin + SQL twin, and it is
not a drop-in substitute — it brings its own production retry change.

This answers the decision's `reopen_when` by measurement rather than by reading: *"the pin turns out
to be an ancestor of every re-quote-bearing branch, making the hazard self-carrying"* is **FALSE**.

The SQL twin does not close the gap either: `MealsRequoteSupersedeSqlServerTests` at 7dafec47 is
`[Trait("Database","SqlServer")]` + `[Collection(MealsSqlServerCollection.Name)]`, so in the
container-free tier this program actually runs, it does not execute at all.

## 4. Not read — measured at the world, in my own worktree

Trial merge, local to my worktree, branch `trial/meals-eighth-read-tipmerge`:

```
git checkout -b trial/meals-eighth-read-tipmerge 8e2b57de
git merge 9fe599c6 --no-edit
```

→ **zero conflicts**, merge commit `a7d07559`, parents `8e2b57de 9fe599c6`. Because 9fe599c6
contains d5483cb3, that single merge brings the release **and** the pin.

The merged state has three decrement statements — `MealsFundingAuthority.cs:453`,
`MealsQuoteService.cs:767`, `MealsReconciliationWorker.cs:132` — and both supersede paths coexist:
the explicit owner release through the authority (`MealsQuoteService.cs:388`) and the implicit
re-quote release with its own SQL (`:767`).

The same clamp return 1 used — `SET ReservedMinor = 0` with the `>= 0` floor dropped, at
`MealsQuoteService.cs:767` — run at the MERGED TIP against both fixtures, one worktree, a full build
before each run, filter `FullyQualifiedName~MealsRequoteSupersedeTests&Database!=SqlServer`:

| # | state | result |
|---|---|---|
| 1 | merged tip, pinned fixture, clean production | Passed 10, Failed 0 |
| 2 | merged tip, pinned fixture, **clamp** | **Failed 4**, Passed 6 |
| 3 | merged tip, **pre-pin fixture** (`39cec9c35b08`, what d5483cb3 / 702d9481 / 7dafec47 carry), **identical clamp** | **Passed 9, Failed 0 — invisible** |
| 4 | both files restored | Passed 10, Failed 0 |

Run 3 is the hazard itself rather than an argument about it: at the current tip, with the release
landed from an unpinned branch, a clamped fourth site is green on every test that branch carries.

Restoration verified by `git diff HEAD --stat` empty and `git status --porcelain` empty, not by
reading. The final run was taken from a rebuilt assembly whose mtime was checked — WebApi.dll
11:25:36, WebApi.Tests.dll 11:25:48, sources 11:24:55.

**Full container-free tier at the merged state**, filter `Database!=SqlServer`:
`Passed 4648, Failed 0, Skipped 12, Total 4660, 12 m 21 s` — trx committed beside this file as
`tipmerge-fast-tier.trx`. As far as I can measure, this is the first full tier on a tree carrying
**both** the current integration tip and the re-quote release; L-MEALS-FOURWAY-TIER's 4366-test run
was on 702d9481, whose base predates today's tip. Read it as *the merge is green and conflict-free*,
never as evidence against the eighth read — run 3 above is exactly what an all-green tier looks like
when the fixture is clamp-blind.

Why no other fixture can catch it, re-measured at the merged state rather than inherited: the token
reaches the service only as the third positional argument of `MealsFundingTestKit.QuoteRequest`
(`string? supersedesToken = null`, MealsFundingTestKit.cs:76).
`grep -rn "QuoteRequest([^)]*,[^)]*,[^)]*)" WebApi.Tests/` → 11 call sites, **all of them in
MealsRequoteSupersedeTests.cs**. Ten other test files call `QuoteRequest` with two arguments and
none of them can reach the supersede release.

## 5. What I could not measure — stated, not substituted

**No SQL tier.** I had no container slot, took none, and started no container. Every run above is
SQLite with `Database!=SqlServer` on the filter. So I did not measure whether SQL Server's
`CK_MealsBudgetGuards_*` constraints and the `>= 0` floor behave under the clamp as SQLite's do, the
detach-and-re-read path under the retrying execution strategy, or the SQL twin at 7dafec47.
F-MEALS-NO-SQL-ON-REQUOTE is untouched by this lane, and none of my SQLite runs is offered in its
place.

**No browser walk.** Nothing here satisfies C5. This is a measurement about which commit carries
which audit, never evidence that a capability exists.

## 6. C1 and C4

C1: no UPDATE or DELETE was added anywhere. The only mutations were injected, measured and restored
byte-identically in my own worktree; nothing was committed to a shared branch and nothing pushed.

C4, reported and not created: the fourth site still names no actor. `lane/meals-release-actor` @
249612ac makes `actorKind`/`actorReference` required and undefaulted on the authority's release
members (enforced both ways at :320-334) and stamps the sweep `MealsActorKind.System` with a null
reference (MealsReconciliationWorker.cs:152-153) — while `git show d5483cb3:Services/Meals/MealsQuoteService.cs
| grep -c ActorKind` is **0**. Merged, the attribution lands three-of-four exactly as
F-MEALS-ACTOR-WORKLIST-STALE says. That flag asks *who* freed the allowance; the hazard re-scoped
onto here asks whether *the number is checkable at all*. Neither covers the other.

## 7. Recommendation — one checkable predicate

For whoever merges Meals into `feature/restaurant-modules`:

```
git merge-base --is-ancestor 9fe599c6 <the-merge-commit>
```

Landing `9fe599c6` itself is the cheapest way to satisfy it — one merge, zero conflicts, full tier
green, all measured above — and it carries the release with it. Landing d5483cb3, 702d9481 or
7dafec47 alone lands the release with the clamp-blind fixture.

Restate F-MEALS-EIGHTH-READ's `clears_when` as that predicate rather than as the fixture gap.
Clearing it against the pin's mere existence is precisely the failure the `re-scope-to-the-merge`
option's own `con` names — the old title travels into the next reader's head as "covered".

## 8. Footprint, and one ops note

- Branch `trial/meals-eighth-read-tipmerge` @ `a7d07559` is **local only**, prefixed `trial/` so it
  is not mistaken for a lane. It is disposable; it exists only so `a7d07559` stays resolvable.
- No push, no commit on any shared branch, no production touched, no container started or stopped.
- Commits by explicit pathspec only; `git add -A` never run; `git stash` never used.
- **Ops note:** the full fast tier rewrites tracked files — it left
  `artifacts/journeys/ev-dietary/run-sheet.{json,md}` modified with today's date (an Events journey
  test regenerates them). Anyone running the tier and then committing with `git add -A` will sweep
  that churn into their commit. I restored both with an explicit `git checkout --` pathspec.
