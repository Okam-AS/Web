```
RETURN: L-POS-TENDER-WIRE-REBASE
brief: 41dda51e
verdict: fail-spec
evidence: lanes/L-POS-TENDER-WIRE-REBASE/mutation-log.md
spec_gap: The brief orders a rebase of lane/meals-pos-tender-wire onto the integration tip, but that branch is already an ancestor of 8e2b57de (61 behind, 0 ahead) so there is nothing to rebase and nothing to land.
reason: Premise dead on arrival; measured the resulting state instead and proved it correct.
log:
Branch is CONTAINED: merge-base --is-ancestor lane/meals-pos-tender-wire 8e2b57de = true, left-right 61/0.
compose.md:447 already files it under "Contained (ancestor) - merge is a no-op, do not merge". Census right, brief wrong.
Seventh twin was REAL at 32fd5a86 (FinalizeService:237 classified off request payments) - and is already gone.
Definitions: 2 at branch tip -> 1 at integration tip. Six call sites read the one shared KassaCreditSale.IsCreditSale(JournalEntry).
Consolidated by 3a509b68 + 1854f594, composed at fb522bdd. Ruling one-predicate-six-call-sites holds at the tip.
"Two other lanes carry the private predicate" is wrong by ~65x: ~130 do. That number is also meaningless.
Merging cannot resurrect it: simulated all 111 outstanding merges via merge-tree, counted defs in the RESULT tree - 111/111 yield exactly 1, zero yield 2. Includes B1 (wf-bootstrap-one-engagement).
Classification source proved by disagreement, not assertion: M1 (classify off request) reds the mirror-drift test; M2 (handover gated on request) reds the forward-drift test.
Two distinct mechanisms hold the two directions - neither mutation reds both, so one proof would have been a false green.
M4 vacuity control (predicate always false) reds 15 incl. SAF-T transType 11002. Restored: 1209 pass / 0 fail / 3 skip, container-free.
FINDING - dead branch: deleting the RETREC guard (KassaCreditSale.cs:28) reds NOTHING across 1209 tests. Not removed; owner's call on a money-path guard. SQL tier unchecked.
Hit and caught the documented stale-build trap: --no-build measured a binary still holding M2. All results above come from runs that compiled (asm mtime verified moving).
C3 also already closed at the tip: PosSettlementService:392 handles the company tender, real IMealsFundingAuthority DI-registered at Program.cs:875 (not the DenyClosed default).
Backend has no .gitmodules - census 5.1 core-pin caveat is frontend-only and does not qualify this receipt. No container started.
RECOMMEND: drop this lane from the merge set, and correct F-POS-TENDER-WIRE-REINTRODUCES-TWO plus the L-BLOCKER-RESTATE "still-true, verbatim" verdict - both describe a world that no longer exists.
END RETURN
```
