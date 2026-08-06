```
RETURN: L-EV-CALLBACK-SWEEP
brief: 9c507b25
verdict: fail-spec
evidence: lanes/L-EV-CALLBACK-SWEEP/MEASUREMENT.md
spec_gap: The brief's premise "the sweep then releases at expiry" is contradicted by the integration tip, where ExpireOneAsync consults the rail and captures the authorized hold - fixed by 99f56e63 on 2026-07-31, two days before the 2026-08-03 ruling that dispatched this lane, with the exit criterion's test already present and passing 28/28.
log:
Base feature/restaurant-modules 3579bbbc, own worktree, zero commits, no container, no migration, clean.
VERIFIED BEFORE BUILDING AND THE RED TEST WOULD NOT GO RED. The remedy the ruling names was already in
the tip: 99f56e63 "Collect the deposit a guest approved instead of releasing it when the callback is lost",
dated 2026-07-31 - TWO DAYS BEFORE the 2026-08-03 ruling that dispatched this lane. merge-base confirms it.
ExpireOneAsync reads provider truth and on Authorized replays the lost delivery into the completion sink
rather than releasing. The exit criterion's test already exists and passes (EventsDepositLostCallbackTests,
headline One_lost_callback_costs_neither_the_money_nor_the_booking); its XML doc records the pre-fix red.
Baseline 28/28 green across the three sweep classes. Wrote no test - the boundary says do not improvise.
I DID NOT STOP AT READING: "already fixed" is a claim a green suite can fake. Mutated the guard BOTH ways
over the existing suite - remove the provider consultation -> 8 red incl. the headline; capture
unconditionally -> 2 red (lapsed deposits stop expiring). Neither flipped default survives. WebApi.dll
mtime moved on every run, so nothing was read off a stale assembly.
ASYMMETRY NOT SMOOTHED OVER: mutation B yields no unauthorized capture because EventsDepositCompletionSink refuses one itself, so the sweep's OWN capture-only-on-Authorized guard is pinned only through the sink's.
Other two flag clauses (page never polls, callback still ACKs) are TRUE BY DESIGN - the sweep IS the retry. Correct the flag body, do not clear it, or it reads as three open defects.
clears_when names no fact key -> the same tool refusal that left F-GR-DELIVERY-RECORD open as bookkeeping.
END RETURN
```
