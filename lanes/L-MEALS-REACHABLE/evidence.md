# L-MEALS-REACHABLE — observations

Worktree: /Users/svendaneel/okam/wt-mealsreachable (branch lane/meals-reachable, off feature/restaurant-modules 24dec838)
Commit: 1b03e8e2 — local only, not pushed.

## Gap 2 (CORS) — verified, fixed, red-then-green

Before: Program.cs:102 `.AllowAnyHeader().WithExposedHeaders("ETag")` — one string.
The export sets `X-Meals-Content-Hash` (MealsStatementController.cs:131) and returns
`File(..., export.FileName)`, which emits `Content-Disposition`. Neither is CORS-safelisted.

RED 1 (red-cors.txt), real pipeline, venue's own 200 export response, Origin present:
  The CORS policy does not expose X-Meals-Content-Hash, so a browser on an admin origin
  gets the export body and cannot read it. Exposed: [ETag].

RED 2 (mutation, Content-Disposition removed from the fixed policy, file rewritten + rebuilt):
  The CORS policy does not expose Content-Disposition ... Exposed: [ETag, X-Meals-Content-Hash].

GREEN: both, plus the pre-existing WireContractPinsTests ETag pin and its same-origin
negative control. Fast tier 4353 passed / 0 failed / 12 skipped.

## Gap 1 (operator lever) — verified, NOT closed: product fork

Observed at the wire tier (MealsStatementLeverReachWireTests, host at the SHIPPED
Features:Meals section — all four keys false as appsettings.json declares):

  PUT /stores/4603/feature-flags {meals.module: true}  ->  200, effective: true
  GET /feature-flags/catalog                            ->  exactly one meals.* key

  POST /v1/stores/4603/meals/statements/drafts          ->  404 problem+json meals.not-found
  POST /v1/meals/statements/{id}/finalize               ->  404 problem+json meals.not-found
  GET  /v1/meals/companies/{id}/statements              ->  404 problem+json meals.not-found
  GET  /v1/meals/statements/{id}                        ->  404 problem+json meals.not-found
  GET  /v1/meals/statements/{id}/export?format=csv      ->  404 problem+json meals.not-found

Discrimination check (lever-mutation-red.txt): with Features:Meals:Statements set on the
same fixture the company statement list becomes 403 meals.forbidden and the conjunction
fails. The other four coincide with genuine absence in an empty world.

Cause: all five gate on IMealsFeatureGate.IsStatementsEnabled = Module && Statements, both
read from host config (MealsStatementService.RequireVisible, line 642). The per-store seam
IMealsStoreFeatureFlags resolves meals.module only, and only three services hold it.

Note: `meals.ordering` and `meals.projection` are in the same position, so the fork is
wider than the statement surface — 25 of 29 routes answer only to the host section.
