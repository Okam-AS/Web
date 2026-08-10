# L-PUBLISH-WRITES-ONE-OUTBOX-ROW — the shape of the second row

brief 8bbabeed · measured 2026-08-06 · verdict **fail-spec**

## The answer to the question the brief asked first

**Differently-shaped sibling. Not a duplicate, and not a dedupe.**

The two rows one publish writes, dumped off a real publish through the production service (below):

```
RECIPIENT PERSON  login=<null>  email=ingrid@example.test  phone=+4740000001  state=Invited
PUBLICATION       recipients=1  inboxItems=1
OUTBOX ROW  channel=Email  target=ingrid@example.test                  dedupeKey=wf.pub:<pub>:<staff>:email
OUTBOX ROW  channel=InApp  target=30000000-0000-0000-0000-000000000002 dedupeKey=wf.pub:<pub>:<staff>:inapp
PAYLOADS IDENTICAL ACROSS ROWS = True
DEDUPE KEYS DISTINCT           = True
```

Different `Channel`, different `TargetReference`, different `LogicalDedupeKey`. One recipient row, one
inbox item, two transport commands. The payload is deliberately the same object — a §13.4 safe summary
(identifiers + week, no wage) composed once per recipient and handed to whichever transport picks the
command up.

**What the person receives is one in-app inbox entry and one e-mail.** Not two copies of one message.
The `InApp` command is not itself a message: `WorkforceInAppNotificationDelivery` is a no-op adapter whose
only job is to let the dispatcher flip the recipient's `DeliveryState` to `Delivered` — the canonical
delivery for that channel is the `WorkforceInboxItem`, which is written once. The `Email` command is the
real second message, and it is the one an invited-not-yet-claimed worker depends on to learn their
schedule is out at all.

There is also not "one write path firing twice". There is one loop —
`foreach (var route in WorkforceNotificationChannelPlan.Plan(...))` in
`Services/Workforce/WorkforceSchedulePublishService.cs` — emitting one command per channel that can reach
that recipient.

## Why the row count is 2 and the assertion says 1

`f5305ced` (2026-08-01, "Workforce: deliver a published schedule to the worker's phone") replaced a
hard-coded single `InApp` command per recipient with `WorkforceNotificationChannelPlan`: the in-app inbox
always, plus exactly ONE external tier — Push if the person has claimed a login, else Email, else SMS.
The seeded `WorkforceWorld` worker is `WorkerStaffMemberId → InvitedPersonId`: no `ApplicationUserId`,
`ContactEmail = "ingrid@example.test"`, so the plan is `[InApp, Email]`.

That commit updated **every** assertion of this fact it could see:

| file | changed to |
| --- | --- |
| `WebApi.Tests/Workforce/ScheduleAuditLedgerTests.cs` | `Assert.Equal(1, …Count…)` → contains-InApp + contains-non-InApp |
| `WebApi.Tests/Workforce/WorkforceEndToEndJourneyTests.cs` | `Assert.Single(outbox)` → same pair |
| `WebApi.Tests/Workforce/WorkforceScheduleDeliveryTests.cs` | arrange now strips the worker's contact details so the drain tests keep exactly one command |
| `WebApi.Tests/Workforce/WorkforceNotificationChannelTests.cs` | **new** — pins all four recipient shapes |

It did not touch `WebApi.Tests/Workforce/SchedulePublishSqlServerTests.cs`, and its own message says why:
**"SQL tier not run."** That file is `[Trait("Database", "SqlServer")]`, so its
`Assert.Equal(1, await read.WorkforceNotificationOutbox.CountAsync(o => o.StoreId == …))` at line 60 is
unreachable from every routine run. It has been stale for five days and nothing could see it.

Receipt trail, from `artifacts/tests/` on `integration/mig-stack-merge` @ `7f8945dc`:

| SQL-tier run | this test |
| --- | --- |
| `50b85657`, `1da15fb1`, `23f6bbeb`, `2eeff48f` (all pre-`f5305ced`) | Passed |
| `BASE-8e2b57de-sql-allfailing.trx` (integration branch alone) | Failed — Expected 1 / Actual 2 |
| `24cd4ead-sql-tier.trx` (merge tip) | Failed — Expected 1 / Actual 2 |

So the red is not merge-induced, and it is not a SQL Server behaviour. It is a stale assertion.

## Why it is only visible on a real database — and why that is misleading here

It is not visible on the fast tier because the *test* is SQL-only, not because the *behaviour* is. The
writer is provider-independent EF `Add` + `SaveChanges`, and `WorkforceHarness.CreateSqliteAsync` and
`CreateSqlServerAsync` seed the identical `WorkforceWorld` (`WorkforceHarness.cs:72` and `:106`). I proved
that by transliterating the failing test body verbatim, swapping only `SeededSqlServerAsync` for
`SeededSqliteAsync`, and reproducing the identical failure on SQLite:
`Assert.Equal() Failure / Expected: 1 / Actual: 2`.

Diagnostic source kept at `lanes/L-PUBLISH-WRITES-ONE-OUTBOX-ROW/DIAGNOSTIC.cs` (also at
`../wt-pub-outbox/.lane/DIAGNOSTIC.cs.kept`). It was never committed to a shared branch and was removed
from the test project before the exit run.

## Why the brief's exit criterion cannot be met

> a single publish writes exactly one notification-outbox row

The only way to get to one row is to delete a channel. Mutation **M1** does exactly that — it restores the
pre-`f5305ced` writer (in-app only, no external tier), which is precisely the brief's target state — and
the world it produces is one where **the invited worker is never e-mailed that their schedule was
published**. That is the harm the launch note anticipated: "suppressing one of them may remove a message
somebody is supposed to get."

Neither of the other two candidate fixes applies either:

- **Idempotency at the write** — nothing to make idempotent. The two commands are not a retry of each
  other; they are different channels selected once from one plan.
- **A unique constraint** — one already exists and is already satisfied.
  `Helpers/ApplicationDbContext.cs:3032` declares
  `b.HasIndex(x => x.LogicalDedupeKey).IsUnique()`, and the two keys differ by the channel suffix the plan
  derives from the enum (`:inapp`, `:email`). Any constraint coarse enough to reduce these to one row
  would fail the whole publication transaction on the second insert.
  **No migration is needed and the migration-author slot is not wanted** — `L-GROWTHAUDIT-MIGRATION` keeps
  it.

## The corrective change (applied on a lane branch, NOT pushed)

`WebApi.Tests/Workforce/SchedulePublishSqlServerTests.cs`, replacing the single stale count line. The
audit-event assertion moves up one line so the outbox block stays contiguous.

```csharp
var outbox = await read.WorkforceNotificationOutbox.Where(o => o.StoreId == WorkforceWorld.StoreId).ToListAsync();
Assert.Equal(
    new[] { WorkforceNotificationChannel.InApp, WorkforceNotificationChannel.Email },
    outbox.Select(o => o.Channel).OrderBy(c => c).ToArray());
Assert.Equal(
    (await read.WorkforcePersons.SingleAsync(p => p.WorkforcePersonId == WorkforceWorld.InvitedPersonId)).ContactEmail,
    outbox.Single(o => o.Channel == WorkforceNotificationChannel.Email).TargetReference);
Assert.Equal(outbox.Count, outbox.Select(o => o.LogicalDedupeKey).Distinct().Count());
```

Asserting the channel SET and the address each command is aimed at, rather than a count, is what makes it
say "two different messages to one person" — and is what reds both when a channel is dropped and when one
is added, naming which.

### Red → green → mutations, all on the provider-independent transliteration

Full `dotnet test` builds every time (never `--no-build`), restores by `cp` so mtime advances — the
CLAUDE.md stale-binary trap. M1/M2/M3 each produced a *different* message, which is itself proof the
assembly recompiled between them.

| step | result |
| --- | --- |
| brief's assertion (`Assert.Equal(1, rows.Count)`) on SQLite | **RED** `Expected: 1 / Actual: 2` — the SQL-tier failure reproduced |
| proposed assertion, writer untouched | **GREEN** 1/1 |
| **M1** drop the external tier from `Plan()` (= the brief's target state) | **RED** `Expected: [InApp, Email] / Actual: [InApp]` |
| **M2** drop the `InApp` route from `Plan()` | **RED** `Expected: [InApp, Email] / Actual: [Email]` |
| **M3** promote SMS above e-mail in `Plan()` | **RED** `Expected: [InApp, Email] / Actual: [InApp, Sms]` |
| writer restored (`git diff Services/` empty), assertion re-run | **GREEN** 1/1 |

Logs in this directory: `diag-red.summary.txt` (carries the row dump above), `diag-green.summary.txt`,
`mut-M1.log`, `mut-M2.log`, `mut-M3.log`, `diag-green-final.summary.txt`. The two full-tier logs are
~3.7 MB each and were reduced to `baseline-7f8945dc.summary.txt` / `exit-tier.summary.txt`; the originals
are at `/Users/svendaneel/okam/wt-pub-outbox/.lane/`.

### What is NOT proven

**The corrected assertion has never been executed against SQL Server.** I hold no SQL slot (both are with
`L-GROWTHAUDIT-MIGRATION` and `L-COMPOSE-AND-RUN-THE-STACK`), one foreign `mssql/server:2022-CU14`
container was running throughout, and I started, stopped and exec'd into nothing. The assertion is
provider-independent by construction and was proved on SQLite against the identical seeded world, but the
green on the migrated catalog is owed. Whoever next holds a SQL slot should fold this into the same run
that verifies MIG-29 — the two reds are the only two defects on that tier.

## C4 — do the two rows agree about the actor?

They agree, trivially and by absence: `Entities/Workforce/WorkforceNotificationOutbox.cs` has **no actor
column at all**, so neither row names the publisher. The actor is carried by
`WorkforceSchedulePublication.PublishedByActorReference` (`= caller.StaffMemberId`, verified in the dump:
`publishedBy=30000000-0000-0000-0000-000000000001`, the manager) and by the `schedule.publish` audit
event, and each outbox command is joined to it by the `publicationId` in its payload. A notification
outbox command is not one of the writes C4 enumerates (deposit, capture, refund, settlement or statement
line, funded order, timesheet cost), so this is not a C4 violation. Worth naming anyway, because the SMS
tier costs money per message and its command carries no actor of its own.

## The structural finding, larger than this row

A commit changed a writer, correctly updated all four assertions of that fact that its tier could see, and
could not see the fifth because it lives behind a `Database=SqlServer` trait — asserting behaviour that
has nothing to do with SQL Server. Nothing in the tree forces a provider-independent fact asserted in a
SQL-only test to be re-checked when the writer moves.

The bound on how far this spread: the merge receipt re-ran all nineteen SQL-failing classes at
`8e2b57de` alone and got the same set test-for-test, and 20 of the 22 reds are the absent
`GrowthAuditEvents` table. This was the **only** other red in 587 SQL-tier tests, so no second stale
assertion is currently observable. Among the eight files that touch `WorkforceNotificationOutbox`, only
`SchedulePublishSqlServerTests` and `WorkforceW2MigrationLineageTests` are SQL-traited, and the latter is
a lineage test failing for the `GrowthAuditEvents` reason.

## Suite evidence

Non-SQL tier only, `dotnet test WebApi.Tests/WebApi.Tests.csproj -c Debug --filter "Database!=SqlServer"`,
in my own clean detached worktree `/Users/svendaneel/okam/wt-pub-outbox` off
`integration/mig-stack-merge` @ `7f8945dc`.

| run | passed / failed / skipped |
| --- | --- |
| baseline, clean checkout of `7f8945dc` | **4703 / 0 / 10** (7m33s) |
| exit, fix applied (`3bb9c039`) | **4703 / 0 / 10** (7m06s) |

Delta accounted for test by test: **zero**. The only file changed is
`SchedulePublishSqlServerTests.cs`, whose class carries `[Trait("Database", "SqlServer")]` and is
therefore excluded by the `Database!=SqlServer` filter in both runs. No test was added, removed or
renamed on this tier. The baseline matches the merge receipt's own "Fast 4703/0/10 at 24cd4ead" exactly.

The launch note's 4638/0/12 is a **different base** — `feature/restaurant-modules` @ `8e2b57de`, before
the nine-migration stack merged. It is not comparable to a run at `7f8945dc` and was not used.

The `dotnet test` sweep regenerated `artifacts/journeys/ev-dietary/{run-sheet.json,run-sheet.md}`
(another lane's artifact, timestamps only) — restored with `git checkout --`, never committed.
