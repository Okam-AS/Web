# L-MEALS-SUPERSEDE-SQL — evidence

Base **`702d9481`** (`lane/meals-fourway-tier`, the four-way merged state: floor-pins + degenerate-two +
grace-pins + re-quote release). Work on `lane/meals-supersede-sql`, worktree `/Users/svendaneel/okam/wt-mealssupsql`.

The brief names `lane/meals-requote-release` (`d5483cb3`) as the tree carrying the change. `702d9481` is a
strict descendant of it and is the only tree that also carries the STRENGTHENED
`Expired_bound_reservation_release_and_exception_persist_on_real_sql_server`, which the brief asks to be run.
Both are therefore covered by one container.

## What was true before this lane

- `MealsQuoteService.ReleaseSupersededReservationAsync` had **zero SQL Server coverage** and no SQL twin.
- Its final `_context.Entry(superseded).State = EntityState.Detached` exists **only** for the retrying
  execution strategy (`Program.cs:90` wires `o.EnableRetryOnFailure()`). SQLite installs
  `NonRetryingExecutionStrategy`, so **no SQLite test can enter that path at all.**
- `MealsFundingConcurrencyTests` had never run under the re-quote change (SQL-Server-only class).
- `Expired_bound_reservation_release_and_exception_persist_on_real_sql_server` had been strengthened off
  the guard-zero read and compiled, but never executed.

## Production code changed: NONE

`Services/Meals/MealsQuoteService.cs` is **byte-identical** to the base after the mutation work
(`diff` against a pre-mutation copy, clean). This lane is test-only: the release already behaved correctly
on a real catalog. No new release site, so the "no release site writes an audit row" gap is untouched and
still visible for `L-MEALS-RELEASE-ACTOR`. C4: every test drives the release as the resolved employee
(`MealsWorld.EmployeeApplicationUserId`) — no null, ambient or system actor is constructed anywhere.
C2: `Migrations/` untouched, no migration authored, no THROW number claimed.

## What was added

`WebApi.Tests/Meals/MealsRequoteSupersedeSqlServerTests.cs` — 3 tests,
`[Collection(MealsSqlServerCollection.Name)] [Trait("Database", "SqlServer")]`.

Every guard reading carries an **uninvolved 6000 hold** on the same guard row, because a guard read taken
against a single reservation cannot tell a floored decrement from an unconditional clamp to zero. The row
walks 6000 → 11000 → release → 6000 → 11000.

| Test | What only SQL Server can show |
| --- | --- |
| `A_requote_frees_exactly_the_superseded_cap_on_real_sql_server` | the raw-SQL decrement against a migrated catalog — real widths, real `bigint ConcurrencyVersion`, real composite alternate keys |
| `A_transient_commit_failure_retries_and_the_supersede_releases_on_the_re_read` | **THE DETACH-AND-RE-READ PATH.** Production's `EnableRetryOnFailure` context + a fail-once transient failure injected at the transaction's COMMIT ⇒ the strategy re-runs the delegate and the release must re-read from the catalog |
| `A_requote_that_only_a_zeroed_row_could_fund_is_refused_and_its_release_rolls_back` | 16000 fits a zeroed row (0+16000 ≤ 20000) but not the honest residual (6000+16000 = 22000): the correct path refuses and rolls its own release back |

**Injection point matters.** The transient failure fires at `TransactionCommitting`, not on a command inside
`SaveChanges`. Firing inside `SaveChanges` leaves the new reservation and receipt staged as `Added`, so the
retry re-stages them and the receipt's unique key collides — a different, PRE-EXISTING retry hazard in
`CreateQuoteAsync` that would mask the one under test. Recorded, not fixed here (out of scope; see Left open).

**The probe is mutation-robust on purpose.** It identifies the release UPDATE as "the guard UPDATE that is
not the compare-and-increment" rather than by its minus sign, so a mutant that rewrites the SET clause still
reds on the money reading instead of on the probe. `TimeoutException` is what
`SqlServerTransientExceptionDetector` treats as transient, and EF unwraps inner exceptions when it asks.

## Runs — all on a real SQL Server container (`mcr.microsoft.com/mssql/server:2022-CU14-ubuntu-22.04`)

`WebApi.Tests/TestResults/supersede-sql-clean.trx` — **18/18 passed, 0 failed, 51 s**:

| Class | Tests | Note |
| --- | --- | --- |
| `MealsRequoteSupersedeSqlServerTests` | 3 | new — the first SQL Server coverage the release has ever had |
| `MealsFundingConcurrencyTests` | 2 | **first run under the re-quote change.** The 10-winner claim was an argument from source; it is now a measured result |
| `MealsExpiryGraceReconciliationSqlServerTests` | 2 | the strengthened pin — **first execution anywhere** |
| `MealsQuotePolicyPinSqlServerTests` | 2 | the F1 pinned-policy CAS, re-proven alongside |
| `MealsRequoteSupersedeTests` | 9 | the SQLite twins, unchanged and still green |

`WebApi.Tests/TestResults/trait-guard.trx` — `SqlServerContainerTraitTests` 3/3, **zero** `testcontainers.org`
lines in the log: the new class is correctly trait-excluded from the container-free tier.

The full container-free tier was NOT re-measured here. It was measured at this exact commit by
`L-MEALS-FOURWAY-TIER` (4366 passed of 4378, 12 standing skips) and the new file carries
`[Trait("Database","SqlServer")]`, so it is excluded from that filter by construction — which the trait guard
above proves rather than assumes.

## Non-vacuity — three mutants, all at the SQL tier

No mutant used `--no-build`; each was applied and restored by writing the file, and the service was verified
byte-identical to its pre-mutation copy afterwards.

| Mutant | Result | The reading it produces |
| --- | --- | --- |
| **M1 clamp** — `SET ReservedMinor = 0` (floor predicate kept) | **3 of 3 red** | money pin `Expected 11000, Actual 5000`; retry pin `Expected 11000, Actual 5000`; refusal pin `Assert.Throws … (No exception was thrown)` |
| **M2 repeat decrement** — the release UPDATE issued twice | **3 of 3 red** | money pin `Expected 11000, Actual 6000` — **the residual alone**; retry pin `ReleaseUpdates Expected 2, Actual 4`; refusal pin no exception |
| **M3 detach removed** — drop `Entry(superseded).State = Detached` | **1 of 3 red** — and ONLY the retry pin | `Expected 11000, Actual 16000` — the cap freed **never**, the reservation still `Reserved` in the catalog |

M3 is the load-bearing result. The two other SQL pins and all nine SQLite twins pass with the detach removed,
which is the direct measurement of the brief's claim: **nothing outside this one test can see that line.**

### The mutation signature, corrected by measurement

The brief predicted "under a clamp the pin must fail reading zero, not the residual." Half of that is
confirmed and half is not:

- a **repeat decrement lands on the residual (6000)** — exactly as briefed;
- a **clamp reads 5000, not zero.** Zero is unreachable for any pin that reads the guard after the re-quote's
  own increment has landed, because the clamped row is 0 and the new cap is then added to it: the reading is
  always the new cap. 5000 and 6000 are distinct, so the two defects are still told apart, which is what the
  requirement was for.

## Container discipline

One SQL Server container per run, started by `MealsSqlServerFixture` (the granted slot), reaped by its own
ryuk. Attribution by **label**, never by count or timing: `okam-lws-sql` (no testcontainers label, operator
name, no ryuk) and `zen_pasteur` (`org.testcontainers.session-id=dc42565a…`, another lane's, up 16 h) were
present throughout and **not touched**. Container-name sets were snapshotted before and after; the only delta
at the end is this lane's own ryuk.

Filters used a positive whitelist with a **trailing dot** (`FullyQualifiedName~Meals.MealsRequoteSupersedeTests.`)
so no substring reaches a `…SqlServerTests` sibling.

## C7

All six `.trx` files scanned for `Password=`, `OkamSqlServer`, `eyJ…`, `Bearer`, `mealstok_` and the test
token secret: **zero hits.** No connection string, SA password or authorization token reaches an artifact.

## Never-run-a-migration-against-production

The only `MigrateAsync` in this lane's path is `MealsSqlServerFixture` / `MealsHarness.CreateSqlServerAsync`,
whose connection string is derived entirely from `MsSqlContainer.GetConnectionString()` (host `127.0.0.1`,
mapped ephemeral port). No test in this run reads the `WebApiDatabase` configuration value, and no
`dotnet ef database update` was run at all.

## Left open, deliberately

**`CreateQuoteAsync` is not retry-safe against a transient failure raised INSIDE its `SaveChanges`.** The
reservation and receipt stay `Added` on the change tracker across the retry, so the retry stages a second
pair, the receipt's `(CompanyId, ScopeKey, IdempotencyKey)` unique key collides, the handler rolls back and
`FindAsync` then finds no committed winner — surfacing `InvalidOperationException("A quote idempotency-key
race reported a conflict but no receipt was found.")` instead of a quote. This is pre-existing, older than the
re-quote change, and is why the injection point here is the commit rather than the insert. Not in this lane;
it wants its own pin and a `Detach`-on-failure fix in the delegate.
