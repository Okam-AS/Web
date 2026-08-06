## ✅ STATUS UPDATE — the nine-migration stack is MERGED into `feature/restaurant-modules` (2026-08-06, `L-MIG-STACK-MERGE`)

**This file had two copies and they had diverged for three days.** `feature/restaurant-modules` and the
landing branch `integration/mig-stack-land` were **59 commits against 34 with neither an ancestor of the
other** — there was no fast-forward to take, and the ledger was one of only two files in the whole merge that
could not be resolved by the machine. The other is `artifacts/tests/README.md`, resolved by union.

**Nine migrations arrive at once**, `20260801084923` … `20260803093235`, MIG-22 through MIG-27 plus MIG-13 and
MIG-21 and MIG-7. The chain tip is now `20260803093235_Kassa_AccountingSummaryDayUniqueIndex` and **every
migration authored from here parents there**, not at `20260731220005`.

**One number was claimed twice and one migration file exists twice. They are different problems.**

- *The number*: MIG-22. Resolved below, against the rule that a file is a claim and a ledger entry is a
  reservation. Growth's reservation moves to MIG-29; **MIG-28 is reserved and is not the next free number.**
- *The file*: `Margin_PeriodStatementFinalizedImmutable` exists as `20260731203011` on
  `lane/margin-finalize-lag` (`a6a1174b`) and as `20260801084923` on the chain. Same name, same DDL,
  **two ids and no `IF OBJECT_ID` guard**, so landing both does not apply the DDL twice harmlessly — the
  second `Up()` fails hard, on a fresh database and never on the author's. Ruled `keep-23f6bbeb` by @sven
  2026-08-05: **keep the chain's file, drop the forked one.** `a6a1174b` is an ancestor of neither side of
  this merge, so the merge excludes it by construction rather than by resolution — and that is exactly why it
  is written down here, because nothing else would stop the next person merging that branch and re-creating
  the collision. Nothing of that author's work dies except the stale id: the whole payload was regenerated on
  the chain tip by `d6b0630f`, whose own MIG-22 entry below documents the supersession.

**Pre-existing model drift that this merge INHERITS and does not introduce.** `bd3a840f` (integration side)
put `GrowthAuditEvents` — a `DbSet` and two indexes — into `OnModelCreating` with **no migration**, so
`has-pending-model-changes` reports pending changes at this merge commit. That is the third instance of the
`AccountingSummaries` shape and it is MIG-29's to close, with the trigger a generator cannot produce. It is
recorded rather than folded in: folding it would put two ledger entries on one migration.

---

