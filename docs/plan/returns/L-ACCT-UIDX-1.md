```
RETURN: L-ACCT-UIDX
brief: 73b26e94
verdict: blocked
evidence: OkamAPI lane/acct-uidx @ c606993a, off chain tip 32c56fa4; Migrations/20260803093235_Kassa_AccountingSummaryDayUniqueIndex.cs; artifacts/mig7/RUN.md; fast tier 4368/0/7
needs: +F-SQL-HEADROOM
log:
BASE MEASURED, NOT INHERITED. Own worktree wt-acctuidx off the chain tip lane/mig-company-receivable @ 32c56fa4. NOT OkamAPI-modules, which is on lane/meals-grace-pins.
NO FORK, and proven by CONTENT not prose: Designer parent is 20260803090036_Meals_CompanyReceivableAccount, and my generated Designer differs from that migration's by class identity and NOTHING else. feature/restaurant-modules is NOT an ancestor (diverged 22 vs 25) and is EIGHT behind at 127 vs 135; chain is 136 with mine. Newest migration id on EVERY branch enumerated: nothing anywhere is later than 20260803090036. ModelSnapshot untouched.
CLAIM VERIFIED BEFORE AUTHORING. Index is in ApplicationDbContext.cs:701-703; the only CreateIndex on the table in the whole chain is IX_AccountingSummaries_StoreId (StoreId alone, from CompanyInfo); so the catch at AccountingSummaryService.cs:138 is unreachable on every chain-built database.
KEPT MIG-7, DID NOT MINT MIG-28. MIG-7 has named this exact change since the ledger was written, and a second entry on one migration is the failure MIG-22's renumbering exists to prevent. MIG-28 STAYS FREE. THROW 50073 re-verified as the ceiling on every branch; NO number claimed - the runtime refusal is SQL Server's own 2601 and the deploy-time guard uses the generic 50000.
THE RULING'S PREMISE SETTLED BY MEASUREMENT: ef migrations add produced an EMPTY Up and Down and left the snapshot unmodified, because the snapshot was regenerated after the model gained the index. has-pending-model-changes is clean BEFORE and AFTER - that is the defect, not a clean bill of health.
IT REFUSES, IT DOES NOT REPAIR (C1). Up counts duplicate (StoreId, Date) groups and over-wide Date values and stops; it deletes nothing. Both duplicates may have reached the webhook, so which claim is real is an accounting decision. Sweep queries and the record a deletion must leave behind are in the ledger as an owner action.
Up is ONE raw batch deliberately: one operation per batch means RAISERROR aborts a batch but not a script, so a guard in its own batch would refuse while the drop and the narrowing after it ran and were committed.
ROLLBACK DEFECT FOUND AND FIXED. A typed AlterColumn resolves indexes-to-preserve from the TARGET model, so the generated Down dropped the unique index twice and then RE-CREATED it on the widened column - unique over nvarchar(max), Msg 1919. It could never have run. Found by reading the generated script, not the C#; Down is raw SQL now.
Narrowed the now-live catch to DbExceptionHelper.IsUniqueViolation. It answers Success with no items, so a bare DbUpdateException would report any other write failure as a safely-skipped duplicate and the day would silently never post at all.
NO SQL TIER. docker stats measured twice hours apart, unchanged: five FOREIGN containers hold 6.16 GiB of the VM's 7.65, leaving ~1.49 against the 1.3-1.4 a sixth needs. Started nothing, killed nothing, touched nothing foreign. Memory was the constraint, not CPU.
EXIT UNPROVEN AND NOT WEAKENED. AccountingSummaryDayIndexSqlServerTests asserts the index by property on a chain-built catalog and requires SqlException 2601 through EF for a second claim, with a drop-the-index falsification control; RoundTrip now probes MIG-7 in all three phases and is the test that would have caught the rollback defect. Both written, both compile, NEITHER RUN.
NO DML ANYWHERE, AND NONE WAS POSSIBLE. Resolved WebApiDatabase is localhost,1433 / okam_test_local - confirmed local, never production - and nothing is listening on 1433. No database update, no sweep against real data. The production duplicate count for okam_local, okamtest and prod stays UNKNOWN and is Ali's, and nothing can be applied until it is resolved.
Fast tier 4368/0/7 in 5m36s, assembly freshness asserted with find -newer before the run. Identical to the previous lane's count at 32c56fa4, which is the expected result: everything added carries the SqlServer trait.
Local commit only, c606993a, staged by explicit pathspec; test-written artifacts/journeys reverted rather than committed. Nothing pushed. Migration-author slot still HELD, since the merge decision is not mine.
END RETURN
```
