# L-A-VENUE-THAT-SETS-MARGIN-UP-TODAY-SEES-A-REAL-NUMBER-TODAY — lane detail

branch `lane/margin-setup-day`, cut from `feature/restaurant-modules` @ `a14084874` (read fresh at dispatch;
the same sha the clerk named). Worktree `/Users/svendaneel/okam/wt-mrgsetupday`. Not pushed.

## Which of the three fixes, and what it costs

The flag names three, and they are three different products:

1. **Backdate the link from the UI.** Rejected. It reaches one of the three consequences and the operator's
   own screen cannot perform it — the DTO carries `effectiveFrom`, the UI deliberately never sends it. Recipe
   versions cannot be backdated over HTTP at all (an Active version cannot be re-activated, a draft cannot be
   backdated under the incumbent), so the leg that costs the sale would still be missing. It also falsifies
   *when* a link became effective, which is the one thing an effective-dated row exists to state.
2. **Compare against the sale's own instant.** The answer that matches what the figures mean, and it is not
   available. `MarginSalesFact` carries `BusinessDate` and `CreatedAtUtc` (the projection time) — no sale
   clock time. The `JournalEntry.Timestamp` that has one is behind the §7 seam, which the projector is the
   only thing permitted to cross. Reaching it would need a new fact column plus a value for every fact
   already written — and `MarginSalesFacts` is append-only in three layers (`GuardAppendOnly`, the SQL
   Server trigger `TR_MarginSalesFacts_AppendOnly` THROW 50060, and C1), so historical facts could never
   carry it. Blocked on data, not on taste.
3. **Resolve at the end of the business day.** Shipped.

**What it costs.** Within a business day, effective-dating now has no resolution: the day is costed at the
state its surfaces ended it in, so a link or version created at 18:00 also costs that morning's sales, and a
link retired at 14:00 costs none of the day it left. That is the honest statement of day-granular facts, and
it errs toward reporting a real cost rather than a fabricated zero.

**What depends on the current behaviour.** Checked before assuming safe:
- **Finalized statements cannot move.** They are frozen — the row's columns plus `InputReceiptJson` — and
  `GetAsync` returns the stored figures verbatim without re-resolving (`MarginStatementService` class doc,
  `MarginStatementFreezeTests`). Nothing recomputes what a past statement said. C1 holds; no row repaired.
- **Open statements do change**, and only in the direction the flag describes. Every effective-dating
  boundary in `MarginWorld` is 2026-06-01 or 2026-07-01, both strictly before the golden business date
  2026-07-06, so no golden arithmetic moves — pinned by
  `A_store_whose_setup_predates_the_week_recomputes_to_the_same_figures` and by the 4757/0/10 tier.
- **`MarginCoverageService`** shares the analyzer and therefore also changes — intended: the flag's own
  0 % → 93,41 % measurement is a coverage number.
- **`MarginMenuMarginService`** resolves at a real instant (`now`) and is untouched.
- **Rejected: `min(endOfDay, now)`.** It would stop a link forward-dated to later today costing this
  morning, but it makes a recalculation at 11:00 and one at 17:00 produce different figures from identical
  facts, and `ComputeSalesFiguresAsync` is documented as a pure function of the facts plus the surfaces.

## The change

- `Services/Margin/MarginEffectiveDating.cs` — new `ResolutionInstantOf(businessDate)`, the one statement of
  the rule: `businessDate.Date.AddDays(1).AddTicks(-1)`. The last **tick**, not `AddDays(1)`: both ranges are
  half-open and `EffectiveFrom <= instant` would otherwise hand a day to a link that only starts the next
  one. Exact on `datetime2` (100 ns, confirmed in the snapshot — `MarginRecipeProductLink.EffectiveFrom` and
  `EffectiveTo` are `datetime2` with no narrowed precision) and on EF's SQLite text mapping (7 fractional
  digits). A column narrowed below tick precision would round the parameter up to the next midnight; the
  boundary case in `A_business_dates_resolution_instant_ends_its_day_and_does_not_reach_the_next_one` is
  what catches that.
- `Services/Margin/MarginStatementSupport.cs:126` — the period roll-up resolves links at the resolution
  instant.
- `Services/Margin/MarginStatementService.cs:~500` — `ResolveVersionCostAsync` resolves the recipe version
  **and** hands the same instant to the cost preview, so component prices and the sub-recipe's own active
  version resolve there too. `ToInstant` no longer re-truncates with `.Date`, which would have put the day's
  midnight back one layer down.
- `Services/Margin/MarginStatementService.cs:~477` — the honesty rule, below.

No migration. No schema change. No append-only row touched.

## Withhold rather than zero

The standing ruling applies to a residue the instant fix does not reach. `complete` started `true` and was
only degraded *inside* the loop over covered facts, so a period with **zero** covered facts skipped the loop
entirely and published `TheoreticalIngredientCostMinor = 0`, `TheoreticalFoodCostPercent = 0,00`, and
`TheoreticalCostComplete = **true**`. That is the ruling's purest violation: a figure nothing established,
asserted as complete, beside a real actual spend. It is the day-one state of every store, and it survives
the resolution fix for a venue that simply has not linked anything yet.

`complete` is now false when the period has facts and none of them resolved to a recipe.

**Deliberately not extended to partial coverage.** MIG-11 (`docs/plans/PENDING-MIGRATIONS-LEDGER.md`, pinned
by `MarginTheoreticalCostLowerBoundTests`) keeps the amount non-nullable as a LOWER BOUND with
`TheoreticalCostComplete` carrying the partiality, and `MarginStatementLifecycleTests:328` records in so many
words that suppressing the percentage instead "would change the contract for EVERY cause of partiality, so it
is a ruling and not this lane's to make". Nulling the percentage would have redded
`MarginTheoreticalCostLowerBoundTests` (`Assert.NotNull(detail.TheoreticalFoodCostPercent)` on a zero bound)
and `MarginStatementLifecycleTests` (`Assert.Equal(0m, detail.TheoreticalFoodCostPercent)`). Marking a
*partially* covered week incomplete is the same contract change wearing a different hat — the golden world is
partially covered (`ExpectedUncoveredNetMinor = -10000`) and asserts complete in six places. **Open for @sven:
should coverage below 100 % make the theoretical cost incomplete?** It is a lower bound by the same argument.

## Evidence

Fast tier `dotnet test --filter "Database!=SqlServer"`: **4757 passed / 0 failed / 10 skipped**
(`.lane/fast-tier.txt`). Baseline at `a14084874` was 4752/0/10 — delta **+5**, exactly the five new Facts in
`WebApi.Tests/Margin/MarginSetupDayResolutionTests.cs`. No SQL container taken; no SQL tier run.

The five, by what each holds:
1. `A_venue_that_links_its_dishes_during_the_trading_day_is_costed_for_that_days_sales` — the exit criterion.
   The golden world with the link and both active recipe versions re-dated to 16:00 on the business date its
   own sales were rung up at 10:00. Theoretical percentage non-zero, and equal to the figure the same world
   produces when the setup predates the week (10860 øre) rather than merely non-zero.
2. `The_same_link_resolved_at_the_business_dates_midnight_covers_nothing` — the counterfactual over the
   production predicate on the same world: resolved at midnight the venue's link is not there.
3. `A_business_dates_resolution_instant_ends_its_day_and_does_not_reach_the_next_one` — the rule and both
   boundaries (next-midnight link excluded; mid-day-retired link excluded).
4. `A_week_that_resolved_none_of_its_sales_to_a_recipe_does_not_call_its_zero_complete` — the withhold rule,
   including that the CSV carries it.
5. `A_store_whose_setup_predates_the_week_recomputes_to_the_same_figures` — the regression control.

**Non-vacuity, by forced recompile** (edited in place, rebuilt, `0 Error(s)` each time — never restored by
`mv`, per the stale-`--no-build` trap in CLAUDE.md; both files diffed byte-identical against saved copies
afterwards):
- Mutation A — `ResolutionInstantOf` returns `businessDate.Date`: **3 failed / 2 passed** (tests 1, 2, 3).
- Mutation B — the `complete = false` guard disabled: **1 failed / 4 passed** (test 4).
- Unmutated: **0 failed / 5 passed**.
