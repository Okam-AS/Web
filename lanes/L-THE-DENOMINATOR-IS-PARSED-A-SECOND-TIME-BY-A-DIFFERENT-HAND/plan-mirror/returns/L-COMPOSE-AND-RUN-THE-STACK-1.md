```
RETURN: L-COMPOSE-AND-RUN-THE-STACK
brief: b3121397
verdict: built
evidence: /Users/svendaneel/okam/wt-composestack/lanes/L-COMPOSE-AND-RUN-THE-STACK/compose-7ac6f2b2-sql-tier.trx
log:
COMPOSED, MEASURED NOT ASSUMED. 24cd4ead (stack tip; mig-stack-land verified its ancestor) x eeb1b8c4 = 7ac6f2b2, first parent the stack. 86 left / 10 right: no fast-forward either way.
FOUR merge bases -- 02c077cb, 6771ba9a, 75e5168c, 86c0f9ae -- a criss-cross, which caused both conflicts. In OkamAPI, not Web-modules. Nothing pushed; both input branches unmoved.
RECEIPTS README BY CONTENT: 29 ours + 13 theirs, 11 shared, 31 written, 0 lost, 0 invented. The 2 family rows sit at the wall-clock position of the SHA each measures, not appended.
SECOND CONFLICT: a 12.3 MB trx whose stage-1 base held LITERAL CONFLICT MARKERS -- git's virtual base from the criss-cross, in no commit. Rename detection put the wrong run in the lane-named file.
By content: -conat-retire.trx holds run a1eae22b, -composition-root.trx ee81d409. Ours would put one run under both names and drop the other, as the stack side had. Both evidence.md agree.
COMPOSITION ROOT DID NOT MOVE: Program.cs byte-identical to 24cd4ead, the family's registration move being below the base. Checked for a double land anyway: IReservationRateLimiter at one line.
One true 3-way merge, GrowthWireSeed.cs: both sides kept, the two same-named members an overload pair one forwarding. Nine files one-sided. No migration or snapshot touched, so C2 is not engaged.
SQL SLOT: measured blocked at 13:58 and 13:59 (foreign mssql up, free pages 1.98 then 1.79 GiB, under the 3 GiB floor). Taken at 14:14 when docker ps was EMPTY and free pages were 6.97 GiB.
THE SQL TIER RAN. 587 executed / 565 passed / 22 failed / 0 skipped, 55m15s, all 95 trait-carrying classes. Not 584 discovered and zero executed. Build 0 errors; fast tier 4752/0/10.
THE THREE PROPERTIES NAMED AS EXERCISED NOWHERE ARE GREEN: AccountingSummaryDayIndex 2/2, EventsSettlementLifecycle 17/17, RestaurantModulesMigrationRoundTrip 1/1 -- the chain replays from empty.
BASELINE MEASURED MYSELF at 24cd4ead, both tiers, separate clean worktree: SQL 587/565/22/0, fast 4713/4703/0/10. Set-against-set on names: SQL 0 added, 0 removed, 0 OUTCOME CHANGED.
All 22 reds therefore pre-date the composition, test for test. Fast delta +49/-0, all Passed, matching the list-tests prediction. L-MIG-STACK-MERGE reached the same two triples independently.
15 REDS = GrowthAuditEvents in OnModelCreating and in NO migration (bd3a840f; ledger MIG-29 unwritten). Proven on the parent: has-pending-model-changes reports changes since the last migration.
6 REDS ARE THAT TABLE REACHING THE PRODUCT: GrowthDispatchService catch(DbUpdateException) reads the failed audit write as a lost race, then FirstAsync on a rolled-back transaction throws.
NEWSLETTER DISPATCH IS BROKEN on any chain-built database; Growth missed the sweep cdb4c66c/13cd9f18 gave Workforce and Meals. The last red is a store-scoped count. Fixes named, none made.
END RETURN
```
