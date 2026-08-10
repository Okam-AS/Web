RETURN: L-FLAGS-EFFECTIVE-RESOLVERS
brief: 6717f0a1
verdict: built
evidence: lane/flags-effective-resolvers @ e45ec4c1 (worktree /Users/svendaneel/okam/OkamAPI-flagseff); trx at lanes/L-FLAGS-EFFECTIVE-RESOLVERS/fast-tier.trx
log:
Brief verified in source, not assumed. Events ANDs Events:Enabled (absent from shipped appsettings); Growth ANDs Growth:Enabled (ships false); Meals falls back to the Features:Meals config gate, not the advertised false. The 4th resolver-less module is Training, which correctly needs none.
Added 3 resolvers, each with its DI line in the same change (C3): Events (all 3 keys, derived from Describe(), via IEventsModuleGate), Growth (both keys, derived, via IGrowthFeatureFlags), Meals (meals.module, via IMealsStoreFeatureFlags).
DECISION 1: Events/Growth report false whenever the deployment switch is off, whatever the row says - that is what the gate resolves. The screen renders it with fields it already has (row vs effective, raising the existing overruled warning, whose copy already names "a deployment switch"). It cannot name WHICH switch: appsettings, exposed by no endpoint. No frontend change needed.
DECISION 2: fixed the REPORTED value only. meals.module still reaches 4 admin routes; quotes and funded checkout read config directly, so no row reaches a guest. MealsOperatorLeverReachTests updated to SUBTRACT the reporter from enforcing consumers, so reach cannot look like it grew.
Mutations run: DI lines removed -> wire test reds naming all 6 flags; Handles=>false -> 11/14 red; resolver ignores the row -> reds exactly the 3 cases I labelled regression guards. Every case seeds row and config to DIFFERENT values.
FINDING: the new derived wire guard caught something not in the brief - workforce.module has a resolver while its 6 stage flags correctly do not. Now recorded with reasons rather than rediscovered.
Fast tier (Database!=SqlServer, the trait-guarded container-free filter - NOT the name filter the brief warned about): 4376 passed / 0 failed / 12 skipped. No SQL container taken or touched.
No migration needed, as the brief predicted. No schema, no money-path write, no log call. Trx scanned against committed config: no credential present.
C5 NOT met: this is suite evidence. Nobody has walked /admin/feature-flags. Acceptance is still owed.
END RETURN
