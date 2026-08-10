RETURN: L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED
brief: ccd21703
verdict: built
evidence: docs/plan/lanes/L-EVERY-REPORT-READ-SAYS-WHY-IT-FAILED
log:
REVIEWER MUST READ TWO REPOS. core a6ae241 (branch lane/every-report-read-says-why), parent exactly the old pin 9626a561. Web-modules 6670619, off trunk d4c308e. Neither pushed.
VERIFIED AT THE TIP BEFORE ANY EDIT: all five reads dropped the backend reason and left statusCode undefined on 401/403/500/offline; the 3 inherited arms were red at d4c308e.
The brief understates it: the file breaks in TWO shapes. PostRequest ALREADY catches, so the four POST reads DID reach their own throw and swapped the backend reason for a fixed English string.
Only GetPlatformGrowth (GetRequest, no catch) leaked the raw axios string. Fixing the reported method alone would leave four screens lying the other way — the file-scope instruction was right.
Fix: all five reads now BuildError; GetPlatformGrowth uses SafeGetRequest. BuildError also records hasBackendMessage (3 lines, additive, no existing caller changes behaviour).
The dead line is NOT preserved as if it worked: 'Failed to get platform growth' needed a RESOLVED non-2xx, which axios never gives, so it had never run once on web.
It was always live on NativeScript, so the platforms had silently diverged. SafeGetRequest gives it a first real job as the empty-body last resort; a test pins both routes into it.
Page: describeLoadFailure prefers the server's reason (localised via the Language header), else names the cause per status. Four keys added in no, en AND de.
An error with no hasBackendMessage property is reported as unknown, NOT as offline — claiming "check your connection" for a bug on the page is the same lie pointing the other way.
Mutation receipt: 18 mutations across BOTH repos, 37 in-scope arms, 0 survivors, 0 mutations that killed nothing, reverting the safe read reds 13, and 0 of the prior lane's 36 arms disturbed.
Full tier at the lane tip: 170 suites, 4080 tests, 0 failures. 4007 baseline + 73 new arms = 4080 exactly, so nothing pre-existing regressed. The 3 arms are green because the code is right.
TEARDOWN HAZARD worth propagating: a submodule in a LINKED WORKTREE keeps objects at Web/.git/worktrees/<name>/modules/core, so the prescribed rm -rf + prune would have destroyed a6ae241.
Preserved as lanes/.../core-a6ae241.bundle on the branch. Proved by fetching it into an empty git init: both files byte-identical, parent still 9626a561. Restore steps in TWO-REPO-LANDING.md.
PRE-EXISTING, not mine: pin 9626a561 is itself absent from Okam-AS/Core.git ("not our ref"), hence the local-fetch remedy. A real push needs core first, and 9626a561 before a6ae241.
Out of scope, noted: statistics.vue swallows those four reads' failures into console.error, showing the operator nothing. Worktree web-reasons REMOVED and pruned; no push, no install, no containers.
END RETURN
