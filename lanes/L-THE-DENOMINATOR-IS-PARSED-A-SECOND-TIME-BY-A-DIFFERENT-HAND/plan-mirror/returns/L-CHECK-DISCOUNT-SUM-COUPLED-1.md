```
RETURN: L-CHECK-DISCOUNT-SUM-COUPLED
brief: 2305e6c0
verdict: built
evidence: lanes/L-CHECK-DISCOUNT-SUM-COUPLED/mutation-log.md
spec_gap: CheckPanel.vue `g.lineAmount += line.netLineAmount` has no absence gate at all, so an absent net line amount renders NaN or a manufactured 0 as the row's own price.
reason: -
log:
commit c8f26d5, ref refs/lanes/L-CHECK-DISCOUNT-SUM-COUPLED, off 799f05d4. 8c6e91fa untouched.
PREMISE CHECKED, one claim did NOT hold. Backend: NetLineAmount = LineAmount - DiscountAmount and
FinalAmount = SUM(LineGross), so rows render NET and always add to the total. "A total that does not
match its own lines" is not reachable; asserted in all 3 worlds and corrected in the file.
Line 293 ruling HELD: the only writes to g.discountAmount are the seed and the +=; all readers
enumerated. It expired in the same edit that fixed groups, and the reversal is written where it was.
FIX: statedSum at the reducer and at totalDiscount; new isDeductionInPlay in utils/price.js renders
the row for a stated deduction and for an unstated amount, silent only for a stated none.
COUPLED SITE 3, money not layout: SellScreen.onNegativeSale branched on the same `> 0`, so an
unstated discount built the return at unitAmount*quantity - the LISTED price. Pre-existing (a 0 fails
`> 0` identically) but null now lands there. Fixed and pinned.
PROVED AGAINST THE SERVER: SUM(lineAmount) - finalAmount = 5000; old code renders -kr 30,00 in the
absent world, which disagrees with it. An exists()-only test passes on that.
Probe extended (not rewritten): 19 shapes, both reducers, the money world. Change is one column wide.
Mutation proof 8/8 RED. Suite 2754/2 vs untouched-baseline 2727/2 - same 2 basename reds.
END RETURN
```
