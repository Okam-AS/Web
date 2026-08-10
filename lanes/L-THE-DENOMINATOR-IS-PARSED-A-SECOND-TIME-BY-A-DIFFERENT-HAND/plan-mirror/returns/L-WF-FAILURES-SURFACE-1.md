```
RETURN: L-WF-FAILURES-SURFACE
brief: 21992796
verdict: built
evidence: lanes/L-WF-FAILURES-SURFACE/evidence.md
log:
Baselines: frontend e34977ac (feature/restaurant-modules); backend checkout was on lane/meals-grace-pins, so I read the contract from 8e2b57de via git show and never checked it out.
Route verified before building: WorkforceSchedulesController.cs:243 on Route("workforce/stores/{storeId:int}"), bare JSON array, WorkforceManager, Failed|DeadLettered|Withheld, string enums.
Found rather than assumed: ONLY the push adapter withholds, so Withheld and NoPushRegistration are mutually exclusive on one store at one moment. Fixture seeds one historical dead letter so the worker-tier reason is reachable at all.
Built, one change: GetNotificationFailures + utils/workforce/delivery-failures.js (tierOf returns null for unknown status; summarise exposes per-bucket counts and NO total) + panel/group components + pages/admin/workforce-delivery.vue + nav entry + pinned STORE_ADMIN_PATHS + no/en/de keys added surgically.
Journey PASSES on E2E_FIXTURE_PORT=4021 E2E_WEB_PORT=3021: sign in, flip workforce.publication, draft, staff every roster row, validate, publish, then CLICK the link (never navigate by URL) to the report.
Failure is provoked, not mocked: publish enqueues, adapters resolve. Toast says 3 enqueued; report shows 4 undelivered. Those two numbers differing is the point.
Three tiers stay apart on screen: "Kom aldri fram" (2, red), "Forsoekes paa nytt" (1, amber), "Venter paa butikkens push-noekkel" (1, NEUTRAL grey, "Ingenting har feilet her", Forsoek 0 av 5).
STALE FIXTURE: my first run used default ports and PID 73160 has held 4010 since 16:03 from another lane's worktree; reuseExistingServer adopted it and 404'd. That run is DISCARDED, not reconciled. PID 73160 left running.
Own defect found and fixed: the first passing journey staffed by row index, publish reported 2 recipients not 3, and the SMS tier was silently never exercised. It now walks every row and asserts the count.
1280 hit test asserted with elementFromPoint at the control centre, not toBeVisible: 92x44, click lands on the control. Stacked list, not a table in a grid track.
Honest states: loading/unknown/clean/rows. A failed read renders "we do not know", never the empty state; unit test pins that the two shapes differ. C7: journey asserts no address reaches the page; SmtpException shown verbatim as unexplained.
Suites: jest 2 suites / 40 tests green (incl. the nav enforcement test that reds on a page with no sidebar entry); playwright 1 passed.
NOT PROVEN: backend is "fixture" and the artifact stamps itself fixture@e34977a-dirty. No live backend ran; sql cap 2/2 with both containers foreign, harness SQL exited, brief grants no container. An @live re-point is the remaining step.
Nothing committed, nothing pushed. Other lanes' uncommitted files in the shared checkout were not touched. artifacts/ is gitignored, so the journey JSON and 3 screenshots are on disk only.
END RETURN
```
