```
RETURN: L-WF-TIMESHEET-WIRE
brief: 29705ec8
verdict: built
evidence: /Users/svendaneel/okam/wt-wftswire/lanes/L-WF-TIMESHEET-WIRE/evidence.md
log:
Tip 569887a5 carries NO timesheet code (ls-tree: zero files). W5 lives only on lane/wf-w5-timesheet 9e82b286, 22 ahead / 76 behind. Chose to BUILD THERE, in my own worktree wt-wftswire on branch lane/wf-timesheet-wire; moved no shared ref.
Added ONE new file, WebApi.Tests/Wire/WorkforceTimesheetWireTests.cs, 12 facts, all five endpoints driven. No shared file touched (not WireHost/WireHostFixture/Program.cs/controller/service), so the L-WF-TIMESHEET-RACE merge stays additive.
Own store ids 4105/4106 and guid block; the shared wire world is untouched because it states StoreA has no punches and the labour-band fact depends on that.
Routing broken (template renamed) -> 6 red; restored green.
Binding broken ([FromBody]->[FromQuery]) -> 4 red, message is the predicted collapse period-empty -> period-id-mismatch; restored green.
DI broken (IWorkforceTimesheetService reg removed) -> 11 red as 500s, survivor is the 405 fact that never builds the controller; restored green.
Fourth, the one worth having: ITimesheetExportProvider is IEnumerable-shaped, so removing it gives an EMPTY sequence - no 500, 10 facts still green - caught only by reading availableProviderKeys out of the refusal body. 2 red; restored green.
Harness precondition checked: WireHost.cs:134 forces Development, but all 5 environment-conditional sites are cookie/MCP/cert/fail-fast - none is an MVC filter or a workforce gate, so this path is genuinely real.
Body not status: routing-404 vs module-404, and bearer-challenge-401 (empty body) vs module-403 (code=workforce.forbidden), asserted as pairs in one run.
C4 by VALUE: actor == approver StaffMemberId on approve and export and inside the CSV. The service's blank-actor guard is structurally unreachable (actor is a Guid), so non-blank would have proved nothing.
Date-only-in-a-body now DRIVEN for the first time: Newtonsoft 13.0.3 binds and renders it as "2026-06-02", asserted by value in both directions.
Found and pinned as-is: ModuleControllerBase's precondition 400s carry no stable `code` while every service refusal does, so a client cannot switch on them.
Suite 12/12; whole wire tier 199/199; container-free tier 4374/0/7 against the lane baseline 4362/0/7, i.e. exactly +12 and no regression.
No container started, no SQL tier run. ev-dietary artifacts dirtied as warned and restored, never committed; commits by pathspec f68857f3 and da452fe2.
END RETURN
```
