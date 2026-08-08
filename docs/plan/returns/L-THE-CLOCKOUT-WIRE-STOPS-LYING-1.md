RETURN: L-THE-CLOCKOUT-WIRE-STOPS-LYING
brief: 61970036
verdict: fail-spec
spec_gap: The brief says the wire still derives sessionState from closedUtc alone; at 057c390ad and at 81d06c10a it switches on result.Outcome and answers AttendanceException, fixed by 4d103ca8a on 2026-08-05.
evidence: docs/plan/lanes/L-THE-CLOCKOUT-WIRE-STOPS-LYING/FINDING.md
log:
The wire defect was fixed on 2026-08-05 by 4d103ca8a, an ancestor of BOTH trunks the brief cites, so it was already absent from the 81d06c10a named as the starting point.
WorkforcePosModels.cs:208 SessionStateOf switches on result.Outcome, not on ClosedUtc. MissingPunchException maps to AttendanceException at :223-225. The enum carries that third answer as value 3.
Confirmed statically end to end: WorkforceClockProjection.cs:205-210 returns MissingPunchException for a clock-out with no open session, and WorkforceClockService.cs:309 carries fold.Outcome through.
The design call the brief hands me was already taken and written down: keep 200 and accepted:true, because Phase 1 commits the raw event before the fold runs. A caller branches on sessionState.
The exit criterion's own wire assertion exists: PosClockOutStateWireTests asserts NotEqual "Open" and Equal "AttendanceException" over serialized JSON, driving the real projection on SQLite.
Its mutation was already applied and recorded: SessionStateOf reverted to ClosedUtc.HasValue ? Closed : Open reds 6/6 with Expected Not "Open" / Actual "Open"; restored 6/6 green, mtimes recorded.
I changed nothing and ran no suite. Two sibling dotnet test invocations were live at load 30.64, and no suite was owed because there was no change of mine to measure.
LIVE DEFECT, and it is this lane's objective in the file the brief fenced off: utils/workforce/pos-clock-state.js runs the shallow null-id rule the backend documented as the wrong fix.
A cross-engagement clock-in answers AttendanceException while carrying the OTHER employer's OPEN session id, so clockSessionId is truthy and closedUtc is null.
stateFromClockEvent therefore returns SESSION_OPEN, and nextState's exception guard never fires, so the register reports the worker clocked in on an engagement that folded nothing.
Not inference: the backend pinned this trap as A_cross_engagement_clock_in_carries_a_session_id_and_still_does_not_report_this_engagement_open, calling the null-id rule wrong in the same direction.
That file's header still quotes SessionState = result.ClosedUtc.HasValue ? Closed : Open as current backend behaviour. That stale comment is the likeliest source of this brief's premise.
Nothing in the frontend reads sessionState at all, so the corrected third state reaches no client and the wire fix protects only future callers. It wants its own lane against pos-clock-state.js.
Left alone deliberately: the brief says do not undo or duplicate the client fix, and fail-spec means stop rather than improvise. No merge was performed, so no arity grep applied.
Detached worktree /Users/svendaneel/okam/OkamAPI-clockout created at 057c390ad and removed. The branch lane/clockout-state-is-not-open already existed as the original lane's and was not touched.
END RETURN
