```
RETURN: L-WF-TIMEOFF-DECIDE-GATE
brief: 49d49422
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-WF-TIMEOFF-DECIDE-GATE/EVIDENCE.md
log:
Measured at tip 569887a5 (re-read after the build, unmoved): DecideAsync had no flag read at all, ctor no gate. Python scan of all 246 local branches: 0 carry the fix.
Spec read at base: 9.1:420 "requests in flight stay READABLE"; 9.2:426 says writes owe the typed 409. Neither line contains "decidable" or "closable".
DISCREPANCY: census:40 at the tip says "decidable", NOT "keeps the inbox closable" as briefed. "closable" exists only on lane/wf-exchange-award-ungated 2661b752,
which is not an ancestor of the tip - so I did NOT claim the exchange award is gated, since that is true only on that unmerged lane. Same defect either way; the
census now quotes 9.1 verbatim and marks the closable reading as inference.
Worktree /Users/svendaneel/okam/wt-wftimeoffgate off 569887a5; commit 1ee483c0; not pushed; feature/restaurant-modules untouched; no migration; no container.
Gate: approve only, after the row lookup and NotFound (a foreign id still 404s) and before the idempotency reservation and every mutation, so nothing tracked is
mutated then thrown. DI needed no edit (Program.cs:822 registers by type); both hand-constructing test hosts now pass the real gate over their own context.
Pin: same route, one variable, refusal read from the BODY not a status code - 409 flag-disabled-read-only carrying flag=workforce.selfservice; inbox read
survives; all five decision fields plus the audit ledger untouched on a fresh context; flag on = Approved with the real published revision, actor asserted BY VALUE.
Reject pin: flag off, same route, 200 Rejected, actor by value - and it stayed GREEN through the mutation, which is what makes the asymmetry a decision.
Deleted the gate, WebApi.dll mtime moved (really recompiled), test RED at 200 OK; restored by editor write, mtime moved again, GREEN. Never --no-build.
Container-free tier only: 4631/0/12. SQL tier NOT run - WorkforceRequestsDecisionSqlServerTests covers this same route there and is unverified by this lane.
Wire tier dirtied artifacts/journeys/ev-dietary/run-sheet.{json,md}; both restored with git checkout, not committed. Staged by pathspec, 5 files.
END RETURN
```
