RETURN: L-THE-BACKEND-MONEY-TRANCHE-REACHES-THE-TRUNK
brief: 17bc6e06
verdict: built
evidence: /Users/svendaneel/okam/Web-modules/docs/plan/lanes/L-THE-BACKEND-MONEY-TRANCHE-REACHES-THE-TRUNK/evidence.md
log:
LANDED as one tranche. Backend trunk 057c390ad -> 7d0450a4b, final tier 4974 / 0 failed / 11 skipped, exit 0. Three merges, ZERO conflicts, so git merge-file was never invoked. Nothing pushed.
ARC REPRODUCED EXACTLY, each step a real run with WebApi.dll's mtime asserted to move and each log grepped above the summary (no abort line in any). Skips held at 11 throughout, so nothing was skipped into green.
+pos 8f817cbd9 = 4967 / 2 FAILED, then +giftcard 97d2bd99b = 4971 / 1 FAILED, then +invoice 7d0450a4b = 4974 / 0 failed.
The two step-1 reds are the two named: Every_order_is_listed_once_on_an_invoice_that_spans_more_than_a_year and Passing_a_gift_card_on_moves_the_money_instead_of_copying_it. Each went green as its own lane landed.
So the census's claim is confirmed by measurement rather than inherited: pos-coverage-opened CANNOT land alone -- singly it leaves the backend trunk red across two commits, on two money paths.
CHAIN SHAPE CONFIRMED: all three fork at 81d06c10a, both fixes carry pos as an unlanded tail and add exactly one commit each, and their files are disjoint (GiftcardService/Tests vs InvoiceService/Tests). Stacked chain, not a conflict.
I CHECKED EVERY BRANCH IN REACH AGAINST THE OPEN DECISIONS BEFORE MERGING, via each decision's blocks: field. A first naive awk reported the same decision for every branch -- an artifact, discarded. Fifteen are open; NONE names the three, so all were free to land.
8357c8a33 NOT LANDED: D-SPEC-L-A-MODULE-OFF-NAMES-THE-MODULE blocks its lane. Asserted absent from the trunk after the final merge, not merely skipped.
mail-revocation-lever 69e6ca8af NOT TAKEN -- a choice, not an omission. The brief permits it, the exit criteria does not name it, and its subject is what D-REVOCATION-POSTURE-IN-PRODUCTION is still deciding.
KNOWN OPEN HOLE, verified in the tree not relayed: GiftcardController.cs:232-237 takes only a card id and a phone number and passes no caller to the service.
The class has [Authorize] at line 13 while three sibling routes carry [Authorize(Roles = PowerUserRole)] and this one does not -- so any authenticated user can transfer any card whose id they know. A C4 violation.
Landing neither worsens nor closes it: the controller was already on the trunk, and this changes what TransferGiftcard DOES, not who may call it. The closing branch builds on 71ac73af1, now landed, so it follows on normally.
ARITY SWEEP: neither changed service moved a signature -- TransferGiftcard and GetInvoiceModel each have one public declaration at the trunk and one at the tip. Both fixes are internal, and every build reported 0 Error(s).
HYGIENE: the tier rewrites TWO tracked artifacts, not one -- run-sheet.json AND run-sheet.md. The .md was dirty at step 2's commit, so I checked both landing commits; neither carries one. Worktree detached and pruned.
END RETURN
