```
RETURN: L-LEDGER-BUILD-STATE-RECONCILE
brief: 493f226b
verdict: built
evidence: lanes/L-LEDGER-BUILD-STATE-RECONCILE/state.md
spec_gap: none
reason: complete
log:
50 entry-instances checked (22 INT copy + 28 STACK copy, 28 numbers) against the 8 pending-epoch migrations on INT=8e2b57de; 317 heads, 0 refs/lanes.
12 disagreements, 4 directions. A: MIG-17 built and marked not-built in BOTH copies - 20260731215452_Meals_MembershipEmployeeReference on feature/restaurant-modules + 146 heads.
MIG-17 rider: built nvarchar(64), both copies specify nvarchar(128); value is company-supplied and immutable after claim, so truncation is unrepairable. Not ruled on.
B: 20260731220005_Workforce_IdentityCodeRegisterIssues on INT, no entry in either copy - and NOT inert: it takes THROW 50018, while INT copy MIG-14 L291 still says 50018 is free. STACK copy already corrected this; the fix is on the forked side.
C (largest, STACK copy only): 10 entries marked LANDED/AUTHORED whose migration is absent from INT - MIG-7/13/21/22/23/24/25/26/27/28. Each true on its own branch, false about INT.
D: reservations with no migration - MIG-6/8/10/11/14/15/16/18/19 both copies + MIG-22-as-Growth_AuditLedger INT only. Confirmed by content sweep over INT's 127 non-Designer migrations, with positive controls.
MIG-23..28 exist only in the STACK copy: the INT copy's ceiling is 6 numbers low, so "next free number" on INT picks 23, already held. MIG-12 clash set up to repeat.
MIG-22 is the only number whose SUBJECT differs by copy (Growth_AuditLedger vs Margin_PeriodStatementFinalizedImmutable) - visible without any ancestry test.
Two precision defects, not status errors: MIG-7's "no CreateIndex on AccountingSummaries at all" is literally false on INT (IX_AccountingSummaries_StoreId, non-unique) though its substance holds; MIG-21's "does not exist" is correct but a unique index on Recipients (not Receipts) is a near-miss for the next reader.
Fork re-derived independently: neither branch is an ancestor, 59 INT-only / 34 stack-only, merge-base 3579bbbc. The 10 Direction-C entries do not arrive by fast-forward.
INSTRUMENT FAULT CAUGHT MID-RUN: first pending-epoch sweep returned zero migrations on INT - the regex demanded 15 digits, ids are 14. Found only by re-running the census's known positive against it. All counts re-derived with literal string compares; known positive AND known negative validated before any negative was reported.
Ledger blobs 91de8393 (INT) / 6a402d2d (STACK), 819 changed lines. Denominators reconcile exactly with L-MIG-NUMBER-CLAIMS (317 heads, 146 carriers of 20260731215452).
Read-only: no ledger edited, nothing renumbered, no migration authored, no commit, no push, no container, no suite. Resolved by object throughout; the backend working tree (lane/meals-grace-pins, 63 behind) was never read.
Sven-coupled: Direction C to D-INTEGRATION-FASTFORWARD, MIG-21/22 to the collision ruling. The only item with a person waiting is MIG-17.
END RETURN
```
