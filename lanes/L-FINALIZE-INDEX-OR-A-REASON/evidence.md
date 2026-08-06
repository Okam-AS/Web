# L-FINALIZE-INDEX-OR-A-REASON — the measurement, and what it ruled out

**Refs.** Backend `feature/restaurant-modules` @ `8e2b57de` (the plan's canonical backend tip; the shared
`OkamAPI-modules` checkout sits on `lane/meals-grace-pins`, which is why every source fact below was read
with `git show 8e2b57de:<path>`). Work landed on `lane/finalize-index-or-a-reason` in a dedicated worktree
at `/Users/svendaneel/okam/wt-finalizeidx`.

## 1. The chain fact

`Helpers/ApplicationDbContext.cs` `KassaBuilder` claims `JournalEntry (CashPointId, OrderId)` twice, eleven
lines apart — a non-unique finalize lookup filtered `[OrderId] IS NOT NULL`, and a unique one-Sale-per-order
fiscal backstop filtered `[OrderId] IS NOT NULL AND [ReceiptType] = 'Sale'`. Neither call named its index, so
EF keyed both by (entity, ordered columns): the second call handed back the first index and reconfigured it.
The model therefore only ever had one index to emit.

The chain shows the consequence in the open, reading as an ordinary change:

| migration | what it did to `IX_JournalEntries_CashPointId_OrderId` |
| --- | --- |
| `20260709231226_POSv1` (:1163) | `CreateIndex` — non-unique, `filter: "[OrderId] IS NOT NULL"` |
| `20260716003156_PosPendingSchemaAndCashDrawerPairing` (:14, :83) | `DropIndex`, then `CreateIndex` — `unique: true`, `filter: "[OrderId] IS NOT NULL AND [ReceiptType] = 'Sale'"` |

Read off a database replayed from the chain (**not** a model-built one — that is the whole point):

```
CATALOG IX_JournalEntries_CashPointId_OrderId | unique=True | keys=(CashPointId,OrderId) | filter=([OrderId] IS NOT NULL AND [ReceiptType]='Sale')
```

One index on those columns. The backstop. The lookup does not exist on any deployed database.

## 2. The question, measured rather than argued

Four production reads go at the journal by (CashPointId, OrderId):

| read | predicate | hot? |
| --- | --- | --- |
| `FinalizeService.cs:250` `findExisting` | `CashPointId + OrderId + ReceiptType = Sale` | every sale, under the finalize lock |
| `FinalizeService.cs:294` handover resolution | `CashPointId + OrderId + EventType = UTLEVREC` | **every sale**, unconditionally after the append |
| `PosReceiptService.cs:147` delivery document | `CashPointId + OrderId + EventType = UTLEVREC` | every § 2-8-7 handover print |
| `PosReceiptService.cs:174` sale behind a handover | `CashPointId + OrderId + ReceiptType = Sale` | every § 2-8-7 handover print |

SQL Server uses a filtered index only where the query's predicate **implies** the index's filter, and it
rules on that itself: forcing an index whose filter the predicate does not imply raises Msg 8622. Asked
directly, on the chain-built catalog:

```
HINT finalize idempotency (ReceiptType = 'Sale'): plan produced — the predicate implies the index filter
HINT finalize handover (EventType = 'UTLEVREC'): Msg 8622: Query processor could not produce a query plan because of the hints defined in this query.
HINT any order-linked entry (no receipt-type predicate): Msg 8622: Query processor could not produce a query plan because of the hints defined in this query.
```

And the plans SQL Server actually compiled for the production queries (EF's own SQL, parameters sniffed, on
a journal of 64 000 entries for the register under test):

```
PLAN OKAM_PROBE_FINALIZE_IDEMPOTENCY:        Index Seek on [IX_JournalEntries_CashPointId_OrderId]
PLAN OKAM_PROBE_FINALIZE_HANDOVER:           Clustered Index Scan on [PK_JournalEntries]
PLAN OKAM_PROBE_RECEIPT_DELIVERY_FOR_SALE:   Clustered Index Scan on [PK_JournalEntries]
PLAN OKAM_PROBE_RECEIPT_SALE_FOR_DELIVERY:   Index Seek on [IX_JournalEntries_CashPointId_OrderId]
```

**One index does not serve both reads.** It serves the two Sale-scoped reads and is structurally incapable
of serving the two `UTLEVREC` handover reads, one of which runs on every single sale and scans the whole
append-only journal — a table that only grows. The cheaper answer the brief asked to test first is refuted
by measurement, so the exit criterion's first branch applies: the chain-built database must carry both.

Full run: `measurement-as-shipped.txt`.

## 3. The fix — `lane/finalize-index-or-a-reason` @ `5e53de83`

- `Helpers/ApplicationDbContext.cs` — the backstop is given an identity of its own,
  `HasIndex(x => new { x.CashPointId, x.OrderId }, "UX_JournalEntries_OneSalePerOrder")`, which is the fix
  the shadow sweep that found this parked for the migration author. The lookup then keeps
  `IX_JournalEntries_CashPointId_OrderId` and its `[OrderId] IS NOT NULL` filter.
- `Migrations/20260805160524_Kassa_FinalizeLookupIndex` — `RenameIndex` **first**, then `CreateIndex` for
  the lookup. A rename, not a drop and re-create: the unique index keeps its definition and its rows
  throughout, so the one-Sale-per-order invariant is enforced at every instant of the migration. `Down`
  reverses both. Nothing is backfilled, updated or deleted (C1).
- `WebApi.Tests/Kassa/JournalOrderIndexMeasurementTests` + its fixture — the measurement above, kept as a
  test: it builds from the chain, populates a journal large enough for a plan to mean something, and now
  fails on a scan or a missing index rather than reporting one.

Verification run after the fix — `measurement-after-fix.txt`, 4/4 on the committed tree:

```
CATALOG IX_JournalEntries_CashPointId_OrderId | unique=False | keys=(CashPointId,OrderId) | filter=([OrderId] IS NOT NULL)
CATALOG UX_JournalEntries_OneSalePerOrder     | unique=True  | keys=(CashPointId,OrderId) | filter=([OrderId] IS NOT NULL AND [ReceiptType]='Sale')

PLAN OKAM_PROBE_FINALIZE_IDEMPOTENCY:      Index Seek on [UX_JournalEntries_OneSalePerOrder]
PLAN OKAM_PROBE_FINALIZE_HANDOVER:         Index Seek on [IX_JournalEntries_CashPointId_OrderId]
PLAN OKAM_PROBE_RECEIPT_DELIVERY_FOR_SALE: Index Seek on [IX_JournalEntries_CashPointId_OrderId]
PLAN OKAM_PROBE_RECEIPT_SALE_FOR_DELIVERY: Index Seek on [UX_JournalEntries_OneSalePerOrder]

DOWN: IX_JournalEntries_CashPointId_OrderId unique=True
UP:   IX_JournalEntries_CashPointId_OrderId unique=False | UX_JournalEntries_OneSalePerOrder unique=True
```

The `DOWN`/`UP` pair is a real reversal on its own chain-built database with 84 000 rows in the table, not a
reading of the migration source: `Down` hands the unique backstop back under its original name, and `Up`
re-applies. Fast tier `Database!=SqlServer`: **4638 passed, 0 failed, 12 skipped** (the four new tests are
all `[Trait("Database", "SqlServer")]`, so that count is also the baseline).

Both tiers were run on one Testcontainers SQL Server that this lane started and that disposed itself; no
pre-existing container was touched.

## 4. Two things the next author must not inherit silently

**(a) EF wanted to fold `GrowthAuditEvents` into this migration.** `dotnet ef migrations add` emitted a
`CreateTable GrowthAuditEvents` plus two indexes alongside the index change: the entity is in
`OnModelCreating` and in no migration in the chain — the same shape as the `AccountingSummaries` unique
index and the `Orders.TableId` duplicate, and a *third* instance of it. It is already specified as **MIG-22
`Growth_AuditLedger`**, which also owes an append-only trigger this migration knows nothing about. Folding it
in would have put two ledger entries on one migration, which the ledger explicitly calls the failure mode it
renumbers to prevent. It was therefore stripped from the migration **and from both snapshots**, leaving the
pre-existing drift exactly as found for MIG-22's author. `Migrations/ApplicationDbContextModelSnapshot.cs`
now differs from `8e2b57de` by the index change and nothing else.

**(b) The migration is parented at `20260731220005_Workforce_IdentityCodeRegisterIssues`,** which is the
chain tip *at `8e2b57de`*. `integration/mig-stack-land` (and `lane/ef-index-shadow-sweep` off it) carries
five further migrations that have not landed here, so **this one must be re-parented onto that chain when
the stack lands** — its Designer regenerated, not merged. That branch's ledger declares **MIG-28 free**; this
migration should take it. No ledger edit was made here: the copy of the ledger at `8e2b57de` does not yet
contain MIG-23–27, so writing MIG-28 into it would have manufactured the conflict it is meant to avoid.

**(c) The park must be deleted in the same landing.** `lane/ef-index-shadow-sweep` @ `08309e39` holds a
`Parked` entry keyed `JournalEntry [CashPointId, OrderId]` in
`WebApi.Tests/Modules/ModelIndexShadowSweepTests.cs`, and it re-derives itself —
`Every_parked_replacement_is_still_exactly_as_recorded` **fails the day this is fixed**, by design. That
branch is not merged here, so the entry could not be removed from this lane; whoever merges the two must
delete it in the merge commit.
