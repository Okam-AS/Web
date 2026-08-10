```
RETURN: L-WF-ADJUSTMENT-ORDINAL
brief: d64e4956
verdict: blocked
evidence: lane/wf-adjustment-ordinal @ cff1c005 (worktree /Users/svendaneel/okam/wt-wfadjord, local only); MIG-26 = Migrations/20260802151208_Workforce_TimesheetAdjustmentOrdinal.cs; ledger entry docs/plans/PENDING-MIGRATIONS-LEDGER.md
spec_gap: none blocking. Two brief numbers were stale, both measured: the stack is SIX migrations past the branch tip, not five (MIG-25 landed after that count was taken); and the correct/over-correct/correct-back example does NOT repeat a digest here, because the rendered file carries approvedAdjustments and that count only grows. The conclusion the brief draws from it survives - a digest repeat is real and legitimate, it just needs TWO lines. Tests build the real case; ledger corrected.
needs: +F-SQL-HEADROOM
reason: The three SQL-tier tests are written, compile, and are UNRUN. Measured inside the Docker VM, not inferred: 1114 MB available of 7837, swap 1018/1024 consumed. A sixth SQL container needs 1.3-1.4 GiB and would have OOM-killed four other lanes' live worlds. Everything container-free is done and green.
log: Ledger verified contiguous MIG-1..25 and MIG-26 unclaimed on every branch and worktree - claimed before authoring.
Topology measured with git, not trusted: merge-base 968fd273, tip and stack DIVERGED (22 commits vs 23), stack carries six migrations the tip lacks. Authored on the stack.
Designer parents the chain tip 20260802103646 and differs from it by one property, one index and its own [Migration] attribute - nothing else. has-pending-model-changes clean (C2).
THROW ceiling re-grepped from this tip: 50073 still highest. A unique index refuses with 2601, so NO throw number is claimed.
Column + unique index (StoreId, TimesheetPeriodId, ProviderKey, Ordinal), UNFILTERED - unlike MIG-25, this table has no failed rows to exempt, so the squash gains no fourth filtered index.
The index alone is not the fix. "Differs from the LAST adjustment" is a comparison against one moving row, so it lives in the service; the ordinal is what stops that row being stale.
UNDERSTATED IN THE BRIEF: the same window also produced a NON-race defect. The delta is diffed against the frozen lines, which never move, so before this lane the third, fourth and fifth call to endpoint 29 each wrote another byte-identical correction. Deterministic, reproducible on SQLite, recorded nowhere.
Exit criterion met in code and asserted on the SQL tier; UNPROVEN by execution. Fast tier proves the halves it can reach.
Fast tier 4365/0/7 at cff1c005, against 4362/0/7 measured at base 3a4442a7 by L-WF-EXPORT-DUPLICATE. Delta is exactly the three new fast-tier tests; the three SQL ones carry the trait and are excluded.
Three mutations, each red at exactly the intended test and restored with cp+touch (mtime trap): delete the digest comparison -> repeat test red; pin the ordinal constant -> sequence test red; kill the SQLite fallback branch of IsAdjustmentOrdinalViolation -> predicate test red.
That third pin is deliberate cover for the unrun tier: it proves on SQLite that the index is real and that the 2601/19 mapping matches, so an unmapped violation cannot become a silent 500 while only SQL Server could have caught it.
Never ran any migration against any database - no dotnet ef database update at any point. No secrets touched. C1/C4 held: DDL only, no backfill, actor asserted non-blank on every adjustment row.
NOT MINE, found en route: the attendance fold picks the latest approved correction by CreatedAtUtc and tie-breaks on a random Guid, so under a fixed clock two corrections to one session resolve at random. Harmless in prod (tick resolution), but it is why a test construction failed until the clock was advanced.
Local commit only, never pushed. Untouched: five foreign SQL containers.
END RETURN
```
