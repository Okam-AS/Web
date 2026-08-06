```
RETURN: L-EV-REFUND-FAKE-ARG
brief: a627d86e
verdict: built
evidence: lanes/L-EV-REFUND-FAKE-ARG/commit-events-sqlserver.trx (25/25, chain-built) + commit-events-fast.trx (458/458) at OkamAPI lane/ev-refund-fake-arg db9b39a1
log:
Brief confirmed on the counts: 25 call sites (29 grep hits less 4 inside EventsActs.cs), exactly 2 passed the port.
CORRECTION — "three failures" is not supported. The defect's footprint is ONE deterministic failure:
EventsSettlementLifecycleTests.Cancel_a_confirmed_event_..._refunds_through_the_rail_and_cancels, SQL tier only,
"The provider refund failed: nothing left to refund". The other two named-but-unarmed call sites WERE the two that
passed the port. Measured, not reasoned: pre-fix container-free Events tier is 453/453 green. The 121 failures in
the prior run's untargeted baseline-events-all.trx are 81 SqlException network + 39 SocketException — a died
container, the exact hazard the brief warns about — and none of them is this defect.
Fix: the act RETURNS the double it armed; the optional parameter is gone. A required parameter was worse (caller
still constructs and arms, two facts that drift); a named unarmed variant was worse (leaves the disarmed act in the
vocabulary, and reaching for it looked exactly like reaching for the right one). No actor hard-coded — C4 untouched.
Pin EventsRailArmingPinTests, 4 facts: no EventsActs act may take a rail as an OPTIONAL parameter (whole surface,
not this method); the act returns the rail; an unarmed rail cannot pass for the domain refusing (EVENTS_PAYMENT_
PROVIDER, not EVENTS_REFUND_EXCEEDS_PAID, carrying the double's own signature — no green to land on); no Events test
seeds provider truth then builds its own rail, with a self-checking parser. Both scans proven RED then green.
No migration authored. One container, created and deleted by this lane; foreign zen_pasteur untouched.
END RETURN
```
