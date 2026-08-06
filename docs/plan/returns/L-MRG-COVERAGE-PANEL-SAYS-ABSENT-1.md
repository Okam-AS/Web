```
RETURN: L-MRG-COVERAGE-PANEL-SAYS-ABSENT
brief: 0846564c
verdict: built
evidence: /Users/svendaneel/okam/web-mrgcovabsent/lanes/L-MRG-COVERAGE-PANEL-SAYS-ABSENT/evidence.md
log:
- REACHABLE, checked not assumed: the page renders both panels as siblings and wasteAbsent is page data; one non-test caller. Cut from the sibling's 633e637 — f40fdf3 does not hold the fact.
- ABSENCE RE-CONFIRMED at 8e2b57de (=feature/restaurant-modules): ls-tree grep -ci waste = 0; the one .cs hit is an English word in a workforce comment; no waste controller among ten Margin ones.
- THE PAIRING THAT CAUSES IT: MarginCoverageController.cs IS at that tip, so coverage answers in full and says nothing about waste -> readWasteSummary null -> "It is unknown", under the week figures.
- KEYED ON coverage.waste === null, NOT wasteUnknown: the latter is ALSO true for a block that ARRIVED with entryCount withheld — a server that HAS the capability. A measurement outranks the claim.
- MY FIRST PASS USED wasteUnknown AND WROTE A TEST BLESSING IT. The test was FLIPPED, not added. M9 runs that first pass as a mutant and reds 1; it would have shipped as a silently killed mutant.
- REACHABILITY HOLE CLOSED: createStatement ("opens the week") loaded coverage ALONE, so both panels reported on a request never sent and this state was unreachable there. Now both; M8 reds 2.
- PROVEN BY A REAL 404: new test/margin-coverage-waste-absent.test.js drives the REAL waste service over a stubbed fetch, asserting the wire before the render. The page suite mocks it and is blind.
- CREATE-PATH TESTS OPEN A WEEK WITHOUT SELECTING ONE FIRST, or selectStatement sets the flag and M8 looks equivalent while a journey goes unread — the sibling's M4 lesson applied before it bit.
- 9 MUTANTS RED (5/5/6/8/1/4/5/2/1), both files restored md5-identical; E1 RUN and logged EQUIVALENT, not credited. 633e637 127/2972/0 -> 128/2989/0, +17/-0 by NAME SET DIFF. eslint 0 err. Not pushed.
END RETURN
```
