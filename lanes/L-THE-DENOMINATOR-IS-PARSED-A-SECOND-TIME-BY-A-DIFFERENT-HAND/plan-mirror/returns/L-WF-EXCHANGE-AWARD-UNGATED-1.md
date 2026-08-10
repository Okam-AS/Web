```
RETURN: L-WF-EXCHANGE-AWARD-UNGATED
brief: d01a203a
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-WF-EXCHANGE-AWARD-UNGATED/EVIDENCE.md
log:
Verified at the tip a273e013, not at a brief quote: AwardAsync had no stage gate there.
workforce.exchange was read at 3 worker-side writes (156/254/383), never in AwardAsync (485).
Shape 1, not shape 2: the seam is bound (Program.cs 769/774), lever real, catalog default false.
No branch carried the fix; lane/wf-exchange-move's 4th gate names Publication, another flag.
Worktree /Users/svendaneel/okam/wt-wfexaward off a273e013; commit 2661b752; not pushed.
Gate: AwardAsync calls EnsureStageWriteEnabledAsync(Exchange) when award is true.
After the row lookup (a foreign candidacy still 404s, per ShiftExchangeTenantIsolationTests) and
before the idempotency reservation and every mutation, so nothing tracked is mutated then thrown.
Reject stays reachable by decision: spec 9.1 stage 4 keeps in-flight requests readable and the
inbox drainable; pinned by its own test so the carve-out is a decision, not a hole.
Corrected WorkforceFlagCensus's comment, which claimed manager decisions are deliberately ungated.
Pin: same route DecideRequest, one variable, body read: off = 409 flag-disabled-read-only with
flag=workforce.exchange, inbox read survives, row untouched; on = Awarded, actor asserted BY VALUE.
Deleted the gate, rebuilt (assembly mtime moved), test RED at that assertion; restored, GREEN.
Container-free tier only: 4389/0/12 full fast tier, 769/0/3 Workforce+Modules. SQL tier NOT run.
END RETURN
```
