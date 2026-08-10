```
RETURN: L-WF-TIMESHEET-RACE
brief: 31ac171b
verdict: built
evidence: /Users/svendaneel/okam/wt-wftsrace/lanes/L-WF-TIMESHEET-RACE/{evidence.md,mutations.txt,mutate.py} - branch lane/wf-timesheet-race @ bc9c7e96, worktree wt-wftsrace, not pushed
log:
BASE MOVED SINCE THE BRIEF. integration/mig-stack-land @ 4b37f81b now carries the whole W5 family plus MIG-25/MIG-26; the killed run cut from there, better than 9e82b286, and I kept it.
RESUMED, NOT REDONE. No commit existed, but a dirty tree did: 5 modified files + 2 untracked test files, all read before touching, all kept. Assemblies were newer than every source, so no stale-build trap was inherited.
THE MAPPING WORKS: two approvals of one range, different keys, real controller, save gate. Loser gets 409 timesheet-period-already-approved read out of the BODY; winner asserted beside it. M1 (catch never engages) REDS.
THREE CLAIMS THE RESUMED TESTS COULD NOT FALSIFY, NOW FALSIFIABLE.
(1) C4 was vacuous: both racers shared one approver, so a refusal built from the REFUSED caller's identity carried the same string and passed. Seeded a second payroll approver in my own file; refusal now asserted to name the winner and NOT the loser. M3 reds.
(2) The gate probe did not discriminate save 2 from save 1. Parked at save 1 the caller is IN FRONT of its re-check, the period table still reads 0, and the test would pass having certified the re-check while the database was never asked - both paths return the same code, so nothing downstream could tell. Probe now also asserts the held caller's reservation is durable. M5 reds.
(3) Two discriminator arms were carried but never executed (SQLite only ever fires the lines' grain index). Pinned by a 4-case theory, labelled in-file as string-matching only - it feeds a SqliteException with a SQL-Server-SHAPED message, so it does NOT prove a real SqlException clears the 2627/2601 gate. M7 reds.
EIGHT MUTATIONS, PER-ITEM: M1 M2 M3 M4 M5 M7 RED as required. M6 and M8 GREEN - reported, not hidden.
M6: the winner==null rethrow is UNREACHABLE today - WorkforcePayrollRows keys on (StaffMemberId, BusinessDate) and emits at most one row per pay code, so no duplicate grain is producible. Kept (that is the builder's guarantee, not the schema's) and the code now says so.
M8: the TimesheetLineId exclusion is REDUNDANT - the positive arms already refuse a line PK collision. Kept as belt-and-braces if the grain index is renamed; FLAGGED for the reviewer, since a strict dead-code reading would delete it. I did not delete it unilaterally.
NO REGRESSION IS MEASURED, NOT ASSUMED: container-free tier 4439/0/10 here vs 4433/0/10 at base 4b37f81b (measured by reverting the five files and deleting the two new ones). Delta exactly +6 = my six facts.
RACE IS NOT SQL-ONLY: all three refusing constraints are in OnModelCreating, so EnsureCreated builds them. TimesheetApproveRaceSqlServerTests exists for what this tier cannot show (that the CHAIN installs them - the AccountingSummaries lesson - and that a real provider message matches) and HAS NEVER RUN at any SHA; no evidence rests on it.
CONTAINER SELF-REPORT CARRIED FORWARD: the killed run started a SQL container via FullyQualifiedName!~SqlServer, which does not exclude SqlServer-traited classes whose names lack the string. It was this lane's own and Testcontainers had reaped it. This run started none; every run used Database!=SqlServer.
ADDITIVE WITH L-WF-TIMESHEET-WIRE: I touched none of its files; PeriodAlreadyApproved has one production caller (my own service) on both branches; its suite asserts approvedByActorReference on the period ENTITY and in the CSV, mine adds it to the problem EXTENSIONS. No migration authored, nothing pushed, feature/restaurant-modules untouched.
END RETURN
```
