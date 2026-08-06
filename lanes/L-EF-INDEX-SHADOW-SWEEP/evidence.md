# L-EF-INDEX-SHADOW-SWEEP - evidence

Branch `lane/ef-index-shadow-sweep` @ `08309e39`, worktree `/Users/svendaneel/okam/OkamAPI-efshadow`.
Local commit only. Nothing pushed. No migration authored (C2).

## 1. Base: measured, not inherited

| branch | migrations | HasIndex in DbContext | relation |
|---|---|---|---|
| `feature/restaurant-modules` @ 3579bbbc | 127 | 178 | integration tip |
| `integration/mig-stack-land` @ 4b37f81b | 136 | 196 | **chosen** |
| `lane/wf-bootstrap-one-engagement` @ 6fa2cbc3 | 137 | 198 | 3 ahead, in flight |

`git rev-list --left-right --count feature/restaurant-modules...integration/mig-stack-land` = `0 34`,
and `git merge-base` of the two IS `3579bbbc`. So the migration stack is a **strict descendant** of the
integration tip: choosing it loses nothing and gains 18 index configurations plus 9 migrations. A sweep run
on `feature/restaurant-modules` would have been blind to all 18, and blind to the AccountingSummaries and
company-receivable work that landed on the stack. That is the whole reason to measure rather than inherit.

Every branch in the repo was enumerated by migration count; only `lane/wf-bootstrap-one-engagement` is
ahead of the chosen base, by three commits, and it is another lane's unmerged work. It is also the lane
that discovered this defect - its ApplicationDbContext.cs carries the correct exemplar:

```csharp
b.HasIndex(x => x.StoreId);
// The NAMED overload, because the model keys an unnamed index by its columns alone: a second
// b.HasIndex(x => x.StoreId) would have RECONFIGURED the non-unique one above into this
// unique filtered one rather than adding a second, and the store-scoped reads would have
// silently lost their index.
b.HasIndex(x => x.StoreId, "UX_WorkforceStaffMembers_OneFirstEngagementPerStore")
    .IsUnique()
    .HasFilter("[IsFirstEngagement] = 1");
```

I did not base on it, so the check is mergeable onto the stack tip on its own.

## 2. Method: the model, not a source scan

`WebApi.Tests/Modules/IndexConfigurationSweep.cs` subclasses `ModelBuilder`, `EntityTypeBuilder<T>` and
`EntityTypeBuilder`, overriding the `Entity`/`SharedTypeEntity` family and all six `HasIndex` overloads,
then runs the REAL `ApplicationDbContext.OnModelCreating` through it. Every constructor and method needed is
public and virtual in EF Core 8.0.26 (verified by reflection before writing a line).

**Why the model cannot answer this directly.** After a replacement there is exactly ONE index on those
columns, configured the way the last caller wanted, and it is entirely well-formed. The loss is a property
of the CALLS; the model keeps no record of a call that reconfigured rather than added. This is asserted, not
assumed, by `The_replaced_index_leaves_no_trace_in_the_model`: two calls, one index. If a future EF ever
added the second index instead, that test fails and the rule should be deleted.

**What running beats scanning.** `A_collision_assembled_by_a_helper_and_a_loop_is_still_reported` builds one
of the two colliding configurations in a generic shared helper and the other inside a `foreach`. Neither is
written out anywhere. A grep for two `HasIndex(x => x.StoreId)` lines finds nothing; this finds both. The
same mechanism is why Identity's and OpenIddict's own index configuration is swept - they configure through
the same builder - which no scan of this repository's source would ever reach.

**The slot rule is EF's own index identity, derived, not guessed.** Unnamed indexes are keyed by their
ordered property list; named indexes are keyed by their name. Any slot claimed by two or more calls is a
silent replacement. Four EF semantics were pinned empirically before being asserted:

| shape | EF result |
|---|---|
| unnamed + unnamed, same columns | 1 index - silent replacement |
| unnamed + `.HasDatabaseName("X")`, same columns | 1 index - **HasDatabaseName is not the fix** |
| same name, same columns | 1 index - silent replacement |
| same name, different columns | EF THROWS - needs no rule |
| unnamed + NAMED, same columns | 2 indexes - the fix |
| `{A,B}` + `{B,A}` | 2 indexes - order is part of identity |

## 3. What it cannot see - and why that cannot go quiet

Interception covers the `ModelBuilder.Entity` family only. An index arriving through an owned-navigation
builder, an `[Index]` attribute, or a direct `IMutableEntityType.AddIndex` is NOT recorded.

That blind spot is self-announcing rather than silent. `Every_index_the_model_declares_was_seen_as_a_
configuration_call` re-derives the finished model's own non-convention index set and fails on any index the
recorder did not see, so a new door forces the recorder to be extended instead of quietly narrowing what is
checked. `An_index_configured_through_a_door_the_recorder_does_not_watch_is_reported_as_unaccounted` proves
that guard can fail, by adding an index straight to the metadata.

Two further honesty notes:

- The reverse direction is also checked (`Every_configuration_call_left_an_index_in_the_model`), so the
  recorded set and the model's set are reconciled both ways.
- A sweep over an empty model passes every rule above. `The_sweep_observed_the_production_model_building`
  refuses to let that read as health.

Census on the production model:

```
CALLS=199 (named=9, unnamed=190) over 136 entity types
DECLARED=349 (convention=151, non-convention=198)
COLLISIONS=1  UNACCOUNTED=0
```

199 calls produced 198 non-convention indexes. The one-index deficit IS the one live replacement; the
arithmetic closes with nothing left over.

## 4. THE LIVE FINDING - JournalEntry (CashPointId, OrderId)

Reported by the sweep on first run, unprompted:

```
JournalEntry [CashPointId, OrderId]  (keyed by its columns, because no call named it)
  claimed 2 times:
    ApplicationDbContext.cs:935
    ApplicationDbContext.cs:946
```

`Helpers/ApplicationDbContext.cs` lines 931-947 - two configurations eleven lines apart:

```csharp
// Finalize looks up the journal by (CashPointId, OrderId) for its per-sale idempotency
// check while holding the finalize lock; without this it range-scans the register's whole
// journal slice on every sale. Filtered to receipt/order-linked entries.
builder.Entity<JournalEntry>()
    .HasIndex(x => new { x.CashPointId, x.OrderId })
    .HasFilter("[OrderId] IS NOT NULL");

// One Sale per (cash point, order) - the fiscal invariant. ...
builder.Entity<JournalEntry>()
    .HasIndex(x => new { x.CashPointId, x.OrderId })
    .IsUnique()
    .HasFilter("[OrderId] IS NOT NULL AND [ReceiptType] = 'Sale'");
```

Only the second exists. Confirmed in three independent places:

1. **Model** - the sweep records two calls and one index.
2. **Snapshot** - `Migrations/ApplicationDbContextModelSnapshot.cs:3657` carries a single
   `b.HasIndex("CashPointId", "OrderId").IsUnique().HasFilter("[OrderId] IS NOT NULL AND [ReceiptType] = 'Sale'")`.
3. **The chain, which shipped it** -
   `20260709231226_POSv1.cs:1162` created `IX_JournalEntries_CashPointId_OrderId` non-unique,
   filter `[OrderId] IS NOT NULL`; then `20260716003156_PosPendingSchemaAndCashDrawerPairing.cs:13`
   **DROPPED that name** and line 82 re-created the same name `unique: true`,
   filter `[OrderId] IS NOT NULL AND [ReceiptType] = 'Sale'`.

Nobody chose to drop the lookup index. EF emitted the drop because the model only ever had one index to
emit, and a drop-and-recreate is exactly what a facet change looks like in a generated migration - the diff
reads as routine. This is the brief's failure shape found live and already deployed.

**Scope, stated honestly.** The fiscal constraint is intact and is not in question. What is gone is the
index the first comment says is there. The finalize idempotency read at
`Services/Kassa/FinalizeService.cs:245-247` does carry `ReceiptType == Sale`, so SQL Server may still match
it to the surviving filtered index; I could not measure a plan, because no SQL tier ran (see 6). The reads
that provably cannot use it are the ones not restricted to Sale - e.g. the refund-cap aggregate at
`FinalizeService.cs:366` and `:480-483`, which filter `ReceiptType == Return`, a receipt type the surviving
index excludes by construction. The table is append-only and only grows.

**Not fixed here, by C2.** The fix - naming the fiscal backstop
`HasIndex(x => new { x.CashPointId, x.OrderId }, "UX_JournalEntries_OneSalePerOrder")` - restores the lookup
index and therefore requires a migration creating both. One migration author at a time and it is not this
lane.

**Parked so the check can still see the NEXT one.** A rule that is red for a known reason cannot report a
new arrival, so the finding is recorded in `Parked` in `ModelIndexShadowSweepTests` with its reason and its
fix, keyed by slot and claim count. `Every_parked_replacement_is_still_exactly_as_recorded` re-derives it:
the entry fails the day it is fixed, and fails if a third configuration joins the slot, so it cannot rot
into a silencer and cannot absorb a new finding.

## 5. Non-vacuity, both directions, on the production model

Each case edits the real `Helpers/ApplicationDbContext.cs` at the roster site
(`WorkforceStaffMember`, line 2565 - the exact entity the origin lane hit), rebuilds, and asserts the
rebuilt **WebApi.dll** hash changed before believing the result. The production edit is in WebApi.dll, not
WebApi.Tests.dll; watching the wrong assembly is how a stale pass gets misread.

| case | injected | WebApi.dll sha (16) | result |
|---|---|---|---|
| baseline | - | `ae307922fb0a379f` | 17/17 green |
| A | `b.HasIndex(x => x.StoreId).IsUnique();` | `8b0fce62cf9a89f8` | **RED** |
| B | `b.HasIndex(x => x.StoreId, "UX_..._ProbeNamed").IsUnique();` | `e4d645dac3457f1d` | green |
| C | `b.HasIndex(x => new { x.StoreId, x.WorkforcePersonId });` | `d8d504417dcd5f87` | green |
| restored | - | `ae307922fb0a379f` | 17/17 green |

Case A's failure names the entity, the columns and both source lines:

```
WorkforceStaffMember [StoreId]  (keyed by its columns, because no call named it)
  claimed 2 times:
    ApplicationDbContext.cs:2566
    ApplicationDbContext.cs:2567
```

B and C are the reason this is a shadow check and not a ban. B is the correct way to put a second index on a
busy column and is what the roster actually ships; C is an ordinary second index. A rule that reported
either would be deleted by whoever needed the next one, and would deserve it.

Restoration is proven by hash, not by prose: WebApi.dll returned to `ae307922fb0a379f`, byte for byte its
pre-mutation value.

Note on B and C being green for the right reason: C's column `WorkforcePersonId` already carries an EF
convention FK index, so C also demonstrates that explicitly configuring an index over a convention-created
one is a single call and not a collision.

## 6. Tiers, containers, and what stayed unproven

Fast tier `dotnet test --filter "Database!=SqlServer"`: **4450 passed, 0 failed, 10 skipped**, 7m14s.
The baseline recorded in the commit message of the base itself (`4b37f81b`) is 4433 passed / 0 failed.
4450 - 4433 = 17 = exactly the tests added here. No regression, nothing else moved.

**No container started, none touched, none killed.** The whole sweep is model-building only: it never opens
a connection. The connection string is a deliberate non-resolvable literal,
`Server=index-shadow-sweep.invalid;Database=model-build-only;Encrypt=False;` - printed here in full, and
it is the only one this lane resolves. No database was created, read, written or migrated; nothing
production-shaped was reachable at any point.

Left unproven as a result: whether the surviving Sale-filtered index is matched to the finalize lookup by
the SQL Server optimiser is a question about a query plan, and no plan was measured. That does not affect
the finding - the index the model claims does not exist on any deployed database - but it does bound the
performance claim, and it is a migration-author question anyway.

## 7. Constraints

- **C2** - no migration authored. The live finding is reported with its exact columns and both
  configurations for the next author, which is what the brief asked for.
- **C1** - nothing backfilled or purged; no DML anywhere in this lane. The JournalEntry table is
  append-only and was not touched.
- **C7** - no secret in any log sink. The only connection string introduced is the non-resolvable literal
  above, which carries no credential.
- Tracked-file discipline - the wire tier dirtied `artifacts/journeys/ev-dietary/run-sheet.json` and
  `run-sheet.md` exactly as the brief warned; both restored, not committed. Commit staged by explicit
  pathspec (three new files), never `git add -A`.
