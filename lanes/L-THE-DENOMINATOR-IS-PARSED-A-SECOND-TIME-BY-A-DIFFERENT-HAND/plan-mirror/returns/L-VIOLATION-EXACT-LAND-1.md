```
RETURN: L-VIOLATION-EXACT-LAND
brief: 7dc41377
verdict: built
evidence: lanes/L-VIOLATION-EXACT-LAND/merge-receipt.md (OkamAPI, at feature/restaurant-modules 8e2b57de)
log:
TIP: feature/restaurant-modules was 569887a5, re-read 3x, unmoved. mig-stack-land 4b37f81b is a
  DIVERGED branch (569887a5 is NOT its ancestor), not 34 fast-forward ahead; nothing from it merged.
MERGED: a8190fee = lane/wf-violation-exact cdb4c66c; ef2bd5c8 = lane/meals-violation-exact 13cd9f18,
  both +1 on the tip. ZERO conflicts, ZERO shared paths, so no auto-merged hunk exists; merged bodies
  read anyway. Landed local-only by update-ref CAS twice. NEVER pushed. No container, no migration.
BUILT BEFORE EVERY TIER, no --no-build anywhere; WebApi.dll mtime advanced on each mutate/restore.
NUMBERS: baseline 4629/0/12 at 569887a5, measured TWICE in my own worktree (identical test sets);
  merge ef2bd5c8 = 4638/0/12. Discovered-test-set diff: 0 REMOVED, 9 added = exactly the two suites.
NON-VACUOUS AT THE MERGE: 9/9 by name; bare 19 back in both files -> 4 failed (2 per half), incl.
  Expected Not "MEALS_RESERVATION_NOT_FOUND", Actual it - the funding bind, reproduced at the merge.
KEPT ON PURPOSE: MealsDbViolations:65 IsDeterministicConstraintViolation still carries bare 19, the
  only SqliteErrorCode hit left in Services/. Removing it is a defect, not a cleanup.
FINDING: the dated-output pin is NOT on this branch - EventsDietaryRunSheetWireTests still rewrites
  artifacts/journeys/ev-dietary/run-sheet.{json,md}; lane/dated-test-output b10eb11c is UNMERGED. Also
  unmerged and untouched by me: lane/margin-violation-anchor, which still has zero commits of its own.
END RETURN
```
