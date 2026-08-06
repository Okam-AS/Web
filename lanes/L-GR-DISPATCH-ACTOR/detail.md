# L-GR-DISPATCH-ACTOR - full detail

Branch `lane/gr-dispatch-actor` @ `a1e2655f`, worktree `/Users/svendaneel/okam/wt-gr-dispatch-actor`.
Base `lane/growth-audit-ledger@bd3a840f` (itself `feature/restaurant-modules@3579bbbc` + a merge of
`lane/gr-testsend-guard@5719fc96`). Local commit only, never pushed.

## The shape, verified before building

`F-GR-DISPATCH-UNATTRIBUTED` is still true at the tip. `GrowthNewslettersController.Dispatch` called
`_dispatch.DispatchAsync(storeId, newsletterId, ct)` - no user id, and the only `RequireUserId()`-less
write action on that controller. `GrowthDispatchRun` carries no actor column. The single name reachable
from a run is `GrowthNewsletterApproval.ApproverUserId`, which records who cleared the CONTENT.

## What was built

| file | change |
| --- | --- |
| `Services/Growth/GrowthAuditEventTypes.cs` | `NewsletterDispatchRequested = "growth.newsletter.dispatch_requested"` |
| `Services/Growth/GrowthAuditAllowlist.cs` | two keys: `dispatchRunId`, `runCreated` |
| `Services/Growth/GrowthDispatchService.cs` | `userId` on `DispatchAsync`/`CreateOrGetRunAsync`; `GrowthActorGuard.RequireAttributed` first; `IGrowthAuditWriter` injected; the append at all three exits |
| `Controllers/GrowthNewslettersController.cs` | `RequireUserId()` passed into `DispatchAsync` |
| `WebApi.Tests/Modules/ModuleActorStampPin.cs` | `GrowthAudit` KnownFiles + `GrowthDispatchService.cs`, KnownSiteFloor 5 -> 6 |
| `WebApi.Tests/Wire/GrowthWireSeed.cs` | additive overload taking `(IServiceProvider, Func<ApplicationDbContext>, int)`; the old signature delegates |
| `WebApi.Tests/Wire/GrowthDispatchActorWireTests.cs` | new: 5 facts + a derived host fixture |
| `WebApi.Tests/Growth/GrowthDispatchServiceTests.cs` | new: 3 theory cases + 3 facts |
| 9 other Growth test files | mechanical: the new `userId` argument (`"dispatcher-1"`) |
| `docs/plans/PENDING-MIGRATIONS-LEDGER.md` | MIG-22 annotated: a second consumer, nothing new asked of the table |

### The three exits, and why each records

`CreateOrGetRunAsync` returns a run id three ways. All three stage the same entry, built by a LOCAL
function - not a private method, because the actor-stamp convention judges the guard protecting a stamp
within the site's enclosing MEMBER, and a private helper taking `userId` would have to repeat the guard
to read as attributed at all.

1. **New run** - staged INSIDE the transaction, after the first `SaveChanges` assigns `run.Id` and before
   the second. The row commits with the run and its queued deliveries or with neither. Staged after the
   execution strategy's `ChangeTracker.Clear()`, so a transient-failure retry re-stages exactly one.
2. **Existing run (idempotent re-request)** - staged and saved on its own. Recorded because the run is
   idempotent but the DRAIN is not finished: whatever is still `Queued` is submitted under this caller's
   request, so a ledger naming only the creator would name the wrong person for that mail.
3. **Lost the unique-`NewsletterVersionId` race** - the losing request's own staged row went down with the
   rolled-back transaction, so a fresh one is staged against the winner after `ChangeTracker.Clear()`.

`runCreated` in the delta is what separates the two causal roles, and is the only place on disk they are
distinguishable.

## Deliberate non-decisions

- **No column on `GrowthDispatchRun`.** It would be a second migration against an existing table for a
  fact the ledger already answers by `AggregateId`, and the brief's instruction was to coordinate with the
  ledger rather than build beside it.
- **`GrowthDispatchSweep` / `GrowthDispatchBackgroundService` left actorless.** They resume a run whose
  creation is already named, over a recipient set fixed and enumerated at creation - the sweep cannot
  widen an audience. A `System` row per sweep pass looked tempting and is a trap: the sweep picks up every
  `InProgress` run on every interval, so a run stuck behind a flipped kill switch would append a row
  forever into a table C1 forbids purging.
- **No `GrowthAuditActorKind.System` write site added** for the same reason. The enum's `Why` text already
  anticipates one; nothing writes one yet.

## The layer finding (pinned, not just noted)

A wire test that posts a nameless token to `/dispatch` and asserts 401 proves nothing about this module.
`AddJWTAuthentication`'s `OnTokenValidated` calls `userService.GetByIdAsync(context.Principal.Identity.Name)`
and `context.Fail`s when it resolves to no user; `UserService.GetByIdAsync` returns null for
null/empty/whitespace. `ActorClaims` resolves from the same claim chain, so **there is no token shape that
authenticates while being unnameable** - the challenge always answers first, with an EMPTY body rather
than the module's `{ "error": { code } }` envelope.

`An_unnameable_caller_is_stopped_by_the_bearer_handler_before_the_module_is_reached` asserts that as a
fact (empty body, and `DoesNotContain("growth.unattributed")`), paired with the same route and a nameable
administrator answering with the module's own concealment 404. The service-seam guard is therefore proved
where it can actually run - `A_dispatch_the_service_cannot_attribute_is_refused_before_a_run_or_a_send_exists`,
a theory over `null` / `""` / `"   "` - which is not redundant with the controller: `CreateOrGetRunAsync`
is public and reached in-process by anything resolving `IGrowthDispatchService`.

## Why the suite owns a wire host

The shared `WireHost` deliberately sets no `Growth:PublicApiBaseUrl`, and
`GrowthOneClickUnsubscribeWireTests.A_dark_store_cannot_dispatch_a_newsletter_while_a_live_store_reaches_the_send_path`
PROVES the resulting fail-closed 409 `growth.unsubscribe_unconfigured`. Provisioning the key into the
shared host at runtime (the `ProvisionGrowthWebhookSecret` mechanism would allow it) makes that proof
answer differently depending on which suite ran first. `GrowthDispatchLitWireHost` overrides
`AdditionalConfigurationOverrides` with exactly the two link origins - the documented alternative - and
`The_hosts_link_configuration_is_present_and_is_what_lets_a_run_be_created` asserts the delta took effect.

Its world holds three genuine `StoreAdmin` principals, none a PowerUser: `Approver` authors and approves,
`Sender` dispatches, `SecondSender` re-requests. A fresh subscriber and a fresh snapshot per newsletter,
because a snapshot's identity is its membership and a reused one would put the second newsletter's send
under the first's frequency cap.

## Evidence

Container-free tier only, `dotnet test --filter "Database!=SqlServer"`:
**4434 passed / 0 failed / 12 skipped** (base was 4423/0/12; +11 is exactly the facts added).
No container started; none touched. NOT proven at the SQL tier - see MIG-22 below.

Mutations, each red on removal and green on restore, `WebApi.Tests/bin/Debug/net8.0/WebApi.dll` mtime
confirmed moved on all twelve builds (restores were file WRITES + `utime`, never a timestamp-preserving copy):

| mutation | red |
| --- | --- |
| M1 created-run `_audit.Append` deleted | 5 |
| M2 re-request `_audit.Append` deleted | 2 |
| M3 `GrowthActorGuard.RequireAttributed` deleted | 4 |
| M4 controller passes a constant instead of `RequireUserId()` | 2 |
| M5 an unlisted address key added to the delta (C7 fail-closed) | 13 |

M4 is the one that matters for by-value: substituting the approver's id for the caller's reddens the wire
proof, so the assertion reads the CALLER's identity and not a constant.

## Collisions and dependencies

- **Confirm family.** Three of my files are in `integration/confirm-family`'s diff against
  `feature/restaurant-modules`: `Controllers/GrowthNewslettersController.cs` (one hunk, the Dispatch
  action), `WebApi.Tests/Growth/GrowthDispatchTestSupport.cs` (one hunk, the `GrowthAuditWriter` ctor arg),
  `WebApi.Tests/Wire/GrowthWireSeed.cs` (additive overload). None of the three is a confirm/limiter file;
  the overlap is file-level, not concept-level.
- **`ModuleActorStampPin.cs`** is the shared surface. I changed one `KnownFiles` array and one integer
  inside the `GrowthAudit` record. `L-MEALS-RELEASE-ACTOR` most likely edits the `Meals` record and the
  `All = {...}` line, which are different hunks.
- **MIG-22.** My write goes into `GrowthAuditEvents`, whose migration is specified and unauthored. I
  authored none and asked nothing new of it - no column, no index, no constraint, only two allowlist keys,
  which are code. Until MIG-22 lands this attribution exists on SQLite (fast + wire, `EnsureCreated` from
  the model) and nowhere on SQL Server, and the append-only guard over it stays layer 1 only.

## Hygiene

`artifacts/journeys/ev-dietary/run-sheet.{json,md}` were dirtied by the wire tier and restored with
`git checkout --`, not committed. Staged by pathspec, never `git add -A`. No migration authored, no
container started, no push, no `plan accept`/`plan decide`, no `docs/plan/**` edit but the RETURN.
