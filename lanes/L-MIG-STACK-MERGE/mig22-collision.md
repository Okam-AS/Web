**MIG-22 was claimed twice, and the claim resolved here is a ledger claim, not a second migration.** This
merge brought together two copies of this file that had diverged for three days. The integration copy had
`MIG-22 = Growth_AuditLedger` (`bd3a840f`, 2026-08-03), the chain copy `MIG-22 = Margin_PeriodStatementFinalizedImmutable`
(`d6b0630f`, LANDED as `20260801084923`), each author blind to the other. **The landed migration keeps the
number** — this plan's own rule is that a migration file on a branch is a claim and a ledger entry is a
reservation, and only one of these two has a file. Growth's reservation is renumbered to **MIG-29**, below.
It is renumbered to 29 rather than to the next free 28 because **MIG-28 is already spoken for**: see the
reservation immediately above.

