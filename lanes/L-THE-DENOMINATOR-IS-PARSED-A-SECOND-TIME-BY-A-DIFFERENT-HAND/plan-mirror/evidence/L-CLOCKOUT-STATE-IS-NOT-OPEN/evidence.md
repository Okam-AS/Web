# L-CLOCKOUT-STATE-IS-NOT-OPEN — evidence

Brief `e0905eff`. Read at the integration tip **`8e2b57de`** (`git show 8e2b57de:<path>`), never the shared
checkout — `/Users/svendaneel/okam/OkamAPI-modules` sits on `lane/meals-grace-pins` at `34c6c103`. Every file
this lane touched was byte-identical at `HEAD` and `8e2b57de` (`git diff --quiet HEAD 8e2b57de -- <path>`),
so the tip and the checkout did not disagree about any of them.

Built in my own worktree `/Users/svendaneel/okam/wt-clockoutstate`, branch `lane/clockout-state-is-not-open`,
created at `8e2b57de`. No shared ref moved, nothing pushed.

## The defect, read at the tip

`Models/Workforce/WorkforcePosModels.cs`, `PosClockEventResponse.From`:

```csharp
SessionState = result.ClosedUtc.HasValue ? WorkforcePosSessionState.Closed : WorkforcePosSessionState.Open,
```

and the comment beside it said the quiet part outright: *"An exception outcome carries no session and reports
Open by default."*

`WorkforceClockProjection.StageClockOutAsync` returns `Outcome = MissingPunchException` with
`ClockSessionId`, `OpenedUtc` and `ClosedUtc` **all null** when a clock-OUT meets no open session. A fold that
moved nothing sets no `ClosedUtc`, so an **absent** session and an **open** one produced the same word. The
answer was `200`, `accepted: true`, `clockSessionId: null`, `sessionState: "Open"`.

The enum had exactly two members (`Open = 1, Closed = 2`), so the wire had no vocabulary for the third thing
that actually happens.

## The fix

1. `WorkforcePosSessionState` gains `AttendanceException = 3` — the punch was accepted and is on the
   append-only record, but folded no canonical session for this engagement. Not an error; the honest third
   answer.
2. The derivation now reads the fold's **own classification** (`WorkforceClockIngestResult.Outcome`) instead
   of a nullable timestamp.

Refusal was rejected as the fix: the raw event is durably committed by the ingest's **Phase 1, before the
fold runs**, and §3.4 keeps raw truth whatever the projection makes of it. A `4xx` would be the opposite lie —
the punch *is* stored.

The mapping, and why each row:

| Outcome | State | Why |
| --- | --- | --- |
| `SessionOpened` | `Open` | a session is running |
| `BreakStarted` / `BreakEnded` | `Open` | a break brackets a session that stays open across it |
| `SessionClosed` | `Closed` | including the lost close race — the concurrent winner closed it, so the worker **is** clocked out even though `BuildRaceLostCloseResultAsync` may echo no session |
| `MissingPunchException` | `AttendanceException` | nothing to close |
| `CrossEngagementException` | `AttendanceException` | this engagement opened nothing; the punch became a pending adjustment |
| `DuplicateIgnored` | read off the resolved session | a replay re-reads the one canonical session rather than re-folding, so there is no fresh fold to classify |

**Why outcome and not `clockSessionId == null`.** A null-id rule looks equivalent and is not.
`StageClockInAsync` returns `ClockSessionId = crossOpen.ClockSessionId` on a cross-engagement punch — the
**other** legal employer's open session, which the adjustment references — so a null-id rule still answers
`Open` there, wrong in the same direction. And `BuildRaceLostCloseResultAsync` can carry a **null** id on a
genuine close, which a null-id rule would call an exception and tell a clocked-out worker they are not.

## Files

| Path | What |
| --- | --- |
| `Models/Workforce/WorkforcePosModels.cs` | the enum member + `SessionStateOf`; also corrected the `ClockSessionId` doc, which claimed cross-engagement carries null |
| `WebApi.Tests/Workforce/PosClockOutStateWireTests.cs` | **new file**, 6 facts — the wire pin |
| `WebApi.Tests/Workforce/PosContractFixtureTests.cs` | +1 golden fixture case (§5.4 owes a fixture for a contract change) |
| `docs/api/fixtures/workforce/pos-clock-event-response-no-session.json` | **new** golden file, `"sessionState": "AttendanceException"` |
| `docs/api/fixtures/workforce/manifest.json` | the rule text said *"sessionState derives from the fold's ClosedUtc"* — now false; restated, plus the new case |

No migration, no DDL, no `UPDATE`/`DELETE` against an append-only table, no log/telemetry call, no new
service or route (C1/C2/C4/C7 untouched; C3 satisfied — the change lands on an existing wired route).

## The wire pin

`WebApi.Tests/Workforce/PosClockOutStateWireTests.cs`. The three journey facts drive the **REAL**
`WorkforceClockService` + **REAL** `WorkforcePersonnelListProjection` through the real
`WorkforcePosController` on the SQLite harness, and assert on the **serialized JSON** — Newtonsoft, camelCase
resolver, `StringEnumConverter`, dates read back as text (`DateParseHandling.None`) so the assertions are on
the characters that cross the wire and not on what a reader reconstituted.

1. `A_clock_out_that_closed_nothing_never_reports_the_worker_clocked_in` — `sessionState != "Open"`, is
   `"AttendanceException"`, `clockSessionId`/`openedUtc`/`closedUtc` null, `accepted: true`; and the raw punch
   is on the record (1 clock event, 0 sessions).
2. `A_cross_engagement_clock_in_carries_a_session_id_and_still_does_not_report_this_engagement_open` — seeds a
   second legal employer + a second active engagement for the same person with its own operator link. Asserts
   `clockSessionId` **is a string** and the state is still not `Open`. This is the fact a null-id fix fails.
3. `A_real_clock_in_and_clock_out_still_report_open_and_closed` — the converse, so the fix cannot be satisfied
   by never answering `Open` again: in → `"Open"`, out → `"Closed"` with the same `clockSessionId`, and the
   **second** clock-out (the same button pressed twice, which is how this reaches a worker) → exception.
4. `Every_fold_outcome_is_decided_and_only_a_moved_session_reports_open_or_closed` — walks
   `Enum.GetValues(typeof(WorkforceClockIngestOutcome))` rather than listing, so a new fold outcome added
   without deciding what the register is told reds instead of silently inheriting a fallthrough. That silent
   default is precisely how the original defect was written.
5. `A_replayed_punch_reports_the_state_of_the_one_canonical_session_it_resolved` — the three replay cases.
6. `A_close_that_lost_the_race_reports_closed_even_with_no_session_to_echo` — the one place a null session id
   must **not** read as an exception.

## Proof the pin bites

`SessionStateOf` was reverted in place to the original one-liner (`return result.ClosedUtc.HasValue ? Closed :
Open;`), rebuilt, and re-run. Assembly mtime moved `14:03:12 → 14:05:44`, so this was measured against a
freshly compiled mutant and not the stale-build trap in `CLAUDE.md`.

```
Failed!  - Failed: 6, Passed: 0, Skipped: 0, Total: 6
```

**All six** red. The headline fact's message is the defect stated back:

```
A_clock_out_that_closed_nothing_never_reports_the_worker_clocked_in
  Assert.NotEqual() Failure
  Expected: Not "Open"
  Actual:   "Open"
```

Mutant removed, rebuilt (mtime `14:07:03`), 6/6 green.

## Runs

All filters carried `Database!=SqlServer` **explicitly**, never a bare namespace filter. No container was
started; `docker ps` listed none before the runs and none was created or touched.

| Run | Result |
| --- | --- |
| new file alone | 6 / 0 / 0 |
| `FullyQualifiedName~WebApi.Tests.Workforce&Database!=SqlServer` | 661 passed, 0 failed, 3 skipped |
| container-free tier, **baseline** (lane changes stashed with `git stash push -u --` by pathspec, rebuilt) | **4638** / 0 / 12 |
| container-free tier, **exit** (restored, rebuilt) | **4645** / 0 / 12 |

Delta exactly **+7** = 6 new facts + 1 new fixture theory row. No pre-existing test regressed.

The SQL tier was **not** run and no SQL-tier result is interpreted here.

Fixture emission (`OKAM_EMIT_WORKFORCE_FIXTURES=1`, filtered to `PosContractFixtureTests` alone) created only
the new golden file — `git status` showed the three existing POS fixtures unchanged, so the emit rewrote
nothing.

`artifacts/journeys/ev-dietary/run-sheet.{json,md}` are dirtied by the test run (a known, pre-existing
effect). Restored with `git checkout --` and never committed; both commits are by explicit pathspec.

## Adjacent, NOT fixed — for whoever owns the client

`Web-modules` is out of this lane's write boundary, so these are reported rather than touched:

- `utils/workforce/pos-clock-state.js` documents the backend as still broken and instructs *"DO NOT BIND THE
  BUTTON TO IT"*, quoting the derivation this lane replaced. Its `stateFromClockEvent` deliberately ignores
  `sessionState` and reads `clockSessionId`. That reading is now **narrower than the wire**: on a
  cross-engagement punch the id is present and `closedUtc` absent, so the client returns `SESSION_OPEN` while
  the server says `AttendanceException`. Its header also asserts the id is absent for cross-engagement, which
  was never true of this backend. The client can now read `sessionState` directly.
- `test/e2e/fixture/workforce-punch.js` and `test/e2e/journeys/workforce-pos-punch.spec.js` encode
  `sessionState: 'Open'` for the nothing-open case as fixture truth, as does
  `test/workforce-pos-clock.test.js:64` (*"a clock-out that closed nothing is NOT read as clocked in, though
  sessionState says Open"*). Those fixtures now describe a wire that no longer exists.

## Wire-compatibility note

`Open` and `Closed` keep their names and numbers, and every committed fixture for them is byte-unchanged — so
no existing value moved. A consumer with a strict enum parser will not recognise `AttendanceException`. That
is deliberate: the alternative is the register being told `Open`, which is the defect. The one known client
ignores the field today, and endpoint 45 is pre-pilot.
