```
RETURN: L-MEALS-LEVER-WITHHOLD
brief: 3e08c2ea
verdict: built
evidence: lanes/L-MEALS-LEVER-WITHHOLD/retitle-and-pin.md
log: Ruled retitle-and-pin; the brief's withholding exit was NOT satisfied. Pass 1 (return -1) measured it reds 8/28 and hand-weakens a landed guard.
  Base worktree OkamAPI-mealslever @ lane/meals-lever-withhold; production identical to 8e2b57de at start. Every file read via `git show 8e2b57de:<path>`, never the tree.
  Descriptor retitled: "Module (store surfaces)" -> "Venue admin: agreements, companies, orders, reconciliation" (Services/Meals/MealsFeatureFlags.cs).
  Describe()'s summary now records WHY it is not withheld: no escape hatch on the per-store seam, and withholding costs the one-store-dark kill-switch.
  Pin added: MealsOperatorLeverReachTests.The_levers_title_names_exactly_the_surfaces_its_gate_reaches. The named surfaces are DERIVED from MealsRouteGateMap --
  the last literal segment of every route whose gate resolves meals.module -- so title and reach cannot move apart. Degenerate reaches (none / all) also refused.
  PIN PROVED RED, both arms, one tree, never --no-build, restores by editor write (stale-mtime trap):
    run1 retitle+pin ............ Passed 29/29 (28 arms before the pin)
    run2 MUT-A title reverted, reach fixed .... Failed 1 / Passed 28 -- and the 1 is the pin ALONE; no other rule in the estate holds this fact
    run3 MUT-B guard removed from MealsCompanyService.ListForStoreAsync, title fixed .... Failed 2 / Passed 27; pin's expectation narrowed to "…: agreements, orders, reconciliation"
    run4 restored ............... Passed 29/29, `git status` = the two intended files only
  Wider net, SQL excluded explicitly by trait in EVERY run (Database!=SqlServer): FeatureFlag|Modules|McpConfiguration|MealsRouteGate|MealsVenueReachability = 231/231 green.
  No container started, none stopped, docker ps empty at the end. No SQL-tier result was produced, so none was interpreted.
  Nothing else consumes the Title: no test asserts it, no doc names it, the Nuxt admin references the KEY in 11 places and the title in 0.
  NOT done deliberately: WorkforceFeatureFlags carries the identical title but is sibling-owned and its reach was not measured here. Committed 2d0eab53 to the lane branch only; not pushed.
END RETURN
```
