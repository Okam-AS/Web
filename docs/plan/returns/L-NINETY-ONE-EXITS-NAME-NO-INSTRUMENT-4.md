```
RETURN: L-NINETY-ONE-EXITS-NAME-NO-INSTRUMENT
brief: d11b467a
verdict: built
evidence: docs/plan/artifacts/instrumentless-exits.md
log:
Batch 3, the 11 lanes in batch3.json and nothing else. 9 AMENDED, 2 DECLINED. All 9 `plan verify`
calls printed `<lane> built-unverified -> verified` and exited 0; quoted verbatim in the artifact.
AMENDED: WF-CONTACT-IMPORTED, WF-BLIND-BIND-NAME, WF-LINK-DEADEND, CANONICAL-SLOT-SURVIVES-A-RERUN,
FE-JOURNEYS-MERGE, THE-EIGHTY-TWO-MECHANICAL-REFUSALS, GROWTH-HEALTH-HONEST, GROWTH-NEWSLETTER-WIRE,
INVOICE-RETRY-RETIREMENT. Each names a WRITTEN MUTATION RECORD - which mutation, which assertion went
red, what the message said - and that is the only artefact shape that can answer a
`pinned-by-a-test-that-reds-if-X` exit. Six are already tracked in this repo.
DECLINED L-EV-VIPPS-FALLBACK: the exit demands a LIVE test-MSN initiate and the guest landing back
after approval IN VIPPS. Its own RETURN says "nothing here reaches Vipps ... the approve-and-return leg
is unverified". What is proven is adjacent - the fallBack field survives the serialization hop, one
test of 4392 reds when it is nulled. Second clause is a person completing a journey (C5), and the only
file-shaped token in the evidence is a test source, which C5 names outright.
DECLINED L-GR-DEADLINE-STATUTE: the only file is growth-scoped.trx, Counters 436 passed. A .trx cannot
show that a doc comment names a rule, nor record a timezone reading. Verifying on it is C5's
violated_when word for word. The work looks done, but that text is a source file on an unmerged branch
the evidence line never names - it needs its doc extracted, not its exit amended.
FINDING 1: `plan verify` OVERWROTE every `evidence:` line with the path I passed, worktree paths
included, not only the committed case a sibling measured. Branch/SHA/suite counts for those 9 lanes are
no longer in plan.md and survive only in docs/plan/returns/.
FINDING 2: 3 of the 9 amendments cite a file that dies with its worktree (wt-growth-health, wt-gr-nlwire,
wt-invretire). Amended anyway - the question is whether the evidence establishes the exit, and it does;
declining would invent a durability criterion the brief does not carry. Copying is outside my boundary,
so: THREE FILES TO COPY to docs/plan/evidence/<LANE-ID>/ before anyone runs `git worktree prune`. All
three branches are unpushed, so a fresh clone would not find them either.
Checked against the world, not the record: the 4 journey specs are on feature/restaurant-modules and
ddc27fa1 is reachable from it; all 8 cited backend SHAs resolve in OkamAPI-modules.
Exits re-read by exact grep immediately before each edit and replaced by exact string match, never by
line number. No lane outside the batch touched; no body, state, evidence, decision or flag line edited;
never `plan accept`. No build, no tier, no jest, no trunk moved, no push. :5091 and :5941 untouched.
END RETURN
```
