```
RETURN: L-A-WORKER-IS-NOT-BLOCKED-BY-HER-SUPERSEDED-SELF
brief: 0e0d4b46
verdict: built
evidence: /Users/svendaneel/okam/OkamAPI-supersededself/WebApi.Tests/Workforce/WorkforceShiftExchangeTests.cs
log:
RED FIRST through the real controllers: publish her Saturday 09-17, republish the same slot OPEN, she asks for it back (200), the manager awards.
Pre-fix the award answered 409 workforce.exchange-not-awardable, "the candidate already works an overlapping shift" - captured verbatim off the unfixed predicate.
That overlapping shift was her own row in the revision publication 2 superseded. The test pins the row still Published and still hers, so it cannot pass vacuously.
PREDICATE, named before changing it: two questions, neither answering the other. Is the row a commitment at all (state), and is that commitment LIVE (lineage).
A Cancelled row sits in the CURRENT lineage and only the state filter refuses it; a Published row under a superseded publication passes the state filter and only lineage refuses it.
So lineage is ADDED to State != Cancelled, never swapped for it. It composes WorkforceScheduleSupport.CurrentLineageOnly - no sixth copy of the predicate.
That is the predicate the publish-time 3.8.4 guard already uses, and this check previews that guard: a refusal publish would not make is a promise the manager cannot keep.
ARM 2, the widening guard: one never-superseded publication, she already works 09-17, she asks for the 13-21 across it - still 409 not-awardable, zero Awarded rows.
ARM 3, the swap guard: a shift the manager removed inside the draft (Cancelled, kept for lineage) does not refuse the award. It reds if the state filter is dropped.
C4: both pass-arms assert the award names WorkforceWorld.ManagerStaffMemberId on the model AND on the exchange.award audit row, never an ambient or null actor.
NOT CHANGED, deliberately: Draft rows still refuse. 3.8.4 itself checks Published only, so tightening to Published-only is a second admission change owed its own probe.
OBSERVED, unfixed: LoadAssignmentAsync carries no lineage filter, so a stale client can still request and win a TARGET that lives only in a superseded revision. Read from code.
BASE feature/restaurant-modules @ a14084874, read fresh at dispatch. lane/a-worker-is-not-blocked-by-her-superseded-self @ f35eb4bb8, fresh worktree ../OkamAPI-supersededself, unpushed.
Fast tier "Database!=SqlServer": 4755 passed / 0 failed / 10 skipped against the 4752 / 0 / 10 baseline. +3, exactly the three tests above; no other suite moved.
No SQL container started, none touched; okam-lwtwo-sql, okam-lwtwo-redis, 3971 and 5971 untouched. The tier run dirtied artifacts/journeys/ev-dietary/run-sheet.*; reverted, not committed.
END RETURN
```

## Detail

### What the predicate should be, and why

`RevalidateAwardAsync` asks one question: *is this candidate already committed to work that
overlaps the shift the manager is about to hand her?* A row is evidence of such a commitment only
if two independent things hold, and the old predicate tested one of them.

| | question | wrong answer if omitted |
| --- | --- | --- |
| `State != Cancelled` | is the row a commitment at all? | a shift the manager removed inside the draft — kept for lineage rather than deleted (§3.3) — would refuse the award |
| `CurrentLineageOnly` | is that commitment still live? | a superseded publication's row — which stays `Published`, because retiring it would rewrite an immutable publication (§3.8.4) — refuses the award |

They are not substitutes. A `Cancelled` row belongs to the **current** lineage, so lineage alone
keeps it. A `Published` row in a **superseded** publication passes the state filter, so state alone
keeps it. The correct predicate is therefore **both**, and the change is an addition rather than a
swap. Arm 3 of the proof exists precisely to red if a later hand replaces one with the other.

The reason the missing half mattered so much is that its failure was not occasional. `State` alone
answers *"was she ever rostered at this hour"*, and for the reopen journey the answer is yes
**because** the shift was taken off her. The refusal was therefore certain for exactly the workers
the feature exists to serve, and no amount of data cleanup could clear it — the blocking row is one
§3.8.4 forbids anybody from touching.

Composing `WorkforceScheduleSupport.CurrentLineageOnly` rather than inlining a copy is also what
keeps this check agreeing with `CheckPersonOverlapsAsync`, the in-transaction §3.8.4 guard the
publish path runs. The award is a *preview* of that guard: it tells a worker she has the shift, and
the successor publish is where the roster actually changes. A preview that refuses what publish
would accept turns the manager's screen into a dead end.

### The three tests

All in `WebApi.Tests/Workforce/WorkforceShiftExchangeTests.cs`, all driving real weeks through
draft → batch → validate → publish and the real `WorkforceMeController` /
`WorkforceRequestsController`. Nothing is hand-poked.

1. `An_award_is_not_refused_by_the_candidates_own_row_in_a_superseded_revision` — the red-first
   proof. Publication 1 gives her the Saturday; publication 2 supersedes it with the same slot
   open; her page offers exactly the reopened row; she asks (`RequestSubmitted`); the manager
   awards. Pre-fix: **409** `workforce.exchange-not-awardable`, detail *"The exchange candidate can
   no longer be awarded this shift: the candidate already works an overlapping shift."* Post-fix:
   `Awarded`, `RequiresSuccessorRevision`, and the actor named.
   It also asserts the premise — the superseded row is still present, still `Published`, still hers,
   and covers the same instants as the live one — so the test cannot go green by the fixture
   quietly ceasing to produce the hazard.
2. `An_award_is_still_refused_when_the_overlapping_shift_is_in_the_LIVE_plan` — one publication,
   never superseded, in which she already works 09–17. Asking for the 13–21 that runs across it is
   still refused 409 with the same code, and no row reaches `Awarded`. This is the arm that fails if
   the fix widens admission too far.
3. `An_award_is_not_refused_by_a_shift_the_manager_cancelled_inside_the_draft` — the same week, but
   her 09–17 is deleted inside the draft through the real batch endpoint (`Delete = true`), so it
   publishes as a `Cancelled` row in the current lineage. The award succeeds. This arm fails if the
   state filter is ever swapped out for the lineage one.

Arms 2 and 3 pass before the fix as well as after — they are guards on the change, not evidence of
the defect, and are named as such.

### C4 — the actor

`AwardAsync` already resolves the actor from `RequireCapabilityAsync` and stamps
`AwardedByActorReference` plus the `exchange.award` audit row. That was previously unasserted at
this endpoint. Both new pass-arms now check both places against
`WorkforceWorld.ManagerStaffMemberId`, so a future refactor that lets a background path award
without an identity reds here.

### Non-vacuity

Ran twice against the same final test file with the service file swapped by
`git checkout a14084874 -- Services/Workforce/WorkforceShiftExchangeService.cs` and `touch`ed each
way, so the assembly genuinely recompiled between the two (the `--no-build` mtime trap in
`CLAUDE.md`):

- unfixed predicate: `Failed: 1, Passed: 24` — the failure is arm 1 and only arm 1
- fixed predicate: `Failed: 0, Passed: 25`

### Left open

- **The target is loaded without a lineage filter.** `LoadAssignmentAsync` (used by both
  `RequestOpenShiftAsync` and `AwardAsync`) checks `State == Published` only, so a client holding a
  shift id it saw before a republish can still open a candidacy on — and be awarded — a row that
  lives only in a superseded revision. This is the *opposite* direction from this lane's fix (it
  admits too much rather than refusing too much), it is read from the code rather than probed, and
  closing it would change admission again. Not touched.
- **Draft rows still refuse.** `State != Cancelled` admits `Draft`, so a shift proposed for her in
  an in-flight successor draft blocks the award. §3.8.4 checks `Published` only and documents that
  "a draft elsewhere is not a commitment", which argues for tightening this to `Published` too —
  but that is a second admission change with its own scenario (a manager who prepares the successor
  draft *before* awarding), and it deserves its own red-first proof rather than riding along here.
  The conservative side of that error costs a recoverable 409, never a double-booking, because the
  publish transaction is the enforcement point.
- **No SQL Server evidence.** The fast tier only. The composed predicate is the same LINQ four other
  call sites already run on SQL Server, but this fifth composition has not been executed there.
- **C5 is not met by this lane.** The proof is a suite; a person walking the reopen-and-re-award
  journey in the UI is still owed.

### Files

- `Services/Workforce/WorkforceShiftExchangeService.cs` (+13 / −1)
- `WebApi.Tests/Workforce/WorkforceShiftExchangeTests.cs` (+143)

Branch `lane/a-worker-is-not-blocked-by-her-superseded-self` @ `f35eb4bb8`, based on `a14084874`,
in worktree `/Users/svendaneel/okam/OkamAPI-supersededself` created for this lane so no sibling's
checkout was disturbed. Committed, **not pushed**, not merged; worktree otherwise clean.
