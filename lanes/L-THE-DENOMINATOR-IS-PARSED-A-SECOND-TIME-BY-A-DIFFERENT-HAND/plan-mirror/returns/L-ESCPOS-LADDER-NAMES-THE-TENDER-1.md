```
RETURN: L-ESCPOS-LADDER-NAMES-THE-TENDER
brief: f801ec4f
verdict: built
evidence: lanes/L-ESCPOS-LADDER-NAMES-THE-TENDER/finding.md
log:
BUILT at 9990b4bb on lane/escpos-ladder-tender (worktree ~/okam/wt-escposladder off tip 8e2b57de, read via git show; the lane/meals-grace-pins checkout was never read). Nothing pushed.
ONE TABLE, NOT TWO LADDERS: new Services/Kassa/KassaPaymentLabels.cs; the character-identical private copies at EscPosReceiptBuilder:315 and EscPosXZReportBuilder:341 are deleted, both call it.
ALL 17 MEMBERS HAVE AN ARM. default is reachable only for a non-member (FinalizeService:501/:637 bind the return DTO unguarded) and prints "Ukjent", not the bare number ToString() gives.
NO WORDING INVENTED: WrappedService.GetPaymentTypeName gives 12 and agrees with ReceiptService.PaymentTypeLabel on all 12; CompanyAccount -> Bedriftskonto (ReceiptService:171, SAF-T 12006).
NEGATIVE CONTROL IS A RUN: same test, only the two builder edits stashed = 14 failed / 8 passed / 22, naming twelve members plus Expected Ukjent / Actual 9999. With the fix restored, 22/22.
THE THIRTEENTH, STATED: Vipps's Norwegian name is byte-identical to its identifier (the PDF and WrappedService both print it), so no output test reds for it; the residual assertion proves its arm.
GUARD FOR THE NEXT ADDITION: a member with no arm falls to Ukjent and reds; the expectation table reds until its Norwegian word is written. The test names no new type, so it runs on an old tree.
SUITE, container-free, both runs in this worktree: base 8e2b57de 4638/0/12/4650, mine 4660/0/12/4672 - delta exactly the 22 new tests. No container started or touched, no SQL, no migration.
C6/C5: the § 2-8-7 payer line now reads "Bedriftskonto 125,00", the Z "Bedriftskonto (1)"; roll.txt is the paper for @sven. NAMED NOT FIXED: ReceiptService:152 still blanks six on the PDF.
END RETURN
```
