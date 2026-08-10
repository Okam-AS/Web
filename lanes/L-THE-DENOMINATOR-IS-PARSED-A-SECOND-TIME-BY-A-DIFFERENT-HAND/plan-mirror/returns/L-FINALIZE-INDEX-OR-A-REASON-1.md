```
RETURN: L-FINALIZE-INDEX-OR-A-REASON
brief: 93432a84
verdict: built
evidence: lanes/L-FINALIZE-INDEX-OR-A-REASON/evidence.md
log:
Read at 8e2b57de (checkout is on lane/meals-grace-pins). Work on lane/finalize-index-or-a-reason @ 5e53de83, worktree ~/okam/wt-finalizeidx. One container, mine, disposed. No push, no prod.
Answered before adding. Chain-built catalog (MigrateAsync from empty, never EnsureCreated), 64k journal rows so a plan means something. One index on those columns: the unique Sale-filtered backstop.
Four production reads use (CashPointId, OrderId). SQL Server ruled on implication itself: forced-hint Msg 8622, which is statistics-independent. The compiled plans agreed with it.
  finalize idempotency (Sale) Index Seek, hint OK | sale-behind-handover (Sale) Index Seek, hint OK
  finalize handover (EventType=UTLEVREC) CLUSTERED SCAN, Msg 8622 | delivery-doc print (UTLEVREC) CLUSTERED SCAN, Msg 8622
ONE INDEX DOES NOT SERVE BOTH. The backstop cannot serve the two 2-8-7 handover reads at all; FinalizeService's runs on EVERY sale, scanning the whole append-only table. Cheaper branch refuted.
Fix = the sweep's parked prescription: name the backstop UX_JournalEntries_OneSalePerOrder, freeing IX_JournalEntries_CashPointId_OrderId. It RENAMES first, so the invariant never lapses.
Proven on a chain build: both indexes correct, all four reads seek, real Down/Up round trip with 84k rows. 4/4 SQL. Fast tier 4638/0/12 (= baseline; the new tests are SqlServer-traited).
NEW FINDING: migrations add swept in CreateTable GrowthAuditEvents - in OnModelCreating, in no migration. Third instance of the AccountingSummaries shape. Already specified as MIG-22, owes a trigger.
Stripped it from the migration AND both snapshots, leaving the drift exactly as found for MIG-22's author. has-pending-model-changes still reports it and nothing else (probe migration, removed).
DID NOT COLLIDE: parented at 20260731220005, the tip at 8e2b57de. integration/mig-stack-land holds 5 later migrations, so this must be RE-PARENTED there when the stack lands, taking MIG-28.
No ledger edit: the ledger at 8e2b57de lacks MIG-23..27, so writing MIG-28 into it would manufacture the conflict. That branch's own ledger is what declares MIG-28 free.
MERGE DEBT: the sweep's Parked entry (lane/ef-index-shadow-sweep 08309e39) re-derives itself and FAILS the day this lands, by design. Delete it in that merge.
C1 no UPDATE/DELETE anywhere, INSERT-only rows on a disposable DB. C2 one author, chain not model, snapshot == this migration's Designer byte for byte. C4/C6/C7 untouched.
C5: this exit is a database property, not a journey - evidence is catalog rows and compiled plans, not a suite count. No UI changed, so there is nothing for Sven to walk.
END RETURN
```
