RETURN: L-TRANCHE-FIVE-REACHES-THE-TRUNK
brief: 9bdea94d
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-TRANCHE-FIVE-REACHES-THE-TRUNK/evidence.md
log:
LANDED. Trunk 3807e90 -> 31e6c60, tier 183 / 4438 / 0, exit 0, pin a6ae241. THE LANDING PLAN IS COMPLETE. Nothing pushed.
CORRECTION FIRST: the trunk HAD moved. On resuming, feature/restaurant-modules read 7f359f4 -- the preserve commit -- because my worktree held the branch CHECKED OUT, so the rescue commit landed on the ref.
The trunk was carrying an untested T5 with nine reds throughout the interruption. preserve/ pointed at the same commit so nothing was at risk; I detached and reset to 3807e90 before doing anything else.
THE RED SET WAS EXACTLY NINE, as predicted. Five DEFECT pins CONVERTED, not deleted -- file held 37 tests before and after, and no test name contains THE DEFECT any more.
Before rewriting I ran a throwaway probe that mounted the page in all five scenarios and printed what it renders, so each new assertion states measured behaviour rather than a guess. Probe deleted.
FOUR BEHAVIOUR ARMS, a ruling each, NONE HELD. Two were asserting the defect from the outside: a server refusal is a load failure, not an expiry, and both pinned the expired-for-everything sentence.
The other two pinned wording the fix deliberately replaced; both structural claims still hold and are still asserted. No arm turned out to be right against the fix, so 40ab62d carries no defect I can see.
I checked the axis where a rewrite would have been the WRONG answer first: both market copy blocks carry 27 keys, symmetric, every new key in both. A one-sided key would have been a defect in 40ab62d.
RESIDUE NAMED, NOT TOUCHED: errorCouldNotSendCode is now referenced by no code path while remaining in both copy blocks. Dead copy, not a defect, outside this lane's remit.
RUNNER DID NOT REGRESS, asserted at the preserved tip AND at the landing commit: both blobs are 316f22a's (42ad26312eea / 79496a63c0e7), not 40ab62d's 131-line pair.
TIER ACCOUNTED: 182/4414 -> 183/4438. The +24 is 40ab62d's one new suite. The nine rewrites moved nine tests red->green WITHOUT changing the count, since assertions changed and no test was added or removed.
I rebuilt the merge cleanly from 3807e90 so the trunk would not inherit the "interrupted by the weekly API limit" message, and PROVED equivalence: git write-tree is f22edb9cc for both the tested state and the landing commit.
ARITY SWEEP ran the other way, since T5 changes no importable module: all three imports of pages/offer/_code.vue resolve. That matters because jest mounts that page with all three children STUBBED and a browser does not.
COMPLETE: every listed unit is on the trunk. fddb06c is the nuance -- not an ancestor, and never claimed to be; 5 of its 6 files are byte-identical on the trunk and the sixth is the file 6d43520 supersedes.
DID NOT LAND: the four older 08-06 heads 96f18de, c3695f1, b1a2872, ac6ed72 (three carrying foreign core pins), plus OkamAPI 8357c8a33, the demo-seed backend half. Core blocker unchanged; push order in the evidence.
END RETURN
