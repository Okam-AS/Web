# The SQL tier, run for the first time on this stack

```
dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build -c Debug \
  --filter "Database=SqlServer" --logger "trx;LogFileName=compose-7ac6f2b2-sql-tier.trx"

Failed!  - Failed: 22, Passed: 565, Skipped: 0, Total: 587, Duration: 55 m 15 s
```

**587 executed. Not 584 discovered and zero executed.** Every one of the 95 classes carrying
`[Trait("Database", "SqlServer")]` ran; the class-by-class census is in `sql-tier-classes.txt`. The three
properties the brief names as exercised nowhere are among them and are named individually below.

| | |
| --- | --- |
| SHA | `7ac6f2b2e8f275cd837f5b79dd60a4d92b7a7c1b` |
| worktree | `/Users/svendaneel/okam/wt-composestack`, own branch, built from a clean tree |
| SDK | 8.0.110 (`global.json`) |
| container | `mcr.microsoft.com/mssql/server:2022-CU14-ubuntu-22.04`, created by this run, reaped by its own ryuk `ec9af0b0`. Testcontainers cycles one per class fixture; every one of them was this lane's. |
| trx | `lanes/L-COMPOSE-AND-RUN-THE-STACK/compose-7ac6f2b2-sql-tier.trx` (in the OkamAPI tree) |

**Honest note on the working tree.** The tree was clean at build time and clean when the run's `git status`
was taken — except that the preceding fast-tier run had regenerated
`artifacts/journeys/ev-dietary/run-sheet.{json,md}`, the rewrite-on-run defect already recorded against
`23f6bbeb`, `1da15fb1`, `13217cfd` and `50b85657`. The diff is timestamps only, the writer is
`EventsDietaryRunSheetWireTests` (fast tier), no SQL-tier class reads either file, the run used
`--no-build` against an assembly compiled from the committed tree, and both files were reverted rather than
committed. Recorded because "the tree was clean" would have been false.

---

## The 22, accounted for individually — three causes, not twenty-two

### Cause 1 — 15 tests: the model and the chain disagree

```
Assert.False() Failure   Expected: False   Actual: True      (HasPendingModelChanges)
```

All thirteen `Has_no_pending_model_changes_after_the_*_wave` assertions — Events ×3, Margin, Meals ×3,
Training ×2, Workforce ×4 — plus `GrowthMigrationLineageTests` and `GrowthDispatchMigrationLineageTests`,
which carry the same call inside a differently-named test.

Root cause, the fix named and not made, and the proof that it predates this composition: see
**`finding-model-chain-fork.md`**. In one line: `bd3a840f` put `GrowthAuditEvents` into `OnModelCreating`
with no migration, `docs/plans/PENDING-MIGRATIONS-LEDGER.md` records it as the unwritten **MIG-29
`Growth_AuditLedger`**, and `dotnet ef migrations has-pending-model-changes` says
*"Changes have been made to the model since the last migration"* at `24cd4ead` — the parent, before this
lane merged anything.

### Cause 2 — 6 tests: Growth's dispatch path is broken on any chain-built database, and it reports the wrong reason

```
System.InvalidOperationException : Sequence contains no elements.
  at WebApi.Services.Growth.GrowthDispatchService.CreateOrGetRunAsync(...) Services/Growth/GrowthDispatchService.cs:line 316
```

- `GrowthDispatchLinearizationSqlServerTests.GRW_DISPATCH_001_two_concurrent_dispatch_requests_create_exactly_one_run`
- `GrowthDispatchLinearizationSqlServerTests.GRW_DISPATCH_001_two_concurrent_dispatchers_send_each_recipient_exactly_once`
- `GrowthDispatchRetryStrategySqlServerTests.CreateOrGetRun_under_the_production_retry_strategy_creates_the_run_graph`
- `GrowthDispatchRetryStrategySqlServerTests.CreateOrGetRun_is_idempotent_under_the_retry_strategy_no_duplicate_graph`
- `GrowthProviderClientKeyIdempotencyTests.A_retry_reusing_the_stable_client_key_deduplicates_at_the_provider`
- `GrowthProviderClientKeyIdempotencyTests.Duplicate_provider_client_key_is_rejected_by_the_unique_index`

**This is the same missing table as cause 1, seen from the product side, and it is a second defect on top
of it.** The sequence:

1. `CreateOrGetRunAsync` stages the run graph and `_audit.Append(DispatchRequested(...))` in one
   transaction, then calls `SaveChangesAsync`.
2. On a **chain-built** catalog `GrowthAuditEvents` does not exist — `WorkforceAuditEvents`,
   `MealsAuditEvents` and `TrainingAuditEvents` are all created by
   `Migrations/20260727221455_RestaurantModules_Initial.cs`; Growth's is created by nothing. The save
   throws `DbUpdateException`.
3. The `catch (DbUpdateException)` at line 312 assumes exactly one meaning for that exception — *"a
   competing dispatch request won the unique `NewsletterVersionId`"* — clears the tracker and reads the
   winner back with `FirstAsync`.
4. The transaction rolled back, so there is no winner. `Sequence contains no elements.`

So a venue whose newsletter dispatch cannot write its audit row is told a **competing request won**, and
then gets an unhandled `InvalidOperationException` — a 500, not a handled state.

**This is the defect shape the stack itself just fixed for two other modules and did not fix here.** The tip
carries `cdb4c66c` "Workforce: a constraint failure stops being read as a uniqueness clash" and `13cd9f18`
"Meals: a constraint failure stops being read as a uniqueness clash", landed together as
`8e2b57de` / L-VIOLATION-EXACT-LAND. **Growth's `GrowthDispatchService` has the identical bug and was not
in that sweep.** Named, not fixed — this lane composes and does not author.

The fast tier cannot see any of it: a model-built SQLite database has `GrowthAuditEvents`, so the audit
write succeeds, the `DbUpdateException` never fires, and all six pass.

### Cause 3 — 1 test: an assertion scoped to the store where its neighbours are scoped to the publication

```
Assert.Equal() Failure   Expected: 1   Actual: 2
WebApi.Tests/Workforce/SchedulePublishSqlServerTests.cs:line 60
Publish_commits_publication_recipients_inbox_outbox_and_audit_atomically
```

Line 60 is the fourth of five counts:

```csharp
Assert.Equal(1, await read.WorkforceSchedulePublications.CountAsync(p => p.SchedulePublicationId == publication.SchedulePublicationId));
Assert.Equal(1, await read.WorkforceSchedulePublicationRecipients.CountAsync(r => r.SchedulePublicationId == publication.SchedulePublicationId));
Assert.Equal(1, await read.WorkforceInboxItems.CountAsync(i => i.SchedulePublicationId == publication.SchedulePublicationId));
Assert.Equal(1, await read.WorkforceNotificationOutbox.CountAsync(o => o.StoreId == WorkforceWorld.StoreId));   // <-- line 60
Assert.Equal(1, await read.WorkforceAuditEvents.CountAsync(e => e.StoreId == WorkforceWorld.StoreId && e.Action == "schedule.publish"));
```

Its four neighbours filter on `SchedulePublicationId`; this one filters on `StoreId` alone, so it counts
**every** outbox row any test in the shared SQL Server fixture has left for that store. The three
publications the other tests in the class create are enough. It is a test-isolation defect in the
assertion's predicate, not evidence about the product — and it is the first time this class has run
anywhere, so nobody has seen it before. Fix named, not made: scope it to
`o.SchedulePublicationId == publication.SchedulePublicationId` like the three above it, or count the delta
across the publish rather than the absolute.

---

## What went GREEN, and it is the part the brief cared about

**565 passed**, including all three properties named as exercised nowhere:

| property | class | tests | outcome |
| --- | --- | --- | --- |
| the accounting-day unique index whose absence is a live production double-post | `WebApi.Tests.Kassa.AccountingSummaryDayIndexSqlServerTests` | 2 | **both passed** |
| the settlement revision guard, inert under SQLite | `WebApi.Tests.Events.EventsSettlementLifecycleTests` | 17 | **all passed** |
| the nine-deep chain replayed into an empty catalog and rolled back | `WebApi.Tests.Margin.RestaurantModulesMigrationRoundTripTests` | 1 | **passed** |

Also green: every trigger-immutability class, every race class, and 80 of the 95 lineage/guard classes in
full. **The nine migration joins do apply to a real catalog** — the round trip proves the chain replays from
empty, rolls back and re-applies — which is the single largest thing this run establishes and which no lane
could previously assert.

---

## Attribution: which of the 22 belong to the composition

Discovery was measured at both SHAs by this lane, from `--list-tests`, not inferred:

| | `24cd4ead` (parent) | `7ac6f2b2` (composition) | delta |
| --- | --- | --- | --- |
| all tiers, discovered | 5235 | 5284 | **+49 / −0** |
| **SQL tier, discovered** | **587** | **587** | **0 / 0** |

The 49 added are entirely the confirm family's Growth work and are entirely fast tier:
`GrowthPostmarkEventReaderTests` 38, `GrowthPostmarkWebhookWireTests` 8, `GrowthPrivacyDeadlineTests` 3
(the art. 3(4) / weekend / UTC-calendar gaps). **No SQL-tier test is added, removed or edited by the
composition** — `comm` between the merge's changed-file list and the 96 files carrying the trait is empty.

Therefore none of the 22 can be attributed to the merge on the test side. The one production file the
composition changes that a SQL-tier class exercises is `Services/Growth/GrowthWebhookIngestionService.cs`
(`GrowthWebhookIngestionSqlServerTests`) — **that class passed**. Cause 1 is additionally proven
pre-existing directly on the parent by `dotnet ef migrations has-pending-model-changes` at `24cd4ead`.

A full SQL-tier baseline at `24cd4ead` was run to close this by measurement rather than by argument; its
result is recorded in `baseline.md`.
