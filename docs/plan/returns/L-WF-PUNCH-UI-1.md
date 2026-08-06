```
RETURN: L-WF-PUNCH-UI
brief: e0d00c0d
verdict: built
evidence: lanes/L-WF-PUNCH-UI/evidence.md
spec_gap: A cross-engagement punch is indistinguishable from a real clock-in on the POS wire — a second open session under a different legal employer answers 200 carrying the OTHER employer's clockSessionId and sessionState "Open", and the outcome enum is absent from PosClockEventResponse, so no client can tell them apart.
log:
Built the register's clock: ClockScreen inside PosShell, reached by a new Stempling entry in the POS top bar.
Only the POS shell holds an operator session, so endpoint 45 could never have lived on an admin page.
Premise verified: pos.vue has zero workforce refs and nothing in the repo called clock-events. Both true.
FOURTH ABSENCE, unnamed by the brief: the e2e fixture served ZERO POS endpoints, so /admin/pos was
  unreachable to any browser journey at all. Standing the register up was a precondition of this lane.
The demo's SQL punch insert is in the BACKEND repo; no workforce demo script exists in this one.
DEFECT AVOIDED: a clock-out with nothing open answers 200 / accepted / sessionState "Open" with a null
  clockSessionId. Binding the button to sessionState flips the till to "clocked in" as the worker walks
  away, with no end time recorded. utils/workforce/pos-clock-state.js makes clockSessionId authoritative.
TWO DEFECTS FOUND BY CLICKING: BeginDayModal (z-index 850) covered the top bar, so the clock was
  unreachable exactly when a person arrives for work — and the existing day/receipts exemptions were dead
  for the same reason. Second: a fifth mode over-subscribed the bar at 1280 and broke the left block.
Journey passed, 13 steps at 1280x800, on my own ports 4021/3021; orphan PID 73160 untouched and alive.
Jest was 2841/0 at my baseline; the failures now are L-WF-ROLES-UI's untracked page plus its stale snapshot.
NOTHING COMMITTED (shared branch): api-server.js and translations/{no,en,de}.ts are shared-dirty with other lanes — per-file manifest in evidence.md.
END RETURN
```
