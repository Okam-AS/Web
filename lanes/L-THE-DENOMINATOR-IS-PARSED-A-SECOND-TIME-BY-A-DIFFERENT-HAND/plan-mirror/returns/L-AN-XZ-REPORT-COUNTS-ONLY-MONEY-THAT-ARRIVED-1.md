RETURN: L-AN-XZ-REPORT-COUNTS-ONLY-MONEY-THAT-ARRIVED
brief: 612cc3a8
verdict: built
evidence: docs/plan/returns/L-AN-XZ-REPORT-COUNTS-ONLY-MONEY-THAT-ARRIVED-1.md
log:
EXIT CRITERION IS SHORT BY ONE EMITTER, the blocked one. SAF-T is untouched pending D-DOES-A-SAFT-PAYMENT-ELEMENT-ADMIT-A-CREDIT-MEDIUM; the diff confirms zero Saft files changed.
Model: PaymentMeansTotal.IsReceived, computed from PaymentType, so no change to the serialized PaymentTotalsJson and the same answer for rows written before it existed. One rule, every reader.
ESC/POS roll: company-account totals leave Sum mottatt and are stated under KREDITTSALG (IKKJE MOTTATT) with their own sum. It DISTINGUISHES rather than excluding, which is the C6 answer.
TRIPLETEX NEEDED NO CHANGE, AND CHANGING IT WOULD HAVE BEEN A DEFECT. I read the voucher path as asked rather than filtering on the observation that it iterates every medium.
PaymentAccountNumber:295-302 already routes CompanyAccount to CompanyReceivableAccountNumber, so the voucher debits receivables, not cash. A blank refuses the voucher rather than guessing.
A double-entry voucher must carry every medium: filtering that line would leave the revenue credit with no matching debit and unbalance the Z. The SAF-T refusal, reached from the other side.
Six of six mutations red, baseline 9 each run: IsReceived defeated at the model both ways, the received filter dropped, the invoiced list emptied, Sum mottatt re-summing all, the credit total zeroed.
The credit-total mutation SURVIVED the first pass, a real weakness rather than an equivalent mutant: 500,00 prints on the per-medium line too, so a bare Contains passed with the total zeroed.
Fixed by asserting the Sum kredittsalg row on its own line. The mutation found a test that looked right and was not.
I BROKE FOUR PINS I DID NOT WRITE and they were right to break. EscPosPaymentLabelTests.ReportPayerLabel expects one row ending in the payer amount, excluding Sum mottatt as the known total.
My credit section added a second total row, so two matched and Assert.Single failed. A test about tender LABELS detected that I had changed the shape of a statutory document.
Extended the exclusion BY NAME, not to a "Sum " prefix: a prefix would silently swallow whatever total a later section adds, trading a real alarm for a quiet one.
Tier 4985 passed / 0 failed / 11 skipped / 4996 total, exit 0. No abort line above the summary, dll mtime moved, run-sheet restored, worktree clean.
Load gate honoured as a condition the run waits on rather than a number read once: it held twice at 19.40 and 25.88, and cleared itself at 7.65.
Branch lane/xz-received-at-the-model at 67d47d3e7, worktree made with --detach then branched. No branch moved, git branch -f never used, trunk untouched by me. Nothing pushed.
END RETURN
