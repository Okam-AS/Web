```
RETURN: L-RECEIPT-PAYER-LINE-LOCATE
brief: 4ebf9509
verdict: built
evidence: lanes/L-RECEIPT-PAYER-LINE-LOCATE/finding.md
log:
LOCATED at Services/ReceiptService.cs:152 (PaymentTypeLabel); blank = :176-177 default: return string.Empty. Ref feature/restaurant-modules@8e2b57de, read via git show. No fix made: class analysis.
CONFIRMED, but SIX not five. 17 enum values, 11 labelled; blank = NotSet(0) Giftcard(75) PayInStore(100) Cash(110) DinteroTerminal(450) WoltMarketplace(500). The prior lane omitted NotSet.
SIX PRODUCIBLE: Cash/DinteroTerminal <- PosSettlementService:726 (dominant OrderPayment :321/:386); PayInStore/Giftcard <- PaymentService:217/229 -> CartService:645; Wolt <- WoltService:887.
NOTSET IS NOT TRANSIENT: PosSettlementService:576-578 - a 100%-comped order settles with no tender and order.PaymentType stays NotSet, so a completed journalled sale prints a blank payer line forever.
NONE IS DELIBERATE: CompanyAccountClassificationTests:41-57 already calls the empty default a defect and closed it for one value only; it is the only assertion anywhere over PaymentTypeLabel.
NOT A KASSA ARTIFACT, framing corrected: the fiscal receipt uses EscPosReceiptBuilder:315, whose default returns the enum name and never blanks. The blank is on the emailed PDF only; C6 not breached.
Prior lane's citation WAS right: L-PAYMENT-LABEL-UKJENT/mutation-log.md:173 reads Services/ReceiptService.cs:152; Services/Kassa/ is only at plan.md:20648. Adjacent: EscPos lacks a CompanyAccount arm.
END RETURN
```
