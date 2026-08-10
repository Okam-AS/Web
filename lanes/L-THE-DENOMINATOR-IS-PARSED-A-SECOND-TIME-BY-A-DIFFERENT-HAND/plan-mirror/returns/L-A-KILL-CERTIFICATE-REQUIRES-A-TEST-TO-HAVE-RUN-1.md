RETURN: L-A-KILL-CERTIFICATE-REQUIRES-A-TEST-TO-HAVE-RUN
brief: 224621c5
verdict: built
evidence: docs/plan/lanes/L-A-KILL-CERTIFICATE-REQUIRES-A-TEST-TO-HAVE-RUN
log:
Branch lane/a-kill-certificate-requires-a-test @ 316f22a, off lane/meals-tests-proven-falsifiable (05c160a). Core pinned 9626a561. Nothing landed, nothing pushed.
REPRODUCED FIRST, exactly as reported: c65b19c with =false certifies 2/2 kills, with =true certifies 2 survivors, and writes a results file both times. Neither command executed a test.
IT REPRODUCES IDENTICALLY ON MY OWN PRIOR FIX (05c160a), BOTH DIRECTIONS. That closed the spawn-failure case only; its stub branch skipped the baseline, and that exemption WAS the hole.
FIX: one parser reads an executed-test count in three dialects — an explicit MUTATE_TESTS_RUN contract, jest's summary, and vstest Total/Failed. No count, no spawn, or zero tests is INVALID-RUN.
INVALID-RUN is neither a kill nor a survivor, in either direction, and the stub bypass is gone. The baseline runs before a byte is written, so an abort cannot leave a mutant on disk.
Verified after a void run: source intact, no results file, nothing certified. ONE FIX CLOSED BOTH: a vstest suite is judged from its own counts instead of printing RED (0) for everything.
CAVEAT STATED RATHER THAN HIDDEN: a dialect giving counts but no names supports a VERDICT, not a per-test map. The runner now says so instead of printing a coverage ratio with nothing under it.
PINS: the "cannot be run at all" arm re-aimed a second time. A command failing from the first call now aborts at baseline, so it uses a suite that dies inside the mutated window instead.
Two void-direction arms added, one per exit direction, plus one judging a vstest suite. All four RED against c65b19c AND 05c160a; runner swapped from a buffer, asserted byte-identical after.
Preserved and re-verified green: buffer restore with byte assertion, the DESTROYED reproduction, the tree-wide sweep, anchor repair, copy-depth via package.json.
The repro keeps no runner copy in-tree — a copy is the hazard the sweep exists for — so reproduce.sh fetches the historical file on demand. Evidence checked with git check-ignore.
LANDABLE, WITH AN ORDER. c65b19c's defect is closed, but NOT on c65b19c: git diff c65b19c 40ab62d over both files is EMPTY, so 40ab62d still carries the 131-line runner.
The fix is 413 lines on my tip, downstream of 05c160a, which is NOT inside 40ab62d. Landing 40ab62d alone ships the defective runner; it is safe only if this branch follows.
Tranche two must take test/support/mutate.js and test/mutation-runner-restore.test.js wholesale from this tip — that is the collision, and it is a whole-file resolution, not a merge.
Full tier at the lane tip: 172 suites, 4138 tests, 0 failures (4135 at the meals tip plus my 3 new arms). Worktree REMOVED and pruned. No push, no install, no containers.
END RETURN
