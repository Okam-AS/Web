# L-EF-DECLARES-EVERY-TRIGGER — evidence

## 1. The pairing, derived (not copied)

Swept `Migrations/**` for `CREATE TRIGGER`, replaying only each migration's `Up()` body — a whole-file
scan cancels every trigger against its own `Down()` and reports a clean sweep over an empty set. The
table comes from each statement's **`ON` clause**, never from the trigger's name.

**25 `CREATE TRIGGER`, 25 distinct tables, 1:1, none dropped later in the chain.** The chain-tip set is
therefore all 25. This matches the flag's list, arrived at independently.

| # | Trigger | Table (from `ON`) | Event | Migration |
|---|---|---|---|---|
| 1 | TR_WorkforceAuditEvents_AppendOnly | WorkforceAuditEvents | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 2 | TR_WorkforceIdempotencyRecords_AppendOnly | WorkforceIdempotencyRecords | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 3 | TR_WorkforceSchedulePublications_Immutable | WorkforceSchedulePublications | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 4 | TR_WorkforceClockEvents_AppendOnly | WorkforceClockEvents | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 5 | TR_WorkforceAttendanceAdjustments_AppendOnly | WorkforceAttendanceAdjustments | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 6 | TR_WorkforcePersonnelListParticipants_RetentionLock | WorkforcePersonnelListParticipants | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 7 | TR_WorkforcePersonnelPresenceEvents_RetentionLock | WorkforcePersonnelPresenceEvents | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 8 | TR_WorkforcePersonnelListEntries_RetentionLock | WorkforcePersonnelListEntries | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 9 | TR_GrowthConsentReceipts_AppendOnly | GrowthConsentReceipts | INSTEAD OF UPDATE, DELETE | RestaurantModules_Initial |
| 10 | TR_GrowthSuppressions_AppendOnly | GrowthSuppressions | INSTEAD OF UPDATE, DELETE | RestaurantModules_Initial |
| 11 | TR_GrowthConsentCheckReceipts_AppendOnly | GrowthConsentCheckReceipts | INSTEAD OF UPDATE, DELETE | RestaurantModules_Initial |
| 12 | TR_GrowthProviderEventReceipts_AppendOnly | GrowthProviderEventReceipts | INSTEAD OF UPDATE, DELETE | RestaurantModules_Initial |
| 13 | TR_EventsAcceptanceReceipts_AppendOnly | EventsAcceptanceReceipts | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 14 | TR_EventsStateTransitions_AppendOnly | EventsStateTransitions | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 15 | TR_EventsPaymentReceipts_AppendOnly | EventsPaymentReceipts | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 16 | TR_MarginSalesFacts_AppendOnly | MarginSalesFacts | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 17 | TR_MealsAuditEvents_AppendOnly | MealsAuditEvents | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 18 | TR_MealsFundingAllocations_AppendOnly | MealsFundingAllocations | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 19 | TR_MealsCreditAdjustments_AppendOnly | MealsCreditAdjustments | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 20 | TR_MealsStatementLines_FinalizedImmutable | MealsStatementLines | **AFTER INSERT, UPDATE, DELETE** | RestaurantModules_Initial |
| 21 | TR_TrainingCompletions_AppendOnly | TrainingCompletions | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 22 | TR_TrainingAuditEvents_AppendOnly | TrainingAuditEvents | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 23 | TR_TrainingCourseVersions_ImmutableAfterPublish | TrainingCourseVersions | AFTER UPDATE, DELETE | RestaurantModules_Initial |
| 24 | TR_GrowthConsentTextVersions_AppendOnly | GrowthConsentTextVersions | INSTEAD OF UPDATE, DELETE | Growth_ConsentTextVersionAppendOnly |
| 25 | TR_WorkforceIdentityCodeRegisterIssues_RetentionLock | WorkforceIdentityCodeRegisterIssues | AFTER UPDATE, DELETE | Workforce_IdentityCodeRegisterIssues |

`HasTrigger` occurrences in the backend before this lane: **0**.

## 2. Exposure, measured rather than reasoned

SQL-tier arm on a real SQL Server with the chain applied, driving **EF** (not raw SQL) at every one of the
25 tables. Baseline measured with the declaration removed:

| Probe | Before | After |
|---|---|---|
| EF UPDATE (all 25 tables) | **25/25 refused with error 334** | 25/25 reach SQL Server |
| EF single-row INSERT (all 25) | 25/25 fine | 25/25 fine |
| Training publish (Draft→Published, real `SaveChangesAsync`) | **error 334** — reproduces the 3×HTTP 500 | commits |
| chain ↔ `sys.triggers` ↔ EF model | model empty, mismatch | all three identical |

**Every one of the 25 is exposed on UPDATE/DELETE.** Error 334 is decided when the statement is
*compiled*, so it does not depend on what the trigger does, whether the trigger would have allowed the
write, or how many rows the `WHERE` matches — a zero-row update is refused exactly like a real one.

**INSERT is not exposed.** I expected the 8 tables with a store-generated key
(`EventsAcceptanceReceipts`, `EventsPaymentReceipts`, `EventsStateTransitions`,
`GrowthConsentCheckReceipts`, `GrowthConsentReceipts`, `GrowthConsentTextVersions`,
`GrowthProviderEventReceipts`, `GrowthSuppressions`) to die on `INSERT … OUTPUT INSERTED.[Id]`, and
measured that they do not. The flag's claim that INSERT-only tables are unaffected is correct.

## 3. Live vs latent — and how I told the difference

The discriminator is **not** the INSERT/UPDATE split (that would make all 25 live). It is **layer 1**:
`ApplicationDbContext.GuardAppendOnly()` throws `InvalidOperationException` for `Modified`/`Deleted`
entries on **23** of these 25 CLR types, *before* EF generates any SQL. Those 23 can never reach 334
through `SaveChangesAsync` today — the in-process guard gets there first.

The two tables whose layer-1 guard is **conditional** rather than absolute are exactly the two whose EF
update path is open, and exactly the two that are live:

**LIVE (2)**
- **`TrainingCourseVersions`** — guarded by `GuardCourseVersionImmutable`, which permits Draft edits,
  Draft→Published and Published→Retired. Tracked read `Services/Training/TrainingCourseService.cs:413`,
  mutation `:335-336`. Proven: `POST …/versions/{no}/publish` → HTTP 500, 3 of 3. Publish, retire and
  draft edit are all dead.
- **`MealsStatementLines`** — guarded by `GuardStatementLineFinalizedImmutable`, which only freezes lines
  of a *Finalized* run. `Services/Meals/MealsStatementService.cs:166-168` does a tracked read plus
  `RemoveRange` when re-drafting a Draft statement run — an EF `DELETE`, refused with 334.

**LATENT (23)** — masked by `GuardAppendOnly`, not by anything about the statement. Each becomes live the
moment the guard is relaxed for a legitimate correction path, since the 334 is already proven present on
all 23. They get the declaration for that reason.

How the split was established: (a) grep per DbSet for `.Update(`, `.Remove/RemoveRange(`,
`ExecuteUpdate*`, `ExecuteDelete*` — all zero except the Meals `RemoveRange`; (b) grep for *tracked*
reads (no `AsNoTracking`) that feed a property assignment — the real EF mutation idiom, which the
`.Update(` grep misses entirely and which found the Training case; (c) the CLR-type list inside
`GuardAppendOnly`, cross-checked against the 25.

## 4. The fix

`Helpers/ApplicationDbContext.cs` — one `ModuleTriggerBuilder(ModelBuilder)` declaring all 25 with
`entity.ToTable(t => t.HasTrigger("TR_…"))`, behind the file's existing `Database.IsSqlServer()` branch
(`ToTable` is unavailable on the in-memory provider the fast tier builds this model with).

**No migration.** Confirmed by the chain's own `HasPendingModelChanges()` gates — triggers are model
metadata and produce no migration operation.

## 5. Anti-drift

The list is not trusted. `DatabaseTriggerDeclarationSqlServerTests` derives the tables by replaying the
migration chain, reads the truth from `sys.triggers` on the migrated catalog, compares the EF model
against it **in both directions**, and drives a real EF write at every table it names. A trigger added
without a declaration fails on the day it lands.

Two vacuity guards inside the arm itself:
- the theory's cases come from the **migration sources**, not the model — a model with zero declarations
  still gets 25 cases rather than collapsing to none and passing;
- every probe asserts the write **reached SQL Server** (a `SqlException` or a clean commit). An
  in-process guard refusal is failed explicitly, because "no error 334" from a statement that was never
  sent is precisely the shape that hid this defect behind 587 green tests.

Where a trigger denies the update, `TriggerRefusal.AssertIsTriggerThrow` (existing helper) pins the
refusal to a user-defined `THROW` rather than to a constraint that beat the trigger to the statement — so
the sweep cannot pass with a trigger dropped.

## 6. Runs

Baselines measured by me, in this working copy.

| Run | Result |
|---|---|
| SQL tier, this suite, declaration REMOVED (red) | **27 failed / 25 passed / 0 skipped / 52** |
| SQL tier, this suite, declaration present (green) | **0 failed / 52 passed / 0 skipped / 52** |
| Fast tier, before this lane | 0 failed / 4357 passed / 12 skipped / 4369 |
| Fast tier, final | **0 failed / 4359 passed / 12 skipped / 4371** (+2 = the new gates) |
| Fast gate, declaration removed (mutation check) | 1 failed / 1 passed — the drift gate is not vacuous |

`trigger-red.trx`, `trigger-green.trx`, `fast-final.trx`, `model-gate.trx` are in `results/`.

## 7. Not done / residual

- **Nothing was disabled.** No trigger dropped, no guard removed, no migration added, no
  `--no-build` measurement (every run recompiled; assembly mtimes checked).
- **The broad `Database=SqlServer` regression run was stopped part-way, by me, on purpose.** A sibling
  lane was holding the second SQL slot and the Docker VM fell to 135 MB free / 393 MB available — the
  OOM-137 band, with the owner's live `okam-lwtwo-sql` in the blast radius. I killed only my own run
  (resolved by pid from my own command line) and stopped only my own two containers (resolved by
  container ID from my own run's log, never by name and never by elimination). Headroom was then polled
  for 7 minutes and never returned above the brief's floor, so no third SQL server was started.
  **`HasPendingModelChanges()` — the reason that run mattered — is instead asserted on the fast tier,
  where it needs no container, and passes.**
- **A multi-row (batched) INSERT is not covered.** EF sends a batch by a different route than the
  single-row insert this suite probes, and Meals materialises a whole statement's lines in one
  `SaveChanges` against a table whose trigger is `AFTER INSERT, UPDATE, DELETE`. I wrote the probe, could
  not run it inside the SQL slot, and **removed it rather than ship an assertion I never measured** —
  the estate's own rule that a test which has not been seen to fail is not a pin. It is a five-minute
  follow-up: add a `[Theory]` that `Add`s two fabricated rows per table and asserts the same "not 334".
- Declaring triggers means the next `dotnet ef migrations add` will regenerate
  `ApplicationDbContextModelSnapshot.cs` with `t.HasTrigger(...)` lines. That produces no migration
  operation (measured), but the next migration author should expect the snapshot churn.
