```
RETURN: L-MIG-COMPANY-RECEIVABLE
brief: 98dd0bab
verdict: built
evidence: OkamAPI lane/mig-company-receivable @ 32c56fa4, off chain tip cff1c005; Migrations/20260803090036_Meals_CompanyReceivableAccount.cs; fast tier 4368/0/7
log:
Base MEASURED not inherited. Chain tip = lane/wf-adjustment-ordinal cff1c005 (most migration files of any branch). Own worktree wt-migcompanyrecv, not OkamAPI-modules.
The chain is SEVEN migrations past feature/restaurant-modules, not six: 20260801084923, 102621, 113131, 132512, 174639, 20260802103646, 151208. Diverged both ways (merge-base 968fd273, 22 feature-only vs 24 stack-only commits). Ledger corrected; it had drifted stale three times now.
MIG-27 claimed after grepping every branch's ledger for MIG-27+ and finding none. No THROW number needed; 50073 re-verified as still the highest anywhere. No index, no trigger, no constraint, so C1 is not engaged.
C2 clean: the generated snapshot diff is the one property and nothing else, the Designer differs from MIG-26's by that property plus its own id, and has-pending-model-changes reports no changes.
Column TripletexConnections.CompanyReceivableAccountNumber nvarchar(max) NULL. No backfill (every existing row predates any company tender; NULL is the truthful "not configured").
The defect: TripletexPosService.PaymentAccountNumber sent a CompanyAccount tender through default -> config.AccountNumberReceivables, the account the online day voucher debits and the payout voucher clears against the two intermediaries. Nothing clears a company debt out of it, so its residual counted the same krone twice.
Export now reads the column via a PaymentType.CompanyAccount branch. Blank REFUSES the Z (missingRoles "betalingskonto CompanyAccount"), isolated per-Z, rather than falling back -- a fallback would restore the mis-posting silently and neither card rail falls back either.
Also plumbed the power-user surface so the account can be set and provisioned: upsert Coalesce, status model, auto-creatable chart entry "Mellomkonto bedriftskreditt" ASSETS, missing-account scan.
3 new tests in WebApi.Tests/Kassa/Cov_TripletexPosExportTests.cs (own account not the shared receivable; blank refuses and posts nothing; mixed card+credit day stays separated). All three PROVEN RED against the mutant with the branch deleted, green after restoring, with a real rebuild between so no stale-binary reading.
NO SQL TIER RUN. docker stats measured five foreign containers holding 6.12 GiB of the VM's 7.65; a sixth SQL Server needs 1.3-1.4 and would have OOM-killed other lanes' worlds. I started and killed nothing.
UNPROVEN as a result: the migration is applied to NO database, so replay-from-empty and the up/down round trip are unmeasured. Nothing in this entry needs SQL Server to be decided (no index/trigger/constraint) and the export path is exercised on Sqlite, so this is a deployment-rehearsal gap, not an open question.
Residual, other repo, untouched: Web/pages/admin/tripletex.vue:133-134 and Web/core/models/tripletex/tripletex-admin-models.ts carry the two sibling account form fields and not this one, so today the account is settable only over the API. Web is on feature/POS with a clean tree; I had no branch instruction for it.
Local commit only, nothing pushed. Test-written artifacts/journeys/ev-dietary/* reverted rather than committed; staged by explicit pathspec.
END RETURN
```
