```
RETURN: L-MIG-STACK-RECORD
brief: 537ae8ab
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-MIG-STACK-RECORD/stack.md
spec_gap: the ledger is in OkamAPI-modules (not Web-modules as the brief states) and the stacking was already recorded per-entry on the stack tip, so "nobody has written it" held only for the integration copy the brief was written from
reason: complete
log:
Measured, not read. 79 of 271 backend refs carry migrations INT lacks; 63 are pre-fork lineages (merge-base <= 2026-07-17, a
different chain). Live set: 16 refs. Instrument validated on the brief's positive pair first: --is-ancestor afcfddbc 9e82b286 = YES.
The flag understated it three ways. 14 branches carry another lane's unmerged migration as chain tail, not 2, on a strictly linear
10-link chain above 20260731220005. All 13 pairs confirmed by --is-ancestor; introducing commits via --diff-filter=A, not filenames.
7 of the 14 author NO migration of their own -- pure carriers whose diffs contain no migration file, so a reviewer cannot see that
merging them lands 10 schema changes. None was named before. Plus lane/margin-finalize-lag @ a6a1174b: off-chain, a superseded duplicate of link 1 (same DDL, two ids).
Premise corrected. The stack-tip ledger (6fa2cbc3) is +739/-82 vs INT, runs to MIG-28, and already records the stacking inside
MIG-24..28. What was missing is location: none of it is on feature/restaurant-modules, and it is scattered over 7 prose sections
with no list. The ledger IS the right home -- 11/11 live migration commits edit it in the same commit as the migration.
Already cost a number: MIG-22 is claimed twice (Growth_AuditLedger bd3a840f on INT vs Margin_PeriodStatementFinalizedImmutable
d6b0630f on the stack), each author blind to the other.
Wrote INT's copy on my own branch lane/mig-stack-record @ a613f026, worktree /Users/svendaneel/okam/wt-migstackrecord. 81 insertions
0 deletions, placed with the dated status blocks before section A, not at EOF. Not pushed, no shared branch, no container.
Landing arm untouched: integration/mig-stack-land @ 4b37f81b holds links 1-9 and INT is its ancestor; the two ledger copies diverge
by 739 lines, so this section needs a hand merge when the stack lands.
END RETURN
```
