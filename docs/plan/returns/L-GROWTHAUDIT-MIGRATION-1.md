```
RETURN: L-GROWTHAUDIT-MIGRATION
brief: aeb795b0
verdict: built
evidence: docs/plan/lanes/L-GROWTHAUDIT-MIGRATION/sys-catalog.txt
log:
SQL tier 565/22/587 -> 593/1/594, 40m54s. 21 cured, 0 newly failing. trx at lanes/L-GROWTHAUDIT-MIGRATION/trx/lane-mig29-sql-tier.trx, diffed test-by-test vs 24cd4ead's, not by counters.
Your correction holds; I measured 1, derived from the baseline trx before it arrived: 15 lineage + 6 dispatch + 1 outbox = 22, so the table caused 21. Survivor is the outbox row, another lane's.
sys.* on a CHAIN-BUILT db (ef update from EMPTY, my localhost:14380, 137/137): table 1; PK clustered + 2 NONCLUSTERED unique=0 in key order; trigger is_instead_of=0 on UPDATE+DELETE; 0 FKs.
Trigger proved by MUTATION: INSERT ok, DELETE/UPDATE refused Msg 50074; DROP TRIGGER and the same DELETE SUCCEEDS; re-create and it refuses. No FK on this table, so no constraint can be the refuser.
Reversible: Down() drops trigger+table (catalog 0/0); re-apply restores table+trigger+3 indexes.
C2: parent is chain tip 20260803093235, not the tip the finding named (8 stale). Designer == model snapshot byte-for-byte, and == tip's + exactly one entity (428 vs 427), purely additive.
ef migrations add folded in NOTHING else, so this table was the whole model/chain drift at the tip. Trigger shipped in the SAME migration, so MIG-29 keeps exactly one file.
50074 verified from migration bodies: 50019 is MIG-14's, 50018/50051 spent. Three comments claiming layer 2 was absent are now false; rewritten.
One GREEN test my change would have reddened, fixed not loosened: GrowthDispatchMigrationLineage asserted the Growth surface is exactly 19 tables - green BECAUSE of the defect. The ledger is 20th.
Total 587 -> 594 fully accounted: +7 new GrowthAuditLedgerAppendOnlySqlServerTests (all green) + one rename in/out. Nothing deleted, disabled or skipped; Skipped 0 in both runs.
Fast tier 4703/0/10, identical to baseline. Ran it because TriggerRefusalAttributionTests derives scope from CREATE TRIGGER in Migrations/; my tests pin Assert.Equal(50074, ex.Number).
CONTAINER HAZARD worth reusing: the slot gate is a START condition only. I began at MemFree 3.22GiB; 5 min later MemAvailable fell 0.6GiB/min, ~2 min from an OOM-137 that takes the sibling too.
Fix: capped max server memory to 1200MB in MY container only, keyed on session-id 95d8ca73 (foreign was ec6e993f); a watchdog re-capped 5 fixtures. Two capped SQL lanes coexist here.
Not repaired by design: the untyped catch(DbUpdateException) in GrowthDispatch/GrowthConsentText. For L-NEWSLETTER-DISPATCH-REPORTS-ITS-CAUSE: no tier test points at it now; it must argue from code.
lane/growthaudit-migration @ 93a52938, 0 behind/1 ahead of integration/mig-stack-merge, never pushed; shared refs unmoved. Detail in lanes/L-GROWTHAUDIT-MIGRATION/ (detail.md, sql-tier-result.md).
END RETURN
```
