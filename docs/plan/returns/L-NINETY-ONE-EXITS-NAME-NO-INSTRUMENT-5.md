```
RETURN: L-NINETY-ONE-EXITS-NAME-NO-INSTRUMENT
brief: d11b467a
verdict: built
evidence: docs/plan/artifacts/instrumentless-exits.md
log:
Batch 4, the eleven lanes in batch4.json and no others. 6 AMENDED, 5 DECLINED. Only exit: lines inside
## Lanes touched, matched by exact string re-read immediately before each edit. No lane body, no state:
line, no evidence: line, no decision, no flag, no plan accept. Backend trunk 6d5328004 unmoved, nothing
built, no tier, no jest, nothing pushed, :5091 and :5941 untouched.
AMENDED, all 6 accepted by plan verify first attempt, EXIT_CODE=0 each, verbatim in the artifact:
L-TWENTY-THREE-BRANCHES (docs/plan/artifacts/twenty-three-branches.md - all three clauses on the page,
counts 2+6+5+9+1=23), L-STATUTE-EVIDENCE-WORLD (I ran pdftotext on the committed PDF myself: four rows,
every Tilknytning cell «Ansatt», no note lines; mutation-log M1/M2/M3 red), L-WF-TIMESHEET-RACE
(mutations.txt M1 = REMOVE THE MAPPING, 1 failed/5 passed, restored green - the exit's own mutation),
L-FLAGS-IMPOSSIBLE-COMMENT (mutation-proof.txt reds both reinstatements 1/14; I read the new comment out
of git show 89c2c1f, not out of the RETURN), L-EV-ACCEPT-GATE and L-WF-IDEMPOTENCY-REFUSAL (paired
refusal/success differing in exactly one variable, so the red is legible in the source).
DECLINED with reasons: L-VIPPS-REDACT-404 no path at all AND its RETURN retracts half the demand
("H2 OVERSTATED" - the escaped form was never broken); L-EV-INQUIRY-GATE two branch SHAs and two suite
counts, second half is a card rendering, RETURN itself says C5 owed; L-FLAGS-EFFECTIVE-RESOLVERS a green
6.1MB .trx cannot show the red its exit demands, C5 names .trx in terms, and I re-measured the PII hold
on it (grep -c 01010112377 = 2); L-CONFIRM-POSTMERGE-PIN doc-block half diffable but the two mutation
runs were written nowhere; L-EVERY-REPORT-READ path resolves nowhere - real files are at lanes/... on
unmerged 6670619d, not docs/plan/lanes/...
THE GAP THIS PASS FOUND: plan verify accepts a worktree path. Four of my six cite one, the exact class
evidence-off-the-worktrees.md ruled inadmissible; it checks resolvability, not durability. Measured
mitigation: all four files are committed on refs that resolve today (2ee3fd76, bc9c7e96, 8eee00f7,
a1d57208, each confirmed by git cat-file -e). Rescue to docs/plan/evidence/<LANE>/ is owed and is
outside this lane's boundary.
CORRECTION TO A SIBLING: twenty-three-branches.md files L-CONFIRM-POSTMERGE-PIN as "branch gone";
lane/confirm-postmerge-pin resolves at 02c077cb in OkamAPI-modules. The branch is fine, the receipt is not.
END RETURN
```
