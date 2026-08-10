RETURN: L-THE-LOSER-OF-A-RELEASE-RACE-IS-TOLD-WHY
brief: 9569696f
verdict: built
evidence: docs/plan/returns/L-THE-LOSER-OF-A-RELEASE-RACE-IS-TOLD-WHY-1.md
log:
lane/release-race-composed @ f935c8ae7, composed on 668590cbe. NOT landed; the exit asks a green lane tip. Trunk moved to 5c46187f3, which touches none of my files, so landing recomposes cleanly.
REPRODUCED AT THE TRUNK FIRST, by name from a trx, the author arms against trunk production code. Three red; the third verbatim: expected InvalidOperationException, actual TimeoutException.
That is the defect exactly — the unwind exception replacing the original, so the bare throw never runs and CartsController, which catches only AppException, turns it into a 500.
WHAT THE LOSER IS TOLD, which is the real question. The release seam is NOT a public route; no controller maps MealsReleaseOutcome to HTTP. It is called from two internal unwinds.
So the loser is never told about the release at all — they are told why their ORDER failed. The cleanup exception replaced that reason; now they get the original, and the failure goes to the log.
Inside the seam a race loser resolves to AlreadyReleased — success-shaped, not a refusal. A release goal is "this allocation is not held", and a rival achieving it means the goal is met.
YES, DISTINGUISHABLE FROM "you may not do this at all": that is DeniedCaptured (journal truth won, do not retry) or DeniedNotFound. Only AlreadyReleased means nothing is owed.
ReleaseSupersededAsync own comment says AlreadyReleased "would be a lie that reads as your allowance is free" for a guest asking for their budget back — that caller gets DeniedNotFound instead.
HONEST RESIDUE: after 3 exhausted attempts it still throws, because none of the three outcomes is true then. That is a database that will not settle, not a race loss, and both callers contain it.
THE BRANCH WAS STALE IN BOTH HALVES. Built on de1e5c5e9; the trunk gained two seam members in 32fd5a86b. Taking its files wholesale REVERTED that till work — a checkout is not a merge.
Merged instead, both conflicts resolved by keeping BOTH sides: the trunk ReleaseSupersededAsync plus the branch comment; the branch Captured gate plus the trunk Bound gate, in the retry loop.
The branch also committed run-sheet.json and run-sheet.md, the tier own side-effect on two tracked artifacts. Both conflicts resolved to the trunk copies; that churn is not part of the fix.
Its test double predated the two seam members and did not compile at the tip. Added as refusing stubs, so a double whose purpose is failing a release can never stand in for behaviour nobody pinned.
Tier at the lane tip: 5001 passed, 0 failed, 11 skipped, 5012 total, exit 0, no abort line. Trunk baseline 5008; the merge adds exactly 4 arms, 3 race and 1 payment.
Mutation proof via the CANONICAL RUNNER inside the backend repo — the first such run, made possible by the anchor fix: 2 mutations, 2 RED, baseline 3 tests 0 red, sources restored clean.
END RETURN
