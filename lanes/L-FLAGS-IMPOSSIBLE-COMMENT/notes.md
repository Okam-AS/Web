# L-FLAGS-IMPOSSIBLE-COMMENT — detail beyond the return

Base `feature/restaurant-modules` @ `35440cfb9cc1f4709510c01e293fd3098d4bfd29`, in the shared
`Web-modules` checkout. Tracked tree clean at the start (only other lanes' untracked directories).
Two files changed, both committed by pathspec.

## The comment

`utils/platform/flag-board.js`, the `isOverruled` doc block:

> The reverse — `state:false, effective:true` — cannot happen through this API and is not claimed.

## Verified false, in the backend, before editing anything

Read against `lane/flags-effective-resolvers` @ `e45ec4c1`, worktree `/Users/svendaneel/okam/OkamAPI-flagseff`
(read-only; nothing built, nothing run there, no container).

`Controllers/StoreFeatureFlagsController.cs` `EffectiveAsync` asks a registered
`IStoreFeatureFlagEffectiveResolver` FIRST and only falls back to `override ?? advertised default`.
The frontend's `state` is the setting — `overrideEnabled` when there is a row, otherwise
`defaultEnabled`. So `state:false, effective:true` is produced whenever a resolver-owning flag has
no row, an advertised default of `false`, and a gate whose fallback is not that default. Three such
flags exist, and the divergence is documented in the source of each:

1. `meals.module` — `Services/Meals/MealsModuleFlagEffectiveResolver.cs` calls
   `StoreBackedMealsFeatureFlags.IsModuleEnabledAsync`, which returns the row if present and
   otherwise `IMealsFeatureGate.IsModuleEnabled` (the `Features:Meals` config section).
   `MealsFeatureFlags.DefaultFor[Module] = false`. A deployment with `Features:Meals:Module=true`
   and a store with no row therefore reads `state:false, effective:true`. This is the state the
   brief names, and the resolver's own summary calls it out.
2. `workforce.module` — `Services/Workforce/WorkforceModuleGate.IsEnabledAsync` checks the explicit
   row, then the compile-time default (`false`), then GRANDFATHERS a store that already has
   engagements. `IStoreFeatureFlagEffectiveResolver`'s interface doc states this outright: "a
   grandfathered store's real answer is `true` while the advertised default is `false`". That
   resolver predates this lane's branch, so the claim was already false when it was written.
3. `Margin.*` — `MarginModuleFlagEffectiveResolver`'s summary: "a config-enabled store reads
   `effective:false`" was the defect it closed, i.e. after it, that store reads `effective:true`
   against an advertised default of `false`.

So the claim is wrong, and it is wrong three times over. Not a fail-spec.

## Why the silent warning is right, and is left alone

Every one of those gates checks the explicit override BEFORE its fallback — `WorkforceModuleGate`
says so in a comment naming the Events.Deposits defect it exists to avoid, and
`StoreBackedMealsFeatureFlags` the same. So in the `state:false, effective:true` row the switch is
LIVE: writing an explicit `false` darkens that one venue while the fleet runs. That is not the
"flipping this switch does nothing" case `isOverruled` reports, so `isOverruled` is unchanged, the
page's `overruled` tone/warning is unchanged, and nothing about what the toggle does changed.

## The pin, and why it is on behaviour rather than on the sentence

`test/platform-flag-board.test.js` — one new test, "a setting of OFF with an effective of ON is
carried, and is NOT overruled". It builds the board from the two real wire shapes (`meals.module`
and `workforce.module`: catalog default `false`, `isOverridden:false`, `effective:true`) and
asserts `state:false`, `effective:true`, `isOverruled === false`, `writable === true`.

A comment cannot be tested, so this asserts the two ways the impossibility claim would be codified.
Both were run (`mutation-proof.txt`), and each reds exactly this one test and nothing else:

- MUTATION 1 — `isOverruled` made symmetric (`state !== effective`), which is what someone who
  believed only one direction existed would write. 1 failed / 14 passed.
- MUTATION 2 — `toRow` normalises `effective` down to the setting when the store has no row, i.e.
  "that state is impossible so it must be noise". 1 failed / 14 passed.
- RESTORED — 15 passed.

## Measurements

| what | commit / state | result |
| --- | --- | --- |
| base, full jest | both lane files at HEAD content, `35440cfb` | 109 suites / 2464 passed / 0 failed |
| after, full jest | this lane's tree | 109 suites / 2465 passed / 0 failed |

Delta +1 = exactly the test added. `suite-base.txt` and `suite-after.txt` hold both runs.
`npx eslint` clean on both changed files. No translation key added, so `translations/{no,en,de}.ts`
are untouched. No container started, none touched. The `modal-estate-scroll-lock` flake named in the
brief did not appear in any of the four full runs.

## Observation for another lane — NOT fixed here

`utils/platform/feature-flags-client.js` (the `StoreFeatureFlagReader` summary, lines ~92-104) still
says "Only Workforce and Margin register one" and that Growth and Events "have no resolver", and
hedges `effective === true` as never a promise. The resolver lane made all three of those stale.
That sentence is the one `L-FLAGS-NOTE-OVERCAUTIOUS` is briefed to rewrite once the resolver branch
merges, so it is left untouched rather than edited from two lanes at once.
