# L-MEALS-RELEASE-RACE — evidence

Work: `/Users/svendaneel/okam/OkamAPI-meals-race`, branch `lane/meals-release-race`, commit `f70a0254`,
off `feature/restaurant-modules` `de1e5c5e`. Local only, not pushed. Build artifacts removed after the
runs; rebuild with `dotnet build WebApi.Tests/WebApi.Tests.csproj` (~35 s).

## The two defects, verified before building

| claim | verified at | verdict |
|---|---|---|
| nothing catches the release's concurrency exception | `Services/Meals/MealsFundingAuthority.cs:272` (pre-fix) | true |
| the checkout caller's release is unguarded inside its own `catch` | `Services/CartService.cs:795` (pre-fix) | true |
| the payment-service caller swallows | `Services/PaymentService.cs:675-682` | true |
| "the controller catches only the module's own problem type" | `Controllers/Meals/MealsFundingController.cs` | **wrong surface** |

The release seam is not HTTP-exposed at all — `MealsFundingController` says so in its own doc comment, and
no route reaches `ReleaseAsync`/`ReleaseByOrderIdAsync`. The 500 lands on `CartsController.Complete`
(`POST /carts/complete/{storeId}`), whose action catches only `AppException`. The defect was real; the
surface named in the brief was not.

Worse in the checkout path, exactly as briefed: `catch (Exception) when (isCompanyAccount)` awaited the
release and only then ran `throw;`. A release-path exception propagated in place of the original failure,
so the `throw;` never executed and the guest was told the wrong reason their order did not go through.

## Changes

- `Services/Meals/MealsFundingAuthority.cs` — `ReleaseResolvedReservationAsync` catches
  `DbUpdateConcurrencyException` inside the strategy lambda: roll back, detach, retry, bounded at 3.
- `Services/CartService.cs` — the company-account unwind's release gets its own `try`/`catch`, matching
  `PaymentService`'s shape: log, swallow, rethrow the original.
- `WebApi.Tests/Meals/MealsReleaseRaceTests.cs` — new, 3 pins + both fixtures.
- `WebApi.Tests/Meals/MealsCheckoutJourneyKit.cs` — two optional params (`authorityOverride`,
  `failAfterBind`) and a real `CalculateFinalItemAmount`; additive, existing callers unchanged.
- `WebApi.Tests/Meals/PaymentServiceCompanyAccountTests.cs` — optional authority param + 1 pin.

## Red-then-green, per pin

Red pass: production fixes stashed (`git stash push Services/Meals/MealsFundingAuthority.cs
Services/CartService.cs`), rebuilt, run against the **final** test code.

**1. `A_release_that_loses_the_optimistic_check_answers_instead_of_throwing`**

```
Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException : The database operation was expected to
affect 1 row(s), but actually affected 0 row(s); data may have been modified or deleted since entities
were loaded.
   at WebApi.Services.Meals.MealsFundingAuthority...ReleaseResolvedReservationAsync...:line 272
   at WebApi.Services.Meals.MealsFundingAuthority.ReleaseByOrderIdAsync(...):line 200
```

Green: `Released`, `MEALS_RELEASED_CANCELLED`, guard `10000 -> 5000`, `ConcurrencyFailures == 1`.

**2. `A_lost_release_leaves_nothing_half_released_in_the_request_context`** — same red exception. Green:
after a lost round the context is saved through and releases nothing; the other reservation stays `Bound`
and the guard stays at one cap.

**3. `A_failing_release_does_not_replace_the_checkout_failure_the_guest_is_told_about`**

```
Assert.Throws() Failure
Expected: typeof(System.InvalidOperationException)
Actual:   typeof(System.TimeoutException): the release could not be completed
```

That *is* the defect: the release's own failure arriving where the guest's reason should be. Green: the
line-item loop's `InvalidOperationException` survives, and `ReleaseAttempted` proves the unwind still ran.

**4. `Cancel_CompanyAccount_SurvivesAFailingMealsRelease`** — a preservation pin. It **cannot** be reddened
by deleting `ReleaseCompanyMealsFundingAsync`'s `try`/`catch`: `PaymentService.Cancel` has an outer
`catch (Exception)` that swallows everything, and the order status is saved *before* the release, so the
observable result is identical either way. Reddened instead by removing the release wire:

```
Failed ... Cancel_CompanyAccount_SurvivesAFailingMealsRelease
Error Message: the cancel never reached the release, so nothing was proved
```

Both mutations were reverted by rewriting the original text, and the assembly was rebuilt before the green
run (`WebApi.dll` mtime confirmed fresh) so no stale-binary pass was possible.

## Suite results

| run | result |
|---|---|
| new pins + `PaymentServiceCompanyAccountTests` | 6/6 |
| `WebApi.Tests.Meals`, `Database!=SqlServer` | 379 passed, 0 failed, 3 skipped |
| whole fast tier, `Database!=SqlServer` | **4361 passed, 0 failed, 12 skipped**, 6 m 2 s |

## What the fast tier cannot prove

`MealsFundingReservation.ConcurrencyVersion` is `IsRowVersion()`. SQLite never populates it, so every
row's token stays NULL, the release's UPDATE predicate degrades to `AND "ConcurrencyVersion" IS NULL`, and
it always matches. `MealsHarness` says this in its own header.

`StaleConcurrencyTokenInterceptor` therefore supplies the **lost check**, not the race: on the first save
carrying a modified reservation it moves the tracked entry's *original* rowversion off the value in the
row, EF emits its real `… AND "ConcurrencyVersion" = @p` predicate, it matches nothing, and the real EF
pipeline raises the real `DbUpdateConcurrencyException` — same exception, same code path. The count comes
from `ThrowingConcurrencyExceptionAsync`, so the test cannot pass vacuously if EF stops raising it.

It is not the interleaving. On one shared in-memory SQLite connection a rival's commit cannot land inside
the window between the in-transaction read and the save — the window the conflict actually requires. Every
route to widening it was considered and rejected as dishonest or unreliable:

- rival on a second context — same connection, joins the same transaction, rolled back with it;
- rival at `SavingChangesAsync` / `SaveChangesFailedAsync` — both inside the transaction, same problem;
- rival at `IDbTransactionInterceptor.RolledBackAsync` — would work, but it arranges the *observed state*,
  not a race, and would have dressed a classification pin as race evidence;
- shared-cache or file-backed SQLite with two connections — the reader's table lock blocks the rival, and
  in WAL the loser's own guard UPDATE hits `SQLITE_BUSY_SNAPSHOT` before it ever reaches the check.

**Waits on SQL Server:** that a genuine rowversion race raises this at all, and that a rival which has
moved the reservation to `Captured`/`Released` is answered `DeniedCaptured`/`AlreadyReleased` from the
retry's own in-transaction re-read. Docker is down estate-wide; the SQL tier was not attempted.

## Design judgements

**Retry rather than answer from a separate re-read.** The reviewer named "catch, detach, re-read, answer".
The retry's own in-transaction read *is* that re-read — the existing state gates already answer
`AlreadyReleased` and `DeniedCaptured` — so a second read would have duplicated them.

**Re-reading can itself race, but only forwards.** The state machine is monotonic
(`Reserved → Bound → Captured`, or `→ Released`) and both terminal states absorb, so a re-read is always
as fresh or fresher, and at most two conflicts can precede a terminal answer. That is why the budget is 3:
a proof, not a hope.

**The exhausted branch rethrows.** No `MealsReleaseOutcome` is true there — the reservation is neither
released nor captured. `AlreadyReleased` would be a lie to a caller about a live reservation, and the
reviewer's `denied-bound` does not exist in the enum. Widening a seam enum for a branch that is
unreachable by the argument above was the worse trade, so it throws honestly, and both core-facing callers
now contain a throwing release.

**The detach is money, not tidiness.** `MealsFundingAuthority` runs on the request's scoped
`ApplicationDbContext`. A reservation left tracked as `Modified(State = Released)` after a failed save
would be written out by the caller's next `SaveChanges` — untransacted, and with no guard decrement at
all. Pin 2 exists for exactly this.

**The money assertion needs two reservations.** With one, a double decrement is invisible: the second
subtraction fails the guard's own `>= 0` floor and leaves the same `0` the correct single decrement
leaves. Two reservations on one guard (`5000 + 5000` of the seeded `20000`) make it observable —
`10000 -> 5000` correct, `10000 -> 0` on a double decrement.

## Adjacent finding (handed off)

`Services/Meals/MealsReconciliationWorker.cs:100` `ReleaseStrandAsync` has the identical unguarded shape,
and its caller (`SweepExpiredReservationsAsync`, the `foreach` at line ~75) does not catch — one lost race
aborts the whole sweep for that store, leaving every remaining strand unreleased that run. It is also the
writer that makes the core-facing race real: it is the only thing that releases a `Reserved` reservation
while checkout is binding it. Not fixed here (outside the two named core-facing paths); now
`L-MEALS-SWEEP-GUARD`.

## Constraints

C1 no append-only table touched. C2 no migration. C3 no new service, flag, route or page — the change sits
on already-wired paths. C4 no new money-path write. C6 no statutory claim. C7 the new `LogWarning` carries
`ReservationId` and attempt counters only; the reservation token, a bearer credential, is never logged.
C5 is the open one: a person-level walk of a lost race is not producible without SQL Server.
