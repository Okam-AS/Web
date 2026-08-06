# L-TRAIN-IDEMPOTENCY-REFUSAL — mutation record

## Instrument

- **Base chosen:** `feature/restaurant-modules` @ **`8e2b57de`** — verified, not assumed: this IS the backend
  integration tip and it IS the commit the brief named. `integration/mig-stack-land` is **diverged, not
  ahead** (`git rev-list --left-right --count` = **59 tip-only / 34 mig-only**), and
  `git diff feature/restaurant-modules...integration/mig-stack-land -- Services/Training/` is **empty** —
  zero Training drift, so the defect surface is identical and the tip is the correct base.
- **No discriminator existed at the base**, so this is not `fail-spec`: `grep -rn "RefuseAsync\|Refused"
  Services/Training/` at `8e2b57de` returns only prose in doc comments — no refusal state, no refusal
  disposition, no recording call.
- **Worktree:** `/Users/svendaneel/okam/OkamAPI-trainidemref`, branch `lane/train-idempotency-refusal`.
  Not pushed. No shared ref moved. `OkamAPI-modules` (the lane branch with a live WebApi process) untouched.
- **Tier:** container-free only — `dotnet test WebApi.Tests/WebApi.Tests.csproj --filter "Database!=SqlServer"`.
  **No container started.** `FullyQualifiedName!~SqlServer` was never used.
- **No `--no-build` anywhere.** Every mutation arm restores by writing the file (mtime moves), so MSBuild
  cannot call the assembly up to date and measure the previous binary.

## Suite numbers

| run | passed | failed | skipped | total | artifact |
|---|---|---|---|---|---|
| baseline, clean `8e2b57de` in its own worktree | 4638 | 0 | 12 | 4650 | `baseline-run.txt` |
| lane `01cd5eee` | 4663 | 0 | 12 | 4675 | `full-run-final.txt` |

Delta **+25**, exactly the tests added — `TrainingIdempotencyRefusalTests` contains 25 `[Fact]`s and no
other file gained one. **Skipped is 12 in both runs**, i.e. the SQL-Server tier was filtered out identically
and no container was started.

**No non-reproducing failure to name.** The baseline was clean on its only run; the lane was clean on its
only full run after the four self-inflicted failures below were fixed.

**One harness fault, diagnosed before anything it proves was touched.** The first baseline attempt exited 1
with no test output: the lane directory did not exist yet, so the redirect had nowhere to write. Creating it
and re-running produced the clean baseline. A second, later stall was a shell bug of mine, not a product
one: a waiter whose `until ! pgrep -f mutation-proof.py` condition **matched its own command line**, so it
spun forever and never started the suite it was gating. Killed and the suite run directly.

## The defect, confirmed at the base

`TrainingIdempotency.ReserveAsync` commits the reservation at `:98-101`, **before** `stageAsync` runs, and
`ExpiresAtUtc` is stamped advisory-only with no purge job reading it. The pre-reserve checks cover only
shape and authorization, so **every existence and state refusal sat behind a committed reservation that
nothing ever completed** — the key was stranded *permanently*, not eventually, and every retry answered
`training.idempotency-in-progress` forever.

**16 backstops, counted rather than estimated** (13 direct `throw` sites inside the `RunAsync` staging
callbacks, 1 shared lookup 404 that is not written at the call site, 2 commit-time `onConcurrency` arms):

| # | scope | site | refusal |
|---|---|---|---|
| 1 | `training.course-version.create` | `TrainingCourseService:210` | NotFound |
| 2 | `training.course-version.edit` | `TrainingCourseService:281` | CourseVersionImmutable |
| 3 | `training.course-version.publish` | `TrainingCourseService:330` | CourseVersionImmutable |
| 4 | `training.course-version.retire` | `TrainingCourseService:379` | CourseVersionImmutable |
| 5 | edit / publish / retire | `TrainingCourseService:417` (`FindVersionTrackedAsync`) | NotFound |
| 6 | `training.assignment.create` | `TrainingAssignmentService:106` | NotFound |
| 7 | `training.assignment.create` | `TrainingAssignmentService:111` | Validation |
| 8 | `training.assignment.revoke` | `TrainingAssignmentService:179` | NotFound |
| 9 | `training.assignment.revoke` | `TrainingAssignmentService:194` | Validation |
| 10 | `training.certificate.update` | `TrainingCertificateService:255` | NotFound |
| 11 | `training.certificate.update` | `TrainingCertificateService:274` | StaleVersion (via `StaleCertificateVersion`) |
| 12 | `training.certificate.update` | `TrainingCertificateService:299` | Validation |
| 13 | `training.completion.record` | `TrainingCompletionService:118` | NotFound |
| 14 | `training.completion.record` | `TrainingCompletionService:123` | Validation |
| 15 | `training.assignment.revoke` | `TrainingAssignmentService:220` | StaleVersion — **commit-time arm** |
| 16 | `training.certificate.update` | `TrainingCertificateService:333` | StaleVersion — **commit-time arm** |

Site 5 and site 11 are **not findable by grepping `throw TrainingProblemException`** — one is inside a
shared helper, the other builds the exception through `StaleCertificateVersion(...)`. Both are covered.

## What the fix is

`RefuseAsync(scope, key, storeId, TrainingProblemException, ct)` completes the **reserved row itself** with
the refusal: `Status = Refused`, `ResponseSnapshotJson` = the serialized problem, `ResponseStatusCode` =
the refusal's status. `Resolve` gains a `Refused` branch returning a `Refused` disposition, and
`TrainingMutation.RunAsync` rethrows the rehydrated problem on a same-key retry.

Three lessons the siblings paid for, applied and each independently pinned:

1. **Keyed by `(storeId, scope, key)`, never by a reservation object.** Clearing the tracker detaches the
   reserved row, and the two commit-time backstops decide in the calling service, past where the
   reservation is in scope at all.
2. **`ChangeTracker.Clear()` before the refusal's own save.** Without it the save commits the very mutation
   the refusal rejected — and this is not hypothetical in Training: the certificate correction assigns
   `Issuer` and only *afterwards* refuses the impossible expiry, and the revoke arm has already staged its
   DELETE when the commit loses. Pinned by
   `Recording_a_refusal_never_commits_what_the_refused_command_had_already_staged` plus the residue asserts
   inside both commit-time tests.
3. **The in-flight guard is intact.** Only a *recorded* outcome moves the in-progress answer; `RefuseAsync`
   returns without writing unless the row is still `InProgress`, and no fresh-key hint was added, because
   for a genuinely in-flight duplicate a fresh key is what runs the write twice. Pinned by
   `An_in_flight_duplicate_is_still_in_progress_and_only_a_recorded_refusal_moves_that_answer` and
   `An_in_flight_duplicate_never_runs_the_staging_callback`.

**Structural note, stated rather than hidden:** unlike Meals (which needed a call at each of eight
backstops), all 16 Training backstops funnel through the single `TrainingMutation.RunAsync` composition, so
the recording lives in **two** places, not sixteen. That is why one mutant reds a whole family: M01 reds all
14 staging backstops and M02 reds both commit-time arms. Each family still has its **own** discriminating
mutant, and each of the 16 backstops has its own test.

## Mutants: 6 removals, 6 reds, 0 survivors (round 2)

Script `mutation-proof.py`, transcript `mutation-proof.txt`. One mutant at a time; restore is a plain file
write from an in-memory copy, so the mtime moves and the next `dotnet test` genuinely recompiles. Every arm
was run twice: **round 1 left M04 alive** (see below), round 2 is the record after the gap was closed.

| id | recording removed | mutant | restored | tests it reds |
|---|---|---|---|---|
| M01 | the stage-refusal recording in `RunAsync` | RED | GREEN | 15 — every staging backstop |
| M02 | the commit-time (`onConcurrency`) recording | RED | GREEN | 2 — both commit-time arms |
| M03 | the `Refused` branch in `Resolve` (the replay read) | RED | GREEN | 19 |
| M04 | the `Refused` arm in `RunAsync` (the rethrow) | RED | GREEN | 1 — the re-execution test |
| M05 | `ChangeTracker.Clear()` before the refusal's save | RED | GREEN | 3 |
| M06 | the already-recorded-outcome guard | RED | GREEN | 1 |

**The instrument prints the defect itself.** Verbatim from M01/M02/M03:

```
Expected: training.not-found              / Actual: training.idempotency-in-progress
Expected: training.course-version-immutable / Actual: training.idempotency-in-progress
Expected: training.stale-version          / Actual: training.idempotency-in-progress
```

M01 and M02 partition the 16 backstops between them (15 staging — the 14 sites plus the world-changed
re-execution test — and 2 commit-time), so each family has its own discriminating mutant rather than one
mutant standing for everything.

## The survivor, and what it exposed

**Round 1 of the matrix left M04 GREEN — a genuine survivor, reported rather than hidden.** M04 removes the
`Refused` arm from `TrainingMutation.RunAsync`, i.e. the code that reads the recorded refusal back and
rethrows it.

The reason nothing caught it is worth stating, because it is a trap any lane doing this work will hit:
**without that arm a `Refused` reservation falls through and the staging callback simply runs a second
time.** While the world is unchanged the callback refuses again with the identical code, so all 22
same-world assertions still passed. The suite was measuring the refusal's *code*, and the code was right for
the wrong reason.

The behaviour is not equivalent, and the difference is severe: the retry is a **re-execution**, not a replay.
The moment the refusal's own precondition is repaired between the two calls, the retry stops refusing and
**executes the write under a key whose recorded outcome was a refusal** — precisely the exactly-once
violation the receipt exists to prevent.

Closed by `A_recorded_refusal_still_replays_after_the_world_changed_into_one_that_would_succeed`: an
assignment is refused against the DRAFT version, the version is then published (so the same payload under a
fresh key would now be accepted), and the same-key retry must still replay the refusal **and write no row**.
Round 2 reran all six mutants against the strengthened suite: **M04 now reds, on exactly that one test, and
the matrix has zero survivors.**

The general lesson, which the Meals and Workforce records do not carry: **asserting that the retry returns
the same error code is not sufficient to prove a replay.** A re-execution that happens to refuse again is
indistinguishable from a replay unless the test changes the world between the two calls, or counts rows.

## NO MIGRATION OWED — verified in the DDL, the model and the converter, not assumed

- `Migrations/20260727221455_RestaurantModules_Initial.cs` creates `TrainingIdempotencyRecords` with
  `Status = nvarchar(32) NOT NULL`, `ResponseSnapshotJson nvarchar(max) NULL`, `ResponseStatusCode int NULL`.
- **No CHECK constraint** on any of them in the migration, and `OnModelCreating` (`ApplicationDbContext:4123-4136`)
  adds none — it configures `HasConversion(new EnumToStringConverter<TrainingIdempotencyRecordStatus>()).HasMaxLength(32)`.
- `"Refused"` is 7 characters. It is therefore a **value in a column that already exists**, exactly the shape
  the Workforce lane found in its `nvarchar(32) OutcomeState`. No DDL changes, so no snapshot changes and C2
  is not engaged.
- **C1 is not engaged either:** `TrainingIdempotencyRecords` carries a rowversion and deliberately no
  append-only trigger (the reserve→complete transition is already an UPDATE), and the entity appears in **no**
  `GuardAppendOnly` registration — the guard block in `ApplicationDbContext` names zero `Training*` types.

## Disclosure: both Fable conditions verified to hold in Training, not assumed

The Fable review of the Workforce lane ruled its replay is not a disclosure path because payload-hash
equality is checked *before* the completion row is read and every scope embeds the store. **Both were
re-checked in Training rather than carried over:**

1. **Hash equality is checked first.** `Resolve` throws `IdempotencyPayloadMismatch` at the hash comparison
   (`TrainingIdempotency.cs:155-159`), **above** both the `Completed` and the new `Refused` branch. Pinned by
   `A_mismatched_payload_is_a_conflict_before_a_recorded_refusal_is_ever_read`.
2. **Tenant-bounded — but NOT by the scope string.** `TrainingIdempotencyScope.For` emits only
   `training.<family>`; the store dimension is a separate **key column**. That is sound because `StoreId` is
   an explicit column of the unique index `(StoreId, Scope, IdempotencyKey)` and of the predicate every
   `FindAsync` / `RefuseAsync` / replay lookup uses. Pinned by
   `A_recorded_refusal_never_crosses_the_store_that_reserved_the_key`.

So the replay is **not** an oracle here — but the reason is the key column, not the scope, and a future scope
builder that dropped the `storeId` argument from the lookup would break it silently.

## C4 — actor attribution

Training is not a money path, but the structural equivalent holds and is pinned: the refusal **completes the
reserved row in place**, so the store, scope, idempotency key, canonical request hash and the reserving
`ActorReference` are all the reservation's own committed values — nothing is rebuilt from a prefix plus an
id. Pinned field-by-field by
`A_refusal_completes_the_reservation_row_itself_and_rebuilds_none_of_its_identity`.

## Two real failures I caused and fixed (neither pre-existing)

Four tests initially failed with `Expected: training.not-found / Actual: training.idempotency-payload-mismatch`.
**The product was right and the tests were wrong:** they called `Guid.NewGuid()` *inside* the retried lambda,
so the retry sent a genuinely different canonical payload and correctly got a mismatch. The ids were hoisted
so the two calls differ in exactly one thing — that a reservation now exists. This is the non-vacuity
condition the brief demanded (same key, one variable), and the suite caught its own violation of it.

**No test at the base asserted the defect.** Unlike Meals — whose `MealsAgreementWriterTests` pinned the
stranding under a comment calling it a documented tradeoff — no Training test asserted
`training.idempotency-in-progress` on a retry. Nothing had to be inverted and no assertion was deleted.
(`WebApi.Tests/Meals/MealsAgreementWriterTests.cs:198` still asserts the Meals defect at this base, because
the Meals lane `54714dd6` is unpushed and not an ancestor. Not my file, not touched.)

## What is NOT proven

The two commit-time arms are reached by **arranging** the `DbUpdateConcurrencyException` a lost rowversion
compare-and-swap raises (`FailTheCompletionCommit`, a decorator that delegates reserve/refuse/replay to the
real `TrainingIdempotency` and fails only `CompleteAsync`). SQLite generates no rowversion, so an unarranged
race resolves in memory and never reaches the arm. **That the CAS itself raises it on SQL Server stays the
SQL-Server suites' job and was not run — Docker is down and the brief grants no container slot.** What is
proven is only that the arm's answer is recorded and replayed.

No person has walked this in the UI, so **C5 is owed**.

## Files touched (sibling-overlap disclosure)

Commit `01cd5eee` on `lane/train-idempotency-refusal`, **7 files, committed by pathspec, not pushed**:

Production — `Enums/Training/TrainingIdempotencyRecordStatus.cs` (+`Refused`),
`Services/Training/TrainingIdempotencyReservation.cs` (+`Refused` disposition),
`Services/Training/TrainingIdempotency.cs` (+`RefuseAsync`, +the `Resolve` branch),
`Services/Training/Interfaces/ITrainingIdempotency.cs` (+`RefuseAsync`),
`Services/Training/TrainingMutation.cs` (the two recordings + the replay arm),
`Services/Training/TrainingRecordedRefusal.cs` (**new**).

Tests — `WebApi.Tests/Training/TrainingIdempotencyRefusalTests.cs` (**new**, 25 facts).

- **No shared test file was modified.** `TrainingHarness`, `TrainingServiceKit`, `TrainingWorld` and every
  existing Training suite are untouched: the commit-time arms are reached with a decorator declared inside
  the new test file, so no sibling lane's fixture changed. This is the one place this lane diverges from
  Meals, which had to add overloads to three shared test hosts.
- `TrainingMutation.cs` and `TrainingIdempotency.cs` are the module's shared composition — any other live
  Training lane touching the mutation lifecycle will conflict here, and the merge should keep both
  `RefuseAsync` calls and the `Refused` arm.
- `WebApi.Tests/Meals/MealsAgreementWriterTests.cs:198` still asserts the **Meals** stranding at this base
  (the Meals lane `54714dd6` is unpushed and not an ancestor). Not this lane's file and not touched.

## Housekeeping

Checkout asserted clean before building. The full run dirtied
`artifacts/journeys/ev-dietary/{run-sheet.json,run-sheet.md}` exactly as the brief warned; both were
restored with `git checkout --`, **not committed**. The baseline worktree
`/Users/svendaneel/okam/OkamAPI-trainidembase` (detached at `8e2b57de`) is still on disk and can be removed.
No container was started at any point; no shared ref was moved; nothing was pushed.
