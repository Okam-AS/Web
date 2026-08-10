```
RETURN: L-EMPREF-WIDTH-OR-A-RULING
brief: 89818c93
verdict: built
evidence: lanes/L-EMPREF-WIDTH-OR-A-RULING/finding.md
log:
NOTHING TRUNCATES — zero values, every path. Normalize refuses >64 with a 400 before EF sees it, pinned by A_reference_longer_than_the_column_is_refused_rather_than_silently_truncated.
F-MIG17's premise is false at tip AND stack: 64 gives a REFUSAL BAND of 65-128, loud and recoverable, not a permanent truncation. RECOMMEND rule 64 acceptable, with the finding's 4 risks recorded.
Two doors, both normalize (MealsCompanyService.cs:117, MealsMembershipService.cs:209); claim copies verbatim from an already-bounded column. No import, seed, script or raw SQL writes it.
MEASURED: longest the product itself writes is the 36-char GUID fallback; longest a company may supply is exactly 64; every identity format still accepted after the sibling's narrowing is <=16.
The frozen line is 256 (MemberDisplayRef, Initial.cs:330) taking a 64-wide source, so it cannot truncate on arrival. Neither MealsMemberships nor MealsInvitations has a trigger: wrong table.
The 128 is the LEDGER'S own, not the spec: §13.3 names no width. Model and chain agree at 64 — doc-vs-code, not C2. Cheap close: 128->64 in both copies. Out of family is really 256, the house width
WIDENING COST: metadata-only AlterColumn x2 (no index/constraint, proven by the SQL arm), but Down() turns DESTRUCTIVE once 65-128 values sit on frozen lines — it manufactures the C1 hazard.
Slot is held: D-INTEGRATION-FASTFORWARD ruled author-a-merge-lane today, and tip 127 vs stack 136 parents a new migration 9 behind. Plus the contended snapshot and 7 hard-coded sites.
NOT MEASURED, said so: DB behaviour if Normalize were bypassed — no SQL slot. Nothing authored, changed or run, no container. Read braced at 8e2b57de and 4b37f81b, never the checkout.
END RETURN
```
