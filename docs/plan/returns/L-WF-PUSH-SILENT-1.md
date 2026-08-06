```
RETURN: L-WF-PUSH-SILENT
brief: 84f9c25a
verdict: built
evidence: OkamAPI lane/wf-push-silent 991c21f6 (base lane/wf-push-notify f5305ced); WebApi.Tests/Workforce/WorkforceNotificationTransportTests.cs
log:
Base: lane/wf-push-notify f5305ced, the ONLY branch carrying WorkforcePushNotificationDelivery.cs - it is NOT merged into feature/restaurant-modules (tip moved 4685fb01 -> 5df07afa during this lane; I did not touch it). Own worktree OkamAPI-wfpushsilent.
Baseline at f5305ced from a clean checkout: 4329 total / 4319 passed / 0 failed / 10 skipped, exit 0. No red, so nothing unreproducible to name. After: 4334 / 4324 / 0 / 10, exit 0 (+5). Full compile every run, never --no-build.
Fix 1 (probe): INotificationService.HasConsumerPushRegistrationAsync (GetRegistrationsByTagAsync, top 1) is asked BEFORE the send. No registration -> Fail("NoPushRegistration"): costs an attempt, dead-letters, and lands on the operator surface with the worker named. The tag is built in one place so probe and send cannot address different audiences.
Fix 2 (backlog): new WorkforceNotificationDeliveryOutcome.Withheld and WorkforceNotificationOutboxStatus.Withheld. PushNotConfigured is withheld, not failed - no attempt counted, re-polled every 5 min, never dead-lettered - and GET /schedules/notification-failures now carries withheld rows so a store delivering nothing does not read as a store with nothing wrong.
Push discrimination is proved, not asserted: one Theory, one route, ONE variable (registration present). Registered -> Sent / LastError null / 0 attempts / 1 send. Unregistered -> Failed / "NoPushRegistration" / 1 attempt / 0 sends. Every value read by equality, including the null.
Credential discrimination read through the ROUTED controller action, both arms: waiting = Withheld, 0 attempts, DeadLetteredAtUtc null; broken = DeadLettered, 5 attempts, stamp set. Plus an explicit NotEqual on Status and AttemptCount.
Presence exists in the same world: the withheld backlog survives 6 passes untouched and then drains to a genuine send the moment Configured flips - so the absence arms are not the only outcome reachable.
Mutants, each watched red then restored (5/5 killed): A Withhold->Fail (2 red); B probe deleted (3 red, incl. exactly the unregistered Theory arm while the registered arm stayed green); C dispatcher ignores Withheld (2); D withheld rows never re-polled (1); E operator surface hides Withheld (1).
FakePushTransport was rebuilt to behave like the real hub: the send SUCCEEDS for an unregistered tag (that is the whole defect), registrations are an explicit set, and it throws if the adapter ever probes a hub with no credential.
No migration authored: Status is already EnumToStringConverter over nvarchar(32); no DDL, no OnModelCreating index or constraint added. C2 untouched.
C3: no new service or route was needed - the probe rides the already-DI-registered INotificationService, the adapter is already registered in Program.cs, and the new status flows out through the existing routed failures endpoint.
Ops: no container started, no shared ref moved, no push. The wire tier's artifacts/journeys/ev-dietary/ churn was restored, not committed. Staged by pathspec only.
Note for the merge lane: this sits on the unmerged delivery lane, so it lands only with (or after) lane/wf-push-notify.
END RETURN
```

AMENDED 2026-08-04 by L-WF-PUSH-STILL-LIES (appended below the RETURN fence; the parsed block is unchanged):
The probe proves a registration RECORD, not a reachable device. Azure Notification Hubs does not
remove a registration when the app is uninstalled - it prunes lazily, on PNS feedback after a send
or at expiry - so an uninstalled app, a reinstall that left a dead handle, and a phone with
notifications disabled at the OS all answer the probe present, the hub accepts the send, and the row
still records Sent. Fix 1 above narrows the never-registered arm of the lie and leaves the
registered-but-unreachable arm open; only per-send PNS outcome telemetry, which this estate does not
collect, can close it. Nothing in this lane's work should be read as closing the uninstalled case.
