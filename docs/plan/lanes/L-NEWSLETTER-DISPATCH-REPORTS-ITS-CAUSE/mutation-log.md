# L-NEWSLETTER-DISPATCH-REPORTS-ITS-CAUSE — mutation log and evidence

Worktree: `/Users/svendaneel/okam/wt-newsletter-cause`, detached at OkamAPI `8e2b57de`
(`refs/heads/feature/restaurant-modules` tip). Read-reference for the composed stack:
`integration/mig-stack-merge` `7f8945dc` in `/Users/svendaneel/okam/wt-migstackmerge` — read only, never worked in.

Nothing pushed. No commit on a shared branch. No migration. No model change. No container started or touched.

---

## 0. THE COLLISION — read this before landing anything

**This exact production fix already exists, built and mutation-proved, and is not merged.**

`L-GROWTH-SQL-CATCH-TYPED` (plan state `built-unverified`, return
`docs/plan/returns/L-GROWTH-SQL-CATCH-TYPED-1.md`, evidence
`Web-modules/lanes/L-GROWTH-SQL-CATCH-TYPED/mutation-log.md`) committed
`lane/growth-sql-catch-typed` `c7912d49` on 2026-08-05, parent `8e2b57de`, **unpushed**:

```
NOT merged into 8e2b57de   (feature/restaurant-modules tip — this lane's base)
NOT merged into 7f8945dc   (integration/mig-stack-merge — the composed stack)
```

Its production hunk for this handler is **character-identical in behaviour** to the one derived here,
independently, before that branch was found:

```csharp
catch (DbUpdateException ex) when (DbExceptionHelper.IsUniqueViolation(ex))
```

That is convergence, not novelty. Two lanes reached the same two-line change through the same shared
detector. **Do not land two copies.** `c7912d49` is the better landing candidate on the merits: it also
narrows `GrowthConsentTextService.PublishAsync:247`, which this lane's exit criterion excludes and which
carries the *purer* instance of the reported defect — an absent table answered with a literal
`409 growth.consent_text_version_race`, "another version of this locale was published concurrently, re-read
the register and retry", an instruction that can never succeed.

**What this lane adds that `c7912d49` does not have.** Its own docstring states the gap: its dispatch
missing-object arm raises a **constructed** `SqlException` (SQL Server 208, built by SqlClient's factory)
through a command interceptor, and only the *consent-text* pair carries a fabrication-free third arm.
Dispatch has no provider-genuine arm there. `A_dispatch_whose_audit_ledger_is_absent_reports_the_absent_ledger_not_a_race`
below is that arm: the failure is raised by the provider itself, with nothing constructed anywhere, driven
through the real service. If the 208 construction were ever wrong, this arm still catches the defect.

The second arm here (`A_dispatch_that_genuinely_loses_the_run_race_still_adopts_the_winner`) overlaps
`c7912d49`'s arm 5. If `c7912d49` lands, that arm is duplication and should be dropped; its provocation is
different (a one-shot clock hook rather than a command interceptor) but it proves the same property, and
`c7912d49`'s placement — committing the rival on the segment-members read — is the better seam.

---

## 1. The defect, measured rather than argued

`Services/Growth/GrowthDispatchService.cs:311` caught `DbUpdateException` untyped. The recovery under that
catch is a **diagnosis**: "a competing dispatch request won the unique `NewsletterVersionId`, reload and
return the single run". Phase A's transaction stages the run, its send intents, its deliveries, the
newsletter state flip **and** the `GrowthAuditEvents` ledger row, so the exception types are far broader
than the one the recovery can explain.

`GrowthAuditEvents` is declared in `OnModelCreating` and created by no migration (`MIG-22`,
`L-GROWTHAUDIT-TABLE-ABSENT`), so on any chain-built database — every deployed one — the staged ledger row
fails. Observed end state under the untyped catch, from the mutant run below, verbatim:

```
Expected: typeof(Microsoft.EntityFrameworkCore.DbUpdateException)
Actual:   typeof(System.InvalidOperationException): Sequence contains no elements.
   at ShapedQueryCompilingExpressionVisitor.SingleAsync[TSource](...)
   at GrowthDispatchService.CreateOrGetRunAsync(...)
```

The transaction rolled back, so the winner the recovery re-reads never existed, and `FirstAsync` throws a
**secondary** exception on top of the real one. What reaches the operator names neither the fault nor the
absent table. The lost-race diagnosis is not merely wrong, it is erased along with everything else.

## 2. The change

One hunk, `Services/Growth/GrowthDispatchService.cs`:

```
-            catch (DbUpdateException)
+            catch (DbUpdateException ex) when (DbExceptionHelper.IsUniqueViolation(ex))
```

plus the comment stating why the filter is load-bearing and that it stays load-bearing after the table
lands, because the next absent table arrives at this catch by exactly the same route.

`Helpers/DbExceptionHelper.IsUniqueViolation` is the estate's existing shared detector: SQL Server by error
**number** (2627 / 2601), never message text, which is localized on non-English servers; SQLite by its own
`UNIQUE constraint failed`. No fourth module-local copy of the predicate was added (XIX.13), no new type, no
new `using` — `WebApi.Helpers` was already imported.

**Deliberately not narrowed further.** Requiring the message to name `GrowthDispatchRuns` would have been
the more literal reading of "the cause it was written for", and it was rejected: this lane holds no SQL slot,
so an over-narrowing that stopped recognising a genuine SQL Server 2601 would regress
`GrowthDispatchLinearizationSqlServerTests` on a tier that cannot be run here. Error numbers are
provider-guaranteed and locale-independent; a message substring is neither. The one other unique index that
can fire inside this transaction (`GrowthSendIntents.LogicalSendKey`) can only be reached by a rival whose
run has already committed, which is the same race, so the recovery is honest for it too.

Not touched: `Services/Growth/GrowthConsentTextService.cs:247` (same shape, outside this exit criterion,
already covered by `c7912d49`), the model, the migration chain.

## 3. Proof — `WebApi.Tests/Growth/GrowthDispatchAbsentTableReportTests.cs`

Two arms, both on the SQLite tier, both driven through the real `GrowthDispatchService`.

**Arm 1 — `A_dispatch_whose_audit_ledger_is_absent_reports_the_absent_ledger_not_a_race`.**
A dispatch runs successfully first, so the ledger holds real rows. Then the audit table is put in the state
a chain-built database is already in, and a second dispatch is attempted. Asserts: a `DbUpdateException`
escapes; its cause chain names `GrowthAuditEvents`; no run, intent or delivery survived; and the ledger row
count is unchanged in both directions.

*Provocation honesty.* Nothing is constructed. The exception is SQLite's own, raised inside the service's
own `SaveChanges`. The absence is arranged by **renaming** the table and renaming it back —
`ALTER TABLE ... RENAME TO`, two plain constants (an interpolated `ExecuteSqlRaw` is an EF1002 warning) —
which withholds the **name** the model resolves the table by, which is precisely what the migration chain
withholds. **C1:** no row is updated, deleted, purged or backfilled; the test asserts the count is
unchanged afterwards, so the claim is checked rather than promised. This is not the `DROP TABLE` the sibling
lane used on the consent-text arm.

*Why it does not go stale when `MIG-22` lands.* It depends on nothing the ambient database does or does not
have. It arranges the absence itself, at the one moment the test is about, and keeps discriminating
afterwards.

**Arm 2 — `A_dispatch_that_genuinely_loses_the_run_race_still_adopts_the_winner`.**
The guard against replacing a wrong answer with a missing one. A rival's run is **committed for real** and
the service's own INSERT trips the real unique index on `GrowthDispatchRuns.NewsletterVersionId`. Asserts:
the loser returns the winner's run id, exactly one run exists for the version, and the recovery's own ledger
row naming `dispatcher-1` was written.

*The interleave.* `CreateOrGetRunAsync` reads the clock exactly once — after it has established that no run
exists, before it opens its transaction. That is the only in-process point where a rival's committed run can
still turn this request's insert into the genuine unique-key loss: earlier and the request adopts the rival
by the idempotent pre-check instead; later and there is nothing left to lose. A one-shot `TimeProvider`
decorator fires there. Deterministic, not a sleep — the SQLite harness is a single connection, so two
writers cannot genuinely overlap in wall time. Reaching it needed one additive optional `TimeProvider`
parameter on `GrowthDispatchTestSupport.Dispatch` (the service's time source only; the audit writer, consent
service and preference service keep the harness clock). `c7912d49` does not touch that file, so the two
merge cleanly.

### Mutation matrix

| mutant | arm 1 | arm 2 |
| --- | --- | --- |
| M1 — `when (DbExceptionHelper.IsUniqueViolation(ex))` removed (the brief's mutation: widen back to catching every `DbUpdateException`) | **RED** — `Assert.Throws() Failure`, actual `InvalidOperationException: Sequence contains no elements.` | green |
| none (the fix as landed) | green | green |

The red is the reporting, not the schema: **the schema is identical in both runs**, and only the handler
differs. Arm 2 never reds under the mutant, which is what makes it a guard rather than a second copy of arm 1.

Stale-build discipline (the trap named in `CLAUDE.md`): the mutant was written with an editor write, built
with an explicit `dotnet build` that reported compiling `WebApi.dll`, and the assembly mtime was read before
each `--no-build` run (`15:13:21` mutant, `15:14:02` restored). The restore was `cp` + `touch`, and the
restored file's md5 was checked equal to the pre-mutation snapshot (`b60cfe3d718e42b7c3b7ceb7cc310fbd`).

## 4. Suites, measured here

| run | result | file |
| --- | --- | --- |
| baseline, clean checkout of `8e2b57de`, `--filter Database!=SqlServer` | **4638 passed / 0 failed / 12 skipped / 4650** | `suites.md` |
| lane tree, same filter | **4640 passed / 0 failed / 12 skipped / 4652** | `suites.md` |
| the two new arms alone | 2 passed / 0 failed | `arms-green.txt` |
| M1 mutant, the two arms | 1 failed / 1 passed | `mutation-M1-red.txt` |

Delta accounted for test by test: **+2**, both in the one new file, both listed above. No existing test
changed behaviour; the only edit to an existing test file is one additive optional parameter with a default
that preserves every current call site. The baseline figure matches the one the brief quoted for recent
lanes, measured here rather than inherited.

No SQL-tier run: this lane holds no SQL slot (both are with `L-GROWTHAUDIT-MIGRATION` and
`L-COMPOSE-AND-RUN-THE-STACK`). `--filter Database!=SqlServer` only. No container started, stopped or
entered.

**C7 — why the raw suite logs are not in this directory.** Both full runs' stdout carries freshly minted
single-use fixture tokens (200+ occurrences of preference-centre `u1.*` and `mealstok_*` reservation
tokens). They authenticate nothing outside the test process, but a token does not belong in a file this
lane writes, so the 6.3 MB of raw output was distilled to the summary lines in `suites.md` and deleted.
`arms-green.txt` and `mutation-M1-red.txt` were scanned and carry none.

**One suite side effect, not this lane's.** Running the tier rewrites
`artifacts/journeys/ev-dietary/run-sheet.{json,md}` — `EventsDietaryRunSheetWireTests` regenerates them with
today's date (`2026-07-31` → `2026-08-06`). Pre-existing behaviour, unrelated to this change; both files
were restored so the lane diff is exactly the three below.

## 5. What this does NOT do

- It does not make dispatch **work** on a chain-built database. The five SQL-tier dispatch failures stay red
  until `GrowthAuditEvents` exists; that is `L-GROWTHAUDIT-MIGRATION` / `MIG-22`. What changes is that they
  now fail naming the absent ledger instead of an empty sequence.
- `F-NEWSLETTER-DISPATCH-DEAD-ON-CHAIN` therefore only **half** clears here. Its `clears_when` has two
  conjuncts — "newsletter dispatch succeeds on a database built from the migration chain" **and** "a failure
  caused by an absent table reports that cause". Only the second is this lane's.
- It does not fix `GrowthConsentTextService.PublishAsync`, which has the identical untyped catch and the
  worse presentation (a retryable 409 rather than a 500). Out of this exit criterion; `c7912d49` covers it.

## 6. Files

```
Services/Growth/GrowthDispatchService.cs                        (1 hunk: the catch filter + its comment)
WebApi.Tests/Growth/GrowthDispatchAbsentTableReportTests.cs     (new, 2 arms)
WebApi.Tests/Growth/GrowthDispatchTestSupport.cs                (1 additive optional parameter)
```

Committed by pathspec (never `git add -A`) on `lane/newsletter-dispatch-reports-its-cause` `33a99ac4`,
parent `8e2b57de`. **NOT pushed.** The branch exists so the work survives a crash, not because it should
land: see §0 — `c7912d49` is the landing candidate and only arm 1 here needs carrying onto it.

