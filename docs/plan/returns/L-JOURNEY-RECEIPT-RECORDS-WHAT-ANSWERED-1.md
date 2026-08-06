```
RETURN: L-JOURNEY-RECEIPT-RECORDS-WHAT-ANSWERED
brief: 1751e64c
verdict: built
evidence: lanes/L-JOURNEY-RECEIPT-RECORDS-WHAT-ANSWERED/mutation-log.md
spec_gap: none — the field did not already exist; grep for servingFixture/fixturePid/reportedPort across test/ and artifacts/journeys/*.json at e34977a returns nothing, so this is not the fail-spec outcome
reason: complete
log:
Receipt gained two halves that CAN disagree with env-derived `apiBaseUrl`: `servingFixture` = who holds
the GRANTED port (health: port/pid/cwd, plus lsof: pid/cwd/command, with identitySource naming which
spoke), and `nodeCalls` = every origin the SPEC reached from Node, by role, servedBy resolved for
bypassed ones. Both fixtures' /__fixture/health now report {ok,port,pid,cwd}; the consumer one had no port.
FALSIFYING ARM (runs/receipt-B1-bypass.json): spec carries a literal port as meals-statement-month:72 does,
and the bypassed fixture ANSWERS 200 — both steps passed, backendServed=2, every prior guard green — yet
the run reds naming pid 91248, cwd .../foreign-checkout, port 55364 while apiBaseUrl says 55357.
serving-fixture-proof.js 10/10 exit 0. B2 = the `request.post` channel meals-statement-month used, and M3
removes only that recorder and B2 goes green. F2 = foreign fixture too old to self-report, caught by lsof
alone. N1 = Node call to the app's own origin stays green. Fail-closed on contradiction, not on silence.
REAL INSTRUMENT: account-email-confirm on private 3934/4934, CI=1 — 1 passed (32.7s); receipt names pid
95253, cwd web-whoanswered, reportedPort 4934, identitySource health+lsof.
FOUND: guard-proof.js was DEAD at e34977a — 9/10 arms die on `Cannot find module './world-stamp'` and arm 3
passed spuriously; fixed via shared harness-copy.js resolving the closure from Node's own loader, now 10/10.
meals-statement-month NOT fixed or run. 4010 never bound, pid 73160 never signalled, nothing committed.
END RETURN
```
