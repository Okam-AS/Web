```
RETURN: L-ESCPOS-COMPANYACCOUNT-LABEL
brief: 7fb12172
verdict: built
evidence: lanes/L-ESCPOS-COMPANYACCOUNT-LABEL/finding.md
log:
REF: git show feature/restaurant-modules@8e2b57de only (rev-parse + is-ancestor); the working dir is on lane/meals-grace-pins and was not read. Nothing written: no edit, commit, push, container, SQL.
ALL 17 ENUMERATED, 4 LABELLED / 13 RAW. Kontant=Cash, Kort=DinteroTerminal+SurfboardTerminal, Gavekort=Giftcard; the default at :327 returns paymentType.ToString(), i.e. the C# identifier.
THE THIRTEEN THAT PRINT AN ENUM NAME: NotSet PayInStore CompanyAccount Stripe Vipps Dintero DinteroVipps DinteroBillie DinteroKlarna DinteroKravia WoltMarketplace Surfboard SurfboardVipps.
COMPANYACCOUNT IS THE ONLY ONE REACHABLE ON A SALE. PosSettlementService admits exactly Cash(:294), IsTerminalPayment(:351), IsCompanyAccount(:392), throws at :454 — three of those four are labelled.
NOTSET CHECKED NOT CARRIED ACROSS: a comped order has NO payment lines (PosSettlementService:576-580) so Build:155 prints nothing. Silence, not the word — unlike the PDF, which reads the field.
SECOND DOOR: FinalizeService:501/:637 copy request.PaymentType off the DTO with no membership guard, so all 13 plus any undefined int (which prints as a bare number) reach a RETREC payer line.
C6: the document is the § 2-8-7 utleveringskvittering. BuildDeliveryReceipt:502-506 keeps the payment lines precisely because "they name the company account that will be invoiced" — in English.
IN GREEN BYTES: CreditSaleDocumentRoutingTests:95 and DeliveryReceiptComplianceTests:263/279 build a real CompanyAccount job, never assert the payer line; builder suite only uses SurfboardTerminal.
THREE ADJACENTS: EscPosXZReportBuilder:341 is a byte-identical copy so Z reports print it too; SAF-T MasterData:232 (CUSTACCT/12006) and ReceiptService:171 ("Betalt med bedriftskonto") both name it.
END RETURN
```
