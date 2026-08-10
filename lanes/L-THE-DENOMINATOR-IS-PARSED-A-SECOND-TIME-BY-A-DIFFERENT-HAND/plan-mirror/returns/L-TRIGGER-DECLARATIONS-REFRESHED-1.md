```
RETURN: L-TRIGGER-DECLARATIONS-REFRESHED
brief: 14e5e7b9
verdict: built
evidence: docs/plan/lanes/L-TRIGGER-DECLARATIONS-REFRESHED/detail.md
log:
Chain derived from Up() bodies only, table from each ON clause: 32 CREATE TRIGGER, 32 tables, 1:1, zero DROP. The seven beyond the stale patch match L-BACKEND-PATCHES-ARE-APPLIED's list exactly.
Brief correction: FOUR migrations dated 2026-08-01 install those seven, not three - Margin_WasteEntries is separate from Margin_PeriodStatementFinalizedImmutable. Count of 7/32 is right.
The patch's premise is stale a second way: 2 were ALREADY declared inline (MarginPeriodStatements:2451, MarginWasteEntries:2522). Real gap was 30 of 32; the refresh recipe would have declared those two twice.
Fix: ModuleTriggerBuilder declares all 32 in ONE place, the two inline ones moved in rather than duplicated. protected virtual, per the ApplyOrderKindQueryFilter idiom.
No IsSqlServer branch, unlike the patch: there is no EF in-memory provider here. WireHost.UseInMemoryDatabase is a method NAME whose body is UseSqlite. All providers relational, so a branch would only hide the fast tier from its own model.
SQL TRIPLE at the composed stack: declarations removed 38F/64P/102, restored 0F/102P/102, final tree 0F/102P/102. 102 = 32 tables x 3 write probes + 2 targeted + 4 model.
The 38 reds decomposed from the trx, not by eye: 32 UPDATE-refused (every table, prior lane's measurement re-confirmed at 32), 1 single-row INSERT, 1 batched INSERT, plus 4 named gates.
BATCHED-INSERT RESIDUAL CLOSED, and it corrected the claim. INSERT is refused iff the table has BOTH a rowversion to read back AND a trigger firing on INSERT. Exactly one of 32 qualifies: MarginWasteEntries, refused single-row and batched.
Both non-refusals fall out of the same rule with no free parameter: MarginPeriodStatements has the rowversion but no INSERT trigger; MealsStatementLines has the INSERT trigger but no rowversion.
Live vs latent re-derived for the seven: LIVE 2 (both Margin, conditional guards, already declared by the lanes that hit them), LATENT 5 (TrainingDeviationEvents + four W5, absolute in GuardAppendOnly).
Root cause of the W5 gap is a doc comment, now corrected: WorkforceTimesheetPeriod argued "no rowversion" -> "no HasTrigger needed". True premise, wrong conclusion - UPDATE/DELETE are refused regardless.
HasPendingModelChanges: I observed the GROWTHAUDIT cause, NOT a trigger cause. It is true at this base and ModelVersusChainDriftTests is not on this branch, so I assert the DELTA - differ between the model with and without declarations reports ZERO operations, with a third context proving the differ answers otherwise when it should.
Fast tier 0F/4728P/10S/4738 -> 0F/4732P/10S/4742. +4 = the four container-free model gates, nothing regressed. Re-run at the final tree, identical.
No migration, no schema change, nothing disabled. One container, capped 2048MB over its OWN connection string, deleted by Testcontainers; owner's okam-lwtwo-* never touched. Committed ead8869ee, NOT pushed.
END RETURN
```
