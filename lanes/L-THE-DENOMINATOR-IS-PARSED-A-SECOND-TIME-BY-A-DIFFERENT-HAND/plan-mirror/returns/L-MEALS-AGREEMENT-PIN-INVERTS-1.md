```
RETURN: L-MEALS-AGREEMENT-PIN-INVERTS
brief: 7f0114f5
verdict: fail-spec
evidence: lanes/L-MEALS-AGREEMENT-PIN-INVERTS/mutation-log.md
spec_gap: Both briefed halves were already built at 54714dd6 - it inverts the assertions and its envelope catch already records the corridor refusal - so no change was owed at that site.
log:
DOCSYNC IS RIGHT ABOUT ONE COMMENT AND WRONG ABOUT THE OTHER - there are two. The test-side one is
replaced by 54714dd6. The SERVICE-side one, at the stranding site, is not: 54714dd6 never opens
Services/Meals/MealsAgreementService.cs, which still reads "Throwing here strands the reservation
(the module's documented tradeoff - a same-key retry then gets InProgress...)" at lines 190-191.
On the reported reading BOTH lanes drop it. I fixed it, comment only, one 6-line hunk, trivially
droppable at merge. Please re-task docsync if you would rather it own the wording.
Exit clause 3 - "pinned by a test that reds if either goes back" - WAS genuinely open, and mutant
M3 proves it: blank the recorded refusal's detail and 54714dd6's own code+status assertions all
still pass. Built and mutation-proven at 4bbf34a5, yours to take or drop, not claimed as built.
Mutants 3/3 killed, NONE survived. M1 (recording removed) reds the 2 corridor tests; M2
(InProgress->Proceed) reds only the new in-flight test; M3 reds only the new Message assertions.
INSTRUMENT AUDITED per your warning: driver mutates and measures one tree, runner confirms the
assembly path is that worktree, and results alternated RED/GREEN six times - which a foreign or
stale assembly cannot do. Container-free, never --no-build, no container started. Full tier
4649/0/12. Touched: MealsAgreementWriterTests.cs + MealsAgreementService.cs (COMMENT ONLY).
END RETURN
```
