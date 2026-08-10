```
RETURN: L-FIXTURE-FLAG-STORE
brief: 0258fdfc
verdict: built
evidence: lanes/L-FIXTURE-FLAG-STORE/mutation-report.txt
log: bb1bf0c swept this shape across the 12 journeys of 2026-08-01. The tip has 28. The audit's already-fixed was true AND incomplete: the denominator moved, and 2 later journeys re-acquired it.
Censused all 28 at e34977a incl. the clean ones (census.md): 26 clean with the gate named, 2 holed - both Meals, both authored after the remedy.
meals-admin-setup walked 3 store-addressable routes on the deny-closed per-store meals.module: directory read, orders read, and the CORRIDOR SIGNING - a write. The fixture modelled no gate at all.
Worse, its own last step recorded a finding saying this surface has no operator lever. True of its host-config half, false of this one - and that is why the gate stayed unmodelled for four days.
meals-guest-claim: both invitee routes run RequireVisible -> Features:Meals:Module, host config, shipped false, no lever. On a shipped deployment the whole claim sequence answers an opaque 404.
Fixed: the fixture gates all five, and runs the gate FIRST, ahead of company and token lookup - the backend's stated disclosure control, not tidiness.
meals-admin-setup now opens dark, asserts the refusal, then flips meals.module on /admin/feature-flags. The leverless half is a standing dark step, per the meals-module-dark precedent.
4 mutations all RED, restored byte-for-byte by hash: no flip -> reds at the corridor signing; no per-store gate -> dark-venue control reds; no host gate -> dark step reds; reset echo reds too.
21/22 admin journeys green. workforce-schedule-publish reds on an unrelated rule-pack mismatch and fixture-divergence reports 1 finding; both byte-identical at the base, so neither is mine.
Ports 4111/3111, never 4010 (foreign fixture listening, reuseExistingServer on). Commit d1c4b26 on lane/fixture-flag-store, unpushed. artifacts/ churn from my runs reverted, not committed.
END RETURN
```
