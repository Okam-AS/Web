### MIG-29 `Growth_AuditLedger` — the table Growth's whole audit ledger is written into

From `lane/growth-audit-ledger` (D-GROWTH-AUDIT-LEDGER, ruled **growth-ledger** by @sven 2026-08-03). The
lane holds no migration-author slot and the chain is eight past `feature/restaurant-modules`, so the entity,
the model configuration, the writer, five write sites, the read surface and the whole proof are built and
green — and the **table is owed**. Everything below is already expressed in
`ApplicationDbContext.GrowthBuilder`, so `ef migrations add` against the true chain tip generates the table
itself; what a generator CANNOT produce is the trigger, which is the reason this entry exists.

**Table `GrowthAuditEvents`** — in the shape of `WorkforceAuditEvents` / `MealsAuditEvents` / `TrainingAuditEvents`:

| column | type | note |
| --- | --- | --- |
| `Id` | `uniqueidentifier` | PK, **app-assigned** (`ValueGeneratedNever`). Do NOT let EF add a default or an `OUTPUT` clause — that is what keeps the insert path compatible with an `AFTER` trigger (the MIG-14 lesson, SQL error 334). |
| `StoreId` | `int` **NULL** | BY VALUE, **no foreign key**, so the ledger never participates in a cascade. **Nullable is load-bearing, not laziness:** consent-text publication is platform-global and `GrowthConsentTextVersion` has no `StoreId` at all, so a NOT NULL column would force a tenant onto a fact that has none. |
| `ActorKind` | `nvarchar(16)` | Enum stored as a string (`Admin`/`Guest`/`System`), the sanctioned named-system-actor pattern (D-MEALS-AUDIT-ACTOR-KIND). |
| `ActorReference` | `nvarchar(256)` NULL | The acting user id when `ActorKind = Admin`; **exactly NULL** otherwise. Nullable in the schema on purpose — the coherence rule is enforced in `GrowthAuditWriter`, in both directions, because a NOT NULL column would make the honest Guest/System row unexpressible. |
| `EventType` | `nvarchar(128)` | |
| `AggregateType` / `AggregateId` | `nvarchar(128)` | |
| `CorrelationId` | `nvarchar(128)` NULL | |
| `SemanticDeltaJson` | `nvarchar(max)` | Key-sorted JSON, fail-closed against `GrowthAuditAllowlist`. |
| `OccurredAt` | `datetimeoffset` | `DateTimeOffset`, matching every other Growth timestamp — NOT the `DateTime OccurredAtUtc` the Workforce/Meals ledgers use. |

Indexes: `(StoreId, OccurredAt)` and `(AggregateType, AggregateId)`. **Neither is unique, and no unique index
belongs on this table** — two test-sends of the same version by the same admin are two events, and a
uniqueness constraint reached for by instinct would silently drop the second.

**What an absent value means here, and why this table has no backfill question at all.** `GrowthAuditEvents`
is a NEW table: it has zero pre-existing rows, so no row can predate the actor-kind concept and `ActorKind`
is NOT NULL from the first insert. That is worth stating explicitly because it is the exact opposite of the
sibling case — D-GROWTH-AUDIT-LEDGER's own recorded `con` against `actorkind-column` was that *backfilling
existing rows assigns a kind to rows that predate the concept, in an append-only ledger*. That objection is
real for `MealsAuditEvents`, which already holds rows; it does not apply to this table, and an author who
carries the Meals reasoning across would add a nullable column or a backfill `UPDATE` that neither the
model nor C1 wants (and which the trigger above would roll back). A NULL `ActorReference` on this table
therefore has exactly one meaning and never means "unknown": it means `ActorKind <> 'Admin'` — no store user
acted — and `GrowthAuditWriter` refuses, in both directions, any row where the two columns disagree.

**The trigger, which is the part only a migration can add.** `AFTER UPDATE, DELETE` →
`SET NOCOUNT ON; ROLLBACK TRANSACTION; THROW 50074, 'GrowthAuditEvents is append-only: UPDATE and DELETE are not permitted (a correction is a new event).', 1;`

- **50074** is free: the highest `THROW 500nn` claimed on any branch at the time of writing is **50073**
  (`51000`/`51001` are a different family). **Re-verify before authoring** — the number is only free until
  somebody else takes it, and the naive next-after-what-is-visible-locally pick is already Margin's.
- `AFTER`, not `INSTEAD OF`, matching the Workforce/Meals/Training audit ledgers. The sibling Growth
  consent tables use `INSTEAD OF`; either enforces, but the audit family's convention is `AFTER` and an
  `INSTEAD OF UPDATE` trigger would also silently swallow rather than refuse if the body were ever weakened.
- ⚠ **A backfill `UPDATE` will be rolled back by the trigger** — same warning as MIG-1. There is nothing to
  backfill here (the table is new), and C1 forbids it in any case.

**What is green WITHOUT this migration, and what is not.** The wire tier builds its schema with
`EnsureCreated()` from the model, so the table exists there and the full container-free tier is green
(4422/0/12) including the append-only guard. That guard is **layer 1 only** (the EF `GuardAppendOnly`
branch, all providers). Until MIG-29 lands there is **no layer 2 on SQL Server**, so a DBA session can still
rewrite these rows — stated in the `GuardAppendOnly` comment and in the entity's own summary rather than
assumed away. No SQL-tier test is owed by this lane: nothing here is provider-specific except the trigger,
and a trigger test would be red-by-construction until the migration exists.

**A SECOND lane now writes into this table and asks nothing new of it.** `lane/gr-dispatch-actor` records
`growth.newsletter.dispatch_requested` — the actor who triggered a mass send, which the approval on the
version does not name — so the write sites are six rather than five and `GrowthDispatchService.cs` joins the
list above. It adds two allowlist KEYS (`dispatchRunId`, `runCreated`) and no column, no index and no
constraint, so the table shape specified here is unchanged and this entry still needs authoring exactly once.
Until it is authored, that attribution exists on SQLite (fast + wire) and nowhere on SQL Server.
