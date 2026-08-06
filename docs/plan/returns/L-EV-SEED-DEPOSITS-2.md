```
RETURN: L-EV-SEED-DEPOSITS
brief: 9e609518
verdict: blocked
needs: +F-SQL-HEADROOM
evidence: lanes/L-EV-SEED-DEPOSITS/EVIDENCE.md + RUNS.md + check-discriminates.sh | lane/ev-seed-deposits caee6ae3 off feature/restaurant-modules 3579bbbc, worktree ../wt-evseeddep, local, unpushed
reason: the exit's FIRST clause requires the seed to RUN on a fresh stack. A fresh stack needs a SQL Server container; five foreign containers hold ~6.2 GiB of the Docker VM's 7.65 and host swap is 17.5/18.4 GiB, and the lane's hard constraint says return blocked rather than start one. Everything else in the exit is done and MEASURED: the seed provisions Events.Deposits, the sentence that reported a module refusal as "expected without live Vipps credentials" is gone, and the deposit row is now proven to appear with the flag and not appear without it. What is missing is one execution of Scripts/demo/demo-up.sh, not a decision or a design.
log:
MEASURED FIRST, and the defect is still live. Four commits landed on the base since pass 1; none touches Scripts/demo, Services/Events or EventsDepositsController. Describe() still advertises Events.Deposits and Issue still passes requireDepositsFlag: true, so a store the pre-lane seed provisions still cannot issue a deposit and the seed still calls that refusal a credential limit. Lane rebased onto 3579bbbc, seed commit replayed clean as 7a6d9798.
BOTH RE-SCOPED DELIVERABLES WERE ALREADY IN 7a6d9798: demo_flag "Events.Deposits" added, and the blind else-arm replaced by a judgement on the deposit ROW. The seed no longer explains away its own failure; a refusal that wrote no row dies, and EVENTS_DISABLED dies naming the flag.
WHAT PASS 2 ADDS (caee6ae3): the premise those arms encode was argued from reading IssueAsync and never observed. A new wire test drives the seed's own two calls over the REAL pipeline against the REAL composition root, on one Accepted event, with the store's flag row as the only variable.
flag absent: POST 404 application/problem+json code=EVENTS_DISABLED, GET deposits -> [], zero rows in the database.
flag present: POST 500 text/plain with no `code` at all, GET deposits -> one row; the database holds one deposit (Failed, 40000 minor) carrying an Initiated receipt written BEFORE the port was touched, plus Failed, then T10 back to Accepted. No LinkIssued: nothing pretends a page exists.
NEITHER ARM IS A 200. That is the whole point of the re-scope: the status code cannot separate the two causes, the row can.
NON-VACUITY, and it is exactly the shape the brief warned about. The sibling gate test runs its flag-ON arm against a Confirmed event where T7 is illegal, so the state machine refuses before the service is reached and it can show a refusal but never a write -- its absence claim lives in a world that cannot produce presence. Both arms here run on the same Accepted event inside one method.
RED THEN GREEN: requireDepositsFlag true -> false turns the ABSENCE arm red ON THE ROW, printing [EventsDeposit { AmountMinor = 40000, CurrencyCode = "NOK", ... }] -- the deposit a flagless store would have taken on. Restored, green.
STALE-BUILD TRAP AVOIDED: the mutation is production code, so WebApi.dll is the assembly that must move. Checked its mtime both ways (17:51:39 mutated, 17:54:28 restored); the test dll deliberately did not move, which is the reading that has cost two lanes.
SEED CHECK RE-RUN: 7 passed / 0 failed against the rebased seed; 3 passed / 4 failed against the pre-lane seed at 3579bbbc, printing the defect verbatim. Its two deciding triples are now MEASURED at the wire tier instead of invented, with provenance in the script header.
SUITES: wire tier 199 passed / 2 skipped / 0 failed. Source-scanning guards (SqlServerContainerTrait, CredentialCompositionSweep, PiiLogSweep, ModuleFeatureFlagContract, EventsFlagCatalogCoherence, EventsRouteGateSweep, EventsReachabilitySweep) 75/75. The two tracked artifacts/journeys/ev-dietary files the wire run dirties were restored, not committed.
BLOCKED ON ONE THING ONLY: the seed has never executed. Started no container, touched none, killed none -- docker ps identical before and after (the same five foreign containers).
C7: no credential was read, printed, logged or committed; the Vipps placeholders were neither replaced nor echoed, and the wire host blanks VippsSettings regardless. C4: the Initiated receipt names ActorKind.Admin / wire-admin-a, and the ledger refuses an unattributed Admin receipt. C3: the flag now has a lever, a caller, a seed that sets it and a proof it decides.
No migration authored or run. Nothing pushed. Committed by pathspec, two commits on lane/ev-seed-deposits.
END RETURN
```
