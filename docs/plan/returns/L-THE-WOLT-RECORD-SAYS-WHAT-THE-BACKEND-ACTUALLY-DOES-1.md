RETURN: L-THE-WOLT-RECORD-SAYS-WHAT-THE-BACKEND-ACTUALLY-DOES
brief: b8dc2977
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-THE-WOLT-RECORD-SAYS-WHAT-THE-BACKEND-ACTUALLY-DOES/evidence.md
log:
Trunk d99f92d -> 1525e74, tier 169 / 4069 / 0, exit 0. Nothing pushed. All three claims re-measured against WoltService.cs at backend trunk 057c390ad before a word was written; all three hold.
statusesToSave has TEN members, DropoffCompleted at WoltService.cs:511, added by 6454f3c71 which is an ancestor of the backend trunk. Enum declares 15. Reachable set is 11, so 4 are wordless.
The ELEVENTH is NotSet, seeded at OrderService.cs:419. Establishing that meant checking EVERY writer of the column, not just the webhook path, since any one could have widened the set.
Three other writers add nothing, measured: the order-status mirror (:1115) ranges over four members already in the allowlist, MapMarketplaceDeliveryStatus over eight likewise, and :1158/:1206 are Delivered and OrderRejected.
THE FOUR WORDLESS ARE STILL THE RIGHT SET and the rule still selects exactly them. Only DropoffCompleted changes side, from "cannot be sent" to "is sent" -- and it already had a word, so nothing is added or withheld.
The "five" was never a list. The record named the correct FOUR, while separately claiming the column holds ten of fifteen, which implies five. The fifth existed only in that arithmetic.
So the defect was never a missing or invented label: it was a WRONG REASON attached to a right label, plus a count contradicting the record's own list. No label changes in any language.
LOAD-BEARING, stated exactly: the fallback to a dictionary key is what stops a raw enum or invented German rendering, and that holds for any input.
DropoffCompleted's entry does something narrower and still load-bearing -- it is a state the column really holds (mapped to OrderStatus.Completed), so without it an operator watching a completed dropoff reads "waiting".
Not a raw enum and not invented German, but a well-formed word that is wrong. Covering the whole reachable set is what lets the fallback be one waiting key rather than a guess per state.
NO CODE CHANGE, verified mechanically: git diff -U0 on plugins/global-mixin.js filtered to non-comment lines returns EMPTY. Map entries, resolver, all three dictionaries and OrderCard.vue untouched.
ONE JUDGEMENT CALL, flagged for reversal. The test carried the same record as EXECUTABLE claims: DropoffCompleted sat in a constant named CARRIED_UNPERSISTED_WOLT, asserting the backend cannot persist it.
I moved it into PERSISTED_WOLT_STATUSES and deleted that constant, because a corrected comment beside a constant asserting the opposite leaves a reader trusting the executable one.
The key-set assertion is unchanged (the union it compared is identical); the move adds 2 arms, reading DropoffCompleted in Norwegian and German. Suite 56 -> 58, tier 4067 -> 4069, fully accounted.
A THIRD COPY is outside my write boundary: premise-check.txt in the original lane's docs/plan dir, lines 25 and 29-30, same two errors. It may be right to leave a frozen record superseded -- but as a decision, not an oversight.
END RETURN
