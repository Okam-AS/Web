# L-PENDING-MODEL-CHANGES-ON-THE-FAST-TIER — lane notes

Brief `f3c5ba50`. Actor `agent:L-PENDING-MODEL-CHANGES-ON-THE-FAST-TIER`.

## Base

`integration/mig-stack-merge` @ `7f8945dc6` ("Record both tiers at the merge tip, and the control that says
whose reds these are"), read out of `/Users/svendaneel/okam/OkamAPI` into my own detached worktree
`/Users/svendaneel/okam/wt-pendmodel`. Chosen over `8e2b57de` because `8e2b57de` **is an ancestor of**
`integration/mig-stack-merge`, 38 commits behind it — measured with `git merge-base --is-ancestor` and
`git rev-list --count`, not assumed. `../OkamAPI-modules` was left alone: it is checked out on
`lane/meals-grace-pins`, another lane's branch, and nothing here touched it.

No container was started, stopped or entered. One SQL container (`okam-lwtwo-sql`) was up throughout and
belongs to another lane.

## The brief's scoping claim, re-measured

Verified, and it is exact. `grep -rn HasPendingModelChanges --include='*.cs'`:

- **17** `*MigrationLineageTests.cs` suites exist. **All 17** carry `[Trait("Database", "SqlServer")]` and a
  SQL Server collection fixture. **15** of the 17 assert `HasPendingModelChanges()`
  (`MarginW2MigrationLineageTests` and `MarginW3MigrationLineageTests` are the two that do not).
- There is **no lineage suite at all** under `WebApi.Tests/Kassa/` or `WebApi.Tests/Tripletex/`.
- So on the tier every lane actually runs (`--filter Database!=SqlServer`) the assertion count was **zero**
  before this lane.

Each of the 15 sits beside a `GetPendingMigrationsAsync()` call and `sys.*` catalog probes, which do need a
server. That is why the cheap half was scoped behind the expensive half — not an oversight, a lack of a
second home for it. This lane gives it one.

## Does the API need a database? No — measured, not reasoned

`ctx.Database.HasPendingModelChanges()` diffs the model against `ApplicationDbContextModelSnapshot` in
process. The new suite proves it needs no round-trip in two independent ways at once:

1. every context is built on `Server=127.0.0.1,1;…;Connect Timeout=1` — routable to nothing; and
2. every context carries a `DbConnectionInterceptor` that **throws** on `ConnectionOpening`, and each test
   asserts the attempt counter is `0`.

Three tests, **~3 seconds**, no container.

## The check reds on the base, and the drift it names is real

Run at `7f8945dc6` with the plain `Assert.False(HasPendingModelChanges())` form
(`drift-on-merge-tip.txt`):

```
The model and ApplicationDbContextModelSnapshot disagree. 3 operation(s) would be needed to bring the
snapshot up to the model:
  - CreateTable GrowthAuditEvents
  - CreateIndex IX_GrowthAuditEvents_AggregateType_AggregateId on GrowthAuditEvents (AggregateType, AggregateId)
  - CreateIndex IX_GrowthAuditEvents_StoreId_OccurredAt on GrowthAuditEvents (StoreId, OccurredAt)
```

This is not a new finding — it is `docs/plans/PENDING-MIGRATIONS-LEDGER.md` **MIG-29 `Growth_AuditLedger`**,
which the merge's own status block already records in prose: *"`bd3a840f` (integration side) put
`GrowthAuditEvents` — a `DbSet` and two indexes — into `OnModelCreating` with **no migration**, so
`has-pending-model-changes` reports pending changes at this merge commit."* What is new is that a machine now
says it, in three seconds, on the tier every lane runs, instead of a paragraph a reader has to find.

**Derived, not measured (no SQL slot):** the same API is asserted by 15 SQL-tier suites, so all 15 of those
assertions are red at this commit for this one cause. That is a prediction from the same call, not a run.

## Why the shipped form parks the known drift instead of asserting a bare `false`

The literal exit criterion is a container-free test asserting `HasPendingModelChanges` is false. At this base
that test is red, and a permanently-red gate gates nothing — it cannot report the next arrival.

The estate already ruled this exact case. `lane/ef-index-shadow-sweep` @ `08309e39` holds
`WebApi.Tests/Modules/ModelIndexShadowSweepTests.cs`, a container-free model-level sweep in the same
directory, whose `Parked` list is introduced as *"a defect record and not an exemption: the fix is a schema
change, one migration author holds the chain at a time, and it is not this sweep's to make"* — word for word
this lane's constraint (C2, and the brief forbids authoring a migration). It pairs the sweep with a second
test that re-derives every parked entry and reds when one stops matching.

This suite adopts that shape, and keeps the raw assertion load-bearing rather than dropping it:

| test | what it refuses |
| --- | --- |
| `The_model_and_the_migration_snapshot_do_not_drift` | any drift operation **not** matched by exact text in `Parked` |
| `The_pending_changes_api_and_this_suites_own_diff_agree` | `Assert.Equal(Parked.Count > 0, HasPendingModelChanges())` — becomes the bare `Assert.False` the day MIG-29 lands — plus a diff that has diverged from what EF answers about |
| `Every_parked_drift_is_still_exactly_as_recorded` | a park that outlived its defect (reds and demands deletion when MIG-29 lands) |
| `The_reported_drift_does_not_depend_on_whether_the_api_ran_first` | the order dependence below |
| `The_check_is_not_vacuous_because_the_snapshot_is_found_and_populated` | a missing/truncated snapshot, which makes `HasPendingModelChanges()` return false while comparing nothing |
| `A_model_only_index_is_reported_as_drift` | an instrument that cannot fail |

Landing MIG-29 makes two of these red until the three parked entries are deleted in the same change, which is
the ratchet.

## The bug this lane put in its own instrument, and how it surfaced

The first draft passed in isolation and produced **three failures inside the full assembly**. Cause:
`snapshot.Model` is a bare `ModelBuilder` model with no runtime dependencies, so `GetRelationalModel()`
throws on it — and EF finalizes and runtime-initializes it **in place** on its way through
`HasPendingModelChanges()`. So the diff worked only on a context that had already answered the API, and threw
on one that had not. Worse, the very first draft wrapped the diff in a `try`/`catch` that turned the throw
into a fallback string, and `Assert.DoesNotContain(probeName, thatString)` then passed — the check reporting
green because its own reporting path had failed. That is the estate's recurring shape, produced here by this
lane, inside the file whose whole purpose is to not be that.

Fixed by doing EF's two steps in the suite itself, guarded for both orders (`FinalizeModel()` throws on an
already-read-only model), by deleting the `catch`, and by adding
`The_reported_drift_does_not_depend_on_whether_the_api_ran_first`, which computes the drift on a cold context
and on a warmed one and requires the two lists to be equal. **Only the full-assembly run exposed it** — a
single-class run is not evidence for a file that touches EF's model cache.

## Measurements

| | run | result |
| --- | --- | --- |
| baseline | `7f8945dc6`, fast tier, file absent | **0 failed / 4703 passed / 10 skipped / 4713 total**, 6 m |
| with the check | `66f19e236`, fast tier | **0 failed / 4709 passed / 10 skipped / 4719 total**, 5 m 54 s |

Delta **+6 total, +6 passed, 0 failed, 0 skipped**, accounted for one at a time — the six tests above, all
`Passed` in `7f8945dc-pendmodel-fast-tier.trx`. Both runs `--filter Database!=SqlServer`, `--no-build` after
a build whose assembly mtime was checked each time.

Suite alone: **6 passed in ~5 s**, no container.

## The scratch-tree red (the brief's requirement, done as an edit and not as reasoning)

`Helpers/ApplicationDbContext.cs` `OnModelCreating`, one index, no migration:

```csharp
builder.Entity<AccountingSummary>()
    .HasIndex(a => a.SendingSuccessful)
    .HasDatabaseName("IX_ScratchTreeRedProof_AccountingSummaries_SendingSuccessful");
```

Rebuilt (assembly mtime 17:00:51, verified — a preserved mtime is how this estate has measured a
pre-mutation binary before) and run → `red-on-scratch-tree.txt`:

```
The model and ApplicationDbContextModelSnapshot disagree. 1 unrecorded operation(s) would be needed to
bring the snapshot up to the model:
  - CreateIndex IX_ScratchTreeRedProof_AccountingSummaries_SendingSuccessful on AccountingSummaries (SendingSuccessful)
```

Exactly one test red, the other five green — so the red is the sweep firing and not the file collapsing.
Restored with `git checkout --`, `touch`ed, rebuilt (mtime 17:01:38), green again, and `git status --porcelain`
is empty apart from the new test file.

## What this lane did NOT do

- **No migration.** C2, and the brief withholds the slot. MIG-29 is named, its three operations are the
  parked list, and the ledger already carries its full DDL including the `THROW 50074` trigger.
- **No SQL tier.** No slot; `okam-lwtwo-sql` belongs to another lane and was not touched. The claim that the
  15 SQL-tier assertions are red at this commit for this cause is **derived from the same API call, not run**.
- **No push, and no shared ref.** `66f19e236` is a commit on this worktree's **detached HEAD**; no branch was
  created or moved.

## The limit this instrument has, and it is the interesting one

`HasPendingModelChanges()` diffs the model against the **snapshot**, never against the migrations' operations.
So the `AccountingSummaries` unique index — the brief's first example — **would not have been caught by it at
the time the double-post was live**. `20260803093235_Kassa_AccountingSummaryDayUniqueIndex`'s own summary is
the proof, and it was measured by its author, not assumed:

> `ApplicationDbContextModelSnapshot` was regenerated after the model gained the index, so the snapshot
> already claims the end state and `ef migrations add` emits ZERO operations for it — measured, not assumed:
> this file was scaffolded by `ef migrations add` and arrived with an empty `Up`.

The snapshot at `7f8945dc6` still carries `b.HasIndex("StoreId", "Date").IsUnique()` on
`WebApi.Entities.AccountingSummary`, exactly as described.

So the honest claim is narrower than the brief's, and worth stating precisely: **this check reds on the commit
that introduces a model-only declaration, and goes quiet again at the next unrelated `ef migrations add`,
which regenerates the whole snapshot and absorbs the drift.** It is a tripwire at the moment of introduction,
not a chain audit. That is still enough to have caught both of this week's defects at the commit that created
them — `GrowthAuditEvents` it catches today, three days later, because no regeneration has happened since —
but it is not a substitute for the SQL-tier catalog probe, and this file says so in its own summary rather
than leaving the next reader to infer a guarantee it does not give.

A check that compares the model to the **operations** would have no such blind spot. That is a different
instrument and a different lane; it is named here so the gap is recorded rather than assumed closed.

## Files

- `ModelVersusChainDriftTests.cs.pending` — the suite, as landed into
  `WebApi.Tests/Modules/ModelVersusChainDriftTests.cs`.
- `drift-on-merge-tip.txt` — the red, at `7f8945dc6`, from the bare-`Assert.False` form.
- `baseline-container-free.txt` / `with-check-container-free.txt` — the two fast-tier runs.
