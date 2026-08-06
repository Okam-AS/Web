# L-MRG-STARTER-150 — evidence

Lane worktree: `/Users/svendaneel/okam/wt-mrg150` (branch `lane/mrg-starter-150`, off `feature/restaurant-modules`
at 24dec838). The brief's `workdir: ../OkamAPI-modules` already has `feature/restaurant-modules` checked out and
`L-MRG-WASTE` is running in it, so a second worktree on a lane branch was the only way to honour "your own
worktree" and to keep two concurrent `dotnet test` runs out of one `obj/`.

## What is pinned, and why each pin is not a change detector

Nothing enumerates a curated name, unit or factor. Every assertion is derived from
`MarginStarterLibrary.Candidates` and from the product's own converter, so all of it covers the ~150 rows that
do not exist yet.

| Pin | Mutation applied to PRODUCTION source | Red message captured |
| --- | --- | --- |
| `No_curated_conversion_contradicts_the_universal_unit_family` | `Hvetemel` `("kg", 1000m)` → `("kg", 100m)` | `red-1-family-contradiction.txt` |
| `No_curated_conversion_smuggles_in_a_density_or_a_count_assumption` | `Salt` gains `("l", 1000m)` on a Gram base | `red-2-cross-family-density.txt` |
| `The_library_never_offers_one_name_twice` | `Sukker` renamed `HVETEMEL` | `red-3-duplicate-name.txt` |
| `A_candidate_carries_no_money` | `long SuggestedPriceOre` added to `MarginStarterIngredientCandidate` | `red-4-money-on-candidate.txt` |
| `Every_candidate_copies_…_intact` (refusal half) | `Smør` `("pakke", 250m)` → `("pakke", 0m)` | `red-5-uncopyable-candidate.txt` |
| `Every_candidate_copies_…_intact` (round-trip half) | `MarginIngredientService.CreateAsync` writes `input.FactorToBase * 2m` | `red-6-copy-mangles-factor.txt` |
| `Copying_the_same_candidate_twice_…` | `EnsureNameUniqueAsync` clash check short-circuited to `false &&` | `red-7-double-copy-allowed.txt` |
| `List_of_an_empty_store_returns_all_starter_candidates` (strengthened) | candidate filter gains `.Take(5)` | `red-8-read-truncates-library.txt` |

Every restore is `git checkout --` + `touch` + a real rebuild, never `mv` of a backup — the mtime trap in
`CLAUDE.md` (Commands → Tests) defeats exactly this procedure.

## Why a curated conversion is a money fact

`MarginRecipeSupport.TryConvertToBaseUnit` (Services/Margin/MarginRecipeSupport.cs:89-110) resolves the
ingredient's OWN conversions **before** the universal metric family. The current sixteen already declare
factors that shadow the family — `kg = 1000` on Gram bases, `l = 1000` on Millilitre bases — and they happen
to agree. Nothing enforced that agreement. A curated `kg = 100 g` would cost every plate that buys flour by
the kilo at a tenth: no unpriced line, no refusal, no operator-visible symptom, just a wrong food-cost figure.

## Suites (evidence that code behaves, never that a capability exists — C5)

- Margin fast tier: 450 passed / 0 failed / 0 skipped.
- Whole fast tier (`--filter Database!=SqlServer`): 4357 passed / 0 failed / 12 skipped, 4 m 55 s.
- No SQL tier run. No container started or touched — this lane holds no sql slot.

## Finding recorded, NOT fixed: a duplicate-name create loses the race into a 500

`red-7-double-copy-allowed.txt` shows what happens when the app-layer pre-check does not see the row: the DB
unique index fires and `Microsoft.EntityFrameworkCore.DbUpdateException` escapes uncaught
(`SQLite Error 19: UNIQUE constraint failed: MarginIngredients.StoreId, MarginIngredients.Name`).
`MarginIngredientsController.Create` catches only `MarginProblemException` and `AppException`, so a real race
returns 500 rather than the 400 the sequential case returns.

The module already has the pattern — `MarginRecipeService.cs:400,595`, `MarginProductLinkService.cs:189` and
`MarginStatementService.cs:222` all use `catch (DbUpdateException ex) when (MarginRecipeSupport.IsUniqueViolation(ex))`.
`MarginIngredientService.CreateAsync` does not. Its own comment calls the index "the backstop for a race",
which is true of the database and false of the code: the backstop backstops into a 500.

Not fixed here, deliberately. The gap is only reachable when the pre-check misses, which needs either a true
concurrent race or SQL Server's trailing-space-insensitive collation. The SQLite harness shares ONE
`SqliteConnection` across contexts (`MarginBHarness.NewContext`), so a concurrent `SaveChanges` proves nothing
about the mapping, and this lane holds no SQL slot. Shipping a fix I cannot drive red-then-green is the thing
the estate's laws exist to prevent. Severity is tempered by both chip surfaces being `:disabled="busy"`
during the write, so a same-tab double click is already guarded; two tabs or two devices are not.

---

# Pass 2 (brief f49872a0) — D-MRG-CURATION ruled `author-the-list`

Lane worktree: `/Users/svendaneel/okam/wt-mrg150b` (branch `lane/mrg-starter-150b`, off
`feature/restaurant-modules` at **3579bbbc**). NOT merged — left on the lane branch for a dispatched
review, per the estate's review protocol. Commit **9a00da6e**, local, not pushed.
`../OkamAPI-modules` is on `lane/meals-grace-pins` and hosts a live WebApi process, so it was never
a candidate for this work.

## The sixteen, verified before anything was built

| Property | Result |
| --- | --- |
| Count | **16**, matching the brief. |
| Units | **16/16 complete.** All were C# enum members, so a missing one was not representable. |
| Conversions | 16/16 present and self-consistent; the pack arithmetic checks out by hand (kartong 6 × 2,5 kg = 15000 g, brett = 30 stk, and so on). |
| Yields | **0/16.** No candidate carries one, and no ingredient CAN: `MarginIngredient` has no yield column. |

**Would the sixteen pass the pins written here? Yes — count, units and conversions all pass.** The
yield pins pass only because a blank yield is legal. That is the finding, not a clean bill: the
ruling has Sven authoring yields, and there is nowhere for a yield to land.

## Where a yield stops (C3)

`YieldFactor` exists in this product on ONE thing: `MarginRecipeComponent` — optional, in (0,1], per
recipe line, consumed at `MarginRecipeCostCalculator.cs:280`. So:

- an ingredient has no yield of its own (`Entities/Margin/MarginIngredient.cs` — Name, BaseUnit,
  Notes, Status, ConcurrencyVersion, CreatedAtUtc, and nothing else), therefore a curated yield
  cannot follow the ingredient into the recipes that use it;
- the admin recipe editor has no control for one either — `yieldFactor` appears **nowhere** in the
  frontend (`pages/`, `components/`, `utils/`, `test/`), so today every recipe line is costed at no
  loss whatever the curation says.

Yields are therefore CAPTURED AND VALIDATED, not costed, and the curation file says so to the author
in the column notes and again at its tail. Making them count needs a default yield stored on the
ingredient (a migration — another lane holds the author slot) plus a recipe-line control that
pre-fills from it.

## Red-then-green, mutating the AUTHORED FILE every time

| Mutation | Pin that redded | Captured |
| --- | --- | --- |
| `Revet ost` line deleted | `The_library_serves_every_row_the_curation_declares` — "declares 'rows: 16' but 15 ingredient lines survived" | `red-9-short-list.txt` |
| `Salt` base unit blanked | refusal pin + count pin, "line 86: 'Salt' declares no base unit" | `red-10-missing-unit.txt` |
| `Salt` yield set to `1,4` | refusal pin + count pin, "outside (0,1] … a dot is a thousands separator in this file, so 0.88 reads as 88" | `red-11-unconvertible-yield.txt` |
| `Salt` given a VALID yield `0,88` | `The_library_carries_every_yield_the_curation_declares` — "declares 'yields: 0' but 1 of its 16 rows carry one" | `red-12-undeclared-yield.txt` |

Restores are `cp` of a byte-identical original + `touch` + a real rebuild, and the assembly mtime was
checked against the source after each one (CLAUDE.md's stale-build trap defeats exactly this loop).

## Suites (container-free tier only; no container started or touched)

- Base 3579bbbc, clean checkout: Margin fast tier **461 / 0 / 0**.
- After: Margin fast tier **470 / 0 / 0** (nine new pins).
- Whole fast tier `--filter Database!=SqlServer`: **4378 passed / 0 failed / 12 skipped**, 5 m 09 s.
- `artifacts/journeys/ev-dietary/{run-sheet.json,run-sheet.md}` were dirtied by the tier and restored.

## Second finding, recorded not fixed

`MarginIngredientService.ListAsync:54` hands the caller the **shared static candidate instances**,
whose `SuggestedConversions` list is mutable. Nothing mutates them today (MVC only serializes), so
this is latent rather than live — but a single caller that did would corrupt the library
process-wide for every venue until restart. `MarginStarterRow.ToCandidate()` now builds fresh
conversion inputs, so the fix is one projection away; it is not this lane's to make.
