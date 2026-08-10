```
RETURN: L-TENDER-WIRE-MERGE-IS-SAFE
brief: 48cb3ba6
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-TENDER-WIRE-MERGE-IS-SAFE/evidence.md
log:
MERGE (OkamAPI, throwaway worktree+ref): fb522bdd utlkvit-family base <- lane/meals-pos-tender-wire 32fd5a86 => d5033c40, ort strategy, ZERO conflicts, 8 files, 662+/2-.
COUNT at d5033c40: exactly ONE definition, Services/Kassa/KassaCreditSale.cs:25 IsCreditSale(JournalEntry). Six call sites, each passing a journal entry. Merge is safe as claimed.
Seventh twin (32fd5a86 FinalizeService.cs:237, off the request list) absent; 0 of 216 non-ancestor branches hold it. PosSettlementService.cs:392 reads a request but WRITES that line.
Merge onto tip 8e2b57de (OkamAPI): Already up to date. The lane is 0 ahead/61 behind and ALREADY LANDED by true merge 21f79514 (2026-08-04, two parents). It should land, not be held.
Reachability real: fb522bdd PosSettlementService.cs:380 threw "Unsupported payment type"; 8e2b57de:392 calls AuthorizePointOfSaleTenderAsync with an operator actor. C5 walk still owed.
NOT two carriers, ELEVEN. Simulated all 215 outstanding landings onto the tip: 111 clean merges yield 1 definition each; 104 conflict; 11 results hold 2. Tree-keyed count is 95, wrong question.
The eleven (OkamAPI): feature/restaurant-control-stage0, prep/meals-w3-landing, lane/meals-w3-fiscal, lane/a1-store-country, lane/a2-growth-flake, lane/a3-tx-gate,
lane/a5-events-w4, lane/a6-meals-minors, lane/b1-training-w3, lane/b2-wf-exchange, lane/b3-wf-timesheets. All share merge-base 2431883d (2026-07-17), which holds no predicate at all.
FINDING that corrects the flag's own correction: for those eleven a PLAIN merge re-adds the private predicate AUTO-MERGED, outside any marker. Only MasterData.cs:112 conflicts; the
definition arrives at line 199 unshown, because the base predates it so the tip's deletion has nothing to apply to. git cherry: none of their commits upstream — pre-fork heads, ported.
C4: the predicate gates BuildDeliveryEntry(entry, operatorId, operatorName), the operator-stamped append-only UTLEVREC row for § 2-8-7. The private copy also lacks the entry != null guard.
SHAPE this estate uses = whole-blob resolution. Web-modules f1d177f (2026-08-05) says "Taken from c4a4fa44 (twin B), whole-blob" on the invoice money gate, and c4a4fa44 is NOT an
ancestor of the candidate tip — content without the commit. Web-modules d320105 was cherry-picked onto tip 9f7d8df. Compose branch: 69 of 123 first-parent commits are non-merge.
Replacement clears_when text plus the eleven-name body sentence are in evidence.md section 7; the flag should drop the rebase demand and gate on the predicate count at each landing.
CLEANUP: worktree wt-tendermerge and both throwaway/* branches removed. No push, no shared-branch commit, no container, no SQL, no migration, no stash, no npm.
END RETURN
```
