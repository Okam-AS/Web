### MIG-28 `Kassa_FinalizeLookupIndex` — RESERVED, and its parent changed under it in this merge

`lane/finalize-index-or-a-reason` @ `5e53de83` holds this migration, authored as `20260805160524` and
parented at `20260731220005_Workforce_IdentityCodeRegisterIssues` — the chain tip on
`feature/restaurant-modules` at `8e2b57de`, which **this merge has just moved nine migrations forward**. That
lane deliberately wrote **nothing** into the ledger: the copy it could see did not yet contain MIG-23..27, so
minting MIG-28 there would have manufactured the very collision the number is meant to prevent. It named the
number and left the edit here. **This is that edit.** MIG-28 is reserved for it and for nothing else.

**What the lane must do before it lands, and it is not a merge.** Its `.Designer.cs` and
`ApplicationDbContextModelSnapshot.cs` describe the model as of `20260731220005` plus its index change, and
must be **regenerated** against this merge's chain tip, `20260803093235_Kassa_AccountingSummaryDayUniqueIndex`.
Merging those two snapshots textually is the failure this ledger exists to stop — the id sorts last either
way, so nothing warns and the break appears only on a database replayed from empty. Two things travel with
that regeneration:

- `ef migrations add` on this tree **will fold in `CreateTable GrowthAuditEvents`**, because the entity is in
  `OnModelCreating` and in no migration (see MIG-29 below, and the pre-existing-drift note in the status block
  at the top of this file). Strip it from the migration **and from both snapshots**, exactly as that lane did
  the first time — it is MIG-29's, it owes a trigger this migration knows nothing about, and folding it in
  would put two ledger entries on one migration.
- `lane/ef-index-shadow-sweep` @ `08309e39`, one commit above this merge's stack parent, holds a `Parked`
  entry keyed `JournalEntry [CashPointId, OrderId]` in `WebApi.Tests/Modules/ModelIndexShadowSweepTests.cs`
  that **re-derives itself and reds the day this fix lands**, by design. Neither branch is in this merge, so
  the entry could not be deleted here; whoever lands the two together deletes it in that commit.

