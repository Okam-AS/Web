# Backend suite run — `50b85657a103d5a159a3d7458c6b5e473fd50766`

**Both tiers, at one SHA**, and the first SHA at which MIG-23's frozen-week trigger, its `date` column
and its unfiltered-by-design read index exist on a chain-built database. This supersedes the
`13217cfd` receipt, whose SQL tier was **unrunnable** — the Docker VM's filesystem had gone read-only
under host disk exhaustion. The owner authorised a recovery, an infrastructure agent carried it out, and
this is the same work measured on a healthy host.

## Provenance

| | |
| --- | --- |
| SHA | `50b85657a103d5a159a3d7458c6b5e473fd50766` |
| branch | `lane/margin-waste`, off the real chain tip `3993f797` — **not** reachable from `feature/restaurant-modules` |
| chain tip re-checked | before applying anything: `lane/margin-waste` is the ONLY branch carrying a 2026-08-01 migration; `20260801113131_Training_W3_ChecklistsAndDeviations` is still my Designer's parent, and the two earlier August migrations still sit on detached heads (`4231715a`, `47be7e77`) |
| ran at | SQL 18:57:48 → 19:32:22 +0200; fast 19:32:56 → 19:38:43 +0200 |
| working tree | clean detached `git worktree` (`wt-wasterun`); `git status --short` EMPTY at build time and at BOTH run starts — asserted before each run, never after |
| SDK | 8.0.110 (pinned by `global.json`) |
| host | macOS 26.5, Darwin 25.5.0; 88 GiB free at the SQL start, load ~6.8 |
| artifacts | `../50b85657-sql-tier.trx`, `../50b85657-fast-tier.trx` |

## Command

```sh
git worktree add --detach ../wt-wasterun 50b85657
dotnet build WebApi.Tests/WebApi.Tests.csproj -c Debug          # 0 errors
dotnet test  WebApi.Tests/WebApi.Tests.csproj --no-build -c Debug \
  --filter "Database=SqlServer"  --logger "trx;LogFileName=50b85657-sql-tier.trx"
dotnet test  WebApi.Tests/WebApi.Tests.csproj --no-build -c Debug \
  --filter "Database!=SqlServer" --logger "trx;LogFileName=50b85657-fast-tier.trx"
```

On the `--no-build` trap in `CLAUDE.md`: the worktree was created fresh and built from nothing — there was
no previous assembly to measure. Nothing was restored with `mv`. `bin/` and `obj/` were deleted immediately
after the runs rather than left behind, on the disk-pressure guidance.

## Result — SQL tier

```
total="568" executed="568" passed="568" failed="0" error="0" timeout="0" aborted="0"
```

Duration 34 m 19 s, process exit code `0`. **Zero failures and zero skips.**

## Result — fast tier

```
total="4351" executed="4342" passed="4342" failed="0" error="0" timeout="0" aborted="0"
```

Duration 5 m 45 s, process exit code `0`.

## Against the baseline

Diffed **set-against-set on test names between the `.trx` files**, never inferred from counts. Every
outcome in the SQL `.trx` was read individually and all 568 are `Passed` — not inferred from the summary.

| tier | `1da15fb1` | here | delta |
| --- | --- | --- | --- |
| SQL, executed | 557 | 568 | **+11** |
| SQL, failed | 0 | 0 | — |
| fast, passed | 4313 | 4342 | +29 |
| fast, failed | 0 | 0 | — |
| fast, skipped | 9 | 9 | — |

**SQL tier: 11 added, 0 removed** — the whole of `MarginWasteFrozenWeekSqlServerTests`, and nothing
displaced. **Fast tier: 29 added, 0 removed** — 26 in `MarginWasteTests`, 3 waste pins in
`MarginTenantIsolationSweepTests`.

**A correction to my own earlier reporting:** the `13217cfd` receipt and the first RETURN said *ten* trigger
tests were owed. There are **eleven** — I miscounted the class, which also carries the error-334 regression
on the ordinary write path. The number is now read from the `.trx`, not from memory.

## What this run proves about MIG-23, and how

Both guards are **falsified, not merely asserted**, and every refusal is **pinned by error NUMBER** — the
only assertion a constraint cannot satisfy, since everything SQL Server raises ahead of an AFTER trigger is
below 50000. `TriggerRefusalAttributionTests` mechanically enforces that on this file.

- **`Dropping_the_trigger_lets_the_frozen_week_be_rewritten`** drops `TR_MarginWasteEntries_FrozenWeekImmutable`
  on the harness's own throwaway catalog, repeats the identical INSERT, and watches it be **ACCEPTED**, then
  re-creates the trigger and watches the refusal return. That is the only evidence the refusals below
  measure this trigger rather than something else in its way.
- **THROW 50062** on a raw INSERT, UPDATE, DELETE and cross-week move into a frozen week — each paired with a
  **control** performing the identical statement against an OPEN-week row, asserted to SUCCEED. A constraint
  standing in for the trigger would refuse both halves.
- **The DELETE proof asserts from `sys.foreign_keys` that NOTHING references the table** before issuing it.
  SQL Server evaluates FK constraints before an AFTER trigger, so a refusal by a reference check would
  certify the foreign key and pass identically with the trigger dropped.
- **`A_raw_insert_on_the_frozen_weeks_LAST_DAY_throws_50062`** is the boundary the `date` column type exists
  for. Against `datetime2` a row stamped 12:00 on the period's last day is greater than a `PeriodEnd` of
  midnight, so the final day of every frozen week would stay silently writable while the trigger still read
  present and enabled. The type is additionally asserted from `sys.types` here and in the round trip.
- **The read index is asserted `is_unique = 0`** — the mirror image of how this estate asserts a uniqueness
  guard. A kitchen throws out tomatoes twice on a Tuesday, so uniqueness here would be a silent
  de-duplicator of real losses.
- **Error 334 did not bite.** `MarginWasteEntries` carries a rowversion AND a trigger, so a bare
  `OUTPUT INSERTED` would be illegal; `The_ordinary_waste_write_path_still_works_with_the_trigger_installed`
  drives a real create → update → delete through the service and passes, which is what proves the model's
  `HasTrigger` declaration is doing its job. Without it every waste write would fail on SQL Server while the
  whole SQLite suite stayed green.
- **`RestaurantModulesMigrationRoundTripTests`** applies the chain into an EMPTY catalog, rolls it back and
  re-applies it, asserting the waste trigger present → gone → present and `WasteDate`'s `date` type in all
  three phases. That is the assertion a forked Designer parent breaks.
- **Both exact-full-Margin-set assertions** (`MarginW2`/`MarginW3MigrationLineageTests`) now carry
  `MarginWasteEntries`. The W2 one is what the first SQL run caught and the fast tier cannot see.

## Containers

One SQL Server container at a time, created by this run and reaped by its own Ryuk
(`zealous_roentgen`). At the end of the run a container named **`amazing_banzai`** was present and was
**left alone** — it is not this lane's and was attributed by name, not by count.

## What this run does NOT cover

- **MIG-23 is applied to no database by this lane.** Deployment is the owner's, as everywhere in
  `docs/plans/PENDING-MIGRATIONS-LEDGER.md`. Every proof here is against throwaway Testcontainers catalogs
  and a `RoundTrip_*` scratch database dropped in the test's `finally`.
- **The §2 spec departure is unratified.** `50-food-margin-spec.md` defers "Reason-coded waste events" to
  M3; a narrow slice landed early and the spec records exactly what did and did not. That is Sven's call.
- **Nobody has walked the UI.** A green suite is evidence that code behaves. It is not reachability and it
  is never acceptance. See `../README.md`.
- The `artifacts/journeys/ev-dietary/run-sheet.json` rewrite-on-run is still present — the same finding the
  `23f6bbeb`, `1da15fb1` and `13217cfd` receipts recorded. Reverted before the run, not committed.
