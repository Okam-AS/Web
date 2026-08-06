```
RETURN: L-TIER-ARTIFACTS
brief: b88667cb
verdict: built
evidence: lanes/L-TIER-ARTIFACTS/DETAIL.md
log:
Ruling executed as forward-only-plus-C8. NO receipt retrofitted onto any branch, and no suite run: a run today is the retrofit the ruling forbids.
Landed on lane/tier-artifacts, 12 commits e34977ac..b1a2872, never pushed, no container, explicit pathspec only: f6c0579 census.js, b1a2872 the dated backlog note.
census.js imports CLAIM_PATTERNS from verify.js instead of restating them, so the census counts what the checker enforces. verify.js still runs standalone, both modes rechecked.
Backlog measured 2026-08-06, reproduced twice: 92 distinct commits estate-wide make a tier claim, 9 backed, 83 not, across 468 local branches.
Bases named: Web-modules feature/restaurant-modules e34977ac gives 6 unbacked; OkamAPI-modules feature/restaurant-modules 8e2b57de gives 77.
BOTH figures this lane published on 2026-08-04 were wrong. Corrected in artifacts/tests/README.md rather than dropped, since both were the shape this lane exists to catch.
"~361 lane branches carry tier claims" was a branch-scale estimate, never a census. The measured count of distinct claiming commits is 92.
"8 receipts estate-wide" was read off ONE working checkout. Branches carry different receipt sets: 28 receipt files naming 25 commits exist.
The naive per-branch tally inflates ~11x because branches share ancestors: 1,054 branch-hits collapse to 92 commits. The first census run reported
"61 backed" in a repo holding 26 receipt files, which is how the bug was caught; census.js now prints both columns so the next reader catches it too.
Census reads commit messages ONLY. 178 of 399 returns on disk also state a tier figure, none counted above, so the 92 is a floor and says so in the README.
C8 AWAITS THE OWNER'S HAND: exact text at lanes/L-TIER-ARTIFACTS/proposed-C8.md. docs/plan/intent.md untouched, as no agent here may edit it.
The forward-only clause sits INSIDE violated_when, not beside it: only the constraint block is copied into briefs, so an author concluding "then I
must receipt my older commits" has to be stopped where they read. Unchanged and not mine: core pinned at 1bcab0b6, on NO remote ref; a fresh clone cannot build.
END RETURN
```
