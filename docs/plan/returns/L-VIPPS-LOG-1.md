```
RETURN: L-VIPPS-LOG
brief: cba4ad2e
verdict: built
evidence: fact:vipps.token.guard · OkamAPI-modules 81d93e82 · artifacts/security/L-VIPPS-LOG-mutation.md
log:
BRIEF WAS STALE, not wrong: fecd9780 (21:43, ~1.7h before the brief was cut) had already made the
merchant reference one-way. Both directions re-verified clean — the outbound URI + provider error body
VippsService.cs:280 logs at Error, and the orderId Vipps quotes back (VippsCallbackModel.OrderId, and
the callback ROUTE); every Events deposit log carries {DepositId} only.
THE GUARD WAS VACUOUS. Reintroducing the leak into the real adapter left the sweep GREEN: the rule
needed a string LITERAL beside the credential and the same commit had lifted "events-deposit-" into
the constant VippsOrderIdPrefix. Fixed and pinned in the constant form; now red at
EventsDepositPaymentPortAdapter.cs:402, red on a raw token at LogError, red on the new rule.
STILL-OPEN LEAK FOUND AND CLOSED: the raw PublicToken is the route of GET /events/deposits/{token},
recorded by App Insights as the request URL with no log statement at all.
CapabilityRouteTelemetryInitializer (DI-registered) redacts it; new derived sweep in PiiLogSweepTests
covers all 9 sensitive route params. Observability 109/109; non-SQL 4513 pass (2 fails were a sibling
lane's mid-run edits, green on re-run).
NO ROTATION OWED: feature/restaurant-modules is not on origin at all, the workflow deploys only
master/test, no Events migration on master — no deposit, token or callback ever existed in a deployed
environment. One caveat + 2 unfixed findings in the artifact.
END RETURN
```
