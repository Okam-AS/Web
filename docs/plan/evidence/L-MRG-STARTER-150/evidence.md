# L-MRG-STARTER-150 — the starter library serves the ruled curation

Branch `lane/mrg-starter-150`, cut from the integration tip **8e2b57de**. Everything below was read at
that ref (`git show 8e2b57de:<path>`), never from a working directory on another lane's branch.

## What landed

Two commits:

| sha | what |
| --- | --- |
| `17590c2a` | cherry-pick of `9a00da6e` from `lane/mrg-starter-150b` — the mechanism (CSV-as-library, parser, counters, pins). Applied **clean** onto 8e2b57de; its parent `3579bbbc` is an ancestor of the tip, so the lane was one commit behind, not divergent. |
| `2b2b562f` | the curation itself: 16 rows → **150**, plus one new pin. |

The mechanism commit was not previously on the integration tip — `git ls-tree 8e2b57de` carried the old
C# collection-initializer `MarginStarterLibrary.cs`, and no `margin-starter-ingredients.csv` at all. So
the fill is paired with the landing, as the review directed.

## The curation

150 rows in `Services/Margin/margin-starter-ingredients.csv`, grouped by section with ordinary comment
lines (the parser skips them; only `# rows:` / `# yields:` are read).

- base units: **123 g · 16 ml · 11 stk**
- the original sixteen are all present with **values untouched** (name, base unit, packs, notes); only
  their position changed, because the list is now ordered as a kitchen reads it rather than as it was
  first typed
- counters set to `rows: 150`, `yields: 0`

Sections: tørrvarer (mel/gryn/pasta/ris) · meieri og egg · kjøtt og fjørfe · fisk og skalldyr ·
grønnsaker, potet og frukt · frosne og hermetiske · olje, eddik, saus og søtt · buljong, krydder og
urter · nøtter, sjokolade og baking · kaffe, te og juice.

## The yield column is empty, deliberately

Every one of the 150 rows leaves `yield` blank and `yields: 0` declares it. This is not an omission:

`F-MRG-YIELD-NOWHERE` is open and it is load-bearing here. A yield fraction exists in this product on
exactly one thing — `MarginRecipeComponent.YieldFactor`, one line of one recipe. **An ingredient has no
yield of its own**, so a fraction curated here cannot follow the ingredient into the recipes that use
it, and the admin recipe editor has no control for one. Today every recipe line is costed at no loss
whatever this column says. 150 authored yields would validate and cost nothing; 150 ones would be worse,
because `1` asserts "nothing is lost" about 150 ingredients nobody has ruled on, and blank means nobody
has ruled — which is the true answer.

The file's tail now names what would make filling it worth an evening, **in order**: (1) a default yield
stored ON the ingredient — a migration; (2) a recipe-line control that pre-fills from it; (3) only then
the numbers, which want a cook and are per-venue more often than not.

## What the pins hold

The mechanism's pins already covered units and conversions; one gap was left and is now closed.

| pin | holds |
| --- | --- |
| `The_curation_parses_without_a_single_refusal` | no row is dropped — a refused line is never served, so a shipped file cannot be quietly shorter than the author believes |
| `The_library_serves_every_row_the_curation_declares` | parsed rows == `rows:` == candidates served |
| `The_library_carries_every_yield_the_curation_declares` | yields carried == `yields:` (catches a column that arrived empty) |
| **`The_read_serves_the_ruled_curation_rather_than_a_sample`** (new) | served count >= **150**, the size the decision was ruled at |
| `No_curated_conversion_contradicts_the_universal_unit_family` | every factor for a unit the converter knows agrees with it — a curated row is resolved BEFORE the family, so it *is* the costing answer |
| `No_curated_conversion_smuggles_in_a_density_or_a_count_assumption` | no pack unit crosses mass/volume/count |
| `Every_candidate_copies_into_a_store_with_its_unit_and_conversions_intact` | all 150 survive a real create through the endpoint with units and factors intact |
| `Every_base_unit_the_product_measures_in_can_be_authored_and_costed` | the file's unit vocabulary and the converter's do not drift apart |
| `A_candidate_carries_no_money` | asserted over the shape — the library ships no price |

### Why the new pin is not redundant with the counters, proved by mutation

The counters hold the file to a number **the file itself declares**, so deleting rows and lowering
`rows:` with them stays green. That is exactly how a library returns to a sample without anybody
deciding to.

Mutation: the CSV cut to its first 20 rows **with `rows:` lowered to 20 to match** — a self-consistent
shrink.

```
[FAIL] MarginStarterLibraryTests.The_read_serves_the_ruled_curation_rather_than_a_sample
Failed!  - Failed: 1, Passed: 15, Total: 16
```

The new pin was the **only** failure; all three counter pins stayed green, confirming the gap it closes.
File restored from `2b2b562f` (`git checkout --` + `touch`, so MSBuild recompiles rather than measuring
a stale assembly), re-run green.

## Suite

```
dotnet test --filter "FullyQualifiedName~MarginStarterLibraryTests|FullyQualifiedName~MarginIngredientContractTests"
Passed!  - Failed: 0, Passed: 31, Skipped: 0, Total: 31
```

`artifacts/tests/starter-150-green.trx`. Both classes run on the SQLite harness
(`MarginBHarness.CreateSqliteAsync`) — no container.

Baseline before the edit was 15/15 on `MarginStarterLibraryTests` at `17590c2a`.

## Two things found, neither mine to fix

**1. An inherited red at the tip, on the SQL tier.**
`MarginW1MigrationLineageTests.Has_no_pending_model_changes_after_the_margin_wave` fails —
`ctx.Database.HasPendingModelChanges()` returns true. This is C2-shaped drift (the model claims
something the chain does not create) and it is **out of this diff's reach**: the whole diff is
`MarginCsvParser.cs`, `MarginStarterLibrary.cs`, the CSV, `WebApi.csproj` and two test files — no
entity, no `OnModelCreating`, no migration. Nothing in `docs/plan` records it.

**I could not confirm it is pre-existing by measurement.** That would mean running the same
SQL-Server-fixture class at `8e2b57de`, and this lane has no SQL container slot. It is stated as a
reading of the diff surface, not as a measured base-vs-lane comparison.

**Disclosure: this lane consumed a SQL container slot it was not granted.** The first run used the
filter `FullyQualifiedName~WebApi.Tests.Margin`, which swept `MarginSqlServerFixture` classes and
started two Testcontainers containers (`ea71379f209a`, `666db3e10dd1`) for ~5 minutes. Testcontainers
created and removed them; **no container this lane did not create was touched**. Every subsequent run
was filtered to the two SQLite classes. Recorded rather than omitted because a slot cap exists to stop
exactly this.

**2. 150 chips render inline, unfiltered, above the create form.**
`Web-modules/components/admin/margin/MarginIngredientPanel.vue:40-53` renders
`v-for="candidate in starterCandidates"` as a flat chip list with no search, no grouping and no cap.
At 16 that is a helpful row; at 150 it is a wall between an empty store and the manual create form
below it, and the file's category grouping does not survive the wire (the API returns a flat list with
no section field). The read is otherwise reachable and correct — this is presentation, in a different
repo and outside this lane's workdir, so it is named rather than changed.

## Constraints

- **C1** — no append-only table touched; no UPDATE/DELETE anywhere in the diff.
- **C2** — no migration, no `OnModelCreating` change, no index or constraint added. (See finding 1: an
  inherited pending-model-changes red, not introduced here.)
- **C3** — no new capability. `GET margin/ingredients` already serves `StarterCandidates` and the admin
  panel already renders them; this changes the data the existing wire carries, so there is no new
  service, route or navigation entry to land.
- **C4** — no money-path write. The library carries no price at all, and `A_candidate_carries_no_money`
  pins that over the type shape rather than over the instances.
- **C6** — no statutory claim added; the file names no forskrift or §.
- **C7** — no log or telemetry call added anywhere in the diff.
