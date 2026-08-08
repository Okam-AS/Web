# L-MEALS-QUOTE-RETRY — evidence

Base **`46519562`** on `lane/meals-quote-retry`, worktree `/Users/svendaneel/okam/wt-mealsqretry`
(my own, made for this lane; never a shared path). `46519562` = `lane/meals-supersede-sql` `7dafec47`
merged with `lane/meals-eighth-pin` `9fe599c6`. Both are needed: the first carries the SQL Server retry
fixture and the finding, the second carries the eighth degenerate guard-zero pin this change must not
break. They touch disjoint files (a new SQL file vs. `MealsRequoteSupersedeTests.cs`), so the merge is clean.

## The finding, verified by injection BEFORE anything was built

`base-finding.trx` (all `.trx` below are in this directory) — the three new pins run against the UNCHANGED service:
**3 failed, 0 passed.** Two of them with the caller's actual answer, verbatim:

```
System.InvalidOperationException : A quote idempotency-key race reported a conflict but no receipt was found.
   at WebApi.Services.Meals.MealsQuoteService.CreateQuoteAsync(...) MealsQuoteService.cs:line 357
```

The brief is confirmed exactly: a transient failure raised inside `CreateQuoteAsync`'s own `SaveChanges`
does not lose the quote to an error about the failure — it loses it to an internal error about a receipt
race that never happened.

## Why it happens

`SqlServerRetryingExecutionStrategy` rewinds the **transaction**, not the **change tracker**. The delegate
is re-run from the top, but the reservation and receipt the failed attempt `Add`-ed are still `Added`, so
the retry stages its own alongside them and one `SaveChanges` inserts **two receipts under one idempotency
key**. The unique index fires, the existing duplicate-key handler rolls the retry back too and goes looking
for the winner, `MealsCommandReceiptService.FindAsync` reads the database (`AsNoTracking`) where nothing was
ever committed, and the caller gets the `InvalidOperationException` above.

## The fix, and what "retry-safe" had to mean

`Services/Meals/MealsQuoteService.cs`, +30 lines: one `List<object>` recording everything the call stages
on the tracker, one parameter, and **every attempt of the retried delegate opens by detaching what the
previous attempt staged.** It is the estate's own detach-and-re-read vocabulary — the one
`ReleaseSupersededReservationAsync` already ends with — applied to the attempt as a whole.

### Alternatives, and why they are worse

| Rejected | Why |
| --- | --- |
| `_context.ChangeTracker.Clear()` at the top of the attempt | The context is registered `ServiceLifetime.Scoped` (`Program.cs:93`) — one instance per request, shared with every other service on that request. Clearing it detaches entities this method never touched and whose owners still hold references. |
| A `catch`/rethrow around the quote's own `SaveChanges` that detaches the two inserts | Stops the collision and nothing else. The release's own `SaveChanges`, one statement earlier in the same delegate, carries the identical hazard in the `Modified` direction — and every future tracked write in this delegate would need its own catch. |
| Re-reading the receipt table at the top of the retry to decide whether to re-stage | It can only see COMMITTED rows and the rolled-back attempt committed none, so it cannot see its own leftovers — which is the whole problem. |
| Detaching in a `finally` inside the attempt | It would also fire on the SUCCESS path, changing what the caller's context tracks after a normal quote. The chosen shape is a no-op unless a retry actually happens. |

**The `Modified` half matters as much as the `Added` half.** `ReleaseSupersededReservationAsync` re-reads
the superseded reservation by token hash on every attempt, and EF **identity-resolves that read to a
tracked instance**. A copy left `Modified` (`State = Released`) by a failed attempt makes the retry's own
guard clause take the silent no-op branch: the cap is freed **never**, the row is `Reserved` again in the
catalog, and the re-quote is charged on top of the hold it was replacing. That is precisely the failure the
release's own detach comment describes — reached through its save instead of through the commit, which is
why the sibling lane's commit-time injection could not see it.

## The pins

`WebApi.Tests/Meals/MealsQuoteRetrySqlServerTests.cs` — 3 tests,
`[Collection(MealsSqlServerCollection.Name)] [Trait("Database", "SqlServer")]`.

SQLite cannot host any of them: it installs `NonRetryingExecutionStrategy`, so **no container-free test can
enter a retry at all.** Every guard reading carries an uninvolved **6000** bystander hold (the module's
standing discipline after the four release lanes): the row walks 6000 → 11000, so correct reads **11000**,
charged twice reads **16000**, released twice reads **6000**.

| Test | Injection point | What it proves |
| --- | --- | --- |
| `A_transient_failure_inside_the_quotes_own_save_still_returns_a_usable_quote` | the INSERT of the quote's own command receipt | a quote comes back, and the token it carries **binds** through `MealsFundingAuthority` — not merely a response object with a token-shaped field |
| `A_retried_quote_key_replays_the_one_reservation_it_created` | same | the idempotency-key contract survives the retry: replaying the key returns the SAME reservation, one receipt, allowance charged once |
| `A_transient_failure_inside_the_supersede_release_save_still_frees_the_cap_once` | the UPDATE that persists the superseded reservation's `Released` state | the retry RE-READS instead of remembering: guard 11000, superseded `Released(MEALS_RELEASED_SUPERSEDED)`, bystander untouched |

Each retry is **evidenced, not assumed**, and the probe is independent of the thing under test: the
compare-and-increment is counted (one per attempt) in the first two, and the release's own opening lookup
is counted in the third — the lookup is issued on every attempt whether or not the release then does
anything. `Assert.True(interceptor.HasFired)` comes first in all three, because everything after it passes
trivially on a run where no transient failure fired at all.

`TimeoutException` is what `SqlServerTransientExceptionDetector` treats as transient; EF wraps it in a
`DbUpdateException` on the way out of `SaveChanges` and unwraps it again before asking the strategy, so it
is retried rather than surfaced — and it is not a unique violation, so the existing duplicate-key `catch`
correctly declines it.

## Non-vacuity — three mutants, all at the SQL tier

Every mutant was applied and restored by WRITING the file (never `mv` of a `.bak`), the project was rebuilt
between each, and the service was verified byte-identical to its pre-mutation copy afterwards
(`md5 ea10e5c786c39d7575ef933ac3e81dd4`).

| Mutant | trx | Result | Reading |
| --- | --- | --- | --- |
| **M1** — the detach loop removed (the whole fix) | `mutant-m1-no-detach.trx` | **3 of 3 red** | both quote pins: `InvalidOperationException … no receipt was found`; release pin: money **Expected 11000, Actual 16000** |
| **M2** — only `staged.Add(superseded)` removed | `mutant-m2-no-superseded-register.trx` | **1 of 3 red** | release pin alone, money **Expected 11000, Actual 16000** |
| **M3** — only `staged.Add(reservation)` + `staged.Add(receipt)` removed | `mutant-m3-no-insert-register.trx` | **2 of 3 red** | both quote pins, `InvalidOperationException … no receipt was found`; release pin still green |

M2 and M3 are the load-bearing pair: they show the two halves of the fix are **separately** necessary and
**separately** pinned, so neither line is riding on the other's test.

## Runs

### SQL tier — `quote-retry-sql-tier.trx`, 16/16 passed, 3 m 30 s, ONE container

| Class | Tests | Why it is in the selection |
| --- | --- | --- |
| `MealsQuoteRetrySqlServerTests` | 3 | new |
| `MealsRequoteSupersedeSqlServerTests` | 3 | the sibling lane's pins over the same method, including its commit-time retry pin — my change must not move it |
| `MealsFundingConcurrencyTests` | 2 | the concurrent-quote race through `CreateQuoteAsync`, the same delegate |
| `MealsQuotePolicyPinSqlServerTests` | 2 | the F1 pinned-policy CAS, inside the retried delegate |
| `MealsCommandReceiptSqlServerTests` | 4 | the receipt table's real unique index — the constraint the defect collided on |
| `MealsFundingPathHardeningSqlServerTests` | 2 | the funding path's hardening pins at the real tier |

### Container-free tier — base and after, MEASURED, not inherited

| | Total | Passed | Failed | Skipped | testcontainers lines |
| --- | --- | --- | --- | --- | --- |
| base `46519562` (`base-fast-tier.trx`) | 4379 | 4367 | 0 | 12 | **0** |
| this commit (`quote-retry-fast-tier.trx`) | 4379 | 4367 | 0 | 12 | **0** |

Identical, which is the correct outcome: the new class carries `[Trait("Database","SqlServer")]` and the
production change is inert on SQLite (`NonRetryingExecutionStrategy` never re-runs the delegate, so the
detach loop runs once over an empty list). The base was run from a clean checkout of `46519562` in this
worktree (`git stash push -u` of the two lane files), rebuilt, then restored and rebuilt again — the
assembly's size and mtime were checked to change on every rebuild, so no `--no-build` number here measures a
previous binary.

**Nothing this change was told not to break, broke.** In the fast tier: `MealsRequoteSupersedeTests` **10/10**
(the eighth pin's ten, including its new tenth refusal test), `MealsExpiryGraceReconciliationTests` 5/5,
`MealsCommandReceiptIdempotencyTests` 4/4, `MealsReservationStateMachineTests` 25/25, and
`SqlServerContainerTraitTests` **3/3** — which is what proves the new class is excluded from the
container-free tier by construction rather than by my reading of it.

## What was deliberately NOT done

- **No fifth release site, and no audit row anywhere.** All release sites still write none; the gap stays
  visible for its own blocked lane and this change adds no new unattributed write.
- **The `>= 0` floor is untouched.** Per `L-MEALS-EIGHTH-PIN`, the floor is what turns a double release from
  a wrong number into an error. The retry path is exactly where a double decrement would arise, and the fix
  prevents the double by re-reading rather than by relying on the floor to absorb it.
- **C2: no migration, no `OnModelCreating` change, no THROW number claimed.** `Migrations/` untouched.
- **C4:** every quote and every release in the new tests is driven by `MealsWorld.EmployeeApplicationUserId`,
  a resolved employee. No null, ambient or hard-coded system actor is constructed anywhere. The bystander
  hold is deliberately the SAME employee — it has to sit on the same guard row to be a residual.
- **C7:** all eight committed `.trx` scanned for `Password=`, `OkamSqlServer`, `eyJ`, `Bearer `, `mealstok_`,
  the test token secret and connection-string prefixes: **zero hits**. No log or telemetry call was added.
- **C5: this is NOT acceptance.** It is a suite result on a real database, not a person completing a journey.

## Container discipline

One SQL Server container per SQL run, started by the granted `MealsSqlServerFixture` slot and reaped by its
own ryuk; none of mine survive. Attribution by **label**, never by count or timing. `okam-lws-sql` and
`zen_pasteur` (`org.testcontainers.session-id=dc42565a…`, another lane's) were present throughout and left
alone. A third, **`okam-lws-staff-sql`, appeared at 11:33 — inside my run window — and is NOT mine**: no
testcontainers label, no ryuk, and an operator name in the same `okam-lws-*` family as the pre-existing one.
Attributing it by timing would have blamed it on this lane. Untouched.

## Never-run-a-migration-against-production

The only `MigrateAsync` on this lane's path is `MealsSqlServerFixture` / `MealsHarness.CreateSqlServerAsync`,
whose connection string comes entirely from `MsSqlContainer.GetConnectionString()` — host `127.0.0.1`, mapped
ephemeral port. No test in these runs reads the `WebApiDatabase` configuration value.

Local commits only; nothing pushed.
