```
RETURN: L-WF-ADJUST-ADDRESS
brief: d5d63d8a
verdict: built
evidence: OkamAPI-wfadjust f3887f9a + web-wf-adjust e9ba89e
log:
Brief VERIFIED EXACT, neither overstated nor understated. #26 takes ClockSessionId; swept every manager-reachable read.
Only #43 GET /me/.../time exposes one, and it is WorkforceSelf/own-engagement. #25 rows, personalliste, hours-export CSV, contract-exposure and labour-band carry none; the POS/clock session ids are WRITE responses, not reads.
Bases: backend OkamAPI feature/restaurant-modules 3579bbbc, frontend Web feature/restaurant-modules cff41c8. Built in own worktrees.
NO migration needed: the service already loaded the sessions and their breaks to compute the row totals, then dropped the ids. Added rows[].sessions[].
Backend container-free 4373 passed / 0 failed / 12 skipped; wire tier 202 / 0 / 2. SQL tier UNRUN by instruction; the change adds no DDL, index or trigger.
Frontend jest 2436/2437 passed. The one failure is journey-artifact-store asserting the checkout is named Web-modules; it reds in ANY lane worktree and passes at base cff41c8 (verified).
NON-VACUITY: withheld ClockSessionId from the read -> 3 of 4 wire cases RED. The 4th addresses a random Guid, so its staying green is correct.
Assembly mtime 10:40:41 -> 10:54:28 (mutant) -> 10:55:07 (restored); both rebuilds genuinely recompiled, source touched after restore.
C1 asserted over the DB after a correction driven over HTTP: folded session window and both raw clock events unchanged; the correction is its own row.
C4 asserted BY VALUE: approvedByActorReference equals AdminA's staff member id, not merely non-null. The frontend request carries no actor field at all.
C7: neither diff touches a log sink.
attendance.json regenerated; its session id is deliberately the one attendance-adjustment.json corrects, so a client pinning both fixtures can see the write is addressable.
workforce.clock is flipped ON per test and cleared in finally: 3 WorkforceWireTests assertions need it default-off with no override row at StoreA.
The seeded punch is dated 2026-09-15 because the labour band asserts StoreA has no punches on 2026-07-07 and on today.
NOTE for the merger: running the wire tier rewrites artifacts/journeys/ev-dietary/* (timestamps only). Restored, not committed.
END RETURN
```
