```
RETURN: L-MEALS-GRACE-PINS
brief: afeadbd7
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-modules/lanes/L-MEALS-GRACE-PINS/evidence.md (commit 34c6c103 on lane/meals-grace-pins, off feature/restaurant-modules de1e5c5e; not pushed)
log: |
  Brief confirmed by injection, not by reading: with the worker's decrement replaced by an
  unconditional SET ReservedMinor = 0, MealsExpiryGraceReconciliationTests stayed green 5/5.
  The old pins were one-sided — they caught a MISSING decrement (guard would sit at 5000) but
  not a clamped or over-sized one, since zero is what both produce against one reservation.
  All three now hold a SECOND reservation of 6000 inside the 20000 allowance, taken AFTER the
  clock moves past expiry+grace so its own expiry is ahead of the cutoff and it is no candidate.
  Guard 5000 -> 11000 -> 6000; opening 11000 asserted and held state (Bound/Reserved) asserted,
  so a held reservation that failed to take cannot pass as a correct decrement.
  RED with the clamp: both SQLite pins fail the guard read, Expected 6000 / Actual 0. Actual 0
  rather than 1000 is the clamp's own signature. GREEN clean 5/5. No --no-build anywhere.
  Nothing weakened: Assert.Equal(0,..) -> Assert.Equal(6000,..) also rejects a wrong-cap
  decrement; the bound pin now reads the guard AFTER the replay sweep. Fast tier 4357/0/12. NO SQL TIER (class=suite; sql=2 held by two foreign containers)
  so the SQL Server pin is COMPILED-ONLY — unverified. Production code untouched.
  OUT OF SCOPE, same shape on the AUTHORITY path, uncovered by L-MEALS-FLOOR-PINS as well:
  MealsReservationStateMachineTests.cs:328 and MealsStoreCancelReleaseTests.cs:137.
END RETURN
```
