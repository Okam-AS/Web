```
RETURN: L-REPLAY-PINS-CLOSE
brief: bea5c917
verdict: built
evidence: lanes/L-REPLAY-PINS-CLOSE/mutation-log.md
log:
Base: the 4 tests do NOT exist at 8e2b57de; feature/restaurant-modules IS 8e2b57de but the 3 lanes
are unmerged (a1d57208 1/50; 4bbf34a5 2/5, ancestor 54714dd6). Base = 8e2b57de + 4bbf34a5 +
a1d57208, merged clean, in own worktree wt-replaypins. Nothing pushed, no shared ref moved.
Mutant is the brief's, not Training's: a stateful check hoisted in front of the reservation, in 3
arms - MealsIdempotentMutation, WorkforceScheduleCommit, and an already-awarded pre-check in
WorkforceShiftExchangeService. WebApi.dll moved every arm; every restore left Services/ diff EMPTY.
E1 :250 role link restored between calls -> RED (retry awarded). E2 :284 the competing row DOES
survive, deleted between calls -> RED (no exception). E3 :311 invitation back to Pending -> RED
(retry claimed). All 3 GREEN on restore, each with a positive control added.
E4 NOT REWRITTEN, the one brief claim reality contradicts: :173 is 54714dd6's line; at 4bbf34a5 it
is :176, already reds under the mandated mutant (no receipt row), and the retry axis is pinned
separately at :225 by pin-inverts with exactly the prescribed world change.
Non-vacuity: tests reverted + arms applied -> E1/E2/E3 GREEN (census right), E4 RED. In-flight
guards green. Baseline 4666/0/12/4678 == final; no container, no --no-build, no migration.
Committed 6278f0b5 by pathspec; ev-dietary run-sheet restored.
END RETURN
```
