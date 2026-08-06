# L-WF-TIMEOFF-DECIDE-GATE — evidence

Base measured and built at: `feature/restaurant-modules` = **569887a5** ("L-WF-PUSH-LAND", 2026-08-04
03:01:47 +0200). Re-read after the build; the ref had not moved.

Worktree: `/Users/svendaneel/okam/wt-wftimeoffgate` (branch `lane/wf-timeoff-decide-gate`).
Commit: **1ee483c0**. NOT pushed. `feature/restaurant-modules` untouched.
`/Users/svendaneel/okam/OkamAPI-modules` was never checked out or built in — it is on
`lane/meals-grace-pins` and hosts a live process; only `git show`/`git log` were run there.

## 1. The defect was real at the tip, not a stale report

`git show 569887a5:Services/Workforce/WorkforceRequestsService.cs`:

- ctor (lines 35–47) took `context, authorization, idempotency, audit, timeProvider` — **no gate**.
- `DecideAsync` (line 307) contained no `EnsureStageWriteEnabledAsync`, no `WorkforceFeatureFlags`
  reference, no flag read of any kind. With `workforce.selfservice` off an approve committed
  `Status = Approved`, `DecisionByActorReference`, `DecidedAtUtc`, `DecisionNote`,
  `FirstAffectedScheduleRevisionId` and the `request.decide` audit row, and returned 200.

Every local branch was scanned in Python (`git show <ref>:Services/Workforce/WorkforceRequestsService.cs`,
per-branch output): **0 of 246 branches** carried `IWorkforceModuleGate` in that file. No lane had
already fixed it.

## 2. The spec, read at the base rather than quoted from the brief

`569887a5:docs/plans/modules/10-workforce-spec.md`

- **line 420** (§9.1, stage 4 "Self-service + exchange", flags `selfservice`, `exchange`), rollback
  column, in full: *"flag off returns manager-mediated flow; requests in flight stay readable"*.
- **line 426** (§9.2 Kill-switch law): *"Disabling any write flag preserves reads and exports (typed
  `workforce.flag-disabled-read-only` on writes)."*

So: the approve is a WRITE under stage 4's `selfservice` and owes the typed 409. That the manager may
still CLOSE an in-flight request is **not spec text** — §9.1 says only *readable*. It is an inference
from what the rollback is for, and it is marked as an inference in both the code comment and the census.

## 3. Discrepancy between the brief and the tip — recorded, not smoothed over

The brief states `WebApi.Tests/Workforce/WorkforceFlagCensus.cs:40` says §9.1 stage 4's rollback
*"keeps the inbox closable"*. **At 569887a5 it does not.** Line 40 reads:

> `/// in-flight requests are not gated either (§9.1 stage 4's rollback keeps open requests decidable — gating`

i.e. the ORIGINAL invented word *decidable*, not the "differently wrong" *closable*. The *closable*
wording exists only on `lane/wf-exchange-award-ungated` (commit **2661b752**), which is **not an
ancestor of the tip** (`git merge-base --is-ancestor` → false). The brief was written against that
unmerged lane's state.

This does not change the verdict: at my base the comment asserted a word §9.1 does not contain, which
is the same defect one generation earlier. It is corrected either way.

Consequence for the census text: I deliberately did **not** claim the exchange award is gated by
`workforce.exchange` — that is true only on the unmerged lane, and asserting it here would have been a
new comment that is wrong at its own base. The paragraph names only the time-off approve.

## 4. The change

`Services/Workforce/WorkforceRequestsService.cs`

- `IWorkforceModuleGate _moduleGate` field + ctor parameter (last, matching `WorkforceTimeOffService`
  and `WorkforceShiftExchangeService`). DI needed no edit: `Program.cs:822` registers the interface by
  type, so the container resolves the new parameter.
- In `DecideAsync`, **after** the row lookup and its `NotFound()` and **before** `_commit.RunAsync`:

  ```csharp
  if (approve)
  {
      await _moduleGate.EnsureStageWriteEnabledAsync(storeId, WorkforceFeatureFlags.SelfService, ct);
  }
  ```

  - After the lookup: a request that is not in this store stays the opaque 404 rather than disclosing
    the store's stage.
  - Before the reservation and every mutation: **nothing tracked has been mutated when the guard
    throws.** At that point `entity` is loaded but untouched — `Status`, `DecisionByActorReference`,
    `DecidedAtUtc`, `DecisionNote` and `FirstAffectedScheduleRevisionId` are all assigned inside the
    `_commit.RunAsync` body further down. Asserted, not merely argued: the refusal test reads all five
    fields plus the audit ledger back through a **fresh context**.

Test hosts that construct the service by hand — both updated to pass the REAL gate over the test's own
context (`WorkforceTestGates.Real`), never an always-on fake:

- `WebApi.Tests/Workforce/WorkforceExchangeTestHost.cs:38`
- `WebApi.Tests/Workforce/WorkforceW3TestHost.cs:52`

`WebApi.Tests/Workforce/WorkforceFlagCensus.cs` — the exemption paragraph now quotes §9.1's rollback
line verbatim, marks the closable reading as an INFERENCE, and adds that the time-off approve IS gated
and is probed in `WorkforceStageFlagGateTests` rather than here. The word *decidable* no longer appears
anywhere in the file.

## 5. The two pins (`WebApi.Tests/Workforce/WorkforceStageFlagGateTests.cs`, new `workforce.selfservice` section)

Two cases, same route (`PATCH /workforce/stores/{id}/requests/{id}` through the real
`WorkforceRequestsController`), one variable (the flag row).

`SelfService_off_refuses_the_time_off_approve_while_the_inbox_read_survives`

- Refusal read out of the **response body**, not a status code: `WorkforceStaffResults.Problem` asserts
  409 + `code = workforce.flag-disabled-read-only` + `Extensions["flag"] = workforce.selfservice` +
  `conflictKind`. A 401 challenge or a bare 409 cannot satisfy it.
- §9.2 read survival: the inbox `ListRequests` still answers 200 with the request in it while off.
- Nothing written: durable re-read asserts `Submitted`, and `DecisionByActorReference`, `DecidedAtUtc`,
  `DecisionNote`, `FirstAffectedScheduleRevisionId` all null, and `0` `request.decide` audit rows.
- Positive control — the identical call with only the flag row flipped **permits**: `Approved`, and
  `FirstAffectedScheduleRevisionId` equals the revision of the week actually published for that worker.
- **C4 by value**: `DecisionByActorReference` and the audit entry's `ActorReference` are both asserted
  `== WorkforceWorld.ManagerStaffMemberId.ToString()`, not merely non-blank.

`SelfService_off_still_lets_the_manager_reject_so_no_open_request_is_stranded`

- Same route, flag off, `decision = "reject"` → 200, `Rejected`, actor asserted by value, and a durable
  re-read confirms the row is closed with `DecidedAtUtc` set. This is what makes the asymmetry a
  decision rather than a hole.

Note recorded in the test: SQLite issues no server rowversion, so the inbox revision is null and the
controller's If-Match presence check (a plain 400) would fire before the gate was ever consulted. The
tests use the `?? "any"` the exchange suites already use; the revision COMPARE is skipped on this
provider and the SQL Server tier owns that proof.

## 6. Red/green mutation check — both directions recorded

`--no-build` was never used, and the assembly mtime was checked at each step so no run measured a stale
binary (`WebApi.Tests/bin/Debug/net8.0/WebApi.dll`).

| step | WebApi.dll mtime | result |
| --- | --- | --- |
| gate present | 1785806478 | `Passed! - Failed: 0, Passed: 7` |
| gate DELETED (the 4-line `if (approve)` block removed via an editor write) | 1785806831 (moved → really recompiled) | `Failed! - Failed: 1, Passed: 6` |
| gate RESTORED (editor write, not `mv`) | 1785806864 (moved again) | `Passed! - Failed: 0, Passed: 7` |

The red, verbatim:

```
Failed WebApi.Tests.Workforce.WorkforceStageFlagGateTests.SelfService_off_refuses_the_time_off_approve_while_the_inbox_read_survives
Expected: Microsoft.AspNetCore.Mvc.ObjectResult
Actual:   Microsoft.AspNetCore.Mvc.OkObjectResult
```

— i.e. with the gate gone the approve answers 200 OK exactly as the defect describes. The reject test
stayed GREEN through the mutation, which is the proof that it pins the reject's reachability rather
than riding on the gate.

## 7. Suite

Container-free tier only. No container was started, none touched.

```
dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"
Passed!  - Failed: 0, Passed: 4631, Skipped: 12, Total: 4643, Duration: 5 m 49 s
```

Workforce namespace alone (`Database!=SqlServer&FullyQualifiedName~WebApi.Tests.Workforce`) was run
first and is included in the above. **The SQL Server tier was NOT run** —
`WebApi.Tests/Workforce/WorkforceRequestsDecisionSqlServerTests.cs` exercises this same route on that
tier and is unverified by this lane.

Checkout hygiene: the wire tier dirtied the two tracked
`artifacts/journeys/ev-dietary/run-sheet.{json,md}` files; both were restored with `git checkout --`,
not committed. The commit was staged by pathspec (5 files), never `git add -A`. No migration was
authored. `git status` after the run is clean apart from the committed five.
