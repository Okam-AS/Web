# Fable review — Margin (L-MRG-REVIEW, 2026-08-01)

Read-only review. No file was edited. Frontend `feature/restaurant-modules` @ `7b99f2a`; backend read via
`git show` from `feature/restaurant-modules` without switching off `lane/meals-grace-pins`.

## Two claims in the clerk's brief are wrong, and one is half-wrong

1. **The correction path exists and is fully wired, browser to database.** No database client is needed.
   `pages/admin/margin-statements.vue:155-169` renders a "correct" button on the latest finalized revision;
   `Services/Margin/MarginStatementService.cs:173-208` opens `RevisionNumber + 1` as a new Open statement with
   spend re-enterable and recompute + re-finalize wired. Proven at API level in `MarginJourneyE2ETests`
   MJ-E2E-09 and on real SQL Server in MJ-E2E-11.
2. **The half-wrong part is the price feeding that correction.** The revision recomputes each business day at
   that day's midnight against the price effective then. Prices are supersede-forward only —
   `MarginSupplierItemPriceService.cs:120-124` refuses any `effectiveFrom` not strictly after every existing
   row. So a chef *can* repair a frozen week **only while the wrong price is still the newest row on that
   item's timeline.** The moment any later-dated price exists — this week's price typed before last week's
   error was noticed — every instant covering the frozen week is refused, and the correction revision
   reproduces the identical wrong theoretical cost forever. Second, bounded case: a wrong price effective at
   Monday 00:00 cannot be re-priced at that instant (`:107-118`); the earliest correction is 00:01, leaving
   Monday itself on the wrong price silently.
3. **The module is far more complete than "38 lanes built-unverified" suggests.** All four pages exist, are
   linked from the nav, and every wire they use exists, is DI-registered and route-reachable. The stale
   2026-07-27 matrix saying "frontend NOT BUILT" is no longer true, and menu-margin (its M2, "NOT BUILT") is
   built end to end.

## 1. The first stop

A chef is stopped **before the first screen, by the flag, not by a wiring break.** All three `Margin.*` flags
are deny-closed by default and the only lever is `PUT /stores/{storeId}/feature-flags` — **no page in the
frontend writes that endpoint** (only `utils/growth/growth-client.js:180` reads it). So every margin page
renders `mrg_module_off` until someone runs curl or the demo seed.

With the master flag flipped the way the module's own demo script flips it, the chef walks **ingredient →
supplier → item → price → recipe → cost with no break at all**, and is stopped at `/admin/margin-statements`
by `mrgs_stage_off` because `Margin.Statements` is a second flag with the same API-only lever. With both on,
no missing wire remains on the stated exit journey. The remaining stop is conditional: finalize refuses while
the sales projector lags, and the rebuild control is PowerUser-only, so a store admin can only wait out the
hosted projector's timer.

## 2. The inventory (abridged to the breaks)

| Step | Verdict |
|---|---|
| Find the module | **reachable** — nav group "Modules", `AdminPageHeader.vue:352-359` |
| Enable the module | **broken: no operator surface** — API-only; three flags needed for the full journey |
| Ingredient / supplier / item / price / CSV import / recipe / plate cost / menu-margin link | **reachable** |
| Supplier detail after reload | **broken** — no `GET /suppliers/{id}`, so the revision is unobtainable and edit/archive withdraw (`margin-suppliers.vue:129-136`) |
| Revise / retire a recipe | **broken: live wire, no browser caller** — `recipe-client.js` has no CreateVersion/UpdateVersion/Retire. After activation a chef cannot fix or retire a recipe from any screen, and name-uniqueness blocks re-creating it |
| Sub-recipes and yield factor | **broken: unreachable from UI** — the form hardcodes `kind: 'Sellable'` and sends no `yieldFactor`/`subRecipeId` per component (`margin-recipes.vue:613,618-622`) |
| Open / spend / recalculate / freeze / correct / export | **reachable**, with the price-timeline dead-end above |
| Record waste | **broken on this branch pair: backend absent.** The frontend half is fully merged, so the in-flight lane has somewhere to land. Live hazard until it does: `utils/margin/statement-view.js:314-321` reads an absent coverage `waste` block as "nothing recorded" on the assumption the server always sends it — currently false, so the panel affirmatively claims **zero waste rather than unknown** |

**Costing arithmetic, checked independently:** loaded cost is `Quantity ÷ YieldFactor` (as-purchased) in
`MarginRecipeCostCalculator.ExplodeAsync`, with `YieldFactor` validated to `(0,1]`. The direction the
graded-wrong research document got backwards is **correct here.** Rate is
`PackPriceMinor / (PackSize × PurchaseUnitToBaseFactor)` in unrounded decimal, rounded half-up once at
presentation; pinned by the golden fixture, the rounding-regime tests and the theoretical-cost lower bound.
Currency is merged, never converted; mixed currency voids the total rather than mislabeling it.

**Starter list ruling:** nothing is *blocked* by the ~150-item curation being open. The mechanism is live with
16 Norwegian staples and manual creation works from two pages. Its absence costs onboarding breadth only —
the ≤15 min/recipe and ≤12 venue-hour targets — not usability.

**Frontend evidence:** 4 margin page Jest suites green locally (100/100). Backend not run.

## 4. What could not be determined

- **Whether any of it works in a browser.** Static wiring review plus unit runs; nobody has watched a chef
  walk it. The demo seed deliberately leaves `Margin.Statements` dark, so the freeze/correct leg needs the
  flag flipped by hand.
- Whether opening revision 2 of a frozen week unfreezes that week's waste entries — undecidable, the backend
  waste code exists on no branch readable here.
- Backend suite green-ness on `feature/restaurant-modules` — not run. The journey manifest asserts green
  including one real-SQL journey, but that is the branch's own account, not an observation.
- The projector timer interval a store admin waits out before finalize.
