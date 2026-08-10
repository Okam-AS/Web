# BOTH HALVES — the migration that creates the account, and the export that reads it

Produced by `agent:L-FORTY-SEVEN-LANES-NEED-THE-WORK-NOT-THE-CITATION` (batch 2), 2026-08-09.
Reason-shape: **half of a two-part exit in each candidate file, and no single path carrying the sentence.**
The migration file proves the column and says nothing about the export; the export lives in
`Services/Tripletex/TripletexPosService.cs` and `WebApi.Tests/Kassa/Cov_TripletexPosExportTests.cs`, which
the evidence line never named. This file carries both, and adds the red the migration half never had.

**The evidence line as the original agent recorded it, preserved because `plan verify` overwrites it:**

    OkamAPI lane/mig-company-receivable @ 32c56fa4, off chain tip cff1c005;
    Migrations/20260803090036_Meals_CompanyReceivableAccount.cs; fast tier 4368/0/7

## Half one — a migration on the chain, and the chain is consistent about it

Read at backend trunk **`6d5328004`**, where the lane has landed (`git merge-base --is-ancestor 32c56fa4
6d5328004` → yes), not only on the lane branch.

`Migrations/20260803090036_Meals_CompanyReceivableAccount.cs`:

```csharp
protected override void Up(MigrationBuilder migrationBuilder)
{
    migrationBuilder.AddColumn<string>(
        name: "CompanyReceivableAccountNumber",
        table: "TripletexConnections",
        type: "nvarchar(max)",
        nullable: true);
}

protected override void Down(MigrationBuilder migrationBuilder)
{
    migrationBuilder.DropColumn(
        name: "CompanyReceivableAccountNumber",
        table: "TripletexConnections");
}
```

No index, no unique constraint, no check constraint, no trigger — so **C1 is not engaged** and there is no
`OnModelCreating`-without-a-migration gap of the `AccountingSummaries` shape.

**C2, measured on the chain rather than argued.** The trunk carries 51 migrations; this one sorts 49th, so
it was the tip when authored and two later migrations (`20260803093235_Kassa_AccountingSummaryDayUniqueIndex`,
`20260806125642_Growth_AuditLedger`) landed on top of it.

- **Exactly one migration in the whole chain mentions the column.** Sweeping every migration file at
  `6d5328004` for `CompanyReceivableAccountNumber` returns this migration and the model snapshot, and
  nothing else. That is the direct check against the estate's own precedent — the chain that could not
  replay from empty because *two* migrations both added `Orders.TableId`.
- **The column enters the chain at exactly this point and is carried forward.** The Designer snapshot of the
  **preceding** migration (`20260802151208_Workforce_TimesheetAdjustmentOrdinal.Designer.cs`) contains
  **0** occurrences; the Designers of both **following** migrations contain **1** each. A migration whose
  parent snapshot already knew the property, or whose successors had lost it, would fail this check.
- **The connection carries the account beside its two siblings**, in the current model snapshot
  `Migrations/ApplicationDbContextModelSnapshot.cs`: `CompanyReceivableAccountNumber` at line 8635,
  `DinteroIntermediaryAccountNumber` at 8638, `SurfboardIntermediaryAccountNumber` at 8665 — the same
  entity, `TripletexConnections`.

**What is still unmeasured, and it is the C2 residue the census flagged.** The migration has been applied to
**no database**. No SQL slot was granted to this lane and none was taken, so **replay-from-empty and the
`Up`/`Down` round trip are not observed** — only the chain's static consistency is. That is a
deployment-rehearsal gap and it is recorded, not closed.

## Half two — the export reads it, shown by a red

`Services/Tripletex/TripletexPosService.cs:285-306`, `PaymentAccountNumber`. The `CompanyAccount` tender used
to fall through `default:` to `config.AccountNumberReceivables` — the account the online day voucher debits
and the payout voucher clears against the two intermediaries. Nothing clears a company debt out of it, so
its residual counted the same krone twice. It now has its own branch, and **blank refuses the Z rather than
falling back**:

```csharp
case PaymentType.CompanyAccount:
    // …Falling back to the shared receivables account when it is unset would silently restore the
    // mis-posting -- nothing clears a company debt out of that account, so its residual would count
    // the krone twice.  Blank therefore refuses the Z voucher (missingRoles) rather than guessing.
    return connection.CompanyReceivableAccountNumber;
```

Run in `/Users/svendaneel/okam/wt-migcompanyrecv` (`lane/mig-company-receivable`, `32c56fa4c`, clean before
and after), from `WebApi.Tests/`:

    dotnet test --filter "Database!=SqlServer&FullyQualifiedName~Cov_TripletexPosExportTests" \
                --logger "trx;LogFileName=<name>.trx" --results-directory <this directory>/runs

| arm | mutation | total | **executed** | passed | failed | trx |
|---|---|---|---|---|---|---|
| baseline | none | 9 | **9** | 9 | 0 | `runs/baseline.trx` |
| **M1** | the `case PaymentType.CompanyAccount:` branch disabled, so the tender falls to `default:` → `config.AccountNumberReceivables` — i.e. the defect restored | 9 | **9** | 6 | **3** | `runs/mut-branch-deleted.trx` |
| restored | none | 9 | **9** | 9 | 0 | `runs/restored-green.trx` |

`WebApi.dll` mtime moved on every arm (17:50:33 → 17:51:08 → 17:51:44); no `--no-build`. Executed count 9 in
all three, so the three reds are kills and not a void run.

**The three that went red, by name and by message:**

    ExportZReport_ClassifiesCompanyAccountTenderToItsOwnInterimAccount_NotSharedReceivables
      System.InvalidOperationException : Sequence contains no matching element

    ExportZReport_CompanyAccountAndCardTenders_SettleOnSeparateAccounts
      System.InvalidOperationException : Sequence contains no matching element

    ExportZReport_CompanyAccountTenderWithNoInterimAccount_RefusesInsteadOfPostingToReceivables
      Assert.Throws() Failure
      Expected: typeof(WebApi.Helpers.AppException)
      Actual:   (No exception was thrown)

The third is the one worth reading twice: under the mutant a **blank** company account stops refusing and
**posts silently** to the shared receivables account. That is the money defect, reproduced on demand.

## What this file does not claim

- **No SQL tier, no container.** The migration is unapplied; see the C2 residue above.
- **Not C5.** Nothing here is an operator completing a journey.
- **The account is still API-only.** `Web/pages/admin/tripletex.vue:133-134` and
  `Web/core/models/tripletex/tripletex-admin-models.ts` carry the two sibling account fields and not this
  one, so today the company-receivable account can be set only over the API. Untouched by this pass.
