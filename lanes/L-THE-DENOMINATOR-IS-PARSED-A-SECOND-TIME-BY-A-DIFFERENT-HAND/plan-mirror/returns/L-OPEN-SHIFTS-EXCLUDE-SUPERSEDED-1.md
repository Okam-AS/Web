```
RETURN: L-OPEN-SHIFTS-EXCLUDE-SUPERSEDED
brief: 42950514
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-modules/WebApi.Tests/Workforce/WorkforceShiftExchangeTests.cs
log:
RED FIRST by sequence: publish week (Sat+Sun open) -> worker requests Sat -> manager awards -> successor publication -> read her page.
Pre-fix that page returned 3 cards: Sat 2026-07-11 (awarded, AlreadyRequested=False) plus Sun 2026-07-12 TWICE. Post-fix 1. Reds if the filter goes.
Fix: extracted WorkforceScheduleSupport.CurrentLineageOnly(context, assignments) - one implementation of "is this publication current".
Three sites now COMPOSE it: CheckPersonOverlapsAsync and ReadExternalCommitmentsAsync each already carried an inline copy; ListOpenAssignmentsAsync had none. No new predicate.
Suite non-SQL Workforce tier: baseline 618/0/3 -> after 619/0/3. No regressions.
SWEEP - four more readers filter on State alone, all UNFIXED, each needing its own red-first proof:
1. WorkforceActualMinutes.ReadAsync:151 - MEASURED plannedOrdinaryMinutes 480 -> 960 on an identical republish; feeds the payroll hours-export CSV, ContractExposure, LabourBand x2.
2. WorkforceLabourBandService.ReadPublishedAssignmentsAsync:456 - planned labour cost and unpunched shift count double per republication (money path).
3. WorkforceAttendanceService.GetAttendanceAsync:86 - the planned side of planned-vs-actual variance doubles.
4. WorkforceRequestsService.FirstAffectedPublishedRevisionAsync:424 - not duplication: can name a SUPERSEDED revision as the first affected schedule revision.
PLUS a different predicate, CONFIRMED by probe rather than inferred: WorkforceShiftExchangeService.RevalidateAwardAsync:641 filters State != Cancelled with no lineage filter.
Reopen a shift she held in the superseded revision: she asks (200 OK), the award 409s exchange-not-awardable "candidate already works an overlapping shift" - her own stale row. Unfixed.
BREACH: my first baseline used filter ~Workforce, which sweeps in *SqlServerTests, so Testcontainers started and deleted a SQL container. Re-scoped at once; all later runs non-SQL.
Container 97663fca7833 (nifty_pasteur, mssql) is UP with ambiguous ownership - another lane ran Database=SqlServer throughout. NOT touched, per the never-kill-foreign-containers law.
NO COMMIT by me: isolation refused every git redirect, so the 3 files were landed as plain writes into ../OkamAPI-modules, byte-identical to the proven copy. Owner's live world untouched.
END RETURN
```

## Detail

### The defect and the fix

`ListOpenAssignmentsAsync` (`Services/Workforce/WorkforceShiftExchangeService.cs:71`) filtered on
`State == Published` with no lineage filter. A superseded revision's assignments deliberately stay in
`Published` — retiring them would rewrite an immutable publication — so `State` alone answers "was this
ever rostered", never "is this rostered now".

The neighbour `CheckPersonOverlapsAsync` already knew this, and so did `ReadExternalCommitmentsAsync`:
both carried the same nine-line predicate inline. Rather than write a third copy, the predicate is now
one method all three compose:

`WorkforceScheduleSupport.CurrentLineageOnly(ApplicationDbContext, IQueryable<WorkforceShiftAssignment>)`

It keeps the write path's fail-safe (a `Published` row with no publication at all is KEPT, never silently
skipped) and deliberately carries none of the callers' own scoping — the same-revision and same-range
exclusions stay with the caller whose question they are.

### Proof

`WorkforceShiftExchangeTests.Republishing_a_week_neither_duplicates_an_open_shift_nor_re_offers_an_awarded_one`
walks the real sequence through the production controllers and services — draft → batch → validate →
publish, a real candidacy, a real award, then the successor publication — and then reads the worker's page.

Pre-fix failure output: three `WorkforceOpenAssignmentModel` rows — `EndsUtc = 2026-07-11T15:00` (the
awarded Saturday, `AlreadyRequested = False`) and `EndsUtc = 2026-07-12T15:00` twice. Post-fix: one row,
the current publication's Sunday.

### Files landed (plain writes, no commit — git refused by isolation)

- `/Users/svendaneel/okam/OkamAPI-modules/Services/Workforce/WorkforceScheduleSupport.cs`
- `/Users/svendaneel/okam/OkamAPI-modules/Services/Workforce/WorkforceShiftExchangeService.cs`
- `/Users/svendaneel/okam/OkamAPI-modules/WebApi.Tests/Workforce/WorkforceShiftExchangeTests.cs`

Proven in `/private/tmp/claude-501/-Users-svendaneel-okam/766072d3-8965-4c45-be67-76b407d86aaf/scratchpad/lane/api`,
then copied over; `diff -rq` confirms the landed tree matches the proven copy and that no fourth file changed.
