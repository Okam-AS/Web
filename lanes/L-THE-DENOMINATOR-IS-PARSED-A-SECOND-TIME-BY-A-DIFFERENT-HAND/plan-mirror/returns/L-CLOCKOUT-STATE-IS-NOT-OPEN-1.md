```
RETURN: L-CLOCKOUT-STATE-IS-NOT-OPEN
brief: e0905eff
verdict: built
evidence: /Users/svendaneel/okam/wt-clockoutstate/lanes/L-CLOCKOUT-STATE-IS-NOT-OPEN/evidence.md
log:
Read at 8e2b57de; every file I touched was byte-identical at HEAD and the tip. Built in my own worktree wt-clockoutstate, branch lane/clockout-state-is-not-open cut at 8e2b57de.
Defect confirmed verbatim: `SessionState = result.ClosedUtc.HasValue ? Closed : Open`, commented "An exception outcome carries no session and reports Open by default". The enum held Open=1, Closed=2.
Fix: the enum gains AttendanceException=3 and state is read off the fold's OUTCOME, not a timestamp. Refusal rejected — Phase 1 commits the raw event BEFORE the fold, so a 4xx is the opposite lie.
Outcome and NOT "clockSessionId is null": that looks equivalent and is not. Cross-engagement carries the OTHER employer's session id, and a lost close race can carry none on a genuine close.
New WebApi.Tests/Workforce/PosClockOutStateWireTests.cs, 6 facts. Three drive the REAL clock service and REAL personalliste projection through the real controller, asserting the SERIALIZED JSON.
The cross-engagement fact asserts clockSessionId IS a string and a state still not Open — the one a null-id fix fails. A converse fact keeps Open/Closed honest and a second clock-out an exception.
The outcome table walks Enum.GetValues, so a new fold outcome added without deciding what the register is told reds rather than inheriting a fallthrough — that silent default wrote the defect.
MUTATION: reverted to the one-liner, rebuilt (mtime moved 14:03:12 -> 14:05:44, so not the stale-build trap), ALL SIX red, headline `Expected: Not "Open" / Actual: "Open"`. Restored, 6/6 green.
Runs all carried Database!=SqlServer EXPLICITLY, never a bare namespace filter: new file 6/0/0; workforce fast tier 661 passed, 0 failed, 3 skipped.
Container-free tier measured BOTH ways: baseline 4638/0/12 (changes stashed by pathspec, rebuilt) vs exit 4645/0/12 — exactly +7 = 6 facts + 1 fixture row, nothing pre-existing regressed.
No container started; docker ps listed none before the runs and none was created or touched. SQL tier NOT run, no SQL-tier result interpreted here.
§5.4 owed a fixture: added pos-clock-event-response-no-session.json; the emit was filtered and rewrote none of the three existing POS fixtures. manifest.json's ClosedUtc rule restated.
ADJACENT, outside my boundary: Web-modules utils/workforce/pos-clock-state.js documents the wire as broken; its clockSessionId reading is now NARROWER than the wire — cross-engagement reads OPEN.
Open/Closed keep names, numbers and fixture bytes; a strict parser will not know AttendanceException. Deliberate — the alternative is telling the register Open; endpoint 45 is pre-pilot.
Commits 4d103ca8 and a74a6fd2 by explicit pathspec, parent 8e2b57de, not pushed. ev-dietary artifacts dirtied then restored. Shared checkout still 34c6c103 on lane/meals-grace-pins.
END RETURN
```
