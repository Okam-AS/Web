# L-FLAGS-EXCUSE-BYFLAG — detail beyond the return

Branch `lane/flags-excuse-byflag` @ `6ae0b8db`, off `lane/flags-effective-resolvers` @ `e45ec4c1`.
Worktree `/Users/svendaneel/okam/OkamAPI-flagsexcuse` (own worktree; `OkamAPI-flagseff` and
`OkamAPI-modules` untouched). Local, unpushed. One file of product-facing change:
`WebApi.Tests/Wire/FlagEffectiveResolverWireTests.cs`. No resolver, gate, `Program.cs` line,
migration or money path touched.

## Catalog as composed by the wire host (18 flags)

| module | catalog keys | resolver |
| --- | --- | --- |
| Workforce | module + setup, publication, selfservice, exchange, clock, dispatch | `workforce.module` only |
| Events | Events.Core, Events.Deposits, Events.Settlement | all three (derived from Describe()) |
| Margin | Margin.Module, Margin.PriceImport, Margin.Statements | all three |
| Growth | growth.module, growth.dispatch | both (derived) |
| Meals | meals.module | claimed |
| Training | training.setup, training.assignments | none — excused |

Excused after this change: the 6 workforce stage flags + the 2 training flags = 8, which is exactly
the set no resolver claims. `workforce.setup` is the only catalog flag that ships ON.

## Verification behind each reason

- Both training flags: `StoreBackedTrainingFeatureFlags` = `override ?? TrainingFeatureFlags.DefaultFor`,
  defaults projected from the same `Declared` list; enforced by `TrainingModuleGate.EnsureWritableAsync`
  at `TrainingCourseService`/`TrainingCertificateService` (setup) and
  `TrainingAssignmentService`/`TrainingCompletionService` (assignments). No config layer, no outer switch.
- All six workforce stage flags: `StoreBackedWorkforceFeatureFlags` = `override ?? DefaultFor`, and every
  read goes through `EnsureStageWriteEnabledAsync` (directly, or via
  `WorkforceAuthorizationService.RequireWriteCapabilityAsync`) except `workforce.clock`'s POS kill-switch,
  which reads `IWorkforceFeatureFlags.IsEnabledAsync` in `WorkforcePosController` — the same seam.
  `WorkforceNotificationDispatchHostedService` polls unconditionally, so `workforce.dispatch` has no
  outer switch either.

## Observation for another lane — NOT fixed here

`WorkforceShiftExchangeService.AwardAsync` (line 485) is an exchange WRITE that calls
`RequireCapabilityAsync`, not `RequireWriteCapabilityAsync`, so it is gated by capability and the module
gate but by **no** `workforce.exchange` stage flag. The other three exchange writes
(`RequestOpenShiftAsync`, `InitiateExchangeAsync`, `DecideOwnExchangeAsync`) do gate on it. That is a
kill-switch coverage question, not an effective-value question, so it does not touch this guard's excuse
— but the §9.2 claim that turning `workforce.exchange` off makes the surface read-only is not true of
that endpoint.

## Ops

Container-free tier only (`--filter "Database!=SqlServer"`; the wire host is SQLite in-memory). No
container started, none touched. The `artifacts/journeys/ev-dietary/run-sheet.*` churn a suite run
produces was reverted, not committed.
