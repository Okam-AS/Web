```
RETURN: L-WF-OPERATOR-UNIQUE
brief: d20c77be
verdict: built
evidence: /Users/svendaneel/okam/wt-wfopuniq/lanes/L-WF-OPERATOR-UNIQUE/evidence.md
log:
BASE IS THE STACK, DELIBERATELY: lane/wf-operator-unique @ c67d0923 off integration/mig-stack-land @ 4b37f81b, wt-wfopuniq, NOT pushed. Read at integration tip feature/restaurant-modules @ 8e2b57de.
WHY NOT THE INTEGRATION TIP: its 127 migrations are a STRICT PREFIX of the stack's 136 (0 removed, 9 added), so the stack tip IS the post-merge tip; 8e2b57de would fork 10 files onto one parent (C2).
RE-PARENTING OWED L-MIG-STACK-MERGE: none while 20260803093235_Kassa_AccountingSummaryDayUniqueIndex stays tip. If the merge drops/renames it, re-stamp my Designer [Migration] id; nothing else moves.
NO SNAPSHOT CONTENTION: hand-authored, not `ef migrations add`. ModelSnapshot UNTOUCHED; Designer BuildTargetModel byte-identical to its parent's (verified). No OnModelCreating, the D1 discipline.
GUARD: 20260806111500_Workforce_OperatorLinkUniqueness -> UX_WorkforceStaffMembers_OperatorLink (StoreId, OperatorId) WHERE OperatorId IS NOT NULL AND IsActive = 1. Both filter halves load-bearing.
IT REFUSES, SHOWN NOT ASSUMED: two concurrent imports of one operator, DIFFERENT Idempotency-Keys, real service composition, save gate at save 2 (1=reserve, 2=atomic commit) -> exactly ONE live link.
REFUSED AT THE DB, NOT THE PRE-CHECK, asserted APART: a pre-check refusal is 200/AlreadyImported; the index refusal is typed 409 conflictKind=operator-link-conflict. Loser's whole batch rolls back.
CATALOG FROM A CHAIN REPLAYED FROM EMPTY: absent at the parent migration, present after mine, is_unique=1 has_filter=1 order StoreId,OperatorId. Mirror, same container: EnsureCreated truth -> ABSENT.
SERVICE CHANGE REQUIRED: without it the loser got a raw DbUpdateException = 500. Added IsOperatorLinkViolation + a second catch arm. Name-only match, no SQLite fallback that no test could reach.
EIGHT MUTANTS, NINE RUNS, EVERY ONE REDS >=1 ARM: M1 no index, M2 not-unique, M3 no IsActive filter, M4 no IS NOT NULL filter, M5b renamed, M6 catch arm off, M7 key order, M8 predicate false.
M5's FIRST TRY WAS EQUIVALENT BY ACCIDENT - reported, not credited: "..._OperatorLinkRenamed" CONTAINS "..._OperatorLink", so substring checks matched, only the catalog red. M5b (_OpLink) reds 3.
M7 IS BEHAVIOURALLY EQUIVALENT: key order changes nothing a unique index refuses. The 2 filter-half tests stay green under M1/M2 BY DESIGN - they assert inserts SUCCEED, guarding against too-strict.
NO REGRESSION MEASURED: container-free 4433/0/10 with changes vs 4433/0/10 at clean 4b37f81b, same worktree. The 5 new tests are SqlServer-traited, so the fast-tier count is unchanged by design.
SQL TIER: new class 5/5; regression over the Workforce SQL collection + RestaurantModulesMigrationRoundTripTests 141/141 - that round trip runs this migration's Down(), the path that never ran.
CONTAINERS: started three (2b06d0e1c75b, 7eddef383f60, b95a69c2e77f), all reaped. A foreign mssql+ryuk pair (12:35, 13:16) is the sibling's, LEFT UNTOUCHED. No migration run outside a local container.
END RETURN
```
