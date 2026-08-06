```
RETURN: L-EV-CONCURRENCY-REFUSES-A-STALE-REVISION
brief: 4ac822a5
verdict: built
evidence: lanes/L-EV-CONCURRENCY-REFUSES-A-STALE-REVISION/evidence.md
log:
WebApi.Tests/Events/EventsSettlementStaleRevisionSqlServerTests.cs - 6 arms on the Events SQL Server fixture, 6/6 green. Commit 93d2b422 on lane/ev-concurrency-stale-revision, off the tip 8e2b57de.
Every arm drives a REAL second operator that reads the current revision and commits through the production service, and asserts the LOST UPDATE - what the statement holds after - not only the 409.
Red comes from deleting the check: GuardIfMatch -> `return null`, the SQLite-lenient branch on every provider, reds 4 of 6. Restored by writing the file + full rebuild -> 6/6 again.
Ladder: M0 whole guard 4 red; M3 stale-compare only 1 red; M2 all three refusals 2 red; M1 ApplyConcurrencyToken 0 red. Assembly mtime checked against source before every no-build run.
M1 interrogated not credited - EQUIVALENT: EF's tracked original RowVersion already equals the submitted token wherever the pre-check passes. FINDING: the method is dead, its comment claims otherwise.
The arm M3 alone reds is a ZERO-AMOUNT adjustment: total unchanged -> EF marks no column modified -> no UPDATE -> the rowversion never reaches a WHERE clause, so the pre-check is the only defence.
A_bump_after_the_precheck also passes under M0 - killed by EF's own token, not by if-match. Recorded as second-layer evidence and NOT counted toward the exit criterion.
Container-free tier 4638/0/12 (total 4650) = the tip's recorded baseline exactly; the new file is Database=SqlServer so the fast tier cannot see it. Trait filter used, never a namespace filter.
Only Testcontainers' own SQL container ran and deleted itself; a postgres:15 that is not mine appeared mid-run and was left untouched. Local, never pushed, no migration, prod untouched.
END RETURN
```
