# The tier — and the reason this merge must not be landed today

Non-SQL tier only. `dotnet test WebApi.Tests/WebApi.Tests.csproj -c Debug --filter "Database!=SqlServer"`.
The exclusion is written into every filter I ran, so **no container was started and none was touched**
— the one SQL container on this host belongs to another lane and was left alone.

## The triple

| run | ref | worktree | result |
|---|---|---|---|
| **baseline** | `8e2b57de` (integration tip) | `/Users/svendaneel/okam/wt-traindiscland`, freshly created, `git status --porcelain` = 0 before the run | **4638 passed / 0 failed / 12 skipped**, total 4650, 6 m 51 s |
| **merged** | `f4407595` (the local merge) | `/Users/svendaneel/okam/wt-traindiscland-m` | **4100 passed / 0 failed / 12 skipped**, total 4112, then **`Test Run Aborted`** |
| **control** | `06b8b582` (the lane tip, clean checkout) | `/Users/svendaneel/okam/wt-traindiscland-lane`, `git status --porcelain` = 0 | class-scoped: **15 passed**, then **`Test Run Aborted` — the same crash** |

The baseline is mine, taken in this session on a clean checkout of the same base. It is **not** a number
inherited from another lane's report.

## The delta, accounted for

Expected: **+12 and nothing else.** The lane adds twelve `[Fact]`s and removes none —
nine in `WebApi.Tests/Training/TrainingDisclosureLogTests.cs`, three in
`WebApi.Tests/Wire/TrainingWireTests.cs` — with no `[InlineData]`, no `Skip`, and no `SqlServer`
trait, so all twelve belong to this tier. Expected merged total 4662, passed 4650, skipped 12.

The skip count is 12 on both sides and the twelve are the same twelve: ten static
`[Fact(Skip = …)]` (2 × `EventsDepositHookDispatchTests`, 1 × `MealsInvitationIdentityBindingTests`,
2 × `MealsOrderLoopJourneyTests`, 2 × `GrowthWebhookAuthWireTests`, 3 ×
`WorkforceEndToEndJourneyTests`) plus two `[SkippableFact]` smokes that stand down without their
environment (`GrowthPostmarkSandboxSmokeTests`, `SurfboardCashSplitSmokeTests`). The lane's diff adds
and removes no `Skip` and no `SkippableFact`.

**Observed: −538 and an abort.** 4650 → 4112 counted. The run did not fail — it *stopped*, and the
~550 tests after the crash point were never executed. `Failed: 0` on that line is an artefact of the
abort, not a result: the failing test never reached the reporter.

## What aborts it

```
The active test run was aborted. Reason: Test host process crashed :
Unhandled exception. System.ObjectDisposedException: Cannot access a disposed object.
Object name: 'JsonDocument'.
   at System.Text.Json.JsonElement.ToString()
   at Xunit.Sdk.AllException.<>c.<get_Message>b__6_0(Tuple`3 error)
   at Xunit.Sdk.AllException.get_Message()
   at Xunit.Sdk.ExceptionUtility.ConvertExceptionToFailureInformation(Exception ex)
   at Xunit.Sdk.TestFailed..ctor(ITest test, Decimal executionTime, String output, Exception ex)
   at Xunit.Sdk.TestRunner`1.RunAsync()
```

Read the trace from the bottom: a test **failed**, and xunit crashed the host while rendering the
failure message. Two independent defects stacked, and the second hides the first.

### Defect 1 — a red assertion takes the whole tier down

`WebApi.Tests/Wire/TrainingWireTests.cs:1096`:

```csharp
Assert.All(root.GetProperty("disclosures").EnumerateArray(),
    d => Assert.False(d.GetProperty("actorIsSubject").GetBoolean()));
```

`root` belongs to a `using var document = JsonDocument.Parse(…)`. When the assertion fails, the
`AllException` is thrown, the method returns, **the `using` disposes the document**, and only then
does xunit ask the exception for its `Message` — which lazily calls `JsonElement.ToString()` on every
failing item. The document is gone, `ObjectDisposedException` is thrown on a thread-pool thread, and
the test host dies.

So a single ordinary red does not cost one line in a failure list here; it costs **~550 unrun tests
and an aborted run**. Any `Assert.All` over `JsonElement`s from a scoped `JsonDocument` carries this,
and it is only ever visible on the day the assertion goes red.

### Defect 2 — two of the lane's own wire tests cannot both be true

The route under test **writes to the world it reads**: every disclosure-log read appends a
`disclosure-log.read` row. `WireHostFixture` is shared, so those rows outlive the test that wrote
them. Two of the three tests the lane added then make opposite claims about the same person
(`WireHostFixture.TrainingPersonRef`) in the same store (`StoreA`):

| test | claim |
|---|---|
| `Reading_the_disclosure_log_is_itself_recorded_and_the_subject_sees_who_looked` | a row with `actorReference == Outsider` **and `actorIsSubject == true`** is present |
| `The_person_a_record_is_about_can_see_who_read_it_and_sees_no_other_stores_or_persons` | *"Nobody in this world has read their own file"* — **every** row has `actorIsSubject == false` |

`The_disclosure_log_admits_the_subject_and_the_stores_admin_and_nobody_else` writes such a row too,
via its `asSubject` read. Whichever ordering the runner picks, the all-false claim loses.

**Proved rather than reasoned:**

- the all-false test **passes alone** (`--filter …The_person_a_record_is_about…` → 1 passed);
- the pair `The_person_a_record_is_about…` + `The_disclosure_log_admits…` **aborts**;
- the whole class aborts.

## Whose defect is it? Not the merge's.

**The control run settles it: a clean checkout of `06b8b582` with no merge at all aborts identically
— 15 passed, then the same `ObjectDisposedException`.** The merge did not introduce this and no
integration-side drift caused it. It has been on `lane/train-disclosure` since 2026-08-02.

**And the lane's own receipt could not have seen it.** `artifacts/tests/L-TRAIN-DISCLOSURE/after.trx`,
the evidence the plan records for `L-TRAIN-DISCLOSURE`, has `total="962" passed="960" aborted="0"` —
and contains **12 of the 26 tests in `TrainingWireTests`**. Of the **three** wire tests that commit
adds, the receipt contains **one**:

| test the lane added | in `after.trx` |
|---|---|
| `The_disclosure_log_admits_the_subject_and_the_stores_admin_and_nobody_else` | yes |
| `Reading_the_disclosure_log_is_itself_recorded_and_the_subject_sees_who_looked` | **no** |
| `The_person_a_record_is_about_can_see_who_read_it_and_sees_no_other_stores_or_persons` | **no** |

The one test that aborts the tier, and the one whose claim contradicts it, are both absent from the
green receipt that the lane was accepted on. **The receipt is green because the run that produced it
never executed them together.**

## The fix, named

Neither is this lane's to write, and both are small. In `WebApi.Tests/Wire/TrainingWireTests.cs`:

1. **Stop the crash** — materialize before asserting, so a red is a red rather than an abort:

   ```csharp
   var flags = root.GetProperty("disclosures").EnumerateArray()
       .Select(d => d.GetProperty("actorIsSubject").GetBoolean()).ToList();
   Assert.All(flags, f => Assert.False(f));
   ```

   Worth sweeping for as a class: any `Assert.All` over `JsonElement` from a scoped `JsonDocument`
   is the same landmine.

2. **Fix the claim** — the all-false clause is the wrong assertion for that test and is redundant.
   `Reading_the_disclosure_log_is_itself_recorded…` already proves `actorIsSubject` is a real
   derivation, positively and in both directions. The test at 1096 is about *store and person
   predicates*, so it should assert `actorIsSubject == false` only for the rows it caused — those
   attributed to `AdminA` / `AdminB` / `PowerUser` — or take its own person so no sibling can write
   into its world.

Until one of those lands, **the merge below is textually clean and functionally unlandable.**
