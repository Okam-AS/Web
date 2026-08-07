RETURN: L-A-TRANSFERRED-GIFT-CARD-FUNDS-EXACTLY-ONE-WALLET
brief: 46170acb
verdict: built
evidence: docs/plan/lanes/L-A-TRANSFERRED-GIFT-CARD-FUNDS-EXACTLY-ONE-WALLET/evidence.md
log:
Branched lane/giftcard-transfer-one-wallet on lane/pos-coverage-opened @ b368d930e, NOT the trunk, because the failing pin lives there. Trunk 057c390ad untouched. Commit 71ac73af1.
Premise CHECKED at that ref before editing, tree unmodified via stash: GiftcardBalanceTests read 1 failed / 3 passed / 4, and the one red was the named pin.
The pin passes because the code changed. TransferGiftcard now RE-OWNS the card's single transaction rather than writing a second one that EF's one-to-one fixup orphans.
BOTH branches minted the duplicate and only one had a test. Where the receiver had no account yet the giver kept a spendable orphan too, and nothing had ever executed that path.
Also moved the handover copy above the receiver reassignment: taken after it, the giver's own record of the card named the person they had given it to. That branch kept no record at all before.
C1 checked rather than assumed - GuardAppendOnly covers the journal, Z reports and the Workforce families; GiftcardTransaction is not among them, and RefundGiftcard already retypes these rows.
Deleted a line rather than decorating it: held.ClientTheme could not be made to change an outcome in any world this product builds, so the only way to red it was a fixture that cannot exist.
Tests 4 to 7. New: the no-account branch, the claim-after-signup journey end to end, and the giver's record.
A fixture defect the new branch forced: the seeded buyer was the string "buyer" while UserId is a foreign key, so the first honest run died on SQLite Error 19 rather than on an assertion.
Ran the CANONICAL test/support/mutate.js from lane/mutation-runner-cannot-delete-work @ c65b19c, checked out into its own worktree rather than copied into a lane directory.
5 of 5 mutations killed, baseline 7 tests, and EVERY mutation run executed 7 - asserted by lane/verify-mutations.py, which refuses a sweep where any run differs or never reached the tests.
The runner printed RED (0) for all five. That (0) is the false-result shape, since its counter reads jest markers xunit never emits, so no judgement here used the runner's own verdict.
Proved the instrument in BOTH directions before believing it: a no-match filter exits 7 as ZERO, a non-compiling mutant exits 9 as BUILD, and the verifier refused a sweep holding either.
NOT FIXED, wants an owner: GiftcardController.TransferGiftcard has a bare [Authorize] and no ownership check, so any signed-in user can transfer any card whose id they know. A standing C4 gap.
Tier from WebApi.Tests: 4959 passed / 1 failed / 10 skipped of 4970. The one red is the sibling invoice flag, not mine. Worktrees removed and pruned. Not pushed.
END RETURN
