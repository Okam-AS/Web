# L-FLAGS-RESOLVERS-COVER-THREE — evidence

Base: integration tip `8e2b57de` (`feature/restaurant-modules`).
Worktree: `/Users/svendaneel/okam/OkamAPI-flagscover` (created by this lane, detached).
No container started, stopped or entered. No push, no commit to a shared branch, no migration.

## 1. The first question: are the two branches the same shape? YES.

`107ca70e` (`lane/growth-effective-resolver`) is **`e45ec4c1` + `6ae0b8db` cherry-picked onto the tip**.
Machine-checked, not read: `docs/plan/lanes/L-FLAGS-RESOLVERS-COVER-THREE/equivalence-107ca70e.txt`.

- All six new source/test files are **byte-identical blobs** across `e45ec4c1`, `6ae0b8db` and `107ca70e`.
- `WebApi.Tests/Wire/FlagEffectiveResolverWireTests.cs` is byte-identical to the **`6ae0b8db`** version
  (the flag-keyed guard), and differs from the `e45ec4c1` version — i.e. `107ca70e` carries the refinement
  too. `107ca70e` ⊇ `e45ec4c1` ∪ `6ae0b8db`.
- The three files that already existed at base (`Program.cs`,
  `MealsFeatureFlagCompositionTests.cs`, `MealsOperatorLeverReachTests.cs`) have **patch-identical** hunks;
  their blobs differ only because of 63 commits of base drift.
- `merge-base(8e2b57de, 107ca70e) == 8e2b57de` (one commit on the tip);
  `merge-base(8e2b57de, e45ec4c1) == de1e5c5e` (63 behind).

**Conclusion: landing both would be the estate's fourth double-land.** `e45ec4c1` and `6ae0b8db` are
superseded by `107ca70e` and should be retired, not merged.

## 2. Readings verified at the tip, not inherited

Every line below was read from `git show "8e2b57de:<path>"` in this lane. All nine check out.

| claim in the brief | verified |
| --- | --- |
| `Controllers/StoreFeatureFlagsController.cs:55-66` walks resolvers, falls through at `:65` to `overridden ? row.Enabled : descriptor.DefaultEnabled` | yes, exactly those lines |
| Workforce resolver registered `Program.cs:783` | yes |
| Margin resolver registered `Helpers/Margin/MarginModuleServiceCollectionExtensions.cs:35`, reached via `Program.cs:1160 AddMarginModule()` | yes, both |
| those are the **only two** resolver registrations at the tip | yes — `git grep IStoreFeatureFlagEffectiveResolver` over non-test code returns no third `AddScoped` |
| `Services/Growth/StoreBackedGrowthFeatureFlags.cs:48-50` returns false on `Growth:Enabled` false, **before** the row at `:54-57` | yes |
| `appsettings.json:176` ships `"Enabled": false` under `Growth` | yes |
| `Services/Meals/StoreBackedMealsFeatureFlags.cs:37-40` coalesces the row, `:43` falls back to `_configGate.IsModuleEnabled` | yes |
| `Services/Meals/MealsFeatureFlags.cs:83-87 DefaultFor` is the board's fallback; `appsettings.json:164` ships `"Module": false` | yes |
| Training needs none | yes — `StoreBackedTrainingFeatureFlags.IsEnabledAsync:50-56` is `override ?? DefaultFor`, and `TrainingFeatureFlags.cs:118-119` **projects** `Defaults` from the same `Declared` list the descriptors come from, so the two cannot disagree |

Also verified, and not in the brief:

- The reliability sentence really is in three languages and says what the brief says it says:
  `translations/en.ts:5357`, `translations/no.ts:5422`, `translations/de.ts:5364` — "so *effective: off* can be
  relied on, while *effective: on* is not a promise that the write will go through".
  The client repeats it at `pages/admin/feature-flags.vue:185-188`.
- All six modules concatenate their `Describe()` into the shared catalog at `Program.cs:761-768`, so an
  unregistered resolver leaves real catalog keys unclaimed — which is what makes the wire guard able to red.
- `Services/Events/StoreBackedEventsFeatureFlagStore` **is** the registered `IEventsFeatureFlagStore`
  (`Program.cs:1093`), so the Events resolver quotes a row-aware gate in production rather than the
  deny-closed default. Checked because a resolver wired to the default store would pass the service-tier
  tests (they construct the store-backed one directly) and be wrong in the composition root.

## 3. The pin, proved rather than asserted

Filter for every mutation run:
`Database!=SqlServer&(FullyQualifiedName~FlagEffectiveResolverWireTests|~GrowthFeatureFlagEffectiveTests|~MealsFeatureFlagEffectiveTests|~EventsFeatureFlagEffectiveTests)`
= 18 tests. No SQL fixture class executed. Raw logs: `mut-*.log`, table: `mutations.txt`.

Each mutant comments out ONE `AddScoped<IStoreFeatureFlagEffectiveResolver, …>` line
(`mutate.py`, which exits non-zero unless exactly one live line matched — a mutation that silently
removed nothing is how a receipt credits itself with a red it did not cause).

| # | mutant | result | the guard's own message named |
| --- | --- | --- | --- |
| control | `107ca70e` unmodified | **18/18 passed** | — |
| MG | `Program.cs:795` Growth registration removed | **1 failed / 17 passed** | `growth.dispatch (Growth), growth.module (Growth)` |
| MM | `Program.cs:806` Meals registration removed | **1 failed / 17 passed** | `meals.module (Meals)` |
| ME | `Program.cs:1115` Events registration removed | **1 failed / 17 passed** | `Events.Core, Events.Deposits, Events.Settlement (Events)` |
| MA | all three removed at once | **1 failed / 17 passed** | all six keys, in one message |

The failing test in every case is
`FlagEffectiveResolverWireTests.Every_catalog_flag_is_either_claimed_by_a_registered_resolver_or_excused_by_name`
(`FlagEffectiveResolverWireTests.cs:142`). **The exit's "each pinned by a test that reds when its resolver is
unregistered" therefore holds for Meals, Events AND Growth at this base**, and the guard is derived from the
composed catalog, so a seventh module inherits it.

**The service-tier tests staying green under MG/MM/ME is correct, not a hole.** All three build their
resolver with `new` and pass it to the controller, so they cannot observe DI at all; registration is the
wire guard's job, and it is the one that reds. That partition is stated in the files themselves.

`L-FLAGS-EXCUSE-BYFLAG` recorded these same five reds — but at `de1e5c5e`, 63 commits behind, where the
catalog was a different set. Nothing had re-run them at the tip. They now hold at the tip.

## 4. What was still open, and is now closed

The wire guard is a DI-level pin: it proves a resolver is *registered*, not that a deployed board *reports*
what a deployed gate answers. `FlagEffectiveResolverWireTests`' own summary says so — "behaviourally over
HTTP for the one module whose gate diverges on this host" names **Workforce only**, because the shared
`WireHostFixture` deploys `Events:Enabled` and `Growth:Enabled` and ships `Features:Meals` false, and under
exactly those settings all three gates agree with `override ?? default` for every input.

Meals is the one of the three where that gap is a pilot away: `appsettings.json:164` ships
`Features:Meals:Module` false, so the board and the gate agree **today**, and disagree the first morning a
deployment sets that key without writing rows.

`MealsGateDeploymentWireFixture` already boots that exact deployment — a `Lit` host differing from the
shipped `Dark` host in that one key, with both refusal and admission already proved over HTTP on the pair.
Added there, at `0f29a898`:

`MealsGateDeploymentWireTests.The_flag_board_agrees_with_the_deployment_for_a_venue_with_no_row`

- Lit host, venue with **no** `meals.module` row: `isOverridden:false`, `defaultEnabled:false`,
  **`effective:true`** — the value the naive arithmetic cannot produce.
- Dark host, same code, same venue, no row: **`effective:false`** — the control that stops a resolver which
  merely returned `true` from satisfying the file.
- Seeds a store + store-admin row under a **separate** id (4602), so the existing funding-mutation test keeps
  addressing a store that does not exist and its 404 stays the gate's refusal.

Proved, not asserted: `pin-control.log` = **5/5 passed**; with the Meals `AddScoped` line removed
(`pin-MM-meals-unregistered.log`) it is **the only one of the five that reds**. Restored with
`git checkout --` + `touch` per this repo's stale-build warning.

## 5. Tier, against a baseline measured in this lane

Same command, same filter, same machine, both in `/Users/svendaneel/okam/OkamAPI-flagscover`:
`dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"`

| commit | passed | failed | skipped | duration |
| --- | --- | --- | --- | --- |
| `8e2b57de` (base, detached) | **4638** | 0 | 12 | 7 m 17 s |
| `0f29a898` (`107ca70e` + this lane's pin) | **4658** | 0 | 12 | 6 m 39 s |

`grep -c SqlServerTests` over both trx files = **0**. Trx: `trx/baseline-8e2b57de.trx`,
`trx/lane-0f29a898.trx`.

Delta **+20**, accounted **test by test** in `trx-delta.txt` (name-set diff of the two trx files, not a
subtraction of counts): 19 from `107ca70e` — Events 5, Growth 5, Meals-effective 4, wire 4, and the one
added to `MealsOperatorLeverReachTests` — plus **1** from `0f29a898`,
`MealsGateDeploymentWireTests.The_flag_board_agrees_with_the_deployment_for_a_venue_with_no_row`.
**0 tests removed, 0 outcomes changed** between the two runs. The independently measured baseline matches the
4638/0/12 the previous lane reported.

## 6. Containers

`containers-before.txt` → `containers-after.txt`. This lane **ran no `docker` command other than
`docker ps`**, started nothing, stopped nothing and entered nothing. The census is not a subset in either
direction because other lanes' Testcontainers sessions opened and closed during the ~40 minutes; the
falsifiable claim is the one in the trx: **0 SqlServerTests executed in either run**.

## 7. Constraints

C1 no append-only write · C2 no migration, no `OnModelCreating` change · C3 the only new class in the tree is
`107ca70e`'s, and its DI line is in the same commit; this lane adds a test only · C4 no money-path write ·
C6 no statutory claim · C7 no log or telemetry call added.

**C5 NOT met.** Everything above is suite evidence. Nobody has opened `/admin/feature-flags` and looked at a
Meals row on a deployment with `Features:Meals:Module` set. Acceptance is still owed.

## 8. What the hub should do with the branches

- **Land `lane/flags-resolvers-cover-three` @ `0f29a898`** — it contains `107ca70e` unchanged plus one test.
  Landing it lands the Growth/Meals/Events resolvers and the flag-keyed guard.
- **Retire `lane/flags-effective-resolvers` @ `e45ec4c1` and `lane/flags-excuse-byflag` @ `6ae0b8db`.** Both
  are strictly contained in the above. Merging either as well is a double-land.
- Nothing is pushed. Worktree `/Users/svendaneel/okam/OkamAPI-flagscover`, created by this lane, clean at
  `0f29a898`.

## 9. Residual, named rather than left to be rediscovered

- Events and Growth still have **no HTTP-level divergence pin**, for the reason their own wire file gives:
  the shared `WireHostFixture` deploys both switches, so no host in the suite disagrees with
  `override ?? default` for those flags. Closing them means a second host per module (the Meals shape), not
  a stronger assertion on the existing one. Neither is a pilot away the way Meals is — both ship with the
  switch off *and* the board and gate agreeing.
- No operator can see or set `Growth:Enabled`, `Events:Enabled` or the `Features:Meals` section at all; the
  board reports their effect and cannot name them. That is the already-open
  `F-MODULE-MASTERS-ARE-UNDECLARED-AND-INVISIBLE`, not this item.
