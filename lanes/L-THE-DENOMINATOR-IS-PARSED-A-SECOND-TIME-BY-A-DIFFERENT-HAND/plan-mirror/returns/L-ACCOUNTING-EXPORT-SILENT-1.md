```
RETURN: L-ACCOUNTING-EXPORT-SILENT
brief: 07628337
verdict: built
evidence: lanes/L-ACCOUNTING-EXPORT-SILENT/mutation-log.md
log:
Both sites defective at 8e2b57de as briefed; tip confirmed, so not fail-spec.
Own worktree wt-acctexport off 8e2b57de, branch lane/accounting-export-silent, commit a154ca19.
FIX: StoresExported counted from what the export produced, not the eligibility query.
Daily and POS halves held apart - ExportPendingForStoreAsync runs OUTSIDE the providers
collection, so a merged list lets Z-report vouchers stand in for books never posted.
StoresEligible keeps the query's own honest name; Cleanup returns both numbers.
GUARD: no provider -> refusal result carrying new AccountingExportTarget.None, logged and
alerted (AlertAsync sat inside the loop, so empty never alerted). No sweeper -> a Failures
entry, which PaymentCaptureBackgroundService already escalates to LogError.
Test default sweepers ?? Array.Empty replaced; DailyMaintenance_KeepsExporting... 3 -> 2.
8 new tests. Four-state mutation on 4 sites, all 8 alternating RED/GREEN, WebApi.dll moved
8/8, never --no-build. Mutant answers 3 (eligible) where honest is 0, 1 or 2 - by value.
Container-free tier 4646/0/12. No container, no migration, no push, no shared ref moved.
C4: reports and refusals only, no money-path write touched. run-sheet artifacts restored.
NOT built here: composition-root floor per target - census-floors owns it, must skip None.
END RETURN
```
