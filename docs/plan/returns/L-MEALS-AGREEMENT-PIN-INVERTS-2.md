```
RETURN: L-MEALS-AGREEMENT-PIN-INVERTS
brief: c4cc4c1b
verdict: built
evidence: lanes/L-MEALS-AGREEMENT-PIN-INVERTS/adoption-review.md
log:
ADOPT 4bbf34a5 - but not for the reason the lane gave. Read at 8e2b57de via git show; measured in my own detached worktree OkamAPI-agrpinrev; no shared ref moved, nothing committed, nothing pushed.
THE WITHHELD ASSERTION, supplied by injection. M-REDECIDE reopens a refused receipt and hands back Proceed - a faithful re-decide. It REDS the new ended-corridor test: Expected MealsProblemException,
Actual (No exception was thrown) - the re-decide signed the corridor. The SAME mutant SURVIVES the pre-existing test, INCLUDING the Assert.Equal(ex.Message, retry.Message) that 4bbf34a5 added.
So the lane's own proof is wrong: M3/detail-blanking is a REPLAY mutant, and a re-decide reaches the same deterministic message. The MOVED WORLD is the only discriminator at this site. Pin confirmed.
Narrower than the lane claimed, measured not assumed: M-REDECIDE also reds 8 pre-existing commit-backstop tests + 2 receipt-level tests, all already in 54714dd6. Open only for the stateful-onProceed
family - which is exactly the site the exit names. Blind sibling: A_stateful_check_refusing_after_the_reservation...; downstream 6278f0b5 repairs it the same way, independently.
M-INFLIGHT-ENV reds EXACTLY 1 of 36 - the new in-flight test. The pre-existing receipt-level in-flight pin asserts the disposition one layer BELOW the envelope and is blind to that removal.
5/5 mutants killed, 0 survivors; baseline and restore both 36/36; wider Meals non-SQL 400/0/3 in 57s. Instrument audited: runner assembly path == the tree I mutated, alternating GREEN/RED seven times.
Comment hunk verified AT THE TIP: the stale text is at 8e2b57de verbatim and git diff 8e2b57de 54714dd6 on that file is EMPTY. Its two new factual claims - no expiry column, no purge - both TRUE.
CONDITION 1: 4bbf34a5 cannot be taken alone. 54714dd6 is NOT an ancestor of 8e2b57de and its behaviour is what the new assertions read. Adoption is 54714dd6 then 4bbf34a5, in that order.
CONDITION 2: lane/replay-pins-close ALREADY carries 8e2b57de + 54714dd6 + 4bbf34a5, comment hunk verbatim and all three pins intact, plus 6278f0b5. Adopting separately may duplicate a merged lane.
C1 checked at the tree, not inherited: GuardAppendOnly's Meals set is MealsAuditEvent/FundingAllocation/CreditAdjustment/StatementRun - MealsAgreement and MealsCommandReceipt are in neither.
C4 NOTE (54714dd6-era, not a blocker): ScopeKey is MealsIdempotencyScope.For("agreement.create"), operation-only, while two doc comments call it "actor + aggregate + operation"; a refusal writes
no audit row, so it replays across actors. DISCLOSURE: my first baseline omitted &Database!=SqlServer and STARTED a Testcontainers SQL container I had no slot for; ryuk reaped it, I killed nothing.
Its 3 reds were SQL-tier (MealsW3MigrationLineage model-drift); I draw NO conclusion - out of grant, and neither commit touches Migrations/ModelBuilders/Entities. NO SQL tier measured. C5 owed.
END RETURN
```
