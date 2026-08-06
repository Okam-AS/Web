# L-WF-PUSH-LAND - merge receipt

brief 0a47dda6 - 2026-08-04 - OkamAPI (backend). Local only. Nothing pushed. No migration authored.
No container started, stopped, inspected or killed.

## What merged

One merge, one tip, two lanes:

    569887a5   merge 26599c6e + lane/wf-push-silent (991c21f6)   0 conflicts   <- LANDED

`git log -1 --format=%P` on the landed commit returns `26599c6e 991c21f6`, so it is a true
two-parent merge. `feature/restaurant-modules` is at `569887a5`, local, unpushed. There is no
`origin/feature/restaurant-modules`.

`lane/wf-push-notify` rides in as an ancestor, which is the whole point of this lane: merging the
silent tip brings the delivery lane with it, and neither can land without the other.

## Ancestry - measured before anything else, not inherited from the brief

    git merge-base --is-ancestor lane/wf-push-notify  lane/wf-push-silent          YES
    git merge-base --is-ancestor lane/wf-push-notify  feature/restaurant-modules   NO
    git merge-base --is-ancestor lane/wf-push-silent  feature/restaurant-modules   NO
    git merge-base --is-ancestor feature/restaurant-modules lane/wf-push-silent    NO

    git log --oneline feature/restaurant-modules..lane/wf-push-silent
      991c21f6  Workforce: a push that reached no device stops counting as delivered
      f5305ced  Workforce: deliver a published schedule to the worker's phone

    git log --oneline feature/restaurant-modules..lane/wf-push-notify
      f5305ced  Workforce: deliver a published schedule to the worker's phone

    git merge-base lane/wf-push-silent feature/restaurant-modules = d458e1cf

Exactly as the brief states, and it had NOT aged: `f5305ced` is the parent of `991c21f6`, both are
off the integration branch, and the honesty fix sits above the delivery lane. Two commits arrive,
not one. The brief's ancestry claim is confirmed by git rather than taken on trust.

(zsh word-split trap noted for the next lane: `for pair in "a b"; do set -- $pair; ...` silently
ate the second argument and made `merge-base --is-ancestor` print its usage instead of answering.
Every check above was re-run explicitly, one pair per line, and read.)

## The tip moved under this lane, and it was re-measured rather than assumed

The brief names `5df07afa`, and that is where this lane started. It was re-read immediately before
merging and had become `26599c6e`:

    5df07afa -> 26599c6e   L-INVOICE-AUTHORIZE-LAND, three commits:
      d7ffdae9  The five invoice routes that create and mail money take a caller
      21510917  the invoice routes stop being anonymous on the branch
      26599c6e  merge receipt for the invoice authorization landing

    git merge-base --is-ancestor 5df07afa 26599c6e   YES   (a fast-forward, not a fork)

Rather than carry the 5df07afa baseline forward as if it were the landing base, the worktree was
moved to `26599c6e` and the base was measured AGAIN there. Both numbers are reported below; the
delta is computed against the base this merge actually landed on.

The overlap and trial-merge were both recomputed against the new tip and were unchanged.

## Where the work was done

Worktree `/Users/svendaneel/okam/wt-wfpushland`, created by me with
`git worktree add --detach 5df07afa`. `/Users/svendaneel/okam/OkamAPI-modules` (lane branch, live
WebApi process) was never entered. `/Users/svendaneel/okam/OkamAPI-wfpushsilent` (the parent lane's
worktree, holding `lane/wf-push-silent`) was read with `git`, never written to.

`feature/restaurant-modules` was checked out in NO worktree at landing time
(`git worktree list --porcelain | grep -c "branch refs/heads/feature/restaurant-modules"` = 0), so
moving the ref left no worktree holding a stale index.

`git status --porcelain` was asserted EMPTY before each build and before the merge. The wire tier
dirties two tracked files, `artifacts/journeys/ev-dietary/run-sheet.json` and `.md`; both were
restored with `git checkout --` after every run and never committed. No `git add -A` was used - the
only write to the repository was the merge itself, which stages nothing by hand.

## Conflicts: ZERO - and that is exactly why the merged bodies were read

Trial-merged with `git merge-tree --write-tree` BEFORE touching anything, against both tips:

    5df07afa x lane/wf-push-silent  ->  tree 7032d424   0 conflicts
    26599c6e x lane/wf-push-silent  ->  tree c3fb7aa5   0 conflicts

The real merge produced tree `c3fb7aa5`, byte-for-byte the tree the trial predicted.

A zero conflict count is not a verification, so the overlap was computed and every overlapping file
read. Only TWO paths are touched by both sides:

    comm -12 (d458e1cf..991c21f6) (d458e1cf..26599c6e)
      Program.cs
      WebApi.Tests/Wire/WireHost.cs

- **`Program.cs`** - the merged body is the tip's, unchanged, PLUS one comment block and the three
  adapter registrations (Push / Sms / Email). `diff` against `26599c6e:Program.cs` shows additions
  only, no deletions. Nothing the tip added survived by luck: the Growth Postmark client, the
  `DocumentRenderExceptionMiddleware`, the Growth mail-provider selection, the audit ledger, the
  two rate limiters, `AddMemoryCache`, `ITrainingEvidenceService` and the removed
  `ApplicationInsightsLoggingMiddleware` are all still exactly as the tip left them. All FOUR
  `IWorkforceNotificationDelivery` registrations (InApp, Push, Sms, Email) appear once each, in one
  block - not doubled, not dropped.
- **`WebApi.Tests/Wire/WireHost.cs`** - the merged body is the tip's PDF-renderer substitution
  (`SubstituteDocumentRenderer`, `ApplicationDocumentRendererType`, `RecordingDocumentRenderer`)
  PLUS the incoming `ClientConfigurationServiceWithoutPush.IsNotificationHubConfigured(...) => false`.
  A union; neither side reverted.

The RECEIPT TRAP did not arise: `git diff --name-only 26599c6e 569887a5 -- artifacts/` is EMPTY.
Neither incoming commit touches `artifacts/tests/README.md`, so there was nothing to resolve there -
checked rather than assumed, because it has now fired on seven merge lanes.

Every one of the 29 files only the incoming side touches is byte-identical to `991c21f6` in the
merged tree (`git rev-parse 991c21f6:<f>` = `git rev-parse HEAD:<f>` for all 29, including
`WorkforcePushNotificationDelivery.cs`, `NotificationService.cs`, `INotificationService.cs`,
`WorkforceNotificationDispatcher.cs` and `WorkforceNotificationTransportTests.cs`). No incoming
change was silently reverted by the merge.

## HAZARD 1 - a zero-conflict merge that does not compile. Checked by BUILDING, first.

The merge commit was built explicitly before any tier was run:

    dotnet build WebApi.Tests/WebApi.Tests.csproj      Build succeeded.  0 Error(s), 713 Warning(s)

`--no-build` appears ZERO times in every log this lane produced (`baseline-5df07afa.log`,
`base-26599c6e.log`, `build-569887a5.log`, `merged-569887a5.log`).

The specific shape of this hazard was also checked ahead of the build, because this merge adds
interface members and that is precisely how a clean merge breaks:

- `IClientConfigurationService` gains `IsNotificationHubConfigured`. Its implementers on the tip are
  `Services/ClientConfigurationService.cs`, `WebApi.Tests/Triage_mcpshopping_McpCheckoutTests.cs`
  (`StubClientConfigurationService`) and `WebApi.Tests/Wire/WireHost.cs`
  (`ClientConfigurationServiceWithoutPush`) - all three, and only those three. The incoming commit
  updates all three. No FOURTH implementer appeared on the tip: the tip's only change to any file
  naming these interfaces is `WebApi.Tests/Observability/OperationalNotificationPiiTests.cs`, and
  that is an `IUserService` double gaining `InvalidateEmailConfirmationCodeAsync`, unrelated.
- `INotificationService` gains `HasConsumerPushRegistrationAsync`. Its only implementer on the tip
  is `Services/NotificationService.cs`; the test double `FakePushTransport` arrives in the same
  commit already implementing it.

Assembly freshness at the merge commit (so no tier could pass over a stale binary):

    newest tracked .cs   1785805307
    WebApi.dll           1785805337
    WebApi.Tests.dll     1785805344

Both assemblies newer than every tracked source.

## Tier - a baseline I measured myself, at the tip the merge landed on

All runs in my own worktree, same command, no `--no-build`, container-free tier only:

    dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"

Never `FullyQualifiedName!~SqlServer`. No SQL tier was run.

    BASELINE  clean 5df07afa   Failed 0, Passed 4571, Skipped 12, Total 4583   5 m 15 s  exit 0
    BASE      clean 26599c6e   Failed 0, Passed 4597, Skipped 12, Total 4609   5 m 13 s  exit 0
    MERGED    569887a5         Failed 0, Passed 4629, Skipped 12, Total 4641   5 m 42 s  exit 0

    DELTA over the base this merge landed on:  +32 total, +32 passing, 0 failed,
    skipped unchanged at 12.

Neither lane's own number was carried forward. The parent lane measured its base at `f5305ced`
(4319 passed) - a different commit from the integration tip, and it is not used here for anything.
The 4571 at `5df07afa` matches the figure the brief calls audited, which is a cross-check on the
worktree, not a substitute for measuring.

## Discovered-test-set diff - names, not a net delta

Both runs emitted a `.trx`; the `testName` sets were compared as multisets.
Full lists in `testset-diff.txt`.

    base 26599c6e   4609 results
    merged 569887a5 4641 results

    REMOVED from the discovered set:   0
    ADDED to the discovered set:      32

Nothing went quiet. The skip list is identical name-for-name, 12 = 12, with no member changed:

    EventsDepositRailJourneyGapTests (Dintero, Stripe), GrowthPostmarkSandboxSmokeTests,
    MealsConsumerSurfaceJourneyGapTests (x2), MealsInvitationIdentityBindingTests,
    SurfboardCashSplitSmokeTests, GrowthWebhookAuthWireTests (x2),
    WorkforceEndToEndJourneyTests (WFJ11, WFJ14, WFJ15)

The 32 added cases are exactly the two new test files and nothing else, and the arithmetic closes:

    [Fact]/[Theory] attributes under WebApi.Tests   26599c6e 4370  ->  569887a5 4396   = +26 methods
    WorkforceNotificationChannelTests    8 methods (7 Fact + 1 Theory x 6 InlineData) = 13 cases
    WorkforceNotificationTransportTests 18 methods (17 Fact + 1 Theory x 2 InlineData) = 19 cases
                                                                          13 + 19     = 32 cases

+26 methods expanding to +32 cases, matching the tier exactly. No pin lost, none duplicated, and the
two modified test files (`WorkforceScheduleDeliveryTests.cs`, `ScheduleAuditLedgerTests.cs`) neither
added nor removed a case - which the REMOVED=0 line is what actually proves.

## The two behaviours, confirmed AT the merge commit by name

Read out of the merge commit's own `.trx`, not inherited from either lane:

    PASSED  WorkforceNotificationTransportTests.A_push_to_a_worker_with_no_registration_is_recorded_
            failed_not_sent(deviceRegistered: True,  expectedStatus: Sent,   expectedLastError: null,
                            expectedAttemptCount: 0, expectedSends: 1, expectedRecipientState: Delivered)
    PASSED  ... (deviceRegistered: False, expectedStatus: Failed, expectedLastError: "NoPushRegistration",
                 expectedAttemptCount: 1, expectedSends: 0, expectedRecipientState: Pending)

One Theory, one route, ONE variable - registration present. Both arms survive the merge.

    PASSED  A_store_awaiting_its_push_credential_does_not_read_like_a_store_whose_push_is_broken
    PASSED  The_backlog_a_missing_push_credential_held_drains_when_the_credential_lands
    PASSED  An_unregistered_worker_dead_letters_and_the_operator_is_told_which_worker_and_why
    PASSED  A_throwing_registration_probe_keeps_the_row_and_leaks_nothing

The withheld-vs-dead-lettered pair and the presence arm all green at `569887a5`.

## TAG CONSTRUCTION - checked by name. One place, and it stayed one.

    git grep -n '"userId:"' 569887a5 -- '*.cs'
      Services/NotificationService.cs:146                    <- ConsumerTag(userId), the ONE place
      Controllers/ConsumerNotificationController.cs:66       <- the REGISTRATION side

    git grep -n 'ConsumerTag' 569887a5 -- '*.cs'
      Services/NotificationService.cs:121   send   .SendTemplateNotificationAsync(..., ConsumerTag(userId), ct)
      Services/NotificationService.cs:135   probe  .GetRegistrationsByTagAsync(ConsumerTag(userId), 1, ct)
      Services/NotificationService.cs:144   private static string ConsumerTag(string userId)

The probe and the send call the SAME private helper, so they cannot address different audiences.
The merge did NOT produce a second tag construction on that path - which is the defect the brief
told me to look for.

The one other `"userId:"` literal, `ConsumerNotificationController.cs:66`, is the registration side
(the device writing its own tag). It is byte-identical to the tip
(`git rev-parse 26599c6e:Controllers/ConsumerNotificationController.cs` = the merged blob), predates
both lanes, and is the third party the helper's own comment names. It is not a duplicate of the
send/probe construction and this merge did not introduce it.

No type lands twice: each of the nine types the merge adds or touches
(`WorkforceNotificationDeliveryOutcome`, `WorkforceNotificationOutboxStatus`,
`WorkforceSchedulePublicationNotice`, `WorkforceNotificationChannelPlan`,
`WorkforceNotificationComposer`, and the four channel adapters) is declared in exactly one file in
the whole merged tree.

## FAKE TRANSPORT - checked by name. The pin is NOT vacuous.

`FakePushTransport` is declared once, in `WorkforceNotificationTransportTests.cs`, and its send is
the merged tree's:

    public Task SendConsumerNotificationOrThrowAsync(NotificationHub type, string userId, ...)
    {
        if (ThrowOnSend != null) { throw ThrowOnSend; }

        // Deliberately NOT conditioned on Registered: Azure Notification Hubs accepts a send whose
        // tag expression matches no registration and returns normally.
        Sent.Add((userId, message));
        return Task.CompletedTask;
    }

`Registered` is read in exactly one place in that class - `HasConsumerPushRegistrationAsync` - and
never by the send. So the send SUCCEEDS for an unregistered tag, which is the real hub behaviour and
the whole defect: delete the probe and the unregistered arm of the Theory goes red rather than
passing on a fake that throws. No fake that throws for an unregistered tag was restored by the merge.

`HasConsumerPushRegistrationAsync` additionally throws if it is ever reached with `Configured = false`,
so the "no credential" arm cannot silently become a probe against a hub that has no credential.

## No migration - verified, not assumed

    git diff --name-only 26599c6e 569887a5 -- Migrations/ ModelBuilders/ Helpers/ApplicationDbContext.cs
      (empty)

`WorkforceNotificationOutbox.Status` is already a string column:

    Helpers/ApplicationDbContext.cs:2747
      b.Property(x => x.Status).HasConversion(new EnumToStringConverter<WorkforceNotificationOutboxStatus>())
                               .HasMaxLength(32);

`Withheld` is 8 characters into an `nvarchar(32)`. No DDL, no `OnModelCreating` index or constraint
added, C2 untouched. This lane authored nothing in `Migrations/`.

## Constraints

- **C1** - no `UPDATE`/`DELETE`/raw SQL against an append-only table anywhere in `d458e1cf..991c21f6`
  (grepped for `ExecuteSqlRaw`, `ExecuteSqlInterpolated`, `DELETE FROM`, `UPDATE ... SET`: none).
  The dispatcher mutates `WorkforceNotificationOutbox`, which is a work queue and carries no
  append-only guard; the immutable per-recipient delivery record is not written by this path.
- **C3** - reachability lands with the code and was already whole: the four adapters are registered
  in `Program.cs` (verified in the MERGED body, one line each), the probe rides the already-registered
  `INotificationService`, and the new `Withheld` status flows out through the existing routed action
  `GET /workforce/stores/{storeId}/schedules/notification-failures`. No new unreachable service.
- **C4 / payroll-adjacent** - nothing to escalate. There were zero conflicts, so no conflict could
  make an actor ambiguous, and neither side's diff touches a money- or payroll-bearing write. The
  publication read path goes through `_authorization.RequireCapabilityAsync(userId, storeId,
  WorkforceCapability.WorkforceManager, ct)`, which names the actor; the outbox rows this merge
  writes are notification commands, not deposits, captures, refunds, settlement lines, funded orders
  or timesheet costs.
- **C7** - the five log calls the two commits add carry only
  `SensitiveDataRedactor.ExceptionLabel/ExceptionTrace`, the outbox id and the attempt number. No
  tag expression, no SAS credential, no phone number, no e-mail address, no token, at any level.

## Flakes

None. Zero failures in all three tier runs (`5df07afa`, `26599c6e`, `569887a5`), so there is nothing
unreproducible to name. The flake earlier lanes recorded -
`EventsOutboxDeliveryTests.The_message_carries_the_link_and_no_other_guest_data`, which aliased a
`DoesNotContain("250", ...)` onto its own random `PublicToken` - passed in all three runs here.

## Hazards, each checked by name

1. ZERO-CONFLICT MERGE THAT DOES NOT COMPILE - checked. Built explicitly before any tier, 0 errors,
   and the interface-member-vs-test-double shape was enumerated ahead of the build (three
   `IClientConfigurationService` implementers, one `INotificationService` implementer, all handled by
   the incoming commit; no new implementer on the tip). Never `--no-build`.
2. AUTO-MERGED IS NOT VERIFIED - checked. Both overlapping files (`Program.cs`, `WireHost.cs`) read
   in their merged bodies and diffed against BOTH sides; both are unions, neither side reverted. All
   29 incoming-only files confirmed byte-identical to `991c21f6`.
3. A NET TEST COUNT HIDES DELETIONS - checked. Discovered-test-set multiset diff from the two `.trx`
   files: 0 removed, 32 added, listed by name in `testset-diff.txt`; skip list identical name-for-name.
4. MOVE THE REF ONLY WITH A CAS - done.
   `git update-ref refs/heads/feature/restaurant-modules 569887a5 26599c6e`, exit 0. Never
   `branch -f`, never a reset. The tip was re-read immediately before the swap and matched the value
   named, so no swap was attempted against a value known to be stale. No sibling commit discarded.
5. THE RECEIPT TRAP - checked and it did NOT arise: neither incoming commit touches `artifacts/`, and
   `git diff --name-only 26599c6e 569887a5 -- artifacts/` is empty. Nothing was resolved to a side
   because nothing there conflicted.
6. NAME ANY FAILURE THAT DOES NOT REPRODUCE - nothing to name; three green runs, zero failures.
7. THE TIP MOVES - it did, `5df07afa -> 26599c6e`, before the merge. Both tips are recorded above,
   the base was re-measured at the one the merge landed on, and the overlap and trial-merge were
   recomputed against it.

## Exit criterion

Verified on the BRANCH, not on a worktree:

    git ls-tree -r --name-only feature/restaurant-modules
      Services/Workforce/WorkforcePushNotificationDelivery.cs        <- the delivery lane
      Enums/Workforce/WorkforceNotificationDeliveryOutcome.cs        <- Withheld = 3
      Enums/Workforce/WorkforceNotificationOutboxStatus.cs           <- Withheld = 6

    git grep HasConsumerPushRegistrationAsync feature/restaurant-modules
      Services/Interfaces/INotificationService.cs
      Services/NotificationService.cs
      Services/Workforce/WorkforcePushNotificationDelivery.cs        <- the probe, before the send

    git merge-base --is-ancestor f5305ced feature/restaurant-modules   YES
    git merge-base --is-ancestor 991c21f6 feature/restaurant-modules   YES

Before this lane, `WorkforcePushNotificationDelivery.cs` was on exactly one branch and that branch
was not the integration branch, so a lane had reported `built` against a file no caller on the
integration branch could reach. That is now closed, and it is closed WITH the honesty fix: the
delivery lane did not land bare.

The branch is at `569887a5`, local, unpushed.

## Containers

NONE started, stopped, inspected or killed. The same five foreign SQL containers were up before and
after (`okam-lvsp-sql`, `okam-lwr-sql`, `okam-lws-staff-sql`, `okam-lws-sql`, `zen_pasteur`). The SQL
tier was not run, and no SQL tier has run against this merge or against either lane commit.

## What this is not

C5 is NOT met. Nobody has walked the publication journey and no UI was opened. Three green tiers are
evidence that code behaves; they are not evidence that a manager can publish a schedule and see a
worker's phone light up, and they are never acceptance.
