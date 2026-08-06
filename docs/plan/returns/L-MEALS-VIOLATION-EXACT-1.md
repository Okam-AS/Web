```
RETURN: L-MEALS-VIOLATION-EXACT
brief: 4fe259d6
verdict: built
evidence: lanes/L-MEALS-VIOLATION-EXACT/mutation-log.md
log:
FIX: MealsDbViolations.IsUniqueViolation SQLite arm drops bare SQLITE_CONSTRAINT 19 (the whole family: NOT NULL
  1299, CHECK 275, FK 787); only extended 2067/1555 + "UNIQUE constraint failed" now pass.
SQLSERVER ARM: verified for Meals INDEPENDENTLY - 2627/2601 only, rejects 547/515 and the 50041/2/3 trigger
  band; untouched. IsDeterministicConstraintViolation KEEPS 19 on purpose - that predicate wants the family.
PIN: WebApi.Tests/Meals/MealsConstraintViolationExactnessTests.cs, 5 facts, BOTH directions on the funding bind
  ValidateAndBindAsync: a uniqueness clash still denies MEALS_RESERVATION_NOT_FOUND; a NOT NULL failure now
  denies deny-closed MEALS_MODULE_UNAVAILABLE. Outcome read from the MEALS_* reason code BY VALUE (the enum is
  Denied both ways), actor asserted by value, HasFired proves the catch ran rather than a pre-check.
RED/GREEN: fixed 5P -> bare 19 back 2F/3P -> restored 5P -> re-mutated 2F/3P -> restored 5P; full build each
  state, never --no-build, dll mtime advanced. Red: Expected Not "MEALS_RESERVATION_NOT_FOUND", Actual it.
HONESTY: clash is production-shaped (rival attribution staged in the bind's own TOCTOU window); NOT NULL is
  unreachable in production so that UPDATE is the test's, on the bind's own connection+transaction - 19, 1299,
  table-naming message all SQLite's; table C1-safe (mutable). SQL OWES 515/547 as faults + 2601 still mapping.
TIER "Database!=SqlServer" 4634P/0F/12S 6m20s, NO container started; lane/meals-violation-exact @ 13cd9f18,
  parent 569887a5 unmoved. NOT FIXED: Workforce still has 19 here (cdb4c66c unmerged, BOTH must land) + 2 Margin.
END RETURN
```
