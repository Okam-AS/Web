# L-MEALS-AGREEMENT-PIN-INVERTS - mutation log

Brief: 7f0114f5. Actor: agent:L-MEALS-AGREEMENT-PIN-INVERTS.

## Base and worktree

- Branch: `lane/meals-agreement-pin-inverts`, created off `54714dd6`
  ("A refused meals command answers the retry with its refusal, not with in-progress forever",
  `lane/meals-idempotency-refusal`, itself based on `569887a5`).
- Worktree: `/Users/svendaneel/okam/OkamAPI-mealsagrpin` (my own; I did not touch
  `/Users/svendaneel/okam/OkamAPI-modules`, which is on another lane branch with a live WebApi process).
- Tier: container-free only. Every run used `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter
  "<positive class filter>&Database!=SqlServer"`. No `FullyQualifiedName!~SqlServer` anywhere; no
  container was started and none was touched.
- No `--no-build` in any run. Restores were done with `cp` + `utime`, never `mv`, so the restored
  source is always newer than the built output and MSBuild cannot skip the recompile.

## Coordinator correction, re-measured - and one correction to the correction

Mid-lane the coordinator relayed `L-MEALS-DOCSYNC`'s finding: that `54714dd6` already inverts the
assertions **and** already replaces the "documented stuck-reservation tradeoff" comment, so the brief
described the branch as it was rather than as it is. Re-measured at `54714dd6` directly:

- **Inversion: already there. Confirmed.** The brief's premise is contradicted by `54714dd6`'s own diff.
- **Comment: docsync is right about one of two comments and wrong about the other.** There are TWO. The
  test-side one (`MealsAgreementWriterTests`, quoting *"the module's documented stuck-reservation
  tradeoff"*) is indeed replaced by `54714dd6`. The **service-side one, at the stranding site itself**, is
  not - `git show --name-only 54714dd6` does not list `Services/Meals/MealsAgreementService.cs` at all,
  and `git show 54714dd6:Services/Meals/MealsAgreementService.cs` still carries, at lines 190-191:

  > `// Throwing here strands the reservation (the module's documented tradeoff — a same-key`
  > `// retry then gets InProgress and the caller uses a fresh key), which is correct: an`

  If that reading stands as reported, **both lanes drop it**: docsync because it believes the work is done,
  this lane because it was told the same. It is the weaker form of exactly the defect this lane exists to
  kill - a standing instruction to keep the stranding, sitting on the site my exit criteria names. I fixed
  it (comment only) rather than leave it to fall between the two lanes. Trivially droppable at merge: one
  6-line comment hunk, in a file `54714dd6` never opened.

## Instrument audit (mutated tree == measured tree)

The docsync lane found a mutation proof that mutated one tree while measuring another and reported false
GREEN. Checked here before drawing any conclusion:

- The driver's `REPO` is `/Users/svendaneel/okam/OkamAPI-mealsagrpin`; it mutates
  `os.path.join(REPO, file)` and runs `dotnet test` with `cwd=REPO` against the **relative** path
  `WebApi.Tests/WebApi.Tests.csproj`. There is no second tree in the driver to confuse.
- The runner prints the assembly it measured:
  `Test run for /Users/svendaneel/okam/OkamAPI-mealsagrpin/WebApi.Tests/bin/Debug/net8.0/WebApi.Tests.dll`
  - the same worktree root that was mutated.
- **The failure mode is excluded by direction, not just by inspection.** Mutating tree A while measuring
  tree B yields GREEN mutants; all three came back RED. Measuring a permanently stale/mutant binary yields
  RED restores; all three restores came back GREEN. The results alternated RED/GREEN with the edits six
  times, which a fixed or foreign assembly cannot do.

## What was already built, and by whom

Both halves of the exit criteria were already landed by the sibling lane in `54714dd6`. I am recording
that rather than re-claiming it:

1. **The inverted assertion.** `54714dd6` already rewrote
   `MealsAgreementWriterTests.A_second_active_agreement_on_the_same_corridor_is_refused`: the assertions
   that pinned the defect (`Assert.Null(stranded.CompletedAtUtc)` and
   `Assert.Equal(MealsProblemCodes.IdempotencyInProgress, retry.Code)`, under a comment naming
   *"the module's documented stuck-reservation tradeoff"*) became `Assert.NotNull(receipt.CompletedAtUtc)`,
   `Assert.Equal(400, receipt.ResponseStatusCode)` and `Assert.Equal(MealsProblemCodes.Validation, retry.Code)`.
   It was inverted in place, not deleted, so `git log -p` on that file still shows the old wording as
   something that was once true. Nothing further was owed here.

2. **The one-active-corridor site.** It records a refusal, and it does so *without a change at the site*:
   `MealsAgreementService.CreateAsync` passes its stateful corridor check as the `onProceed` hook of
   `MealsIdempotentMutation.CommitAsync`, and `54714dd6` wrapped `onProceed` + `stage` + `CompleteAsync`
   in a `catch (MealsProblemException refusal)` that calls `receipts.RefuseAsync(...)` before rethrowing.
   `Services/Meals/MealsAgreementService.cs` is not in `54714dd6`'s file list and did not need to be.
   **Returned as already-built, not re-done.**

## What this lane added

Three things, all of them the *pin* rather than the behaviour:

- `MealsAgreementWriterTests.A_second_active_agreement_on_the_same_corridor_is_refused` -
  `Assert.Equal(ex.Message, retry.Message)`. Code + status alone do not separate "the refusal was replayed"
  from "the same verdict was reached again"; the detail does.
- `MealsAgreementWriterTests.A_recorded_corridor_refusal_is_replayed_even_after_the_corridor_it_named_is_ended`
  (new). One variable: the corridor the refusal named is **ended between the two calls**, so the stateful
  check would now pass. The same key must still answer the recorded refusal. A **fresh** key signing
  successfully at the end is the arrangement's own positive control - without it the ended-corridor step is
  unfalsifiable, because a still-failing check would produce the same refusal.
- `MealsAgreementWriterTests.A_genuinely_in_flight_key_still_answers_in_progress_and_signs_nothing` (new),
  with a `KillTheCompletionCommit` interceptor that fails the completion save with an
  `InvalidOperationException` - deliberately *not* a `MealsProblemException`, so the envelope records no
  outcome and the reservation is left genuinely in flight, as a process dying mid-command leaves it. The
  duplicate must still answer `meals.idempotency-in-progress` and must sign nothing. This is the guard the
  fix must not have removed.
- `Services/Meals/MealsAgreementService.cs` - the `onProceed` comment still read *"Throwing here strands the
  reservation (the module's documented tradeoff - a same-key retry then gets InProgress and the caller uses
  a fresh key)"*. That is the same shape as the test that asserted the defect: a standing instruction to keep
  it. Rewritten to state what the site now does. **Comment only; no behaviour change at the site.**

## Mutation matrix

Driver: `mutate.py` in this directory (Python, per-item output, not a summary count). Raw output:
`mutate-raw.txt`. Filter: `FullyQualifiedName~MealsAgreementWriterTests&Database!=SqlServer`, 14 tests.

| # | mutation | file | mutated | restored |
|---|----------|------|---------|----------|
| baseline | - | - | 14/14 pass | - |
| M1 | `RefuseAsync(...)` in the envelope's refusal catch removed (the stranding defect restored) | `Services/Meals/MealsIdempotentMutation.cs` | **2 red** | 14/14 pass |
| M2 | `MealsReceiptDisposition.InProgress` -> `Proceed` for a reserved-but-unfinished receipt (in-flight guard removed) | `Services/Meals/MealsCommandReceiptService.cs` | **1 red** | 14/14 pass |
| M3 | `Detail = refusal.Message` -> a fixed generic string (the recorded refusal loses its own detail) | `Services/Meals/MealsCommandReceiptService.cs` | **2 red** | 14/14 pass |

Named reds, per mutant:

- **M1** - `A_second_active_agreement_on_the_same_corridor_is_refused`,
  `A_recorded_corridor_refusal_is_replayed_even_after_the_corridor_it_named_is_ended`.
  With the recording gone the key answers `meals.idempotency-in-progress` again, which is precisely the
  behaviour the old assertions pinned. The in-flight test stays green, correctly: M1 does not touch the guard.
- **M2** - `A_genuinely_in_flight_key_still_answers_in_progress_and_signs_nothing` only.
  Under M2 the duplicate proceeds and signs the corridor a second time - the exact "a change that makes
  every key replayable has removed the guard" failure. The two corridor tests stay green, correctly: their
  keys carry a *recorded* outcome, which M2 does not affect. That the two mutants red disjoint sets is
  itself the evidence that the pair pins two different properties.
- **M3** - the two corridor tests, on the `Message` assertions alone (code and status still match).
  This is what proves those assertions are load-bearing rather than decoration: they pin that the
  *recorded* refusal is what comes back, not merely that *a* refusal does.

**Surviving mutants: none.** All three were killed and all three restored to 14/14.

## Wider run

`dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"` on the finished tree:

```
Passed!  - Failed:     0, Passed:  4649, Skipped:    12, Total:  4661, Duration: 5 m 18 s
```

No failure had to be re-run and none failed to reproduce, so there is no non-reproducing name to capture.

The full run dirties `artifacts/journeys/ev-dietary/run-sheet.{json,md}` as the brief said it would (the fix
lives on `lane/dated-test-output`, which is not an ancestor here). Restored with `git checkout --`, not
committed.

## Constraints

- **No migration.** Confirmed independently of the sibling's finding: `ResponseStatusCode` is
  `int?` on `MealsCommandReceipt` with no CHECK constraint in
  `Migrations/20260727221455_RestaurantModules_Initial.cs`, and recording a refusal writes a *value* into it.
  Nothing in this lane adds an index, unique constraint or check constraint.
- **C1 (append-only).** The new test sets `MealsAgreement.Status` to `Ended`. `MealsAgreement` carries
  neither the `GuardAppendOnly` guard in `ApplicationDbContext` (whose Meals members are `MealsAuditEvent`,
  `MealsFundingAllocation`, `MealsCreditAdjustment`, `MealsStatementRun`) nor any AFTER trigger - the only
  Meals triggers in the chain are `TR_MealsAuditEvents_AppendOnly`, `TR_MealsFundingAllocations_AppendOnly`,
  `TR_MealsCreditAdjustments_AppendOnly` and `TR_MealsStatementLines_FinalizedImmutable`. Ending a corridor
  is the module's own documented supersession step ("the superseded row moves to Ended",
  `Enums/Meals/MealsAgreementStatus.cs`).
- **C2/C3/C4/C6/C7.** Untouched: no migration, no new service/route/flag, no money-path write, no statutory
  string, no log or telemetry call.
- **C5.** Nothing here is claimed as accepted. This lane's output is a suite pin; the module's acceptance
  remains Sven walking the journey.

## Verdict

`fail-spec`, per the coordinator's rule that both halves being already done is a whole-lane `fail-spec`.
Both halves as the brief described them exist at `54714dd6`. Recorded rather than re-done.

What is **not** at `54714dd6` is the exit's third clause - *"pinned by a test that reds if either goes
back"*. That clause was genuinely open, and mutant **M3 proves it**: with the recorded refusal's detail
replaced by a generic string, `54714dd6`'s own assertions (code + status) all still pass. M3 is killed only
by the `Message` assertions this lane added. A retry that re-decides and a retry that replays are
indistinguishable to the pre-existing test.

So the pin is built and mutation-proven at commit `4bbf34a5` on `lane/meals-agreement-pin-inverts`, offered
for the coordinator to take or drop. I am not claiming `built` over it, because the brief's premise - that
the inversion was owed - is contradicted, and that is the fact the plan needs.

## Files touched (for the merge)

- `Services/Meals/MealsAgreementService.cs` - **comment only**, in the `onProceed` lambda. Not touched by
  `L-MEALS-IDEMPOTENCY-REFUSAL` (`54714dd6`), so no conflict with it. `L-MEALS-DOCSYNC` is text-only and may
  reach the same paragraph; if it does, its wording wins on merge - the behavioural claim is identical.
- `WebApi.Tests/Meals/MealsAgreementWriterTests.cs` - one strengthened assertion, two new `[Fact]`s, one
  private interceptor class, an interceptor parameter on the private `Service` helper, three usings.
  `54714dd6` touched this file too; my edits sit on top of its version, on a branch based on it.

I did **not** touch `Services/Meals/MealsMembershipService.cs` or
`Services/Meals/MealsCommandReceiptService.cs` - the two the idempotency lane changed and the merge will be
watching. They were mutated and restored during the matrix above and are byte-identical to `54714dd6`
(`git status` shows only the two files listed here).
