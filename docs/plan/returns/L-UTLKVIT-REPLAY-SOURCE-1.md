```
RETURN: L-UTLKVIT-REPLAY-SOURCE
brief: e7ad729e
verdict: built
evidence: commit 3a509b68 on lane/utlkvit-replay-source (worktree /Users/svendaneel/okam/wt-utlkvitreplay); base 1a03bc6c fast tier 4366 passed / 0 failed / 12 skipped / 4378; after 3a509b68 fast tier 4368 / 0 / 12 / 4380
spec_gap: brief UNDERSTATES reachability - it calls the drift defensive, but the short-circuit is only reachable after a crash between the journal commit and its caller's SaveChanges, and in that window the settlement is still Open and the order still not Completed, so the operator can AbortAsync, OpenAsync a fresh settlement and re-tender differently before retrying; a drifted list is the recovery path's normal case, not a caller bug
needs: +L-UTLKVIT-REPRINT-KIND
reason: n/a
log:
1 Brief CONFIRMED at Services/Kassa/FinalizeService.cs:237 (was `payments.Any(IsCompanyAccount)`).
2 JournalService.RunAppendTransactionAsync commits and RETURNS at the findExisting hit, so afterAppend never runs on a replay - both directions land.
3 Target code is NOT in OkamAPI-modules (that worktree is on lane/meals-grace-pins and runs a live WebApi at bin/Debug/net8.0). It exists only on lane/meals-utlkvit @1a03bc6c, unmerged. Branched off that instead of disturbing either.
4 Fix: KassaCreditSale.IsCreditSale(JournalEntry) lifted out of the SAF-T export's private surface; finalize and export now share it. It takes an entry, so a payment list cannot be passed in its place.
5 Post-append the handover lookup is unconditional and the classification reads receiptEntry - the appended entry, existing or new. Pre-append it reads `entry`, which IS the record about to be written, so the fresh path is unchanged.
6 Two pins in DeliveryReceiptComplianceTests: credit sale replayed as cash still hands over its utleveringskvittering; cash sale replayed as company account still hands over its salgskvittering and journals no 2-8-7 document.
7 Non-vacuity: reinstated the caller's-list read, rebuilt (WebApi.dll 17:20:55 > sources), 2 failed / 9 passed - only the new pins caught it. Restored via cp + touch, rebuilt (17:21:50 > 17:21:30), 11/11 green.
8 C1 no journal row is edited (reads only); C4 the appended delivery entry still names operator id + name; C6 the document emitted now equals what the appended entry supports, neither widened nor narrowed; C7 nothing logged.
9 No migration authored, no container started, no push. Container-free tier only.
10 RESIDUAL (out of scope, hence needs:): PosReceiptService.BuildReceiptAsync derives the kind from entry.ReceiptType alone, so the SALREC of a credit sale reprints as an unmarked "Salgskvittering" via GET /pos/receipt/{id} and the print endpoint. BuildDeliveryReceipt leaves model.JournalEntryId as the SALE's id and only DeliveryJournalEntryId addresses the 2-8-7 document, so a client reprinting from the natural field gets the wrong paper. Unpinned client contract.
END RETURN
```
