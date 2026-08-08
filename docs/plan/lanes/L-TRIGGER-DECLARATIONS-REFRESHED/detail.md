# L-TRIGGER-DECLARATIONS-REFRESHED — lane detail

Brief `14e5e7b9`. Actor `agent:L-TRIGGER-DECLARATIONS-REFRESHED`.

## Base

Branch `lane/trigger-declarations-refreshed`, cut from **`lane/backend-patches-composed` @ `2ba9229fa`**
("Record the triple for the three composed backend patches, and the fourth's refusal") in a worktree of its
own, `/Users/svendaneel/okam/OkamAPI-trigdecl`. Built from the patched tip rather than
`integration/mig-stack-merge` so today's three landed backend patches are not undone.

The stale patch from `L-EF-DECLARES-EVERY-TRIGGER` was **read, not applied**. Its measurements are reused
where they were re-derived here; its declaration list is not.

## 1. The chain installs 32, derived not copied

Swept `Migrations/**` replaying only each migration's `Up()` body — a whole-file scan cancels every trigger
against its own `Down()` and reports a clean sweep over an empty set. The table comes from each statement's
`ON` clause, never from the trigger's name.

**32 `CREATE TRIGGER`, 32 distinct tables, 1:1, no `DROP TRIGGER` anywhere in the chain.**

Seven beyond the stale patch's 25, and they match the seven named in
`L-BACKEND-PATCHES-ARE-APPLIED`'s evidence exactly:

| Trigger | Table | Events | Migration |
|---|---|---|---|
| TR_MarginPeriodStatements_FinalizedImmutable | MarginPeriodStatements | AFTER UPDATE, DELETE | `20260801084923_Margin_PeriodStatementFinalizedImmutable` |
| TR_TrainingDeviationEvents_AppendOnly | TrainingDeviationEvents | AFTER UPDATE, DELETE | `20260801113131_Training_W3_ChecklistsAndDeviations` |
| TR_MarginWasteEntries_FrozenWeekImmutable | MarginWasteEntries | **AFTER INSERT, UPDATE, DELETE** | `20260801132512_Margin_WasteEntries` |
| TR_WorkforceTimesheetPeriods_Immutable | WorkforceTimesheetPeriods | AFTER UPDATE, DELETE | `20260801174639_Workforce_W5_Timesheets` |
| TR_WorkforceTimesheetLines_Immutable | WorkforceTimesheetLines | AFTER UPDATE, DELETE | `20260801174639_Workforce_W5_Timesheets` |
| TR_WorkforceTimesheetExportBatches_Immutable | WorkforceTimesheetExportBatches | AFTER UPDATE, DELETE | `20260801174639_Workforce_W5_Timesheets` |
| TR_WorkforceTimesheetAdjustmentBatches_Immutable | WorkforceTimesheetAdjustmentBatches | AFTER UPDATE, DELETE | `20260801174639_Workforce_W5_Timesheets` |

**Correction to the brief, in the lane's favour.** The brief names *three* 2026-08-01 migrations. There are
**four** — `Margin_WasteEntries` is a separate migration from `Margin_PeriodStatementFinalizedImmutable`. The
trigger count the brief gives (seven, total 32) is right; only the migration count was short.

## 2. The starting position was 2 declared, not 0

The stale patch's premise — *"`HasTrigger` occurrences in the backend before this lane: 0"* — **no longer
holds at this base.** Two of the seven new triggers were already declared, inline in their own entity
builders:

- `ApplicationDbContext.cs:2451` `MarginPeriodStatement` → `MarginStatementFreezeTrigger`
- `ApplicationDbContext.cs:2522` `MarginWasteEntry` → `MarginWasteFreezeTrigger`

So the real gap was **30 undeclared of 32**, not 25 of 25. Following the refresh recipe literally ("add the
seven `ToTable` lines") would have declared those two twice.

**Why those two and no others:** they are the only two trigger-bearing tables carrying `IsRowVersion()`, and
their authors hit error 334 on INSERT and fixed it locally. That is also why the rest stayed undeclared —
see §4.

## 3. The change

`Helpers/ApplicationDbContext.cs` — one `ModuleTriggerBuilder(ModelBuilder)` declaring **all 32**, called
after `TrainingW3Builder(builder)`. The two inline declarations are **moved into it**, not duplicated
alongside it: the defect being fixed is precisely "a table EF writes to was not declared", and two places to
look is how a set of 32 becomes a set of 25 again. Their local comments stay where they are and now point at
the one declaration site.

Three deliberate departures from the stale patch:

- **No `Database.IsSqlServer()` branch.** The patch guarded the declarations because "`ToTable` is not
  available on the in-memory provider the fast tier builds this model with". **There is no EF in-memory
  provider in this repo** — `WireHost.UseInMemoryDatabase` is a method *name*; its body is
  `.UseSqlite(_connection)`. Every provider here is relational, the two landed Margin declarations are
  already unconditional, and the file's own comment argues for it ("one model describes both"). A
  provider-shaped model would also mean the fast tier gates a model the SQL tier never runs.
- **`protected virtual`**, so a test can build the same model without the declarations — the idiom
  `ApplyOrderKindQueryFilter` already establishes and `QueryFilterSensitivityTests` already uses.
- **No `Assert.False(HasPendingModelChanges())`.** See §5.

`Entities/Workforce/WorkforceTimesheetPeriod.cs` — the remark that taught the wrong rule is corrected. See §4.

**No migration.** No trigger created, dropped or disabled; no guard removed; no schema change.

## 4. Live vs latent, re-derived — and the reasoning error that caused the gap

The discriminator is layer 1, not the INSERT/UPDATE split: `GuardAppendOnly` throws in-process for the CLR
type before EF emits any SQL, so a table whose guard is **absolute** can never reach 334 through
`SaveChangesAsync` today. The tables whose guard is **conditional** are the live ones.

Of the seven new triggers:

- **LIVE (2)** — `MarginPeriodStatements` (guard fires only when the *original* state is `Finalized`, so
  every Open edit and the Open → Finalized write itself reach SQL) and `MarginWasteEntries` (guard
  `GuardWasteEntryFrozenWeekImmutable` fires only for a frozen week). Both were already declared, by the
  lanes that hit them.
- **LATENT (5)** — `TrainingDeviationEvents` and the four W5 timesheet tables, all enrolled absolutely in
  `GuardAppendOnly`. They get the declaration because the 334 underneath is already proven present on all of
  them (§6), and it surfaces the day a legitimate correction path relaxes the guard.

**The reasoning error is worth recording, because it is in a doc comment where the next author will read
it.** `WorkforceTimesheetPeriod`'s remarks say, of the whole W5 family:

> *No rowversion, deliberately. … a rowversion would make EF emit an `OUTPUT` clause that SQL Server refuses
> on a table carrying an AFTER trigger (error 334) — the coupling the Margin statement lane had to declare
> `HasTrigger` to work around. Nothing in this family carries one.*

Every clause is true and the conclusion does not follow. A rowversion is what exposes **INSERT**; EF emits the
same refused form as its rows-affected probe on **UPDATE and DELETE regardless**. The author reasoned from
the INSERT case to "no declaration needed" and four tables shipped undeclared. The remark is corrected in
this change rather than left to re-teach it.

## 5. `HasPendingModelChanges()` — which of the two is being observed

`HasPendingModelChanges()` is **already `true` at this base**, for a cause that has nothing to do with
triggers: `GrowthAuditEvents` and its two indexes are mapped in `OnModelCreating` with no migration
(PENDING-MIGRATIONS-LEDGER MIG-29, `F-GROWTHAUDIT-MISSING-AT-THE-MERGE-TIP`). `ModelVersusChainDriftTests`,
the sibling lane's park-and-ratchet suite for it, is **not on this branch**.

So asserting the absolute would make this lane's gate report somebody else's defect, and go on failing after
the triggers were correctly declared. **The delta is asserted instead**: the migration differ is run between
the model *with* the declarations and the model *without* them, and must report zero operations. That asks
only about this change and keeps asking it after MIG-29 lands.

Measured: **zero operations** between the two models. The differ is shown to be capable of answering
otherwise by a third context that adds one index, which it reports.

## 6. Measurements

All runs in this worktree. Every run recompiled; `WebApi.dll` mtime checked before each `--no-build`
measurement (the first attempt at the model gate did measure a stale binary — a `MigrationOperation` using
was missing, the build had 1 error, and `--no-build` silently ran the previous assembly; caught by checking,
not by the output).

### SQL tier — the sweep, at the composed stack

| Run | Result |
|---|---|
| declarations REMOVED (mutation control) | **38 failed / 64 passed / 102 total** |
| declarations present | **0 failed / 102 passed / 102 total** |
| SQL arm alone, declarations present | **0 failed / 98 passed / 98 total**, 1 s |

102 = 32 tables × 3 write probes (single-row INSERT, batched INSERT, UPDATE) + 2 targeted tests + 4
container-free model tests.

The 38 reds decompose exactly, from the trx and not by eye:

| Red | Count |
|---|---|
| EF UPDATE refused by 334 | **32 — every trigger table, without exception** |
| EF single-row INSERT refused by 334 | 1 (`MarginWasteEntries`) |
| EF batched INSERT refused by 334 | 1 (`MarginWasteEntries`) |
| `Chain_triggers_migration_catalog_and_ef_model_all_agree` | 1 |
| `Publishing_a_draft_course_version_through_ef_commits` | 1 |
| `Every_trigger_the_chain_installs_is_declared_on_its_entity` | 1 |
| `The_diff_is_taken_between_models_that_actually_differ` | 1 |

**The prior lane's UPDATE measurement holds at 32/32** — re-measured here, not carried over.

### The INSERT residual, now closed

The stale patch's claim was *"INSERT is not exposed on any of them"*, and its batched-INSERT probe was
written, never run, and deleted. Both are now measured, and the claim needed refining:

**INSERT is refused exactly when the table has both (a) a store-generated value for EF to read back — here,
a `rowversion` — and (b) a trigger that fires on INSERT.** Exactly one of the 32 meets both:

| Table | rowversion | trigger fires on INSERT | INSERT refused |
|---|---|---|---|
| `MarginWasteEntries` | yes | yes (`AFTER INSERT, UPDATE, DELETE`) | **yes, single-row and batched** |
| `MarginPeriodStatements` | yes | no (`AFTER UPDATE, DELETE`) | no |
| `MealsStatementLines` | no | yes (`AFTER INSERT, UPDATE, DELETE`) | no |
| the other 29 | no | mixed | no |

Both non-refusals are explained by the same rule, with no free parameter. The batched form is not redundant
with the single-row form: past one row EF stops emitting one statement per row, and the two tables with an
AFTER INSERT trigger are exactly the ones production writes a whole set at a time (a statement run
materialises all its lines in one `SaveChanges`).

### Fast tier

Baseline for `lane/backend-patches-composed` is that lane's own measurement, **0F / 4728P / 10S / 4738**.

| Run | Result |
|---|---|
| fast tier, this branch | **0 failed / 4732 passed / 10 skipped / 4742**, 6 m 2 s |
| fast tier, re-run at the final tree | **0 failed / 4732 passed / 10 skipped / 4742**, 5 m 57 s |
| both trigger arms, final tree | **0 failed / 102 passed / 102 total**, 21 s |

Delta **+4 total, +4 passed, 0 failed, 0 skipped** — exactly the four container-free model tests. The 98 SQL
cases carry `[Trait("Database", "SqlServer")]` and are excluded by this filter. Nothing regressed.

The fast tier was run twice because the first run's binary predated two XML-doc-comment corrections in
`ModuleTriggerBuilder` (§6, the INSERT count). Both runs agree; the second is the one that measures the tree
that is committed.

**Side effect, not this lane's:** the non-SQL tier rewrites `artifacts/journeys/ev-dietary/run-sheet.{json,md}`
with the run date, exactly as `L-BACKEND-PATCHES-ARE-APPLIED` warned. Reverted with `git checkout --`; it is
not in the commit.

## 7. Anti-drift shape (kept from the stale patch, and why each part is load-bearing)

- Theory cases come from **replaying the migration chain**, never from the model. Cases taken from the model
  would collapse to zero on exactly the defect this suite exists to catch and pass green forever.
- Truth read from **`sys.triggers`** on the migrated catalog; chain, catalog and model compared in **both
  directions**, so a declaration naming a trigger the chain does not create reds too.
- `ChainTriggers` scans **`Up()` bodies only** and honours a later `DROP TRIGGER`, and fails outright if it
  derives zero triggers — a sweep over an empty set passes every assertion it is asked.
- Every UPDATE probe asserts the write **reached SQL Server**; where a trigger denies it,
  `TriggerRefusal.AssertIsTriggerThrow` pins the refusal to the trigger's own `THROW`, so the sweep cannot
  pass with a trigger dropped.
- The UPDATE probe enters at `IStateManager`, one level below the in-process guards — for 28 of the 32 the
  layer-1 guard throws by design, so layer 2 could never be observed through the public entry point.

## 8. Container discipline

One container, started by this lane, `max server memory` capped at 2048 MB over **its own connection
string** — never resolved by name, never by elimination. Testcontainers deleted it at the end of each run
(container ids `2a7307926a77`, and one per subsequent run, from this lane's own logs).

Headroom measured before claiming the slot and again before the sweep: 3763 MB free / 5405 MB available, 7837
MB total. The owner's `okam-lwtwo-sql` and `okam-lwtwo-redis` were running throughout and were **never**
stopped, restarted or exec'd into. No `pkill`, no kill by pattern.

## 9. Not done

- **No migration**, and no schema change of any kind. C2 holds.
- **No push.** Work is committed to `lane/trigger-declarations-refreshed` only.
- **MIG-29 / `GrowthAuditEvents` is untouched.** It is named here so the reader knows which of the two
  `HasPendingModelChanges()` causes this lane observed, and it is not this lane's to fix.
- Declaring triggers means the next `dotnet ef migrations add` regenerates
  `ApplicationDbContextModelSnapshot.cs` with `t.HasTrigger(...)` lines. That produces no migration operation
  (measured, §5), but the next migration author should expect the snapshot churn.

## Files

- `sql-red.trx` / `sql-green.trx` — the mutation control and the restored green, both arms in one filter.
- `sql-arm-green.trx` — the SQL arm alone, first green.
- `final-green.trx` — both arms at the committed tree, 102/102.
- `fast-after.trx` — the fast tier at the committed tree, 4742.
- `red-breakdown.txt` — the 38 reds decomposed by probe, derived from the trx and not by eye.

Same set is committed in the backend worktree at
`/Users/svendaneel/okam/OkamAPI-trigdecl/lanes/L-TRIGGER-DECLARATIONS-REFRESHED/`, with `detail.md` as
`evidence.md`.

## Commit

`lane/trigger-declarations-refreshed` @ `521fc86f0` (amended), off `lane/backend-patches-composed`
`2ba9229fa`. **Not pushed**, and no shared ref moved.
