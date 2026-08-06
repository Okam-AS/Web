# L-MEALS-VIOLATION-EXACT - mutation log

The Meals twin of the defect `L-WF-VIOLATION-EXACT` fixed in Workforce:
`Services/Meals/MealsDbViolations.cs` accepted SQLite's PRIMARY result code `SQLITE_CONSTRAINT` (19) as
proof of a uniqueness clash. 19 is the whole constraint family - NOT NULL (1299), CHECK (275) and
FOREIGN KEY (787) all reduce to it - and a NOT NULL failure names its table in the message exactly as a
UNIQUE one does, so every by-table discriminator built on the predicate is blind to the difference.

Every pin below was watched FAIL against the loose predicate and watched PASS after restore, four states,
full rebuild each time, never `--no-build`.

## Where

| | value |
|---|---|
| repo | OkamAPI |
| branch | `lane/meals-violation-exact` (local, unpushed) |
| worktree | `/Users/svendaneel/okam/wt-mealsviolexact` |
| base | `569887a5` (`feature/restaurant-modules`, verified unmoved at end: `569887a5`) |
| commit | `13cd9f18` |

Container-free tier only (`--filter "Database!=SqlServer"`). **No container was started**; the four
`okam-*-sql` containers and `zen_pasteur` on this host were not mine and were not touched. No migration
authored. Nothing pushed. `docs/plan/**` untouched except this file and the RETURN.

## The change

`Services/Meals/MealsDbViolations.IsUniqueViolation(Exception)`, SQLite arm:

```
-  return sqlite.SqliteErrorCode == 19
-      || sqlite.SqliteExtendedErrorCode == 2067
+  return sqlite.SqliteExtendedErrorCode == 2067   // SQLITE_CONSTRAINT_UNIQUE
       || sqlite.SqliteExtendedErrorCode == 1555   // SQLITE_CONSTRAINT_PRIMARYKEY
       || (sqlite.Message != null && sqlite.Message.IndexOf("UNIQUE constraint failed", ...) >= 0);
```

**The SQL Server arm was verified independently for Meals rather than assumed from the sibling.** It
matches `error.Number == 2627 || error.Number == 2601` and nothing else: it accepts neither 547
(FK/CHECK) nor 515 (NOT NULL), nor the Meals trigger band 50041/50042/50043 that the same file defines
as constants two screens up. Already exact - unchanged.

`IsDeterministicConstraintViolation` in the same file keeps `SqliteErrorCode == 19` deliberately: that
predicate WANTS the whole family (it is the projection worker's poison-quarantine gate, and a CHECK or
NOT NULL failure is exactly as deterministic as a UNIQUE one). Narrowing it would have been the
opposite bug. It is documented as such in the new doc comment.

## Which write it lands on, and what the wrong answer costs

Meals routes every money write through this one predicate: the funding bind
(`MealsFundingAuthority`), the quote/tender command-receipt race (`MealsQuoteService`), the exactly-once
capture ledger (`MealsFundingLedgerService`), `MealsReconciliationWorker`, `MealsProjectionWorker`,
`MealsCompanyService`, `MealsCommandReceiptService`; and the by-table discriminators
`IsUniqueViolationOn` (command receipts / memberships / agreements), `IsPolicyVersionViolation` and
`IsEnrollmentViolation` are all built on top of it.

The pinned write is the **funding bind** - `ValidateAndBindAsync`, the single point at which one Okam
order becomes company-funded. Its two answers:

| failure on `MealsOrderAttributions` | required answer | answer under the loose predicate |
|---|---|---|
| genuine uniqueness clash (a rival bound the order first) | `MEALS_RESERVATION_NOT_FOUND` | `MEALS_RESERVATION_NOT_FOUND` |
| genuine NOT NULL failure (a fault) | `MEALS_MODULE_UNAVAILABLE` (deny-closed) | **`MEALS_RESERVATION_NOT_FOUND`** |

So a broken funding write told checkout that a live reservation had vanished - a benign, retry-shaped
refusal - instead of the seam's own "I could not confirm this bind". The operator sees a routine race;
the order is quietly not company-funded.

## Non-vacuity: both directions on the same production write

`WebApi.Tests/Meals/MealsConstraintViolationExactnessTests.cs`, 5 facts. "A non-uniqueness failure is not
mapped" is a negative that one case cannot show - a predicate refusing everything would satisfy it - so
each pair drives the SAME write to failure twice and pins opposite outcomes.

Outcomes are read from the stable `MEALS_*` reason code **by value**. The bind's outcome enum is `Denied`
in BOTH directions, so it discriminates nothing - the Meals equivalent of the sibling's "every case here
is a 409, read the Problem Details body". (The bind is an in-process seam, not an HTTP endpoint; its
reason code is the caller-visible discriminator, not a status.)

| # | fact | direction |
|---|---|---|
| 1 | `A_uniqueness_clash_on_the_attribution_table_classifies_as_a_unique_violation` | UNIQUE (2067) -> true, `IsUniqueViolationOn(...,"MealsOrderAttributions")` true |
| 2 | `A_primary_key_clash_on_the_attribution_table_classifies_as_a_unique_violation` | PK (1555) -> true (the arm otherwise uncovered) |
| 3 | `A_not_null_failure_on_the_attribution_table_is_not_a_unique_violation` | NOT NULL (1299) -> false, and `IsUniqueViolationOn` false |
| 4 | `A_bind_beaten_to_the_order_inside_its_own_transaction_denies_reservation_not_found` | production write, UNIQUE -> `MEALS_RESERVATION_NOT_FOUND` |
| 5 | `A_bind_whose_write_hits_a_not_null_failure_never_denies_reservation_not_found` | production write, NOT NULL -> `MEALS_MODULE_UNAVAILABLE` |

Facts 4 and 5 assert `interceptor.HasFired` - the clash / the fault must actually have been raised inside
`BindInTransactionAsync`, or the pin proves nothing (both pre-checks in `ValidateAndBindAsync` can return
the same reason code without ever reaching the catch under test).

Money assertions by value (C4): the actor is named explicitly (`MealsWorld.EmployeeApplicationUserId`,
never ambient or system) and re-read off the reservation row after the refusal; the reservation is still
`Reserved` and still carries `ReservedCapMinor = 5000`; in fact 5 the surviving attribution still carries
`Currency = "NOK"`, `BoundCartTotalMinor = 4500`, `OrderId = 870002`, and the contested order has no
attribution at all.

## Provocation honesty

**The uniqueness clash is production-shaped.** A rival attribution for the SAME order id is staged on the
bind's own connection and ambient transaction, in the TOCTOU window between the bind's pre-checks and its
INSERT - the exact window the catch exists for. The rival row copies company / reservation / store /
currency straight out of the rival reservation row (`INSERT ... SELECT ... FROM MealsFundingReservations
WHERE QuoteHash = $x`), so no value is re-encoded by the test and the composite FK holds. The exception is
SQLite's, on the bind's own INSERT, against the real unique index.

**The NOT NULL failure is not reachable from production code.** `MealsOrderAttribution.Currency` is a
non-nullable CLR string always copied from the reservation, so EF cannot be persuaded to write a null
through it. It is provoked by `UPDATE "MealsOrderAttributions" SET "Currency" = NULL` executed on the
bind's own connection and ambient transaction. **The statement is the test's; the exception is not** - it
is raised by SQLite enforcing the schema `EnsureCreated` built from the production model, and it carries
the real primary code (19), the real extended code (1299) and the real message naming the table. All four
are asserted. Nothing here is a hand-built exception.

**C1 note.** `MealsOrderAttributions` was chosen deliberately: it is mutable (the capture projection
stamps `CapturedAtUtc`), so it is in neither the `GuardAppendOnly` family nor the Meals deny-trigger band
(50041 `MealsFundingAllocations`, 50042 `MealsCreditAdjustments`, 50043 `MealsStatementLines`, plus
`MealsAuditEvents`). The `MealsFundingAllocations` exactly-once gate would have been the other obvious
pin, and was rejected for exactly this reason - provoking it would have put an UPDATE against an
append-only table in the diff.

**A guard that throws after mutating a tracked entity** - none introduced. The bind's own catch already
detaches the staged attribution and reservation before re-reading; nothing in this lane mutates a tracked
entity.

## What a SQL Server run would still have to show

The container-free tier cannot observe any of it:

- a NOT NULL failure on `MealsOrderAttributions` (**error 515**) escaping the bind as a fault -
  `MEALS_MODULE_UNAVAILABLE`, never `MEALS_RESERVATION_NOT_FOUND`;
- a foreign-key / CHECK conflict (**547**) - including `CK_MealsOrderAttributions_BoundTotalNonNegative`
  and the SQL-Server-only `CK_MealsOrderAttributions_Currency` - doing the same;
- the genuine index refusal (**2601** on `IX_MealsOrderAttributions_OrderId`) still mapping to the
  lost-race answer;
- and, on the money tables the fast tier cannot reach at all, the Meals trigger band 50041/50042/50043
  continuing to escape as faults rather than as uniqueness.

The SQL Server arm is unchanged by this lane, so the risk that any of these regressed is nil; what a SQL
tier would add is the positive proof, which no run on this host can give today.

## Four states

Every run rebuilt; `--no-build` never used; `WebApi.dll` mtime advanced on every state (11:07:02 ->
11:08:58 -> 11:09:52 -> 11:10:16), so no state measured a stale binary.

| state | `MealsDbViolations` SQLite arm | `MealsConstraintViolationExactnessTests` |
|---|---|---|
| FIXED | 2067 / 1555 / message | **GREEN 5/5** |
| MUTATED (bare 19 restored) | `19 \|\| 2067 \|\| 1555 \|\| message` | **RED 2 failed / 3 passed** |
| RESTORED | 2067 / 1555 / message | **GREEN 5/5** |
| RE-MUTATED | `19 \|\| ...` | **RED 2 failed / 3 passed** |
| RESTORED (final) | 2067 / 1555 / message | **GREEN 5/5**, then full tier |

The two reds, verbatim, are the defect's signature:

```
A_bind_whose_write_hits_a_not_null_failure_never_denies_reservation_not_found [FAIL]
  Assert.NotEqual() Failure
  Expected: Not "MEALS_RESERVATION_NOT_FOUND"
  Actual:   "MEALS_RESERVATION_NOT_FOUND"

A_not_null_failure_on_the_attribution_table_is_not_a_unique_violation [FAIL]
  Assert.False() Failure  (IsUniqueViolation returned True)
```

Facts 1, 2 and 4 stay GREEN in every state, which is the over-narrowing guard: the fix does not make the
predicate refuse everything.

## Tier

```
dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"
Passed!  Failed: 0, Passed: 4634, Skipped: 12, Total: 4646, Duration: 6m 20s
```

The filter is the trait form, never `FullyQualifiedName!~SqlServer` - that form starts a container.
No failure was seen that did not reproduce; nothing to name.

Post-run the wire tier dirtied `artifacts/journeys/ev-dietary/run-sheet.{json,md}` (a regenerated date
stamp), exactly as briefed. Restored with `git checkout --`, not committed. The commit was made by
pathspec over the two lane files only.

## Found, not fixed (named and left, per the brief)

1. **`Services/Workforce/WorkforceDbViolations.cs:52` still carries the bare 19 on this base.** Not a new
   instance: it is the sibling's own defect, fixed on `lane/wf-violation-exact` @ `cdb4c66c`, which is
   unpushed and not merged into `feature/restaurant-modules` (`569887a5`). **Both lanes must land** or the
   Workforce half of this defect is still live.
2. **`Helpers/DbExceptionHelper.IsUniqueViolation` and `Services/Events/EventsUniqueViolation` re-checked
   independently and confirmed exact** - 2627/2601 by number, SQLite by the `"UNIQUE constraint failed"`
   message only, no result code at all. Events delegates to the helper, so there is one detector.
3. **Two Margin classifiers are loose in a DIFFERENT way** - not the 19 defect, so out of this lane's
   scope, but they are the same family of mistake:
   - `Services/Margin/MarginRecipeSupport.IsUniqueViolation:64` falls back to
     `message.Contains("UNIQUE", OrdinalIgnoreCase)` on the base exception - an unanchored substring, so a
     CHECK or FK failure whose constraint or index name contains the word "unique" is read as a clash.
   - `Services/Margin/MarginPriceImportService.IsDuplicateKeyViolation:694` does the same and also accepts
     `"duplicate"` anywhere in the message.
   Both should match `"UNIQUE constraint failed"` (the anchored SQLite wording the rest of the estate
   uses) or the extended codes. Neither is on a money path this lane touched; left for an owner.
