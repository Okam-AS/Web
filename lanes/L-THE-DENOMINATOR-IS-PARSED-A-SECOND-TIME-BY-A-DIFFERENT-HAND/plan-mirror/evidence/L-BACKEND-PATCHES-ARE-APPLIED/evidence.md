# L-BACKEND-PATCHES-ARE-APPLIED — evidence

Branch **`lane/backend-patches-composed`**, built off the composed stack
`integration/mig-stack-merge` @ `7f8945dc6850603608959acb91a2a4b354c20f3d`.
Not merged anywhere, not pushed.

| | |
| --- | --- |
| worktree | `/Users/svendaneel/okam/wt-bepatch` (created by me, `git worktree add -b lane/backend-patches-composed`) |
| SDK | 8.0.110 (`global.json`) |
| commands | `dotnet build WebApi.Tests/WebApi.Tests.csproj -c Debug`, then `dotnet test … --filter "Database!=SqlServer"` — **no `--no-build` anywhere** |
| SQL slot | **not taken.** All three landed patches name a non-SQL arm, so no container was needed. Nothing started, stopped, entered or killed. `okam-lwtwo-sql` / `okam-lwtwo-redis` up throughout; `:5971` still held by the owner's `WebApi` pid 47340; `:3971` never bound by me. |

## The triple

Baseline measured by me at `7f8945dc` **before** applying anything; after measured at
`ea66353f9` from a build that recompiled (assembly mtime 19:05, after the last edit).

| tier / arm | BASE `7f8945dc` | AFTER `ea66353f9` | delta |
| --- | --- | --- | --- |
| **non-SQL tier** (`Database!=SqlServer`) | 0F / 4703P / 10S / 4713 | **0F / 4728P / 10S / 4738** | **+25P, 0F** |
| company-refund arm (`WebApi.Tests.Kassa.*` + `WebApi.Tests.Meals.*`) | 0F / 1212P / 3S | 0F / **1224P** / 3S | +12 |
| tripletex arm (test name contains `Tripletex`) | 0F / 129P | 0F / **141P** | +12 |
| open-shifts arm (`WebApi.Tests.Workforce.*`) | 0F / 677P / 1S | 0F / **678P** / 1S | +1 |

12 + 12 + 1 = 25. The whole tier delta is accounted for by the three patches' own new tests;
nothing else moved and nothing regressed.

Build: **0 errors**, 734 warnings.

Arm counts are derived from the two `.trx` files by test class, not from separate filtered runs, so
both sides come from the same instrument and the same binaries. Script: `arms.py`.

- `WebApi.Tests/TestResults/BASE-7f8945dc-fast-tier.trx`
- `WebApi.Tests/TestResults/AFTER-composed-fast-tier.trx`

## What landed

### 1. `L-COMPANY-REFUND-IS-NOT-A-CASH-PAYOUT` → `d8c98c200`

Applied with `git apply -p1` (exact context, **no fuzz**), 5 files. Three hunks in
`Services/Kassa/FinalizeService.cs` landed at **offset +52**.

*Offset explained, not waved through:* the patch's base is `feature/restaurant-modules`
(= the shared `OkamAPI-modules` checkout), which predates the utleveringskvittering / credit-sale
work this stack carries — that work adds 54 lines to `FinalizeService.cs` above the hunk sites.
Verified by content afterwards: exactly **two** `ApplyReturnDocumentation(...)` call sites exist on
this base (lines 489, 625), both now pass `request.PaymentType`, matching the patch's two hunks —
no third caller was left on the old 2-arg signature. `PaymentTypeExtensions.IsCompanyAccount()` and
`PaymentType.CompanyAccount = 120` both already exist here.

### 2. `L-TRIPLETEX-CLAIM-OUTLIVES-ITS-CALL` → `f3817eed9`

Applied with `git apply -p1` (exact context, no fuzz), 15 files. One hunk in
`WebApi.Tests/Kassa/Cov_TripletexPosExportTests.cs` landed at **offset +113** — that file gained
113 lines on this stack (alongside `TripletexPosService` / `TripletexConnectionService` work) since
the patch's base. The three production files the fix actually changes — `TripletexSettings.cs`,
`TripletexClient.cs`, `TripletexVoucherPoster.cs` — are **byte-identical** between the patch's base
and this stack, so the fix itself met no drift at all.

### 3. `L-OPEN-SHIFTS-EXCLUDE-SUPERSEDED` → `ea66353f9`

Composed, not re-applied: `git cherry-pick -x 5243c06a7` off
`wip/rescue-2026-08-06-open-shifts-lineage`. **Zero conflicts** — predicted read-only first with
`git merge-tree --write-tree 7f8945dc 5243c06a7` (clean tree, exit 0) and confirmed by the pick.
All three files are byte-identical between `feature/restaurant-modules` and `7f8945dc`.

## Conflicts, and how each was resolved by content

**No content conflict occurred on any of the three landed patches.** Both offsets above are
positional, not textual: `git apply` matches context exactly and refuses fuzz, and each was then
re-checked against the file by reading it. Nothing was resolved by picking a side.

One tree-dirtying effect worth naming, because it is the shape that has destroyed receipts here
before: **the non-SQL tier rewrites `artifacts/journeys/ev-dietary/run-sheet.{json,md}` on every
run**, substituting the current date (`stated 2026-08-01` → `stated 2026-08-06`). It is pure clock
churn, no measurement in it. It was reverted with `git checkout --` after each run and is in
**neither** of my commits. Anyone measuring a tier here will find the tree dirty afterwards and
must not commit it.

## What did NOT land, and why — `L-EF-DECLARES-EVERY-TRIGGER`

**Stopped on, per the brief. Not forced.** Two independent reasons, both measured.

### (a) It does not apply

`Helpers/ApplicationDbContext.cs`, hunk 1 of 2, is rejected — by `git apply --check`
(*"patch does not apply"*) **and** by `patch -p1 --dry-run`, which has fuzz and still refuses it
(*"1 out of 2 hunks failed"*). Cause: this base has `TrainingW3Builder(builder);` between
`TrainingBuilder(builder);` and the OpenIddict block; the patch's base does not.

That one is trivially resolvable by content (put `ModuleTriggerBuilder(builder);` after *all* module
builders). It is not why the patch is stopped.

### (b) Force-applied, it makes this branch's own non-SQL tier RED — measured

The base moved by nine migrations under the patch:

| ref | migrations | `CREATE TRIGGER` at chain tip |
| --- | --- | --- |
| `feature/restaurant-modules` (= the patch's base, = `OkamAPI-modules`) | 128 | **25** |
| `integration/mig-stack-merge` @ `7f8945dc` (my ordered base) | 137 | **32** |

The seven the patch does not declare, and the 2026-08-01 migrations that install them:

- `TR_MarginPeriodStatements_FinalizedImmutable`, `TR_MarginWasteEntries_FrozenWeekImmutable` — `20260801084923_Margin_PeriodStatementFinalizedImmutable`
- `TR_TrainingDeviationEvents_AppendOnly` — `20260801113131_Training_W3_ChecklistsAndDeviations`
- `TR_WorkforceTimesheetPeriods_Immutable`, `TR_WorkforceTimesheetLines_Immutable`, `TR_WorkforceTimesheetAdjustmentBatches_Immutable`, `TR_WorkforceTimesheetExportBatches_Immutable` — `20260801174639_Workforce_W5_Timesheets`

The patch's own fast-tier test asserts **exact set equality** between what the chain installs and
what the model declares (`DatabaseTriggerDeclarationModelTests.cs:38`,
`Assert.Equal(Render(ChainTriggers.AtChainTip()), Render(declared))`), so 32 ≠ 25 reds it. Proved
rather than argued, in a throwaway worktree `wt-bepatch-probe` at `7f8945dc` (patch applied,
reject hand-resolved, `dotnet build` 0 errors, since destroyed):

```
Failed! - Failed: 2, Passed: 0, Skipped: 0, Total: 2
  Every_trigger_the_chain_installs_is_declared_on_its_entity  [FAIL]
    Assert.Equal() Failure … ↓ (pos 1138)
    Expected: ···mutableAfterPublish\nTrainingDeviationEvents <- TR_TrainingDev···
    Actual:   ···mutableAfterPublish\nWorkforceAttendanceAdjustments <- TR_Work···
```

Closing that gap means authoring seven declarations the lane never wrote and never measured. That is
new work, not conflict resolution, and its own arm is the SQL tier — so it belongs to a lane that
holds a SQL slot, not to this one. See `probe-eftrigger.txt`.

**To refresh the patch** (roughly a twenty-minute job for a lane with a SQL slot): rebase it onto
`7f8945dc`, move the `ModuleTriggerBuilder(builder);` call below `TrainingW3Builder(builder);`, add
the seven `ToTable(t => t.HasTrigger(...))` lines above, and re-run the SQL arm. The exhaustiveness
test proves the set; only the EF write path for the seven new tables needs the container.

## Defect found while probing — pre-existing at the merge tip, not mine

The patch's **second** assertion also reds, and it reds **for a different reason that has nothing to
do with the patch**:

```
Declaring_the_triggers_leaves_no_pending_model_changes [FAIL]
  The model no longer matches ApplicationDbContextModelSnapshot. Expected: False  Actual: True
```

Re-measured with the patch's `ApplicationDbContext.cs` change **fully reverted** (`grep -c
ModuleTriggerBuilder` = 0, rebuilt, 0 errors): **still 1 failed / 0 passed.** So
`HasPendingModelChanges()` is already `true` on `integration/mig-stack-merge` @ `7f8945dc`.

`dotnet ef migrations add` against a throwaway copy names the whole delta — one entire table:

```
CreateTable "GrowthAuditEvents"  (+ IX_GrowthAuditEvents_AggregateType_AggregateId,
                                    IX_GrowthAuditEvents_StoreId_OccurredAt)
```

- mapped: `Helpers/ApplicationDbContext.cs:219`, `public DbSet<GrowthAuditEvent> GrowthAuditEvents`
- written: `Services/Growth/GrowthAuditWriter.cs:89`, `_db.GrowthAuditEvents.Add(auditEvent)`
- reachable from `GrowthConsentTextService`, `GrowthDispatchService`, `GrowthNewsletterService`, `GrowthProviderAccountService`, `GrowthAuditReadService`
- **no migration in the chain creates the table** (`git grep -l GrowthAuditEvents 7f8945dc -- Migrations` is empty)
- **not in `Migrations/ApplicationDbContextModelSnapshot.cs` either** (0 occurrences)

This is the `AccountingSummaries` shape a third time: present in the model and therefore in every
model-built test database, absent from every chain-built one. Every Growth write path that appends an
audit event works in the fast tier and fails on a real database with *Invalid object name
'dbo.GrowthAuditEvents'*. It is a **C2** violation sitting at the merge tip and it is why the fast
tier cannot see it. The throwaway migration was deleted and the probe worktree destroyed
(`git worktree remove --force`); **no migration was added to this branch** — one migration author at
a time.

## Files

- `base-fast.txt`, `after-fast.txt` — the two tier runs
- `build.txt` — the composed build
- `probe-build.txt`, `probe-eftrigger.txt` — the EF patch force-apply probe (2 failed)
- `probe2-build.txt`, `probe2-pending.txt` — the same assertion with the patch reverted (1 failed)
- `arms.py` — the per-arm derivation over both `.trx` files
