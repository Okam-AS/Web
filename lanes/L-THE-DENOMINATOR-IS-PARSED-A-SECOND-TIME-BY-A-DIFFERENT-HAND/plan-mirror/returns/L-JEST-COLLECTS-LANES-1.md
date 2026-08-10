```
RETURN: L-JEST-COLLECTS-LANES
brief: 7ca0f13c
verdict: built
evidence: lanes/L-JEST-COLLECTS-LANES/evidence.md
spec_gap: brief says the lanes/ files are committed Playwright specs; 2 of 5 are in no commit on any ref, and one is a runnable jest COPY of a live test that passes rather than fails, so a spec-only pattern would have missed it
reason: nothing stopped; exit criterion met and both directions proven
log:
Baseline e34977ac, shared checkout, 261 dirty, 2026-08-04 23:52 CEST; lane worktree web-jestlanes detached there.
Premise confirmed: 5 failed suites / 0 failed tests, every one require('@playwright/test') evaluated outside a runner.
Corrections: 4 lane dirs but 5 suites; only 3 of 5 committed anywhere (both L-WF-PIVOT probes are untracked); path is docs/plan/lanes/, not docs/plans/.
Decisive find: lanes/L-MRG-PAGE-TEST-VACUOUS/margin-recipes-page.OLD.test.js is a runnable jest copy of test/margin-recipes-page.test.js; it PASSES, returning 29 superseded assertions to the green count.
So a .spec.js-only pattern was the wrong shape; excluded the directory. Across all 84 refs nothing under lanes/ wants collecting.
Fix is one entry, '<rootDir>/lanes/', beside the test/e2e/ entry that exists for the identical reason. Nothing deleted; probes still run by npm run test:e2e.
Anchored deliberately: a bare 'lanes' also matches docs/plan/lanes/ (14 real paths, .md only today, so latent) and any test merely named for lanes.
Growth reproduced not assumed: failing suites go 1 to 2 to 6 as siblings' evidence is added to one tree, while failed tests stay at exactly 2.
Lane worktree BEFORE: 118 collected, 6 failed suites, 2610 passed. AFTER, same tree: 112 collected, 1 failed suite, 2581 passed.
Both directions: removed exactly 6 paths, all under lanes/, 0 added; against the pristine baseline the collected set is byte-identical, so the change is a no-op where nothing was wrong.
Landed-tree run at cbb5a98 with the four sibling specs present on disk: 112 suites, 1 failed; the files are present and not collected, so exclusion and not absence does the work.
The remaining red, test/journey-artifact-store.test.js with 2 failed TESTS, is the worktree-basename pin, already fixed on lane/worktree-basename-pin, not mine and unchanged before and after.
Shared checkout, same instant: 131 to 126 collected, all 5 removals under lanes/, 0 added; full run there is 126 suites / 2978 tests, fully green.
Adjacent and NOT fixed, for a ruling: core/ submodule is empty in every lane worktree checked (4 of 4), reding 3 more suites estate-wide in the same 0-failed-tests shape; remedy is git -c protocol.file.allow=always submodule update --init core.
Commit 82127eb on refs/heads/lane/jest-collects-lanes, parent e34977ac, reachability verified; shared branch untouched; no ports bound, PID 73160 on 4010 undisturbed; no container.
END RETURN
```
