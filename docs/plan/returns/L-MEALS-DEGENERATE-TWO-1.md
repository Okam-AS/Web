```
RETURN: L-MEALS-DEGENERATE-TWO
brief: bc5aaf58
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-mealsdegen2/lanes/L-MEALS-DEGENERATE-TWO/evidence.md
log:
Brief confirmed by INJECTION not reading: MealsFundingAuthority's floored guard-decrement replaced by an unconditional SET ReservedMinor = 0 - the clamp its own comment says it is not doing - left both classes GREEN at 31/31. Both named reads were degenerate at zero.
Fixed both. State-machine unbound release (7000): guard 13000 -> 6000. Cancel funnel (5000, driven through PaymentService.Cancel): 11000 -> 6000. Openings asserted; both held reservations' surviving state asserted, not assumed.
Assert.Equal(0,..) became Assert.Equal(6000,..) - strictly stronger, it now also rejects a decrement of the wrong reservation's cap. No assertion weakened, none removed.
Clamp reinjected: both pins RED, Expected 6000 / Actual 0. Zero rather than the residual IS the clamp's signature - a repeat decrement of the released cap would land at 1000 (funnel) or be absorbed by the floor (state machine), never at zero. Clean again 31/31.
Fast tier 4357 passed / 0 failed / 12 skipped. Production code pristine: git diff vs de1e5c5e over Services/Controllers/Entities/Migrations/Helpers/Models/Program.cs is empty; the injections were reverted by editor write (no --no-build, every run recompiled).
NOT a mechanical copy of the sibling remedy: the funnel pin advances the clock 2h and asserts an empty reconciliation queue, so a second BOUND reservation would itself be a sweep candidate and file the very ExpiredBoundReservation that pin asserts is absent. The held one is an unbound quote, released by hand before the clock moves, so the sweep observes exactly what it observed before - nothing.
No migration needed, as the brief predicted. No SQL slot used, no container started or touched. Neither class carries a SQL Server trait, so both ran in full on the fast tier: unlike the grace lane, NOTHING in this lane is unverified.
Own worktree /Users/svendaneel/okam/OkamAPI-mealsdegen2, branch lane/meals-degenerate-two @ 4fff635d off feature/restaurant-modules de1e5c5e. OkamAPI-modules was on another lane's branch and was not touched. Local commit only, not pushed.
MERGE HAZARD, tested rather than noted: lane/meals-floor-pins (unmerged) edits the same two files. Trial 3-way merge auto-merges clean, compiles, 31/31 - and under the clamp all FOUR pins red, so neither lane masks the other. I deliberately added no class-level member and no shared idempotency key or quote hash, which is what avoids the duplicate-const collision.
Lines 307 and 47 carry the same defect but are owned by that unmerged floor-pins lane - left alone rather than duplicated. Full accounting: 7 degenerate guard-zero reads exist at de1e5c5e; grace-pins (3) + floor-pins (2) + this lane (2) covers all of them, and all three branch off the same base with none an ancestor of another.
C4 noted and respected: releases still record a cause and no actor. Not fixed here (separate lane), and nothing added here makes it harder to see - both pins still assert only ReleaseReasonCode.
END RETURN
```
