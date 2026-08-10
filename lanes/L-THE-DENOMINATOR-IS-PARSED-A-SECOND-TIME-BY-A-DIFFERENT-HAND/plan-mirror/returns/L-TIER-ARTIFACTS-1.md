```
RETURN: L-TIER-ARTIFACTS
brief: 645bcd64
verdict: fail-spec
evidence: lanes/L-TIER-ARTIFACTS/DETAIL.md
spec_gap: Clause 1 is unsatisfiable honestly - ~361 lane branches carry tier claims against 8 receipts estate-wide, and any receipt added to them now would be a run executed today attached to an hours-old commit, contradicted by this lane's own two receipts which differ by 36 tests at identical source purely from harness state, proving a fresh run cannot stand in for the run a branch originally claimed.
log:
The convention exists once, at OkamAPI-modules/artifacts/tests/README.md (2026-07-31). Cited, not invented.
It was unfollowable from this repo. artifacts/ was ignored as a DIRECTORY, so git never descends and no
later negation could re-include it; nothing in either repo emits a trx or junit; jest-junit is not installed.
Fixed on lane/tier-artifacts, 10 commits e34977ac..2a7bf12, never pushed, no container, backend untouched:
gitignore is now artifacts/* + !artifacts/tests/ (journeys and logs still ignored, checked both ways);
record.sh runs a tier in a clean detached worktree and commits the receipt ALONE; verify.js checks SOURCE
IDENTITY rather than the filename, so a renamed old run cannot pass, and it caught two bugs in itself.
Two receipts are committed, and the pair is the finding: 2547 tests, then 2583 at the same source.
core is a SUBMODULE that git worktree add does not populate, so three suites could not load and were
hiding 36 tests behind "112 suites, 4 failed" and a total that looked healthy.
NEW AND SERIOUS: core is pinned at 1bcab0b6, which is on NO remote ref and exists only on the unpushed
local branch lane/core-ore-label. A fresh clone cannot check out, build or test this branch. Not touched.
The 2 residual failures are F-SUITE-PINS-THE-CHECKOUT-NAME; the README forbids renaming a worktree to pass.
Clause 2 is done. Clause 1 needs C8 in docs/plan/intent.md, the only text copied into every brief, and
I may not edit docs/plan, so the exact constraint text is in lanes/L-TIER-ARTIFACTS/proposed-C8.md.
END RETURN
```
