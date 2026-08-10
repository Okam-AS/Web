```
RETURN: L-VIPPS-LOG
brief: cba4ad2e
verdict: built
evidence: fact:vipps.token.guard · OkamAPI-modules 81d93e82 · artifacts/security/L-VIPPS-LOG-mutation.md
log:
BRIEF STALE, not wrong: fecd9780 (21:43, before the brief was cut) had already made the merchant
reference one-way. Both directions re-verified clean — VippsService.cs:280's Error line (outbound URI
plus the provider's error body) and the orderId Vipps quotes back, in the callback route and body.
THE GUARD WAS VACUOUS: reintroducing the leak into the real adapter left the sweep GREEN, so a revert
would have republished a live credential with a green suite. The rule required a string LITERAL beside
the credential and the fixing commit had lifted "events-deposit-" into a constant. Now judges the
concatenation; red at EventsDepositPaymentPortAdapter.cs:402, on a raw token at LogError, on the new rule.
STILL-OPEN LEAK CLOSED: the raw PublicToken IS the route of GET /events/deposits/{token}, so App
Insights recorded it as the request URL with no log statement involved at all. New
CapabilityRouteTelemetryInitializer (DI-registered) redacts it; new derived sweep in PiiLogSweepTests
covers all 9 sensitive route parameters without a list.
NO ROTATION OWED: feature/restaurant-modules has never been pushed to origin, the workflow deploys only
master/test, and no Events migration is on master — no deployed database ever held a deposit, a token
or a callback, so there was never a value to leak.
Suite: Observability 109/109; non-SQL 4513 pass. Detail: artifacts/security/L-VIPPS-LOG-mutation.md
END RETURN
```
