# L-WF-LEVER-TITLE-NAMES-ITS-REACH — the Workforce lever's title names the surfaces its gate reaches

Base: worktree `/Users/svendaneel/okam/OkamAPI-wflever`, branch `lane/wf-lever-title`, cut from the
integration tip **`feature/restaurant-modules` @ `8e2b57de`** (verified: `git log -1 feature/restaurant-modules`
= `8e2b57de`; the shared checkout `OkamAPI-modules` sits on `lane/meals-grace-pins`, 1 ahead / 63 behind, and
was never read as truth). Every production file was read at the ref with `git show 8e2b57de:<path>` before it
was touched.

## The reach, measured before a word of the title was written

`workforce.module` **refuses 48 of the module's 53 routes**, and those 48 are not one surface. Broken down by
the shell each route lives in (the literal segment after `workforce/`):

| shell | refused / total | what it is |
| --- | --- | --- |
| `stores` | **37 / 37** | the venue's back office |
| `me` | 10 / 14 | the worker's own app |
| `pos` | 1 / 2 | the till |

The five routes the gate does **not** refuse, and why each is right:

- `POST /workforce/me/invitations/claim` — the caller has no engagement yet, so no store is knowable.
- `GET /workforce/me/inbox`, `GET /workforce/me/schedule`, `GET /workforce/me/staff-memberships` — cross-store
  reads that call `IWorkforceModuleGate.IsEnabledAsync` to FILTER engagements per store rather than refuse the
  request (`WorkforceSelfService`, the `if (await _moduleGate.IsEnabledAsync(storeId, ct))` branch).
- `GET /workforce/pos/personnel-list` — deliberately exempt and already pinned by
  `WorkforceModuleGateTests.The_pos_personnel_list_read_survives_a_disabled_module`: a statutory register must
  stay producible on inspection (bokføringsforskriften), so no operator flag may take it away.

## The defect

The descriptor read `"Module (store surfaces)"` — a claim nobody had measured, identical to the one the
sibling Meals lane removed (`2d0eab53`, which deliberately left this one alone rather than guess.)

Unlike Meals — where the title **over**-claimed (4 of 30 routes) — Workforce's title **under**-claims. It is
true about `stores` and silent about the other two shells. An operator switching a venue off Workforce reads a
title promising the back office and also stops staff clocking in at the till and stops the staff app. That is
a lie in the OFF direction, and it is the direction that costs a shift.

**Why a title and not a withholding.** Same structural reason the Meals lane recorded: a key the catalog does
not advertise cannot be written through `PUT /stores/{id}/feature-flags`, so the row `IWorkforceModuleGate`
reads could never be set — withholding would leave 48 routes enforced with no lever anywhere (the shape
`WorkforceFlagConsumptionTests` exists to forbid) and would cost the §9.2 kill-switch.

## The change (three files)

**`Services/Workforce/WorkforceFeatureFlags.cs`** — the descriptor title, and the `Module` summary that has to
survive it:

    - new FeatureFlagDescriptor(Module, "Workforce", "Module (store surfaces)", false),
    + new FeatureFlagDescriptor(Module, "Workforce", "Module: venue admin, staff self-service, POS clock-in", false),

**`WebApi.Tests/Workforce/WorkforceRouteGateMap.cs`** (new) — the route→flag join, derived from the production
tree. Routes come from MVC attributes on every controller whose full template lives under `workforce/` (the URL
space, not a naming convention). From each action the walk follows a field's declared interface → the
implementation the composition root registers for it → that method's body → its `Require*`/`Ensure*` guard →
the feature seam. It has to be transitive: a rate route reaches the gate only through
`WorkforceRateAuthoringService.RequirePayrollAsync` → `WorkforceAuthorizationService.RequireCapabilityAsync` →
`IWorkforceModuleGate`, and a two-hop scan reports the whole rate surface ungated. Source and DI registrations
come from the estate's existing `ProductionCallGraph` (comments and string literals already blanked, offsets
preserved) rather than a second source index.

A route counts as REACHED only when the seam member it hits throws by itself (`Gate.SeamRefuses`), because a
member that answers a bool may be refusing, filtering or being ignored and no source walk can tell those apart.
That is what correctly keeps the three filtering `/me` reads out of the lever's reach — and it is sound only
while the seam has the three members it was read against, which is pinned.

**`WebApi.Tests/Workforce/WorkforceOperatorLeverReachTests.cs`** (new) — the pin,
`The_levers_title_names_exactly_the_surfaces_its_gate_reaches`. The SHELLS the title names are DERIVED from the
map; the operator's word for each shell is prose (as the Meals prefix is), and the shell→word table is asserted
equal to the derived reached set **in both directions**, so a shell the gate starts or stops refusing cannot
pass. Both degenerate reaches are refused: **none** (the walk has stopped finding the gate attached — every
rule here is otherwise satisfied by finding nothing) and **all** (the flag has become an unqualified module
switch and a title naming shells describes a distinction that no longer exists).

Two supporting arms: the old title's claim kept as a fact (`stores` is covered completely, and it is not the
only thing covered — either moving is a change the title owes), and the seam's member list.

## Proof the pin reds — both arms, one tree, never `--no-build`

Filter, identical for every run, SQL tier excluded **explicitly** by trait so no container starts:

    dotnet test WebApi.Tests/WebApi.Tests.csproj --filter \
      "Database!=SqlServer&FullyQualifiedName~WorkforceOperatorLeverReach"

| run | change | result |
| --- | --- | --- |
| 1 | retitle + pin applied | **Passed! Failed: 0, Passed: 3** |
| 2 | **MUT-A** — title reverted to `"Module (store surfaces)"`, reach untouched | **Failed: 1, Passed: 2** |
| 3 | title restored, **MUT-B** — `_moduleGate.EnsureEnabledAsync` removed from `WorkforcePosController.ClockEvent`, title untouched | **Failed: 1, Passed: 2** |
| 4 | restored; `git status` = the three intended files only | **Passed! Failed: 0, Passed: 245** (wider net) |

MUT-A red, verbatim — and it is the ONLY red, which is the point: no other rule in the estate holds this fact.

    Failed WorkforceOperatorLeverReachTests.The_levers_title_names_exactly_the_surfaces_its_gate_reaches
    The workforce.module lever is titled
        "Module (store surfaces)"
    but its gate refuses routes in 3 shells, which an operator would be told honestly as
        "Module: venue admin, staff self-service, POS clock-in"
    …followed by all 48 reached routes.

MUT-B red, verbatim — the REACH arm, with the derived expectation narrowing by exactly the shell whose guard
was removed:

    The workforce.module gate refuses routes in these shells:
        me, stores
    but the lever's title is built from
        stores = "venue admin", me = "staff self-service", pos = "POS clock-in"

Restores were made with an editor write, so no restored file carried an mtime older than its build output (the
stale-binary trap in CLAUDE.md); `--no-build` was never used and every run rebuilt the tree it measured.

## Wider safety net

    --filter "Database!=SqlServer&(FullyQualifiedName~FeatureFlag|FullyQualifiedName~WebApi.Tests.Modules
              |FullyQualifiedName~WorkforceOperatorLeverReach|FullyQualifiedName~WorkforceModuleGate
              |FullyQualifiedName~WorkforceStageFlagGate|FullyQualifiedName~WorkforceFlagConsumption
              |FullyQualifiedName~WorkforceRestBoundary|FullyQualifiedName~McpConfiguration)"
    →  Passed!  Failed: 0, Passed: 245

    --filter "Database!=SqlServer&FullyQualifiedName~WebApi.Tests.Workforce"
    →  Passed!  Failed: 0, Passed: 657, Skipped: 3

No container was started, none stopped, and `docker ps` listed nothing running at any point. **No SQL-tier
result was produced, so none was interpreted.**

## Nothing else consumes the Title

`git grep 'Module (store surfaces)' 8e2b57de` hits exactly two production lines: this one and the Meals one the
sibling lane is changing. No test asserts a Workforce descriptor `Title` (`.Title` in `WebApi.Tests` is only
problem-details and Training course titles). The Nuxt admin references the KEY `workforce.module` in eleven
places and the title in none.

## Not done, deliberately

- **Frontend fixture drift.** `Web-modules/test/e2e/fixture/world.js:338` hardcodes
  `title: 'Module (store surfaces)'` for `workforce.module` (line 328 does the same for `meals.module`). It is a
  fixture mirroring the backend catalog, asserted by nothing, and it belongs to a different repo and lane; the
  Meals lane left its own row the same way. It should be updated when both retitles land.
- **The `me` and `pos` shells are only partly covered** (10/14 and 1/2). That is correct today — each exception
  is either unknowable-store or statutory — but nothing pins the four `/me` exceptions the way
  `WorkforceModuleGateTests` pins the personalliste one.
