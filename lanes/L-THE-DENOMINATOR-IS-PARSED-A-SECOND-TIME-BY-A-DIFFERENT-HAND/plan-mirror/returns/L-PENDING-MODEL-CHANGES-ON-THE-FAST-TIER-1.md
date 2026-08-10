```
RETURN: L-PENDING-MODEL-CHANGES-ON-THE-FAST-TIER
brief: f3c5ba50
verdict: built
evidence: docs/plan/lanes/L-PENDING-MODEL-CHANGES-ON-THE-FAST-TIER/NOTES.md
log:
Base integration/mig-stack-merge 7f8945dc6; 8e2b57de is its ancestor, 38 behind (measured). Own worktree wt-pendmodel; OkamAPI-modules untouched.
Scoping claim re-measured and exact: 17 lineage suites, ALL 17 [Trait("Database","SqlServer")], 15 assert HasPendingModelChanges, none under Kassa/Tripletex.
Built WebApi.Tests/Modules/ModelVersusChainDriftTests.cs, no Database trait, 6 tests, ~5s, committed detached at 66f19e236 (no branch, no push).
No round-trip PROVEN not argued: unroutable Server=127.0.0.1,1 plus a DbConnectionInterceptor that throws on open; every test asserts 0 attempts.
Scratch-tree red proven by an edit: one HasIndex in OnModelCreating, no migration -> reds naming IX_ScratchTreeRedProof_...; 5 others stayed green; restored, rebuilt, green.
Fast tier baseline I measured myself at 7f8945dc6: 0 failed / 4703 passed / 10 skipped. With the check: 0 failed / 4709 passed / 10 skipped. Delta +6, all six mine, all Passed in the trx.
FINDING the check makes machine-readable on arrival: GrowthAuditEvents + its 2 indexes are in OnModelCreating and in NO migration and NOT in the snapshot.
That is MIG-29 in PENDING-MIGRATIONS-LEDGER.md, already recorded in prose at this merge; parked here by exact operation text, with a test that reds when MIG-29 lands.
Park shape copied from ModelIndexShadowSweepTests (08309e39): defect record, not exemption; it self-retires. A bare Assert.False would ship a permanently red gate.
SPEC CORRECTION: the check diffs model vs SNAPSHOT, never vs migration operations. AccountingSummaries was in the snapshot, so it would NOT have caught that one once regenerated.
MIG-7's own summary proves it: the snapshot already claimed the end state and ef migrations add emitted an empty Up. Tripwire at introduction, not a chain audit; said in the file.
Derived NOT run (no SQL slot): all 15 SQL-tier HasPendingModelChanges assertions are red at this commit for this one cause.
My own first draft was the estate's failure shape: a catch turned a throw into a string and the probe assertion passed on it. Only the FULL assembly exposed it, never the single class.
Cause: EF finalizes/initializes the snapshot model in place inside HasPendingModelChanges, so the diff worked only on a warmed context. Fixed both orders; pinned by a test.
No migration authored, no container started/stopped/entered, no npm, no git stash, no git add -A, no push, no shared ref moved; worktree clean apart from the committed file.
END RETURN
```
