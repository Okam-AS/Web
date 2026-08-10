# L-GROWTH-TELLS-THE-OPERATOR-WHAT-ACTUALLY-FAILED — mutation log and evidence

Worktree `/Users/svendaneel/okam/wt-growth-tells-operator`, branch
`lane/growth-tells-the-operator-what-actually-failed` `d74c2c87b`, **base `feature/restaurant-modules`
`118f92fb9`** (read fresh; the trunk tip at the moment this lane branched).

**Not pushed.** No migration. No model change. No container started, stopped or entered. No SQL slot taken.

---

## 1. Premise re-measured against the code, not inherited

The flag triage (`docs/plan/reviews/L-THE-FLAG-BACKLOG-IS-A-WORK-LIST.md`, entry
`F-GROWTH-PUBLISH-LIES-ABOUT-WHY-IT-FAILED`) says both catches are still untyped at the tip and states it
read rather than ran. Measured here at `118f92fb9`:

```
Services/Growth/GrowthConsentTextService.cs:247    catch (DbUpdateException)
Services/Growth/GrowthDispatchService.cs:311       catch (DbUpdateException)
```

**PREMISE HOLDS.** Both live, both at the line numbers the triage named.

## 2. The two answers, before

| site | what actually failed | what the operator was told |
| --- | --- | --- |
| `PublishAsync:247` | absent `GrowthAuditEvents`, deadlock, lock timeout, permission error | `409 growth.consent_text_version_race` — "Another version of this locale was published concurrently. Re-read the register and retry." |
| `PublishAsync:247` | a genuine `(Locale, Version)` clash | the same 409 — **correct here** |
| `CreateOrGetRunAsync:311` | absent `GrowthAuditEvents`, deadlock, lock timeout, permission error | `InvalidOperationException: Sequence contains no elements.` — the rolled-back transaction left no winner to re-read, so `FirstAsync` threw a SECOND exception on top of the real one and the fault is named nowhere at all |
| `CreateOrGetRunAsync:311` | a genuine competing dispatcher | the winner's run id — **correct here** |

The first row is the defect the objective names: an instruction to retry, given for a cause no retry can
clear. The third is worse than wrong — the real cause is destroyed rather than misnamed.

## 3. The change — two hunks, the estate's existing idiom

```
-            catch (DbUpdateException)
+            catch (DbUpdateException ex) when (DbExceptionHelper.IsUniqueViolation(ex))
```

in both services, each with the comment stating why the filter is load-bearing and stays load-bearing after
`MIG-22` lands, because the next absent table arrives at these catches by exactly the same route.

`Helpers/DbExceptionHelper.IsUniqueViolation` is the estate's single detector: SQL Server by error **number**
(2627 / 2601), never message text, which is localized on non-English servers; SQLite by its own
`UNIQUE constraint failed`. **No fourth module-local copy** of the predicate (XIX.13), no new type, no new
`using` — `WebApi.Helpers` was already imported by both files.

**Deliberately not narrowed further.** Requiring the message to name a specific index would be the more
literal reading, and it is rejected: this lane holds no SQL slot, so an over-narrowing that stopped
recognising a genuine SQL Server 2601 would regress `GrowthDispatchLinearizationSqlServerTests` on a tier
that cannot be run here. Error numbers are provider-guaranteed and locale-independent; a message substring is
neither.

**The message text was NOT widened or softened anywhere.** A friendlier sentence over an untyped catch makes
the misdiagnosis more convincing. What changed is that the two causes take different branches.

## 4. Proof — `WebApi.Tests/Growth/GrowthDbFailureClassificationTests.cs`, 6 arms

Both paths driven at BOTH sites, so each site is read for two different answers.

| # | site | the failure driven | the answer read |
| --- | --- | --- | --- |
| 1 | consent | constructed SQL Server **208** at the audit INSERT | `DbUpdateException`, chain carries `SqlException` 208 naming `GrowthAuditEvents`; asserted **not** `growth.consent_text_version_race` |
| 2 | consent | **provider-genuine** — ledger name withheld | SQLite's own "no such table: GrowthAuditEvents"; asserted **not** the 409; no version row left behind |
| 3 | consent | **provider-genuine** `(Locale, Version)` clash, rival committed on the real schema | `GrowthApiException` `growth.consent_text_version_race`, status **409** — the answer the handler exists for SURVIVES |
| 4 | dispatch | constructed SQL Server **208** | `DbUpdateException` naming the object; asserted **not** "Sequence contains no elements" |
| 5 | dispatch | **provider-genuine** — ledger name withheld | `DbUpdateException` whose cause chain names `GrowthAuditEvents`; asserted **not** "Sequence contains no elements"; no run, intent or delivery survived |
| 6 | dispatch | **provider-genuine** competing run committed between the pre-check and the INSERT | the winner's run id, exactly one run for the version, and the recovery's own ledger row naming `dispatcher-1` |

### Provocation honesty

- Arms 3 and 6 are raised by the database itself against the real unique indexes. Nothing fabricated.
- Arms 2 and 5 are raised by SQLite itself. Nothing fabricated. These are the arms that still catch the
  defect if the constructed 208 is ever wrong.
- Arms 1 and 4 construct a genuine `SqlException` carrying error number 208 through SqlClient's own internal
  factory, and this is stated in the file. 208 is a SQL **Server** number, production is chain-built SQL
  Server, and this lane was granted no SQL slot — so the number, which is the only thing the classifier reads
  on that provider, is supplied directly. The construction is version-coupled to the pinned SqlClient and
  fails loudly (`MissingMemberException`) rather than skipping silently if it ever stops resolving.

### C1 — the absence is arranged without touching a row

`GrowthAuditEvents` is append-only. The absence is arranged by **withholding the NAME the model resolves the
table by** — `ALTER TABLE ... RENAME TO` and back, two plain constants (an interpolated `ExecuteSqlRaw` is an
EF1002 warning) — never `DROP`, never `UPDATE`, never `DELETE`. That is precisely what the migration chain
withholds. Both arms record the ledger count before, restore the name, and assert the count is unchanged, in
both directions: withholding the name took no row with it, and the refused write appended none.

This replaces the `DROP TABLE` the earlier `c7912d49` used on its consent arm, following the idiom
`L-NEWSLETTER-DISPATCH-REPORTS-ITS-CAUSE` established for the same shape earlier today.

### Why these arms do not go stale when MIG-22 lands

Nothing here depends on the ambient database lacking anything. Each arm arranges the absence itself, at the
one moment it is about, and keeps discriminating afterwards — and will catch the next absent table by the
same route.

## 5. Mutation matrix — the two sites are independently load-bearing

| mutant | 1 consent 208 | 2 consent genuine | 3 consent race | 4 dispatch 208 | 5 dispatch genuine | 6 dispatch race |
| --- | --- | --- | --- | --- | --- | --- |
| **M1** — consent widened back to `catch (DbUpdateException)` | **RED** | **RED** | green | green | green | green |
| **M2** — dispatch widened back to `catch (DbUpdateException)` | green | green | green | **RED** | **RED** | green |
| none (as committed) | green | green | green | green | green | green |

The reds are **DISJOINT**: neither site rides the other's coverage. The three inverse arms (3 and 6, and
every arm of the other service) never red under either mutant, which is what makes them guards rather than
second copies.

**The reds print the operator's wrong answer verbatim.** From `mutation-M1-consent-untyped.txt`:

```
a missing-object failure was answered as growth.consent_text_version_race; the operator would
re-read a register nobody changed and retry a publish that can never succeed
an absent audit ledger was answered as a concurrent-publish race; ...
```

From `mutation-M2-dispatch-untyped.txt`:

```
Assert.Throws() Failure
Expected: typeof(Microsoft.EntityFrameworkCore.DbUpdateException)
Actual:   typeof(System.InvalidOperationException): Sequence contains no elements.
   at GrowthDispatchService.CreateOrGetRunAsync(...) GrowthDispatchService.cs:line 326
```

The schema is identical across mutant and restored runs; only the handler differs. The red is the reporting.

### Stale-build discipline (the trap named in the repo's `CLAUDE.md`)

Each mutant was written with an editor write, built with an explicit `dotnet build` reporting `0 Error(s)`,
and the assembly mtime read before each `--no-build` run: `22:14:09` (clean) → `22:18:59` (M1) → `22:19:51`
(M2) → `22:20:47` (restored). Restores were editor writes, and both restored files' md5 were re-checked equal
to the pre-mutation snapshot: `b2571949231433cc9eec40394994c9f4` (consent),
`2b8fc295d99ef7df519781380ca5cb1b` (dispatch).

## 6. Suites, measured here

| run | result | file |
| --- | --- | --- |
| the six arms, lane tree | **6 passed / 0 failed** | `arms-green.txt` |
| M1 mutant, the six arms | 2 failed / 4 passed | `mutation-M1-consent-untyped.txt` |
| M2 mutant, the six arms | 2 failed / 4 passed | `mutation-M2-dispatch-untyped.txt` |
| lane tree, whole fast tier `--filter Database!=SqlServer` | **4742 passed / 0 failed / 10 skipped / 4752**, 9 m 54 s | measured in this worktree |

Against the recorded trunk baseline of **4736 / 0 / 10**: delta **+6**, accounted test by test — the six arms
above, all in the one new file. No existing test changed and no existing test file was edited.

The baseline figure is the one the brief records for `118f92fb9`; it was not re-measured here, because a
second ten-minute clean-tree run buys only a number this lane's additive diff cannot have moved. The delta
being exactly the new arm count is the check.

**No SQL-tier run.** `--filter Database!=SqlServer` only. `okam-lwtwo-sql` and `okam-lwtwo-redis` untouched,
nothing `pkill`ed, no port bound.

**C7.** The three captured outputs were scanned for credential-bearing strings; the only matches are the word
`CancellationToken` inside EF stack frames. Nothing added to an operator-facing message or a log carries a
credential, key, connection string or token — the two new message paths carry only the provider's own
exception, and the two comments name error NUMBERS.

**One suite side effect, not this lane's.** Running the tier rewrites
`artifacts/journeys/ev-dietary/run-sheet.{json,md}` (`EventsDietaryRunSheetWireTests` regenerates them with
today's date). Pre-existing behaviour, unrelated; both were restored so the lane diff is exactly the three
files below.

## 7. Collision — this is a landing of work that already existed twice, not a third copy

| branch | commit | state |
| --- | --- | --- |
| `lane/growth-sql-catch-typed` | `c7912d49` | `L-GROWTH-SQL-CATCH-TYPED`, `built-unverified`, parent `8e2b57de`, **unpushed, merged into nothing** |
| `lane/newsletter-dispatch-reports-its-cause` | `33a99ac4` | `L-NEWSLETTER-DISPATCH-REPORTS-ITS-CAUSE`, `built`, parent `8e2b57de`, **unpushed, merged into nothing** |

Both were verified here as absent from `118f92fb9`. This lane **rebases `c7912d49`'s two production hunks and
its suite onto the current trunk** and folds in the one thing the sibling lane added that `c7912d49` lacked —
a provider-genuine dispatch absent-ledger arm — while dropping the sibling's duplicate race arm (its own
return says `c7912d49`'s interceptor placement is the better seam) and, with it, the additive
`TimeProvider` parameter on `GrowthDispatchTestSupport`. **No existing test file is touched by this lane.**

Land ONE of the three. This branch is the one that applies to the current trunk.

## 8. What this does NOT do

- It does not make dispatch **work** on a chain-built database. `GrowthAuditEvents` is declared in
  `OnModelCreating` and created by no migration (`MIG-22`, `L-GROWTHAUDIT-TABLE-ABSENT`), and this lane holds
  no migration-author slot. The SQL-tier dispatch failures stay red until that table exists — what changes is
  that they now name the absent ledger instead of an empty sequence or a race.
- It does not close `F-GROWTH-PUBLISH-LIES-ABOUT-WHY-IT-FAILED` by a person's acceptance. C5 is in force: the
  evidence here is a suite, which is evidence that code behaves and never evidence that a capability exists.
  Nothing is claimed verified or accepted.
- Constraints not engaged: C2 (no migration, no `OnModelCreating` change), C3 (no new capability, service,
  route, page or flag — a report change on already-wired services), C4 (no money-path write), C6 (no
  statutory claim printed).

## 9. Files

```
Services/Growth/GrowthConsentTextService.cs                   (1 hunk: the catch filter + its comment)
Services/Growth/GrowthDispatchService.cs                      (1 hunk: the catch filter + its comment)
WebApi.Tests/Growth/GrowthDbFailureClassificationTests.cs     (new, 6 arms + the shared injection seams)
```

Committed by pathspec (never `git add -A`) as `d74c2c87b` on
`lane/growth-tells-the-operator-what-actually-failed`, parent `118f92fb9`. **NOT pushed.**
