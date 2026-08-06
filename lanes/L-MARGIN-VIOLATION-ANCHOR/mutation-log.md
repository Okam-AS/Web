# L-MARGIN-VIOLATION-ANCHOR - mutation log

The third instance of the misclassification family, and it fails by a different mechanism than the first
two. `L-WF-VIOLATION-EXACT` and `L-MEALS-VIOLATION-EXACT` were wrong about a **code** - they accepted
SQLite's PRIMARY result code `SQLITE_CONSTRAINT` (19), which is the whole constraint family. The two
Margin sites are wrong about a **string**: both classified by an UNANCHORED `Contains("UNIQUE")` on the
provider's message, and one of them also accepted `"duplicate"`.

The word is not the provider's alone. SQLite composes a check refusal as
`CHECK constraint failed: <constraint name>` and SQL Server names the constraint inside its 547, so the
word the predicate looked for can arrive from **the name of a constraint that is not a unique one** - and
constraint names are authored by us.

> **The lesson, said in the code and not only here:** a guard matched by a substring of something a human
> names is a guard whose correctness depends on nobody choosing an awkward name. Match the provider's own
> machine-readable classification (extended result code, error number) and let the message in only at a
> wording the provider composes and we do not.

Every pin below was watched FAIL against an unanchored match and watched PASS after restore, six states,
full rebuild each time, `--no-build` never used.

## Where

| | value |
|---|---|
| repo | OkamAPI |
| branch | `lane/margin-violation-anchor` (local, unpushed) |
| worktree | `/Users/svendaneel/okam/wt-mrgviolanchor` (my own; `OkamAPI-modules` never touched) |
| base | **`569887a5`** (`feature/restaurant-modules`, the integration tip - the same base both siblings used, so the three lanes merge together; verified unmoved at end: `569887a5`) |
| also measured at | `integration/mig-stack-land` @ `4b37f81b` (verified unmoved at end) |
| commit | `a2bfd116` |

**The defect is live at both bases.** It is not a stale report: at `569887a5` and at `4b37f81b` alike,
`MarginRecipeSupport.cs:68` and `MarginPriceImportService.cs:700-701` carry the unanchored match verbatim.
(The brief cited lines 64 / 694; the sites had drifted eight and six lines. Same two sites.) Note the two
branches have **diverged**, they are not ahead/behind: merge-base `3579bbbc`, `569887a5` +54, `4b37f81b`
+34. This lane sits on the integration tip.

Container-free tier only (`--filter "Database!=SqlServer"`, the trait form - never
`FullyQualifiedName!~SqlServer`, which does not exclude SqlServer-traited classes whose names lack the
string). **No container was started and none was touched.** No migration authored. Nothing pushed. No
shared ref moved. `docs/plan/**` untouched except this file and the RETURN.

## Is it live, or latent?

Latent, and the shape of the latency is the point. I swept every named constraint identifier in the
repository: **659 distinct `UX_/IX_/CK_/FK_/AK_` names, and not one contains "unique" or "dup".** There is
also no SQLite trigger with an author-written `RAISE(ABORT, ...)` message on this base. So no shipped
constraint trips the match today.

That is exactly why the sweep that found the sibling defects did not find this one, and exactly why it is
worth closing: the guard is correct only for as long as nobody writes
`CK_MarginPriceImportBatches_UNIQUE_OneOpenBatch`, which is a perfectly ordinary name for a domain rule
somebody will add. The failure would arrive with a migration, in a module nobody was editing, and the
suite would stay green.

Note also that the SQL Server arm at both sites is exact, so the message is only ever consulted on
**SQLite** - which is the provider the entire fast suite runs on, and therefore where a misclassification
would be silently normalised into "expected behaviour" long before it reached a customer.

## The change

### Site 1 - `Services/Margin/MarginRecipeSupport.IsUniqueViolation`

```
-  var message = ex.GetBaseException().Message ?? string.Empty;
-  return message.Contains("UNIQUE", StringComparison.OrdinalIgnoreCase);
+  var sqlite = FindInner<SqliteException>(ex);
+  if (sqlite != null)
+  {
+      return sqlite.SqliteExtendedErrorCode == 2067   // SQLITE_CONSTRAINT_UNIQUE
+          || sqlite.SqliteExtendedErrorCode == 1555   // SQLITE_CONSTRAINT_PRIMARYKEY
+          || (sqlite.Message != null
+              && sqlite.Message.IndexOf("UNIQUE constraint failed", OrdinalIgnoreCase) >= 0);
+  }
+  return false;   // an unrecognised failure is a fault, never the benign lost race
```

This is the landing shape both siblings established: extended **2067 / 1555** plus the anchored
`"UNIQUE constraint failed"` wording. The `SqlException` lookup became `FindInner<T>` (a chain walk) so the
two call shapes - `DbUpdateException.InnerException` and a deeper wrapping - reach the same answer; that
can only find the provider exception more reliably, never less.

**The SQL Server arm was verified independently for Margin rather than assumed from the siblings, and left
untouched.** `sql.Number == 2601 || sql.Number == 2627` and nothing else: it accepts neither 547 (check /
foreign key) nor 515 (NOT NULL) nor any RAISERROR trigger band. It is the third independent verification of
that arm across three modules. It reads `sql.Number` (the batch's first error) rather than iterating
`sql.Errors` as Workforce and Meals do - deliberately left alone, because that is the *narrower* read and
this lane's mandate is to narrow a loose match, not to broaden an exact one.

### Site 2 - `Services/Margin/MarginPriceImportService.IsDuplicateKeyViolation`

```
-  var msg = inner.Message ?? string.Empty;
-  return msg.IndexOf("UNIQUE", OrdinalIgnoreCase) >= 0
-      || msg.IndexOf("duplicate", OrdinalIgnoreCase) >= 0;
+  => MarginRecipeSupport.IsUniqueViolation(ex);
```

**I asked what each predicate is FOR before narrowing it**, as briefed - the Meals lane's
`IsDeterministicConstraintViolation` keeps the bare 19 on purpose because that predicate wants the whole
family for poison quarantine, and narrowing it would have been the opposite bug. Margin has no such
predicate: both sites want uniqueness and only uniqueness (the recipe-name / single-active / statement
backstops, and the duplicate-upload replay). So the right move was the *fold* Workforce already made -
one predicate for the module - rather than two near-identical copies drifting apart, which is how these
two came to be loose in slightly different ways in the first place.

Dropping `"duplicate"` costs nothing: SQLite never uses the word, and every SQL Server message that does
(`Cannot insert duplicate key ...`) arrives with 2601/2627, which the exact arm already reads. The now-dead
`using Microsoft.Data.SqlClient;` was removed with it.

## Which writes these land on, and what the wrong answer costs

| site | reached from | genuine clash | check named `..._UNIQUE_...` |
|---|---|---|---|
| `MarginRecipeSupport` | `MarginRecipeService.CreateAsync` (via `SaveGuardingUniqueNameAsync`), `ActivateAsync`, `MarginProductLinkService.SetLinkAsync`, `MarginStatementService.CreateAsync` | `margin.recipe-name-conflict` / `StaleRevision` | **`margin.recipe-name-conflict`** |
| `MarginPriceImportService` | `UploadAsync` duplicate-replay backstop | replay the winner, `IsDuplicateOfExistingBatch = true` | **replay the winner** |

Both wrong answers are worse than a 500, because both are *reassuring*:

- the recipe surface states **"A recipe with this name already exists in the store."** about a name its own
  pre-check proved free three lines earlier. The operator renames, and renames, and the refusal is never
  seen by anyone;
- the price import answers **"already uploaded - here is your previous batch, no second price effect"** for
  a write the database rejected under a completely different rule. That is the last answer that would ever
  make anyone look, on a path that rewrites cost prices into an append-only table with no retraction.

## Non-vacuity: both directions, per site, read by value

`WebApi.Tests/Margin/MarginConstraintViolationExactnessTests.cs`, 4 facts. "A non-uniqueness failure is not
mapped" is a negative that one case cannot show - a predicate that refused everything would satisfy it - so
each site drives the SAME production write to failure twice and pins opposite outcomes.

Outcomes are reduced to one comparable value by an `Outcome` helper: the module's stable `margin.*` reason
code, or `db-fault:<SQLite extended result code>`, or `accepted` plus the returned document. **Never a
status code and never non-nullness** - both sides of every pair either throw or return, so only the value
discriminates.

| # | fact | site | direction | outcome pinned |
|---|---|---|---|---|
| 1 | `A_recipe_create_beaten_to_the_name_still_answers_the_name_conflict` | 1 | genuine UNIQUE | `margin.recipe-name-conflict` |
| 2 | `A_recipe_create_refused_by_a_check_named_UNIQUE_is_not_a_name_conflict` | 1 | CHECK named `..._UNIQUE_...` | `db-fault:275` |
| 3 | `An_upload_beaten_to_the_hash_still_replays_the_winner` | 2 | genuine UNIQUE | `accepted`, `IsDuplicateOfExistingBatch`, `BatchId == rival` |
| 4 | `An_upload_refused_by_a_check_named_UNIQUE_is_not_replayed_as_a_duplicate` | 2 | CHECK named `..._UNIQUE_...` | `db-fault:275`, `Detail == null` |

Facts 3 and 4 assert `rival.HasFired` - the rival batch must actually have been committed inside the
upload's own TOCTOU window, or the replay branch is unreachable and the pin proves nothing either way.

Facts 2 and 4 also assert the *mechanism*, so it is visible rather than assumed: the raised message
**contains "UNIQUE"** (that is the vector), **does not contain "UNIQUE constraint failed"** (that is why the
anchored match separates them), and **does contain `CHECK constraint failed: CK_..._UNIQUE_...`**. The
by-value reason assertion is deliberately ordered FIRST so that an unanchored match names itself in the
failure output instead of redding on a downstream string assert.

**C4 (money path).** The price import is a money path - an applied batch rewrites cost prices into
append-only `MarginSupplierItemPrices` with no retraction. The staged rival names its uploader explicitly
(`operator:rival-9`, never ambient and never a system actor), and fact 3 re-reads that reference **off the
persisted row** and asserts it by value, so the batch the module hands the loser back is provably
attributed to the operator who actually won the race and not to the caller who lost it. It also asserts
exactly one batch exists in the store - the loser's write left nothing behind.

## Provocation honesty

**Both uniqueness clashes are production-shaped.**

- *Recipes* needs no test SQL at all. `CreateAsync`'s pre-check compares the RAW name
  (`r.Name == request.Name`) while the insert stores the TRIMMED one (`Name = request.Name.Trim()`), so
  creating `"Pizza "` beside an existing `"Pizza"` walks straight past the pre-check and loses to the real
  unique `(StoreId, Name)` index. That is a live product quirk found while reading the path, and it is the
  reason that catch is not dead code. End-to-end production, no interceptor, no test statement.
- *Price import* is the TOCTOU window the catch exists for: a rival batch carrying the same file hash is
  committed in the gap between the upload's fast-path dedup SELECT and its INSERT. It is staged on the
  service's own connection while **no transaction is open yet** (hooked to the candidate-supplier-items
  read, which `UploadAsync` issues exactly once between those two points), so it commits in autocommit and
  **survives the rollback the failing insert causes** - which is what makes the winner lookup find it, as it
  would find a genuinely concurrent upload. Staged inside the transaction it would vanish with it and the
  replay branch would be unreachable on any single-connection provider. The rival copies its hash, state and
  both timestamps straight out of a batch row **production itself wrote** (`INSERT ... SELECT ... WHERE
  p.FileName = $probeFileName`, addressed by a TEXT column), so no value is re-encoded by the test; its key
  is bound as a `Guid` rather than as text so the provider encodes it exactly as EF would.

**The check refusals are the test's constraint, and could not have been anything else - said plainly.** No
shipped constraint is named with the word; that IS the defect's condition. So the test adds one, by real
DDL, to the real model-built table:

```sql
ALTER TABLE "MarginRecipes" ADD COLUMN "NameShapeProbe" INTEGER NULL
  CONSTRAINT "CK_MarginRecipes_UNIQUE_NameShape" CHECK ("Name" <> 'Carbonara')
```

SQLite then validates it against the rows already there and enforces it on the production write. **Only the
name is ours.** Everything else is SQLite's and is asserted: the primary code 19, the extended code **275**
(`SQLITE_CONSTRAINT_CHECK`), and the wording `CHECK constraint failed: <name>`, which SQLite composes - the
test never writes that string into an exception. Nothing here is a hand-built exception, and no
`RAISE(ABORT, '<whole message>')` was used, precisely because that would have made the message the test's
too.

Two provider behaviours were verified empirically before the design was fixed, not assumed:
`ALTER TABLE ... ADD COLUMN ... CONSTRAINT <name> CHECK (<cross-column predicate>)` is accepted and
validated against existing rows; and **SQLite reports the CHECK before the unique index** when a row
violates both, which is what lets the import fact keep a genuine same-hash winner present while the failure
under test is the check. Fact 4 asserts the extended code is 275, so if that ordering ever changed the test
would fail loudly rather than pass for the wrong reason.

**C1 - checked before choosing the tables, as briefed.** `MarginRecipes` and `MarginPriceImportBatches` are
both mutable aggregates carrying a rowversion, so neither is in the append-only family
(`MarginSupplierItemPrices`, `MarginIngredientUnitConversions`) and neither carries a deny-trigger or the
`GuardAppendOnly` guard. **Every write in the diff is an INSERT**; no UPDATE and no DELETE is issued against
any append-only row. The Meals lane avoided its append-only table for exactly this reason and I did the
same rather than reaching for the statement surface.

**C2** - no migration authored; the added constraint is DDL executed by a test against an in-memory
database, never a migration and never in `OnModelCreating`.

## Six states

Every run rebuilt; `--no-build` never used; `WebApi.dll` mtime advanced monotonically on every state that
changed it, so no state measured a stale binary.

| state | site 1 | site 2 | result | `WebApi.dll` mtime |
|---|---|---|---|---|
| FIXED | anchored | delegates | **GREEN 4/4** | (built before 11:44:56) |
| MUTATED M1 - site 1 unanchored | `Contains("UNIQUE")` | delegates | **RED 2 failed / 2 passed** | 11:44:56 |
| RESTORED | anchored | delegates | **GREEN 4/4** | 11:46:28 |
| MUTATED M2 - site 2 only, local substring restored | anchored | `"UNIQUE" \|\| "duplicate"` | **RED 1 failed / 3 passed** | 11:47:15 |
| BASELINE - both files checked out pristine from `569887a5` | loose | loose | **RED 2 failed / 2 passed** | 11:47:59 |
| RESTORED (final) | anchored | delegates | **GREEN 4/4** | 11:48:59 |

The baseline state is the strongest of these: it is not my mutant, it is the shipped code, restored with
`git checkout 569887a5 -- <the two files>` and verified to produce an empty diff against the base before the
run. The test reds against the code as it stands on the integration tip.

**M2 reds one fact and not two, and that is the per-site pin working.** Site 2's own regression is caught by
site 2's own fact while site 1 stays green; M1 reds both, because site 2 now routes through site 1. Both
directions of sensitivity are therefore covered.

**No mutant survived.** Every mutation applied was caught; there is nothing to report as green-under-mutant.

The reds, verbatim, are the defect's signature - each one is the module telling a specific lie:

```
A_recipe_create_refused_by_a_check_named_UNIQUE_is_not_a_name_conflict [FAIL]
  Assert.Equal() Failure
  Expected: db-fault:275
  Actual:   margin.recipe-name-conflict

An_upload_refused_by_a_check_named_UNIQUE_is_not_replayed_as_a_duplicate [FAIL]
  Assert.Equal() Failure
  Expected: db-fault:275
  Actual:   accepted
```

Facts 1 and 3 stay GREEN in every state, which is the over-narrowing guard: the fix does not make the
predicate refuse everything.

## What a SQL Server run would still have to show

The container-free tier cannot observe any of it, and the SQL Server arm is unchanged by this lane, so the
risk that any of it regressed is nil; what a SQL tier would add is the positive proof:

- a check or foreign-key conflict (**547**) on `MarginRecipes` escaping `CreateAsync` as a fault rather than
  as `margin.recipe-name-conflict` - **including when the offending constraint is NAMED with the word**,
  which is precisely where the old code read the name out of the 547 text;
- the same for `MarginPriceImportBatches` and the upload replay;
- a NOT NULL failure (**515**) on either table escaping as a fault;
- the genuine index refusals (**2601 / 2627**) still mapping - the recipe `(StoreId, Name)` index, the
  filtered single-active backstops on activation and product link, the statement
  `(StoreId, PeriodStart, RevisionNumber)` index, and the import `(StoreId, FileSha256)` index;
- `MarginStatementSqlServerTests` line 115, which asserts `MarginRecipeSupport.IsUniqueViolation(ex)` on a
  real SQL Server exception, still passing - it exercises the arm this lane did not change.

The genuine duplicate REPLAY is also SQL-Server-only evidence in the strict sense: the fast tier reaches it
only because the rival commits in autocommit on the same connection. A true two-connection race is what
`MarginPriceImportSqlServerTests` proves.

## Tier

```
dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"
Passed!  Failed: 0, Passed: 4633, Skipped: 12, Total: 4645, Duration: 6m 23s
```

That is the base's 4629 plus this lane's 4 new facts - the same 4629 the two siblings measured, so nothing
that was green on `569887a5` moved.

**No container was started.** Five were running on this host throughout (`okam-lvsp-sql`, `okam-lwr-sql`,
`okam-lws-staff-sql`, `okam-lws-sql`, `zen_pasteur`); none is mine and none was touched. **No failure was
seen that did not reproduce; there is nothing to name.**

Post-run the tier dirtied the two tracked `artifacts/journeys/ev-dietary/run-sheet.{json,md}` files - a
regenerated date stamp, exactly as briefed, and a sibling owns the fix. Restored with `git checkout --`,
not committed. The commit was made by pathspec over this lane's four files only.

## Found, not fixed (named and left)

1. **`Helpers/DbExceptionHelper` and `Services/Events/EventsUniqueViolation` were NOT re-swept**, per the
   brief: they have been verified exact twice already by two different lanes. Margin was the last known
   member of this family.
2. **The Workforce and Meals fixes are still unmerged** on this base - `lane/wf-violation-exact` @
   `cdb4c66c` and `lane/meals-violation-exact` @ `13cd9f18`. All three lanes share the base `569887a5` and
   **all three must land**, or the family is only partly closed.
3. **`MarginRecipeService.CreateAsync` compares the raw name and stores the trimmed one.** The pre-check is
   defeated by a trailing space, so `"Pizza "` reaches the unique index instead of being refused at the
   pre-check. The outcome is the same 400 either way (the index catch answers
   `margin.recipe-name-conflict`), so it is not a correctness defect - but it means the pre-check is not the
   guarantee it reads as, and it is the mechanism fact 1 relies on. An owner may want the pre-check to
   compare the trimmed name. Not this lane's scope, not fixed.
4. **The two branches `feature/restaurant-modules` and `integration/mig-stack-land` have diverged**, not
   merely advanced (merge-base `3579bbbc`, +54 / +34). This fix applies cleanly to both since the two files
   are byte-identical across them, but whoever reconciles the branches should know it is a merge, not a
   fast-forward.
