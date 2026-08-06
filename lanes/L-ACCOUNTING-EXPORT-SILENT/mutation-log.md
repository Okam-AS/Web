# L-ACCOUNTING-EXPORT-SILENT - mutation log

brief 07628337 - backend `feature/restaurant-modules` - 2026-08-04.
Worktree `/Users/svendaneel/okam/wt-acctexport`, branch `lane/accounting-export-silent`, created
`git worktree add -b lane/accounting-export-silent ... 8e2b57de`. No container started, no ref moved,
no migration authored, nothing pushed. Driver: `mutate.py` in this directory; raw output in
`mutation-run.txt`, per-mutant assertion values in `mutation-detail.txt`.

## 0. Tip state, measured rather than assumed

The brief said backend integration was `8e2b57de`. That is what the branch is at, and it is the tip:

    OkamAPI $ git log --oneline -1 feature/restaurant-modules
    8e2b57de L-VIOLATION-EXACT-LAND: merge receipt for the constraint-exactness landing

`feature/restaurant-modules` is checked out in no worktree; `OkamAPI-modules` is on
`lane/meals-grace-pins` at `34c6c103` and carries another lane's untracked WIP, so nothing was read or
built there. `integration/mig-stack-land` was not used.

**Both sites were still defective at the tip** - verbatim, before any edit:

    Services/MaintenanceService.cs:160    result.StoresExported = exportStoreIds.Count;
    Services/MaintenanceService.cs:48     foreach (var sweeper in _captureSweepers)   // empty -> clean result
    Services/Tripletex/AccountingExportOrchestrator.cs:55  foreach (var provider in _providers)   // empty -> empty list

`GetStoreIdsWithExportEnabledAsync` (`:34-49`) queries `AccountingConfigurations` and
`TripletexConnections` and never consults the providers. `AlertAsync` is called from *inside* the loop
(`:81`), so an empty loop never alerts. `ConfigController.cs:96` handed that number to the operator as
`accountingSummariesProcessed`, and `DailyMaintenanceBackgroundService.cs:89` logged it as
"{Stores} stores exported". No verdict of `fail-spec`: the defect is real and unfixed at `8e2b57de`.

## 1. What was changed, and why a floor alone was not the fix

**The fix** is that the reported number now measures what was exported.
`MaintenanceService.ExportAccountingAsync` keeps the two halves of a store's run apart -
`dailyResults` from the orchestrator, `posResults` from `ITripletexPosService` - and counts a store as
exported only when `dailyResults.Count > 0 && dailyResults.All(Success) && posResults.All(Success)`.
The eligibility query survives under its own honest name, `StoresEligible`.

Holding the halves apart is load-bearing, not tidiness. **`ExportPendingForStoreAsync` runs outside the
providers collection**, so with no provider registered the POS vouchers still post. Against a merged
list, "everything that came back succeeded" would call a store exported on the strength of its Z-report
vouchers while its daily books were never posted - the same substitution of one fact for another that
the original defect was. Mutant **M4** exists solely to hold that line.

**The second guard** is a refusal, per Sven's withhold-rather-than-zero ruling. With no provider at all,
`RunDailyExportAsync` logs at Error, alerts Discord (the alert an empty loop could never reach) and
returns one `AccountingExportResult` carrying the new `AccountingExportTarget.None`, so a zero says why
it is zero instead of reading as "this store had nothing to export". Same shape on the sweep:
`RunPaymentCapturesAsync` with no sweeper records a `Failures` entry, which
`PaymentCaptureBackgroundService.cs:66` already escalates to `LogError`.

`ConfigController.Cleanup` now returns `accountingStoresEligible` **and** `accountingStoresExported`;
the single misleading `accountingSummariesProcessed` key is gone. No client in `Web-modules` or `Core`
reads it (grepped).

**Test default changed as the brief predicted.** `MaintenanceServiceTests.BuildService` defaulted to
`sweepers ?? Array.Empty<IUncapturedOrderSweeper>()` - the suite's ordinary case was the broken one. It
now defaults to one live sweeper, and the empty case is passed explicitly by the tests that own it.
`DailyMaintenance_KeepsExportingAfterOneStoreFails` asserted `Assert.Equal(3, result.StoresExported)`
for a batch in which store 2's export threw; it now asserts 3 eligible / **2** exported.

## 2. Instrument audit, by direction

Three traps were named. Each is ruled out by construction, not by assertion:

- **Wrong tree.** One worktree throughout, `/Users/svendaneel/okam/wt-acctexport`; the driver's `TREE`
  constant is the only path any mutation or any `dotnet test` uses, so mutating one tree while measuring
  another is not expressible. A wrong-tree mutation shows as a green mutant - none occurred.
- **Stale binary.** Never `--no-build`. Both mutants are production code, so **`WebApi.dll`** is the
  assembly that has to move; the driver stats it before and after every run. It moved on **8 of 8** runs.
  `WebApi.Tests.dll` correctly did not move on the runs where no test source changed. A stale binary
  shows as a red restore - none occurred.
- **The world hiding the mutant.** Where a mutant survived a test, the **assertion** was strengthened,
  never the world: M4 initially escaped `A_store_whose_pos_vouchers_posted_...` because the refusal
  already failed that store, so the test was extended with case (b) - a registered provider that simply
  does not serve store 3, no wiring gap, no refusal - which pins `dailyResults.Count > 0` on its own.

Alternating RED/GREEN across consecutive runs is what rules out the first two at once.

## 3. Four states per site - all eight

`dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer&FullyQualifiedName~Maintenance"`
(24 tests). Container-free tier only; `FullyQualifiedName!~SqlServer` was never used.

| # | mutation | state | verdict | WebApi.dll moved | tests red |
|---|----------|-------|---------|------------------|-----------|
| M1 | `StoresExported = exportStoreIds.Count` restored, per-store counting deleted | MUTATED | **RED** 6/24 | yes 14:21:08 | 6 |
| M1 | | RESTORED | **GREEN** 24/24 | yes 14:21:39 | 0 |
| M2 | empty-sweeper refusal deleted | MUTATED | **RED** 2/24 | yes 14:22:09 | 2 |
| M2 | | RESTORED | **GREEN** 24/24 | yes 14:22:25 | 0 |
| M3 | empty-provider refusal deleted | MUTATED | **RED** 1/24 | yes 14:22:40 | 1 |
| M3 | | RESTORED | **GREEN** 24/24 | yes 14:23:01 | 0 |
| M4 | `dailyResults.Count > 0` dropped (POS half may stand in) | MUTATED | **RED** 4/24 | yes 14:23:22 | 4 |
| M4 | | RESTORED | **GREEN** 24/24 | yes 14:23:50 | 0 |

M1 is the defect exactly as it shipped: `StoresEligible` is left correct so **only the exported number
moves**, which is what makes the reds below readable as "the eligible count is being reported again".

### The reported number, by value

Every red is an equality on a number read from `DailyMaintenanceResult` or the `Cleanup` body - never a
status code. The mutant answers **3** in every world, which is precisely the point: 3 is the eligible
count and it is the same whatever happened.

| test | world | honest | M1 mutant |
|------|-------|--------|-----------|
| `An_export_with_no_provider_registered_reports_that_it_exported_nothing` | 3 eligible, no provider | **0** | 3 |
| `A_store_whose_pos_vouchers_posted_is_not_exported_when_its_daily_export_never_ran` | 3 eligible, no provider, POS posts | **0** | 3 |
| `A_failing_store_is_eligible_but_not_exported` | 3 eligible, 1 exported, 1 failed | **1** | 3 |
| `The_same_world_with_a_provider_registered_reports_the_stores_it_actually_exported` | 3 eligible, 2 exported | **2** | 3 |
| `The_operator_route_reports_what_was_exported_next_to_what_was_due` | route body, same world | **2** | 3 |
| `DailyMaintenance_KeepsExportingAfterOneStoreFails` | 3 eligible, store 2 throws | **2** | 3 |

Under **M4** the same worlds answer 2, 3, 3 and 3 against honest 1, 2, 2 and 2 - the POS half standing
in for a daily export that never ran. Under **M3** the refusal rows vanish:
`Expected: [1, 2, 3] / Actual: []` for the stores carrying a `None` refusal, while `StoresExported`
stays honestly 0 - the two guards fail independently, which is what makes them two guards.

Under **M2** both sweep tests report `Assert.Contains() Failure ... In value: List<String> []` - the
empty `Failures` list that is indistinguishable from a clean sweep.

## 4. Non-vacuity

- **Both directions at both sites.** Empty and non-empty are asserted for the export (0 vs 2) and for
  the sweep (a wiring failure vs two named providers and no failure). No test shows only the empty case.
- **Eligible and exported genuinely differ in the fixture** - 3 vs 2, and 3 vs 1, and 3 vs 0. Three
  stores are export-enabled (two via `AccountingConfigurations`, one only via an active
  `TripletexConnection`) and the registered provider serves two of them, so an assertion by value can
  tell which number is being reported. The stores carrying POS vouchers are `{1, 3}`, deliberately not
  the set the daily export serves, so the two halves cannot be confused either.
- **Read from the result object and the route body.** `Cleanup` is driven directly and
  `accountingStoresEligible` / `accountingStoresExported` / `captureResults` / `captureFailures` are
  read off the returned object by reflection. The status is 200 in every one of these worlds.
- **No empty-list assertion.** `Assert.NotEmpty(result.ExportResults)` is asserted in the empty-provider
  case, on purpose: the POS vouchers legitimately remain, and a pin that asserted an empty list would
  pass for a reason unrelated to the defect.
- The real `AccountingExportOrchestrator` is under test, not a double, so the empty-collection path
  exercised is the production one.

## 5. Suite

- Container-free tier, whole suite, after the change: **4646 passed, 0 failed, 12 skipped (4658)**.
- Same tier before the correction pass: 4645 / 0 / 12 - the delta is the eighth test added in this lane.
- No SQL Server tier was run; no container was started or touched.
- A full run dirties `artifacts/journeys/ev-dietary/run-sheet.{json,md}` (base behaviour). Restored with
  `git checkout --` after every full run; not committed.

## 6. C4 - money path

**Nothing here writes.** Both changes are reports and refusals: a count, two result objects, one route
body, one log line. No deposit, capture, refund, settlement line, funded order or timesheet cost is
created, altered or attributed differently by this diff. The capture sweep's write path
(`IUncapturedOrderSweeper.CaptureUncapturedCompletedOrdersAsync`) is untouched - the change only records
that it was never reached. No append-only table is read or written (C1); no migration (C2); the new
refusals travel on paths that already have callers, so nothing unreachable was added (C3).

## 7. Left for someone else

- The **composition-root floor** the census recommends for S5/S6 (one provider per declared
  `AccountingExportTarget`; a sweeper per provider that can hold a reservation) is not built here.
  `lane/census-floors-derived` appears to own that work and duplicating it would collide.
- `AccountingExportTarget.None = -1` is new. The enum is persisted nowhere (no reference under
  `Entities/` or `Migrations/`), and nothing in the tree enumerates its members, so a floor derived from
  the enum will need to exclude `None` explicitly.
- `WebApi.Services.Jobs` maps to `null` in `ProductionCallGraph.ModuleOf`, so neither money loop is
  covered by `ModuleReachabilitySweepTests`. Unchanged by this lane; recorded because it is why these
  two sites had no guard at all.

## 8. Files

    Enums/AccountingExportTarget.cs                     +None = -1
    Services/Tripletex/AccountingExportOrchestrator.cs  empty-provider refusal (log, alert, result)
    Services/MaintenanceService.cs                      daily/POS halves split; StoresExported counted
                                                        from the export; empty-sweeper refusal
    Models/Maintenance/MaintenanceResults.cs            +StoresEligible; both fields documented
    Controllers/ConfigController.cs                     both numbers in the operator body
    Services/Jobs/DailyMaintenanceBackgroundService.cs  "{Stores} of {Eligible} stores exported"
    WebApi.Tests/MaintenanceServiceTests.cs             sweeper default no longer empty; 3 -> 2 exported
    WebApi.Tests/MaintenanceEmptyCollectionReportingTests.cs   new, 8 tests
