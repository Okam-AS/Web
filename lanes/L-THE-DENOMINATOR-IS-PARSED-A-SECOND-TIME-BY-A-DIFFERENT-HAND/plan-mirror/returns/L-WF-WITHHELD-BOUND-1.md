```
RETURN: L-WF-WITHHELD-BOUND
brief: 72f7445f
verdict: built
evidence: /Users/svendaneel/okam/wt-wfwithheld @ 74405b34 (lane/wf-withheld-bound off feature/restaurant-modules 569887a5); pin WebApi.Tests/Workforce/WorkforceNotificationBacklogBoundTests.cs; four-state record lanes/L-WF-WITHHELD-BOUND/mutation_check.py + trx/
log:
Both halves built. At most one live push row per worker per store, and none for weeks already over.
1) PublishAsync tx: a superseded publication's Pending/Failed/Withheld outbox rows -> new terminal Superseded, staged on the same SaveChanges. Leased excluded: a dispatcher is mid-attempt and writes over it, then returns Pending/Failed/Withheld and the next publish cancels it.
2) Dispatcher withhold branch: notice.RangeEndUtc <= now -> DeadLettered + DeadLetteredAtUtc, LastError "WithheldWeekEnded:<adapter label>", AttemptCount left 0, recipient NOT flipped to Failed.
Distinction kept: waiting = 0 attempts + a reason naming the ended week; broken = 5 attempts. Superseded is NOT on the failures surface; the aged-out row IS, asserted via the routed NotificationFailures action, not the service.
Schema verified myself: Status is EnumToStringConverter with HasMaxLength(32) and the migration column is nvarchar(32); "Superseded" is 10 chars. No migration authored, none needed.
Non-vacuity, statuses by value and nulls by equality: baseline green; M1 supersede-cancel removed -> RED line 79; restored -> green; M2 age-out removed -> RED line 106; restored -> green. Per-test output printed for all five states.
Both cases reachable, not assumed: two publications for one week (successor draft, ids differ) and a clock set to the publication's own RangeEndUtc.
Control test pins the other outcome: a week still ahead stays Withheld with 0 attempts and null DeadLetteredAtUtc and is re-polled 5 min later; a boundary probe at rangeEnd-1s is still held.
Suites, container-free, no container started, filter Database!=SqlServer: full tier 4631 passed / 0 failed / 12 skipped; Workforce 652/0/3 as the final state. No failure failed to reproduce.
Sibling overlap with L-WF-PUSH-STILL-LIES on two files: WorkforceNotificationDispatcher.cs (mine = withhold branch, theirs = FlipRecipientAsync + class doc) and WorkforceSchedulePublishService.cs (mine = after the recipient loop plus one LogicalDedupeKey line, theirs = routes hoist + recipient Channel; adjacent, non-overlapping). My pin is a NEW test file, so no collision on WorkforceNotificationTransportTests.cs.
Incidental, not mine: a full-tier run rewrites artifacts/journeys/ev-dietary/run-sheet.{md,json} with today's date. Reverted, not committed.
END RETURN
```
