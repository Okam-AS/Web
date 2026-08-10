```
RETURN: L-MIG-STACK-MERGE
brief: 1e6dd89c
verdict: built
evidence: lanes/L-MIG-STACK-MERGE/evidence.md
log:
Tip integration/mig-stack-merge 7f8945dc, 0 behind / 38 ahead of feature/restaurant-modules (UNMOVED at 8e2b57de): a clean fast-forward. Nothing pushed. Read at refs, braced.
Real code merge: 145 files, 19 in Migrations/, 126 outside, no Meals services. Only 2 files conflicted. Build 0 errors at the merge commit - that is the proof the 126 merged coherently.
artifacts/tests/README.md by UNION: 19 + 17 rows, bb82b3a0 common, 29 out = exact set union, checked by comm both ways. Neither side's ORDER moved; its paragraphs assert order.
MIG-22 claimed twice. The landed migration (Margin 20260801084923) keeps it. Growth_AuditLedger had no file, so it RE-PARENTED to MIG-29 - deliberately not to the next free 28.
MIG-28 is reserved for lane/finalize-index-or-a-reason, which named it and made no ledger edit on purpose. That edit is made here, naming its new Designer parent 20260803093235.
Also re-parented: the 2 live pointers the renumber would have left stale. The 3rd sits in another lane's receipt and is NOT edited - recorded in the ledger as a fact instead.
Duplicate FILE per keep-23f6bbeb: a6a1174b's 20260731203011 is an ancestor of neither side, so excluded by construction - written down anyway, since construction stops no future merge.
Verified: 136 migrations, no duplicate id or name, one FinalizedImmutable, Designers paired. Timesheet services registered once; the 3 multi-registrations are fan-ins identical to INT.
REPLAYED FROM EMPTY on a real catalog, not the model: all 136 applied to an empty DB and rolled back. MIG-7's SQL tests, recorded as never executed anywhere, have now executed.
THREE JOIN-ONLY DEFECTS CLOSED. A census suite (INT-only) met WorkforceTimesheetsController (stack-only); that route had no wire test anywhere. Now driven to a 200, actor by value (C4).
A comment saying BrowserReadableHeaders was "on an unmerged lane" went false. Corrected to the worse fact: X-Okam-Content-Sha256 is unexposed, the sibling Meals digest is. Fix NAMED, not made.
The token flake the landing predicted would keep failing merges did. Fixed as specified, proven able to red by mutating the PRODUCT, restore checked by binary CONTENT not mtime.
SQL 565/22/587 at the tip, fast 4703/0/10. ZERO of the 22 are mine: the 19 failing classes re-run at 8e2b57de give an IDENTICAL set, 21/21; the 22nd class is absent from INT. Control committed.
First SQL run at any SHA carrying INT's last 5 days. 20 reds are GrowthAuditEvents (in the model, in no migration); 5 show NEWSLETTER DISPATCH BROKEN ON ANY CHAIN-BUILT DB.
Cause: catch(DbUpdateException) reports a missing table as a lost race. Last red: one publish writes TWO outbox rows. Not fixed - both are INT's, and fixing here hides 5 unmeasured days.
END RETURN
```
