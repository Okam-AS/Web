# L-REPLAY-PINS-RECHECK — does each same-key retry pin distinguish a REPLAY from a RE-DECIDE?

Read-only analysis. No test or service edited, no suite run, no container started, no shared ref moved.

## The question asked of every test

> If the retry had RE-EXECUTED the command instead of replaying the recorded refusal, would this test
> still pass?

If yes, the test does not discriminate: same-code-on-retry only proves the second call reached the same
conclusion. Reading the code out of the response body (verified: `MealsResults.Problem` asserts
`pd.Extensions["code"]`, `WorkforceStaffResults.Problem` the same) separates a refusal from
`idempotency-in-progress`. It does **not** separate a replayed refusal from a re-decided one. Those are two
different properties and only one of them was being pinned.

## Base facts, as observed rather than as briefed

| Claim | Observed |
| --- | --- |
| backend integration `8e2b57de` | CORRECT. `feature/restaurant-modules` is exactly `8e2b57de` ("L-VIOLATION-EXACT-LAND: merge receipt..."), 0 commits ahead. |
| `lane/wf-idempotency-refusal` | `a1d57208`, worktree `/Users/svendaneel/okam/OkamAPI-wfidemref`, clean. |
| `lane/wf-idempotency-refusal-rest` | `02684ecc`, worktree `/Users/svendaneel/okam/OkamAPI-wfrefusalrest`, clean. |
| `lane/meals-idempotency-refusal` | `54714dd6`, worktree `/Users/svendaneel/okam/OkamAPI-mealsidemref`, clean. |
| Training's own pin | `lane/train-idempotency-refusal` `01cd5eee`, worktree `.../OkamAPI-trainidemref`, clean. |

## Structural finding: Training's M04 has no literal counterpart in these two modules

In Training the replayed refusal is rethrown by the **composition** (`TrainingMutation`), so deleting that
rethrow drops through to the staging callback — the M04 mutant.

In Workforce and Meals the throw lives **inside the primitive**: `WorkforceIdempotency.ReserveAsync` →
`ResolveExistingAsync` throws at `Services/Workforce/WorkforceIdempotency.cs:318`, and `MealsCommandReceiptService.ReserveAsync`
throws likewise (`MealsIdempotentMutation.cs:44-56` only handles Replay/InProgress). Delete that branch and
the reservation degrades to `Replay`-with-a-refusal-payload or `InProgress` — both visible to a
code-out-of-body assertion. **So the siblings are not vulnerable to Training's exact mutant.**

They are vulnerable to a different, more likely one. Both compositions document that replay-safe checks
belong **in front of** the reservation (`WorkforceScheduleCommit.cs` class remarks; `MealsIdempotentMutation.cs`
remarks; and `WorkforceIdempotencyTests.cs:327` blesses exactly that shape). Moving a stateful check forward
is therefore an invited refactor — and it silently converts a replay into a re-decide, because the recorded
refusal is never consulted at all. **That is the mutant the four tests below cannot see.**

---

## CENSUS — every same-key retry the three lanes added or modified

36 same-key-retry candidates enumerated mechanically across the 9 touched test files, then ruled by reading.

### A. DISCRIMINATES — Meals commit-time backstops 1-8

`WebApi.Tests/Meals/MealsIdempotencyRefusalTests.cs` lines **45, 74, 103, 132, 162, 193, 225, 259**.

**What makes them discriminate:** the arranged fault is passed only to the FIRST call. Each builds a second,
plain host for the retry (`MealsMembershipTestHost.CompanyController(harness, Admin, ...)` without the gate;
`MealsStatementTestHost.Build(harness, module: true, ...)` at :250 and :296). `FailTheCompletionCommit`
(:383) is the only source of the `DbUpdateConcurrencyException`, and each test *asserts its own premise* that
SQLite generates no rowversion (`Assert.Null(seededRevision)`), so no real CAS can fire on the retry either.
**The refusal's precondition is removed between the two calls** — a re-decide would now SUCCEED and answer
200, and `MealsResults.Problem(retry, 409, StaleRevision)` would red. This is the Training discriminator,
arrived at for free by the arrangement.

Two of the eight also carry the row half of it:
- :187 `Assert.Equal(0, MealsMemberships.CountAsync(m => m.ApplicationUserId == NewHire))` — a re-decide funds a membership.
- :303 statement run `Status == Draft` — a re-decide finalizes it.

### B. DISCRIMINATES — the three Workforce commit-race backstops

| Test | Why it discriminates |
| --- | --- |
| `WorkforceInvitationTests.cs:992` claim | The injected competitor changes the world under **both** branches. If it survived, the pre-reserve `callersPerson` lookup (`WorkforceInvitationService.cs:262`) now finds it → D-04 attach → 200, or `PersonAttachRefused` — a *different* code. If it rolled back, the claim simply succeeds. Either way `Problem(retry, 409, ClaimLinkConflictCode)` reds. Its trailing row asserts (person still unlinked, invitation still `Pending`) red independently. |
| `WorkforceInvitationTests.cs:1042` issue | Same both-branch argument, and here the rollback is **proven**: `CompetingPendingInvitationInterceptor` writes an invitation with `StaffMemberId = staffId`, and the test's own green `Assert.Equal(0, WorkforceInvitations.CountAsync(i => i.StaffMemberId == staffId))` says no such row survives. A re-decide creates the invitation → 200 and count 1 → reds twice. |
| `WorkforceOperatorImportTests.cs:212` import | Both branches again: if the competing engagement survived, the per-item pre-check the test relies on ("carrying NO engagement under the employer") now fails and the answer is no longer the commit-time `workforce.import-conflict`; if it rolled back, the import succeeds. Plus `Assert.Equal(0, WorkforceStaffMembers.CountAsync(s => s.OperatorId == operatorId))` reds under a successful re-decide. |

### C. DISCRIMINATES at the primitive only — arranged refusals, no domain callback

`WorkforceIdempotencyTests.cs:213, 239, 309` and `MealsCommandReceiptIdempotencyTests.cs:94, 132, 217`.

These call `RefuseAsync` directly with a hand-built problem, so **there is no command to re-decide**. They
discriminate because the asserted values are literals that exist nowhere but the recorded snapshot —
`replay.Extensions["conflictingStaffMemberId"] == "staff-holding-it"`, `replay.Extensions["currentRevision"] == "current-rev"`,
`retry.ReplaySnapshotJson == "{\"programId\":\"abc\"}"`. **Checked and discriminating for storage + replay of
the primitive; silent about the composition**, which is where the hole lives.

Not retry tests at all, listed so they are not mistaken for coverage: `WorkforceIdempotencyTests.cs:261, 283, 327`;
`MealsCommandReceiptIdempotencyTests.cs:154, 191, 250, 268`.

### D. DISCRIMINATES — pre-existing success-replay pins (checked, not part of the finding)

`WorkforceShiftExchangeTests.cs:353, 439, 492` and `MealsAgreementWriterTests.cs:129`. Each counts audit rows
or receipts after the retry (`Assert.Equal(1, WorkforceAuditEvents.CountAsync(e => e.Action == "exchange.award"))`;
`Assert.Equal(1, MealsCommandReceipts.CountAsync(r => r.IdempotencyKey == "agr-replay"))`). A re-execute
appends a second row, so these red. **A success replay was already pinned harder than a refusal replay.**

---

## E. DOES NOT DISCRIMINATE — 4 tests, with the world change that closes each

### E1. `WorkforceShiftExchangeTests.cs:250` — `A_refused_award_replays_its_refusal_to_a_retry_of_the_SAME_key`
Owner: **L-WF-IDEMPOTENCY-REFUSAL**

The Waiter role link is deleted **before** both calls and never restored. A re-decide re-runs
`RevalidateAwardAsync`, finds the role still missing, and throws the identical `ExchangeNotAwardable` with the
same `aggregateId` and the same `Detail`; `Assert.Empty(... Status == Awarded)` also still holds, because the
re-decide refuses too. All four assertions pass under the mutant. This is Training's M04 shape exactly.

**World change:** between the two `DecideRequest` calls, put the role link back — re-add the
`WorkforceStaffRoles` row for `WorkforceWorld.WorkerWaiterLinkId` with an effective window covering
`target.StartsUtc` — so a re-decide would now award. Then keep the existing assertions and add that no
`exchange.award` audit row exists for key `award-refused`.

### E2. `WorkforceShiftExchangeTests.cs:284` — `The_one_award_backstops_refusal_also_replays_with_the_holder_it_named`
Owner: **L-WF-IDEMPOTENCY-REFUSAL**

The comment claims "the retry runs on a clean context with no interceptor, so the only thing that can answer
it is the recorded outcome." That is not so. `CompetingAwardCommitInterceptor` matches on the table name with
**no INSERT/UPDATE filter**, so it fires on `AwardAsync`'s first `FirstOrDefaultAsync` read
(`WorkforceShiftExchangeService.cs:492`) — outside any transaction, so `command.Transaction` is null and the
competing Awarded row **commits standalone and survives**. Proof, from the pre-existing sibling test at
`WorkforceShiftExchangeTests.cs:203`: `Assert.Single(rows.Where(r => r.Status == Awarded))` is green after the
award was refused, so that one Awarded row is the competitor's.

`RevalidateAwardAsync` (`WorkforceShiftExchangeService.cs:615-661`) never checks whether the target is
already awarded — that is deliberately the index's job. So a re-decide passes revalidation, re-hits the
filtered unique index, and produces the same `AwardTaken` with the same `aggregateId`. All three assertions
pass under the mutant.

**World change:** after the first (refused) call, delete the interceptor-injected competing row (the
`WorkforceShiftExchangeRequest` with `TargetShiftAssignmentId == openShift`, `Status == Awarded` and
`ShiftExchangeRequestId != requestId`) so the award slot is free again, then retry. A re-decide would now
award; the replay must still throw `AwardTaken` and leave zero Awarded rows.

### E3. `MealsIdempotencyRefusalTests.cs:311` — `A_stateful_check_refusing_after_the_reservation_replays_its_refusal_on_the_same_key`
Owner: **L-MEALS-IDEMPOTENCY-REFUSAL**

The one test in the file with **no arranged fault** — and therefore the one where the world does not change
by itself. The invitation is revoked before both calls and stays revoked, so a re-decide refuses again with
the identical `InvitationNotClaimable`. There is no row assertion. Every assertion passes under the mutant.
Its own comment — "this is the flow that strands a key with nothing concurrent going on at all" — is the
reason it is also the flow nothing else covers.

**World change:** between the refused claim and the retry, set the invitation's `State` back to
`MealsInvitationState.Pending` through a direct harness-context write (the shape `SeedInvitationAsync` at
:356 already uses), so a re-decide would now claim successfully. Keep the code assertion and add the row
half the sibling backstop already carries at :187 —
`Assert.Equal(0, MealsMemberships.CountAsync(m => m.ApplicationUserId == NewHire))`.

### E4. `MealsAgreementWriterTests.cs:173` — `A_second_active_agreement_on_the_same_corridor_is_refused`
Owner: **L-MEALS-IDEMPOTENCY-REFUSAL** (file also touched by L-MEALS-AGREEMENT-PIN-INVERTS at `4bbf34a5`)

The first corridor agreement exists before both calls and is never removed, so a re-decide refuses again with
the identical `Validation` / 400. The two row assertions added with the fix — `MealsAgreements.Count == 1`
and `MealsAuditEvents.Count(IdempotencyKey == "agr-dupe") == 0` — **look like** the Training discriminator but
are not: a re-decide refuses too, so it writes neither. All assertions pass under the mutant. This is the
same test L-MEALS-AGREEMENT-PIN-INVERTS already found a second blind spot in (its M3: blanking the recorded
detail leaves code+status green), so the site has now failed two independent discrimination checks.

**World change:** between the two `CreateAsync("agr-dupe", ...)` calls, close the existing corridor agreement
so a second one is legal, then retry. Keep the code and status assertions and keep
`MealsAgreements.CountAsync(a => a.StoreId == MealsWorld.StoreId) == 1` — under a re-decide it becomes 2 and
the audit count becomes 1.

## F. PARTIAL — checked, discriminates a different axis

`MealsIdempotencyRefusalTests.cs:340` — `A_successful_command_still_replays_its_response_rather_than_a_refusal`.
Both calls send the same `DisplayName`, so a re-execute produces the identical answer. It **does** discriminate
its stated claim (the discriminator has not turned every completion into a refusal — a 409 would red
`MealsResults.Ok<>`); it does **not** discriminate replay from re-execute.

**World change if that is wanted:** set the company's `DisplayName` to a third value between the calls, then
assert the retry returns the recorded `"Replayed navn"` while the row still holds the interim value. A
re-execute overwrites the row back.

---

## Reach — what was covered and what was not

**Covered.** Nine test files at the three lane tips, read in full or by diff: `WorkforceIdempotencyTests.cs`,
`WorkforceShiftExchangeTests.cs`, `WorkforceInvitationTests.cs`, `WorkforceOperatorImportTests.cs`,
`WorkforceD1RaceSqlServerTests.cs`, `MealsIdempotencyRefusalTests.cs`, `MealsCommandReceiptIdempotencyTests.cs`,
`MealsAgreementWriterTests.cs`, plus Training's `TrainingIdempotencyRefusalTests.cs` as the worked example.
Services read to settle the re-decide branch: `WorkforceIdempotency.cs`, `WorkforceScheduleCommit.cs`,
`WorkforceShiftExchangeService.cs`, `WorkforceInvitationService.cs`, `WorkforceOperatorImportService.cs`,
`MealsIdempotentMutation.cs`, `MealsCommandReceiptService.cs`, and all four competing-writer interceptors.

**Assertion forms covered.** Code out of the body via `MealsResults.Problem` / `WorkforceStaffResults.Problem`
(both verified to read `Extensions["code"]`, not the status); direct `.Code` / `.StatusCode` / `.Extensions[...]`
on the thrown exception; and row/count/state assertions after the retry.

**Helper-wrapped retries.** Training's `AssertTheRetryReplaysTheRefusalAsync`
(`TrainingIdempotencyRefusalTests.cs:570`) drives 14 of its own tests and does **not** discriminate on its
own — the property is pinned once, separately, at :486. Training closed its hole with one dedicated test
rather than by fixing the helper, so its other 14 remain same-world assertions. Not a sibling gap; recorded
so nobody reads "Training fixed it" as "Training's 14 now discriminate". No sibling lane uses a shared retry
helper — every sibling retry is written out at the call site, which is why a per-test ruling was possible.

**Arranged vs provoked.** Meals backstops 1-8 arrange the fault (`FailTheCompletionCommit`) — and the
arrangement is precisely what makes them discriminate, since it is absent on the retry. The Workforce and
Meals primitive tests arrange the *refusal itself* by calling `RefuseAsync` directly, which makes them
trivially discriminating and correspondingly narrow. The four failures in section E are all cases where the
refusal is **provoked by a world that then stays put**.

**Not covered.**
- **Nothing was executed.** No suite run, container-free or otherwise. Every ruling is by reading; where a
  ruling depended on runtime behaviour (does the injected competitor survive the failed `SaveChanges`?) it is
  settled from an assertion that is green on the lane branch, and the two rulings that could have turned on it
  (B-claim, B-import) are argued under **both** branches so they do not depend on the answer.
- `WorkforceD1RaceSqlServerTests.cs` — the WF-rest lane rewrote two assertions here (~:99 and ~:205) from
  "no completion row" to "one completion row carrying `Refused`". The class is `[Trait("Database","SqlServer")]`,
  Docker is down estate-wide, and **no tier has run it**; that lane also reports line ~100 was already red
  before it arrived. These are row-state assertions, not retry assertions, so they sit outside the census
  question — but their status is unverified, by the lane's own account and mine.
- The SQL Server rowversion CAS itself. Every Meals backstop and both Training commit-time arms reach the
  concurrency branch through an arranged exception; that SQL Server raises it is not proven anywhere the
  fast tier can see, and all three lanes say so.
- I did not evaluate Growth, Events or Margin. The brief scoped this to the two Workforce lanes and Meals.

## Summary

| Ruling | Count | Where |
| --- | --- | --- |
| Discriminates (world repaired / changed between the calls) | 11 | Meals backstops 1-8; WF-rest claim, issue, import |
| Discriminates at the primitive only (no command to re-decide) | 6 | `WorkforceIdempotencyTests.cs:213/239/309`, `MealsCommandReceiptIdempotencyTests.cs:94/132/217` |
| Discriminates (pre-existing success-replay pins, row-counted) | 4 | `WorkforceShiftExchangeTests.cs:353/439/492`, `MealsAgreementWriterTests.cs:129` |
| **Does NOT discriminate — gap named above** | **4** | **E1 `WorkforceShiftExchangeTests.cs:250`; E2 `:284`; E3 `MealsIdempotencyRefusalTests.cs:311`; E4 `MealsAgreementWriterTests.cs:173`** |
| Partial (discriminates a different axis) | 1 | F `MealsIdempotencyRefusalTests.cs:340` |

Both Workforce refusal-replay pins on the shift-exchange surface fail; the rest of Workforce holds. Meals
holds at 8 of its 10 endpoint pins and fails at the two where nothing concurrent is arranged. The fix in every
case is the cheap one Training used: repair the refusal's precondition between the calls and count rows.
