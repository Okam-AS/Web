```
RETURN: L-PLANNED-MINUTES-HONOUR-LINEAGE
brief: 8757d1ab
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-wt-plannedmin/WebApi.Tests/Workforce/RepublishedWeekPlannedReadsTests.cs
log:
RED FIRST, four measurements on ONE republished Oslo week (2026-07-06..12) driven through the real draft/batch/validate/publish endpoints. Numbers, not presence checks.
1 WorkforceActualMinutes.ReadAsync: planned 480 -> 960 minutes. The payroll CSV also stopped being byte-identical across the republish, which is that export's own stated promise.
2 WorkforceLabourBandService: (unpunched shifts, unpunched cost, planned-rest-of-day cost) = (1, 84000, 84000) -> (2, 168000, 168000). 840,00 kr read as 1 680,00 kr, twice over.
3 WorkforceAttendanceService.GetAttendanceAsync: planned side of variance 480 -> 960, so a worker who punched exactly her shift reads as 480 minutes short of it.
4 WorkforceRequestsService.FirstAffectedPublishedRevisionAsync named the SUPERSEDED revision instead of the live one. Fixed here rather than deferred to its own lane.
Reasoning for 4: it is a POINTER, not a count. The value is the anchor a manager spawns a successor revision from, and a frozen revision is not one to spawn from.
Correct answer: the earliest overlapping shift in the CURRENT lineage, and NULL when the live plan no longer rosters her across the leave. Same predicate, different reason.
Its red is deterministic because publication 2 RESCHEDULES the shift later, so the dead 09:00 row outranks the live 12:00 one in every StartsUtc ordering.
FIX: all four compose WorkforceScheduleSupport.CurrentLineageOnly. No fifth copy. ContractExposure is fixed transitively, since it reads through WorkforceActualMinutes.
BASE: the extraction had already reached me. OkamAPI-modules sat on the rescue-2026-08-06-open-shifts-lineage branch @ 5243c06a7, so I branched off it. No port, no compose-in.
Fast tier "Database!=SqlServer", both sides measured by me on this tree: baseline 4358 passed / 4 failed / 12 skipped, the 4 being exactly my reds; after 4362 / 0 / 12.
NO SQL container: free pages measured 2.65 GiB, under the ~3 GiB floor. Every run was the SQLite tier; okam-lwtwo-sql/redis and ports 3971/5971/15436 untouched.
COMMITTED, unpushed, unmerged: lane/planned-minutes-honour-lineage @ 589056dfb, fresh worktree ../OkamAPI-wt-plannedmin. Five files, +364/-4.
SWEEP: no fifth State==Published reader is lineage-blind. WorkforceShiftExchangeService:648 filters State != Cancelled and stays open, a different predicate the prior lane already recorded.
OBSERVED: a fast-tier run rewrites artifacts/journeys/ev-dietary/run-sheet.{json,md} with a fresh capture timestamp, dirtying two tracked files. Reverted; any tier lane will meet it.
END RETURN
```

## Detail

### The defect

Four readers filtered on `State == WorkforceShiftAssignmentState.Published` with no lineage filter. A
superseded publication's assignments deliberately stay `Published` — retiring them would rewrite an
immutable publication (§3.8.4) — so `State` alone answers "was this ever rostered", never "is this
rostered NOW".

What makes it worse than a doubled number is the asymmetry. Paid minutes come from
`WorkforceClockSessions`, which carry no revision and do not double. A republish therefore moves the
PLAN and leaves the ACTUAL alone, and planned-versus-actual variance is the number the module exists
to show.

### The four measurements

One scenario, one week, one worker, one Tuesday 09:00–17:00 Oslo shift (480 minutes, no breaks).
Publish, read, republish the same week through the same endpoints, read again.

| Reader | Read after publication 1 | Read after an identical republish (pre-fix) |
| --- | --- | --- |
| `WorkforceActualMinutes.ReadAsync` | 480 planned minutes; a CSV | 960 planned minutes; a different CSV |
| `WorkforceLabourBandService` | 1 unpunched shift, 84 000 minor, 84 000 minor | 2 unpunched shifts, 168 000 minor, 168 000 minor |
| `WorkforceAttendanceService.GetAttendanceAsync` | planned 480, actual 480, variance 0 | planned 960, actual 480, variance −480 |
| `WorkforceRequestsService.FirstAffected…` | the live revision | the superseded revision |

Post-fix every "after" cell equals its "before" cell, including the export bytes.

The labour-band assertion is a single tuple `Assert.Equal` rather than three, deliberately: asserted
separately the count fails first and the kroner never reach the receipt.

### `FirstAffectedPublishedRevisionAsync` — what the right answer is

It does not double anything, so "apply the filter" is not self-justifying. `WorkforceTimeOffRequest`
says what the field is for: *"the anchor for spawning a successor revision on approval"*. A superseded
revision is frozen and terminal — no successor can be spawned from it, and no reader honours its rows.
Naming one sends the manager somewhere there is nothing to do while the shift the leave actually
collides with sits unattended in the live plan.

So the correct answer is the earliest overlapping shift **in the current lineage**, and `null` —
honestly — when the live plan no longer rosters that person across the leave. That is the same
predicate as the other three for a different reason, which is why it is fixed here and named
separately rather than folded into the doubling story.

No extra tie-break was added. Within one store's current lineage, `OrderBy(StartsUtc)` across two
different weeks' live revisions already answers "first affected" correctly.

The red is made deterministic by RESCHEDULING on the second publication (Tuesday 12:00–20:00 rather
than 09:00–17:00) instead of republishing byte-identically. The dead revision's 09:00 row then
outranks the live 12:00 row in every `StartsUtc` ordering, so the wrong answer is reached every run
rather than by an arbitrary tie-break. An identical republish is the same bug with an arbitrary winner.

### Files

- `Services/Workforce/WorkforceActualMinutes.cs`
- `Services/Workforce/WorkforceLabourBandService.cs`
- `Services/Workforce/WorkforceAttendanceService.cs`
- `Services/Workforce/WorkforceRequestsService.cs`
- `WebApi.Tests/Workforce/RepublishedWeekPlannedReadsTests.cs` (new)

Branch `lane/planned-minutes-honour-lineage` @ `589056dfb`, based on `5243c06a7`. Worktree
`/Users/svendaneel/okam/OkamAPI-wt-plannedmin` off the `OkamAPI-modules` repo, created so the sibling
lane's checkout was never disturbed. Not pushed, not merged, worktree clean.

### Receipts

- `docs/plan/lanes/L-PLANNED-MINUTES-HONOUR-LINEAGE/red.txt` — four failures with the numbers
- `docs/plan/lanes/L-PLANNED-MINUTES-HONOUR-LINEAGE/green.txt` — four passes
- `docs/plan/lanes/L-PLANNED-MINUTES-HONOUR-LINEAGE/tier-baseline.txt` — 4358 / 4 / 12
- `docs/plan/lanes/L-PLANNED-MINUTES-HONOUR-LINEAGE/tier-after.txt` — 4362 / 0 / 12

Both tier runs were taken on this worktree with the identical test file; the baseline differs only by
`git checkout 5243c06a7 --` of the four service files, so the +4 is attributable to nothing else.

### Left open

- `WorkforceShiftExchangeService.RevalidateAwardAsync:648` filters `State != Cancelled` with no
  lineage filter — a different predicate, already recorded by `L-OPEN-SHIFTS-EXCLUDE-SUPERSEDED`.
  Untouched here.
- No SQL-Server-tier evidence: free pages measured 2.65 GiB, under the ~3 GiB floor, so no container
  was started. The four readers are pure LINQ over one predicate three other call sites already run on
  SQL Server, but the composed queries have not been executed against it.
- A fast-tier run rewrites `artifacts/journeys/ev-dietary/run-sheet.{json,md}` with a fresh
  `capturedAtUtc`. Reverted here; it is not caused by this change.
