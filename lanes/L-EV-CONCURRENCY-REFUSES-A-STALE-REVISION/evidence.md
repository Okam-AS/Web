# L-EV-CONCURRENCY-REFUSES-A-STALE-REVISION — evidence

Backend worktree `/Users/svendaneel/okam/wt-evstalerev`, branch `lane/ev-concurrency-stale-revision`,
forked from the integration tip **`feature/restaurant-modules` @ `8e2b57de`** (read with
`git show "${TIP}:path"`, braced). Local only, never pushed. No migration authored, no production touched.
`/Users/svendaneel/okam/OkamAPI-modules` (the shared checkout, on `lane/meals-grace-pins`) was never
written to.

## The defect, stated exactly

`EventsSettlementConcurrency.GuardIfMatch` takes a lenient branch when the server row carries no revision.
SQLite generates no rowversion, so under the container-free tier `EventsSettlement.RowVersion` is always
null, the guard **raises no refusal at all**, and
`EventsSettlementRevisionGuardTests.With_no_server_revision_an_absent_precondition_is_allowed` pins that
null explicitly. That tier is the only one that had run. Every other proof of the contract is either
synthetic (a hand-built 8-byte array handed straight to `GuardIfMatch`, no database, no second writer, no
lost-update assertion) or lives on the lenient provider. So the control that stops two operators
overwriting each other on a settlement — a money document — had never been exercised where it can fire.

## What landed

`WebApi.Tests/Events/EventsSettlementStaleRevisionSqlServerTests.cs` — 6 arms,
`[Collection(EventsSqlServerCollection.Name)]` + `[Trait("Database","SqlServer")]`, on the existing
Testcontainers fixture (migrated chain, never `EnsureCreated`). Every arm uses a **real second operator**
(`events-operator-b`) that reads the current revision and really commits through the production
`EventsSettlementService`, and asserts the **lost update** — what the statement holds afterwards — not only
the status code. No new production code; C3 is not engaged. Actors are two distinct named operators, never
a system or null actor (C4).

| arm | what it states |
| --- | --- |
| `A_stale_revision_is_refused_after_a_second_operator_has_written` | A reads, B credits −250,00 and commits, A posts a 900,00 surcharge on the revision it read → `EVENTS_CONFLICT`/409/retryable, and the statement still holds B's credit and none of A's kroner (total 2 050,00, not 2 950,00) |
| `A_stale_revision_is_refused_by_reconcile` | same race on the mutation that decides closability → 409, settlement still `Draft`, `ReconciledAtUtc` still null |
| `A_zero_delta_line_with_a_stale_revision_is_refused_before_it_is_staged` | a **zero-amount** adjustment leaves `StatementTotalMinor` unchanged, EF marks no settlement column modified and emits **no UPDATE**, so the rowversion never reaches a WHERE clause — the pre-check is the only defence on this path |
| `A_bump_after_the_precheck_still_loses_at_the_update` | A's session already holds the row it read, so the pre-check is satisfied and the compare-and-swap at commit refuses — mapped to the typed 409, not a raw `DbUpdateConcurrencyException` (a 500) |
| `The_current_revision_is_accepted_and_returns_a_new_one` | the control: a guard that refused everything would satisfy all of the above. Fresh revision → line lands, and the response carries a **different** token |
| `An_absent_precondition_is_refused_where_the_row_has_a_revision` | the seeded row really does carry a revision on this provider (the fast tier's blind spot) → `EVENTS_REVISION_REQUIRED`/400, not the unfollowable retryable 409 |

## Runs (all `--filter "FullyQualifiedName~EventsSettlementStaleRevisionSqlServerTests"`)

| state | result | trx |
| --- | --- | --- |
| as written | **6 passed / 0 failed** | `.lane/baseline-green.trx` |
| after restore | **6 passed / 0 failed** | `.lane/restored-green.trx` |

Container-free tier at the branch (`--filter "Database!=SqlServer"`, the trait form, never a namespace
filter): **4638 passed / 0 failed / 12 skipped, total 4650** — byte-identical to the count
`L-VIOLATION-EXACT-LAND` recorded at `ef2bd5c8`, which `8e2b57de` (a docs-only commit) does not move. The
delta is 0 by design: the new file carries `Database=SqlServer` and the fast tier does not see it.
Summary in `containerfree-tier.txt`; full log at `/Users/svendaneel/okam/wt-evstalerev/.lane/containerfree-tier.txt`.

Committed as **`93d2b422`** on `lane/ev-concurrency-stale-revision`, by explicit pathspec — one file. Two
`artifacts/journeys/ev-dietary/*` files that a suite run rewrote were left out of the commit and reverted,
so the worktree carries nothing but the new test.

## The mutation ladder — the red comes from deleting the if-match

Each mutant: edit the source, `touch` it, **full `dotnet build`** (never a bare `--no-build` over a restored
file), assembly mtime checked against source mtime before the run. Note the mutated file lives in the
**`WebApi`** project, so the artefact to check is `WebApi.Tests/bin/Debug/net8.0/WebApi.dll`, not
`WebApi.Tests.dll` — the latter is legitimately older and would read as a stale build if you checked it.

| mutant | what it deletes | result | trx |
| --- | --- | --- | --- |
| **M0** | `GuardIfMatch` → `return null;` — the whole if-match gone, i.e. the SQLite-lenient branch on every provider | **4 failed / 2 passed** | `.lane/M0.trx` |
| **M3** | only the stale-token compare (`hasServerRevision && !RevisionEquals` → `Conflict`) | **1 failed / 5 passed** | `.lane/M3.trx` |
| **M2** | all three refusals, keeping the decode and the UPDATE-time re-arm | **2 failed / 4 passed** | `.lane/M2.trx` |
| **M1** | `ApplyConcurrencyToken`'s body (the TOCTOU re-arm) | **0 failed / 6 passed** | `.lane/M1.trx` |

M0 is the mutant the exit criterion names, and it reds the three stale-revision arms plus the
absent-precondition arm.

### Two results that had to be interrogated rather than credited

**`A_bump_after_the_precheck_still_loses_at_the_update` passes under M0.** It is not killed by
`GuardIfMatch` at all: A's context holds the settlement with original `RowVersion` = R1, so EF's own
rowversion concurrency check emits `WHERE RowVersion = R1`, matches nothing, and
`SaveWithConcurrencyAsync` maps it to the typed 409. The arm is therefore evidence for the **second**
layer (EF's token + the typed mapping), not for the if-match, and it is not counted toward the exit
criterion.

**M1 survives, and it is an equivalent mutant — not a coverage gap.** `ApplyConcurrencyToken` writes
`Entry(settlement).Property(RowVersion).OriginalValue = submitted`. EF already tracks an original value
for `RowVersion` taken from the SELECT that `LoadMutableSettlementAsync` performed, and `GuardIfMatch`
compares `submitted` against `settlement.RowVersion`, which for an entity nothing has assigned to **is
that same original value**. So on every path where the pre-check passes, `submitted == OriginalValue`
already and the assignment writes the value that is there. On SQL Server an existing settlement row always
has a revision, so the pre-check's pass condition is exactly `submitted == current`; the only way to break
the identity would be code that assigns to `settlement.RowVersion` in memory, and none exists. The method
is a **no-op on every reachable path**, which its own XML comment does not say — it claims it is what makes
"a concurrent bump between the pre-check and commit still conflict at the UPDATE", when EF's tracked
original value already does that (M1's 6/6 green, including the bump arm, is the empirical half of the
argument). Recorded as a finding about the comment, not as a missing test.

## Container discipline

`docker ps` before the first run: **none running** (`.lane/containers-before.txt`). The only containers
started were the ones Testcontainers created for the Events fixture (`mcr.microsoft.com/mssql/server:
2022-CU14-ubuntu-22.04`) plus its Ryuk reaper; Testcontainers deleted the SQL container at the end of each
run (`Delete Docker container …` in the run output) and Ryuk self-reaps. **No pre-existing container was
inspected, stopped or removed**, and the filter used was a trait filter, never a namespace filter.

At the end of the lane a `postgres:15` container (`pedantic_germain`, `19ad87b9e92e`) was running that was
**not** there at the start and is **not** mine — somebody else started it while this lane ran. It was left
untouched.
