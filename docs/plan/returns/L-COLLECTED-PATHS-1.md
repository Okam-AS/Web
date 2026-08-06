```
RETURN: L-COLLECTED-PATHS
brief: 63ecf8ef
verdict: built
evidence: lanes/L-COLLECTED-PATHS/collected.txt — committed 6f03b18 on lane/collected-paths; regenerate with lanes/L-COLLECTED-PATHS/rerun.sh (15/15 assertions pass)
spec_gap: none
reason: exit criterion met in both directions; the fix itself is uncommitted and needs the merge owner
log:
collected.txt is the runner's own output (jest --listTests, executes no test): 126 paths, all under test/, 0 under lanes/, 0 archived-marked names.
Both directions from ONE tree at ONE instant: without the entry 131, with it 126 — removed 5, added 0, every removal under lanes/. Live suite count unchanged.
A control config inheriting the real one unchanged lists byte-identically, so the diff measures the pattern and not the wrapper.
Absence is not exclusion: the shared checkout has no archived jest copy on disk. Put the real margin-recipes-page.OLD.test.js ON DISK in my worktree and re-listed — 121 -> 115, removed 6 incl. the archive, added 0. Present and not collected.
Over-exclusion measured, not argued: three LIVE suites planted at similar paths (test/multi-lanes-rollout.test.js, test/lanes/rollout.test.js, docs/plan/lanes/collect-canary.test.js) are ALL collected under the shipped anchor and ALL swallowed by a bare `lanes`. The anchor is load-bearing.
FINDING A (needs an owner): the fix is only a dirty working-tree edit. HEAD e34977a has no lanes entry and cbb5a98 is on no branch, so one `git checkout -- jest.config.js` erases it. Every number above is true of the working tree and false of the commit.
FINDING B: on this branch the archive is BYTE-IDENTICAL to the live test (both 551 lines / 29 cases) — the 681-line/31-case version is only on lane/mrg-page-test-vacuous, unmerged. The prior lane's "29 vs 31" describes its own branch. Inflation is 29 either way.
FINDING C: these suites use test(, not it(); an it() count returns 0 for both files.
No suite run (two composition lanes were live), no port bound, no container. Touched no tracked file: the 2 dirty paths under lanes/ are sibling L-EV-JOURNEY-TIMEBOMB's. Committed by pathspec in my own worktree, never the shared branch. Not pushed.
core/ empty-submodule (F-CORE-PIN-ON-NO-REMOTE) seen and irrelevant here — --listTests resolves no modules; it does need the transform modules, hence the node_modules symlink in rerun.sh.
END RETURN
```
