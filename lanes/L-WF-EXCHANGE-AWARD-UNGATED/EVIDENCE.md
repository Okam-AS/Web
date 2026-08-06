# L-WF-EXCHANGE-AWARD-UNGATED — evidence

Base: `feature/restaurant-modules` @ `a273e013` (measured at the tip, not at a brief quote).
Worktree: `/Users/svendaneel/okam/wt-wfexaward`, branch `lane/wf-exchange-award-ungated`.

## The defect, verified present at the integration tip

`Services/Workforce/WorkforceShiftExchangeService.cs` @ a273e013 consulted
`workforce.exchange` at three call sites (lines 156, 254, 383 — the three WORKER-side writes) and
NOT in `AwardAsync` (line 485), the manager award. `AwardAsync`'s only gate was the module master,
inherited from `RequireCapabilityAsync`.

Failure shape: **shape 1** (the flag is read, the read never reaches this branch), not shape 2 —
the seam is bound and real:

- `Program.cs:769` binds `IWorkforceFeatureFlags` -> `StoreBackedWorkforceFeatureFlags`
- `Program.cs:774` binds `IWorkforceModuleGate` -> `WorkforceModuleGate`
- the lever exists: `StoreFeatureFlagsController` / `PUT /stores/{id}/feature-flags`, catalog entry
  `WorkforceFeatureFlags.Describe()` (`workforce.exchange`, default false)

Branch scan: no branch in the repo carried an exchange gate on the award. `lane/wf-exchange-move`
(a5ff40f2, unmerged) has a 4th `EnsureStageWriteEnabledAsync` in this file, but it names
`WorkforceFeatureFlags.Publication` for the successor-draft mint — a different flag on a different
write. So this is not a merge gap; the gate existed nowhere.

## Authority for gating (the estate's own text disagreed with itself)

- spec `docs/plans/modules/10-workforce-spec.md` §9.2: "Disabling any write flag preserves reads
  and exports (typed `workforce.flag-disabled-read-only` on writes)." The award is a write.
- spec §9.1 stage 4 rollback: "flag off returns manager-mediated flow; requests in flight stay
  **readable**" — readable, not writable.
- precedent, identical shape: `workforce.clock` gated the POS punch and not the manager's
  attendance correction; that was ruled a defect and fixed (`WorkforceStageFlagGateTests`
  `Clock_off_refuses_an_attendance_adjustment...`).

Against: a comment in `WebApi.Tests/Workforce/WorkforceFlagCensus.cs` claimed "manager DECISIONS on
in-flight requests are not gated either (§9.1 stage 4's rollback keeps open requests decidable)".
"decidable" is stronger than the spec's "readable". The build resolves both readings: the AWARD
(the write that moves a payroll-bearing shift) refuses; the REJECTION stays reachable so a dark
stage strands no candidacy. The census comment was corrected to say that, so no test text asserts
the opposite of production.

## Change

1. `Services/Workforce/WorkforceShiftExchangeService.cs` — `AwardAsync` calls
   `EnsureStageWriteEnabledAsync(storeId, WorkforceFeatureFlags.Exchange, ct)` when `award` is true.
   Placed AFTER the row lookup (so a candidacy in another store still answers the same 404 as an
   absent one — `ShiftExchangeTenantIsolationTests` asserts that equality) and BEFORE the
   idempotency reservation and every mutation (nothing tracked is mutated before the throw, so the
   guard cannot leave the in-memory graph ahead of the database).
2. `WebApi.Tests/Workforce/WorkforceStageFlagGateTests.cs` — two pins.
3. `WebApi.Tests/Workforce/WorkforceFlagCensus.cs` — comment corrected (no probe change; the flag
   already gates `Mutations[3]`, so the census's own question is unchanged).

## Non-vacuity

`Exchange_off_refuses_the_award_while_the_manager_inbox_read_survives` runs the SAME route
(`WorkforceRequestsController.DecideRequest`, decision "approve") twice, one variable — the flag
row — and reads the RESPONSE BODY both times:

- flag off  -> 409, `pd.Extensions["code"] == workforce.flag-disabled-read-only`,
  `pd.Extensions["flag"] == "workforce.exchange"`, `conflictKind == flag-disabled-read-only`
- read survives -> the manager inbox still returns the candidacy (§9.1 "stay readable")
- nothing written -> the row is still `RequestSubmitted` and `AwardedByActorReference` is null
- flag on -> the identical call returns `Awarded`, and C4 by value:
  `AwardedByActorReference == WorkforceWorld.ManagerStaffMemberId.ToString()`

`Exchange_off_still_lets_the_manager_close_an_in_flight_candidacy` pins the carve-out (reject with
the flag off still moves the row to `NotAwarded`), so the boundary is a decision, not a hole.

### Mutation check (gate deleted locally, rebuilt, re-run)

Mutant: `if (award && false)`. Full `dotnet build` between (assembly mtime moved
00:16:46 -> 00:17:32, then -> 00:18:23 on restore, so no `--no-build` measured a stale binary).

```
Failed  WorkforceStageFlagGateTests.Exchange_off_refuses_the_award_while_the_manager_inbox_read_survives
  Assert.IsType() Failure
  Expected: Microsoft.AspNetCore.Mvc.ObjectResult
  Actual:   Microsoft.AspNetCore.Mvc.OkObjectResult     <- the award SUCCEEDED with the stage dark
  at ...WorkforceStageFlagGateTests.cs:line 257 (AssertRefusedByFlag)
Failed!  - Failed: 1, Passed: 6
```

Gate restored, rebuilt: `Passed! - Failed: 0, Passed: 7`.

## Suites (container-free tier only; no container started)

- `dotnet test --filter "Database!=SqlServer&FullyQualifiedName~WorkforceStageFlagGateTests"`
  -> Passed 7 / Failed 0
- `dotnet test --filter "Database!=SqlServer&(FullyQualifiedName~Workforce|FullyQualifiedName~Modules)"`
  -> Passed 769 / Failed 0 / Skipped 3 (pre-existing JOURNEY-GAP skips)
- `dotnet test --filter "Database!=SqlServer"` (whole fast tier)
  -> Passed 4389 / Failed 0 / Skipped 12, 9 m 7 s

Wire tier dirtied `artifacts/journeys/ev-dietary/run-sheet.{json,md}` as documented; both restored
with `git checkout --`, not committed.

## Not done here / residue

- SQL Server tier NOT run (no container slot; `ShiftExchangeOneAwardRaceSqlServerTests` and
  `WorkforceRequestsDecisionSqlServerTests` touch this method and are unmeasured on this branch).
- The time-off manager decision (`WorkforceRequestsService.DecideAsync`) is still ungated by
  `workforce.selfservice` — the same shape, out of this lane's scope, not touched.
- Merge hazard: `lane/wf-exchange-move` (a5ff40f2) edits `AwardAsync` a few lines below this gate.
  Both edits are additive and in different blocks; a merge should be textual, not semantic.
