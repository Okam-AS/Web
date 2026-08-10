```
RETURN: L-THE-EVENTS-OUTBOX-BACKLOG-HAS-NO-CEILING
brief: b14cbed6
verdict: built
evidence: docs/plan/artifacts/events-outbox-retention.md, force-added past .gitignore:111 and confirmed tracked
log:
THE NUMBER: a busy venue accrues about 650 outbox rows in a month withheld, and the drain clears that in roughly a minute and three quarters. The choice is defensible on volume.
Accrual is not per day or per guest. Exactly two call sites enqueue, each idempotent on a key that fixes granularity: one row per proposal VERSION sent, one per deposit request issued.
So rows scale with bookings, not time. At 3 rows a booking: 5 bookings a week is ~65 rows a month, 20 is ~260, 50 is ~650. The 3 is a labelled assumption and the arithmetic is exposed.
Clearing rate read from constants: the service polls every 15 seconds at batch size 100, overriding its own DefaultBatchSize of 50. That is 400 rows a minute.
So 650 rows is 7 drains. This is a queue, not a bomb, and that is the operator answer.
THREE NEAR-BOUNDS THAT DO NOT BIND: MaxAttempts fires on attempts a withheld row never has, backoff reschedules rather than removes, and enqueue idempotency stops duplicates rather than accrual.
THE GUEST QUESTION ANSWERS DIFFERENTLY, and this I did not expect: a month of withholding does NOT give one guest a month of notifications.
TargetReference is the event's own ContactEmail and rows are per event, so a guest gets their own booking's two to four messages, late - bounded by their activity, not by the withheld duration.
Nothing in the drain or the email adapter checks a row's age or whether its target is current. But the tokenised page refuses a superseded version - EventsProposalService.cs:415 throws.
So a month-old link lands on a refusal, not a stale price. The guest cost is confusion, not money, and that decides which end a repair belongs at.
WHY THE WORKFORCE BOUND DOES NOT TRANSFER: that bound retires a row once the week it publishes has ended, because a schedule notification for a past week is meaningless.
A proposal link is not meaningless a month later - it is what the guest awaits, the stated reason rows are kept. And workforce publications recur on a clock while Events rows accrue on human action.
THE ORDERING PROPERTY ALREADY HAS AN ARM: EventsDispatchStoreLeverTests.A_dark_stores_backlog_does_not_starve_a_store_that_is_switched_on, one of nine, all green.
No arm reds when a ceiling is broken because no ceiling exists - there is no threshold a test could cross. I said so rather than manufacturing one.
Reported, not repaired. No tier run, nothing executed, no trunk moved, backend 0 dirty, nothing pushed. The brief names the trunk ada218783; it is 28e60e6b8, moved by two landings since.
END RETURN
```
