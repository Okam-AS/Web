# L-WF-CLOCK-WIRE — the six wire tests run and mutated, and one correction to the census

Reason-shape hit: the census filed this under **(4) the exit names something not in the estate**. **That
reading is too strong, and correcting it is the first finding here.** What is true is (1) — the runs happened
and nobody wrote them down at a durable path, plus an unlanded branch.

## The census's reason, and what measuring it showed

> `git grep clock-state -- 'Controllers/*.cs'` at the trunk returns **nothing**, so the read the exit's fourth
> clause names is not in the estate at all.

The first half is right and the conclusion is not. Measured today in `/Users/svendaneel/okam/OkamAPI-modules`:

```
git log --all --oneline -S"clock-state" -- 'Controllers/*.cs'
f14c91ec1 The punch response says what actually happened
```

The route **exists** — `[HttpGet("clock-state")]` at `Controllers/WorkforcePosController.cs:161`, returning
`PosClockStateResponse`, gated by the module gate and resolving the operator through the manager-reviewed
`WorkforceStaffMember.OperatorId` link (§7.2). It is on `lane/wf-clock-wire @ f14c91ec1`, which is **not an
ancestor of the trunk `6d5328004`** — checked with `git merge-base --is-ancestor`. So this is not an exit
describing a capability nobody built; it is an exit describing a capability **that has not landed**. Those
need different remedies, and only the second is a landing lane.

## The evidence line as the original agent wrote it

Preserved here because `plan verify` overwrites the `evidence:` line with the single path it is given:

```
evidence: OkamAPI lane/wf-clock-wire f14c91ec (base feature/restaurant-modules 3579bbbc); container-free tier 4377/0/12 vs base 4369/0/12
```

## Where these runs were made

`/Users/svendaneel/okam/wt-wfclockwire` at `f14c91ec1`, the lane's own worktree, because the code exists
nowhere else. Left byte-clean and at the same commit. Nothing pushed, no trunk moved.

## The four distinctions, and the six tests that carry them

From `clockwire-clean.trx`, `total="6" executed="6" passed="6" failed="0"`, finish
`2026-08-09T17:51:33.26+02:00`:

| test | exit clause |
| --- | --- |
| `A_clock_out_that_closed_nothing_does_not_answer_what_a_real_clock_out_answers` | a clock-out that closed nothing |
| `A_cross_employer_refusal_is_not_a_clean_clock_in_wearing_another_employers_timestamp` | a cross-employer refusal |
| `The_already_open_refusal_names_the_instant_the_accepted_punch_reported` | an already-open session |
| `The_register_can_ask_whether_this_operator_is_clocked_in_and_the_answer_moves` | **the clock-state read** |
| `The_clock_state_read_survives_the_kill_switch_that_stops_the_punch_beside_it` | the clock-state read (§9.2) |
| `The_clock_state_read_answers_only_an_operator_session_it_can_resolve` | the clock-state read |

## The mutation

`Models/Workforce/WorkforcePosModels.cs`, `StateOf` — the two exception outcomes put back to reporting an
open session, which is the defect the commit's own message describes (*"sessionState was computed from
whether some timestamp was present, so a clock-out that closed nothing and a cross-employer punch both
reported Open"*):

```diff
                 case WorkforceClockIngestOutcome.CrossEngagementException:
                 case WorkforceClockIngestOutcome.MissingPunchException:
-                    return WorkforcePosSessionState.None;
+                    return WorkforcePosSessionState.Open;
```

## Which assertions went red, and what the messages said

| test | message |
| --- | --- |
| `A_clock_out_that_closed_nothing_does_not_answer_what_a_real_clock_out_answers` | `Assert.Equal() Failure` / `Expected: None` / `Actual: Open` |
| `A_cross_employer_refusal_is_not_a_clean_clock_in_wearing_another_employers_timestamp` | `Assert.Equal() Failure` / `Expected: None` / `Actual: Open` |

Two red, four green — the blast radius a one-line change to the exception branch should have. `Actual: Open`
is the consequence sentence stated as a measurement: a screen reading that body congratulates a worker at the
moment their day stopped being recordable.

## The counts, which are what disprove a void run

| run | `<Counters>` | `<Times>` finish | `WebApi.dll` mtime after |
| --- | --- | --- | --- |
| `clockwire-clean.trx` | `total="6" executed="6" passed="6" failed="0"` | `17:51:33.26+02:00` | `2026-08-09 17:51:18` |
| `clockwire-mutant.trx` | `total="6" executed="6" passed="4" failed="2"` | `17:51:59.62+02:00` | `2026-08-09 17:51:53` |
| `clockwire-restored.trx` | `total="6" executed="6" passed="6" failed="0"` | `17:52:43.03+02:00` | `2026-08-09 17:52:36` |

`executed="6"` across all three, so the kill is real. `WebApi.dll`'s mtime moves before each run
(17:51:18 → 17:51:53 → 17:52:36), so nothing was measured against a stale assembly. `git status --short` was
empty after the restore.

## What this artifact does not claim — and one of these needs an owner

- **Not landed.** `f14c91ec` is not an ancestor of `6d5328004`. Everything above is true of the branch. The
  sibling `L-CLOCKOUT-STATE-IS-NOT-OPEN` landed the `sessionState` half separately as
  `WebApi.Tests/Workforce/PosClockOutStateWireTests.cs`, which **is** on the trunk — so today the estate
  carries one of the four distinctions and not the clock-state read. Landing this branch is what closes
  that, and it is a different lane's work.
- **Not C5.** No operator has walked a register screen against this route. The clock-state read exists so a
  screen can stop guessing whose punch the next press lands on; nobody has shown a screen doing it.
