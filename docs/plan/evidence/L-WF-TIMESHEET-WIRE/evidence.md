# L-WF-TIMESHEET-WIRE — evidence

## Base chosen, and why

- Integration tip observed: `feature/restaurant-modules` = **569887a5**
  ("L-WF-PUSH-LAND: land the push delivery lane together with its honesty fix").
- `git ls-tree -r --name-only 569887a5 | grep -i timesheet` returns **nothing**.
  The whole W5 family — controller, service, models, entities, migration —
  exists only on `lane/wf-w5-timesheet` (**9e82b286**, 22 ahead of the tip and
  76 behind it).
- Brief permits either `fail-spec` or building on that branch. **Built on the
  branch.** Worktree `/Users/svendaneel/okam/wt-wftswire`, new branch
  `lane/wf-timesheet-wire` off `9e82b286`. `feature/restaurant-modules` was not
  moved; `OkamAPI-modules` (lane branch + live WebApi process) was not used.
- Caveat: measured on a branch **76 commits behind the tip**. The wire fixture
  API this suite uses (`CreateClientAsModuleCaller`, `CreateClient`,
  `NewDbContext`, `AdminA`, `WireCollection.Name`) is byte-present on the tip
  too, and store ids 4105/4106 are unused on the tip, so the file should merge
  forward without conflict — but that is an inspection, not a run.

## Harness precondition, checked before claiming the pipeline is real

`WebApi.Tests/Wire/WireHost.cs:134` calls `builder.UseEnvironment(Environments.Development)`
on this branch, exactly as reported on the tip (tip line 136). An
environment-conditional filter therefore can never fire in this tier.

Checked what that forces for THIS path: `grep -n "IsDevelopment|EnvironmentName|IsProduction"`
over `Program.cs` and `Helpers/ServiceCollectionExtensions.cs` finds five sites —
OpenIddict cookie name + `SecurePolicy`, MCP `RequireHttpsMetadata`, the MCP
signing/encryption certificate fallbacks, the journal-signing-key fail-fast at
`Program.cs:75`, and the environment name in a log line. **None is an MVC filter,
an authorization policy or a Workforce gate**, so nothing on the timesheet
request path is skipped by the forced environment. The pipeline the suite drives
is the real one for these five routes.

## What was added

One new file, `WebApi.Tests/Wire/WorkforceTimesheetWireTests.cs` (12 facts +
`TimesheetWireWorld`). **No shared file was touched** — not `WireHost.cs`, not
`WireHostFixture.cs`, not `Program.cs`, not the controller or the service. See
"sibling lane" below.

The suite seeds its own corner of the wire world: store `4105` (approver
engagement + an explicit `workforce.export` ON row) and store `4106` (same
approver, no export row), no `Stores` rows at all (Workforce holds `StoreId` by
value; `StoreTimeZoneResolver` falls back to Europe/Oslo), and one published
shift per business date that a freezing fact owns. The shared fixture's world is
untouched, which matters: it states StoreA has no punches and no plan, and
`WorkforceWireTests.The_labour_band_...` depends on that.

## The three failure modes, each broken locally and watched

Procedure per mutation: apply -> full rebuild (never `--no-build`) -> run ->
restore with `cp` + `touch` (per CLAUDE.md's stale-mtime warning) -> rerun green.

### 1. Routing — `[HttpGet("timesheets")]` -> `[HttpGet("timesheets-mutated")]`

    Failed  Every_timesheet_route_reaches_the_timesheet_action_rather_than_matching_nothing
    Failed  The_authentication_challenge_carries_no_module_code_while_every_module_refusal_does
    Failed  An_unsupported_method_on_a_real_timesheet_route_is_refused_by_routing
    Failed  The_export_stage_flag_stops_the_write_in_a_store_it_is_off_in_and_leaves_the_read_answering
    Failed  A_malformed_query_date_is_the_controllers_own_400_and_carries_no_stable_code
    Failed  The_list_route_answers_for_the_window_the_query_string_actually_bound
    Failed! - Failed: 6, Passed: 6, Total: 12

Restored -> `Passed! Failed: 0, Passed: 12`.

### 2. Binding — `[FromBody]` -> `[FromQuery]` on the approve request

    Failed  The_export_provider_the_composition_root_registered_is_the_one_that_answers
    Failed  The_boolean_in_the_approve_body_is_bound_by_value_and_is_the_whole_difference
    Failed  The_date_only_range_in_the_approve_body_is_bound_by_value_and_decides_the_answer
    Failed  A_frozen_period_exports_and_the_bytes_come_back_over_HTTP_with_their_digest
    Failed! - Failed: 4, Passed: 8, Total: 12

The message is the predicted collapse — the two dates arrive defaulted, so the
route id can never be the digest of the stated range:

    Expected: ...ce.timesheet-period-empty
    Actual:   ...ce.timesheet-period-id-mismatch

Restored -> green.

### 3. DI — `AddScoped<IWorkforceTimesheetService, WorkforceTimesheetService>()` removed

    Failed! - Failed: 11, Passed: 1, Total: 12

The one survivor is the 405 fact, which is decided by routing and never
constructs the controller. Shape confirmed as the estate describes it — not a
compile error, a 500 at the first request:

    Expected: OK
    Actual:   InternalServerError

Restored -> green.

### 3b. DI, the silent shape — `AddScoped<ITimesheetExportProvider, ...>()` removed

    Failed  The_export_provider_the_composition_root_registered_is_the_one_that_answers
    Failed  A_frozen_period_exports_and_the_bytes_come_back_over_HTTP_with_their_digest
    Failed! - Failed: 2, Passed: 10, Total: 12

This is the mutation worth having. `ITimesheetExportProvider` is consumed as
`IEnumerable<>`, so an absent registration resolves to an **empty sequence**:
no exception, no 500, the service still constructs, ten of twelve facts stay
green, and the only symptom is that no provider can ever be selected. It is
caught only because the refusal's `availableProviderKeys` is read back and
asserted to contain `okam-csv`. Restored -> green.

## Non-vacuity beyond the mutations

- **Body, not status.** A routing 404 and the module's own 404 are asserted as a
  PAIR on the same run: the first must contain no `workforce.` token, the second
  must carry `code = workforce.not-found`. Likewise the bearer challenge (401,
  empty body, `WWW-Authenticate: Bearer`) against a module refusal (403,
  `code = workforce.forbidden`).
- **C4 by value.** `approvedByActorReference` and `requestedByActorReference` are
  compared to the approver's `StaffMemberId`, not tested for non-blank. Blankness
  proves nothing here: the service builds the actor as `caller.StaffMemberId.ToString()`,
  a Guid, so `WorkforceTimesheetService.AppendExportAudit`'s blank-actor guard is
  structurally unreachable. The CSV's own `# approvedByActorReference=` line is
  asserted against the same value.
- **Digest recomputed, not compared with itself.** The download's bytes are
  SHA-256'd in the test and matched against both the batch's `payloadSha256` and
  the `X-Okam-Content-Sha256` response header.
- **Order independence.** Every fact that freezes a period owns its own business
  date (2026-06-01..06-05), and the list fact reads a window (2026-05-04..05-10)
  no fact ever freezes, so `Assert.Single` on the period list is deterministic in
  any run order.

## Observations worth recording

1. **The date-only-in-a-body question is now answered by observation, not by
   reading the serializer.** `Microsoft.AspNetCore.Mvc.NewtonsoftJson` 8.0.11
   (Newtonsoft 13.0.3) binds `"2026-06-02"` into a `DateOnly` body property and
   renders `DateOnly` back as `"2026-06-02"`. Both directions are asserted by
   value, so a serializer swap that changes either one reds this suite.
2. **The controller's precondition 400s carry no stable `code`.**
   `ModuleControllerBase.ModuleProblem` emits `type/title/status/detail/traceId`
   only, while every service-raised refusal carries `code`. So a client can
   switch on `workforce.timesheet-*` but must fall back to prose for
   "'from' and 'to' must be ISO business dates" and the missing `Idempotency-Key`.
   Pinned as the contract it currently is (the malformed-date fact asserts the
   ABSENCE of `code`), not silently accepted.
3. Not fixed, not in scope: the estate's known caller-identity defect means these
   capability drives use `CreateClientAsModuleCaller`, exactly as
   `WorkforceWireTests` does, and for the same reason.

## Sibling lane

`L-WF-TIMESHEET-RACE` is working concurrent-approval refusal in this family. No
concurrency fact was written here, and no file it is likely to touch was touched:
this lane's entire diff is ONE new file,
`WebApi.Tests/Wire/WorkforceTimesheetWireTests.cs`. If that lane also seeds a
payroll-approver principal into the wire world it will do so in its own file or
in `WireHostFixture`; either way the merge is additive. Store ids 4105/4106 and
the `7a11e000-...-0000000050xx` guid block are this lane's.

## Tiers run

- New suite: `--filter "Database!=SqlServer&FullyQualifiedName~WorkforceTimesheetWireTests"`
  -> **12/12**.
- Whole wire tier: `--filter "Database!=SqlServer&FullyQualifiedName~WebApi.Tests.Wire"`
  -> **199/199**, no neighbour disturbed.
- Full container-free tier: `--filter "Database!=SqlServer"`
  -> **Passed: 4374, Failed: 0, Skipped: 7** (6 m 6 s). The lane's own recorded
  baseline at 9e82b286 is `fast 4362/0/7`; 4362 + 12 = 4374, so the delta is
  exactly this suite and nothing regressed.
- **No container was started.** No SQL tier was run; the immutability triggers
  this family relies on remain SQL-Server-only evidence, unchanged by this lane.
- Working tree asserted clean before and after. The wire tier dirtied
  `artifacts/journeys/ev-dietary/run-sheet.json` and `run-sheet.md` as the brief
  warned; both restored with `git checkout --`, neither committed. Commit was by
  pathspec (`git add WebApi.Tests/Wire/WorkforceTimesheetWireTests.cs`).

Commit: **f68857f3** on `lane/wf-timesheet-wire`.
