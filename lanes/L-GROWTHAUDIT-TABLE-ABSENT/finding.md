# L-GROWTHAUDIT-TABLE-ABSENT — `GrowthAuditEvents` exists on no chain-built database

**Verdict: the audit premise HOLDS, and it is case (1) of the four — in the model, in no migration, under no
other name, and created by no raw SQL.** Read by object from `refs/heads/feature/restaurant-modules`
(`8e2b57de`), never from the repo's checked-out working tree (which is `lane/meals-grace-pins` at `34c6c103`,
63 commits behind, and has manufactured false absences for other lanes today).

---

## 1. The premise, verified with a control that could have failed

Every count handed to a lane in this program has been wrong at least once, so the search was built to
demonstrate itself on tables known to be present before reporting one that is not.

| table | migration files naming it | model-snapshot hits |
| --- | --- | --- |
| `AccountingSummaries` (control) | 47 | 1 |
| `WorkforceAuditEvents` (sibling control) | 13 | 1 |
| `MealsAuditEvents` (sibling control) | 13 | 1 |
| `TrainingAuditEvents` (sibling control) | 13 | 1 |
| `GrowthConsentTextVersions` (same-module control) | 13 | 1 |
| **`GrowthAuditEvents`** | **0** | **0** |

Searched from the repository root with full paths, both the plural table name and the singular CLR entity
name (`GrowthAuditEvent`), across **all** files on the branch — not a `Migrations/`-only pathspec, which is
the shape that made a zero impossible to fail elsewhere in this program.

**The strongest form of the check, which is falsifiable and near-exhaustive.** Extract every
`public DbSet<T>` from `Helpers/ApplicationDbContext.cs` (200 entity types) and every
`modelBuilder.Entity("…")` from `Migrations/ApplicationDbContextModelSnapshot.cs` (205, the surplus being
owned types and entities with no DbSet), then diff:

```
DbSet entity types NOT in the model snapshot:
GrowthAuditEvent
```

**Exactly one of 200.** The method found 199 present and this one absent, so the result is not an artifact of
a query that could only return zero.

Branch-wide grep places `GrowthAuditEvent` in 22 files: the entity, the enum, the DbContext, models,
six services, seven test files, the pending-migrations ledger and a merge receipt. **`Migrations/` is not
among them.**

## 2. Which of the four findings this is

- **In the model and in no migration — YES.** `Helpers/ApplicationDbContext.cs:215` declares the DbSet;
  `:3563` configures the entity (key, `ValueGeneratedNever`, six `HasMaxLength`, two `HasIndex`).
- **In a migration under a different name — NO.** The configuration contains **no `ToTable(...)`**, so the
  table name is EF's default from the DbSet: `GrowthAuditEvents`. Every `CreateTable` naming `…AuditEvents`
  on the branch is Meals, Training or Workforce (`RestaurantModules_Initial.cs:280`, `:432`, `:533`).
- **In neither — NO**, it is in the model.
- **Created by raw SQL outside the EF chain — NO.** Fifteen `.sql` files exist on the branch
  (`Scripts/*.sql`, `docs/okam-kassa/sql/journal-append-only-triggers.sql`); none mentions it, and no
  `migrationBuilder.Sql` on the branch does either.

### The sibling trap, checked explicitly and NOT present here

`F-ACCT-DUP` hides because a migration **does** create an index on `AccountingSummaries` — just the wrong,
non-unique one — so a careless check clears the flag wrongly. **The same shape does not exist here.** There is
no partial artifact to misread: no `CreateTable`, no `CreateIndex`, no trigger, no `THROW 50074`, no column
add. The absence is total, which makes this the easier of the two to confirm and the harder to have noticed.

## 3. Which databases are affected — the distinction the remedy and the urgency turn on

**Model-built databases have the table. Chain-built databases do not.**

- **Model-built (`EnsureCreated()`)** — 170 call sites across `WebApi.Tests/`. `EnsureCreated` builds the
  schema from the *current model*, which includes `GrowthAuditEvent`. The table exists, the whole
  container-free tier is green (4422/0/12 per the ledger), and the EF-layer append-only guard is exercised.
  **This is why a green suite cannot see this defect** — the tests build the very schema the chain omits.
- **Chain-built (`dotnet ef database update`, `__EFMigrationsHistory`)** — the table does not exist.

**Production is chain-built.** There is **no `Database.Migrate()` anywhere in application code** (Program.cs,
Startup.cs, Helpers/, Extensions/ — zero hits); the schema is applied by `dotnet ef database update`, and
`CLAUDE.md:60` states the user runs all production migrations himself against `okam.database.windows.net`.
`Scripts/demo/demo-up.sh:98` applies the chain the same way and then counts `__EFMigrationsHistory`.

**Therefore: production, okamtest, okam_local and the demo environment all lack `GrowthAuditEvents`.
Only the test tiers have it.** Production resembles the tier that does *not* have the table.

Mitigating the urgency, and it should be stated plainly: **the Growth journal tables are not yet deployed** —
this is unlanded module work on an integration branch, not live exposure. The finding is a **go-live blocker
for Growth**, not a live production defect.

## 4. What actually happens at runtime — not "a missing table", and not a silent skip

`GrowthAuditWriter.Append` (`Services/Growth/GrowthAuditWriter.cs:89`) only calls `_db.GrowthAuditEvents.Add(…)`.
**It never calls `SaveChanges` itself.** The audit row is committed by the *caller's* `SaveChangesAsync`, in
the **same unit of work as the business mutation**. On a chain-built SQL Server that INSERT raises
`SqlException` **208** (`Invalid object name 'dbo.GrowthAuditEvents'`), which EF Core wraps in
`DbUpdateException`, and **the entire transaction rolls back — the privileged Growth change included**.

So the honest report is **not** "an audit trail is silently not being written". It is **fail-closed**: no
unaudited change slips through, because the change itself cannot commit. **Six privileged Growth operations
are hard-broken on any chain-built database.** The write path is fully reachable — all five services are
DI-registered (`Program.cs:1000`, `:1001`, `:1027`, `:1075`) and reached by four controllers
(`GrowthConsentTextsController`, `GrowthNewslettersController`, `GrowthSubscriptionsController`,
`GrowthDeliveryHealthController`) — so this is not a path nothing reaches.

The failure presents in **three different ways**, and two of them destroy the diagnosis:

**(a) Clean 500, root cause visible — four sites.** No catch surrounds the audit-carrying `SaveChangesAsync`:
`GrowthNewsletterService.EditDraftAsync` (:224/:245) and `.TestSendAsync` (:313/:327),
`GrowthSubscriptionService.ConfirmAsync` (:235/:255), `GrowthProviderAccountService.UpsertAsync` (:118/:136).
`DbUpdateException` propagates; the operator sees `Invalid object name 'dbo.GrowthAuditEvents'`.

**(b) A misdiagnosed 409 that instructs the operator to retry forever — `GrowthConsentTextService.PublishAsync`.**
Its `catch (DbUpdateException)` at `:247` is **untyped on the SQL error number**. It assumes any
`DbUpdateException` is the `(Locale, Version)` unique-index race, detaches the added rows and throws
`GrowthApiException.Conflict("growth.consent_text_version_race", "Another version of this locale was published
concurrently. Re-read the register and retry.")`. **There is no concurrent publisher.** The operator is told a
false story about a race, retries, and fails identically every time. The root cause never surfaces.

**(c) A secondary exception that masks the first — `GrowthDispatchService.CreateOrGetRunAsync`.** Its
`catch (DbUpdateException)` at `:311` also assumes the unique-`NewsletterVersionId` race. It clears the tracker
and runs `_db.GrowthDispatchRuns.AsNoTracking().FirstAsync(r => r.NewsletterVersionId == versionId)` — but the
transaction rolled back, so **no run exists** and `FirstAsync` throws `InvalidOperationException` ("Sequence
contains no elements"). Even had a run existed, the handler then calls `_audit.Append(...)` + `SaveChangesAsync`
at `:322`/`:323`, striking the same missing table again, now uncaught. Either way the caller sees an exception
that names neither the table nor the real fault.

**This is worth the owner's attention beyond the missing table itself:** (b) and (c) mean that even once the
table lands, those two catch blocks will misreport *any* future `DbUpdateException` that is not the race they
assume. They should discriminate on the SQL error number, as `WorkforceDbViolations.IsUniqueViolation` does.
Recorded here as an observation; **it is outside this lane's remedy and is not for this migration author.**

## 5. Layer 2 does not exist, and the code says so honestly

`ApplicationDbContext` line ~1628 puts `GrowthAuditEvent` in the `GuardAppendOnly` branch — **layer 1**, the EF
guard, on every provider. Its comment, and the entity's own summary, both state that the SQL Server
`AFTER UPDATE, DELETE` trigger is **owed** as MIG-22 and does not exist. No unearned two-layer claim is being
made anywhere in the code. This is documented, not undiscovered: `docs/plans/PENDING-MIGRATIONS-LEDGER.md:504`
carries the full MIG-22 entry (ruled `growth-ledger` by @sven 2026-08-03). **The defect is a known, tracked,
unauthored migration — not a surprise.** What the absence audit adds is that it is still unauthored, and that
production is a chain-built database.

---

## 6. Remedy — specified for the migration author. NO MIGRATION WRITTEN HERE.

**C2 is why this stops at a specification.** This lane holds no migration-author slot, six lanes are running,
and the chain has already been bitten twice (two migrations both adding `Orders.TableId`; `AccountingSummaries`'
unique index living only in the model).

**Chain tip to descend from, as of `feature/restaurant-modules` = `8e2b57de`:**

```
20260731220005_Workforce_IdentityCodeRegisterIssues
```

The new Designer snapshot's parent must be this id. ⚠ **Re-verify the tip at authoring time** — six lanes are
in flight and any landing migration moves it.

**Everything except the trigger is already in `ApplicationDbContext.GrowthBuilder`, so
`dotnet ef migrations add Growth_AuditLedger` against the true tip generates the table itself.** The generator
cannot produce the trigger; that is the part that must be hand-written.

### Table `GrowthAuditEvents` — no `ToTable`, default name

| column | type | nullability | note |
| --- | --- | --- | --- |
| `Id` | `uniqueidentifier` | NOT NULL | PK `PK_GrowthAuditEvents`. **App-assigned** (`ValueGeneratedNever`). **Do not let EF add a default or an `OUTPUT` clause** — that is what keeps the insert path compatible with an `AFTER` trigger (the MIG-14 lesson, SQL error 334). |
| `StoreId` | `int` | **NULL** | **By value, no foreign key** — the ledger never participates in a cascade. Nullable is load-bearing: consent-text publication is platform-global and `GrowthConsentTextVersion` has no `StoreId` at all. |
| `ActorKind` | `nvarchar(16)` | NOT NULL | Enum-as-string (`Admin`/`Guest`/`System`) via `EnumToStringConverter`. |
| `ActorReference` | `nvarchar(256)` | NULL | The acting user id when `ActorKind = Admin`; **exactly NULL** otherwise. Nullable on purpose — the coherence rule is enforced in `GrowthAuditWriter` in both directions, and NOT NULL would make the honest Guest/System row unexpressible. |
| `EventType` | `nvarchar(128)` | | |
| `AggregateType` | `nvarchar(128)` | | |
| `AggregateId` | `nvarchar(128)` | | |
| `CorrelationId` | `nvarchar(128)` | NULL | |
| `SemanticDeltaJson` | `nvarchar(max)` | | Key-sorted JSON, fail-closed against `GrowthAuditAllowlist`. |
| `OccurredAt` | `datetimeoffset` | NOT NULL | **`DateTimeOffset`, not the `DateTime OccurredAtUtc`** the Workforce/Meals/Training ledgers use. Do not copy the sibling column. |

### Indexes — two, and **neither is unique**

```
IX_GrowthAuditEvents_StoreId_OccurredAt          (StoreId, OccurredAt)
IX_GrowthAuditEvents_AggregateType_AggregateId   (AggregateType, AggregateId)
```

⚠ **No unique index belongs on this table.** Two test-sends of the same version by the same admin are two
genuine events; a uniqueness constraint reached for by instinct would silently drop the second. Note the
sibling ledgers carry a *single* composite `(StoreId, AggregateType, AggregateId)` index — **do not copy that
shape**; the model declares two different indexes.

### Trigger — the only part a generator cannot emit

```sql
AFTER UPDATE, DELETE →
SET NOCOUNT ON; ROLLBACK TRANSACTION;
THROW 50074, 'GrowthAuditEvents is append-only: UPDATE and DELETE are not permitted (a correction is a new event).', 1;
```

Name it `TR_GrowthAuditEvents_AppendOnly`, matching the three siblings created in `RestaurantModules_Initial.cs`
(`:4020`, `:4175`, `:4229`), and add the matching `DROP TRIGGER` to `Down()` as those do (`:4282`–`:4303`).

- **`AFTER`, not `INSTEAD OF`** — the audit family's convention. The sibling Growth *consent* tables use
  `INSTEAD OF`; either enforces, but an `INSTEAD OF UPDATE` would silently swallow rather than refuse if its
  body were ever weakened.
- **`50074` is free — re-verified this pass, with a correction to the ledger.** The ledger says "the highest
  `THROW 500nn` claimed on any branch at the time of writing is **50073**". On `feature/restaurant-modules`
  the highest actually claimed is **50060** (the full set runs 50001–50006, 50010–50018, 50020–50022,
  50030–50034, 50040–50043, 50050, 50052, 50053, 50060). The ledger figure evidently counted across unlanded
  lane branches. **50074 is safe against both readings**, but re-check at authoring time — it is only free
  until somebody else takes it, and the naive next-after-what-is-visible pick is already Margin's.

### Backfill: none, and the sibling reasoning must NOT be carried across

`GrowthAuditEvents` is a **new** table with zero pre-existing rows, so `ActorKind` is NOT NULL from the first
insert. This is the exact opposite of the sibling case: D-GROWTH-AUDIT-LEDGER's recorded objection against
`actorkind-column` was that backfilling assigns a kind to rows predating the concept in an append-only ledger.
That objection is real for `MealsAuditEvents`, which already holds rows; **it does not apply here.** An author
carrying the Meals reasoning across would add a nullable column or a backfill `UPDATE` that neither the model
nor **C1** wants — and which the trigger above would roll back anyway.

### What lands green, and what is still owed after it

The migration closes the gap for every chain-built database. **No SQL-tier test is owed by this lane**: nothing
here is provider-specific except the trigger, and a trigger test is red-by-construction until the migration
exists. Once it lands, a trigger test becomes writable and should be.

---

## 7. Constraints

- **C1** — honoured. No backfill, no `UPDATE`, no `DELETE` against an append-only table is proposed; §6
  explicitly forbids the backfill an author might reach for.
- **C2** — honoured. **No migration written.** The chain tip is named, flagged as re-verify-at-authoring, and
  the work is left to the single migration author. This lane read the chain by object and changed nothing.
- **C3** — not breached by the finding; the write path is already reachable (services DI-registered,
  controllers present). Reachability is what makes the defect bite rather than sleep.
- **C5** — the model-built/chain-built split in §3 is precisely a case of a green suite not being acceptance.

## 8. Evidence

Read-only, by object, from `refs/heads/feature/restaurant-modules` (`8e2b57de`) in
`/Users/svendaneel/okam/OkamAPI-modules`. No container used, no suite run, no branch switched, nothing written
outside this lane directory.

- `/Users/svendaneel/okam/OkamAPI-modules` → `Entities/Growth/GrowthAuditEvent.cs`
- `Helpers/ApplicationDbContext.cs:215` (DbSet), `:~1628` (GuardAppendOnly layer 1), `:3563` (model config)
- `Services/Growth/GrowthAuditWriter.cs:89`; `GrowthConsentTextService.cs:227,245,247`;
  `GrowthDispatchService.cs:211,269,306,311,322`; `GrowthNewsletterService.cs:224,245,313,327`;
  `GrowthSubscriptionService.cs:235,255`; `GrowthProviderAccountService.cs:118,136`
- `Program.cs:1000,1001,1027,1075` (DI)
- `Migrations/ApplicationDbContextModelSnapshot.cs` (zero hits, 205 entities), `Migrations/` (255 files, zero hits)
- `Migrations/20260731220005_Workforce_IdentityCodeRegisterIssues.Designer.cs` (chain tip)
- `Migrations/20260727221455_RestaurantModules_Initial.cs:533,4020,4175,4229,4282` (sibling shape + triggers)
- `docs/plans/PENDING-MIGRATIONS-LEDGER.md:504–545` (MIG-22)
- `CLAUDE.md:60`, `Scripts/demo/demo-up.sh:98` (chain-built deployment)
