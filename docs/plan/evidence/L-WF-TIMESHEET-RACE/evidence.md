# L-WF-TIMESHEET-RACE — evidence

## Base, and why it moved since the brief was written

The brief warned that integration tip `569887a5` carries no timesheet code and that W5 lived only on
`lane/wf-w5-timesheet @ 9e82b286`. That is no longer the whole picture. A migration-stack landing has
since produced `integration/mig-stack-land @ 4b37f81b`, which carries the entire W5 family plus MIG-25
(single-succeeded export index) and MIG-26 (adjustment ordinal). My prior run cut
`lane/wf-timesheet-race` from `4b37f81b`, which is a strictly better base than `9e82b286`, and this run
kept it.

Worktree: `/Users/svendaneel/okam/wt-wftsrace`. Branch `lane/wf-timesheet-race`. Nothing pushed;
`feature/restaurant-modules` untouched; no migration authored.

## Resumed work — what was found and kept

The killed run left NO commit and a dirty tree: five modified files and two untracked test files. All of
it was read before anything was touched, and all of it was kept:

- `Services/Workforce/WorkforceDbViolations.cs` — `IsTimesheetFreezeViolation` discriminator
- `Services/Workforce/WorkforceTimesheetProblems.cs` — `PeriodAlreadyApproved` gains the approver
- `Services/Workforce/WorkforceTimesheetService.cs` — the catch, the re-read, the attribution helper
- `WebApi.Tests/Workforce/WorkforceHarness.cs` — `NewContext(IInterceptor)`
- `WebApi.Tests/Workforce/WorkforceTimesheetTestHost.cs` — `ControllerWithContext`, interceptor seam
- `WebApi.Tests/Workforce/WorkforceTimesheetApproveRaceTests.cs` (new)
- `WebApi.Tests/Workforce/TimesheetApproveRaceSqlServerTests.cs` (new, never executed)

The assemblies were newer than every source (build at 03:48, all sources 03:31–03:47), so the killed run
had compiled cleanly but had not run the tests. No stale-build trap was inherited.

## The defect

Two approvals of one range under different idempotency keys both take a reservation, both pass the
stateful `onProceed` re-check — neither can see the other's uncommitted row — and both stage the period
whose id is DERIVED from (store, range). The loser's `SaveChanges` threw `DbUpdateException`, which
nothing mapped: the controller catches two other types, so it left the action as a 500 with no code, no
conflict kind and nothing naming who holds the period.

## What was added this run

The resumed code proved the refusal but carried three claims its own tests could not falsify. Each is now
falsifiable:

1. **C4 was unfalsifiable.** Both racers used the same approver, so a refusal composed from the REFUSED
   caller's own identity would have carried the identical string and passed. A second payroll-approver
   engagement is now seeded by the test file itself (the shared seed's other manager is deliberately
   `ManagerNoPayroll`), the winner and loser are different people, and the refusal is asserted to name
   the winner and NOT the loser. The re-check test swaps them, so the pair shows the refusal follows the
   winner rather than naming one fixed engagement.
2. **The gate probe did not discriminate.** It asserted only that the period table was empty — true
   whether the held caller was parked at save 2 (its commit, past the re-check) or at save 1 (its
   reservation, in FRONT of the re-check). Parked at save 1 the test would have passed having certified
   the re-check while the database was never asked, and since both paths return the same code nothing
   downstream could tell. The probe now also asserts the held caller's reservation row is durable, which
   is what places it at save 2. Mutation M5 confirms this.
3. **Two discriminator arms were carried but never executed.** On SQLite only the lines' payroll-grain
   index ever fires. The period arm and the line-primary-key behaviour are now pinned by a four-case
   theory over the predicate, labelled in-file as string-matching pins only — they feed a
   `SqliteException` carrying a SQL Server-SHAPED message because `SqlException` has no public
   constructor, so they do NOT show a real `SqlException` clears the 2627/2601 gate.

## Non-vacuity — mutations (`mutate.py`, full output in `mutations.txt`)

Every mutation rebuilds (never `--no-build`) and restores by writing content back, which moves the mtime
forward past the assembly.

| # | Mutation | Result |
|---|---|---|
| M1 | REMOVE THE MAPPING — the catch never engages | **RED** (required) |
| M2 | Narrow the discriminator to the period table alone | **RED** |
| M3 | Attribute from the refused caller, not the committed row (C4) | **RED** |
| M4 | Drop `ChangeTracker.Clear()` | **RED** |
| M5 | Park the held caller at save 1, in front of its re-check | **RED** |
| M6 | Remove the `winner == null` rethrow guard | GREEN — measured, see below |
| M7 | Remove the period arm of the discriminator | **RED** |
| M8 | Remove the `TimesheetLineId` exclusion | GREEN — measured, see below |

## Two arms that are NOT pinned, stated rather than papered over

**M6 — the `winner == null` rethrow is unreachable today.** It exists so a freeze-family violation with
no committed period (two lines at one payroll grain inside ONE command — a defect in the hours read, not
a race) keeps propagating instead of being answered "already approved". No test reaches it, and that is a
property of the row builder rather than an oversight: `WorkforcePayrollRows.BuildRows` iterates a
dictionary keyed on `(StaffMemberId, BusinessDate)` and emits at most one Ordinary and one UnpaidBreak
row per key, so it cannot currently produce a duplicate grain. Forcing it would require mocking the read,
which would test the mock. The arm is kept because that is a guarantee of today's builder, not of the
schema, and the failure it prevents is silent. Recorded in the code comment.

**M8 — the `TimesheetLineId` exclusion is redundant.** No message can name the grain index, or both
`TimesheetPeriodId` and `PayCode`, while also naming `TimesheetLineId`, so the positive arms already
refuse a line primary-key collision. The exclusion is belt-and-braces that keeps that true if the grain
index is ever renamed. Both the code comment and the theory case now say which code does the work, so
nobody reads the exclusion as a tested guarantee. **Flagged for the reviewer**: if the estate's dead-code
rule is read strictly, this is a redundant condition and its removal is behaviour-neutral. I did not
remove it unilaterally.

## Tiers (container-free only)

Filter used throughout, exactly as mandated: `--filter "Database!=SqlServer"`, narrowed for scope runs by
a POSITIVE class-name term. The forbidden `FullyQualifiedName!~SqlServer` was never used.

- Lane facts: **6 passed / 0 failed** (2 race + 4 predicate cases).
- Full container-free tier at this commit: **4439 passed / 0 failed / 10 skipped**.
- Full container-free tier at base `4b37f81b`, measured by reverting the five files and deleting the two
  new ones: **4433 passed / 0 failed / 10 skipped**.
- Delta **exactly +6** — my six facts — and no other test moved. "No regression" is measured, not assumed.

## Can the race only be forced on SQL Server? No.

Every constraint that can refuse a second freeze — the primary key on `TimesheetPeriodId`, the unique
`(StoreId, FromBusinessDate, ToBusinessDate)` index, and the lines' payroll grain — is declared in
`OnModelCreating`, so `EnsureCreated` builds all three and the refusal genuinely happens container-free.
That is what separates this race from its MIG-25/MIG-26 siblings, whose FILTERED indexes only the
migration produces.

What the container-free tier CANNOT show, and what `TimesheetApproveRaceSqlServerTests` is written for:
that the CHAIN installs those constraints (the `AccountingSummaries` lesson — an index in the model and
in every model-built test database and in no migration refuses nothing in production while every suite
reads green), and that a real SQL Server provider message satisfies the discriminator. **That file has
never been executed at any SHA.** No lane evidence rests on it. Treat its first run as a first run.

## Container discipline — a self-report carried forward from the killed run

The killed run recorded: *"I started a SQL container by using an over-broad filter. Recording that; it was
mine and Testcontainers already removed it. Switching to the mandated filter."* That start was caused by
`FullyQualifiedName!~SqlServer`, which does not exclude SqlServer-traited classes whose names do not
contain the string. The container was this lane's own and Testcontainers had already reaped it. This run
started no container, and every run above used `Database!=SqlServer`. No container this lane did not
create was touched.

## Merge with the sibling

`L-WF-TIMESHEET-WIRE` added one new file, `WebApi.Tests/Wire/WorkforceTimesheetWireTests.cs`, and touched
no shared file. I touched none of its files, and it is not yet on this branch. The one signature I
changed, `WorkforceTimesheetProblems.PeriodAlreadyApproved`, has exactly one production caller — inside
my own service — on both branches, so the merge stays additive. The wire suite asserts
`approvedByActorReference` on the period ENTITY and in the CSV; my change adds it to the problem
EXTENSIONS, a different place. No collision.
