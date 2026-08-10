```
RETURN: L-PHONE-IN-PATH
brief: a49fbe93
verdict: built
evidence: backend OkamAPI lane/phone-in-path @ a60da359 (fix c7422096 + finding-closure a60da359), worktree ~/okam/wt-phoneinpath, based on feature/restaurant-modules @ 35696d6b, NOT pushed - container-free tier (--filter "Database!=SqlServer") 4505/0/12 vs a base 4466/0/12 I measured myself at 35696d6b in a clean detached worktree, delta +39 = exactly the new tests, 0 regressions - WebApi.Tests/Observability/PersonalIdentifierRouteShapeTests.cs (39) | mutations: lanes/L-PHONE-IN-PATH/mutations.txt | tiers: lanes/L-PHONE-IN-PATH/{base,containerfree}-tier.summary.txt | detail: lanes/L-PHONE-IN-PATH/evidence.md and artifacts/security/L-PHONE-IN-PATH-mutation.md | stale finding closed in artifacts/security/L-VIPPS-LOG-mutation.md
log:
BASE recorded: tip 35696d6b; both routes verified LIVE there first, not inferred. Tip has since
moved 4685fb01 -> 5df07afa; neither touches a file this lane edits and the route-parameter set
is identical, so the merge is clean.
Both are writes: PUT /stores/{storeId}/phonenumber and POST /giftcard/transfer/{giftcardId}, each
with a body model; service signatures unchanged so validation is untouched.
C3: NOTHING in the estate called either route (Core giftcard-service has no transfer, store-
service no phone call). Only caller was the Bruno request, moved. consumer-native's GENERATED
schema.d.ts still lists the old paths - other repo, nothing there references them.
GUARD reads templates off the COMPILED controllers (711, floor 600), not source; vocabulary is
EN+NO so {mobil} {tlf} {telefonnummer} {epost} red exactly like {phoneNumber}; a check keyed to
a literal passes M2. Rule 2 pins both actions still ACCEPT a number from a body, since rule 1
alone is satisfied by DELETING the parameter. Limit stated in-file: names only.
M1 defect verbatim 3 red, M2 Norwegian rename 1 red, M3 capability deleted 1 red; 148/0 after
every restore, never --no-build. FINDING 1 CLOSED not deleted: no such middleware at the tip,
deleted by 5b2e99c8 2026-08-03. NOT DONE: nobody walked either route in a UI; C5 is Sven's.
END RETURN
```
