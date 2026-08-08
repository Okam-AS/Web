RETURN: L-A-VENUE-THAT-SETS-MARGIN-UP-TODAY-SEES-A-REAL-NUMBER-TODAY
brief: b42ff4d2
verdict: built
evidence: /Users/svendaneel/okam/wt-mrgsetupday/.lane/L-A-VENUE-THAT-SETS-MARGIN-UP-TODAY-SEES-A-REAL-NUMBER-TODAY.md
log:
branched lane/margin-setup-day from feature/restaurant-modules a14084874 (read fresh at dispatch); commit e0ccd1036 in worktree /Users/svendaneel/okam/wt-mrgsetupday; not pushed
chose end-of-business-day: MarginEffectiveDating.ResolutionInstantOf = BusinessDate.AddDays(1).AddTicks(-1) — the last tick, since a <= test against AddDays(1) hands a day to tomorrow's row
sale-instant rejected as unavailable, not as taste: a fact carries no clock time, the journal that does sits behind the seam, and the facts table is append-only in three layers
UI backdating rejected: it reaches links only, cannot reach recipe versions over HTTP at all, and falsifies when a link became effective
what it costs: inside a business day effective-dating now has no resolution — a link created at 18:00 also costs that morning, and a link retired at 14:00 costs none of the day it left
rejected min(endOfDay, now): identical facts would then recompute differently at 11:00 and at 17:00 on the same open week
checked before assuming safe: finalized statements are frozen and never re-resolve, so no past statement moves; only OPEN statements recompute, which is the objective
every effective-dating boundary in MarginWorld predates the golden business date, so no golden arithmetic moves; held by a regression-control test in the same file
MarginCoverageService shares the analyzer and moves with it — intended, the flag's 0 to 93,41 measurement is a coverage number; MarginMenuMarginService resolves at a real instant and is untouched
second defect, found and fixed: a period with zero covered facts skipped the cost loop and published theoretical 0 with TheoreticalCostComplete TRUE — withhold-rather-than-zero in its purest form
MIG-11 left intact: the amount stays a non-nullable lower bound and the ratio is still reported; nulling it reds MarginTheoreticalCostLowerBoundTests and MarginStatementLifecycleTests:328
open for @sven: should coverage below one hundred make the theoretical cost incomplete? same lower-bound argument, but the golden world is partly uncovered and asserts complete in six places
no migration, no schema change, no append-only row read or repaired; C1 holds
fast tier 4757 passed / 0 failed / 10 skipped against the 4752/0/10 baseline — delta +5, the five Facts of MarginSetupDayResolutionTests, one per claim
non-vacuity by forced recompile: the midnight mutation reds 3 of 5, disabling the completeness guard reds the 4th, unmutated 5 of 5; no SQL slot taken and no SQL tier run
END RETURN
