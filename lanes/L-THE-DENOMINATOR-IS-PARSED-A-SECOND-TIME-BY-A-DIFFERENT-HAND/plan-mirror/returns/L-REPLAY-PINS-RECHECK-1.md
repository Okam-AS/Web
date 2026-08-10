```
RETURN: L-REPLAY-PINS-RECHECK
brief: 7495f30a
verdict: built
evidence: lanes/L-REPLAY-PINS-RECHECK/census.md
log:
Base VERIFIED: feature/restaurant-modules IS exactly 8e2b57de, 0 ahead; tips a1d57208 / 02684ecc /
54714dd6 all clean. Read-only: nothing edited, no suite run, no container, no ref moved.
36 same-key-retry candidates enumerated across 9 touched files, then ruled per test by reading.
4 DO NOT DISCRIMINATE; the world change is named per test in the census:
 WorkforceShiftExchangeTests.cs:250 - role link never restored, Training's M04 shape exactly.
 :284 - competitor SURVIVES (it fires on a READ, and the sibling test's Assert.Single(Awarded) at
 :203 proves it) and RevalidateAwardAsync never checks already-awarded, so a re-decide re-hits the
 index with the identical code and aggregateId.
 MealsIdempotencyRefusalTests.cs:311 - the only Meals test with no arranged fault, and no row assert.
 MealsAgreementWriterTests.cs:173 - 1-agreement/0-audit LOOK like the discriminator, hold anyway.
21 discriminate, not by luck: Meals backstops 1-8 gate only the FIRST call and build a plain host for
the retry, repairing the precondition for free; WF-rest's 3 hold under BOTH branches of "does the
competitor survive". Training's M04 has NO counterpart here - both siblings throw from inside
ReserveAsync; the live mutant is moving a stateful check IN FRONT of the reservation.
UNVERIFIED: nothing ran; WorkforceD1RaceSqlServerTests' 2 rewritten asserts have never executed.
END RETURN
```
