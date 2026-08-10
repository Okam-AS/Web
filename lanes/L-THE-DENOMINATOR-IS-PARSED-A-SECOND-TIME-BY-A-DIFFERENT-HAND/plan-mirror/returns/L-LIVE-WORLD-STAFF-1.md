```
RETURN: L-LIVE-WORLD-STAFF
brief: c4c4b1be
verdict: built
evidence: lanes/L-LIVE-WORLD-STAFF/live-world-run.txt (commit 538abe6)
log:
Both journeys carry @live and ran green against a real API on a real DB: workforce-flag-lever backendServed=80, workforce-schedule-publish backendServed=48, apiBaseUrl http://127.0.0.1:5952. Both live artifacts committed under lanes/L-LIVE-WORLD-STAFF/.
GUARD CONFIRMED FIXED FIRST (journey.js:410 re-throws after writing), THEN REPRODUCED: browser driven at :5952 while the run DECLARED :5951 (healthy, not the fixture) -> all six steps passed, artifact "failed", playwright exited 1. Artifact kept as guard-proof-*.failed.json.
FLAG FLIP PROVED LOAD-BEARING LIVE, which the brief asked for specifically: inverting schedule-publish's data-flag-on to data-flag-off leaves step 3 toasting and passing, and the next write is refused 409 workforce.flag-disabled-read-only. Mutant artifact kept; spec restored and re-run green.
Seed extends live-world.sh step 5 only. Three SQL rows because no endpoint can make them (legal employer; the manager's person + first engagement, since POST /staff needs a capability resolved from an engagement that does not exist yet); roles, staff, staff-roles, employment terms and the Barista rate all over HTTP under the manager's bearer, so the one money-path write names its actor (C4).
No flag override seeded and none needed: workforce.setup is the one flag in its family that ships ON, and WorkforceModuleGate grandfathers workforce.module off the seeded engagement. The board still reads 18 flags, 0 overrides, deny-closed - so nothing seeds the flag journeys' answer.
C1 checked against sys.triggers at run time, extended from 2 to the 5 tables the script INSERTs into; none carries an append-only guard on this chain. C2 respected: no migration authored, the existing 127 replay from empty each rebuild.
FINDING NOT IN THE BRIEF: the two journeys cannot share one live world. Each creates AND publishes the current week, each begins by needing it unplanned, and live mode has no /__fixture/reset. So it is one journey per world, rebuilt between - now written into the script banner, playwright.config.js and both spec headers. A rebuild is ~70s; five were done.
One fixture literal had to move: the flag board's audit stamp pinned 'user-manager', which is the fixture's actor. It now pins the claim (somebody is named, and not the ff_actor_unknown fallback), true in both worlds. Fixture mode re-run on my own ports 3953/4953: 2 passed.
Live-only truths the fixture could not give: kr 1 650,00 on the chip is the backend's arithmetic over the rate this seed wrote (7.5h x 220.00); 11 rule results from the real Norwegian pack WorkforceRulePackSeed installs at startup; 'Publisert til 1 mottakere'. Both pivot-rendering defects the journey records REPRODUCE live, so they are the product's.
Resources are mine and named. SQL okam-lws-staff-sql on :15434 (started by me); okam-lws-sql and zen_pasteur untouched. API :5952 pid 37262 from a detached OkamAPI worktree ~/okam/wt-lws-staff-api at 3579bbbc - its own, because MSBuild cannot overwrite the seam lane's running :5951 binary. Web :3952 pid 6601.
World left UP and freshly rebuilt for a human walk, since C5 is served here and not satisfied: http://127.0.0.1:3952/admin/workforce-schedule, 99999999 / AppSettings__DemoVerificationCode__REDACTED, roster Astrid Vik / Ingrid Moen / Jonas Lie, current week unplanned. Note four mssql containers are now up, ~2.3 GiB headroom.
Teardown when the walk is done: kill 37262 6601; docker rm -f okam-lws-staff-sql; git worktree remove /Users/svendaneel/okam/wt-lws-staff-api.
Committed by pathspec onto feature/restaurant-modules (538abe6); a concurrent lane's test/e2e/fixture changes were left alone and landed in their own commit. Nothing pushed.
END RETURN
```
