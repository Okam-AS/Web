# L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED — the red the exit turns on

Reason shape hit: **(2) a GREEN run was recorded where the exit demands a RED.** `instrumentless-exits.md`
Batch 6 declined this lane because all three named files record green: `tier.trx` is
`passed="5040" failed="0"`, `after-arm-by-name.txt` lists 14 passing `EodServiceTests`, and
`before-arm.trx` holds one test — `PROBE_BEFORE_a_company_account_sale_is_counted_as_takings_under_Annet`
— which **passed**, asserting the defect at the pre-fix trunk rather than reddening the shipped pin.
The RETURN's sentence "putting CompanyAccount back into the switch's default arm reds 2 of
EodServiceTests' 14" had no artifact. **This file is that run.**

## The evidence line as it stood before `plan verify` overwrote it

```
evidence: backend feature/restaurant-modules d30c1c4d4 -> bcfe0d893; lanes/L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED/{before-arm.trx,tier.trx,after-arm-by-name.txt}
```

## Where it was run

Backend trunk `6d5328004b831b3ec99424b73c4d05e1d6077dc8` (`feature/restaurant-modules`), in a detached
worktree of `/Users/svendaneel/okam/OkamAPI-modules` — **not** the lane's original worktree, which is gone.
`bcfe0d893` is an ancestor of the trunk (`git merge-base --is-ancestor` → 0), so the shipped code is what
was mutated. No trunk was moved, nothing pushed, no container started.

Runner in every row: `dotnet test WebApi.Tests/WebApi.Tests.csproj --no-build --filter
"FullyQualifiedName~EodServiceTests" --logger trx`. Each row was preceded by
`dotnet build WebApi.Tests/WebApi.Tests.csproj` and the **`WebApi.dll` mtime was asserted to move on every
one** — a restore that preserves mtime makes `--no-build` measure the mutant.

## The four runs

| # | state of the tree | `WebApi.dll` mtime | result |
|---|---|---|---|
| 0 | trunk, unmutated | `2026-08-09T17:35:46` | **Passed — Failed: 0, Passed: 14, Skipped: 0, Total: 14** |
| 1 | **M1** applied | `2026-08-09T17:38:00` | **Failed — Failed: 2, Passed: 12, Skipped: 0, Total: 14** |
| 2 | **M2** applied (M1 restored) | `2026-08-09T17:39:20` | **Failed — Failed: 1, Passed: 13, Skipped: 0, Total: 14** |
| 3 | both restored | `2026-08-09T17:39:53` | **Passed — Failed: 0, Passed: 14, Skipped: 0, Total: 14** |

Every run executed **14** tests. A mutation that reds nothing means the run executed nothing until a count
disproves it; the count is the same in all four rows.

## M1 — CompanyAccount falls into the default bucket, which is the exit's own clause

`Services/Kassa/EodService.cs`, the guard removed so the `switch` sees `CompanyAccount` again:

```diff
-                if (!line.PaymentType.IsReceived())
-                {
-                    credit += signed;
-                    continue;
-                }
-
+                // MUTATION M1: the received check removed, so CompanyAccount falls through to the
+                // switch's `default` arm exactly as it did before the fix.
                 switch (line.PaymentType)
```

Two tests went red, by name, from the trx and the console:

```
Failed WebApi.Tests.Kassa.EodServiceTests.GetSummary_ACompanyAccountSale_IsStatedApart_NotCountedAsTakings [256 ms]
  Assert.Equal() Failure
  Expected: 25000
  Actual:   0
  at ...EodServiceTests.cs:line 69

Failed WebApi.Tests.Kassa.EodServiceTests.GetSummary_ACreditReturn_NetsAgainstTheCreditTotal_NotAgainstTakings [210 ms]
  Assert.Equal() Failure
  Expected: 20000
  Actual:   0
  at ...EodServiceTests.cs:line 92
```

`Expected 25000 / Actual 0` is the sentence the exit asks for: with the guard gone the 25 000 øre
company-account sale is **not** stated apart — it lands back in the takings bucket and `CreditTotal` reads
zero. The RETURN's claim of "reds 2 of EodServiceTests' 14" is reproduced exactly, on the trunk.

## M2 — the report model stops reading the shared predicate

`Models/Kassa/XZReportModels.cs`, `PaymentMeansTotal.IsReceived` restating the rule in its own words
instead of delegating:

```diff
-        public bool IsReceived => PaymentType.IsReceived();
+        public bool IsReceived => true;
```

One test went red — the one that exists to stop the two documents drifting:

```
Failed WebApi.Tests.Kassa.EodServiceTests.TheCloseAndTheXZReport_ReadTheSameReceivedRule [1 ms]
  Assert.Equal() Failure
  Expected: False
  Actual:   True
  at ...EodServiceTests.cs:line 105
```

Also reproduces the RETURN exactly ("reds exactly 1"). Scope stated plainly: the filter is
`EodServiceTests`, so "exactly 1" is exactly 1 **of that class's 14**; `EscPosXZReportBuilder` also reads
`IsReceived` and its own suites were not in this filter.

## Restore

Both files were restored by writing them back, never by preserving a stale copy:
`git status --porcelain` → 0 files, `git diff | wc -c` → **0 bytes**. Run 3 above is the green after the
restore, on a rebuilt assembly whose mtime moved.

## What this record does not claim

Nothing here is C5 acceptance. No operator has taken an end-of-day close carrying a `Kredittsalg
(faktureres)` row; the zero-credit-row question the RETURN raised (whether the row prints at zero under
§ 2-8-2) is still unruled, and this run does not touch it.
