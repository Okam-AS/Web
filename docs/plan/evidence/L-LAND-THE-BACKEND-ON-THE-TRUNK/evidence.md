# L-LAND-THE-BACKEND-ON-THE-TRUNK — evidence

Brief `14d7b7c0`. Actor `agent:L-LAND-THE-BACKEND-ON-THE-TRUNK`.
Repo `/Users/svendaneel/okam/OkamAPI-modules`, own worktree `/Users/svendaneel/okam/wt-landbackend`.

## 0. Revert

    git branch -f feature/restaurant-modules 8e2b57de8442a389a9b5f8025312c9750614c85e

Trunk before this lane: `8e2b57de8` (2026-08-04 12:00 "L-VIOLATION-EXACT-LAND: merge receipt").
**Not pushed.** Landing was authorised; publishing was not.

## 1. Graph, measured before any merge

`git merge-base` against the trunk `8e2b57de8`:

| ref | tip | merge-base w/ trunk | ahead | trunk ahead |
|---|---|---|---|---|
| `integration/mig-stack-merge` | `7f8945dc6` | `8e2b57de8` | 38 | 0 |
| `lane/growthaudit-migration` | `93a52938e` | `8e2b57de8` | 39 | 0 |
| `lane/backend-patches-composed` | `2ba9229fa` | `8e2b57de8` | 42 | 0 |
| `lane/trigger-declarations-refreshed` | `ead8869ee` | `8e2b57de8` | 43 | 0 |
| `lane/planned-minutes-honour-lineage` | `589056dfb` | `de1e5c5e9` | 4 | 63 |

All five refs matched the dispatch exactly. The first four are **linear descendants of the
trunk**, and they nest: `7f8945dc6` ⊂ `2ba9229fa` ⊂ `ead8869ee`, with `93a52938e` a sibling
of `2ba9229fa` off `7f8945dc6`. So the prescribed order 1 (mig-stack) → 2 (triggers) is
carried by the graph itself and needed no cherry-picking; the three composed patches ride
between them as ancestors of the trigger lane, which is unavoidable and harmless because
their migration/DbContext/entity diff is empty (§3).

## 2. Landing sequence

| step | action | result |
|---|---|---|
| 1 | `merge --ff-only 7f8945dc6` (`integration/mig-stack-merge`) | ff, `7f8945dc6` |
| 2 | `merge --ff-only 93a52938e` (`lane/growthaudit-migration`) | ff, `93a52938e` |
| 3 | `merge --no-ff ead8869ee` (triggers + composed patches) | merge, `7723ad2a4`, 0 conflicts |
| 4 | `cherry-pick -x 589056dfb` (planned-minutes) | `726906fe5`, 0 conflicts |

Steps 1 and 2 are **pure fast-forwards**, so the receipts file that
`integration/mig-stack-merge` resolved by content was never re-resolved — nothing about that
merge was recomputed by side or otherwise.

Growth audit (MIG-29) reaches the trunk at step 2, i.e. **before** the composed stack lands at
step 3, satisfying its note literally rather than only at the final tree.

## 3. Claims re-derived rather than inherited

**The composed stack touches no schema.** Independently re-derived, and with a corrected
pathspec — the reviewer's "ApplicationDbContext.cs" is really `Helpers/ApplicationDbContext.cs`,
and a bare `-- ApplicationDbContext.cs` pathspec matches only a root-level file that does not
exist, so it would have reported empty regardless:

    git diff --stat 7f8945dc6 2ba9229fa -- 'Migrations/**' '*ApplicationDbContext.cs' 'Entities/**'
    → empty

**`5243c06a7` and `ea66353f9` are the same patch.** Not merely the same diffstat:

    git patch-id --stable  →  72bfbd518c6459bac565d197e6450a00684f8b2d   (both)
    diff <(git show --format='' 5243c06a7) <(git show --format='' ea66353f9)  →  no output

This is what makes the two-base problem benign, and it was measured, not assumed.

## 4. The two-base problem, and how it was reconciled

`lane/planned-minutes-honour-lineage` is four commits on `de1e5c5e9` (2026-08-01), not on the
composed stack:

    34c6c1031  test(meals): three expiry-sweep pins            (2026-08-01)
    e956337ed  wip: rescue uncommitted work from OkamAPI-modules
    5243c06a7  wip: the open-shift lineage fix, as plain writes
    589056dfb  fix(workforce): republishing a week must not inflate ...   ← the lane's own work

`5243c06a7` is patch-identical to `ea66353f9`, which the composer had already re-authored onto
the composed stack. **Resolution: cherry-pick `589056dfb` alone** onto the composed lineage —
which is the base the lane was meant to have had.

Verified the dependency is satisfied rather than assumed: at the tip
`Services/Workforce/WorkforceScheduleSupport.cs` is **byte-identical to the same file at
`5243c06a7`**, so the lineage the fix reads is present via `ea66353f9`. All five of the lane's
files arrived byte-identical to `589056dfb`; the lane's 5 files and the lineage fix's 3 files
are disjoint.

### Deliberately NOT landed — recorded so it is not lost silently

Cherry-picking leaves two ancestor commits off the trunk. Neither is among the five named
landing inputs, and neither was reviewed today:

- **`34c6c1031`** — `Tests/Meals/MealsExpiryGraceReconciliationTests.cs` (+57) plus a
  `lanes/L-MEALS-GRACE-PINS/` evidence tree. Genuine 2026-08-01 test work, still unlanded.
- **`e956337ed`** — adds `.claude/settings.json` (a `PreToolUse` hook config),
  `Scripts/worldstamp`, `world.config`, `artifacts/world/WORLD.json`. Three reasons to leave
  it: it is a configuration change that would land as a side effect of a merge rather than as
  reviewed work; `artifacts/world/WORLD.json` is a **stale stamp** (stamped 2026-08-03,
  `branch: lane/meals-grace-pins`, `dirty: true`, `on_expected: false`, and
  `migrations_head: 20260731220005_Workforce_IdentityCodeRegisterIssues` — three chain tips
  behind); and none of the four paths exists on the trunk today.

Merging the branch whole would land all of the above. That is what a `merge` would have done
quietly; it is named here instead.

### The omission is bounded, and measured

The wholesale merge was computed rather than imagined:

    git merge-tree --write-tree 7723ad2a4 589056dfb
    → fafd58b72ba96a9364c5b792876dceeaeed8a3dc

That is **bit-identical to the tree the sibling lane
`L-ONE-CREDIT-SALE-PREDICATE-AT-THE-TRUNK` reported** for the same five inputs, re-derived here
independently — so this landing agrees with its composition.

    git diff --stat <my tip tree a553712f1> fafd58b72
    → 10 files changed, 383 insertions(+), 5 deletions(-)

and those ten files are **exactly** the omitted ancestry listed above (`.claude/settings.json`,
`Scripts/worldstamp`, `world.config`, `artifacts/world/WORLD.json`,
`Tests/Meals/MealsExpiryGraceReconciliationTests.cs`, and six `lanes/L-MEALS-GRACE-PINS/`
files). Nothing else differs: **every line of backend work is identical** under either
reconciliation. The cherry-pick dropped precisely what is named here and nothing more.

## 5. The one file both sides changed

`Helpers/ApplicationDbContext.cs` is the only path edited by both sides of step 3
(growthaudit +8, triggers +125, from base `7f8945dc6`). Git auto-merged it with no conflict
marker — the same shape as the pre-fork-head hazard — so it was checked **by content, not by
exit code**:

- `git diff ead8869ee HEAD -- Helpers/ApplicationDbContext.cs` → **exactly one hunk**,
  growthaudit's comment rewrite (the "⚠ Layer 2 does NOT exist yet" caveat replaced by the
  statement that `TR_GrowthAuditEvents_AppendOnly` now exists). Nothing else.
- Line-set check against both parents: lines added by the triggers lane relative to base and
  missing from the tip = **0**; same for growthaudit = **0**.
- `HasTrigger` count at the merge commit = **32**, equal to the triggers lane; growthaudit's own
  file had 2, which the trigger lane's `ModuleTriggerBuilder` supersedes by design rather than by
  loss. (At the *final* tip the count is **33** — §7 adds the thirty-third.)

No conflict arose anywhere in the landing, so `git merge-file` was not needed; no resolution in
this lane was taken by side, and `SaftCashRegisterExportService.MasterData.cs` was never
resolved by blob.

## 6. Invariants at the tip

**Credit-sale predicate — run at my own tip `726906fe5`, not inherited from the sibling:**

    git grep -lE 'bool +IsCreditSale *\(' HEAD -- '*.cs'
    → HEAD:Services/Kassa/KassaCreditSale.cs        (1 file — INVARIANT HOLDS)

    Services/Kassa/SaftCashRegisterExportService.MasterData.cs:112:
        else if (KassaCreditSale.IsCreditSale(entry))

The private predicate that `de1e5c5e9` and `589056dfb` both carry at `MasterData.cs:195` is
**gone**, not re-added: the merge base carries it, the trunk deleted it, the cherry-picked side
did not touch it, so the deletion applies. None of the eleven pre-fork heads was landed.

**Landing shape.** Trunk `8e2b57de8` → `726906fe5`, **46 commits**. All four branch inputs are
ancestors of the tip (`integration/mig-stack-merge`, `lane/backend-patches-composed`,
`lane/growthaudit-migration`, `lane/trigger-declarations-refreshed`); planned-minutes is present
as cherry-pick `726906fe5`. The single merge commit `7723ad2a4` has first parent `93a52938e`
(trunk lineage) and second parent `ead8869ee` (trigger lane), so first-parent history stays on
the trunk. All three composed patches (`d8c98c200`, `f3817eed9`, `ea66353f9`) verified present
at the tip file-by-file: **0 files differing** from their authored content.

**C7** — no log or telemetry call carrying a token/secret/key/signature/password property is
added anywhere in `8e2b57de8..HEAD`. **C1** — no UPDATE or DELETE statement is added against an
append-only table; the only matches in the migration diff are comments and `AFTER UPDATE, DELETE`
trigger headers.

**C2 — migration chain.** Growth audit is the sole migration author in this landing.
Migrations newer than the mig-stack chain tip `20260803093235_Kassa_AccountingSummaryDayUniqueIndex`:
exactly one, `20260806125642_Growth_AuditLedger` (MIG-29). No two migration files share an id.
Chain tip is now `20260806125642`; next free number remains **30**.

## 7. A defect that exists only at the join, found and closed

The first non-SQL tier at `726906fe5` came back **1 failed / 4735 passed / 10 skipped / 4746**:

    WebApi.Tests.Modules.DatabaseTriggerDeclarationModelTests
        .Every_trigger_the_chain_installs_is_declared_on_its_entity
    Expected: ···GrowthAuditEvents <- TR_GrowthAuditEvents_Appen···
    Actual:   ···GrowthConsentCheckReceipts <- TR_GrowthConsentC···

**This is not the known outbox red.** That one is
`EventsOutboxDeliveryTests.The_message_carries_the_link_and_no_other_guest_data`, a ~1-in-125
alias of `DoesNotContain("250", body)` onto the hex digits of a random `PublicToken`; it is
already fixed inside the stack by `24cd4ead5` and did not recur.

**Cause.** `lane/trigger-declarations-refreshed` was cut from `lane/backend-patches-composed`,
which does **not** carry MIG-29, so it correctly declared the **32** triggers its own chain
installed. `lane/growthaudit-migration` adds `TR_GrowthAuditEvents_AppendOnly`. At the merge tip
the chain installs **33** and the model declared **32** — exact set equality in both directions is
what that test refuses. Neither lane was wrong alone, and neither lane's own suite could see it:
this is visible only where the two meet, which is this lane.

**Why the tier caught it and no lane's own run could.** All fifteen
`Assert.False(HasPendingModelChanges())` lineage assertions carry `[Trait("Database","SqlServer")]`
and so live in the SQL tier; the set-equality check is the one model-level guard that runs in the
fast tier. The trigger lane's own SQL evidence was a filtered 102-test arm, not the whole tier, so
the interaction with a migration it did not carry was outside every prior run.

**Fix** (`c64d07437`) — one declaration in `ModuleTriggerBuilder`, in the established idiom:


    builder.Entity<GrowthAuditEvent>().ToTable(t => t.HasTrigger("TR_GrowthAuditEvents_AppendOnly"));

`DatabaseTriggerDeclarationModelTests` then passes **4/4**, including
`Declaring_the_triggers_produces_no_migration_operation`, which re-measures that a `HasTrigger`
declaration emits no migration operation. **No migration, no schema change, C2 untouched.** The
trigger lane's own doc-comment anticipated MIG-29 landing later, so this completes its stated
contract — "declare every trigger the chain installs" — rather than departing from it.

## 8. Container discipline

My Testcontainers session id, read from my own ryuk container's
`org.testcontainers.session-id` label: **`c2753495-8643-4c92-87b6-0337b0485fa3`**. Every container
this lane touched was resolved by that label:

    docker ps -q --filter "label=org.testcontainers.session-id=c2753495-..."
    → e003b979782c (ryuk 0.14.0) plus one mssql 2022-CU14 at a time

Over the SQL tier the fixtures started **six** SQL Server containers in sequence — `a60adac1e57a`,
`a7ba1edee004`, `ab0264a1b39f`, `625c119420e8`, `689fe44d3fc4`, `b54d9d15e2e7` — never more than
one alive at once, because `WebApi.Tests/xunit.runner.json` sets
`"parallelizeTestCollections": false`. Each was capped as it appeared (see the cap log).

The owner's `okam-lwtwo-sql` (`15ab63f37822`) and `okam-lwtwo-redis` (`50e7740aca8f`) carry **no**
`org.testcontainers.session-id` label at all — which is the positive proof they are not mine,
rather than an inference from names or from what was left over. They were never stopped, restarted
or exec'd into, and his API on :5971 (pid 47340) was never bound; this lane bound no port.

`max server memory` capped to **2048 MB** inside my own SQL container, over that container's own
connection, with the SA password read from that container's own env — `2147483647 → 2048`,
confirmed by reading `sys.configurations`. Six of the seven SQL fixtures do not cap themselves
(only `DatabaseTriggerSqlServerFixture` does), and Testcontainers disposes a fixture's container
when its collection ends, so `lanes/L-LAND-THE-BACKEND-ON-THE-TRUNK/cap-my-sql.sh` re-applies the
cap to any *newly appearing* container carrying **only** that session id, reading `value_in_use`
each pass so it is a no-op once capped. Nothing in it can select a container it does not own.

No `pkill`, and no kill by pattern: the one process this lane stopped was its own first capper,
by the exact pid it had just started (78398).

## 9. Not done

- **No push.** `feature/restaurant-modules` moved locally only; there is no
  `origin/feature/restaurant-modules` ref in this repo and no remote was contacted.
- **None of the eleven pre-fork heads was landed**, and no branch based at `2431883d` was merged.
- **No migration authored**, no schema change, no snapshot edit. The one code change this lane
  made is a single `HasTrigger` declaration (§7).
- `artifacts/journeys/ev-dietary/run-sheet.{json,md}` were dirtied by the fast tier, as forecast,
  and **reverted** — the committed tree does not carry the churn.

## 10. The SQL tier, against a named baseline

The baseline is not a memory, it is a receipt in this tree: `artifacts/tests/README.md` records
`24cd4ead-sql-tier.trx` at `24cd4ead` (the composed stack's tip) as **565 passed / 22 failed**,
and names both causes of those 22:

- **20** — `GrowthAuditEvents` living in `OnModelCreating` and in **no migration**, "including five
  that show newsletter dispatch failing outright on any chain-built database". This is precisely
  what `lane/growthaudit-migration` (MIG-29) fixes, and it is landed here, so these are expected to
  turn green at this tip.
- **1** — "one publish writing two notification-outbox rows", i.e.
  `SchedulePublishSqlServerTests.Publish_commits_publication_recipients_inbox_outbox_and_audit_atomically`.
  This is the **known red whose lane is gated on a ruling**, and it is expected to stay red.

`BASE-8e2b57de-sql-allfailing.trx` is the control the same README describes: the nineteen failing
classes re-run on the integration branch alone, **21 failed of 245, the same set test for test** —
which is how the estate established that those reds were not created by the merge.

Note this corrects an identification made earlier in this lane: `EventsOutboxDeliveryTests`
(the `DoesNotContain("250", …)` GUID-alias flake) is a *fast*-tier flake and is not "the outbox
count". The outbox count is the SQL-tier publish test named above.

### The baseline decomposed, so the comparison is set-for-set and not count-for-count

Read directly out of `artifacts/tests/24cd4ead-sql-tier.trx` (587 results; names in
`baseline-24cd4ead-sql-failures.txt` beside this file), the 22 baseline reds are:

| class | count | cause |
|---|---|---|
| 15 × `*MigrationLineageTests` (Workforce W2/W3/W4 + base, Meals W1/W2/W3, Events + W2/W3, Training W1/W3, Margin W1, Growth, GrowthDispatch) | 15 | each is an `Assert.False(HasPendingModelChanges())` — red because `GrowthAuditEvents` was in `OnModelCreating` with no migration |
| `GrowthDispatchRetryStrategySqlServerTests` | 2 | `GrowthAuditEvents` absent on a chain-built database |
| `GrowthDispatchLinearizationSqlServerTests` | 2 | as above |
| `GrowthProviderClientKeyIdempotencyTests` | 2 | as above |
| `SchedulePublishSqlServerTests` | 1 | **the outbox count** — one publish writes two rows |

**21 of the 22 are MIG-29's**, and MIG-29 is landed here. So the falsifiable expectation for this
tip was: **587 total, exactly 1 failed, that one being the outbox count** — set out before the run
finished rather than fitted to it afterwards.

The **total** at this tip is expected to exceed the baseline's 587, because the landing adds SQL
classes of its own — `Growth/GrowthAuditLedgerAppendOnlySqlServerTests.cs` (new, growthaudit),
`Modules/DatabaseTriggerDeclarationSqlServerTests.cs` (new, trigger lane) and a changed
`Growth/GrowthDispatchMigrationLineageTests.cs`. That is why the comparison above is stated as a
*set* of failing tests rather than as a count.

### Result at the tip — `Failed: 1, Passed: 694, Skipped: 0, Total: 695`, 30 m 3 s

The prediction held exactly, and the comparison was made **set for set**, not by count
(`sql-tier.txt` beside this file; baseline names in `baseline-24cd4ead-sql-failures.txt`):

| | count |
|---|---|
| baseline reds at `24cd4ead` | 22 |
| of those, **green at this tip** | **21** |
| **new reds introduced by this landing** | **0** |
| still red | 1 |

The 21 that turned green are the 15 `Has_no_pending_model_changes_after_the_*_wave` lineage
assertions plus the 6 Growth dispatch/idempotency tests — every one of them MIG-29's, exactly as
the baseline receipt attributed them.

**The one still red is the known one**, unchanged and not this landing's:

    WebApi.Tests.Workforce.SchedulePublishSqlServerTests
        .Publish_commits_publication_recipients_inbox_outbox_and_audit_atomically
    Assert.Equal() Failure — Expected: 1, Actual: 2      (SchedulePublishSqlServerTests.cs:60)

Line 60 is `Assert.Equal(1, await read.WorkforceNotificationOutbox.CountAsync(...))` — literally
"one publish writing two notification-outbox rows", which is how `artifacts/tests/README.md`
described it at the baseline. Its lane is gated on a ruling and it was not touched here.

**Why this run is the strongest evidence in this lane.** All fifteen
`Assert.False(HasPendingModelChanges())` assertions pass on a **chain-built** database. That is the
independent proof that the thirty-third trigger declaration added in §7 put the chain into **no
migration debt** — a claim the fast tier can only make about two design-time models, and which C2
requires be true of the chain rather than of the model.

Total is 695 against the baseline's 587; the +108 is the landing's own new SQL classes
(`DatabaseTriggerDeclarationSqlServerTests`, `GrowthAuditLedgerAppendOnlySqlServerTests` and the
changed `GrowthDispatchMigrationLineageTests`), which is why the count alone would not have been a
comparison.

### Final tip checks

- Credit-sale invariant re-run at the **final** tip `c64d07437` (not only at `726906fe5`):
  `git grep -lE 'bool +IsCreditSale *\('` names exactly `Services/Kassa/KassaCreditSale.cs`. **Holds.**
- Duplicate migration ids at the tip: **0**. Chain tip `20260806125642_Growth_AuditLedger`.
- `artifacts/journeys/ev-dietary/run-sheet.{json,md}` were dirtied a second time by the SQL tier
  and reverted again; the committed tree carries no run-sheet churn.
- Containers capped by this lane, all by session id `c2753495-…` and all reaped by Testcontainers
  at the end (`docker ps -a` for that label returns **0**): `a60adac1e57a`, `a7ba1edee004`,
  `ab0264a1b39f`, `625c119420e8`, `689fe44d3fc4`, `b54d9d15e2e7`. The owner's `okam-lwtwo-sql` and
  `okam-lwtwo-redis` were still up and untouched afterwards, and his API still held :5971.
