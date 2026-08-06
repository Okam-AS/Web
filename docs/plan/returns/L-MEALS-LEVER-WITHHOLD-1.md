```
RETURN: L-MEALS-LEVER-WITHHOLD
brief: 41173035
verdict: fail-spec
evidence: lanes/L-MEALS-LEVER-WITHHOLD/evidence.md
spec_gap: The brief rules withhold-with-a-reason on the premise of "a Meals switch that
  reaches nobody", but meals.module gates four store-addressed admin routes across three
  services -- measured off the production assembly -- so the standing ruling's predicate
  ("advertised but does not gate") does not hold for it. Contradicted by: applying the
  ruled withholding reds the landed guard MealsRouteGateReachabilityTests
  .Every_gate_a_meals_route_depends_on_is_settable_end_to_end, whose per-store-seam branch
  has no withholding escape hatch by design -- "the row this gate reads can never be
  written". Withholding this flag creates the Events.Settlement defect shape (enforced at
  four routes, no lever anywhere) rather than removing a lever that lies.
log: base: worktree OkamAPI-mealslever @ 8e2b57de, branch lane/meals-lever-withhold.
  Verified: integration tip IS feature/restaurant-modules @ 8e2b57de (0 ahead/0 behind);
  mig-stack-land 34 ahead/59 behind, not chosen. Entry NOT already withheld.
  Shape found, and Training and Workforce AGREE: Declared -> Withheld -> Advertised =
  Declared minus Withheld -> Describe(). No arbitration needed.
  Reach measured off the assembly: 3 services, 4 call sites, 4 stores/{storeId} admin
  routes. Consumer funding surface takes IMealsFeatureGate, not the per-store seam --
  so "none on the consumer path" is TRUE but "reaches nobody" is FALSE.
  Mutation (container-free, never --no-build, one tree built and measured):
  baseline 28/28 -> withholding applied 8 red/20 pass -> restored 28/28.
  Blocker: Every_gate_a_meals_route_depends_on_is_settable_end_to_end. Its per-store-seam
  branch has NO withholding escape hatch by design -- only config-resolved gates may be
  withheld. Landing the ruling needs that guard weakened and kills the venue kill-switch.
  In-shape alternative: retitle the descriptor; it lights 4 of 30 routes, not the module.
  Files touched: none in production. Only lanes/L-MEALS-LEVER-WITHHOLD/ (commit 44af0f8b).
END RETURN
```
