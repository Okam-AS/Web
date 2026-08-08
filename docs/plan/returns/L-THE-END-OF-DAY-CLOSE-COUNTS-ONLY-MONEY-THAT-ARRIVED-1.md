```
RETURN: L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED
brief: (read in full)
verdict: built
evidence: backend feature/restaurant-modules d30c1c4d4 -> bcfe0d893; lanes/L-THE-END-OF-DAY-CLOSE-COUNTS-ONLY-MONEY-THAT-ARRIVED/{before-arm.trx,tier.trx,after-arm-by-name.txt}
log:
LANDED. Trunk d30c1c4d4 -> bcfe0d893 through the atomic guard, which re-read the trunk in the same command as the move and matched its expected base. Nothing pushed.
BEFORE ARM, and it PASSED, which is what makes it evidence the defect was live: a 25000 company-account sale seeded beside a cash sale lands in summary.OtherTotal and prints under "Annet" as takings.
AFTER: non-SQL tier from WebApi.Tests/ reads 5040 passed, 0 failed, 11 skipped, 5051 total - exactly +3 on the 5037/5048 baseline. WebApi.dll mtime moved.
All three asserted by name from that trx, never a console log: ..._IsStatedApart_NotCountedAsTakings, ..._ACreditReturn_NetsAgainstTheCreditTotal, TheCloseAndTheXZReport_ReadTheSameReceivedRule.
The exit's falsifiability clause: putting CompanyAccount back into the switch's default arm reds 2 of EodServiceTests' 14.
A second mutation, making PaymentMeansTotal.IsReceived stop reading the shared predicate, reds exactly 1 - the test that pins both surfaces to one rule.
ONE definition, as asked. PaymentTypeExtensions.IsReceived now sits beside IsCompanyAccount, and PaymentMeansTotal.IsReceived delegates to it instead of restating it in its own words.
That restatement is how the two documents came to disagree about one sale, so the third test walks every PaymentType and asserts the report model and the extension answer identically.
Distinguish rather than exclude, following the X/Z: the invoiced sale leaves the takings totals and is stated as CreditTotal, printed "Kredittsalg (faktureres)" beside Kort and Annet.
THE ZERO-CREDIT QUESTION IS FORCED AND I DID NOT SETTLE IT. The row prints unconditionally because this document's own rows do - Kort and Annet both print at zero - and the comment says exactly that.
So the row's presence at zero rests on the close's own convention, not on a reading of § 2-8-2. Rule it toward omission and the row becomes conditional; nothing else in the change moves.
Credit returns net against CreditTotal rather than against takings: a refund of a sale the drawer never held must not make the drawer read short.
C2 clean - CreditTotal is a response-model field, not an entity, so no migration. C7 scan of the diff found nothing. C3: the figure reaches CashDrawerController and the printed close.
Checked against the decisions: D-MEALS-CREDIT-ACCOUNT gates a Tripletex receivable column and its migration, not this presentation. Nothing was replayed from lane/eod-credit-split.
Ran beside another lane's tier program only once load read 5.27 against the gate of 13, having been 21.99 twenty minutes earlier. No container started. Worktree removed.
END RETURN
```
