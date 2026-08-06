# L-MEALS-IDEMPOTENCY-REFUSAL — mutation record

## Instrument

- **Base chosen:** `feature/restaurant-modules` @ `569887a5` (this IS the backend integration tip; the
  brief's `569887a5` and `feature/restaurant-modules` are the same commit). `integration/mig-stack-land`
  @ `4b37f81b` is not simply 34 ahead — it is **diverged**: 34 commits it has that the tip lacks and 54
  the tip has that it lacks. Its 34 touch only `Migrations/**`; **zero** `Services/Meals/**` files differ
  between the two, so the defect surface is identical and the tip is the correct base.
- **Worktree:** `/Users/svendaneel/okam/OkamAPI-mealsidemref`, branch `lane/meals-idempotency-refusal`,
  commit `54714dd6`. Not pushed. No shared ref moved.
- **Tier:** container-free only — `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"`.
  No container started. `FullyQualifiedName!~SqlServer` never used.
- **No `--no-build` anywhere.** Every arm lets `dotnet test` compile; the restore writes the file fresh and
  `os.utime`s it, so MSBuild cannot call the assembly up to date and measure the previous binary.

## Suite numbers

| run | passed | failed | skipped | total | artifact |
|---|---|---|---|---|---|
| baseline, clean `569887a5` in its own worktree | 4629 | 0 | 12 | 4641 | `baseline-run.txt` |
| lane `54714dd6` | 4647 | 0 | 12 | 4659 | `full-run-final.txt` |

Delta **+18**, exactly the tests added: `MealsIdempotencyRefusalTests` (10) and
`MealsCommandReceiptIdempotencyTests` (+8). **No non-reproducing failure to name** — the baseline was
clean on its only run, and the lane's final run was clean on its only run after the two real failures
below were fixed.

## Mutants: 10 removals, 10 reds, 0 survivors

Script `mutation-proof.py`, transcript `mutation-proof.txt`. One mutant at a time. Each removes ONLY the
recording line (the `var refusal = …` line above it is part of the anchor purely to make the site unique
within its file — deleting that too leaves `throw refusal;` unbound and the arm would measure a compile
error instead of a behaviour, which is what the first attempt did). Restore is from an in-memory copy,
**not** `git checkout`: the lane's own edits to these files were uncommitted at the time and a checkout
would have reverted the fix along with the mutant.

| id | recording removed | mutant | restored | failure the mutant produced |
|---|---|---|---|---|
| M01 | `MealsIdempotentMutation` composition catch | RED | GREEN | `Expected: meals.invitation-not-claimable / Actual: meals.idempotency-in-progress` |
| M02 | `MealsCompanyService` update backstop | RED | GREEN | `Expected: meals.stale-revision / Actual: meals.idempotency-in-progress` |
| M03 | `MealsCompanyService` archive backstop | RED | GREEN | same |
| M04 | `MealsMembershipService` membership-revoke backstop | RED | GREEN | same |
| M05 | `MealsMembershipService` invitation-revoke backstop | RED | GREEN | same |
| M06 | `MealsMembershipService` invitation-claim backstop | RED | GREEN | `Expected: meals.invitation-not-claimable / Actual: meals.idempotency-in-progress` |
| M07 | `MealsProgramService` program-members backstop | RED | GREEN | `Expected: meals.stale-revision / Actual: meals.idempotency-in-progress` |
| M08 | `MealsReconciliationService` resolve backstop | RED | GREEN | same |
| M09 | `MealsStatementService` finalize backstop | RED | GREEN | same |
| M10 | the discriminator read in `ResolveExistingAsync` | RED | GREEN | `Assert.Throws() … Actual: (No exception was thrown)` |

`Actual: meals.idempotency-in-progress` **is the defect**, printed by the instrument. The matrix was run
twice: once before the rowversion-premise assertions were added, once after, on the committed code. Zero
survivors both times.

Each proof reads the stable `code` out of the **response body** (`MealsResults.Problem` asserts the
ProblemDetails `code` extension, or the thrown `MealsProblemException.Code`). Status alone discriminates
nothing — in-progress is a 409 too.

## What the fix is

`RefuseAsync(companyId, scopeKey, idempotencyKey, MealsProblemException, ct)` completes the **reservation
row itself** with the refusal: `ResponseStatusCode = refusal.StatusCode`, `ResponseSnapshotJson` = a
serialised problem, `CompletedAtUtc = now`.

- **Keyed by `(company, scope, key)`, not by a reservation object** — the eight backstops decide in the
  calling service, past where the reservation is in scope. Every call site's scope key was hoisted to a
  local so the composition and its backstop use one value, not two constructions that agree by inspection.
- **`ChangeTracker.Clear()` before the refusal's own save** — otherwise that save commits the very
  mutation the refusal rejected, and re-stages entities a failed `CompleteAsync` already rolled back.
  Pinned by `Recording_a_refusal_never_commits_what_the_refused_command_had_already_staged`.
- **The in-flight guard is intact.** Only a recorded outcome moves `in-progress`; no fresh-key hint was
  added, because for a genuinely in-flight duplicate a fresh key runs the write twice. Pinned by
  `An_in_flight_duplicate_is_still_in_progress_and_only_the_recorded_refusal_moves_that_answer`.

## NO MIGRATION OWED — verified, not assumed

`Migrations/20260727221455_RestaurantModules_Initial.cs` creates `MealsCommandReceipts` with
`ResponseStatusCode int NULL` and `ResponseSnapshotJson nvarchar(max) NULL`, **no CHECK constraint** on
either, and `OnModelCreating` adds none. A 409/400/404 is a value in a column that already exists — the
same shape the Workforce lane found in its `nvarchar(32) OutcomeState`. C1 is not engaged: the table
carries a rowversion and deliberately no append-only trigger (its own doc says the completion is an
UPDATE), and it is in no `GuardAppendOnly` registration.

## Disclosure: both Fable conditions verified to hold in Meals

1. **Payload-hash equality is checked before the outcome is read.** `ResolveExistingAsync` throws
   `IdempotencyPayloadMismatch` at the hash comparison, above the `CompletedAtUtc` branch. Pinned by
   `A_mismatched_payload_is_a_conflict_before_a_refusal_is_ever_read`, which also asserts the mismatch
   carries no `aggregateId`.
2. **Every scope is tenant-bounded — by something stronger than the scope string.** `MealsIdempotencyScope`
   emits only `meals.<family>[:<aggregateId>]`, but `CompanyId` is an explicit column of the unique key
   `(CompanyId, ScopeKey, IdempotencyKey)` and of every lookup `RefuseAsync` and the replay perform. Pinned
   by `A_refusal_never_crosses_the_company_that_reserved_the_key`.

So the replay is **not** an oracle here.

## C4 — the money path

The receipt has no actor column; the actor lives on `MealsAuditEvent`. The structural equivalent holds and
is stronger: the refusal **completes the reserved row in place**, so the company, the scope naming the
aggregate and operation, the canonical request hash and the reservation instant are all the reservation's
own values — nothing is rebuilt from a prefix plus an id. Pinned field-by-field by
`A_refusal_completes_the_reservation_row_itself_and_rebuilds_none_of_its_identity`.

## Two real failures the full tier caught (both fixed, neither pre-existing)

1. **`MealsAgreementWriterTests.A_second_active_agreement_on_the_same_corridor_is_refused` asserted the
   defect.** It read the receipt, asserted `CompletedAtUtc` was null, and asserted the retry got
   `meals.idempotency-in-progress` — under a comment calling it "the module's documented stuck-reservation
   tradeoff". That is the prose form of the defect, and it also surfaced a stranding site the brief's list
   did not name (the one-active-corridor check, which runs inside the composition and is covered by M01).
   Rewritten to assert what the code now does.
2. **`RowversionAssertionProviderTests.EveryRowversionRefusalIsTraitedSyntheticOrAssertsItsOwnPremise`
   flagged 9 of the new tests.** Correctly: they assert `meals.stale-revision` on a provider that generates
   no rowversion. Satisfied by the guard's **mechanism 3** (assert your own premise) rather than by the
   allowlist, because the premise is true and worth stating: the revision is null here, the
   `DbUpdateConcurrencyException` is *arranged*, and the claim is only that the backstop's answer is
   recorded and replayed — never that a CAS discriminated anything.

## How the eight backstops are reached without a container

`FailTheCompletionCommit` (an `ISaveChangesInterceptor`) raises `DbUpdateConcurrencyException` out of the
one `SaveChanges` carrying the receipt's completion — identified by content (a `MealsCommandReceipt` in
`Modified` state), fired once, so the reservation's save (receipt `Added`) and the refusal's own save both
pass through. That is the whole of the condition each backstop is written against.

**What it does not prove:** that SQL Server raises it. The production trigger is the aggregate rowversion
CAS, which is SQL-Server-only; on SQLite an unarranged race resolves in memory and leaves the backstop
untouched. Proving the rowversion raises it stays the SQL-Server suites' job and was not run — Docker is
down and the brief grants no container slot.

## Files touched (sibling-overlap disclosure)

Production: `Services/Meals/{MealsCommandReceiptService,MealsIdempotentMutation,MealsCompanyService,
MealsMembershipService,MealsProgramService,MealsQuoteService,MealsReconciliationService,
MealsStatementService}.cs`, `Services/Meals/Interfaces/IMealsCommandReceiptService.cs`.

Tests: `WebApi.Tests/Meals/{MealsIdempotencyRefusalTests(new),MealsCommandReceiptIdempotencyTests,
MealsAgreementWriterTests,MealsPoisonedModuleGraph,MealsProgramTestHost,MealsMembershipTestHost,
MealsStatementTestHost}.cs`.

- `MealsDbViolations.cs` — **NOT touched** (L-MEALS-VIOLATION-EXACT owns it).
- `MealsMembershipService.cs` and `MealsCommandReceiptService.cs` — **L-MEALS-CLAIM-RECEIPT is live in this
  module and these are its likely files.** The claim path's backstop gained three lines
  (`var refusal = …` / `RefuseAsync` / `throw refusal`) plus a hoisted `scopeKey`; the receipt service
  gained `RefuseAsync` and the discriminator branch. Flagged for the merge.
- The three test hosts gained an **overload** carrying an `ISaveChangesInterceptor`, never an extra
  optional parameter — `adminStoreIds` is a `params int[]` and roughly forty existing callers pass store
  ids positionally after it, all of which would have stopped compiling.
- `MealsQuoteService`/`MealsCompanyService` ambient replay readers gained the shared outcome rule
  (`RefusalOrNull`). **Currently unreachable by construction** — neither flow reserves, so nothing records
  a refusal on their scopes. Added anyway and labelled as such, because the column now carries two outcome
  kinds and reading a refusal back as a funded quote would hand a caller an authorization token for a
  reservation that was refused.

## Housekeeping

Checkout asserted clean before building. The full run dirtied
`artifacts/journeys/ev-dietary/{run-sheet.json,run-sheet.md}` exactly as the brief warned; both were
restored with `git checkout --`, not committed. Committed by pathspec, 16 files. Not pushed. The baseline
worktree was removed after use.
