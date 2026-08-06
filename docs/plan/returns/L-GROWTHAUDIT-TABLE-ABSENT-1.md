```
RETURN: L-GROWTHAUDIT-TABLE-ABSENT
brief: 75dcb43b
verdict: built
evidence: lanes/L-GROWTHAUDIT-TABLE-ABSENT/finding.md
spec_gap: none
reason: analysis complete; premise holds and remedy specified without authoring a migration
log:
PREMISE HOLDS. Case (1) of four: in the model, in NO migration, under no other name, created by no raw SQL. Read by object from refs/heads/feature/restaurant-modules 8e2b57de, never the stale meals-grace-pins checkout.
Controls that could fail: AccountingSummaries 47 migration files; Workforce/Meals/Training AuditEvents 13 each.
Strongest check: 200 DbSet types vs 205 snapshot entities, diff = exactly ONE absent, GrowthAuditEvent.
No partial artifact, unlike F-ACCT-DUP: no CreateTable, no CreateIndex, no trigger, no THROW 50074.
AFFECTED: chain-built DBs lack it (prod/okamtest/okam_local/demo - applied by ef database update, no
Database.Migrate in app code); model-built test tiers have it via 170 EnsureCreated sites, which is exactly
why a green suite cannot see it. NOT live exposure - Growth tables are not deployed yet.
RUNTIME: writer only Adds; the CALLER's SaveChanges commits it in the same unit of work as the business
mutation, so SqlException 208 rolls the whole change back - FAIL-CLOSED, not a silent skip. 6 write sites,
all reachable (5 services DI-registered, 4 controllers). 3 presentations: 4 clean 500s; consent-text publish
returns a FALSE 409 "published concurrently, retry" that can never succeed; dispatch throws a masking
secondary InvalidOperationException - both catches untyped on SQL error number, reported not fixed.
REMEDY: tip 20260731220005_Workforce_IdentityCodeRegisterIssues (re-verify, 6 lanes live); 10 cols, StoreId int NULL no FK, OccurredAt datetimeoffset NOT sibling DateTime;
TWO non-unique indexes (siblings' single composite is wrong here); AFTER trigger THROW 50074 free, but ledger's "highest 50073" is wrong for this branch (actual 50060).
No backfill - new table, C1 bars it. NO MIGRATION WRITTEN, nothing edited, no container. Tracked as MIG-22.
END RETURN
```
