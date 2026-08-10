RETURN: L-READ-THE-TWO-MONEY-FIXES
brief: ed5e6714
verdict: built
evidence: docs/plan/reviews/L-READ-THE-TWO-MONEY-FIXES.md
log: Both fixes APPROVE and compose green — but a finding outranks both: TransferGiftcard moves value with no resolved caller identity, a standing C4 breach the lane disclosed and did not close.
Gift card third-path hunt: none. The two transfer branches were the only unguarded second-write sites; CompletePurchase is status-guarded, the copy mints a fresh card, the rest retype in place.
GetBalance sums Purchased minus Redeemed by UserId, never joins the card — which is why an EF-orphaned row is untraceable spendable money; the abandoned "SQL rejects it" paragraph was right to drop.
Re-transfer and accumulated copies checked too: a re-transfer re-owns the one row and mints nothing; copies carry Transferred, which GetBalance does not count. Balance arithmetic closed under both.
C1 verified: GuardAppendOnly covers journal/workforce/meals only — zero Giftcard matches in the whole guard body — and RefundGiftcard already retypes these rows in place (PaymentService.cs:697).
Handover-copy move justified: CreateGiftcardCopy reads receiver fields off the live card, so taken after reassignment the giver's record named the recipient; it now also runs the no-account path.
Invoice keying correct (Year AND Month, two Where clauses collapsed to one list). The MMMM yyyy heading belongs: two sections headed 1.-31. mai are right and unreconcilable, and it is pinned by M3.
Safety holds end to end: lines filtered Completed in [From,To] (:719-720), entity takes those values (:812-813), section loop spans From..To inclusive — a superset, so every line hits one section.
So year+month is strictly safer than month-only, not worse; the inverted-risk shape (a line in no section) cannot occur. I checked that closure — its falsity would make the fix unsafe.
WrappedService.cs:189,199 confirmed NOT a defect: its orders are fetched between new DateTime(2025,1,1) and 2025-12-31 (:59-62), a single calendar year, so month-only is unambiguous by construction.
Instruments: gift card proved both directions (ZERO exit 7, BUILD exit 9), so its 5/5 kills stand. Invoice did NOT run ZERO, uncredited — but runs.log records total:9 per run, so the 4 kills hold.
Invoice results.json shows reddened:0 (a jest-marker artifact on xunit); named change is a record fix — state that per-run total/failed backs the kills, since reddened:0 alone reads as a void run.
Composition: the two share base b368d930e and merge clean either order (disjoint files); composed non-SQL tier 4962 passed / 0 / 10 skipped, exit 0, no abort. run-sheet.json restored, not added.
Known red rides as briefed: GiftcardBalanceTests.Passing_a_gift_card_on is the pin 71ac73af1 turns green, so the invoice branch must not land alone — both together, or the gift card first.
Named change for the money hole: resolve the caller in TransferGiftcard, require ReceiverUserId == callerId, record the actor. Worktree removed and pruned; tips and trunk untouched; nothing pushed.
END RETURN
