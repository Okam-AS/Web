# L-GROWTH-SQL-CATCH-TYPED — two catch blocks that misreported failures they had never seen

**COMMITTED — the work is on a ref, not only in a directory.**
`lane/growth-sql-catch-typed` = **`c7912d49`**, parent `8e2b57de`, three files, nothing else:
`Services/Growth/GrowthConsentTextService.cs`, `Services/Growth/GrowthDispatchService.cs`,
`WebApi.Tests/Growth/GrowthDbFailureClassificationTests.cs` (+465/−2). Staged by explicit pathspec, never a
wildcard `git add`. Not pushed (no upstream configured); `feature/restaurant-modules` still `8e2b57de`.

**Baseline.** Own worktree `/Users/svendaneel/okam/wt-grsqlcatch`, branch `lane/growth-sql-catch-typed`, cut
from `refs/heads/feature/restaurant-modules` = **`8e2b57de`**. The repository checkout at
`/Users/svendaneel/okam/OkamAPI-modules` (`lane/meals-grace-pins` @ `34c6c103`, 63 commits behind) was never
read. No container started, no SQL slot taken, no migration written, no model touched, nothing pushed.

---

## 1. The premise, re-measured before anything was changed

Both catches are exactly as briefed, at the tip, and neither had been fixed by another lane.

| site | at `8e2b57de` | what it did with *any* `DbUpdateException` |
| --- | --- | --- |
| `Services/Growth/GrowthConsentTextService.cs:247` | `catch (DbUpdateException)` — untyped | 409 `growth.consent_text_version_race`: "Another version of this locale was published concurrently. Re-read the register and retry." |
| `Services/Growth/GrowthDispatchService.cs:311` | `catch (DbUpdateException)` — untyped | assumed a winner exists, `FirstAsync` on the rolled-back run ⇒ secondary `InvalidOperationException` |

Neither read a SQL error number. `Services/Growth/` contained **zero** references to `DbExceptionHelper`,
`IsUniqueViolation` or `SqlException` — Growth was the only module of the five with no violation classifier at
all (Workforce, Meals, Events and the shared `Helpers/DbExceptionHelper` all have one).

**One correction to the brief's wording, substance unaffected:** the handlers catch `DbUpdateException`, not
`SqlException`. The `SqlException` is its inner. The defect, the fix and the exit criterion are unchanged —
the classifier still discriminates on the SQL error number, it just reaches it through the wrapper.

**The missing table re-verified independently at this baseline**, because the whole defect was found through
it (`lanes/L-GROWTHAUDIT-TABLE-ABSENT/finding.md`, MIG-22):

```
files under Migrations/ naming GrowthAuditEvent          : 0
control — MealsAuditEvents                               : 13
control — GrowthConsentTextVersions                      : 14
```

---

## 2. The change — 2 lines of behaviour, in 2 files, reusing the estate's one detector

```csharp
- catch (DbUpdateException)
+ catch (DbUpdateException ex) when (DbExceptionHelper.IsUniqueViolation(ex))
```

`Helpers/DbExceptionHelper.IsUniqueViolation` walks the inner-exception chain and matches **SQL Server 2627 /
2601 by NUMBER** (never by message text, which is localised on non-English servers) and SQLite's
`UNIQUE constraint failed`. It is the detector `EventsUniqueViolation` already delegates to "so there is one
detector, not a duplicate", and the one `TrainingIdempotency`, `TableService`, `SurfboardController` and
`McpShoppingService` use. **No new `GrowthDbViolations` type was created** — a fourth copy of a predicate the
tree already has would have been the duplication the quality law blocks.

Anything else — 208 invalid object, 1205 deadlock, a lock timeout, a permission error, a NOT NULL or CHECK
failure — now leaves the handler with its own diagnosis intact. Both files already imported `WebApi.Helpers`;
no using was added.

### No dead branch was shipped

The narrowing is a single predicate, so there is no sub-branch to delete. The two SITES, however, are
independent, and §4 shows each is separately load-bearing: reverting either one reds arms that reverting the
other leaves green. Nothing in this change is passing behind someone else's green.

---

## 3. The proof — `WebApi.Tests/Growth/GrowthDbFailureClassificationTests.cs`

A typed handler and an untyped one are **indistinguishable** on the failure the untyped one assumed. They
diverge only on a failure it cannot explain. So each service gets a matched pair driven through the same
production call, and the consent pair gets a third, fully provider-genuine arm.

| # | arm | provocation | pinned |
| --- | --- | --- | --- |
| 1 | consent · **missing object** | real `SqlException` **208** `Invalid object name 'dbo.GrowthAuditEvents'` raised at the audit INSERT inside the real `PublishAsync` `SaveChanges` | escapes as `DbUpdateException`; chain carries `Number == 208` naming `GrowthAuditEvents`; **is not** `growth.consent_text_version_race` |
| 2 | consent · **absent table, no fabrication at all** | `DROP TABLE "GrowthAuditEvents"` — the chain-built world — then the real `PublishAsync` | SQLite's own "no such table: GrowthAuditEvents" escapes; **is not** the publish race; message does **not** contain `UNIQUE constraint failed` |
| 3 | consent · **inverse** | competing `(zz-SYNTH, 1)` row committed on the real schema; the service's own INSERT trips the real unique index | still **409 `growth.consent_text_version_race`** |
| 4 | dispatch · **missing object** | same real `SqlException` 208 at the audit INSERT inside `CreateOrGetRunAsync`'s transaction | escapes as `DbUpdateException` naming `GrowthAuditEvents`; message does **not** contain "Sequence contains no elements" |
| 5 | dispatch · **inverse** | a competing run committed on the segment-members read — *after* the idempotency pre-check answered "no run", *before* the service opens its transaction, so the winner survives the loser's rollback; the real unique index on `NewsletterVersionId` refuses the loser | returns the **winner's run id**, exactly one run row for the version |

Arms 1/2/4 assert on the error **code**, not the status: a publish race and a stale-version conflict are both
409, so the status alone cannot tell a renamed fault from a real one. Every arm asserts `HasFired` on its
injector, so a provocation that silently stopped firing reds instead of passing vacuously.

### Provocation honesty — three provocations, none of them a stubbed service

- **Arms 3 and 5 are raised by the database.** A competing row is committed against the real
  `EnsureCreated` schema and the service's own INSERT trips the real unique index. Nothing about those
  exceptions is constructed.
- **Arms 1 and 4 present a constructed exception, and that is stated rather than hidden.** 208 is a SQL
  *Server* number; production is chain-built SQL Server; **this lane was granted no SQL container slot**
  (`sql 0/2`). So the number — the only thing the classifier reads on that provider — is supplied through
  `Microsoft.Data.SqlClient`'s own internal factory: a genuine `SqlError` in a genuine `SqlErrorCollection`
  inside a genuine `SqlException`, walked by the classifier exactly as a server-raised one would be. The
  *classifier* is not faked; only the transport that would have delivered the number. The construction is
  version-coupled to the pinned `Microsoft.Data.SqlClient 5.1.7` and fails loudly with
  `MissingMemberException` at the seam if that ever changes, rather than skipping an assertion.
- **Arm 2 exists precisely because arms 1 and 4 are constructed.** It reproduces the chain-built world with
  no fabrication whatsoever. If the constructed exception were doing the work, arm 2 would not pass.

Both injectors act on the service's **own** connection and ambient transaction, so the two arms of a pair
differ in the failure and in nothing else. Reads are skipped for the failure injector: a query-time throw
would never reach the service's `DbUpdateException` catch and would prove nothing about it.

---

## 4. The mutation matrix — the fix is exactly as large as it needs to be

Run: `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "FullyQualifiedName~DbFailureClassification"`.
Each mutation was written with a fresh mtime (`perl -pi` / `cp` + `touch`) and `dotnet test` rebuilt each
time, so no result measures a stale assembly (`CLAUDE.md`'s `--no-build` trap).

| | consent filter | dispatch filter | 1 | 2 | 3 | 4 | 5 | result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **M3** fix | typed | typed | ✅ | ✅ | ✅ | ✅ | ✅ | **5/5** |
| **M1** | **untyped** | typed | ❌ | ❌ | ✅ | ✅ | ✅ | 3/5 |
| **M2** | typed | **untyped** | ✅ | ✅ | ✅ | ❌ | ✅ | 4/5 |

**M1** — the consent half alone, and the failure message is the defect stated in the operator's own words:

```
a missing-object failure was answered as growth.consent_text_version_race; the operator would
re-read a register nobody changed and retry a publish that can never succeed
```

Both consent missing-object arms red; the dispatch arms stay green. The consent narrowing is load-bearing.

**M2** — the dispatch half alone, and the failure is exactly the masking secondary:

```
Assert.DoesNotContain() Failure
Found:    Sequence contains no elements
In value: Sequence contains no elements.
```

Only arm 4 reds. The dispatch narrowing is load-bearing, and independently of the consent one.

M1 ∧ M2 red **disjoint** arms, which is stronger than an M0 with both reverted: it shows neither site is
riding the other's coverage.

**The inverse arms never red under any mutation.** That is the point of them — they are the guard against
replacing a wrong answer with a missing one, and they hold in all three configurations.

---

## 5. Regression

- Growth, container-free: **494 passed / 0 failed / 1 skipped**
  (`--filter "FullyQualifiedName~WebApi.Tests.Growth&Database!=SqlServer"`).
- Whole container-free tier: see `full-suite.txt` in this directory.
- `Database=SqlServer` **not run** — no slot granted, and none taken.

---

## 6. What this lane did NOT do, deliberately

- **No migration, no model change.** C2 holds the chain to one author; MIG-22 owns `GrowthAuditEvents`. The
  two catches were wrong before that table went missing and stay wrong after it lands, because a deadlock and
  a lock timeout are not the missing table. That is the whole reason this is a separate lane.
- **No new classifier type.** The estate already has one.
- **No narrowing by table or index name.** `IsUniqueViolationOn`-style narrowing was considered and dropped:
  no test in this lane reds without it, and the brief's own discipline is that a branch which reds nothing is
  dead. Recorded here as a deliberate omission, not an oversight.

---

## 7. A consequence worth the owner's attention (NOT this lane's to fix)

`GrowthSqlServerFixture` builds its catalog with `MigrateAsync`, never `EnsureCreated` — deliberately, because
the Growth consent triggers are SQL-Server-only DDL. Since `GrowthAuditEvents` is in **no** migration, the
**Growth SQL Server tier does not have that table either.** Every `[Trait("Database","SqlServer")]` Growth
test whose path appends an audit row is therefore red-by-construction today, and nobody has seen it because
Docker has been down and no SQL tier has run against these commits.

This change does not fix that — MIG-22 does. What it changes is what the operator (and that suite) will read
when it happens: `Invalid object name 'dbo.GrowthAuditEvents'` instead of `Sequence contains no elements` or a
409 telling them to retry a race that never occurred.

---

## 8. Constraints

- **C1** — honoured. No `UPDATE` or `DELETE` against any append-only table; no backfill, repair or purge. Arm
  2's `DROP TABLE` is fixture **schema DDL** constructing the chain-built world, not a mutation of ledger
  rows, and it runs only against an in-memory SQLite database the test itself created.
- **C2** — honoured. No migration, no `OnModelCreating` change, no index or constraint added anywhere.
- **C3** — not engaged: no new service, route, page or flag. Both changed paths were already reachable
  (DI-registered services behind live controllers), which is why the defect bites rather than sleeps.
- **C4** — not engaged; no money-path write is touched. The dispatch audit row that names the actor is
  unchanged, and arm 5 shows the re-request still records it.
- **C5** — observed. Nothing here is claimed as accepted or verified. This is a defect fix with a mutation
  proof; a person completing the journey is a separate gate, and §7 names what still blocks it.
- **C6** — not engaged; no statutory claim, string, export or § reference added.
- **C7** — honoured. No logging or telemetry call added anywhere. The propagating exception carries a SQL
  object name, never a credential. `WebApi.Services.Growth` still holds no `ILogger` (GRW-PII-001).

---

## 9. Files

| file | change |
| --- | --- |
| `Services/Growth/GrowthConsentTextService.cs` | catch narrowed at `:247` + the reasoning comment |
| `Services/Growth/GrowthDispatchService.cs` | catch narrowed at `:311` + the reasoning comment |
| `WebApi.Tests/Growth/GrowthDbFailureClassificationTests.cs` | **new** — 5 arms, 2 shared injectors, the `SqlError` seam |
