# L-REPLAY-PINS-CLOSE — mutation record

## Instrument

- **Base.** **Three of the four** named tests do not exist at `8e2b57de`. Verified per test, not assumed:
  `feature/restaurant-modules` IS exactly `8e2b57de` (the brief's number is correct), but the lanes that
  wrote E1–E3 are **unmerged** — `lane/wf-idempotency-refusal` `a1d57208` (1 ahead / 50 behind),
  `lane/meals-idempotency-refusal` `54714dd6` (1 / 5), `lane/meals-agreement-pin-inverts` `4bbf34a5`
  (2 / 5, and `54714dd6` is its ancestor). At `8e2b57de`: `MealsIdempotencyRefusalTests.cs` (E3) does not
  exist at all, and `WorkforceShiftExchangeTests.cs` exists but carries neither E1 nor E2.
  **E4 is the exception and DOES exist at `8e2b57de`**, at `MealsAgreementWriterTests.cs:173`, including its
  receipt `SingleAsync` on `agr-dupe` at `:193` — so the census's `:173` is a citation from the **true base**.
  (What it pins there is the pre-fix *defect*: `Assert.Null(stranded.CompletedAtUtc)` and a retry answering
  `IdempotencyInProgress`. The lanes replace those two assertions; the `SingleAsync` survives the change.)
  So the base is `8e2b57de` **plus** `4bbf34a5` **plus** `a1d57208`, both merged clean (no conflicts).
  `integration/mig-stack-land` was not used.
- **Worktree.** `/Users/svendaneel/okam/wt-replaypins`, branch `lane/replay-pins-close`. Own worktree, never
  pushed, no shared ref moved. `OkamAPI-modules` (lane branch, live WebApi process, another lane's WIP) untouched;
  the three source lane worktrees were read only through the object database.
- **Tier.** Container-free only: `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"`.
  **No container started.** `FullyQualifiedName!~SqlServer` never used. Positive `FullyQualifiedName~` filters
  were combined with `Database!=SqlServer` for the targeted arms.
- **No `--no-build` anywhere.** Every mutant is applied and restored by a Python write, so the source mtime
  always moves forward and MSBuild cannot call the assembly up to date and measure the previous binary.
- **Mutator.** `mutate.py` (this directory). Each arm asserts its anchor appears **exactly once** before
  editing, and `check` reports clean / MUTATED / UNKNOWN per file. After every restore,
  `git diff --stat Services/` was **empty** — byte-identical, not merely "looks restored".

## Suite numbers

| run | passed | failed | skipped | total | artifact |
| --- | --- | --- | --- | --- | --- |
| baseline, merged base `887f0512`, clean | 4666 | 0 | 12 | 4678 | `baseline-run.txt` |
| lane `6278f0b5`, final | 4666 | 0 | 12 | 4678 | `full-run-final.txt` |

Delta **0** — this lane adds assertions to three existing `[Fact]`s and no new one, so the count is expected to
be unchanged and is. **Skipped is 12 in both runs**: the SQL Server tier was filtered out identically and no
container was started.

**No non-reproducing failure to name.** Every failure recorded below was produced deliberately and disappeared
on restore. Nothing failed that was not mutated.

## The mutation, and why it is not Training's

Training's surviving mutant was "omit the composition's rethrow of the replayed refusal". It has **no literal
counterpart here**: both siblings throw the replayed refusal from **inside** the reservation
(`WorkforceIdempotency.ResolveExistingAsync:318`, `MealsCommandReceiptService.ResolveExistingAsync:420`), so
there is no composition rethrow to delete. A pin built against Training's mutant would pass here and prove
nothing.

The live mutant in these two modules is **a stateful check moved in front of the reservation**. Both
compositions' own remarks invite it, and it silently converts a replay into a re-decide — because a call that
refuses in front of the reservation **never reserves**, so `RefuseAsync` finds no receipt
(`MealsCommandReceiptService.cs:266-272` returns without writing) and records nothing for the retry to replay.
The retry then re-executes the command.

Three arms, all in production sources under `Services/`:

| arm | file | edit |
| --- | --- | --- |
| **A-MEALS** | `Services/Meals/MealsIdempotentMutation.cs` | `onProceed(ct)` hoisted above `receipts.ReserveAsync` |
| **A-WF** | `Services/Workforce/WorkforceScheduleCommit.cs` | `onProceed(ct)` hoisted above `_idempotency.ReserveAsync` |
| **A-AWARD** | `Services/Workforce/WorkforceShiftExchangeService.cs` | an already-awarded check added in front of `_commit.RunAsync` |

A-AWARD is the same defect at the one site the other two cannot reach: the one-award backstop's stateful check
is the filtered unique index **at commit**, so the invited "fix" is to pre-check already-awarded in front of the
reservation. `RevalidateAwardAsync` deliberately does not check it — that is the index's job — which is exactly
what makes the pre-check look like an improvement.

## Instrument audit, by direction

The brief's two failure modes are ruled out by the alternation itself: a wrong-tree mutation would give green
mutants, a stale binary would give red restores, and neither occurred in six consecutive arms.

`WebApi.dll` mtime, sampled around each build (epoch seconds):

| point | `WebApi.dll` | `WebApi.Tests.dll` |
| --- | --- | --- |
| before A-MEALS | 1785847364 | 1785849911 |
| after A-MEALS build | 1785850067 | 1785849911 (unchanged) |
| after A-MEALS restore build | 1785850113 | — |
| after A-WF build | 1785850145 | 1785849911 (unchanged) |
| after A-AWARD build | 1785850210 | 1785850219 |

**`WebApi.dll` moved on every arm** — the production assembly is the one being measured, which is the check
the brief asked for. In two of three arms `WebApi.Tests.dll` did not move at all, which is the sharper
version of the same evidence: the mutant is in production code and nowhere else.

**Why the third arm rebuilt the test assembly and the first two did not.** The discriminator is whether
`csc` re-ran on the test project, and each run says so in its own output — count the test-project compiler
warnings:

| arm | test-project `warning CS…` lines | csc |
| --- | --- | --- |
| A-MEALS (`mut-01-meals.txt`) | **0** | skipped |
| A-WF (`mut-02-wf.txt`) | **0** | skipped |
| A-AWARD (`mut-03-award.txt`) | **717** (CS0105, CS0219, CS0618, CS1998, CS8123, CS8600 …) | re-ran |

A-MEALS and A-WF only **move statements**, which leaves WebApi's *reference* assembly identical, so the
test project's compile inputs were unchanged and csc was skipped. A-AWARD adds a lambda, which changes the
reference assembly — a compile input of the test project — so csc re-ran and emitted the pre-existing
warning set. Neither case is evidence of a test-tree edit: `git status` showed no test file dirty in any
mutant arm, and the `mut-03` stack line `WorkforceShiftExchangeTests.cs:365` matches the committed test text
(`var replay = await Assert.ThrowsAsync<WorkforceProblemException>(...)`), so the assembly under test was
compiled from exactly what is committed.

## The four sites — eight states

### E1 `WorkforceShiftExchangeTests.cs:250` `A_refused_award_replays_its_refusal_to_a_retry_of_the_SAME_key`

World change: the Waiter role link is **restored between the two calls** (removed row captured, re-inserted on
a fresh context), so a re-decide would now award. Kept every original assertion; added `0` audit rows for key
`award-refused`, and a positive control — a **fresh** key awards successfully afterwards, so a restore that
silently did nothing cannot pass.

| state | arm | result | artifact |
| --- | --- | --- | --- |
| MUTATED | A-WF | **RED** — `Assert.IsType() Expected ObjectResult, Actual OkObjectResult`: the retry re-decided and **awarded** | `mut-02-wf.txt` |
| restored | — | GREEN 23/23 | `restore-02-wf.txt` |

### E2 `WorkforceShiftExchangeTests.cs:284` `The_one_award_backstops_refusal_also_replays_with_the_holder_it_named`

The comment claiming "the only thing that can answer it is the recorded outcome" was **false** and is now
corrected in place. World change: the interceptor's competing `Awarded` row — which survives, because
`CompetingAwardCommitInterceptor` has no INSERT/UPDATE filter and fired on a **read** outside any transaction —
is **deleted after the first call**, freeing the award slot. Added zero-Awarded rows after the replay, and a
positive control awarding the same shift under a fresh key.

| state | arm | result | artifact |
| --- | --- | --- | --- |
| MUTATED | A-AWARD | **RED** — `Assert.Throws() Expected WorkforceProblemException, Actual (No exception was thrown)`: the retry re-decided and **awarded** | `mut-03-award.txt` |
| restored | — | GREEN 23/23 | `restore-03-award.txt` |

### E3 `MealsIdempotencyRefusalTests.cs:311` `A_stateful_check_refusing_after_the_reservation_replays_its_refusal_on_the_same_key`

World change: the invitation is put **back to `Pending`** between the calls, so a re-decide would claim and
answer 200. Added the row half the commit-time siblings already carry
(`MealsMemberships.Count(ApplicationUserId == NewHire) == 0`) and a positive control claiming successfully
under a fresh key.

| state | arm | result | artifact |
| --- | --- | --- | --- |
| MUTATED | A-MEALS | **RED** — `Assert.IsType() Expected ObjectResult, Actual OkObjectResult`: the retry re-decided and **claimed** | `mut-01-meals.txt` |
| restored | — | GREEN 24/24 | `restore-01-meals.txt` |

### E4 `MealsAgreementWriterTests.cs:173` `A_second_active_agreement_on_the_same_corridor_is_refused` — **NOT REWRITTEN**

| state | arm | result | artifact |
| --- | --- | --- | --- |
| MUTATED | A-MEALS | **RED**, unmodified — `InvalidOperationException: Sequence contains no elements` at line 197 | `mut-01-meals.txt` |
| restored | — | GREEN 24/24 | `restore-01-meals.txt` |

**This site was already closed, twice.** The census's `:173` is correct for `8e2b57de` and for `54714dd6`;
it is my constructed base that moves the test to `:176`, because `4bbf34a5` inserts ahead of it. Two things
the census did not see:

1. **The test itself already kills the mandated mutant.** Its receipt assertion
   (`MealsCommandReceipts.SingleAsync(r => r.IdempotencyKey == "agr-dupe")`, then `CompletedAtUtc` non-null and
   `ResponseStatusCode == 400`) is present at **both** tips. Under A-MEALS the refusal is decided in front of
   the reservation, so no receipt row exists and the `SingleAsync` throws. Honest qualification: that is a
   **first-call** assertion. It kills this mutant, but it does not discriminate the retry axis on its own.
2. **The retry axis is pinned separately, at `4bbf34a5:225`**, by
   `A_recorded_corridor_refusal_is_replayed_even_after_the_corridor_it_named_is_ended` —
   L-MEALS-AGREEMENT-PIN-INVERTS wrote **exactly the world change the census prescribes for E4** (end the
   corridor between the two calls) plus a positive control. It also went **RED** under A-MEALS.

That is the Training shape the brief itself endorses — the property pinned once, separately — so writing the
census's world change into `:176` would duplicate `:225`'s arrangement and nothing else. Per the standard that
the fix belongs with whoever owns the lane, this site is **named, not rewritten**. The world change is already
there.

## Non-vacuity of the world changes themselves

The three tests were reverted to their pre-lane text (`git checkout 887f0512 --`) with **all three arms
applied at once**, to test the census's actual claim rather than assume it (`mut-04-vacuity.txt`, 7 failed /
40 passed / 47 total):

| site | before this lane | after this lane |
| --- | --- | --- |
| E1 `WorkforceShiftExchangeTests:250` | **GREEN — mutant survives** | RED |
| E2 `WorkforceShiftExchangeTests:284` | **GREEN — mutant survives** | RED |
| E3 `MealsIdempotencyRefusalTests:311` | **GREEN — mutant survives** | RED |
| E4 `MealsAgreementWriterTests:176` | RED already | RED (unchanged by this lane) |
| sibling `MealsAgreementWriterTests:225` | RED already | RED (unchanged by this lane) |

So the census is **right on three of four** and the world change is what closes them — not the extra
assertions, which the reverted tests also lacked but which do not fire in these runs.

## In-flight protection: not broken

A genuinely in-flight duplicate must still answer in-progress and must never execute twice. Nothing in this
lane touches the `InProgress` disposition, and its guards stayed green in every restored run and in the final
full run: `A_genuinely_in_flight_key_still_answers_in_progress_and_signs_nothing`
(`MealsAgreementWriterTests`), `MealsCommandReceiptIdempotencyTests` and `WorkforceIdempotencyTests`. Each
world change is applied **between two completed calls**, never during one, so no key is in flight when the
world moves.

## Mutants that survived — reported

**None survived at the four sites after this lane.** Two observations worth carrying, both from
`mut-01-meals.txt` and `mut-02-wf.txt`, and neither a defect:

- A-MEALS and A-WF are killed **loudly** by the pre-existing success-replay pins as well —
  `A_repeated_idempotency_key_replays_and_signs_exactly_one_agreement`,
  `A_retry_after_the_clock_moves_replays_instead_of_conflicting`,
  `Awarding_again_with_the_SAME_key_replays_the_stored_award_instead_of_a_409`,
  `Declining_again_...`, `Withdrawing_the_offer_again_...`. That is the failure mode both compositions'
  remarks predict in as many words: a stateful check in front of the reservation refuses the command's own
  legitimate replay. The **success** replay was already pinned harder than the **refusal** replay, which is
  precisely the asymmetry the census found.
- The 21 tests the census ruled discriminating were **not disturbed**: no Meals backstop, no WF-rest backstop
  and no primitive test was edited, and all are green in `full-run-final.txt`.

## Correction carried

Training's `AssertTheRetryReplaysTheRefusalAsync` helper drives 14 tests and does **not** discriminate on its
own; Training pinned the property once, separately. **This lane did not touch that helper** and did not touch
any Training file.

## Landing protocol

`6278f0b5` sits on a **synthetic base**. It must land only **after** `a1d57208` and `4bbf34a5`, or after
their successors — the three tests it strengthens do not exist without them.

**The base is reproducible, and a lander can prove it in two commands** rather than trusting this file:

```
git merge-tree --write-tree 8e2b57de 4bbf34a5   -> a68f6f331d6aa10d4201b718b5dbdb9269ff552f  (= 4e87d0f9^{tree})
git merge-tree --write-tree 4e87d0f9 a1d57208   -> 5284cccc0c998e692dd985cebe31799f2125ce54  (= 887f0512^{tree})
```

**Landing order does not matter**, verified two independent ways rather than assumed: the two lanes' changed
file sets are **disjoint** (10 files and 17 files, overlap **0**), and merging in the reverse order
(`8e2b57de` + `a1d57208` = `811d2ca9…`, then + `4bbf34a5`) reproduces the **same** `5284cccc…` tree. If
either OID differs on the day, the base has drifted and the results below are not about the tree being landed.

**If either source lane is rebased, amended or force-updated, re-prove before calling these pins live.** A
conflict is the recoverable case — it stops the lander. The dangerous case is a **clean** merge onto amended
source-lane tests: the pins would still compile and still pass while no longer discriminating, and nothing
in a green suite would say so. Re-running the tests is not sufficient, because a non-discriminating pin is
green by definition. Required on the landed tree:

1. the 47-test filter —
   `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer&(FullyQualifiedName~WorkforceShiftExchangeTests|FullyQualifiedName~MealsIdempotencyRefusalTests|FullyQualifiedName~MealsAgreementWriterTests)"`;
2. **one mutant arm — `python3 mutate.py apply award`** (adjust `ROOT`), which must turn
   `The_one_award_backstops_refusal_also_replays_with_the_holder_it_named` **RED** and nothing else.

A-AWARD is the arm to keep because it is the **only single-test kill** of the three: A-MEALS and A-WF each
red several tests, so their signal survives collateral damage, whereas A-AWARD's is exact — if it stops
killing that one test, or starts killing others, the discrimination has moved and this log no longer
describes the tree. Restore with `python3 mutate.py restore award` and confirm `git diff Services/` is empty.
