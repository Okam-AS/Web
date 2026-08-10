```
RETURN: L-WF-PUSH-LAND
brief: 0a47dda6
verdict: built
evidence: lanes/L-WF-PUSH-LAND/merge-receipt.md
log:
Ancestry re-measured before anything: f5305ced IS an ancestor of 991c21f6, neither is on the integration branch, merge-base d458e1cf. The brief had not aged. Merging the silent tip brought both commits, so the delivery lane did not land bare.
The tip MOVED before I merged: 5df07afa -> 26599c6e (L-INVOICE-AUTHORIZE-LAND, 3 commits, fast-forward). I moved my worktree there and re-measured the base rather than carrying the 5df07afa number forward. Both tips recorded.
LANDED 569887a5 = merge(26599c6e, 991c21f6), zero conflicts, tree identical to the git merge-tree trial. CAS only: git update-ref refs/heads/feature/restaurant-modules 569887a5 26599c6e, exit 0. Local, unpushed, no migration.
Zero conflicts is not a verification: only Program.cs and WireHost.cs are touched by both sides, and both merged bodies were read - each is the tip's plus the incoming lines, no deletion, all four adapter registrations present once. All 29 incoming-only files byte-identical to 991c21f6.
BUILT the merge commit before any tier: dotnet build, 0 errors. --no-build appears zero times in every log. Assemblies newer than every tracked .cs.
Tier (container-free, Database!=SqlServer, own worktree): baseline 5df07afa 4571/0/12; base 26599c6e 4597/0/12; MERGED 569887a5 4629/0/12, all exit 0. Delta +32 over the base it landed on.
Discovered-test-set diff from the two trx files: 0 REMOVED, 32 added, skip list identical name-for-name (12=12). Arithmetic closes: +26 [Fact]/[Theory] methods expanding to 32 cases, all from the two new test files.
TAG CONSTRUCTION check by name: probe and send both call NotificationService.ConsumerTag(userId), one private helper, so they cannot address different audiences. The merge produced no second construction. The one other "userId:" literal is the registration side in ConsumerNotificationController, byte-identical to the tip and predating both lanes.
FAKE TRANSPORT check by name: FakePushTransport declared once; its send is deliberately NOT conditioned on Registered, so it succeeds for an unregistered tag. Registered is read only by the probe. The pin is not vacuous.
Behaviours confirmed AT the merge commit: registration Theory both arms PASSED (registered -> Sent/null/0 attempts/1 send; unregistered -> Failed/NoPushRegistration/1 attempt/0 sends), plus the withheld-vs-dead-lettered pair and the drain-on-credential arm.
No migration, verified not assumed: no diff under Migrations/ModelBuilders/ApplicationDbContext, and Status is EnumToStringConverter with HasMaxLength(32) at ApplicationDbContext.cs:2747.
Receipt trap did NOT arise - neither commit touches artifacts/. No flake: zero failures in all three runs, so nothing unreproducible to name. Wire-tier churn in artifacts/journeys/ev-dietary restored each time, never committed.
C4/payroll: nothing to escalate - zero conflicts, and no money- or payroll-bearing write is touched; the read path names the actor via RequireCapabilityAsync. C7: the five added log calls carry only redacted exception labels, outbox id and attempt number.
No container started, stopped or killed; the same five foreign SQL containers before and after. No SQL tier has run against this merge. OkamAPI-modules never entered.
C5 NOT met: nobody walked the publication journey and no UI was opened. Three green tiers are not acceptance.
END RETURN
```
