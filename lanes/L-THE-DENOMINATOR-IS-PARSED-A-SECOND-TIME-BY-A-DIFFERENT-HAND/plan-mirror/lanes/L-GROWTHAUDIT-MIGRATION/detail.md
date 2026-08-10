# L-GROWTHAUDIT-MIGRATION — MIG-29 `Growth_AuditLedger`, authored and proved on a chain-built database

Repository: **OkamAPI** (`/Users/svendaneel/okam/OkamAPI`). Worktree created by this lane:
`/Users/svendaneel/okam/wt-growthaudit`, branch `lane/growthaudit-migration`, off
`integration/mig-stack-merge` @ `7f8945dc` — the composed stack. Nothing pushed, no shared branch committed
to. `/Users/svendaneel/okam/wt-migstackmerge` was read from but never written to or entered.

---

## 1. The migration

`Migrations/20260806125642_Growth_AuditLedger.cs` (+ `.Designer.cs`, + the model snapshot).

**Parent is the chain tip, not the model — the C2 check, done by measurement.**

| check | result |
| --- | --- |
| chain tip at `7f8945dc` | `20260803093235_Kassa_AccountingSummaryDayUniqueIndex` |
| the migration immediately before mine, by id | the same file |
| `20260806125642_Growth_AuditLedger.Designer.cs` body vs `ApplicationDbContextModelSnapshot.cs` | **byte-identical**, 517,531 chars each |
| entities in my Designer snapshot vs the tip's | **428 vs 427** |
| diff of the two snapshots | **purely additive**, 48 added lines, zero removed |

The tip named by `L-GROWTHAUDIT-TABLE-ABSENT` (`20260731220005_Workforce_IdentityCodeRegisterIssues`) was
correct for `feature/restaurant-modules` @ `8e2b57de` and is **eight migrations stale** for the composed
stack. Its own instruction was to re-verify at authoring time; that is what moved.

`ef migrations add` folded in **nothing else**. That is the check the ledger predicted would matter — it
warned that the next author on this branch would silently ship Growth's audit table inside an unrelated
migration — and it also settles that `GrowthAuditEvents` was the *whole* of the model/chain drift at this
tip, not part of it.

### Numbers claimed

- **MIG-29.** The census (`lanes/L-LEDGER-NUMBERS-ARE-FREE/finding.md`) rules MIG-29 as Growth's re-parented
  reservation; MIG-28 is contested by two branches that each authored a file, so it is not available, and 30
  is the next genuinely free number for whoever comes after.
- **THROW 50074**, verified against the migration files and not against any ledger copy. The band actually
  installed on this chain is `50010-50018, 50020-50022, 50030-50034, 50040-50043, 50050-50053, 50060-50062,
  50070-50073`; 50074 is the first number above it, is this table's standing reservation, and appears in
  **no** `Migrations/` tree on any local branch (swept per-ref). `50018` and `50051` are spent despite three
  ledger copies still printing them as free with a copy-pasteable trigger body — neither was reached for.

### The trigger — layer 2, and it is in scope

The brief asked whether the append-only guard's second layer belongs on this table. **It does, and the code
already said so in three places before this lane touched it:** the `GuardAppendOnly` branch in
`ApplicationDbContext` carried a `⚠ Layer 2 does NOT exist yet` comment naming MIG-29 as owed; the entity's
own summary said the migration was not authored; `GrowthAuditWriterTests` said the same. C1's
`holds_because` names precisely this shape as the estate's already-shipped defect — an RF-1313
systembeskrivelse asserting database triggers that no migration creates. Shipping the table without the
trigger would have left three comments true and the claim they describe unbacked; shipping the trigger and
leaving the comments would have left them false. Both were closed in the same change.

```sql
CREATE TRIGGER [dbo].[TR_GrowthAuditEvents_AppendOnly]
ON [dbo].[GrowthAuditEvents]
AFTER UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    ROLLBACK TRANSACTION;
    THROW 50074, 'GrowthAuditEvents is append-only: UPDATE and DELETE are not permitted (a correction is a new event).', 1;
END;
```

`AFTER`, not `INSTEAD OF` — the audit family's convention, and an `INSTEAD OF UPDATE` would silently swallow
rather than refuse if the body were ever weakened. `Down()` drops the trigger before dropping the table,
matching the three siblings in `RestaurantModules_Initial.cs`.

**`L-GROWTH-AUDIT-INDEX` is folded in**: the table and its two indexes are one migration, and there is no
version of that lane that could have run separately.

---

## 2. The system-catalog read — the distinction that is the entire defect

`sys-catalog.txt` is a read of a database built by `dotnet ef database update` **from empty**, never by
`EnsureCreated()`. Container `lgam-mssql`, created and destroyed by this lane, on `localhost:14380`; the
connection string was pattern-matched for `localhost` before the command ran and the check is in the shell
history of the run.

**137 of 137 migrations applied from an empty catalog** (`__EFMigrationsHistory` = 137, and 137 non-Designer
migration files on disk), with `20260806125642_Growth_AuditLedger` as the tip. That is also a replay-from-
empty check the estate has been bitten on before, and it passes.

```
sys.tables         GrowthAuditEvents                              1 row
sys.columns        10 columns, Id uniqueidentifier NOT NULL non-identity, StoreId int NULL,
                   ActorKind nvarchar(16) NOT NULL, ActorReference nvarchar(256) NULL,
                   EventType/AggregateType/AggregateId/CorrelationId nvarchar(128) NULL,
                   SemanticDeltaJson nvarchar(max) NULL, OccurredAt datetimeoffset NOT NULL
sys.indexes        PK_GrowthAuditEvents                    CLUSTERED  unique=1 pk=1  (Id)
                   IX_GrowthAuditEvents_StoreId_OccurredAt NONCLUSTERED unique=0    (StoreId, OccurredAt)
                   IX_GrowthAuditEvents_AggregateType_AggregateId NONCLUSTERED unique=0 (AggregateType, AggregateId)
sys.triggers       TR_GrowthAuditEvents_AppendOnly  is_instead_of=0  is_disabled=0  fires on UPDATE, DELETE
sys.foreign_keys   (none, in either direction)
Growth surface     20 tables
```

Both read-path indexes are **non-unique**, which is load-bearing: two test-sends of the same version by the
same admin are two genuine events, and a uniqueness constraint reached for by instinct would silently drop
the second. The sibling ledgers' single composite `(StoreId, AggregateType, AggregateId)` is a different
shape and was not copied.

`OccurredAt` is `datetimeoffset`, not the `DateTime OccurredAtUtc` the Workforce/Meals/Training ledgers use.

### The trigger is proved load-bearing by mutation, not by assertion

`trigger-proof.txt`, on the same chain-built catalog:

| step | result |
| --- | --- |
| INSERT a committed row | accepted, 1 row — the `AFTER UPDATE, DELETE` trigger leaves appends alone |
| DELETE that row | **Msg 50074**, `... is append-only ...`, row survives |
| UPDATE it | **Msg 50074** |
| **DROP the trigger, repeat the same DELETE** | **succeeds, 0 rows** |
| re-create the trigger from the migration body, DELETE again | **Msg 50074** |

The fourth row is the point. This estate has a documented masking: SQL Server evaluates foreign keys
**before** an AFTER trigger, so on a table carrying an FK an immutability DELETE test passes with the
trigger dropped. `GrowthAuditEvents` carries **no foreign key in either direction** (`sys.foreign_keys`
returns nothing), so the DELETE genuinely reaches the trigger — and the drop-and-retry shows the trigger,
and nothing else, is what refuses.

### Reversible, and re-appliable

`down-up.txt`: `database update 20260803093235_...` drops the trigger and the table (both catalog counts go
to 0); re-running `database update` restores table, trigger and all three indexes.

---

## 3. What else had to move, and what deliberately did not

**`GrowthDispatchMigrationLineageTests.TotalGrowthTables` 19 → 20.** That test asserts the whole `Growth%`
surface by exact count against `sys.tables`. On a chain-built catalog the count was 19 while the model had
20 — so the assertion was *green because of the defect*. Landing the table turns it red unless the constant
moves. It was updated rather than loosened, because an exact-total assertion over the catalog is exactly the
instrument that would have caught this class of defect, and the class summary and the method name (which
said "nineteen") were corrected with it. **This is a green test that my change would have reddened; without
it the tier would have measured 3 failures, not 2, for a reason that has nothing to do with the defect.**

**New SQL-tier class `GrowthAuditLedgerAppendOnlySqlServerTests`** (7 tests) on the existing
`GrowthSqlServerCollection`, whose fixture migrates the whole chain and never uses `EnsureCreated`. It reads
`sys.columns`, `sys.indexes`, `sys.triggers` and `sys.foreign_keys`, and probes the refusal behaviour in a
server-side transaction so the shared catalog keeps no state. The finding's own note applies: a trigger test
was red-by-construction until the migration existed, so it arrives with it. **This changes the tier total,
which is stated rather than smoothed over.**

One detail a reader will otherwise stop on: the append-still-commits probe raises `THROW 51999` inside its
own ad-hoc batch as a guard. That is a transient batch-local error number in a test, **not installed DDL** —
it appears in no migration, consumes no number from the deny-trigger band, and is invisible to the
`THROW 5\d{4}` census over `Migrations/`.

**Three stale comments corrected** — `ApplicationDbContext.GuardAppendOnly`, `GrowthAuditEvent`'s summary
and `GrowthAuditWriterTests` — each of which asserted that layer 2 did not exist and named a MIG number.
Leaving them would have inverted the RF-1313 defect: a code comment saying a control is absent while it is
present is a smaller harm than the reverse, but it is still a false statement about a statutory-adjacent
control.

**`docs/plans/PENDING-MIGRATIONS-LEDGER.md` MIG-29 marked AUTHORED**, with the parent, the THROW-band
derivation and the table-count consequence recorded in the entry.

**Not repaired here, deliberately.** The untyped `catch (DbUpdateException)` in
`GrowthDispatchService.CreateOrGetRunAsync` and `GrowthConsentTextService.PublishAsync` — which is what
turned an absent table into a false "published concurrently, retry" and a masking
`InvalidOperationException` — is a real defect that survives this migration and will misreport any future
`DbUpdateException` that is not the race it assumes. It has its own lane
(`L-NEWSLETTER-DISPATCH-REPORTS-ITS-CAUSE`), as does the duplicate notification-outbox row
(`L-PUBLISH-WRITES-ONE-OUTBOX-ROW`). Neither was touched.

---

## 4. The 22 reds, enumerated from the baseline trx rather than from prose

Parsed from `lanes/L-MIG-STACK-MERGE/trx/24cd4ead-sql-tier.trx` (565 / 22 / 587):

| cause | count | tests |
| --- | --- | --- |
| `HasPendingModelChanges()` — the forked-parent detector | **15** | Events ×3, Growth ×2, Margin ×1, Meals ×3, Training ×2, Workforce ×4 |
| `Sequence contains no elements` from `GrowthDispatchService.CreateOrGetRunAsync:316` | **6** | GrowthDispatchLinearization ×2, GrowthDispatchRetryStrategy ×2, GrowthProviderClientKeyIdempotency ×2 |
| `Expected: 1 Actual: 2` outbox rows | **1** | `SchedulePublishSqlServerTests.Publish_commits_publication_recipients_inbox_outbox_and_audit_atomically` |

**The split is 21 + 1, not 20 + 2.** Both the merge lane's evidence ("15 are `HasPendingModelChanges()`, the
other 5 are a live product defect") and this brief's "20 of the 22" undercount the dispatch group by one:
there are **six** `Sequence contains no elements` failures, not five, and all six originate at the same line
of `GrowthDispatchService`. Every one of the 21 traces to the absent table. **So the expected floor is one
red, not two** — the second of the two named lanes (`L-NEWSLETTER-DISPATCH-REPORTS-ITS-CAUSE`) is a latent
code defect with no red test of its own once the table exists, which is a stronger reason to keep its lane
than a weaker one: after this migration nothing in the tier points at it any more.

This lane derived 21 + 1 from the trx before the coordinator issued the same correction (22 → **1**, not 2),
and independently: the table above is a parse of every `Failed` `UnitTestResult` in
`24cd4ead-sql-tier.trx`, not a reading of any lane's prose. The two derivations agree, including on which
class is the sole survivor. The coordinator's other three corrections were also already satisfied by
measurement rather than by instruction — `THROW 50074` taken (not 50019, which the ledger reserves for
MIG-14, and not 50075, which would strand this table's own reservation), the trigger authored inside the
same migration so MIG-29 carries exactly one file, and the Designer parent set at `20260803093235`.

Measured outcome: **22 → 1**, 21 cured, 0 newly failing, in `sql-tier-result.md`.

---

## 5. Container discipline

| container | image | created by | fate |
| --- | --- | --- | --- |
| `lgam-mssql` | `mssql/server:2022-CU14-ubuntu-22.04`, `--memory=2500m`, `MSSQL_MEMORY_LIMIT_MB=1400` | this lane, for the chain replay and catalog read | `docker stop` + `docker rm` by this lane |
| testcontainers mssql | same image | this lane's `dotnet test` process | reaped by its own ryuk |
| `redis:7` probes | `redis:7`, `--memory=64m` | the `MemFree` samples | `--rm`, immediately |

No container this lane did not create was stopped, restarted, inspected into or exec'd into. `sad_goldberg`,
`awesome_kirch`, `wizardly_engelbart` and the two foreign ryuks were left alone.

**Headroom, measured before each start** (`headroom.txt`), instrument = `MemFree` from `/proc/meminfo`
**inside the Docker VM** via a 64 MB throwaway container — the same instrument the compose lane established,
because `MemTotal` minus the sum of `docker stats` reads ~3.7 GiB high.

- 15:02 — `MemFree` **1.01 GiB**, foreign `sad_goldberg` at 4.0 GiB and growing. Under the ~3 GiB floor:
  nothing started.
- 15:04 — that container was reaped and replaced; `MemFree` **3.63 GiB**. Slot taken, and this lane's own
  container was capped at 2500 MB with the SQL Server buffer pool held to 1400 MB so it could not be the one
  that pushed the VM over. It peaked at 1.08 GiB against a foreign container simultaneously at 2.1 GiB, and
  `MemFree` never fell below 1.58 GiB. Stopped and removed at 15:09.
- 15:11 — the VM was **empty**, `MemFree` 4.96 GiB; the earlier foreign session had finished and its ryuk had
  gone. A new foreign session (`wizardly_engelbart`, ryuk `ec6e993f`) started at 15:12.
- 15:13 — `MemFree` **3.22 GiB**, above the floor, one foreign container at 1.6 GiB. The tier was started
  here. `WebApi.Tests/xunit.runner.json` sets `parallelizeTestCollections: false`, so this lane holds one
  fixture container at a time rather than several.

---

## 6. Constraints

- **C1** — honoured, and this migration is what makes the claim checkable rather than a promise. No `UPDATE`
  and no `DELETE` appears anywhere in the diff. No backfill: the table is new, so `ActorKind` is NOT NULL
  from the first insert and the objection recorded against backfilling `MealsAuditEvents` (which already
  holds rows) does not carry across — an author who copied it would write exactly the `UPDATE` the trigger
  now rolls back. `Down()` drops the trigger and the table; it repairs no row.
- **C2** — honoured by measurement, not by assertion. One author, one migration, Designer snapshot
  byte-identical to the model snapshot and equal to the chain tip's plus one entity. The second clause of
  `violated_when` — an index in `OnModelCreating` with no migration creating it — is what this lane closes:
  both `HasIndex` calls now have a `CreateIndex`.
- **C3** — not newly engaged. The six write sites were already DI-registered and reached by four
  controllers; that reachability is why the absent table failed closed rather than slept. No service, route
  or navigation entry is added here.
- **C4** — not a money path. The ledger records privileged Growth changes, and it does name its actor:
  `ActorKind` is NOT NULL and `ActorReference` is exactly NULL unless `ActorKind = Admin`, enforced in both
  directions by `GrowthAuditWriter`. The migration preserves that shape and adds no ambient or hard-coded
  system actor.
- **C5** — the acceptance instrument here is deliberately **not** the trx. The load-bearing evidence is a
  `sys.*` read of a database the chain built and a drop-and-retry mutation of the trigger; the suite result
  is corroboration. There is no UI surface in this change for anyone to walk.
- **C6** — no statutory claim is printed or moved. The append-only discipline serves the bokføring/journal
  argument, and this change makes the database side of it true rather than asserting anything new on screen.
- **C7** — no log or telemetry call is added, and no credential appears in the diff. The SA password used
  here belongs to a throwaway local container that has been destroyed.

---

## 7. The tier run nearly took the sibling down, and what was done about it

The slot was open when the tier started (15:13, `MemFree` 3.22 GiB, one foreign container at 1.6 GiB), but
**the gate is a start condition and not a guarantee**: the foreign lane's container kept growing, and within
four minutes both it and this lane's were unbounded and climbing together.

```
15:13  MemFree 3.22 GiB   MemAvailable 5.12 GiB   foreign 1.60          (tier started here)
15:15  MemFree 1.14 GiB   MemAvailable 3.09 GiB   mine 1.53  foreign 2.13
15:16  MemFree 0.53 GiB   MemAvailable 2.48 GiB   mine 1.82  foreign 2.41
15:17  MemFree 0.11 GiB   MemAvailable 1.91 GiB   mine 2.10  foreign 2.79
15:18  MemFree 0.09 GiB   MemAvailable 1.25 GiB   mine 2.46  foreign 3.16   ← ~2 min from OOM-137
```

`MemAvailable` was falling about 0.6 GiB per minute against a 7.65 GiB VM. An OOM-137 there kills the
sibling's run as well as this one, and the sibling was roughly forty minutes into its own.

**The action taken was the one that bounds this lane without touching anything foreign**: SQL Server's
`max server memory (MB)` was set to 1200 inside **this lane's own container**, identified by its
Testcontainers session id rather than by name — `wizardly_nobel` carries
`org.testcontainers.session-id=95d8ca73-…`, which is this lane's `dotnet test` process; the foreign
container carries `ec6e993f-…` and was never inspected into, capped, stopped or restarted. `MemAvailable`
recovered from 1.25 to 1.46 GiB immediately and this lane's container fell from 2.46 to 2.17 GiB.

A watchdog re-applies the same cap to any further container carrying **this lane's** session id, because
each module fixture starts a fresh one that would otherwise come up uncapped
(`buffer-pool-caps.txt` records every application, with the session id).

This is worth writing down as an estate fact rather than as a lane anecdote: **capping the buffer pool of
your own Testcontainers SQL Server is a cheap and reversible alternative to blocking**, and it makes two
concurrent SQL lanes safe on this host where two uncapped ones are not. It changes no test, no fixture and
no schema — only how much RAM the server under the tests is allowed to cache — so the measurement it
protects stays comparable to the uncapped baseline.

---

## 8. A rule that this migration puts a new table under, checked before it could bite

`WebApi.Tests/Modules/TriggerRefusalAttributionTests.cs` is a **fast-tier** rule whose scope is *derived*
from `Migrations/`: it parses every `CREATE TRIGGER … AFTER` out of the migration sources and demands that
any SQL-Server-backed test asserting a refused raw UPDATE/DELETE on such a table **pin the SQL error
number** — because SQL Server evaluates constraints before an AFTER trigger, so a test that asserts only
"something threw" certifies the foreign key and keeps passing with the trigger dropped.

Adding `TR_GrowthAuditEvents_AppendOnly` puts `GrowthAuditEvents` into that derived scope **the moment this
migration lands**, and adding a refusal test puts this lane's new class under the rule. Both were checked
against the rule's own regexes rather than assumed:

- `TriggerDeclaration` matches the migration's trigger body verbatim, so the table is in
  `AfterTriggerTables()` — the derivation reaches it rather than silently missing it.
- The two refusal tests interpolate their table name, so they resolve through the rule's **sweep** branch,
  which reads the family off the class body; `private const string Table = "GrowthAuditEvents"` is what makes
  that resolve.
- Both pin the number — `Assert.Equal(50074, ex.Number)` satisfies `ThrowNumberLiteralPin`
  (`\b5\d{4}\b[^;]*\bNumber\b`), and `Subject` is the whole method body, so the assertion is in range.
- `EveryAfterTriggerTableWithFkChildrenHasANumberPinnedDeleteRefusal` skips this table because it has no FK
  children — which is the same fact that makes the drop-and-retry proof in §2 meaningful.
- `TheDerivedScopeReachesTheTriggerSurface` asserts floors (≥20 triggers, ≥15 refusal methods); this change
  only raises both.

The allowlist is empty and stays empty. **No entry was added to make this pass.**

---

## 9. Both tiers, and where the work sits

| tier | selector | baseline `24cd4ead` | this lane |
| --- | --- | --- | --- |
| SQL | `Database=SqlServer` | 565 / **22** / 587 | **593 / 1 / 594**, 40 m 54 s |
| fast | `Database!=SqlServer` | 4703 / **0** / 10 skipped | **4703 / 0 / 10**, identical |

The fast tier matters here beyond housekeeping: `TriggerRefusalAttributionTests` lives in it, and §8 is the
argument that the new trigger and the new refusal tests satisfy its derived rule. The run is the check on
that argument, and the counts did not move by one.

`lane/growthaudit-migration` @ `93a52938`, **0 behind / 1 ahead** of `integration/mig-stack-merge`
(`7f8945dc`) — a clean fast-forward for whoever lands it. Never pushed; the branch exists on no remote.
`integration/mig-stack-merge` and `feature/restaurant-modules` are both unmoved.

Nine files: the migration pair, the model snapshot, the DbContext and entity comments, three test files, and
the ledger. **Staged by explicit path, never `git add -A`** — the suite rewrites
`artifacts/journeys/ev-dietary/run-sheet.{json,md}` on every run (only the captured timestamps change), and a
blanket add would have swept that unrelated churn into this migration's commit. Those two files were
restored, so the working tree is clean.

## 10. What a reviewer should look at hardest

1. **The Designer parent.** Everything else follows from it, and it is the constraint the estate has broken
   twice. `Migrations/20260806125642_Growth_AuditLedger.Designer.cs` vs
   `Migrations/ApplicationDbContextModelSnapshot.cs` — byte-identical — and vs
   `20260803093235_…Designer.cs` — additive, one entity.
2. **`TotalGrowthTables` 19 → 20.** This is the one place the lane changed a green assertion. The argument
   that it was green *because of* the defect is in §3; the alternative reading — that a migration author
   moved a number to make their own change pass — is the one to test, and the test is that the count is
   derived from `sys.tables` on a chain-built catalog and the ledger really is the 20th `Growth%` table.
3. **THROW 50074.** Verified from migration bodies rather than the ledger, which is wrong about this in
   three copies. Re-run: `grep -ohE "THROW 5[0-9]{4}" Migrations/*.cs` over non-Designer files.
4. **That the trigger is doing the refusing.** §2's drop-and-retry, not the fact that something threw.
