# L-TRAINWIRE-ABORT — the abort, verified before it was fixed

## Where the work was done

- Repo **OkamAPI** (`/Users/svendaneel/okam/OkamAPI`), own detached worktree at
  `/Users/svendaneel/okam/wt-trainwire-abort`, created by this lane.
- **HEAD = `06b8b582`** — "A person can see who has looked at their training record", the lane commit,
  **with no merge in front of it**. `git status --porcelain` was empty at checkout.
- `06b8b582` resolves to **no object in Web-modules**, where the plan hub lives; every SHA below is an
  OkamAPI SHA.
- `../OkamAPI-modules` (the brief's nominal workdir) is checked out on `lane/meals-grace-pins` at
  `34c6c103`, a foreign lane's branch. **Nothing was checked out, built or run there.**
- No container was started, stopped or entered. Every run carries `--filter Database!=SqlServer`.

## 1. The abort, shown before anything was changed

A tier that **aborts** is not a tier that **fails**: on an abort the host dies, the remaining tests never
run, and the counters name no cause. Both were measured at `06b8b582` before the fix.

### 1a. Targeted, 6 seconds — `artifacts/trainwire-before.trx`

`--filter "FullyQualifiedName~TrainingWireTests&Database!=SqlServer"`

```
Passed!  - Failed: 0, Passed: 15, Skipped: 0, Total: 15
Test Run Aborted.
The active test run was aborted. Reason: Test host process crashed :
Unhandled exception. System.ObjectDisposedException: Cannot access a disposed object.
Object name: 'JsonDocument'.
   at System.Text.Json.JsonDocument.CheckNotDisposed()
   at System.Text.Json.JsonElement.ToString()
   at Xunit.Sdk.AllException.<>c.<get_Message>b__6_0(Tuple`3 error)   AllException.cs:line 60
   at Xunit.Sdk.AllException.get_Message()                            AllException.cs:line 70
   at Xunit.Sdk.ExceptionUtility.ConvertExceptionToFailureInformation(Exception ex)
   at Xunit.Sdk.TestFailed..ctor(ITest test, Decimal executionTime, String output, Exception ex)
   at Xunit.Sdk.TestRunner`1.RunAsync()                               TestRunner.cs:line 164
```

The class declares **26 `[Fact]`s** and the trx enumerates **15**. The eleven that are missing did not
fail — they were never run, and nothing in the counters says so.

### 1b. Full non-SQL tier — `artifacts/tier-before.trx`, `artifacts/tier-before.log`

See `tier.md` for the counted-before / counted-after numbers.

## 2. Why it is a host crash and not a test failure

Read the stack from the bottom. `TestRunner.RunAsync` is **constructing `TestFailed`** — so
`Assert.All` at `TrainingWireTests.cs:1096` genuinely **failed**, and xunit was building the failure
message when it died.

1. `Assert.All` (xunit **2.4.2**) stores each failing item in `AllException.Errors` — here a
   `JsonElement`, a *struct that is only a cursor into* the `JsonDocument`.
2. The `AllException` unwinds out of the test method. On the way out, `using var document` at line 1080
   **disposes the document** — correctly, and this is the trap: the assertion is inside the `using`
   scope, so reading the source alone suggests the document is still alive when the elements are captured.
   It is; it is dead by the time they are *formatted*.
3. xunit then calls `ex.Message`. `AllException.get_Message` calls `JsonElement.ToString()` on the stored
   element, which calls `CheckNotDisposed()`, which throws.
4. That throw is inside xunit's own reporting path, on a thread-pool thread, with no handler above it —
   `Task.ThrowAsync` → `ThreadPoolWorkQueue.Dispatch` → process death.

So the mechanism converts one ordinary assertion failure into a lost tier. Nothing points at the test:
the trx has no entry for it, and the abort message names `JsonDocument`, not Training.

Line 1096 is the **only** `Assert.All` over `JsonElement`s in `WebApi.Tests/Wire/` — 787 asserts over
strings, 1031-1032 over EF entities. The hazard is contained to this one call site.

## 3. Why the assertion failed at all — a claim two siblings contradict

Line 1094's comment asserted the premise in prose: *"Nobody in this world has read their own file, so the
derived 'that was me' flag is false for every row."* That is false of the world the class builds.

`TrainingWireTests` is `[Collection(WireCollection.Name)]` over a **shared** `WireHostFixture` — one host,
one database, for every test in the class. `WireHostFixture:766` makes `TrainingPersonRef` (the subject) a
person **claimed by `Outsider`**, so an `Outsider` token *is* the subject. Two siblings then read the
subject's disclosure log as `Outsider`, and reading the log is itself recorded:

| sibling | line | writes |
| --- | --- | --- |
| `The_disclosure_log_admits_the_subject_and_the_stores_admin_and_nobody_else` | 1114 | `disclosure-log.read`, actor `Outsider` = subject → `actorIsSubject` **true** |
| `Reading_the_disclosure_log_is_itself_recorded_and_the_subject_sees_who_looked` | 1161-1165 | same, twice |

The trx of run 1a confirms this is not theoretical: the **last test recorded before the abort** is
`The_disclosure_log_admits_the_subject_and_the_stores_admin_and_nobody_else`. It ran, wrote a subject row
into the shared world, and the next test's all-rows claim then met a row it denies.

The claim is only ever true of the rows **this** test causes. Of the rows this test writes, exactly one
reaches its own answer: the `evidence.read` of the subject in `StoreA` by `AdminA` (lines 1061-1063) —
which is the same row line 1090 already asserts is present.

## 4. The change

`WebApi.Tests/Wire/TrainingWireTests.cs`, one hunk, the assertion at 1096 and the comment above it.

- **Materialize before asserting.** The elements are projected to `bool` with `.Select(...).ToList()`
  before `Assert.All` sees them, so no `JsonElement` can be stored in an `AllException` and no failure
  message can reach a disposed document. A failure here is now a *failure*.
- **Scope the claim to the rows this test causes.** Filtered to `actorReference == AdminA` — the reader
  this test wrote and line 1090 proves is present, and never the subject. `Assert.NotEmpty` guards the
  filter, because `Assert.All` passes over an empty sequence.

Deliberately **not** done, both being ways of removing the check rather than repairing it:

- the assertion was **not silenced, weakened to a count, or deleted**;
- the fixture was **not widened** — no per-test host, no reset between tests, no new world state. The
  sharing is what makes the sibling at 1151 able to prove `actorIsSubject` **true**; a private fixture
  would delete that proof.

The derivation stays proven from both ends: false for a store admin's row here, true for the subject's own
row at 1172-1177.

### Why only this one call site could kill the host

`Assert.Contains` over `JsonElement`s appears four times in this same file and has never aborted anything.
The difference is *when the message is built*: `ContainsException` formats its collection **eagerly, in its
constructor**, while the document is still alive; `AllException` stores the raw failing item and formats it
**lazily in `get_Message`**, which xunit calls after unwinding. So `Assert.All` over a `JsonElement` is the
uniquely fatal shape, and line 1096 was the only instance of it in `WebApi.Tests/Wire/`.

The mutation run below demonstrates both sides of this in one output: the `AllException` message now reads
`Item: True` — a `bool` — while the `ContainsException` in the sibling test prints a full
`List<JsonElement> [{...}]` and survives.

## 5. Mutation check — the repaired assertion still bites, and now it is survivable

`Services/Training/TrainingDisclosureService.cs:138` computes the only derived field:

```csharp
ActorIsSubject = !string.IsNullOrEmpty(subjectUserId)
                 && string.Equals(e.ActorReference, subjectUserId, StringComparison.Ordinal),
```

Replaced with `ActorIsSubject = true`, rebuilt (`WebApi.dll` 16:02:12, `WebApi.Tests.dll` 16:02:21 — both
moved), class rerun — `artifacts/mutant-actorissubject.trx`:

```
Failed:  2, Passed: 24, Total: 26          <-- the run COMPLETED
  Failed  The_person_a_record_is_about_can_see_who_read_it_and_sees_no_other_stores_or_persons
          Assert.All() Failure: 2 out of 2 items in the collection did not pass.
          [1]: Item: True   Xunit.Sdk.FalseException: Expected: False / Actual: True
  Failed  Reading_the_disclosure_log_is_itself_recorded_and_the_subject_sees_who_looked
```

This is the whole lane in one result. **The same assertion, failing for the same reason, that previously
took the host down — now reports as a red test and 24 others still run.** It also shows the repaired
assertion is not vacuous (the `AdminA` filter selected 2 rows, and `Assert.NotEmpty` guards it), and that
the derivation is pinned from both directions, since forcing it true reds the `false` claim here *and* the
`true` claim in the sibling.

Restored with `git checkout --` plus `touch` (per CLAUDE.md: a restore that preserves an old mtime makes
the next `--no-build` measure the mutant), rebuilt — `WebApi.dll` 16:03:13, `WebApi.Tests.dll` 16:03:22 —
and rerun green 26/0/0: `artifacts/restored-green.trx`.

## 6. Handoff

- Patch: `fix.patch` — one file, `+34/-10`. Full post-fix file: `TrainingWireTests.fixed.cs`.
- Committed to a **private local branch, never pushed**: OkamAPI `local/trainwire-abort-fix` at
  **`94a92615`**, parent `06b8b582`, one file. No shared branch was written, no migration authored, no
  container touched, no `npm`, no `git stash`, no `git add -A`.
- Because the blob is identical at `06b8b582` and at the merge `f4407595`, the landing lane can cherry-pick
  `94a92615` onto either side without re-resolution.
- Worktree left at `/Users/svendaneel/okam/wt-trainwire-abort` on `local/trainwire-abort-fix`, clean.
