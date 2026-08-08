RETURN: L-ONLY-THE-HOLDER-CAN-GIVE-A-GIFT-CARD-AWAY
brief: dbdd8a66
verdict: built
evidence: docs/plan/lanes/L-ONLY-THE-HOLDER-CAN-GIVE-A-GIFT-CARD-AWAY/tier.txt
log:
Premise verified at the BRANCH POINT 71ac73af1, not only at the trunk: TransferGiftcard(giftcardId, phone) under a bare class-level [Authorize], CancelPurchase role-gated directly above.
THE ACTOR is ActorClaims.TryResolveUserId(User, out callerUserId), resolved in the controller and passed down; the service requires giftcard.ReceiverUserId == callerUserId.
NOT User.Identity.Name, which every sibling money controller uses. For the OAuth principal that is the PHONE NUMBER, so copying them would compare a phone to ReceiverUserId and refuse the real holder.
THE REFUSAL is neither 403 nor 404: the same GiftcardNotFound an unknown id already gets. I made the status guard throw it too, and ordered the ownership check above that guard.
Splitting any of the three would make this route an oracle confirming which card ids are real. One sentence for every no, on purpose.
callerUserId is APPENDED, not inserted at the actor-second position: both it and the phone are strings, so inserting would let a stale call site compile while silently swapping them.
Appending makes every stale site a compile error. All seven occurrences enumerated and updated: 4 tests, 1 controller call, 1 interface, 1 implementation. Build 0 errors.
Tier at the lane tip 4965 passed / 1 failed / 10 skipped / 4976 total. No abort line, dll mtime moved, run-sheet restored, worktree clean.
The red is INHERITED: InvoiceDocumentTests comes from b368d930e at blob 6d8fb9d96 unchanged on this base, the pin lane/an-invoice-lists-each-order-once turns green.
The pin I was told to protect, Passing_a_gift_card_on_moves_the_money, is green. Total rose 4974 to 4976, exactly the two tests I added.
Six mutations applied and reverted, four red. The two survivors are a redundant pair: the check ordering and the shared refusal message each mask the other.
Shown jointly load-bearing rather than assumed — a combined mutation breaking BOTH reds 1 of 13. Measured, since a survivor I only reasoned about is a guard nobody has tested.
Three earlier survivors closed: two by new tests, one by DELETING a caller-blank guard the holder comparison already made redundant, rather than faking a test for no observable difference.
GAP I am naming: these are service-level tests. The controller's ActorClaims resolution and refusal shape have no HTTP test, though WebApi.Tests/Wire/ exists. They are not wire tests.
MY ERROR: the first mutation script hit the 2-minute cap and was killed between write and restore, leaving the check below the status guard. Found by reading the file. Branch 8637cdd51, not pushed.
END RETURN
