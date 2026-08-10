```
RETURN: L-COMPOSITION-ROOT-CHECK
brief: f2730e54
verdict: built
evidence: /Users/svendaneel/okam/wt-comproot @ bfe57c3c (lane/composition-root-check, off 8704ff63, local, unpushed) - WebApi.Tests/Wire/CompositionRootLimiterWireTests.cs - artifacts/tests/lane-composition-root-fast-tier.trx 4419/4406/1/12 - artifacts/tests/base-8704ff63-fast-tier.trx 4410/4398/0/12 measured myself from this clean worktree - lanes/L-COMPOSITION-ROOT-CHECK/{evidence.md,mutations.txt}
log:
BASE 8704ff63 (lane/confirm-server-halves), the newest tip carrying the cache fix c96cd21e. feature/restaurant-modules contains neither, so a check written on it would have pinned the defect.
BRIEF VERIFIED. The corrected story is right and sharper than either telling: outside Development the host starts and every MVC controller action 500s, because GrowthPublicRateLimitFilter is a GLOBAL type filter built per action; in Development ValidateOnBuild refuses the boot. Both reproduced.
ONE REFINEMENT: "application-wide" is every controller route, NOT every request. /health and / are minimal-API, run no MVC filter, and kept answering 200 right through the mutation that took every controller down - a health probe would not have seen this outage.
DEPENDENCY LIST EXACT. Six IMemoryCache consumers exist in the whole repo and they are the six the review named. OperatorPinService takes DbContext + Redis + Journal and no cache, so the clerk's PIN claim is false exactly as the review said.
BUILT 9 tests in one file: 8 wire-shaped on a host that is the shipped Program.Main with MCP broken before its registrations, plus 1 registration-order fact.
MY FIRST VERSION PASSED 7 OF 9 VACUOUSLY and its own precondition test is what caught it. Carry this beyond the lane: a WireHost configuration override is applied at HostBuilding, AFTER every registration line, so it changes what a REQUEST reads and can never change what the COMPOSITION ROOT read. The host came up with MCP fully ENABLED.
FIXED with an environment variable, which WebApplication.CreateBuilder reads before the first registration, and which is how a deployment really supplies the setting. Set immediately before the build, restored immediately after; collections are serialised.
BRIEF'S TRIGGER IS TRUE BUT CANNOT BE THE HOST'S. Empty Mcp section + non-Development does raise InvalidOperationException in certificate validation, and that is asserted directly. Program.cs:75 refuses to boot outside Development unless Kassa:UseKeyVault is set, so the host reaches the same validation via an absent certificate path instead.
MUTATIONS 3/3, each rebuilt before running: cache back inside the try -> 8 of 9 red, host will not start, three ValidateOnBuild failures naming IMemoryCache; e-mail limiter behind the conditional -> resolution red plus 500 on the route; Growth limiter behind it -> the filter-constructible assertion reds. All restored, tree clean.
DECLARED RED, as the brief instructed: The_reservation_limiter_still_resolves_after_the_failure FAILS at this commit. IReservationRateLimiter is still inside the try and /Reservation is not in UseMcpDisabledResponse's path list, so the route stays bound with an unsatisfiable constructor. That is L-RESERVATION-LIMITER-MOVE's one line and I did not take it: shared file, sibling's lane.
LEFT ALONE DELIBERATELY: IOAuthSmsRateLimiter and IClientIdMetadataDocumentService are asserted neither present nor absent. Asserting them missing would be asserting the defect and would red the day somebody correctly moves them out; their surfaces are dark from the same failure today.
FIRST LANE RUN ABORTED with "Test host process crashed" at 1624 tests. NOT this change: a second full dotnet test was running concurrently in wt-conatretire (pid 77009, 14:10:30) on a box already holding five SQL containers. Re-run is clean and crossed the same point. I killed nothing.
NO CONTAINER SLOT TAKEN and none was granted; tier selected by the trait filter Database!=SqlServer only. MIGRATION: none authored, no schema, no SQL.
C7 CLEAN: no log or telemetry call added anywhere, and the 429 body is asserted to carry no "@" at all.
C5 UNMET: nobody walked anything. This lane adds tests only and changes no product behaviour, so there is nothing new for a person to walk.
END RETURN
```
