# The wire stopped lying two days ago — the register did not

**Verdict: fail-spec.** The defect this brief describes was fixed on **2026-08-05** and is an ancestor of
**both** trunks the brief cites. There is nothing on the wire left to fix. But the lane's *objective* — a
clock-out that closed nothing must not tell a person they are clocked in — **is still live**, in the one file
the brief fenced off as already correct.

No change was made, no branch was created, no suite was run, no merge was performed, nothing was pushed.

---

## Why the brief's premise does not hold

| claim in the brief | at `057c390ad` (and at `81d06c10a`) |
|---|---|
| "the field is derived from `closedUtc` alone" | `WorkforcePosModels.cs:208` — `SessionStateOf` switches on `result.Outcome` |
| "answers … `sessionState: "Open"`" | `MissingPunchException` → `AttendanceException` (`:223-225`) |
| "only the client half is fixed" | the server half landed first, in `4d103ca8a` |

`4d103ca8a` — *"A clock-out that closed nothing must not report the worker clocked in"* — landed
**2026-08-05 14:32**, before the brief was generated (2026-08-07 16:39Z) and before the trunk the brief names
as the starting point. `git merge-base --is-ancestor 4d103ca8a 81d06c10a` is true.

**The path, confirmed statically end to end** (no suite required to read it):

1. `WorkforceClockProjection.cs:205-210` — a clock-out finding no open session returns
   `Outcome = MissingPunchException` and folds nothing.
2. `WorkforceClockService.cs:309` — the ingest result carries `fold.Outcome` through unchanged.
3. `WorkforcePosModels.cs:223-225` — that outcome maps to `AttendanceException`.

The residual `ClosedUtc.HasValue` at `:237` is inside the `DuplicateIgnored`/`default` arm only, and is
guarded by `if (!result.ClockSessionId.HasValue) return AttendanceException;` immediately above it.

**The design call the brief hands me was already taken and written down.** The endpoint keeps `200` and
`accepted: true`, because the raw event is durably committed by the ingest's Phase 1 *before* the fold runs
and §3.4 keeps raw truth whatever the projection makes of it — refusing would be the opposite lie. A caller
branches on `sessionState`, which now has the third answer it lacked: `WorkforcePosSessionState.AttendanceException = 3`.

**The exit criterion's own artifacts already exist.** `WebApi.Tests/Workforce/PosClockOutStateWireTests.cs`
asserts over the serialized JSON, driving the real projection on the SQLite harness:

```
Assert.NotEqual("Open", (string)wire["sessionState"]);
Assert.Equal("AttendanceException", (string)wire["sessionState"]);
```

And the mutation the exit criterion names was already applied and recorded by that lane
(`lanes/L-CLOCKOUT-STATE-IS-NOT-OPEN/evidence.md` in the backend repo): `SessionStateOf` reverted in place to
`return result.ClosedUtc.HasValue ? Closed : Open;` reds **6/6**, headline failure
`Expected: Not "Open" / Actual: "Open"`; restored, rebuilt, 6/6 green — with assembly mtimes recorded to
defeat the stale-build trap. Tier moved 4638 → 4645.

## The live defect, which is this lane's objective in another file

`utils/workforce/pos-clock-state.js` (Web-modules) still runs **the shallow rule the backend explicitly
documented as the wrong fix.**

`stateFromClockEvent` keys on the presence of `clockSessionId` and nothing else:

```js
if (!response.clockSessionId) { return SESSION_EXCEPTION; }
return response.closedUtc ? SESSION_CLOSED : SESSION_OPEN;
```

A **cross-engagement clock-in** answers `sessionState: "AttendanceException"` while carrying the **other legal
employer's OPEN session id** — a non-null `clockSessionId` with a null `closedUtc`. The client therefore
falls through to **`SESSION_OPEN`**, and `nextState`'s guard ("an exception outcome must not overwrite a known
state") never fires because the observed state was never computed as an exception. **The register reports the
worker clocked in on an engagement that folded nothing** — the same failure, in the same direction, as the
defect the brief was written about.

This is not inference. The backend pinned exactly this trap, with a test whose name is the warning:

> `A_cross_engagement_clock_in_carries_a_session_id_and_still_does_not_report_this_engagement_open`
> — *"A fix that only mapped 'null id' to the third state would answer `Open` here and be wrong in the same
> direction."*

Two aggravating facts:

- **The file's header asserts a backend behaviour that has not held since 2026-08-05**, quoting
  `SessionState = result.ClosedUtc.HasValue ? Closed : Open` and the payload
  `{ "clockSessionId": null, "sessionState": "Open", … }` as current. This is almost certainly where this
  brief's premise came from — a comment outliving the code it describes, which is the RF-1313 shape inverted:
  a document asserting a defect that no longer exists, and a lane dispatched at it.
- **Nothing in the frontend reads `sessionState` at all** — `grep` over `utils/`, `components/` and `pages/`
  finds it only inside that file's comments. The corrected third state the server now publishes reaches no
  client, so the wire fix currently protects only future callers.

**Not fixed here.** The brief fences the client off ("do not undo or duplicate it") and a fail-spec is an
instruction to stop rather than improvise. It wants its own lane, against `pos-clock-state.js`, with the
cross-engagement case as the headline pin.

## What was and was not measured

Read-only throughout. Two sibling `dotnet test` invocations were live at 18:48 (load average 30.64), so no
suite was started — and none was owed, since nothing was changed. The tier figure at the tip (4949 / 0 / 11)
is the coordinator's, and `PosClockOutStateWireTests` is inside it.

A detached worktree at `057c390ad` was created at `/Users/svendaneel/okam/OkamAPI-clockout` and removed. The
branch name the brief specifies, `lane/clockout-state-is-not-open`, **already existed** — it is the original
lane's, checked out at `/Users/svendaneel/okam/wt-clockoutstate`, which was not touched.
