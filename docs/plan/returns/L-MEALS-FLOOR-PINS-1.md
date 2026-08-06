RETURN: L-MEALS-FLOOR-PINS
brief: a9e261dc
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-mealsfloor/lanes/L-MEALS-FLOOR-PINS/evidence.md (commit 5a254d72 on lane/meals-floor-pins, off feature/restaurant-modules de1e5c5e; not pushed)
log: |
  Brief confirmed by injection, not by reading: a decrement added to the authority's
  already-released early return left both classes green at 31/31. Two causes — neither pin
  read the guard after the replay, and had it, the guard sits at 0 where the release path's
  own `ReservedMinor - cap >= 0` predicate matches zero rows.
  Each pin now holds a SECOND reservation of 6000 inside the 20000 allowance (bound to
  another order in the store-cancel pin; an unbound quote in the state-machine pin).
  Guard 11000 -> 6000 -> 6000; a repeat 5000 decrement lands at 1000, clear of the floor.
  RED with the bug: both fail on the new post-replay ledger read, Expected 6000 / Actual
  1000 (red-with-mutant.txt). GREEN with it removed, 31/31 (green-clean.txt). 1000 =
  6000-5000 is itself proof the injected decrement ran on that path. Rebuild freshness
  checked against the CLAUDE.md --no-build staleness trap.
  Nothing weakened: Assert.Equal(0, ...) became Assert.Equal(6000, ...), which zero could
  not distinguish from a zeroed guard — the pins now also catch clamp-to-zero (Actual: 0).
  Fast tier 4357/0/12 skipped. No SQL tier (Docker down). Production untouched, git status
  clean but for the two test files; MealsFundingAuthority control flow not modified.
  FOUND, OUT OF SCOPE: MealsExpiryGraceReconciliationTests (3 pins, lines 47/83/186) reads
  ReservedMinor==0 against one reservation, over MealsReconciliationWorker's own copy of the
  floored decrement (lines 131-137). Proved, not asserted: swapping that UPDATE for an
  unconditional SET ReservedMinor = 0 left the class green 5/5. Same fix shape. Its
  double-sweep case is NOT the same defect — an unfloored counter carries idempotency there
  and the candidate scan excludes Released rows. Cleared with reasons: capture/reversal
  CapturedMinor==0 pins (no floor; the CHECK throws), ProjectionRebuild (already multi-
  reservation), CheckpointReplay (pure fold), and every Assert.All fold in Meals.
END RETURN
