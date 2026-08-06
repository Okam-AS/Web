RETURN: L-ENUM-MIRROR-CENSUS
brief: baf529fc
verdict: built
evidence: lanes/L-ENUM-MIRROR-CENSUS/mirrors.md
spec_gap: core/ needed no initialisation — already populated at 1bcab0b6 here; brief assumed empty
log:
Denominator: 918 files swept, 40 enum declarations, ALL in core/enums/; extractor validated on the
known positive (PaymentType=16). 32 are backend mirrors: 24 EXACT, 8 divergent. 8 not mirrors.
Matched by MEMBER SET against all 177 backend enums at 8e2b57de read by object; name kept as a
separate column. Name-keying would have failed twice: OrderPaymentTypeFilter -> PaymentTypeFilter
(no such backend name), SurfboardApplicationStatus -> vendor strings. Set-match TIES 3 ways on
{NotSet,Waiting,Success,Fail}, resolved by the importing model. Omissions, each re-read by object:
PaymentType/CompanyAccount, KassaEventType/UTLEVREC, KassaReceiptType+Series/Delivery,
SafTVatCode/TwelvePercent, GiftcardStatus/Transferred, RewardTransactionType/Canceled,
OrderPaymentTypeFilter/DinteroKravia.
ONE ADDITION: RewardTransactionType carries Transferred, absent backend — nothing can complain.
Readers: 8 value-read, 27 type-only, 5 NO reader. Only PaymentType is both value-read and short —
checkout.ts:25-33 label ladder has no CompanyAccount branch. Other 7 are type-level today.
Naive reader pass over-reported twice (a journey.finding string, a comment ending "DeliveryType.")
— both killed by stripping strings+comments. Not corrected: 3 Kassa enums persist names, C1.
END RETURN
