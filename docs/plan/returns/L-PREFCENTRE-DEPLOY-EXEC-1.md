```
RETURN: L-PREFCENTRE-DEPLOY-EXEC
brief: e8c9e48b
verdict: built
evidence: lanes/L-PREFCENTRE-DEPLOY-EXEC/deploy-state-2026-08-06.md
log:
DEPLOY UNPERFORMED AND OWED. No push, no merge, no deploy, no mail. The owner's steps exist as runnable blocks (Sequences A-D in the evidence); not one of them was executed here.
SANDBOX CHECK ANSWERED, NOT A LIVE EXPOSURE: deployed master 6c0b3a19 carries ZERO Growth dispatch code, so no production artifact can print the link. Stronger than the config gate on record.
Config agrees twice: appsettings.json:176-178 Growth Enabled=false, MailProvider="Fake" (in-memory double, no network I/O), PostmarkFromAddress empty, PostmarkServerToken absent (C7 withheld).
Azure App Service settings NOT read (needs credentials, outside a read-only check) but inert regardless: the settings class and dispatch service they would bind to do not exist on master.
ALL SEVEN CLAIMS STILL HOLD, each re-run not inherited: main 0 pref pages; integ 0 EnableCors; lane 2a052800 not an ancestor; workflow trees both ae4fffea; path 404; preflight wildcard; NXDOMAIN.
METHOD CORRECTION: the record measured local main e7896bc, two hops stale. True remote tip is d7b5f3f. I fetched it into a private ref and re-checked claim 1 against it; it holds there too.
CHEAP CONSUMER HALF REPRODUCED, NOT REFUTED. Static route; generate:{fallback:true} with no routes and no exclude; token read from window.location.hash inside mounted(); no asyncData and no fetch.
Load-bearing leg strengthened: the record cited /admin/, an index route. Nested non-index /admin/products/ and /en/admin/products/ both answer 200 from the very export that 404s the preference centre.
=> MERGING TO MAIN ALONE FIXES THE CONSUMER ORIGIN. Confirmed, no pipeline edit needed. Sequence A is the single step the owner can act on immediately, and it is the most useful thing in this lane.
Two honesties so "cheap" is not misread: it means no workflow edit, not a small merge (135 commits, 584 files); and the page renders but answers 401 until the API lands (communications.vue:315-322).
NEW, not on record: neither integration branch exists on its remote. Web has 7 heads, OkamAPI 14, none named feature/restaurant-modules. Both are local-only, an unrecorded step before any landing.
API HALF IS FAR BIGGER THAN RECORDED: origin/master..integ = 507 commits, 2235 files. CORS is NOT cherry-pickable: [EnableCors] scopes it to GrowthPreferenceController, which is absent from master.
C6 ORDERING GATE STANDS: hold Growth__Enabled, Growth__MailProvider, Growth__PostmarkFromAddress and Growth__PostmarkServerToken unset until okam.no/preferences/communications answers 200 at step A4.
F-PREF-UNREACHABLE still cannot clear: both gating facts stay mis-probed (wrong file; demands a SameSiteMode.None the design rejects). Not repointed, plan edits being outside my boundary.
HYGIENE: no container, no npm, no stash, no add -A; 370 dirty paths left untouched. One deliberate ref write to read true main; origin/main fast-forwarded 8bcf9c3->d7b5f3f as an additive side-effect.
END RETURN
```
