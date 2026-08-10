```
RETURN: L-RECEIPT-DISCOUNT-ROW-DROPPED
brief: 827d8c68
verdict: built
evidence: lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED/mutation-log.md
spec_gap: none
reason: exit met — row renders on isDeductionInPlay, total proved against the backend's own number
log:
commit 7a72c02, refs/lanes/L-RECEIPT-DISCOUNT-ROW-DROPPED, off c8f26d5; 8c6e91fa never read.
THE INHERITED CLAIM INVERTS. Check rows render netLineAmount so a check adds up either way; RECEIPT rows render lineAmount, GROSS of the discount, while the total is net (JournalLineFactory:95-105 keeps them apart, FinalizeService:150-160 sums SUM(LineAmount)-SUM(DiscountAmount), :169 enforces it == order.FinalAmount). The deduction rows are the ONLY bridge, so the stronger claim is true here and only here: the paper read 200,00 + 100,00 less 40,00, total 240,00 — 20,00 missing off a legal document.
World = Cov_FinalizeVatTests verbatim (20000/10000, whole-order 20% split 4000/2000, GrossAmount 24000). exists() PASSES on the old code here — the split leaves the drink's row rendering — so that is asserted in-file to stop anyone simplifying the suite back into a presence check.
The assertion is the residual read out of rendered DOM: 30000-4000-24000 = 2000 = the backend's own subtrahend, built from lineAmount and grossAmount, and it must be MARKED on the line it belongs to. utils/price.js UNTOUCHED — isDeductionInPlay was already right; the receipt is its third caller.
Probe part 3 re-ran (falsification target): 9 shapes move, every one unstated, no stated shape moves — the column held. Mutation 5/5 RED, incl. M5: the XZ sign fix was unreachable until this lane made −— producible, so it stops being covered by a guard.
HONEST SIZE: PosReceiptLineModel.DiscountAmount is a non-nullable int on Newtonsoft defaults, so no receipt printed off this backend today is missing a row. Hardening + estate agreement; the commit claims no incident. One caller has no shape control: pages/kvittering/_id/_token.vue assigns unauthenticated res.data straight into the prop.
SECOND GATE RULED — ITS OWN LANE: CheckPanel.vue:269 g.lineAmount += line.netLineAmount. Different file, 5 lanes live in it, and its harm is SellScreen.onNegativeSale's REFUND amount rather than a row; PosReceiptView does no arithmetic at all, so there is no second ungated sum here to pair it with. Suggested L-CHECK-LINEAMOUNT-UNGATED-SUM, taking g.depositAmount's || 0 with it.
Suite 2775 passed / 2 failed vs untouched baseline 2754 / 2 — the same two journey-artifact-store worktree-basename reds, baseline established before the first edit.
Nothing in the files I touched was already dirty. PosShell.vue, PosTopBar.vue, XReportView.vue and an untracked ClockScreen.vue are dirty under components/admin/pos/; this lane touches none of them.
END RETURN
```
