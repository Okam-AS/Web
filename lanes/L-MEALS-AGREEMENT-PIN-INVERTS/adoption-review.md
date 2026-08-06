# L-MEALS-AGREEMENT-PIN-INVERTS — adoption review of `4bbf34a5`

Brief: `c4cc4c1b`. Actor: `agent:L-MEALS-AGREEMENT-PIN-INVERTS`. Ruling: `adopt-the-offered-pin` (2026-08-05).

This is **not** a re-build. `4bbf34a5` exists; the ruling adopts it. The single objection was that the
clerk would be accepting work the lane itself declined to assert. **This document supplies the withheld
assertion, by injection.** It also corrects two claims the offering lane made in its own mutation log.

## Refs, read at the integration tip as the brief required

Every source claim below was read with `git show <ref>:<path>`, never out of a working directory.

| ref | what it is |
|---|---|
| `8e2b57de` | `feature/restaurant-modules` tip — the integration ref |
| `569887a5` | merge-base of `4bbf34a5` and the tip; **is** an ancestor of the tip |
| `54714dd6` | the Meals refusal fix (`lane/meals-idempotency-refusal`). **NOT an ancestor of `8e2b57de`** |
| `4bbf34a5` | the offered pin, one commit off `54714dd6`. **NOT an ancestor of `8e2b57de`** |
| `lane/replay-pins-close` | already contains **all three** of `8e2b57de`, `54714dd6`, `4bbf34a5` |

Review worktree: `/Users/svendaneel/okam/OkamAPI-agrpinrev`, detached at `4bbf34a5`, created by me.
I did not check out, move, or push any shared ref, and I did not touch `OkamAPI-modules`
(on `lane/meals-grace-pins`) or `OkamAPI-mealsidemref` (on `lane/meals-idempotency-refusal`).

## The production hunk is comment-only, and both its factual claims hold

`git show 8e2b57de:Services/Meals/MealsAgreementService.cs` still carries, verbatim, the stale comment:

> `// Throwing here strands the reservation (the module's documented tradeoff — a same-key`
> `// retry then gets InProgress and the caller uses a fresh key), which is correct: an`

`54714dd6` does not open this file (`git show --name-only 54714dd6` lists no
`Services/Meals/MealsAgreementService.cs`), and `git diff 8e2b57de 54714dd6 --
Services/Meals/MealsAgreementService.cs` is **empty**. So the file is byte-identical at the tip and at
`54714dd6`, and the stale comment is dropped by both lanes unless `4bbf34a5` is taken. **The lane's
report of this is correct.**

The replacement comment makes two checkable claims. Both verified at the tree, not assumed:

- *"the envelope records it as that receipt's outcome"* — `MealsIdempotentMutation.CommitAsync`'s
  `catch (MealsProblemException refusal)` calls `receipts.RefuseAsync(...)` before rethrowing. TRUE.
- *"the receipt table has no expiry column and no purge"* — `Entities/Meals/MealsCommandReceipt.cs` has
  no `ExpiresAtUtc` (the Meals entities that do are `MealsFundingReservation` and `MealsInvitation`), and
  no `Remove`/`RemoveRange`/`ExecuteDelete` against `MealsCommandReceipts` exists anywhere under
  `Services/`, `Repositories/` or `Helpers/`. TRUE. (Note this is a genuine Meals/Workforce difference —
  the Workforce twin `a1d57208` says its own `ExpiresAtUtc` is advisory.)

No behaviour changes at the site. Verified: `git show 4bbf34a5 -- Services/` is one 7-line hunk, entirely
inside a `//` comment block.

## The mutation matrix — my instrument, not the lane's

Driver: `mutate.py` in this directory. It mutates and measures ONE tree; the runner's own
`Test run for …` line is printed beside every result so the mutated tree and the measured tree are
compared by the reader rather than asserted. Restores are `write` + `utime`, never `mv`, never
`git stash` (one shared stack across ~124 worktrees). No `--no-build` anywhere.

Filter (36 tests):
`(FullyQualifiedName~MealsAgreementWriterTests|FullyQualifiedName~MealsIdempotencyRefusalTests|FullyQualifiedName~MealsCommandReceiptIdempotencyTests)&Database!=SqlServer`

Raw output: `matrix-raw.txt`.

| # | mutation | site | reds |
|---|---|---|---|
| baseline | — | — | 0 / 36 pass |
| **M-REDECIDE** | a refused receipt is reopened and handed `Proceed` — the retry **re-decides** instead of replaying | `MealsCommandReceiptService.ResolveExistingAsync` | **11** |
| M-DETAIL | `Detail = refusal.Message` → a fixed generic string | `MealsCommandReceiptService.SerializeRefusal` | 2 |
| M-INFLIGHT-ENV | the envelope stops throwing on an `InProgress` disposition | `MealsIdempotentMutation.CommitAsync` | **1** |
| M-INFLIGHT-SVC | an in-flight duplicate is handed `Proceed` | `MealsCommandReceiptService.ResolveExistingAsync` | 3 |
| M-NORECORD | `RefuseAsync` removed from the refusal catch (the stranding defect restored) | `MealsIdempotentMutation.CommitAsync` | 3 |
| restored | — | — | 0 / 36 pass |

**Surviving mutants: none.** Results alternated GREEN/RED seven times against the same assembly path
inside the tree I mutated, which a foreign or stale assembly cannot do.

Wider run on the restored tree, same worktree, still container-free:

```
dotnet test WebApi.Tests/WebApi.Tests.csproj --filter 'FullyQualifiedName~WebApi.Tests.Meals&Database!=SqlServer'
Passed!  - Failed:     0, Passed:   400, Skipped:     3, Total:   403, Duration: 57 s
```

No failure had to be re-run and none failed to reproduce, so there is no non-reproducing name to record.

## The finding the review exists to produce

**M-REDECIDE is the faithful "a retry that re-decides" world**, and it is the mutant the exit's third
clause is actually about. Measured:

- `A_recorded_corridor_refusal_is_replayed_even_after_the_corridor_it_named_is_ended`
  (**new in `4bbf34a5`**) — **RED.** Verbatim:
  `Assert.Throws() Failure / Expected: typeof(MealsProblemException) / Actual: (No exception was thrown)`.
  The re-decide reached the moved world, found no active corridor, and **signed the agreement**.
- `A_second_active_agreement_on_the_same_corridor_is_refused` (the pre-existing test, as strengthened by
  `4bbf34a5`) — **GREEN. It survived.**

That second line is the assertion the offering lane withheld, and it **contradicts that lane's own stated
proof.** Its mutation log concludes:

> *"mutant M3 proves it: … A retry that re-decides and a retry that replays are indistinguishable to the
> pre-existing test."*

M3 (my M-DETAIL) proves the `Message` assertion is load-bearing **against a mutant that corrupts the
recorded detail**. It does not prove anything about re-deciding: a re-decided refusal is produced by the
same deterministic `ActiveCorridorExists()` and therefore carries the **same message**, so
`Assert.Equal(ex.Message, retry.Message)` passes in both worlds. Measured above: it does.

**What closes the third clause is the moved world — ending the corridor between the two calls — and
nothing else at this site.** `4bbf34a5` is the only place that does it. The pin discriminates. It is
adoptable, and the reason it is adoptable is not the reason the lane gave.

## Second correction: the third clause was not *globally* open at `54714dd6`

M-REDECIDE's other 10 reds are all pre-existing at `54714dd6`:

- the **8** `MealsIdempotencyRefusalTests` commit-backstop tests — they get the discriminator for free,
  because their arranged fault is passed only to the FIRST call and the retry runs on a plain host, so the
  refusal's precondition is repaired without anyone arranging it;
- `MealsCommandReceiptIdempotencyTests.A_refused_command_is_recorded_as_a_completion_and_a_same_key_retry_replays_the_refusal`
  and `…An_in_flight_duplicate_is_still_in_progress_and_only_the_recorded_refusal_moves_that_answer`.

Not red under M-REDECIDE, and therefore blind to it at `54714dd6`:
`MealsIdempotencyRefusalTests.A_stateful_check_refusing_after_the_reservation_replays_its_refusal_on_the_same_key`
— the other member of the **stateful-`onProceed`** family, where nothing is arranged and a revoked
invitation stays revoked.

So the honest statement is narrower than the lane's: the clause was open **for the stateful post-reservation
family**, which is exactly where the agreement corridor lives and exactly the site the exit criteria names.
The downstream lane `6278f0b5` ("Three refusal-replay pins repair the precondition between the calls, so a
re-decide would succeed") reaches the same conclusion independently and repairs that sibling the same way.

## The second new test earns its place, at a layer the older pin cannot see

M-INFLIGHT-ENV reds **exactly one test in the whole 36** —
`A_genuinely_in_flight_key_still_answers_in_progress_and_signs_nothing`. The pre-existing
`MealsCommandReceiptIdempotencyTests.An_in_flight_duplicate_…` stays green, because it asserts the
*disposition* the receipt service returns, one layer below the envelope that acts on it. Removing the
guard from the envelope is invisible to it and visible only to the new test.

M-INFLIGHT-SVC reds three, including the new test on
`Assert.Throws() … Actual: (No exception was thrown)` — the "signs nothing" half.

The `KillTheCompletionCommit` interceptor does what its doc-comment claims, verified in the source rather
than inferred: `ReserveAsync` **Adds** the receipt (`_context.MealsCommandReceipts.Add`) so the reservation
save passes the `EntityState.Modified` test untouched; `CompleteAsync` loads and mutates that tracked row,
so the completion save is the only one it kills. The exception is an `InvalidOperationException` and so is
caught by neither the `catch (DbUpdateException …)` nor the `catch (MealsProblemException refusal)`, which
is precisely why no outcome of either kind is recorded. The arrangement is also self-guarding: if it fired
on the reservation instead, the `SingleAsync` on the receipt would throw and the test would red.

## Constraints

- **C1 — holds, verified at the tree, not taken from the prior return.** `GuardAppendOnly` in
  `Helpers/ApplicationDbContext.cs` guards these Meals entities and no others: `MealsAuditEvent`,
  `MealsFundingAllocation`, `MealsCreditAdjustment`, `MealsStatementRun` (finalize-freeze).
  **`MealsAgreement` is not among them**, so the new test's `Status = Ended` arrangement is not an
  append-only mutation; **`MealsCommandReceipt` is not among them either**, and its own entity doc states
  "This is NOT an append-only ledger … and no AFTER trigger", so `RefuseAsync`'s UPDATE is in-contract.
  `4bbf34a5` itself contains no UPDATE or DELETE against any guarded table.
- **C2 — not engaged.** Neither `4bbf34a5` nor `54714dd6` touches `Migrations/`, `ModelBuilders/` or
  `Entities/` (`git show --name-only` on both). Neither can move the EF model.
- **C3 — not engaged.** No service, route, page or flag is added.
- **C4 — one observation, belonging to `54714dd6`, not a blocker on `4bbf34a5`.** The corridor create
  names its actor (`MealsAuditEntry.ActorReference = actor`). A **refusal** writes no audit row at all
  (both corridor tests assert 0), and the receipt's `ScopeKey` is `MealsIdempotencyScope.For("agreement.create")`
  = `"meals.agreement.create"` — **operation-only, no actor dimension** — although the doc comments on both
  `MealsIdempotencyScope` and `Entities/Meals/MealsCommandReceipt` describe the scope as
  *"actor + aggregate + operation"*. Consequence: a refusal recorded by one actor is replayed to a
  different actor presenting the same key in the same company. The replayed detail is a validation string,
  so no cross-actor content leaks, but **the two doc comments assert an actor dimension the code does not
  have** — the documented-control-vs-reality shape this estate has already paid for once. `4bbf34a5` adds
  no production write and neither introduces nor worsens this; it is recorded for the clerk to route.
- **C5 — owed and not claimed.** No person has walked this in a UI. Nothing here is offered as acceptance.
- **C6, C7 — not engaged.** No statutory string; no log or telemetry call anywhere in the diff.

## What I could not measure

- **The SQL tier.** I had no `sql` slot. Two SQL containers were live and **foreign** when I started
  (`interesting_heyrovsky`, `testcontainers-ryuk-…`); I did not touch them.
- **Disclosure I owe:** my first baseline used `--filter "FullyQualifiedName~WebApi.Tests.Meals"` with no
  `&Database!=SqlServer`, which **started a Testcontainers SQL container I was not granted**
  (`[testcontainers.org] Delete Docker container 3481ec82f45f` in its own log). It was reaped by ryuk at
  the end of that run; I killed nothing. That run reported `Failed: 3, Passed: 498, Skipped: 3` and the one
  named failure was `MealsW3MigrationLineageTests.Has_no_pending_model_changes_after_the_w3_wave`, a
  SQL-fixture model-drift assertion. **I draw no conclusion from it** — it is outside my grant and n=1 on a
  contended host. It cannot be attributable to `4bbf34a5` or `54714dd6`, neither of which touches the model
  (see C2). Every measurement I *do* rely on above carries `&Database!=SqlServer` and started no container.
- **Whether the rowversion CAS in `RefuseAsync`'s `catch (DbUpdateConcurrencyException)` behaves on SQL
  Server.** SQLite generates no rowversion, so that path is unexercised here. It is the SQL tier's job.

## Verdict

**Adopt `4bbf34a5`.** The pin discriminates: it is killed by a faithful re-decide mutant that the
pre-existing test — including the `Message` assertion added in the same commit — survives. Its second test
is the unique pin for an envelope-layer removal of the in-flight guard. Its production hunk is comment-only
and both of its factual claims check out at the tip.

**Two conditions the clerk needs:**

1. `4bbf34a5` **cannot be taken alone.** Its assertions (`Assert.Equal(MealsProblemCodes.Validation, retry.Code)`,
   `Assert.NotNull(receipt.CompletedAtUtc)`) are `54714dd6`'s behaviour, and `54714dd6` is **not** an
   ancestor of `8e2b57de`. Adoption is `54714dd6` + `4bbf34a5`, in that order.
2. **`lane/replay-pins-close` already carries all of it** — `8e2b57de`, `54714dd6` and `4bbf34a5`, with the
   comment hunk preserved verbatim and all three pins intact (`Assert.Equal(ex.Message, retry.Message)`,
   both new `[Fact]`s, `KillTheCompletionCommit`) — plus `6278f0b5`, which extends the same moved-world
   technique to the sibling this review names as blind. If that lane is the integration route, adopting
   `4bbf34a5` separately duplicates work already merged there.

Two non-blocking nits, for whoever lands it:

- The ended-corridor test checks `Active == 0` before its positive control but never asserts the retry wrote
  no `MealsAuditEvent`; its sibling one test above does. One line would close it.
- The stale *"actor + aggregate + operation"* doc comments (C4 above) are `54714dd6`-era and worth a docsync
  pass — the shape is the same one this whole lane exists to kill: a comment standing as an instruction that
  the code does not honour.
