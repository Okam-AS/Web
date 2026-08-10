```
RETURN: L-PUBLISH-WRITES-ONE-OUTBOX-ROW
brief: 8bbabeed
verdict: fail-spec
evidence: docs/plan/lanes/L-PUBLISH-WRITES-ONE-OUTBOX-ROW/FINDING.md
spec_gap: "exactly one notification-outbox row" can only be reached by deleting a channel, contradicted by the two rows themselves - InApp/<staffId>/...:inapp and Email/ingrid@example.test/...:email over one recipient row and one inbox item
log:
SIBLING, NOT DUPLICATE: channel=InApp target=<staffId> key=...:inapp and channel=Email target=ingrid@example.test key=...:email. One recipient row, one inbox item, two channels.
The person gets ONE inbox entry + ONE e-mail. The InApp adapter is a no-op that only flips the recipient to Delivered. One loop over ChannelPlan.Plan(), not two write paths.
CAUSE f5305ced 2026-08-01: the hard-coded single InApp command was replaced by the channel plan and all 4 fast-tier assertions updated. Its own message says "SQL tier not run."
SchedulePublishSqlServerTests is Database=SqlServer, so its count line is unreachable from routine runs and read 1 for five days. Passed at 50b85657..2eeff48f, Failed at BASE-8e2b57de and 24cd4ead.
Not a SQL Server behaviour: the same test body with SeededSqlServerAsync -> SeededSqliteAsync (identical WorkforceWorld) reproduces Expected 1 / Actual 2 on SQLite.
NO MIGRATION, NO CONSTRAINT: HasIndex(LogicalDedupeKey).IsUnique() exists and is satisfied; the keys differ by the enum-derived channel suffix. L-GROWTHAUDIT-MIGRATION keeps the slot.
Nor idempotency - the commands are not retries of each other. One row means deleting the e-mail an invited, not-yet-claimed worker depends on.
FIX on lane/publish-outbox-shape @ 3bb9c039, worktree ~/okam/wt-pub-outbox off 7f8945dc, NOT pushed: the count becomes the exact channel set plus the address the external command targets.
RED->GREEN->3 MUTATIONS on the transliteration, full builds never --no-build: the brief's assertion RED (1/2), the new assertion GREEN.
M1 drop the external tier (the brief's target state) RED [InApp]; M2 drop InApp RED [Email]; M3 SMS above e-mail RED [InApp, Sms]; writer restored byte-identical, GREEN.
NOT PROVEN: the corrected assertion has never run on SQL Server - no slot. Fold it into the run verifying MIG-29; those two are the only defects on that tier.
C4: the rows agree by absence - the outbox has no actor column. The actor is on WorkforceSchedulePublication.PublishedByActorReference and the schedule.publish audit. Not a C4 money write.
TIER, my own runs in a clean detached worktree, --filter Database!=SqlServer: baseline 7f8945dc 4703/0/10; exit 3bb9c039 4703/0/10. Delta ZERO - the changed class is filtered out of both.
The launch note's 4638/0/12 is a different base (8e2b57de, pre-stack-merge); not comparable, not used.
No container started, stopped or entered; regenerated artifacts/journeys/ev-dietary restored, not committed.
END RETURN
```
