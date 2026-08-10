```
RETURN: L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK
brief: dda9ee5d
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/lanes/L-THE-CREDIT-SALE-SUITE-REACHES-THE-TRUNK/asserting-tests.txt (34 trunk tests asserting the capability, all passing, extracted by name from trunk-non-sql-tier.trx beside it)
log:
UNLANDABLE: lane/meals-xz-credit @ 25586d86b is superseded on X/Z, conflicts on two points, and reaches one surface the split did not. Trunk untouched at d30c1c4d4, nothing merged.
Checked against the decisions: L-MEALS-XZ-CREDIT carries no gate, and D-MEALS-CREDIT-ACCOUNT gates a Tripletex receivable column and its migration, not this presentation.
Non-SQL tier from WebApi.Tests/ at the trunk: 5037 passed, 0 failed, 11 skipped, 5048 total; WebApi.dll mtime moved.
The trunk landed 57865601b after this branch forked - the received-money rule at the model, PaymentMeansTotal.IsReceived, computed so PaymentTotalsJson needs no change.
The suite cannot compile there at all: it reads CreditSalesCount, CreditSalesAmount and CashSalesAmount, none of which exist on the trunk.
CONFLICT 1: the branch adds a builder-private label table whose printed text disagrees with the shared PaymentTenderLabels on Dintero, NotSet and PayInStore.
Landing it reds The_receipt_and_the_XZ_report_name_a_tender_identically and changes words on a fiscal document - the shared helper exists to prevent that second table.
CONFLICT 2: a day with no credit sale. The trunk prints no section, the branch prints "herav kredittsalg (0)", and both argue it in comments. That is a reading of § 2-8-2, not a merge decision.
The record is TRUE about the capability and FALSE about its evidence. 34 trunk tests assert it, all passing, named from a trx.
EscPosXZCreditSaleTests 5, EscPosXZReportBuilderTests 4, EscPosPaymentLabelTests 22, CompanyAccountClassificationTests 3. The lane instead cites an unlanded worktree path no stranger can open.
Five of those sit in a SECOND class inside the builder's test file; filtering on the file's first class name hid them and I nearly reported them missing. The trx was right, my filter was not.
NOT SUPERSEDED: EodService buckets PaymentType.CompanyAccount into its default arm, so the end-of-day close counts a credit sale as takings and prints it under "Annet".
Reachability closed rather than inferred: PosSettlementService:445 writes the CompanyAccount OrderPayment, FinalizeService:224 copies it into a JournalPaymentLine, EodService sums it into other.
EodSummaryModel carries CashTotal, CardTotal, OtherTotal and no credit bucket; nothing in the EOD service or models names credit. Credit returns exist only on the branch.
Recommend repointing L-MEALS-XZ-CREDIT's evidence at the 34 trunk tests, and a new lane for the EOD credit bucket written against IsReceived rather than replayed from this branch.
END RETURN
```
