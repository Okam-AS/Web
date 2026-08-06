# The first thing the SQL tier found: the model and the chain disagree at the migration-stack tip

This is the payment the lane exists to make. The SQL tier had never run on any tree carrying this stack, and
within four minutes of the first run it reds a class of assertion the fast tier structurally cannot make.

## The failure

```
Failed WebApi.Tests.Training.TrainingW1MigrationLineageTests.Has_no_pending_model_changes_after_the_training_wave
Failed WebApi.Tests.Training.TrainingW3MigrationLineageTests.Has_no_pending_model_changes_after_the_w3_wave
  Assert.False() Failure   Expected: False   Actual: True
  WebApi.Tests/Training/TrainingW3MigrationLineageTests.cs:line 68
```

The assertion, and the comment above it, name exactly what it is for:

```csharp
// The forked-parent detector: a migration whose Designer snapshot was generated against anything
// other than the real chain tip leaves the model and the last snapshot disagreeing here.
Assert.False(ctx.Database.HasPendingModelChanges());
```

**There are 13 of these in the SQL tier**, one per module wave (Events ×3, Margin, Meals ×3, Training ×2,
Workforce ×4). They can only run against a chain-built SQL Server catalog, which is why nothing has ever
seen them.

## It is NOT introduced by the composition — proven on the parent, without a container

```
$ cd /Users/svendaneel/okam/wt-composebase          # detached at 24cd4ead, the migration-stack tip
$ dotnet ef migrations has-pending-model-changes --project WebApi.csproj --no-build
Changes have been made to the model since the last migration. Add a new migration.
```

That is the migration-stack tip **before** this lane merged anything into it. The composition changes no
file under `Migrations/`, moves no `ModelSnapshot`, and changes no entity or `ModelBuilders` file — so it
cannot be the cause and is not.

## What changed the model, and when

L-MIG-STACK-LAND asserted, correctly, that at `1de06906` the same command reported **no** pending changes.
Between `1de06906` and `24cd4ead` there are 63 non-merge commits. Exactly **one** touches `Entities/` or
`ModelBuilders/` while adding no file under `Migrations/`:

```
bd3a840f  2026-08-03 14:17  Growth gets the audit ledger the other three modules already have
          Entities/Growth/GrowthAuditEvent.cs   (new entity)
          Helpers/ApplicationDbContext.cs       (+33: DbSet and two indexes in OnModelCreating)
          ... 23 further files, none under Migrations/
```

No migration in the chain at `24cd4ead` creates `GrowthAuditEvents`, and no commit on **any** ref in the
repository ever added one:

```
git log --all --oneline --diff-filter=A -- 'Migrations/*Growth*Audit*'   ->  (empty)
git show 24cd4ead:Migrations/ApplicationDbContextModelSnapshot.cs | grep -c GrowthAuditEvent  ->  0
```

## It is already written down — and that makes it worse, not better

`docs/plans/PENDING-MIGRATIONS-LEDGER.md` on this very tree records it as **MIG-29 `Growth_AuditLedger` —
"the table Growth's whole audit ledger is written into"**, and says in as many words:

> put `GrowthAuditEvents` — a `DbSet` and two indexes — into `OnModelCreating` with **no migration**

> `ef migrations add` on this tree **will fold in `CreateTable GrowthAuditEvents`**, because the entity is in
> the model and in no migration

So the state is known and deliberate. Three consequences are not, and all three are C2's `violated_when`
second clause playing out:

1. **The next migration author on this branch silently ships Growth's audit table inside an unrelated
   migration.** The ledger predicts it. Whoever holds the migration-author slot next has to defuse it
   before generating anything, or C2 is broken by an author who did nothing wrong.
2. **Growth's audit ledger does not exist on a chain-built database.** Every one of `GrowthAuditLedgerTests`
   and `GrowthAuditWriterTests` (793 lines) passes on the fast tier because a model-built SQLite database has
   the table. On a real deployment the writes have nowhere to go. This is the `AccountingSummaries` shape
   named in C2's own `holds_because`, repeated on a different table, and it is the reason the constraint
   says *the chain is the truth, not the model*.
3. **13 SQL-tier assertions are red on the migration-stack tip and were reported green.** Not by a false
   claim — L-MIG-STACK-LAND's `has-pending-model-changes` was run at `1de06906` and was true there. The
   defect is that the check was never re-run at the tip that three later merges produced, and the tier that
   would have caught it automatically has never executed.

## What this lane did NOT do about it

Nothing. C2 puts one migration author on the branch at a time and this lane is not it; the brief is explicit
that a composition lane does not generate a migration. **The fix is named, not made**: MIG-29 needs to be
authored by the slot holder, against the current chain tip, before any other migration is generated on this
branch — and the `THROW 50074` append-only trigger the ledger specifies for `GrowthAuditEvents` has to land
with it, or C1's deny-trigger claim is asserted for a table that does not have one.
