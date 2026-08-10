```
RETURN: L-PUSH-TOKEN-IN-PATH
brief: 61c215b0
verdict: built
evidence: lanes/L-PUSH-TOKEN-IN-PATH/mutation-log.md
log:
Tip measured 8e2b57de, matches the brief exactly. Backend lane/push-token-in-path @ 363d3f7f in ~/okam/OkamAPI-pushtoken off that tip, NOT pushed. No container started at any point; tier was --filter "Database!=SqlServer" throughout.
Both routes are now POST /notification/{consumer,store}/registrationid with the handle in the body, where the PUT that follows this call already carried it.
Core: CreateRegistrationId is PRIVATE behind an unchanged public RegisterNotificationOnServer, so the client fix is one line and NO calling app needs a source change. Verified, not assumed: no app file names either route; callers are ConsumerApp/src/utils/firebase.ts:69,:81 and AdminApp/app/shared/firebase-service.js:56,:61; Web only constructs the class; ConsumerWeb never uses it; all five Core checkouts were byte-identical.
The four submodules straddle two lineages (Web on feature/POS, the other three on feature/swiss), so it is committed on BOTH: b9e7eb5 lane/push-token-in-path-swiss and 9250dc5 lane/push-token-in-path-pos, local and unpushed. Remaining step is a submodule pointer bump per app - an owner action, since this lane may not push.
Mutations, each run and both halves recorded: M1 credential-named path parameter reintroduced -> route-shape row RED (5 failed), restored GREEN with the controller sha1 back to pristine. M2 body accepted then IGNORED -> both route-shape rules stayed GREEN and only the wire value-arrival facts caught it. M3 token back in the path on a route that still answers 200 -> RED on the token-in-telemetry assertion itself, naming RequestTelemetry.Url. M4 capability deleted -> rule 1 PASSED, only rule 2 caught it.
The telemetry half avoids the trap RequestBodyTelemetryPinTests measured (the wire host blanks the AI key, so reading the channel cannot fail): the REAL CapabilityRouteTelemetryInitializer is resolved from the live composition root and run inside the real authenticated request, asserted BY VALUE against a per-test synthetic handle, with a live positive control (an authenticated path value that DOES arrive in telemetry) and the old shape reproduced through the real Redact.
Tiers: base 8e2b57de 4638/0/12, measured by me in my own clean detached worktree, not inherited; lane 4665/0/12. Delta +27 = exactly the two new files, zero regressions, skipped unchanged. Expected ev-dietary run-sheet dirt appeared and was restored, uncommitted.
FINDING, blocking for a sibling: the credential-name census is NOT on this branch. It lives only on lane/route-guard-gaps (a5b9e28b, state built-unverified; its landing lane L-SECURITY-LAND is open and held). There was no OpenGap row in my tree to move and I did not create a second census. When the two meet, that census's two notification/{handle} OpenGap rows must be DELETED - its own staleness check reds otherwise - and two class-comment references reworded to past tense. Do not reclassify them.
FINDING: Bruno/Okam API/notifications committed a 64-hex APNS-token-shaped value in a URL in three files (including one whose url pointed at the wrong route entirely); all three now carry an obviously synthetic handle.
No failure in this lane was non-reproducing.
END RETURN
```
