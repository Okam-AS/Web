RETURN: L-READ-THE-INSTRUMENT-AND-THE-UPSERT
brief: cb3d951b
verdict: built
evidence: docs/plan/reviews/L-READ-THE-INSTRUMENT-AND-THE-UPSERT.md
log: verdict clean on both lanes; every load-bearing claim checked against code, node_modules bits, schema and callers; no change found that does not do what it claims
coverage probe re-run in a throwaway worktree at 52dd348: 5/5 green as committed; reverting only jest.config.js:45 to 'vue-jest' reds all five with the exact missing-marker shape; restored green
seam verified: column-0 probe defect real in vue-jest 3.0.7; wrapper offset matches the call site; jest 26 4-arg signatures match; source-map 0.5.7/0.6.1 skew benign; pad:true line alignment confirmed
SFC shapes: 8 lang=ts (tsconfig sourceMap:true feeds the TS map to babel), 0 script-setup, 0 src=, 2 no-script; each shape either fixed or byte-identical to prior behaviour
no contradiction with L-COVERAGE-MEASURED-PER-MODULE: the 762/1166 vs 762/1169 baseline gap is exactly the three layouts/*.vue that only the upstream's widened run (b) collects
F1: the 12.0s to 8.3s suite speedup is asserted, never explained; likely jest transform-cache warmth; the evidence owes that sentence — a cold CI run will not reproduce it
role-upsert probe re-run at 1f0bc9cc0: UpsertRoles 6/6 green; the name-key mutant, rebuilt, reds exactly the two tests the evidence's mutation table names; restored green
the exclusion is the right way round: IndexLiveRoleName skips any EffectiveToUtc.HasValue row, so the name path can never reach a stamped role; only id-addressed writes clear a stamp, by design
retire-not-delete argument sound against the schema: WorkforceRole absent from GuardAppendOnly, the three Restrict FKs verified, timesheet lines carry no RoleId; recorded sequence safe as written
caller claims verified: roles page omits roleId on create, the seed never sends one; CommitAsync replays only on the same key; the 404 precedes the reservation
observations: concurrency stays open until the deferred filtered unique index (uncreatable while store-1 twins live); the e2e fixture still models the old contract (cited :1472, actually :1604)
nits: evidence red-proof line numbers stale by two fixture comment lines; commit message reuses upstream 304/1169 beside its own 301/1166 without the layouts reconciliation
both throwaway worktrees removed after use; no full tier, no container, no ports touched; both repos' checked-out branches untouched
END RETURN
