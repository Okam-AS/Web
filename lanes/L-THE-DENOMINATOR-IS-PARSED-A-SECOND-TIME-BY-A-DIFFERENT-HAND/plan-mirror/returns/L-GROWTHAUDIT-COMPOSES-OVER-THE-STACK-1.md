```
RETURN: L-GROWTHAUDIT-COMPOSES-OVER-THE-STACK
brief: fa1078fd
verdict: built
evidence: docs/plan/reviews/L-GROWTHAUDIT-COMPOSES-OVER-THE-STACK.md
log: COMPOSES. lane/growthaudit-migration (93a52938e) replays over the composed stack: parent id equals tip id, no duplicate object, no rebase needed.
Migration: 20260806125642_Growth_AuditLedger. Declared parent, read from ls-tree chain order on the lane branch: 20260803093235_Kassa_AccountingSummaryDayUniqueIndex.
Stack tip id read from lane/backend-patches-composed (2ba9229fa): 20260803093235_Kassa_AccountingSummaryDayUniqueIndex — identical at integration/mig-stack-merge (7f8945dc6).
Identical because git diff 7f8945dc6..2ba9229fa over Migrations/, ApplicationDbContext.cs and Entities/ is empty: the landed patches carry code and tests only, no migration.
Note: the two refs differ by FOUR commits, not three — d8c98c200, f3817eed9, ea66353f9 plus evidence-only 2ba9229fa (artifacts/ and lanes/ trees only).
Lane branch base = 7f8945dc6 exactly (merge-base), authored against the stack's own chain tip; timestamp 20260806125642 sorts strictly last, so no interleave.
Duplicate-object sweep over Migrations/** at 2ba9229fa: GrowthAuditEvents, both IX_ names and TR_GrowthAuditEvents_AppendOnly absent; THROW 50074 unclaimed (stack tops out at 50073).
Snapshot discipline: the Designer body is byte-identical to the lane's ApplicationDbContextModelSnapshot body (diff clean below the class header).
Lane snapshot vs base snapshot: ONE hunk (2410a2411,2458), 48 inserted lines, zero deletions — the GrowthAuditEvent entity only; entities 427 -> 428; ProductVersion unchanged 8.0.26.
Model-side edits in the lane are comment-only; the OnModelCreating mapping with both indexes pre-exists at the base, so HasPendingModelChanges answers false once the lane lands on either tip.
C2 closure confirmed rather than violated: one author, one new migration, parent = tip, snapshot single-purpose; this lane is the fix for the AccountingSummaries-shaped defect.
Not run: fresh-DB replay (no SQL slot granted). The reading rules out parent-mismatch, duplicate-object and snapshot drift; the author's 593/1/594 SQL-tier figure is cited as context only.
END RETURN
```
