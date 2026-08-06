```
RETURN: L-MEALS-EIGHTH-PIN
brief: 92959250
verdict: built
evidence: /Users/svendaneel/okam/wt-mealseighth/lanes/L-MEALS-EIGHTH-PIN/evidence.md — lane/meals-eighth-pin @ 9fe599c6 off d5483cb3, local only
log: FINDING VERIFIED BY INJECTION FIRST: clamp (SET ReservedMinor = 0, floor dropped) passed 9/9 at the base. Wider than the brief: this file is the ONLY caller in the suite that supplies a SupersedesToken, so the clamp was invisible to all 4378 fast-tier tests.
Three of the nine tests reach the decrement; each had the superseded reservation as the sole hold. All three now hold an uninvolved unnamed quote across the supersede (one helper, HoldUninvolvedAsync). The other six never enter the release and are untouched.
Tenth test added — A_requote_that_fits_from_zero_but_not_over_a_live_hold_is_refused: 5000 uninvolved + 15000 superseded fills 20000 exactly; 19000 re-quote measured at 24000 and refused. Both arithmetics verified before building, then measured.
CLAMP NOW REDS 4: money pin 18000->15000; refusal pin NO EXCEPTION (clamp measures 0+19000, succeeds); replay 8000->6000; free-once 14000->10000.
SIGNATURE DISTINCTION reproduced, with one CORRECTION to the brief. A clamp reads a number with no trace of the residual (15000). A repeat decrement leaves the residual standing and reads 9000 vs a correct 14000. But the brief's literal prediction — repeat decrement landing on the residual in the money pin — is NOT reproducible: with the >= 0 floor intact the second decrement matches zero rows and is a silent no-op; with the floor dropped it drives the row negative and SQLite refuses it on CK_MealsBudgetGuards_CapturedWithinReserved. The floor turns a double release from a wrong number into an error — a defence none of the four release lanes wrote down.
Both edge pins re-proved, not assumed: bound pin reds under the state-guard mutant (Bound->Released); expired pin reds under the expiry-check mutant.
BASE MEASURED, NOT INHERITED — clean run of d5483cb3 in this worktree: fast tier 4378/4366/0 failed/12 skipped. This commit: 4379/4367/0/12. Exactly +1. Final tier run taken after the last source edit from a rebuilt assembly whose mtime was checked; trx for both committed at the commit.
TEST-ONLY: git diff d5483cb3..HEAD over Services/Models/Controllers/Migrations/Helpers/Entities is EMPTY. Every mutant restored byte-identical, verified by diff not by reading. No migration, no OnModelCreating change, no THROW number.
C4 held: every quote is created by MealsWorld.EmployeeApplicationUserId. The uninvolved hold is deliberately the same employee — it must sit on the same guard row to be a residual; a coworker's sits on a different row.
NOT PAPERED OVER: no fifth release site, no audit-row assertion added. All four release sites still write no audit row and the pins still assert reason codes only. F-MEALS-ACTOR-WORKLIST-STALE arithmetic unchanged.
UNPROVEN AT SQL TIER — all of it. No slot granted, none taken (okam-lws-sql and zen_pasteur both predate my runs and were left alone). Owed to L-MEALS-SUPERSEDE-SQL: the four clamp-sensitive readings, whether SQL Server's floor/CHECK behaves as SQLite's, and the refusal pin's rollback under the retrying execution strategy plus the detach-and-re-read path SQLite never reaches.
Branch does NOT include the other three release lanes; it is test-only in a file none of them touch, so it merges into lane/meals-fourway-tier the same way requote-release did. L-MEALS-FOURWAY-TIER's run predates this commit and does not carry it.
END RETURN
```
