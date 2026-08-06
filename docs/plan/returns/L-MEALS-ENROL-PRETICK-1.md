```
RETURN: L-MEALS-ENROL-PRETICK
brief: 9cd4b75c
verdict: built
evidence: lanes/L-MEALS-ENROL-PRETICK/evidence.md
log:
Built on lane/meals-enrol-ui @ 802041a. Commit 2e3f39d is a DESCENDANT of it, not of 3cd2570.
Backend tested against: lane/meals-members-read @ 086ac34f (off 8e2b57de).
Tip verified: Web-modules HEAD = 3cd2570 as briefed, and no ref has ListProgramMembers. Not built.
Panel preticks from GET /programs/{id}/members. The write's own response is no longer kept at all.
expectedVersion = that read's revision, not the programmes list's; proven where the two differ.
meals_enrol_no_read_note deleted by hand from no/en/de; a test asserts it undefined in all three.
Unknown read WITHHOLDS the control; loaded-empty offers it unticked. Two different claims.
Driven through the page by clicking. No handler is called directly.
World holds one Enrolled and one preserved Removed colleague; ticks asserted by identity both ways.
12 mutation arms, 25 alternating runs: every mutant red, every restore green.
read-ignored-in-panel red/green; page-handler-unbound red/green; revision-from-list red/green.
The audit caught a vacuous assertion of mine (a box the operator ticked cannot untick itself).
jest 2610 passed, 112/113 suites; only test/journey-artifact-store.test.js reds (2 tests).
That is the pre-declared worktree-name failure: expects ^Web-modules@, got wt-meals-enrol-pretick@.
No push, no shared ref moved, no container, no migration. Only my worktree touched.
END RETURN
```
