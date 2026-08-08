```
RETURN: L-THE-PRINTED-RECEIPT-NAMES-ITS-TENDER
brief: 5a01a7d0
verdict: built
evidence: /Users/svendaneel/okam/wt-printedtender/WebApi.Tests/Kassa/PrintedTenderNameTests.cs
log:
BUILT at bcc8bd179 on lane/printed-receipt-names-tender (worktree ~/okam/wt-printedtender), off trunk feature/restaurant-modules@dc0fa8508. Nothing pushed, no container, no SQL, no migration.
BRIEF CORRECTED, not fail-spec: the escpos half WAS built, at lane/escpos-ladder-tender@9990b4bb, unmerged. Merged not reimplemented, so one table serves both and my tip descends from trunk.
PDF HALF WAS LIVE AND IS THE BUILD: ReceiptService.cs:152 returned string.Empty for six producible tenders - NotSet, Giftcard, PayInStore, Cash, DinteroTerminal, WoltMarketplace.
ONE TABLE, TWO REGISTERS: Services/PaymentTenderLabels.cs. Tender is the 32-column roll noun, PayerLine the PDF sentence; each of the 17 declared members has an arm of its own in both.
DEFAULT DECIDED - residual word "Ukjent", not a refusal. It is reachable only by a non-member int, and only after the sale is settled and journalled, so refusing would not un-sell anything.
C6 CUTS THE OTHER WAY: refusing makes a legally required document unproducible when demanded. "Ukjent 42,37" discloses the amount and admits the tender is unknown; a blank page discloses nothing.
ZERO WORDING DRIFT, checked: the 11 existing PDF sentences are byte-identical to the tip. The six new quote orders_paymentGiftcard/PayInStore/Wolt/Card, "Tilbakebetales kontant", pos_refund_na_nopay.
NEGATIVE CONTROL IS THREE RUNS. A, ReceiptService alone at trunk: 9 failed, naming each of the six with Actual blank. B, both escpos builders alone at trunk: 3 failed, Actual "NotSet" and "9999".
C, all three production files at trunk with `git diff dc0fa8508 -- Services/` EMPTY: 9 failed / 13 passed / 22. Both defaults red in one run; fix restored, 22/22 green.
THE CROSS-EMITTER CHECK IS THE POINT: The_two_documents_group_tenders_identically compares the registers as set-partitions, and reds because the PDF collapsed all six blanks into one group.
WIRE LEVEL, not rendered text: the roll label is read off printed ESC/POS bytes, the PDF off ReceiptModel.Receipt.PayedWith via GetReceiptModel on Sqlite-in-memory - the field handed to the renderer.
A GUARD CAUGHT A REAL REGRESSION I INTRODUCED: importing WebApi.Services.Kassa made ReceiptService POS-owned to QueryFilterCallSiteTests, so its correctly filtered Orders query became an offender.
The table moved out of Kassa rather than the guard being taught an exception - allowlisting would have written the misclassification down as a fact. Behaviour identical; recorded in the class comment.
FAST TIER Database!=SqlServer at bcc8bd179 on a clean tree: 4803/0/10/4813 against baseline 4759/0/10. Delta +44 = 22 merged EscPosPaymentLabelTests + 22 mine (17 theory cases + 5 facts).
C5 OWED, plus a hazard: every line above is a suite result, Sven's gate is a real sale per tender. A test run dirties artifacts/journeys/ev-dietary/run-sheet.* - it swept into a commit once, stripped.
END RETURN
```
