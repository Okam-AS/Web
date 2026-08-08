# Backend suite run — lane L-MRG-WASTE-500 (unknown ingredient stops being a 500)

Two fast-tier runs, both in this receipt: the **base**, measured here rather than inherited from an
earlier lane's receipt, and the **after**, measured on the tree this commit carries.

## Provenance

| | |
| --- | --- |
| base SHA | `afcfddbc593918e8cd43c3bdb91293bc6f8f05ba` (`lane/margin-waste` tip) |
| after | the working tree that became **this commit**, whose only delta to the base is the five files it changes |
| branch | `lane/margin-waste-500`, branched at `afcfddbc` — `lane/margin-waste` is left where its own lane put it, in its own worktree |
| worktree | `wt-mrgwaste500`, this lane's own; the shared `OkamAPI-modules` checkout was never used |
| ran at | base 13:06 → 13:13 +0200; after 13:24 → 13:32 +0200, 2026-08-02 |
| working tree | `git status --short` empty at the base build; at the after build, only the five changed files |
| SDK | 8.0.110 (pinned by `global.json`) |
| host | macOS 26.5, Darwin 25.5.0; 180 GiB free |
| artifacts | `afcfddbc-base-fast.trx` (md5 `a275d2ebe8dad9c98944d7138a78174f`), `L-MRG-WASTE-500-fast.trx` (md5 `daad94fb09c4b8e9cc2e949c25bd5e3b`) |

## Command

```sh
dotnet build WebApi.Tests/WebApi.Tests.csproj -c Debug          # 0 errors
dotnet test  WebApi.Tests/WebApi.Tests.csproj --no-build -c Debug \
  --filter "Database!=SqlServer" --logger "trx;LogFileName=<name>.trx"
```

`Database!=SqlServer` is the trait filter, not the name filter. `FullyQualifiedName!~SqlServer` still
starts Testcontainers — the naming convention has failed twice, and `SqlServerContainerTraitTests` is the
guard that keeps the trait honest.

Every `--no-build` run above followed a build whose output assembly mtime had moved. No source was
restored with `mv`; the mutation restores below all used `cp` + `touch`, and the final restore was checked
by md5 against the pre-mutation copy (`5fbd8fb0e8f2befdaccfa0c243efb837`).

## Result

| tier | base `afcfddbc` | after | delta |
| --- | --- | --- | --- |
| fast (`Database!=SqlServer`) | 4342 passed / 0 failed / 9 skipped | 4348 passed / 0 failed / 9 skipped | **+6 passed, 0 removed, 0 regressed** |
| SQL (`Database=SqlServer`) | — | **NOT RUN** | no container slot was granted to this lane |

The delta is a **set-against-set diff of test names parsed out of the two `.trx` files**, not a
subtraction of the two totals, and each of the six added results was read individually as `Passed`:

```
+ MarginTenantIsolationSweepTests.A_store_cannot_record_waste_against_another_stores_ingredient
+ MarginWasteTests.An_ingredient_this_store_does_not_master_is_refused_with_a_code_not_a_save_failure
+ MarginWasteTests.Another_stores_ingredient_is_refused_identically_to_one_that_does_not_exist
+ MarginWasteTests.An_edit_cannot_move_an_entry_onto_an_ingredient_the_store_does_not_master
+ MarginWasteTests.A_frozen_week_answers_frozen_even_when_the_ingredient_is_also_unknown
+ MarginWasteTests.An_archived_ingredient_still_takes_a_loss
```

## The finding, verified by injection rather than by reading

A throwaway probe was run against the **unmodified** base binary — at the service, and again through
`MarginWasteController.Create` itself — and then deleted:

```
PROBE-SERVICE-TYPE:          Microsoft.EntityFrameworkCore.DbUpdateException
PROBE-SERVICE-INNER:         Microsoft.Data.Sqlite.SqliteException
PROBE-SERVICE-INNER-MESSAGE: SQLite Error 19: 'FOREIGN KEY constraint failed'.
PROBE-CONTROLLER-TYPE:       Microsoft.EntityFrameworkCore.DbUpdateException
PROBE-ROWCOUNT:              0
```

`PROBE-CONTROLLER-TYPE` is the finding: the exception was caught coming **out of the controller action**,
so it is neither of the two types that action catches (`MarginProblemException`, `AppException`) and it
reaches the logging middleware as an unhandled 500. `PROBE-ROWCOUNT: 0` is the other half — isolation
itself held, nothing was written and nothing leaked. The defect was the failure *shape*, exactly as the
review said.

## Mutation checks — five, each restored and rebuilt

| mutation | expected red | observed |
| --- | --- | --- |
| M1 drop the guard from `CreateAsync` | the three create pins | 3 failed, 62 passed |
| M2 drop the guard from `UpdateAsync` | the edit pin only | 1 failed, 64 passed |
| M3 drop `i.StoreId == storeId` from the lookup | the two **cross-tenant** pins only | 2 failed, 63 passed |
| M4 run the new refusal **before** the frozen-week refusal | the freeze-precedence pin only | 1 failed, 64 passed |
| M5 narrow the lookup to `Status == Active` | the archived-ingredient pin only | 1 failed, 64 passed |

**M3 is the one that matters.** A cross-tenant test that never crosses a tenant proves nothing, and the
cheap version of this pin — a `Guid.NewGuid()` that belongs to nobody — stays green under M3. Both
cross-tenant pins seed the second store's ingredient for real and both go red the moment the store
predicate leaves the lookup.

## What is NOT proven here

- **The SQL Server tier has not run on this tree.** No container slot was granted; two SQL containers were
  up throughout (`okam-lws-sql`, `okam-lws-staff-sql` — live worlds left standing for a human walk), plus
  a foreign `musing_sinoussi`/ryuk pair and `zen_pasteur`. None was touched, started or stopped.
- Specifically unproven at layer 2: that the same create answers the same coded 400 against the composite
  foreign key **SQL Server** actually enforces (error 547, not SQLite's 19), and that MIG-23's frozen-week
  trigger still wins over the new refusal on a chain-built database. The precedence itself is pinned at
  layer 1 (M4), and the change adds no DDL, no migration and no trigger, so nothing about the freeze's
  three layers moved.
- Nothing here is acceptance (C5). A green suite is evidence that code behaves, never that a capability
  exists — and the admin client still renders this family of refusals generically, which is a sibling
  lane's half.
